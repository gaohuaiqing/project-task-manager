/**
 * 报表术语定义常量
 * 为专业术语提供统一的说明和解释
 */
import type { TermDefinition } from '@/shared/components/TermTooltip';

export const REPORT_TERMS: Record<string, TermDefinition> = {
  // === 任务相关术语 ===
  fullTimeRatio: {
    term: '全职比',
    shortDesc: '任务占用的工作时间比例',
    fullDesc: '表示该任务占用的全职工作时间比例。1.0 表示需要全职投入一周，0.5 表示需要半天工作。用于衡量任务的工作量大小。',
    formula: '全职比 = 预估工时 / 标准工时(40h)',
    example: '预估4小时完成，则全职比 = 4/40 = 0.1 (10%)',
  },

  totalFullTimeRatio: {
    term: '全职比总和',
    shortDesc: '所有任务的全职比累加值',
    fullDesc: '将成员所有任务的全职比累加，反映该成员的总体工作负载。超过1.0表示工作超载，低于0.5表示工作不足。',
    formula: '全职比总和 = SUM(各任务全职比)',
    example: '3个任务分别为0.3、0.4、0.5，总和 = 1.2',
  },

  avgCompletionRate: {
    term: '平均完成率',
    shortDesc: '所有任务的平均完成进度',
    fullDesc: '统计周期内所有任务完成进度的算术平均值，反映整体工作进度。计算时包含所有未完成任务。',
    formula: '平均完成率 = SUM(各任务进度%) / 任务数',
    example: '3个任务分别完成 50%、75%、100%，平均 = 75%',
  },

  // === 延期相关术语 ===
  delayRate: {
    term: '延期率',
    shortDesc: '延期任务占总任务的百分比',
    fullDesc: '统计周期内，延期状态任务数占总任务数的比例。包含"已延期"和"延期预警"状态的任务。',
    formula: '延期率 = (延期任务数 + 延期预警数) / 总任务数 × 100%',
    example: '100个任务中有5个延期，延期率 = 5%',
  },

  delayWarning: {
    term: '延期预警',
    shortDesc: '即将到期但进度滞后的任务',
    fullDesc: '距离截止日期不足3天且完成进度低于80%的任务。需要及时关注和处理，避免延期。',
    formula: '剩余天数 ≤ 3 且 进度 < 80%',
    example: '任务明天到期但只完成了50%，触发延期预警',
  },

  delayed: {
    term: '已延期',
    shortDesc: '已超过截止日期的任务',
    fullDesc: '已经超过截止日期且尚未完成的任务。这类任务需要重点关注和资源调配。',
    formula: '当前日期 > 截止日期 且 状态未完成',
    example: '任务应在3月15日完成，但今天3月20日仍未完成',
  },

  overdueCompleted: {
    term: '超期完成',
    shortDesc: '超过截止日期后完成的任务',
    fullDesc: '在截止日期之后才完成的任务。虽然已完成，但反映了时间管理或估算问题。',
    formula: '实际完成日期 > 计划截止日期',
    example: '任务应在3月10日完成，实际3月12日完成',
  },

  // === 能力相关术语 ===
  capabilityMatch: {
    term: '能力匹配度',
    shortDesc: '工程师技能与任务需求的匹配程度',
    fullDesc: '基于能力模型计算，衡量工程师的技能维度与任务所需技能的匹配程度。分数越高表示匹配度越好，建议优先分配高匹配度的成员。',
    formula: '匹配度 = SUM(能力得分 × 权重) / 总权重',
    example: '技术能力80分(权重0.6) + 沟通能力75分(权重0.4) = 78%',
  },

  capabilityScore: {
    term: '能力评分',
    shortDesc: '某维度能力的量化评分',
    fullDesc: '对工程师在某技能维度的能力评估，范围0-100分。由技术经理定期评估更新，用于任务分配参考。',
    formula: '能力评分 = 评估得分 (0-100)',
    example: '技术能力评估为80分',
  },

  // === 项目相关术语 ===
  projectProgress: {
    term: '项目进度',
    shortDesc: '项目整体完成百分比',
    fullDesc: '基于任务完成情况计算的项目整体进度。使用任务工时加权计算，重要任务对进度影响更大。',
    formula: '项目进度 = SUM(任务进度 × 任务权重) / 总权重',
    example: '核心任务100%完成(权重高)比辅助任务完成影响更大',
  },

  milestoneProgress: {
    term: '里程碑进度',
    shortDesc: '里程碑的完成情况',
    fullDesc: '里程碑内所有任务的完成进度平均值。里程碑是项目的关键节点，需要重点跟踪。',
    formula: '里程碑进度 = SUM(里程碑内任务进度) / 任务数',
    example: '里程碑包含3个任务，分别完成100%、80%、60%，进度=80%',
  },

  // === 资源效能术语（v1.2 新增） ===

  productivity: {
    term: '产能',
    shortDesc: '单位时间的有效产出',
    fullDesc: '衡量成员在单位时间内的有效工作产出。基于完成任务数量和任务复杂度计算，反映成员的工作效率。',
    formula: '产能 = 完成任务数 × 复杂度系数 / 投入天数',
    example: '完成5个任务（复杂度总和6），投入10天，产能=0.6',
  },

  estimationAccuracy: {
    term: '预估准确性',
    shortDesc: '计划工期的准确程度',
    fullDesc: '衡量成员对任务工期预估的准确程度。计算实际工期与计划工期的偏差，反映时间管理能力和经验水平。',
    formula: '预估准确性 = 1 - |实际工期 - 计划工期| / 计划工期',
    example: '计划10天，实际8天完成，准确性 = 1 - |8-10|/10 = 0.8 (80%)',
  },

  reworkRate: {
    term: '返工率',
    shortDesc: '任务计划调整的比例',
    fullDesc: '统计周期内，发生计划调整的任务占总任务的比例。低返工率表示任务规划质量高，需求理解准确。',
    formula: '返工率 = 计划调整次数 / 任务数 × 100%',
    example: '10个任务中有2个调整了计划，返工率 = 20%',
  },

  fulltimeUtilization: {
    term: '全职比利用率',
    shortDesc: '资源利用效率',
    fullDesc: '衡量成员的实际工作产出与分配资源的比例。反映资源分配的合理性和利用效率。',
    formula: '全职比利用率 = 实际产出 / 分配全职比 × 100%',
    example: '分配0.8全职比，实际完成1.0全职比的任务，利用率 = 125%',
  },
};

/**
 * 获取术语定义
 */
export function getTermDefinition(key: string): TermDefinition | undefined {
  return REPORT_TERMS[key];
}

/**
 * 获取术语的完整说明（简化用法）
 */
export function getTermTooltip(key: string): string | undefined {
  const def = REPORT_TERMS[key];
  return def?.fullDesc;
}
