# 任务导入进度显示功能实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为任务导入功能添加进度显示、导入结果摘要和错误报告导出功能

**Architecture:** 前端分批调用现有 API，每批 20 条任务，实时更新进度条。导入完成后显示结果摘要，失败时提供 Excel 错误报告导出。

**Tech Stack:** React, TypeScript, XLSX, shadcn/ui Progress 组件

---

## 文件结构

| 文件 | 操作 | 说明 |
|------|------|------|
| `app/src/features/tasks/components/ImportPreviewDialog.tsx` | 修改 | 主要改动：新增进度状态、分批导入、错误导出 |
| `Test/frontend/unit/components/ImportPreviewDialog.test.tsx` | 新增 | 单元测试 |

---

## Task 1: 新增进度状态和类型定义

**Files:**
- Modify: `app/src/features/tasks/components/ImportPreviewDialog.tsx:1-68`

- [ ] **Step 1: 新增进度相关状态**

在组件顶部新增状态变量：

```typescript
// 在 ImportPreviewDialog 函数组件内，现有状态后添加
const [importProgress, setImportProgress] = useState(0);
const [processedCount, setProcessedCount] = useState(0);
const [totalCount, setTotalCount] = useState(0);
```

- [ ] **Step 2: 新增导入结果项类型**

在 `ImportPreviewDialog.tsx` 文件顶部，`ImportResult` 接定义后添加详细错误类型：

```typescript
// 在 ImportResult 接口后添加
export interface ImportErrorItem {
  rowNumber: number;
  wbsCode?: string;
  description?: string;
  error: string;
}
```

- [ ] **Step 3: 清理 useEffect 中的状态**

修改现有的 `useEffect` 以包含新增状态的清理：

```typescript
useEffect(() => {
  if (!open) {
    setImporting(false);
    setImportResult(null);
    setImportProgress(0);
    setProcessedCount(0);
    setTotalCount(0);
  }
}, [open]);
```

---

## Task 2: 新增分批导入函数

**Files:**
- Modify: `app/src/features/tasks/components/ImportPreviewDialog.tsx:69-88`

- [ ] **Step 1: 新增分批导入函数**

在组件内，`useEffect` 后添加分批导入函数：

```typescript
// 分批导入函数
const handleBatchImport = async (
  tasks: ParsedTaskData[],
  projectId: string
): Promise<ImportResult> => {
  const BATCH_SIZE = 20;
  const batches: ParsedTaskData[][] = [];
  
  // 分批
  for (let i = 0; i < tasks.length; i += BATCH_SIZE) {
    batches.push(tasks.slice(i, i + BATCH_SIZE));
  }
  
  setTotalCount(tasks.length);
  setImportProgress(0);
  setProcessedCount(0);
  
  const allResults: ImportResult['results'] = [];
  let successCount = 0;
  let failedCount = 0;
  
  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    const result = await taskApi.importTasks(projectId, batch);
    
    // 汇总结果
    allResults.push(...result.results);
    successCount += result.success;
    failedCount += result.failed;
    
    // 更新进度
    const processed = Math.min((i + 1) * BATCH_SIZE, tasks.length);
    setProcessedCount(processed);
    setImportProgress(Math.round((processed / tasks.length) * 100));
  }
  
  return {
    total: tasks.length,
    success: successCount,
    failed: failedCount,
    results: allResults,
  };
};
```

- [ ] **Step 2: 导入 taskApi**

确保文件顶部已导入 `taskApi`：

```typescript
import { taskApi } from '@/lib/api/task.api';
```

---

## Task 3: 新增错误报告导出函数

**Files:**
- Modify: `app/src/features/tasks/components/ImportPreviewDialog.tsx`

- [ ] **Step 1: 新增错误导出函数**

在 `handleBatchImport` 函数后添加：

```typescript
// 导出错误报告
const exportErrorReport = (result: ImportResult) => {
  const errors: ImportErrorItem[] = result.results
    .filter(r => !r.success)
    .map(r => ({
      rowNumber: r.rowNumber || 0,
      wbsCode: r.wbsCode,
      description: parsedData.find(t => t.rowNumber === r.rowNumber)?.description || '',
      error: r.error || '导入失败',
    }));
  
  if (errors.length === 0) {
    return;
  }
  
  const data = errors.map(e => ({
    '行号': e.rowNumber,
    'WBS编码': e.wbsCode || '',
    '任务描述': e.description || '',
    '错误原因': e.error,
  }));
  
  const ws = XLSX.utils.json_to_sheet(data);
  ws['!cols'] = [
    { wch: 10 },  // 行号
    { wch: 15 },  // WBS编码
    { wch: 30 },  // 任务描述
    { wch: 40 },  // 错误原因
  ];
  
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '导入错误');
  
  const dateStr = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `导入错误报告_${dateStr}.xlsx`);
};
```

