/**
 * 迁移到组织架构权限系统
 *
 * 步骤：
 * 1. 给 users 表添加 employee_id 字段
 * 2. 修改权限服务使用组织架构树
 * 3. 清理冗余的关系型表
 */

import mysql from 'mysql2/promise';

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'task_manager'
};

async function migrate() {
  const conn = await mysql.createConnection(dbConfig);

  try {
    console.log('=== 迁移到组织架构权限系统 ===\n');

    // 步骤 1: 添加 employee_id 字段到 users 表
    console.log('📝 步骤 1: 给 users 表添加 employee_id 字段...');

    try {
      await conn.query(`
        ALTER TABLE users
        ADD COLUMN employee_id VARCHAR(50) NULL UNIQUE AFTER name,
        ADD INDEX idx_employee_id (employee_id)
      `);
      console.log('✅ employee_id 字段添加成功');
    } catch (error: any) {
      if (error.code === 'ER_DUP_FIELDNAME') {
        console.log('⚠️  employee_id 字段已存在，跳过');
      } else {
        throw error;
      }
    }

    // 步骤 2: 同步现有的成员数据到 users 表
    console.log('\n📝 步骤 2: 同步成员数据到 users 表...');

    // 获取组织架构数据
    const [orgRows] = await conn.query(
      `SELECT data_json FROM global_data
       WHERE data_type = 'organization_units' AND data_id = 'default'`
    ) as any[];

    if (orgRows && orgRows.length > 0) {
      const org = orgRows[0].data_json;
      let syncedCount = 0;

      for (const dept of org.departments) {
        for (const child of dept.children) {
          if (child.level === 'member') {
            await syncMemberToUser(conn, child);
            syncedCount++;
          } else if (child.level === 'tech_group' && child.children) {
            for (const member of child.children) {
              await syncMemberToUser(conn, member);
              syncedCount++;
            }
          }
        }
      }

      console.log(`✅ 同步了 ${syncedCount} 个成员到 users 表`);
    }

    // 步骤 3: 验证数据
    console.log('\n📝 步骤 3: 验证数据...');

    const [userCount] = await conn.query('SELECT COUNT(*) as count FROM users WHERE employee_id IS NOT NULL');
    const [memberCount] = await conn.query(`
      SELECT JSON_EXTRACT(data_json, '$.departments') as depts
      FROM global_data
      WHERE data_type = 'organization_units' AND data_id = 'default'
    `);

    console.log(`✅ users 表中有 ${ (userCount as any[])[0].count } 个用户关联了员工编号`);

    console.log('\n=== 迁移完成 ===');
    console.log('\n下一步:');
    console.log('1. 修改 index.ts 使用 OrganizationPermissionService');
    console.log('2. 删除 departments/tech_groups/members 相关代码');
    console.log('3. 删除 user_departments/user_tech_groups 表');

  } catch (error) {
    console.error('❌ 迁移失败:', error);
    throw error;
  } finally {
    await conn.end();
  }
}

async function syncMemberToUser(conn: any, member: any) {
  // 检查是否已存在该 employee_id 的用户
  const [existing] = await conn.query(
    'SELECT id FROM users WHERE employee_id = ?',
    [member.employeeId]
  );

  if (existing && existing.length > 0) {
    // 更新现有用户的角色
    await conn.query(
      'UPDATE users SET role = ? WHERE employee_id = ?',
      [member.role, member.employeeId]
    );
  } else {
    // 尝试通过 username 查找用户
    const [byName] = await conn.query(
      'SELECT id FROM users WHERE username = ?',
      [member.name]
    );

    if (byName && byName.length > 0) {
      // 更新用户的 employee_id 和角色
      await conn.query(
        'UPDATE users SET employee_id = ?, role = ? WHERE id = ?',
        [member.employeeId, member.role, byName[0].id]
      );
    } else {
      // 创建新用户（使用默认密码）
      const defaultPassword = '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW'; // secret
      await conn.query(
        `INSERT INTO users (username, password, role, name, employee_id)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE employee_id = VALUES(employee_id), role = VALUES(role)`,
        [member.name, defaultPassword, member.role, member.name, member.employeeId]
      );
    }
  }
}

// 执行迁移
migrate().catch(console.error);
