/**
 * WBS任务导入工具
 * 解析Excel文件并验证数据
 */
import * as XLSX from 'xlsx';
import type { WBSTaskListItem, TaskType, TaskPriority } from '../types';
import { TASK_TYPE_LABELS, TASK_PRIORITY_LABELS } from '../types';
import type { Member } from '@/features/org/types';
import type { Project } from '@/features/projects/types';

/** 反向映射： 中文名 -> 枚举值 */
const TASK_TYPE_VALUES: Record<string, TaskType> = {
  '固件': 'firmware',
  '板卡': 'board',
  '驱动': 'driver',
  '接口类': 'interface',
  '硬件恢复包': 'hw_recovery',
  '物料导入': 'material_import',
  '物料改代': 'material_sub',
  '系统设计': 'sys_design',
  '核心风险': 'core_risk',
  '接口人': 'contact',
  '职能任务': 'func_task',
  '其它': 'other',
};

const TASK_PRIORITY_VALUES: Record<string, TaskPriority> = {
  '紧急': 'urgent',
  '高': 'high',
  '中': 'medium',
  '低': 'low',
};

/** 解析后的任务数据 */
export interface ParsedTaskData {
  rowNumber: number;
  id?: string;
  wbsCode?: string;
  wbsLevel?: number;
  description?: string;
  taskType?: TaskType;
  priority?: TaskPriority;
  assigneeName?: string;
  assigneeId?: number;
  predecessorWbs?: string;
  lagDays?: number;
  startDate?: string;
  duration?: number;
  isSixDayWeek?: boolean;
  warningDays?: number;
  actualStartDate?: string;
  actualEndDate?: string;
  fullTimeRatio?: number;
  redmineLink?: string;
  /** 是否为更新操作 */
  isUpdate?: boolean;
  /** 项目ID（新建时使用） */
  projectId?: string;
}

/** 验证错误 */
export interface ValidationError {
  rowNumber: number;
  field: string;
  message: string;
}

/** 验证结果 */
export interface ValidationResult {
  validTasks: ParsedTaskData[];
  errors: ValidationError[];
  newCount: number;
  updateCount: number;
}

/** 导入结果 */
export interface ImportResult {
  success: number;
  failed: number;
  errors: string[];
}

/**
 * 解析Excel文件
 */
export async function parseExcelFile(file: File): Promise<ParsedTaskData[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet, {
          header: 1,
          defval: ''
        });

        const tasks: ParsedTaskData[] = [];
        jsonData.forEach((row, index) => {
          // 跳过空行
          if (!row['任务描述']) return;

          const task: ParsedTaskData = {
            rowNumber: index + 2, // Excel行号(从2开始，1是表头)
            id: row['ID'] as string || undefined,
            wbsCode: row['WBS编码'] as string,
            wbsLevel: parseNumber(row['WBS等级']),
            description: row['任务描述'] as string,
            taskType: TASK_TYPE_VALUES[row['任务类型'] as string],
            priority: TASK_PRIORITY_VALUES[row['优先级'] as string] || 'medium',
            assigneeName: row['负责人'] as string,
            predecessorWbs: row['前置任务WBS'] as string,
            lagDays: parseNumber(row['提前/落后天数']),
            startDate: parseDate(row['开始日期']),
            duration: parseNumber(row['工期(天)']),
            isSixDayWeek: row['单休'] === '是',
            warningDays: parseNumber(row['预警天数']) || 3,
            actualStartDate: parseDate(row['实际开始']),
            actualEndDate: parseDate(row['实际结束']),
            fullTimeRatio: parseNumber(row['全职比(%)']) || 100,
            redmineLink: row['Redmine链接'] as string,
          };

          tasks.push(task);
        });

        resolve(tasks);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

/**
 * 验证解析后的任务数据
 */
