/**
 * 趋势计算服务
 * 提供仪表板和报表分析的趋势数据计算
 *
 * @module analytics/services/trend
 * @see REQ_07_INDEX.md §4 API 汇总
 */

import type { TrendDataPoint, DelayTrendData, MultiSeriesTrendData } from '../shared-types/charts';

/**
 * 时间粒度类型
 */
export type TimeGranularity = 'day' | 'week' | 'month';

/**
 * 趋势计算服务
 */
export class TrendService {
  /**
   * 生成时间序列
   * @param startDate 开始日期 (YYYY-MM-DD)
   * @param endDate 结束日期 (YYYY-MM-DD)
   * @param granularity 时间粒度
   */
  static generateTimeSeries(
    startDate: string,
    endDate: string,
    granularity: TimeGranularity = 'day'
  ): string[] {
    const result: string[] = [];
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (granularity === 'day') {
      const current = new Date(start);
      while (current <= end) {
        result.push(current.toISOString().split('T')[0]);
        current.setDate(current.getDate() + 1);
      }
    } else if (granularity === 'week') {
      const current = new Date(start);
      // 调整到周一
      const day = current.getDay();
      const diff = current.getDate() - day + (day === 0 ? -6 : 1);
      current.setDate(diff);

      while (current <= end) {
        // 使用 ISO 周标识 (YYYY-WXX)
        const year = current.getFullYear();
        const weekNum = this.getISOWeek(current);
        result.push(`${year}-W${String(weekNum).padStart(2, '0')}`);
        current.setDate(current.getDate() + 7);
      }
    } else if (granularity === 'month') {
      const current = new Date(start);
      while (current <= end) {
        result.push(`${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`);
        current.setMonth(current.getMonth() + 1);
      }
    }

    return result;
  }

