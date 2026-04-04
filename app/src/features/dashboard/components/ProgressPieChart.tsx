/**
 * 项目进度饼图组件
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
  '#3b82f6', // blue
  '#22c55e', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#84cc16', // lime
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
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent className="h-[300px] flex items-center justify-center">
          <LoadingSpinner />
        </CardContent>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent className="h-[300px] flex items-center justify-center text-muted-foreground">
          暂无项目数据
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <p className="text-sm text-muted-foreground">共 {totalTasks} 个任务</p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) =>
                `${name} (${(percent * 100).toFixed(0)}%)`
              }
              outerRadius={100}
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
                backgroundColor: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
              }}
              formatter={(value: number, name: string, props: any) => [
                `${value} 个任务 (${props.payload.progress}%)`,
                props.payload.name,
              ]}
            />
            <Legend />
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
      <div className="h-[300px] flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="h-[300px] flex items-center justify-center text-muted-foreground">
        暂无数据
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ label, percent }) =>
            `${label} (${(percent * 100).toFixed(0)}%)`
          }
          outerRadius={100}
          dataKey="count"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            backgroundColor: '#fff',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
          }}
        />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}
