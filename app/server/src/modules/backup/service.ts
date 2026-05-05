// app/server/src/modules/backup/service.ts
import * as path from 'path';
import * as fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import { encrypt, decrypt } from './crypto';
import { BackupRepository } from './repository';
import { BackupExecutor } from './backup-executor';
import { getPool } from '../../core/db';
import { logger } from '../../core/logger';
import { sendToUser } from '../../core/realtime';
import { ValidationError, ForbiddenError } from '../../core/errors';
import type { RowDataPacket } from 'mysql2/promise';
import type { User } from '../../core/types';
import type {
  BackupConfig,
  BackupRecord,
  UpdateBackupConfigDTO,
  BackupResult,
  RestoreResult,
  DownloadResult,
  PaginatedResult,
  BackupType,
  BackupFormat,
  DataSnapshot,
} from './types';

export class BackupService {
  private repo = new BackupRepository();
  private executor = new BackupExecutor();

  constructor() {
    // 初始化默认配置（如果不存在）
    this.initConfig();
  }

  private async initConfig(): Promise<void> {
    try {
      await this.repo.initDefaultConfig();
    } catch (error) {
      logger.warn('[BackupService] Failed to init default config:', error);
    }
  }

  // ========== 配置管理 ==========

  /**
   * 获取备份配置
   * 注意：远程密码字段不返回给客户端（安全考虑）
   */
  async getConfig(): Promise<BackupConfig | null> {
    const config = await this.repo.getConfig();
    if (config) {
      // 不返回加密密码字段，保护敏感信息
      config.remote_password_encrypted = null;
    }
    return config;
  }

  /**
   * 获取解密后的配置（仅用于内部备份执行）
   */
  async getConfigWithPassword(): Promise<BackupConfig | null> {
    const config = await this.repo.getConfig();
    if (config && config.remote_password_encrypted) {
      // 解密密码用于内部操作，不暴露给 API
      const decryptedPassword = decrypt(config.remote_password_encrypted);
      // 临时设置解密后的密码用于远程连接（不保存）
      (config as any).remote_password_decrypted = decryptedPassword;
    }
    return config;
  }

  /**
   * 更新备份配置
   */
  async updateConfig(data: UpdateBackupConfigDTO, currentUser: User): Promise<BackupConfig | null> {
    // 权限检查：仅 admin 可操作
    if (currentUser.role !== 'admin') {
      throw new ForbiddenError('仅管理员可修改备份配置');
    }

    // 验证目标路径
    if (data.target_path) {
      const writable = await this.executor.checkPathWritable(data.target_path);
      if (!writable) {
        throw new ValidationError('目标路径不可写或不存在');
      }
    }

    // 验证保留数量
    if (data.retention_count !== undefined && data.retention_count < 1) {
      throw new ValidationError('保留数量必须大于 0');
    }

    // 加密远程密码（如果提供）
    const encryptedData: UpdateBackupConfigDTO = { ...data };
    if (data.remote_password) {
      encryptedData.remote_password = encrypt(data.remote_password);
    }

    return this.repo.updateConfig(encryptedData);
  }

  // ========== 备份执行 ==========

  /**
   * 执行手动备份
   */
  async executeManualBackup(operatorId: number): Promise<BackupRecord> {
    // 检查是否有正在运行的备份
    const hasRunning = await this.repo.hasRunningBackup();
    if (hasRunning) {
      throw new ValidationError('已有备份正在执行，请等待完成');
    }

    // 获取配置
    const config = await this.getConfig();
    if (!config) {
      throw new ValidationError('备份配置不存在');
    }

    // 检查磁盘空间
    const { sufficient } = await this.executor.getDiskSpace(config.target_path);
    if (!sufficient) {
      throw new ValidationError('磁盘空间不足（需要至少 100MB）');
    }

    // 创建备份记录
    const recordId = uuidv4();
    await this.repo.createRecord({
      id: recordId,
      backup_type: 'manual',
      file_format: config.backup_format,
      operator_id: operatorId,
    });

    // 获取数据快照
    const dataSnapshot = await this.repo.getDataSnapshot();

    // 异步执行备份（不阻塞请求）
    this.executeBackupAsync(recordId, config, dataSnapshot, operatorId);

    // 返回初始记录
    const record = await this.repo.getRecordById(recordId);
    return record!;
  }

