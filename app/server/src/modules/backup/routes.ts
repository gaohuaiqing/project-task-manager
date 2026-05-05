// app/server/src/modules/backup/routes.ts
import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { BackupController } from './controller';
import { permissionMiddleware } from '../../core/middleware/permission-middleware';
import { ValidationError } from '../../core/errors';
import type { User } from '../../core/types';

const router = Router();
const controller = new BackupController();

// 配置文件上传中间件
const upload = multer({
  dest: './uploads/temp/',
  limits: {
    fileSize: 50 * 1024 * 1024, // 最大50MB
  },
  fileFilter: (_req, file, cb) => {
    // 只接受.sql文件
    if (file.originalname.endsWith('.sql')) {
      cb(null, true);
    } else {
      cb(new ValidationError('只支持.sql文件'));
    }
  },
});

function getCurrentUser(req: Request): User | null {
  return (req as any).user || null;
}

function requireUser(req: Request): User {
  const user = getCurrentUser(req);
  if (!user) throw new ValidationError('未登录');
  return user;
}

// ========== 所有备份接口都需要 BACKUP_MANAGE 权限 ==========

router.use(permissionMiddleware('BACKUP_MANAGE'));

// ========== 配置管理 ==========

// 获取备份配置
router.get('/config', controller.getConfig.bind(controller));

// 更新备份配置
router.post('/config', controller.updateConfig.bind(controller));

// ========== 备份执行 ==========

// 手动触发备份
router.post('/execute', controller.executeBackup.bind(controller));

// 获取备份统计
router.get('/stats', controller.getStats.bind(controller));

// ========== 记录管理 ==========

// 浏览目录结构
router.get('/browse', controller.browseDirectory.bind(controller));

// 备份记录列表
router.get('/records', controller.getRecords.bind(controller));

// 备份记录详情
router.get('/records/:id', controller.getRecordById.bind(controller));

// 下载备份文件
router.get('/records/:id/download', controller.downloadRecord.bind(controller));

// 执行数据恢复
router.post('/records/:id/restore', controller.executeRestore.bind(controller));

// 删除备份记录
router.delete('/records/:id', controller.deleteRecord.bind(controller));

// ========== 自定义文件恢复 ==========

// 从上传的SQL文件恢复
router.post('/restore/upload', upload.single('sqlFile'), controller.restoreFromUpload.bind(controller));

// 从服务器指定路径恢复
router.post('/restore/path', controller.restoreFromPath.bind(controller));

// 浏览备份目录中的SQL文件
router.get('/browse-sql', controller.browseSqlFiles.bind(controller));

export default router;