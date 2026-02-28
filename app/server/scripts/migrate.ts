/**
 * 数据库迁移脚本
 *
 * 功能：
 * 1. 检查数据库连接
 * 2. 初始化数据库结构
 * 3. 插入默认数据
 * 4. 支持回滚
 *
 * 使用方法：
 * npm run migrate:up    # 执行迁移
 * npm run migrate:down  # 回滚迁移
 * npm run migrate:status # 查看迁移状态
 */

import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 迁移配置
const MIGRATIONS_DIR = path.join(__dirname, '../migrations');
const LOCK_FILE = path.join(__dirname, '../.migration-lock');

interface Migration {
  id: string;
  name: string;
  up: string;
  down: string;
  timestamp: number;
}

class DatabaseMigrator {
  private pool: mysql.Pool | null = null;
  private connectionConfig: any;

  constructor() {
    this.connectionConfig = {
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'task_manager',
      multipleStatements: true // 允许执行多条SQL语句
    };
  }

  /**
   * 初始化数据库连接
   */
  async init(): Promise<void> {
    this.pool = mysql.createPool(this.connectionConfig);
    console.log('[Migrator] 数据库连接已建立');
  }

  /**
   * 关闭数据库连接
   */
  async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      console.log('[Migrator] 数据库连接已关闭');
    }
  }

  /**
   * 执行原始SQL
   */
  async executeSQL(sql: string): Promise<any> {
    const connection = await this.pool!.getConnection();
    try {
      const [results] = await connection.execute(sql);
      return results;
    } finally {
      connection.release();
    }
  }

  /**
   * 检查迁移表是否存在
   */
  async checkMigrationTable(): Promise<boolean> {
    const [rows] = await this.executeSQL(`
      SELECT COUNT(*) as count
      FROM information_schema.tables
      WHERE table_schema = DATABASE()
      AND table_name = '_migrations'
    `);

    return (rows as any)[0].count > 0;
  }

  /**
   * 创建迁移表
   */
  async createMigrationTable(): Promise<void> {
    await this.executeSQL(`
      CREATE TABLE _migrations (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('[Migrator] 迁移表已创建');
  }

  /**
   * 获取已执行的迁移
   */
  async getExecutedMigrations(): Promise<string[]> {
    if (!(await this.checkMigrationTable())) {
      return [];
    }

    const [rows] = await this.executeSQL('SELECT name FROM _migrations ORDER BY executed_at');
    return (rows as any[]).map((row: any) => row.name);
  }

  /**
   * 记录已执行的迁移
   */
  async recordMigration(name: string): Promise<void> {
    await this.executeSQL('INSERT INTO _migrations (name) VALUES (?)', [name]);
    console.log(`[Migrator] 迁移已记录: ${name}`);
  }

  /**
   * 删除迁移记录
   */
  async removeMigration(name: string): Promise<void> {
    await this.executeSQL('DELETE FROM _migrations WHERE name = ?', [name]);
    console.log(`[Migrator] 迁移记录已删除: ${name}`);
  }

  /**
   * 获取所有迁移文件
   */
  getMigrations(): Migration[] {
    if (!fs.existsSync(MIGRATIONS_DIR)) {
      console.log('[Migrator] 迁移目录不存在，使用内置迁移');
      return this.getBuiltinMigrations();
    }

    const files = fs.readdirSync(MIGRATIONS_DIR)
      .filter(f => f.endsWith('.js'))
      .sort();

    return files.map(file => {
      const migration = require(path.join(MIGRATIONS_DIR, file));
      return {
        id: file.replace('.js', ''),
        name: migration.name || file,
        up: migration.up,
        down: migration.down,
        timestamp: parseInt(file.split('-')[0])
      };
    });
  }

  /**
   * 获取内置迁移（用于开发）
   */
  getBuiltinMigrations(): Migration[] {
    return [
      {
        id: '001',
        name: 'init_schema',
        timestamp: 1,
        up: `
          -- 创建用户表
          CREATE TABLE IF NOT EXISTS users (
            id INT PRIMARY KEY AUTO_INCREMENT,
            username VARCHAR(50) UNIQUE NOT NULL,
            password VARCHAR(255) NOT NULL,
            role ENUM('admin', 'tech_manager', 'dept_manager', 'engineer') NOT NULL,
            name VARCHAR(100) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
          );

          -- 创建会话表
          CREATE TABLE IF NOT EXISTS sessions (
            id INT PRIMARY KEY AUTO_INCREMENT,
            session_id VARCHAR(255) UNIQUE NOT NULL,
            user_id INT NOT NULL,
            device_id VARCHAR(255) NOT NULL,
            device_info TEXT,
            ip_address VARCHAR(50),
            status ENUM('active', 'terminated') DEFAULT 'active',
            termination_reason VARCHAR(255),
            termination_timestamp BIGINT,
            created_at BIGINT NOT NULL,
            last_accessed BIGINT NOT NULL,
            expires_at BIGINT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
          );

          -- 创建项目表
          CREATE TABLE IF NOT EXISTS projects (
            id INT PRIMARY KEY AUTO_INCREMENT,
            code VARCHAR(50) UNIQUE NOT NULL,
            name VARCHAR(100) NOT NULL,
            description TEXT,
            status ENUM('planning', 'in_progress', 'completed', 'delayed') DEFAULT 'planning',
            project_type ENUM('product_development', 'other') DEFAULT 'other',
            planned_start_date DATE,
            planned_end_date DATE,
            progress INT DEFAULT 0,
            task_count INT DEFAULT 0,
            completed_task_count INT DEFAULT 0,
            version INT DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            created_by INT,
            FOREIGN KEY (created_by) REFERENCES users(id)
          );

          -- 创建成员表
          CREATE TABLE IF NOT EXISTS members (
            id INT PRIMARY KEY AUTO_INCREMENT,
            name VARCHAR(100) NOT NULL,
            employee_id VARCHAR(50) UNIQUE,
            department VARCHAR(100),
            position VARCHAR(100),
            email VARCHAR(100),
            phone VARCHAR(20),
            skills JSON,
            capabilities JSON,
            status ENUM('active', 'inactive') DEFAULT 'active',
            version INT DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            created_by INT,
            FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
          );

          -- 创建WBS任务表
          CREATE TABLE IF NOT EXISTS wbs_tasks (
            id INT PRIMARY KEY AUTO_INCREMENT,
            project_id INT NOT NULL,
            parent_id INT,
            task_code VARCHAR(50) NOT NULL,
            task_name VARCHAR(200) NOT NULL,
            description TEXT,
            task_type ENUM('milestone', 'phase', 'task', 'deliverable') DEFAULT 'task',
            status ENUM('pending', 'in_progress', 'completed', 'delayed', 'cancelled') DEFAULT 'pending',
            priority INT DEFAULT 1,
            estimated_hours DECIMAL(10,2),
            actual_hours DECIMAL(10,2),
            progress DECIMAL(5,2) DEFAULT 0,
            planned_start_date DATE,
            planned_end_date DATE,
            actual_start_date DATE,
            actual_end_date DATE,
            assignee_id INT,
            dependencies JSON,
            tags JSON,
            attachments JSON,
            version INT DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            created_by INT,
            FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
            FOREIGN KEY (parent_id) REFERENCES wbs_tasks(id) ON DELETE SET NULL,
            FOREIGN KEY (assignee_id) REFERENCES members(id) ON DELETE SET NULL,
            FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
            UNIQUE KEY uk_project_task (project_id, task_code),
            CONSTRAINT chk_progress CHECK (progress >= 0 AND progress <= 100),
            CONSTRAINT chk_priority CHECK (priority >= 1 AND priority <= 5)
          );

          -- 创建任务分配历史表
          CREATE TABLE IF NOT EXISTS task_assignments (
            id INT PRIMARY KEY AUTO_INCREMENT,
            task_id INT NOT NULL,
            assignee_id INT NOT NULL,
            assigned_by INT NOT NULL,
            assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            unassigned_at TIMESTAMP NULL,
            status ENUM('active', 'cancelled', 'completed') DEFAULT 'active',
            notes TEXT,
            FOREIGN KEY (task_id) REFERENCES wbs_tasks(id) ON DELETE CASCADE,
            FOREIGN KEY (assignee_id) REFERENCES members(id) ON DELETE CASCADE,
            FOREIGN KEY (assigned_by) REFERENCES users(id)
          );

          -- 创建数据版本控制表
          CREATE TABLE IF NOT EXISTS data_versions (
            id BIGINT PRIMARY KEY AUTO_INCREMENT,
            entity_type VARCHAR(50) NOT NULL,
            entity_id INT NOT NULL,
            version INT NOT NULL,
            changed_by INT NOT NULL,
            change_type ENUM('create', 'update', 'delete') NOT NULL,
            change_data JSON,
            change_reason VARCHAR(255),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (changed_by) REFERENCES users(id),
            UNIQUE KEY uk_entity_version (entity_type, entity_id, version),
            INDEX idx_entity (entity_type, entity_id),
            INDEX idx_changed_by (changed_by),
            INDEX idx_created_at (created_at)
          );

          -- 创建节假日表
          CREATE TABLE IF NOT EXISTS holidays (
            id INT PRIMARY KEY AUTO_INCREMENT,
            holiday_date DATE NOT NULL UNIQUE,
            name VARCHAR(100) NOT NULL,
            is_workday TINYINT(1) DEFAULT 0,
            year INT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_year (year),
            INDEX idx_date (holiday_date)
          );

          -- 创建索引
          CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
          CREATE INDEX IF NOT EXISTS idx_sessions_session_id ON sessions(session_id);
          CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
          CREATE INDEX IF NOT EXISTS idx_projects_created_by ON projects(created_by);
          CREATE INDEX IF NOT EXISTS idx_members_department ON members(department);
          CREATE INDEX IF NOT EXISTS idx_members_status ON members(status);
          CREATE INDEX IF NOT EXISTS idx_wbs_tasks_project_status ON wbs_tasks(project_id, status);
          CREATE INDEX IF NOT EXISTS idx_wbs_tasks_assignee ON wbs_tasks(assignee_id);
          CREATE INDEX IF NOT EXISTS idx_task_assignments_task_active ON task_assignments(task_id, status);

          -- 插入默认管理员
          INSERT IGNORE INTO users (username, password, role, name)
          VALUES ('admin', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'admin', '系统管理员');
        `,
        down: `
          DROP TABLE IF EXISTS holidays;
          DROP TABLE IF EXISTS data_versions;
          DROP TABLE IF EXISTS task_assignments;
          DROP TABLE IF EXISTS wbs_tasks;
          DROP TABLE IF EXISTS members;
          DROP TABLE IF EXISTS projects;
          DROP TABLE IF EXISTS sessions;
          DROP TABLE IF EXISTS users;
        `
      }
    ];
  }

  /**
   * 执行迁移（up）
   */
  async up(): Promise<void> {
    console.log('🚀 开始执行数据库迁移...');

    // 检查锁文件
    if (fs.existsSync(LOCK_FILE)) {
      throw new Error('迁移正在进行中，请稍后再试');
    }

    try {
      // 创建锁文件
      fs.writeFileSync(LOCK_FILE, Date.now().toString());

      await this.init();

      // 确保迁移表存在
      if (!(await this.checkMigrationTable())) {
        await this.createMigrationTable();
      }

      const executedMigrations = await this.getExecutedMigrations();
      const pendingMigrations = this.getMigrations()
        .filter(m => !executedMigrations.includes(m.name))
        .sort((a, b) => a.timestamp - b.timestamp);

      if (pendingMigrations.length === 0) {
        console.log('✅ 所有迁移都已执行');
        return;
      }

      console.log(`📋 待执行迁移: ${pendingMigrations.length} 个`);

      for (const migration of pendingMigrations) {
        console.log(`⏳ 执行迁移: ${migration.name}`);

        try {
          await this.executeSQL(migration.up);
          await this.recordMigration(migration.name);
          console.log(`✅ 迁移成功: ${migration.name}`);
        } catch (error) {
          console.error(`❌ 迁移失败: ${migration.name}`, error);
          throw error;
        }
      }

      console.log('🎉 所有迁移执行成功！');
    } finally {
      // 删除锁文件
      if (fs.existsSync(LOCK_FILE)) {
        fs.unlinkSync(LOCK_FILE);
      }
      await this.close();
    }
  }

  /**
   * 回滚迁移（down）
   */
  async down(steps: number = 1): Promise<void> {
    console.log('🔄 开始回滚数据库迁移...');

    if (fs.existsSync(LOCK_FILE)) {
      throw new Error('迁移正在进行中，请稍后再试');
    }

    try {
      fs.writeFileSync(LOCK_FILE, Date.now().toString());
      await this.init();

      if (!(await this.checkMigrationTable())) {
        console.log('❌ 没有找到迁移表');
        return;
      }

      const executedMigrations = await this.getExecutedMigrations();
      const allMigrations = this.getMigrations()
        .sort((a, b) => b.timestamp - a.timestamp);

      const migrationsToRollback = allMigrations
        .filter(m => executedMigrations.includes(m.name))
        .slice(0, steps);

      if (migrationsToRollback.length === 0) {
        console.log('✅ 没有需要回滚的迁移');
        return;
      }

      console.log(`📋 待回滚迁移: ${migrationsToRollback.length} 个`);

      for (const migration of migrationsToRollback) {
        console.log(`⏳ 回滚迁移: ${migration.name}`);

        try {
          await this.executeSQL(migration.down);
          await this.removeMigration(migration.name);
          console.log(`✅ 回滚成功: ${migration.name}`);
        } catch (error) {
          console.error(`❌ 回滚失败: ${migration.name}`, error);
          throw error;
        }
      }

      console.log('🎉 迁移回滚成功！');
    } finally {
      if (fs.existsSync(LOCK_FILE)) {
        fs.unlinkSync(LOCK_FILE);
      }
      await this.close();
    }
  }

  /**
   * 查看迁移状态
   */
  async status(): Promise<void> {
    await this.init();

    const executedMigrations = await this.getExecutedMigrations();
    const allMigrations = this.getMigrations()
      .sort((a, b) => a.timestamp - b.timestamp);

    console.log('\n📊 数据库迁移状态:\n');
    console.log('状态 | 迁移名称');
    console.log('-----|----------');

    for (const migration of allMigrations) {
      const executed = executedMigrations.includes(migration.name);
      const status = executed ? '✅ 已执行' : '⏳ 待执行';
      console.log(`${status} | ${migration.name}`);
    }

    console.log(`\n总计: ${executedMigrations.length}/${allMigrations.length} 个迁移已执行\n`);

    await this.close();
  }
}

// ==================== CLI入口 ====================

async function main() {
  const migrator = new DatabaseMigrator();
  const command = process.argv[2];
  const args = process.argv.slice(3);

  try {
    switch (command) {
      case 'up':
        await migrator.up();
        break;
      case 'down':
        const steps = args[0] ? parseInt(args[0]) : 1;
        await migrator.down(steps);
        break;
      case 'status':
        await migrator.status();
        break;
      default:
        console.log(`
使用方法:
  npm run migrate:up         # 执行所有待执行的迁移
  npm run migrate:down       # 回滚最近1次迁移
  npm run migrate:down 3     # 回滚最近3次迁移
  npm run migrate:status     # 查看迁移状态
        `);
    }
  } catch (error) {
    console.error('❌ 迁移失败:', error);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { DatabaseMigrator };
