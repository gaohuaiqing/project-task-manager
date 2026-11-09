/**
 * 数据库迁移 066: plan_changes 加 assignee_id 列 + 历史回填
 *
 * 目标：
 * 1. plan_changes 加 assignee_id INT NULL + 索引（「变更生效时的负责人」快照，NULL=当时未分配）
 * 2. 历史回填按指派通知区间法（spec 11.2.1）：
 *    plan_changes 无 task_delayed 式同秒通知锚，改用 task_assigned 通知序列重建指派时间轴
 *    生效时点 eff_time = COALESCE(approved_at, created_at)
 *    （approved 行用审批通过时间，pending/timeout 用创建时间）
 *    归属 = 该任务最后一条 created_at <= eff_time 的 task_assigned 通知的 user_id
 *    无匹配（生效时点早于全部指派通知）→ 保持 NULL = 当时未分配
 *
 * 4. 兜底③（无通知任务当前值，精确推理，v2 修订）：
 *    task_assigned 通知只在 assignee 变更路径发出（task/service.ts assignee 变更分支，
 *    含 null→B 首指派；创建时带 assignee 不发）。
 *    故「任务无任何 task_assigned 通知」⇔「创建后 assignee 从未被设置或变更」
 *    ⇒ 当前 assignee 即全部历史时点的 assignee——兜底为精确推理而非近似
 *    （唯一误差 = 通知功能上线前的转派史丢失，dry-run 抽查覆盖）。
 *    「有通知但变更早于首条」的行保持 NULL（保守）。
 *
 * 幂等性：
 * - run-migration.ts migrations 表保证只执行一次
 * - 加列前 INFORMATION_SCHEMA 检查；回填 WHERE assignee_id IS NULL 可安全重跑
 *
 * 注意：assignee_id 不加外键（回填值可能指向已删用户；悬空时 JOIN 不到名字显示「未知」）
 */
import { getPool } from '../core/db';
import type { RowDataPacket, ResultSetHeader } from 'mysql2/promise';

const MIGRATION_VERSION = '066';

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
  console.log(`[Migration ${MIGRATION_VERSION}] plan_changes 加 assignee_id 列...`);
  const pool = getPool();

  // 1. 加列（幂等）
  if (!(await columnExists('plan_changes', 'assignee_id'))) {
    await pool.execute(
      `ALTER TABLE plan_changes
       ADD COLUMN assignee_id INT NULL COMMENT '变更生效时的负责人快照（区间法回填）' AFTER user_id,
       ADD INDEX idx_pc_assignee (assignee_id)`
    );
    console.log(`[Migration ${MIGRATION_VERSION}] assignee_id 列已添加`);
  } else {
    console.log(`[Migration ${MIGRATION_VERSION}] assignee_id 列已存在，跳过 ALTER`);
  }

  // 2. dry-run 统计（回填前）
  const [before] = await pool.execute<RowDataPacket[]>(
    `SELECT COUNT(*) AS total,
            SUM(CASE WHEN assignee_id IS NULL THEN 1 ELSE 0 END) AS unfilled
     FROM plan_changes`
  );
  console.log(`[Migration ${MIGRATION_VERSION}] 回填前: 总变更 ${before[0].total}, 未填 ${before[0].unfilled}`);

  // 3. 回填：指派通知区间法（生效时点 = COALESCE(approved_at, created_at)，
  //    取该任务 <= eff_time 的最后一条 task_assigned 通知的 user_id；
  //    无匹配 = 当时未分配，保持 NULL）
  const [r1] = await pool.execute<ResultSetHeader>(
    `UPDATE plan_changes pc
     JOIN (
       SELECT pc_id, user_id FROM (
         SELECT pc2.id AS pc_id, n.user_id,
                ROW_NUMBER() OVER (PARTITION BY pc2.id ORDER BY n.created_at DESC) AS rn
         FROM plan_changes pc2
         JOIN notifications n ON n.type = 'task_assigned'
           AND n.task_id = pc2.task_id
           AND n.created_at <= COALESCE(pc2.approved_at, pc2.created_at)
         WHERE pc2.assignee_id IS NULL
       ) ranked
       WHERE rn = 1
     ) m ON pc.id = m.pc_id
     SET pc.assignee_id = m.user_id
     WHERE pc.assignee_id IS NULL`
  );
  console.log(`[Migration ${MIGRATION_VERSION}] 回填指派通知区间法: ${r1.affectedRows} 行`);

  // 3b. 兜底③：无通知任务当前值（精确推理）——任务无任何 task_assigned 通知
  //     ⇒ 创建后 assignee 从未被设置或变更 ⇒ 当前 assignee 即全部历史时点的 assignee；
  //     仅当当前 assignee 非空时回填，当前也未指派的任务保持 NULL
  const [r3] = await pool.execute<ResultSetHeader>(
    `UPDATE plan_changes pc
     JOIN wbs_tasks t ON pc.task_id = t.id
     SET pc.assignee_id = t.assignee_id
     WHERE pc.assignee_id IS NULL
       AND t.assignee_id IS NOT NULL
       AND NOT EXISTS (
         SELECT 1 FROM notifications n
         WHERE n.type = 'task_assigned' AND n.task_id = pc.task_id
       )`
  );
  console.log(`[Migration ${MIGRATION_VERSION}] 兜底③(无通知任务当前值,精确推理): ${r3.affectedRows} 行`);

  // 4. dry-run 统计（回填后）
  const [after] = await pool.execute<RowDataPacket[]>(
    `SELECT COUNT(*) AS total,
            SUM(CASE WHEN assignee_id IS NULL THEN 1 ELSE 0 END) AS unfilled
     FROM plan_changes`
  );
  console.log(`[Migration ${MIGRATION_VERSION}] 回填后: 总变更 ${after[0].total}, 未填 ${after[0].unfilled}（预期=无通知且当前未指派 + 生效时点早于全部指派通知的行，语义=当时未分配）`);
}
