# 报表分析模块优化 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复数据准确性，实现角色数据隔离和动态维度分析，精简仪表板内容，完成报表导出功能

**Architecture:** 后端分阶段修复——先修数据Bug，再加固角色隔离，最后加动态维度。前端按业务定位精简仪表板，为报表增加趋势分析能力。不改变现有技术栈（React 19 + Express + MySQL + Recharts）。

**Tech Stack:** React 19, Express, MySQL2, Recharts, React Query, TypeScript

**Requirements docs (updated 2026-04-03):**
- `docs/requirements/modules/REQ_07_analytics.md` v1.1
- `docs/requirements/FINAL_REQUIREMENTS_0327-0005.md` 模块#18 v1.1
- `docs/requirements/UI_Requirement_0323-1921.md` 5.4/5.4.1 v1.1

---

## Context

报表分析模块（analytics）当前实现约70%，存在5类问题：数据计算Bug导致数字不准、角色数据隔离只有admin/非admin两级、报表趋势数据全部为空、仪表板包含非核心组件、导出功能是空壳。本次优化从用户视角出发，按"发现核心问题→分析原因→呈现趋势"的业务定位，逐一修复和增强。

## File Structure

```
app/server/src/modules/analytics/
├── types.ts              # 修改：补充动态维度类型
├── repository.ts          # 修改：修Bug、加趋势查询、加角色过滤
├── service.ts             # 修改：充实业务逻辑（权限过滤、趋势计算）
└── routes.ts              # 修改：补充趋势API路由

app/src/features/dashboard/
├── index.tsx              # 修改：移除非核心组件、加趋势指标
├── components/
│   ├── NotificationCenter.tsx   # 删除
│   ├── QuickActions.tsx         # 删除
│   └── StatsCard.tsx            # 修改：支持趋势指标props

app/src/features/reports/
├── index.tsx              # 修改：导出功能实现
├── components/
│   ├── ReportFilterBar.tsx    # 修改：加时间范围选项
│   ├── ProjectProgressTab.tsx # 修改：加动态维度
│   ├── TaskStatisticsTab.tsx  # 修改：加动态维度
│   ├── DelayAnalysisTab.tsx   # 修改：加动态维度
│   └── MemberAnalysisTab.tsx  # 修改：加动态维度

app/src/lib/api/
├── analytics.api.ts       # 修改：加趋势API调用
└── reports.api.ts          # 修改：加趋势API调用
```

---

## Chunk 1: 数据准确性修复

> 后端基础修复，确保所有查询返回正确的数据。所有后续任务依赖此Chunk。

### Task 1: 修复完成率和延期率计算Bug

**Files:**
- Modify: `app/server/src/modules/analytics/repository.ts:345-347, 511`

- [ ] **Step 1: 修复 avg_completion_rate 计算**

`repository.ts:345-346` 当前代码：
```sql
AVG(CASE WHEN status IN ('early_completed', 'on_time_completed', 'overdue_completed') THEN 100 ELSE 0 END)
```
改为：
```sql
AVG(t.progress)
```
这样才是真正的"平均进度"，而不是"已完成占比"。

- [ ] **Step 2: 修复 delay_rate 除零风险**

`repository.ts:347` 当前代码：
```sql
SUM(CASE WHEN status IN ('delay_warning', 'delayed') THEN 1 ELSE 0 END) * 100.0 / COUNT(*)
```
改为：
```sql
ROUND(SUM(CASE WHEN status IN ('delay_warning', 'delayed') THEN 1 ELSE 0 END) * 100.0 / NULLIF(COUNT(*), 0), 2)
```

- [ ] **Step 3: 修复成员分析只统计未完成任务导致完成率恒为0**

`repository.ts:511` WHERE条件：
```sql
WHERE t.assignee_id = ? AND status NOT IN ('early_completed', 'on_time_completed', 'overdue_completed')
```
问题：过滤掉了已完成任务，所以完成率永远是0。
改为：
```sql
WHERE t.assignee_id = ?
```
移除status过滤，让所有任务参与统计。统计卡片中已有 `current_tasks` 字段区分进行中和已完成。

- [ ] **Step 4: 启动后端验证SQL**

Run: `cd app/server && npm run dev` 触发API调用，验证返回值。
或写单元测试验证计算结果。

预期：完成率不再恒为100或0，延期率在0任务时返回00 或 NULL。

