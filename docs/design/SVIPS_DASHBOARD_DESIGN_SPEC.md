# SVIPS 仪表盘设计规范

> 从 https://api.svips.org/dashboard 提炼的设计系统

---

## 一、颜色系统

### 主色板

| 用途 | 颜色值 | Tailwind 类名 |
|------|--------|---------------|
| 主背景 | `#020617` | `bg-slate-950` |
| 侧边栏背景 | `#0f172a` | `bg-slate-900` |
| 卡片背景 | `rgba(30,41,59,0.5)` | `bg-slate-800/50` |
| 主强调色 | `#2dd4bf` | `text-teal-400` |
| 强调色背景 | `rgba(19,78,74,0.2)` | `bg-teal-900/20` |
| 主文字 | `#f3f4f6` | `text-gray-100` |
| 次文字 | `#9ca3af` | `text-gray-400` |
| 弱文字 | `#6b7280` | `text-gray-500` |
| 边框 | `rgba(51,65,85,0.5)` | `border-slate-600/50` |
| 细边框 | `rgba(30,41,59,1)` | `border-slate-800` |

### 状态颜色

| 状态 | 颜色值 | Tailwind 类名 |
|------|--------|---------------|
| 成功/正向 | `#22c55e` | `text-green-500` |
| 成功背景 | `rgba(20,83,45,0.3)` | `bg-green-900/30` |
| 警告 | `#f59e0b` | `text-amber-500` |
| 警告背景 | `rgba(120,53,15,0.3)` | `bg-amber-900/30` |
| 信息 | `#60a5fa` | `text-blue-400` |
| 信息背景 | `rgba(30,58,138,0.3)` | `bg-blue-900/30` |
| 错误 | `#fb7185` | `text-rose-400` |
| 错误背景 | `rgba(136,19,55,0.3)` | `bg-rose-900/30` |
| 紫色 | `#c084fc` | `text-purple-400` |
| 紫色背景 | `rgba(88,28,135,0.3)` | `bg-purple-900/30` |

---

## 二、字体系统

### 字体栈

```css
font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", 
             Roboto, "Helvetica Neue", Arial, "PingFang SC", 
             "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
```

### 字号层级

| 用途 | 字号 | 字重 | Tailwind |
|------|------|------|----------|
| 页面标题 H1 | 18px | 600 | `text-lg font-semibold` |
| 区块标题 H2 | 18px | 600 | `text-lg font-semibold` |
| 卡片标题 H3 | 14px | 600 | `text-sm font-semibold` |
| 正文 Body | 16px | 400 | `text-base` |
| 辅助文字 | 14px | 400-500 | `text-sm` |
| 标签/表头 | 12px | 500-700 | `text-xs font-medium` |
| **统计数值** | **20px** | **700** | `text-xl font-bold` |
| 副标题 | 12px | 400 | `text-xs` |

---

## 三、间距系统

| 名称 | 值 | 使用场景 |
|------|-----|---------|
| gap-sm | 4px | 紧凑元素间距 |
| gap-md | 12px | 卡片间距（小） |
| gap-lg | 16px | 卡片间距（标准） |
| gap-xl | 24px | 区块间距 |
| padding-card | 16px | 卡片内边距 |
| padding-button | 10px 12px | 按钮内边距 |
| padding-main | 32px | 主内容区边距 |

---

## 四、圆角系统

| 元素 | 圆角 | Tailwind |
|------|------|----------|
| 卡片 | 16px | `rounded-2xl` |
| 按钮 | 12px | `rounded-xl` |
| 输入框 | 12px | `rounded-xl` |
| 小元素 | 8px | `rounded-lg` |
| 徽章 | 6px | `rounded-md` |

---

## 五、卡片设计

### 基础卡片样式

```css
.card {
  background-color: rgba(30, 41, 59, 0.5);  /* 半透明 */
  border: 0.8px solid rgba(51, 65, 85, 0.5);
  border-radius: 16px;
  padding: 16px;
  box-shadow: 
    0 1px 3px rgba(0, 0, 0, 0.04),
    0 1px 2px rgba(0, 0, 0, 0.06);
}
```