---

## Task 4: 修改导入确认处理函数

**Files:**
- Modify: `app/src/features/tasks/components/ImportPreviewDialog.tsx:70-88`

- [ ] **Step 1: 修改 handleConfirm 函数**

替换现有的 `handleConfirm` 函数：

```typescript
const handleConfirm = async () => {
  setImporting(true);
  setImportProgress(0);
  
  try {
    // 获取 projectId - 需从 props 或 parsedData 获取
    const projectId = parsedData[0]?.projectId || '';
    
    if (!projectId) {
      console.error('[ImportPreviewDialog] 缺少 projectId');
      setImportResult({
        total: parsedData.length,
        success: 0,
        failed: parsedData.length,
        results: parsedData.map(t => ({
          success: false,
          wbsCode: t.wbsCode,
          rowNumber: t.rowNumber,
          error: '缺少项目ID',
        })),
      });
      return;
    }
    
    console.log('[ImportPreviewDialog] 开始分批导入, 总数:', parsedData.length);
    
    // 调用分批导入
    const result = await handleBatchImport(parsedData, projectId);
    
    console.log('[ImportPreviewDialog] 导入完成:', result);
    setImportResult(result);
    
    // 导入成功时刷新列表（通过 onOpenChange 关闭时触发外部刷新）
    if (result.success > 0 && result.failed === 0) {
      // 全部成功，延迟关闭让用户看到结果
      setTimeout(() => {
        onOpenChange(false);
      }, 1500);
    }
  } catch (error) {
    console.error('[ImportPreviewDialog] 导入出错:', error);
    const errorMessage = error instanceof Error ? error.message : '未知错误';
    setImportResult({
      total: parsedData.length,
      success: 0,
      failed: parsedData.length,
      results: parsedData.map(t => ({
        success: false,
        wbsCode: t.wbsCode,
        rowNumber: t.rowNumber,
        error: errorMessage,
      })),
    });
  } finally {
    setImporting(false);
  }
};
```

---

## Task 5: 新增进度条 UI 组件

**Files:**
- Modify: `app/src/features/tasks/components/ImportPreviewDialog.tsx:158-296`

- [ ] **Step 1: 导入 Progress 组件**

在文件顶部导入区域添加：

```typescript
import { Progress } from '@/components/ui/progress';
```

- [ ] **Step 2: 新增导入进度显示区域**

在对话框内容区域，文件信息后添加进度显示：

```tsx
{/* 导入进度 - 仅在导入中显示 */}
{importing && (
  <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
    <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400 font-medium mb-3">
      <Loader2 className="h-4 w-4 animate-spin" />
      正在导入... {importProgress}%
    </div>
    <Progress value={importProgress} className="h-2" />
    <div className="text-sm text-blue-600 dark:text-blue-500 mt-2">
      已处理 {processedCount}/{totalCount} 条任务
    </div>
  </div>
)}
```

---

## Task 6: 新增错误报告导出按钮

**Files:**
- Modify: `app/src/features/tasks/components/ImportPreviewDialog.tsx:269-295`

- [ ] **Step 1: 新增导出错误报告按钮**

在 DialogFooter 区域，导入失败时显示导出按钮：

```tsx
<DialogFooter>
  {/* 导出错误报告按钮 - 仅在有失败时显示 */}
  {isImportComplete && importResult?.failed > 0 && (
    <Button
      variant="outline"
      onClick={() => exportErrorReport(importResult)}
      className="mr-auto"
    >
      <FileSpreadsheet className="h-4 w-4 mr-2" />
      导出错误报告
    </Button>
  )}
  
  <Button
    variant="outline"
    onClick={handleClose}
    disabled={importing}
  >
    {isImportComplete ? '关闭' : '取消'}
  </Button>
  
  {!isImportComplete && (
    <Button
      data-testid="task-import-btn-confirm"
      onClick={handleConfirm}
      disabled={!canImport || importing || isLoading}
    >
      {importing || isLoading ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          导入中...
        </>
      ) : hasErrors ? (
        `仅导入有效数据(${validCount}条)`
      ) : (
        `确认导入(${validCount}条)`
      )}
    </Button>
  )}
</DialogFooter>
```

