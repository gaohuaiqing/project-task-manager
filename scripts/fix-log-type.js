/**
 * 修复 system_logs 表的 log_type 字段
 */
const mysql = require('mysql2/promise');

async function fixLogType() {
  let connection;

  try {
    console.log('========================================');
    console.log('修复 system_logs.log_type 字段');
    console.log('========================================\n');

    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'task_manager'
    });

    // 1. 检查当前字段类型
    console.log('1. 检查当前 log_type 字段定义...');
    const [columns] = await connection.query('SHOW COLUMNS FROM system_logs LIKE "log_type"');
    console.log('   当前定义:', columns[0]?.Type || '字段不存在');

    // 2. 修改字段类型为更大的 ENUM
    console.log('\n2. 修改 log_type 字段类型...');
    try {
      await connection.query(`
        ALTER TABLE system_logs
        MODIFY COLUMN log_type ENUM('INFO', 'WARN', 'ERROR', 'DEBUG', 'SUCCESS', 'FRONTEND', 'PERFORMANCE', 'API', 'DATABASE', 'SYSTEM')
        NOT NULL
        DEFAULT 'INFO'
      `);
      console.log('   ✓ log_type 字段已扩展');

    } catch (e) {
      console.log('   修改失败:', e.message);

      // 如果 ENUM 修改失败，尝试改为 VARCHAR
      console.log('\n   尝试改为 VARCHAR 类型...');
      await connection.query(`
        ALTER TABLE system_logs
        MODIFY COLUMN log_type VARCHAR(20)
        NOT NULL
        DEFAULT 'INFO'
      `);
      console.log('   ✓ log_type 字段已改为 VARCHAR(20)');
    }

    // 3. 验证修改结果
    console.log('\n3. 验证修改结果...');
    const [newColumns] = await connection.query('SHOW COLUMNS FROM system_logs LIKE "log_type"');
    console.log('   新的定义:', newColumns[0].Type);

    await connection.end();

    console.log('\n========================================');
    console.log('✓ 修复完成！');
    console.log('========================================\n');

  } catch (error) {
    console.error('\n修复失败:', error);

    if (connection) {
      await connection.end();
    }
  }
}

fixLogType();
