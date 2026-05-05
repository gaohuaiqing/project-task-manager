/**
 * 报表统计卡片组件
 * 复用 analytics/shared/components/StatsCard，通过数据适配层桥接报表 StatCard 类型
 *
 * @module analytics/reports/components/shared/StatsCard
 */

import { StatsCard as SharedStatsCard } from '@/features/analytics/shared/components/StatsCard';
import {
  ClipboardList,
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  XCircle,
  Zap,
  Users,
  Activity,
  Target,
  TrendingUp,
  RefreshCw,
  Percent,
  Clock,
  FolderKanban,
} from 'lucide-react';
import type { StatCard as StatCardType } from '../../types';
import { cn } from '@/lib/utils';

// ==================== 图标映射 ====================

const ICON_MAP: Record<string, React.ReactNode> = {
  ClipboardList: <ClipboardList className="h-4 w-4" />,
  CheckCircle: <CheckCircle className="h-4 w-4" />,
  AlertTriangle: <AlertTriangle className="h-4 w-4" />,
  AlertCircle: <AlertCircle className="h-4 w-4" />,
  XCircle: <XCircle className="h-4 w-4" />,
  Zap: <Zap className="h-4 w-4" />,
  Users: <Users className="h-4 w-4" />,
  Activity: <Activity className="h-4 w-4" />,
  Target: <Target className="h-4 w-4" />,
  TrendingUp: <TrendingUp className="h-4 w-4" />,
  RefreshCw: <RefreshCw className="h-4 w-4" />,
  Percent: <Percent className="h-4 w-4" />,
  Clock: <Clock className="h-4 w-4" />,
  FolderKanban: <FolderKanban className="h-4 w-4" />,
};

// ==================== 数据适配 ====================

/**
 * 将报表 StatCard 数据转换为共享 StatsCard 所需的 props
 */
function adaptStatCard(stat: StatCardType) {
  // 趋势适配：报表 trend → 共享 StatsCard 的 trend + trendText
  let trend: number | undefined;
  let trendText: string | undefined;

  if (stat.trend) {
    const sign = stat.trend.direction === 'up' ? '↑' : stat.trend.direction === 'down' ? '↓' : '–';
    const pct = Math.abs(stat.trend.value);
    trendText = `${sign}${pct < 10 ? pct + '%' : pct} vs 上期`;
    // 共享 StatsCard 的 trend 为数值：正=上升，负=下降
    trend = stat.trend.direction === 'up' ? Math.abs(stat.trend.value) : stat.trend.direction === 'down' ? -Math.abs(stat.trend.value) : 0;
  }

  return {
    title: stat.label,
    value: stat.value,
    description: stat.description,
    subtitle: stat.subtitle,
    valueColor: stat.valueColor ?? (stat.trend && !stat.trend.isPositive ? 'danger' : 'default'),
    customValueColor: undefined,
    trend,
    trendText,
    invertTrendColors: stat.invertTrendColors,
    icon: stat.icon ? ICON_MAP[stat.icon] : undefined,
  };
}

// ==================== 统计卡片组 ====================

export interface StatsCardGroupProps {
  stats: StatCardType[];
  className?: string;
}

export function StatsCardGroup({ stats, className }: StatsCardGroupProps) {
  // 防御性检查：stats 可能为 undefined
  if (!stats || !Array.isArray(stats)) {
    return null;
  }

  return (
    <div className={cn('grid grid-cols-2 md:grid-cols-4 gap-4', className)}>
      {stats.map((stat) => (
        <SharedStatsCard key={stat.key} {...adaptStatCard(stat)} />
      ))}
    </div>
  );
}
