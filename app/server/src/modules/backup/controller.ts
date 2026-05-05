// app/server/src/modules/backup/controller.ts
import { Request, Response, NextFunction } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { BackupService } from './service';
import { ValidationError, ForbiddenError } from '../../core/errors';
import type { User } from '../../core/types';

export class BackupController {
  private service = new BackupService();

  // ========== 配置管理 ==========

  /**
   * 获取备份配置
   * GET /api/backup/config
   */
  async getConfig(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const config = await this.service.getConfig();
      res.json({ success: true, data: config });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 更新备份配置
   * POST /api/backup/config
   */
  async updateConfig(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const currentUser = (req as any).user as User;
      const config = await this.service.updateConfig(req.body, currentUser);
      res.json({ success: true, data: config });
    } catch (error) {
      next(error);
    }
  }

  // ========== 备份执行 ==========

  /**
   * 手动触发备份
   * POST /api/backup/execute
   */
  async executeBackup(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const currentUser = (req as any).user as User;

      // 权限检查
      if (currentUser.role !== 'admin') {
        throw new ForbiddenError('仅管理员可执行备份');
      }

      const record = await this.service.executeManualBackup(currentUser.id);
      res.json({
        success: true,
        data: {
          record_id: record.id,
          status: record.status,
          message: '备份已启动，请等待完成',
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // ========== 记录管理 ==========

  /**
   * 备份记录列表
   * GET /api/backup/records?page=1&limit=20
   */
  async getRecords(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const result = await this.service.getRecords(page, limit);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 备份记录详情
   * GET /api/backup/records/:id
   */
  async getRecordById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const record = await this.service.getRecordById(id);

      if (!record) {
        throw new ValidationError('备份记录不存在');
      }

      res.json({ success: true, data: record });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 下载备份文件
   * GET /api/backup/records/:id/download?type=sql|excel
   */
  async downloadRecord(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const fileType = (req.query.type as 'sql' | 'excel') || 'sql';

      const result = await this.service.downloadRecord(id, fileType);

      // 获取配置进行二次路径验证（防御性编程）
      const config = await this.service.getConfig();
      if (config) {
        const normalizedFilePath = path.resolve(result.file_path);
        const normalizedBackupPath = path.resolve(config.target_path);

        if (!normalizedFilePath.startsWith(normalizedBackupPath)) {
          throw new ValidationError('文件路径验证失败，拒绝访问');
        }
      }

      // 验证文件实际存在
      if (!fs.existsSync(result.file_path)) {
        throw new ValidationError('备份文件不存在，可能已被手动删除');
      }

      // 流式传输文件
      const fileStream = fs.createReadStream(result.file_path);
      const mimeType = fileType === 'sql' ? 'text/plain' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

      res.setHeader('Content-Type', mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${result.file_name}"`);
      res.setHeader('Content-Length', result.size);

      fileStream.pipe(res);

      fileStream.on('error', (error) => {
        next(error);
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 执行数据恢复
   * POST /api/backup/records/:id/restore
   */
  async executeRestore(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const currentUser = (req as any).user as User;

      // 权限检查
      if (currentUser.role !== 'admin') {
        throw new ForbiddenError('仅管理员可执行数据恢复');
      }

      const result = await this.service.executeRestore(id, currentUser.id);

      res.json({
        success: true,
        data: {
          restored_tables: result.restored_tables,
          pre_restore_backup_id: result.pre_restore_backup_id,
          message: result.success ? '数据恢复完成' : `恢复失败: ${result.error_message}`,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 删除备份记录
   * DELETE /api/backup/records/:id
   */
  async deleteRecord(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const currentUser = (req as any).user as User;

      await this.service.deleteRecord(id, currentUser);
      res.json({ success: true, message: '备份记录已删除' });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 获取备份统计
   * GET /api/backup/stats
   */
  async getStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const stats = await this.service.getBackupStats();
      res.json({ success: true, data: stats });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 浏览目录结构
   * GET /api/backup/browse?path=/path/to/dir
   */
  async browseDirectory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const dirPath = (req.query.path as string) || './backups';
      const result = await this.service.browseDirectory(dirPath);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  // ========== 自定义文件恢复 ==========

  /**
   * 从上传的SQL文件恢复数据
   * POST /api/backup/restore/upload
   * Body: multipart/form-data with file field 'sqlFile'
   */
  async restoreFromUpload(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const currentUser = (req as any).user as User;

      // 权限检查
      if (currentUser.role !== 'admin') {
        throw new ForbiddenError('仅管理员可执行数据恢复');
      }

      // 检查文件是否上传
      if (!req.file) {
        throw new ValidationError('请上传SQL文件');
      }

      // 验证文件类型
      if (!req.file.originalname.endsWith('.sql')) {
        throw new ValidationError('只支持.sql文件');
      }

      const result = await this.service.restoreFromUploadedFile(
        req.file.path,
        currentUser.id
      );

      res.json({
        success: true,
        data: {
          restored_tables: result.restored_tables,
          pre_restore_backup_id: result.pre_restore_backup_id,
          message: result.success ? '数据恢复完成' : `恢复失败: ${result.error_message}`,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 从服务器指定路径恢复数据
   * POST /api/backup/restore/path
   * Body: { filePath: string }
   */
  async restoreFromPath(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const currentUser = (req as any).user as User;

      // 权限检查
      if (currentUser.role !== 'admin') {
        throw new ForbiddenError('仅管理员可执行数据恢复');
      }

      const { filePath } = req.body;
      if (!filePath) {
        throw new ValidationError('请指定SQL文件路径');
      }

      // 验证文件路径安全性
      const config = await this.service.getConfig();
      if (config) {
        const normalizedFilePath = path.resolve(filePath);
        const normalizedBackupPath = path.resolve(config.target_path);

        if (!normalizedFilePath.startsWith(normalizedBackupPath)) {
          throw new ValidationError('文件路径必须在备份目录内');
        }
      }

      const result = await this.service.restoreFromServerPath(
        filePath,
        currentUser.id
      );

      res.json({
        success: true,
        data: {
          restored_tables: result.restored_tables,
          pre_restore_backup_id: result.pre_restore_backup_id,
          message: result.success ? '数据恢复完成' : `恢复失败: ${result.error_message}`,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 浏览备份目录中的SQL文件
   * GET /api/backup/browse-sql?path=/path/to/dir
   */
  async browseSqlFiles(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const dirPath = (req.query.path as string) || './backups';
      const result = await this.service.browseSqlFiles(dirPath);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
}