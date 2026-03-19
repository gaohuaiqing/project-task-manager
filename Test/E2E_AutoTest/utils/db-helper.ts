/**
 * 数据库辅助工具
 * 用于清理测试数据和初始化测试环境
 */
import mysql from 'mysql2/promise';

interface DbConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
}

/**
 * 获取测试数据库配置
 */
function getTestDbConfig(): DbConfig {
  return {
    host: process.env.TEST_DB_HOST || 'localhost',
    port: parseInt(process.env.TEST_DB_PORT || '3306'),
    user: process.env.TEST_DB_USER || 'root',
    password: process.env.TEST_DB_PASSWORD || '',
    database: process.env.TEST_DB_NAME || 'task_manager',
  };
}

/**
 * 创建数据库连接
 */
async function createConnection() {
  return mysql.createConnection(getTestDbConfig());
}

/**
 * 清理测试数据
 * 按外键依赖顺序删除，只删除测试数据（以 E2E- 开头）
 */
export async function cleanupTestData(): Promise<void> {
  const connection = await createConnection();

  try {
    await connection.beginTransaction();

    // 按外键依赖顺序删除（子表先删）
    const tables = [
      'task_dependencies',
      'progress_records',
      'tasks',
      'timeline_tasks',
      'timelines',
      'milestones',
      'project_members',
      'projects',
    ];

    for (const table of tables) {
      // 只删除测试数据（以 E2E- 开头或名称包含 E2E）
      await connection.execute(
        `DELETE FROM ${table} WHERE id LIKE 'E2E-%' OR name LIKE '%E2E%' OR code LIKE 'E2E-%'`
      );
    }

    await connection.commit();
    console.log('✓ 测试数据清理完成');
  } catch (error) {
    await connection.rollback();
    console.error('✗ 测试数据清理失败:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

/**
 * 创建测试项目
 */
export async function createTestProject(data: {
  id: string;
  name: string;
  code: string;
  projectType: string;
}): Promise<void> {
  const connection = await createConnection();

  try {
    await connection.execute(
      `INSERT INTO projects (id, name, code, project_type, status, progress, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'planning', 0, NOW(), NOW())`,
      [data.id, data.name, data.code, data.projectType]
    );
    console.log(`✓ 创建测试项目: ${data.name}`);
  } finally {
    await connection.end();
  }
}

/**
 * 创建测试任务
 */
export async function createTestTask(data: {
  id: string;
  projectId: string;
  parentId?: string | null;
  name: string;
  taskType: string;
  priority: string;
}): Promise<void> {
  const connection = await createConnection();

  try {
    const wbsCode = data.parentId 
      ? `${data.parentId}.1` 
      : `${data.projectId.substring(0, 4)}`;

    await connection.execute(
      `INSERT INTO tasks (id, project_id, parent_id, wbs_code, name, status, task_type, priority, progress, sort_order, level, created_at, updated_at, version)
       VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, 0, 0, ?, NOW(), NOW(), 1)`,
      [
        data.id,
        data.projectId,
        data.parentId || null,
        wbsCode,
        data.name,
        data.taskType,
        data.priority,
        data.parentId ? 1 : 0,
      ]
    );
    console.log(`✓ 创建测试任务: ${data.name}`);
  } finally {
    await connection.end();
  }
}

/**
 * 删除测试项目
 */
export async function deleteTestProject(projectId: string): Promise<void> {
  const connection = await createConnection();

  try {
    // 先删除关联的任务
    await connection.execute('DELETE FROM tasks WHERE project_id = ?', [projectId]);
    // 删除项目成员
    await connection.execute('DELETE FROM project_members WHERE project_id = ?', [projectId]);
    // 删除里程碑
    await connection.execute('DELETE FROM milestones WHERE project_id = ?', [projectId]);
    // 删除时间线
    await connection.execute('DELETE FROM timelines WHERE project_id = ?', [projectId]);
    // 删除项目
    await connection.execute('DELETE FROM projects WHERE id = ?', [projectId]);
    console.log(`✓ 删除测试项目: ${projectId}`);
  } finally {
    await connection.end();
  }
}

/**
 * 检查数据库连接
 */
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    const connection = await createConnection();
    await connection.ping();
    await connection.end();
    return true;
  } catch (error) {
    console.error('数据库连接失败:', error);
    return false;
  }
}
