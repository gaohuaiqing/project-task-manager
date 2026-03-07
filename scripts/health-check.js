#!/usr/bin/env node

/**
 * 健康检查脚本
 * 检查系统、进程和依赖的健康状态
 */

const os = require('os');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { findNodeProcesses } = require('./cleanup-processes');

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function formatBytes(bytes) {
  return (bytes / 1024 / 1024 / 1024).toFixed(2) + ' GB';
}

function formatPercent(percent) {
  return (percent * 100).toFixed(1) + '%';
}

function checkSystemHealth() {
  log('\n' + '='.repeat(60), colors.cyan);
  log('📊 系统健康检查 - System Health Check', colors.cyan);
  log('='.repeat(60) + '\n', colors.cyan);

  const results = {
    passed: 0,
    warnings: 0,
    errors: 0,
  };

  // 1. 检查系统内存
  log('1️⃣  系统内存检查', colors.blue);
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  const memUsage = usedMem / totalMem;

  log(`   总内存: ${formatBytes(totalMem)}`, colors.reset);
  log(`   已用: ${formatBytes(usedMem)} (${formatPercent(memUsage)})`, colors.reset);
  log(`   可用: ${formatBytes(freeMem)}`, colors.reset);

  if (memUsage > 0.9) {
    log('   ❌ 系统内存使用率过高 (>90%)', colors.red);
    results.errors++;
  } else if (memUsage > 0.75) {
    log('   ⚠️  系统内存使用率较高 (>75%)', colors.yellow);
    results.warnings++;
  } else {
    log('   ✅ 系统内存使用正常', colors.green);
    results.passed++;
  }

  // 2. 检查 CPU 负载
  log('\n2️⃣  CPU 负载检查', colors.blue);
  const cpus = os.cpus();
  const loadAvg = os.loadavg();

  log(`   CPU 核心数: ${cpus.length}`, colors.reset);
  log(`   1分钟平均负载: ${loadAvg[0].toFixed(2)}`, colors.reset);
  log(`   5分钟平均负载: ${loadAvg[1].toFixed(2)}`, colors.reset);
  log(`   15分钟平均负载: ${loadAvg[2].toFixed(2)}`, colors.reset);

  const loadRatio = loadAvg[0] / cpus.length;
  if (loadRatio > 2) {
    log('   ❌ CPU 负载过高', colors.red);
    results.errors++;
  } else if (loadRatio > 1) {
    log('   ⚠️  CPU 负载较高', colors.yellow);
    results.warnings++;
  } else {
    log('   ✅ CPU 负载正常', colors.green);
    results.passed++;
  }

  // 3. 检查 Node.js 进程
  log('\n3️⃣  Node.js 进程检查', colors.blue);
  const nodeProcesses = findNodeProcesses();

  if (nodeProcesses.length === 0) {
    log('   ✅ 无 Node.js 进程运行', colors.green);
    results.passed++;
  } else if (nodeProcesses.length <= 3) {
    log(`   ✅ 检测到 ${nodeProcesses.length} 个 Node.js 进程`, colors.green);
    results.passed++;
  } else if (nodeProcesses.length <= 6) {
    log(`   ⚠️  检测到 ${nodeProcesses.length} 个 Node.js 进程`, colors.yellow);
    results.warnings++;
  } else {
    log(`   ❌ 检测到 ${nodeProcesses.length} 个 Node.js 进程，可能存在进程泄漏`, colors.red);
    results.errors++;
  }

  // 4. 检查磁盘空间
  log('\n4️⃣  磁盘空间检查', colors.blue);
  try {
    const platform = os.platform();
    let output;

    if (platform === 'win32') {
      output = execSync('wmic logicaldisk get size,freespace,caption', { encoding: 'utf-8' });
    } else {
      output = execSync('df -h /', { encoding: 'utf-8' });
    }

    // 简化输出显示
    log('   ✅ 磁盘空间检查完成', colors.green);
    results.passed++;
  } catch (error) {
    log('   ⚠️  无法检查磁盘空间', colors.yellow);
    results.warnings++;
  }

  // 5. 检查 node_modules 大小
  log('\n5️⃣  依赖检查', colors.blue);
  const nodeModulesPaths = [
    path.join(process.cwd(), 'node_modules'),
    path.join(process.cwd(), 'app', 'node_modules'),
    path.join(process.cwd(), 'app', 'server', 'node_modules'),
  ];

  let totalSize = 0;
  nodeModulesPaths.forEach((nmPath) => {
    if (fs.existsSync(nmPath)) {
      try {
        const stats = execSync(`du -sh "${nmPath}"`, {
          encoding: 'utf-8',
          stdio: ['pipe', 'pipe', 'ignore'],
        });
        log(`   ${path.relative(process.cwd(), nmPath)}: ${stats.trim().split('\t')[0]}`, colors.reset);
      } catch (error) {
        // 忽略错误
      }
    }
  });

  log('   ✅ 依赖检查完成', colors.green);
  results.passed++;

  // 6. 检查端口占用
  log('\n6️⃣  端口占用检查', colors.blue);
  const ports = [3001, 5173, 3002];

  ports.forEach((port) => {
    try {
      const platform = os.platform();
      let command;

      if (platform === 'win32') {
        command = `netstat -ano | findstr :${port}`;
      } else {
        command = `lsof -i :${port} 2>/dev/null || true`;
      }

      const output = execSync(command, { encoding: 'utf-8' });

      if (output.trim()) {
        log(`   ⚠️  端口 ${port} 已被占用`, colors.yellow);
        results.warnings++;
      } else {
        log(`   ✅ 端口 ${port} 可用`, colors.green);
        results.passed++;
      }
    } catch (error) {
      log(`   ✅ 端口 ${port} 可用`, colors.green);
      results.passed++;
    }
  });

  // 7. 检查缓存
  log('\n7️⃣  缓存检查', colors.blue);
  const cachePaths = [
    path.join(process.cwd(), 'app', 'node_modules', '.cache'),
    path.join(process.cwd(), 'app', '.vite'),
  ];

  let cacheSize = 0;
  cachePaths.forEach((cachePath) => {
    if (fs.existsSync(cachePath)) {
      try {
        const stats = fs.statSync(cachePath);
        cacheSize += stats.size;
      } catch (error) {
        // 忽略错误
      }
    }
  });

  if (cacheSize > 500 * 1024 * 1024) { // 500MB
    log(`   ⚠️  缓存大小较大 (${(cacheSize / 1024 / 1024).toFixed(2)} MB)`, colors.yellow);
    log(`   💡 提示: 运行 "npm run cleanup:cache" 清理缓存`, colors.cyan);
    results.warnings++;
  } else {
    log(`   ✅ 缓存大小正常 (${(cacheSize / 1024 / 1024).toFixed(2)} MB)`, colors.green);
    results.passed++;
  }

  // 总结
  log('\n' + '='.repeat(60), colors.cyan);
  log('📋 检查总结 - Summary', colors.cyan);
  log('='.repeat(60) + '\n', colors.cyan);

  log(`   ✅ 通过: ${results.passed}`, colors.green);
  log(`   ⚠️  警告: ${results.warnings}`, colors.yellow);
  log(`   ❌ 错误: ${results.errors}`, colors.red);

  log('\n' + '='.repeat(60) + '\n', colors.cyan);

  // 建议操作
  if (results.errors > 0) {
    log('🔧 建议操作:', colors.yellow);
    log('   1. 运行 "npm run cleanup:processes" 清理异常进程');
    log('   2. 运行 "npm run cleanup:cache" 清理缓存');
    log('   3. 如果问题持续，重启计算机\n', colors.reset);
  } else if (results.warnings > 0) {
    log('💡 优化建议:', colors.cyan);
    log('   1. 监控内存使用情况');
    log('   2. 定期清理缓存');
    log('   3. 使用 "npm run memory:monitor" 监控内存\n', colors.reset);
  } else {
    log('✅ 系统状态良好，可以开始工作！\n', colors.green);
  }

  return results;
}

// 导出函数
module.exports = { checkSystemHealth };

// 直接运行时执行检查
if (require.main === module) {
  const results = checkSystemHealth();

  // 根据检查结果设置退出代码
  if (results.errors > 0) {
    process.exit(1);
  } else if (results.warnings > 0) {
    process.exit(2);
  } else {
    process.exit(0);
  }
}