export function validateParsedTasks(
  data: ParsedTaskData[],
  existingTasks: WBSTaskListItem[],
  members: Member[],
  projects: Project[],
  selectedProjectId?: string
): ValidationResult {
  const validTasks: ParsedTaskData[] = [];
  const errors: ValidationError[] = [];

  // 创建查找映射
  const wbsCodeMap = new Map<string, WBSTaskListItem>();
  const taskIdMap = new Map<string, WBSTaskListItem>();
  const memberNameMap = new Map<string, Member>();

  existingTasks.forEach(task => {
    wbsCodeMap.set(task.wbsCode, task);
    if (task.id) taskIdMap.set(task.id, task);
  });

  members.forEach(member => {
    memberNameMap.set(member.name, member);
  });

  data.forEach(task => {
    const rowErrors: ValidationError[] = [];

    // 必填验证
    if (!task.description?.trim()) {
      rowErrors.push({
        rowNumber: task.rowNumber,
        field: '任务描述',
        message: '任务描述不能为空'
      });
    }

    // 日期格式验证
    if (task.startDate && !isValidDate(task.startDate)) {
      rowErrors.push({
        rowNumber: task.rowNumber,
        field: '开始日期',
        message: `开始日期格式错误 "${task.startDate}"，应为 YYYY-MM-DD`
      });
    }

    if (task.actualStartDate && !isValidDate(task.actualStartDate)) {
      rowErrors.push({
        rowNumber: task.rowNumber,
        field: '实际开始',
        message: `实际开始日期格式错误 "${task.actualStartDate}"`
      });
    }

    if (task.actualEndDate && !isValidDate(task.actualEndDate)) {
      rowErrors.push({
        rowNumber: task.rowNumber,
        field: '实际结束',
        message: `实际结束日期格式错误 "${task.actualEndDate}"`
      });
    }

    // 负责人验证
    if (task.assigneeName) {
      const member = memberNameMap.get(task.assigneeName);
      if (!member) {
        rowErrors.push({
          rowNumber: task.rowNumber,
          field: '负责人',
          message: `负责人 "${task.assigneeName}" 不在组织架构中`
        });
      } else {
        task.assigneeId = member.id;
      }
    }

    // 任务类型验证
    if (task.taskType && !Object.values(TASK_TYPE_VALUES).includes(task.taskType)) {
      rowErrors.push({
        rowNumber: task.rowNumber,
        field: '任务类型',
        message: `无效的任务类型`
      });
    }

    // 前置任务验证
    if (task.predecessorWbs) {
      const predecessor = wbsCodeMap.get(task.predecessorWbs);
      if (!predecessor) {
        rowErrors.push({
          rowNumber: task.rowNumber,
          field: '前置任务WBS',
          message: `前置任务 "${task.predecessorWbs}" 不存在`
        });
      }
    }

    // 检查是否为更新或新建
    if (task.id && taskIdMap.has(task.id)) {
      // 更新任务
      task.isUpdate = true;
    } else {
      // 新建任务
      task.isUpdate = false;
      task.projectId = selectedProjectId;
    }

    if (rowErrors.length === 0) {
      validTasks.push(task);
    } else {
      errors.push(...rowErrors);
    }
  });

  const newCount = validTasks.filter(t => !t.isUpdate).length;
  const updateCount = validTasks.filter(t => t.isUpdate).length;

  return {
    validTasks,
    errors,
    newCount,
    updateCount
  };
}

/**
 * 检测循环依赖
 */
export function detectCircularDependency(
  tasks: ParsedTaskData[],
  existingTasks: WBSTaskListItem[]
): Map<string, string> {
  const errors = new Map<string, string>();

  // 构建依赖图
  const dependencyMap = new Map<string, string>();

  // 添加现有任务的依赖
  existingTasks.forEach(task => {
    if (task.predecessorWbs) {
      dependencyMap.set(task.wbsCode, task.predecessorWbs);
    }
  });

  // 添加新任务的依赖
  tasks.forEach(task => {
    if (task.predecessorWbs && task.wbsCode) {
      dependencyMap.set(task.wbsCode, task.predecessorWbs);
    }
  });

  // 检测循环
  dependencyMap.forEach((predecessor, wbsCode) => {
    const visited = new Set<string>();
    let current = predecessor;

    while (current) {
      if (current === wbsCode) {
        errors.set(wbsCode, `循环依赖: ${wbsCode} -> ${predecessor}`);
        break;
      }
      if (visited.has(current)) break;
      visited.add(current);
      current = dependencyMap.get(current);
    }
  });

  return errors;
}

// 辅助函数
function parseNumber(value: unknown): number | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  const num = Number(value);
  return isNaN(num) ? undefined : num;
}

function parseDate(value: unknown): string | undefined {
  if (!value) return undefined;
  const str = String(value);
  // 尝试解析 YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }
  // 尝试解析 Excel 日期序列号
  const num = Number(str);
  if (!isNaN(num) && num > 0) {
    const date = new Date((num - 25569) * 86400 * 1000);
    return date.toISOString().split('T')[0];
  }
  return undefined;
}

function isValidDate(dateStr: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(dateStr);
}
