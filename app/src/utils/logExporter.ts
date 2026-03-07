/**
 * 日志导出工具
 *
 * 功能：
 * 1. 导出日志为 JSON
 * 2. 导出日志为 CSV (Excel)
 * 3. 支持过滤和格式化
 *
 * @module utils/logExporter
 */

import type { LogEntry } from '@/components/settings/SystemLogs';
import type { ExportOptions, ExportResult } from '@/components/settings/SystemLogs.types';

/**
 * 生成导出文件名
 */
function generateFileName(format: 'json' | 'csv'): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  return `system-logs-${timestamp}.${format}`;
}

/**
 * 下载文件
 */
function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * 导出为 JSON
 *
 * @param logs - 日志数据
 * @returns 导出结果
 */
export async function exportAsJSON(logs: LogEntry[]): Promise<ExportResult> {
  try {
    const jsonStr = JSON.stringify(logs, null, 2);
    const filename = generateFileName('json');
    downloadFile(jsonStr, filename, 'application/json');
    return { success: true, filename };
  } catch (error) {
    console.error('[logExporter] 导出JSON失败:', error);
    return { success: false, error: error instanceof Error ? error.message : '未知错误' };
  }
}

/**
 * 导出为 CSV
 *
 * @param logs - 日志数据
 * @returns 导出结果
 */
export async function exportAsCSV(logs: LogEntry[]): Promise<ExportResult> {
  try {
    // CSV 表头
    const headers = ['时间', '级别', '类型', '消息', '用户', 'IP地址'];

    // CSV 数据行
    const rows = logs.map((log) => [
      log.created_at,
      log.log_level,
      log.log_type,
      log.message,
      log.username || '-',
      log.ip_address || '-',
    ]);

    // 构建 CSV 内容
    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${cell}"`).join(','))
      .join('\n');

    const filename = generateFileName('csv');
    downloadFile(csvContent, filename, 'text/csv;charset=utf-8;');
    return { success: true, filename };
  } catch (error) {
    console.error('[logExporter] 导出CSV失败:', error);
    return { success: false, error: error instanceof Error ? error.message : '未知错误' };
  }
}

/**
 * 获取日志数据
 */
async function fetchLogs(params: URLSearchParams): Promise<LogEntry[]> {
  const response = await fetch(`http://localhost:3001/api/logs?${params}`);
  const result = await response.json();

  if (result.success && result.logs) {
    return result.logs;
  }

  return [];
}

/**
 * 导出日志
 *
 * @param options - 导出选项
 * @returns 导出结果
 */
export async function exportLogs(options: ExportOptions): Promise<ExportResult> {
  const { format, level, type, limit = 10000 } = options;

  // 构建查询参数
  const params = new URLSearchParams();
  if (level !== 'ALL') params.append('level', level);
  if (type !== 'ALL') params.append('type', type);
  params.append('limit', limit.toString());

  try {
    // 获取日志数据
    const logs = await fetchLogs(params);

    // 根据格式导出
    if (format === 'json') {
      return exportAsJSON(logs);
    } else {
      return exportAsCSV(logs);
    }
  } catch (error) {
    console.error('[logExporter] 导出失败:', error);
    return { success: false, error: error instanceof Error ? error.message : '未知错误' };
  }
}

export default {
  exportAsJSON,
  exportAsCSV,
  exportLogs,
};
