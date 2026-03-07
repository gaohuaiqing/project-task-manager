# 苹果风格设计系统使用指南

> **版本:** 1.0.0
> **最后更新:** 2025-01-07
> **基于:** Apple Human Interface Guidelines

---

## 📖 目录

1. [简介](#简介)
2. [快速开始](#快速开始)
3. [设计令牌](#设计令牌)
4. [组件库](#组件库)
5. [最佳实践](#最佳实践)
6. [迁移指南](#迁移指南)

---

## 简介

苹果风格设计系统是一套基于 Apple Human Interface Guidelines 的完整设计系统，专为现代 Web 应用设计。它提供了统一的视觉语言、交互模式和组件规范，确保应用具有苹果产品般的精致体验。

### 核心原则

- **清晰性 (Clarity):** 清晰的视觉层次和易读的文本
- **一致性 (Consistency):** 统一的视觉语言和交互模式
- **深度感 (Depth):** 通过阴影、模糊和层次营造空间感

### 技术栈

- **React 19** + **TypeScript**
- **Tailwind CSS** (用于样式)
- **CSS Variables** (用于主题系统)

---

## 快速开始

### 安装依赖

确保项目已安装以下依赖：

```bash
npm install tailwindcss-animate
```

### 配置 Tailwind

设计系统已集成到 `tailwind.config.js` 中，无需额外配置。

### 导入样式

在主入口文件导入全局样式：

```tsx
import './index.css';
```

---

## 设计令牌

设计令牌是设计系统的核心，提供了统一的视觉规范。

### 颜色系统

#### 系统颜色

苹果官方系统颜色，用于强调交互元素：

```tsx
import { colors } from '@/styles/tokens';

// 使用系统蓝色
<button style={{ color: colors.system.blue.DEFAULT }}>
  点击我
</button>

// Tailwind 类名
<button className="text-system-blue">
  点击我
</button>
```

可用颜色：
- `systemBlue` - 主色调，用于主要操作
- `systemGreen` - 成功状态
- `systemOrange` - 警告状态
- `systemRed` - 错误/危险操作
- `systemYellow` - 注意事项
- `systemPink`, `systemPurple`, `systemIndigo` - 装饰性颜色

#### 语义化颜色

用于特定 UI 元素：

```tsx
import { semanticColors } from '@/styles/tokens';

// 背景色
<div style={{ backgroundColor: semanticColors.background.primary }}>
  内容
</div>

// 文本色
<p style={{ color: semanticColors.text.primary }}>
  主要文本
</p>
```

### 间距系统

基于 8pt 网格的间距系统：

```tsx
import { spacing } from '@/styles/tokens';

// 基础间距
<div style={{ padding: spacing[4] }}>内容</div>

// 语义化间距
<div style={{ padding: semanticSpacing.component.md }}>内容</div>

// Tailwind 类名
<div className="p-4">内容</div>  // 16px
```

### 排版系统

#### 字体族

优先使用苹果系统字体：

```tsx
import { fontFamilies } from '@/styles/tokens';

<div style={{ fontFamily: fontFamilies.system }}>
  内容
</div>
```

字体栈：
- `-apple-system` (macOS/iOS)
- `BlinkMacSystemFont` (Chrome)
- `SF Pro Display/Text` (苹果官方字体)
- `Inter` (回退字体)

#### 文本样式

```tsx
import { textStyles } from '@/styles/tokens';

<h1 style={{ ...textStyles.display.large }}>大标题</h1>
<p style={{ ...textStyles.body.default }}>正文内容</p>
```

### 动画系统

#### 动画时长

苹果标准动画时长：

```tsx
import { animationDurations, easingFunctions } from '@/styles/tokens';

// 创建过渡
const transition = animationUtils.transition(
  ['transform', 'opacity'],
  animationDurations.fast,
  easingFunctions.appleOut
);
```

可用时长：
- `instant: 100ms` - 即时反馈
- `fast: 200ms` - 微交互
- `base: 300ms` - 标准过渡
- `medium: 400ms` - 模态框
- `slow: 500ms` - 页面切换

#### 缓动函数

苹果风格缓动曲线：

- `apple` - 标准缓动
- `appleOut` - 缓出（推荐用于进入动画）
- `spring` - 弹性效果（推荐用于模态框）

### 视觉效果

#### 圆角系统

```tsx
import { borderRadius } from '@/styles/tokens';

<button style={{ borderRadius: borderRadius.apple.button }}>
  按钮
</button>
```

推荐圆角：
- `apple.button: 10px` - 按钮
- `apple.card: 12px` - 卡片
- `apple.modal: 14px` - 模态框

#### 阴影系统

```tsx
import { shadows } from '@/styles/tokens';

<div style={{ boxShadow: shadows.apple.floating }}>
  浮起元素
</div>
```

阴影层级：
- `apple.subtle` - 微妙浮起
- `apple.floating` - 标准浮起
- `apple.elevated` - 明显浮起
- `apple.prominent` - 强烈浮起

#### 玻璃态效果

```tsx
import { glassmorphism } from '@/styles/tokens';

<div style={{
  background: glassmorphism.standard.background,
  backdropFilter: glassmorphism.standard.backdropFilter,
  border: glassmorphism.standard.border
}}>
  玻璃态内容
</div>
```

---

## 组件库

设计系统提供了一系列预构建的苹果风格组件。

### AppleButton

按钮组件，支持多种变体和尺寸：

```tsx
import { AppleButton } from '@/components/apple-design/AppleButton';

// 基础用法
<AppleButton variant="primary" size="medium">
  点击我
</AppleButton>

// 不同变体
<AppleButton variant="secondary">次要按钮</AppleButton>
<AppleButton variant="success">成功</AppleButton>
<AppleButton variant="warning">警告</AppleButton>
<AppleButton variant="danger">危险</AppleButton>

// 不同尺寸
<AppleButton size="small">小按钮</AppleButton>
<AppleButton size="medium">中按钮</AppleButton>
<AppleButton size="large">大按钮</AppleButton>

// 状态
<AppleButton loading>加载中...</AppleButton>
<AppleButton disabled>禁用按钮</AppleButton>
```

### AppleCard

卡片组件，用于内容分组：

```tsx
import { AppleCard, AppleCardGroup } from '@/components/apple-design/AppleCard';

// 单个卡片
<AppleCard
  title="项目名称"
  subtitle="项目描述"
  elevated
  hoverable
  onClick={() => console.log('clicked')}
>
  卡片内容
</AppleCard>

// 卡片组
<AppleCardGroup gap="medium" equalHeight>
  <AppleCard title="卡片1">内容1</AppleCard>
  <AppleCard title="卡片2">内容2</AppleCard>
  <AppleCard title="卡片3">内容3</AppleCard>
</AppleCardGroup>
```

### AppleInput / AppleTextarea

输入框组件：

```tsx
import { AppleInput, AppleTextarea } from '@/components/apple-design/AppleInput';

// 文本输入
<AppleInput
  label="用户名"
  placeholder="请输入用户名"
  required
  error={hasError}
  errorText="用户名不能为空"
  helperText="用于登录的用户名"
/>

// 带图标的输入框
<AppleInput
  label="邮箱"
  type="email"
  prefixIcon={<MailIcon />}
  suffixIcon={<CheckIcon />}
/>

// 文本域
<AppleTextarea
  label="描述"
  placeholder="请输入描述"
  minRows={3}
  maxRows={6}
/>
```

---

## 最佳实践

### 1. 颜色使用

**推荐做法:**
```tsx
// 使用系统颜色
<button style={{ color: colors.system.blue.DEFAULT }}>
  主要操作
</button>

// 使用语义化颜色
<p style={{ color: semanticColors.text.secondary }}>
  次要文本
</p>
```

**避免:**
```tsx
// ❌ 硬编码颜色值
<button style={{ color: '#007AFF' }}>
  主要操作
</button>
```

### 2. 间距使用

**推荐做法:**
```tsx
// 使用语义化间距
<div style={{ padding: semanticSpacing.component.md }}>
  内容
</div>
```

**避免:**
```tsx
// ❌ 硬编码间距值
<div style={{ padding: '16px' }}>
  内容
</div>
```

### 3. 动画使用

**推荐做法:**
```tsx
// 使用苹果风格动画
<div style={{
  transition: animationUtils.transition(
    ['transform', 'opacity'],
    animationDurations.fast,
    easingFunctions.appleOut
  )
}}>
  内容
</div>
```

**避免:**
```tsx
// ❌ 过长的动画时长
<div style={{ transitionDuration: '1000ms' }}>
  内容
</div>
```

### 4. 响应式设计

```tsx
// 使用响应式间距
import { responsiveSpacing } from '@/styles/tokens';

<div style={{
  padding: responsiveSpacing.mobile.md,
  '@media (min-width: 768px)': {
    padding: responsiveSpacing.tablet.md,
  },
  '@media (min-width: 1024px)': {
    padding: responsiveSpacing.desktop.md,
  }
}}>
  响应式内容
</div>
```

---

## 迁移指南

### 从现有样式迁移

#### 步骤 1: 识别可复用的样式

找到重复使用的样式值：

```tsx
// 之前
const Card = ({ children }) => (
  <div style={{
    borderRadius: '8px',
    padding: '16px',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
    backgroundColor: '#ffffff',
  }}>
    {children}
  </div>
);
```

#### 步骤 2: 替换为设计令牌

```tsx
// 之后
import { borderRadius, spacing, shadows, semanticColors } from '@/styles/tokens';

const Card = ({ children }) => (
  <div style={{
    borderRadius: borderRadius.apple.card,
    padding: spacing.semantic.component.md,
    boxShadow: shadows.apple.floating,
    backgroundColor: semanticColors.background.primary,
  }}>
    {children}
  </div>
);
```

#### 步骤 3: 使用预构建组件

```tsx
// 最佳实践
import { AppleCard } from '@/components/apple-design/AppleCard';

const Card = ({ children }) => (
  <AppleCard elevated>
    {children}
  </AppleCard>
);
```

### 渐进式迁移

1. **第一阶段:** 在新组件中使用设计令牌
2. **第二阶段:** 重构常用组件使用设计令牌
3. **第三阶段:** 替换为预构建组件
4. **第四阶段:** 移除旧的样式代码

---

## 常见问题

### Q: 如何自定义主题？

A: 修改 `tailwind.config.js` 中的颜色值，或直接修改 CSS 变量。

### Q: 如何支持深色模式？

A: 使用 `.dark` 类名切换主题，设计令牌会自动适配。

### Q: 能否与现有的 shadcn/ui 组件一起使用？

A: 完全可以！设计令牌已经集成到 Tailwind 配置中，可以在任何组件中使用。

### Q: 如何添加新的设计令牌？

A: 在 `app/src/styles/tokens/` 目录下相应文件中添加新令牌。

---

## 相关资源

- [Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/)
- [SF Pro 字体](https://developer.apple.com/fonts/)
- [Tailwind CSS 文档](https://tailwindcss.com/docs)

---

## 更新日志

### v1.0.0 (2025-01-07)

- ✨ 初始版本发布
- 🎨 完整的颜色系统
- 📏 间距和排版系统
- 🎬 动画和过渡效果
- 🧩 预构建组件库
- 📖 完整的使用文档

---

**如有问题或建议，请联系设计团队。**
