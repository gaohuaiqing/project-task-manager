# 仪表板UI优化实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 基于参考网站设计风格，优化仪表板UI，使其更专业、更紧凑、信息密度更高。

**Architecture:** 更新所有仪表板组件的样式（圆角、边框、阴影、颜色），统一设计语言，优化布局间距。

**Tech Stack:** React, TypeScript, Tailwind CSS, shadcn/ui

---

## 文件结构

### 需修改的文件

| 文件 | 职责 |
|------|------|
| `app/src/features/dashboard/components/StatsCard.tsx` | 统计卡片组件 |
| `app/src/features/dashboard/components/TrendChart.tsx` | 趋势图表组件 |
| `app/src/features/dashboard/components/ProjectProgress.tsx` | 项目进度组件 |
| `app/src/features/dashboard/components/ProgressPieChart.tsx` | 饼图组件 |
| `app/src/features/dashboard/components/TaskDistribution.tsx` | 任务分布组件 |
| `app/src/features/dashboard/components/UrgentTaskAlert.tsx` | 紧急提醒组件 |
| `app/src/features/dashboard/components/TaskListPanel.tsx` | 任务列表面板 |
| `app/src/features/dashboard/index.tsx` | 仪表板主页面 |

---

## Task 1: 更新 StatsCard 统计卡片组件

**Files:**
- Modify: `app/src/features/dashboard/components/StatsCard.tsx`

- [ ] **Step 1: 更新 StatsCard 组件完整代码**

将 `StatsCard.tsx` 内容替换为：

```tsx
import * as React from "react"
import { cn } from "@/lib/utils"
import { Card } from "@/components/ui/card"
import { TrendIndicator, type TrendData } from "@/shared/components/TrendIndicator";

export interface StatsCardProps {
  /** 标题 */
  title: string;
  /** 数值 */
  value: number | string;
  /** 副标题/说明文字 */
  subtitle?: string;
  /** 数值颜色（用于强调，覆盖默认绿色） */
  valueColor?: string;
  /** 自定义类名 */
  className?: string;
  /** 点击事件 */
  onClick?: () => void;
  /** 趋势数据 */
  trend?: TrendData;
  /** 是否反转趋势颜色（延期率等指标下降是好事） */
  invertTrendColors?: boolean;
}

/**
 * 统计卡片组件 - 专业仪表盘风格
 * 参考设计: https://api.svips.org/dashboard
 *
 * 设计规范:
 * - 3层信息结构: 标签(小字) → 大数字(加粗) → 副标题(补充)
 * - 主数值: 20px加粗，等宽数字(tabular-nums)，绿色强调
 * - 标签: 12px中等字重，大写字母间距
 * - 卡片圆角: 16px
 * - 边框: 0.8px半透明边框
 * - Hover: 阴影加深 + 轻微上浮
 */
export function StatsCard({
  title,
  value,
  subtitle,
  valueColor,
  className,
  onClick,
  trend,
  invertTrendColors = false,
}: StatsCardProps) {
  return (
    <Card
      className={cn(
        // 基础样式 - 专业仪表盘风格
        'relative p-4 rounded-2xl',
        // 边框 - 半透明，增强层次感
        'border border-gray-100 dark:border-slate-700/50',
        // 背景 - 纯白色卡片，深色主题半透明
        'bg-white dark:bg-slate-800/50',
        // 阴影 - 轻微阴影定义边界
        'shadow-sm',
        // 过渡动画
        'transition-all duration-200',
        // 交互状态 - hover时阴影加深 + 轻微上浮
        onClick && 'cursor-pointer hover:shadow-md hover:-translate-y-0.5',
        className
      )}
      onClick={onClick}
    >
      {/* 第1层：标签 - 12px 中等字重，大写字母间距 */}
      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
        {title}
      </p>

      {/* 第2层：大数字 - 20px 加粗，等宽数字，绿色强调 */}
      <div className="flex items-baseline gap-2 mt-1">
        <span
          className={cn(
            'text-xl font-bold leading-none',
            // 等宽数字，防止数值跳动
            'font-mono tabular-nums',
            // 默认绿色强调，可被 valueColor 覆盖
            valueColor || 'text-emerald-600 dark:text-emerald-400'
          )}
        >
          {value}
        </span>
        {trend && (
          <TrendIndicator trend={trend} invertColors={invertTrendColors} />
        )}
      </div>

      {/* 第3层：副标题 - 补充说明（总计、对比等） */}
      {subtitle && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          {subtitle}
        </p>
      )}
    </Card>
  );
}
```

