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
