# 工程师仪表板待办任务移除实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 移除工程师仪表板的"我的待办任务列表"组件，保留"紧急任务提醒"和"需要更新的任务"。

**Architecture:** 前后端同步修改，移除 todoTasks 数据流，保留 needUpdateTasks 数据流。TodoTaskList 组件和 TodoTaskItem 类型保留（仍被 needUpdateTasks 使用）。

**Tech Stack:** React, React Query, Express, MySQL, TypeScript

---

## 文件变更清单

| 文件 | 变更类型 | 说明 |
|------|---------|------|
| `docs/requirements/modules/REQ_07a_dashboard.md:163` | 修改 | 更新需求文档 |
| `app/src/features/analytics/dashboard/roles/EngineerDashboard.tsx` | 修改 | 移除待办任务列表渲染 |
| `app/src/features/analytics/dashboard/hooks/useDashboardData.ts:363-368` | 修改 | 移除 todoTasks 数据转换 |
| `app/src/features/analytics/dashboard/types.ts:219` | 修改 | 移除 todoTasks 字段定义 |
| `app/server/src/modules/analytics/repository.ts:2225-2232,2741-2769` | 修改 | 移除 todoTasks 查询 |
| `app/server/src/modules/analytics/types.ts:575` | 修改 | 移除 todo_tasks 字段 |

---

### Task 1: 更新需求文档

**Files:**
- Modify: `docs/requirements/modules/REQ_07a_dashboard.md:163`

- [ ] **Step 1: 修改需求文档第163行**

将第163行的内容从：

```markdown
> - engineer：显示统计卡片（个人）、任务列表、紧急任务提醒、项目进度（仅自己参与的项目），不显示分布/饼图类分析组件
```

修改为：

```markdown
> - engineer：显示统计卡片（个人）、紧急任务提醒、需要更新的任务、项目进度（仅自己参与的项目），不显示任务列表（WBS表已有）、分布/饼图类分析组件
```

- [ ] **Step 2: 验证修改**

Run: `grep -n "engineer" docs/requirements/modules/REQ_07a_dashboard.md | head -5`

Expected: 第163行应包含"不显示任务列表（WBS表已有）"

- [ ] **Step 3: Commit**

```bash
git add docs/requirements/modules/REQ_07a_dashboard.md
git commit -m "docs: 更新工程师仪表板需求，移除待办任务列表"
```

---

### Task 2: 修改前端组件 EngineerDashboard.tsx

**Files:**
- Modify: `app/src/features/analytics/dashboard/roles/EngineerDashboard.tsx:100-105`

- [ ] **Step 1: 移除待办任务列表渲染代码**

删除第100-105行的待办任务列表渲染代码块：

```tsx
// 删除以下代码块
{/* 我的待办任务列表 */}
{data.todoTasks && data.todoTasks.length > 0 && (
  <DashboardSection title="我的待办任务" data-testid="todo-section">
    <TodoTaskList tasks={data.todoTasks} />
  </DashboardSection>
)}
```

修改后的组件结构（第100行开始直接是"需要更新的任务"）：

```tsx
{/* 需要更新的任务 */}
{data.needUpdateTasks && data.needUpdateTasks.length > 0 && (
```

- [ ] **Step 2: 更新组件注释**

修改第52-58行的注释，移除"2. 我的待办任务列表"：

```tsx
/**
 * 工程师仪表板组件
 *
 * 布局结构:
 * 1. 我的紧急任务区（置顶）- 3个卡片
 * 2. 需要更新的任务（超过7天未更新进展）
 * 3. 我的核心指标卡片（4个）
 * 4. 我的任务趋势图
 * 5. 任务分布 & 参与项目进度
 */
```

- [ ] **Step 3: 验证修改**

Run: `grep -n "todoTasks" app/src/features/analytics/dashboard/roles/EngineerDashboard.tsx`

Expected: 无匹配结果（todoTasks 已完全移除）

- [ ] **Step 4: Commit**

```bash
git add app/src/features/analytics/dashboard/roles/EngineerDashboard.tsx
git commit -m "refactor(dashboard): 移除工程师仪表板待办任务列表组件"
```

---

### Task 3: 修改前端 Hook useDashboardData.ts

**Files:**
- Modify: `app/src/features/analytics/dashboard/hooks/useDashboardData.ts:363-368`

- [ ] **Step 1: 移除 transformEngineerData 中的 todoTasks 转换**

删除第363-368行的 todoTasks 转换代码：