### Tailwind 实现

```tsx
<div className="
  bg-slate-800/50 
  backdrop-blur-sm 
  border-[0.8px] 
  border-slate-600/50 
  rounded-2xl 
  p-4
  shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.06)]
">
```

### 统计卡片结构

```
┌─────────────────────────────────┐
│  🟢 余额                        │ ← 图标(可选) + 标题 (12px 灰色)
│  $0.00                          │ ← 主数值 (20px 粗体)
│  可用                           │ ← 副标题 (12px 灰色)
└─────────────────────────────────┘
```

---

## 六、布局系统

### 整体结构

```
┌──────────────────────────────────────────────────────┐
│  Header (64px)                                       │
├────────────┬─────────────────────────────────────────┤
│  Sidebar   │  Main Content (padding: 32px)          │
│  (256px)   │                                         │
│            │  space-y-6 (垂直间距 24px)              │
└────────────┴─────────────────────────────────────────┘
```

### 网格布局

```tsx
// 统计卡片行 - 4列
<div className="grid grid-cols-2 gap-4 lg:grid-cols-4">

// 图表区域 - 2列
<div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

// 列表+快捷操作 - 不对称 2:1
<div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
  <div className="lg:col-span-2">列表</div>
  <div>快捷操作</div>
</div>
```

---

## 七、导航菜单

### 菜单项样式

```tsx
// 非激活状态
<a className="
  flex items-center gap-3 
  px-3 py-2.5 
  rounded-xl 
  text-gray-300 
  hover:bg-slate-800 
  transition-colors
">

// 激活状态
<a className="
  flex items-center gap-3 
  px-3 py-2.5 
  rounded-xl 
  text-teal-400 
  bg-teal-900/20 
  font-medium
">
```

---

## 八、按钮样式

### 主要按钮

```tsx
<button className="
  px-4 py-2.5
  rounded-xl
  text-sm font-medium
  bg-slate-800/50
  text-gray-100
  border-[0.8px] border-slate-600/50
  hover:bg-slate-700/50
  transition-all duration-200
">
```

### 次要按钮

```tsx
<button className="
  px-4 py-2.5
  rounded-xl
  text-sm font-medium
  bg-transparent
  text-gray-300
  hover:bg-slate-800
  transition-all duration-200
">
```

---

## 九、表格样式

```tsx
// 表头
<th className="
  text-xs font-bold 
  text-gray-400 
  text-left 
  pb-2
">

// 表格行
<tr className="
  border-b border-slate-700/50
  hover:bg-slate-800/30
">

// 单元格
<td className="
  text-sm 
  text-white 
  py-2
">
```

---

## 十、设计原则

### 专业感公式

```
专业感 = 精细 + 层次 + 信息完整
粗糙感 = 粗犷 + 平面 + 信息单薄
```

### 核心原则

1. **细边框 (0.8px)** - 比 1px 更精致
2. **半透明背景** - 营造层次感
3. **多层轻阴影** - 微妙的立体感
4. **信息层级完整** - 标题 + 数值 + 副标题
5. **紧凑的内边距 (16px)** - 避免空洞
6. **适中的数值字号 (20px)** - 不突兀
7. **统一的圆角 (16px)** - 现代柔和

---

## 十一、实现检查清单

### Card 组件修改

- [ ] 边框改为 `0.8px`
- [ ] 背景改为半透明 `bg-card/50`
- [ ] 添加 `backdrop-blur-sm`
- [ ] 圆角改为 `rounded-2xl` (16px)
- [ ] 添加多层阴影

### StatsCard 组件修改

- [ ] 数值字号改为 `text-xl`
- [ ] 内边距改为 `p-4`
- [ ] 添加 `subtitle` 字段
- [ ] 标题字号改为 `text-xs`
- [ ] 添加图标支持

### 布局修改

- [ ] 统计卡片增加到 8 个（两行）
- [ ] 添加时间筛选器卡片
- [ ] 添加快捷操作卡片
- [ ] 使用不对称网格布局

---

**提取日期**: 2026-04-04
**参考来源**: https://api.svips.org/dashboard
