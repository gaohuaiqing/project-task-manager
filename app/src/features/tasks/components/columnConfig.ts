/**
 * WBS 表格列配置
 * 严格按照需求文档 REQ_04_task.md 定义的24列规格
 *
 * 列号 0-24：
 * 0. 操作按钮
 * 1. WBS等级  2. WBS编码  3. 任务描述  4. 任务状态  5. Redmine链接
 * 6. 负责人   7. 任务类型  8. 优先级   9. 前置任务  10. 提前/落后
 * 11. 开始日期 12. 工期    13. 结束日期 14. 计划周期 15. 预警天数
 * 16. 实际开始 17. 实际结束 18. 实际工期 19. 全职比  20. 实际周期
 * 21. 项目     22. 延期次数 23. 计划调整 24. 进展记录
 */

/** 任务状态类型 - 9种状态 */
export type TaskStatus =
  | 'pending_approval'  // 待审批 - 紫色
  | 'rejected'          // 已驳回 - 红色
  | 'not_started'       // 未开始 - 灰色
  | 'in_progress'       // 进行中 - 蓝色
  | 'early_completed'   // 提前完成 - 绿色
  | 'on_time_completed' // 按时完成 - 青色
  | 'delay_warning'     // 延期预警 - 橙色
  | 'delayed'           // 已延迟 - 红色
  | 'overdue_completed'; // 超期完成 - 橙色

/** 任务类型 - 12种类型 */
export type TaskType =
  | 'firmware'        // 固件
  | 'board'           // 板卡
  | 'driver'          // 驱动
  | 'interface'       // 接口类
  | 'hw_recovery'     // 硬件恢复包
  | 'material_import' // 物料导入
  | 'material_sub'    // 物料改代
  | 'sys_design'      // 系统设计
  | 'core_risk'       // 核心风险
  | 'contact'         // 接口人
  | 'func_task'       // 职能任务
  | 'other';          // 其它

/** 优先级 */
export type TaskPriority = 'urgent' | 'high' | 'medium' | 'low';

/** 列编辑类型 */
export type ColumnEditType =
  | 'readonly'      // 只读
  | 'editable'      // 可编辑
  | 'computed'      // 计算字段
  | 'conditional';  // 条件可编辑

/** 列数据类型 */
export type ColumnDataType =
  | 'text'
  | 'number'
  | 'date'
  | 'select'
  | 'status'
  | 'link'
  | 'checkbox'
  | 'action';

/** 状态颜色配置 */
export const STATUS_COLORS: Record<TaskStatus, { bg: string; text: string; label: string }> = {
  pending_approval: { bg: 'bg-purple-100', text: 'text-purple-700', label: '待审批' },
  rejected: { bg: 'bg-red-100', text: 'text-red-700', label: '已驳回' },
  not_started: { bg: 'bg-gray-100', text: 'text-gray-600', label: '未开始' },
  in_progress: { bg: 'bg-blue-100', text: 'text-blue-700', label: '进行中' },
  early_completed: { bg: 'bg-green-100', text: 'text-green-700', label: '提前完成' },
  on_time_completed: { bg: 'bg-cyan-100', text: 'text-cyan-700', label: '按时完成' },
  delay_warning: { bg: 'bg-orange-100', text: 'text-orange-700', label: '延期预警' },
  delayed: { bg: 'bg-red-100', text: 'text-red-700', label: '已延迟' },
  overdue_completed: { bg: 'bg-orange-100', text: 'text-orange-700', label: '超期完成' },
};

/** 任务类型选项 */
export const TASK_TYPE_OPTIONS = [
  { value: 'firmware', label: '固件' },
  { value: 'board', label: '板卡' },
  { value: 'driver', label: '驱动' },
  { value: 'interface', label: '接口类' },
  { value: 'hw_recovery', label: '硬件恢复包' },
  { value: 'material_import', label: '物料导入' },
  { value: 'material_sub', label: '物料改代' },
  { value: 'sys_design', label: '系统设计' },
  { value: 'core_risk', label: '核心风险' },
  { value: 'contact', label: '接口人' },
  { value: 'func_task', label: '职能任务' },
  { value: 'other', label: '其它' },
];

/** 优先级选项 */
export const PRIORITY_OPTIONS = [
  { value: 'urgent', label: '紧急', color: 'bg-red-500' },
  { value: 'high', label: '高', color: 'bg-orange-500' },
  { value: 'medium', label: '中', color: 'bg-yellow-500' },
  { value: 'low', label: '低', color: 'bg-gray-400' },
];

