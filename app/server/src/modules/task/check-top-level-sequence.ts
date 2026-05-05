import { createPool, getPool } from '../../core/db/connection.js';

async function checkTopLevelSequence() {
  await createPool();
  const pool = await getPool();
  const connection = await pool.getConnection();

  try {
    console.log('=== 检查顶级任务编码连续性 ===\n');

    const [projects] = await connection.execute(
      'SELECT DISTINCT project_id FROM wbs_tasks ORDER BY project_id'
    );

    for (const project of projects as any[]) {
      const projectId = project.project_id;

      const [topTasks] = await connection.execute(`
        SELECT id, wbs_code, description, parent_id
        FROM wbs_tasks
        WHERE project_id = ? AND parent_id IS NULL
        ORDER BY wbs_order
      `, [projectId]);

      const tasks = topTasks as any[];
      console.log(`\n项目 ${projectId} - ${tasks.length} 个顶级任务:`);

      const codes = tasks.map(t => parseInt(t.wbs_code.split('.')[0]));

      // 检查是否从1开始
      if (codes[0] !== 1) {
        console.log(`  ❌ 不从1开始，首编码=${codes[0]}`);
      }

      // 检查是否连续
      let hasGap = false;
      for (let i = 1; i < codes.length; i++) {
        if (codes[i] !== codes[i-1] + 1) {
          console.log(`  ❌ 编码不连续: ${codes[i-1]} → ${codes[i]}`);
          hasGap = true;
        }
      }

      if (!hasGap && codes[0] === 1) {
        console.log(`  ✅ 编码连续: 1 → ${codes[codes.length-1]}`);
      } else {
        console.log(`  编码列表: ${codes.join(', ')}`);
      }
    }

  } finally {
    connection.release();
    process.exit(0);
  }
}

checkTopLevelSequence().catch(err => {
  console.error('错误:', err);
  process.exit(1);
});