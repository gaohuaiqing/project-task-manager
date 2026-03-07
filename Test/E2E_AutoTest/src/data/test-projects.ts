/**
 * 测试项目数据
 */

import type { ProjectData } from '../types/test-types';

/**
 * 生成随机项目数据
 */
export function generateProjectData(overrides?: Partial<ProjectData>): ProjectData {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);

  return {
    code: `PRJ-${timestamp}`,
    name: `E2E测试项目_${random}`,
    description: `这是一个E2E自动化测试创建的项目，时间戳：${timestamp}`,
    type: 'product',
    ...overrides
  };
}

/**
 * 产品开发类项目模板
 */
export const PRODUCT_PROJECT_TEMPLATE: ProjectData = {
  name: '产品开发测试项目',
  description: '用于测试产品开发类项目功能',
  type: 'product'
};

/**
 * 职能管理类项目模板
 */
export const MANAGEMENT_PROJECT_TEMPLATE: ProjectData = {
  name: '职能管理测试项目',
  description: '用于测试职能管理类项目功能',
  type: 'management'
};

/**
 * 预定义测试项目集合
 */
export const TEST_PROJECTS = {
  basicProduct: generateProjectData({
    name: '基础产品开发项目',
    description: '测试基本的产品开发功能',
    type: 'product'
  }),
  basicManagement: generateProjectData({
    name: '基础职能管理项目',
    description: '测试基本的职能管理功能',
    type: 'management'
  }),
  withDates: generateProjectData({
    name: '带日期的项目',
    description: '测试项目日期设置功能',
    type: 'product'
  }),
  longRunning: generateProjectData({
    name: '长期项目',
    description: '测试长期项目的功能',
    type: 'product'
  })
};
