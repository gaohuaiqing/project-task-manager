import mysql from 'mysql2/promise';

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'task_manager'
};

async function checkTable() {
  const conn = await mysql.createConnection(dbConfig);

  try {
    console.log('=== task_assignments 表检查 ===\n');

    // 检查表结构
    const [columns] = await conn.query('DESCRIBE task_assignments');
    console.log('📋 表结构:');
    console.table(columns);

    // 检查现有数据
    const [rows] = await conn.query('SELECT COUNT(*) as count FROM task_assignments');
    console.log(`\n📊 当前数据量: ${(rows as any[])[0].count} 条`);

  } finally {
    await conn.end();
  }
}

checkTable().catch(console.error);
