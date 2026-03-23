/**
 * 数据库迁移 031: 插入默认用户和成员数据
 *
 * 目标：
 * 创建默认的系统用户和对应的成员记录，确保前后端数据一致
 */

import { getPool } from '../core/db';
import type { RowDataPacket } from 'mysql2/promise';
import * as bcrypt from 'bcryptjs';

const MIGRATION_VERSION = '031';
const MIGRATION_NAME = 'insert_default_users';

// 默认密码（生产环境应强制修改）
const DEFAULT_PASSWORD = 'admin123';
const SALT_ROUNDS = 10;

/**
 * 检查迁移是否已执行
 */
async function isMigrationExecuted(): Promise<boolean> {
  const pool = getPool();
  if (!pool) return false;

  try {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT 1 FROM migrations WHERE version = ?',
      [MIGRATION_VERSION]
    );
    return rows.length > 0;
  } catch {
    return false;
  }
}

/**
 * 记录迁移执行
 */
async function recordMigration(): Promise<void> {
  const pool = getPool();
  if (!pool) return;

  await pool.execute(
    'INSERT INTO migrations (name, version, executed_at) VALUES (?, ?, NOW())',
    [MIGRATION_NAME, MIGRATION_VERSION]
  );
}

/**
 * 生成密码哈希
 */
async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * 插入默认用户
 */
async function insertDefaultUsers(): Promise<void> {
  const pool = getPool();
  if (!pool) return;

  // 检查是否已有用户数据
  const [existingUsers] = await pool.execute<RowDataPacket[]>(
    'SELECT COUNT(*) as count FROM users'
  );

  if (existingUsers[0].count > 0) {
    console.log('📋 用户表已有数据，跳过插入');
    return;
  }

  const passwordHash = await hashPassword(DEFAULT_PASSWORD);

  // 默认用户数据（与前端角色配置同步）
  const defaultUsers = [
    {
      id: 1,
      username: 'admin',
      name: '系统管理员',
      role: 'admin',
      department_id: 1, // 总公司
    },
    {
      id: 2,
      username: 'tech_manager',
      name: '张技术',
      role: 'tech_manager',
      department_id: 2, // 研发部
    },
    {
      id: 3,
      username: 'dept_manager',
      name: '李部门',
      role: 'dept_manager',
      department_id: 2, // 研发部
    },
    {
      id: 4,
      username: 'engineer1',
      name: '王工程师',
      role: 'engineer',
      department_id: 2, // 研发部
    },
    {
      id: 5,
      username: 'engineer2',
      name: '赵工程师',
      role: 'engineer',
      department_id: 3, // 产品部
    },
    {
      id: 6,
      username: 'tester1',
      name: '钱测试',
      role: 'engineer',
      department_id: 4, // 测试部
    },
    {
      id: 7,
      username: 'ops1',
      name: '孙运维',
      role: 'engineer',
      department_id: 5, // 运维部
    },
  ];

  // 插入用户
  for (const user of defaultUsers) {
    await pool.execute(
      `INSERT INTO users (id, username, password, name, role, department_id, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 1, NOW(), NOW())`,
      [user.id, user.username, passwordHash, user.name, user.role, user.department_id]
    );
  }

  console.log(`✅ 已插入 ${defaultUsers.length} 个默认用户`);
}

/**
 * 插入默认成员（与用户对应）
 */
async function insertDefaultMembers(): Promise<void> {
  const pool = getPool();
  if (!pool) return;

  // 检查是否已有成员数据
  const [existingMembers] = await pool.execute<RowDataPacket[]>(
    'SELECT COUNT(*) as count FROM members'
  );

  if (existingMembers[0].count > 0) {
    console.log('📋 成员表已有数据，跳过插入');
    return;
  }

  // 默认成员数据（与用户一一对应）
  const defaultMembers = [
    {
      id: 1,
      user_id: 1,
      name: '系统管理员',
      employee_id: 'EMP001',
      department: '总公司',
      position: '系统管理员',
      status: 'active',
    },
    {
      id: 2,
      user_id: 2,
      name: '张技术',
      employee_id: 'EMP002',
      department: '研发部',
      position: '技术经理',
      status: 'active',
    },
    {
      id: 3,
      user_id: 3,
      name: '李部门',
      employee_id: 'EMP003',
      department: '研发部',
      position: '部门经理',
      status: 'active',
    },
    {
      id: 4,
      user_id: 4,
      name: '王工程师',
      employee_id: 'EMP004',
      department: '研发部',
      position: '高级工程师',
      status: 'active',
    },
    {
      id: 5,
      user_id: 5,
      name: '赵工程师',
      employee_id: 'EMP005',
      department: '产品部',
      position: '产品工程师',
      status: 'active',
    },
    {
      id: 6,
      user_id: 6,
      name: '钱测试',
      employee_id: 'EMP006',
      department: '测试部',
      position: '测试工程师',
      status: 'active',
    },
    {
      id: 7,
      user_id: 7,
      name: '孙运维',
      employee_id: 'EMP007',
      department: '运维部',
      position: '运维工程师',
      status: 'active',
    },
  ];

  // 插入成员
  for (const member of defaultMembers) {
    await pool.execute(
      `INSERT INTO members (id, user_id, name, employee_id, department, position, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [member.id, member.user_id, member.name, member.employee_id, member.department, member.position, member.status]
    );
  }

  console.log(`✅ 已插入 ${defaultMembers.length} 个默认成员`);
}

/**
 * 更新部门经理
 */
async function updateDepartmentManagers(): Promise<void> {
  const pool = getPool();
  if (!pool) return;

  // 设置部门经理
  await pool.execute(`
    UPDATE departments SET manager_id = 3 WHERE id = 2
  `); // 研发部 -> 李部门

  console.log('✅ 已更新部门经理');
}

/**
 * 执行迁移
 */
export async function runMigration031(): Promise<boolean> {
  try {
    if (await isMigrationExecuted()) {
      console.log('📋 迁移 031 已执行，跳过');
      return true;
    }

    console.log('🚀 开始执行数据库迁移 031: 插入默认用户和成员');

    await insertDefaultUsers();
    await insertDefaultMembers();
    await updateDepartmentManagers();
    await recordMigration();

    console.log('📝 迁移记录已保存');
    console.log('🎉 迁移 031 完成！');
    console.log('');
    console.log('📋 默认账户信息:');
    console.log('   管理员: admin / admin123');
    console.log('   技术经理: tech_manager / admin123');
    console.log('   部门经理: dept_manager / admin123');
    console.log('   工程师: engineer1 / admin123');
    console.log('');
    console.log('⚠️  生产环境请务必修改默认密码！');

    return true;
  } catch (error) {
    console.error('❌ 迁移 031 失败:', error);
    return false;
  }
}
