/**
 * WBS编码深度逻辑检查
 */

import { createPool, getPool } from '../../core/db/connection.js';

async function deepLogicCheck() {
  await createPool();
  const pool = await getPool();
  const connection = await pool.getConnection();

  try {
    console.log('=== WBS编码深度逻辑检查 ===\n');

    // 1. 检查编码层级与 wbs_level 是否一致
    console.log('1. 检查编码层级与 wbs_level 一致性...\n');
    const [levelMismatch] = await connection.execute(`
      SELECT id, project_id, wbs_code, wbs_level, description
      FROM wbs_tasks
      WHERE wbs_level != (LENGTH(wbs_code) - LENGTH(REPLACE(wbs_code, '.', '')) + 1)
    `);

    if ((levelMismatch as any[]).length > 0) {
      console.log(`发现 ${(levelMismatch as any[]).length} 条层级不一致记录:`);
      for (const row of levelMismatch as any[]) {
        const actualLevel = row.wbs_code.split('.').length;
        console.log(`  项目${row.project_id}: ${row.wbs_code} (wbs_level=${row.wbs_level}, 实际=${actualLevel}) - ${row.description?.substring(0, 30)}`);
      }
    } else {
      console.log('✅ 所有编码层级一致');
    }

    // 2. 检查同级任务编码是否连续（跳跃超过5认为有问题）
    console.log('\n2. 检查同级任务编码连续性...\n');
    const [projects] = await connection.execute('SELECT DISTINCT project_id FROM wbs_tasks ORDER BY project_id');

    let gapIssues = 0;
    for (const project of projects as any[]) {
      const projectId = project.project_id;

      // 获取该项目所有任务
      const [tasks] = await connection.execute(`
        SELECT id, parent_id, wbs_code, wbs_order, description
        FROM wbs_tasks
        WHERE project_id = ?
        ORDER BY wbs_order
      `, [projectId]);

      const taskList = tasks as any[];
      const childrenMap = new Map<string | null, any[]>();

      taskList.forEach(t => {
        const parentId = t.parent_id || null;
        if (!childrenMap.has(parentId)) {
          childrenMap.set(parentId, []);
        }
        childrenMap.get(parentId)!.push(t);
      });

      // 检查每组的连续性
      childrenMap.forEach((children, parentId) => {
        const numbers = children.map(c => {
          const parts = c.wbs_code.split('.');
          return parseInt(parts[parts.length - 1]);
        });

        // 检查跳跃
        for (let i = 1; i < numbers.length; i++) {
          const gap = numbers[i] - numbers[i - 1];
          if (gap > 5) {
            console.log(`  项目${projectId}: 编码跳跃 ${children[i-1].wbs_code} → ${children[i].wbs_code} (gap=${gap})`);
            console.log(`    ${children[i-1].description?.substring(0, 25)} → ${children[i].description?.substring(0, 25)}`);
            gapIssues++;
          }
        }

        // 检查是否从1开始
        if (numbers.length > 0 && numbers[0] !== 1) {
          console.log(`  项目${projectId}: 同级任务不从1开始，首编码 ${children[0].wbs_code}`);
          gapIssues++;
        }
      });
    }

    if (gapIssues === 0) {
      console.log('✅ 所有同级任务编码连续');
    }

    // 3. 检查 wbs_order 是否正确
    console.log('\n3. 检查 wbs_order 格式正确性...\n');
    const [orderIssues] = await connection.execute(`
      SELECT id, project_id, wbs_code, wbs_order, description
      FROM wbs_tasks
      WHERE wbs_order NOT REGEXP '^[0-9]{5}(\\.[0-9]{5})*$'
    `);

    if ((orderIssues as any[]).length > 0) {
      console.log(`发现 ${(orderIssues as any[]).length} 条 wbs_order 格式错误:`);
      for (const row of orderIssues as any[]) {
        console.log(`  项目${row.project_id}: ${row.wbs_code} (order=${row.wbs_order})`);
      }
    } else {
      console.log('✅ 所有 wbs_order 格式正确');
    }

    // 4. 检查大编号任务（顶级任务编号 > 50）
    console.log('\n4. 检查异常大编号...\n');
    const [largeCodes] = await connection.execute(`
      SELECT id, project_id, wbs_code, description, parent_id
      FROM wbs_tasks
      WHERE parent_id IS NULL
        AND CAST(SUBSTRING_INDEX(wbs_code, '.', 1) AS UNSIGNED) > 50
      ORDER BY project_id, wbs_code
    `);

    if ((largeCodes as any[]).length > 0) {
      console.log(`发现 ${(largeCodes as any[]).length} 条大编号顶级任务:`);
      for (const row of largeCodes as any[]) {
        console.log(`  项目${row.project_id}: ${row.wbs_code} - ${row.description?.substring(0, 40)}`);
      }
    } else {
      console.log('✅ 无异常大编号');
    }

    // 5. 检查顶级任务数量是否过多
    console.log('\n5. 检查顶级任务数量...\n');
    const [topCounts] = await connection.execute(`
      SELECT project_id, COUNT(*) as cnt
      FROM wbs_tasks
      WHERE parent_id IS NULL
      GROUP BY project_id
      ORDER BY cnt DESC
      LIMIT 10
    `);

    console.log('各项目顶级任务数量:');
    for (const row of topCounts as any[]) {
      const status = row.cnt > 30 ? '⚠️ 过多' : '✅';
      console.log(`  项目${row.project_id}: ${row.cnt} 个顶级任务 ${status}`);
    }

    // 6. 统计总任务数
    console.log('\n6. 统计信息...\n');
    const [stats] = await connection.execute(`
      SELECT
        COUNT(*) as total_tasks,
        COUNT(DISTINCT project_id) as total_projects,
        MAX(wbs_level) as max_level,
        AVG(wbs_level) as avg_level
      FROM wbs_tasks
    `);

    const stat = (stats as any[])[0];
    console.log(`总任务数: ${stat.total_tasks}`);
    console.log(`项目数: ${stat.total_projects}`);
    console.log(`最大层级: ${stat.max_level}`);
    console.log(`平均层级: ${Number(stat.avg_level).toFixed(2)}`);

  } finally {
    connection.release();
    process.exit(0);
  }
}

deepLogicCheck().catch(err => {
  console.error('检查失败:', err);
  process.exit(1);
});