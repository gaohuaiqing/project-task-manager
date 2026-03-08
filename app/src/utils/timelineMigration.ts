/**
 * 时间轴数据迁移工具
 *
 * 自动检测数据格式并执行迁移，确保向后兼容
 *
 * @module utils/timelineMigration
 */

import type {
  Timeline,
  TimelineTask,
  TimelineConfig,
} from '@/types/timeline';
import type { ProjectMilestone } from '@/types/project';
import type { WbsTask } from '@/types/wbs';
import {
  mergeToTimelines,
  timelinesToMilestones,
  timelinesToWbsTasks,
} from './timelineAdapters';

// ==================== 数据格式检测 ====================

/**
 * 数据格式版本
 */
export type DataFormatVersion = 'legacy' | 'v1' | 'v2';

/**
 * 数据格式信息
 */
export interface DataFormatInfo {
  /** 版本 */
  version: DataFormatVersion;
  /** 是否包含里程碑 */
  hasMilestones: boolean;
  /** 是否包含WBS任务 */
  hasWbsTasks: boolean;
  /** 是否已包含时间轴 */
  hasTimelines: boolean;
  /** 是否需要迁移 */
  needsMigration: boolean;
}

/**
 * 检测项目数据格式
 */
export function detectDataFormat(data: {
  milestones?: ProjectMilestone[];
  wbsTasks?: WbsTask[];
  timelines?: Timeline[];
}): DataFormatInfo {
  const hasMilestones = Array.isArray(data.milestones) && data.milestones.length > 0;
  const hasWbsTasks = Array.isArray(data.wbsTasks) && data.wbsTasks.length > 0;
  const hasTimelines = Array.isArray(data.timelines) && data.timelines.length > 0;

  let version: DataFormatVersion = 'legacy';
  let needsMigration = false;

  if (hasTimelines) {
    // 已有时间轴数据，检查版本
    const timeline = data.timelines[0];
    if (timeline.config && timeline.tasks) {
      version = 'v2'; // 最新格式
      needsMigration = false;
    } else {
      version = 'v1'; // 早期时间轴格式
      needsMigration = true;
    }
  } else if (hasMilestones || hasWbsTasks) {
    // 旧格式数据
    version = 'legacy';
    needsMigration = true;
  } else {
    // 空数据
    version = 'v2';
    needsMigration = false;
  }

  return {
    version,
    hasMilestones,
    hasWbsTasks,
    hasTimelines,
    needsMigration,
  };
}

// ==================== 自动迁移 ====================

/**
 * 迁移选项
 */
export interface MigrationOptions {
  /** 是否分离里程碑 */
  separateMilestones?: boolean;
  /** 是否按成员分组 */
  groupByMember?: boolean;
  /** 迁移回调（用于记录日志） */
  onProgress?: (step: string, progress: number) => void;
}

/**
 * 自动迁移到新的时间轴格式
 */
export function autoMigrateToNewFormat(
  data: {
    milestones?: ProjectMilestone[];
    wbsTasks?: WbsTask[];
    timelines?: Timeline[];
  },
  options: MigrationOptions = {}
): Timeline[] {
  const { onProgress, separateMilestones = true, groupByMember = false } = options;

  try {
    onProgress?.('检测数据格式...', 10);
    const formatInfo = detectDataFormat(data);

    if (!formatInfo.needsMigration) {
      onProgress?.('数据已是最新格式', 100);
      return data.timelines || [];
    }

    onProgress?.('开始迁移数据...', 20);

    let timelines: Timeline[] = [];

    if (formatInfo.version === 'legacy') {
      onProgress?.('迁移旧格式数据...', 40);

      // 从里程碑和WBS任务迁移
      timelines = mergeToTimelines(
        data.milestones || [],
        data.wbsTasks || [],
        {
          separateMilestones,
          groupByMember,
        }
      );

      onProgress?.('数据迁移完成', 80);
    } else if (formatInfo.version === 'v1') {
      onProgress?.('升级v1格式数据...', 40);
      // 升级v1格式到v2（如果有的话）
      timelines = data.timelines || [];
      onProgress?.('数据升级完成', 80);
    }

    onProgress?.('迁移完成', 100);
    return timelines;

  } catch (error) {
    console.error('数据迁移失败:', error);
    onProgress?.('迁移失败', 0);
    // 返回空时间轴
    return createDefaultTimelines();
  }
}

/**
 * 将时间轴数据转换回旧格式（用于保存）
 */
export function convertToLegacyFormat(
  timelines: Timeline[]
): {
  milestones: Omit<ProjectMilestone, 'id' | 'projectId' | 'createdAt' | 'updatedAt'>[];
  wbsTasks: Omit<WbsTask, 'id' | 'wbsCode' | 'createdAt' | 'updatedAt' | 'level' | 'subtasks' | 'isExpanded'>[];
} {
  return {
    milestones: timelinesToMilestones(timelines),
    wbsTasks: timelinesToWbsTasks(timelines),
  };
}

