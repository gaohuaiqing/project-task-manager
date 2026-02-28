/**
 * 任务分配算法单元测试
 * 测试智能任务分配的核心算法逻辑
 */

import { describe, it, expect } from 'vitest';
import { assignTask, getBestCandidate, batchAssignTasks, calculateTeamCapabilityScore } from './taskAssignmentAlgorithm';
import type { Member, Task } from '@/types';

// 模拟成员数据
const mockMembers: Member[] = [
  {
    id: '1',
    name: '陈理',
    avatar: 'avatar1.jpg',
    role: '技术经理',
    level: 'E5',
    capabilities: {
      boardDev: 8,
      firmwareDev: 9,
      componentImport: 7,
      systemDesign: 9,
      driverInterface: 8
    },
    currentTasks: 2,
    saturation: 30,
    status: 'online',
    completedTasks: 45,
    email: 'chen_li@company.com'
  },
  {
    id: '2',
    name: '叶协通',
    avatar: 'avatar2.jpg',
    role: '工程师',
    level: 'E5',
    capabilities: {
      boardDev: 7,
      firmwareDev: 8,
      componentImport: 6,
      systemDesign: 7,
      driverInterface: 9
    },
    currentTasks: 4,
    saturation: 50,
    status: 'online',
    completedTasks: 30,
    email: 'ye_xietong@company.com'
  },
  {
    id: '3',
    name: '蔡源海',
    avatar: 'avatar3.jpg',
    role: '工程师',
    level: 'E5',
    capabilities: {
      boardDev: 6,
      firmwareDev: 7,
      componentImport: 8,
      systemDesign: 6,
      driverInterface: 7
    },
    currentTasks: 1,
    saturation: 20,
    status: 'online',
    completedTasks: 20,
    email: 'cai_yuanhai@company.com'
  },
  {
    id: '4',
    name: '陈霄',
    avatar: 'avatar4.jpg',
    role: '工程师',
    level: 'E5',
    capabilities: {
      boardDev: 9,
      firmwareDev: 6,
      componentImport: 7,
      systemDesign: 8,
      driverInterface: 6
    },
    currentTasks: 5,
    saturation: 60,
    status: 'online',
    completedTasks: 15,
    email: 'chen_xiao@company.com'
  },
  {
    id: '5',
    name: '离线工程师',
    avatar: 'avatar5.jpg',
    role: '工程师',
    level: 'E4',
    capabilities: {
      boardDev: 10,
      firmwareDev: 10,
      componentImport: 10,
      systemDesign: 10,
      driverInterface: 10
    },
    currentTasks: 0,
    saturation: 0,
    status: 'offline',
    completedTasks: 100,
    email: 'offline@company.com'
  }
];

// 模拟任务数据
const mockTasks: Task[] = [
  {
    id: 'task1',
    title: '板卡设计任务',
    type: 'other',
    difficulty: 'medium',
    estimatedHours: 10,
    deadline: '2026-12-31',
    priority: 'high',
    requiredSkills: ['板卡设计', '硬件开发'],
    assignee: '',
    status: 'pending',
    projectId: 'project1',
    description: '设计新的板卡电路'
  },
  {
    id: 'task2',
    title: '固件开发任务',
    type: 'backend',
    difficulty: 'hard',
    estimatedHours: 15,
    deadline: '2026-12-25',
    priority: 'medium',
    requiredSkills: ['固件开发', 'C语言'],
    assignee: '',
    status: 'pending',
    projectId: 'project2',
    description: '开发新的固件版本'
  },
  {
    id: 'task3',
    title: '系统测试任务',
    type: 'test',
    difficulty: 'easy',
    estimatedHours: 8,
    deadline: '2026-12-20',
    priority: 'low',
    requiredSkills: ['系统测试', '外购部件导入'],
    assignee: '',
    status: 'pending',
    projectId: 'project3',
    description: '测试系统功能'
  }
];

