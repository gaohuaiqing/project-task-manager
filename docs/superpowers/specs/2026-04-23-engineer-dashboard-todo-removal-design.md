# 设计文档：工程师仪表板待办任务移除

> **日期**: 2026-04-23
> **状态**: 已批准
> **影响模块**: 仪表板 (07a-dashboard)

---

## 1. 背景

### 1.1 问题描述

工程师仪表板当前显示"我的待办任务列表"组件，与 WBS 任务表功能重复。用户在 WBS 表中已经可以查看自己的全部任务，仪表板再次展示造成信息冗余。

### 1.2 需求文档原设计

`REQ_07a_dashboard.md` 第 163 行：

> - engineer：显示统计卡片（个人）、任务列表、紧急任务提醒、项目进度（仅自己参与的项目）

### 1.3 设计原则

仪表板定位（`REQ_07a_dashboard.md` 第 10 行）：

> 用户登录后第一眼看到的页面，目标是**快速发现需要关注的核心问题**。

---

## 2. 设计决策

### 2.1 变更内容

| 组件 | 当前状态 | 变更 | 理由 |
|------|---------|------|------|
| 我的紧急任务区 | 显示 | ✅ 保留 | 异常信号，符合仪表板定位 |
| 我的待办任务列表 | 显示 | ❌ 移除 | 与 WBS 表功能重复 |
| 需要更新的任务 | 显示 | ✅ 保留 | 异常提醒，帮助发现长期未更新任务 |
| 我的核心指标卡片 | 显示 | ✅ 保留 | 核心统计信息 |
| 我的任务趋势图 | 显示 | ✅ 保留 | 数据分析视图 |
| 任务分布 & 参与项目进度 | 显示 | ✅ 保留 | 项目概览 |

### 2.2 保留"需要更新的任务"的理由

- 属于**异常提醒**（超过7天未更新进展的任务）
- 用户在 WBS 表中需要手动筛选才能发现这类任务
- 符合仪表板"快速发现核心问题"的定位

---

## 3. 影响范围

### 3.1 前端变更

| 文件 | 变更类型 | 说明 |
|------|---------|------|
| `app/src/features/analytics/dashboard/roles/EngineerDashboard.tsx` | 修改 | 移除待办任务列表渲染代码 |
| `app/src/features/analytics/dashboard/hooks/useDashboardData.ts` | 修改 | 移除 todoTasks 数据获取和转换 |
| `app/src/features/analytics/dashboard/types.ts` | 修改 | 可选：移除 TodoTask 类型（如无其他使用） |
| `app/src/features/analytics/dashboard/components/TodoTaskList.tsx` | 保留 | 仍被"需要更新的任务"使用 |

### 3.2 后端变更

| 文件 | 变更类型 | 说明 |
|------|---------|------|
| `app/server/src/modules/analytics/repository.ts` | 修改 | 移除 getUserTodoTasks 方法调用 |
| `app/server/src/modules/analytics/service.ts` | 修改 | 移除 todo_tasks 字段返回 |
| `app/server/src/modules/analytics/types.ts` | 修改 | 移除 todo_tasks 字段定义 |

### 3.3 文档变更

| 文件 | 变更类型 | 说明 |
|------|---------|------|
| `docs/requirements/modules/REQ_07a_dashboard.md` | 修改 | 更新第 163 行角色差异化说明 |

---

## 4. 需求文档更新

`REQ_07a_dashboard.md` 第 163 行修改为：

```markdown
> - engineer：显示统计卡片（个人）、紧急任务提醒、需要更新的任务、项目进度（仅自己参与的项目），不显示任务列表（WBS表已有）
```

---

## 5. 实施计划

1. 更新需求文档 `REQ_07a_dashboard.md`
2. 修改前端组件 `EngineerDashboard.tsx`
3. 修改前端 Hook `useDashboardData.ts`
4. 修改后端 Service 和 Repository
5. 清理未使用的类型定义
6. 测试验证

---

## 6. 审批记录

| 日期 | 决策 | 参与者 |
|------|------|--------|
| 2026-04-23 | 移除工程师仪表板待办任务列表 | 用户确认 |
