# WBS 表全部折叠功能设计

## 概述

在任务管理模块的 WBS（工作分解结构）表中，增加一键折叠所有子层级任务的快捷操作按钮。折叠后保留顶层任务可见，用户可通过行内箭头逐个展开子任务。

## 需求

- **功能**：一键折叠所有子层级任务
- **按钮位置**：工具栏右侧，导出按钮和列设置之间
- **折叠效果**：只保留顶层任务展开，所有子层级折叠
- **后续操作**：用户可正常通过行内箭头逐个展开任意子任务

## 技术方案

### 方案选择：最小改动（方案 A）

仅修改 `WbsTable.tsx` 一个文件，直接在组件内添加折叠逻辑和按钮。

**选择理由**：当前只需全部折叠一个操作，遵循 YAGNI 原则。现有 `toggleRow` 函数和 `expandedRows` 状态完全保留，折叠全部只是重置 Set。

### 变更清单

**文件**：`app/src/features/tasks/components/WbsTable.tsx`

1. **新增导入**：`ChevronsUp` 图标（`lucide-react`）
2. **新增函数**：`handleCollapseAll` — 计算顶层可展开任务 ID 集合，设置为 `expandedRows`
3. **新增按钮**：工具栏右侧，`ghost` + `icon` 样式

### 核心逻辑

```typescript
const handleCollapseAll = useCallback(() => {
  const topLevelIds = new Set(
    tasks
      .filter(t => t.hasChildren)
      .map(t => t.id)
  );
  setExpandedRows(topLevelIds);
}, [tasks]);
```

- `tasks` 是顶层任务数组（非嵌套 children）
- 过滤出 `hasChildren` 的顶层任务，保留其展开状态
- 所有子层级的展开状态被清除（不在 Set 中 = 折叠）

### 按钮样式

遵循 `MemberTreeSelector` 中的既定模式：

```tsx
<Button
  variant="ghost"
  size="icon"
  className="h-8 w-8"
  onClick={handleCollapseAll}
  title="全部折叠"
>
  <ChevronsUp className="h-4 w-4" />
</Button>
```

### 不变更的部分

- `toggleRow` 函数：保持原样，用户折叠全部后仍可逐个展开
- `expandedRows` 状态结构：保持 `Set<string>` 不变
- `allExpandableIds`：保持现有计算逻辑
- 键盘快捷键：不新增快捷键
- localStorage 持久化：不持久化折叠状态

## 影响范围

- **前端**：`WbsTable.tsx` 约 15 行新增代码
- **后端**：无变更
- **数据库**：无变更
- **测试**：需验证折叠后可逐个展开

## 验收标准

1. 点击"全部折叠"按钮后，所有子层级任务折叠，只显示顶层任务
2. 折叠后点击任意顶层任务的展开箭头，能正常展开其子任务
3. 按钮位于工具栏右侧，样式与现有按钮一致
4. 不影响现有的行内折叠/展开功能
