#!/usr/bin/env node

/**
 * 内存监控脚本
 * 用于监控 Node.js 进程的内存使用情况，在达到阈值时发出警告
 */

const os = require('os');
const { execSync } = require('child_process');

// 配置
const CONFIG = {
  checkInterval: 5000, // 5秒检查一次
  warningThreshold: 0.7, // 70% 内存使用率触发警告
  criticalThreshold: 0.85, // 85% 内存使用率触发严重警告
  logFile: './logs/ai-assist/memory-monitor.log',
  alertSound: true, // 是否发出提示音
};

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
};

function formatBytes(bytes) {
  return (bytes / 1024 / 1024).toFixed(2) + ' MB';
}

function formatPercent(percent) {
  return (percent * 100).toFixed(1) + '%';
}

function getMemoryUsage() {
  const usage = process.memoryUsage();
  const total = usage.heapTotal;
  const used = usage.heapUsed;
  const external = usage.external;
  const arrayBuffers = usage.arrayBuffers || 0;

  return {
    heapUsed: used,
    heapTotal: total,
    external: external,
    arrayBuffers: arrayBuffers,
    usagePercent: used / total,
  };
}

function getSystemMemory() {
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;

  return {
    total: totalMem,
    used: usedMem,
    free: freeMem,
    usagePercent: usedMem / totalMem,
  };
}

function findNodeProcesses() {
  try {
    const isWindows = os.platform() === 'win32';

    if (isWindows) {
      // Windows: 使用 tasklist
      const output = execSync('tasklist /FI "IMAGENAME eq node.exe" /FO CSV', {
        encoding: 'utf-8',
      });
      return output.split('\n').slice(1).filter(line => line.trim());
    } else {
      // Unix: 使用 ps
      const output = execSync('ps aux | grep node | grep -v grep', {
        encoding: 'utf-8',
      });
      return output.split('\n').filter(line => line.trim());
    }
  } catch (error) {
    return [];
  }
}

function log(message, level = 'info') {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] [${level.toUpperCase()}] ${message}\n`;

  // 输出到控制台
  const color =
    level === 'error' ? colors.red :
    level === 'warn' ? colors.yellow :
    level === 'success' ? colors.green :
    colors.blue;

  console.log(`${color}${logEntry.trim()}${colors.reset}`);

  // 输出到日志文件
  try {
    const fs = require('fs');
    const path = require('path');
    const logDir = path.dirname(CONFIG.logFile);

    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    fs.appendFileSync(CONFIG.logFile, logEntry);
  } catch (error) {
    // 忽略日志写入错误
  }
}

function showAlert() {
  if (CONFIG.alertSound) {
    try {
      const isWindows = os.platform() === 'win32';
      if (isWindows) {
        execSync('powershell -c (New-Object Media.SoundPlayer).PlaySync()', {
          stdio: 'ignore',
        });
      } else {
        execSync('afplay /System/Library/Sounds/Glass.aiff 2>/dev/null || echo -e "\a"', {
          stdio: 'ignore',
        });
      }
    } catch (error) {
      // 忽略音频播放错误
    }
  }
}

function displayMemoryBar(used, total, width = 40) {
  const filled = Math.round((used / total) * width);
  const empty = width - filled;

  const barChar = '█';
  const emptyChar = '░';

  let bar = '';
  const percent = used / total;

  if (percent >= CONFIG.criticalThreshold) {
    bar += colors.red;
  } else if (percent >= CONFIG.warningThreshold) {
    bar += colors.yellow;
  } else {
    bar += colors.green;
  }

  bar += barChar.repeat(filled) + emptyChar.repeat(empty) + colors.reset;

  return bar;
}

let alertShown = false;

function checkMemory() {
  const mem = getMemoryUsage();
  const sysMem = getSystemMemory();
  const nodeProcesses = findNodeProcesses();

  console.clear();

  // 标题
  console.log(colors.blue + '='.repeat(60) + colors.reset);
  console.log(colors.blue + '  内存监控器 - Memory Monitor' + colors.reset);
  console.log(colors.blue + '='.repeat(60) + colors.reset);
  console.log('');

  // 进程内存
  console.log('📊 进程内存 (Process Memory):');
  console.log(`  堆内存使用: ${formatBytes(mem.heapUsed)} / ${formatBytes(mem.heapTotal)}`);
  console.log(`  使用率:    ${formatPercent(mem.usagePercent)}`);
  console.log(`  ${displayMemoryBar(mem.heapUsed, mem.heapTotal)}`);
  console.log(`  外部内存:  ${formatBytes(mem.external)}`);
  console.log(`  ArrayBuffers: ${formatBytes(mem.arrayBuffers)}`);
  console.log('');

  // 系统内存
  console.log('💻 系统内存 (System Memory):');
  console.log(`  已用: ${formatBytes(sysMem.used)} / ${formatBytes(sysMem.total)}`);
  console.log(`  可用: ${formatBytes(sysMem.free)}`);
  console.log(`  使用率: ${formatPercent(sysMem.usagePercent)}`);
  console.log(`  ${displayMemoryBar(sysMem.used, sysMem.total)}`);
  console.log('');

  // Node.js 进程
  console.log('🔍 Node.js 进程:');
  if (nodeProcesses.length > 0) {
    console.log(`  检测到 ${nodeProcesses.length} 个 Node.js 进程`);
    nodeProcesses.slice(0, 5).forEach((proc, index) => {
      console.log(`  ${index + 1}. ${proc.substring(0, 80)}...`);
    });
    if (nodeProcesses.length > 5) {
      console.log(`  ... 还有 ${nodeProcesses.length - 5} 个进程`);
    }
  } else {
    console.log('  未检测到 Node.js 进程');
  }
  console.log('');

  // 状态和建议
  console.log('📈 状态和建议:');

  if (mem.usagePercent >= CONFIG.criticalThreshold) {
    console.log(colors.red + '  ⚠️  严重警告：内存使用率过高！' + colors.reset);
    console.log(colors.red + '  建议：' + colors.reset);
    console.log('    1. 立即重启开发服务器');
    console.log('    2. 检查是否有内存泄漏');
    console.log('    3. 考虑增加 --max-old-space-size 限制');

    if (!alertShown) {
      showAlert();
      alertShown = true;
      log('内存使用率达到严重阈值', 'error');
    }
  } else if (mem.usagePercent >= CONFIG.warningThreshold) {
    console.log(colors.yellow + '  ⚠️  警告：内存使用率较高' + colors.reset);
    console.log(colors.yellow + '  建议：' + colors.reset);
    console.log('    1. 监控内存使用趋势');
    console.log('    2. 考虑重启开发服务器');
    console.log('    3. 检查是否有未清理的资源');

    if (!alertShown) {
      alertShown = true;
      log('内存使用率达到警告阈值', 'warn');
    }
  } else {
    console.log(colors.green + '  ✅ 内存使用正常' + colors.reset);
    alertShown = false;
  }

  console.log('');
  console.log(colors.blue + '按 Ctrl+C 退出监控' + colors.reset);
  console.log(colors.blue + '='.repeat(60) + colors.reset);
}

function startMonitoring() {
  log('内存监控器启动', 'info');

  // 立即执行一次检查
  checkMemory();

  // 定期检查
  const intervalId = setInterval(checkMemory, CONFIG.checkInterval);

  // 优雅退出
  process.on('SIGINT', () => {
    console.log('\n\n');
    log('内存监控器停止', 'info');
    clearInterval(intervalId);
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

module.exports = { getMemoryUsage, getSystemMemory, checkMemory };
