/**
 * 节假日类型定义
 */

// 节假日类型
export interface Holiday {
  id: string;
  name: string;
  date: string; // ISO 格式日期 YYYY-MM-DD
  endDate?: string; // 可选，用于日期范围
  type: 'single' | 'range'; // 单日或日期范围
  description?: string;
  createdAt: string;
  updatedAt: string;
}

// 节假日表单数据
export interface HolidayFormData {
  name: string;
  date: Date | undefined;
  endDate: Date | undefined;
  type: 'single' | 'range';
  description: string;
}

// 节假日查询参数
export interface HolidayQueryParams {
  year?: number;
  month?: number;
  keyword?: string;
}

// 节假日统计信息
export interface HolidayStats {
  totalCount: number;
  singleDayCount: number;
  rangeCount: number;
  totalDays: number;
}
