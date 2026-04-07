/**
 * 项目进度饼图组件 - 专业仪表盘风格
 * 显示各项目的任务分布
 */
import { useMemo } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingSpinner } from '@/shared/components/LoadingSpinner';

interface ProjectProgressData {
  projectId?: string;
  projectName?: string;
  name?: string;  // 兼容旧数据格式
  status?: string;
  progress?: number;
  totalTasks?: number;
  completedTasks?: number;
  deadline?: string | null;
  members?: Array<{
    id: number;
    name: string;
    avatar: string | null;
  }>;
}

interface ProgressPieChartProps {
  data: ProjectProgressData[];
  isLoading?: boolean;
  title?: string;
}

const COLORS = [
  '#10B981', // 翠绿 - 主色
  '#0EA5E9', // 青蓝 - 辅助色
  '#F59E0B', // 琥珀 - 警告色
  '#EF4444', // 红色 - 危险色
  '#8B5CF6', // 紫罗兰
  '#EC4899', // 粉色
  '#06B6D4', // 青色
  '#84CC16', // 青柠
];

export function ProgressPieChart({
  data,
  isLoading,
  title = '项目任务分布',
}: ProgressPieChartProps) {
  const chartData = useMemo(() => {
    return data.map((item) => ({
      name: item.projectName || item.name || '未命名项目',
      value: item.totalTasks || 0,
      progress: item.progress || 0,
    }));
  }, [data]);

  const totalTasks = useMemo(() => {
    return data.reduce((sum, item) => sum + (item.totalTasks || 0), 0);
  }, [data]);

  if (isLoading) {
    return (
      <Card className="rounded-2xl border border-gray-100 dark:border-slate-700/50 bg-white dark:bg-slate-800/50 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</CardTitle>
        </CardHeader>
        <CardContent className="h-[280px] flex items-center justify-center">
          <LoadingSpinner />
        </CardContent>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card className="rounded-2xl border border-gray-100 dark:border-slate-700/50 bg-white dark:bg-slate-800/50 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</CardTitle>
        </CardHeader>
        <CardContent className="h-[280px] flex items-center justify-center text-gray-400 text-xs">
          暂无项目数据
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-2xl border border-gray-100 dark:border-slate-700/50 bg-white dark:bg-slate-800/50 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</CardTitle>
        <p className="text-xs text-gray-500 dark:text-gray-400">共 {totalTasks} 个任务</p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) =>
                `${name} (${(percent * 100).toFixed(0)}%)`
              }
              outerRadius={90}
              fill="#8884d8"
              dataKey="value"
            >
              {chartData.map((_, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={COLORS[index % COLORS.length]}
                />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                fontSize: '12px',
              }}
              formatter={(value: number, name: string, props: any) => [
                `${value} 个任务 (${props.payload.progress}%)`,
                props.payload.name,
              ]}
            />
            <Legend
              wrapperStyle={{ fontSize: '11px' }}
              iconType="circle"
            />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

/**
 * 任务状态分布饼图
 */
interface StatusDistributionData {
  status: string;
  label: string;
  count: number;
  color: string;
}

interface StatusPieChartProps {
  data: StatusDistributionData[];
  isLoading?: boolean;
  title?: string;
}

export function StatusPieChart({
  data,
  isLoading,
}: StatusPieChartProps) {
  if (isLoading) {
    return (
      <div className="h-[280px] flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="h-[280px] flex items-center justify-center text-gray-400 text-xs">
        暂无数据
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ label, percent }) =>
            `${label} (${(percent * 100).toFixed(0)}%)`
          }
          outerRadius={90}
          dataKey="count"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            backgroundColor: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '8px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            fontSize: '12px',
          }}
        />
        <Legend
          wrapperStyle={{ fontSize: '11px' }}
          iconType="circle"
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
