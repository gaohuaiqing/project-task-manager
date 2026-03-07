/**
 * Mock 数据文件
 * 用于前端开发和展示
 */

export interface TaskType {
  value: string;
  label: string;
  color: string;
}

export interface Priority {
  value: string;
  label: string;
  color: string;
  level: number;
}

/** 任务类型列表 */
export const taskTypes: TaskType[] = [
  { value: 'frontend', label: '前端开发', color: '#60a5fa' },
  { value: 'backend', label: '后端开发', color: '#4ade80' },
  { value: 'test', label: '测试', color: '#facc15' },
  { value: 'design', label: '设计', color: '#f472b6' },
  { value: 'other', label: '其他', color: '#9ca3af' },
];

/** 优先级列表 */
export const priorities: Priority[] = [
  { value: 'critical', label: '紧急', color: '#ef4444', level: 4 },
  { value: 'high', label: '高', color: '#f97316', level: 3 },
  { value: 'medium', label: '中', color: '#eab308', level: 2 },
  { value: 'low', label: '低', color: '#22c55e', level: 1 },
];

/** 任务难度列表 */
export interface TaskDifficulty {
  value: string;
  label: string;
  description?: string;
}

export const taskDifficulties: TaskDifficulty[] = [
  { value: 'trivial', label: '简单', description: '1小时内完成' },
  { value: 'easy', label: '容易', description: '1-2小时' },
  { value: 'medium', label: '中等', description: '半天' },
  { value: 'hard', label: '困难', description: '1-2天' },
  { value: 'challenging', label: '挑战性', description: '3-5天' },
  { value: 'expert', label: '专家级', description: '需要专家介入' },
];

/** 根据值获取任务类型 */
export function getTaskTypeByValue(value: string): TaskType | undefined {
  return taskTypes.find(type => type.value === value);
}

/** 根据值获取优先级 */
export function getPriorityByValue(value: string): Priority | undefined {
  return priorities.find(priority => priority.value === value);
}

/** 根据级别获取优先级 */
export function getPriorityByLevel(level: number): Priority | undefined {
  return priorities.find(priority => priority.level === level);
}