- [ ] **Step 2: 验证文件保存**

确认文件已正确保存，无语法错误。

---

## Task 2: 更新 TrendChart 趋势图表组件

**Files:**
- Modify: `app/src/features/dashboard/components/TrendChart.tsx`

- [ ] **Step 1: 更新 TrendChart 组件卡片样式**

修改文件中的 Card 组件样式：

将：
```tsx
<Card className="border-0 shadow-sm">
```

替换为：
```tsx
<Card className="rounded-2xl border border-gray-100 dark:border-slate-700/50 bg-white dark:bg-slate-800/50 shadow-sm">
```

- [ ] **Step 2: 更新 CardHeader 和 CardTitle 样式**

将：
```tsx
<CardHeader className="pb-2">
  <div className="flex items-center justify-between">
    <CardTitle className="text-sm font-medium">{title}</CardTitle>
```

替换为：
```tsx
<CardHeader className="pb-3">
  <div className="flex items-center justify-between">
    <CardTitle className="text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</CardTitle>
```

- [ ] **Step 3: 验证文件保存**

确认文件已正确保存。

---

## Task 3: 更新 ProjectProgress 项目进度组件

**Files:**
- Modify: `app/src/features/dashboard/components/ProjectProgress.tsx`

- [ ] **Step 1: 更新空状态卡片样式**

将：
```tsx
<Card className={cn('border-0 shadow-sm', className)}>
```

替换为：
```tsx
<Card className={cn('rounded-2xl border border-gray-100 dark:border-slate-700/50 bg-white dark:bg-slate-800/50 shadow-sm', className)}>
```

- [ ] **Step 2: 更新 CardHeader 样式**

将：
```tsx
<CardHeader className="pb-2">
  <CardTitle className="flex items-center gap-2 text-sm font-medium">
    <FolderKanban className="h-4 w-4 text-muted-foreground" />
```

替换为：
```tsx
<CardHeader className="pb-3">
  <CardTitle className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
    <FolderKanban className="h-4 w-4 text-gray-400" />
```

- [ ] **Step 3: 更新项目项容器样式**

将：
```tsx
className={cn(
  'p-2.5 rounded-lg border-0 bg-muted/30 transition-all duration-200',
  onProjectClick && 'cursor-pointer hover:bg-muted/50'
)}
```

替换为：
```tsx
className={cn(
  'p-3 rounded-xl border border-gray-100 dark:border-slate-700/30 bg-gray-50/50 dark:bg-slate-900/30 transition-all duration-200',
  onProjectClick && 'cursor-pointer hover:bg-gray-100/50 dark:hover:bg-slate-700/30'
)}
```

- [ ] **Step 4: 验证文件保存**

确认文件已正确保存。

---

## Task 4: 更新 ProgressPieChart 饼图组件

**Files:**
- Modify: `app/src/features/dashboard/components/ProgressPieChart.tsx`

- [ ] **Step 1: 更新所有 Card 样式**

将所有：
```tsx
<Card className="border-0 shadow-sm">
```

替换为：
```tsx
<Card className="rounded-2xl border border-gray-100 dark:border-slate-700/50 bg-white dark:bg-slate-800/50 shadow-sm">
```

- [ ] **Step 2: 更新 CardHeader 样式**

