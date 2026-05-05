/**
 * WBS任务导出工具
 * 将任务列表导出为Excel文件
 *
 * 列顺序与前端 WBS 表格一致（排除"操作"列）：
 * 1. WBS等级  2. WBS编码  3. 任务描述  4. 任务状态  5. Redmine链接
 * 6. 负责人   7. 任务类型  8. 优先级   9. 前置任务  10. 提前/落后
 * 11. 开始日期 12. 工期    13. 单休    14. 结束日期 15. 计划周期
 * 16. 预警天数 17. 实际开始 18. 实际结束 19. 实际工期 20. 全职比
 * 21. 实际周期 22. 项目编码 23. 项目名称 24. 延期次数 25. 延期历史
 * 26. 计划调整 27. 计划调整历史 28. 进展记录
 */
import * as XLSX from 'xlsx';
import type { WBSTaskListItem, TaskType, TaskPriority } from '../types';
import { TASK_STATUS_LABELS, TASK_TYPE_LABELS, TASK_PRIORITY_LABELS } from '../types';
import type { Member } from '@/features/org/types';
import { apiClient } from '@/lib/api/client';

/** Excel列配置 */
interface ExcelColumn {
  key: string;
  label: string;
  width: number;
  editable: boolean;
}

/** 列定义 - 与前端 WBS 表格列顺序一致，包含详细信息用于导入 */
const EXCEL_COLUMNS: ExcelColumn[] = [
  { key: 'wbsLevel', label: 'WBS等级', width: 10, editable: true },
  { key: 'wbsCode', label: 'WBS编码', width: 12, editable: false },
  { key: 'description', label: '任务描述', width: 30, editable: true },
  { key: 'status', label: '任务状态', width: 12, editable: false },
  { key: 'redmineLink', label: 'Redmine链接', width: 25, editable: true },
  { key: 'assigneeName', label: '负责人', width: 12, editable: true },
  { key: 'taskType', label: '任务类型', width: 12, editable: true },
  { key: 'priority', label: '优先级', width: 10, editable: true },
  { key: 'predecessorCode', label: '前置任务', width: 15, editable: true },
  { key: 'lagDays', label: '提前/落后', width: 12, editable: true },
  { key: 'startDate', label: '开始日期', width: 12, editable: true },
  { key: 'duration', label: '工期', width: 10, editable: true },
  { key: 'isSixDayWeek', label: '单休', width: 8, editable: true },
  { key: 'endDate', label: '结束日期', width: 12, editable: false },
  { key: 'plannedDuration', label: '计划周期', width: 10, editable: false },
  { key: 'warningDays', label: '预警天数', width: 10, editable: true },
  { key: 'actualStartDate', label: '实际开始', width: 12, editable: true },
  { key: 'actualEndDate', label: '实际结束', width: 12, editable: true },
  { key: 'actualDuration', label: '实际工期', width: 10, editable: false },
  { key: 'fullTimeRatio', label: '全职比(%)', width: 12, editable: true },
  { key: 'actualCycle', label: '实际周期', width: 10, editable: false },
  { key: 'projectCode', label: '项目编码', width: 15, editable: false },
  { key: 'projectName', label: '项目名称', width: 20, editable: false },
  { key: 'delayCount', label: '延期次数', width: 10, editable: false },
  { key: 'delayHistory', label: '延期历史', width: 30, editable: false },
  { key: 'planChangeCount', label: '计划调整', width: 10, editable: false },
  { key: 'planChangeHistory', label: '计划调整历史', width: 30, editable: false },
  { key: 'progressRecords', label: '进展记录', width: 30, editable: false },
];

/** 导出选项 */
export interface ExportOptions {
  includeHistory: boolean;
  projectName?: string;
}

/**
 * 将任务数据转换为行数据
 */
