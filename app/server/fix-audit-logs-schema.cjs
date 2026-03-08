/**
 * 快速修复 audit_logs 表架构
 * 直接执行 SQL，无需迁移框架
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '123456',
  database: process.env.DB_NAME || 'task_manager',
  multipleStatements: true
};

async function fixAuditLogsSchema() {
  let connection;
  try {
    console.log('🔗 连接数据库...');
    connection = await mysql.createConnection(DB_CONFIG);
    console.log('✅ 数据库连接成功');

    // 检查是否需要迁移
    const [columns] = await connection.query(`
      SELECT COLUMN_NAME
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'audit_logs'
        AND COLUMN_NAME = 'actor_user_id'
    `);

    if (columns.length > 0) {
      console.log('✅ audit_logs 表已是新架构，无需迁移');
      return;
    }

    console.log('🔧 开始修复 audit_logs 表架构...\n');

    // 1. 重命名 id -> audit_id
    try {
      await connection.query(`ALTER TABLE audit_logs CHANGE COLUMN id audit_id VARCHAR(36) NOT NULL`);
      console.log('✅ [1/8] id 列已重命名为 audit_id');
    } catch (error) {
      if (error.code === 'ER_DUP_FIELDNAME') {
        console.log('⚠️ [1/8] audit_id 列已存在，跳过');
      } else {
        throw error;
      }
    }

    // 2. 重命名 user_id -> actor_user_id
    try {
      await connection.query(`ALTER TABLE audit_logs CHANGE COLUMN user_id actor_user_id INT NULL`);
      console.log('✅ [2/8] user_id 列已重命名为 actor_user_id');
    } catch (error) {
      if (error.code === 'ER_DUP_FIELDNAME') {
        console.log('⚠️ [2/8] actor_user_id 列已存在，跳过');
      } else {
        throw error;
      }
    }

    // 3. 重命名 username -> actor_username
    try {
      await connection.query(`ALTER TABLE audit_logs CHANGE COLUMN username actor_username VARCHAR(100) NULL`);
      console.log('✅ [3/8] username 列已重命名为 actor_username');
    } catch (error) {
      if (error.code === 'ER_DUP_FIELDNAME') {
        console.log('⚠️ [3/8] actor_username 列已存在，跳过');
      } else {
        throw error;
      }
    }

    // 4. 添加 actor_role
    try {
      await connection.query(`ALTER TABLE audit_logs ADD COLUMN actor_role VARCHAR(50) NULL AFTER actor_username`);
      console.log('✅ [4/8] actor_role 列添加成功');
    } catch (error) {
      if (error.code === 'ER_DUP_FIELDNAME') {
        console.log('⚠️ [4/8] actor_role 列已存在，跳过');
      } else {
        throw error;
      }
    }

    // 5. 添加 before_data
    try {
      await connection.query(`ALTER TABLE audit_logs ADD COLUMN before_data JSON NULL COMMENT '变更前数据' AFTER details`);
      console.log('✅ [5/8] before_data 列添加成功');
    } catch (error) {
      if (error.code === 'ER_DUP_FIELDNAME') {
        console.log('⚠️ [5/8] before_data 列已存在，跳过');
      } else {
        throw error;
      }
    }

    // 6. 添加 after_data
    try {
      await connection.query(`ALTER TABLE audit_logs ADD COLUMN after_data JSON NULL COMMENT '变更后数据' AFTER before_data`);
      console.log('✅ [6/8] after_data 列添加成功');
    } catch (error) {
      if (error.code === 'ER_DUP_FIELDNAME') {
        console.log('⚠️ [6/8] after_data 列已存在，跳过');
      } else {
        throw error;
      }
    }

    // 7. 添加 related_operation_id
    try {
      await connection.query(`ALTER TABLE audit_logs ADD COLUMN related_operation_id VARCHAR(36) NULL COMMENT '关联操作ID' AFTER after_data`);
      console.log('✅ [7/8] related_operation_id 列添加成功');
    } catch (error) {
      if (error.code === 'ER_DUP_FIELDNAME') {
        console.log('⚠️ [7/8] related_operation_id 列已存在，跳过');
      } else {
        throw error;
      }
    }

    // 8. 添加 reason
    try {
      await connection.query(`ALTER TABLE audit_logs ADD COLUMN reason VARCHAR(500) NULL COMMENT '操作原因' AFTER related_operation_id`);
      console.log('✅ [8/8] reason 列添加成功');
    } catch (error) {
      if (error.code === 'ER_DUP_FIELDNAME') {
        console.log('⚠️ [8/8] reason 列已存在，跳过');
      } else {
        throw error;
      }
    }

    console.log('\n🎉 audit_logs 表架构修复完成！');

    // 记录迁移
    try {
      await connection.query(
        `INSERT INTO migrations (name, version, executed_at) VALUES (?, ?, NOW())`,
        ['fix_audit_logs_schema', '005']
      );
      console.log('📝 迁移记录已保存');
    } catch (error) {
      console.log('⚠️ 迁移记录保存失败（可能已存在）');
    }

  } catch (error) {
    console.error('❌ 迁移失败:', error.message);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// 运行迁移
fixAuditLogsSchema()
  .then(() => {
    console.log('\n✅ 迁移成功完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ 迁移失败:', error);
    process.exit(1);
  });
