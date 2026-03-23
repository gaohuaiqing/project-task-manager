import mysql from 'mysql2/promise';

async function checkData() {
  const pool = await mysql.createPool({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: '',
    database: 'task_manager',
  });

  try {
    // 检查迁移状态
    const [migrations] = await pool.query('SELECT version, name FROM migrations ORDER BY version');
    console.log('\n=== 迁移状态 ===');
    console.log(migrations);

    console.log('\n=== 用户数据 ===');
    const [users] = await pool.query('SELECT id, username, name, role FROM users');
    console.log('用户数量:', (users as any[]).length);
    console.log(users);

    console.log('\n=== 成员数据 ===');
    const [members] = await pool.query('SELECT id, name, employee_id, department FROM members');
    console.log('成员数量:', (members as any[]).length);
    console.log(members);

    console.log('\n=== 节假日数据 ===');
    const [holidays] = await pool.query('SELECT COUNT(*) as count FROM holidays');
    console.log('节假日记录数:', (holidays as any[])[0].count);

    console.log('\n=== 任务类型映射 ===');
    const [mappings] = await pool.query('SELECT COUNT(*) as count FROM task_type_model_mapping');
    console.log('映射记录数:', (mappings as any[])[0].count);

    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    await pool.end();
    process.exit(1);
  }
}

checkData();