  /**
   * 获取 ISO 周数
   */
  private static getISOWeek(date: Date): number {
    const tmpDate = new Date(date.valueOf());
    tmpDate.setHours(0, 0, 0, 0);
    // Thursday in current week decides the year
    tmpDate.setDate(tmpDate.getDate() + 3 - ((tmpDate.getDay() + 6) % 7));
    // January 4 is always in week 1
    const week1 = new Date(tmpDate.getFullYear(), 0, 4);
    // Adjust to Thursday in week 1 and count number of weeks from date to week1
    return (
      1 +
      Math.round(
        ((tmpDate.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7
      )
    );
  }

  /**
   * 填充缺失的时间点
   * 确保时间序列连续，缺失的点填充为 0
   */
  static fillMissingTimePoints(
    data: TrendDataPoint[],
    startDate: string,
    endDate: string,
    granularity: TimeGranularity = 'day'
  ): TrendDataPoint[] {
    const timeSeries = this.generateTimeSeries(startDate, endDate, granularity);
    const dataMap = new Map<string, TrendDataPoint>();

    // 建立数据映射
    data.forEach((point) => {
      dataMap.set(point.date, point);
    });

    // 填充缺失点
    return timeSeries.map((date) => {
      const existing = dataMap.get(date);
      if (existing) {
        return existing;
      }
      // 创建空数据点
      return {
        date,
        created: 0,
        completed: 0,
        delayed: 0,
        value: 0,
      };
    });
  }

  /**
   * 计算趋势统计
   */
  static calculateTrendStats(data: TrendDataPoint[]): {
    total: number;
    average: number;
    max: number;
    min: number;
    trend: 'up' | 'down' | 'stable';
  } {
    const values = data.map((d) => d.value || 0);
    const total = values.reduce((sum, v) => sum + v, 0);
    const average = values.length > 0 ? total / values.length : 0;
    const max = Math.max(...values);
    const min = Math.min(...values);

    // 计算趋势方向（比较前半段和后半段均值）
    const mid = Math.floor(values.length / 2);
    const firstHalf = values.slice(0, mid);
    const secondHalf = values.slice(mid);
    const firstAvg = firstHalf.reduce((s, v) => s + v, 0) / (firstHalf.length || 1);
    const secondAvg = secondHalf.reduce((s, v) => s + v, 0) / (secondHalf.length || 1);

    let trend: 'up' | 'down' | 'stable' = 'stable';
    const threshold = average * 0.1; // 10% 变化阈值
    if (secondAvg - firstAvg > threshold) {
      trend = 'up';
    } else if (firstAvg - secondAvg > threshold) {
      trend = 'down';
    }

    return {
      total: Math.round(total * 100) / 100,
      average: Math.round(average * 100) / 100,
      max,
      min,
      trend,
    };
  }

  /**
   * 计算移动平均
   */
  static calculateMovingAverage(
    data: TrendDataPoint[],
    windowSize: number = 7
  ): TrendDataPoint[] {
    if (data.length < windowSize) {
      return data;
    }

    return data.map((point, index) => {
      if (index < windowSize - 1) {
        return point;
      }

      const window = data.slice(index - windowSize + 1, index + 1);
      const avgValue = window.reduce((sum, d) => sum + (d.value || 0), 0) / windowSize;

      return {
        ...point,
        value: Math.round(avgValue * 100) / 100,
      };
    });
  }

  /**
   * 计算延期收敛/扩散趋势
   */
  static calculateDelayConvergence(data: DelayTrendData[]): {
    status: 'converging' | 'diverging' | 'stable';
    newDelayedTotal: number;
    resolvedTotal: number;
  } {
    const newDelayedTotal = data.reduce((sum, d) => sum + d.newDelayed, 0);
    const resolvedTotal = data.reduce((sum, d) => sum + d.resolvedDelayed, 0);

    let status: 'converging' | 'diverging' | 'stable' = 'stable';
    const diff = resolvedTotal - newDelayedTotal;

    if (diff > 0) {
      status = 'converging';
    } else if (diff < 0) {
      status = 'diverging';
    }

    return {
      status,
      newDelayedTotal,
      resolvedTotal,
    };
  }

  /**
   * 按周聚合数据
   */
  static aggregateByWeek(data: TrendDataPoint[]): TrendDataPoint[] {
    const weekMap = new Map<string, TrendDataPoint>();

    data.forEach((point) => {
      const date = new Date(point.date);
      const year = date.getFullYear();
      const weekNum = this.getISOWeek(date);
      const weekKey = `${year}-W${String(weekNum).padStart(2, '0')}`;

      const existing = weekMap.get(weekKey);
      if (existing) {
        existing.created = (existing.created || 0) + (point.created || 0);
        existing.completed = (existing.completed || 0) + (point.completed || 0);
        existing.delayed = (existing.delayed || 0) + (point.delayed || 0);
        existing.value = (existing.value || 0) + (point.value || 0);
      } else {
        weekMap.set(weekKey, {
          date: weekKey,
          created: point.created || 0,
          completed: point.completed || 0,
          delayed: point.delayed || 0,
          value: point.value || 0,
        });
      }
    });

    return Array.from(weekMap.values()).sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * 按月聚合数据
   */
  static aggregateByMonth(data: TrendDataPoint[]): TrendDataPoint[] {
    const monthMap = new Map<string, TrendDataPoint>();

    data.forEach((point) => {
      const date = new Date(point.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      const existing = monthMap.get(monthKey);
      if (existing) {
        existing.created = (existing.created || 0) + (point.created || 0);
        existing.completed = (existing.completed || 0) + (point.completed || 0);
        existing.delayed = (existing.delayed || 0) + (point.delayed || 0);
        existing.value = (existing.value || 0) + (point.value || 0);
      } else {
        monthMap.set(monthKey, {
          date: monthKey,
          created: point.created || 0,
          completed: point.completed || 0,
          delayed: point.delayed || 0,
          value: point.value || 0,
        });
      }
    });

    return Array.from(monthMap.values()).sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * 计算环比变化
   */
  static calculatePeriodOverPeriod(
    currentData: TrendDataPoint[],
    previousData: TrendDataPoint[]
  ): {
    created: { change: number; changePercent: number };
    completed: { change: number; changePercent: number };
    delayed: { change: number; changePercent: number };
  } {
    const currentSum = {
      created: currentData.reduce((s, d) => s + (d.created || 0), 0),
      completed: currentData.reduce((s, d) => s + (d.completed || 0), 0),
      delayed: currentData.reduce((s, d) => s + (d.delayed || 0), 0),
    };

    const previousSum = {
      created: previousData.reduce((s, d) => s + (d.created || 0), 0),
      completed: previousData.reduce((s, d) => s + (d.completed || 0), 0),
      delayed: previousData.reduce((s, d) => s + (d.delayed || 0), 0),
    };

    const calcChange = (current: number, previous: number) => ({
      change: current - previous,
      changePercent: previous > 0 ? Math.round(((current - previous) / previous) * 100 * 10) / 10 : 0,
    });

    return {
      created: calcChange(currentSum.created, previousSum.created),
      completed: calcChange(currentSum.completed, previousSum.completed),
      delayed: calcChange(currentSum.delayed, previousSum.delayed),
    };
  }

  /**
   * 格式化时间粒度标签
   */
  static formatGranularityLabel(date: string, granularity: TimeGranularity): string {
    if (granularity === 'day') {
      return date; // YYYY-MM-DD
    } else if (granularity === 'week') {
      return `第${date.split('-W')[1]}周`;
    } else if (granularity === 'month') {
      const [year, month] = date.split('-');
      return `${year}年${month}月`;
    }
    return date;
  }
}

export default TrendService;
