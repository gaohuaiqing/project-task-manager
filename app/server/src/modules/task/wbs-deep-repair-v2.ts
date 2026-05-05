/**
 * WBS编码深度修复脚本 v2
 * 根据 parent_id 重新计算 WBS 编码，解决父子编码不匹配问题
 *
 * 运行方式：npx tsx app/server/src/modules/task/wbs-deep-repair-v2.ts
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
    console.log('开始深度修复WBS编码（基于 parent_id）...\n');

    // 1. 获取所有项目
    const [projects] = await connection.execute(
      'SELECT DISTINCT project_id FROM wbs_tasks ORDER BY project_id'
    );

    let totalFixed = 0;

    for (const project of projects as any[]) {
      const projectId = project.project_id;

      // 2. 获取该项目下所有任务
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

      // 3. 递归计算正确的 WBS 编码
      const updates: Array<{ id: string; oldCode: string; newCode: string; desc: string }> = [];

      function assignCodes(parentId: string | null, parentCode: string): void {
        const children = childrenMap.get(parentId) || [];

        children.forEach((child, index) => {
          const newCode = parentCode ? `${parentCode}.${index + 1}` : `${index + 1}`;

          if (child.wbs_code !== newCode) {
            updates.push({
              id: child.id,
              oldCode: child.wbs_code,
              newCode: newCode,
              desc: child.description?.substring(0, 30) || ''
            });
          }

          // 递归处理子任务
          assignCodes(child.id, newCode);
        });
      }

      // 从顶级任务开始
      assignCodes(null, '');

      // 4. 执行更新
      if (updates.length > 0) {
        console.log(`项目 ${projectId}: 发现 ${updates.length} 个需要修复的编码`);

        await connection.beginTransaction();
        for (const update of updates) {
          console.log(`  ${update.oldCode} → ${update.newCode}: ${update.desc}`);

          await connection.execute(
            'UPDATE wbs_tasks SET wbs_code = ?, wbs_order = ? WHERE id = ?',
            [update.newCode, wbsCodeToSortableOrder(update.newCode), update.id]
          );
        }
        await connection.commit();

        totalFixed += updates.length;
        console.log(`项目 ${projectId}: 已修复\n`);
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
