#!/usr/bin/env node

/**
 * 自动化内存监控和清理脚本
 * 功能：
 * 1. 定期检查 Node.js 进程数量和内存使用
 * 2. 检测异常内存占用（>500MB）
 * 3. 自动清理僵尸进程
 * 4. 生成内存使用报告
 * 5. 可配置的监控间隔
 */

const os = require('os');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// ==================== 配置 ====================
const CONFIG = {
  // 监控间隔（毫秒）
  checkInterval: 10000, // 10秒

  // 进程数量阈值
  maxProcessCount: 15, // 超过15个进程触发警告
  criticalProcessCount: 25, // 超过25个进程自动清理

  // 内存阈值（MB）
  maxMemoryPerProcess: 500, // 单个进程超过500MB标记
  criticalSystemMemory: 85, // 系统内存使用超过85%自动清理

  // 自动清理配置
  autoCleanup: true, // 是否启用自动清理
  cleanupOldest: true, // 是否清理最老的进程
  protectedProcesses: [], // 受保护的进程 PID 列表

  // 报告配置
  reportDir: './logs/ai-assist',
  reportFile: 'memory-monitor-report.json',
  historyLength: 50, // 保留最近50条记录

  // 日志配置
  verbose: false, // 详细日志
};

// ==================== 工具函数 ====================
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, level = 'info') {
  const timestamp = new Date().toISOString();
  const color = level === 'error' ? colors.red :
                level === 'warn' ? colors.yellow :
                level === 'success' ? colors.green :
                colors.blue;

  console.log(`${color}[${timestamp}] [${level.toUpperCase()}] ${message}${colors.reset}`);
}

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / 1024 / 1024).toFixed(2) + ' MB';
  return (bytes / 1024 / 1024 / 1024).toFixed(2) + ' GB';
}

function formatPercent(value) {
  return (value * 100).toFixed(1) + '%';
}

// ==================== 进程管理 ====================
interface NodeProcess {
  pid: number;
  memory: number;
  command: string;
  startTime?: number;
}

