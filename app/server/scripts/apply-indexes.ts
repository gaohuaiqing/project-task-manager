import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'task_manager',
  multipleStatements: true
});

async function applyIndexes() {
  console.log('[索引] 开始创建性能优化索引...\n');

  const indexes = [
    // 项目表
    { table: 'projects', name: 'idx_projects_status', columns: 'status' },
    { table: 'projects', name: 'idx_projects_type', columns: 'project_type' },
    { table: 'projects', name: 'idx_projects_created_by', columns: 'created_by' },
    { table: 'projects', name: 'idx_projects_created_at', columns: 'created_at' },
    { table: 'projects', name: 'idx_projects_updated_at', columns: 'updated_at' },
    { table: 'projects', name: 'idx_projects_status_type', columns: 'status, project_type' },
    // 用户表
    { table: 'users', name: 'idx_users_role', columns: 'role' },
    // 会话表
    { table: 'sessions', name: 'idx_sessions_user_id', columns: 'user_id' },
    { table: 'sessions', name: 'idx_sessions_status', columns: 'status' },
    { table: 'sessions', name: 'idx_sessions_expires_at', columns: 'expires_at' },
    { table: 'sessions', name: 'idx_sessions_user_status', columns: 'user_id, status' },
    // WBS 任务表
    { table: 'wbs_tasks', name: 'idx_wbs_tasks_project_id', columns: 'project_id' },
    { table: 'wbs_tasks', name: 'idx_wbs_tasks_parent_id', columns: 'parent_id' },
    { table: 'wbs_tasks', name: 'idx_wbs_tasks_status', columns: 'status' },
    { table: 'wbs_tasks', name: 'idx_wbs_tasks_assignee_id', columns: 'assignee_id' },
    { table: 'wbs_tasks', name: 'idx_wbs_tasks_project_status', columns: 'project_id, status' },
    // 项目成员表
    { table: 'project_members', name: 'idx_project_members_project_id', columns: 'project_id' },
    { table: 'project_members', name: 'idx_project_members_user_id', columns: 'user_id' },
    // 里程碑表
    { table: 'milestones', name: 'idx_milestones_project_id', columns: 'project_id' },
    { table: 'milestones', name: 'idx_milestones_status', columns: 'status' },
    { table: 'milestones', name: 'idx_milestones_planned_date', columns: 'planned_date' }
  ];

  let created = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const idx of indexes) {
    try {
      // 检查索引是否已存在
      const [rows] = await pool.query(
        `SELECT COUNT(*) as count FROM information_schema.statistics
         WHERE table_schema = DATABASE() AND table_name = ? AND index_name = ?`,
        [idx.table, idx.name]
      ) as any[];

      if (rows[0].count > 0) {
        console.log(`[索引] ⏭️  跳过已存在: ${idx.name} (${idx.table})`);
        skipped++;
        continue;
      }

      // 创建索引
      await pool.query(`CREATE INDEX ${idx.name} ON ${idx.table}(${idx.columns})`);
      console.log(`[索引] ✅ 创建成功: ${idx.name} (${idx.table}.${idx.columns})`);
      created++;

    } catch (error: any) {
      const msg = `创建失败: ${idx.name} - ${error.message}`;
      console.log(`[索引] ❌ ${msg}`);
      errors.push(msg);
    }
  }

  console.log(`\n[索引] 📊 完成:`);
  console.log(`[索引]    创建: ${created} 个`);
  console.log(`[索引]    跳过: ${skipped} 个`);
  console.log(`[索引]    失败: ${errors.length} 个`);

  if (errors.length > 0) {
    console.log('\n[索引] ❌ 失败详情:');
    errors.forEach(e => console.log(`[索引]    - ${e}`));
  }

  await pool.end();
  process.exit(errors.length > 0 ? 1 : 0);
}

applyIndexes();
