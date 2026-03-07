/**
 * 测试相关类型定义
 */

/**
 * 测试用户类型
 */
export interface TestUser {
  username: string;
  password: string;
  role: 'admin' | 'tech_manager' | 'dept_manager' | 'engineer';
  name?: string;
}

/**
 * 项目数据类型
 */
export interface ProjectData {
  code?: string;
  name: string;
  description?: string;
  type: 'product' | 'management';
  members?: number[];
  startDate?: string;
  endDate?: string;
}

/**
 * 任务数据类型
 */
export interface TaskData {
  projectId?: string;
  memberId?: number;
  description: string;
  startDate?: string;
  endDate?: string;
  priority?: 'high' | 'medium' | 'low';
  status?: 'not_started' | 'in_progress' | 'completed';
  approvalStatus?: 'pending' | 'approved' | 'rejected';
}

/**
 * 测试选项类型
 */
export interface TestOptions {
  username?: string;
  password?: string;
  cleanup?: boolean;
  screenshots?: boolean;
}

/**
 * 页面断言选项
 */
export interface PageAssertions {
  hasURL?: string | RegExp;
  hasTitle?: string | RegExp;
  hasElement?: string;
}