// ==================== 默认数据 ====================

/**
 * 创建默认时间轴
 */
export function createDefaultTimelines(): Timeline[] {
  return [
    {
      config: {
        id: 'default_timeline',
        name: '项目计划',
        icon: '📊',
        color: '#3b82f6',
        type: 'custom',
        visible: true,
        editable: true,
        sortOrder: 0,
      },
      tasks: [],
    },
  ];
}

/**
 * 创建技术栈预设时间轴
 */
export function createTechStackTimelines(techStacks: string[]): Timeline[] {
  const techColors = [
    '#3b82f6', // blue - 前端
    '#10b981', // green - 后端
    '#f59e0b', // amber - 测试
    '#8b5cf6', // purple - 设计
    '#ef4444', // red - 运维
  ];

  const techIcons: Record<string, string> = {
    frontend: '🎨',
    backend: '⚙️',
    frontend_web: '🌐',
    mobile: '📱',
    test: '🧪',
    design: '🎨',
    devops: '🔧',
  };

  return techStacks.map((tech, index) => ({
    config: {
      id: `tech_${tech}`,
      name: tech,
      icon: techIcons[tech] || '💻',
      color: techColors[index % techColors.length],
      type: 'tech_stack',
      visible: true,
      editable: true,
      sortOrder: index,
    },
    tasks: [],
  }));
}

/**
 * 创建团队预设时间轴
 */
export function createTeamTimelines(members: Array<{ id: string; name: string }>): Timeline[] {
  return members.map((member, index) => ({
    config: {
      id: `member_${member.id}`,
      name: member.name,
      icon: '👤',
      color: getMemberColor(index),
      type: 'team',
      visible: true,
      editable: true,
      sortOrder: index,
    },
    tasks: [],
  }));
}

/**
 * 创建阶段预设时间轴
 */
export function createPhaseTimelines(phases: string[]): Timeline[] {
  const phaseColors = [
    '#3b82f6', // blue
    '#10b981', // green
    '#f59e0b', // amber
    '#8b5cf6', // purple
  ];

  const phaseIcons: Record<string, string> = {
    planning: '📋',
    design: '🎨',
    development: '💻',
    testing: '🧪',
    deployment: '🚀',
  };

  return phases.map((phase, index) => ({
    config: {
      id: `phase_${phase}`,
      name: phase,
      icon: phaseIcons[phase] || '📍',
      color: phaseColors[index % phaseColors.length],
      type: 'phase',
      visible: true,
      editable: true,
      sortOrder: index,
    },
    tasks: [],
  }));
}

// ==================== 辅助函数 ====================

/**
 * 获取成员颜色
 */
function getMemberColor(index: number): string {
  const colors = [
    '#3b82f6',
    '#10b981',
    '#f59e0b',
    '#ef4444',
    '#8b5cf6',
    '#ec4899',
    '#06b6d4',
    '#84cc16',
  ];
  return colors[index % colors.length];
}

/**
 * 验证时间轴数据完整性
 */
export function validateTimelines(timelines: Timeline[]): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  timelines.forEach((timeline, timelineIndex) => {
    // 验证配置
    if (!timeline.config?.id) {
      errors.push(`时间轴 ${timelineIndex + 1} 缺少ID`);
    }
    if (!timeline.config?.name) {
      errors.push(`时间轴 ${timelineIndex + 1} 缺少名称`);
    }

    // 验证任务
    timeline.tasks?.forEach((task, taskIndex) => {
      if (!task.id) {
        errors.push(`时间轴 "${timeline.config?.name}" 的任务 ${taskIndex + 1} 缺少ID`);
      }
      if (!task.title) {
        errors.push(`时间轴 "${timeline.config?.name}" 的任务 ${taskIndex + 1} 缺少标题`);
      }
      if (!task.startDate || !task.endDate) {
        errors.push(`时间轴 "${timeline.config?.name}" 的任务 ${taskIndex + 1} 缺少日期`);
      }
      if (task.startDate > task.endDate) {
        errors.push(`时间轴 "${timeline.config?.name}" 的任务 ${taskIndex + 1} 日期无效`);
      }
    });
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * 清理无效的时间轴数据
 */
export function sanitizeTimelines(timelines: Timeline[]): Timeline[] {
  return timelines
    .filter(timeline => timeline.config?.id && timeline.config?.name)
    .map(timeline => ({
      ...timeline,
      tasks: timeline.tasks?.filter(task =>
        task.id &&
        task.title &&
        task.startDate &&
        task.endDate &&
        task.startDate <= task.endDate
      ) || [],
    }));
}
