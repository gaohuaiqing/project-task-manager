import mysql from 'mysql2/promise';

(async () => {
  const pool = await mysql.createPool({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: '',
    database: 'task_manager',
  });

  // 检查表结构
  const [columns] = await pool.query('DESCRIBE holidays');
  console.log('=== holidays 表结构 ===');
  for (const col of columns) {
    console.log(`  ${col.Field}: ${col.Type} ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'} ${col.Key ? `KEY(${col.Key})` : ''}`);
  }

  // 检查现有数据
  const [data] = await pool.query('SELECT * FROM holidays ORDER BY holiday_date LIMIT 10');
  console.log('\n=== 现有节假日数据（前10条） ===');
  for (const row of data) {
    console.log(`  ${row.holiday_date}: ${row.holiday_name} (工作日: ${row.is_working_day})`);
  }

  // 统计
  const [stats] = await pool.query('SELECT year, COUNT(*) as count FROM holidays GROUP BY year');
  console.log('\n=== 按年份统计 ===');
  for (const row of stats) {
    console.log(`  ${row.year}: ${row.count} 条`);
  }

  await pool.end();
})();
