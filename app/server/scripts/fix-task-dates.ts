/**
 * 修复任务结束日期脚本
 *
 * 问题：部分任务的结束日期计算错误
 * 原因：workingDays.ts 中使用了错误的字段名 is_working_day，应该是 is_workday
 *
 * 此脚本会重新计算所有任务的结束日期
 */

import mysql from 'mysql2/promise';
import type { RowDataPacket, ResultSetHeader, Pool } from 'mysql2/promise';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// ES module 兼容
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 加载环境变量
dotenv.config({ path: resolve(__dirname, '../.env') });

interface TaskRow extends RowDataPacket {
  id: string;
  wbs_code: string;
  description: string;
  start_date: Date;
  end_date: Date;
  duration: number;
  is_six_day_week: boolean;
  predecessor_id: string | null;
  lag_days: number | null;
}

interface HolidayRow extends RowDataPacket {
  holiday_date: Date;
  is_workday: boolean;
}

// 节假日缓存
let holidayCache: Map<string, boolean> | null = null;

async function loadHolidays(pool: Pool): Promise<Map<string, boolean>> {
  if (holidayCache) return holidayCache;

  const data = new Map<string, boolean>();

  try {
    const [rows] = await pool.execute<HolidayRow[]>(
      'SELECT holiday_date, is_workday FROM holidays WHERE holiday_date >= CURDATE() - INTERVAL 2 YEAR'
    );

    rows.forEach((row) => {
      const dateStr = formatDate(row.holiday_date);
      data.set(dateStr, row.is_workday === true || (row.is_workday as unknown) === 1);
    });

    console.log(`加载了 ${data.size} 个节假日配置`);
  } catch (error) {
    console.warn('加载节假日失败，将只按周末判断:', error);
  }

  holidayCache = data;
  return data;
}

function formatDate(date: Date): string {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function isWeekend(date: Date, isSixDayWeek: boolean): boolean {
  const dayOfWeek = date.getDay();
  if (isSixDayWeek) {
    return dayOfWeek === 0; // 六天工作制，只休息周日
  }
  return dayOfWeek === 0 || dayOfWeek === 6; // 五天工作制，休息周六周日
}

async function isWorkingDay(date: Date, isSixDayWeek: boolean, holidays: Map<string, boolean>): Promise<boolean> {
  const dateStr = formatDate(date);
  if (holidays.has(dateStr)) {
    return holidays.get(dateStr)!;
  }
  return !isWeekend(date, isSixDayWeek);
}

async function addWorkingDays(startDate: Date, days: number, isSixDayWeek: boolean, holidays: Map<string, boolean>): Promise<Date> {
  const result = new Date(startDate);
  result.setHours(0, 0, 0, 0);

  if (days === 0) return result;

  const direction = days > 0 ? 1 : -1;
  let remainingDays = Math.abs(days);

  while (remainingDays > 0) {
    result.setDate(result.getDate() + direction);
    const isWorkDay = await isWorkingDay(result, isSixDayWeek, holidays);
    if (isWorkDay) {
      remainingDays--;
    }
  }

  return result;
}

async function calculateEndDate(startDate: Date, duration: number, isSixDayWeek: boolean, holidays: Map<string, boolean>): Promise<Date> {
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);

  if (duration <= 0) return start;

  // 工期从1开始计算，所以需要减1天
  return addWorkingDays(start, duration - 1, isSixDayWeek, holidays);
}

async function main() {
  console.log('========== 修复任务结束日期 ==========\n');

  // 创建数据库连接池
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'task_manager',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  });

  const holidays = await loadHolidays(pool);

  // 获取所有任务
  const [tasks] = await pool.execute<TaskRow[]>(
    'SELECT id, wbs_code, description, start_date, end_date, duration, is_six_day_week, predecessor_id, lag_days FROM wbs_tasks ORDER BY wbs_code'
  );

  console.log(`共找到 ${tasks.length} 个任务\n`);

  let fixedCount = 0;
  const errors: string[] = [];

  for (const task of tasks) {
    if (!task.start_date || !task.duration) {
      continue;
    }

    const startDate = new Date(task.start_date);
    const correctEndDate = await calculateEndDate(startDate, task.duration, task.is_six_day_week, holidays);
    const currentEndDate = new Date(task.end_date);

    const diffDays = Math.round((currentEndDate.getTime() - correctEndDate.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays !== 0) {
      console.log(`[${task.wbs_code}] ${task.description}`);
      console.log(`  当前结束日期: ${formatDate(currentEndDate)}`);
      console.log(`  正确结束日期: ${formatDate(correctEndDate)}`);
      console.log(`  差异: ${diffDays}天`);
      console.log(`  开始: ${formatDate(startDate)}, 工期: ${task.duration}天, 六天制: ${task.is_six_day_week ? '是' : '否'}`);

      // 计算计划周期（日历天数）
      const plannedDuration = Math.round((correctEndDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

      // 更新数据库
      try {
        await pool.execute<ResultSetHeader>(
          'UPDATE wbs_tasks SET end_date = ?, planned_duration = ?, version = version + 1 WHERE id = ?',
          [formatDate(correctEndDate), plannedDuration, task.id]
        );
        console.log(`  ✓ 已修复`);
        fixedCount++;
      } catch (err) {
        const errorMsg = `修复任务 ${task.wbs_code} 失败: ${err}`;
        console.error(`  ✗ ${errorMsg}`);
        errors.push(errorMsg);
      }
      console.log('');
    }
  }

  console.log('========== 修复完成 ==========');
  console.log(`总任务数: ${tasks.length}`);
  console.log(`已修复: ${fixedCount}`);
  console.log(`失败: ${errors.length}`);

  if (errors.length > 0) {
    console.log('\n错误详情:');
    errors.forEach(e => console.log(`  - ${e}`));
  }

  await pool.end();
  process.exit(0);
}

main().catch((err) => {
  console.error('脚本执行失败:', err);
  process.exit(1);
});
