/**
 * 节假日管理工具函数
 * 使用后端 MySQL 数据库存储节假日数据
 * 使用 CacheManager 统一管理本地缓存
 */

import type { Holiday, HolidayQueryParams, HolidayStats } from '@/types/holiday';
import { CacheManager } from '@/services/CacheManager';

const API_BASE = 'http://localhost:3001/api/global-data';
const DATA_TYPE = 'holidays';

/** 缓存键（使用统一的 cache:* 前缀） */
const CACHE_KEY = 'holidays';
/** 缓存 TTL: 30分钟（节假日数据变更频率低） */
const CACHE_TTL = 30 * 60 * 1000;

// 从后端获取所有节假日
async function fetchHolidays(): Promise<Holiday[]> {
  try {
    const response = await fetch(`${API_BASE}/get?dataType=${DATA_TYPE}&dataId=default`);
    if (!response.ok) {
      throw new Error('获取节假日数据失败');
    }
    const result = await response.json();
    if (result.success && result.data && result.data.length > 0) {
      const data = result.data[0].data_json;
      const holidays = JSON.parse(data) as Holiday[];

      // 缓存到本地
      CacheManager.set(CACHE_KEY, holidays, { ttl: CACHE_TTL });

      return holidays;
    }
    return [];
  } catch (error) {
    console.error('[HolidayManager] 从后端获取节假日失败:', error);
    // 降级：尝试从本地缓存读取
    const cached = CacheManager.get<Holiday[]>(CACHE_KEY);
    if (cached) {
      console.warn('[HolidayManager] 使用本地缓存数据');
      return cached;
    }
    return [];
  }
}

// 保存节假日到后端
async function saveHolidaysToBackend(holidays: Holiday[]): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dataType: DATA_TYPE,
        dataId: 'default',
        data: holidays,
        changeReason: '节假日数据更新'
      })
    });
    if (!response.ok) {
      throw new Error('保存节假日数据失败');
    }
    const result = await response.json();
    if (result.success) {
      // 更新本地缓存
      CacheManager.set(CACHE_KEY, holidays, { ttl: CACHE_TTL });
      return true;
    }
    return false;
  } catch (error) {
    console.error('[HolidayManager] 保存节假日到后端失败:', error);
    return false;
  }
}

// 获取所有节假日（带缓存）
export async function getAllHolidays(): Promise<Holiday[]> {
  // 先尝试从缓存获取
  const cached = CacheManager.get<Holiday[]>(CACHE_KEY);
  if (cached) {
    return cached;
  }

  // 从后端获取
  const holidays = await fetchHolidays();
  return holidays;
}

// 保存所有节假日
export async function saveHolidays(holidays: Holiday[]): Promise<boolean> {
  return await saveHolidaysToBackend(holidays);
}

// 根据ID获取节假日
export async function getHolidayById(id: string): Promise<Holiday | undefined> {
  const holidays = await getAllHolidays();
  return holidays.find(h => h.id === id);
}

// 创建节假日
export async function createHoliday(
  name: string,
  date: string,
  type: 'single' | 'range',
  endDate?: string,
  description?: string
): Promise<{ success: boolean; message: string; holiday?: Holiday }> {
  if (!name.trim()) {
    return { success: false, message: '请输入节假日名称' };
  }

  if (!date) {
    return { success: false, message: '请选择日期' };
  }

  // 修复Bug-P3-005: 添加日期有效性验证
  const parsedDate = new Date(date);
  const parsedEndDate = endDate ? new Date(endDate) : null;

  // 检查日期是否有效
  if (isNaN(parsedDate.getTime())) {
    return { success: false, message: '开始日期格式无效' };
  }

  if (type === 'range' && !endDate) {
    return { success: false, message: '请选择结束日期' };
  }

  if (type === 'range' && endDate && parsedEndDate && isNaN(parsedEndDate.getTime())) {
    return { success: false, message: '结束日期格式无效' };
  }

  if (type === 'range' && endDate && parsedEndDate && parsedDate > parsedEndDate) {
    return { success: false, message: '结束日期不能早于开始日期' };
  }

  const holidays = await getAllHolidays();

  // 检查日期冲突
  const hasConflict = holidays.some(h => {
    if (h.type === 'single') {
      return h.date === date || (type === 'range' && endDate && date <= h.date && h.date <= endDate);
    } else {
      // 范围节假日
      const hStart = h.date;
      const hEnd = h.endDate || h.date;
      const newStart = date;
      const newEnd = type === 'range' ? endDate : date;
      return (newStart && newStart <= hEnd && newEnd && newEnd >= hStart);
    }
  });

  if (hasConflict) {
    return { success: false, message: '该日期范围内已存在节假日' };
  }

  const now = new Date().toISOString();
  const newHoliday: Holiday = {
    id: `holiday_${Date.now()}`,
    name: name.trim(),
    date,
    endDate: type === 'range' ? endDate : undefined,
    type,
    description: description?.trim(),
    createdAt: now,
    updatedAt: now,
  };

  holidays.push(newHoliday);
  const saved = await saveHolidays(holidays);

  if (saved) {
    return { success: true, message: '节假日创建成功', holiday: newHoliday };
  } else {
    return { success: false, message: '保存失败，请重试' };
  }
}