不报错。

成员分析的 avg_completion_rate 反映真实进度。

而不是二进制值。

---

### Task 2: 修复 delay_trend 和成员能力数据空返回

**Files:**
- Modify: `app/server/src/modules/analytics/repository.ts:478`
- Modify: `app/server/src/modules/analytics/repository.ts:534`

- [ ] **Step 1: 实现 getDelayTrend 方法**

在 `repository.ts` 的 `getDelayAnalysisReport` 方法中（约478行），，当前 `delay_trend: []` 簡单返回空数组。
改为调用一个新的私有方法：

```typescript
async getDelayTrend(options: ReportQueryOptions): Promise<TrendDataPoint[]> {
  const pool = getPool();
  const conditions: string[] = ["t.status IN ('delay_warning', 'delayed', 'overdue_completed')"];
  const params: (string | number)[] = [];

  if (options.project_id) {
    conditions.push('t.project_id = ?');
    params.push(options.project_id);
  }
  if (options.start_date && options.end_date) {
    conditions.push('DATE(t.updated_at) BETWEEN ? AND ?');
    params.push(options.start_date, options.end_date);
  } else {
    // 默认最近30天
    conditions.push('DATE(t.updated_at) >= DATE_SUB(NOW(), INTERVAL 30 DAY)');
  }

  const whereClause = `WHERE ${conditions.join(' AND ')}`;

  // 按日期统计新增延期和已解决延期
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT DATE(t.updated_at) as date,
            SUM(CASE WHEN t.status IN ('delay_warning', 'delayed') THEN 1 ELSE 0 END) as created,
            SUM(CASE WHEN t.status = 'overdue_completed' THEN 1 ELSE 0 END) as completed
     FROM wbs_tasks t
     ${whereClause}
     GROUP BY DATE(t.updated_at)
     ORDER BY date`,
    params
  );

  return rows.map(r => ({
    date: r.date instanceof Date ? r.date.toISOString().split('T')[0] : String(r.date),
    created: r.created || 0,
    completed: r.completed || 0,
    delayed: r.delayed || 0,
  }));
}
```

- [ ] **Step 2: 在 getDelayAnalysisReport 中调用 getDelayTrend**

替换 `delay_trend: []` 为：
```typescript
delay_trend: await this.getDelayTrend(options),
```

- [ ] **Step 3: 在 getMemberAnalysisReport 中补充 capabilities 数据**

当前返回的 `capabilities` 字段为 undefined。需要查询能力模型数据（如果相关表存在）。如果表不存在，则在返回中明确设置 `capabilities: []` 而不是 undefined。

在 `repository.ts:534` 的返回值中添加：
```typescript
capabilities: [],  // 暂时返回空数组，待能力模型模块完成后接入
```

- [ ] **Step 4: 验证**

启动后端，调用延期分析报表API，确认 `delay_trend` 返回数据数组。调用成员分析API，确认 `capabilities` 不为 undefined。

---

## Chunk 2: 角色数据隔离

> 核心需求：dept_manager看本部门、tech_manager看本组+授权组、engineer看自己参与的。当前只有admin/非admin两级。

### Task 3: 后端实现角色感知的查询构建器

**Files:**
- Modify: `app/server/src/modules/analytics/types.ts`
- Create: `app/server/src/modules/analytics/query-builder.ts`

- [ ] **Step 1: 在 types.ts 中添加 DataScope 类型**

```typescript
// 数据访问范围
export interface DataScope {
  userId: number;
  role: string;
  departmentId?: number;      // dept_manager 需要
  techGroupId?: number;       // tech_manager 需要
  authorizedGroupIds?: number[]; // tech_manager 被授权的组
}
```

- [ ] **Step 2: 创建 query-builder.ts**

新建文件 `app/server/src/modules/analytics/query-builder.ts`，负责根据角色构建SQL过滤条件：

```typescript
import type { DataScope } from './types';

/**
 * 根据角色构建数据范围SQL过滤条件
 * admin: 无过滤
 * dept_manager: 过滤本部门成员
 * tech_manager: 过滤本组+授权组成员
 * engineer: 过滤自己参与的项目
 */
