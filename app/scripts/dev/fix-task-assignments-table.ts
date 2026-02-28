/**
 * 修复 task_assignments 表结构
 *
 * 问题：
 * - 原表结构引用了已删除的 members 表
 * - 需要将 assignee_id 外键改为引用 users 表
 */

import mysql from 'mysql2/promise';

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'task_manager'
};

async function fixTaskAssignmentsTable() {
  const conn = await mysql.createConnection(dbConfig);

  try {
    console.log('=== 修复 task_assignments 表结构 ===\n');

    // 1. 检查表是否存在
    const [tables] = await conn.query(
      "SHOW TABLES LIKE 'task_assignments'"
    );

    const tableExists = (tables as any[]).length > 0;

    if (tableExists) {
      console.log('⚠️  task_assignments 表已存在');

      // 获取当前外键约束
      const [constraints] = await conn.query(`
        SELECT CONSTRAINT_NAME, REFERENCED_TABLE_NAME
        FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
        WHERE TABLE_SCHEMA = 'task_manager'
        AND TABLE_NAME = 'task_assignments'
        AND REFERENCED_TABLE_NAME IS NOT NULL
      `);

      console.log('📋 当前外键约束:');
      console.table(constraints);

      // 检查是否引用了 members 表
      const hasMembersReference = (constraints as any[]).some(
        (c: any) => c.REFERENCED_TABLE_NAME === 'members'
      );

      if (hasMembersReference) {
        console.log('\n🔧 检测到对 members 表的引用，需要修复...\n');

        // 删除旧表
        console.log('🗑️  删除旧的 task_assignments 表...');
        await conn.query('DROP TABLE IF EXISTS task_assignments');
        console.log('   ✅ 已删除');
      } else {
        console.log('\n✅ 外键约束正常，无需修复');
        return;
      }
    } else {
      console.log('📋 task_assignments 表不存在，将创建新表');
    }

    // 2. 创建新表（正确的结构）
    console.log('\n🔨 创建新的 task_assignments 表...');
    await conn.query(`
      CREATE TABLE task_assignments (
        id INT PRIMARY KEY AUTO_INCREMENT,
        task_id INT NOT NULL,
        assignee_id INT NOT NULL,
        assigned_by INT NOT NULL,
        assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        unassigned_at TIMESTAMP NULL,
        status ENUM('active', 'cancelled', 'completed') DEFAULT 'active',
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_task_id (task_id),
        INDEX idx_assignee_id (assignee_id),
        INDEX idx_status (status),
        INDEX idx_assigned_at (assigned_at),
        FOREIGN KEY (task_id) REFERENCES wbs_tasks(id) ON DELETE CASCADE,
        FOREIGN KEY (assignee_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (assigned_by) REFERENCES users(id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('   ✅ 表创建成功\n');

    // 3. 验证新表结构
    const [columns] = await conn.query('DESCRIBE task_assignments');
    console.log('📋 新表结构:');
    console.table(columns);

    console.log('\n=== 修复完成 ===');

  } finally {
    await conn.end();
  }
}

fixTaskAssignmentsTable().catch(console.error);