```tsx
// 删除以下代码
todoTasks: (detail?.todoTasks || []).map((t: any) => ({
  id: t.id, name: t.name, projectName: t.projectName,
  dueDate: t.dueDate || '', progress: t.progress,
  priority: t.priority as 'high' | 'medium' | 'low',
  daysOverdue: t.daysOverdue, lastUpdated: t.lastUpdated,
})),
```

修改后的 transformEngineerData 返回对象（第352行开始）：

```tsx
return {
  alerts: [
    { type: 'overdue' as const, count: stats.overdueTasks || 0, label: '逾期任务', color: 'danger' as const, actionLabel: '查看详情', actionPath: '/tasks' },
    { type: 'week_due' as const, count: stats.delayWarningTasks || 0, label: '本周到期', color: 'warning' as const, actionLabel: '查看详情', actionPath: '/tasks' },
  ].filter(a => a.count > 0),
  metrics: [
    { label: '参与项目', value: stats.totalProjects || 0, displayValue: String(stats.totalProjects || 0), description: '当前参与的项目数量', ...buildTrendHelper(trendMap, 'activeProjects') },
    { label: '进行中', value: stats.inProgressTasks || 0, displayValue: String(stats.inProgressTasks || 0), description: '当前正在进行中的任务数量', ...buildTrendHelper(trendMap, 'totalTasks') },
    { label: '已完成', value: stats.completedTasks || 0, displayValue: String(stats.completedTasks || 0), description: '已完成并关闭的任务数量', ...buildTrendHelper(trendMap, 'completedTasks') },
    { label: '待开始', value: stats.pendingTasks || 0, displayValue: String(stats.pendingTasks || 0), description: '已分配但尚未开始的任务数量' },
  ],
  // todoTasks 已移除
  needUpdateTasks: (detail?.needUpdateTasks || []).map((t: any) => ({
    id: t.id, name: t.name, projectName: t.projectName,
    dueDate: t.dueDate || '', progress: t.progress,
    priority: t.priority as 'high' | 'medium' | 'low',
    daysOverdue: t.daysOverdue, lastUpdated: t.lastUpdated,
  })),
  trends: trends || [],
  taskStatusDistribution: mapStatusDistribution(detail?.taskStatusDistribution),
  projectProgress: (projects || []).map((p: any) => ({
    id: p.id || String(p.projectId),
    name: p.name || p.projectName || '',
    progress: p.progress || 0,
    status: p.status || 'on_track',
    totalTasks: p.totalTasks || 0,
    completedTasks: p.completedTasks || 0,
    delayedTasks: p.delayedTasks || 0,
    dueDate: p.dueDate || p.deadline,
  })),
};
```

- [ ] **Step 2: 验证修改**

Run: `grep -n "todoTasks" app/src/features/analytics/dashboard/hooks/useDashboardData.ts`

Expected: 无匹配结果

- [ ] **Step 3: Commit**

```bash
git add app/src/features/analytics/dashboard/hooks/useDashboardData.ts
git commit -m "refactor(dashboard): 移除工程师仪表板 todoTasks 数据转换"
```

---

### Task 4: 修改前端类型定义 types.ts

**Files:**
- Modify: `app/src/features/analytics/dashboard/types.ts:215-230`

- [ ] **Step 1: 移除 EngineerDashboardData 的 todoTasks 字段**

修改 EngineerDashboardData 接口（第215-230行），移除 todoTasks 字段：

```tsx
/**
 * 工程师仪表板数据
 */
export interface EngineerDashboardData {
  /** 紧急任务预警 */
  alerts: AlertData[];
  /** 需要更新的任务 */
  needUpdateTasks: TodoTask[];
  /** 核心指标 */
  metrics: StatsCardMetric[];
  /** 任务趋势 */
  trends: TrendDataPoint[];
  /** 任务状态分布 */
  taskStatusDistribution: PieChartDataItem[];
  /** 参与项目进度 */
  projectProgress: ProjectProgress[];
}
```

注意：TodoTask 类型保留，因为 needUpdateTasks 仍使用它。

- [ ] **Step 2: 验证修改**

Run: `grep -n "todoTasks" app/src/features/analytics/dashboard/types.ts`

Expected: 无匹配结果（EngineerDashboardData 中已无 todoTasks）

- [ ] **Step 3: Commit**

```bash
git add app/src/features/analytics/dashboard/types.ts
git commit -m "refactor(dashboard): 移除 EngineerDashboardData 的 todoTasks 字段"
```

