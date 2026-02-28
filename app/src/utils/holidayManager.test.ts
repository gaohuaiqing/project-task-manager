/**
 * 节假日管理工具单元测试
 * 测试节假日 CRUD、工作日判断、批量导入导出等功能
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  getAllHolidays,
  createHoliday,
  updateHoliday,
  deleteHoliday,
  isHoliday,
  getHolidaysInRange,
  batchImportHolidays,
  exportHolidaysToJSON,
  parseHolidayCSV,
  getHolidayStats
} from './holidayManager';
import type { Holiday } from '@/types';

describe('节假日管理测试', () => {
  beforeEach(() => {
    // 清空节假日数据
    localStorage.clear();
    localStorage.setItem('app_holidays', JSON.stringify([]));
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('基础 CRUD 操作', () => {
    it('应该创建单个节假日', () => {
      const result = createHoliday('元旦', '2026-01-01', 'single', undefined, '新年第一天');

      expect(result.success).toBe(true);
      expect(result.holiday).toBeDefined();
      expect(result.holiday?.name).toBe('元旦');
      expect(result.holiday?.date).toBe('2026-01-01');
    });

    it('应该创建日期范围的节假日', () => {
      const result = createHoliday('春节假期', '2026-02-10', 'range', '2026-02-17', '农历新年');

      expect(result.success).toBe(true);
      expect(result.holiday?.startDate).toBe('2026-02-10');
      expect(result.holiday?.endDate).toBe('2026-02-17');
      expect(result.holiday?.type).toBe('range');
    });

    it('应该获取所有节假日', () => {
      createHoliday('元旦', '2026-01-01');
      createHoliday('春节', '2026-02-10', 'range', '2026-02-17');

      const holidays = getAllHolidays();

      expect(holidays.length).toBeGreaterThanOrEqual(2);
    });

    it('应该更新节假日', () => {
      const created = createHoliday('测试节日', '2026-03-01');
      const holidayId = created.holiday?.id || '';

      const result = updateHoliday(holidayId, {
        name: '更新后的节日',
        description: '更新的描述'
      });

      expect(result.success).toBe(true);
      expect(result.holiday?.name).toBe('更新后的节日');
      expect(result.holiday?.description).toBe('更新的描述');
    });

    it('应该删除节假日', () => {
      const created = createHoliday('要删除的节日', '2026-03-01');
      const holidayId = created.holiday?.id || '';

      const result = deleteHoliday(holidayId);

      expect(result.success).toBe(true);

      // 验证已删除
      const holidays = getAllHolidays();
      const deletedHoliday = holidays.find(h => h.id === holidayId);
      expect(deletedHoliday).toBeUndefined();
    });

    it('创建重复日期的节假日应该失败', () => {
      createHoliday('元旦', '2026-01-01');
      const result = createHoliday('另一个元旦', '2026-01-01');

      expect(result.success).toBe(false);
      expect(result.message).toContain('已存在');
    });
  });

  describe('工作日判断', () => {
    beforeEach(() => {
      // 设置测试节假日
      createHoliday('元旦', '2026-01-01');
      createHoliday('春节', '2026-02-10', 'range', '2026-02-17');
    });

    it('应该正确识别节假日', () => {
      expect(isHoliday('2026-01-01')).toBe(true);
      expect(isHoliday('2026-02-10')).toBe(true);
      expect(isHoliday('2026-02-15')).toBe(true);
    });

    it('应该正确识别非节假日', () => {
      expect(isHoliday('2026-01-02')).toBe(false);
      expect(isHoliday('2026-02-09')).toBe(false);
      expect(isHoliday('2026-02-18')).toBe(false);
    });

    it('应该识别日期范围内的节假日', () => {
      expect(isHoliday('2026-02-11')).toBe(true);
      expect(isHoliday('2026-02-12')).toBe(true);
      expect(isHoliday('2026-02-16')).toBe(true);
    });

    it('应该处理周末日期', () => {
      // 2026-03-01 是周日
      const isWeekend = new Date('2026-03-01').getDay() === 0 || new Date('2026-03-01').getDay() === 6;
      expect(isWeekend).toBe(true);
    });

    it('应该处理空日期输入', () => {
      expect(isHoliday('')).toBe(false);
      expect(isHoliday('invalid-date')).toBe(false);
    });
  });

  describe('日期范围查询', () => {
    beforeEach(() => {
      createHoliday('元旦', '2026-01-01');
      createHoliday('春节', '2026-02-10', 'range', '2026-02-17');
      createHoliday('清明节', '2026-04-04', 'range', '2026-04-06');
    });

    it('应该获取指定范围内的节假日', () => {
      const holidaysInRange = getHolidaysInRange('2026-01-01', '2026-02-28');

      expect(holidaysInRange.length).toBeGreaterThanOrEqual(2);
      expect(holidaysInRange.some(h => h.name === '元旦')).toBe(true);
      expect(holidaysInRange.some(h => h.name === '春节')).toBe(true);
    });

    it('应该排除范围外的节假日', () => {
      const holidaysInRange = getHolidaysInRange('2026-01-01', '2026-02-28');

      expect(holidaysInRange.some(h => h.name === '清明节')).toBe(false);
    });

    it('应该处理空范围', () => {
      const holidaysInRange = getHolidaysInRange('2026-03-01', '2026-03-05');
      expect(holidaysInRange.length).toBe(0);
    });

    it('应该处理无效的日期范围', () => {
      const holidaysInRange = getHolidaysInRange('2026-12-31', '2026-01-01');
      expect(Array.isArray(holidaysInRange)).toBe(true);
    });
  });

  describe('批量操作', () => {
    it('应该批量导入节假日', () => {
      const holidaysToImport = [
        { name: '元旦', date: '2026-01-01', endDate: undefined, description: '新年' },
        { name: '春节', date: '2026-02-10', endDate: '2026-02-17', description: '农历新年' },
        { name: '清明节', date: '2026-04-04', endDate: '2026-04-06', description: '扫墓' }
      ];

      const result = batchImportHolidays(holidaysToImport);

      expect(result.success).toBe(true);
      expect(result.imported).toBe(3);
      expect(result.failed).toBe(0);
    });

    it('应该处理导入失败的情况', () => {
      const holidaysToImport = [
        { name: '元旦', date: '2026-01-01', endDate: undefined, description: '' },
        { name: '重复的元旦', date: '2026-01-01', endDate: undefined, description: '' }, // 重复
        { name: '春节', date: '2026-02-10', endDate: '2026-02-17', description: '' }
      ];

      const result = batchImportHolidays(holidaysToImport);

      expect(result.success).toBe(true);
      expect(result.imported).toBe(2);
      expect(result.failed).toBe(1);
      expect(result.errors.length).toBe(1);
    });

    it('应该导出节假日为 JSON', () => {
      createHoliday('元旦', '2026-01-01');
      createHoliday('春节', '2026-02-10', 'range', '2026-02-17');

      const exportedJSON = exportHolidaysToJSON();

      expect(exportedJSON).toBeDefined();
      const parsed = JSON.parse(exportedJSON);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed.length).toBeGreaterThanOrEqual(2);
    });

    it('应该解析 CSV 格式的节假日', () => {
      const csvContent = `名称,开始日期,结束日期,描述
元旦,2026-01-01,,新年
春节,2026-02-10,2026-02-17,农历新年
清明节,2026-04-04,2026-04-06,扫墓`;

      const parsedHolidays = parseHolidayCSV(csvContent);

      expect(parsedHolidays.length).toBe(3);
      expect(parsedHolidays[0].name).toBe('元旦');
      expect(parsedHolidays[1].name).toBe('春节');
    });

    it('应该处理格式错误的 CSV', () => {
      const invalidCSV = `invalid,csv,format
data,data,data`;

      expect(() => {
        parseHolidayCSV(invalidCSV);
      }).not.toThrow();
    });

    it('应该处理空的节假日列表', () => {
      const result = batchImportHolidays([]);
      expect(result.imported).toBe(0);
    });
  });

  describe('统计功能', () => {
    beforeEach(() => {
      createHoliday('元旦', '2026-01-01');
      createHoliday('春节', '2026-02-10', 'range', '2026-02-17');
      createHoliday('清明节', '2026-04-04', 'range', '2026-04-06');
    });

    it('应该计算节假日统计信息', () => {
      const stats = getHolidayStats(2026);

      expect(stats).toBeDefined();
      expect(stats.total).toBeGreaterThan(0);
      expect(stats.byType).toBeDefined();
    });

    it('应该按类型统计节假日', () => {
      const stats = getHolidayStats(2026);

      expect(stats.byType.single).toBeDefined();
      expect(stats.byType.range).toBeDefined();
    });

    it('应该计算总放假天数', () => {
      const stats = getHolidayStats(2026);

      expect(stats.totalDays).toBeGreaterThan(0);
      expect(stats.totalDays).toBeGreaterThanOrEqual(stats.total);
    });

    it('应该处理没有节假日的年份', () => {
      const stats = getHolidayStats(2025);

      expect(stats.total).toBe(0);
      expect(stats.totalDays).toBe(0);
    });
  });

  describe('边界情况处理', () => {
    it('应该处理空名称', () => {
      const result = createHoliday('', '2026-03-01');
      expect(result.success).toBe(false);
    });

    it('应该处理空日期', () => {
      const result = createHoliday('测试', '');
      expect(result.success).toBe(false);
    });

    it('应该处理无效的日期格式', () => {
      const result = createHoliday('测试', 'invalid-date');
      expect(result.success).toBe(false);
    });

    it('应该处理不存在的节假日ID', () => {
      const result = updateHoliday('non-existent-id', { name: '更新' });
      expect(result.success).toBe(false);
    });

    it('应该处理删除不存在的节假日', () => {
      const result = deleteHoliday('non-existent-id');
      expect(result.success).toBe(false);
    });

    it('应该处理日期范围结束早于开始', () => {
      const result = createHoliday('测试', '2026-03-10', 'range', '2026-03-01');
      expect(result.success).toBe(false);
    });

    it('应该处理相同开始和结束日期', () => {
      const result = createHoliday('测试', '2026-03-01', 'range', '2026-03-01');
      expect(result.success).toBe(true);
      // 应该自动转换为单日节假日
      expect(result.holiday?.type).toBe('single');
    });
  });

  describe('数据持久化', () => {
    it('应该正确保存到 localStorage', () => {
      createHoliday('元旦', '2026-01-01');

      const storedData = localStorage.getItem('app_holidays');
      expect(storedData).toBeDefined();

      const parsedData = JSON.parse(storedData || '[]');
      expect(parsedData.length).toBeGreaterThan(0);
      expect(parsedData[0].name).toBe('元旦');
    });

    it('应该从 localStorage 读取数据', () => {
      const mockData: Holiday[] = [
        {
          id: 'test-id',
          name: '测试节日',
          date: '2026-03-01',
          type: 'single',
          description: '测试'
        }
      ];

      localStorage.setItem('app_holidays', JSON.stringify(mockData));

      const holidays = getAllHolidays();
      expect(holidays.length).toBe(1);
      expect(holidays[0].name).toBe('测试节日');
    });

    it('应该处理损坏的 localStorage 数据', () => {
      localStorage.setItem('app_holidays', 'invalid-json');

      expect(() => {
        getAllHolidays();
      }).not.toThrow();

      const holidays = getAllHolidays();
      expect(Array.isArray(holidays)).toBe(true);
    });

    it('应该处理空的 localStorage', () => {
      localStorage.removeItem('app_holidays');

      const holidays = getAllHolidays();
      expect(Array.isArray(holidays)).toBe(true);
    });
  });
});
