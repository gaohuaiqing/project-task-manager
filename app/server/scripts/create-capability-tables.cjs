// 创建能力模型相关表
const mysql = require('mysql2/promise');

async function createTables() {
  const pool = await mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: process.env.DB_PASSWORD || '',
    database: 'task_manager'
  });

  console.log('Connected to database');

  try {
    // 创建 capability_models 表
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS capability_models (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        dimensions JSON NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log('✅ capability_models 表创建成功');

    // 创建 member_capabilities 表
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS member_capabilities (
        id VARCHAR(36) PRIMARY KEY,
        user_id INT NOT NULL,
        model_id VARCHAR(36) NOT NULL,
        model_name VARCHAR(100),
        association_label VARCHAR(100),
        dimension_scores JSON NOT NULL,
        overall_score INT,
        evaluated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        evaluated_by INT,
        notes TEXT,
        INDEX idx_user_id (user_id),
        INDEX idx_model_id (model_id),
        INDEX idx_overall_score (overall_score)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log('✅ member_capabilities 表创建成功');

    // 创建 task_type_model_mapping 表
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS task_type_model_mapping (
        id INT PRIMARY KEY AUTO_INCREMENT,
        task_type VARCHAR(50) NOT NULL,
        model_id VARCHAR(36) NOT NULL,
        priority INT DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_task_type (task_type),
        INDEX idx_model_id (model_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log('✅ task_type_model_mapping 表创建成功');

    console.log('\n所有表创建完成！');
  } catch (error) {
    console.error('创建表失败:', error);
  } finally {
    await pool.end();
  }
}

createTables();
