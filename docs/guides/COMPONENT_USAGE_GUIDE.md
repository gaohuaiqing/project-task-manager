# 苹果风格设计系统 - 组件使用指南

> **版本**: 1.0
> **最后更新**: 2025-03-07
> **目标读者**: 开发者、UI设计师

---

## 🎯 解决核心UI问题

本文档针对开发团队最常见的三个UI问题提供解决方案：

1. **视觉设计不一致** - 统一的颜色、间距、圆角规范
2. **组件一致性差** - 标准化组件库
3. **需求理解偏差** - 清晰的组件预览和使用示例

---

## 📋 快速诊断清单

在开发新UI前，先检查：

```bash
□ 我是否使用了 Apple 组件库？
□ 我是否使用了设计令牌（颜色、间距、圆角）？
□ 我是否查看了组件展示页面的实际效果？
□ 我的组件是否支持深色模式？
□ 我的组件是否支持响应式布局？
```

---

## 🚀 问题1：视觉设计不一致

### 症状

- 不同页面的按钮颜色不一样
- 间距忽大忽小
- 圆角大小不统一
- 阴影效果各不相同

### 解决方案：使用设计令牌

#### ❌ 错误做法

```tsx
// 硬编码颜色值
<div style={{ backgroundColor: '#007AFF', color: '#fff' }}>
  按钮
</div>

// 硬编码间距
<div style={{ padding: '16px', margin: '8px' }}>
  内容
</div>

// 硬编码圆角
<button style={{ borderRadius: '8px' }}>
  点击
</button>
```

#### ✅ 正确做法

```tsx
// 使用系统颜色变量
<div className="bg-system-blue text-white">
  按钮
</div>

// 使用 Tailwind 间距类名
<div className="p-4 mx-2">
  内容
</div>

// 使用苹果风格圆角
<button className="rounded-apple-button">
  点击
</button>
```

### 可用的设计令牌

#### 颜色令牌

```tsx
// 系统颜色
bg-system-blue      // 主色蓝
bg-system-green     // 成功绿
bg-system-orange    // 警告橙
bg-system-red       // 错误红
bg-system-yellow    // 注意黄

// 语义化颜色
bg-background       // 主背景
bg-card            // 卡片背景
text-foreground     // 主文本
text-muted-foreground // 次要文本
border-border       // 边框颜色
```

#### 间距令牌

```tsx
// 基础间距 (4px 基础单位)
p-1   // 4px
p-2   // 8px
p-3   // 12px
p-4   // 16px
p-6   // 24px
p-8   // 32px
```

#### 圆角令牌

```tsx
rounded-apple-button  // 10px - 按钮
rounded-apple-card    // 12px - 卡片
rounded-apple-modal   // 14px - 模态框
rounded-apple-sheet   // 16px - 底部抽屉
```

---

## 🧩 问题2：组件一致性差

### 症状

- 按钮样式到处不同
- 卡片效果不统一
- 交互行为不一致
- 每次都重新实现相同功能

### 解决方案：使用标准化组件

#### 核心原则

```
只要设计系统中有类似组件，优先使用标准组件
不要重复造轮子
```

#### 组件映射表

| UI需求 | 使用组件 | 导入路径 |
|--------|---------|---------|
| 按钮 | `AppleButton` | `@/components/apple-design` |
| 卡片 | `AppleCard` | `@/components/apple-design` |
| 输入框 | `AppleInput` | `@/components/apple-design` |
| 表格 | `AppleTable` | `@/components/apple-design` |
| 模态框 | `AppleModal` | `@/components/apple-design` |
| 下拉菜单 | `AppleDropdown` | `@/components/apple-design` |
| 标签页 | `AppleTabs` | `@/components/apple-design` |
| 进度条 | `AppleProgress` | `@/components/apple-design` |
| 工具提示 | `AppleTooltip` | `@/components/apple-design` |
| 徽章 | `AppleBadge` | `@/components/apple-design` |
| 头像 | `AppleAvatar` | `@/components/apple-design` |

#### 使用示例

##### 1. 按钮组件

```tsx
import { AppleButton } from '@/components/apple-design';

// ✅ 标准用法
<AppleButton variant="primary" size="medium">
  提交
</AppleButton>

// ❌ 不要自己实现
<button className="px-4 py-2 bg-blue-500 text-white rounded">
  提交
</button>
```

##### 2. 卡片组件

```tsx
import { AppleCard } from '@/components/apple-design';

// ✅ 标准用法
<AppleCard
  title="项目标题"
  subtitle="项目描述"
  elevated
  hoverable
>
  内容
</AppleCard>

// ❌ 不要自己实现
<div className="bg-white p-4 rounded-lg shadow-md hover:shadow-lg">
  <h3>项目标题</h3>
  <p>项目描述</p>
</div>
```

##### 3. 输入框组件

```tsx
import { AppleInput } from '@/components/apple-design';

// ✅ 标准用法
<AppleInput
  label="用户名"
  placeholder="请输入用户名"
  required
  error={hasError}
  errorText="用户名不能为空"
  helperText="至少3个字符"
/>

// ❌ 不要自己实现
<div>
  <label>用户名</label>
  <input type="text" placeholder="请输入" />
  {hasError && <span className="text-red-500">错误</span>}
</div>
```

---

## 🎨 问题3：需求理解偏差