export function buildScopeFilter(scope: DataScope): {
  if (scope.role === 'admin') {
    return { clause: '1=1', params: [] };
  }

  if (scope.role === 'dept_manager') {
    // 通过部门成员过滤
    return {
      clause: 'EXISTS (SELECT 1 FROM users u WHERE u.id = t.assignee_id AND u.department_id = ?)',
      params: [scope.departmentId],
    };
  }

  if (scope.role === 'tech_manager') {
    // 本组 + 授权组
    const groupIds = [scope.techGroupId, ...(scope.authorizedGroupIds || [])];
    const placeholders = groupIds.map(() => '?').join(',');
    return {
      clause: `EXISTS (SELECT 1 FROM users u WHERE u.id = t.assignee_id AND u.tech_group_id IN (${placeholders}))`,
      params: groupIds,
    };
  }

  // engineer: 自己参与的项目
  return {
    clause: 'FIND_IN_SET(?, p.member_ids) > 0',
    params: [scope.userId.toString()],
  };
}
```

- [ ] **Step 3: 在 routes.ts 中构建 DataScope 并传给 Service**

在每个路由处理函数中，从 `req.user` 构建 `DataScope`：
```typescript
function buildDataScope(user: User): DataScope {
  return {
    userId: user.id,
    role: user.role,
    departmentId: user.department_id,
    techGroupId: user.tech_group_id,
    authorizedGroupIds: user.authorized_group_ids,
  };
}
```

将 `buildDataScope` 的结果传入 service 方法。

- [ ] **Step 4: 在 service.ts 中传递 scope 到 repository**

修改 service 方法签名，接收 `DataScope` 参数：
```typescript
async getDashboardStats(scope: DataScope): Promise<...> {
  return this.repo.getDashboardStats(scope);
}
```

- [ ] **Step 5: 在 repository.ts 中使用 scope 过滤**

修改 `getDashboardStats` 方法：
```typescript
async getDashboardStats(scope: DataScope): Promise<DashboardStats> {
  const filter = buildScopeFilter(scope);
  // 项目统计
  const [projectRows] = await pool.execute<RowDataPacket[]>(
    `SELECT ... FROM projects p WHERE ${filter.clause}`,
    filter.params
  );
  // 任务统计
  const [taskRows] = await pool.execute<RowDataPacket[]>(
    `SELECT ... FROM wbs_tasks t JOIN projects p ON t.project_id = p.id WHERE ${filter.clause}`,
    filter.params
  );
  // ... 其余逻辑不变
}
```

对 `getTaskStatisticsReport`、`getDelayAnalysisReport`、`getMemberAnalysisReport` 做同样修改。

**注意**: `getProjectMembers` 和 `getAllProjectsProgress` 等方法的 `isAdmin + userId` 参数全部替换为 `DataScope`。涉及 `repository.ts`、`service.ts`、`routes.ts` 三文件联动修改。

- [ ] **Step 6: 验证**

用不同角色token调用API，确认数据范围正确：
- admin: 返回全部数据
- dept_manager: 只返回本部门数据
- tech_manager: 返回本组+授权组数据
- engineer: 返回自己参与项目的数据

---

## Chunk 3: 动态维度 - 后端趋势API

> 为报表提供时间轴趋势数据。每个报表需要"当前值 vs 上期值"和"时间序列趋势"两组数据。

### Task 4: 添加趋势相关类型

**Files:**
- Modify: `app/server/src/modules/analytics/types.ts`

- [ ] **Step 1: 在 types.ts 中添加趋势相关类型**

```typescript
// 统计卡片趋势指标
export interface TrendIndicator {
  value: number;        // 当前值
  previousValue: number; // 上期值
  change: number;        // 变化量
  changePercent: number; // 变化百分比（保留1位小数）
  direction: 'up' | 'down' | 'flat';  // 趋势方向
  isPositive: boolean;  // 是否为正向变化（上升指标↑为正，下降指标↓为正）
}

// 带趋势的统计卡片
export interface StatsWithTrend {
  current: number;
  trend: TrendIndicator;
}

// 时间序列数据点
export interface TimeSeriesPoint {
  date: string;
  value: number;
}

