/**
 * WBS 计算器单元测试
 * 测试工作日计算、关键路径识别、日期冲突检测等功能
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  calculateWorkDays,
  calculateEndDate,
  identifyCriticalPath,
  detectDateConflicts,
  buildWbsTree,
  generateWbsCode
} from './wbsCalculator';
import type { WbsTask } from '@/types/wbs';

// 模拟节假日列表
const mockHolidays = [
  '2026-01-01', // 元旦
  '2026-02-10', '2026-02-11', '2026-02-12', '2026-02-13', '2026-02-14', // 春节
  '2026-02-15', '2026-02-16', '2026-02-17',
  '2026-04-04', '2026-04-05', '2026-04-06', // 清明节
  '2026-05-01', '2026-05-02', '2026-05-03', // 劳动节
  '2026-06-09', '2026-06-11', // 端午节
  '2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04', '2026-10-05', '2026-10-06', '2026-10-07', // 国庆节
];

// 模拟 WBS 任务数据（使用正确的类型结构）
const mockTasks: WbsTask[] = [
  {
    id: '1',
    projectId: 'project1',
    memberId: 'user1',
    title: '项目启动',
    description: '项目启动阶段',
    status: 'completed',
    priority: 'high',
    plannedStartDate: '2026-03-01',
    plannedEndDate: '2026-03-05',
    plannedDays: 5,
    progress: 100,
    wbsCode: '1',
    level: 0,
    subtasks: ['2', '3'],
    order: 1,
    isExpanded: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: '2',
    projectId: 'project1',
    memberId: 'user2',
    title: '需求分析',
    description: '需求分析阶段',
    status: 'in_progress',
    priority: 'medium',
    plannedStartDate: '2026-03-06',
    plannedEndDate: '2026-03-15',
    plannedDays: 8,
    progress: 50,
    predecessor: '1',
    wbsCode: '2',
    level: 1,
    subtasks: ['4', '5'],
    parentId: '1',
    order: 2,
    isExpanded: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: '3',
    projectId: 'project1',
    memberId: 'user3',
    title: '系统设计',
    description: '系统设计阶段',
    status: 'pending',
    priority: 'medium',
    plannedStartDate: '2026-03-16',
    plannedEndDate: '2026-03-25',
    plannedDays: 8,
    progress: 0,
    predecessor: '2',
    wbsCode: '3',
    level: 1,
    subtasks: [],
    parentId: '1',
    order: 3,
    isExpanded: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: '4',
    projectId: 'project1',
    memberId: 'user2',
    title: '需求调研',
    description: '进行需求调研',
    status: 'completed',
    priority: 'medium',
    plannedStartDate: '2026-03-06',
    plannedEndDate: '2026-03-10',
    plannedDays: 5,
    progress: 100,
    wbsCode: '2.1',
    level: 2,
    subtasks: [],
    parentId: '2',
    order: 1,
    isExpanded: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: '5',
    projectId: 'project1',
    memberId: 'user2',
    title: '需求文档编写',
    description: '编写需求文档',
    status: 'in_progress',
    priority: 'medium',
    plannedStartDate: '2026-03-11',
    plannedEndDate: '2026-03-15',
    plannedDays: 5,
    progress: 60,
    predecessor: '4',
    wbsCode: '2.2',
    level: 2,
    subtasks: [],
    parentId: '2',
    order: 2,
    isExpanded: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  }
];

describe('WBS 计算器测试', () => {
  describe('工作日计算', () => {
    it('应该正确计算工作日（排除周末）', () => {
      // 2026-03-01 到 2026-03-05 是周一到周五
      const workDays = calculateWorkDays('2026-03-01', '2026-03-05', []);
      expect(workDays).toBe(5);
    });

    it('应该正确计算工作日（排除周末和节假日）', () => {
      // 2026-02-08 到 2026-02-20 包含春节假期
      const workDays = calculateWorkDays('2026-02-08', '2026-02-20', mockHolidays);
      expect(workDays).toBeLessThan(13); // 减去周末和节假日
    });

    it('应该处理开始日期晚于结束日期的情况', () => {
      const workDays = calculateWorkDays('2026-03-10', '2026-03-01', []);
      expect(workDays).toBeLessThan(0);
    });

    it('应该处理相同的开始和结束日期', () => {
      const workDays = calculateWorkDays('2026-03-01', '2026-03-01', []);
      expect(workDays).toBe(1);
    });

    it('应该处理周末日期', () => {
      // 2026-03-07 是周六
      const workDays = calculateWorkDays('2026-03-07', '2026-03-08', []);
      expect(workDays).toBe(0); // 周六和周日
    });

    it('应该排除节假日', () => {
      const workDays = calculateWorkDays('2026-01-01', '2026-01-03', mockHolidays);
      expect(workDays).toBeLessThan(3); // 元旦是节假日
    });
  });

  describe('结束日期计算', () => {
    it('应该根据工作日计算结束日期', () => {
      const endDate = calculateEndDate('2026-03-01', 5, []);
      expect(endDate).toBe('2026-03-05'); // 周一到周五
    });

    it('应该考虑节假日', () => {
      const endDate = calculateEndDate('2026-02-08', 10, mockHolidays);
      // 应该跳过春节假期
      expect(endDate).not.toBe('2026-02-18');
    });

    it('应该处理零工作日', () => {
      const endDate = calculateEndDate('2026-03-01', 0, []);
      expect(endDate).toBe('2026-03-01');
    });

    it('应该处理负数工作日', () => {
      const endDate = calculateEndDate('2026-03-05', -5, []);
      expect(endDate).toBe('2026-02-26');
    });
  });

  describe('关键路径识别', () => {
    it('应该识别出关键路径上的任务', () => {
      const criticalPath = identifyCriticalPath(mockTasks, mockHolidays);

      expect(Array.isArray(criticalPath)).toBe(true);
      expect(criticalPath.length).toBeGreaterThan(0);

      // 检查关键路径节点的结构
      const firstNode = criticalPath[0];
      expect(firstNode).toHaveProperty('taskId');
      expect(firstNode).toHaveProperty('wbsCode');
      expect(firstNode).toHaveProperty('title');
      expect(firstNode).toHaveProperty('float');
      expect(firstNode).toHaveProperty('earliestStart');
      expect(firstNode).toHaveProperty('latestStart');
    });

    it('关键路径任务的浮动时间应该为0', () => {
      const criticalPath = identifyCriticalPath(mockTasks, mockHolidays);

      // 找到浮动时间为0的任务
      const criticalTasks = criticalPath.filter(node => node.float === 0);

      expect(criticalTasks.length).toBeGreaterThan(0);
    });

    it('应该正确计算任务的最早开始时间', () => {
      const criticalPath = identifyCriticalPath(mockTasks, mockHolidays);

      // 第一个任务的最早开始时间应该是其计划开始时间
      const firstTask = criticalPath.find(node => node.taskId === '1');
      expect(firstTask?.earliestStart).toBe(mockTasks[0].plannedStartDate);
    });

    it('应该考虑前置任务的依赖关系', () => {
      const criticalPath = identifyCriticalPath(mockTasks, mockHolidays);

      // 任务2应该在任务1之后开始
      const task1 = criticalPath.find(node => node.taskId === '1');
      const task2 = criticalPath.find(node => node.taskId === '2');

      if (task1 && task2) {
        expect(task2.earliestStart).not.toBe(task1.earliestStart);
      }
    });

    it('应该处理没有前置任务的情况', () => {
      const tasksWithNoPredecessors = mockTasks.filter(t => !t.predecessor);
      const criticalPath = identifyCriticalPath(tasksWithNoPredecessors, mockHolidays);

      expect(criticalPath.length).toBe(tasksWithNoPredecessors.length);
    });

    it('应该处理空任务列表', () => {
      const criticalPath = identifyCriticalPath([], mockHolidays);
      expect(criticalPath).toEqual([]);
    });
  });

  describe('日期冲突检测', () => {
    it('应该检测前置任务依赖冲突', () => {
      // 创建有冲突的任务
      const conflictingTasks: WbsTask[] = [
        {
          id: '1',
          projectId: 'project1',
          memberId: 'user1',
          title: '前置任务',
          description: '',
          status: 'pending',
          priority: 'medium',
          plannedStartDate: '2026-03-01',
          plannedEndDate: '2026-03-10',
          plannedDays: 8,
          progress: 0,
          wbsCode: '1',
          level: 0,
          subtasks: [],
          order: 1,
          isExpanded: false,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z'
        },
        {
          id: '2',
          projectId: 'project1',
          memberId: 'user2',
          title: '当前任务',
          description: '',
          status: 'pending',
          priority: 'medium',
          plannedStartDate: '2026-03-05', // 早于前置任务结束日期
          plannedEndDate: '2026-03-15',
          plannedDays: 8,
          progress: 0,
          predecessor: '1',
          wbsCode: '2',
          level: 0,
          subtasks: [],
          order: 2,
          isExpanded: false,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z'
        }
      ];

      const conflicts = detectDateConflicts(conflictingTasks);

      const predecessorConflicts = conflicts.filter(c => c.conflictType === 'predecessor_mismatch');
      expect(predecessorConflicts.length).toBeGreaterThan(0);
    });

    it('应该检测子任务超出父任务范围', () => {
      // 创建有冲突的父子任务
      const invalidChildTasks: WbsTask[] = [
        {
          id: '1',
          projectId: 'project1',
          memberId: 'user1',
          title: '父任务',
          description: '',
          status: 'pending',
          priority: 'medium',
          plannedStartDate: '2026-03-01',
          plannedEndDate: '2026-03-10',
          plannedDays: 8,
          progress: 0,
          wbsCode: '1',
          level: 0,
          subtasks: ['2'],
          order: 1,
          isExpanded: false,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z'
        },
        {
          id: '2',
          projectId: 'project1',
          memberId: 'user2',
          title: '子任务',
          description: '',
          status: 'pending',
          priority: 'medium',
          plannedStartDate: '2026-03-01',
          plannedEndDate: '2026-03-15', // 超出父任务结束日期
          plannedDays: 11,
          progress: 0,
          wbsCode: '1.1',
          level: 1,
          subtasks: [],
          parentId: '1',
          order: 1,
          isExpanded: false,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z'
        }
      ];

      const conflicts = detectDateConflicts(invalidChildTasks);

      const parentChildConflicts = conflicts.filter(c => c.conflictType === 'parent_child_mismatch');
      expect(parentChildConflicts.length).toBeGreaterThan(0);
    });

    it('没有冲突时应该返回空数组', () => {
      const validTasks: WbsTask[] = [
        {
          id: '1',
          projectId: 'project1',
          memberId: 'user1',
          title: '任务1',
          description: '',
          status: 'pending',
          priority: 'medium',
          plannedStartDate: '2026-03-01',
          plannedEndDate: '2026-03-05',
          plannedDays: 5,
          progress: 0,
          wbsCode: '1',
          level: 0,
          subtasks: [],
          order: 1,
          isExpanded: false,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z'
        },
        {
          id: '2',
          projectId: 'project1',
          memberId: 'user2',
          title: '任务2',
          description: '',
          status: 'pending',
          priority: 'medium',
          plannedStartDate: '2026-03-06',
          plannedEndDate: '2026-03-10',
          plannedDays: 5,
          progress: 0,
          wbsCode: '2',
          level: 0,
          subtasks: [],
          order: 2,
          isExpanded: false,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z'
        }
      ];

      const conflicts = detectDateConflicts(validTasks);
      expect(conflicts.length).toBe(0);
    });

    it('应该正确报告冲突详情', () => {
      const conflictingTasks: WbsTask[] = [
        {
          id: '1',
          projectId: 'project1',
          memberId: 'user1',
          title: '前置任务',
          description: '',
          status: 'pending',
          priority: 'medium',
          plannedStartDate: '2026-03-01',
          plannedEndDate: '2026-03-10',
          plannedDays: 8,
          progress: 0,
          wbsCode: '1',
          level: 0,
          subtasks: [],
          order: 1,
          isExpanded: false,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z'
        },
        {
          id: '2',
          projectId: 'project1',
          memberId: 'user2',
          title: '当前任务',
          description: '',
          status: 'pending',
          priority: 'medium',
          plannedStartDate: '2026-03-05',
          plannedEndDate: '2026-03-15',
          plannedDays: 8,
          progress: 0,
          predecessor: '1',
          wbsCode: '2',
          level: 0,
          subtasks: [],
          order: 2,
          isExpanded: false,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z'
        }
      ];

      const conflicts = detectDateConflicts(conflictingTasks);

      expect(conflicts[0]).toHaveProperty('taskId');
      expect(conflicts[0]).toHaveProperty('conflictType');
      expect(conflicts[0]).toHaveProperty('message');
      expect(['predecessor_mismatch', 'parent_child_mismatch', 'overlap']).toContain(conflicts[0].conflictType);
    });

    it('应该处理空任务列表', () => {
      const conflicts = detectDateConflicts([]);
      expect(conflicts).toEqual([]);
    });
  });

  describe('WBS 编码生成', () => {
    it('应该生成根级编码', () => {
      const code = generateWbsCode(undefined, 0);
      expect(code).toBe('1');
    });

    it('应该生成子级编码', () => {
      const code = generateWbsCode('1', 0);
      expect(code).toBe('1.1');
    });

    it('应该生成多级编码', () => {
      const code = generateWbsCode('1.2', 2);
      expect(code).toBe('1.2.3');
    });

    it('应该正确处理索引', () => {
      const code1 = generateWbsCode(undefined, 0);
      const code2 = generateWbsCode(undefined, 1);
      const code3 = generateWbsCode(undefined, 2);

      expect(code1).toBe('1');
      expect(code2).toBe('2');
      expect(code3).toBe('3');
    });
  });

  describe('边界情况处理', () => {
    it('应该处理空任务列表', () => {
      const criticalPath = identifyCriticalPath([], mockHolidays);
      expect(criticalPath).toEqual([]);
    });

    it('应该处理单个任务', () => {
      const singleTask: WbsTask[] = [
        {
          id: '1',
          projectId: 'project1',
          memberId: 'user1',
          title: '单个任务',
          description: '',
          status: 'pending',
          priority: 'medium',
          plannedStartDate: '2026-03-01',
          plannedEndDate: '2026-03-05',
          plannedDays: 5,
          progress: 0,
          wbsCode: '1',
          level: 0,
          subtasks: [],
          order: 1,
          isExpanded: false,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z'
        }
      ];

      const criticalPath = identifyCriticalPath(singleTask, mockHolidays);
      expect(criticalPath.length).toBe(1);
    });

    it('应该处理无效日期格式', () => {
      expect(() => {
        calculateWorkDays('invalid-date', '2026-03-01', []);
      }).not.toThrow();

      const result = calculateWorkDays('invalid-date', '2026-03-01', []);
      expect(result).toBe(0);
    });

    it('应该处理缺失的前置任务引用', () => {
      const taskWithInvalidPredecessor: WbsTask[] = [
        {
          id: '1',
          projectId: 'project1',
          memberId: 'user1',
          title: '任务1',
          description: '',
          status: 'pending',
          priority: 'medium',
          plannedStartDate: '2026-03-01',
          plannedEndDate: '2026-03-05',
          plannedDays: 5,
          progress: 0,
          predecessor: 'non-existent',
          wbsCode: '1',
          level: 0,
          subtasks: [],
          order: 1,
          isExpanded: false,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z'
        }
      ];

      expect(() => {
        identifyCriticalPath(taskWithInvalidPredecessor, mockHolidays);
      }).not.toThrow();
    });
  });
});
