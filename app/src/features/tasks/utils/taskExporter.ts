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
  { key: 'id', label: 'ID', width: 36, editable: false },
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
  includeHistory: boolean
): Record<string, unknown> {
  const row: Record<string, unknown> = {};

  EXCEL_COLUMNS.forEach(col => {
    const value = (task as any)[col.key];

    switch (col.key) {
      case 'id':
        row['ID'] = task.id;
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

  // 准备数据
  const data = tasks.map(task => taskToRow(task, options.includeHistory));

  // 添加表头
  const headers = EXCEL_COLUMNS.map(c => c.label);
  data.unshift(headers as unknown as Record<string, unknown>);

  // 创建工作表
  const ws = XLSX.utils.aoa_to_sheet(data as unknown[][], {
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
  // 创建示例数据
  const sampleData = [
    {
      'ID': '',
      'WBS编码': '1',
      'WBS等级': 1,
      '任务描述': '示例任务（请删除此行）',
      '任务状态': '未开始',
      'Redmine链接': 'https://redmine.example.com/issues/123',
      '负责人': '张三',
      '任务类型': '固件',
      '优先级': '中',
      '前置任务WBS': '',
      '提前/落后天数': 0,
      '开始日期': new Date().toISOString().split('T')[0],
      '工期(天)': 5,
      '单休': '否',
      '结束日期': '',
      '预警天数': 3,
      '实际开始': '',
      '实际结束': '',
      '全职比(%)': 100,
      '项目名称': '',
      '延期次数': 0,
      '延期历史': '',
      '计划调整次数': 0,
      '计划调整历史': '',
      '进展记录数': 0,
      '进展记录': '',
    },
  ];

  // 准备数据
  const data: Record<string, unknown>[] = [];

  // 添加表头
  data.push(EXCEL_COLUMNS.map(c => c.label) as unknown as Record<string, unknown>);

  // 添加示例数据
  sampleData.forEach(sample => {
    const row: Record<string, unknown> = {};
    EXCEL_COLUMNS.forEach(col => {
      row[col.label] = sample[col.label as keyof typeof sample] ?? '';
    });
    data.push(row);
  });

  // 创建工作表
  const ws = XLSX.utils.aoa_to_sheet(data as unknown[][]);

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
