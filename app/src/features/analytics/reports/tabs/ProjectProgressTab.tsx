/**
 * 项目进度报表Tab
 * 支持两种视图模式：
 * - 汇总视图：未选择项目时，显示所有项目的汇总统计
 * - 详情视图：选择具体项目后，显示单项目的详细进度报表
 */

import { StatsCardGroup, ChartContainer, ChartGroup, DataTable } from '../components/shared';
import { PieChart, BarChart, LineChart } from '../components/charts';
import { MILESTONE_COLUMNS } from '../config';
import { useProjectProgressData } from '../data';
import type { ReportFilters, MilestoneItem, ProjectProgressSummaryData, ProjectProgressData, ProjectProgressCard } from '../types';
import { cn } from '@/lib/utils';

/** 图表中表示"剩余"部分的浅灰色 */
const CHART_MUTED_COLOR = '#94A3B8'; // slate-400，比原来的 #E2E8F0 更深

/** 项目进度已完成部分的绿色 */
const PROGRESS_COMPLETED_COLOR = '#16A34A'; // green-600，比原来的 #059669 更饱满

export interface ProjectProgressTabProps {
  filters: ReportFilters;
}

export function ProjectProgressTab({ filters }: ProjectProgressTabProps) {
  const projectId = filters.projectId;
  const { data, isLoading, error, isSummary } = useProjectProgressData(projectId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">加载中...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-destructive">加载失败: {error?.message}</div>
      </div>
    );
  }

  if (isSummary) {
    return <ProjectProgressSummaryView data={data as ProjectProgressSummaryData} />;
  }

  return <ProjectProgressDetailView data={data as ProjectProgressData} />;
}

// ==================== 汇总视图 ====================