/** 列配置接口 */
export interface ColumnConfig {
  /** 列ID */
  id: string;
  /** 列号 (0-24) */
  index: number;
  /** 列标题 */
  label: string;
  /** 列宽度 */
  width: number;
  /** 最小宽度 */
  minWidth: number;
  /** 数据类型 */
  dataType: ColumnDataType;
  /** 编辑类型 */
  editType: ColumnEditType;
  /** 是否默认可见 */
  defaultVisible: boolean;
  /** 是否可排序 */
  sortable: boolean;
  /** 是否必填 */
  required?: boolean;
  /** 下拉选项 */
  options?: { value: string; label: string; color?: string }[];
  /** 格式化函数 */
  format?: (value: unknown, row?: WBSTaskRow) => React.ReactNode;
  /** 列说明（悬浮提示） */
  tooltip?: string;
  /** 是否可隐藏 */
  canHide: boolean;
}

/** 从 types.ts 导入任务类型，避免重复定义 */
import type { WBSTaskListItem } from '../types';

/** 重导出类型，供组件使用 */
export type WBSTaskRow = WBSTaskListItem;

/** 扩展类型，用于表格显示（包含 UI 状态） */
export interface WBSTaskRowWithUI extends WBSTaskListItem {
  hasChildren: boolean;
  depth: number;
  isExpanded?: boolean;
}

/**
 * 24列完整配置（严格按照需求文档）
 * 列号从0开始，对应需求文档的列号
 */
