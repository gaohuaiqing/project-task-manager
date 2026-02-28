import mysql from 'mysql2/promise';

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  database: process.env.DB_NAME || 'task_manager',
  password: process.env.DB_PASSWORD || ''
};

async function checkTaskAssignment() {
  const connection = await mysql.createConnection(dbConfig);
  
  try {
    console.log('检查任务分配情况...\n');
    
    // 查询 WBS 任务详情
    const [tasks] = await connection.execute(
      'SELECT id, task_code, task_name, status, assignee_id, project_id FROM wbs_tasks WHERE deleted_at IS NULL'
    );
    
    if (tasks.length === 0) {
      console.log('⚠️  WBS 任务表为空');
      return;
    }
    
    console.log('✅ WBS 任务列表:');
    console.table(tasks);
    
    // 查询所有用户
    const [users] = await connection.execute(
      'SELECT id, username, role FROM users LIMIT 10'
    );
    
    console.log('\n✅ 用户列表:');
    console.table(users);
    
    // 检查任务分配情况
    console.log('\n📊 任务分配分析:');
    tasks.forEach(task => {
      const assignedUser = users.find(u => u.id === task.assignee_id);
      if (task.assignee_id && assignedUser) {
        console.log(`任务 ${task.task_code} (${task.task_name}) 分配给: ${assignedUser.username} (${assignedUser.role})`);
      } else {
        console.log(`任务 ${task.task_code} (${task.task_name}) 未分配给任何人`);
      }
    });
    
  } catch (error) {
    console.error('❌ 检查失败:', error);
  } finally {
    await connection.end();
  }
}

checkTaskAssignment();
