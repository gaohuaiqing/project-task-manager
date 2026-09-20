/**
 * fixed26 存量数据修复：13 个任务的 end_date/planned_duration/status 重算
 * 在生产容器内运行（与线上代码/节假日配置同源）：
 *   end_date = start_date + duration 个工作日（五天/六天制 + holidays 表）
 *   status   = TaskService.calculateStatus（用新 end_date）
 * 幂等可重跑；执行前已备份旧行至 backup-pre-fix26-recalc.tsv
 */
process.env.DB_HOST = process.env.DB_HOST || '127.0.0.1';
process.env.DB_PORT = process.env.DB_PORT || '3306';
process.env.DB_USER = process.env.DB_USER || 'root';
process.env.DB_NAME = process.env.DB_NAME || 'task_manager';

const IDS = [
  'be4cc5b2-654b-4324-bb75-35ecc59620a2', // TGC显示固件开发(父)
  '4b0488a8-1d70-4de5-8141-655891ade9a7', // 固件测试
  '7e08d75c-a426-4846-b709-3bf501490107', // 代码编写
  '81a58feb-125a-4149-9378-b8ff84956692', // 详细设计
  '87f342c4-1b7a-463c-ac83-dc8378407540', // 概要设计
  '97a44105-8f0a-400d-b393-3ebcca319781', // 版本发布
  'fc72cb58-c41b-4210-80f3-1794b3f55cc9', // 需求分析
  'b15f75d7-b8c3-40e4-b2e9-0dcb82d9a9d8', // A20心脏机恢复包需求变更
  'cb6d1da8-3892-49c9-85a7-5ebb4e60e37f', // Tesla 测试验证
  '53eb41e6-a752-4326-bbdb-0c783b6e80e9', // Mx20 WIN11 接口类
  '0ad653da-a78e-450e-804e-488783ad1688', // Mx20 WIN11 数据上传驱动
  'e18fb758-39cf-4f78-9e96-23f5100c28ec', // MX20 画屏固件开发
  '85614e9d-caa0-4532-afc8-cbc428a16247', // 日志部分
];

async function main() {
  const { createPool, getPool, closePool } = require('/app/app/server/dist/core/db');
  const { calculateEndDate } = require('/app/app/server/dist/core/utils/workingDays');
  const { TaskService } = require('/app/app/server/dist/modules/task/service');

  createPool();
  const pool = getPool();
  const placeholders = IDS.map(() => '?').join(',');
  const [rows] = await pool.execute(
    `SELECT id, description, status, start_date, end_date, duration, planned_duration,
            is_six_day_week, actual_start_date, actual_end_date, warning_days,
            pending_changes, pending_change_type
     FROM wbs_tasks WHERE id IN (${placeholders})`, IDS);

  if (rows.length !== IDS.length) {
    throw new Error(`预期 ${IDS.length} 行，实际 ${rows.length} 行，中止`);
  }

  const fmt = d => new Date(d).toISOString().slice(0, 10);
  console.log('任务'.padEnd(24) + '旧end→新end'.padEnd(26) + '旧planned→新'.padEnd(16) + '旧status→新status');

  for (const t of rows) {
    const isSix = !!t.is_six_day_week;
    const newEnd = await calculateEndDate(t.start_date, t.duration, isSix);
    // planned_duration = 计划周期（日历天数，含首尾）
    const planned = Math.round((newEnd.getTime() - new Date(t.start_date).setHours(0,0,0,0)) / 86400000) + 1;
    const newStatus = TaskService.calculateStatus({
      pending_changes: t.pending_changes,
      pending_change_type: t.pending_change_type,
      end_date: newEnd,
      actual_start_date: t.actual_start_date,
      actual_end_date: t.actual_end_date,
      warning_days: t.warning_days,
    });

    if (!process.env.DRY_RUN) {
      await pool.execute(
        `UPDATE wbs_tasks SET end_date = ?, planned_duration = ?, status = ?, version = version + 1 WHERE id = ?`,
        [fmt(newEnd), planned, newStatus, t.id]);
    }

    console.log(
      String(t.description).slice(0, 20).padEnd(24) +
      `${fmt(t.end_date)} → ${fmt(newEnd)}${isSix ? '(6天)' : ''}`.padEnd(30) +
      `${t.planned_duration} → ${planned}`.padEnd(16) +
      `${t.status} → ${newStatus}`);
  }

  console.log(`\n${process.env.DRY_RUN ? '[DRY_RUN] 未写入，仅预览' : '重算完成，已写入'}`);
  await closePool();
  process.exit(0);
}

main().catch(e => { console.error('重算失败:', e); process.exit(1); });