export const WBS_COLUMNS: ColumnConfig[] = [
  // 列号 0: 操作按钮
  {
    id: 'actions',
    index: 0,
    label: '操作',
    width: 120,
    minWidth: 100,
    dataType: 'action',
    editType: 'readonly',
    defaultVisible: true,
    sortable: false,
    canHide: false,
    tooltip: '添加任务、编辑任务、删除任务、维护进展',
  },

  // 列号 1: WBS等级
  {
    id: 'wbsLevel',
    index: 1,
    label: 'WBS等级',
    width: 80,
    minWidth: 70,
    dataType: 'number',
    editType: 'editable',
    defaultVisible: true,
    sortable: true,
    canHide: true,
    tooltip: '子任务自动+1级，范围1-10',
  },

  // 列号 2: WBS编码
  {
    id: 'wbsCode',
    index: 2,
    label: 'WBS编码',
    width: 100,
    minWidth: 80,
    dataType: 'text',
    editType: 'readonly',
    defaultVisible: true,
    sortable: true,
    canHide: true,
    tooltip: '系统自动生成，格式：父编号.当前序号',
  },

  // 列号 3: 任务描述
  {
    id: 'description',
    index: 3,
    label: '任务描述',
    width: 250,
    minWidth: 150,
    dataType: 'text',
    editType: 'editable',
    defaultVisible: true,
    sortable: true,
    required: true,
    canHide: true,
    tooltip: '必填项',
  },

  // 列号 4: 任务状态
  {
    id: 'status',
    index: 4,
    label: '状态',
    width: 90,
    minWidth: 80,
    dataType: 'status',
    editType: 'readonly',
    defaultVisible: true,
    sortable: true,
    canHide: true,
    tooltip: '系统自动判断（9种状态）',
  },

  // 列号 5: Redmine链接
  {
    id: 'redmineLink',
    index: 5,
    label: 'Redmine链接',
    width: 120,
    minWidth: 100,
    dataType: 'link',
    editType: 'conditional', // 仅根任务可填
    defaultVisible: true,
    sortable: false,
    canHide: true,
    tooltip: '仅根任务可填写',
  },

  // 列号 6: 负责人
  {
    id: 'assigneeName',
    index: 6,
    label: '负责人',
    width: 100,
    minWidth: 80,
    dataType: 'select',
    editType: 'editable',
    defaultVisible: true,
    sortable: true,
    canHide: true,
    tooltip: '关联组织架构成员',
  },

  // 列号 7: 任务类型
  {
    id: 'taskType',
    index: 7,
    label: '任务类型',
    width: 100,
    minWidth: 80,
    dataType: 'select',
    editType: 'conditional', // 只有最上层任务可改，子任务继承
    defaultVisible: true,
    sortable: true,
    options: TASK_TYPE_OPTIONS,
    canHide: true,
    tooltip: '子任务继承父任务类型',
  },

  // 列号 8: 优先级
  {
    id: 'priority',
    index: 8,
    label: '优先级',
    width: 80,
    minWidth: 70,
    dataType: 'select',
    editType: 'editable',
    defaultVisible: true,
    sortable: true,
    options: PRIORITY_OPTIONS,
    canHide: true,
    tooltip: '默认选中"中"',
  },

  // 列号 9: 前置任务
  {
    id: 'predecessorCode',
    index: 9,
    label: '前置任务',
    width: 100,
    minWidth: 80,
    dataType: 'text',
    editType: 'editable',
    defaultVisible: true,
    sortable: false,
    canHide: true,
    tooltip: '输入WBS编码，设置依赖关系',
  },

  // 列号 10: 提前/落后
  {
    id: 'lagDays',
    index: 10,
    label: '提前/落后',
    width: 80,
    minWidth: 70,
    dataType: 'number',
    editType: 'editable',
    defaultVisible: true,
    sortable: true,
    canHide: true,
    tooltip: '正数延后，负数提前',
  },

  // 列号 11: 开始日期
  {
    id: 'startDate',
    index: 11,
    label: '开始日期',
    width: 110,
    minWidth: 100,
    dataType: 'date',
    editType: 'conditional', // 无前置任务时可编辑
    defaultVisible: true,
    sortable: true,
    canHide: true,
    tooltip: '无前置任务时可编辑，有前置任务时自动计算',
  },

  // 列号 12: 工期（带单休勾选框）
  {
    id: 'duration',
    index: 12,
    label: '工期',
    width: 120,
    minWidth: 100,
    dataType: 'number',
    editType: 'editable',
    defaultVisible: true,
    sortable: true,
    canHide: true,
    tooltip: '天数 + 单休勾选框（勾选表示工作6天）',
  },

  // 列号 13: 结束日期
  {
    id: 'endDate',
    index: 13,
    label: '结束日期',
    width: 110,
    minWidth: 100,
    dataType: 'date',
    editType: 'computed',
    defaultVisible: true,
    sortable: true,
    canHide: true,
    tooltip: '根据工期自动计算（跳过周末节假日）',
  },

  // 列号 14: 计划周期
  {
    id: 'plannedDuration',
    index: 14,
    label: '计划周期',
    width: 80,
    minWidth: 70,
    dataType: 'number',
    editType: 'computed',
    defaultVisible: true,
    sortable: true,
    canHide: true,
    tooltip: '结束日期 - 开始日期 + 1',
  },

  // 列号 15: 预警天数
  {
    id: 'warningDays',
    index: 15,
    label: '预警天数',
    width: 80,
    minWidth: 70,
    dataType: 'number',
    editType: 'editable',
    defaultVisible: true,
    sortable: true,
    canHide: true,
    tooltip: '用于计算"延期预警"状态，默认3天',
  },

  // 列号 16: 实际开始
  {
    id: 'actualStartDate',
    index: 16,
    label: '实际开始',
    width: 110,
    minWidth: 100,
    dataType: 'date',
    editType: 'editable',
    defaultVisible: true,
    sortable: true,
    canHide: true,
    tooltip: '手动填写',
  },

  // 列号 17: 实际结束
  {
    id: 'actualEndDate',
    index: 17,
    label: '实际结束',
    width: 110,
    minWidth: 100,
    dataType: 'date',
    editType: 'editable',
    defaultVisible: true,
    sortable: true,
    canHide: true,
    tooltip: '手动填写',
  },

  // 列号 18: 实际工期
  {
    id: 'actualDuration',
    index: 18,
    label: '实际工期',
    width: 80,
    minWidth: 70,
    dataType: 'number',
    editType: 'computed',
    defaultVisible: true,
    sortable: true,
    canHide: true,
    tooltip: '工作日数（跳过周末节假日）',
  },

  // 列号 19: 全职比
  {
    id: 'fullTimeRatio',
    index: 19,
    label: '全职比',
    width: 80,
    minWidth: 70,
    dataType: 'number',
    editType: 'editable',
    defaultVisible: true,
    sortable: true,
    canHide: true,
    tooltip: '0-100%，默认100',
  },

  // 列号 20: 实际周期
  {
    id: 'actualCycle',
    index: 20,
    label: '实际周期',
    width: 80,
    minWidth: 70,
    dataType: 'number',
    editType: 'computed',
    defaultVisible: true,
    sortable: true,
    canHide: true,
    tooltip: '日历天数（含周末节假日）',
  },

  // 列号 21: 项目
  {
    id: 'projectName',
    index: 21,
    label: '项目',
    width: 120,
    minWidth: 100,
    dataType: 'select',
    editType: 'editable',
    defaultVisible: true,
    sortable: true,
    required: true,
    canHide: true,
    tooltip: '必须选择项目',
  },

  // 列号 22: 延期次数
  {
    id: 'delayCount',
    index: 22,
    label: '延期次数',
    width: 80,
    minWidth: 70,
    dataType: 'number',
    editType: 'readonly',
    defaultVisible: true,
    sortable: true,
    canHide: true,
    tooltip: '点击查看详情，延期后计划未刷新不累加',
  },

  // 列号 23: 计划调整
  {
    id: 'planChangeCount',
    index: 23,
    label: '计划调整',
    width: 80,
    minWidth: 70,
    dataType: 'number',
    editType: 'readonly',
    defaultVisible: true,
    sortable: true,
    canHide: true,
    tooltip: '点击查看详情',
  },

  // 列号 24: 进展记录
  {
    id: 'progressRecordCount',
    index: 24,
    label: '进展记录',
    width: 80,
    minWidth: 70,
    dataType: 'number',
    editType: 'readonly',
    defaultVisible: true,
    sortable: true,
    canHide: true,
    tooltip: '点击查看详情',
  },
];

