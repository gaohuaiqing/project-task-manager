# 仪表板UI优化设计方案

> **日期**: 2026-04-06
> **参考设计**: https://api.svips.org/dashboard
> **状态**: 待批准

---

## 一、优化目标

基于参考网站的设计风格，优化当前仪表板的UI呈现，使其更专业、更紧凑、信息密度更高。

---

## 二、设计规范

### 2.1 配色规范

#### 浅色主题

| 元素 | 颜色值 | Tailwind类 |
|------|--------|-----------|
| 页面背景 | `#F9FAFB` | `bg-gray-50` |
| 卡片背景 | `#FFFFFF` | `bg-white` |
| 卡片边框 | `#F3F4F6` (0.8px) | `border border-gray-100` |
| 标签文字 | `#6B7280` | `text-gray-500` |
| 主数值 | `#059669` (强调绿) | `text-emerald-600` |
| 副标题 | `#6B7280` | `text-gray-500` |

#### 深色主题

| 元素 | 颜色值 | Tailwind类 |
|------|--------|-----------|
| 页面背景 | `#020617` | `dark:bg-slate-950` |
| 卡片背景 | `rgba(30, 41, 59, 0.5)` | `dark:bg-slate-800/50` |
| 卡片边框 | `rgba(51, 65, 85, 0.5)` | `dark:border-slate-700/50` |
| 标签文字 | `#9CA3AF` | `dark:text-gray-400` |
| 主数值 | `#34D399` (亮绿) | `dark:text-emerald-400` |
| 副标题 | `#9CA3AF` | `dark:text-gray-400` |

### 2.2 卡片样式

| 属性 | 值 | Tailwind类 |
|------|-----|-----------|
| 圆角 | `16px` | `rounded-2xl` |
| 内边距 | `16px` | `p-4` |
| 边框宽度 | `0.8px` | `border` |
| 边框颜色 | 半透明 | `border-gray-100 dark:border-slate-700/50` |
| 阴影 | 轻微双阴影 | `shadow-sm` |

```css
/* 卡片阴影 */
box-shadow:
  rgba(0, 0, 0, 0) 0px 0px 0px 0px,
  rgba(0, 0, 0, 0) 0px 0px 0px 0px,
  rgba(0, 0, 0, 0.04) 0px 1px 3px 0px,
  rgba(0, 0, 0, 0.06) 0px 1px 2px 0px;
```

### 2.3 文字样式

| 元素 | 字号 | 字重 | 颜色 |
|------|------|------|------|
| 标签 | `12px` | `500` | 灰色 |
| 主数值 | `20px` | `700` | 绿色强调 |
| 副标题 | `12px` | `400` | 灰色 |
| 卡片标题 | `14px` | `600` | 前景色 |
| 区域标题 | `18px` | `600` | 前景色 |

### 2.4 布局规范

| 区域 | 布局 | 间距 |
|------|------|------|
| 页面内边距 | - | `p-8` (32px) |
| 整体垂直间距 | - | `space-y-6` (24px) |
| 统计卡片 | `grid-cols-2 lg:grid-cols-4` | `gap-4` (16px) |
| 图表区 | `grid-cols-1 lg:grid-cols-2` | `gap-6` (24px) |

---

## 三、组件改进详情

### 3.1 StatsCard 统计卡片

**当前状态**:
- 圆角: `12px` (rounded-xl)
- 数值字号: `28px`
- 卡片高度: ~120px

**目标状态**:
- 圆角: `16px` (rounded-2xl)
- 数值字号: `20px`
- 卡片高度: ~94px (更紧凑)
- 添加半透明边框
- 数值使用绿色强调

**改进代码**:
```tsx
<Card
  className={cn(
    'relative p-4 rounded-2xl',  // 圆角改为 16px
    'border border-gray-100 dark:border-slate-700/50',  // 半透明边框
    'bg-white dark:bg-slate-800/50',  // 深色主题半透明背景
    'shadow-sm',  // 轻微阴影
    'transition-all duration-200',
    onClick && 'cursor-pointer hover:shadow-md hover:-translate-y-0.5',
  )}
>
  {/* 标签 - 12px 中等字重 */}
  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
    {title}
  </p>

  {/* 主数值 - 20px 加粗，绿色强调 */}
  <div className="flex items-baseline gap-2 mt-1">
    <span className={cn(
      'text-xl font-bold leading-none',  // 20px
      'font-mono tabular-nums',
      'text-emerald-600 dark:text-emerald-400'  // 绿色强调
    )}>
      {value}
    </span>
    {trend && <TrendIndicator trend={trend} invertColors={invertTrendColors} />}
  </div>

  {/* 副标题 */}
  {subtitle && (
    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
      {subtitle}
    </p>
  )}
</Card>
```

### 3.2 图表卡片 (TrendChart, ProjectProgress, TaskDistribution)

**改进要点**:
- 圆角统一为 `rounded-2xl`
- 添加半透明边框
- 卡片标题字号改为 `14px font-semibold`
- 深色主题背景半透明

### 3.3 紧急任务提醒 (UrgentTaskAlert)

**改进要点**:
- 圆角改为 `rounded-2xl`
- 保持红色主题，但更柔和

### 3.4 任务列表 (TaskListPanel)

**改进要点**:
- 圆角改为 `rounded-2xl`
- 添加边框
- 优化列表项样式

### 3.5 主页面布局 (DashboardPage)

**改进要点**:
- 垂直间距从 `space-y-5` 改为 `space-y-6`
- 响应式断点简化

---

## 四、实施计划

### Phase 1: 核心组件样式更新
1. 更新 StatsCard 组件
2. 更新全局 Tailwind 配置（如需要）

### Phase 2: 图表组件更新
1. TrendChart 样式更新
2. ProjectProgress 样式更新
3. ProgressPieChart 样式更新
4. TaskDistribution 样式更新

### Phase 3: 辅助组件更新
1. UrgentTaskAlert 样式更新
2. TaskListPanel 样式更新

### Phase 4: 页面布局调整
1. DashboardPage 布局调整
2. 响应式优化

---

## 五、预期效果

| 指标 | 当前 | 优化后 |
|------|------|--------|
| 统计卡片高度 | ~120px | ~94px |
| 卡片圆角 | 12px | 16px |
| 垂直间距 | 20px | 24px |
| 信息密度 | 中等 | 较高 |
| 视觉风格 | 标准 | 专业科技感 |

---

## 六、风险评估

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| 深色主题兼容 | 中 | 逐个组件测试双主题 |
| 响应式布局 | 低 | 保持现有断点逻辑 |
| 图表样式冲突 | 低 | 仅调整外层卡片 |

---

**审批状态**: ⏳ 待用户批准
