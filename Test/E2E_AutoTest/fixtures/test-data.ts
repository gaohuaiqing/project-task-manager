/**
 * E2E 测试数据定义
 */

export const testUser = {
  username: process.env.TEST_ADMIN_USERNAME || 'admin',
  password: process.env.TEST_ADMIN_PASSWORD || 'admin123',
};

export const testProject = {
  name: 'E2E 测试项目',
  code: 'E2E-TEST-001',
  projectType: 'product_development',
  description: '自动化测试创建的项目',
};

export const testTask = {
  name: 'E2E 测试任务',
  taskType: 'frontend',
  priority: 'medium',
  description: '自动化测试创建的任务',
};

export const testMember = {
  name: '测试成员',
  department: '研发部',
  skills: ['frontend', 'backend'],
};

// 生成唯一标识符
export function generateUniqueId(): string {
  return `E2E-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// 生成测试项目数据
export function generateTestProject() {
  const id = generateUniqueId();
  return {
    id,
    name: `测试项目_${id}`,
    code: `CODE-${id}`,
    projectType: 'product_development' as const,
    description: `自动化测试创建 - ${id}`,
  };
}

// 生成测试任务数据
export function generateTestTask(projectId: string) {
  const id = generateUniqueId();
  return {
    id,
    projectId,
    name: `测试任务_${id}`,
    taskType: 'frontend' as const,
    priority: 'medium' as const,
    description: `自动化测试创建 - ${id}`,
  };
}