/** 默认可见列（操作列 + 数据列） */
export const DEFAULT_VISIBLE_COLUMNS = WBS_COLUMNS.filter(col => col.defaultVisible).map(col => col.id);

/** 可编辑列（用于视觉区分 - 微蓝灰边框） */
export const EDITABLE_COLUMNS = WBS_COLUMNS
  .filter(col => col.editType === 'editable' || col.editType === 'conditional')
  .map(col => col.id);

/** 只读/计算列 */
export const READONLY_COLUMNS = WBS_COLUMNS
  .filter(col => col.editType === 'readonly' || col.editType === 'computed')
  .map(col => col.id);

/** 支持行内编辑的列（仅实际日期字段，其他字段通过 TaskForm 编辑） */
export const INLINE_EDITABLE_COLUMNS = ['actualStartDate', 'actualEndDate'];

/** 获取列配置 */
export function getColumnConfig(columnId: string): ColumnConfig | undefined {
  return WBS_COLUMNS.find(col => col.id === columnId);
}

/** 获取列配置通过列号 */
export function getColumnByIndex(index: number): ColumnConfig | undefined {
  return WBS_COLUMNS.find(col => col.index === index);
}

/** 检查列是否支持行内编辑（仅实际日期字段） */
export function isColumnEditable(columnId: string, rowData?: WBSTaskRow): boolean {
  // 设计原则：仅实际日期字段支持行内编辑，其他字段通过 TaskForm 编辑
  return INLINE_EDITABLE_COLUMNS.includes(columnId);
}

/** 格式化日期显示 */
export function formatDate(dateStr?: string): string {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' });
  } catch {
    return '';
  }
}

/** 格式化天数 */
export function formatDays(days?: number, suffix: string = '天'): string {
  if (days === undefined || days === null) return '';
  return `${days}${suffix}`;
}

/** 格式化百分比 */
export function formatPercent(value?: number): string {
  if (value === undefined || value === null) return '';
  return `${value}%`;
}

/** 格式化提前/落后天数 */
export function formatLagDays(days?: number): string {
  if (days === undefined || days === null || days === 0) return '';
  if (days > 0) return `+${days}天`;
  return `${days}天`;
}

/** localStorage 键名 */
export const COLUMN_VISIBILITY_KEY = 'wbs-column-visibility';

/** 从 localStorage 加载列可见性 */
export function loadColumnVisibility(): Record<string, boolean> {
  try {
    const saved = localStorage.getItem(COLUMN_VISIBILITY_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch {
    // ignore
  }
  // 返回默认值
  return Object.fromEntries(DEFAULT_VISIBLE_COLUMNS.map(id => [id, true]));
}

/** 保存列可见性到 localStorage */
export function saveColumnVisibility(visibility: Record<string, boolean>): void {
  try {
    localStorage.setItem(COLUMN_VISIBILITY_KEY, JSON.stringify(visibility));
  } catch {
    // ignore
  }
}
