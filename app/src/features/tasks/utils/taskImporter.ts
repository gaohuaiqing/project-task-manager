/**
 * WBS任务导入工具
 * 解析Excel文件并验证数据
 *
 * 列顺序与导出模板一致（28列）：
 * A=1 WBS等级  B=2 WBS编码  C=3 任务描述  D=4 任务状态  E=5 Redmine链接
 * F=6 负责人   G=7 任务类型 H=8 优先级    I=9 前置任务  J=10 提前/落后
 * K=11 开始日期 L=12 工期   M=13 单休    N=14 结束日期 O=15 计划周期
 * P=16 预警天数 Q=17 实际开始 R=18 实际结束 S=19 实际工期 T=20 全职比
 * U=21 实际周期 V=22 项目编码 W=23 项目名称 X=24 延期次数 Y=25 延期历史
 * Z=26 计划调整 AA=27 计划调整历史 AB=28 进展记录
 */
import * as XLSX from 'xlsx';
import type { WBSTaskListItem, TaskType, TaskPriority } from '../types';
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
  delayHistory?: string;
  planChangeHistory?: string;
  progressRecords?: string;
  /** 是否为更新操作 */
  isUpdate?: boolean;
  /** 项目编码（用于后端匹配项目UUID） */
  projectCode?: string;
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
 * 以C列（任务描述）有值作为数据边界，C列为空即停止解析
 */
export async function parseExcelFile(file: File): Promise<ParsedTaskData[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];

        // 获取sheet范围
        const range = XLSX.utils.decode_range(firstSheet['!ref'] || 'A1');

        // 读取表头行（第1行），建立列索引映射
        const headerMap = buildColumnIndexMap(firstSheet, range);

        const tasks: ParsedTaskData[] = [];

        // 从第2行开始遍历（第1行是表头），以C列（任务描述）有值作为数据结束边界
        for (let r = range.s.r + 1; r <= range.e.r; r++) {
          // C列 = 任务描述（第3列，索引2）
          const cellC = firstSheet[XLSX.utils.encode_cell({ r, c: 2 })];
          const descriptionRaw = cellC ? String(cellC.v).trim() : '';

          // C列为空 → 数据结束，停止解析
          if (!descriptionRaw) break;

          const getCell = (colName: string): unknown => {
            const colIdx = headerMap.get(colName);
            if (colIdx === undefined) return '';
            const cell = firstSheet[XLSX.utils.encode_cell({ r, c: colIdx })];
            return cell ? cell.v : '';
          };

          const task: ParsedTaskData = {
            rowNumber: r + 1, // Excel行号（1-based）
            wbsLevel: parseNumber(getCell('WBS等级')),
            wbsCode: String(getCell('WBS编码') || '').trim(),
            description: descriptionRaw,
            redmineLink: String(getCell('Redmine链接') || '').trim(),
            assigneeName: String(getCell('负责人') || '').trim(),
            taskType: parseTaskType(getCell('任务类型')),
            priority: parsePriority(getCell('优先级')),
            predecessorWbs: String(getCell('前置任务') || '').trim(),
            lagDays: parseNumber(getCell('提前/落后')),
            startDate: parseDate(getCell('开始日期')),
            duration: parseNumber(getCell('工期')),
            isSixDayWeek: parseBoolean(getCell('单休')),
            warningDays: parseNumber(getCell('预警天数')) || 3,
            actualStartDate: parseDate(getCell('实际开始')),
            actualEndDate: parseDate(getCell('实际结束')),
            fullTimeRatio: parseNumber(getCell('全职比(%)')) || 100,
            projectCode: String(getCell('项目编码') || '').trim(),
            delayHistory: String(getCell('延期历史') || '').trim(),
            planChangeHistory: String(getCell('计划调整历史') || '').trim(),
            progressRecords: String(getCell('进展记录') || '').trim(),
          };

          tasks.push(task);
        }

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
 * 读取表头行，建立列名→列索引的映射
 */
function buildColumnIndexMap(sheet: XLSX.WorkSheet, range: XLSX.Range): Map<string, number> {
  const map = new Map<string, number>();
  for (let c = range.s.c; c <= range.e.c; c++) {
    const cell = sheet[XLSX.utils.encode_cell({ r: range.s.r, c })];
    if (cell && cell.v) {
      map.set(String(cell.v).trim(), c);
    }
  }
  return map;
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

    // 前置任务验证
    if (task.predecessorWbs) {
      const predecessor = wbsCodeMap.get(task.predecessorWbs);
      if (!predecessor) {
        rowErrors.push({
          rowNumber: task.rowNumber,
          field: '前置任务',
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
    if (task.predecessorCode) {
      dependencyMap.set(task.wbsCode, task.predecessorCode);
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

// ============ 辅助函数 ============

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
  // H5修复：使用本地时间而非 UTC，避免日期偏移
  const num = Number(str);
  if (!isNaN(num) && num > 0 && num < 100000) {
    // Excel 日期序列号：从 1900-01-01 开始的天数
    // 25569 是 1970-01-01 对应的 Excel 序列号
    const utcDays = num - 25569;
    // 转换为毫秒（使用本地时区）
    const utcMs = utcDays * 86400 * 1000;
    const date = new Date(utcMs);
    // 使用本地日期组件，避免 UTC 偏移
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  return undefined;
}

function parseBoolean(value: unknown): boolean {
  if (typeof value === 'boolean') return value;
  const str = String(value).trim();
  return str === '是' || str === 'true' || str === '1' || str === 'TRUE';
}

function parseTaskType(value: unknown): TaskType | undefined {
  if (!value) return undefined;
  return TASK_TYPE_VALUES[String(value).trim()];
}

function parsePriority(value: unknown): TaskPriority | undefined {
  if (!value) return undefined;
  return TASK_PRIORITY_VALUES[String(value).trim()] || 'medium';
}

function isValidDate(dateStr: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(dateStr);
}
