/**
 * WBS编码深度修复脚本
 * 修复父子编码不匹配的问题
 *
 * 运行方式：npx tsx app/server/src/modules/task/wbs-deep-repair.ts
 */

import { createPool, getPool } from '../../core/db/connection.js';

function wbsCodeToSortableOrder(wbsCode: string): string {
  return wbsCode.split('.').map(s => s.padStart(5, '0')).join('.');
}

async function deepRepairWbsCodes(): Promise<void> {
  await createPool();
  const pool = await getPool();
  const connection = await pool.getConnection();

  try {
    console.log('开始深度修复WBS编码...\n');

    // 1. 获取所有项目
    const [projects] = await connection.execute(
      'SELECT DISTINCT project_id FROM wbs_tasks ORDER BY project_id'
    );

    let totalFixed = 0;

    for (const project of projects as any[]) {
      const projectId = project.project_id;

      // 2. 获取该项目下所有任务，按 wbs_order 排序
      const [tasks] = await connection.execute(
        `SELECT id, parent_id, wbs_code, wbs_level, description, wbs_order
         FROM wbs_tasks
         WHERE project_id = ?
         ORDER BY wbs_order, created_at`,
        [projectId]
      );

      const taskList = tasks as any[];
      const taskMap = new Map<string, any>();
      const childrenMap = new Map<string | null, any[]>();

      taskList.forEach(t => {
        taskMap.set(t.id, t);
        const parentId = t.parent_id || null;
        if (!childrenMap.has(parentId)) {
          childrenMap.set(parentId, []);
        }
        childrenMap.get(parentId)!.push(t);
      });

      // 3. 检测并修复父子编码不匹配
      const updates: Array<{ id: string; wbs_code: string; wbs_order: string; reason: string }> = [];

      // 从顶级任务开始递归检查
      function checkAndFix(parentId: string | null, expectedPrefix: string): void {
        const children = childrenMap.get(parentId) || [];

        children.forEach((child, index) => {
          const expectedCode = expectedPrefix ? `${expectedPrefix}.${index + 1}` : `${index + 1}`;

          // 检查编码是否正确
          if (child.wbs_code !== expectedCode) {
            updates.push({
              id: child.id,
              wbs_code: expectedCode,
              wbs_order: wbsCodeToSortableOrder(expectedCode),
              reason: `编码不匹配: ${child.wbs_code} → ${expectedCode}`
            });
          }

          // 递归处理子任务
          checkAndFix(child.id, expectedCode);
        });
      }

      // 从顶级任务（parent_id 为 null）开始
      checkAndFix(null, '');

      // 4. 执行更新
      if (updates.length > 0) {
        console.log(`项目 ${projectId}: 发现 ${updates.length} 个需要修复的编码`);

        await connection.beginTransaction();
        for (const update of updates) {
          const task = taskMap.get(update.id);
          console.log(`  ${update.reason} - ${task?.description?.substring(0, 30)}`);

          await connection.execute(
            'UPDATE wbs_tasks SET wbs_code = ?, wbs_order = ? WHERE id = ?',
            [update.wbs_code, update.wbs_order, update.id]
          );
        }
        await connection.commit();

        totalFixed += updates.length;
        console.log(`项目 ${projectId}: 已修复 ${updates.length} 个编码\n`);
      }
    }

    console.log(`\n深度修复完成！共修复 ${totalFixed} 个编码`);

  } catch (error) {
    await connection.rollback();
    console.error('修复失败:', error);
    throw error;
  } finally {
    connection.release();
    process.exit(0);
  }
}

deepRepairWbsCodes().catch(err => {
  console.error('脚本执行失败:', err);
  process.exit(1);
});
