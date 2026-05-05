/**
 * 跨项目 parent_id 修复脚本 v2
 * 简化SQL查询，避免复杂操作
 */

import { createPool, getPool } from '../../core/db/connection.js';

function wbsCodeToSortableOrder(wbsCode: string): string {
  return wbsCode.split('.').map(s => s.padStart(5, '0')).join('.');
}

async function fixCrossProjectParents() {
  await createPool();
  const pool = await getPool();
  const connection = await pool.getConnection();

  try {
    console.log('开始修复跨项目 parent_id...\n');

    // 1. 找出所有跨项目的 parent_id 任务
    const [crossProject] = await connection.execute(`
      SELECT t.id, t.project_id, t.wbs_code, t.description, t.parent_id
      FROM wbs_tasks t
      JOIN wbs_tasks p ON t.parent_id = p.id
      WHERE t.project_id != p.project_id
      ORDER BY t.project_id, t.wbs_code
    `);

    const tasks = crossProject as any[];
    console.log(`发现 ${tasks.length} 条跨项目 parent_id 记录\n`);

    if (tasks.length === 0) {
      console.log('没有需要修复的记录');
      process.exit(0);
      return;
    }

    // 2. 按项目分组
    const projectGroups = new Map<number, any[]>();
    for (const row of tasks) {
      if (!projectGroups.has(row.project_id)) {
        projectGroups.set(row.project_id, []);
      }
      projectGroups.get(row.project_id)!.push(row);
    }

    // 3. 修复
    await connection.beginTransaction();

    for (const [projectId, projectTasks] of projectGroups) {
      console.log(`\n项目 ${projectId}:`);

      // 获取该项目的顶级任务数量
      const [topTasks] = await connection.execute(
        'SELECT wbs_code FROM wbs_tasks WHERE project_id = ? AND parent_id IS NULL ORDER BY wbs_order DESC LIMIT 1',
        [projectId]
      );

      // 解析最大编号
      let nextCode = 1;
      if ((topTasks as any[]).length > 0) {
        const lastCode = (topTasks as any[])[0].wbs_code;
        const parts = lastCode.split('.');
        nextCode = parseInt(parts[0]) + 1;
      }

      for (const task of projectTasks) {
        const newCode = nextCode.toString();
        console.log(`  ${task.wbs_code} -> ${newCode}: ${task.description?.substring(0, 30)}`);

        await connection.execute(
          'UPDATE wbs_tasks SET parent_id = NULL, wbs_level = 1, wbs_code = ?, wbs_order = ? WHERE id = ?',
          [newCode, wbsCodeToSortableOrder(newCode), task.id]
        );

        nextCode++;
      }
    }

    await connection.commit();
    console.log('\n修复完成！');

    // 4. 验证
    const [remaining] = await connection.execute(`
      SELECT COUNT(*) as cnt FROM wbs_tasks t
      JOIN wbs_tasks p ON t.parent_id = p.id
      WHERE t.project_id != p.project_id
    `);
    console.log(`剩余跨项目记录: ${(remaining as any[])[0].cnt}`);

  } catch (error) {
    await connection.rollback();
    console.error('修复失败:', error);
    throw error;
  } finally {
    connection.release();
    process.exit(0);
  }
}

fixCrossProjectParents().catch(err => {
  console.error('脚本执行失败:', err);
  process.exit(1);
});