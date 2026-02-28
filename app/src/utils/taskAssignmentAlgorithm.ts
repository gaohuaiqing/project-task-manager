import type { Member, Task, MemberCapabilities } from '@/types';

// ==================== 改进的智能分配算法 ====================

// 任务类型到能力维度的映射（改进版）
const taskTypeToCapabilityMap: Record<string, (keyof MemberCapabilities)[]> = {
  frontend: ['systemDesign'],           // 前端开发 -> 系统设计
  backend: ['firmwareDev'],             // 后端开发 -> 固件开发
  test: ['componentImport'],            // 测试 -> 外购部件导入
  design: ['systemDesign'],             // 设计 -> 系统设计
  board: ['boardDev', 'driverInterface'], // 板卡开发
  other: ['boardDev']                   // 其他 -> 板卡开发
};

// 时间冲突接口
export interface TimeConflict {
  memberId: string;
  taskId: string;
  conflictType: 'overlap' | 'adjacent';
  description: string;
}

// 候选人接口（扩展版）
export interface Candidate {
  member: Member;
  score: number;           // 综合得分 0-100
  reasons: string[];       // 推荐理由列表
  skillMatch: number;      // 技能匹配度 0-100
  availability: number;    // 可用性 0-100
  experience: number;      // 经验值 0-100
  loadFactor: number;      // 负载因子 0-100
  conflicts?: TimeConflict[]; // 时间冲突列表
}

// 分配权重配置（可自定义）
export interface AssignmentWeights {
  skillMatch: number;    // 技能匹配权重
  availability: number;   // 可用性权重
  experience: number;    // 经验权重
  workload: number;      // 工作负载权重
}

const DEFAULT_WEIGHTS: AssignmentWeights = {
  skillMatch: 0.40,
  availability: 0.25,
  experience: 0.15,
  workload: 0.20
};

// ==================== 时间冲突检测 ====================

/**
 * 检查成员的时间冲突
 */
export const checkTimeConflicts = (
  member: Member,
  newTaskStart: string,
  newTaskEnd: string,
  allTasks: Task[]
): TimeConflict[] => {
  const conflicts: TimeConflict[] = [];

  // 获取该成员的所有任务
  const memberTasks = allTasks.filter(t => t.assignee === member.id);

  const newStart = new Date(newTaskStart);
  const newEnd = new Date(newTaskEnd);

  for (const task of memberTasks) {
    if (!task.startDate || !task.endDate) continue;

    const taskStart = new Date(task.startDate);
    const taskEnd = new Date(task.endDate);

    // 检查时间重叠
    if (newStart <= taskEnd && newEnd >= taskStart) {
      conflicts.push({
        memberId: member.id,
        taskId: task.id,
        conflictType: 'overlap',
        description: `与任务"${task.title}"时间重叠 (${task.startDate} ~ ${task.endDate})`
      });
    }
    // 检查相邻任务（间隔少于1天）
    else if (Math.abs(Math.floor((newStart.getTime() - taskEnd.getTime()) / (1000 * 60 * 60 * 24))) < 1) {
      conflicts.push({
        memberId: member.id,
        taskId: task.id,
        conflictType: 'adjacent',
        description: `与任务"${task.title}"时间相邻过近`
      });
    }
  }

  return conflicts;
};

// ==================== 改进的评分函数 ====================

// 计算技能匹配度（改进版）
const calculateSkillMatch = (member: Member, taskType: string, requiredSkills: string[]): number => {
  const capabilityKeys = taskTypeToCapabilityMap[taskType] || ['boardDev'];

  // 计算相关能力的平均分
  let totalScore = 0;
  let validCapabilities = 0;

  for (const key of capabilityKeys) {
    const value = member.capabilities[key];
    if (value !== undefined) {
      totalScore += value;
      validCapabilities++;
    }
  }

  const avgCapability = validCapabilities > 0 ? totalScore / validCapabilities : 0;

  // 如果有指定的技能要求，额外考虑技能列表匹配
  if (requiredSkills && requiredSkills.length > 0) {
    const matchedSkills = requiredSkills.filter(skill =>
      member.skills.some(memberSkill =>
        memberSkill.toLowerCase().includes(skill.toLowerCase()) ||
        skill.toLowerCase().includes(memberSkill.toLowerCase())
      )
    );
    const skillBonus = (matchedSkills.length / requiredSkills.length) * 20;
    return Math.min(100, Math.round(avgCapability * 10 * 0.8 + skillBonus));
  }

  return Math.min(100, Math.round(avgCapability * 10));
};

