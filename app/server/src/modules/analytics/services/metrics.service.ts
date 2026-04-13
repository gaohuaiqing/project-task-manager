/**
 * 指标计算服务
 * 提供仪表板和报表分析的统一指标计算逻辑
 *
 * @module analytics/services/metrics
 * @see REQ_07_INDEX.md §3 核心指标清单
 */

import type {
  CompletionRateMetric,
  DelayRateMetric,
  ActivityMetric,
  WorkloadMetric,
  EstimationAccuracyMetric,
  ProductivityMetric,
  ReworkRateMetric,
  BaseMetrics,
  RiskLevel,
  MemberEfficiencyMetric,
} from '../shared-types/shared';

/**
 * 指标计算服务类
 * 所有计算方法均为静态方法，无需实例化
 */
export class MetricsService {
  // ============ 基础指标计算 ============

  /**
   * 计算完成率
   * @param completed 已完成数量
   * @param total 总数量
   */
  static calculateCompletionRate(completed: number, total: number): CompletionRateMetric {
    const rate = total > 0 ? Math.round((completed / total) * 100 * 100) / 100 : 0;
    return {
      rate,
      completed,
      total,
    };
  }

  /**
   * 计算延期率
   * @param delayed 延期数量
   * @param total 总数量
   */
  static calculateDelayRate(delayed: number, total: number): DelayRateMetric {
    const rate = total > 0 ? Math.round((delayed / total) * 100 * 100) / 100 : 0;
    return {
      rate,
      delayed,
      total,
    };
  }

  /**
   * 计算活跃度
   * @param activeTasks 7日内有进展的任务数
   * @param totalTasks 总任务数
   */
  static calculateActivity(activeTasks: number, totalTasks: number): ActivityMetric {
    const rate = totalTasks > 0 ? Math.round((activeTasks / totalTasks) * 100 * 100) / 100 : 0;
    return {
      rate,
      activeTasks,
      totalTasks,
    };
  }

  /**
   * 计算负载率
   * @param totalFullTimeRatio 全职比总和
   * @param memberCount 成员数
   */
  static calculateWorkload(totalFullTimeRatio: number, memberCount: number): WorkloadMetric {
    return {
      totalFullTimeRatio,
      inProgressTasks: 0, // 需要从外部传入
      memberCount,
    };
  }

  /**
   * 计算预估准确性
   * 公式：1 - abs(计划工期 - 实际工期) / 计划工期
   * @param plannedDuration 计划工期（天）
   * @param actualDuration 实际工期（天）
   */
  static calculateEstimationAccuracy(
    plannedDuration: number,
    actualDuration: number
  ): EstimationAccuracyMetric {
    if (plannedDuration <= 0) {
      return {
        accuracy: 0,
        plannedDuration,
        actualDuration,
        deviationRate: 100,
      };
    }

    const deviation = Math.abs(plannedDuration - actualDuration);
    const deviationRate = Math.round((deviation / plannedDuration) * 100 * 100) / 100;
    const accuracy = Math.max(0, Math.round((1 - deviation / plannedDuration) * 100 * 100) / 100);

    return {
      accuracy,
      plannedDuration,
      actualDuration,
      deviationRate,
    };
  }

  /**
   * 计算产能
   * @param completedTasks 已完成任务数
   * @param totalHours 总工时
   */
  static calculateProductivity(completedTasks: number, totalHours: number): ProductivityMetric {
    const productivity = totalHours > 0 ? Math.round((completedTasks / totalHours) * 1000) / 1000 : 0;
    return {
      productivity,
      completedTasks,
      totalHours,
    };
  }

  /**
   * 计算返工率
   * @param reworkTasks 返工任务数
   * @param completedTasks 已完成任务数
   */
  static calculateReworkRate(reworkTasks: number, completedTasks: number): ReworkRateMetric {
    const rate = completedTasks > 0 ? Math.round((reworkTasks / completedTasks) * 100 * 100) / 100 : 0;
    return {
      rate,
      reworkTasks,
      completedTasks,
    };
  }

  // ============ 聚合指标计算 ============

