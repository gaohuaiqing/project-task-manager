#!/usr/bin/env node

/**
 * 进程清理脚本
 * 用于清理可能导致内存问题的 Node.js 进程
 */

const { execSync } = require('child_process');
const os = require('os');

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function findNodeProcesses() {
  try {
    const platform = os.platform();
    let command;

    if (platform === 'win32') {
      command = 'tasklist /FI "IMAGENAME eq node.exe" /FO CSV';
    } else {
      command = 'ps aux | grep -E "node|vite|tsx" | grep -v grep';
    }

    const output = execSync(command, { encoding: 'utf-8' });
    return output.trim().split('\n').filter(line => line.trim());
  } catch (error) {
    return [];
  }
}

function killProcess(pid, signal = 'SIGTERM') {
  try {
    const platform = os.platform();
    let command;

    if (platform === 'win32') {
      command = `taskkill /F /PID ${pid}`;
    } else {
      command = `kill -${signal} ${pid}`;
    }

    execSync(command, { stdio: 'ignore' });
    return true;
  } catch (error) {
    return false;
  }
}

function extractPid(line) {
  // Unix: ps aux 输出格式
  const unixMatch = line.match(/^\s*(\d+)/);
  if (unixMatch) return unixMatch[1];

  // Windows: tasklist CSV 输出格式
  const winMatch = line.match(/"node\.exe",\s*"(\d+)"/);
  if (winMatch) return winMatch[1];

  return null;
}

function cleanup() {
  log('\n' + '='.repeat(60), colors.blue);
  log('  进程清理工具 - Process Cleanup', colors.blue);
  log('='.repeat(60) + '\n', colors.blue);

  // 查找进程
  log('🔍 正在查找 Node.js 进程...', colors.blue);
  const processes = findNodeProcesses();

  if (processes.length === 0) {
    log('✅ 未发现需要清理的 Node.js 进程', colors.green);
    return;
  }

  log(`\n发现 ${processes.length} 个进程:`, colors.yellow);
  processes.forEach((proc, index) => {
    log(`  ${index + 1}. ${proc.substring(0, 80)}...`, colors.reset);
  });

  // 提取 PID
  const pids = processes
    .map(extractPid)
    .filter(pid => pid !== null);

  if (pids.length === 0) {
    log('\n⚠️  无法提取进程 ID', colors.yellow);
    return;
  }

  log(`\n提取到 ${pids.length} 个进程 ID: ${pids.join(', ')}`, colors.yellow);

  // 询问确认
  log('\n⚠️  即将终止以上进程', colors.red);
  log('提示: 这个操作是安全的，只是终止开发服务器进程\n', colors.reset);

  try {
    // 尝试优雅终止
    log('📤 发送 SIGTERM 信号...', colors.blue);
    pids.forEach(pid => {
      if (killProcess(pid, 'TERM')) {
        log(`  ✅ 进程 ${pid} 已终止`, colors.green);
      } else {
        log(`  ⚠️  进程 ${pid} 终止失败`, colors.yellow);
      }
    });

    // 等待进程退出
    log('\n⏳ 等待进程退出...', colors.blue);
    setTimeout(() => {
      // 检查是否还有残留进程
      const remaining = findNodeProcesses();
      const remainingPids = remaining
        .map(extractPid)
        .filter(pid => pid !== null && pids.includes(pid));

      if (remainingPids.length > 0) {
        log(`\n⚠️  发现 ${remainingPids.length} 个残留进程，强制终止...`, colors.yellow);
        remainingPids.forEach(pid => {
          if (killProcess(pid, 'KILL')) {
            log(`  ✅ 进程 ${pid} 已强制终止`, colors.green);
          }
        });
      }

      log('\n✅ 清理完成！\n', colors.green);
      log('💡 提示:', colors.blue);
      log('  1. 清理了所有 Node.js 开发服务器进程');
      log('  2. 现在可以重新启动开发服务器');
      log('  3. 使用 "npm run dev" 启动\n', colors.reset);
    }, 2000);

  } catch (error) {
    log(`\n❌ 清理过程中发生错误: ${error.message}`, colors.red);
    process.exit(1);
  }
}

// 导出函数供其他模块使用
module.exports = { findNodeProcesses, killProcess, extractPid, cleanup };

// 直接运行时执行清理
if (require.main === module) {
  cleanup();
}
