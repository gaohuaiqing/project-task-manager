import { createPool, getPool } from '../../core/db/connection.js';

async function quickCheck() {
  await createPool();
  const pool = await getPool();
  const connection = await pool.getConnection();

  try {
    const [sample] = await connection.execute(`
      SELECT project_id, wbs_code, wbs_level, description
      FROM wbs_tasks
      WHERE project_id IN (17, 20, 24)
      ORDER BY project_id, wbs_order
      LIMIT 30
    `);

    console.log('样本数据检查:');
    for (const row of sample as any[]) {
      console.log(`项目${row.project_id}: ${row.wbs_code} (level=${row.wbs_level}) - ${row.description?.substring(0, 25)}`);
    }
  } finally {
    connection.release();
    process.exit(0);
  }
}

quickCheck().catch(err => {
  console.error('错误:', err);
  process.exit(1);
});