/**
 * 数据备份 API 接口
 */
import apiClient from './client';

// ============ 类型定义 ============

export type BackupInterval = 'hourly' | '6hours' | 'daily' | 'weekly' | 'biweekly' | 'monthly';
export type BackupFormat = 'sql' | 'excel' | 'both';
export type BackupType = 'auto' | 'manual';
export type BackupRecordStatus = 'pending' | 'running' | 'success' | 'failed';

export interface BackupConfig {
  id: string;
  backupInterval: BackupInterval;
  targetPath: string;
  retentionCount: number;
  backupFormat: BackupFormat;
  remoteType: string | null;
  remoteHost: string | null;
  remotePort: number | null;
  remoteUsername: string | null;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BackupRecord {
  id: string;
  backupTime: string;
  backupType: BackupType;
  fileFormat: BackupFormat;
  sqlFilePath: string | null;
  excelFilePath: string | null;
  fileSizeBytes: number;
  status: BackupRecordStatus;
  operatorId: number | null;
  errorMessage: string | null;
  dataSnapshot: DataSnapshot | null;
  createdAt: string;
  operatorName?: string;
}

export interface DataSnapshot {
  totalProjects: number;
  totalTasks: number;
  totalUsers: number;
  totalDepartments: number;
}

export interface BackupStats {
  totalBackups: number;
  successfulBackups: number;
  failedBackups: number;
  lastBackupTime: string | null;
  totalSizeBytes: number;
}

export interface BrowseDirectoryResult {
  currentPath: string;
  parentPath: string | null;
  directories: Array<{
    path: string;
    name: string;
    isWritable: boolean;
  }>;
  isWritable: boolean;
  error?: string;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface UpdateBackupConfigDTO {
  backupInterval?: BackupInterval;
  targetPath?: string;
  retentionCount?: number;
  backupFormat?: BackupFormat;
  enabled?: boolean;
}

// ============ API 接口 ============

export const backupApi = {
  /**
   * 获取备份配置
   */
  getConfig: async (): Promise<BackupConfig> => {
    const response = await apiClient.get('/backup/config');
    return response.data;
  },

  /**
   * 更新备份配置
   */
  updateConfig: async (dto: UpdateBackupConfigDTO): Promise<BackupConfig> => {
    const response = await apiClient.post('/backup/config', dto);
    return response.data;
  },

  /**
   * 手动触发备份
   */
  executeBackup: async (): Promise<{ recordId: string; status: string }> => {
    const response = await apiClient.post('/backup/execute');
    return response.data;
  },

  /**
   * 获取备份记录列表
   */
  getRecords: async (page = 1, limit = 20): Promise<PaginatedResult<BackupRecord>> => {
    const response = await apiClient.get('/backup/records', { params: { page, limit } });
    return response.data;
  },

  /**
   * 获取备份记录详情
   */
  getRecordById: async (id: string): Promise<BackupRecord> => {
    const response = await apiClient.get(`/backup/records/${id}`);
    return response.data;
  },

  /**
   * 下载备份文件（带进度回调）
   */
  downloadRecord: async (
    id: string,
    type: 'sql' | 'excel',
    onProgress?: (progress: number) => void
  ): Promise<void> => {
    const response = await apiClient.get(`/backup/records/${id}/download`, {
      params: { type },
      responseType: 'blob',
      timeout: 60000, // 下载文件可能较慢，设置 60 秒超时
      onDownloadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(progress);
        }
      },
    });

    // 从 Content-Disposition 获取文件名
    const contentDisposition = response.headers?.['content-disposition'];
    let fileName = `backup_${id}.${type === 'sql' ? 'sql' : 'xlsx'}`;
    if (contentDisposition) {
      // 支持 filename="xxx" 和 filename=xxx 格式
      const match = contentDisposition.match(/filename="?([^";\s]+)"?/i);
      if (match) fileName = match[1];
    }

    // 创建下载链接
    const blob = new Blob([response.data], {
      type: type === 'sql' ? 'text/plain' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },

  /**
   * 执行数据恢复
   */
  restoreRecord: async (id: string): Promise<{
    restoredTables: string[];
    preRestoreBackupId: string;
  }> => {
    const response = await apiClient.post(`/backup/records/${id}/restore`);
    return response.data;
  },

  /**
   * 删除备份记录
   */
  deleteRecord: async (id: string): Promise<void> => {
    await apiClient.delete(`/backup/records/${id}`);
  },

  /**
   * 获取备份统计
   */
  getStats: async (): Promise<BackupStats> => {
    const response = await apiClient.get('/backup/stats');
    return response.data;
  },

  /**
   * 浏览服务器目录结构
   */
  browseDirectory: async (dirPath?: string): Promise<BrowseDirectoryResult> => {
    const response = await apiClient.get('/backup/browse', {
      params: dirPath ? { path: dirPath } : undefined,
    });
    return response.data;
  },

  /**
   * 从上传的SQL文件恢复数据
   */
  restoreFromUpload: async (file: File): Promise<{
    restoredTables: string[];
    preRestoreBackupId: string;
  }> => {
    const formData = new FormData();
    formData.append('sqlFile', file);

    const response = await apiClient.post('/backup/restore/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 120000, // 恢复可能较慢
    });
    return response.data;
  },

  /**
   * 从服务器指定路径恢复数据
   */
  restoreFromPath: async (filePath: string): Promise<{
    restoredTables: string[];
    preRestoreBackupId: string;
  }> => {
    const response = await apiClient.post('/backup/restore/path', { filePath });
    return response.data;
  },

  /**
   * 浏览备份目录中的SQL文件
   */
  browseSqlFiles: async (dirPath?: string): Promise<{
    currentPath: string;
    files: Array<{
      name: string;
      path: string;
      size: number;
      modifiedTime: string;
    }>;
  }> => {
    const response = await apiClient.get('/backup/browse-sql', {
      params: dirPath ? { path: dirPath } : undefined,
    });
    return response.data;
  },
};