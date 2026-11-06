/**
 * 数据库迁移 065: delay_records 加 assignee_id 列 + 历史回填
 *
 * 目标：
 * 1. delay_records 加 assignee_id INT NULL + 索引（「当时负责人」快照，NULL=未知/未分配）
 * 2. 历史回填按 task_delayed 通知直连（spec 4.2 v2 算法，审计锚已证伪）：
 *    cron 写 delay_records 的同一循环发 task_delayed 通知给当时负责人
 *    （task_id 正确 UUID + user_id=当时 assignee + 同秒时间戳）→ 事件级 1:1 直连
 *    无匹配通知且事件时任务已有指派（存在 task_assigned 通知 ≤ 事件时间）
 *    → 当前 assignee 兜底；事件时任务未分配 → 保持 NULL（前端展示「未分配」）
 *
 * 幂等性：
 * - run-migration.ts migrations 表保证只执行一次
 * - 加列前 INFORMATION_SCHEMA 检查；回填 WHERE assignee_id IS NULL 可安全重跑
 *
 * 注意：assignee_id 不加外键（回填值可能指向已删用户；悬空时 JOIN 不到名字显示「未知」）
 */
import { getPool } from '../core/db';
import type { RowDataPacket, ResultSetHeader } from 'mysql2/promise';

const MIGRATION_VERSION = '065';

async function columnExists(table: string, column: string): Promise<boolean> {
  const pool = getPool();
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT COUNT(*) AS cnt FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [table, column]
  );
  return Number(rows[0]?.cnt) > 0;
}

export async function up(): Promise<void> {
  console.log(`[Migration ${MIGRATION_VERSION}] delay_records 加 assignee_id 列...`);
  const pool = getPool();

  // 1. 加列（幂等）
  if (!(await columnExists('delay_records', 'assignee_id'))) {
    await pool.execute(
      `ALTER TABLE delay_records
       ADD COLUMN assignee_id INT NULL COMMENT '延期发生时的负责人快照（历史按task_delayed通知直连回填）' AFTER recorded_by,
       ADD INDEX idx_delays_assignee (assignee_id)`
    );
    console.log(`[Migration ${MIGRATION_VERSION}] assignee_id 列已添加`);
  } else {
    console.log(`[Migration ${MIGRATION_VERSION}] assignee_id 列已存在，跳过 ALTER`);
  }

  // 2. dry-run 统计（回填前）
  const [before] = await pool.execute<RowDataPacket[]>(
    `SELECT COUNT(*) AS total,
            SUM(CASE WHEN assignee_id IS NULL THEN 1 ELSE 0 END) AS unfilled
     FROM delay_records`
  );
  console.log(`[Migration ${MIGRATION_VERSION}] 回填前: 总事件 ${before[0].total}, 未填 ${before[0].unfilled}`);

  // 3. 回填①：通知直连（ROW_NUMBER 窗口防歧义——±120s 内多条通知取时间差最小一条）
  const [r1] = await pool.execute<ResultSetHeader>(
    `UPDATE delay_records dr
     JOIN (
       SELECT dr_id, user_id FROM (
         SELECT dr2.id AS dr_id, n.user_id,
                ROW_NUMBER() OVER (PARTITION BY dr2.id
                  ORDER BY ABS(TIMESTAMPDIFF(SECOND, n.created_at, dr2.created_at))) AS rn
         FROM delay_records dr2
         JOIN notifications n ON n.type = 'task_delayed'
           AND n.task_id = dr2.task_id
           AND ABS(TIMESTAMPDIFF(SECOND, n.created_at, dr2.created_at)) <= 120
         WHERE dr2.assignee_id IS NULL
       ) w WHERE w.rn = 1
     ) pick ON pick.dr_id = dr.id
     SET dr.assignee_id = pick.user_id
     WHERE dr.assignee_id IS NULL`
  );
  console.log(`[Migration ${MIGRATION_VERSION}] 回填①通知直连: ${r1.affectedRows} 行`);

  // 4. 回填②：兜底当前 assignee（仅限事件时任务已指派——存在 task_assigned 通知 ≤ 事件时间；
  //    事件时未分配的任务保持 NULL，避免把延期旧账错记给事件后才上任的负责人）
  const [r2] = await pool.execute<ResultSetHeader>(
    `UPDATE delay_records dr
     JOIN wbs_tasks t ON dr.task_id = t.id
     SET dr.assignee_id = t.assignee_id
     WHERE dr.assignee_id IS NULL
       AND EXISTS (
         SELECT 1 FROM notifications n
         WHERE n.type = 'task_assigned' AND n.task_id = dr.task_id
           AND n.created_at <= dr.created_at
       )`
  );
  console.log(`[Migration ${MIGRATION_VERSION}] 回填②当前值兜底(仅已指派): ${r2.affectedRows} 行`);

  // 4. dry-run 统计（回填后）
  const [after] = await pool.execute<RowDataPacket[]>(
    `SELECT COUNT(*) AS total,
            SUM(CASE WHEN assignee_id IS NULL THEN 1 ELSE 0 END) AS unfilled
     FROM delay_records`
  );
  console.log(`[Migration ${MIGRATION_VERSION}] 回填后: 总事件 ${after[0].total}, 未填 ${after[0].unfilled}`);
}
