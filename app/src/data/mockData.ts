import type { Member, Project, Task, Notification } from '@/types';

// 团队成员数据
export const members: Member[] = [];

// 项目数据
export const projects: Project[] = [];

// 任务数据
export const tasks: Task[] = [];

// 通知数据
export const notifications: Notification[] = [];

// 技能列表
export const skillList = [];

// 任务类型
export const taskTypes = [
  { value: 'frontend', label: '前端开发', color: '#60a5fa' },
  { value: 'backend', label: '后端开发', color: '#4ade80' },
  { value: 'test', label: '测试', color: '#facc15' },
  { value: 'design', label: '设计', color: '#f472b6' },
  { value: 'other', label: '其他', color: '#9ca3af' }
];

// 任务难度
export const taskDifficulties = [
  { value: 'easy', label: '简单', color: '#4ade80', factor: 1 },
  { value: 'medium', label: '中等', color: '#facc15', factor: 1.5 },
  { value: 'hard', label: '困难', color: '#fb923c', factor: 2 },
  { value: 'extreme', label: '极难', color: '#f87171', factor: 3 }
];

// 优先级
export const priorities = [
  { value: 'low', label: '低', color: '#60a5fa' },
  { value: 'medium', label: '中', color: '#facc15' },
  { value: 'high', label: '高', color: '#f87171' }
];

// 状态
export const statuses = [
  { value: 'pending', label: '待处理', color: '#facc15' },
  { value: 'in_progress', label: '进行中', color: '#60a5fa' },
  { value: 'completed', label: '已完成', color: '#4ade80' }
];

// 系统数据管理说明
// 1. 本文件不再包含默认示例数据，所有数据将由用户手动创建
// 2. 系统启动时不会自动生成任何默认示例数据
// 3. 成员数据通过用户管理模块进行管理
// 4. 项目、任务等业务数据需要用户手动添加

// 清空本地存储中的旧示例数据
if (typeof localStorage !== 'undefined') {
  // 仅清除可能存在的旧示例数据，保留成员和用户数据
  localStorage.removeItem('projects');
  localStorage.removeItem('tasks');
  localStorage.removeItem('notifications');
  // 注意：members 数据由用户管理模块生成
}

// 数据生成机制优化
// - 移除了所有 AI 自动生成的默认示例数据
// - 确保系统启动时不会自动创建任何示例数据
// - 用户需要通过界面手动创建项目、任务等数据
// - 成员数据通过用户管理功能创建