将：
```tsx
<CardHeader className="pb-2">
  <CardTitle className="text-sm font-medium">{title}</CardTitle>
  <p className="text-[11px] text-muted-foreground">共 {totalTasks} 个任务</p>
</CardHeader>
```

替换为：
```tsx
<CardHeader className="pb-3">
  <CardTitle className="text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</CardTitle>
  <p className="text-xs text-gray-500 dark:text-gray-400">共 {totalTasks} 个任务</p>
</CardHeader>
```

- [ ] **Step 3: 验证文件保存**

确认文件已正确保存。

---

## Task 5: 更新 TaskDistribution 任务分布组件

**Files:**
- Modify: `app/src/features/dashboard/components/TaskDistribution.tsx`

- [ ] **Step 1: 更新 Card 样式**

将：
```tsx
<Card className={cn('border-0 shadow-sm', className)}>
```

替换为：
```tsx
<Card className={cn('rounded-2xl border border-gray-100 dark:border-slate-700/50 bg-white dark:bg-slate-800/50 shadow-sm', className)}>
```

- [ ] **Step 2: 更新 CardHeader 样式**

将：
```tsx
<CardHeader className="pb-2">
  <CardTitle className="flex items-center gap-2 text-sm font-medium">
    <ListTodo className="h-4 w-4 text-muted-foreground" />
```

替换为：
```tsx
<CardHeader className="pb-3">
  <CardTitle className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
    <ListTodo className="h-4 w-4 text-gray-400" />
```

- [ ] **Step 3: 更新小标题样式**

将：
```tsx
<h4 className="text-[11px] font-medium mb-2 text-muted-foreground uppercase tracking-wide">
```

替换为：
```tsx
<h4 className="text-xs font-medium mb-2 text-gray-500 dark:text-gray-400 uppercase tracking-wide">
```

- [ ] **Step 4: 验证文件保存**

确认文件已正确保存。

---

## Task 6: 更新 UrgentTaskAlert 紧急任务提醒组件

**Files:**
- Modify: `app/src/features/dashboard/components/UrgentTaskAlert.tsx`

- [ ] **Step 1: 更新 Card 样式**

将：
```tsx
<Card
  className={cn(
    // 轻量边框，融入整体设计
    'border-0 rounded-lg',
    // 红色背景
    'bg-destructive/5',
    // 左侧强调线
    'border-l-2 border-l-destructive',
    // 轻微阴影
    'shadow-sm',
    className
  )}
>
```

替换为：
```tsx
<Card
  className={cn(
    // 圆角和边框
    'rounded-2xl border border-red-200/50 dark:border-red-900/30',
    // 红色背景，更柔和
    'bg-red-50/50 dark:bg-red-950/20',
    // 左侧强调线
    'border-l-2 border-l-red-500',
    // 轻微阴影
    'shadow-sm',
    className
  )}
>
```

- [ ] **Step 2: 更新内容区样式**

将：
```tsx
<CardContent className="py-2.5 px-3">
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-3">
      <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
      <span className="font-medium text-sm text-destructive">紧急任务提醒</span>

      <div className="flex items-center gap-3 text-xs">
        {overdueCount > 0 && (
          <div className="flex items-center gap-1">
            <span className="text-destructive font-semibold font-mono tabular-nums">{overdueCount}</span>
            <span className="text-muted-foreground">已延期</span>
          </div>
        )}
        {warningCount > 0 && (
          <div className="flex items-center gap-1">
            <span className="text-warning font-semibold font-mono tabular-nums">{warningCount}</span>
            <span className="text-muted-foreground">即将到期</span>
          </div>
        )}
      </div>
    </div>
```