### 症状

- 设计稿和实现效果不一致
- 细节处理不到位
- 动画效果不符合预期
- 交互行为理解错误

### 解决方案：查看组件展示页

#### 组件展示页面

运行以下命令查看所有组件的实际效果：

```bash
cd app
npm run dev
```

然后在浏览器打开：`http://localhost:5173/design-showcase`

#### 组件展示页面包含

- ✅ 所有组件的实际渲染效果
- ✅ 交互演示（点击、悬停、状态切换）
- ✅ 代码使用示例
- ✅ 不同变体和尺寸的展示

#### 使用工作流

```
1. 需求来了
   ↓
2. 先看组件展示页，确认是否有现成组件
   ↓
3. 如果有，直接使用标准组件
   ↓
4. 如果没有，查看类似组件的实现方式
   ↓
5. 保持与设计系统一致的风格
```

---

## 📝 常见场景解决方案

### 场景1：创建表单

```tsx
import { AppleCard, AppleInput, AppleButton, AppleModal } from '@/components/apple-design';

function CreateProjectForm() {
  return (
    <AppleCard title="创建项目" elevated>
      <form className="space-y-4">
        <AppleInput
          label="项目名称"
          placeholder="请输入项目名称"
          required
        />
        <AppleInput
          label="项目描述"
          placeholder="请输入项目描述"
        />
        <div className="flex justify-end gap-3">
          <AppleButton variant="secondary">
            取消
          </AppleButton>
          <AppleButton variant="primary">
            创建
          </AppleButton>
        </div>
      </form>
    </AppleCard>
  );
}
```

### 场景2：数据列表

```tsx
import { AppleTable, AppleBadge } from '@/components/apple-design';

const columns = [
  { key: 'name', title: '名称' },
  { key: 'status', title: '状态', render: (value) => (
    <AppleBadge variant={value === '已完成' ? 'success' : 'warning'}>
      {value}
    </AppleBadge>
  )},
];

function ProjectList({ projects }) {
  return (
    <AppleTable
      columns={columns}
      dataSource={projects}
      rowKey="id"
      striped
      hoverable
    />
  );
}
```

### 场景3：确认对话框

```tsx
import { AppleModal, AppleButton } from '@/components/apple-design';

function ConfirmDialog({ open, onClose, onConfirm }) {
  return (
    <AppleModal
      open={open}
      onClose={onClose}
      title="确认删除"
      size="small"
      footer={
        <>
          <AppleButton variant="secondary" onClick={onClose}>
            取消
          </AppleButton>
          <AppleButton variant="danger" onClick={onConfirm}>
            确认删除
          </AppleButton>
        </>
      }
    >
      <p>此操作无法撤销，确定要删除吗？</p>
    </AppleModal>
  );
}
```

---

## ⚠️ 常见错误

### 错误1：混用不同的设计系统

```tsx
// ❌ 错误：同时使用苹果组件和shadcn/ui
<AppleButton className="bg-blue-500 hover:bg-blue-600">
  按钮
</AppleButton>

// ✅ 正确：使用组件自带的 variant
<AppleButton variant="primary">
  按钮
</AppleButton>
```

### 错误2：覆盖组件样式

```tsx
// ❌ 错误：强制覆盖组件内部样式
<AppleButton style={{ backgroundColor: '#custom' }}>
  按钮
</AppleButton>

// ✅ 正确：使用 variant 或者自定义新组件
<AppleButton variant="primary">
  按钮
</AppleButton>
```

### 错误3：忽略响应式

```tsx
// ❌ 错误：固定宽度
<div style={{ width: '1200px' }}>
  内容
</div>

// ✅ 正确：使用响应式类名
<div className="w-full max-w-7xl mx-auto px-6">
  内容
</div>
```

---

## 🔄 迁移现有代码

### 步骤1：识别需要迁移的组件

查找项目中的自定义组件：

```bash
# 查找按钮组件
grep -r "className.*button" app/src/components

# 查找卡片组件
grep -r "rounded-lg.*shadow" app/src/components
```

### 步骤2：替换为标准组件

```tsx
// 之前
const MyButton = ({ children, onClick }) => (
  <button
    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
    onClick={onClick}
  >
    {children}
  </button>
);

// 之后
import { AppleButton } from '@/components/apple-design';

const MyButton = ({ children, onClick }) => (
  <AppleButton variant="primary" onClick={onClick}>
    {children}
  </AppleButton>
);
```

### 步骤3：验证效果

1. 运行开发服务器
2. 查看组件展示页
3. 对比迁移前后的效果
4. 确保交互行为一致

---

## 📚 相关资源

- [组件展示页面](/design-showcase) - 查看所有组件的实际效果
- [完整设计系统指南](./APPLE_DESIGN_SYSTEM_GUIDE.md) - 深入了解设计系统
- [Apple HIG](https://developer.apple.com/design/human-interface-guidelines/) - 官方设计指南

---

## 💡 下一步

1. **立即开始**：在新功能中使用标准组件
2. **逐步迁移**：将现有组件迁移到设计系统
3. **反馈问题**：遇到问题及时反馈给设计团队
4. **保持更新**：关注设计系统的版本更新

---

**记住**：统一的设计系统是高质量UI的基础。使用标准组件可以让开发更高效，让产品更专业！
