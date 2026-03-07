/**
 * 测试用户数据
 *
 * ⚠️ 重要提示：
 * 这些测试账号必须与系统中定义的默认账号一致。
 * 系统默认账号定义在：app/src/contexts/AuthContext.tsx
 */

import type { TestUser } from '../types/test-types';

/**
 * 测试用户配置
 */
export const TEST_USERS: Record<string, TestUser> = {
  admin: {
    username: 'admin',
    password: 'admin123',
    role: 'admin',
    name: '系统管理员'
  },
  tech_manager: {
    username: 'tech_manager',
    password: '123456',
    role: 'tech_manager',
    name: '技术经理'
  },
  dept_manager: {
    username: 'dept_manager',
    password: '123456',
    role: 'dept_manager',
    name: '部门经理'
  },
  engineer: {
    username: 'engineer',
    password: '123456',
    role: 'engineer',
    name: '工程师'
  }
};

/**
 * 获取测试用户
 */
export function getTestUser(role: keyof typeof TEST_USERS): TestUser {
  return TEST_USERS[role];
}

/**
 * 获取所有测试用户
 */
export function getAllTestUsers(): TestUser[] {
  return Object.values(TEST_USERS);
}

/**
 * 从环境变量获取测试用户
 */
export function getUserFromEnv(role: 'ADMIN' | 'TECH_MANAGER' | 'DEPT_MANAGER' | 'ENGINEER'): TestUser {
  const usernameKey = `TEST_${role}_USERNAME`;
  const passwordKey = `TEST_${role}_PASSWORD`;

  const username = process.env[usernameKey];
  const password = process.env[passwordKey];

  if (!username || !password) {
    throw new Error(`Missing environment variables for ${role}: ${usernameKey}, ${passwordKey}`);
  }

  const roleMap: Record<string, TestUser['role']> = {
    'ADMIN': 'admin',
    'TECH_MANAGER': 'tech_manager',
    'DEPT_MANAGER': 'dept_manager',
    'ENGINEER': 'engineer'
  };

  return {
    username,
    password,
    role: roleMap[role]
  };
}