// 趋势查询参数
export interface TrendQueryOptions {
  startDate: string;
  endDate: string;
  granularity: 'day' | 'week' | 'month';
  scope: DataScope;
  projectId?: string;
  assigneeId?: number;
}
```

- [ ] **Step 2: 提交**

```bash
git add app/server/src/modules/analytics/types.ts
git commit -m "feat(analytics): add trend types for dynamic dimension"
```

### Task 5: 实现趋势查询Repository方法

**Files:**
- Modify: `app/server/src/modules/analytics/repository.ts`

- [ ] **Step 1: 添加 getStatsWithTrend 方法**

统计当前7天和前7天的同一指标，计算趋势：

```typescript
async getStatsWithTrend(
  scope: DataScope,
  metric: 'total_tasks' | 'completed_tasks' | 'delay_warning' | 'overdue' | 'active_projects' | 'avg_progress',
  currentStart: string,
  currentEnd: string,
): Promise<StatsWithTrend> {
  // 查询当前周期值
  // 查询前一个同等周期值
  // 计算 TrendIndicator
}
```

- [ ] **Step 2: 添加 getTimeSeries 方法**

按天/周/月粒度返回时间序列：

```typescript
async getTimeSeries(
  scope: DataScope,
  metric: string,
  options: TrendQueryOptions,
): Promise<TimeSeriesPoint[]> {
  // 按粒度分组统计
  // 返回 [{ date, value }, ...]
}
```

- [ ] **Step 3: 提交**

```bash
git add app/server/src/modules/analytics/repository.ts
git commit -m "feat(analytics): add trend query repository methods"
```

### Task 6: 实现趋势Service方法和路由

**Files:**
- Modify: `app/server/src/modules/analytics/service.ts`
- Modify: `app/server/src/modules/analytics/routes.ts`

- [ ] **Step 1: Service 层添加趋势方法**

```typescript
async getDashboardTrends(scope: DataScope, days: number = 30): Promise<Record<string, StatsWithTrend>> {
  const endDate = new Date().toISOString().split('T')[0];
  const startDate = new Date(Date.now() - days * 86400000).toISOString().split('T')[0];
  const prevEnd = startDate;
  const prevStart = new Date(Date.now() - days * 2 * 86400000).toISOString().split('T')[0];

  return {
    total_projects: await this.repo.getStatsWithTrend(scope, 'active_projects', startDate, endDate),
    in_progress_tasks: await this.repo.getStatsWithTrend(scope, 'total_tasks', startDate, endDate),
    completed_tasks: await this.repo.getStatsWithTrend(scope, 'completed_tasks', startDate, endDate),
    delay_warning: await this.repo.getStatsWithTrend(scope, 'delay_warning', startDate, endDate),
  };
}
```

- [ ] **Step 2: 添加路由**

```typescript
// 仪表板趋势
router.get('/dashboard/trends-summary', async (req, res, next) => {
  const user = requireUser(req);
  const scope = buildDataScope(user);
  const days = req.query.days ? parseInt(req.query.days as string) : 30;
  const result = await analyticsService.getDashboardTrends(scope, days);
  res.json({ success: true, data: result });
});

// 报表趋势数据
router.get('/reports/:reportType/trend', async (req, res, next) => {
  const user = requireUser(req);
  const scope = buildDataScope(user);
  const { reportType } = req.params;
  const options: TrendQueryOptions = {
    startDate: req.query.start_date as string,
    endDate: req.query.end_date as string,
    granularity: (req.query.granularity as 'day' | 'week' | 'month') || 'week',
    scope,
    projectId: req.query.project_id as string,
    assigneeId: req.query.assignee_id ? parseInt(req.query.assignee_id as string) : undefined,
  };
  const result = await analyticsService.getReportTrend(reportType, options);
  res.json({ success: true, data: result });
});
```

- [ ] **Step 3: 提交**

```bash
git add app/server/src/modules/analytics/service.ts app/server/src/modules/analytics/routes.ts
git commit -m "feat(analytics): add trend API endpoints for dynamic dimension"
```

---

## Chunk 4: 仪表板精简与趋势指标

> 从业务定位出发：仪表板只保留核心信息，移除非数据类组件，为统计卡片加趋势指标。

### Task 7: 移除非核心组件

**Files:**
- Delete: `app/src/features/dashboard/components/NotificationCenter.tsx`
- Delete: `app/src/features/dashboard/components/QuickActions.tsx`
- Modify: `app/src/features/dashboard/index.tsx`

- [ ] **Step 1: 从 index.tsx 移除 NotificationCenter 和 QuickActions 的 import 和 JSX**

移除相关 import 语句和对应的 `<NotificationCenter />` `<QuickActions />` JSX。

- [ ] **Step 2: 删除文件**

```bash
rm app/src/features/dashboard/components/NotificationCenter.tsx
rm app/src/features/dashboard/components/QuickActions.tsx
```

- [ ] **Step 3: 提交**

```bash
git add -A app/src/features/dashboard/
git commit -m "refactor(dashboard): remove NotificationCenter and QuickActions per business positioning"
```

### Task 8: StatsCard 支持趋势指标

**Files:**
- Modify: `app/src/features/dashboard/components/StatsCard.tsx`
- Modify: `app/src/features/dashboard/index.tsx`
- Modify: `app/src/lib/api/analytics.api.ts`
- Modify: `app/src/features/dashboard/hooks/useDashboardData.ts`

- [ ] **Step 1: 在 analytics.api.ts 添加趋势API**

```typescript
export async function getDashboardTrendsSummary(days?: number) {
  const { data } = await api.get('/analytics/dashboard/trends-summary', { params: { days } });
  return data;
}
```

- [ ] **Step 2: 在 useDashboardData.ts 添加趋势hook**

```typescript
export function useDashboardTrends(days: number = 30) {
  return useQuery({
    queryKey: ['dashboard', 'trends', days],
    queryFn: () => getDashboardTrendsSummary(days),
    staleTime: 5 * 60 * 1000,
  });
}
```

- [ ] **Step 3: 修改 StatsCard.tsx 支持 trend prop**

```typescript
interface TrendProp {
  direction: 'up' | 'down' | 'flat';
  isPositive: boolean;
  changeText: string; // e.g. "↑ 12% vs 上周"
}

