/**
 * WBS任务导出工具
 * 将任务列表导出为Excel文件
 */
import * as XLSX from 'xlsx';
import type { WBSTaskListItem, TaskType, TaskPriority } from '../types';
import { TASK_STATUS_LABELS, TASK_TYPE_LABELS, TASK_PRIORITY_LABELS } from '../types';
import type { Member } from '@/features/org/types';

/** Excel列配置 */
interface ExcelColumn {
  key: string;
  label: string;
  width: number;
  editable: boolean;
}

/** 列定义 */
const EXCEL_COLUMNS: ExcelColumn[] = [
  { key: 'index', label: '序号', width: 8, editable: false },
  { key: 'wbsCode', label: 'WBS编码', width: 12, editable: false },
  { key: 'wbsLevel', label: 'WBS等级', width: 10, editable: true },
  { key: 'description', label: '任务描述', width: 30, editable: true },
  { key: 'status', label: '任务状态', width: 12, editable: false },
  { key: 'redmineLink', label: 'Redmine链接', width: 25, editable: true },
  { key: 'assigneeName', label: '负责人', width: 12, editable: true },
  { key: 'taskType', label: '任务类型', width: 12, editable: true },
  { key: 'priority', label: '优先级', width: 10, editable: true },
  { key: 'predecessorWbs', label: '前置任务WBS', width: 15, editable: true },
  { key: 'lagDays', label: '提前/落后天数', width: 14, editable: true },
  { key: 'startDate', label: '开始日期', width: 12, editable: true },
  { key: 'duration', label: '工期(天)', width: 10, editable: true },
  { key: 'isSixDayWeek', label: '单休', width: 8, editable: true },
  { key: 'endDate', label: '结束日期', width: 12, editable: false },
  { key: 'warningDays', label: '预警天数', width: 10, editable: true },
  { key: 'actualStartDate', label: '实际开始', width: 12, editable: true },
  { key: 'actualEndDate', label: '实际结束', width: 12, editable: true },
  { key: 'fullTimeRatio', label: '全职比(%)', width: 12, editable: true },
  { key: 'projectName', label: '项目名称', width: 20, editable: false },
  { key: 'delayCount', label: '延期次数', width: 10, editable: false },
  { key: 'delayHistory', label: '延期历史', width: 30, editable: false },
  { key: 'planChangeCount', label: '计划调整次数', width: 14, editable: false },
  { key: 'planChangeHistory', label: '计划调整历史', width: 30, editable: false },
  { key: 'progressRecordCount', label: '进展记录数', width: 12, editable: false },
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
function taskToRow(
  task: WBSTaskListItem,
  includeHistory: boolean,
  index: number
): Record<string, unknown> {
  const row: Record<string, unknown> = {};

  EXCEL_COLUMNS.forEach(col => {
    const value = (task as any)[col.key];

    switch (col.key) {
      case 'index':
        row['序号'] = index;
        break;
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
      case 'startDate':
      case 'endDate':
      case 'actualStartDate':
      case 'actualEndDate':
        row[col.label] = value || '';
        break;
      case 'predecessorWbs':
        row['前置任务WBS'] = task.predecessorWbs || '';
        break;
      case 'delayHistory':
        row['延期历史'] = includeHistory ? `延期次数: ${task.delayCount}` : '';
        break;
      case 'planChangeHistory':
        row['计划调整历史'] = includeHistory ? `调整次数: ${task.planChangeCount}` : '';
        break;
      case 'progressRecords':
        row['进展记录'] = includeHistory ? `记录数: ${task.progressRecordCount}` : '';
        break;
      case 'duration':
      case 'warningDays':
      case 'lagDays':
      case 'wbsLevel':
      case 'delayCount':
      case 'planChangeCount':
      case 'progressRecordCount':
        row[col.label] = value ?? '';
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

  // 添加任务数据行（序号从1开始）
  tasks.forEach((task, index) => {
    const taskRow = taskToRow(task, options.includeHistory, index + 1);
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
 * 下载导入模板
 */
export function downloadImportTemplate(): void {
  // 准备表头
  const headers = EXCEL_COLUMNS.map(c => c.label);

  // 准备示例数据行
  const sampleRow: unknown[] = [
    1, // 序号
    '1', // WBS编码
    1, // WBS等级
    '示例任务（请删除此行）', // 任务描述
    '未开始', // 任务状态
    'https://redmine.example.com/issues/123', // Redmine链接
    '张三', // 负责人
    '固件', // 任务类型
    '中', // 优先级
    '', // 前置任务WBS
    0, // 提前/落后天数
    new Date().toISOString().split('T')[0], // 开始日期
    5, // 工期(天)
    '否', // 单休
    '', // 结束日期
    3, // 预警天数
    '', // 实际开始
    '', // 实际结束
    100, // 全职比(%)
    '', // 项目名称
    0, // 延期次数
    '', // 延期历史
    0, // 计划调整次数
    '', // 计划调整历史
    0, // 进展记录数
    '', // 进展记录
  ];

  // 创建二维数组数据
  const rows: unknown[][] = [headers, sampleRow];

  // 创建工作表（使用 aoa_to_sheet 处理二维数组）
  const ws = XLSX.utils.aoa_to_sheet(rows);

  // 设置列宽
  const colWidths = EXCEL_COLUMNS.map(c => ({ wch: c.width }));
  ws['!cols'] = colWidths;

  // 冻结首行
  ws['!freeze'] = 'A1';

  // 创建工作簿
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '任务导入模板');

  // 下载文件
  XLSX.writeFile(wb, 'WBS任务导入模板.xlsx');
}