  /**
   * 执行定时自动备份
   */
  async executeScheduledBackup(): Promise<void> {
    // 检查是否有正在运行的备份
    const hasRunning = await this.repo.hasRunningBackup();
    if (hasRunning) {
      logger.warn('[BackupService] Scheduled backup skipped: another backup is running');
      return;
    }

    // 获取配置
    const config = await this.getConfig();
    if (!config || !config.enabled) {
      logger.info('[BackupService] Scheduled backup skipped: disabled or no config');
      return;
    }

    // 检查磁盘空间
    const { sufficient } = await this.executor.getDiskSpace(config.target_path);
    if (!sufficient) {
      logger.error('[BackupService] Scheduled backup failed: insufficient disk space');
      // 通知管理员
      await this.notifyAdmins('system', '自动备份失败', '磁盘空间不足，请检查服务器存储');
      return;
    }

    // 创建备份记录
    const recordId = uuidv4();
    await this.repo.createRecord({
      id: recordId,
      backup_type: 'auto',
      file_format: config.backup_format,
    });

    // 获取数据快照
    const dataSnapshot = await this.repo.getDataSnapshot();

    // 执行备份
    await this.executeBackupAsync(recordId, config, dataSnapshot);

    // 清理旧备份
    await this.cleanupOldBackups(config);
  }