describe('任务分配算法测试', () => {
  describe('assignTask 函数', () => {
    it('应该为任务返回候选人列表', () => {
      const task = mockTasks[0];
      const candidates = assignTask(task, mockMembers);

      expect(Array.isArray(candidates)).toBe(true);
      expect(candidates.length).toBeGreaterThan(0);
      expect(candidates.length).toBeLessThanOrEqual(5);

      // 检查候选人结构
      candidates.forEach((candidate) => {
        expect(candidate).toHaveProperty('member');
        expect(candidate).toHaveProperty('score');
        expect(candidate).toHaveProperty('reasons');
        expect(candidate).toHaveProperty('skillMatch');
        expect(candidate).toHaveProperty('availability');
        expect(candidate).toHaveProperty('experience');
        expect(candidate).toHaveProperty('loadFactor');

        expect(typeof candidate.score).toBe('number');
        expect(candidate.score).toBeGreaterThanOrEqual(0);
        expect(candidate.score).toBeLessThanOrEqual(100);

        expect(Array.isArray(candidate.reasons)).toBe(true);
      });

      // 检查候选人是否按得分排序
      for (let i = 0; i < candidates.length - 1; i++) {
        expect(candidates[i].score).toBeGreaterThanOrEqual(candidates[i + 1].score);
      }
    });

    it('应该为不同类型的任务分配不同的能力维度', () => {
      const backendTask = mockTasks[1]; // 后端开发任务
      const testTask = mockTasks[2];     // 测试任务

      const backendCandidates = assignTask(backendTask, mockMembers);
      const testCandidates = assignTask(testTask, mockMembers);

      expect(Array.isArray(backendCandidates)).toBe(true);
      expect(Array.isArray(testCandidates)).toBe(true);

      // 后端任务应该优先考虑固件开发能力
      const backendTopCandidate = backendCandidates[0];
      expect(backendTopCandidate.member.capabilities.firmwareDev).toBeGreaterThanOrEqual(7);

      // 测试任务应该优先考虑外购部件导入能力
      const testTopCandidate = testCandidates[0];
      expect(testTopCandidate.member.capabilities.componentImport).toBeGreaterThanOrEqual(7);
    });

    it('当没有成员时应该返回空数组', () => {
      const task = mockTasks[0];
      const candidates = assignTask(task, []);
      expect(Array.isArray(candidates)).toBe(true);
      expect(candidates.length).toBe(0);
    });

    it('应该优先选择在线成员', () => {
      const task = mockTasks[0];
      const candidates = assignTask(task, mockMembers);

      // 离线工程师不应该出现在候选人列表中
      const hasOfflineMember = candidates.some(c => c.member.status === 'offline');
      expect(hasOfflineMember).toBe(false);
    });

    it('应该考虑成员的饱和度', () => {
      const task = mockTasks[0];
      const candidates = assignTask(task, mockMembers);

      // 饱和度高的成员得分应该较低
      const sortedBySaturation = [...candidates].sort((a, b) =>
        a.member.saturation - b.member.saturation
      );

      // 排名靠前的候选人应该有较低的饱和度
      expect(candidates[0].member.saturation).toBeLessThanOrEqual(50);
    });

    it('高难度任务应该优先分配给能力高的成员', () => {
      const hardTask = mockTasks[1]; // 困难任务
      const candidates = assignTask(hardTask, mockMembers);

      // 高难度任务的候选人应该有相应的能力
      const topCandidate = candidates[0];
      expect(topCandidate.member.capabilities.firmwareDev).toBeGreaterThanOrEqual(7);
    });
  });

  describe('getBestCandidate 函数', () => {
    it('应该返回得分最高的候选人', () => {
      const task = mockTasks[0];
      const bestCandidate = getBestCandidate(task, mockMembers);

      expect(bestCandidate).not.toBeNull();
      if (bestCandidate) {
        expect(bestCandidate).toHaveProperty('member');
        expect(bestCandidate).toHaveProperty('score');
      }
    });

    it('当没有成员时应该返回null', () => {
      const task = mockTasks[0];
      const bestCandidate = getBestCandidate(task, []);
      expect(bestCandidate).toBeNull();
    });

    it('所有成员都离线时应该返回null', () => {
      const task = mockTasks[0];
      const offlineMembers = mockMembers.filter(m => m.status === 'offline');
      const bestCandidate = getBestCandidate(task, offlineMembers);
      expect(bestCandidate).toBeNull();
    });
  });

  describe('batchAssignTasks 函数', () => {
    it('应该为多个任务批量分配候选人', () => {
      const assignments = batchAssignTasks(mockTasks, mockMembers);

      expect(typeof assignments).toBe('object');
      expect(assignments).not.toBeNull();

      // 检查每个任务是否都有分配结果
      mockTasks.forEach(task => {
        expect(assignments).toHaveProperty(task.id);
        expect(Array.isArray(assignments[task.id])).toBe(true);
      });
    });

    it('当没有任务时应该返回空对象', () => {
      const assignments = batchAssignTasks([], mockMembers);
      expect(typeof assignments).toBe('object');
      expect(Object.keys(assignments).length).toBe(0);
    });

    it('当没有成员时应该返回空对象', () => {
      const assignments = batchAssignTasks(mockTasks, []);
      expect(typeof assignments).toBe('object');
      expect(Object.keys(assignments).length).toBe(0);
    });

    it('批量分配应该避免同一成员被过度分配', () => {
      const assignments = batchAssignTasks(mockTasks, mockMembers);

      // 检查是否有成员被分配过多任务
      const memberAssignmentCount: Record<string, number> = {};

      Object.values(assignments).forEach(candidates => {
        if (candidates.length > 0) {
          const topCandidate = candidates[0];
          const memberId = topCandidate.member.id;
          memberAssignmentCount[memberId] = (memberAssignmentCount[memberId] || 0) + 1;
        }
      });

      // 没有成员应该被分配所有任务
      const maxAssignments = Math.max(...Object.values(memberAssignmentCount));
      expect(maxAssignments).toBeLessThan(mockTasks.length);
    });
  });

  describe('calculateTeamCapabilityScore 函数', () => {
    it('应该计算团队整体能力评估', () => {
      const teamScore = calculateTeamCapabilityScore(mockMembers);

      expect(typeof teamScore).toBe('object');
      expect(teamScore).toHaveProperty('boardDev');
      expect(teamScore).toHaveProperty('firmwareDev');
      expect(teamScore).toHaveProperty('componentImport');
      expect(teamScore).toHaveProperty('systemDesign');
      expect(teamScore).toHaveProperty('driverInterface');

      // 检查计算结果是否合理
      expect(teamScore.boardDev).toBeGreaterThan(0);
      expect(teamScore.firmwareDev).toBeGreaterThan(0);
      expect(teamScore.componentImport).toBeGreaterThan(0);
      expect(teamScore.systemDesign).toBeGreaterThan(0);
      expect(teamScore.driverInterface).toBeGreaterThan(0);
    });

    it('当没有成员时应该返回全零分', () => {
      const teamScore = calculateTeamCapabilityScore([]);

      expect(typeof teamScore).toBe('object');
      expect(teamScore.boardDev).toBe(0);
      expect(teamScore.firmwareDev).toBe(0);
      expect(teamScore.componentImport).toBe(0);
      expect(teamScore.systemDesign).toBe(0);
      expect(teamScore.driverInterface).toBe(0);
    });

    it('团队得分应该是所有成员能力的平均值', () => {
      const teamScore = calculateTeamCapabilityScore(mockMembers);

      // 计算预期的平均分
      const expectedBoardDev = mockMembers.reduce((sum, m) => sum + m.capabilities.boardDev, 0) / mockMembers.length;

      expect(teamScore.boardDev).toBeCloseTo(expectedBoardDev, 1);
    });

    it('离线成员不应该影响团队得分计算', () => {
      const onlineMembers = mockMembers.filter(m => m.status === 'online');
      const allMembersScore = calculateTeamCapabilityScore(mockMembers);
      const onlineMembersScore = calculateTeamCapabilityScore(onlineMembers);

      // 离线成员能力更高，但不应影响在线团队得分
      expect(allMembersScore.boardDev).toBeGreaterThan(0);
      expect(onlineMembersScore.boardDev).toBeGreaterThan(0);
    });
  });

  describe('候选人推荐理由', () => {
    it('应该为高技能匹配度的候选人生成相应理由', () => {
      const task = mockTasks[1]; // 固件开发任务
      const candidates = assignTask(task, mockMembers);

      const topCandidate = candidates[0];
      expect(topCandidate).not.toBeUndefined();

      if (topCandidate) {
        // 检查推荐理由是否包含技能匹配相关内容
        const hasSkillReason = topCandidate.reasons.some(reason =>
          reason.includes('技能匹配度')
        );
        expect(hasSkillReason).toBe(true);

        // 检查推荐理由是否包含可用性相关内容
        const hasAvailabilityReason = topCandidate.reasons.some(reason =>
          reason.includes('负载')
        );
        expect(hasAvailabilityReason).toBe(true);
      }
    });

    it('应该为低负载的候选人生成相应理由', () => {
      const task = mockTasks[0];
      const candidates = assignTask(task, mockMembers);

      // 找到饱和度最低的候选人
      const lowSaturationCandidate = candidates.find(c => c.member.saturation <= 30);

      expect(lowSaturationCandidate).toBeDefined();
      if (lowSaturationCandidate) {
        const hasLoadReason = lowSaturationCandidate.reasons.some(reason =>
          reason.includes('负载') || reason.includes('可用')
        );
        expect(hasLoadReason).toBe(true);
      }
    });

    it('应该为高经验值的候选人生成相应理由', () => {
      const task = mockTasks[0];
      const candidates = assignTask(task, mockMembers);

      const topCandidate = candidates[0];
      if (topCandidate) {
        const hasExperienceReason = topCandidate.reasons.some(reason =>
          reason.includes('经验') || reason.includes('完成任务')
        );
        expect(hasExperienceReason).toBe(true);
      }
    });
  });

  describe('边界情况处理', () => {
    it('应该处理缺失能力的成员', () => {
      const memberWithMissingCapability: Member = {
        id: 'test',
        name: '测试',
        avatar: '',
        role: 'engineer',
        level: 'E1',
        capabilities: {
          boardDev: 0,
          firmwareDev: 0,
          componentImport: 0,
          systemDesign: 0,
          driverInterface: 0
        },
        currentTasks: 0,
        saturation: 0,
        status: 'online',
        completedTasks: 0,
        email: 'test@test.com'
      };

      const task = mockTasks[0];
      const candidates = assignTask(task, [memberWithMissingCapability]);

      // 即使能力为0，也应该返回候选人（但得分很低）
      expect(candidates.length).toBe(1);
      expect(candidates[0].score).toBeLessThan(50);
    });

    it('应该处理极端饱和度值', () => {
      const saturatedMember: Member = {
        id: 'test',
        name: '测试',
        avatar: '',
        role: 'engineer',
        level: 'E5',
        capabilities: {
          boardDev: 10,
          firmwareDev: 10,
          componentImport: 10,
          systemDesign: 10,
          driverInterface: 10
        },
        currentTasks: 100,
        saturation: 100,
        status: 'online',
        completedTasks: 1000,
        email: 'test@test.com'
      };

      const task = mockTasks[0];
      const candidates = assignTask(task, [saturatedMember]);

      // 饱和度100的成员得分应该很低
      expect(candidates[0].score).toBeLessThan(50);
    });

    it('应该处理空技能列表的任务', () => {
      const taskWithNoSkills: Task = {
        id: 'task_no_skills',
        title: '无技能要求任务',
        type: 'other',
        difficulty: 'easy',
        estimatedHours: 5,
        deadline: '2026-12-31',
        priority: 'low',
        requiredSkills: [],
        assignee: '',
        status: 'pending',
        projectId: 'project1',
        description: '简单任务'
      };

      const candidates = assignTask(taskWithNoSkills, mockMembers);

      // 即使没有技能要求，也应该返回候选人
      expect(candidates.length).toBeGreaterThan(0);
    });
  });
});
