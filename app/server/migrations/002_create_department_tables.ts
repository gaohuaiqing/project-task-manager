/**
 * 部门管理表迁移脚本
 */

import { databaseService } from '../src/services/DatabaseService.js';

async function runMigration() {
  console.log('[Migration] 开始执行部门管理表迁移...\n');

  try {
    // 等待数据库初始化
    await databaseService.init();

    const connection = await databaseService.getConnection();

    console.log('[Migration] 数据库连接成功\n');

    // 1. 创建部门表
    console.log('[Migration] 创建部门表...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS departments (
        id INT PRIMARY KEY AUTO_INCREMENT,
        code VARCHAR(50) UNIQUE NOT NULL COMMENT '部门编码',
        name VARCHAR(100) NOT NULL COMMENT '部门名称',
        description TEXT COMMENT '部门描述',
        manager_id INT COMMENT '部门经理用户ID',
        parent_id INT COMMENT '上级部门ID（支持部门层级）',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',

        UNIQUE KEY uk_code (code),
        INDEX idx_manager_id (manager_id),
        INDEX idx_parent_id (parent_id),

        FOREIGN KEY (manager_id) REFERENCES users(id) ON DELETE SET NULL,
        FOREIGN KEY (parent_id) REFERENCES departments(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='部门表'
    `);
    console.log('✓ 部门表创建成功\n');

    // 2. 创建技术组表
    console.log('[Migration] 创建技术组表...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS tech_groups (
        id INT PRIMARY KEY AUTO_INCREMENT,
        code VARCHAR(50) UNIQUE NOT NULL COMMENT '技术组编码',
        name VARCHAR(100) NOT NULL COMMENT '技术组名称',
        description TEXT COMMENT '技术组描述',
        department_id INT NOT NULL COMMENT '所属部门ID',
        leader_id INT COMMENT '组长用户ID',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',

        UNIQUE KEY uk_code (code),
        INDEX idx_department_id (department_id),
        INDEX idx_leader_id (leader_id),

        FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE,
        FOREIGN KEY (leader_id) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='技术组表'
    `);
    console.log('✓ 技术组表创建成功\n');

    // 3. 创建用户-部门关联表
    console.log('[Migration] 创建用户-部门关联表...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS user_departments (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT NOT NULL COMMENT '用户ID',
        department_id INT NOT NULL COMMENT '部门ID',
        role VARCHAR(50) NOT NULL COMMENT '部门角色：dept_manager(部门经理), member(成员)',
        is_primary BOOLEAN DEFAULT FALSE COMMENT '是否为主部门',
        joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '加入时间',

        UNIQUE KEY uk_user_dept (user_id, department_id),
        INDEX idx_user_id (user_id),
        INDEX idx_department_id (department_id),

        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户-部门关联表'
    `);
    console.log('✓ 用户-部门关联表创建成功\n');

    // 4. 创建用户-技术组关联表
    console.log('[Migration] 创建用户-技术组关联表...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS user_tech_groups (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT NOT NULL COMMENT '用户ID',
        tech_group_id INT NOT NULL COMMENT '技术组ID',
        role VARCHAR(50) NOT NULL COMMENT '组内角色：leader(组长), member(成员)',
        joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '加入时间',

        UNIQUE KEY uk_user_group (user_id, tech_group_id),
        INDEX idx_user_id (user_id),
        INDEX idx_tech_group_id (tech_group_id),

        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (tech_group_id) REFERENCES tech_groups(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户-技术组关联表'
    `);
    console.log('✓ 用户-技术组关联表创建成功\n');

    // 5. 为项目表添加部门字段
    console.log('[Migration] 为项目表添加部门字段...');
    try {
      // 先检查列是否存在
      const [columns] = await connection.query(`
        SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = 'task_manager' AND TABLE_NAME = 'projects'
        AND COLUMN_NAME IN ('department_id', 'created_by_dept')
      `) as any[];

      const existingColumns = new Set(columns.map((c: any) => c.COLUMN_NAME));

      // 添加 department_id 列
      if (!existingColumns.has('department_id')) {
        await connection.execute(`
          ALTER TABLE projects
          ADD COLUMN department_id INT NOT NULL DEFAULT 1 COMMENT '所属部门ID'
        `);
        console.log('  ✓ 添加 department_id 列');
      } else {
        console.log('  ✓ department_id 列已存在');
      }

      // 添加 created_by_dept 列
      if (!existingColumns.has('created_by_dept')) {
        await connection.execute(`
          ALTER TABLE projects
          ADD COLUMN created_by_dept INT COMMENT '创建者部门ID' AFTER created_by
        `);
        console.log('  ✓ 添加 created_by_dept 列');
      } else {
        console.log('  ✓ created_by_dept 列已存在');
      }

      console.log('✓ 项目表字段添加成功\n');
    } catch (error: any) {
      if (error.code === 'ER_DUP_FIELDNAME') {
        console.log('✓ 项目表字段已存在，跳过\n');
      } else {
        throw error;
      }
    }

    // 6. 创建索引
    console.log('[Migration] 创建索引...');
    const indexes = [
      {name: 'idx_projects_department_id', sql: 'CREATE INDEX idx_projects_department_id ON projects(department_id)'},
      {name: 'idx_projects_created_by_dept', sql: 'CREATE INDEX idx_projects_created_by_dept ON projects(created_by_dept)'}
    ];

    for (const index of indexes) {
      try {
        // 先检查索引是否存在
        const [existing] = await connection.query(`
          SELECT INDEX_NAME FROM information_schema.statistics
          WHERE table_schema = 'task_manager' AND table_name = 'projects' AND index_name = ?
        `, [index.name]) as any[];

        if (existing.length === 0) {
          await connection.execute(index.sql);
          console.log(`  ✓ 创建索引: ${index.name}`);
        } else {
          console.log(`  ✓ 索引已存在: ${index.name}`);
        }
      } catch (error: any) {
        if (error.code === 'ER_DUP_KEYNAME' || error.code === 'ER_LOCK_DEADLOCK') {
          console.log(`  ✓ 索引已存在: ${index.name}`);
        } else {
          throw error;
        }
      }
    }
    console.log('✓ 索引创建成功\n');

    // 7. 初始化示例数据
    console.log('[Migration] 初始化示例数据...');

    // 插入默认部门
    await connection.execute(`
      INSERT INTO departments (code, name, description) VALUES
      ('RD', '研发部', '负责产品研发和技术创新'),
      ('MKT', '市场部', '负责市场推广和品牌建设'),
      ('OPS', '运营部', '负责产品运营和用户增长')
      ON DUPLICATE KEY UPDATE name=name
    `);
    console.log('✓ 默认部门数据插入成功');

    // 插入研发部技术组
    const [rdDept] = await connection.query('SELECT id FROM departments WHERE code="RD"') as any[];
    const [adminUser] = await connection.query('SELECT id FROM users WHERE username="admin" LIMIT 1') as any[];

    if (rdDept.length > 0 && adminUser.length > 0) {
      const rdDeptId = rdDept[0].id;
      const adminUserId = adminUser[0].id;

      await connection.execute(`
        INSERT INTO tech_groups (code, name, description, department_id, leader_id) VALUES
        ('FE', '前端技术组', '负责前端开发和用户体验设计', ?, ?),
        ('BE', '后端技术组', '负责后端开发和系统架构', ?, ?)
        ON DUPLICATE KEY UPDATE name=name
      `, [rdDeptId, adminUserId, rdDeptId, adminUserId]);
      console.log('✓ 默认技术组数据插入成功');
    } else {
      console.log('⚠ 跳过技术组数据插入（缺少必要数据）');
    }

    // 为admin用户分配到研发部
    await connection.execute(`
      INSERT INTO user_departments (user_id, department_id, role, is_primary)
      SELECT u.id, d.id, 'dept_manager', TRUE
      FROM users u
      CROSS JOIN departments d
      WHERE u.username = 'admin' AND d.code = 'RD'
      ON DUPLICATE KEY UPDATE is_primary=TRUE
    `);
    console.log('✓ 用户部门关联数据插入成功\n');

    connection.release();

    // 8. 验证创建结果
    console.log('[Migration] 验证创建结果...\n');

    const deptCount = await databaseService.query('SELECT COUNT(*) as count FROM departments') as any[];
    const groupCount = await databaseService.query('SELECT COUNT(*) as count FROM tech_groups') as any[];
    const userDeptCount = await databaseService.query('SELECT COUNT(*) as count FROM user_departments') as any[];

    console.log(`┌─────────────────────────────────────┐`);
    console.log(`│  迁移完成统计                          │`);
    console.log(`├─────────────────────────────────────┤`);
    console.log(`│  部门数量: ${deptCount[0].count.toString().padStart(2)}                      │`);
    console.log(`│  技术组数量: ${groupCount[0].count.toString().padStart(2)}                      │`);
    console.log(`│  用户部门关联: ${userDeptCount[0].count.toString().padStart(2)}                  │`);
    console.log(`└─────────────────────────────────────┘\n`);

    console.log('✅ 部门管理表迁移成功完成！\n');

  } catch (error) {
    console.error('[Migration] 迁移失败:', error);
    process.exit(1);
  }
}

runMigration();
