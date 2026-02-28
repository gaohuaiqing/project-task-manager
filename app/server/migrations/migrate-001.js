/**
 * 数据库迁移脚本 - 实时同步架构
 * 运行方式: node migrations/migrate-001.js
 */

import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ES模块中获取 __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_CONFIG = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'task_manager',
  multipleStatements: true
};

async function runMigration() {
  let connection;

  try {
    console.log('[Migration] 开始连接数据库...');
    connection = await mysql.createConnection(DB_CONFIG);
    console.log('[Migration] 数据库连接成功');

    // 读取迁移脚本
    const migrationPath = path.join(__dirname, '001-real-time-sync-architecture.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log('[Migration] 执行迁移脚本...');
    await connection.query(sql);

    console.log('[Migration] ✅ 迁移成功完成！');

    // 验证表是否创建成功
    const [tables] = await connection.query("SHOW TABLES LIKE 'real_time_%'");
    console.log('[Migration] 创建的实时同步相关表:', tables);

  } catch (error) {
    console.error('[Migration] ❌ 迁移失败:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// 运行迁移
runMigration();