interface StatsCardProps {
  title: string;
  value: number | string;
  suffix?: string;
  trend?: TrendProp | null;
  onClick?: () => void;
  titleTooltip?: string;
}
```

在卡片右下角用小字体（text-xs）渲染趋势文本，颜色根据 `trend.isPositive` 决定（绿色=正向，红色=负向）。

- [ ] **Step 4: 在 index.tsx 中引入趋势数据并传给 StatsCard**

```typescript
const { data: trends } = useDashboardTrends(30);
// 传给每个 StatsCard
<StatsCard title="进行中任务" value={stats.inProgressTasks} trend={trends?.in_progress_tasks?.trend} />
```

- [ ] **Step 5: 提交**

```bash
git add app/src/features/dashboard/ app/src/lib/api/analytics.api.ts
git commit -m "feat(dashboard): add trend indicators to stats cards"
```

---

## Chunk 5: 报表动态维度 - 前端

> 为4个报表组件添加动态维度展示：时间范围选择器和趋势图表。

### Task 9: ReportFilterBar 添加时间范围选择

**Files:**
- Modify: `app/src/features/reports/components/ReportFilterBar.tsx`

- [ ] **Step 1: 添加时间范围预设选项**

在筛选区域添加"时间范围"下拉选项，提供预设：过去7天 / 过去30天（默认） / 本季度 / 自定义。当选择"自定义"时显示日期范围选择器。

- [ ] **Step 2: 提交**

```bash
git add app/src/features/reports/components/ReportFilterBar.tsx
git commit -m "feat(reports): add time range selector to filter bar"
```

### Task 10: 4个报表Tab组件添加动态维度

**Files:**
- Modify: `app/src/features/reports/components/ProjectProgressTab.tsx`
- Modify: `app/src/features/reports/components/TaskStatisticsTab.tsx`
- Modify: `app/src/features/reports/components/DelayAnalysisTab.tsx`
- Modify: `app/src/features/reports/components/MemberAnalysisTab.tsx`
- Modify: `app/src/lib/api/reports.api.ts`
- Modify: `app/src/features/reports/hooks/useReportData.ts`

- [ ] **Step 1: 在 reports.api.ts 添加趋势API**

```typescript
export async function getReportTrend(reportType: string, options: {
  startDate: string; endDate: string; granularity?: string; projectId?: string; assigneeId?: number;
}) {
  const { data } = await api.get(`/analytics/reports/${reportType}/trend`, { params: options });
  return data;
}
```

- [ ] **Step 2: 在 useReportData.ts 添加趋势hook**

```typescript
export function useReportTrend(reportType: string, options: { startDate: string; endDate: string; granularity?: string; projectId?: string; }) {
  return useQuery({
    queryKey: ['report', 'trend', reportType, options],
    queryFn: () => getReportTrend(reportType, options),
    enabled: !!options.startDate && !!options.endDate,
    staleTime: 5 * 60 * 1000,
  });
}
```

- [ ] **Step 3: 修改 ProjectProgressTab.tsx**

将 hardcoded 的空趋势数据替换为从 `useReportTrend` 获取的真实数据。右图改为进度趋势折线图。

- [ ] **Step 4: 修改 TaskStatisticsTab.tsx**

左图保持优先级分布柱状图，右图改为任务新增/完成/延期趋势折线图。统计卡片传趋势数据。

- [ ] **Step 5: 修改 DelayAnalysisTab.tsx**

左图保持延期原因统计，右图改为延期趋势（新增延期 vs 已解决延期对比）。统计卡片传趋势数据。

- [ ] **Step 6: 修改 MemberAnalysisTab.tsx**

左图保持任务负载柱状图，右图改为完成趋势折线图。统计卡片传趋势数据。

- [ ] **Step 7: 提交**

```bash
git add app/src/features/reports/ app/src/lib/api/reports.api.ts
git commit -m "feat(reports): add dynamic dimension to all 4 report tabs"
```

---

## Chunk 6: 报表导出功能

> 实现Excel导出，当前为空壳。

### Task 11: 后端实现Excel导出

**Files:**
- Modify: `app/server/src/modules/analytics/service.ts`
- Modify: `app/server/src/modules/analytics/routes.ts`

- [ ] **Step 1: 安装 exceljs 依赖**

```bash
cd app/server && npm install exceljs
```

- [ ] **Step 2: 实现 exportData 方法**

在 service.ts 中，用 exceljs 生成真实数据：

```typescript
async exportData(domain: string, format: 'xlsx' | 'csv' | 'json', data: unknown[]): Promise<Buffer> {
  if (format === 'json') {
    return Buffer.from(JSON.stringify(data, null, 2));
  }
  // exceljs 生成 xlsx
  const ExcelJS = require('exceljs');
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('数据');
  // 根据 domain 类型写入不同的列和数据行
  // ...
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
```

- [ ] **Step 3: 修改路由使 export 获取真实数据再生成文件**

修改 `/export/:domain` 路由，先查询报表数据，再调用 exportData 生成文件。

- [ ] **Step 4: 提交**

```bash
git add app/server/src/modules/analytics/service.ts app/server/src/modules/analytics/routes.ts app/server/package.json
git commit -m "feat(analytics): implement Excel export with exceljs"
```

### Task 12: 前端实现导出按钮功能

**Files:**
- Modify: `app/src/features/reports/index.tsx`

- [ ] **Step 1: 替换 console.log 为真实 API 调用**

```typescript
const handleExport = async () => {
  const url = `/analytics/export/${activeTab}?format=xlsx&...filters`;
  const response = await fetch(url);
  const blob = await response.blob();
  const downloadUrl = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = downloadUrl;
  a.download = `${activeTab}_${new Date().toISOString().split('T')[0]}.xlsx`;
  a.click();
};
```

- [ ] **Step 2: 提交**

```bash
git add app/src/features/reports/index.tsx
git commit -m "feat(reports): implement export button with real file download"
```

---

## Verification

### 端到端验证清单

| 验证项 | 方法 | 预期结果 |
|--------|------|---------|
| 数据准确性 | 用非admin角色调用仪表板API | 统计数字与手动SQL查询结果一致 |
| 完成率 | 调用任务统计API | avg_completion_rate 反映真实进度而非100/0二值 |
| 延期率 | 调用任务统计API，0任务时 | delay_rate 返回 0 而非 NULL |
| 角色隔离 - admin | 用admin token调用所有API | 返回全部数据 |
| 角色隔离 - dept_manager | 用dept_manager token调用 | 只返回本部门数据 |
| 角色隔离 - tech_manager | 用tech_manager token调用 | 返回本组+授权组数据 |
| 延期趋势 | 调用延期分析API | delay_trend 返回非空数组 |
| 成员能力 | 调用成员分析API | capabilities 为 [] 而非 undefined |
| 仪表板组件 | 打开仪表板页面 | 无 NotificationCenter 和 QuickActions |
| 卡片趋势 | 打开仪表板 | 每个卡片右下角显示趋势指标 |
| 报表时间范围 | 在报表页选择"过去7天" | 图表和卡片趋势联动更新 |
| 导出Excel | 点击导出按钮 | 下载 .xlsx 文件，内容可打开 |
