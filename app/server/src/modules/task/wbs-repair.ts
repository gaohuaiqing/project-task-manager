/**
 * WBS编码修复脚本
 * 用于修复因bug导致的WBS编码错误
 *
 * 运行方式：npx tsx app/server/src/modules/task/wbs-repair.ts
 */

import { createPool, getPool } from '../../core/db/connection.js';

/**
 * 将 WBS 编码转换为可排序的零填充字符串
 */
function wbsCodeToSortableOrder(wbsCode: string): string {
  return wbsCode.split('.').map(s => s.padStart(5, '0')).join('.');
}

async function repairWbsCodes(): Promise<void> {
  // 初始化数据库连接池
  await createPool();
  const pool = await getPool();
  const connection = await pool.getConnection();

  try {
    console.log('开始修复WBS编码...');

    // 1. 获取所有项目
    const [projects] = await connection.execute(
      'SELECT DISTINCT project_id FROM wbs_tasks ORDER BY project_id'
    );

    for (const project of projects as any[]) {
      const projectId = project.project_id;
      console.log(`\n处理项目: ${projectId}`);

      // 2. 获取该项目下所有任务，按 wbs_order 排序
      const [tasks] = await connection.execute(
        `SELECT id, parent_id, wbs_code, wbs_level, description, wbs_order
         FROM wbs_tasks
         WHERE project_id = ?
         ORDER BY wbs_order, created_at`,
        [projectId]
      );

      // 3. 构建任务树并重新分配WBS编码
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

      // 4. 递归分配正确的WBS编码
      const updates: Array<{ id: string; wbs_code: string; wbs_order: string }> = [];

      function assignWbsCode(parentId: string | null, prefix: string): void {
        const children = childrenMap.get(parentId) || [];
        children.forEach((child, index) => {
          const newCode = prefix ? `${prefix}.${index + 1}` : `${index + 1}`;
          if (child.wbs_code !== newCode) {
            console.log(`  修复: ${child.wbs_code} → ${newCode} (${child.description?.substring(0, 20)})`);
            updates.push({
              id: child.id,
              wbs_code: newCode,
              wbs_order: wbsCodeToSortableOrder(newCode),
            });
          }
          // 递归处理子任务
          assignWbsCode(child.id, newCode);
        });
      }

      assignWbsCode(null, '');

      // 5. 批量更新
      if (updates.length > 0) {
        await connection.beginTransaction();
        for (const update of updates) {
          await connection.execute(
            'UPDATE wbs_tasks SET wbs_code = ?, wbs_order = ? WHERE id = ?',
            [update.wbs_code, update.wbs_order, update.id]
          );
        }
        await connection.commit();
        console.log(`已修复 ${updates.length} 个任务的WBS编码`);
      } else {
        console.log('该项目的WBS编码正确，无需修复');
      }
    }

    console.log('\nWBS编码修复完成！');

  } catch (error) {
    await connection.rollback();
    console.error('修复失败:', error);
    throw error;
  } finally {
    connection.release();
    process.exit(0);
  }
}

// 执行修复
repairWbsCodes().catch(err => {
  console.error('脚本执行失败:', err);
  process.exit(1);
});