// 更新节假日
export async function updateHoliday(
  id: string,
  updates: Partial<Omit<Holiday, 'id' | 'createdAt'>>
): Promise<{ success: boolean; message: string; holiday?: Holiday }> {
  const holidays = await getAllHolidays();
  const index = holidays.findIndex(h => h.id === id);

  if (index === -1) {
    return { success: false, message: '节假日不存在' };
  }

  // 检查日期冲突
  if (updates.date || updates.endDate) {
    const newDate = updates.date || holidays[index].date;
    const newEndDate = updates.endDate !== undefined ? updates.endDate : holidays[index].endDate;
    const newType = updates.type || holidays[index].type;

    const hasConflict = holidays.some((h, idx) => {
      if (h.id === id) return false; // 跳过自己

      if (h.type === 'single' && newType === 'single') {
        return h.date === newDate;
      } else if (h.type === 'single' && newType === 'range') {
        return newEndDate && newDate <= h.date && h.date <= newEndDate;
      } else if (h.type === 'range' && newType === 'single') {
        const hEnd = h.endDate || h.date;
        return newDate >= h.date && newDate <= hEnd;
      } else {
        // 都是 range
        const hEnd = h.endDate || h.date;
        const newEnd = newEndDate || newDate;
        return newDate <= hEnd && newEnd >= h.date;
      }
    });

    if (hasConflict) {
      return { success: false, message: '该日期范围内已存在节假日' };
    }
  }

  const updatedHoliday: Holiday = {
    ...holidays[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  holidays[index] = updatedHoliday;
  const saved = await saveHolidays(holidays);

  if (saved) {
    return { success: true, message: '节假日更新成功', holiday: updatedHoliday };
  } else {
    return { success: false, message: '保存失败，请重试' };
  }
}

// 删除节假日
export async function deleteHoliday(id: string): Promise<{ success: boolean; message: string }> {
  const holidays = await getAllHolidays();
  const index = holidays.findIndex(h => h.id === id);

  if (index === -1) {
    return { success: false, message: '节假日不存在' };
  }

  holidays.splice(index, 1);
  const saved = await saveHolidays(holidays);

  if (saved) {
    return { success: true, message: '节假日删除成功' };
  } else {
    return { success: false, message: '删除失败，请重试' };
  }
}

// 批量导入节假日
export async function batchImportHolidays(
  holidays: Array<{ name: string; date: string; endDate?: string; description?: string }>
): Promise<{ success: boolean; message: string; imported: number; failed: number; errors: string[] }> {
  const currentHolidays = await getAllHolidays();
  const newHolidays = [...currentHolidays];
  let imported = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const holiday of holidays) {
    try {
      const result = await createHoliday(
        holiday.name,
        holiday.date,
        holiday.endDate ? 'range' : 'single',
        holiday.endDate,
        holiday.description
      );

      if (result.success) {
        imported++;
        if (result.holiday) {
          newHolidays.push(result.holiday);
        }
      } else {
        failed++;
        errors.push(`${holiday.name} (${holiday.date}): ${result.message}`);
      }
    } catch (error) {
      failed++;
      errors.push(`${holiday.name} (${holiday.date}): 导入异常`);
    }
  }

  // 保存所有成功导入的数据
  if (imported > 0) {
    await saveHolidays(newHolidays);
  }

  return {
    success: failed === 0,
    message: imported > 0
      ? `成功导入 ${imported} 个节假日${failed > 0 ? `，${failed} 个失败` : ''}`
      : '导入失败',
    imported,
    failed,
    errors
  };
}

// 搜索节假日
export async function searchHolidays(params: HolidayQueryParams): Promise<Holiday[]> {
  const holidays = await getAllHolidays();

  return holidays.filter(holiday => {
    // 年份过滤
    if (params.year !== undefined) {
      const holidayYear = new Date(holiday.date).getFullYear();
      if (holidayYear !== params.year) return false;
    }

    // 类型过滤
    if (params.type && holiday.type !== params.type) return false;

    // 名称搜索
    if (params.keyword && !holiday.name.toLowerCase().includes(params.keyword.toLowerCase())) {
      return false;
    }

    // 日期范围过滤
    if (params.startDate && new Date(holiday.date) < new Date(params.startDate)) return false;
    if (params.endDate && new Date(holiday.date) > new Date(params.endDate)) return false;

    return true;
  });
}

// 获取节假日统计
export async function getHolidayStats(year?: number): Promise<HolidayStats> {
  const holidays = await getAllHolidays();
  const filteredHolidays = year
    ? holidays.filter(h => new Date(h.date).getFullYear() === year)
    : holidays;

  const totalDays = filteredHolidays.reduce((acc, h) => {
    if (h.type === 'range' && h.endDate) {
      const start = new Date(h.date);
      const end = new Date(h.endDate);
      return acc + Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    }
    return acc + 1;
  }, 0);

  // 修复Bug-P3-009: 统一返回值与接口定义（singleDayCount而非singleCount）
  return {
    totalCount: filteredHolidays.length,
    singleDayCount: filteredHolidays.filter(h => h.type === 'single').length,
    rangeCount: filteredHolidays.filter(h => h.type === 'range').length,
    totalDays
  };
}

// 检查日期是否为节假日
export async function isHoliday(date: string | Date): Promise<boolean> {
  const holidays = await getAllHolidays();
  const checkDate = date instanceof Date ? date.toISOString().split('T')[0] : date;

  return holidays.some(h => {
    if (h.type === 'single') {
      return h.date === checkDate;
    } else {
      const start = new Date(h.date);
      const end = h.endDate ? new Date(h.endDate) : start;
      const check = new Date(checkDate);
      return check >= start && check <= end;
    }
  });
}

// 获取日期范围内的所有节假日
export async function getHolidaysInRange(startDate: string, endDate: string): Promise<Holiday[]> {
  const holidays = await getAllHolidays();
  const start = new Date(startDate);
  const end = new Date(endDate);

  return holidays.filter(h => {
    const holidayStart = new Date(h.date);
    const holidayEnd = h.endDate ? new Date(h.endDate) : holidayStart;
    return holidayEnd >= start && holidayStart <= end;
  });
}

// 导出节假日为 JSON
export async function exportHolidaysToJSON(): Promise<string> {
  const holidays = await getAllHolidays();
  return JSON.stringify(holidays, null, 2);
}

// 导出节假日为 CSV
export async function exportHolidaysToCSV(): Promise<string> {
  const holidays = await getAllHolidays();

  const headers = ['名称', '开始日期', '结束日期', '类型', '描述'];
  const rows = holidays.map(h => [
    h.name,
    h.date,
    h.endDate || '',
    h.type === 'single' ? '单日' : '范围',
    h.description || ''
  ]);

  return [headers, ...rows]
    .map(row => row.map(cell => `"${cell}"`).join(','))
    .join('\n');
}

// 解析 CSV 导入
export function parseHolidayCSV(csvContent: string): Array<{ name: string; date: string; endDate?: string; description?: string }> {
  const lines = csvContent.trim().split('\n');
  if (lines.length < 2) return [];

  // 跳过标题行
  const dataLines = lines.slice(1);

  return dataLines.map(line => {
    const parts = line.match(/("([^"]*)"|([^,]*))(,|$)/g) || [];
    const values = parts.map(p => p.replace(/^"|"$/g, '').replace(/,$/, ''));

    return {
      name: values[0] || '',
      date: values[1] || '',
      endDate: values[2] || undefined,
      description: values[4] || undefined
    };
  }).filter(item => item.name && item.date);
}

// 获取所有节假日日期的数组（格式：YYYY-MM-DD）
export async function getAllHolidayDates(): Promise<string[]> {
  const holidays = await getAllHolidays();
  const dates: string[] = [];

  holidays.forEach(h => {
    if (h.type === 'single') {
      dates.push(h.date);
    } else if (h.endDate) {
      const start = new Date(h.date);
      const end = new Date(h.endDate);
      const current = new Date(start);

      while (current <= end) {
        dates.push(current.toISOString().split('T')[0]);
        current.setDate(current.getDate() + 1);
      }
    }
  });

  return dates;
}

// 清除所有节假日（谨慎使用）
export async function clearAllHolidays(): Promise<{ success: boolean; message: string }> {
  try {
    const response = await fetch(`${API_BASE}/delete`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dataType: DATA_TYPE,
        dataId: 'default',
        changeReason: '清空所有节假日'
      })
    });

    if (!response.ok) {
      throw new Error('清空节假日失败');
    }

    const result = await response.json();
    if (result.success) {
      // 清除本地缓存
      CacheManager.delete(CACHE_KEY);
      return { success: true, message: '节假日已全部清除' };
    }

    return { success: false, message: '清除失败，请重试' };
  } catch (error) {
    console.error('[HolidayManager] 清空节假日失败:', error);
    return { success: false, message: '清除失败，请重试' };
  }
}
