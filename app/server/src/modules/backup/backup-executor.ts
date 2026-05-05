// app/server/src/modules/backup/backup-executor.ts
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import { getPool } from '../../core/db';
import { logger } from '../../core/logger';
import type { RowDataPacket } from 'mysql2/promise';
import type {
  BackupConfig,
  BackupResult,
  RestoreResult,
  DataSnapshot,
} from './types';
import { BACKUP_TABLES } from './types';

const execAsync = promisify(exec);

/** 生成基于时间戳的备份文件名（年月日时分秒） */
function generateTimestampFileName(extension: string): string {
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  const ts = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  return `backup_${ts}.${extension}`;
}

/**
 * 验证表名是否在白名单中
 * 防止 SQL 注入攻击
 */
function isValidTableName(table: string): boolean {
  return BACKUP_TABLES.includes(table);
}

/**
 * 安全执行 SQL 查询（带表名验证）
 */
function sanitizeTableName(table: string): string {
  if (!isValidTableName(table)) {
    throw new Error(`Invalid table name: ${table}`);
  }
  // 返回安全的表名（已通过白名单验证）
  return table;
}

/**
 * 备份执行器
 * 负责：
 * 1. SQL 备份（使用 mysqldump）
 * 2. Excel 备份（使用自定义导出）
 * 3. 数据恢复
 * 4. 旧备份清理
 */
export class BackupExecutor {
  private dbConfig: {
    host: string;
    port: number;
    user: string;
    password: string;
    database: string;
  };

  constructor() {
    this.dbConfig = {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'task_manager',
    };
  }

  /**
   * 创建 SQL 备份
   * 使用 mysqldump 导出数据库
   */
  async createSqlBackup(targetPath: string, recordId: string): Promise<{ filePath: string; size: number }> {
    const fileName = generateTimestampFileName('sql');
    const filePath = path.join(targetPath, fileName);

    // 确保目标目录存在
    await this.ensureDirectory(targetPath);

    // 构建 mysqldump 命令
    // 仅备份核心业务表，排除日志表
    const tables = BACKUP_TABLES.join(' ');
    // 使用 MYSQL_PWD 环境变量传递密码，避免在命令行中暴露
    const command = `mysqldump --host=${this.dbConfig.host} --port=${this.dbConfig.port} \
      --user=${this.dbConfig.user} \
      --single-transaction --routines --triggers \
      ${this.dbConfig.database} ${tables} > "${filePath}"`;

    try {
      await execAsync(command, {
        maxBuffer: 50 * 1024 * 1024, // 50MB buffer
        env: {
          ...process.env,
          MYSQL_PWD: this.dbConfig.password,
        },
      });

      // 获取文件大小
      const stats = await fs.stat(filePath);
      logger.info(`[BackupExecutor] SQL backup created: ${filePath}, size: ${stats.size}`);

      return { filePath, size: stats.size };
    } catch (error) {
      logger.error('[BackupExecutor] SQL backup failed:', error);
      // 如果 mysqldump 不可用，使用备选方案：逐表导出 SQL
      return this.createSqlBackupFallback(targetPath, recordId);
    }
  }

