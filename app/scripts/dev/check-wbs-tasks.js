import mysql from 'mysql2/promise';

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  database: process.env.DB_NAME || 'task_manager',
  password: process.env.DB_PASSWORD || ''
};

async function checkWbsTasks() {
  const connection = await mysql.createConnection(dbConfig);
  
  try {
    console.log('检查 WBS 任务数据...\n');
    
    // 检查 wbs_tasks 表是否存在
    const [tables] = await connection.execute(
      "SHOW TABLES LIKE 'wbs_tasks'"
    );
    
    if (tables.length === 0) {
      console.log('❌ wbs_tasks 表不存在！');
      return;
    }
    
    console.log('✅ wbs_tasks 表存在\n');
    
    // 查询 WBS 任务数量
    const [count] = await connection.execute(
      'SELECT COUNT(*) as total FROM wbs_tasks WHERE deleted_at IS NULL'
    );
    
    console.log(`📊 WBS 任务总数: ${count[0].total}\n`);
    
    // 查询所有 WBS 任务
    const [tasks] = await connection.execute(
      'SELECT id, task_code, task_name, status, progress FROM wbs_tasks WHERE deleted_at IS NULL LIMIT 10'
    );
    
    if (tasks.length === 0) {
      console.log('⚠️  WBS 任务表为空，没有任务数据');
      console.log('这是正常现象，您需要手动创建任务');
    } else {
      console.log('✅ WBS 任务列表（前10条）:');
      console.table(tasks);
    }
    
  } catch (error) {
    console.error('❌ 检查失败:', error);
  } finally {
    await connection.end();
  }
}

checkWbsTasks();