  /**
   * 异步执行备份
   */
  private async executeBackupAsync(
    recordId: string,
    config: BackupConfig,
    dataSnapshot: DataSnapshot,
    operatorId?: number
  ): Promise<void> {
    try {
      const result = await this.executor.executeFullBackup(config, recordId, dataSnapshot);

      // 更新记录状态
      await this.repo.updateRecordStatus(recordId, result.status, {
        sql_file_path: result.sql_file_path,
        excel_file_path: result.excel_file_path,
        file_size_bytes: result.total_size_bytes,
        error_message: result.error_message,
        data_snapshot: dataSnapshot,
      });

      if (result.status === 'success') {
        logger.info(`[BackupService] Backup ${recordId} completed successfully`);
        if (operatorId) {
          sendToUser(operatorId, 'backup_completed', { record_id: recordId, success: true });
        }
      } else {
        logger.error(`[BackupService] Backup ${recordId} failed: ${result.error_message}`);
        if (operatorId) {
          sendToUser(operatorId, 'backup_completed', {
            record_id: recordId,
            success: false,
            error: result.error_message
          });
        }
        // 通知管理员
        await this.notifyAdmins('system', '备份执行失败', `备份 ${recordId} 执行失败：${result.error_message}`);
      }
    } catch (error) {
      logger.error(`[BackupService] Backup ${recordId} unexpected error:`, error);
      await this.repo.updateRecordStatus(recordId, 'failed', {
        error_message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * 清理旧备份
   */
  private async cleanupOldBackups(config: BackupConfig): Promise<void> {
    const oldRecords = await this.repo.getOldRecords(config.retention_count);

    if (oldRecords.length === 0) return;

    // 收集需要删除的文件路径（从数据库记录中获取实际路径）
    const filePathsToDelete: string[] = [];
    for (const record of oldRecords) {
      if (record.sql_file_path) filePathsToDelete.push(record.sql_file_path);
      if (record.excel_file_path) filePathsToDelete.push(record.excel_file_path);
    }

    // 删除文件
    if (filePathsToDelete.length > 0) {
      await this.executor.cleanupOldBackups(filePathsToDelete);
    }

    // 删除数据库记录
    for (const record of oldRecords) {
      await this.repo.deleteRecord(record.id);
    }

    logger.info(`[BackupService] Cleaned up ${oldRecords.length} old backup records`);
  }

  // ========== 记录管理 ==========

  /**
   * 获取备份记录列表
   */
  async getRecords(page: number, limit: number): Promise<PaginatedResult<BackupRecord>> {
    return this.repo.getRecords(page, limit);
  }

  /**
   * 获取备份记录详情
   */
  async getRecordById(id: string): Promise<BackupRecord | null> {
    return this.repo.getRecordById(id);
  }

  /**
   * 删除备份记录
   */
  async deleteRecord(id: string, currentUser: User): Promise<void> {
    // 权限检查
    if (currentUser.role !== 'admin') {
      throw new ForbiddenError('仅管理员可删除备份记录');
    }

    const record = await this.repo.getRecordById(id);
    if (!record) {
      throw new ValidationError('备份记录不存在');
    }

    if (record.status === 'running') {
      throw new ValidationError('无法删除正在执行的备份');
    }

    // 删除文件（使用数据库中存储的实际路径）
    const filePathsToDelete: string[] = [];
    if (record.sql_file_path) filePathsToDelete.push(record.sql_file_path);
    if (record.excel_file_path) filePathsToDelete.push(record.excel_file_path);
    if (filePathsToDelete.length > 0) {
      await this.executor.cleanupOldBackups(filePathsToDelete);
    }

    // 删除数据库记录
    await this.repo.deleteRecord(id);
  }

  // ========== 数据恢复 ==========

  /**
   * 执行数据恢复
   */
  async executeRestore(recordId: string, operatorId: number): Promise<RestoreResult> {
    const record = await this.repo.getRecordById(recordId);
    if (!record) {
      throw new ValidationError('备份记录不存在');
    }

    if (record.status !== 'success') {
      throw new ValidationError('仅可恢复成功状态的备份');
    }

    if (!record.sql_file_path) {
      throw new ValidationError('该备份没有 SQL 文件，无法恢复');
    }

    // 创建恢复前的备份
    const preRestoreBackupId = uuidv4();
    const config = await this.getConfig();
    const dataSnapshot = await this.repo.getDataSnapshot();

    if (config) {
      await this.repo.createRecord({
        id: preRestoreBackupId,
        backup_type: 'manual',
        file_format: 'sql',
        operator_id: operatorId,
      });

      const preRestoreResult = await this.executor.executeFullBackup(config, preRestoreBackupId, dataSnapshot);
      await this.repo.updateRecordStatus(preRestoreBackupId, 'success', {
        sql_file_path: preRestoreResult.sql_file_path,
        file_size_bytes: preRestoreResult.total_size_bytes,
        data_snapshot: dataSnapshot,
      });
    }

    // 执行恢复
    const result = await this.executor.restoreFromSql(record.sql_file_path);

    // 更新恢复结果
    if (result.success) {
      result.pre_restore_backup_id = preRestoreBackupId;
      logger.info(`[BackupService] Restore completed from ${recordId}`);
      await this.notifyAdmins('system', '数据恢复完成', `已从备份 ${recordId} 恢复数据，恢复前备份 ID: ${preRestoreBackupId}`);
    } else {
      logger.error(`[BackupService] Restore failed: ${result.error_message}`);
      await this.notifyAdmins('system', '数据恢复失败', `恢复失败：${result.error_message}`);
    }

    return result;
  }

  /**
   * 从上传的临时文件恢复数据
   */
  async restoreFromUploadedFile(tempFilePath: string, operatorId: number): Promise<RestoreResult> {
    // 创建恢复前的备份
    const preRestoreBackupId = uuidv4();
    const config = await this.getConfig();
    const dataSnapshot = await this.repo.getDataSnapshot();

    if (config) {
      await this.repo.createRecord({
        id: preRestoreBackupId,
        backup_type: 'manual',
        file_format: 'sql',
        operator_id: operatorId,
      });

      const preRestoreResult = await this.executor.executeFullBackup(config, preRestoreBackupId, dataSnapshot);
      await this.repo.updateRecordStatus(preRestoreBackupId, 'success', {
        sql_file_path: preRestoreResult.sql_file_path,
        file_size_bytes: preRestoreResult.total_size_bytes,
        data_snapshot: dataSnapshot,
      });
    }

    // 执行恢复
    const result = await this.executor.restoreFromSql(tempFilePath);

    // 清理临时文件
    try {
      await fs.unlink(tempFilePath);
    } catch {
      logger.warn(`[BackupService] Failed to cleanup temp file: ${tempFilePath}`);
    }

    // 更新恢复结果
    if (result.success) {
      result.pre_restore_backup_id = preRestoreBackupId;
      logger.info(`[BackupService] Restore completed from uploaded file`);
      await this.notifyAdmins('system', '数据恢复完成', `已从上传文件恢复数据，恢复前备份 ID: ${preRestoreBackupId}`);
    } else {
      logger.error(`[BackupService] Restore failed: ${result.error_message}`);
      await this.notifyAdmins('system', '数据恢复失败', `恢复失败：${result.error_message}`);
    }

    return result;
  }

  /**
   * 从服务器指定路径恢复数据
   */
  async restoreFromServerPath(filePath: string, operatorId: number): Promise<RestoreResult> {
    // 验证文件存在
    try {
      await fs.access(filePath);
    } catch {
      throw new ValidationError('指定的SQL文件不存在');
    }

    // 创建恢复前的备份
    const preRestoreBackupId = uuidv4();
    const config = await this.getConfig();
    const dataSnapshot = await this.repo.getDataSnapshot();

    if (config) {
      await this.repo.createRecord({
        id: preRestoreBackupId,
        backup_type: 'manual',
        file_format: 'sql',
        operator_id: operatorId,
      });

      const preRestoreResult = await this.executor.executeFullBackup(config, preRestoreBackupId, dataSnapshot);
      await this.repo.updateRecordStatus(preRestoreBackupId, 'success', {
        sql_file_path: preRestoreResult.sql_file_path,
        file_size_bytes: preRestoreResult.total_size_bytes,
        data_snapshot: dataSnapshot,
      });
    }

    // 执行恢复
    const result = await this.executor.restoreFromSql(filePath);

    // 更新恢复结果
    if (result.success) {
      result.pre_restore_backup_id = preRestoreBackupId;
      logger.info(`[BackupService] Restore completed from server path: ${filePath}`);
      await this.notifyAdmins('system', '数据恢复完成', `已从文件 ${filePath} 恢复数据，恢复前备份 ID: ${preRestoreBackupId}`);
    } else {
      logger.error(`[BackupService] Restore failed: ${result.error_message}`);
      await this.notifyAdmins('system', '数据恢复失败', `恢复失败：${result.error_message}`);
    }

    return result;
  }

  // ========== 文件下载 ==========

  /**
   * 下载备份文件
   * 包含路径遍历防护：验证文件路径必须在备份目录内
   */
  async downloadRecord(recordId: string, fileType: 'sql' | 'excel'): Promise<DownloadResult> {
    const record = await this.repo.getRecordById(recordId);
    if (!record) {
      throw new ValidationError('备份记录不存在');
    }

    if (record.status !== 'success') {
      throw new ValidationError('仅可下载成功状态的备份');
    }

    const filePath = fileType === 'sql' ? record.sql_file_path : record.excel_file_path;
    if (!filePath) {
      throw new ValidationError(`该备份没有 ${fileType} 文件`);
    }

    // 获取配置中的备份路径
    const config = await this.getConfig();
    if (!config) {
      throw new ValidationError('备份配置不存在');
    }

    // 路径遍历防护：验证文件路径必须在目标备份目录内
    const normalizedFilePath = path.resolve(filePath);
    const normalizedBackupPath = path.resolve(config.target_path);

    if (!normalizedFilePath.startsWith(normalizedBackupPath)) {
      logger.error(`[BackupService] Path traversal attempt detected: ${filePath}`);
      throw new ValidationError('文件路径不在备份目录内，访问被拒绝');
    }

    // 返回文件信息（实际文件传输由 controller 处理）
    // 生成下载文件名（使用备份时间生成时间戳格式）
    const backupTime = record.backup_time ? new Date(record.backup_time) : new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const ts = `${backupTime.getFullYear()}${pad(backupTime.getMonth() + 1)}${pad(backupTime.getDate())}${pad(backupTime.getHours())}${pad(backupTime.getMinutes())}${pad(backupTime.getSeconds())}`;
    const downloadFileName = `backup_${ts}.${fileType === 'sql' ? 'sql' : 'xlsx'}`;

    return {
      file_path: filePath,
      file_name: downloadFileName,
      file_type: fileType,
      size: record.file_size_bytes,
    };
  }

  // ========== 辅助方法 ==========

  /**
   * 浏览目录结构
   * 返回指定路径下的子目录列表
   */
  async browseDirectory(dirPath: string): Promise<{
    currentPath: string;
    parentPath: string | null;
    directories: Array<{
      path: string;
      name: string;
      isWritable: boolean;
    }>;
    isWritable: boolean;
    error?: string;
  }> {
    const normalizedPath = path.resolve(dirPath || './backups');

    try {
      // 检查路径是否存在
      const exists = await this.executor.pathExists(normalizedPath);
      if (!exists) {
        return {
          currentPath: normalizedPath,
          parentPath: null,
          directories: [],
          isWritable: false,
          error: '路径不存在',
        };
      }

      // 获取子目录列表
      const directories = await this.executor.listDirectories(normalizedPath);

      // 检查当前路径是否可写
      const isWritable = await this.executor.checkPathWritable(normalizedPath);

      // 计算父目录路径
      const parentPath = path.dirname(normalizedPath) !== normalizedPath
        ? path.dirname(normalizedPath)
        : null;

      return {
        currentPath: normalizedPath,
        parentPath,
        directories,
        isWritable,
      };
    } catch (error) {
      return {
        currentPath: normalizedPath,
        parentPath: null,
        directories: [],
        isWritable: false,
        error: error instanceof Error ? error.message : '无法访问路径',
      };
    }
  }

  /**
   * 浏览备份目录中的SQL文件
   */
  async browseSqlFiles(dirPath: string): Promise<{
    currentPath: string;
    files: Array<{
      name: string;
      path: string;
      size: number;
      modifiedTime: string;
    }>;
  }> {
    const normalizedPath = path.resolve(dirPath || './backups');

    // 安全检查：路径必须在备份目录内
    const config = await this.getConfig();
    if (config) {
      const normalizedBackupPath = path.resolve(config.target_path);
      if (!normalizedPath.startsWith(normalizedBackupPath)) {
        throw new ValidationError('路径必须在备份目录内');
      }
    }

    const entries = await fs.readdir(normalizedPath, { withFileTypes: true });
    const sqlFiles: Array<{
      name: string;
      path: string;
      size: number;
      modifiedTime: string;
    }> = [];

    for (const entry of entries) {
      if (entry.isFile() && entry.name.endsWith('.sql')) {
        const fullPath = path.join(normalizedPath, entry.name);
        try {
          const stat = await fs.stat(fullPath);
          sqlFiles.push({
            name: entry.name,
            path: fullPath,
            size: stat.size,
            modifiedTime: stat.mtime.toISOString(),
          });
        } catch {
          // 跳过无法读取的文件
        }
      }
    }

    // 按修改时间倒序排列（最新的在前）
    sqlFiles.sort((a, b) => new Date(b.modifiedTime).getTime() - new Date(a.modifiedTime).getTime());

    return {
      currentPath: normalizedPath,
      files: sqlFiles,
    };
  }

  /**
   * 通知所有管理员
   */
  private async notifyAdmins(type: string, title: string, content: string): Promise<void> {
    try {
      const pool = getPool();
      const [admins] = await pool.execute<RowDataPacket[]>(
        'SELECT id FROM users WHERE role = "admin"'
      );

      for (const admin of admins) {
        sendToUser(admin.id, 'notification', { type, title, content });
      }
    } catch (error) {
      logger.warn('[BackupService] Failed to notify admins:', error);
    }
  }

  /**
   * 获取备份状态统计
   */
  async getBackupStats(): Promise<{
    totalBackups: number;
    successfulBackups: number;
    failedBackups: number;
    lastBackupTime: Date | null;
    totalSizeBytes: number;
  }> {
    const pool = getPool();

    const [stats] = await pool.execute<RowDataPacket[]>(
      `SELECT
        COUNT(*) as totalBackups,
        SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as successfulBackups,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failedBackups,
        MAX(CASE WHEN status = 'success' THEN backup_time ELSE NULL END) as lastBackupTime,
        SUM(CASE WHEN status = 'success' THEN file_size_bytes ELSE 0 END) as totalSizeBytes
       FROM backup_records`
    );

    return {
      totalBackups: stats[0].totalBackups || 0,
      successfulBackups: stats[0].successfulBackups || 0,
      failedBackups: stats[0].failedBackups || 0,
      lastBackupTime: stats[0].lastBackupTime || null,
      totalSizeBytes: stats[0].totalSizeBytes || 0,
    };
  }
}