function taskToRow(task: WBSTaskListItem, includeHistory: boolean): Record<string, unknown> {
  const row: Record<string, unknown> = {};

  EXCEL_COLUMNS.forEach(col => {
    const value = (task as any)[col.key];

    switch (col.key) {
      case 'status':
        row['任务状态'] = TASK_STATUS_LABELS[task.status] || task.status;
        break;
      case 'taskType':
        row['任务类型'] = TASK_TYPE_LABELS[task.taskType] || task.taskType;
        break;
      case 'priority':
        row['优先级'] = TASK_PRIORITY_LABELS[task.priority] || task.priority;
        break;
      case 'isSixDayWeek':
        row['单休'] = task.isSixDayWeek ? '是' : '否';
        break;
      case 'fullTimeRatio':
        row['全职比(%)'] = task.fullTimeRatio ?? 100;
        break;
      case 'predecessorCode':
        row['前置任务'] = task.predecessorCode || '';
        break;
      case 'delayHistory':
        row['延期历史'] = includeHistory && task.delayCount > 0 ? `延期${task.delayCount}次` : '';
        break;
      case 'planChangeHistory':
        row['计划调整历史'] = includeHistory && task.planChangeCount > 0 ? `调整${task.planChangeCount}次` : '';
        break;
      case 'progressRecords':
        row['进展记录'] = includeHistory && task.progressRecordCount > 0 ? `${task.progressRecordCount}条记录` : '';
        break;
      default:
        row[col.label] = value ?? '';
    }
  });

  return row;
}

/**
 * 导出任务到Excel文件
 */
export async function exportTasksToExcel(
  tasks: WBSTaskListItem[],
  members: Member[],
  options: ExportOptions = { includeHistory: false }
): Promise<void> {
  if (tasks.length === 0) {
    throw new Error('没有可导出的任务');
  }

  // 准备表头
  const headers = EXCEL_COLUMNS.map(c => c.label);

  // 准备数据行（二维数组格式）
  const rows: unknown[][] = [headers];

  // 添加任务数据行
  tasks.forEach((task) => {
    const taskRow = taskToRow(task, options.includeHistory);
    const row: unknown[] = EXCEL_COLUMNS.map(col => taskRow[col.label] ?? '');
    rows.push(row);
  });

  // 创建工作表（使用 aoa_to_sheet 处理二维数组）
  const ws = XLSX.utils.aoa_to_sheet(rows, {
    cellStyles: true
  });

  // 设置列宽
  const colWidths = EXCEL_COLUMNS.map(c => ({ wch: c.width }));
  ws['!cols'] = colWidths;

  // 冻结首行
  ws['!freeze'] = 'A1';

  // 创建工作簿
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '任务列表');

  // 生成文件名
  const dateStr = new Date().toISOString().split('T')[0];
  const fileName = options.projectName
    ? `${options.projectName}_任务清单_${dateStr}.xlsx`
    : `WBS任务清单_${dateStr}.xlsx`;

  // 下载文件
  XLSX.writeFile(wb, fileName);
}

/**
 * 下载导入模板（调用后端 API，生成带数据验证的 Excel）
 */
export async function downloadImportTemplate(): Promise<void> {
  const response = await apiClient.get('/tasks/import/template', {
    responseType: 'arraybuffer',
  });

  // 检查响应是否为错误（arraybuffer 格式的 JSON 错误）
  if (response.data instanceof ArrayBuffer && response.data.byteLength > 0) {
    const contentType = response.headers['content-type'];
    if (contentType && contentType.includes('application/json')) {
      // 解析 JSON 错误响应
      const errorText = new TextDecoder().decode(response.data);
      const errorData = JSON.parse(errorText);
      throw new Error(errorData.error?.message || '下载模板失败');
    }
  }

  const blob = new Blob([response.data], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'WBS任务导入模板.xlsx';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

/**
 * 下载导入模板（带 Toast 提示）
 */
export async function downloadImportTemplateWithToast(
  toast: (options: { title: string; description?: string; variant?: 'default' | 'destructive' }) => void
): Promise<void> {
  toast({ title: '正在下载模板...' });

  try {
    await downloadImportTemplate();
    toast({ title: '模板下载成功', description: '文件已保存到本地' });
  } catch (error) {
    throw error;
  }
}
