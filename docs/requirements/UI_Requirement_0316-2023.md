# 项目任务管理系统 - UI需求文档

> **文档类型**: UI需求规格说明书
> **目标读者**: 前端开发团队、UI设计师

---

## 📋 文档说明

### 文档目的

本文档整合了项目任务管理系统的所有UI设计需求，作为前端开发的设计规范和验收标准。

### 文档来源


---

## 目录

- [第一部分：设计系统规范](#第一部分设计系统规范)
  - [1.1 设计系统选择](#11-设计系统选择)
  - [1.2 颜色系统](#12-颜色系统)
  - [1.3 字体系统](#13-字体系统)
  - [1.4 间距系统](#14-间距系统)
  - [1.5 圆角系统](#15-圆角系统)
  - [1.6 阴影系统](#16-阴影系统)
  - [1.7 深色模式](#17-深色模式)
- [第二部分：页面布局规范](#第二部分页面布局规范)
  - [2.1 整体布局结构](#21-整体布局结构)
  - [2.2 页面设计规范](#22-页面设计规范)
  - [2.3 导航结构](#23-导航结构)
  - [2.4 页面模板](#24-页面模板)
  - [2.5 仪表盘布局](#25-仪表盘布局)
  - [2.6 响应式断点](#26-响应式断点)
- [第三部分：交互设计规范](#第三部分交互设计规范)
  - [3.1 表单交互规范](#31-表单交互规范)
  - [3.2 表格交互规范](#32-表格交互规范)
  - [3.3 对话框交互规范](#33-对话框交互规范)
  - [3.4 反馈机制](#34-反馈机制)
  - [3.5 删除确认](#35-删除确认)
  - [3.6 键盘操作与快捷键规范](#36-键盘操作与快捷键规范)
- [第四部分：组件规范](#第四部分组件规范)
  - [4.1 基础UI组件清单](#41-基础ui组件清单)
  - [4.2 业务组件清单](#42-业务组件清单)
  - [4.3 WBS表格组件规范](#43-wbs表格组件规范)
- [第五部分：模块UI需求](#第五部分模块ui需求)
  - [5.1 项目管理模块](#51-项目管理模块)
  - [5.2 任务管理模块](#52-任务管理模块)
  - [5.3 设置模块](#53-设置模块)
  - [5.4 仪表板模块](#54-仪表板模块)
  - [5.5 审批流程模块](#55-审批流程模块)
  - [5.6 能力模型管理模块](#56-能力模型管理模块)
  - [5.7 导入导出模块](#57-导入导出模块)
  - [5.8 时间线管理模块](#58-时间线管理模块)
- [第六部分：UI改进任务](#第六部分ui改进任务)
  - [6.1 需要修改的项目](#61-需要修改的项目)
  - [6.2 持续优化](#62-持续优化)
- [附录](#附录)
  - [A. 演示文件清单](#a-演示文件清单)
  - [B. 相关文档](#b-相关文档)

---

# 第一部分：设计系统规范

## 1.1 设计系统选择

### 最终决策：shadcn/ui

| 属性 | 规范值 |
|------|--------|
| 设计系统 | shadcn/ui |
| 圆角（按钮） | 8px |
| 圆角（卡片） | 12px |
| 配色风格 | 高对比度，冷色调 |
| 动画效果 | 轻微过渡动画 |
| 整体风格 | 技术感、功能性 |

### 与 Apple Design 对比

| 维度 | shadcn/ui | Apple Design |
|------|-----------|--------------|
| 圆角 | 8px (按钮) / 12px (卡片) | 12px (统一) |
| 配色 | 高对比度，冷色调 | 柔和银灰色调 |
| 动画 | 标准 CSS 过渡 | 弹性缓动曲线 |
| 特效 | 无特殊特效 | 玻璃态（Glassmorphism） |
| 风格 | 技术感、功能性 | 优雅、高级感 |

---

## 1.2 颜色系统

### 语义化颜色（浅色主题）

```css
/* 背景色 */
--background: 0 0% 100%;              /* 纯白 */
--card: 0 0% 100%;
--popover: 0 0% 100%;

/* 前景色（文本） */
--foreground: 0 0% 13%;               /* 深灰文本 */
--card-foreground: 0 0% 13%;
--popover-foreground: 0 0% 13%;

/* 主色 */
--primary: 0 0% 35%;                  /* 银灰主色 */
--primary-foreground: 0 0% 100%;

/* 次要色 */
--secondary: 0 0% 97%;
--secondary-foreground: 0 0% 13%;

/* 静音色（辅助文本） */
--muted: 0 0% 97%;
--muted-foreground: 0 0% 45%;

/* 强调色 */
--accent: 0 0% 97%;
--accent-foreground: 0 0% 13%;

/* 功能色 */
--destructive: 0 84% 60%;             /* 红色（危险操作） */
--destructive-foreground: 0 0% 100%;

/* 边框色 */
--border: 0 0% 90%;
--input: 0 0% 90%;
--ring: 0 0% 35%;
```

### 语义化颜色（深色主题）

```css
/* 背景色 */
--background: 0 0% 7.5%;              /* 深色背景 */
--card: 200 5% 11.5%;
--popover: 200 5% 11.5%;

/* 前景色（文本） */
--foreground: 0 0% 100%;              /* 白色文本 */
--card-foreground: 0 0% 100%;
--popover-foreground: 0 0% 100%;

/* 主色 */
--primary: 0 0% 55%;                  /* 银灰深色 */
--primary-foreground: 0 0% 100%;

/* 次要色 */
--secondary: 210 10% 23%;
--secondary-foreground: 0 0% 100%;

/* 静音色 */
--muted: 210 10% 18%;
--muted-foreground: 0 0% 65%;

/* 强调色 */
--accent: 210 10% 25%;
--accent-foreground: 0 0% 100%;

/* 功能色 */
--destructive: 0 62% 30%;             /* 深色红 */
--destructive-foreground: 0 0% 100%;
```

### 侧边栏颜色

```css
/* 浅色主题 */
--sidebar-background: 0 0% 97%;
--sidebar-foreground: 0 0% 13%;
--sidebar-primary: 0 0% 35%;
--sidebar-active: 0 0% 90%;

/* 深色主题 */
--sidebar-background: 210 10% 11.5%;
--sidebar-foreground: 0 0% 100%;
--sidebar-primary: 0 0% 55%;
--sidebar-active: 210 10% 25%;
```

### 状态颜色

#### 状态颜色完整参考表

| 状态 | 颜色名称 | HSL值 | 使用场景 |
|------|----------|-------|----------|
| 成功 | 绿色 | hsl(142 69% 58%) | 操作成功、任务完成 |
| 警告 | 黄色 | hsl(48 98% 60%) | 一般警告 |
| 错误 | 红色 | hsl(0 84% 60%) | 操作失败、已延期 |
| 信息 | 蓝色 | hsl(211 98% 52%) | 提示信息 |
| **未开始** | **灰色** | **hsl(0 0% 60%)** | **任务尚未开始** |
| **进行中** | **蓝色** | **hsl(211 98% 52%)** | **任务进行中** |
| **延期预警** | **橙色** | **hsl(25 95% 53%)** | **有延期风险** |

#### 基础状态颜色

| 状态 | 颜色 | 使用场景 |
|------|------|----------|
| 成功 | 绿色 (hsl 142 69% 58%) | 操作成功、任务完成 |
| 警告 | 黄色 (hsl 48 98% 60%) | 待审批、延期预警 |
| 错误 | 红色 (hsl 0 84% 60%) | 操作失败、已延期 |
| 信息 | 蓝色 (hsl 211 98% 52%) | 提示信息 |
| 未开始 | 灰色 (hsl 0 0% 60%) | 任务尚未开始 |
| 进行中 | 蓝色 (hsl 211 98% 52%) | 任务进行中 |

### 任务状态颜色 更新

| 任务状态 | 颜色 | 图标 | 说明 |
|----------|------|------|------|
| 待审批 | 紫色 | ⏳ | 计划变更申请等待审批 |
| 已驳回 | 红色 | ✗ | 计划变更申请被驳回 |
| 未开始 | 灰色 | - | 任务尚未开始 |
| 进行中 | 蓝色 | ▶ | 任务正在进行 |
| **提前完成** | 绿色 | ✓ | 实际完成日期 < 计划结束日期 |
| **按时完成** | 青色 | ✓ | 实际完成日期 = 计划结束日期 |
| **延期预警** | 橙色 | ⏰ | 剩余天数≤预警天数，尚未延期 |
| **已延迟** | 红色 | ⚠️ | 超过计划结束日期仍未完成 |
| **超期完成** | 橙色 | ✓⚠ | 实际完成日期 > 计划结束日期 |

### 状态使用场景说明

#### 1. WBS任务表状态（9种细粒度状态）
用于详细的任务状态跟踪，包括：
- 审批流状态：待审批、已驳回
- 执行状态：未开始、进行中
- 完成状态：提前完成、按时完成、超期完成
- 预警状态：延期预警、已延迟

#### 2. 时间线视图状态（5种简化状态）
用于可视化展示，简化视觉复杂度：
- 未开始、进行中、已完成、已延期、已取消

#### 3. 状态映射规则
9种WBS状态通过映射规则转换为5种时间线状态，详见第3.5.3节。

#### 4. 状态颜色统一规则
| 状态 | 颜色 | HSL值 | 说明 |
|------|------|-------|------|
| 未开始 | 灰色 | hsl(0 0% 60%) | 尚未激活 |
| 进行中 | 蓝色 | hsl(211 98% 52%) | 正在执行 |
| 延期预警 | 橙色 | hsl(25 95% 53%) | 有延期风险 |
| 已延迟 | 红色 | hsl(0 84% 60%) | 超过计划日期 |

---

## 1.3 字体系统

### 字体族

```css
/* 无衬线字体栈 */
font-family:
  '-apple-system',           /* 苹果系统字体（优先） */
  'BlinkMacSystemFont',      /* macOS Chrome */
  '"SF Pro Display"',        /* 苹果显示字体 */
  '"SF Pro Text"',           /* 苹果正文字体 */
  '"Inter"',                 /* 备选现代字体 */
  '"Segoe UI"',              /* Windows */
  '"Roboto"',                /* Android */
  '"Helvetica Neue"',        /* 老版本 */
  'Arial',
  'sans-serif';

/* 等宽字体栈 */
font-family:
  '"SF Mono"',               /* 苹果等宽字体 */
  '"Monaco"',
  '"Cascadia Code"',
  '"Roboto Mono"',
  'monospace';
```

### 字体大小规范

| 名称 | 大小 | 行高 | 字重 | 使用场景 |
|------|------|------|------|----------|
| largeTitle | 34px | 41px | 700 | 页面大标题 |
| title1 | 28px | 34px | 700 | 模块标题 |
| title2 | 22px | 28px | 600 | 区块标题 |
| title3 | 20px | 25px | 600 | 卡片标题 |
| headline | 17px | 22px | 600 | 列表标题 |
| body | 17px | 22px | 400 | 正文内容 |
| callout | 16px | 21px | 400 | 说明文字 |
| subheadline | 15px | 20px | 400 | 辅助说明 |
| footnote | 13px | 18px | 400 | 脚注 |
| caption | 12px | 16px | 400 | 图片说明、标签 |

### 字重系统

| 字重 | 值 | 使用场景 |
|------|-----|----------|
| regular | 400 | 正文（默认） |
| medium | 500 | 强调文字 |
| semibold | 600 | 标题 |
| bold | 700 | 重要标题 |

---

## 1.4 间距系统

### 基础间距（8pt 网格）

| Token | 值 | 使用场景 |
|-------|-----|----------|
| 0 | 0px | 无间距 |
| 0.5 | 2px | 极小间距 |
| 1 | 4px | 最小间距 |
| 2 | 8px | 紧凑间距 |
| 3 | 12px | 小间距 |
| 4 | 16px | 标准间距 |
| 5 | 20px | 中等间距 |
| 6 | 24px | 舒适间距 |
| 8 | 32px | 大间距 |
| 10 | 40px | 区块间距 |
| 12 | 48px | 大区块间距 |

### 语义化间距

| 类别 | Token | 值 | 使用场景 |
|------|-------|-----|----------|
| 组件内间距 | xs | 8px | 紧凑内边距 |
| 组件内间距 | sm | 12px | 小内边距 |
| 组件内间距 | md | 16px | 标准内边距 |
| 组件内间距 | lg | 24px | 大内边距 |
| 组件内间距 | xl | 32px | 超大内边距 |
| 元素间距 | xs | 4px | 紧凑元素间距 |
| 元素间距 | sm | 8px | 小元素间距 |
| 元素间距 | md | 12px | 标准元素间距 |
| 元素间距 | lg | 16px | 大元素间距 |
| 元素间距 | xl | 24px | 超大元素间距 |

---

## 1.5 圆角系统

| 组件类型 | 圆角值 | Tailwind 类 |
|----------|--------|-------------|
| 按钮 | 8px | rounded-lg |
| 卡片 | 12px | rounded-xl |
| 输入框 | 6px | rounded-md |
| 对话框 | 12px | rounded-xl |
| 标签/徽章 | 4px | rounded |
| 头像 | 50% | rounded-full |

---

## 1.6 阴影系统

| 级别 | 使用场景 | Tailwind 类 |
|------|----------|-------------|
| sm | 轻微浮起 | shadow-sm |
| DEFAULT | 卡片悬浮 | shadow |
| md | 下拉菜单 | shadow-md |
| lg | 对话框 | shadow-lg |
| xl | 模态框 | shadow-xl |

---

## 1.7 深色模式

### 切换方式

- **决策**: 手动切换
- **存储**: localStorage 记住用户偏好
- **默认**: 跟随系统（首次访问）

### 实现方式

```typescript
// 主题切换 Hook
const useTheme = () => {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const saved = localStorage.getItem('theme');
    if (saved) {
      setTheme(saved as 'light' | 'dark');
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setTheme('dark');
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.classList.toggle('dark');
  };

  return { theme, toggleTheme };
};
```

---

# 第二部分：页面布局规范

## 2.1 整体布局结构

```
┌─────────────────────────────────────────────────────────────┐
│                        Header (顶栏)                        │
│  欢迎回来，[用户名]        ⚡ 热更新: 13:45:22  [通知] [用户] [主题] │
├──────────┬──────────────────────────────────────────────────┤
│          │                                                  │
│ Sidebar  │               Content Area                       │
│ (可折叠) │           (最大宽度 1440px)                       │
│          │           (左右边距 24px)                         │
│  导航项   │                                                  │
│    ·     │                                                  │
│    ·     │                                                  │
│    ·     │                                                  │
├──────────┴──────────────────────────────────────────────────┤
└─────────────────────────────────────────────────────────────┘
```

### Header组件规范

**左侧区域（欢迎信息）**:
```tsx
<div className="flex items-center">
  <h1 className="text-lg font-semibold">欢迎回来，{userName}</h1>
</div>
```

**右侧区域（状态与操作）**:
```tsx
<div className="flex items-center gap-4">
  {/* 热更新时间徽章 - 仅开发环境显示 */}
  {isDevelopment && (
    <HmrTimeBadge
      time={hmrTime}
      isHmr={isHmr}
      variant="pill"
    />
  )}

  {/* 通知中心 */}
  <NotificationBell unreadCount={unreadCount} />

  {/* 用户信息 */}
  <UserMenu user={currentUser} />

  {/* 主题切换 */}
  <ThemeToggle />
</div>
```

**热更新时间徽章（HmrTimeBadge）**:
```tsx
interface HmrTimeBadgeProps {
  time: string;           // 热更新时间，如 "13:45:22"
  isHmr: boolean;         // 是否热更新模式
  variant?: 'pill' | 'compact' | 'minimal';
}

// 样式
<div className={cn(
  "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium",
  "bg-muted/60 text-muted-foreground border border-border/50"
)}>
  {isHmr ? <Zap className="w-4 h-4" /> : <Package className="w-4 h-4" />}
  <span>{isHmr ? '热更新' : '构建'}: {time}</span>
  {isHmr && (
    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
  )}
</div>
```

**用途说明**:
- 开发调试时确认系统版本
- 热更新模式显示绿色闪烁点
- 生产环境隐藏此组件

## 2.2 页面设计规范

| # | 类别 | 最终决策 | 说明 |
|---|------|----------|------|
| 1 | 侧边栏样式 | 可折叠 | 展开宽度 256px，收起宽度 64px。注：时间线视图的左侧标签区（180px）是独立组件，与全局侧边栏不同 |
| 2 | 顶栏内容 | 左侧：欢迎信息（用户名）；右侧：热更新时间徽章 + 通知 + 用户 + 主题切换 | 开发环境显示热更新时间；不显示面包屑 |
| 3 | 内容区布局 | 单栏布局 | 居中对齐 |
| 4 | 一级导航 | 侧边栏导航 | 垂直导航 |
| 5 | 二级导航 | Tab 切换 | 水平标签页 |
| 6 | 页面最大宽度 | 1440px | 内容区最大宽度 |
| 7 | 内容边距 | 24px | 左右边距 |
| 8 | 响应式断点 | Tailwind 默认 | 640/768/1024/1280px |

## 2.3 导航结构

### 一级导航（侧边栏）

```
侧边栏导航
├─ 仪表板 (dashboard)
├─ 项目管理 (projects)
├─ 任务管理 (tasks)
├─ 智能分配 (assignment)
└─ 设置 (settings)
```

### 二级导航（Tab 切换）

**设置页面二级导航**（顶部 Tab）:
```
设置
├─ 个人资料 (settings-profile)
├─ 用户管理 (settings-users)
├─ 组织管理 (settings-organization)
├─ 权限管理 (settings-permissions)
├─ 任务类型 (settings-tasktypes)
├─ 能力模型 (settings-capability)
├─ 节假日 (settings-holidays)
└─ 系统日志 (settings-logs)
```

### 侧边栏折叠规范

#### 折叠状态尺寸

| 状态 | 宽度 | 显示内容 |
|------|------|----------|
| 展开 | 256px (w-64) | Logo + 图标 + 文字 + 折叠按钮 |
| 收起 | 64px (w-16) | Logo图标 + 图标 + 折叠按钮 |

#### 组件结构

```tsx
<aside className={cn(
  "fixed left-0 top-0 h-screen bg-card border-r border-border flex flex-col transition-all duration-300 z-50",
  collapsed ? "w-16" : "w-64"
)}>
  {/* Logo区域 */}
  <div className="h-16 flex items-center justify-between px-4 border-b border-border">
    {!collapsed ? (
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-green-500">
          <span className="text-white font-bold text-sm">T</span>
        </div>
        <span className="font-semibold text-sm">TechManage</span>
      </div>
    ) : (
      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-green-500 mx-auto">
        <span className="text-white font-bold text-sm">T</span>
      </div>
    )}
  </div>

  {/* 导航菜单 */}
  <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
    {/* 导航项... */}
  </nav>

  {/* 折叠按钮 */}
  <div className="p-2 border-t border-border">
    <button onClick={onToggleCollapse} className="w-full flex items-center justify-center p-2 rounded-lg">
      {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
    </button>
  </div>
</aside>
```

#### 导航项样式

**展开状态**:
```tsx
<button className={cn(
  "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
  isActive
    ? "bg-nav-active text-nav-active-foreground"
    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
)}>
  <Icon className="w-5 h-5 flex-shrink-0" />
  <span className="text-sm font-medium">{label}</span>
</button>
```

**收起状态**:
```tsx
<button className={cn(
  "w-full flex items-center justify-center px-3 py-2.5 rounded-lg transition-all duration-200",
  isActive
    ? "bg-nav-active text-nav-active-foreground"
    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
)}>
  <Icon className="w-5 h-5 flex-shrink-0" />
</button>
```

#### 设置子菜单展开

```tsx
{/* 设置父项 */}
<button onClick={handleSettingsClick}>
  <Settings className="w-5 h-5" />
  {!collapsed && (
    <>
      <span className="text-sm font-medium flex-1 text-left">设置</span>
      <ChevronDown className={cn(
        "w-4 h-4 transition-transform duration-200",
        isSettingsExpanded ? "rotate-180" : ""
      )} />
    </>
  )}
</button>

{/* 子选项 */}
{!collapsed && isSettingsExpanded && (
  <div className="mt-1 ml-4 pl-4 border-l border-border space-y-1">
    {subItems.map((subItem) => (
      <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg">
        <SubIcon className="w-4 h-4" />
        <span className="font-medium text-sm">{subItem.label}</span>
      </button>
    ))}
  </div>
)}
```

#### 样式规范表

| 元素 | 属性 | 值 |
|------|------|-----|
| 侧边栏背景 | bg-card | 卡片背景色 |
| 侧边栏边框 | border-r border-border | 右边框 |
| 过渡动画 | transition-all duration-300 | 300ms过渡 |
| Logo区域高度 | h-16 | 64px |
| Logo图标 | w-8 h-8 rounded-lg | 32px圆角方块 |
| 导航项内边距 | px-3 py-2.5 | 12px 10px |
| 导航项圆角 | rounded-lg | 8px |
| 图标大小 | w-5 h-5 | 20px |
| 文字大小 | text-sm | 14px |
| 折叠按钮 | p-2 | 8px内边距 |

#### 折叠行为

| 行为 | 说明 |
|------|------|
| 点击折叠按钮 | 切换展开/收起状态 |
| 收起时点击导航项 | 导航生效，保持收起状态 |
| 收起时点击设置 | 可选择：展开侧边栏 或 保持收起并跳转 |
| 状态持久化 | localStorage 保存折叠状态 |
| 跨标签同步 | BroadcastChannel 同步折叠状态 |

---

## 2.4 页面模板

### 列表页模板

```
┌──────────────────────────────────────────────────────────┐
│  Page Header                                             │
│  [页面标题]                        [新建按钮] [其他操作]   │
├──────────────────────────────────────────────────────────┤
│  Filter Bar                                              │
│  [搜索框] [筛选下拉] [状态筛选]        [清除筛选]          │
├──────────────────────────────────────────────────────────┤
│  Data Table                                              │
│  ┌────┬────────┬────────┬────────┬────────┬────────┐    │
│  │选择│ 列1    │ 列2    │ 列3    │ 列4    │ 操作   │    │
│  ├────┼────────┼────────┼────────┼────────┼────────┤    │
│  │ □  │ 数据   │ 数据   │ 数据   │ 数据   │ [编辑] │    │
│  │ □  │ 数据   │ 数据   │ 数据   │ 数据   │ [编辑] │    │
│  └────┴────────┴────────┴────────┴────────┴────────┘    │
├──────────────────────────────────────────────────────────┤
│  Pagination                                              │
│  [上一页] [1] [2] [3] ... [10] [下一页]   每页 [10▼] 条  │
└──────────────────────────────────────────────────────────┘
```

### 详情页模板

```
┌─────────────────────────────────────┬──────────────────┐
│  Main Content Area                  │  Side Panel      │
│                                     │                  │
│  [标题区]                           │  [快速信息]      │
│  [Tab 切换]                         │  - 状态          │
│                                     │  - 负责人        │
│  [内容区]                           │  - 时间          │
│  - 基本信息                         │                  │
│  - 详细描述                         │  [操作按钮]      │
│  - 相关数据                         │  - 编辑          │
│                                     │  - 删除          │
│                                     │                  │
│                                     │  [相关人员]      │
│                                     │                  │
└─────────────────────────────────────┴──────────────────┘
```

### 表单页模板（垂直表单）

```
┌──────────────────────────────────────────────────────────┐
│  Form Header                                             │
│  [表单标题]                                              │
├──────────────────────────────────────────────────────────┤
│  Form Fields                                             │
│                                                          │
│  字段标签                                                │
│  ┌────────────────────────────────────────────────────┐  │
│  │ 输入框                                              │  │
│  └────────────────────────────────────────────────────┘  │
│  帮助文本或错误提示                                      │
│                                                          │
│  字段标签                                                │
│  ┌────────────────────────────────────────────────────┐  │
│  │ 下拉选择框                                          │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  [字段组]                                                │
│  ┌──────────────┬──────────────┐                        │
│  │ 开始日期     │ 结束日期     │                        │
│  └──────────────┴──────────────┘                        │
│                                                          │
├──────────────────────────────────────────────────────────┤
│  Form Actions                                            │
│                              [取消] [提交]               │
└──────────────────────────────────────────────────────────┘
```

---

## 2.5 仪表盘布局

### 布局原则

**核心原则**: 优先展示需要用户关注的重要信息

> **注意**: 欢迎语和热更新时间已放在全局Header区域（见2.1节），仪表盘内容区从警告区域开始。

1. **延期任务最高优先级** - 延期任务需立即关注
2. **延期预警次之** - 即将延期的任务需要关注
3. **待审批任务** - 需要审批人处理
4. **关键数据** - 统计数据、趋势图表
5. **参考信息** - 项目列表、历史记录

### 整体结构（垂直堆叠 - 按优先级排序）

```
┌─────────────────────────────────────────────────────────────┐
│  1️⃣ ALERT AREA - 警告区域（最高优先级）                      │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ⛔ 延期任务警告                                      │   │
│  │ 您有 3 个任务已延迟，请立即处理        [查看详情 →]   │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ⏰ 延期预警提醒                                      │   │
│  │ 您有 2 个任务即将延期（3天内）          [查看全部 →]   │   │
│  └─────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────┤
│  2️⃣ PENDING APPROVAL - 待审批任务区域                       │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 📋 待审批任务 (2项)                                  │   │
│  │ ├─ 任务A - 计划变更申请 - 张三 - 2024-03-15          │   │
│  │ └─ 任务B - 计划变更申请 - 李四 - 2024-03-14          │   │
│  │                                    [查看全部待审批 →] │   │
│  └─────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────┤
│  3️⃣ STATS CARDS - 统计卡片                                  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│  │ 总任务数  │ │ 进行中   │ │ 紧急任务  │ │ 参与项目  │       │
│  │   128    │ │   32     │ │    5     │ │    8     │       │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘       │
├─────────────────────────────────────────────────────────────┤
│  4️⃣ CHARTS AREA - 图表区域                                  │
│  ┌──────────────────────┐ ┌──────────────────────┐          │
│  │ 任务趋势图           │ │ 项目进度分布         │          │
│  │ (折线图)             │ │ (饼图)               │          │
│  └──────────────────────┘ └──────────────────────┘          │
├─────────────────────────────────────────────────────────────┤
│  5️⃣ PROJECT LIST - 项目列表（可展开卡片）                    │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 项目A  ████████░░ 80%     [展开 ▼]                  │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 项目B  ██████░░░░ 60%     [展开 ▼]                  │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### 区域详细说明

#### 1️⃣ 警告区域（Alert Area）

**位置**: 顶部状态栏下方
**显示条件**: 有警告时显示，无警告时隐藏

**警告类型优先级**（从高到低）:
| 优先级 | 警告类型 | 图标 | 颜色 | 显示条件 |
|--------|----------|------|------|----------|
| P0 | 延期任务 | ⛔ | 红色 (destructive) | 有已延迟任务 |
| P0 | 延期预警 | ⏰ | 橙色 (warning) | 有即将延期的任务（预警天数内） |
| P1 | 紧急任务 | 🚨 | 黄色 | 有高优先级未完成任务 |
| P2 | 异常状态 | ❗ | 黄色 | 系统检测到异常 |

**样式规范**:
```html
<!-- 延期任务警告卡片（最高优先级） -->
<div class="card border-2 border-destructive/50 bg-destructive/5 mb-4">
  <div class="flex items-center gap-2 text-destructive">
    <AlertTriangle class="h-5 w-5" />
    <span class="font-semibold">延期任务警告</span>
  </div>
  <div class="mt-2">
    您有 <span class="font-bold text-destructive">3</span> 个任务已延迟，请立即处理
  </div>
  <Button variant="link" class="mt-2 p-0 h-auto">查看详情 →</Button>
</div>

<!-- 延期预警提醒卡片（次高优先级） -->
<div class="card border-2 border-orange-500/50 bg-orange-500/5 mb-4">
  <div class="flex items-center gap-2 text-orange-600">
    <Clock class="h-5 w-5" />
    <span class="font-semibold">延期预警提醒</span>
  </div>
  <div class="mt-2">
    您有 <span class="font-bold text-orange-600">2</span> 个任务即将延期（3天内）
  </div>
  <Button variant="link" class="mt-2 p-0 h-auto">查看全部 →</Button>
</div>

<!-- 紧急任务提醒卡片 -->
<div class="card border-2 border-yellow-500/50 bg-yellow-500/5 mb-4">
  <div class="flex items-center gap-2 text-yellow-700">
    <AlertCircle class="h-5 w-5" />
    <span class="font-semibold">紧急任务提醒</span>
  </div>
  <div class="mt-2">
    您有 <span class="font-bold text-yellow-700">5</span> 个紧急任务需要处理
  </div>
  <Button variant="link" class="mt-2 p-0 h-auto">查看全部 →</Button>
</div>
```

---

#### 2️⃣ 待审批任务区域（Pending Approval）

**位置**: 警告区域下方
**显示条件**: 仅对有审批权限的用户显示（技术经理、部门经理、管理员）
**显示数量**: 默认显示3条，超过显示"查看全部"

**样式规范**:
```html
<!-- 待审批任务卡片 -->
<div class="card mb-4">
  <div class="flex items-center justify-between mb-3">
    <div class="flex items-center gap-2">
      <ClipboardList class="h-5 w-5 text-primary" />
      <span class="font-semibold">待审批任务</span>
      <Badge variant="secondary">2项</Badge>
    </div>
    <Button variant="link" size="sm">查看全部待审批 →</Button>
  </div>

  <div class="space-y-2">
    <!-- 待审批项 -->
    <div class="flex items-center justify-between p-2 rounded-lg hover:bg-accent cursor-pointer">
      <div class="flex-1">
        <div class="font-medium text-sm">任务A - 计划变更申请</div>
        <div class="text-xs text-muted-foreground">张三 · 2024-03-15</div>
      </div>
      <Button size="sm">审批</Button>
    </div>

    <div class="flex items-center justify-between p-2 rounded-lg hover:bg-accent cursor-pointer">
      <div class="flex-1">
        <div class="font-medium text-sm">任务B - 计划变更申请</div>
        <div class="text-xs text-muted-foreground">李四 · 2024-03-14</div>
      </div>
      <Button size="sm">审批</Button>
    </div>
  </div>
</div>
```

---

#### 3️⃣ 统计卡片

**位置**: 待审批区域下方
**显示条件**: 始终显示

**统计卡片样式（极简数字）**:
```html
<!-- 极简统计卡片 -->
<div class="grid grid-cols-4 gap-4 mb-4">
  <div class="card p-4">
    <div class="text-sm text-muted-foreground">总任务数</div>
    <div class="text-3xl font-bold">128</div>
  </div>
  <div class="card p-4">
    <div class="text-sm text-muted-foreground">进行中</div>
    <div class="text-3xl font-bold">32</div>
  </div>
  <div class="card p-4">
    <div class="text-sm text-muted-foreground">紧急任务</div>
    <div class="text-3xl font-bold text-destructive">5</div>
  </div>
  <div class="card p-4">
    <div class="text-sm text-muted-foreground">参与项目</div>
    <div class="text-3xl font-bold">8</div>
  </div>
</div>
```

**设计要点**:
- 去除图标装饰
- 仅保留数值和标签
- 数值使用大号粗体
- 标签使用小号静音色
- 紧急任务数值使用红色强调

### 布局优先级总结

| 优先级 | 区域 | 说明 | 显示条件 |
|--------|------|------|----------|
| P0 | 顶部状态栏 | 个性化问候 + 热更新时间 | 始终显示 |
| P1 | 延期任务警告 | 最高优先级，需立即处理 | 有延期任务 |
| P1 | 延期预警提醒 | 次高优先级，即将延期 | 有预警任务 |
| P2 | 待审批任务 | 需要审批人关注 | 有待审批 + 有审批权限 |
| P3 | 统计卡片 | 数据概览 | 始终显示 |
| P4 | 图表区域 | 数据分析 | 始终显示 |
| P5 | 项目列表 | 详细信息 | 始终显示 |

---

## 2.6 响应式断点

| 断点名称 | 最小宽度 | 使用场景 |
|----------|----------|----------|
| sm | 640px | 大手机/小平板 |
| md | 768px | 平板竖屏 |
| lg | 1024px | 平板横屏/小笔记本 |
| xl | 1280px | 桌面显示器 |
| 2xl | 1536px | 大显示器 |

**注意**: 本系统仅支持桌面端，移动端不在当前范围内。

---

# 第三部分：交互设计规范

## 3.1 表单交互规范

### 验证时机（混合验证）

| 阶段 | 验证行为 |
|------|----------|
| 首次输入 | 不验证 |
| 失去焦点 (onBlur) | 验证该字段 |
| 已有错误 | 实时验证（onChange） |
| 提交时 | 验证所有字段 |

### 错误提示位置

- **决策**: 字段下方显示
- **样式**: 红色文字，小号字体
- **图标**: 可选错误图标

```html
<div class="form-field">
  <Label>任务描述</Label>
  <Input />
  {error && (
    <p class="text-sm text-destructive mt-1">
      请输入任务描述
    </p>
  )}
</div>
```

### 错误定位

- 自动滚动到第一个错误字段
- 高亮显示错误字段（红色边框）
- 自动聚焦到第一个错误字段

### 提交保护

| 状态 | 行为 |
|------|------|
| 提交中 | 禁用提交按钮 |
| 提交中 | 显示加载状态（Loader2 动画） |
| 有错误 | 禁用提交按钮 |
| 成功 | 显示成功提示，关闭表单 |

---

## 3.2 表格交互规范

### 排序交互

| 操作 | 行为 |
|------|------|
| 点击表头 | 切换升序/降序 |
| 排序图标 | ▲ 升序 / ▼ 降序 |
| Shift+点击 | 多列排序 |

### 筛选交互

| 功能 | 实现 |
|------|------|
| 搜索框 | 实时搜索（防抖 300ms） |
| 下拉筛选 | 多选下拉菜单 |
| 活跃筛选 | 显示筛选标签 |
| 清除筛选 | 一键清除所有筛选 |

### 分页样式

| 元素 | 实现 |
|------|------|
| 页码导航 | [上一页] [1] [2] ... [10] [下一页] |
| 每页条数 | 下拉选择（10/20/50/100） |
| 数据统计 | 显示 "第 X-Y 条，共 Z 条" |

### 行内编辑

| 操作 | 行为 |
|------|------|
| 进入编辑 | 双击单元格 |
| 保存 | Enter 键 或 点击保存按钮 |
| 取消 | Esc 键 或 点击取消按钮 |
| 自动保存 | 编辑完成后 2 秒自动保存 |

### 批量操作

- **决策**: 不支持批量操作（仅单选）
- **原因**: 简化交互，减少误操作

---

## 3.3 对话框交互规范

### ⚠️ 强制规则：禁止使用原生对话框

**所有对话框必须使用自行设计的UI组件，禁止调用操作系统原生对话框。**

| 禁止使用 | 替代方案 |
|----------|----------|
| `alert()` | Toast通知 / 自定义AlertDialog |
| `confirm()` | 自定义确认对话框 (AlertDialog) |
| `prompt()` | 自定义输入对话框 (Dialog + Input) |
| `window.showModalDialog()` | 自定义Modal组件 |

**原因**: 操作系统原生对话框与Apple设计风格不匹配，无法自定义样式，用户体验差。

**代码示例**:

```tsx
// ❌ 禁止
if (confirm('确定删除吗？')) {
  deleteItem();
}

// ✅ 正确
const handleDelete = () => {
  showConfirmDialog({
    title: '确认删除',
    message: '确定要删除此项吗？此操作无法撤销。',
    confirmText: '删除',
    variant: 'danger',
    onConfirm: () => deleteItem(),
  });
};
```

### 对话框尺寸

| 尺寸 | 最大宽度 | 使用场景 |
|------|----------|----------|
| sm | 384px | 确认对话框 |
| DEFAULT | 512px | 标准对话框 |
| lg | 640px | 大型表单 |
| xl | 768px | 超大内容 |
| full | 全屏 | 特殊场景 |

### 对话框行为

| 行为 | 实现 |
|------|------|
| 打开 | 淡入 + 缩放动画 |
| 关闭 | ESC 键 / 点击外部 / 关闭按钮 |
| 滚动 | 内容超出时对话框内部滚动 |
| 焦点 | 打开时聚焦第一个可交互元素 |

### WBS任务表单尺寸

- **决策**: 中等宽度 (max-w-lg)
- **布局**: 混合布局（单列为主，日期字段双列）

---

## 3.4 反馈机制

### Toast 通知

| 类型 | 样式 | 使用场景 |
|------|------|----------|
| success | 绿色 | 操作成功 |
| error | 红色 | 操作失败 |
| warning | 黄色 | 警告提示 |
| info | 蓝色 | 一般信息 |

**位置**: 右上角
**持续时间**: 3-5秒（可手动关闭）

### 加载状态

| 状态 | 实现 |
|------|------|
| 页面加载 | 骨架屏 (Skeleton) |
| 按钮加载 | Loader2 动画 + 禁用状态 |
| 表格加载 | 骨架表格行 |
| 长时间操作 | 进度条 |

### 空状态

| 场景 | 实现 |
|------|------|
| 无数据 | 插图 + 引导文字 + 操作按钮 |
| 无搜索结果 | 提示文字 + 清除筛选按钮 |
| 无权限 | 提示文字 + 联系管理员 |

---

## 3.5 删除确认

### 确认对话框

```html
<AlertDialog>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>确认删除</AlertDialogTitle>
      <AlertDialogDescription>
        确定要删除任务 "[任务名称]" 及其所有子任务吗？此操作无法撤销。
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>取消</AlertDialogCancel>
      <AlertDialogAction class="bg-destructive">
        确认删除
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

---

## 3.6 键盘操作与快捷键规范

### 全局快捷键

| 快捷键 | 功能 | 使用场景 |
|--------|------|----------|
| `Ctrl/Cmd + K` | 打开全局搜索/命令面板 | 任意页面 |
| `Ctrl/Cmd + S` | 保存当前编辑 | 表单编辑中 |
| `Ctrl/Cmd + Shift + N` | 新建项目 | 任意页面 |
| `Ctrl/Cmd + /` | 显示/隐藏快捷键帮助 | 任意页面 |
| `Esc` | 关闭对话框/取消操作 | 对话框打开时 |

### 表格快捷键

| 快捷键 | 功能 | 使用场景 |
|--------|------|----------|
| `↑` `↓` | 上下移动选中行 | 表格聚焦时 |
| `Enter` | 进入编辑模式/确认编辑 | 选中行时 |
| `Esc` | 取消编辑 | 编辑模式中 |
| `Tab` | 移动到下一个可编辑单元格 | 编辑模式中 |
| `Shift + Tab` | 移动到上一个可编辑单元格 | 编辑模式中 |
| `Delete` | 删除选中行（需确认） | 选中行时 |
| `Ctrl/Cmd + A` | 全选（如支持批量） | 表格聚焦时 |

### 表单快捷键

| 快捷键 | 功能 | 使用场景 |
|--------|------|----------|
| `Tab` | 移动到下一个字段 | 表单聚焦时 |
| `Shift + Tab` | 移动到上一个字段 | 表单聚焦时 |
| `Enter` | 提交表单 | 表单聚焦时（非多行文本） |
| `Esc` | 取消/关闭表单 | 表单聚焦时 |
| `Space` | 勾选复选框/选择选项 | 聚焦到复选框/单选时 |

### 对话框快捷键

| 快捷键 | 功能 | 使用场景 |
|--------|------|----------|
| `Esc` | 关闭对话框 | 对话框打开时 |
| `Tab` | 在对话框内循环焦点 | 对话框打开时 |
| `Enter` | 确认/提交 | 焦点在确认按钮时 |

### 时间线视图快捷键

| 快捷键 | 功能 | 使用场景 |
|--------|------|----------|
| `+` / `-` | 放大/缩小时间线 | 时间线聚焦时 |
| `←` `→` | 左右滚动时间线 | 时间线聚焦时 |
| `Home` | 滚动到开始 | 时间线聚焦时 |
| `End` | 滚动到结束 | 时间线聚焦时 |
| `T` | 滚动到今天 | 时间线聚焦时 |
| `Ctrl/Cmd + Z` | 撤销操作 | 有可撤销操作时 |

### WBS表格快捷键

| 快捷键 | 功能 | 使用场景 |
|--------|------|----------|
| `Insert` | 添加同级任务 | 表格聚焦时 |
| `Ctrl/Cmd + Enter` | 添加子任务 | 选中行时 |
| `F2` | 进入编辑模式 | 选中行时 |
| `Ctrl/Cmd + Delete` | 删除任务 | 选中行时 |
| `Ctrl/Cmd + ↑` `↓` | 移动任务顺序 | 选中行时 |
| `←` `→` | 折叠/展开任务 | 选中行时 |

### 焦点管理规范

| 规则 | 说明 |
|------|------|
| Tab 顺序 | 遵循视觉顺序：从左到右、从上到下 |
| 焦点指示 | 明显的焦点环样式（ring-2 ring-primary） |
| 跳过隐藏元素 | display:none 元素不在 Tab 序列中 |
| 模态焦点陷阱 | 对话框打开时焦点限制在对话框内 |
| 焦点恢复 | 对话框关闭后焦点返回触发元素 |

### 快捷键提示

- 按钮和菜单项旁显示快捷键提示（使用 `<KBD>` 组件）
- 首次使用时显示快捷键引导
- `Ctrl/Cmd + /` 显示完整快捷键列表

```html
<!-- 快捷键显示示例 -->
<Button>
  保存
  <KBD class="ml-2">Ctrl+S</KBD>
</Button>
```

---

# 第四部分：组件规范

## 4.1 基础UI组件清单

### 表单输入组件 (13个)

| 组件 | 说明 | 基于 |
|------|------|------|
| Input | 文本输入框 | Radix UI |
| Textarea | 多行文本框 | Radix UI |
| Select | 下拉选择 | Radix UI |
| Checkbox | 复选框 | Radix UI |
| Radio Group | 单选组 | Radix UI |
| Switch | 开关 | Radix UI |
| Slider | 滑块 | Radix UI |
| Calendar | 日历 | Radix UI |
| Date Input | 日期输入 | Radix UI |
| Input OTP | 验证码输入 | Radix UI |
| Input Group | 输入组 | 自定义 |
| Form | 表单容器 | React Hook Form |
| Label | 标签 | Radix UI |

### 按钮组件 (3个)

| 组件 | 变体 | 使用场景 |
|------|------|----------|
| Button | default/destructive/outline/secondary/ghost/link | 主要操作 |
| Button Group | - | 按钮组 |
| Toggle | - | 切换按钮 |

### 数据展示组件 (10个)

| 组件 | 说明 |
|------|------|
| Table | 数据表格 |
| Card | 卡片容器 |
| Badge | 状态徽章 |
| Avatar | 头像 |
| Alert | 警告提示 |
| Progress | 进度条 |
| Chart | 图表 |
| Skeleton | 骨架屏 |
| Empty | 空状态 |
| KBD | 快捷键显示 |

### 导航组件 (8个)

| 组件 | 说明 |
|------|------|
| Navigation Menu | 导航菜单 |
| Menubar | 菜单栏 |
| Breadcrumb | 面包屑（本项目不显示） |
| Tabs | 标签页 |
| Sidebar | 侧边栏 |
| Pagination | 分页 |
| Context Menu | 右键菜单 |
| Command | 命令面板 |

### 覆盖层组件 (11个)

| 组件 | 说明 |
|------|------|
| Dialog | 对话框 |
| Alert Dialog | 警告对话框 |
| Drawer | 抽屉 |
| Sheet | 滑出面板 |
| Popover | 弹出框 |
| Hover Card | 悬浮卡片 |
| Tooltip | 工具提示 |
| Dropdown Menu | 下拉菜单 |
| Resizable | 可调整大小 |
| Scroll Area | 滚动区域 |
| Collapsible | 折叠面板 |

---

### 覆盖层组件详细规范

#### Dialog 对话框规范

**组件结构**:
```tsx
<Dialog open={isOpen} onOpenChange={setIsOpen}>
  <DialogContent className="sm:max-w-[500px]">
    <DialogHeader>
      <DialogTitle>对话框标题</DialogTitle>
      <DialogDescription>对话框描述文字</DialogDescription>
    </DialogHeader>

    {/* 对话框内容 */}

    <DialogFooter>
      <Button variant="outline" onClick={() => setIsOpen(false)}>
        取消
      </Button>
      <Button onClick={handleConfirm}>
        确认
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

**尺寸规范**:
| 尺寸 | 最大宽度 | 使用场景 |
|------|----------|----------|
| sm | 384px (max-w-sm) | 确认对话框、简单提示 |
| default | 512px (max-w-md) | 标准表单、详情查看 |
| lg | 640px (max-w-lg) | WBS任务表单、复杂表单 |
| xl | 768px (max-w-xl) | 大型内容展示 |
| 2xl | 1024px (max-w-2xl) | 超大内容、报表展示 |
| full | 全屏 | 特殊场景 |

**样式规范**:
| 属性 | 值 |
|------|-----|
| 背景色 | --card |
| 边框 | 1px solid --border |
| 圆角 | 12px (rounded-xl) |
| 阴影 | shadow-lg |
| 内边距 | 24px (p-6) |
| 最大高度 | 90vh |

**动画效果**:
| 状态 | 动画 |
|------|------|
| 打开 | 淡入 (opacity: 0→1) + 缩放 (scale: 0.95→1) |
| 关闭 | 淡出 + 缩放 |
| 持续时间 | 200ms |
| 缓动函数 | ease-out |

**行为规范**:
| 行为 | 规则 |
|------|------|
| 打开时 | 焦点移到对话框内第一个可交互元素 |
| ESC键 | 关闭对话框 |
| 点击外部 | 关闭对话框（可通过 modal={false} 禁用） |
| 滚动锁定 | 打开时禁止背景滚动 |
| 焦点陷阱 | 焦点限制在对话框内 |

---

#### Alert Dialog 警告对话框规范

**使用场景**: 删除确认、危险操作确认、重要警告

**组件结构**:
```tsx
<AlertDialog open={isOpen} onOpenChange={setIsOpen}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>确认删除</AlertDialogTitle>
      <AlertDialogDescription>
        此操作无法撤销，将永久删除该数据。
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>取消</AlertDialogCancel>
      <AlertDialogAction className="bg-destructive hover:bg-destructive/90">
        确认删除
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

**与普通对话框的区别**:
| 特性 | Dialog | AlertDialog |
|------|--------|-------------|
| 点击外部关闭 | ✅ 支持 | ❌ 不支持 |
| ESC键关闭 | ✅ 支持 | ❌ 不支持（可配置） |
| 焦点行为 | 可交互 | 默认聚焦取消按钮 |
| 视觉强调 | 普通 | 警告色强调 |

**按钮规范**:
| 按钮 | 样式 | 位置 |
|------|------|------|
| 取消 | outline | 左侧 |
| 确认 | destructive（危险操作） | 右侧 |

---

#### Drawer 抽屉规范

**使用场景**: 侧边详情面板、设置面板、筛选面板

**组件结构**:
```tsx
<Drawer open={isOpen} onOpenChange={setIsOpen} direction="right">
  <DrawerContent>
    <DrawerHeader>
      <DrawerTitle>抽屉标题</DrawerTitle>
      <DrawerDescription>抽屉描述</DrawerDescription>
    </DrawerHeader>

    {/* 抽屉内容 */}

    <DrawerFooter>
      <Button variant="outline" onClick={() => setIsOpen(false)}>
        取消
      </Button>
      <Button onClick={handleConfirm}>
        确认
      </Button>
    </DrawerFooter>
  </DrawerContent>
</Drawer>
```

**方向与尺寸**:
| 方向 | 宽度/高度 | 使用场景 |
|------|-----------|----------|
| right | 400px | 详情面板、设置面板 |
| left | 400px | 导航菜单 |
| bottom | 50vh | 移动端操作面板 |
| top | 300px | 通知面板 |

**样式规范**:
| 属性 | 值 |
|------|-----|
| 背景色 | --card |
| 边框 | 1px solid --border（仅边缘） |
| 阴影 | shadow-2xl |
| 遮罩 | bg-black/50 |

**拖拽交互**:
| 行为 | 规则 |
|------|------|
| 拖拽手柄 | 顶部/侧边显示拖拽条 |
| 拖拽关闭 | 拖拽超过50%自动关闭 |
| 快速滑动 | 支持快速滑动关闭 |

---

#### Sheet 滑出面板规范

**使用场景**: 轻量级侧边内容、通知列表、快速操作

**与 Drawer 的区别**:
| 特性 | Drawer | Sheet |
|------|--------|-------|
| 内容复杂度 | 复杂表单、详情 | 简单列表、操作 |
| 交互方式 | 可拖拽 | 滑出动画 |
| 层级 | 较高 | 中等 |
| 底部面板 | 支持 | 主要使用场景 |

**组件结构**:
```tsx
<Sheet open={isOpen} onOpenChange={setIsOpen}>
  <SheetContent side="right">
    <SheetHeader>
      <SheetTitle>面板标题</SheetTitle>
      <SheetDescription>面板描述</SheetDescription>
    </SheetHeader>
    {/* 面板内容 */}
  </SheetContent>
</Sheet>
```

---

#### Popover 弹出框规范

**使用场景**: 日期选择、颜色选择、简单表单、信息展示

**组件结构**:
```tsx
<Popover open={isOpen} onOpenChange={setIsOpen}>
  <PopoverTrigger asChild>
    <Button variant="outline">打开弹出框</Button>
  </PopoverTrigger>
  <PopoverContent className="w-80">
    {/* 弹出框内容 */}
  </PopoverContent>
</Popover>
```

**尺寸规范**:
| 尺寸 | 宽度 | 使用场景 |
|------|------|----------|
| sm | 200px | 简单选择 |
| default | 320px | 标准内容 |
| lg | 400px | 复杂内容 |

**位置与对齐**:
| 属性 | 可选值 | 默认值 |
|------|--------|--------|
| side | top/right/bottom/left | bottom |
| align | start/center/end | center |
| sideOffset | 像素值 | 4px |
| alignOffset | 像素值 | 0 |

**行为规范**:
| 行为 | 规则 |
|------|------|
| 打开 | 点击触发元素 |
| 关闭 | 点击外部、ESC键、选择后自动关闭 |
| 自动调整 | 超出视口时自动调整位置 |

---

#### Tooltip 工具提示规范

**使用场景**: 按钮说明、图标解释、快捷键提示

**组件结构**:
```tsx
<TooltipProvider>
  <Tooltip>
    <TooltipTrigger asChild>
      <Button variant="ghost" size="icon">
        <HelpCircle className="h-4 w-4" />
      </Button>
    </TooltipTrigger>
    <TooltipContent>
      <p>这是帮助提示</p>
    </TooltipContent>
  </Tooltip>
</TooltipProvider>
```

**样式规范**:
| 属性 | 值 |
|------|-----|
| 背景色 | --popover |
| 前景色 | --popover-foreground |
| 圆角 | 6px (rounded-md) |
| 内边距 | 8px 12px (px-3 py-1.5) |
| 字号 | 12px (text-xs) |
| 最大宽度 | 250px |
| 延迟显示 | 400ms |
| 延迟隐藏 | 0ms |

**显示规则**:
| 规则 | 说明 |
|------|------|
| 悬停触发 | 鼠标悬停400ms后显示 |
| 离开隐藏 | 鼠标离开立即隐藏 |
| 自动调整 | 超出视口时自动调整位置 |
| 焦点支持 | 键盘聚焦时也显示 |

---

#### Dropdown Menu 下拉菜单规范

**使用场景**: 操作菜单、筛选选项、更多操作

**组件结构**:
```tsx
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="ghost" size="icon">
      <MoreHorizontal className="h-4 w-4" />
    </Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent align="end">
    <DropdownMenuLabel>操作</DropdownMenuLabel>
    <DropdownMenuSeparator />
    <DropdownMenuItem onClick={handleEdit}>
      <Pencil className="mr-2 h-4 w-4" />
      编辑
    </DropdownMenuItem>
    <DropdownMenuItem onClick={handleCopy}>
      <Copy className="mr-2 h-4 w-4" />
      复制
    </DropdownMenuItem>
    <DropdownMenuSeparator />
    <DropdownMenuItem className="text-destructive" onClick={handleDelete}>
      <Trash className="mr-2 h-4 w-4" />
      删除
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

**样式规范**:
| 属性 | 值 |
|------|-----|
| 最小宽度 | 180px |
| 背景色 | --popover |
| 圆角 | 8px (rounded-lg) |
| 内边距 | 4px (p-1) |
| 项目高度 | 36px |
| 项目圆角 | 4px |

**项目类型**:
| 类型 | 使用场景 |
|------|----------|
| DropdownMenuItem | 普通操作项 |
| DropdownMenuCheckboxItem | 可勾选项 |
| DropdownMenuRadioItem | 单选项 |
| DropdownMenuLabel | 分组标签 |
| DropdownMenuSeparator | 分隔线 |
| DropdownMenuGroup | 分组容器 |
| DropdownMenuSub | 子菜单 |

---

#### Scroll Area 滚动区域规范

**使用场景**: 长列表、对话内容、代码块

**组件结构**:
```tsx
<ScrollArea className="h-[300px] w-full">
  {/* 滚动内容 */}
</ScrollArea>
```

**样式规范**:
| 属性 | 值 |
|------|-----|
| 滚动条宽度 | 10px |
| 滚动条圆角 | 5px |
| 滚动条颜色 | --border (hover时加深) |
| 滚动条边距 | 2px |

**行为规范**:
| 行为 | 规则 |
|------|------|
| 鼠标悬停 | 显示滚动条 |
| 离开 | 滚动条渐隐 |
| 键盘滚动 | 支持方向键滚动 |
| 触摸滚动 | 支持触摸滚动（移动端） |

---

#### Collapsible 折叠面板规范

**使用场景**: FAQ、可展开内容、详情展开

**组件结构**:
```tsx
<Collapsible open={isOpen} onOpenChange={setIsOpen}>
  <CollapsibleTrigger className="flex items-center justify-between w-full">
    <span>折叠面板标题</span>
    <ChevronDown className={cn(
      "h-4 w-4 transition-transform",
      isOpen && "transform rotate-180"
    )} />
  </CollapsibleTrigger>
  <CollapsibleContent>
    {/* 展开内容 */}
  </CollapsibleContent>
</Collapsible>
```

**动画效果**:
| 属性 | 值 |
|------|-----|
| 展开动画 | height: 0 → auto |
| 持续时间 | 200ms |
| 缓动函数 | ease-out |
| 图标旋转 | 180度 |

---

### 反馈组件 (3个)

| 组件 | 说明 |
|------|------|
| Sonner | Toast 通知 |
| Spinner | 加载动画 |
| Notification | 通知组件 |

---

### 反馈组件详细规范

#### Toast 通知规范（Sonner）

**使用场景**: 操作成功、操作失败、警告提示、一般信息

**组件结构**:
```tsx
import { toast } from 'sonner';

// 基本用法
toast('操作成功');

// 带描述
toast.success('项目创建成功', {
  description: '新项目已添加到列表中'
});

// 带操作按钮
toast('任务已删除', {
  description: '点击撤销恢复',
  action: {
    label: '撤销',
    onClick: () => handleUndo()
  }
});

// 错误提示
toast.error('操作失败', {
  description: '网络连接错误，请重试'
});
```

**类型与样式**:
| 类型 | 方法 | 图标 | 颜色 |
|------|------|------|------|
| 成功 | toast.success() | ✓ | 绿色 (hsl 142 69% 58%) |
| 错误 | toast.error() | ✕ | 红色 (hsl 0 84% 60%) |
| 警告 | toast.warning() | ⚠ | 黄色 (hsl 48 98% 60%) |
| 信息 | toast.info() | ℹ | 蓝色 (hsl 211 98% 52%) |
| 加载 | toast.loading() | ⟳ | 主色 |

**位置与持续时间**:
| 属性 | 值 |
|------|-----|
| 位置 | 右上角 (top-right) |
| 默认持续时间 | 4000ms |
| 错误持续时间 | 5000ms |
| 加载持续时间 | 手动关闭 |
| 最大数量 | 3个 |

**样式规范**:
| 属性 | 值 |
|------|-----|
| 背景色 | --card |
| 边框 | 1px solid --border |
| 圆角 | 8px (rounded-lg) |
| 内边距 | 12px 16px |
| 阴影 | shadow-lg |
| 图标大小 | 16px |
| 标签字号 | 14px (text-sm) |
| 描述字号 | 12px (text-xs) |

**动画效果**:
| 状态 | 动画 |
|------|------|
| 进入 | 从右侧滑入 + 淡入 |
| 退出 | 向右滑出 + 淡出 |
| 持续时间 | 300ms |

---

#### Spinner 加载动画规范

**使用场景**: 按钮加载、内容加载、页面加载

**组件结构**:
```tsx
// Loader2 动画（推荐）
import { Loader2 } from 'lucide-react';

<Button disabled>
  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
  加载中...
</Button>

// 独立加载指示器
<div className="flex items-center justify-center h-[200px]">
  <Loader2 className="h-8 w-8 animate-spin text-primary" />
</div>
```

**尺寸规范**:
| 场景 | 尺寸 |
|------|------|
| 按钮内 | 16px (h-4 w-4) |
| 输入框内 | 16px (h-4 w-4) |
| 卡片加载 | 24px (h-6 w-6) |
| 页面加载 | 32px (h-8 w-8) |
| 全屏加载 | 48px (h-12 w-12) |

**颜色规范**:
| 场景 | 颜色 |
|------|------|
| 默认 | --primary |
| 按钮内 | --primary-foreground |
| 禁用状态 | --muted-foreground |

**动画规范**:
| 属性 | 值 |
|------|-----|
| 动画类型 | 旋转 (animate-spin) |
| 旋转速度 | 1秒/圈 |
| 缓动函数 | linear |

---

#### Skeleton 骨架屏规范

**使用场景**: 数据加载时显示占位内容

**组件结构**:
```tsx
// 文本骨架
<Skeleton className="h-4 w-[250px]" />

// 头像骨架
<Skeleton className="h-12 w-12 rounded-full" />

// 卡片骨架
<div className="space-y-3">
  <Skeleton className="h-4 w-[200px]" />
  <Skeleton className="h-4 w-[150px]" />
  <Skeleton className="h-[125px] w-full rounded-xl" />
</div>

// 表格行骨架
<div className="space-y-2">
  {Array.from({ length: 5 }).map((_, i) => (
    <div key={i} className="flex gap-4">
      <Skeleton className="h-10 w-10 rounded" />
      <Skeleton className="h-10 flex-1" />
      <Skeleton className="h-10 w-24" />
    </div>
  ))}
</div>
```

**样式规范**:
| 属性 | 值 |
|------|-----|
| 背景色 | --muted |
| 圆角 | 4px (rounded) |
| 动画 | pulse (闪烁) |

**使用场景与尺寸**:
| 场景 | 高度 | 宽度 |
|------|------|------|
| 单行文本 | 16px (h-4) | 自适应 |
| 标题 | 24px (h-6) | 自适应 |
| 头像 | 40px (h-10 w-10) | 40px |
| 大头像 | 48px (h-12 w-12) | 48px |
| 图片/卡片 | 自定义 | 100% |

---

#### Progress 进度条规范

**使用场景**: 上传进度、下载进度、任务完成度

**组件结构**:
```tsx
<Progress value={66} className="w-full" />
```

**样式规范**:
| 属性 | 值 |
|------|-----|
| 高度 | 8px (h-2) |
| 背景色 | --secondary |
| 进度色 | --primary |
| 圆角 | 4px (rounded-full) |

**颜色规则**:
| 进度范围 | 颜色 |
|----------|------|
| 0-30% | 红色 (destructive) |
| 31-70% | 黄色 (warning) |
| 71-100% | 绿色 (success) |

---

#### Notification 通知组件规范

**使用场景**: 系统通知、消息通知、任务提醒

**与 Toast 的区别**:
| 特性 | Toast | Notification |
|------|-------|--------------|
| 持续性 | 自动消失 | 需手动关闭 |
| 交互 | 简单操作 | 复杂操作 |
| 位置 | 角落 | 侧边面板/下拉面板 |
| 内容 | 简短文字 | 可包含列表、图片 |
| 层级 | 临时提示 | 持久消息 |

**通知中心结构**:
```tsx
<Popover>
  <PopoverTrigger asChild>
    <Button variant="ghost" size="icon" className="relative">
      <Bell className="h-5 w-5" />
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-xs text-white flex items-center justify-center">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </Button>
  </PopoverTrigger>
  <PopoverContent align="end" className="w-80">
    <div className="flex items-center justify-between mb-4">
      <h4 className="font-semibold">通知</h4>
      <Button variant="ghost" size="sm">全部已读</Button>
    </div>
    <ScrollArea className="h-[300px]">
      {/* 通知列表 */}
    </ScrollArea>
    <div className="mt-4 pt-4 border-t">
      <Button variant="outline" className="w-full">
        查看全部通知
      </Button>
    </div>
  </PopoverContent>
</Popover>
```

**通知项结构**:
```tsx
<div className="flex gap-3 p-3 hover:bg-accent rounded-lg cursor-pointer">
  <Avatar className="h-10 w-10" />
  <div className="flex-1 min-w-0">
    <p className="text-sm font-medium truncate">通知标题</p>
    <p className="text-xs text-muted-foreground truncate">通知描述文字</p>
    <p className="text-xs text-muted-foreground mt-1">2分钟前</p>
  </div>
  {!isRead && (
    <span className="h-2 w-2 rounded-full bg-primary mt-2" />
  )}
</div>
```

**通知类型**:
| 类型 | 图标 | 颜色 |
|------|------|------|
| 系统 | Settings | 主色 |
| 任务 | CheckCircle | 绿色 |
| 警告 | AlertTriangle | 黄色 |
| 错误 | XCircle | 红色 |
| 消息 | MessageSquare | 蓝色 |

---

### 图表组件详细规范

#### 技术选型

| 项目 | 决策 |
|------|------|
| 图表库 | Recharts |
| 原因 | React 原生、轻量、易于定制、TypeScript 支持好 |

#### 图表类型

| 图表类型 | 使用场景 | 组件名 |
|----------|----------|--------|
| 折线图 | 任务趋势、进度趋势 | TaskTrendChart |
| 面积图 | 累计完成趋势 | AreaChart |
| 饼图 | 状态分布、类型分布 | StatusPieChart |
| 柱状图 | 成员工作量、延期统计 | WorkloadBarChart |
| 进度环 | 单个进度展示 | ProgressRing |
| 甘特图 | 时间线视图 | GanttChart |

---

#### 折线图规范

**使用场景**: 任务趋势、项目进度趋势

```tsx
// 任务趋势折线图
<LineChart
  data={taskTrendData}
  width={400}
  height={200}
  margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
>
  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
  <XAxis
    dataKey="date"
    stroke="hsl(var(--muted-foreground))"
    fontSize={12}
  />
  <YAxis
    stroke="hsl(var(--muted-foreground))"
    fontSize={12}
  />
  <Tooltip
    contentStyle={{
      backgroundColor: 'hsl(var(--popover))',
      border: '1px solid hsl(var(--border))',
      borderRadius: '8px'
    }}
  />
  <Line
    type="monotone"
    dataKey="total"
    stroke="hsl(var(--primary))"
    strokeWidth={2}
    dot={false}
  />
  <Line
    type="monotone"
    dataKey="completed"
    stroke="hsl(142, 69%, 58%)"
    strokeWidth={2}
    dot={false}
  />
</LineChart>
```

**数据结构**:
```typescript
interface TrendData {
  date: string;        // "03-01"
  total: number;       // 总任务数
  completed: number;   // 已完成数
  delayed: number;     // 延期数
}
```

**样式规范**:
| 属性 | 值 |
|------|-----|
| 网格线 | 虚线，使用 --border 颜色 |
| 坐标轴 | 使用 --muted-foreground 颜色，12px 字号 |
| 主线 | 2px 宽度，无数据点 |
| Tooltip | 使用主题色，8px 圆角 |

---

#### 饼图规范

**使用场景**: 任务状态分布、项目类型分布

```tsx
// 任务状态分布饼图
<PieChart width={200} height={200}>
  <Pie
    data={statusData}
    cx="50%"
    cy="50%"
    innerRadius={50}
    outerRadius={80}
    paddingAngle={2}
    dataKey="value"
  >
    {statusData.map((entry, index) => (
      <Cell key={index} fill={entry.color} />
    ))}
  </Pie>
  <Tooltip />
  <Legend
    verticalAlign="bottom"
    height={36}
    formatter={(value) => <span className="text-sm">{value}</span>}
  />
</PieChart>
```

**数据结构**:
```typescript
interface StatusData {
  name: string;    // "已完成"
  value: number;   // 50
  color: string;   // "hsl(142, 69%, 58%)"
}
```

**颜色映射**:
| 状态 | 颜色 |
|------|------|
| 已完成 | hsl(142, 69%, 58%) 绿色 |
| 进行中 | hsl(211, 98%, 52%) 蓝色 |
| 未开始 | hsl(0, 0%, 60%) 灰色 |
| 已延迟 | hsl(0, 84%, 60%) 红色 |

**样式规范**:
| 属性 | 值 |
|------|-----|
| 内环半径 | 50px（环形图） |
| 外环半径 | 80px |
| 间距 | 2° |
| 图例 | 底部居中，12px 字号 |

---

#### 柱状图规范

**使用场景**: 成员工作量统计、延期统计

```tsx
// 成员工作量柱状图
<BarChart
  data={workloadData}
  width={400}
  height={200}
  layout="vertical"
  margin={{ top: 10, right: 10, left: 60, bottom: 0 }}
>
  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
  <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
  <YAxis
    type="category"
    dataKey="name"
    stroke="hsl(var(--muted-foreground))"
    fontSize={12}
    width={50}
  />
  <Tooltip />
  <Bar
    dataKey="tasks"
    fill="hsl(var(--primary))"
    radius={[0, 4, 4, 0]}
  />
</BarChart>
```

**数据结构**:
```typescript
interface WorkloadData {
  name: string;    // "张三"
  tasks: number;   // 15
  completed: number; // 10
}
```

**样式规范**:
| 属性 | 值 |
|------|-----|
| 柱宽 | 自适应 |
| 圆角 | 右侧 4px |
| 颜色 | 使用 --primary 颜色 |
| 水平布局 | 成员名称在左侧 |

---

#### 进度环规范

**使用场景**: 统计卡片、单个项目进度

```tsx
// 进度环组件
<ProgressRing
  value={75}
  size={80}
  strokeWidth={8}
  showValue
/>
```

**组件 Props**:
| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| value | number | 0 | 进度值 (0-100) |
| size | number | 80 | 环大小 (px) |
| strokeWidth | number | 8 | 线条宽度 (px) |
| showValue | boolean | true | 是否显示数值 |
| color | string | --primary | 进度颜色 |

**颜色规则**:
| 进度范围 | 颜色 |
|----------|------|
| 0-30% | 红色 (警告) |
| 31-70% | 黄色 (进行中) |
| 71-100% | 绿色 (良好) |

---

#### 图表通用规范

**响应式**:
```tsx
// 使用 ResponsiveContainer 实现响应式
<ResponsiveContainer width="100%" height={200}>
  <LineChart data={data}>
    {/* ... */}
  </LineChart>
</ResponsiveContainer>
```

**空状态**:
```tsx
// 无数据时显示空状态
{data.length === 0 ? (
  <div className="flex items-center justify-center h-[200px]">
    <div className="text-center text-muted-foreground">
      <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-50" />
      <p>暂无数据</p>
    </div>
  </div>
) : (
  <LineChart data={data}>{/* ... */}</LineChart>
)}
```

**加载状态**:
```tsx
// 加载时显示骨架屏
{isLoading ? (
  <Skeleton className="w-full h-[200px] rounded-lg" />
) : (
  <LineChart data={data}>{/* ... */}</LineChart>
)}
```

**深色模式**:
- 所有颜色使用 CSS 变量，自动适配深色模式
- 图表背景透明
- 网格线颜色跟随主题

---

## 4.2 业务组件清单

### 项目管理组件 (33个)

**核心容器**:
- ProjectManagerOptimized.tsx (460行)
- ProjectListView.tsx

**表单组件**:
- ProjectForm.tsx
- ProjectMemberSelector.tsx

**视图组件**:
- MultiTimelineView.tsx (430行)
- ProjectCard.tsx
- ProjectList.tsx

**时间线组件**:
- TimelineItem.tsx
- TimelineTaskBar.tsx
- TimelineRuler.tsx
- TimelineContextMenu.tsx

**里程碑组件**:
- ProjectMilestones.tsx
- MilestonesTab.tsx
- TimeNodeEditor.tsx

### 任务管理组件 (8个)

**核心容器**:
- TaskManagement.tsx (1272行)
- WbsTaskTable.tsx (2554行) ⚠️ 需拆分

**表格组件**:
- WbsTaskRow.tsx
- WbsTaskFilters.tsx

### 仪表板组件 (8个)

- EngineerDashboard.tsx
- EngineerDashboardV2.tsx
- StatsCard.tsx
- ProjectOverview.tsx
- TaskStats.tsx
- TaskAlerts.tsx

### 设置管理组件 (9个)

- SettingsPage.tsx
- UserManagement.tsx
- TaskTypesManager.tsx
- HolidayManagement.tsx
- PermissionManagement.tsx
- SystemLogs.tsx
- OrganizationSettings.tsx

---

## 4.3 WBS表格组件规范

> **列数说明**: WBS表格包含24个数据列 + 1个操作列，共25列。

### 24列字段规格

| 列号 | 名称 | 可编辑 | 说明 |
|------|------|--------|------|
| 0 | 操作按钮 | - | 快捷操作列 |
| 1 | WBS等级 | ✅ | 1-10级 |
| 2 | WBS编码 | ❌ | 自动生成 |
| 3 | 任务描述 | ✅ | 必填 |
| 4 | 任务状态 | ❌ | 自动判断 |
| 5 | Redmine链接 | ✅ | 仅根任务 |
| 6 | 负责人 | ✅ | 下拉选择 |
| 7 | 任务类型 | ✅ | 下拉选择 |
| 8 | 优先级 | ✅ | 紧急/高/中/低 |
| 9 | 前置任务 | ✅ | WBS编号 |
| 10 | 提前/落后 | ✅ | 天数 |
| 11 | 开始日期 | ✅* | 有前置时计算 |
| 12 | 工期 | ✅ | 天数 + 单休勾选框 |
| 13 | 结束日期 | ❌ | 自动计算 |
| 14 | 计划周期 | ❌ | 自动计算 |
| 15 | 预警天数 | ✅ | 默认3天 |
| 16 | 实际开始 | ✅ | 日期选择 |
| 17 | 实际结束 | ✅ | 日期选择 |
| 18 | 实际工期 | ❌ | 自动计算 |
| 19 | 全职比 | ✅ | 0-100% |
| 20 | 实际周期 | ❌ | 自动计算 |
| 21 | 项目 | ✅ | 下拉选择 |
| 22 | 延期次数 | ❌ | 点击查看 |
| 23 | 计划调整 | ❌ | 点击查看 |
| 24 | 进展记录 | ❌ | 点击查看 |

### 列视觉区分

**设计原则**：低饱和度、微妙对比、高级感

#### 颜色变量定义

```css
/* 浅色主题 */
--editable-border: 210 15% 55%;   /* 低饱和蓝灰边框 */
--editable-bg: 210 10% 98%;       /* 极轻微蓝调背景 */
--readonly-border: 0 0% 75%;      /* 淡灰边框 */

/* 深色主题 */
--editable-border: 210 20% 50%;   /* 低饱和蓝灰边框 */
--editable-bg: 210 15% 15%;       /* 极轻微蓝调背景 */
--readonly-border: 0 0% 35%;      /* 暗灰边框 */
```

#### 列分类

| 可编辑列（微蓝灰边框） | 只读列（淡灰边框） |
|----------------------|-------------------|
| WBS等级、任务描述、负责人、任务类型、优先级、前置任务、提前/落后、开始日期、工期、预警天数、实际开始、实际结束、全职比、项目、Redmine链接 | WBS编码、任务状态、结束日期、计划周期、实际工期、实际周期、延期次数、计划调整、进展记录 |

#### 样式规范

| 元素 | 可编辑列 | 只读列 |
|------|---------|--------|
| 左边框 | 3px solid `hsl(var(--editable-border))` | 3px solid `hsl(var(--readonly-border))` |
| 背景 | `hsl(var(--editable-bg))` | 默认背景（无区分） |
| 表头下边框 | 3px solid `hsl(var(--editable-border))` | 3px solid `hsl(var(--readonly-border))` |

### 列显示/隐藏

- 默认显示: 操作、WBS编码、任务描述、负责人、状态、结束日期、延期次数、计划调整、进展记录
- 可折叠列: 其他列可单独隐藏/显示
- 保存偏好: 用户列配置保存到 localStorage

### 树形结构

- 支持最多 10 级嵌套
- 展开图标: ▶ 折叠 / ▼ 展开
- 子任务缩进: 24px/级

---

# 第五部分：模块UI需求

## 5.0 登录界面

> **新增** - 2026-03-16
> **需求来源**: FINAL_REQUIREMENTS_0315-0130.md 第三部分 3.1 认证系统

> **设计原则**: 简洁、安全、专业

### 5.0.1 页面布局

```
┌─────────────────────────────────────────────────────────────┐
│                        嬢 欢迎使用                       │
│                      [Logo + 系统名称]                       │
├─────────────────────────────────────────────────────────────┤
│                                                         │
│         ┌─────────────────────────────────┐              │
│         │  用户名                              │              │
│         │  ┌─────────────────────────────┐              │
│         │  │ 密码                               │              │
│         │  └─────────────────────────────┘              │
│         │                                 │              │
│         │  □ 记住我                             │              │
│         │                                 │              │
│         │     ┌─────────────────────┐           │
│         │     │       登  录            │           │
│         │     └─────────────────────┘           │
│         │                                 │              │
│         │    [忘记密码?]                          │              │
│         │                                 │              │
└─────────────────────────────────────────────────────────────┘
```

### 5.0.2 页面规格
| 元素 | 规范 |
|------|------|
| 整体宽度 | 100vw max-w-md (448px) |
| 卡片样式 | Card组件，居中显示 |
| 卡片阴影 | shadow-lg |
| 卡片圆角 | rounded-xl (12px) |
| Logo尺寸 | w-12 h-12 (48px) |
| 系统名称 | text-xl font-bold |
| 标题文字 | "欢迎使用" 或 "登录" |

### 5.0.3 表单字段
| 字段 | 类型 | 规范 |
|------|------|------|
| 用户名 | 文本输入 | 必填，placeholder: "请输入用户名" |
| 密码 | 密码输入 | 必填，placeholder: "请输入密码" |
| 记住我 | 复选框 | 可选，label: "记住我 7天" |

### 5.0.4 错误提示样式
| 场景 | 提示内容 | 样式 |
|------|------|------|
| 用户名/密码错误 | "用户名或密码错误" | text-destructive, 红色文字 |
| 账户锁定 | "账户已锁定，请X分钟后再试" | text-destructive, 红色文字 + 锁定图标 |
| 限流警告 | "登录尝试次数过多，您还有X次机会" | text-orange-500, 橙色文字 |
| 网络错误 | "网络连接失败，请稍后重试" | text-muted-foreground, 灰色文字 |

### 5.0.5 登录按钮
| 状态 | 样式 |
|------|------|
| 默认 | variant=default, 全宽 |
| 加载中 | disabled + Loader2动画 |
| 成功 | 自动跳转到首页 |

### 5.0.6 安全特性
- **限流**: 15分钟内最多5次尝试
- **锁定**: 5次失败后锁定30分钟
- **Session**: 7天有效期（勾选"记住我"）
- **密码**: bcrypt 10轮加密

---

## 5.1 项目管理模块

### 项目列表展示

| 决策项 | 最终决策 |
|--------|----------|
| 展示方式 | 卡片网格视图 |
| 响应式 | grid-cols-1 → grid-cols-3 |

### 项目卡片信息

```html
<div class="card">
  <!-- 标签区 -->
  <div class="flex justify-between">
    <Badge variant="outline">{project.code}</Badge>
    <Badge>{project.status}</Badge>
  </div>

  <!-- 标题 -->
  <h3 class="text-lg font-semibold mt-2">{project.name}</h3>

  <!-- 描述 -->
  <p class="text-muted-foreground text-sm mt-1 line-clamp-2">
    {project.description}
  </p>

  <!-- 进度条 -->
  <Progress value={project.progress} class="mt-3" />

  <!-- 底部信息 -->
  <div class="flex justify-between items-center mt-3">
    <AvatarGroup members={project.members} max={5} />
    <div class="text-sm text-muted-foreground">
      {project.endDate}
    </div>
  </div>
</div>
```

### 项目表单布局

- **方式**: 分组表单
- **对话框**: 模态对话框
- **分组**:
  - 基本信息（编码、名称、类型、描述）
  - 时间规划（开始日期、结束日期）
  - 成员管理（多选成员）
  - 里程碑（动态增减）

### 里程碑管理界面 新增

> **入口**: 项目详情页 → 里程碑Tab
> **需求来源**: FINAL_REQUIREMENTS 模块#1 里程碑管理

#### 里程碑Tab布局
```
┌─────────────────────────────────────────────────────────────────────────────┐
│  项目详情页                                                                 │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │ [基本信息] [成员] [里程碑] [时间线] [WBS任务]                          │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────────────────┤
│  里程碑列表                                              [添加里程碑]    │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │ ● 需求确认              2024-03-15        100%    ✅ 已达成   [编辑] [删除]│ │
│  │ ○ 设计评审              2024-03-20        80%     🟡 进行中  [编辑] [删除]│ │
│  │ ○ 开发完成              2024-04-01        0%      ⚪ 待处理  [编辑] [删除]│ │
│  └────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### 里程碑列表表格
| 列名 | 宽度 | 说明 |
|------|------|------|
| 状态图标 | w-12 | ●已达成 / ○进行中 / ○待处理 |
| 名称 | flex | 里程碑名称，可点击编辑 |
| 目标日期 | w-32 | YYYY-MM-DD格式 |
| 完成百分比 | w-24 | 进度条 + 百分比数字 |
| 状态 | w-24 | Badge: 已达成(绿)/进行中(蓝)/待处理(灰)/已逾期(红) |
| 操作 | w-24 | 编辑/删除按钮 |

#### 里程碑状态定义
| 状态 | 图标 | 颜色 | 条件 |
|------|------|------|------|
| 待处理 | ○ | 灰色 | completion_percentage = 0 |
| 进行中 | ○ | 蓝色 | 0 < completion_percentage < 100 |
| 已达成 | ● | 绿色 | completion_percentage = 100 |
| 已逾期 | ○ | 红色 | 目标日期 < 今天 且 completion_percentage < 100 |

#### 添加/编辑里程碑对话框
```
┌─────────────────────────────────────────────────────┐
│ 添加里程碑                                      [×] │
├─────────────────────────────────────────────────────┤
│                                                     │
│  里程碑名称 *                                       │
│  ┌─────────────────────────────────────────────────┐ │
│  │ 请输入里程碑名称                                 │ │
│  └─────────────────────────────────────────────────┘ │
│                                                     │
│  目标日期 *                                         │
│  ┌─────────────────────────────────────────────────┐ │
│  │ 📅 选择日期                                     │ │
│  └─────────────────────────────────────────────────┘ │
│                                                     │
│  描述                                               │
│  ┌─────────────────────────────────────────────────┐ │
│  │ 可选，输入里程碑描述                             │ │
│  └─────────────────────────────────────────────────┘ │
│                                                     │
│  完成百分比                                          │
│  ┌─────────────────────────────────────────────────┐ │
│  │ ████████████░░░░░░░░░░░░░░░░░░░░  50%          │ │
│  └─────────────────────────────────────────────────┘ │
│                                                     │
│                              [取消]  [保存]        │
└─────────────────────────────────────────────────────┘
```
| 元素 | 规范 |
|------|------|
| 对话框宽度 | max-w-md (448px) |
| 里程碑名称 | 必填，最大100字符 |
| 目标日期 | 必填，日期选择器 |
| 描述 | 可选，多行文本，最大200字符 |
| 完成百分比 | 滑块，0-100，默认0 |

#### 删除里程碑确认
```
┌─────────────────────────────────────────────────────┐
│ ⚠️ 确认删除                                        │
│                                                     │
│ 确定要删除里程碑 "[里程碑名称]" 吗？               │
│                                                     │
│ 此操作无法撤销。                                   │
│                                                     │
│                              [取消]  [确认删除]   │
└─────────────────────────────────────────────────────┘
```

---

## 5.2 任务管理模块

### 整体布局

| 决策项 | 最终决策 |
|--------|----------|
| 整体布局 | 垂直堆叠 |
| 表格样式 | 标准表格 |
| 筛选器位置 | 行内筛选 |
| 批量操作 | 不支持 |

### 任务筛选器

```html
<div class="flex gap-2 items-center">
  <Input placeholder="搜索任务..." class="w-64" />
  <Select placeholder="项目">
    <option>全部项目</option>
    <option>智能管理平台</option>
    <option>移动端APP</option>
  </Select>
  <Select placeholder="负责人">
    <option>全部人员</option>
    ...
  </Select>
  <Select placeholder="状态">
    <option>全部状态</option>
    <option>未开始</option>
    <option>进行中</option>
    <option>延期预警</option>
    <option>已延迟</option>
    <option>提前完成</option>
    <option>按时完成</option>
    <option>超期完成</option>
    <option>待审批</option>
    <option>已驳回</option>
  </Select>
  <Select placeholder="优先级">
    <option>全部</option>
    <option>紧急</option>
    <option>高</option>
    <option>中</option>
    <option>低</option>
  </Select>
  <Button variant="ghost">清除筛选</Button>
</div>
```

#### 状态选项与颜色对照表（9种状态）更新

| 状态 | 颜色 | 说明 |
|------|------|------|
| 待审批 | 紫色 | 计划变更申请等待审批 |
| 已驳回 | 红色 | 计划变更申请被驳回 |
| 未开始 | 灰色 | 任务尚未开始 |
| 进行中 | 蓝色 | 任务正在进行 |
| **提前完成** | 绿色 | 实际完成日期 < 计划结束日期 |
| **按时完成** | 青色 | 实际完成日期 = 计划结束日期 |
| **延期预警** | 橙色 | 剩余天数 ≤ 预警天数，即将延期 |
| **已延迟** | 红色 | 超过计划结束日期仍未完成 |
| **超期完成** | 橙色 | 实际完成日期 > 计划结束日期 |

#### 状态颜色CSS变量

```css
/* 9种状态颜色 */
.status-pending { background: hsl(280 60% 50% / 0.2); color: hsl(280 60% 70%); } /* 待审批 - 紫色 */
.status-rejected { background: hsl(0 84% 60% / 0.2); color: hsl(0 84% 70%); } /* 已驳回 - 红色 */
.status-not-started { background: hsl(0 0% 60% / 0.2); color: hsl(0 0% 40%); } /* 未开始 - 灰色 */
.status-in-progress { background: hsl(211 98% 52% / 0.2); color: hsl(211 98% 72%); } /* 进行中 - 蓝色 */
.status-early-done { background: hsl(142 76% 36% / 0.2); color: hsl(142 76% 50%); } /* 提前完成 - 绿色 */
.status-on-time { background: hsl(180 70% 40% / 0.2); color: hsl(180 70% 55%); } /* 按时完成 - 青色 */
.status-warning { background: hsl(25 95% 53% / 0.2); color: hsl(25 95% 70%); } /* 延期预警 - 橙色 */
.status-delayed { background: hsl(0 84% 60% / 0.2); color: hsl(0 84% 70%); } /* 已延迟 - 红色 */
.status-overdue-done { background: hsl(25 95% 53% / 0.2); color: hsl(25 95% 70%); } /* 超期完成 - 橙色 */
```

### WBS任务表单

| 决策项 | 最终决策 |
|--------|----------|
| 对话框尺寸 | 中等宽度 (max-w-lg) |
| 字段布局 | 混合布局 |
| 日期选择 | 原生日期选择器 |
| 优先级选择 | 按钮组 |
| 新建/编辑表单 | 统一表单 |
| 关闭确认 | 直接关闭（不提示） |

---

## 5.3 设置模块

### 导航层级说明 更新

**第一层 - 侧边栏导航**:
- 点击侧边栏的"设置"菜单项进入设置页面

**第二层 - 内容区顶部Tab导航**:
- 进入设置页面后，通过顶部Tab切换不同设置类别
- Tab顺序：个人资料 | 用户管理 | 组织管理 | 权限管理 | 任务类型 | 能力模型 | 节假日 | 系统日志

**导航结构图**:
```
侧边栏 → 设置（进入设置页面）
              ↓
         内容区顶部Tab
              ↓
    ┌───────────────────────────────────────────────────────────────────────┐
    │ [个人资料] [用户管理] [组织管理] [权限管理] [任务类型] [能力模型] ...│
    └───────────────────────────────────────────────────────────────────────┘
```

### 设置表单布局

| 决策项 | 最终决策 |
|--------|----------|
| 表单布局 | 卡片分组 |
| 标签位置 | 标签在上 |
| 保存方式 | 保存 + 取消按钮 |

### 用户管理界面 新增

> **入口**: 设置 → 用户管理Tab

#### 用户列表页面

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  [搜索框...]  [部门筛选▼] [状态筛选▼]              [添加用户] [批量操作▼] │
├─────────────────────────────────────────────────────────────────────────────┤
│  用户列表（表格）                                                         │
│  ┌────────┬────────┬────────┬────────┬────────┬────────┬────────┬────────┐│
│  │ 姓名    │ 工号    │ 邮箱    │ 部门    │ 角色    │ 状态    │ 操作   ││
│  ├────────┼────────┼────────┼────────┼────────┼────────┼────────┤│
│  │ 张三    │ EMP001 │ zhang@  │ 技术部  │ 工程师  │ 🟢 激活 │ [编辑][重置] ││
│  │ 李四    │ EMP002 │ li@     │ 产品部  │ 部门经理│ 🟢 激活 │ [编辑][重置] ││
│  │ 王五    │ EMP003 │ wang@   │ 技术部  │ 技术经理│ 🔴 禁用 │ [编辑][启用] ││
│  └────────┴────────┴────────┴────────┴────────┴────────┴────────┘│
└─────────────────────────────────────────────────────────────────────────────┘
```

| 元素 | 规范 |
|------|------|
| 搜索框 | 支持姓名/工号/邮箱搜索，w-64 |
| 部门筛选 | 下拉选择，支持树形结构 |
| 状态筛选 | 激活/禁用 |
| 添加用户按钮 | variant=default，右上角 |
| 表格列 | 姓名、工号、邮箱、部门、角色、状态、操作 |
| 状态显示 | Badge组件，激活=绿色，禁用=灰色 |
| 操作按钮 | 编辑（图标）、重置密码（图标）、启用/禁用（开关） |

#### 创建/编辑用户对话框

```
┌─────────────────────────────────────────────────────┐
│ 添加用户                                        [×] │
├─────────────────────────────────────────────────────┤
│                                                     │
│  姓名 *                                            │
│  ┌─────────────────────────────────────────────────┐ │
│  │ 请输入姓名                                      │ │
│  └─────────────────────────────────────────────────┘ │
│                                                     │
│  工号 *          [自动生成 □]                        │
│  ┌─────────────────────────────────────────────────┐ │
│  │ EMP004（自动生成或手动输入）                      │ │
│  └─────────────────────────────────────────────────┘ │
│                                                     │
│  邮箱 *                                            │
│  ┌─────────────────────────────────────────────────┐ │
│  │ 请输入邮箱                                      │ │
│  └─────────────────────────────────────────────────┘ │
│                                                     │
│  手机号                                             │
│  ┌─────────────────────────────────────────────────┐ │
│  │ 请输入手机号                                    │ │
│  └─────────────────────────────────────────────────┘ │
│                                                     │
│  部门 *          直属主管 *                          │
│  [技术部    ▼]    [张三        ▼]                        │
│                                                     │
│  角色 *                                             │
│  ☑ 系统管理员  ☑ 部门经理  ☑ 技术经理  ☑ 工程师    │
│                                                     │
│  初始密码 *                                         │
│  ┌─────────────────────────────────────────────────┐ │
│  │ ••••••••              [📋 复制]  [👁 显示]       │ │
│  └─────────────────────────────────────────────────┘ │
│  ☑ 系统自动生成随机密码                              │
│                                                     │
│                              [取消]  [保存]            │
└─────────────────────────────────────────────────────┘
```

| 元素 | 规范 |
|------|------|
| 对话框宽度 | max-w-lg (512px) |
| 姓名 | 必填，最大50字符 |
| 工号 | 必填，可自动生成或手动输入 |
| 邮箱 | 必填，邮箱格式验证 |
| 手机号 | 选填，手机号格式验证 |
| 部门 | 必填，下拉选择（树形） |
| 直属主管 | 选填，下拉选择（根据部门筛选） |
| 角色 | 必填，多选复选框 |
| 初始密码 | 必填，支持显示/隐藏切换 |
| 密码复制按钮 | 点击复制密码到剪贴板，按钮图标变为✓并显示"已复制"提示（1.5秒后恢复） |
| 自动生成密码 | 勾选后自动生成8位随机密码 |

#### 密码重置对话框

```
┌─────────────────────────────────────────────────────┐
│ 重置密码                                          [×] │
├─────────────────────────────────────────────────────┤
│                                                     │
│  确定要重置用户 [张三] 的密码吗？                     │
│                                                     │
│  新密码 *                                           │
│  ┌─────────────────────────────────────────────────┐ │
│  │ ••••••••              [📋 复制]  [👁 显示]       │ │
│  └─────────────────────────────────────────────────┘ │
│  ☑ 自动生成随机密码                                │
│                                                     │
│  ⚠️ 重置后用户需要使用新密码登录                      │
│                                                     │
│                              [取消]  [确认重置]      │
└─────────────────────────────────────────────────────┘
```

| 元素 | 规范 |
|------|------|
| 对话框宽度 | max-w-sm (384px) |
| 新密码 | 必填，8位以上 |
| 密码复制按钮 | 点击复制密码到剪贴板，按钮图标变为✓并显示"已复制"提示（1.5秒后恢复） |
| 警告提示 | 黄色背景提示框 |

#### 用户状态切换

| 操作 | 确认对话框 | 结果 |
|------|-----------|------|
| 禁用用户 | "确定要禁用用户 [姓名] 吗？禁用后该用户将无法登录系统。" | 状态变为"禁用"，Badge变灰色 |
| 启用用户 | "确定要启用用户 [姓名] 吗？" | 状态变为"激活"，Badge变绿色 |

### 节假日管理 新增详细设计

> **入口**: 设置 → 节假日Tab

#### 节假日管理界面
```
┌─────────────────────────────────────────────────────────────────────────────┐
│  年份选择: [2024 ▼]                               [添加节假日] [批量设置]    │
├─────────────────────────────────────────────────────────────────────────────┤
│  日历视图（月历）                                                           │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │  一   二   三   四   五   六   日                                        ││
│  │                                                                         ││
│  │  1    2    3    4    5  🟢6   🟢7   (🟢=休息日，高亮显示)               ││
│  │  8    9   10   11   12 🟢13  🟢14                                       ││
│  │ 15   16   17   18   19 🟢20  🟢21                                       ││
│  │ 22   23   24   25   26 🟢27  🟢28                                       ││
│  │ 29   30   31                                                            ││
│  └─────────────────────────────────────────────────────────────────────────┘│
├─────────────────────────────────────────────────────────────────────────────┤
│  节假日列表                                                                 │
│  ┌────────────┬──────────────────────┬────────────┬────────┐              │
│  │ 日期       │ 名称                 │ 类型       │ 操作   │              │
│  ├────────────┼──────────────────────┼────────────┼────────┤              │
│  │ 2024-01-01 │ 元旦                 │ 法定假日   │ [编辑] │              │
│  │ 2024-02-10 │ 春节                 │ 法定假日   │ [编辑] │              │
│  │ 2024-02-15 │ 公司成立日           │ 公司假日   │ [编辑] │              │
│  └────────────┴──────────────────────┴────────────┴────────┘              │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### 日历视图规范
| 元素 | 规范 |
|------|------|
| 默认视图 | 当前月份 |
| 休息日样式 | bg-muted, 🟢绿色圆点标识 |
| 节假日样式 | bg-red-100, 红色文字 |
| 今天标识 | border-2 border-primary |
| 点击日期 | 打开"添加节假日"对话框 |

#### 节假日类型
| 类型 | 颜色 | 说明 |
|------|------|------|
| 法定假日 | 红色Badge | 国家法定节假日 |
| 公司假日 | 橙色Badge | 公司特定假期 |
| 调休工作日 | 蓝色Badge | 周末调休上班 |

#### 添加节假日对话框
```
┌─────────────────────────────────────────────────────┐
│ 添加节假日                                      [×] │
├─────────────────────────────────────────────────────┤
│                                                     │
│  日期 *                                             │
│  ┌─────────────────────────────────────────────────┐ │
│  │ 📅 选择日期                                     │ │
│  └─────────────────────────────────────────────────┘ │
│                                                     │
│  名称 *                                             │
│  ┌─────────────────────────────────────────────────┐ │
│  │ 如：春节、国庆节                                 │ │
│  └─────────────────────────────────────────────────┘ │
│                                                     │
│  类型 *                                             │
│  ◉ 法定假日  ○ 公司假日  ○ 调休工作日              │
│                                                     │
│                              [取消]  [保存]        │
└─────────────────────────────────────────────────────┘
```

#### 批量设置功能
| 功能 | 说明 |
|------|------|
| 设置周末 | 批量将周六/周日设为休息日 |
| 清除设置 | 清除指定日期范围的休息日设置 |
| 复制年度 | 复制上一年度的节假日到当前年度 |

### 任务类型管理 新增详细设计

> **入口**: 设置 → 任务类型Tab

#### 任务类型列表
```
┌─────────────────────────────────────────────────────────────────────────────┐
│  任务类型管理                                        [添加任务类型]          │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌────────────┬──────────────┬──────────────────────┬────────────────┬─────┐│
│  │ 名称       │ 编码         │ 关联能力模型         │ 描述          │操作 ││
│  ├────────────┼──────────────┼──────────────────────┼────────────────┼─────┤│
│  │ 固件       │ firmware     │ 嵌入式开发能力       │ 固件开发任务  │[编辑]││
│  │ 板卡       │ board        │ 嵌入式开发能力       │ 板卡硬件任务  │[编辑]││
│  │ 驱动       │ driver       │ 嵌入式开发能力       │ 驱动程序任务  │[编辑]││
│  │ 系统设计   │ sys_design   │ 系统设计能力         │ 系统设计任务  │[编辑]││
│  │ 职能任务   │ func_task    │ 通用能力             │ 职能类任务    │[编辑]││
│  └────────────┴──────────────┴──────────────────────┴────────────────┴─────┘│
└─────────────────────────────────────────────────────────────────────────────┘
```

#### 添加/编辑任务类型对话框
| 元素 | 规范 |
|------|------|
| 类型名称 | 必填，最大50字符 |
| 类型编码 | 必填，唯一，只允许字母和下划线 |
| 关联能力模型 | 多选下拉框，可选 |
| 描述 | 可选，最大200字符 |

### 项目类型管理 新增详细设计

> **入口**: 设置 → 项目类型Tab（与任务类型在同一Tab下的子Tab）

#### 项目类型列表
| 列名 | 说明 |
|------|------|
| 名称 | 产品开发、职能管理、物料改代、质量处理 |
| 编码 | product_dev, func_mgmt, material_sub, quality_handle |
| 描述 | 类型说明 |

### 工号规则配置 新增

> **入口**: 设置 → 系统配置Tab

#### 工号规则配置界面
```
┌─────────────────────────────────────────────────────────────────────────────┐
│  工号规则配置                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │ 前缀: [EMP     ]  起始序号: [001  ]  序号位数: [3 ▼]               ││
│  │                                                                         ││
│  │ 预览: EMP001, EMP002, EMP003...                                         ││
│  │                                                                         ││
│  │ 说明: 新用户创建时自动生成工号，格式为"前缀+补零后的序号"            ││
│  │                                                                         ││
│  │                                                          [保存]         ││
│  └─────────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────────┘
```

| 元素 | 规范 |
|------|------|
| 前缀 | 必填，2-10个字母 |
| 起始序号 | 必填，默认001 |
| 序号位数 | 1-6位，默认3位 |
| 预览 | 实时显示前3个工号示例 |

---

## 5.4 仪表板模块

### 统计卡片

| 决策项 | 最终决策 |
|--------|----------|
| 样式 | 极简数字（去除图标） |
| 数量 | 4个卡片 |
| 布局 | grid-cols-4 |

### 图表区域

- **决策**: 多个小图表
- **状态**: 需新增
- **图表类型**: 任务趋势（折线图）、项目进度分布（饼图）

### 紧急任务提醒

- **样式**: 独立警告卡片
- **颜色**: 红色边框 + 浅红背景
- **内容**: 显示紧急任务数量 + 快速跳转

---

## 5.4.1 报表分析模块 新增

> **入口**: 侧边栏"报表分析"菜单项
> **需求来源**: FINAL_REQUIREMENTS 模块#18

> **报表类型**: 4种（项目进度、任务统计、延期分析、成员任务分析）

#### 报表入口位置
- 侧边栏独立菜单项"报表分析"
- 进入后默认显示"项目进度报表"

#### 报表Tab导航
```
┌───────────────────────────────────────────────────────────────────────┐
│ [项目进度报表] [任务统计报表] [延期分析报表] [成员任务分析] │
└───────────────────────────────────────────────────────────────────────┘
```

#### 报表通用布局
```
┌─────────────────────────────────────────────────────────────────────────────┐
│  筛选区域                                                               │
│  [项目筛选▼] [时间范围▼] [负责人▼]              [刷新] [📤 导出Excel]   │
├─────────────────────────────────────────────────────────────────────────────┤
│  统计卡片区域（4个）                                                     │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐                     │
│  │ 统计项1  │ │ 统计项2  │ │ 统计项3  │ │ 统计项4  │                     │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘                     │
├─────────────────────────────────────────────────────────────────────────────┤
│  图表区域                                                               │
│  ┌────────────────────────────────┐ ┌────────────────────────────────┐    │
│  │ 图表1（左）                    │ │ 图表2（右）                    │    │
│  └────────────────────────────────┘ └────────────────────────────────┘    │
├─────────────────────────────────────────────────────────────────────────────┤
│  数据表格区域                                                           │
│  ┌────────┬────────┬────────┬────────┬────────┬────────┐                │
│  │ 列1    │ 列2    │ 列3    │ 列4    │ 列5    │ 列6   │                │
│  ├────────┼────────┼────────┼────────┼────────┼────────┤                │
│  │ 数据   │ 数据   │ 数据   │ 数据   │ 数据   │ 数据   │                │
│  └────────┴────────┴────────┴────────┴────────┴────────┘                │
└─────────────────────────────────────────────────────────────────────────────┘
```

| 元素 | 规范 |
|------|------|
| 筛选区域 | bg-muted, p-4, rounded-lg |
| 统计卡片 | grid-cols-4, 极简数字样式 |
| 图表区域 | grid-cols-2, 每个图表高度300px |
| 数据表格 | DataTable组件, 支持排序 |

#### 项目进度报表
| 元素 | 内容 |
|------|------|
| 筛选条件 | 项目选择（单选/全部）、时间范围 |
| 统计卡片 | 总体进度%、已完成任务数、进行中任务数、里程碑完成数 |
| 图表1 | 进度趋势折线图（按周/月） |
| 图表2 | 任务状态分布饼图 |
| 数据表格 | 里程碑列表（名称、目标日期、完成百分比、状态） |
| 导出内容 | 项目基本信息 + 统计数据 + 里程碑数据 |

#### 任务统计报表
| 元素 | 内容 |
|------|------|
| 筛选条件 | 项目、时间范围、负责人 |
| 统计卡片 | 任务总数、平均完成率、延期率、紧急任务数 |
| 图表1 | 优先级分布柱状图 |
| 图表2 | 负责人任务分布饼图 |
| 数据表格 | 任务统计明细（负责人、总任务数、完成数、延期数、完成率） |
| 导出内容 | 任务统计汇总 + 明细数据 |

#### 延期分析报表
| 元素 | 内容 |
|------|------|
| 筛选条件 | 项目、时间范围、延期类型（延期预警/已延迟/超期完成） |
| 统计卡片 | 延期任务总数、延期预警数、已延迟数、超期完成数 |
| 图表1 | 延期原因分类统计柱状图 |
| 图表2 | 延期趋势折线图（按周/月） |
| 数据表格 | 延期任务列表（任务名称、负责人、延期天数、延期原因、状态） |
| 导出内容 | 延期统计 + 延期任务明细 |

#### 成员任务分析报表
| 元素 | 内容 |
|------|------|
| 筛选条件 | 成员选择（单选/全部对比）、时间范围 |
| 统计卡片 | 当前任务数、全职比总和、平均完成率、能力匹配度 |
| 图表1 | 成员任务负载柱状图 |
| 图表2 | 任务完成趋势折线图 |
| 数据表格 | 成员任务明细（任务名称、项目、状态、进度、全职比） |
| 能力展示 | 能力模型得分（格式：`模型名: 维度1:分数 | 维度2:分数`） |
| 导出内容 | 成员统计 + 任务明细 + 能力数据 |

#### 导出Excel功能
| 元素 | 规范 |
|------|------|
| 按钮位置 | 筛选区域右侧 |
| 按钮样式 | variant=default, 包含Excel图标 |
| 导出内容 | 当前筛选条件下的所有数据 |
| 文件命名 | `[报表类型]_[日期].xlsx` |

---

## 5.5 审批流程模块 新增

### 页面布局

| 布局项 | 规范 |
|--------|------|
| 整体结构 | 侧边导航 → 审批列表页面 |
| 宽度 | 全宽布局 |
| 内边距 | p-6 (24px) |

### 多标签布局

| Tab名称 | 徽章样式 | 说明 |
|---------|----------|------|
| 待审批 | 红色徽章显示数量 | 显示待处理审批数量 |
| 我的审批 | 无徽章 | 当前用户已处理的审批 |
| 我发起的 | 无徽章 | 当前用户发起的审批申请 |
| 已完成 | 无徽章 | 已完成的审批记录 |

### 审批项卡片

| 字段 | 布局 | 样式 |
|------|------|------|
| 任务名称 | 卡片标题 | font-semibold, text-base |
| 申请人信息 | 标题下方 | text-muted-foreground |
| 申请时间 | 标题下方 | text-sm |
| 变更原因 | 独立行 | bg-muted, p-2, rounded |
| 变更前后对比 | 可展开/收起 | Accordion组件 |
| 操作按钮 | 右侧固定 | 通过/驳回按钮组 |

### 变更详情对话框

| 对话框元素 | 规范 |
|------------|------|
| 布局 | 左右对比布局（变更前 | 变更后） |
| 差异高亮 | 变更部分使用黄色背景高亮 |
| 驳回原因输入 | 驳回时必填，多行文本框 |
| 宽度 | max-w-2xl |
| 按钮 | 取消 | 确认通过 | 确认驳回 |

### 超时处理

| 超时状态 | 视觉效果 |
|----------|----------|
| 超过7天 | 卡片左侧红色边框 (border-l-4 border-l-destructive) |
| 超时标签 | 显示"已超时X天"标签 (Badge variant=destructive) |
| 排序优先 | 超时审批自动置顶 |

### 批量审批

| 元素 | 规范 |
|------|------|
| 全选复选框 | 卡片左上角 |
| 批量操作栏 | 固定底栏，选中后显示 |
| 批量通过按钮 | variant=default |
| 批量驳回按钮 | variant=destructive |

---

## 5.6 能力模型管理模块 重构 (2026-03-15)

> **UI决策状态**: ✅ 7/7 已确认（brainstorming流程）
> **设计原则**: 两级结构（模型→维度），成员可多次关联同一模型

### 5.6.1 UI决策汇总表

| # | 决策点 | 最终选择 | 说明 |
|---|--------|----------|------|
| 1 | 配置入口位置 | **分离式** | 模型配置在设置中，成员评估在成员管理中 |
| 2 | 层级结构 | **两级结构** | 模型→维度，保持简单便于快速迭代 |
| 3 | 成员关联模型 | **可以多次** | 通过association_label区分工作方向 |
| 4 | 维度字段设计 | **简化版** | 名称、权重(%)、0-100分 |
| 5 | 任务分配建议 | **手动触发** | 点击"智能推荐"按钮显示推荐列表 |
| 6 | 报表能力展示 | **分维度展示** | 列表展示各维度得分 |
| 7 | 雷达图交互 | **点击展开** | 点击成员节点后展开显示雷达图 |

### 5.6.2 模块A：能力模型配置界面

**入口位置**: 设置 → 系统配置 → 能力模型

#### 模型列表页

| 元素 | 规范 |
|------|------|
| 页面布局 | 表格视图 |
| 搜索框 | 顶部搜索栏，支持模型名称搜索 |
| 添加按钮 | 右上角主按钮 "新增模型" |

**表格列定义**:

| 列名 | 宽度 | 说明 |
|------|------|------|
| 模型名称 | flex | 能力模型显示名称 |
| 维度数量 | w-24 | 该模型包含的评价维度数 |
| 创建时间 | w-32 | 格式：YYYY-MM-DD |
| 操作 | w-24 | 编辑/删除按钮 |

#### 模型编辑对话框

```
┌─────────────────────────────────────────────────────┐
│ 编辑能力模型                                    [X] │
├─────────────────────────────────────────────────────┤
│                                                     │
│ 模型名称 *                                          │
│ ┌─────────────────────────────────────────────────┐ │
│ │ 嵌入式开发能力                                   │ │
│ └─────────────────────────────────────────────────┘ │
│                                                     │
│ 模型描述                                            │
│ ┌─────────────────────────────────────────────────┐ │
│ │ 用于评估嵌入式开发人员的技术能力                 │ │
│ └─────────────────────────────────────────────────┘ │
│                                                     │
│ 评价维度 *                           权重总和: 100% │
│ ┌─────────────────────────────────────────────────┐ │
│ │ 固件开发          [35] %  [↑] [↓] [删除]        │ │
│ │ 驱动开发          [30] %  [↑] [↓] [删除]        │ │
│ │ 系统设计          [20] %  [↑] [↓] [删除]        │ │
│ │ 问题分析          [15] %  [↑] [↓] [删除]        │ │
│ │ [+ 添加维度]                                    │ │
│ └─────────────────────────────────────────────────┘ │
│ ⚠️ 权重总和必须等于100%                            │
│                                                     │
│                              [取消]  [保存]        │
└─────────────────────────────────────────────────────┘
```

| 元素 | 规范 |
|------|------|
| 模型名称 | 文本输入，最大50字符，必填 |
| 模型描述 | 多行文本，最大200字符，可选 |
| 维度列表 | 动态列表，支持添加/删除/排序 |
| 维度名称 | 文本输入，最大30字符 |
| 维度权重 | 数字输入，0-100，显示为百分比 |
| 权重总和 | 实时计算显示，不为100%时显示警告 |
| 保存按钮 | 权重总和≠100%时禁用 |

### 5.6.3 模块B：成员能力评定界面

**入口位置**: 成员管理 → 选择成员 → 能力评定Tab

#### 成员能力卡片网格

```
┌─────────────────────┐  ┌─────────────────────┐
│ 嵌入式开发能力      │  │ 质量管理能力        │
│ (固件方向)          │  │                     │
│ ─────────────────── │  │ ─────────────────── │
│ 固件开发: 85        │  │ 流程规范: 90        │
│ 驱动开发: 78        │  │ 问题分析: 85        │
│ 系统设计: 88        │  │                     │
│ 问题分析: 90        │  │ 综合分数: 88        │
│ ─────────────────── │  │                     │
│ 综合分数: 85        │  │ [编辑] [取消关联]   │
│                     │  └─────────────────────┘
│ [编辑] [取消关联]   │
└─────────────────────┘
```

| 卡片元素 | 样式 |
|----------|------|
| 模型名称 | font-semibold, text-lg |
| 关联说明 | text-muted-foreground, text-sm（区分多次关联） |
| 维度得分 | 每行一个维度：`维度名: 分数` |
| 综合分数 | font-semibold, 右对齐 |
| 操作按钮 | 编辑/取消关联 |

#### 能力评定对话框

```
┌─────────────────────────────────────────────────────┐
│ 添加能力评定                                    [X] │
├─────────────────────────────────────────────────────┤
│                                                     │
│ 选择能力模型 *                                      │
│ ┌─────────────────────────────────────────────────┐ │
│ │ 嵌入式开发能力                              [▼] │ │
│ └─────────────────────────────────────────────────┘ │
│                                                     │
│ 关联说明（可选）                                    │
│ ┌─────────────────────────────────────────────────┐ │
│ │ 固件方向（区分同一模型多次关联）                 │ │
│ └─────────────────────────────────────────────────┘ │
│                                                     │
│ 维度评分                                            │
│ ┌─────────────────────────────────────────────────┐ │
│ │ 固件开发 (35%)                                  │ │
│ │ [━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━○] 85          │ │
│ │                                                 │ │
│ │ 驱动开发 (30%)                                  │ │
│ │ [━━━━━━━━━━━━━━━━━━━━━━━━○──────────] 78        │ │
│ │                                                 │ │
│ │ 系统设计 (20%)                                  │ │
│ │ [━━━━━━━━━━━━━━━━━━━━━━━━━━━━○──────] 88        │ │
│ │                                                 │ │
│ │ 问题分析 (15%)                                  │ │
│ │ [━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━○] 90        │ │
│ └─────────────────────────────────────────────────┘ │
│                                                     │
│ 综合分数: 85                                        │
│                                                     │
│                              [取消]  [保存]        │
└─────────────────────────────────────────────────────┘
```

| 元素 | 规范 |
|------|------|
| 能力模型选择 | 下拉选择框，列出所有已配置的模型 |
| 关联说明 | 文本输入，用于区分同一模型的多次关联 |
| 维度评分 | 滑块+数字输入，范围0-100 |
| 综合分数 | 自动计算（加权平均），只读显示 |

### 5.6.4 模块C：智能推荐面板

**触发方式**: 任务编辑时点击"智能推荐"按钮

```
┌─────────────────────────────────────────────────────┐
│ 负责人                                              │
│ ┌─────────────────────────────────────────────────┐ │
│ │ 请选择...                                  [▼] │ │
│ └─────────────────────────────────────────────────┘ │
│ [🔍 智能推荐]                                       │
│                                                     │
│ ┌─ 推荐成员 ─────────────────────────────────────┐ │
│ │ ★★★★★ 张三  匹配度: 85%                   [选] │ │
│ │ ★★★★☆ 李四  匹配度: 78%                   [选] │ │
│ │ ★★★★☆ 王五  匹配度: 75%                   [选] │ │
│ └─────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

| 元素 | 规范 |
|------|------|
| 智能推荐按钮 | 次要按钮，点击后展开推荐面板 |
| 推荐面板 | 在下拉框下方展开显示 |
| 匹配度显示 | 星级（1-5星）+ 百分比数字 |
| 选择按钮 | 点击直接选中该成员 |
| 空状态 | 显示"暂无推荐，该任务类型未配置能力映射" |

### 5.6.5 模块D：报表能力展示

**位置**: 成员任务分析报表

```
┌─────────────────────────────────────────────────────┐
│ 张三                                                │
│ ├── 嵌入式开发能力: 固件开发:85 | 驱动开发:78 | 系统设计:88
│ └── 质量管理能力: 流程规范:90 | 问题分析:85        │
└─────────────────────────────────────────────────────┘
```

| 元素 | 规范 |
|------|------|
| 展示格式 | 分维度列表，用 `|` 分隔 |
| 模型名称 | font-medium |
| 维度得分 | 每个维度：`维度名:分数` |
| 维度分隔 | 竖线 `|` 分隔 |

### 5.6.6 模块E：组织架构树雷达图

**交互方式**:
- 默认状态：成员节点只显示基本信息（头像、姓名）
- 点击成员节点：展开显示能力雷达图
- 再次点击：收起雷达图

```
┌─────────────────────────────────────────┐
│ [头像] 张三                              │
│         ┌─ 雷达图 ─────────────────┐    │
│         │       固件开发           │    │
│         │          / \             │    │
│         │  问题分析 ─── 驱动开发   │    │
│         │          \ /             │    │
│         │       系统设计           │    │
│         └──────────────────────────┘    │
└─────────────────────────────────────────┘
```

| 元素 | 规范 |
|------|------|
| 图表库 | recharts（项目已有依赖） |
| 维度选择 | 超过3个维度时，显示权重最高的前3个 |
| 悬浮交互 | 鼠标悬停显示具体分数 |
| 数据来源 | 显示成员在该模型下所有评定的平均分 |
| 展开/收起 | 点击成员节点切换 |

### 5.6.7 默认数据种子

系统初始化时预置以下能力模型：

**1. 嵌入式开发能力**

| 维度 | 权重 |
|------|------|
| 固件开发 | 35% |
| 驱动开发 | 30% |
| 系统设计 | 20% |
| 问题分析 | 15% |

**2. 系统设计能力**

| 维度 | 权重 |
|------|------|
| 架构设计 | 40% |
| 接口设计 | 30% |
| 文档编写 | 30% |

**3. 通用能力**

| 维度 | 权重 |
|------|------|
| 沟通协调 | 30% |
| 问题解决 | 35% |
| 执行力 | 35% |

---

## 5.7 导入导出模块 详细确认 (2026-03-14)

> **UI决策状态**: ✅ 8/8 已确认
> **确认文件**: `demos/import-export-confirmation.html`

### 5.7.1 UI决策汇总表

| 决策点 | 最终选择 | 说明 |
|--------|----------|------|
| 文件上传方式 | **拖拽 + 点击双支持** | 灵活性强，用户体验最佳 |
| 导入进度显示 | **页面内进度条** | 不遮挡内容，可同时操作其他功能 |
| 错误处理展示 | **对话框内列表** | 立即反馈，便于修正后重试 |
| 导出选项布局 | **对话框** | 符合用户习惯，快速设置 |
| 字段选择方式 | **拖拽排序** | 可调整列顺序，灵活性强 |
| 导出格式选择 | **单选按钮** | 直观明确，快速选择 |
| 进度对话框 | **可取消** | 用户可控，防止误操作 |
| 四领域入口 | **工具栏下拉菜单** | 节省空间，入口统一 |

### 5.7.2 导入功能

#### 文件选择区域

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│              📁 拖拽文件到此处，或                    │
│                                                     │
│              [ 点击选择文件 ]                        │
│                                                     │
│         支持 .xlsx, .csv, .json 格式                │
└─────────────────────────────────────────────────────┘
```

| 元素 | 规范 |
|------|------|
| 触发方式 | 拖拽 + 点击按钮双支持 ✅ 已确认 |
| 文件类型限制 | .xlsx, .csv, .json ✅ 已确认 |
| 视觉样式 | 虚线边框 + 浅蓝背景 + 拖拽高亮 |
| 文件大小限制 | 最大10MB |

#### 导入进度显示（页面内）

```
┌─────────────────────────────────────────────────────┐
│ 导入任务数据                              65%       │
│ ████████████████████░░░░░░░░░░░░░░░░░░░             │
│ 正在导入... 13/20                                   │
│ ✅ 成功: 12  ❌ 失败: 1                              │
└─────────────────────────────────────────────────────┘

（页面其他区域仍可操作）
```

| 元素 | 规范 |
|------|------|
| 位置 | 页面内嵌进度条 ✅ 已确认 |
| 进度条 | Progress组件，显示百分比 |
| 状态文字 | "正在导入... (X/Y行)" |
| 统计信息 | 实时显示成功/失败数量 |
| 取消按钮 | 可取消导入 ✅ 已确认 |

#### 导入错误处理（对话框内列表）

```
┌─────────────────────────────────────────────────────┐
│ ❌ 导入错误                              [3个错误]  │
├─────────────────────────────────────────────────────┤
│ 行3: 项目编码重复                                   │
│ 行5: 日期格式错误                                   │
│ 行8: 成员不存在                                     │
├─────────────────────────────────────────────────────┤
│ [导出错误报告]                    [重新导入] [继续] │
└─────────────────────────────────────────────────────┘
```

| 错误类型 | 显示方式 |
|----------|----------|
| 格式错误 | 对话框内列表显示 ✅ 已确认 |
| 数据验证错误 | 显示行号 + 错误原因 |
| 用户选择 | 可选择继续导入或取消 ✅ 已确认 |

### 5.7.3 导出功能

#### 导出选项对话框

```
┌─────────────────────────────────────────────────────┐
│ 导出项目数据                                    [×] │
├─────────────────────────────────────────────────────┤
│                                                     │
│ 数据范围:  [全部项目 ▼]                             │
│                                                     │
│ 导出字段: (拖拽排序)                                │
│ ┌─────────────────────────────────────────────────┐ │
│ │ ⋮⋮ ☑ 项目名称                                   │ │
│ │ ⋮⋮ ☑ 项目编码                                   │ │
│ │ ⋮⋮ ☑ 开始日期                                   │ │
│ │ ⋮⋮ ☐ 结束日期                                   │ │
│ │ ⋮⋮ ☐ 进度                                       │ │
│ └─────────────────────────────────────────────────┘ │
│                                                     │
│ 导出格式:  ◉ Excel (.xlsx)  ○ CSV  ○ JSON          │
│                                                     │
├─────────────────────────────────────────────────────┤
│                              [取消]     [导出]      │
└─────────────────────────────────────────────────────┘
```

| 元素 | 规范 |
|------|------|
| 布局方式 | 对话框 ✅ 已确认 |
| 字段选择 | 拖拽排序 ✅ 已确认 |
| 格式选择 | 单选按钮 ✅ 已确认 |
| 格式类型 | Excel / CSV / JSON ✅ 已确认 |

#### 导出进度对话框

```
┌─────────────────────────────────────────────────────┐
│ 正在导出...                                     65% │
│ ████████████████████░░░░░░░░░░░░░░░░░░░             │
│                                                     │
│                              [取消导出]             │
└─────────────────────────────────────────────────────┘
```

| 元素 | 规范 |
|------|------|
| 进度条 | Progress组件 |
| 可取消 | ✅ 已确认 |
| 完成后行为 | 自动下载文件 |

### 5.7.4 四领域入口设计

#### 工具栏下拉菜单入口 ✅ 已确认

```
项目管理页面工具栏:
┌─────────────────────────────────────────────────────┐
│ [新建项目] [编辑] [📦 导入导出 ▼]                   │
│                          ├─ 📥 导入项目             │
│                          ├─ 📤 导出项目             │
│                          ├─ ──────────              │
│                          └─ 📄 下载模板             │
└─────────────────────────────────────────────────────┘
```

### 5.7.5 四个导入导出领域

| 领域 | 导出内容 | 导入内容 | 入口位置 |
|------|----------|----------|----------|
| 🏢 项目管理 | 项目、里程碑、项目成员 | 同上 | 项目列表页工具栏 |
| 📋 任务管理 | WBS任务、任务依赖、进度记录 | 同上 | 任务管理页工具栏 |
| 👥 组织与权限 | 部门、成员、角色权限 | 同上 | 成员管理页工具栏 |
| ⚙️ 系统管理 | 配置项、节假日、技能字典 | 同上 | 各配置页工具栏 |

### 5.7.6 模板下载

| 模板类型 | 内容 | 用途 |
|----------|------|------|
| 示例模板 ✅ | 带示例数据的模板 | 帮助用户理解字段含义 |

---

## 5.8 时间线管理模块 新增

### 5.8.1 整体布局结构

```
┌─────────────────────────────────────────────────────────────────────┐
│                         统计信息栏 (TimelineStatsBar)                 │
│  时间轴数: 3 | 任务数: 24 | 完成: 12 | 进度: 50%                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────┬──────────────────────────────────────────────────────┐│
│  │ 时间轴   │                    时间刻度 (TimelineRuler)           ││
│  │ 列表区   │   │  3/10 │ 3/11 │ 3/12 │ 3/13 │ 3/14 │ ...          ││
│  │          ├──────────────────────────────────────────────────────┤│
│  │ 📋 开发  │  ├──────────────────────┤                            ││
│  │ 🎨 设计  │      ├──────────────────────────────────┤            ││
│  │ 📝 测试  │                        ├─────────────────────┤       ││
│  │          │                                                    ││
│  │          │  （任务条 TimelineTaskBar - 可拖拽调整）            ││
│  │          │                                                    ││
│  └──────────┴──────────────────────────────────────────────────────┘│
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│                         工具栏 (TimelineToolbar)                     │
│  [-] [📅日视图 | 📆周视图 | 🗓️月视图] [+]   [添加任务] [自动排列]    │
└─────────────────────────────────────────────────────────────────────┘
```

### 5.8.2 组件清单与职责

| 组件名 | 路径 | 职责 | 行数 |
|--------|------|------|------|
| MultiTimelineView | components/projects/ | 主容器，协调所有子组件 | 430 |
| TimelineStatsBar | components/projects/ | 顶部统计信息栏 | ~50 |
| TimelineList | components/projects/ | 时间轴列表容器 | ~150 |
| TimelineTrack | components/projects/ | 单条时间轴轨道 | ~100 |
| TimelineRuler | components/projects/ | 时间刻度尺 | 156 |
| TimelineTaskBar | components/projects/ | 任务条（可拖拽） | 250 |
| TimelineToolbar | components/projects/ | 底部工具栏 | 158 |
| TimelineContextMenu | components/projects/ | 右键菜单 | 276 |

### 5.8.3 时间轴轨道 (TimelineTrack)

**布局规格**:

| 属性 | 规格值 | 说明 |
|------|--------|------|
| 轨道高度 | 44px | 单条轨道高度 |
| 任务条高度 | 28px | 任务条默认高度 |
| 任务条间距 | 8px | 多任务时的垂直间距 |
| 左侧标签宽度 | 180px (可拖动) | 时间轴名称区域，支持100-300px调整 |
| 内边距 | px-2 py-2 | 轨道内边距 |

**标签区宽度调整**:

| 属性 | 规格值 | 说明 |
|------|--------|------|
| 默认宽度 | 180px | 初始宽度 |
| 最小宽度 | 100px | 拖动下限 |
| 最大宽度 | 300px | 拖动上限 |
| 拖动边框 | 右侧边框可拖动 | cursor: col-resize |

**样式规范**:

```css
/* 轨道容器 */
.timeline-track {
  @apply flex border-b border-gray-100;
  min-height: 44px;
}

/* 左侧标签区（可拖动调整宽度） */
.timeline-label {
  @apply flex-shrink-0 flex items-center gap-2 px-3 py-2;
  min-width: 100px;
  max-width: 300px;
  background: theme('colors.gray.50');
  border-right: 1px solid theme('colors.gray.200');
  resize: horizontal;
  overflow: hidden;
}

/* 拖动手柄 */
.timeline-label::after {
  content: '';
  @apply absolute right-0 top-0 bottom-0 w-1 cursor-col-resize;
  @apply hover:bg-blue-200 transition-colors;
}

/* 右侧内容区 */
.timeline-content {
  @apply flex-1 relative overflow-hidden;
  background: theme('colors.white');
}

/* 周末/节假日列 - 虚线边框 */
.weekend-column, .holiday-column {
  border-left: 1px dashed theme('colors.gray.300');
  border-right: 1px dashed theme('colors.gray.300');
}
```

### 5.8.4 时间刻度尺 (TimelineRuler)

**布局规格**:

| 属性 | 规格值 | 说明 |
|------|--------|------|
| 刻度高度 | 40px | 时间刻度区域高度 |
| 刻度线颜色 | gray-300 | 垂直分隔线颜色 |
| 今天指示线 | red-500, w-px | 红色实线 + 顶部三角形箭头 |
| 今天背景 | blue-100/50 | 仅当天一列的背景色 |
| 周末/节假日 | 虚线边框 | border-dashed border-gray-300 |

**缩放级别配置**:

| 级别 | dayWidth | 刻度间隔 | 日期格式 |
|------|----------|----------|----------|
| 日视图 | 60px | 1天 | M/d |
| 周视图 | 25px | 7天 | M/d |
| 月视图 | 8px | 30天 | yyyy/M |

**代码实现要点**:

```tsx
// 缩放配置
const TIMELINE_ZOOM_CONFIGS = {
  day: { dayWidth: 60, label: '日' },
  week: { dayWidth: 25, label: '周' },
  month: { dayWidth: 8, label: '月' },
};

// 刻度间隔计算
const interval = dayWidth >= 50 ? 1 : dayWidth >= 20 ? 7 : dayWidth >= 10 ? 14 : 30;
```

### 5.8.5 任务条 (TimelineTaskBar)

**布局规格**:

| 属性 | 规格值 | 说明 |
|------|--------|------|
| 默认高度 | 28px | 任务条高度 |
| 最小宽度 | 40px | 普通任务最小宽度 |
| 里程碑宽度 | 12px | 单日任务（startDate === endDate）显示为里程碑 |
| 圆角 | rounded-md (6px) | 任务条圆角 |
| 内边距 | px-2 | 内容区内边距 |

**里程碑显示**:

| 属性 | 规格值 | 说明 |
|------|--------|------|
| 判断条件 | startDate === endDate | 单日任务 |
| 最小宽度 | 12px | 里程碑固定宽度 |
| 圆点标识 | 白色圆点 | w-2 h-2 bg-white rounded-full |
| 显示内容 | "1天 \| {date}" | 示例: "1天 \| 3/14" |

**状态颜色（5种简化状态）**:

| 状态 | 颜色 | Tailwind类 |
|------|------|------------|
| 未开始 (not_started) | 灰色 | bg-gray-400 |
| 进行中 (in_progress) | 蓝色 | bg-blue-500 |
| 已完成 (completed) | 绿色 | bg-green-500 |
| 已延期 (delayed) | 红色 | bg-red-500 |
| 已取消 (cancelled) | 暗灰 | bg-slate-400 (opacity: 0.6) |

**任务条结构**:

```html
<div class="task-bar">
  <!-- 里程碑标识（单日任务显示白色圆点） -->
  {isMilestone && (
    <div class="milestone-indicator">
      <div class="milestone-dot" /> <!-- 白色圆点 w-2 h-2 bg-white rounded-full -->
    </div>
  )}

  <!-- 任务内容 -->
  <div class="flex items-center h-full px-2">
    <!-- 显示格式: {duration}天 | {startDate}-{endDate} -->
    <!-- 示例: 5天 | 3/10-3/14 -->
    <span class="text-xs font-medium text-white truncate">
      {duration}天 | {startDate}-{endDate}
    </span>
    {progress > 0 && <span class="text-xs text-white/80">{progress}%</span>}
  </div>

  <!-- 进度条覆盖层 -->
  {progress > 0 && <div class="progress-overlay" />}

  <!-- 拖拽手柄（悬停时显示，圆形白色手柄） -->
  {isHovered && (
    <>
      <div class="drag-handle left" />  <!-- w-3 h-3 bg-white/80 rounded-full -->
      <div class="drag-handle right" />
    </>
  )}

  <!-- 负责人悬浮提示 -->
  {isHovered && assigneeName && (
    <div class="assignee-tooltip">{assigneeName}</div>
  )}

  <!-- 优先级指示器 -->
  {priority !== 'medium' && <div class="priority-indicator" />}
</div>
```

**交互状态样式**:

```css
/* 默认状态 */
.task-bar {
  @apply absolute rounded-md shadow-sm transition-all duration-150 cursor-grab;
}

/* 悬停状态 */
.task-bar:hover {
  @apply shadow-md;
}

/* 拖拽中 */
.task-bar.dragging {
  @apply opacity-70 cursor-grabbing;
}

/* 选中状态 */
.task-bar.selected {
  @apply ring-2 ring-blue-500 ring-offset-1;
}

/* 拖拽手柄（圆形白色手柄，悬停时显示） */
.drag-handle {
  @apply absolute top-1/2 -translate-y-1/2 w-3 h-3;
  @apply bg-white/80 rounded-full border-2 border-white;
  @apply cursor-ew-resize shadow-sm;
  @apply opacity-0 group-hover:opacity-100 transition-opacity;
}

.drag-handle.left {
  @apply -left-1.5;
}

.drag-handle.right {
  @apply -right-1.5;
}

/* 里程碑圆点标识 */
.milestone-indicator {
  @apply absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2;
}

.milestone-dot {
  @apply w-2 h-2 bg-white rounded-full;
}
```

### 5.8.6 工具栏 (TimelineToolbar)

**布局规格**:

| 属性 | 规格值 |
|------|--------|
| 高度 | 48px |
| 内边距 | px-4 py-2 |
| 边框 | border-t border-gray-200 |
| 背景 | bg-white |

**工具栏结构**:

```html
<div class="flex items-center justify-between px-4 py-2 bg-white border-t">
  <!-- 左侧：缩放控制 -->
  <div class="flex items-center gap-3">
    <button class="zoom-out">-</button>
    <div class="zoom-buttons">
      <button class="active">📅 日视图</button>
      <button>📆 周视图</button>
      <button>🗓️ 月视图</button>
    </div>
    <button class="zoom-in">+</button>
  </div>

  <!-- 右侧：操作按钮 -->
  <div class="flex items-center gap-2">
    <button class="add-task">添加任务</button>
    <button class="auto-arrange">自动排列</button>
  </div>
</div>
```

**按钮样式**:

```css
/* 视图切换按钮组 */
.zoom-buttons {
  @apply flex items-center bg-gray-100 rounded-lg p-0.5;
}

.zoom-buttons button {
  @apply px-3 py-1 text-sm rounded-md transition-all;
}

.zoom-buttons button.active {
  @apply bg-white text-gray-900 shadow-sm;
}

.zoom-buttons button:not(.active) {
  @apply text-gray-600 hover:text-gray-900;
}

/* 操作按钮 */
.add-task {
  @apply flex items-center gap-1.5 px-3 py-1.5 text-sm;
  @apply text-blue-600 hover:bg-blue-50 rounded transition-colors;
}

.auto-arrange {
  @apply flex items-center gap-1.5 px-3 py-1.5 text-sm;
  @apply text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded;
}
```

### 5.8.7 右键菜单 (TimelineContextMenu)

**菜单项**:

| 图标 | 操作 | 说明 |
|------|------|------|
| ✏️ | 编辑 | 打开任务编辑对话框 |
| 📋 | 复制 | 复制任务到同一时间轴 |
| 🔄 | 切换状态 | 循环切换状态（待处理→进行中→已完成） |
| 🗑️ | 删除 | 删除任务（需确认） |

**菜单样式**:

```css
.context-menu {
  @apply fixed z-50 bg-white rounded-lg shadow-xl;
  @apply border border-gray-200 py-1;
  min-width: 160px;
}

.context-menu button {
  @apply w-full px-4 py-2 text-left text-sm text-gray-700;
  @apply hover:bg-gray-100 flex items-center gap-2;
}

.context-menu button.danger {
  @apply text-red-600 hover:bg-red-50;
}

.context-menu .divider {
  @apply my-1 border-t border-gray-200;
}
```

### 5.8.8 统计信息栏 (TimelineStatsBar)

**显示内容**:

| 字段 | 格式 | 说明 |
|------|------|------|
| 时间轴数 | 时间轴: {n} | 当前项目的时间轴总数 |
| 任务数 | 任务: {n} | 所有时间轴的任务总数 |
| 完成数 | 完成: {n} | 已完成任务数 |
| 进度 | 进度: {n}% | 整体完成百分比 |

**样式**:

```css
.stats-bar {
  @apply flex items-center gap-4 px-4 py-2;
  @apply bg-gray-50 border-b border-gray-200;
  @apply text-sm text-gray-600;
}

.stats-bar .stat-item {
  @apply flex items-center gap-1.5;
}

.stats-bar .stat-value {
  @apply font-medium text-gray-900;
}
```

### 5.8.9 拖拽交互规范

**拖拽操作类型**:

| 操作 | 触发条件 | 行为 |
|------|----------|------|
| 移动 | 拖拽任务条中央 | 整体移动任务时间 |
| 调整开始 | 拖拽左手柄 | 调整开始日期 |
| 调整结束 | 拖拽右手柄 | 调整结束日期 |

**拖拽状态**:

```typescript
interface DragState {
  isDragging: boolean;
  operation: 'move' | 'resizeStart' | 'resizeEnd' | null;
  task: TimelineTask | null;
  startX: number;
  currentX: number;
  originalTask: TimelineTask | null;
}
```

**拖拽反馈**:

| 阶段 | 反馈 |
|------|------|
| 开始拖拽 | 任务条透明度降低至70%，光标变为grabbing |
| 拖拽中 | 顶部显示浮动提示框，显示当前日期范围 |
| ESC取消 | 恢复原始位置，取消拖拽状态 |
| 松开确认 | 更新任务时间，同步到数据源 |

**拖拽提示框**:

```html
<div class="drag-tooltip">
  {startDate} - {endDate} ({duration}天)
</div>

<style>
.drag-tooltip {
  @apply fixed top-4 left-1/2 -translate-x-1/2;
  @apply bg-gray-900 text-white px-4 py-2 rounded-lg shadow-lg;
  @apply z-50 pointer-events-none;
}
</style>
```

### 5.8.10 键盘快捷键

| 快捷键 | 功能 | 作用条件 |
|--------|------|----------|
| `Delete` / `Backspace` | 删除选中任务 | 有选中任务时 |
| `Escape` | 取消选中/取消拖拽 | 任意时刻 |
| `+` / `-` | 放大/缩小时间线 | 时间线聚焦时 |
| `←` `→` | 左右滚动时间线 | 时间线聚焦时 |
| `Home` | 滚动到开始 | 时间线聚焦时 |
| `End` | 滚动到结束 | 时间线聚焦时 |
| `T` | 滚动到今天 | 时间线聚焦时 |

### 5.8.11 删除确认对话框

**触发条件**: Delete键或右键菜单删除

```html
<div class="dialog-overlay">
  <div class="dialog-content">
    <div class="dialog-icon">
      <!-- 红色警告图标 -->
    </div>
    <h3>确认删除任务</h3>
    <p>确定要删除任务 "{taskTitle}" 吗？</p>
    <p class="text-xs text-gray-500">此操作无法撤销</p>
    <div class="dialog-actions">
      <button class="cancel">取消</button>
      <button class="confirm danger">删除</button>
    </div>
  </div>
</div>
```

**样式规范**:

```css
.dialog-overlay {
  @apply fixed inset-0 z-[60] flex items-center justify-center;
  @apply bg-black/50 backdrop-blur-sm;
}

.dialog-content {
  @apply bg-white rounded-lg shadow-xl border;
  @apply max-w-md w-full mx-4 p-6;
}

.dialog-actions {
  @apply flex gap-2 mt-6;
}

.dialog-actions button {
  @apply flex-1 px-4 py-2 text-sm font-medium rounded-lg;
}

.dialog-actions .cancel {
  @apply text-gray-700 bg-white border border-gray-300;
  @apply hover:bg-gray-50;
}

.dialog-actions .confirm.danger {
  @apply text-white bg-red-600 hover:bg-red-700;
}
```

### 5.8.12 数据类型定义

**设计说明**:
- 时间线组件使用简化状态集（5种），用于甘特图/时间轴视图
- 完整的9种任务状态在WBS任务表中定义，时间线通过映射展示

**WBS状态到时间线状态映射规则**:

| WBS 9种状态 | 时间线5种状态 | 说明 |
|-------------|---------------|------|
| 待审批 | 未开始 | 等待审批，未开始执行 |
| 已驳回 | 未开始 | 被驳回后需重新提交 |
| 未开始 | 未开始 | 任务尚未开始 |
| 进行中 | 进行中 | 任务正在执行 |
| 提前完成 | 已完成 | 提前完成任务 |
| 按时完成 | 已完成 | 按时完成任务 |
| 延期预警 | 已延期 | 有延期风险 |
| 已延迟 | 已延期 | 已超过计划日期 |
| 超期完成 | 已完成 | 延期后完成 |

**时间线优先级**:
- 紧急 / 高 / 中 / 低

**时间轴任务数据结构**（参考）:
- id: 任务唯一标识
- title: 任务标题
- description: 任务描述（可选）
- startDate: 开始日期
- endDate: 结束日期
- status: 任务状态（5种简化状态）
- priority: 优先级（4级）
- progress: 进度（0-100）
- assigneeId: 负责人ID（可选）
- assigneeName: 负责人名称（可选）
- tags: 标签列表（可选）
- sourceType: 来源类型（里程碑/WBS/自定义）
- sourceId: 来源ID
- sortOrder: 排序顺序
- timelineId: 时间线ID

// 时间轴配置
interface TimelineConfig {
  id: string;
  name: string;
  icon?: string;
  color?: string;
  type?: 'tech_stack' | 'team' | 'phase' | 'custom';
  visible?: boolean;
  editable?: boolean;
  sortOrder?: number;
}

// 时间轴
interface Timeline {
  config: TimelineConfig;
  tasks: TimelineTask[];
}

// 统计信息
interface TimelineStats {
  timelineCount: number;
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  delayedTasks: number;
  overallProgress: number;
  earliestDate?: string;
  latestDate?: string;
}
```

### 5.8.13 时间轴操作API

**时间轴管理**:

| 操作 | 函数 | 说明 |
|------|------|------|
| 添加时间轴 | `handleAddTimeline()` | 创建新的空时间轴 |
| 删除时间轴 | `handleDeleteTimeline(id)` | 删除指定时间轴及其任务 |
| 重命名时间轴 | `handleRenameTimeline(timeline)` | 弹窗输入新名称 |

**任务管理**:

| 操作 | 函数 | 说明 |
|------|------|------|
| 添加任务 | `handleTrackClick(date, timelineId)` | 在指定日期创建新任务 |
| 编辑任务 | `handleEditTask(task)` | 打开任务编辑对话框 |
| 复制任务 | `handleCopyTask(task)` | 复制任务到同一时间轴 |
| 删除任务 | `handleDeleteTask(task)` | 删除指定任务 |
| 切换状态 | `handleToggleTaskStatus(task)` | 循环切换任务状态 |
| 自动排列 | `handleAutoArrange()` | 智能调整任务位置避免重叠 |

### 5.8.14 响应式适配

| 屏幕宽度 | 适配策略 |
|----------|----------|
| ≥1280px | 完整显示，左侧标签180px |
| 768-1279px | 左侧标签缩减至140px |
| <768px | 隐藏左侧标签区，仅显示时间线内容 |

### 5.8.15 周末/节假日显示规范 新增

**显示方式**: 虚线边框标识

**周末判断**:
- 周六、周日使用虚线边框

**节假日判断**:
- 根据系统配置的节假日数据判断
- 配置路径: 设置 → 节假日管理

**样式规范**:

```css
/* 周末列 */
.weekend-column {
  border-left: 1px dashed theme('colors.gray.300');
  border-right: 1px dashed theme('colors.gray.300');
}

/* 节假日列 */
.holiday-column {
  border-left: 1px dashed theme('colors.gray.300');
  border-right: 1px dashed theme('colors.gray.300');
}

/* 既是周末又是节假日 */
.weekend-column.holiday-column {
  border-left: 1px dashed theme('colors.amber.300');
  border-right: 1px dashed theme('colors.amber.300');
}
```

**交互说明**:
- 悬停时显示日期类型提示（周末/节假日名称）
- 不影响任务条拖拽和编辑

### 5.8.16 看板统计时间线规范 新增

**设计目标**: 简单明了地识别进度风险

**使用场景**: 报表分析模块中的看板统计视图

**布局规格**:

| 属性 | 规格值 | 说明 |
|------|--------|------|
| 视图类型 | 单时间轴 | 只读视图，不可拖拽编辑 |
| 轨道高度 | 32px | 比编辑视图更紧凑 |
| 任务条高度 | 20px | 更紧凑的任务条 |

**风险导向视图特点**:

```
┌────────────────────────────────────────────────────────────┐
│  看板统计时间线（风险导向）                                   │
├────────────────────────────────────────────────────────────┤
│  ┌────────────────────────────────────────────────────────┐│
│  │ 🟢 已完成任务 ████████████████████░░░░ 80%            ││
│  │ 🔵 进行中     ████████████░░░░░░░░░░░░ 50%            ││
│  │ 🟡 延期预警   ████████░░░░░░░░░░░░░░░░ ⚠️             ││
│  │ 🔴 已延期     ██████████████░░░░░░░░░░ 🔴             ││
│  └────────────────────────────────────────────────────────┘│
│                                                            │
│  图例: 🟢已完成 🔵进行中 🟡延期预警 🔴已延期 ⚪未开始       │
└────────────────────────────────────────────────────────────┘
```

**状态标识**:

| 状态 | 标识 | 说明 |
|------|------|------|
| 已完成 | 🟢 绿色 | 进度条填充 |
| 进行中 | 🔵 蓝色 | 进度条填充 |
| 延期预警 | 🟠 橙色 + ⚠️ | 边框高亮 |
| 已延期 | 🔴 红色 + 🔴 | 高亮警告 |
| 未开始 | ⚪ 灰色 | 半透明 |

**只读视图限制**:
- 禁用拖拽功能
- 禁用右键菜单
- 禁用添加/删除任务
- 仅支持查看和滚动

**代码实现要点**:

```tsx
interface KanbanTimelineProps {
  tasks: TimelineTask[];
  isReadOnly: true;  // 强制只读
  showRiskIndicator: true;  // 显示风险标识
}

// 风险判断逻辑
function getRiskStatus(task: TimelineTask): RiskStatus {
  if (task.status === 'completed') return 'normal';
  if (task.status === 'delayed') return 'critical';

  const today = new Date();
  const endDate = new Date(task.endDate);
  const daysRemaining = differenceInDays(endDate, today);

  if (daysRemaining < 0) return 'critical';
  if (daysRemaining <= 3) return 'warning';  // 3天内到期预警
  return 'normal';
}
```

---

# 第六部分：UI改进任务

## 6.1 需要修改的项目

| 优先级 | 改进项 | 模块 | 说明 |
|--------|--------|------|------|
| **P0** | 统计卡片简化 | 仪表盘 | 带图标卡片 → 极简数字样式 |
| **P0** | 新增图表区域 | 仪表盘 | 仪表盘新增多个小图表 |
| **P1** | Settings 导航改为 Tab | 设置 | 侧边栏导航 → 顶部 Tab |
| **P1** | 表单保存方式 | 设置 | 自动保存 → 保存+取消按钮 |
| **P1** | 节假日列表视图 | 设置 | 表格视图 → 列表视图 |
| **P1** | WBS表单统一 | WBS任务 | 分离表单 → 统一表单 |

## 6.2 持续优化

| 优先级 | 改进项 | 说明 |
|--------|--------|------|
| P1 | 交互反馈增强 | 优化加载状态、过渡动画、反馈提示 |
| P1 | 空状态/错误状态 | 统一错误提示、空状态、加载状态样式 |
| P1 | 深色模式完善 | 确保所有组件深色模式适配 |
| P2 | WbsTaskTable 拆分 | 2554行组件需拆分为多个子组件 |

---

## 附录

### A. 演示文件清单

| 文件 | 路径 | 说明 |
|------|------|------|
| shadcn/ui 演示 | demos/shadcn-ui-demo.html | 设计系统组件演示 |
| Apple Design 演示 | demos/apple-design-demo.html | Apple 风格组件演示 |
| 表单交互演示 | demos/form-interaction-demo.html | 表单验证与错误处理 |
| 表格交互演示 | demos/table-interaction-demo.html | 排序/筛选/分页/编辑 |
| UI 综合确认 | demos/ui-confirmation.html | 12项UI决策确认 |
| 仪表盘确认 | demos/dashboard-confirmation.html | 仪表盘布局确认 |
| 页面设计规范确认 | demos/page-layout-confirmation.html | 14项通用页面设计规范（侧边栏/顶栏/导航/模板等） |
| 具体页面布局确认 | demos/page-layouts-confirmation.html | 8个业务页面布局（Dashboard/Projects/Tasks/Settings等） |
| Settings 确认 | demos/settings-confirmation.html | 设置页面确认 |
| 项目管理确认 | demos/project-management-confirmation.html | 项目管理模块确认 |
| 任务管理确认 | demos/task-management-confirmation.html | 任务管理模块确认 |
| WBS表单确认 | demos/wbs-task-form-confirmation.html | WBS任务表单确认 |
| WBS表格演示 | demos/wbs-table-v2-demo.html | WBS表格 v2 演示 |
| 审批流程确认 | demos/approval-flow-confirmation.html | 审批流程模块 UI 确认 |
| 能力模型确认 | demos/competency-model-confirmation.html | 能力模型管理模块 UI 确认 |
| 导入导出确认 | demos/import-export-confirmation.html | 导入导出模块 UI 确认 |

### B. 相关文档

| 文档 | 路径 |
|------|------|
| 基准需求文档 | docs/requirements/FINAL_REQUIREMENTS_0315-0130.md |
| UI决策记录 | docs/requirements/UI/UI_DECISIONS.md |
| UI技术分析 | docs/requirements/UI/ANALYSIS_UI_0312-0130.md |
| UI用户分析 | docs/requirements/UI/ANALYSIS_UI_0312-0141.md |
| 目录索引 | docs/requirements/UI/INDEX.md |

---
