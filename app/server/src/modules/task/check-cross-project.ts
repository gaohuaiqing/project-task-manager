/**
 * 检查WBS编码异常 - 跨项目数据检查
 */

import { createPool, getPool } from '../../core/db/connection.js';

async function checkCrossProjectIssues() {
  await createPool();
  const pool = await getPool();
  const connection = await pool.getConnection();

  try {
    // 1. 检查跨项目的 parent_id 问题
    console.log('=== 跨项目 parent_id 检查 ===\n');

    const [crossProject] = await connection.execute(`
      SELECT t.id, t.project_id, t.wbs_code, t.description,
             p.project_id as parent_project_id, p.wbs_code as parent_wbs
      FROM wbs_tasks t
      JOIN wbs_tasks p ON t.parent_id = p.id
      WHERE t.project_id != p.project_id
    `);

    console.log(`发现 ${(crossProject as any[]).length} 条跨项目 parent_id 记录\n`);

    for (const row of crossProject as any[]) {
      console.log(`任务 ${row.wbs_code} (项目${row.project_id}) 父任务在项目${row.parent_project_id}: ${row.parent_wbs}`);
      console.log(`  描述: ${row.description?.substring(0, 40)}`);
    }

    // 2. 检查项目内的父子编码匹配
    console.log('\n=== 项目内父子编码匹配检查 ===\n');

    const [mismatch] = await connection.execute(`
      SELECT t.id, t.project_id, t.wbs_code, t.description, t.parent_id,
             p.wbs_code as parent_wbs, p.id as parent_id_check
      FROM wbs_tasks t
      JOIN wbs_tasks p ON t.parent_id = p.id
      WHERE t.project_id = p.project_id
        AND t.wbs_code NOT LIKE CONCAT(p.wbs_code, '.%')
    `);

    console.log(`发现 ${(mismatch as any[]).length} 条项目内编码不匹配记录\n`);

    for (const row of mismatch as any[]) {
      console.log(`项目${row.project_id}: 子 ${row.wbs_code} (父: ${row.parent_wbs}) - ${row.description?.substring(0, 30)}`);
    }

    // 3. 检查孤儿任务（parent_id 指向不存在的任务）
    console.log('\n=== 孤儿任务检查 ===\n');

    const [orphans] = await connection.execute(`
      SELECT t.id, t.project_id, t.wbs_code, t.description, t.parent_id
      FROM wbs_tasks t
      LEFT JOIN wbs_tasks p ON t.parent_id = p.id
      WHERE t.parent_id IS NOT NULL AND p.id IS NULL
    `);

    console.log(`发现 ${(orphans as any[]).length} 条孤儿任务记录\n`);

    for (const row of orphans as any[]) {
      console.log(`项目${row.project_id}: ${row.wbs_code} - ${row.description?.substring(0, 30)}`);
    }

  } finally {
    connection.release();
    process.exit(0);
  }
}

checkCrossProjectIssues().catch(err => {
  console.error('查询失败:', err);
  process.exit(1);
});