// 计算可用性（考虑时间冲突）
const calculateAvailability = (
  member: Member,
  newTaskStart: string,
  newTaskEnd: string,
  allTasks: Task[]
): { score: number; conflicts: TimeConflict[] } => {
  const conflicts = checkTimeConflicts(member, newTaskStart, newTaskEnd, allTasks);

  // 基础可用性（基于当前任务数量）
  let baseScore = 100;
  if (member.currentTasks > 4) baseScore -= 40;
  else if (member.currentTasks > 2) baseScore -= 20;

  // 时间冲突惩罚
  const overlapConflicts = conflicts.filter(c => c.conflictType === 'overlap').length;
  const adjacentConflicts = conflicts.filter(c => c.conflictType === 'adjacent').length;

  const conflictPenalty = overlapConflicts * 50 + adjacentConflicts * 20;

  return {
    score: Math.max(0, baseScore - conflictPenalty),
    conflicts
  };
};

// 计算经验值（改进版）
const calculateExperience = (member: Member): number => {
  // 基于已完成任务数量
  const taskScore = Math.min(50, (member.completedTasks / 30) * 50);

  // 基于职位加分
  let positionBonus = 0;
  const position = member.position?.toLowerCase() || '';
  if (position.includes('高级') || position.includes('资深') || position.includes('senior')) {
    positionBonus = 30;
  } else if (position.includes('中级')) {
    positionBonus = 15;
  }

  return Math.min(100, Math.round(taskScore + positionBonus));
};

// 计算负载因子（改进版）
const calculateLoadFactor = (member: Member): number => {
  // 饱和度越低，负载因子越高
  const saturationScore = Math.round((1 - member.saturation / 100) * 70);

  // 当前任务数量修正
  const taskCountPenalty = Math.min(30, member.currentTasks * 5);

  return Math.max(0, saturationScore - taskCountPenalty);
};

// 生成推荐理由（改进版）
const generateReasons = (
  member: Member,
  skillMatch: number,
  availability: number,
  experience: number,
  conflicts: TimeConflict[]
): string[] => {
  const reasons: string[] = [];

  // 技能匹配理由
  if (skillMatch >= 80) {
    reasons.push(`技能匹配度高 (${skillMatch}%)`);
  } else if (skillMatch >= 60) {
    reasons.push(`技能匹配度中等 (${skillMatch}%)`);
  } else if (skillMatch < 40) {
    reasons.push(`技能匹配度较低 (${skillMatch}%)，建议评估`);
  }

  // 可用性理由
  if (availability >= 80) {
    reasons.push(`当前可用性高 (${member.currentTasks} 个任务)`);
  } else if (availability >= 50) {
    reasons.push(`当前可用性适中 (${member.currentTasks} 个任务)`);
  } else if (conflicts.length > 0) {
    reasons.push(`存在 ${conflicts.length} 个时间冲突`);
  }

  // 经验理由
  if (experience >= 70) {
    reasons.push(`经验丰富 (${member.completedTasks} 个已完成任务)`);
  } else if (experience >= 40) {
    reasons.push(`有一定经验 (${member.completedTasks} 个已完成任务)`);
  }

  // 负载理由
  if (member.saturation < 30) {
    reasons.push(`工作饱和度低 (${member.saturation}%)`);
  } else if (member.saturation > 70) {
    reasons.push(`工作饱和度高 (${member.saturation}%)`);
  }

  return reasons;
};

// ==================== 主算法函数 ====================

// 计算综合得分（使用可配置权重）
const calculateTotalScore = (
  skillMatch: number,
  availability: number,
  experience: number,
  loadFactor: number,
  weights: AssignmentWeights = DEFAULT_WEIGHTS
): number => {
  return Math.round(
    skillMatch * weights.skillMatch +
    availability * weights.availability +
    experience * weights.experience +
    loadFactor * weights.workload
  );
};

