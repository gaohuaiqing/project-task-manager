/**
 * 数据迁移脚本 - 将旧表数据迁移到 global_data 统一架构
 * 运行方式: node migrations/migrate-003-data-migration.js
 */

import mysql from 'mysql2/promise';

const DB_CONFIG = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'task_manager'
};

async function runMigration() {
  let connection;

  try {
    console.log('[Data Migration] 开始连接数据库...');
    connection = await mysql.createConnection(DB_CONFIG);
    console.log('[Data Migration] 数据库连接成功');

    // ============================================
    // 1. 迁移项目数据 (projects → global_data)
    // ============================================
    console.log('\n[Data Migration] 开始迁移项目数据...');

    const [projects] = await connection.query(`
      SELECT
        id,
        code,
        name,
        description,
        status,
        project_type,
        planned_start_date,
        planned_end_date,
        progress,
        task_count,
        completed_task_count,
        department_id,
        created_by,
        created_at,
        updated_at
      FROM projects
    `);

    console.log(`[Data Migration] 找到 ${projects.length} 个项目`);

    let migratedProjects = 0;
    for (const project of projects) {
      const dataId = `project_${project.id}`;
      const dataJson = {
        id: project.id,
        code: project.code,
        name: project.name,
        description: project.description,
        status: project.status,
        projectType: project.project_type,
        plannedStartDate: project.planned_start_date,
        plannedEndDate: project.planned_end_date,
        progress: project.progress,
        taskCount: project.task_count,
        completedTaskCount: project.completed_task_count,
        departmentId: project.department_id,
        createdAt: project.created_at ? new Date(project.created_at).getTime() : Date.now(),
        updatedAt: project.updated_at ? new Date(project.updated_at).getTime() : Date.now()
      };

      // 检查是否已存在
      const [existing] = await connection.query(
        'SELECT id FROM global_data WHERE data_type = ? AND data_id = ?',
        ['projects', dataId]
      );

      if (existing.length === 0) {
        await connection.query(
          `INSERT INTO global_data (
            data_type, data_id, data_json, version,
            created_by, updated_by, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            'projects',
            dataId,
            JSON.stringify(dataJson),
            1,
            project.created_by || 1,
            project.created_by || 1,
            project.created_at || new Date(),
            project.updated_at || project.created_at || new Date()
          ]
        );
        migratedProjects++;
        console.log(`  ✓ 迁移项目: ${project.name} (ID: ${project.id})`);
      } else {
        console.log(`  - 项目已存在，跳过: ${project.name} (ID: ${project.id})`);
      }
    }

    console.log(`[Data Migration] ✅ 项目迁移完成: ${migratedProjects}/${projects.length}`);

    // ============================================
    // 2. 迁移节假日数据 (holidays → global_data)
    // ============================================
    console.log('\n[Data Migration] 开始迁移节假日数据...');

    const [holidays] = await connection.query(`
      SELECT
        id,
        name,
        holiday_date,
        is_workday,
        year
      FROM holidays
    `);

    console.log(`[Data Migration] 找到 ${holidays.length} 个节假日`);

    let migratedHolidays = 0;
    for (const holiday of holidays) {
      const dataId = `holiday_${holiday.id}`;
      const dataJson = {
        id: holiday.id,
        name: holiday.name,
        date: holiday.holiday_date,
        isWorkday: Boolean(holiday.is_workday),
        year: holiday.year
      };

      // 检查是否已存在
      const [existing] = await connection.query(
        'SELECT id FROM global_data WHERE data_type = ? AND data_id = ?',
        ['holidays', dataId]
      );

      if (existing.length === 0) {
        await connection.query(
          `INSERT INTO global_data (
            data_type, data_id, data_json, version,
            created_by, updated_by, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            'holidays',
            dataId,
            JSON.stringify(dataJson),
            1,
            1,
            1,
            new Date(),
            new Date()
          ]
        );
        migratedHolidays++;
        console.log(`  ✓ 迁移节假日: ${holiday.name} (${holiday.holiday_date})`);
      } else {
        console.log(`  - 节假日已存在，跳过: ${holiday.name} (${holiday.holiday_date})`);
      }
    }

    console.log(`[Data Migration] ✅ 节假日迁移完成: ${migratedHolidays}/${holidays.length}`);

    // ============================================
    // 3. 迁移 WBS 任务数据 (wbs_tasks → global_data)
    // ============================================
    console.log('\n[Data Migration] 开始迁移 WBS 任务数据...');

    const [tasks] = await connection.query(`
      SELECT
        id,
        project_id,
        parent_id,
        task_code,
        task_name,
        description,
        task_type,
        status,
        priority,
        estimated_hours,
        actual_hours,
        progress,
        planned_start_date,
        planned_end_date,
        actual_start_date,
        actual_end_date,
        assignee_id,
        dependencies,
        tags,
        attachments,
        version,
        created_by,
        created_at,
        updated_at
      FROM wbs_tasks
    `);

    console.log(`[Data Migration] 找到 ${tasks.length} 个 WBS 任务`);

    let migratedTasks = 0;
    for (const task of tasks) {
      const dataId = `task_${task.id}`;
      const dataJson = {
        id: task.id,
        projectId: task.project_id,
        parentId: task.parent_id,
        taskCode: task.task_code,
        taskName: task.task_name,
        description: task.description,
        taskType: task.task_type || 'task',
        status: task.status,
        priority: task.priority,
        estimatedHours: task.estimated_hours,
        actualHours: task.actual_hours,
        progress: task.progress,
        plannedStartDate: task.planned_start_date,
        plannedEndDate: task.planned_end_date,
        actualStartDate: task.actual_start_date,
        actualEndDate: task.actual_end_date,
        assigneeId: task.assignee_id,
        dependencies: task.dependencies,
        tags: task.tags,
        attachments: task.attachments,
        version: task.version || 1,
        createdAt: task.created_at ? new Date(task.created_at).getTime() : Date.now(),
        updatedAt: task.updated_at ? new Date(task.updated_at).getTime() : Date.now()
      };

      // 检查是否已存在
      const [existing] = await connection.query(
        'SELECT id FROM global_data WHERE data_type = ? AND data_id = ?',
        ['wbs_tasks', dataId]
      );

      if (existing.length === 0) {
        await connection.query(
          `INSERT INTO global_data (
            data_type, data_id, data_json, version,
            created_by, updated_by, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            'wbs_tasks',
            dataId,
            JSON.stringify(dataJson),
            task.version || 1,
            task.created_by || 1,
            task.created_by || 1,
            task.created_at || new Date(),
            task.updated_at || task.created_at || new Date()
          ]
        );
        migratedTasks++;
        console.log(`  ✓ 迁移任务: ${task.task_name} (ID: ${task.id})`);
      } else {
        console.log(`  - 任务已存在，跳过: ${task.task_name} (ID: ${task.id})`);
      }
    }

    console.log(`[Data Migration] ✅ WBS 任务迁移完成: ${migratedTasks}/${tasks.length}`);

    // ============================================
    // 4. 验证迁移结果
    // ============================================
    console.log('\n[Data Migration] 验证迁移结果...');

    const [summary] = await connection.query(`
      SELECT
        data_type,
        COUNT(*) as count,
        MAX(version) as max_version
      FROM global_data
      WHERE data_type IN ('projects', 'holidays', 'wbs_tasks')
      GROUP BY data_type
    `);

    console.log('\n📊 迁移结果汇总:');
    console.log('='.repeat(60));
    if (summary.length > 0) {
      summary.forEach((row) => {
        console.log(`  ${row.data_type}: ${row.count} 条记录，最高版本: ${row.max_version}`);
      });
    } else {
      console.log('  没有找到迁移的数据');
    }

    console.log('\n[Data Migration] ✅ 所有数据迁移完成！');

    // 对比旧表和新表数据量
    const [oldCounts] = await connection.query(`
      SELECT
        'projects' as table_name,
        COUNT(*) as count
      FROM projects
      UNION ALL
      SELECT
        'holidays',
        COUNT(*)
      FROM holidays
      UNION ALL
      SELECT
        'wbs_tasks',
        COUNT(*)
      FROM wbs_tasks
    `);

    console.log('\n📋 数据对比:');
    console.log('='.repeat(60));
    oldCounts.forEach((row) => {
      const newCount = summary.find((s) => s.data_type === row.table_name)?.count || 0;
      const status = row.count === newCount ? '✅' : '⚠️';
      console.log(`  ${status} ${row.table_name}: 旧表 ${row.count} 条 → 新架构 ${newCount} 条`);
    });

  } catch (error) {
    console.error('[Data Migration] ❌ 迁移失败:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// 运行迁移
runMigration();
