# WBS 表格 - 配置驱动的多列 Sticky 固定方案

> 日期: 2026-04-28
> 状态: 待实施

## 背景

WBS 表格当前只有操作列（Column 0）使用硬编码 `isFirstCol` 判断实现 sticky 固定。用户希望任务描述列（Column 3）在水平滚动到左边界后也能固定，与操作列并排显示。

## 目标

1. 将 sticky 列行为从硬编码改为配置驱动
2. 重构操作列的现有 sticky 逻辑，统一纳入配置系统
3. 新增任务描述列的 sticky 固定
4. 不影响 WBS 表的导入导出功能

## 影响范围分析

- **导入导出不受影响**：`taskExporter.ts` 使用独立的 `EXCEL_COLUMNS` 定义，不引用 `columnConfig.ts` 的渲染属性
- **影响文件**：`columnConfig.ts`、`WbsTable.tsx`、`TaskRow.tsx`

## 设计

### 1. 配置层变更（`columnConfig.ts`）

#### 类型定义新增字段

在 `WbsColumn` 类型中新增可选字段：

```typescript
sticky?: boolean;  // 是否固定在左侧
```

#### 列配置更新

```typescript
// 操作列 (index 0)
{ id: 'actions', sticky: true, ... }

// 任务描述列 (index 3)
{ id: 'description', sticky: true, ... }
```

其他 24 列不添加 `sticky` 字段，默认为 `undefined`（非固定）。

### 2. 渲染逻辑变更

#### Sticky offset 计算算法

在 `visibleColumns.map()` 回调中，为每个 sticky 列计算 `left` 偏移量：

```
对于当前列 col：
1. 遍历 visibleColumns 中排在 col 之前的所有列 prevCol
2. 如果 prevCol.sticky === true，累加 prevCol.width 到 offset
3. 如果 col.sticky === true，使用 offset 作为 left 值
```

#### Z-index 层级

| 列 | 表头 z-index | 表体 z-index | 说明 |
|---|---|---|---|
| 操作列 | z-30 | z-[6] | 最高层级，始终在最前 |
| 描述列 | z-20 | z-[5] | 第二层级，贴在操作列右边 |
| 普通列 | 无 | 无 | 正常滚动 |

#### 样式规则

**操作列（left: 0）**：保持现有样式不变。
- 表头：`sticky left-0 bg-gray-50 dark:bg-gray-800 z-30`
- 表体：`sticky left-0 bg-background dark:bg-gray-900 z-[6]`
- 右侧阴影：`shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)] dark:shadow-[2px_0_4px_-2px_rgba(0,0,0,0.3)]`

**描述列（left: 操作列宽度 px）**：新增 sticky 样式。
- 表头：`sticky bg-gray-50 dark:bg-gray-800 z-20`，left 为操作列宽度
- 表体：`sticky bg-background dark:bg-gray-900 z-[5]`，left 为操作列宽度
- 左侧阴影：`shadow-[-2px_0_4px_-2px_rgba(0,0,0,0.1)] dark:shadow-[-2px_0_4px_-2px_rgba(0,0,0,0.3)]`

#### 代码变更模式（3 处统一）

**Before**（硬编码）：
```tsx
const isFirstCol = colIndex === 0;
// ...
className={`... ${isFirstCol ? 'sticky left-0 bg-background z-[5] ...' : ''}`}
style={{ left: isFirstCol ? 0 : undefined }}
```

**After**（配置驱动）：
```tsx
const isSticky = col.sticky === true;
const stickyLeft = isSticky ? calculateStickyOffset(visibleColumns, colIndex) : undefined;
// ...
className={`... ${isSticky ? `sticky bg-background z-[5] ...` : ''}`}
style={{ left: stickyLeft !== undefined ? `${stickyLeft}px` : undefined }}
```

### 3. 涉及文件

| 文件 | 改动内容 |
|------|---------|
| `app/src/features/tasks/components/columnConfig.ts` | 类型加 `sticky?`，操作列和描述列配置加 `sticky: true` |
| `app/src/features/tasks/components/WbsTable.tsx` | 表头和表体列渲染：移除 `isFirstCol`，改用配置驱动的 sticky 逻辑 |
| `app/src/features/tasks/components/TaskRow.tsx` | 行内列渲染：同上 |

### 4. 边界情况

- **描述列被隐藏**：通过 `visibleColumns` 过滤，隐藏后不参与 sticky 计算
- **操作列被隐藏**：`canHide: false`，不会发生
- **两列 sticky 总宽度**：120 + 250 = 370px，表格容器宽度小于此值时可能出现两列占满表格的情况，需注意最小宽度约束
- **列宽调整**：当前 sticky offset 在渲染时动态计算，基于 `col.width` 值，如果列宽可拖拽调整，offset 会自动跟随

### 5. 不影响的功能

- WBS 导入：`taskImporter.ts` 使用独立的列映射，不引用 `columnConfig.ts`
- WBS 导出：`taskExporter.ts` 使用 `EXCEL_COLUMNS`，不引用 `columnConfig.ts`
- 列排序、筛选、内联编辑：这些功能基于列的 `id` 和 `dataType`，不受 `sticky` 字段影响
- 虚拟滚动：sticky 是 CSS 属性，与虚拟滚动逻辑无关
