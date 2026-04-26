# 任务导入进度显示功能设计

> 创建日期: 2026-04-27
> 状态: 待实现

## 1. 需求概述

任务管理模块导入功能增强：
1. 显示导入进度（简单进度条 + 百分比）
2. 显示导入结果摘要
3. 失败时提供错误报告导出功能

## 2. 用户交互流程

```
用户点击"导入" → 选择文件 → 预览对话框(显示解析结果)
       ↓
用户点击"确认导入"
       ↓
显示进度条(分批处理) ──→ 每批完成后更新百分比
       ↓
导入完成
├─ 全部成功 → 显示成功摘要 → 关闭对话框 → 自动刷新列表
└─ 部分失败 → 显示失败数量 + "导出错误报告"按钮
```

## 3. 技术方案

### 3.1 方案选型

**选择：前端分批调用**

| 维度 | 说明 |
|------|------|
| 后端改动 | 无需修改，复用现有 `importTasks` API |
| 前端改动 | 中等，新增分批逻辑和进度状态 |
| 进度精度 | 较高（按批次更新） |
| 批次大小 | 20 条/批 |

### 3.2 前端改动

**文件**: `app/src/features/tasks/components/ImportPreviewDialog.tsx`

| 模块 | 改动 |
|------|------|
| 进度状态 | 新增 `progress`、`processedCount`、`totalCount` 状态 |
| 分批导入 | 新增 `handleBatchImport` 函数，每批 20 条调用 API |
| 进度条 UI | 使用 shadcn `Progress` 组件显示百分比 |
| 错误导出 | 新增 `exportErrorReport` 函数，生成 Excel 文件 |
| 成功处理 | 导入完成后调用 `queryClient.invalidateQueries` 刷新列表 |

### 3.3 错误报告格式

导出的 Excel 文件包含以下列：

| 列名 | 说明 |
|------|------|
| 行号 | Excel 原始行号 |
| WBS编码 | 任务编码 |
| 任务描述 | 任务内容 |
| 错误原因 | 具体失败原因 |

## 4. 界面设计

### 4.1 导入中状态

```
┌─────────────────────────────────────────────┐
│  导入进度                                    │
├─────────────────────────────────────────────┤
│                                             │
│  正在导入... 45%                             │
│  ████████████████░░░░░░░░░░░░░░░░░░░░░░░░  │
│  已处理 90/200 条任务                        │
│                                             │
└─────────────────────────────────────────────┘
```

### 4.2 导入完成（成功）

```
┌─────────────────────────────────────────────┐
│  导入结果                                    │
├─────────────────────────────────────────────┤
│                                             │
│  ✓ 导入成功                                 │
│  共导入 200 条任务                           │
│                                             │
│                    [查看任务]  [关闭]        │
└─────────────────────────────────────────────┘
```

### 4.3 导入完成（部分失败）

```
┌─────────────────────────────────────────────┐
│  导入结果                                    │
├─────────────────────────────────────────────┤
│                                             │
│  ⚠ 部分任务导入失败                          │
│  成功: 180 条  失败: 20 条                   │
│                                             │
│  失败原因示例:                               │
│  • 行 15: WBS编码格式无效: 1.a               │
│  • 行 23: 父任务不存在: 2.1                   │
│                                             │
│  [导出错误报告]        [关闭]                │
└─────────────────────────────────────────────┘
```

## 5. 核心代码结构

```typescript
// ImportPreviewDialog.tsx 改动点

// 新增状态
const [importProgress, setImportProgress] = useState(0);
const [processedCount, setProcessedCount] = useState(0);
const [isImporting, setIsImporting] = useState(false);

// 分批导入函数
const handleBatchImport = async (tasks: ParsedTaskData[]) => {
  const BATCH_SIZE = 20;
  const batches = chunk(tasks, BATCH_SIZE);
  const allResults: ImportResultItem[] = [];
  
  for (let i = 0; i < batches.length; i++) {
    const result = await taskApi.importTasks(projectId, batches[i]);
    allResults.push(...result.results);
    setProcessedCount(Math.min((i + 1) * BATCH_SIZE, tasks.length));
    setImportProgress(((i + 1) / batches.length) * 100);
  }
  
  return allResults;
};

// 导出错误报告
const exportErrorReport = (errors: ImportError[]) => {
  const data = errors.map(e => ({
    '行号': e.rowNumber,
    'WBS编码': e.wbsCode,
    '任务描述': e.description,
    '错误原因': e.error
  }));
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '导入错误');
  XLSX.writeFile(wb, `导入错误报告_${new Date().toISOString().slice(0,10)}.xlsx`);
};
```

## 6. 实现范围

### 需要修改的文件

1. `app/src/features/tasks/components/ImportPreviewDialog.tsx` - 主要改动
2. `app/src/features/tasks/utils/taskImporter.ts` - 新增 `ImportResultItem` 类型（如需要）

### 不需要修改的文件

- 后端 API（复用现有 `POST /tasks/import`）
- 其他前端组件

## 7. 测试要点

1. **进度显示**：导入 50+ 条任务时，进度条应正确更新
2. **成功场景**：全部成功时显示成功摘要，列表自动刷新
3. **失败场景**：部分失败时显示失败数量，点击导出生成正确 Excel
4. **错误报告**：导出的 Excel 包含正确的行号、WBS编码、错误原因
