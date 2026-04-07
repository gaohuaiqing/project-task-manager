/**
 * 创建缺失的数据库表
 * 执行方式: npx tsx app/server/src/scripts/create-missing-tables.ts
 */

import 'dotenv/config';
import * as mysql from 'mysql2/promise';

async function createMissingTables() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'task_manager',
    charset: 'utf8mb4',
  });

  try {
    console.log('🚀 开始创建缺失的数据库表...\n');

    // 1. 创建 notifications 表
    console.log('📋 检查 notifications 表...');
    const [notifCheck] = await pool.execute(
      `SELECT TABLE_NAME FROM information_schema.TABLES
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'notifications'`
    ) as any[];

    if (notifCheck.length === 0) {
      await pool.execute(`
        CREATE TABLE notifications (
          id VARCHAR(36) PRIMARY KEY,
          user_id INT NOT NULL,
          type VARCHAR(50) NOT NULL COMMENT '类型: task_assigned/task_completed/approval_required等',
          title VARCHAR(255) NOT NULL,
          content TEXT,
          link VARCHAR(500),
          is_read BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          read_at TIMESTAMP NULL,
          INDEX idx_user_id (user_id),
          INDEX idx_is_read (is_read),
          INDEX idx_created_at (created_at),
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log('✅ notifications 表创建成功');
    } else {
      console.log('⚠️ notifications 表已存在，跳过');
    }

    // 2. 创建 config_project_types 表
    console.log('\n📋 检查 config_project_types 表...');
    const [projTypeCheck] = await pool.execute(
      `SELECT TABLE_NAME FROM information_schema.TABLES
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'config_project_types'`
    ) as any[];

    if (projTypeCheck.length === 0) {
      await pool.execute(`
        CREATE TABLE config_project_types (
          id INT AUTO_INCREMENT PRIMARY KEY,
          code VARCHAR(50) NOT NULL UNIQUE,
          name VARCHAR(100) NOT NULL,
          description TEXT,
          sort_order INT DEFAULT 0,
          is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);

      await pool.execute(`
        INSERT INTO config_project_types (code, name, sort_order) VALUES
        ('product_dev', '产品开发', 1),
        ('func_mgmt', '功能管理', 2),
        ('material_sub', '物料替代', 3),
        ('quality_handle', '质量处理', 4)
      `);
      console.log('✅ config_project_types 表创建成功，已插入默认数据');
    } else {
      console.log('⚠️ config_project_types 表已存在，跳过');
    }

    // 3. 创建 config_task_types 表
    console.log('\n📋 检查 config_task_types 表...');
    const [taskTypeCheck] = await pool.execute(
      `SELECT TABLE_NAME FROM information_schema.TABLES
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'config_task_types'`
    ) as any[];

    if (taskTypeCheck.length === 0) {
      await pool.execute(`
        CREATE TABLE config_task_types (
          id INT AUTO_INCREMENT PRIMARY KEY,
          code VARCHAR(50) NOT NULL UNIQUE,
          name VARCHAR(100) NOT NULL,
          category VARCHAR(50) COMMENT '分类: development/testing/design等',
          description TEXT,
          sort_order INT DEFAULT 0,
          is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);

      await pool.execute(`
        INSERT INTO config_task_types (code, name, category, sort_order) VALUES
        ('development', '开发', 'development', 1),
        ('testing', '测试', 'testing', 2),
        ('design', '设计', 'design', 3),
        ('documentation', '文档', 'documentation', 4),
        ('review', '评审', 'review', 5),
        ('deployment', '部署', 'deployment', 6),
        ('maintenance', '维护', 'maintenance', 7),
        ('research', '研究', 'research', 8),
        ('meeting', '会议', 'meeting', 9),
        ('training', '培训', 'training', 10),
        ('support', '支持', 'support', 11),
        ('other', '其他', 'other', 12)
      `);
      console.log('✅ config_task_types 表创建成功，已插入默认数据');
    } else {
      console.log('⚠️ config_task_types 表已存在，跳过');
    }

    // 记录迁移
    console.log('\n📋 记录迁移...');
    await pool.execute(`
      INSERT IGNORE INTO migrations (name, version, executed_at)
      VALUES ('create_missing_tables', '041', NOW())
    `);

    console.log('\n🎉 所有缺失的表已创建完成！');

  } catch (error) {
    console.error('❌ 创建表失败:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

createMissingTables().catch(console.error);
