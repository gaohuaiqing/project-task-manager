/**
 * 深度排查跨项目 parent_id 问题根因
 */

import { createPool, getPool } from '../../core/db/connection.js';

async function analyzeRootCause() {
  await createPool();
  const pool = await getPool();
  const connection = await pool.getConnection();

  try {
    console.log('=== 深度排查跨项目 parent_id 问题 ===\n');

    // 1. 查看历史数据：这些被错误修复的任务，原来的 parent_id 指向谁？
    console.log('1. 分析被修复任务的原数据特征...\n');

    // 这些是之前修复的任务（通过 WBS 编码特征识别）
    const problematicPatterns = [
      { projectId: 13, oldCodePrefix: '8.' },  // 项目13 的 8.x 任务
      { projectId: 20, oldCodePrefix: '11.3.3' },  // 项目20 的 11.3.3 任务
      { projectId: 21, oldCodePrefix: '25.5' },  // 项目21 的 25.5 任务
      { projectId: 24, oldCodePrefix: '43.2' },  // 项目24 的 43.2 任务
    ];

    // 2. 检查 changeTaskLevel 方法的逻辑问题
    console.log('2. 分析 changeTaskLevel 方法可能的问题...\n');

    // 问题场景分析：
    // 当任务从一个项目移动到另一个项目时：
    // - 如果只更新了 project_id，但没有更新 parent_id
    // - 或者祖先链中有跨项目的引用

    // 3. 查找可能的数据导入问题
    console.log('3. 检查数据导入相关的表结构...\n');

    const [importLogs] = await connection.execute(`
      SHOW TABLES LIKE '%import%'
    `);
    console.log('导入相关表:', importLogs);

    // 4. 分析任务导入逻辑
    console.log('\n4. 检查是否存在导入相关的问题...\n');

    // 查看导入任务的代码逻辑
    const [importTasks] = await connection.execute(`
      SELECT id, project_id, wbs_code, description, created_at
      FROM wbs_tasks
      WHERE description LIKE '%导入%' OR description LIKE '%E2E测试%'
      ORDER BY created_at DESC
      LIMIT 10
    `);

    if ((importTasks as any[]).length > 0) {
      console.log('测试/导入任务:');
      for (const row of importTasks as any[]) {
        console.log(`  项目${row.project_id}: ${row.wbs_code} - ${row.description?.substring(0, 30)}`);
      }
    }

    // 5. 检查是否有跨项目复制任务的功能
    console.log('\n5. 检查是否有复制任务的功能...\n');

    // 查找相似的描述
    const [similarDesc] = await connection.execute(`
      SELECT description, COUNT(*) as cnt, GROUP_CONCAT(DISTINCT project_id) as projects
      FROM wbs_tasks
      GROUP BY description
      HAVING COUNT(DISTINCT project_id) > 1
      ORDER BY cnt DESC
      LIMIT 10
    `);

    if ((similarDesc as any[]).length > 0) {
      console.log('跨项目相似描述的任务:');
      for (const row of similarDesc as any[]) {
        console.log(`  "${row.description?.substring(0, 40)}..." - 项目: ${row.projects}`);
      }
    }

    // 6. 核心问题分析
    console.log('\n=== 根因分析 ===\n');

    console.log('可能的问题来源:');
    console.log('1. 任务导入时：parent_id 指向了模板项目的任务，而不是当前项目');
    console.log('2. 任务复制时：复制了任务但 parent_id 仍然指向原项目的任务');
    console.log('3. 批量操作时：没有正确验证 parent_id 是否属于同一项目');
    console.log('4. changeTaskLevel 方法：提升层级时获取的 ancestor.parent_id 可能跨项目');

    // 7. 检查代码中的验证逻辑
    console.log('\n=== 代码验证建议 ===\n');
    console.log('需要在以下位置添加项目一致性验证:');
    console.log('1. createTask: 验证 parent_id 的项目与 data.project_id 一致');
    console.log('2. changeTaskLevel: 验证 targetAncestor.parent_id 属于同一项目');
    console.log('3. reorderTask: 验证 afterTask 属于同一项目');
    console.log('4. 导入功能: 确保导入时 parent_id 正确映射');

  } finally {
    connection.release();
    process.exit(0);
  }
}

analyzeRootCause().catch(err => {
  console.error('错误:', err);
  process.exit(1);
});