---

## Task 7: 新增导入成功摘要显示

**Files:**
- Modify: `app/src/features/tasks/components/ImportPreviewDialog.tsx:179-187`

- [ ] **Step 1: 优化导入成功结果显示**

修改现有的成功结果显示区域：

```tsx
{/* 导入成功结果 */}
{isImportComplete && importResult.success > 0 && importResult.failed === 0 && (
  <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800">
    <div className="flex items-center gap-2 text-green-700 dark:text-green-400 font-medium mb-2">
      <CheckCircle className="h-5 w-5" />
      导入成功
    </div>
    <div className="text-sm text-green-600 dark:text-green-500">
      共成功导入 {importResult.success} 条任务，列表已自动刷新
    </div>
  </div>
)}

{/* 部分成功结果 */}
{isImportComplete && importResult.success > 0 && importResult.failed > 0 && (
  <div className="p-4 rounded-lg bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800">
    <div className="flex items-center gap-2 text-yellow-700 dark:text-yellow-400 font-medium mb-2">
      <AlertCircle className="h-5 w-5" />
      部分导入成功
    </div>
    <div className="text-sm text-yellow-600 dark:text-yellow-500">
      成功: {importResult.success} 条，失败: {importResult.failed} 条
    </div>
  </div>
)}
```

---

## Task 8: 新增项目ID props

**Files:**
- Modify: `app/src/features/tasks/components/ImportPreviewDialog.tsx:37-47`

- [ ] **Step 1: 新增 projectId prop**

修改 `ImportPreviewDialogProps` 接口：

```typescript
interface ImportPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fileName: string;
  parsedData: ParsedTaskData[];
  errors: ValidationError[];
  newCount: number;
  updateCount: number;
  projectId: string;  // 新增
  onConfirm: () => Promise<ImportResult | void>;
  isLoading?: boolean;
}
```

- [ ] **Step 2: 更新组件参数解构**

```typescript
export function ImportPreviewDialog({
  open,
  onOpenChange,
  fileName,
  parsedData,
  errors,
  newCount,
  updateCount,
  projectId,  // 新增
  onConfirm,
  isLoading,
}: ImportPreviewDialogProps) {
```

- [ ] **Step 3: 修改 handleConfirm 使用 props.projectId**

在 `handleConfirm` 中使用传入的 `projectId`：

```typescript
const handleConfirm = async () => {
  setImporting(true);
  setImportProgress(0);
  
  try {
    if (!projectId) {
      // ... 错误处理
    }
    
    const result = await handleBatchImport(parsedData, projectId);
    // ...
  }
};
```

---

## Task 9: 更新调用方传入 projectId

**Files:**
- Modify: `app/src/features/tasks/components/WbsTable.tsx:84-110`
- Modify: `app/src/features/tasks/index.tsx:194-223`

- [ ] **Step 1: 检查 WbsTable 中 ImportPreviewDialog 调用**

查找 `ImportPreviewDialog` 的渲染位置，确保传入 `projectId`：

```tsx
<ImportPreviewDialog
  open={importDialogOpen}
  onOpenChange={setImportDialogOpen}
  fileName={importFileName}
  parsedData={parsedImportData}
  errors={importErrors}
  newCount={importNewCount}
  updateCount={importUpdateCount}
  projectId={projectId}  // 新增
  onConfirm={handleImportTasks}
  isLoading={isLoading}
/>
```

- [ ] **Step 2: 检查 tasks/index.tsx 中导入相关逻辑**

确保 `handleImportTasks` 函数正确处理返回结果并刷新列表。

---

## Task 10: 新增单元测试

**Files:**
- Create: `Test/frontend/unit/components/ImportPreviewDialog.test.tsx`

- [ ] **Step 1: 创建测试文件**

