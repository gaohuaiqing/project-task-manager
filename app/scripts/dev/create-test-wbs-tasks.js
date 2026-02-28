import mysql from 'mysql2/promise';

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  database: process.env.DB_NAME || 'task_manager',
  password: process.env.DB_PASSWORD || ''
};

async function createTestWbsTasks() {
  const connection = await mysql.createConnection(dbConfig);
  
  try {
    console.log('创建测试 WBS 任务...\n');
    
    // 先查询现有的项目和用户
    const [projects] = await connection.execute('SELECT id, name FROM projects WHERE deleted_at IS NULL LIMIT 3');
    const [members] = await connection.execute('SELECT id, name FROM members WHERE status = "active" LIMIT 5');
    
    console.log('现有项目:', projects.length);
    console.log('现有成员:', members.length);
    
    if (projects.length === 0) {
      console.log('⚠️  没有可用的项目，请先创建项目');
      return;
    }
    
    if (members.length === 0) {
      console.log('⚠️  没有可用的成员，请先创建成员');
      return;
    }
    
    // 创建测试任务
    const testTasks = [
      {
        project_id: projects[0].id,
        parent_id: null,
        task_code: 'PHASE-1.0',
        task_name: '需求分析与设计',
        description: '第一阶段：需求分析和系统设计',
        task_type: 'phase',
        status: 'in_progress',
        priority: 3,
        progress: 25,
        planned_start_date: '2026-02-01',
        planned_end_date: '2026-02-15',
        assignee_id: members[0]?.id || null,
        dependencies: null,
        version: 1
      },
      {
        project_id: projects[0].id,
        parent_id: null,
        task_code: 'TASK-1.1',
        task_name: '需求调研',
        description: '收集用户需求，编写需求文档',
        task_type: 'task',
        status: 'completed',
        priority: 2,
        progress: 100,
        planned_start_date: '2026-02-01',
        planned_end_date: '2026-02-05',
        assignee_id: members[0]?.id || null,
        dependencies: null,
        version: 1
      },
      {
        project_id: projects[0].id,
        parent_id: null,
        task_code: 'TASK-1.2',
        task_name: '系统设计',
        description: '完成系统架构设计和数据库设计',
        task_type: 'task',
        status: 'in_progress',
        priority: 3,
        progress: 50,
        planned_start_date: '2026-02-06',
        planned_end_date: '2026-02-10',
        assignee_id: members[1]?.id || null,
        dependencies: null,
        version: 1
      },
      {
        project_id: projects[0].id,
        parent_id: null,
        task_code: 'TASK-1.3',
        task_name: 'UI/UX设计',
        description: '完成界面原型设计和交互设计',
        task_type: 'task',
        status: 'pending',
        priority: 2,
        progress: 0,
        planned_start_date: '2026-02-11',
        planned_end_date: '2026-02-15',
        assignee_id: members[2]?.id || null,
        dependencies: null,
        version: 1
      },
      {
        project_id: projects[0].id,
        parent_id: null,
        task_code: 'PHASE-2.0',
        task_name: '开发实施',
        description: '第二阶段：系统开发实施',
        task_type: 'phase',
        status: 'pending',
        priority: 3,
        progress: 0,
        planned_start_date: '2026-02-16',
        planned_end_date: '2026-03-15',
        assignee_id: members[0]?.id || null,
        dependencies: null,
        version: 1
      }
    ];
    
    console.log('\n准备创建任务...');
    
    for (const task of testTasks) {
      try {
        const [result] = await connection.execute(
          `INSERT INTO wbs_tasks (
            project_id, parent_id, task_code, task_name, description,
            task_type, status, priority, progress,
            planned_start_date, planned_end_date, assignee_id,
            dependencies, version
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            task.project_id, task.parent_id, task.task_code, task.task_name, task.description,
            task.task_type, task.status, task.priority, task.progress,
            task.planned_start_date, task.planned_end_date, task.assignee_id,
            task.dependencies, task.version
          ]
        );
        
        console.log(`✅ 创建任务成功: ${task.task_code} - ${task.task_name}`);
      } catch (error) {
        console.error(`❌ 创建任务失败: ${task.task_code}`, error.message);
      }
    }
    
    // 查询任务总数
    const [count] = await connection.execute(
      'SELECT COUNT(*) as total FROM wbs_tasks WHERE deleted_at IS NULL'
    );
    
    console.log(`\n📊 当前 WBS 任务总数: ${count[0].total}`);
    
  } catch (error) {
    console.error('❌ 创建测试任务失败:', error);
  } finally {
    await connection.end();
  }
}

createTestWbsTasks();