function ProjectProgressSummaryView({ data }: { data: ProjectProgressSummaryData }) {
  // 安全获取数据，防止 undefined
  const projects = data.projects || [];
  const upcomingMilestones = data.upcomingMilestones || [];
  const statusChart = data.statusChart || { labels: [], values: [], percentages: [] };

  // 按项目名称分组里程碑
  const milestonesByProject = new Map<string, MilestoneItem[]>();
  for (const m of upcomingMilestones) {
    const key = m.projectName || '__unknown__';
    const list = milestonesByProject.get(key) || [];
    list.push(m);
    milestonesByProject.set(key, list);
  }

  return (
    <div className="space-y-6">
      {/* 统计卡片 */}
      <StatsCardGroup stats={data.stats} />

      {/* 图表区域 — 左：状态饼图，右：项目进度对比柱状图 */}
      <ChartGroup>
        <ChartContainer title="任务状态分布" subtitle="所有项目的任务状态汇总">
          <PieChart data={statusChart} innerRadius={50} />
        </ChartContainer>
        <ChartContainer title="项目进度对比" subtitle="各项目完成进度">
          <ProjectProgressChart projects={projects} />
        </ChartContainer>
      </ChartGroup>

      {/* 项目卡片列表 — 每个项目一个区块，内含该项目的里程碑 */}
      {projects.length === 0 ? (
        <div className="rounded-xl border border-border/50 bg-card p-8 text-center text-muted-foreground">
          暂无项目数据
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {projects.map((project) => {
            const projectMilestones = milestonesByProject.get(project.projectName) || [];
            return (
              <ProjectCard
                key={project.projectId}
                project={project}
                milestones={projectMilestones}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

// ==================== 详情视图 ====================

function ProjectProgressDetailView({ data }: { data: ProjectProgressData }) {
  return (
    <div className="space-y-6">
      <StatsCardGroup stats={data.stats} />

      <ChartGroup>
        <ChartContainer title="任务状态分布" subtitle="当前各状态任务数量">
          <PieChart data={data.taskStatusChart} innerRadius={50} />
        </ChartContainer>
        <ChartContainer title="进度趋势" subtitle="近30天完成率变化">
          <LineChart data={data.progressTrend} yAxisLabel="完成率 (%)" />
        </ChartContainer>
      </ChartGroup>

      <ChartGroup>
        <ChartContainer title="里程碑完成情况">
          <BarChart data={data.milestoneChart} yAxisLabel="完成百分比 (%)" />
        </ChartContainer>
        <ChartContainer title="进度变化速度" subtitle="每周进度增量">
          <LineChart data={data.progressSpeedChart} yAxisLabel="进度增量 (%)" />
        </ChartContainer>
      </ChartGroup>

      <div className="rounded-xl border border-border/50 bg-card p-4">
        <h3 className="text-sm font-semibold mb-4">里程碑列表</h3>
        <DataTable
          columns={MILESTONE_COLUMNS}
          data={data.milestones}
          pagination={{ page: 1, pageSize: 10, total: data.milestones.length }}
        />
      </div>
    </div>
  );
}

// ==================== 子组件 ====================

/** 项目进度对比柱状图（横向） */
function ProjectProgressChart({ projects }: { projects: ProjectProgressCard[] }) {
  // 防御性检查
  if (!projects || !Array.isArray(projects) || projects.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
        暂无项目数据
      </div>
    );
  }

  // 构造 BarChartDataItem[] 格式的数据
  const chartData = projects.map(p => ({
    name: truncateName(p.projectName, 10),
    completed: p.completedTasks,
    remaining: p.totalTasks - p.completedTasks,
  }));

  // 数据键配置
  const dataKeys = [
    { key: 'completed', name: '已完成', color: PROGRESS_COMPLETED_COLOR },
    { key: 'remaining', name: '剩余', color: CHART_MUTED_COLOR },
  ];

  // 动态高度：每个项目 40px，上限 600px，超出时启用滚动
  const BAR_HEIGHT = 40;
  const MAX_VISIBLE_HEIGHT = 600;
  const fullHeight = Math.max(200, projects.length * BAR_HEIGHT);
  const needsScroll = fullHeight > MAX_VISIBLE_HEIGHT;

  const chartElement = (
    <BarChart
      data={chartData}
      dataKeys={dataKeys}
      layout="vertical"
      stacked
      showLegend={false}
      height={fullHeight}
      yAxisLabel=""
    />
  );

  if (needsScroll) {
    return (
      <div className="overflow-y-auto rounded-md" style={{ maxHeight: MAX_VISIBLE_HEIGHT }}>
        {chartElement}
      </div>
    );
  }

  return chartElement;
}

/** 项目卡片 — 含项目概况 + 按项目分组的里程碑 */
function ProjectCard({ project, milestones }: { project: ProjectProgressCard; milestones: MilestoneItem[] }) {
  const progressColor = project.progress >= 80
    ? 'text-green-600'
    : project.progress >= 50
      ? 'text-blue-600'
      : 'text-amber-600';

  const progressBg = project.progress >= 80
    ? 'bg-green-500'
    : project.progress >= 50
      ? 'bg-blue-500'
      : 'bg-amber-500';

  return (
    <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
      {/* 头部 */}
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-semibold text-sm truncate min-w-0 mr-2" title={project.projectName}>
            {project.projectName}
          </h4>
          <span className={cn('text-xl font-bold tabular-nums shrink-0', progressColor)}>
            {project.progress}%
          </span>
        </div>

        {/* 进度条 */}
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div className={cn('h-full rounded-full transition-all', progressBg)} style={{ width: `${project.progress}%` }} />
        </div>

        {/* 指标行 */}
        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
          <span>{project.completedTasks}/{project.totalTasks} 任务</span>
          {project.deadline && (
            <>
              <span className="text-border">|</span>
              <span>截止 {project.deadline}</span>
            </>
          )}
          <span className={cn('ml-auto px-1.5 py-0.5 rounded text-[10px] font-medium', getStatusColor(project.status))}>
            {getStatusLabel(project.status)}
          </span>
        </div>
      </div>

      {/* 里程碑区域 */}
      {milestones.length > 0 ? (
        <div className="border-t border-border/30 px-4 py-3">
          <div className="space-y-1.5">
            {milestones.map((ms) => (
              <div key={ms.id} className="flex items-center gap-2 text-xs">
                <div className={cn(
                  'w-1.5 h-1.5 rounded-full shrink-0',
                  ms.daysToTarget < 0 ? 'bg-red-500' : ms.daysToTarget <= 7 ? 'bg-amber-500' : 'bg-blue-400',
                )} />
                <span className="truncate min-w-0 flex-1" title={ms.name}>{ms.name}</span>
                <span className={cn('shrink-0 tabular-nums', ms.daysToTarget < 0 ? 'text-red-500 font-medium' : 'text-muted-foreground')}>
                  {ms.daysToTarget < 0 ? `超${Math.abs(ms.daysToTarget)}d` : `${ms.daysToTarget}d`}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="border-t border-border/30 px-4 py-2 text-[10px] text-muted-foreground">
          近期无里程碑
        </div>
      )}
    </div>
  );
}

// ==================== 工具函数 ====================

function truncateName(name: string, max: number): string {
  return name.length > max ? name.slice(0, max) + '...' : name;
}

function getStatusLabel(status: string): string {
  const map: Record<string, string> = {
    planning: '规划中',
    active: '进行中',
    in_progress: '进行中',
    completed: '已完成',
    on_hold: '暂停',
    cancelled: '已取消',
  };
  return map[status] || status;
}

function getStatusColor(status: string): string {
  const map: Record<string, string> = {
    planning: 'bg-gray-100 text-gray-600',
    active: 'bg-blue-50 text-blue-600',
    in_progress: 'bg-blue-50 text-blue-600',
    completed: 'bg-green-50 text-green-600',
    on_hold: 'bg-amber-50 text-amber-600',
    cancelled: 'bg-red-50 text-red-600',
  };
  return map[status] || 'bg-gray-100 text-gray-600';
}