  /**
   * 计算基础统计指标集
   */
  static calculateBaseMetrics(data: {
    totalTasks: number;
    completedTasks: number;
    inProgressTasks: number;
    delayWarningTasks: number;
    delayedTasks: number;
  }): BaseMetrics {
    const completionRate = this.calculateCompletionRate(data.completedTasks, data.totalTasks).rate;
    const delayRate = this.calculateDelayRate(
      data.delayWarningTasks + data.delayedTasks,
      data.totalTasks
    ).rate;

    return {
      ...data,
      completionRate,
      delayRate,
    };
  }

  /**
   * 计算成员风险等级
   * @param delayRate 延期率
   * @param activityRate 活跃度
   */
  static calculateRiskLevel(delayRate: number, activityRate: number): RiskLevel {
    // 高风险：延期率 > 30% 或 (延期率 > 20% 且 活跃度 < 60%)
    if (delayRate > 30 || (delayRate > 20 && activityRate < 60)) {
      return 'high';
    }
    // 中风险：延期率 10%-30% 或 (延期率 > 10% 且 活跃度 < 60%)
    if (delayRate > 10 || (delayRate > 10 && activityRate < 60)) {
      return 'medium';
    }
    // 低风险：延期率 < 10% 且 活跃度 >= 60%
    return 'low';
  }

  /**
   * 计算成员效能指标
   */
  static calculateMemberEfficiency(data: {
    memberId: number;
    memberName: string;
    totalTasks: number;
    delayedTasks: number;
    fullTimeRatio: number;
    activeTasks: number;
    mainDelayType?: string;
  }): MemberEfficiencyMetric {
    const delayRate = this.calculateDelayRate(data.delayedTasks, data.totalTasks).rate;
    const activityRate = this.calculateActivity(data.activeTasks, data.totalTasks).rate;
    const riskLevel = this.calculateRiskLevel(delayRate, activityRate);

    return {
      memberId: data.memberId,
      memberName: data.memberName,
      totalTasks: data.totalTasks,
      delayedTasks: data.delayedTasks,
      delayRate,
      workload: data.fullTimeRatio,
      activityRate,
      mainDelayType: data.mainDelayType,
      riskLevel,
    };
  }

  // ============ 格式化方法 ============

  /**
   * 格式化百分比值
   */
  static formatPercent(value: number): string {
    return `${value.toFixed(1)}%`;
  }

  /**
   * 格式化数字（带单位）
   */
  static formatNumber(value: number, unit?: string): string {
    const formatted = value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value.toString();
    return unit ? `${formatted}${unit}` : formatted;
  }

  /**
   * 格式化天数
   */
  static formatDays(days: number): string {
    if (days === 0) return '今天';
    if (days > 0) return `${days}天后`;
    return `${Math.abs(days)}天前`;
  }

  /**
   * 计算趋势变化
   */
  static calculateTrend(current: number, previous: number): {
    change: number;
    changePercent: number;
    direction: 'up' | 'down' | 'flat';
    isPositive: boolean;
  } {
    const change = current - previous;
    const changePercent = previous > 0 ? Math.round((change / previous) * 100 * 10) / 10 : 0;

    let direction: 'up' | 'down' | 'flat' = 'flat';
    if (change > 0) direction = 'up';
    else if (change < 0) direction = 'down';

    // 对于延期率等指标，下降是正向
    return {
      change,
      changePercent,
      direction,
      isPositive: direction === 'down', // 默认下降为正向，调用方可根据指标类型调整
    };
  }

  // ============ 预估准确性分类 ============

  /**
   * 获取预估准确性等级
   */
  static getEstimationAccuracyLevel(accuracy: number): {
    level: 'accurate' | 'slight' | 'obvious' | 'serious';
    label: string;
  } {
    if (accuracy >= 90) {
      return { level: 'accurate', label: '精准' };
    }
    if (accuracy >= 70) {
      return { level: 'slight', label: '轻微偏差' };
    }
    if (accuracy >= 50) {
      return { level: 'obvious', label: '明显偏差' };
    }
    return { level: 'serious', label: '严重偏差' };
  }
}

export default MetricsService;
