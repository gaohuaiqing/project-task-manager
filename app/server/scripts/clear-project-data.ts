/**
 * 清空项目数据脚本
 *
 * 用法: npx tsx clear-project-data.ts
 *
 * 说明：删除所有项目、任务、里程碑等业务数据
 * 保留：用户、会话、成员、节假日等基础数据
 */

import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';

// 数据库配置
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'task_manager',
  multipleStatements: true
};

async function clearProjectData() {
  let connection: mysql.PoolConnection | null = null;

  try {
    console.log('===================================================');
    console.log('项目数据清空脚本');
    console.log('===================================================\n');

    // 1. 连接数据库
    console.log('[1/4] 连接数据库...');
    const pool = mysql.createPool(dbConfig);
    connection = await pool.getConnection();
    console.log('✓ 数据库连接成功\n');

    // 2. 显示清空前数据统计
    console.log('[2/4] 清空前数据统计:');
    const [statsBefore] = await connection.query(`
      SELECT
        (SELECT COUNT(*) FROM projects) AS projects,
        (SELECT COUNT(*) FROM wbs_tasks) AS wbs_tasks,
        (SELECT COUNT(*) FROM milestones) AS milestones,
        (SELECT COUNT(*) FROM project_members) AS project_members,
        (SELECT COUNT(*) FROM task_assignments) AS task_assignments
    `);
    console.table(statsBefore);
    console.log('');

    // 3. 确认操作
    const rows = statsBefore as any[];
    const totalBefore = Object.values(rows[0]).reduce((sum: number, val: any) => sum + (val as number), 0);

    if (totalBefore === 0) {
      console.log('✓ 数据库中无项目数据，无需清空\n');
      await connection.release();
      await pool.end();
      return;
    }

    console.log('⚠️  警告：即将删除以上所有数据！');
    console.log('⚠️  此操作不可撤销！\n');

    // 4. 执行清空操作
    console.log('[3/4] 执行清空操作...');

    await connection.beginTransaction();

    try {
      // 按依赖顺序删除
      await connection.execute('DELETE FROM task_assignments');
      console.log('  ✓ 任务分配历史已清空');

      await connection.execute('DELETE FROM wbs_tasks');
      console.log('  ✓ WBS任务已清空');

      await connection.execute('DELETE FROM milestones');
      console.log('  ✓ 项目里程碑已清空');

      await connection.execute('DELETE FROM project_members');
      console.log('  ✓ 项目成员关联已清空');

      await connection.execute('DELETE FROM projects');
      console.log('  ✓ 项目已清空');

      // 重置自增ID
      await connection.execute('ALTER TABLE task_assignments AUTO_INCREMENT = 1');
      await connection.execute('ALTER TABLE wbs_tasks AUTO_INCREMENT = 1');
      await connection.execute('ALTER TABLE milestones AUTO_INCREMENT = 1');
      await connection.execute('ALTER TABLE project_members AUTO_INCREMENT = 1');
      await connection.execute('ALTER TABLE projects AUTO_INCREMENT = 1');

      await connection.commit();
      console.log('\n✓ 事务提交成功\n');

    } catch (error) {
      await connection.rollback();
      console.error('\n✗ 事务已回滚:', error);
      throw error;
    }

    // 5. 验证结果
    console.log('[4/4] 验证清空结果:');
    const [statsAfter] = await connection.query(`
      SELECT
        (SELECT COUNT(*) FROM projects) AS projects,
        (SELECT COUNT(*) FROM wbs_tasks) AS wbs_tasks,
        (SELECT COUNT(*) FROM milestones) AS milestones,
        (SELECT COUNT(*) FROM project_members) AS project_members,
        (SELECT COUNT(*) FROM task_assignments) AS task_assignments
    `);
    console.table(statsAfter);

    const rowsAfter = statsAfter as any[];
    const totalAfter = Object.values(rowsAfter[0]).reduce((sum: number, val: any) => sum + (val as number), 0);

    console.log('');
    console.log('===================================================');
    if (totalAfter === 0) {
      console.log('✓ 项目数据清空完成！');
    } else {
      console.log('⚠️  部分数据未清空，请检查外键约束');
    }
    console.log('===================================================');

    await connection.release();
    await pool.end();

  } catch (error) {
    console.error('\n✗ 清空失败:', error);
    if (connection) {
      await connection.release();
    }
    process.exit(1);
  }
}

// 执行脚本
clearProjectData();
