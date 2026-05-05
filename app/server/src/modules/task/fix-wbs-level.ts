/**
 * 修复 wbs_level 与实际编码层级不一致的问题
 */

import { createPool, getPool } from '../../core/db/connection.js';

async function fixWbsLevel() {
  await createPool();
  const pool = await getPool();
  const connection = await pool.getConnection();

  try {
    console.log('开始修复 wbs_level...\n');

    // 1. 找出所有层级不一致的任务
    const [mismatch] = await connection.execute(`
      SELECT id, project_id, wbs_code, wbs_level, description
      FROM wbs_tasks
      WHERE wbs_level != (LENGTH(wbs_code) - LENGTH(REPLACE(wbs_code, '.', '')) + 1)
    `);

    const tasks = mismatch as any[];
    console.log(`发现 ${tasks.length} 条需要修复的记录\n`);

    if (tasks.length === 0) {
      console.log('无需修复');
      process.exit(0);
      return;
    }

    // 2. 修复每条任务
    await connection.beginTransaction();

    for (const task of tasks) {
      const actualLevel = task.wbs_code.split('.').length;
      console.log(`  项目${task.project_id}: ${task.wbs_code} (level ${task.wbs_level} → ${actualLevel}): ${task.description?.substring(0, 30)}`);

      await connection.execute(
        'UPDATE wbs_tasks SET wbs_level = ? WHERE id = ?',
        [actualLevel, task.id]
      );
    }

    await connection.commit();
    console.log('\n修复完成！');

    // 3. 验证
    const [remaining] = await connection.execute(`
      SELECT COUNT(*) as cnt FROM wbs_tasks
      WHERE wbs_level != (LENGTH(wbs_code) - LENGTH(REPLACE(wbs_code, '.', '')) + 1)
    `);
    console.log(`剩余不一致记录: ${(remaining as any[])[0].cnt}`);

  } catch (error) {
    await connection.rollback();
    console.error('修复失败:', error);
    throw error;
  } finally {
    connection.release();
    process.exit(0);
  }
}

fixWbsLevel().catch(err => {
  console.error('脚本执行失败:', err);
  process.exit(1);
});