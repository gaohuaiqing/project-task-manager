/**
 * 日志监控脚本
 *
 * 功能：
 * 1. 检查日志量，超过阈值时告警
 * 2. 分析日志类型分布
 * 3. 检测前端日志占比过高的问题
 * 4. 提供日志清理建议
 *
 * 使用方法：
 * node app/server/dist/scripts/log-monitor.js
 * 或在定时任务中定期执行
 */

import { databaseService } from '../services/DatabaseService.js';

// ================================================================
// 配置项
// ================================================================

interface LogMonitorConfig {
  // 告警阈值：每小时日志量
  hourlyThreshold: number;
  // 告警阈值：前端日志占比
  frontendLogRatioThreshold: number;
  // 检查时间窗口（小时）
  checkWindowHours: number;
  // 启用自动清理（谨慎使用）
  enableAutoClean: boolean;
}

const config: LogMonitorConfig = {
  hourlyThreshold: 10000, // 每小时超过 10,000 条日志告警
  frontendLogRatioThreshold: 0.8, // 前端日志占比超过 80% 告警
  checkWindowHours: 1, // 检查最近 1 小时
  enableAutoClean: false, // 默认不启用自动清理
};

// ================================================================
// 监控函数
// ================================================================

/**
 * 检查 system_logs 表的日志量
 */
async function checkSystemLogsVolume(): Promise<{
  total: number;
  errors: number;
  frontendLogs: number;
  hourlyRate: number;
  needsAlert: boolean;
  alerts: string[];
}> {
  const connection = await databaseService.getConnection();

  try {
    // 检查最近 N 小时的日志量
    const [result] = await connection.execute(`
      SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN log_level = 'ERROR' THEN 1 END) as errors,
        COUNT(CASE WHEN log_level = 'WARN' THEN 1 END) as warnings,
        COUNT(CASE WHEN log_type = 'FRONTEND' THEN 1 END) as frontend_logs,
        COUNT(CASE WHEN log_type = 'SYSTEM' THEN 1 END) as system_logs,
        COUNT(CASE WHEN log_type = 'USER_ACTION' THEN 1 END) as user_actions,
        COUNT(CASE WHEN log_type = 'AUTH' THEN 1 END) as auth_logs
      FROM system_logs
      WHERE created_at > DATE_SUB(NOW(), INTERVAL ? HOUR)
    `, [config.checkWindowHours]) as any[];

    const stats = result[0];
    const hourlyRate = Math.round(stats.total / config.checkWindowHours);

    const alerts: string[] = [];
    let needsAlert = false;

    // 检查 1：总日志量告警
    if (stats.total > config.hourlyThreshold * config.checkWindowHours) {
      needsAlert = true;
      alerts.push(`🔴 [严重] 日志量过高：${stats.total} 条（${hourlyRate} 条/小时），阈值：${config.hourlyThreshold} 条/小时`);
    }

    // 检查 2：前端日志占比告警
    if (stats.total > 0) {
      const frontendRatio = stats.frontend_logs / stats.total;
      if (frontendRatio > config.frontendLogRatioThreshold) {
        needsAlert = true;
        alerts.push(`🔴 [严重] 前端日志占比过高：${(frontendRatio * 100).toFixed(1)}%，阈值：${(config.frontendLogRatioThreshold * 100).toFixed(0)}%`);
        alerts.push(`   建议：检查 FrontendLogger 的 console 拦截是否已禁用`);
      }
    }

    // 检查 3：错误日志过多
    if (stats.errors > 100) {
      needsAlert = true;
      alerts.push(`🟡 [警告] 错误日志过多：${stats.errors} 条，建议检查系统日志`);
    }

    return {
      total: stats.total,
      errors: stats.errors,
      frontendLogs: stats.frontend_logs,
      hourlyRate,
      needsAlert,
      alerts,
    };
  } finally {
    connection.release();
  }
}

/**
 * 检查 audit_logs 表的日志量
 */