---

### Task 5: 修改后端 Repository

**Files:**
- Modify: `app/server/src/modules/analytics/repository.ts:2225-2235,2741-2769`

- [ ] **Step 1: 移除 getDashboardEngineerDetail 中的 todoTasks 查询**

修改第2225-2235行，移除 getUserTodoTasks 调用和 todo_tasks 返回：

```typescript
async getDashboardEngineerDetail(user: User): Promise<EngineerDashboardDetailResponse> {
  const pool = getPool();

  // 移除 todoTasks 查询
  const [needUpdateTasks, taskStatusDistribution] = await Promise.all([
    this.getStaleTasks(pool, user.id),
    this.getUserTaskStatusDistribution(pool, user.id),
  ]);

  return {
    // todo_tasks 已移除
    need_update_tasks: needUpdateTasks,
    task_status_distribution: taskStatusDistribution,
  };
}
```

- [ ] **Step 2: 移除 getUserTodoTasks 私有方法**

删除第2741-2769行的 getUserTodoTasks 方法：

```typescript
// 删除整个 getUserTodoTasks 方法（约28行）
private async getUserTodoTasks(pool: ReturnType<typeof getPool>, userId: number): Promise<TodoTaskItem[]> {
  // ... 全部删除
}
```

- [ ] **Step 3: 验证修改**

Run: `grep -n "getUserTodoTasks" app/server/src/modules/analytics/repository.ts`

Expected: 无匹配结果

Run: `grep -n "todo_tasks" app/server/src/modules/analytics/repository.ts`

Expected: 无匹配结果

- [ ] **Step 4: Commit**

```bash
git add app/server/src/modules/analytics/repository.ts
git commit -m "refactor(analytics): 移除 getUserTodoTasks 查询，保留 needUpdateTasks"
```

---

### Task 6: 修改后端类型定义

**Files:**
- Modify: `app/server/src/modules/analytics/types.ts:574-578`

- [ ] **Step 1: 移除 EngineerDashboardDetailResponse 的 todo_tasks 字段**

修改第574-578行：

```typescript
export interface EngineerDashboardDetailResponse {
  // todo_tasks 已移除
  need_update_tasks: TodoTaskItem[];
  task_status_distribution: StatusDistributionItem[];
}
```

注意：TodoTaskItem 类型保留，因为 need_update_tasks 仍使用它。

- [ ] **Step 2: 验证修改**

Run: `grep -n "todo_tasks" app/server/src/modules/analytics/types.ts`

Expected: 无匹配结果

- [ ] **Step 3: Commit**

```bash
git add app/server/src/modules/analytics/types.ts
git commit -m "refactor(analytics): 移除 EngineerDashboardDetailResponse 的 todo_tasks 字段"
```

---

### Task 7: 验证与测试

- [ ] **Step 1: 运行前端类型检查**

Run: `cd app && npm run typecheck`

Expected: 无 TypeScript 错误

- [ ] **Step 2: 运行后端类型检查**

Run: `cd app/server && npm run typecheck`

Expected: 无 TypeScript 错误

- [ ] **Step 3: 启动开发服务器验证**

Run: `cd app && npm run dev`

手动验证：以工程师角色登录，仪表板应显示：
- 紧急任务区（逾期任务、本周到期）
- 需要更新的任务（如有）
- 核心指标卡片
- 任务趋势图
- 任务分布 & 参与项目进度

不应显示：待办任务列表

- [ ] **Step 4: 最终 Commit（如有遗漏修改）**

```bash
git status
# 如有未提交的修改，一并提交
git add -A
git commit -m "refactor(dashboard): 完成工程师仪表板待办任务移除"
```

---

## 自检结果

**1. Spec coverage:** 
- ✅ 需求文档更新 → Task 1
- ✅ 前端组件移除 → Task 2
- ✅ 前端 Hook 移除 → Task 3
- ✅ 前端类型移除 → Task 4
- ✅ 后端 Repository 移除 → Task 5
- ✅ 后端类型移除 → Task 6
- ✅ 测试验证 → Task 7

**2. Placeholder scan:** 无 TBD/TODO，所有步骤包含完整代码

**3. Type consistency:**
- TodoTaskItem 类型保留（后端 need_update_tasks 使用）
- TodoTask 类型保留（前端 needUpdateTasks 使用）
- TodoTaskList 组件保留（渲染 needUpdateTasks）