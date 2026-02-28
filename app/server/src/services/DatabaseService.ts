import mysql from 'mysql2/promise';
// 使用新的异步日志系统（已包含 systemLogger 别名）
import { systemLogger } from './AsyncSystemLogger.js';

class DatabaseService {
  private pool: mysql.Pool | null = null;
  private logQueries: boolean = false; // 禁用SQL查询日志以避免连接数耗尽
  private poolMonitorInterval: NodeJS.Timeout | null = null; // 连接池监控定时器

  async init() {
    try {
      const dbPassword = process.env.DB_PASSWORD;
      const poolConfig: any = {
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        database: process.env.DB_NAME || 'task_manager',
        waitForConnections: true,
        // 连接池大小配置（针对100人并发场景优化）
        connectionLimit: 100,           // 最大连接数（应对突发流量）
        queueLimit: 0,                 // 队列限制（0表示无限制，但会排队等待）
        maxIdle: 20,                    // 最大空闲连接数（增加空闲连接复用）
        idleTimeout: 300000,            // 空闲连接超时时间（5分钟，减少频繁创建/销毁）
        connectTimeout: 10000,          // 连接超时（10秒）
        acquireTimeout: 30000,          // 获取连接超时（30秒）
        enableKeepAlive: true,
        keepAliveInitialDelay: 0,
        keepAlive: 10000,               // 保活间隔（10秒）
        charset: 'utf8mb4',
        collation: 'utf8mb4_unicode_ci',
        multipleStatements: true,
        timezone: '+08:00',             // 使用中国时区（UTC+8）
        // 性能优化
        namedPlaceholders: true,        // 使用命名占位符（性能优化）
        dateStrings: true,              // 返回字符串避免时区转换问题
        supportBigNumbers: true,        // 支持大数（避免精度丢失）
        bigNumberStrings: false         // 大数作为字符串返回
      };

      // 只有当密码非空时才添加password字段
      if (dbPassword && dbPassword.trim() !== '') {
        poolConfig.password = dbPassword;
      }

      this.pool = mysql.createPool(poolConfig);

      // 启动连接池监控（每30秒检查一次）
      this.startPoolMonitoring();

      // 测试数据库连接
      const connection = await this.pool.getConnection();

      // 设置连接字符集为 utf8mb4
      await connection.query('SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci');

      console.log('[Database] 连接成功');
      connection.release();

      // 初始化数据库表结构
      await this.initSchema();

    } catch (error) {
      console.error('[Database] 连接失败:', error);
      throw error;
    }
  }