  /**
   * SQL 备份备选方案
   * 当 mysqldump 不可用时，使用数据库连接逐表导出
   */
  private async createSqlBackupFallback(targetPath: string, recordId: string): Promise<{ filePath: string; size: number }> {
    const fileName = generateTimestampFileName('sql');
    const filePath = path.join(targetPath, fileName);
    const pool = getPool();

    let sqlContent = '-- 数据备份 SQL 文件\n';
    sqlContent += `-- 生成时间: ${new Date().toISOString()}\n`;
    sqlContent += `-- 备份 ID: ${recordId}\n\n`;

    try {
      for (const rawTable of BACKUP_TABLES) {
        try {
          const table = sanitizeTableName(rawTable);
          // 获取表结构（表名已通过白名单验证，直接拼接是安全的）
          const [createRows] = await pool.execute<RowDataPacket[]>(
            `SHOW CREATE TABLE ${table}`
          );
          sqlContent += `DROP TABLE IF EXISTS ${table};\n`;
          sqlContent += `${createRows[0]['Create Table']};\n\n`;

          // 获取列类型信息，识别JSON类型列
          const [columnRows] = await pool.execute<RowDataPacket[]>(
            `SHOW COLUMNS FROM ${table}`
          );
          const jsonColumns: Set<string> = new Set();
          for (const col of columnRows) {
            // MySQL JSON类型显示为 'json' 或 'longblob' 等
            if (col.Type && col.Type.toLowerCase() === 'json') {
              jsonColumns.add(col.Field);
            }
          }

          // 获取表数据（表名已通过白名单验证）
          const [dataRows] = await pool.execute<RowDataPacket[]>(
            `SELECT * FROM ${table}`
          );

          if (dataRows.length > 0) {
            // 生成 INSERT 语句
            const columns = Object.keys(dataRows[0]).join(', ');
            for (const row of dataRows) {
              const values = Object.entries(row).map(([colName, v]) => {
                if (v === null) return 'NULL';
                if (v instanceof Date) return `'${v.toISOString().slice(0, 19).replace('T', ' ')}'`;
                if (Buffer.isBuffer(v)) return `X'${v.toString('hex')}'`;
                if (typeof v === 'bigint') return String(v);
                if (typeof v === 'boolean') return v ? '1' : '0';
                if (typeof v === 'number') return String(v);
                if (typeof v === 'string') {
                  // JSON类型列特殊处理
                  if (jsonColumns.has(colName)) {
                    return this.formatJsonValue(v);
                  }
                  // 普通字符串列
                  return `'${v.replace(/'/g, "''")}'`;
                }
                // 处理MySQL JSON类型返回的对象/数组（非string原始值）
                if (jsonColumns.has(colName) && (typeof v === 'object')) {
                  return `'${JSON.stringify(v).replace(/'/g, "''")}'`;
                }
                // 其他类型转为字符串
                return `'${String(v).replace(/'/g, "''")}'`;
              }).join(', ');
              // 表名已通过白名单验证，可以安全拼接
              sqlContent += `INSERT INTO ${table} (${columns}) VALUES (${values});\n`;
            }
            sqlContent += '\n';
          }
        } catch (tableError) {
          logger.warn(`[BackupExecutor] Skipping table ${rawTable}:`, tableError);
        }
      }

      await fs.writeFile(filePath, sqlContent, 'utf8');
      const stats = await fs.stat(filePath);
      logger.info(`[BackupExecutor] SQL backup (fallback) created: ${filePath}, size: ${stats.size}`);

      return { filePath, size: stats.size };
    } catch (error) {
      logger.error('[BackupExecutor] SQL backup fallback failed:', error);
      throw new Error(`SQL backup failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 创建 Excel 备份
   * 使用 ExcelJS 导出数据（需安装 exceljs）
   * TODO: 安装 exceljs 后启用此功能
   */
  async createExcelBackup(targetPath: string, recordId: string): Promise<{ filePath: string; size: number }> {
    const fileName = generateTimestampFileName('xlsx');
    const filePath = path.join(targetPath, fileName);

    // 确保目标目录存在
    await this.ensureDirectory(targetPath);

    // 动态导入 exceljs（兼容ESM和CommonJS导出）
    try {
      const exceljsModule = await import('exceljs');
      // ESM模块中 exceljs 导出为 { default: { Workbook } }
      // CommonJS模块中导出为 { Workbook }
      const ExcelJS = exceljsModule.default || exceljsModule;
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'Task Manager Backup System';
      workbook.created = new Date();

      const pool = getPool();

      for (const rawTable of BACKUP_TABLES) {
        try {
          const table = sanitizeTableName(rawTable);
          // pool.execute 不支持 ?? 标识符占位符，改用 pool.query
          const [rows] = await pool.query<RowDataPacket[]>(
            `SELECT * FROM ?? LIMIT 10000`,
            [table]
          );

          if (rows.length === 0) continue;

          const worksheet = workbook.addWorksheet(table);
          const columns = Object.keys(rows[0]);

          // 添加表头
          worksheet.columns = columns.map(col => ({
            header: col,
            key: col,
            width: 20,
          }));

          // 添加数据行（将特殊类型转换为字符串）
          const plainRows = rows.map(row => {
            const obj: Record<string, unknown> = {};
            for (const col of columns) {
              const val = row[col];
              // 处理特殊类型：Date、Buffer、BigInt 等
              if (val instanceof Date) {
                obj[col] = val.toISOString();
              } else if (Buffer.isBuffer(val)) {
                obj[col] = val.toString('hex');
              } else if (typeof val === 'bigint') {
                obj[col] = val.toString();
              } else {
                obj[col] = val;
              }
            }
            return obj;
          });
          worksheet.addRows(plainRows);

          logger.info(`[BackupExecutor] Excel sheet added: ${table} (${rows.length} rows)`);
        } catch (tableError) {
          logger.warn(`[BackupExecutor] Skipping Excel sheet ${rawTable}:`, tableError);
        }
      }

      await workbook.xlsx.writeFile(filePath);
      const stats = await fs.stat(filePath);
      logger.info(`[BackupExecutor] Excel backup created: ${filePath}, size: ${stats.size}`);

      return { filePath, size: stats.size };
    } catch (importError) {
      // exceljs 未安装，跳过 Excel 备份
      logger.warn('[BackupExecutor] exceljs not installed, skipping Excel backup');
      // 创建空的占位文件表示跳过
      await fs.writeFile(filePath, 'Excel backup skipped: exceljs not installed\n', 'utf8');
      const stats = await fs.stat(filePath);
      return { filePath, size: stats.size };
    }
  }

  /**
   * 执行完整备份流程
   */
  async executeFullBackup(
    config: BackupConfig,
    recordId: string,
    dataSnapshot?: DataSnapshot
  ): Promise<BackupResult> {
    const targetPath = config.target_path;
    let totalSize = 0;
    const result: BackupResult = {
      record_id: recordId,
      total_size_bytes: 0,
      status: 'success',
    };

    try {
      // SQL 备份
      if (config.backup_format === 'sql' || config.backup_format === 'both') {
        const sqlResult = await this.createSqlBackup(targetPath, recordId);
        result.sql_file_path = sqlResult.filePath;
        totalSize += sqlResult.size;
      }

      // Excel 备份
      if (config.backup_format === 'excel' || config.backup_format === 'both') {
        const excelResult = await this.createExcelBackup(targetPath, recordId);
        result.excel_file_path = excelResult.filePath;
        totalSize += excelResult.size;
      }

      result.total_size_bytes = totalSize;
      logger.info(`[BackupExecutor] Full backup completed, total size: ${totalSize} bytes`);

      return result;
    } catch (error) {
      result.status = 'failed';
      result.error_message = error instanceof Error ? error.message : String(error);
      logger.error('[BackupExecutor] Full backup failed:', error);
      return result;
    }
  }

  /**
   * 从 SQL 文件恢复数据
   * 注意：恢复前需要关闭外键检查，恢复后重新启用
   */
  async restoreFromSql(filePath: string): Promise<RestoreResult> {
    const pool = getPool();
    const result: RestoreResult = {
      success: false,
      restored_tables: [],
    };

    try {
      // 读取 SQL 文件内容
      const sqlContent = await fs.readFile(filePath, 'utf8');

      // 关闭外键检查（恢复期间）
      await pool.execute('SET FOREIGN_KEY_CHECKS = 0');

      // 按分号分割SQL片段，然后从每个片段中提取非注释的有效语句
      const fragments = sqlContent.split(';');
      const statements: string[] = [];

      for (const fragment of fragments) {
        // 从片段中移除注释行（以 -- 开头的行）
        const lines = fragment.split('\n');
        const codeLines = lines.filter(line => {
          const trimmed = line.trim();
          return trimmed.length > 0 && !trimmed.startsWith('--');
        });
        const cleanStatement = codeLines.join('\n').trim();
        if (cleanStatement) {
          statements.push(cleanStatement);
        }
      }

      logger.info(`[BackupExecutor] Found ${statements.length} SQL statements to execute`);

      // 执行恢复（逐条执行）
      for (const statement of statements) {
        try {
          // 使用 pool.query 更宽松的执行方式
          await pool.query(statement);

          // 提取表名
          const tableMatch = statement.match(/(?:INSERT INTO|CREATE TABLE|DROP TABLE IF EXISTS)\s+`?(\w+)`?/i);
          if (tableMatch && !result.restored_tables.includes(tableMatch[1])) {
            result.restored_tables.push(tableMatch[1]);
          }
        } catch (execError) {
          // 记录错误但继续执行
          logger.warn(`[BackupExecutor] Statement execution warning:`, execError);
        }
      }

      // 重新启用外键检查
      await pool.execute('SET FOREIGN_KEY_CHECKS = 1');

      result.success = true;
      logger.info(`[BackupExecutor] Restore completed, tables: ${result.restored_tables.join(', ')}`);

      return result;
    } catch (error) {
      // 确保重新启用外键检查
      try {
        await pool.execute('SET FOREIGN_KEY_CHECKS = 1');
      } catch {}
      result.error_message = error instanceof Error ? error.message : String(error);
      logger.error('[BackupExecutor] Restore failed:', error);
      return result;
    }
  }

  /**
   * 清理旧备份文件
   * @param filePaths 需要删除的文件路径列表
   */
  async cleanupOldBackups(filePaths: string[]): Promise<number> {
    let deletedCount = 0;

    for (const filePath of filePaths) {
      try {
        await fs.unlink(filePath);
        deletedCount++;
        logger.info(`[BackupExecutor] Deleted: ${filePath}`);
      } catch {
        // 文件不存在，忽略
      }
    }

    logger.info(`[BackupExecutor] Cleanup completed, deleted ${deletedCount} files`);
    return deletedCount;
  }

  /**
   * 格式化JSON类型列的值为有效的MySQL JSON字面量
   * 处理两种场景：
   * 1. MySQL2驱动返回字符串格式的JSON值
   * 2. MySQL2驱动直接解析为JS对象/数组的JSON值
   */
  private formatJsonValue(v: string): string {
    try {
      const parsed = JSON.parse(v);
      // 解析成功，输出标准JSON字符串
      return `'${JSON.stringify(parsed).replace(/'/g, "''")}'`;
    } catch {
      // 不是有效JSON，可能是逗号分隔字符串，转为JSON数组
      if (v.includes(',') && !v.startsWith('{') && !v.startsWith('[')) {
        const arr = v.split(',').map(s => s.trim());
        return `'${JSON.stringify(arr).replace(/'/g, "''")}'`;
      }
      // 其他情况，包装为JSON字符串
      return `'${JSON.stringify(v).replace(/'/g, "''")}'`;
    }
  }

  /**
   * 确保目录存在
   */
  private async ensureDirectory(dirPath: string): Promise<void> {
    try {
      await fs.access(dirPath);
    } catch {
      await fs.mkdir(dirPath, { recursive: true });
      logger.info(`[BackupExecutor] Created directory: ${dirPath}`);
    }
  }

  /**
   * 检查路径是否存在
   */
  async pathExists(targetPath: string): Promise<boolean> {
    try {
      await fs.access(targetPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 列出目录下的子目录
   */
  async listDirectories(targetPath: string): Promise<Array<{
    path: string;
    name: string;
    isWritable: boolean;
  }>> {
    try {
      const entries = await fs.readdir(targetPath, { withFileTypes: true });
      const directories: Array<{
        path: string;
        name: string;
        isWritable: boolean;
      }> = [];

      for (const entry of entries) {
        // 仅返回目录
        if (entry.isDirectory()) {
          const fullPath = path.join(targetPath, entry.name);
          // 检查是否可写
          const isWritable = await this.checkPathWritable(fullPath);
          directories.push({
            path: fullPath,
            name: entry.name,
            isWritable,
          });
        }
      }

      // 按名称排序
      directories.sort((a, b) => a.name.localeCompare(b.name));

      return directories;
    } catch (error) {
      logger.warn(`[BackupExecutor] Failed to list directories: ${targetPath}`, error);
      return [];
    }
  }

  /**
   * 检查目标路径是否可写
   */
  async checkPathWritable(targetPath: string): Promise<boolean> {
    try {
      await this.ensureDirectory(targetPath);
      const testFile = path.join(targetPath, '.write_test');
      await fs.writeFile(testFile, 'test');
      await fs.unlink(testFile);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 获取磁盘剩余空间（估算）
   */
  async getDiskSpace(targetPath: string): Promise<{ available: number; sufficient: boolean }> {
    try {
      // 使用 df 命令（Linux/Mac）或 dir 命令（Windows）
      const platform = process.platform;

      if (platform === 'win32') {
        // Windows: 使用 wmic 命令
        const { stdout } = await execAsync(
          `wmic logicaldisk where "DeviceID='${path.resolve(targetPath).charAt(0)}:'" get FreeSpace`
        );
        const freeSpace = parseInt(stdout.split('\n')[1].trim());
        return { available: freeSpace, sufficient: freeSpace > 100 * 1024 * 1024 }; // >100MB
      } else {
        // Linux/Mac: 使用 df 命令
        const { stdout } = await execAsync(`df -k "${targetPath}" | tail -1`);
        const parts = stdout.trim().split(/\s+/);
        const availableKB = parseInt(parts[3]);
        return { available: availableKB * 1024, sufficient: availableKB > 100 * 1024 };
      }
    } catch {
      // 无法检测时假设空间足够
      return { available: -1, sufficient: true };
    }
  }
}