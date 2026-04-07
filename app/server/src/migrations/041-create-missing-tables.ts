/**
 * 数据库迁移 041: 创建缺失的配置表和通知表
 *
 * 目标:
 * 1. 创建 notifications 表
 * 2. 创建 config_project_types 表
 * 3. 创建 config_task_types 表
 */

import { databaseService } from '../services/DatabaseService.js';

const MIGRATION_VERSION = '041';
const MIGRATION_NAME = 'create_missing_tables';

interface MigrationLog {
  step: string;
  status: 'success' | 'warning' | 'error';
  message: string;
}

const logs: MigrationLog[] = [];

function log(step: string, status: 'success' | 'warning' | 'error', message: string) {
  logs.push({ step, status, message });
  const icon = status === 'success' ? '✅' : status === 'warning' ? '⚠️' : '❌';
  console.log(`${icon} [${step}] ${message}`);
}

async function checkMigrationExecuted(): Promise<boolean> {
  try {
    const result = await databaseService.query(
      'SELECT 1 FROM migrations WHERE version = ?',
      [MIGRATION_VERSION]
    ) as any[];
    return result && result.length > 0;
  } catch {
    return false;
  }
}

async function recordMigration(): Promise<void> {
  await databaseService.query(
    'INSERT INTO migrations (name, version, executed_at) VALUES (?, ?, NOW())',
    [MIGRATION_NAME, MIGRATION_VERSION]
  );
}

async function checkTableExists(tableName: string): Promise<boolean> {
  const result = await databaseService.query(`
    SELECT TABLE_NAME
    FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = ?
  `, [tableName]) as any[];
  return result.length > 0;
}

async function createNotificationsTable(): Promise<boolean> {
  try {
    const exists = await checkTableExists('notifications');
    if (exists) {
      log('Step 1', 'warning', 'notifications 表已存在，跳过');
      return true;
    }

    await databaseService.query(`
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
    log('Step 1', 'success', 'notifications 表创建成功');
    return true;
  } catch (error) {
    log('Step 1', 'error', 'notifications 表创建失败');
    console.error(error);
    return false;
  }
}

async function createConfigProjectTypesTable(): Promise<boolean> {
  try {
    const exists = await checkTableExists('config_project_types');
    if (exists) {
      log('Step 2', 'warning', 'config_project_types 表已存在，跳过');
      return true;
    }

    await databaseService.query(`
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

    // 插入默认数据
    await databaseService.query(`
      INSERT INTO config_project_types (code, name, sort_order) VALUES
      ('product_dev', '产品开发', 1),
      ('func_mgmt', '功能管理', 2),
      ('material_sub', '物料替代', 3),
      ('quality_handle', '质量处理', 4)
    `);

    log('Step 2', 'success', 'config_project_types 表创建成功，已插入默认数据');
    return true;
  } catch (error) {
    log('Step 2', 'error', 'config_project_types 表创建失败');
    console.error(error);
    return false;
  }
}

async function createConfigTaskTypesTable(): Promise<boolean> {
  try {
    const exists = await checkTableExists('config_task_types');
    if (exists) {
      log('Step 3', 'warning', 'config_task_types 表已存在，跳过');
      return true;
    }

    await databaseService.query(`
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

    // 插入默认数据
    await databaseService.query(`
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

    log('Step 3', 'success', 'config_task_types 表创建成功，已插入默认数据');
    return true;
  } catch (error) {
    log('Step 3', 'error', 'config_task_types 表创建失败');
    console.error(error);
    return false;
  }
}

export async function runMigration041(): Promise<boolean> {
  console.log('🚀 开始执行数据库迁移 041: 创建缺失的配置表和通知表');
  console.log('='.repeat(70));

  try {
    if (await checkMigrationExecuted()) {
      console.log('📋 迁移 041 已执行，跳过');
      return true;
    }

    const steps = [
      createNotificationsTable,
      createConfigProjectTypesTable,
      createConfigTaskTypesTable,
    ];

    let allSuccess = true;
    for (const step of steps) {
      const success = await step();
      if (!success) {
        allSuccess = false;
        break;
      }
    }

    if (allSuccess) {
      await recordMigration();
      console.log('📝 迁移记录已保存');
    }

    console.log('='.repeat(70));
    console.log('📊 迁移 041 执行总结:');
    console.log(`  成功: ${logs.filter(l => l.status === 'success').length}`);
    console.log(`  警告: ${logs.filter(l => l.status === 'warning').length}`);
    console.log(`  失败: ${logs.filter(l => l.status === 'error').length}`);

    if (allSuccess) {
      console.log('🎉 迁移 041 完成！');
    }

    return allSuccess;
  } catch (error) {
    console.error('❌ 迁移失败:', error);
    return false;
  }
}

export async function runPendingMigrations(): Promise<void> {
  console.log('🔍 检查待执行的数据库迁移 041...');
  await runMigration041();
}