  async initSchema() {
    try {
      const connection = await this.pool!.getConnection();

      // 创建数据库（如果不存在）
      await connection.query(
        'CREATE DATABASE IF NOT EXISTS task_manager CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci'
      );

      // 使用数据库
      await connection.query('USE task_manager');

      // 用户表
      await connection.execute(`
        CREATE TABLE IF NOT EXISTS users (
          id INT PRIMARY KEY AUTO_INCREMENT,
          username VARCHAR(50) UNIQUE NOT NULL,
          password VARCHAR(255) NOT NULL,
          role ENUM('admin', 'tech_manager', 'dept_manager', 'engineer') NOT NULL,
          name VARCHAR(100) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `);

      // 会话表
      await connection.execute(`
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
        )
      `);

      // 项目表
      await connection.execute(`
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
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          created_by INT,
          FOREIGN KEY (created_by) REFERENCES users(id)
        )
      `);

      // 项目里程碑表
      await connection.execute(`
        CREATE TABLE IF NOT EXISTS milestones (
          id INT PRIMARY KEY AUTO_INCREMENT,
          project_id INT NOT NULL,
          name VARCHAR(100) NOT NULL,
          planned_date DATE NOT NULL,
          description TEXT,
          status ENUM('pending', 'completed', 'delayed') DEFAULT 'pending',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
        )
      `);

      // 项目成员关联表
      await connection.execute(`
        CREATE TABLE IF NOT EXISTS project_members (
          id INT PRIMARY KEY AUTO_INCREMENT,
          project_id INT NOT NULL,
          user_id INT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          UNIQUE KEY (project_id, user_id)
        )
      `);

      // 用户配置表
      await connection.execute(`
        CREATE TABLE IF NOT EXISTS user_configs (
          id INT PRIMARY KEY AUTO_INCREMENT,
          user_id INT NOT NULL,
          config_key VARCHAR(100) NOT NULL,
          config_value TEXT NOT NULL,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          UNIQUE KEY (user_id, config_key)
        )
      `);

      // 数据变更日志表
      await connection.execute(`
        CREATE TABLE IF NOT EXISTS data_changes (
          id INT PRIMARY KEY AUTO_INCREMENT,
          change_type ENUM('create', 'update', 'delete') NOT NULL,
          entity_type VARCHAR(50) NOT NULL,
          entity_id INT NOT NULL,
          user_id INT NOT NULL,
          change_data TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id)
        )
      `);

      // ========== 核心业务表 - MySQL主存储架构 ==========

      // 成员表（组织架构）
      await connection.execute(`
        CREATE TABLE IF NOT EXISTS members (
          id INT PRIMARY KEY AUTO_INCREMENT,
          name VARCHAR(100) NOT NULL,
          employee_id VARCHAR(50) UNIQUE,
          department VARCHAR(100),
          position VARCHAR(100),
          skills JSON,
          capabilities JSON,
          status ENUM('active', 'inactive') DEFAULT 'active',
          version INT DEFAULT 1,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          created_by INT,
          FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);

      // WBS任务表（支持层级结构、版本控制）
      await connection.execute(`
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
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);

      // 任务分配历史表（审计追踪）
      await connection.execute(`
        CREATE TABLE IF NOT EXISTS task_assignments (
          id INT PRIMARY KEY AUTO_INCREMENT,
          task_id INT NOT NULL,
          assignee_id INT NOT NULL,
          assigned_by INT NOT NULL,
          assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          unassigned_at TIMESTAMP NULL,
          status ENUM('active', 'cancelled', 'completed') DEFAULT 'active',
          notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_task_id (task_id),
          INDEX idx_assignee_id (assignee_id),
          INDEX idx_status (status),
          INDEX idx_assigned_at (assigned_at),
          FOREIGN KEY (task_id) REFERENCES wbs_tasks(id) ON DELETE CASCADE,
          FOREIGN KEY (assignee_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (assigned_by) REFERENCES users(id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);

      // 数据版本控制表（乐观锁实现）
      await connection.execute(`
        CREATE TABLE IF NOT EXISTS data_versions (
          id BIGINT PRIMARY KEY AUTO_INCREMENT,
          entity_type VARCHAR(50) NOT NULL COMMENT '实体类型：task, project, member',
          entity_id INT NOT NULL COMMENT '实体ID',
          version INT NOT NULL COMMENT '版本号',
          changed_by INT NOT NULL COMMENT '修改人',
          change_type ENUM('create', 'update', 'delete') NOT NULL,
          change_data JSON COMMENT '变更数据快照',
          change_reason VARCHAR(255) COMMENT '变更原因',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (changed_by) REFERENCES users(id),
          UNIQUE KEY uk_entity_version (entity_type, entity_id, version),
          INDEX idx_entity (entity_type, entity_id),
          INDEX idx_changed_by (changed_by),
          INDEX idx_created_at (created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);

      // 节假日配置表
      await connection.execute(`
        CREATE TABLE IF NOT EXISTS holidays (
          id INT PRIMARY KEY AUTO_INCREMENT,
          holiday_date DATE NOT NULL UNIQUE,
          name VARCHAR(100) NOT NULL,
          is_workday TINYINT(1) DEFAULT 0 COMMENT '是否为调休工作日',
          year INT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_year (year),
          INDEX idx_date (holiday_date)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);

      // ========== 全局数据管理表 ==========

      // 全局数据表（支持多用户实时协作）
      await connection.execute(`
        CREATE TABLE IF NOT EXISTS global_data (
          id INT PRIMARY KEY AUTO_INCREMENT,
          data_type VARCHAR(50) NOT NULL,
          data_id VARCHAR(255) NOT NULL,
          data_json JSON NOT NULL,
          version INT DEFAULT 1,
          created_by INT NOT NULL,
          updated_by INT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE KEY uk_data_type_id (data_type, data_id),
          INDEX idx_data_type (data_type),
          INDEX idx_updated_at (updated_at),
          FOREIGN KEY (created_by) REFERENCES users(id),
          FOREIGN KEY (updated_by) REFERENCES users(id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);

      // 数据变更日志表（审计追踪）
      await connection.execute(`
        CREATE TABLE IF NOT EXISTS data_change_log (
          id BIGINT PRIMARY KEY AUTO_INCREMENT,
          data_type VARCHAR(50) NOT NULL,
          data_id VARCHAR(255) NOT NULL,
          action ENUM('create', 'update', 'delete') NOT NULL,
          old_value JSON,
          new_value JSON,
          changed_by INT NOT NULL,
          change_reason VARCHAR(500),
          version INT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_data_type_id (data_type, data_id),
          INDEX idx_changed_by (changed_by),
          INDEX idx_created_at (created_at),
          FOREIGN KEY (changed_by) REFERENCES users(id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);

      // 数据锁表（悲观锁）
      await connection.execute(`
        CREATE TABLE IF NOT EXISTS data_locks (
          id INT PRIMARY KEY AUTO_INCREMENT,
          data_type VARCHAR(50) NOT NULL,
          data_id VARCHAR(255) NOT NULL,
          locked_by INT NOT NULL,
          locked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          expires_at TIMESTAMP NOT NULL,
          lock_reason VARCHAR(255),
          UNIQUE KEY uk_data_type_id (data_type, data_id),
          INDEX idx_expires (expires_at),
          INDEX idx_locked_by (locked_by),
          FOREIGN KEY (locked_by) REFERENCES users(id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);

      // 在线用户表（会话管理辅助）- 支持用户多设备同时在线
      await connection.execute(`
        CREATE TABLE IF NOT EXISTS online_users (
          session_id VARCHAR(255) PRIMARY KEY,
          user_id INT NOT NULL,
          username VARCHAR(100) NOT NULL,
          device_info TEXT,
          ip_address VARCHAR(50),
          last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_user_id (user_id),
          INDEX idx_last_seen (last_seen),
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);

      // 迁移旧的 online_users 表结构（如果存在旧结构）
      try {
        // 检查是否需要迁移（旧表使用 user_id 作为主键）
        const [columns] = await connection.query(`
          SELECT COLUMN_NAME
          FROM INFORMATION_SCHEMA.COLUMNS
          WHERE TABLE_SCHEMA = 'task_manager'
          AND TABLE_NAME = 'online_users'
          AND COLUMN_KEY = 'PRI'
        `) as any[];

        const hasOldStructure = columns.some((col: any) => col.COLUMN_NAME === 'user_id');

        if (hasOldStructure) {
          console.log('[Database] 检测到旧的 online_users 表结构，正在迁移...');

          // 删除旧表并重新创建（因为主键变更无法直接 ALTER）
          await connection.query('DROP TABLE online_users');

          // 重新创建新表
          await connection.execute(`
            CREATE TABLE online_users (
              session_id VARCHAR(255) PRIMARY KEY,
              user_id INT NOT NULL,
              username VARCHAR(100) NOT NULL,
              device_info TEXT,
              ip_address VARCHAR(50),
              last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
              INDEX idx_user_id (user_id),
              INDEX idx_last_seen (last_seen),
              FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
          `);

          console.log('[Database] online_users 表迁移完成，现在支持用户多设备同时在线');
        }
      } catch (e) {
        // 忽略迁移错误，表可能已经是新结构
      }

      // 为projects表添加version字段（如果不存在）
      try {
        await connection.execute(`
          ALTER TABLE projects
          ADD COLUMN IF NOT EXISTS version INT DEFAULT 1 AFTER progress
        `);
      } catch (e) {
        // 字段可能已存在，忽略错误
      }

      // 创建索引（忽略重复键错误）
      const indexes = [
        'CREATE INDEX idx_sessions_user_id ON sessions(user_id)',
        'CREATE INDEX idx_sessions_session_id ON sessions(session_id)',
        'CREATE INDEX idx_sessions_expires_at ON sessions(expires_at)',  // 新增：过期时间索引，提升清理性能
        'CREATE INDEX idx_sessions_user_status ON sessions(user_id, status)',  // 新增：登录性能优化，快速查询用户活动会话
        'CREATE INDEX idx_sessions_created_at ON sessions(created_at)',  // 新增：按创建时间排序优化
        'CREATE INDEX idx_projects_status ON projects(status)',
        'CREATE INDEX idx_projects_created_by ON projects(created_by)',
        'CREATE INDEX idx_projects_type_status ON projects(project_type, status)', // 新增：复合索引优化
        'CREATE INDEX idx_milestones_project_id ON milestones(project_id)',
        'CREATE INDEX idx_project_members_project_id ON project_members(project_id)',
        'CREATE INDEX idx_project_members_user_id ON project_members(user_id)',
        'CREATE INDEX idx_user_configs_user_id ON user_configs(user_id)',
        'CREATE INDEX idx_data_changes_entity ON data_changes(entity_type, entity_id)',
        'CREATE INDEX idx_data_changes_created_at ON data_changes(created_at)',
        // 新业务表索引
        'CREATE INDEX idx_members_department ON members(department)',
        'CREATE INDEX idx_members_status ON members(status)',
        'CREATE INDEX idx_members_employee_id ON members(employee_id)',
        'CREATE INDEX idx_members_dept_status ON members(department, status)', // 新增：复合索引优化
        'CREATE INDEX idx_wbs_tasks_project_status ON wbs_tasks(project_id, status)',
        'CREATE INDEX idx_wbs_tasks_assignee ON wbs_tasks(assignee_id)',
        'CREATE INDEX idx_wbs_tasks_parent ON wbs_tasks(parent_id)',
        'CREATE INDEX idx_wbs_tasks_planned_dates ON wbs_tasks(planned_start_date, planned_end_date)',
        'CREATE INDEX idx_wbs_tasks_project_priority ON wbs_tasks(project_id, priority)', // 新增：复合索引优化
        'CREATE INDEX idx_wbs_tasks_status_dates ON wbs_tasks(status, planned_end_date)', // 新增：用于查询即将到期的任务
        'CREATE INDEX idx_task_assignments_task_active ON task_assignments(task_id, status)',
        'CREATE INDEX idx_task_assignments_assignee_active ON task_assignments(assignee_id, status)',
        // 全局数据表索引优化
        'CREATE INDEX idx_global_data_type_id ON global_data(data_type, data_id)', // 新增：复合索引优化
        'CREATE INDEX idx_global_data_updated ON global_data(updated_at)', // 新增：时间索引
        // 数据变更日志索引优化
        'CREATE INDEX idx_data_change_log_type_id ON data_change_log(data_type, data_id)', // 新增：复合索引优化
        'CREATE INDEX idx_data_change_log_changed_by ON data_change_log(changed_by)', // 新增：用户索引
      ];

      for (const indexSql of indexes) {
        try {
          await connection.execute(indexSql);
        } catch (error: any) {
          // 忽略重复键错误和死锁错误
          if (error.code !== 'ER_DUP_KEYNAME' && error.code !== 'ER_LOCK_DEADLOCK') {
            throw error;
          }
        }
      }

      // 插入默认管理员用户（密码: admin123）
      await connection.execute(
        "INSERT IGNORE INTO users (username, password, role, name) VALUES ('admin', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'admin', '系统管理员')"
      );

      // 插入默认测试数据（仅在开发环境）
      if (process.env.NODE_ENV !== 'production') {
        // 默认成员
        const defaultMembers = [
          { employee_id: 'E001', name: '张三', department: '技术部', position: '高级工程师' },
          { employee_id: 'E002', name: '李四', department: '技术部', position: '工程师' },
          { employee_id: 'E003', name: '王五', department: '产品部', position: '产品经理' },
          { employee_id: 'E004', name: '赵六', department: '设计部', position: 'UI设计师' }
        ];

        for (const member of defaultMembers) {
          await connection.execute(
            `INSERT IGNORE INTO members (employee_id, name, department, position, skills, capabilities, status)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [member.employee_id, member.name, member.department, member.position,
             JSON.stringify([]), JSON.stringify({}), 'active']
          );
        }

        // 默认节假日（2026年）
        const defaultHolidays = [
          { date: '2026-01-01', name: '元旦' },
          { date: '2026-01-28', name: '春节' },
          { date: '2026-01-29', name: '春节' },
          { date: '2026-01-30', name: '春节' },
          { date: '2026-01-31', name: '春节' },
          { date: '2026-02-01', name: '春节' },
          { date: '2026-02-02', name: '春节' },
          { date: '2026-02-03', name: '春节' },
          { date: '2026-04-04', name: '清明节' },
          { date: '2026-05-01', name: '劳动节' },
          { date: '2026-05-02', name: '劳动节' },
          { date: '2026-05-03', name: '劳动节' },
          { date: '2026-06-01', name: '端午节' },
          { date: '2026-09-19', name: '中秋节' },
          { date: '2026-10-01', name: '国庆节' },
          { date: '2026-10-02', name: '国庆节' },
          { date: '2026-10-03', name: '国庆节' },
          { date: '2026-10-04', name: '国庆节' },
          { date: '2026-10-05', name: '国庆节' },
          { date: '2026-10-06', name: '国庆节' },
          { date: '2026-10-07', name: '国庆节' }
        ];

        for (const holiday of defaultHolidays) {
          const date = new Date(holiday.date);
          await connection.execute(
            `INSERT IGNORE INTO holidays (holiday_date, name, is_workday, year)
             VALUES (?, ?, ?, ?)`,
            [holiday.date, holiday.name, 0, date.getFullYear()]
          );
        }
      }

      connection.release();
      console.log('[Database] 表结构初始化成功');
    } catch (error) {
      console.error('[Database] 初始化表结构失败:', error);
      throw error;
    }
  }

  async query(sql: string, values?: any[]): Promise<any> {
    const startTime = Date.now();
    const connection = await this.pool!.getConnection();

    try {
      const [rows, fields] = await connection.execute(sql, values);
      const duration = Date.now() - startTime;

      // 记录SQL查询日志（跳过数据库写入，避免循环依赖）
      if (this.logQueries) {
        const sanitizedSql = this.sanitizeSql(sql);
        const operation = this.getOperationType(sql);

        // 使用 skipDatabase: true 避免循环依赖
        void systemLogger.log({
          level: 'INFO',
          type: 'DATA_SYNC',
          message: `数据库操作: ${operation}`,
          details: {
            sql: sanitizedSql,
            params: values,
            duration: `${duration}ms`,
            affectedRows: (rows as any).affectedRows || (rows as any).length || 0
          },
          skipDatabase: true // 关键：不写入数据库，避免循环调用
        });
      }

      return rows as any;
    } catch (error: any) {
      const duration = Date.now() - startTime;

      // 记录SQL错误日志（跳过数据库写入，避免循环依赖）
      void systemLogger.log({
        level: 'ERROR',
        type: 'DATA_SYNC',
        message: `数据库操作失败: ${error.code || 'UNKNOWN'}`,
        details: {
          sql: this.sanitizeSql(sql),
          params: values,
          error: error.message,
          duration: `${duration}ms`
        },
        skipDatabase: true // 关键：不写入数据库，避免循环调用
      });

      throw error;
    } finally {
      connection.release();
    }
  }

  async getConnection() {
    const connection = await this.pool!.getConnection();

    // 包装连接对象以记录操作
    const originalExecute = connection.execute.bind(connection);
    const originalQuery = connection.query.bind(connection);

    (connection as any).execute = async (sql: string, values?: any[]) => {
      const startTime = Date.now();
      try {
        const result = await originalExecute(sql, values);
        const duration = Date.now() - startTime;

        if (this.logQueries) {
          const operation = this.getOperationType(sql);
          void systemLogger.log({
            level: 'INFO',
            type: 'DATA_SYNC',
            message: `数据库操作: ${operation}`,
            details: {
              sql: this.sanitizeSql(sql),
              params: values,
              duration: `${duration}ms`,
              affectedRows: (result[0] as any).affectedRows || (result[0] as any).length || 0
            },
            skipDatabase: true // 关键：不写入数据库，避免循环调用
          });
        }

        return result;
      } catch (error: any) {
        const duration = Date.now() - startTime;
        void systemLogger.log({
          level: 'ERROR',
          type: 'DATA_SYNC',
          message: `数据库操作失败: ${error.code || 'UNKNOWN'}`,
          details: {
            sql: this.sanitizeSql(sql),
            params: values,
            error: error.message,
            duration: `${duration}ms`
          },
          skipDatabase: true // 关键：不写入数据库，避免循环调用
        });
        throw error;
      }
    };

    (connection as any).query = async (sql: string, values?: any[]) => {
      const startTime = Date.now();
      try {
        const result = await originalQuery(sql, values);
        const duration = Date.now() - startTime;

        if (this.logQueries) {
          const operation = this.getOperationType(sql);
          void systemLogger.log({
            level: 'INFO',
            type: 'DATA_SYNC',
            message: `数据库操作: ${operation}`,
            details: {
              sql: this.sanitizeSql(sql),
              params: values,
              duration: `${duration}ms`
            },
            skipDatabase: true // 关键：不写入数据库，避免循环调用
          });
        }

        return result;
      } catch (error: any) {
        const duration = Date.now() - startTime;
        void systemLogger.log({
          level: 'ERROR',
          type: 'DATA_SYNC',
          message: `数据库操作失败: ${error.code || 'UNKNOWN'}`,
          details: {
            sql: this.sanitizeSql(sql),
            params: values,
            error: error.message,
            duration: `${duration}ms`
          },
          skipDatabase: true // 关键：不写入数据库，避免循环调用
        });
        throw error;
      }
    };

    return connection;
  }

  /**
   * 使用连接执行回调函数，确保连接在任何情况下都会被释放
   * 这是一个安全的辅助方法，防止连接泄漏
   * @param callback 回调函数，接收连接对象作为参数
   * @returns 回调函数的返回值
   */
  async withConnection<T>(callback: (conn: any) => Promise<T>): Promise<T> {
    const connection = await this.getConnection();
    try {
      return await callback(connection);
    } finally {
      // 确保连接在任何情况下都会被释放
      connection.release();
    }
  }

  /**
   * 获取SQL操作类型
   */
  private getOperationType(sql: string): string {
    const trimmedSql = sql.trim().toUpperCase();
    if (trimmedSql.startsWith('SELECT')) return '查询';
    if (trimmedSql.startsWith('INSERT')) return '插入';
    if (trimmedSql.startsWith('UPDATE')) return '更新';
    if (trimmedSql.startsWith('DELETE')) return '删除';
    if (trimmedSql.startsWith('CREATE')) return '创建表';
    if (trimmedSql.startsWith('ALTER')) return '修改表';
    if (trimmedSql.startsWith('DROP')) return '删除表';
    return '其他操作';
  }

  /**
   * 清理SQL语句（移除敏感信息和过长的部分）
   */
  private sanitizeSql(sql: string): string {
    let sanitized = sql.trim();
    // 限制SQL长度
    if (sanitized.length > 500) {
      sanitized = sanitized.substring(0, 500) + '...';
    }
    return sanitized;
  }

  /**
   * 执行事务（改进的错误处理）
   * @param callback 事务回调函数
   * @returns 事务执行结果
   */
  async transaction<T>(callback: (connection: mysql.PoolConnection) => Promise<T>): Promise<T> {
    const connection = await this.pool!.getConnection();
    let transactionBegan = false;

    try {
      await connection.beginTransaction();
      transactionBegan = true;

      const result = await callback(connection);

      await connection.commit();
      transactionBegan = false;

      return result;
    } catch (error: any) {
      // 尝试回滚，即使回滚失败也要继续
      if (transactionBegan) {
        try {
          await connection.rollback();
          console.error('[Database] 事务已回滚:', error.message);
        } catch (rollbackError) {
          // 回滚失败 - 连接可能已损坏
          console.error('[Database] 回滚失败，连接可能已损坏:', rollbackError);

          // 尝试销毁损坏的连接
          try {
            connection.destroy();
          } catch (e) {
            // 忽略销毁错误
          }

          // 重新抛出原始错误
          throw new Error(`事务失败且回滚失败: ${error.message}`);
        }
      }

      throw error;
    } finally {
      // 只有在事务未开始或已提交/回滚时才释放连接
      // 如果连接已销毁（destroy），release会报错，所以需要检查
      try {
        if (connection && connection.connection) {
          connection.release();
        }
      } catch (releaseError) {
        console.warn('[Database] 连接释放警告:', releaseError);
      }
    }
  }

  /**
   * 检查数据版本（乐观锁）
   * @param entityType 实体类型
   * @param entityId 实体ID
   * @param expectedVersion 期望版本号
   * @returns 是否版本匹配
   */
  async checkVersion(entityType: string, entityId: number, expectedVersion: number): Promise<boolean> {
    const tableName = this.getEntityTableName(entityType);
    const rows = await this.query(`SELECT version FROM ${tableName} WHERE id = ?`, [entityId]) as any[];
    if (!rows || rows.length === 0) {
      return false;
    }
    return rows[0].version === expectedVersion;
  }

  /**
   * 增加版本号
   * @param entityType 实体类型
   * @param entityId 实体ID
   */
  async incrementVersion(entityType: string, entityId: number): Promise<number> {
    const tableName = this.getEntityTableName(entityType);
    const result = await this.query(`UPDATE ${tableName} SET version = version + 1 WHERE id = ?`, [entityId]);
    const rows = await this.query(`SELECT version FROM ${tableName} WHERE id = ?`, [entityId]) as any[];
    return rows.length > 0 ? rows[0].version : 1;
  }

  /**
   * 记录数据版本历史
   * @param entityType 实体类型
   * @param entityId 实体ID
   * @param version 版本号
   * @param changedBy 修改人ID
   * @param changeType 变更类型
   * @param changeData 变更数据
   * @param changeReason 变更原因
   */
  async recordVersion(
    entityType: string,
    entityId: number,
    version: number,
    changedBy: number,
    changeType: 'create' | 'update' | 'delete',
    changeData?: any,
    changeReason?: string
  ): Promise<void> {
    await this.query(
      `INSERT INTO data_versions (entity_type, entity_id, version, changed_by, change_type, change_data, change_reason)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [entityType, entityId, version, changedBy, changeType, changeData ? JSON.stringify(changeData) : null, changeReason]
    );
  }

  /**
   * 获取实体版本历史
   * @param entityType 实体类型
   * @param entityId 实体ID
   * @param limit 返回条数
   */
  async getVersionHistory(entityType: string, entityId: number, limit: number = 10): Promise<any[]> {
    const rows = await this.query(
      `SELECT dv.*, u.name as changed_by_name
       FROM data_versions dv
       LEFT JOIN users u ON dv.changed_by = u.id
       WHERE dv.entity_type = ? AND dv.entity_id = ?
       ORDER BY dv.created_at DESC
       LIMIT ?`,
      [entityType, entityId, limit]
    );
    return rows;
  }

  /**
   * 获取实体对应的表名
   */
  private getEntityTableName(entityType: string): string {
    const tableMap: Record<string, string> = {
      'project': 'projects',
      'member': 'members',
      'task': 'wbs_tasks',
      'wbs_task': 'wbs_tasks'
    };
    return tableMap[entityType] || entityType + 's';
  }

  async close() {
    // 清理监控定时器
    if (this.poolMonitorInterval) {
      clearInterval(this.poolMonitorInterval);
      this.poolMonitorInterval = null;
    }

    if (this.pool) {
      await this.pool.end();
      console.log('[Database] 连接已关闭');
    }
  }

  /**
   * 启动连接池监控
   * 定期检查连接池状态，在连接使用率过高时发出警告
   */
  private startPoolMonitoring() {
    // 每30秒检查一次连接池状态
    this.poolMonitorInterval = setInterval(async () => {
      if (!this.pool) return;

      try {
        const pool = this.pool.pool;
        const totalConnections = pool.connectionLimit || 0;
        const allConnections = pool._allConnections?.length || 0;
        const freeConnections = pool._freeConnections?.length || 0;
        const queuedRequests = pool._connectionQueue?.length || 0;

        const activeConnections = allConnections - freeConnections;
        const usageRate = totalConnections > 0 ? ((activeConnections / totalConnections) * 100).toFixed(1) : '0';

        // 记录连接池状态（更详细）
        console.log(`[Database][连接池监控] 总数:${totalConnections} | 活跃:${activeConnections} | 空闲:${freeConnections} | 队列:${queuedRequests} | 使用率:${usageRate}%`);

        // 分级告警机制
        if (parseFloat(usageRate) > 90) {
          console.error(`[Database][严重警告] 连接池接近满载: ${usageRate}%`, {
            total: totalConnections,
            active: activeConnections,
            free: freeConnections,
            queued: queuedRequests,
            recommendation: '建议增加 connectionLimit 或优化查询'
          });
        } else if (parseFloat(usageRate) > 80) {
          console.warn(`[Database][警告] 连接池使用率过高: ${usageRate}%`, {
            total: totalConnections,
            active: activeConnections,
            free: freeConnections,
            queued: queuedRequests,
            recommendation: '建议监控数据库负载'
          });
        }

        // 队列积压告警（按严重程度）
        if (queuedRequests > 20) {
          console.error(`[Database][严重警告] 连接池队列严重积压: ${queuedRequests} 个请求等待`, {
            queuedRequests,
            recommendation: '立即检查是否有慢查询或连接泄漏'
          });
        } else if (queuedRequests > 10) {
          console.warn(`[Database][警告] 连接池队列积压: ${queuedRequests} 个请求等待中`);
        }

        // 记录到系统日志（便于后续分析）
        if (parseFloat(usageRate) > 50 || queuedRequests > 5) {
          try {
            await systemLogger.logSystem(
              'database_pool_warning',
              'system',
              0,
              `连接池状态: 使用率${usageRate}%, 队列${queuedRequests}`,
              {
                total: totalConnections,
                active: activeConnections,
                free: freeConnections,
                queued: queuedRequests
              }
            );
          } catch (error) {
            // 忽略日志记录失败，避免循环错误
          }
        }
      } catch (error) {
        console.error('[Database][连接池监控] 检查失败:', error);
      }
    }, 30000); // 30秒检查一次

    console.log('[Database] 连接池监控已启动（检查间隔: 30秒）');
  }

  /**
   * 获取连接池状态信息
   */
  getPoolStatus(): { total: number; active: number; free: number; queued: number; usageRate: string } {
    if (!this.pool) {
      return { total: 0, active: 0, free: 0, queued: 0, usageRate: '0' };
    }

    try {
      const pool = this.pool.pool;
      const totalConnections = pool.connectionLimit || 0;
      const allConnections = pool._allConnections?.length || 0;
      const freeConnections = pool._freeConnections?.length || 0;
      const queuedRequests = pool._connectionQueue?.length || 0;
      const activeConnections = allConnections - freeConnections;
      const usageRate = totalConnections > 0 ? ((activeConnections / totalConnections) * 100).toFixed(1) : '0';

      return {
        total: totalConnections,
        active: activeConnections,
        free: freeConnections,
        queued: queuedRequests,
        usageRate
      };
    } catch (error) {
      console.error('[Database] 获取连接池状态失败:', error);
      return { total: 0, active: 0, free: 0, queued: 0, usageRate: '0' };
    }
  }
}

export const databaseService = new DatabaseService();
export default databaseService;
