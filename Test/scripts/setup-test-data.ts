/**
 * 测试数据准备脚本
 * 仅创建测试项目和任务数据，用户使用系统已有账户
 */
import databaseService from '../../app/server/src/services/DatabaseService';
import * as fs from 'fs';
import * as path from 'path';

interface TestAccount {
  id: number;
  username: string;
  password: string;
  real_name: string | null;
  role: string;
}

interface TestProject {
  name: string;
  code: string;
  project_type: string;
  status: string;
  memberIds: number[];
}

import * as crypto from 'crypto';

interface TestTask {
  projectIndex: number;
  wbsCode: string;
  description: string;
  assigneeId: number;
  duration: number;
  level: number;
  status: string;
  parentId?: number;
}

interface TestData {
  testConfig: {
    description: string;
    loginPattern: string;
    note: string;
  };
  testAccounts: TestAccount[];
  testProjects: TestProject[];
  testTasks: TestTask[];
}

async function setupTestData() {
  console.log('========================================');
  console.log('  开始准备测试数据');
  console.log('========================================');
  console.log('');

  // 初始化数据库连接
  await databaseService.init();

  try {
    // 读取测试数据配置
    const configPath = path.join(__dirname, '../data/test-data.json');
    const configData: TestData = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

    console.log('📋 配置信息:', configData.testConfig.description);
    console.log('');

    // 1. 清理现有测试数据（保留用户数据）
    console.log('清理现有测试数据...');
    await databaseService.query('DELETE FROM wbs_tasks WHERE project_id IN (SELECT id FROM projects WHERE name LIKE \'测试项目%\')');
    await databaseService.query('DELETE FROM project_members WHERE project_id IN (SELECT id FROM projects WHERE name LIKE \'测试项目%\')');
    await databaseService.query('DELETE FROM projects WHERE name LIKE \'测试项目%\'');
    console.log('  ✓ 清理完成');
    console.log('');

    // 2. 创建项目
    console.log('创建测试项目...');
    const projectIds: number[] = [];
    const today = new Date();

    for (const project of configData.testProjects) {
      const result = await databaseService.query(
        `INSERT INTO projects (name, code, project_type, status, planned_start_date, planned_end_date, progress, version, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, 0, 1, NOW(), NOW())`,
        [
          project.name,
          project.code,
          project.project_type,
          project.status,
          today,
          new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)
        ]
      );

      const projectId = result.insertId;
      projectIds.push(projectId);
      console.log(`  ✓ 项目创建成功: ${project.name} (ID: ${projectId})`);

      // 添加项目成员
      for (const memberId of project.memberIds) {
        await databaseService.query(
          'INSERT INTO project_members (project_id, user_id, role, created_at) VALUES (?, ?, ?, NOW())',
          [projectId, memberId, 'member']
        );
      }
    }
    console.log('');

    // 3. 创建任务
    console.log('创建测试任务...');
    const taskParentMap = new Map<number, string>();

    for (const task of configData.testTasks) {
      const projectId = projectIds[task.projectIndex];
      const actualParentId = task.parentId ? taskParentMap.get(task.parentId) : null;
      const taskId = crypto.randomUUID();

      await databaseService.query(
        `INSERT INTO wbs_tasks (
          id, project_id, parent_id, wbs_level, wbs_code, description, status, task_type, priority,
          assignee_id, start_date, duration, planned_duration, is_six_day_week, warning_days,
          dependency_type, full_time_ratio, delay_count, plan_change_count, progress_record_count, version
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'other', 'medium', ?, ?, ?, ?, false, 3, 'FS', 100, 0, 0, 0, 1)`,
        [
          taskId,
          projectId,
          actualParentId,
          task.level,
          task.wbsCode,
          task.description,
          task.status,
          task.assigneeId,
          new Date(today.getTime() + (task.level === 1 ? 0 : 1) * 24 * 60 * 60 * 1000),
          task.duration,
          task.duration
        ]
      );

      const taskIndex = configData.testTasks.indexOf(task) + 1;
      taskParentMap.set(taskIndex, taskId);

      console.log(`  ✓ 任务创建成功: ${task.wbsCode} ${task.description}`);
    }
    console.log('');

    // 4. 输出测试账号信息
    console.log('========================================');
    console.log('  测试数据准备完成');
    console.log('========================================');
    console.log('');
    console.log('📊 数据统计:');
    console.log(`  项目数: ${configData.testProjects.length}`);
    console.log(`  任务数: ${configData.testTasks.length}`);
    console.log('');
    console.log('📝 测试账号 (登录名=密码):');
    for (const account of configData.testAccounts) {
      console.log(`  ${account.role.padEnd(12)} ${account.username} / ${account.password} (${account.real_name || '系统管理员'})`);
    }
    console.log('');

  } catch (error) {
    console.error('❌ 测试数据准备失败:', error);
    throw error;
  } finally {
    await databaseService.close();
  }
}

setupTestData()
  .then(() => {
    console.log('');
    process.exit(0);
  })
  .catch(() => {
    console.log('');
    process.exit(1);
  });