async function checkAuditLogsVolume(): Promise<{
  total: number;
  dailyRate: number;
  needsAlert: boolean;
  alerts: string[];
}> {
  const connection = await databaseService.getConnection();

  try {
    // 检查最近 7 天的审计日志量
    const [result] = await connection.execute(`
      SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN result = 'failure' THEN 1 END) as failures,
        COUNT(CASE WHEN result = 'conflict' THEN 1 END) as conflicts
      FROM audit_logs
      WHERE created_at > DATE_SUB(NOW(), INTERVAL 7 DAY)
    `) as any[];

    const stats = result[0];
    const dailyRate = Math.round(stats.total / 7);

    const alerts: string[] = [];
    let needsAlert = false;

    // 审计日志量告警（每天超过 5000 条）
    if (dailyRate > 5000) {
      needsAlert = true;
      alerts.push(`🟡 [警告] 审计日志量较高：${dailyRate} 条/天`);
    }

    // 失败操作告警
    if (stats.failures > 50) {
      needsAlert = true;
      alerts.push(`🟡 [警告] 失败操作较多：${stats.failures} 次（7天内），建议检查`);
    }

    // 冲突告警
    if (stats.conflicts > 20) {
      needsAlert = true;
      alerts.push(`🟡 [警告] 数据冲突较多：${stats.conflicts} 次（7天内），建议检查同步机制`);
    }

    return {
      total: stats.total,
      dailyRate,
      needsAlert,
      alerts,
    };
  } finally {
    connection.release();
  }
}

/**
 * 分析日志类型分布
 */
async function analyzeLogDistribution(): Promise<{
  systemLogs: any;
  auditLogs: any;
}> {
  const connection = await databaseService.getConnection();

  try {
    // system_logs 按类型分布
    const [typeDist] = await connection.execute(`
      SELECT
        log_type,
        log_level,
        COUNT(*) as count,
        COUNT(*) * 100.0 / SUM(COUNT(*)) OVER() as percentage
      FROM system_logs
      WHERE created_at > DATE_SUB(NOW(), INTERVAL 24 HOUR)
      GROUP BY log_type, log_level
      ORDER BY count DESC
    `) as any[];

    // audit_logs 按操作类型分布
    const [auditDist] = await connection.execute(`
      SELECT
        operation_type,
        result,
        COUNT(*) as count,
        COUNT(*) * 100.0 / SUM(COUNT(*)) OVER() as percentage
      FROM audit_logs
      WHERE created_at > DATE_SUB(NOW(), INTERVAL 7 DAY)
      GROUP BY operation_type, result
      ORDER BY count DESC
      LIMIT 20
    `) as any[];

    return {
      systemLogs: typeDist,
      auditLogs: auditDist,
    };
  } finally {
    connection.release();
  }
}

/**
 * 获取表大小信息
 */
async function getTableSize(): Promise<{
  systemLogs: { rows: number; size: string };
  auditLogs: { rows: number; size: string };
}> {
  const connection = await databaseService.getConnection();

  try {
    const [result] = await connection.execute(`
      SELECT
        TABLE_NAME,
        TABLE_ROWS,
        ROUND(((DATA_LENGTH + INDEX_LENGTH) / 1024 / 1024), 2) AS size_mb
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = 'task_manager'
        AND TABLE_NAME IN ('system_logs', 'audit_logs')
    `) as any[];

    const systemLogs = result.find((r: any) => r.TABLE_NAME === 'system_logs') || { rows: 0, size_mb: 0 };
    const auditLogs = result.find((r: any) => r.TABLE_NAME === 'audit_logs') || { rows: 0, size_mb: 0 };

    return {
      systemLogs: { rows: systemLogs.TABLE_ROWS, size: `${systemLogs.size_mb} MB` },
      auditLogs: { rows: auditLogs.TABLE_ROWS, size: `${auditLogs.size_mb} MB` },
    };
  } finally {
    connection.release();
  }
}

/**
 * 检查分区状态
 */
async function checkPartitionStatus(): Promise<{
  systemLogs: boolean;
  auditLogs: boolean;
  details: any[];
}> {
  const connection = await databaseService.getConnection();

  try {
    const [result] = await connection.execute(`
      SELECT
        TABLE_NAME,
        PARTITION_NAME,
        PARTITION_METHOD,
        PARTITION_EXPRESSION,
        TABLE_ROWS
      FROM INFORMATION_SCHEMA.PARTITIONS
      WHERE TABLE_SCHEMA = 'task_manager'
        AND TABLE_NAME IN ('system_logs', 'audit_logs')
        AND PARTITION_NAME IS NOT NULL
      ORDER BY TABLE_NAME, PARTITION_ORDINAL_POSITION
    `) as any[];

    const systemLogsPartitions = result.filter((r: any) => r.TABLE_NAME === 'system_logs');
    const auditLogsPartitions = result.filter((r: any) => r.TABLE_NAME === 'audit_logs');

    return {
      systemLogs: systemLogsPartitions.length > 0,
      auditLogs: auditLogsPartitions.length > 0,
      details: result,
    };
  } finally {
    connection.release();
  }
}

// ================================================================
// 主函数
// ================================================================

