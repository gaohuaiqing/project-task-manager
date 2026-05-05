/**
 * 检查异常WBS编码
 */

import { createPool, getPool } from '../../core/db/connection.js';

async function checkAnomalies() {
  await createPool();
  const pool = await getPool();
  const connection = await pool.getConnection();

  try {
    // 查找所有两位数开头的WBS编码（如 11.x, 12.x 等）
    const [anomalies] = await connection.execute(`
      SELECT id, project_id, wbs_code, description, parent_id, wbs_level
      FROM wbs_tasks
      WHERE wbs_code REGEXP '^[0-9]{2,}'
      ORDER BY project_id, wbs_code
    `);

    console.log('=== 异常WBS编码检查 ===\n');
    console.log(`发现 ${(anomalies as any[]).length} 条异常编码\n`);

    for (const row of anomalies as any[]) {
      console.log(`项目 ${row.project_id}: ${row.wbs_code} - ${row.description?.substring(0, 40)}`);
      console.log(`  ID: ${row.id}, 父任务: ${row.parent_id || '无'}, 等级: ${row.wbs_level}`);
    }

    // 查找编码不匹配父任务的记录
    const [orphans] = await connection.execute(`
      SELECT t.id, t.project_id, t.wbs_code, t.description, t.parent_id, p.wbs_code as parent_wbs
      FROM wbs_tasks t
      LEFT JOIN wbs_tasks p ON t.parent_id = p.id
      WHERE t.parent_id IS NOT NULL
        AND t.wbs_code NOT LIKE CONCAT(p.wbs_code, '.%')
    `);

    console.log('\n=== 父子编码不匹配检查 ===\n');
    console.log(`发现 ${(orphans as any[]).length} 条不匹配记录\n`);

    for (const row of orphans as any[]) {
      console.log(`${row.wbs_code} (父: ${row.parent_wbs}) - ${row.description?.substring(0, 30)}`);
    }

  } finally {
    connection.release();
    process.exit(0);
  }
}

checkAnomalies().catch(err => {
  console.error('查询失败:', err);
  process.exit(1);
});