function findNodeProcesses(): NodeProcess[] {
  try {
    const isWindows = os.platform() === 'win32';
    let output: string;

    if (isWindows) {
      // Windows: 使用 tasklist 获取详细信息
      output = execSync(
        'tasklist /FI "IMAGENAME eq node.exe" /FO CSV /V',
        { encoding: 'utf-8', windowsHide: true }
      );

      // 解析 Windows 输出
      const lines = output.split('\n').slice(1).filter(line => line.includes('node.exe'));
      return lines.map(line => {
        const parts = line.split('","');
        if (parts.length < 5) return null;

        const pid = parseInt(parts[1].replace(/"/g, ''), 10);
        const memoryStr = parts[4]?.replace(/[,"]/g, '').trim() || '0';
        const memory = parseInt(memoryStr, 10) * 1024; // KB to Bytes
        const command = parts[parts.length - 1]?.replace(/"/g, '').trim() || '';

        return { pid, memory, command };
      }).filter(p => p !== null && !isNaN(p.pid));

    } else {
      // Unix: 使用 ps 获取详细信息
      output = execSync(
        'ps aux | grep -E "node|vite|tsx" | grep -v grep',
        { encoding: 'utf-8' }
      );

      const lines = output.split('\n').filter(line => line.trim());
      return lines.map(line => {
        const parts = line.trim().split(/\s+/);
        if (parts.length < 11) return null;

        const pid = parseInt(parts[1], 10);
        const memoryPercent = parseFloat(parts[3]);
        const command = parts.slice(10).join(' ');

        // 估算内存使用（基于系统总内存）
        const totalMem = os.totalmem();
        const memory = Math.round((memoryPercent / 100) * totalMem);

        return { pid, memory, command };
      }).filter(p => p !== null && !isNaN(p.pid));
    }
  } catch (error) {
    log(`查找进程失败: ${error.message}`, 'error');
    return [];
  }
}

function killProcess(pid: number): boolean {
  try {
    const isWindows = os.platform() === 'win32';
    const command = isWindows
      ? `taskkill /F /PID ${pid}`
      : `kill -9 ${pid}`;

    execSync(command, { stdio: 'ignore', windowsHide: true });
    return true;
  } catch (error) {
    log(`终止进程 ${pid} 失败: ${error.message}`, 'error');
    return false;
  }
}

function cleanupProcesses(processes: NodeProcess[], reason: string): void {
  if (!CONFIG.autoCleanup) {
    log('自动清理已禁用，跳过清理', 'warn');
    return;
  }

  log(`开始清理进程 (原因: ${reason})`, 'warn');

  // 过滤受保护的进程
  const cleanableProcesses = processes.filter(
    p => !CONFIG.protectedProcesses.includes(p.pid)
  );

  if (cleanableProcesses.length === 0) {
    log('没有可清理的进程', 'info');
    return;
  }

  // 按内存使用排序（清理占用内存最多的）
  const sortedProcesses = cleanableProcesses.sort((a, b) => b.memory - a.memory);

  // 确定要清理的进程数量
  const cleanupCount = Math.min(
    sortedProcesses.length,
    Math.max(3, sortedProcesses.length - CONFIG.maxProcessCount)
  );

  log(`准备清理 ${cleanupCount} 个进程...`, 'info');

  let successCount = 0;
  for (let i = 0; i < cleanupCount; i++) {
    const proc = sortedProcesses[i];
    log(`清理进程 ${proc.pid} (${formatBytes(proc.memory)})`, 'info');

    if (killProcess(proc.pid)) {
      successCount++;
      log(`✓ 进程 ${proc.pid} 已终止`, 'success');
    } else {
      log(`✗ 进程 ${proc.pid} 终止失败`, 'error');
    }
  }

  log(`清理完成: ${successCount}/${cleanupCount} 个进程已终止`, 'success');
}

// ==================== 系统监控 ====================
interface SystemMetrics {
  timestamp: number;
  processes: {
    count: number;
    details: NodeProcess[];
    highMemoryCount: number;
  };
  system: {
    total: number;
    used: number;
    free: number;
    usagePercent: number;
  };
  actions: string[];
}

function getSystemMetrics(): SystemMetrics {
  const processes = findNodeProcesses();
  const sysMem = {
    total: os.totalmem(),
    used: os.totalmem() - os.freemem(),
    free: os.freemem(),
    usagePercent: (os.totalmem() - os.freemem()) / os.totalmem(),
  };

  const highMemoryCount = processes.filter(p => p.memory > CONFIG.maxMemoryPerProcess * 1024 * 1024).length;

  return {
    timestamp: Date.now(),
    processes: {
      count: processes.length,
      details: processes,
      highMemoryCount,
    },
    system: sysMem,
    actions: [],
  };
}

function analyzeMetrics(metrics: SystemMetrics): string[] {
  const actions: string[] = [];

  // 检查进程数量
  if (metrics.processes.count > CONFIG.criticalProcessCount) {
    actions.push(`进程数量过多 (${metrics.processes.count} > ${CONFIG.criticalProcessCount})`);
    cleanupProcesses(metrics.processes.details, '进程数量过多');
  } else if (metrics.processes.count > CONFIG.maxProcessCount) {
    actions.push(`进程数量警告 (${metrics.processes.count} > ${CONFIG.maxProcessCount})`);
  }

  // 检查系统内存
  if (metrics.system.usagePercent > CONFIG.criticalSystemMemory / 100) {
    actions.push(`系统内存使用过高 (${formatPercent(metrics.system.usagePercent)} > ${CONFIG.criticalSystemMemory}%)`);
    cleanupProcesses(metrics.processes.details, '系统内存使用过高');
  }

  // 检查高内存进程
  if (metrics.processes.highMemoryCount > 0) {
    const highMemProcesses = metrics.processes.details
      .filter(p => p.memory > CONFIG.maxMemoryPerProcess * 1024 * 1024)
      .map(p => `PID ${p.pid}: ${formatBytes(p.memory)}`)
      .join(', ');

    actions.push(`发现 ${metrics.processes.highMemoryCount} 个高内存进程: ${highMemProcesses}`);
  }

  return actions;
}

function displayMetrics(metrics: SystemMetrics): void {
  console.clear();

  console.log(colors.blue + '='.repeat(70) + colors.reset);
  console.log(colors.blue + '  自动化内存监控器 - Auto Memory Monitor' + colors.reset);
  console.log(colors.blue + '='.repeat(70) + colors.reset);
  console.log('');

  // 进程信息
  console.log('🔍 Node.js 进程:');
  console.log(`  进程数量: ${metrics.processes.count}`);

  if (metrics.processes.count > 0) {
    console.log(`  总内存: ${formatBytes(
      metrics.processes.details.reduce((sum, p) => sum + p.memory, 0)
    )}`);

    // 显示前5个进程
    console.log('\n  前5个进程:');
    const sortedProcesses = [...metrics.processes.details]
      .sort((a, b) => b.memory - a.memory)
      .slice(0, 5);

    sortedProcesses.forEach((proc, index) => {
      const memoryStr = formatBytes(proc.memory);
      const warning = proc.memory > CONFIG.maxMemoryPerProcess * 1024 * 1024
        ? colors.yellow + ' ⚠️' + colors.reset
        : '';

      console.log(`    ${index + 1}. PID ${proc.pid.toString().padStart(6)}: ${memoryStr.padStart(10)}${warning}`);
      if (CONFIG.verbose && proc.command) {
        console.log(`       ${proc.command.substring(0, 60)}...`);
      }
    });
  }
  console.log('');

  // 系统内存
  console.log('💻 系统内存:');
  console.log(`  已用: ${formatBytes(metrics.system.used)} / ${formatBytes(metrics.system.total)}`);
  console.log(`  可用: ${formatBytes(metrics.system.free)}`);
  console.log(`  使用率: ${formatPercent(metrics.system.usagePercent)}`);
  console.log('');

  // 状态和建议
  console.log('📊 状态和建议:');

  if (metrics.processes.count > CONFIG.criticalProcessCount) {
    console.log(colors.red + `  ⚠️  严重警告: 进程数量过多 (${metrics.processes.count})` + colors.reset);
    console.log(colors.red + '  已触发自动清理' + colors.reset);
  } else if (metrics.processes.count > CONFIG.maxProcessCount) {
    console.log(colors.yellow + `  ⚠️  警告: 进程数量较多 (${metrics.processes.count})` + colors.reset);
    console.log(colors.yellow + '  建议: 检查是否有僵尸进程' + colors.reset);
  } else if (metrics.system.usagePercent > CONFIG.criticalSystemMemory / 100) {
    console.log(colors.red + `  ⚠️  严重警告: 系统内存使用过高` + colors.reset);
    console.log(colors.red + '  已触发自动清理' + colors.reset);
  } else {
    console.log(colors.green + '  ✅ 系统状态正常' + colors.reset);
  }

  // 显示最近的操作
  if (metrics.actions.length > 0) {
    console.log('\n📝 最近操作:');
    metrics.actions.forEach(action => {
      console.log(`  • ${action}`);
    });
  }

  console.log('');
  console.log(colors.cyan + `下次检查: ${(new Date(Date.now() + CONFIG.checkInterval)).toLocaleTimeString()}` + colors.reset);
  console.log(colors.blue + '按 Ctrl+C 退出监控' + colors.reset);
  console.log(colors.blue + '='.repeat(70) + colors.reset);
}

// ==================== 报告管理 ====================
class ReportManager {
  private reportFile: string;
  private history: SystemMetrics[];

  constructor() {
    this.reportFile = path.join(CONFIG.reportDir, CONFIG.reportFile);
    this.history = [];

    // 确保报告目录存在
    if (!fs.existsSync(CONFIG.reportDir)) {
      fs.mkdirSync(CONFIG.reportDir, { recursive: true });
    }

    // 加载历史记录
    this.loadHistory();
  }

  private loadHistory(): void {
    try {
      if (fs.existsSync(this.reportFile)) {
        const data = fs.readFileSync(this.reportFile, 'utf-8');
        this.history = JSON.parse(data);
      }
    } catch (error) {
      log(`加载历史记录失败: ${error.message}`, 'error');
      this.history = [];
    }
  }

  private saveHistory(): void {
    try {
      fs.writeFileSync(this.reportFile, JSON.stringify(this.history, null, 2));
    } catch (error) {
      log(`保存历史记录失败: ${error.message}`, 'error');
    }
  }

  addMetrics(metrics: SystemMetrics): void {
    this.history.push(metrics);

    // 限制历史记录长度
    if (this.history.length > CONFIG.historyLength) {
      this.history.shift();
    }

    this.saveHistory();
  }

  generateReport(): string {
    if (this.history.length === 0) {
      return '暂无历史数据';
    }

    const latest = this.history[this.history.length - 1];
    const avgProcessCount = this.history.reduce(
      (sum, m) => sum + m.processes.count, 0
    ) / this.history.length;

    const avgMemoryUsage = this.history.reduce(
      (sum, m) => sum + m.system.usagePercent, 0
    ) / this.history.length;

    return `
📊 内存监控报告
===============
监控记录: ${this.history.length} 条
时间范围: ${new Date(this.history[0].timestamp).toLocaleString()} - ${new Date(latest.timestamp).toLocaleString()}

进程统计:
- 当前进程数: ${latest.processes.count}
- 平均进程数: ${avgProcessCount.toFixed(1)}
- 高内存进程: ${latest.processes.highMemoryCount}

内存统计:
- 当前系统内存: ${formatPercent(latest.system.usagePercent)}
- 平均系统内存: ${formatPercent(avgMemoryUsage)}

配置:
- 进程数量阈值: ${CONFIG.maxProcessCount} (警告) / ${CONFIG.criticalProcessCount} (严重)
- 内存阈值: ${formatBytes(CONFIG.maxMemoryPerProcess * 1024 * 1024)} (单进程) / ${CONFIG.criticalSystemMemory}% (系统)
- 自动清理: ${CONFIG.autoCleanup ? '启用' : '禁用'}
`;
  }
}

// ==================== 主程序 ====================
let reportManager: ReportManager;

function startMonitoring(): void {
  log('自动化内存监控器启动', 'success');
  log(`配置: 检查间隔=${CONFIG.checkInterval}ms, 自动清理=${CONFIG.autoCleanup}`, 'info');

  reportManager = new ReportManager();

  // 立即执行一次检查
  const metrics = getSystemMetrics();
  metrics.actions = analyzeMetrics(metrics);
  displayMetrics(metrics);
  reportManager.addMetrics(metrics);

  // 定期检查
  const intervalId = setInterval(() => {
    const metrics = getSystemMetrics();
    metrics.actions = analyzeMetrics(metrics);
    displayMetrics(metrics);
    reportManager.addMetrics(metrics);

    // 如果有操作，记录到日志
    if (metrics.actions.length > 0) {
      metrics.actions.forEach(action => log(action, 'warn'));
    }
  }, CONFIG.checkInterval);

  // 优雅退出
  process.on('SIGINT', () => {
    console.log('\n\n');
    log('正在停止监控器...', 'info');
    clearInterval(intervalId);

    // 生成最终报告
    console.log(reportManager.generateReport());

    log('监控器已停止', 'success');
    process.exit(0);
  });

  // 处理未捕获的异常
  process.on('uncaughtException', (error) => {
    log(`未捕获的异常: ${error.message}`, 'error');
    clearInterval(intervalId);
    process.exit(1);
  });
}

// 启动监控
if (require.main === module) {
  startMonitoring();
}

export { findNodeProcesses, killProcess, getSystemMetrics, ReportManager };