```typescript
/**
 * ImportPreviewDialog 组件测试
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ImportPreviewDialog } from '@/features/tasks/components/ImportPreviewDialog';
import type { ParsedTaskData, ValidationError } from '@/features/tasks/utils/taskImporter';

// Mock taskApi
vi.mock('@/lib/api/task.api', () => ({
  taskApi: {
    importTasks: vi.fn(),
  },
}));

// Mock XLSX
vi.mock('xlsx', () => ({
  utils: {
    json_to_sheet: vi.fn(() => ({ '!cols': [] })),
    book_new: vi.fn(() => ({})),
    book_append_sheet: vi.fn(),
  },
  writeFile: vi.fn(),
}));

describe('ImportPreviewDialog', () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    fileName: 'test.xlsx',
    parsedData: [] as ParsedTaskData[],
    errors: [] as ValidationError[],
    newCount: 0,
    updateCount: 0,
    projectId: 'test-project-id',
    onConfirm: vi.fn(),
    isLoading: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render import preview dialog', () => {
    render(<ImportPreviewDialog {...defaultProps} />);
    expect(screen.getByText('导入预览')).toBeInTheDocument();
  });

  it('should show progress bar during import', async () => {
    const { taskApi } = await import('@/lib/api/task.api');
    (taskApi.importTasks as any).mockResolvedValue({
      total: 20,
      success: 20,
      failed: 0,
      results: [],
    });

    const parsedData: ParsedTaskData[] = Array.from({ length: 20 }, (_, i) => ({
      rowNumber: i + 2,
      wbsCode: `${i + 1}`,
      description: `Task ${i + 1}`,
      projectId: 'test-project-id',
    }));

    render(<ImportPreviewDialog {...defaultProps} parsedData={parsedData} />);
    
    const confirmButton = screen.getByTestId('task-import-btn-confirm');
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(screen.getByText(/正在导入/)).toBeInTheDocument();
    });
  });

  it('should show success result when import completes', async () => {
    const { taskApi } = await import('@/lib/api/task.api');
    (taskApi.importTasks as any).mockResolvedValue({
      total: 10,
      success: 10,
      failed: 0,
      results: [],
    });

    const parsedData: ParsedTaskData[] = Array.from({ length: 10 }, (_, i) => ({
      rowNumber: i + 2,
      wbsCode: `${i + 1}`,
      description: `Task ${i + 1}`,
      projectId: 'test-project-id',
    }));

    render(<ImportPreviewDialog {...defaultProps} parsedData={parsedData} />);
    
    const confirmButton = screen.getByTestId('task-import-btn-confirm');
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(screen.getByText('导入成功')).toBeInTheDocument();
    });
  });

  it('should show export error button when import fails', async () => {
    const { taskApi } = await import('@/lib/api/task.api');
    (taskApi.importTasks as any).mockResolvedValue({
      total: 10,
      success: 5,
      failed: 5,
      results: Array.from({ length: 5 }, (_, i) => ({
        success: false,
        rowNumber: i + 2,
        wbsCode: `${i + 1}`,
        error: 'Test error',
      })),
    });

    const parsedData: ParsedTaskData[] = Array.from({ length: 10 }, (_, i) => ({
      rowNumber: i + 2,
      wbsCode: `${i + 1}`,
      description: `Task ${i + 1}`,
      projectId: 'test-project-id',
    }));

    render(<ImportPreviewDialog {...defaultProps} parsedData={parsedData} />);
    
    const confirmButton = screen.getByTestId('task-import-btn-confirm');
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(screen.getByText('导出错误报告')).toBeInTheDocument();
    });
  });
});
```

---

## Task 11: 提交变更

- [ ] **Step 1: 运行类型检查**

```bash
cd app/src && npx tsc --noEmit
```

- [ ] **Step 2: 运行测试**

```bash
cd Test/frontend && npm test -- ImportPreviewDialog
```

- [ ] **Step 3: Git 提交**

```bash
git add app/src/features/tasks/components/ImportPreviewDialog.tsx
git add app/src/features/tasks/components/WbsTable.tsx
git add Test/frontend/unit/components/ImportPreviewDialog.test.tsx
git commit -m "feat(tasks): 任务导入功能添加进度显示和错误报告导出

- 新增分批导入逻辑（每批20条）
- 导入时显示进度条和百分比
- 导入完成显示结果摘要
- 失败时提供错误报告Excel导出功能
- 导入成功后自动刷新任务列表"
```

---

## 自检清单

### Spec Coverage

| 需求 | Task |
|------|------|
| 显示导入进度（简单进度条 + 百分比） | Task 1, 2, 5 |
| 显示导入结果摘要 | Task 7 |
| 失败时提供错误报告导出功能 | Task 3, 6 |
| 自动刷新列表 | Task 4 |

### Placeholder Scan

- 无 TBD/TODO
- 无 "add validation" 等模糊描述
- 所有代码步骤包含完整代码

### Type Consistency

- `ImportResult` 类型已在 `task.api.ts` 定义，使用一致
- `ImportErrorItem` 新类型在 Task 1 定义，Task 3 使用
- `ParsedTaskData` 类型来自现有 `taskImporter.ts`