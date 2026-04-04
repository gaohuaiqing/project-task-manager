const mysql = require('mysql2/promise');

async function check() {
  const pool = await mysql.createPool({
    host: 'localhost',
    user: 'root',
    database: 'task_manager',
    waitForConnections: true,
  });

  console.log('=== 项目列表 ===');
  const [projects] = await pool.execute('SELECT id, code, name, status FROM projects');
  for (const p of projects) {
    console.log(`[${p.id}] ${p.code || 'N/A'} - ${p.name} (${p.status})`);
  }

  console.log('');
  console.log('=== 任务统计 ===');
  const [stats] = await pool.execute('SELECT COUNT(*) as total FROM wbs_tasks');
  console.log(`总任务数: ${stats[0].total}`);

  console.log('');
  console.log('=== 各项目任务数 ===');
  const [taskCounts] = await pool.execute(`
    SELECT p.id, p.name, COUNT(t.id) as cnt
    FROM projects p
    LEFT JOIN wbs_tasks t ON t.project_id = p.id
    GROUP BY p.id, p.name
    ORDER BY cnt DESC
  `);
  for (const tc of taskCounts) {
    console.log(`[${tc.id}] ${tc.name}: ${tc.cnt} 个任务`);
  }

  console.log('');
  console.log('=== 最近的任务 ===');
  const [recentTasks] = await pool.execute(`
    SELECT t.id, t.wbs_code, t.description, p.name as project_name, t.status, t.created_at
    FROM wbs_tasks t
    LEFT JOIN projects p ON t.project_id = p.id
    ORDER BY t.created_at DESC
    LIMIT 20
  `);
  for (const t of recentTasks) {
    const desc = (t.description || '').substring(0, 40);
    console.log(`[${t.wbs_code}] ${desc}... | 项目: ${t.project_name || '无'} | ${t.status}`);
  }

  await pool.end();
}

check().catch(e => console.error('错误:', e.message));