export async function runLogMonitor(): Promise<void> {
  console.log('\n' + '='.repeat(80));
  console.log('🔍 日志监控报告');
  console.log(`📅 检查时间：${new Date().toLocaleString('zh-CN')}`);
  console.log('='.repeat(80));

  try {
    // 1. 检查 system_logs
    console.log('\n📊 System Logs 统计：');
    const systemStats = await checkSystemLogsVolume();
    console.log(`   最近 ${config.checkWindowHours} 小时日志量：${systemStats.total} 条（${systemStats.hourlyRate} 条/小时）`);
    console.log(`   - 错误日志：${systemStats.errors} 条`);
    console.log(`   - 前端日志：${systemStats.frontendLogs} 条 (${systemStats.total > 0 ? ((systemStats.frontendLogs / systemStats.total) * 100).toFixed(1) : 0}%)`);

    if (systemStats.needsAlert) {
      console.log('\n⚠️ 告警信息：');
      systemStats.alerts.forEach(alert => console.log(`   ${alert}`));
    } else {
      console.log('\n✅ System Logs 状态正常');
    }

    // 2. 检查 audit_logs
    console.log('\n📊 Audit Logs 统计：');
    const auditStats = await checkAuditLogsVolume();
    console.log(`   最近 7 天日志量：${auditStats.total} 条（${auditStats.dailyRate} 条/天）`);

    if (auditStats.needsAlert) {
      console.log('\n⚠️ 告警信息：');
      auditStats.alerts.forEach(alert => console.log(`   ${alert}`));
    } else {
      console.log('\n✅ Audit Logs 状态正常');
    }

    // 3. 表大小信息
    console.log('\n📏 表大小信息：');
    const tableSize = await getTableSize();
    console.log(`   system_logs：${tableSize.systemLogs.rows} 行，${tableSize.systemLogs.size}`);
    console.log(`   audit_logs：${tableSize.auditLogs.rows} 行，${tableSize.auditLogs.size}`);

    // 4. 分区状态
    console.log('\n🗂️  分区状态：');
    const partitionStatus = await checkPartitionStatus();
    console.log(`   system_logs：${partitionStatus.systemLogs ? '✅ 已分区' : '❌ 未分区'}`);
    console.log(`   audit_logs：${partitionStatus.auditLogs ? '✅ 已分区' : '❌ 未分区'}`);

    // 5. 日志分布（仅在有告警时显示）
    if (systemStats.needsAlert || auditStats.needsAlert) {
      console.log('\n📈 日志类型分布：');
      const distribution = await analyzeLogDistribution();

      if (distribution.systemLogs.length > 0) {
        console.log('   System Logs（最近24小时）：');
        distribution.systemLogs.slice(0, 10).forEach((row: any) => {
          console.log(`     [${row.log_type}] ${row.log_level}：${row.count} 条 (${row.percentage.toFixed(1)}%)`);
        });
      }

      if (distribution.auditLogs.length > 0) {
        console.log('   Audit Logs（最近7天，Top 20）：');
        distribution.auditLogs.forEach((row: any) => {
          console.log(`     [${row.operation_type}] ${row.result}：${row.count} 条 (${row.percentage.toFixed(1)}%)`);
        });
      }
    }

    // 6. 建议
    console.log('\n💡 优化建议：');
    const suggestions: string[] = [];

    if (!partitionStatus.auditLogs) {
      suggestions.push('- 为 audit_logs 表创建分区，提升删除性能');
    }

    if (systemStats.frontendLogs / systemStats.total > config.frontendLogRatioThreshold) {
      suggestions.push('- 检查 FrontendLogger 的 console 拦截设置，建议禁用');
      suggestions.push('- 检查前端日志级别过滤，只记录 ERROR 和 WARN');
    }

    if (systemStats.hourlyRate > config.hourlyThreshold) {
      suggestions.push('- 考虑缩短日志保留时间（如从 72 小时改为 24 小时）');
      suggestions.push('- 增加日志清理频率（如从每 1 小时改为每 30 分钟）');
    }

    if (suggestions.length === 0) {
      suggestions.push('- 当前日志系统运行正常，无需调整');
    }

    suggestions.forEach(s => console.log(`   ${s}`));

    console.log('\n' + '='.repeat(80));
    console.log('✅ 监控完成');
    console.log('='.repeat(80) + '\n');

    // 如果有告警，返回非零退出码
    if (systemStats.needsAlert || auditStats.needsAlert) {
      process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ 监控执行失败：', error);
    process.exit(1);
  }
}

// ================================================================
// 命令行入口
// ================================================================

if (import.meta.url === `file://${process.argv[1]}`) {
  // 初始化数据库连接
  databaseService.init().then(() => {
    return runLogMonitor();
  }).then(() => {
    process.exit(0);
  }).catch((error) => {
    console.error('执行失败：', error);
    process.exit(1);
  });
}