替换为：
```tsx
<CardContent className="py-3 px-4">
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-3">
      <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
      <span className="font-medium text-sm text-red-700 dark:text-red-400">紧急任务提醒</span>

      <div className="flex items-center gap-3 text-xs">
        {overdueCount > 0 && (
          <div className="flex items-center gap-1">
            <span className="text-red-600 dark:text-red-400 font-semibold font-mono tabular-nums">{overdueCount}</span>
            <span className="text-gray-500 dark:text-gray-400">已延期</span>
          </div>
        )}
        {warningCount > 0 && (
          <div className="flex items-center gap-1">
            <span className="text-amber-600 dark:text-amber-400 font-semibold font-mono tabular-nums">{warningCount}</span>
            <span className="text-gray-500 dark:text-gray-400">即将到期</span>
          </div>
        )}
      </div>
    </div>
```

- [ ] **Step 3: 验证文件保存**

确认文件已正确保存。

---

## Task 7: 更新 TaskListPanel 任务列表面板

**Files:**
- Modify: `app/src/features/dashboard/components/TaskListPanel.tsx`

- [ ] **Step 1: 更新 Card 样式**

将：
```tsx
<Card>
```

替换为：
```tsx
<Card className="rounded-2xl border border-gray-100 dark:border-slate-700/50 bg-white dark:bg-slate-800/50 shadow-sm">
```

- [ ] **Step 2: 更新 CardHeader 样式**

将：
```tsx
<CardHeader className="flex flex-row items-center justify-between">
  <CardTitle className="flex items-center gap-2">
    <ListTodo className="h-5 w-5" />
```

替换为：
```tsx
<CardHeader className="flex flex-row items-center justify-between pb-3">
  <CardTitle className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
    <ListTodo className="h-4 w-4 text-gray-400" />
```

- [ ] **Step 3: 更新任务项样式**

将：
```tsx
className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent cursor-pointer transition-colors"
```

替换为：
```tsx
className="flex items-center justify-between p-3 rounded-xl border border-gray-100 dark:border-slate-700/30 bg-gray-50/50 dark:bg-slate-900/30 hover:bg-gray-100/50 dark:hover:bg-slate-700/30 cursor-pointer transition-colors"
```

- [ ] **Step 4: 验证文件保存**

确认文件已正确保存。

---

## Task 8: 更新 DashboardPage 主页面布局

**Files:**
- Modify: `app/src/features/dashboard/index.tsx`

- [ ] **Step 1: 更新页面垂直间距**

将：
```tsx
<div className="space-y-5 animate-fade-in">
```

替换为：
```tsx
<div className="space-y-6 animate-fade-in">
```

- [ ] **Step 2: 更新统计卡片网格间距**

将：
```tsx
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
```

替换为：
```tsx
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
```

- [ ] **Step 3: 更新图表区域间距**

将：
```tsx
<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
```

替换为：
```tsx
<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
```

- [ ] **Step 4: 更新第二图表区域间距**

将：
```tsx
<div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
```

替换为：
```tsx
<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
```

- [ ] **Step 5: 验证文件保存**

确认文件已正确保存。

---

## Task 9: 最终验证

- [ ] **Step 1: 启动开发服务器**

```bash
cd app && npm run dev
```

- [ ] **Step 2: 访问仪表板页面**

访问 http://localhost:5173/ 验证：
- 统计卡片圆角为 16px
- 数值字号为 20px，颜色为绿色
- 卡片边框为半透明
- 垂直间距为 24px
- 深色主题样式正确

- [ ] **Step 3: 切换深色主题验证**

验证深色主题下：
- 卡片背景为半透明深蓝灰
- 边框为半透明
- 文字颜色正确

---

## 完成标准

| 检查项 | 状态 |
|--------|------|
| StatsCard 圆角 16px | ⬜ |
| StatsCard 数值 20px 绿色 | ⬜ |
| 所有卡片半透明边框 | ⬜ |
| 垂直间距 24px | ⬜ |
| 深色主题样式正确 | ⬜ |
| 无 TypeScript 错误 | ⬜ |
| 无 ESLint 错误 | ⬜ |