// 智能任务分配算法（改进版，支持时间冲突检测和自定义权重）
export const assignTask = (
  task: Task,
  members: Member[],
  allTasks: Task[] = [],
  weights?: AssignmentWeights
): Candidate[] => {
  if (!members || members.length === 0) {
    return [];
  }

  const finalWeights = weights || DEFAULT_WEIGHTS;
  const candidates: Candidate[] = members.map(member => {
    const skillMatch = calculateSkillMatch(member, task.type, task.requiredSkills || []);

    const { score: availabilityScore, conflicts } = calculateAvailability(
      member,
      task.startDate || '',
      task.endDate || '',
      allTasks
    );

    const experience = calculateExperience(member);
    const loadFactor = calculateLoadFactor(member);

    const totalScore = calculateTotalScore(
      skillMatch,
      availabilityScore,
      experience,
      loadFactor,
      finalWeights
    );

    const reasons = generateReasons(member, skillMatch, availabilityScore, experience, conflicts);

    return {
      member,
      score: totalScore,
      reasons,
      skillMatch,
      availability: availabilityScore,
      experience,
      loadFactor,
      conflicts: conflicts.length > 0 ? conflicts : undefined
    };
  });

  // 按得分排序，返回前5名候选人
  return candidates
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
};

// 获取最佳候选人
export const getBestCandidate = (
  task: Task,
  members: Member[],
  allTasks?: Task[],
  weights?: AssignmentWeights
): Candidate | null => {
  const candidates = assignTask(task, members, allTasks || [], weights);
  return candidates.length > 0 ? candidates[0] : null;
};

// 批量任务分配
export const batchAssignTasks = (
  tasks: Task[],
  members: Member[],
  weights?: AssignmentWeights
): Record<string, Candidate[]> => {
  const assignments: Record<string, Candidate[]> = {};

  tasks.forEach(task => {
    assignments[task.id] = assignTask(task, members, tasks, weights);
  });

  return assignments;
};

// 计算团队整体能力评估
export const calculateTeamCapabilityScore = (
  members: Member[]
): Record<keyof MemberCapabilities, number> => {
  if (!members || members.length === 0) {
    return {
      boardDev: 0,
      firmwareDev: 0,
      componentImport: 0,
      systemDesign: 0,
      driverInterface: 0
    };
  }

  const sum: MemberCapabilities = {
    boardDev: 0,
    firmwareDev: 0,
    componentImport: 0,
    systemDesign: 0,
    driverInterface: 0
  };

  members.forEach(member => {
    sum.boardDev += member.capabilities.boardDev;
    sum.firmwareDev += member.capabilities.firmwareDev;
    sum.componentImport += member.capabilities.componentImport;
    sum.systemDesign += member.capabilities.systemDesign;
    sum.driverInterface += member.capabilities.driverInterface;
  });

  const average: Record<keyof MemberCapabilities, number> = {
    boardDev: Math.round(sum.boardDev / members.length),
    firmwareDev: Math.round(sum.firmwareDev / members.length),
    componentImport: Math.round(sum.componentImport / members.length),
    systemDesign: Math.round(sum.systemDesign / members.length),
    driverInterface: Math.round(sum.driverInterface / members.length)
  };

  return average;
};

// 生成分配建议报告
export const generateAssignmentReport = (
  task: Task,
  candidate: Candidate
): string => {
  let report = `任务分配建议报告\n`;
  report += `==================\n`;
  report += `任务: ${task.title}\n`;
  report += `推荐人员: ${candidate.member.name}\n`;
  report += `综合评分: ${candidate.score}\n\n`;

  report += `详细评估:\n`;
  report += `- 技能匹配: ${candidate.skillMatch}%\n`;
  report += `- 可用性: ${candidate.availability}%\n`;
  report += `- 经验值: ${candidate.experience}%\n`;
  report += `- 负载因子: ${candidate.loadFactor}%\n\n`;

  report += `推荐理由:\n`;
  candidate.reasons.forEach(reason => {
    report += `  • ${reason}\n`;
  });

  if (candidate.conflicts && candidate.conflicts.length > 0) {
    report += `\n⚠️  时间冲突:\n`;
    candidate.conflicts.forEach(conflict => {
      report += `  • ${conflict.description}\n`;
    });
  }

  return report;
};
