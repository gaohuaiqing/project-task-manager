/**
 * 完整自动化测试脚本
 *
 * 功能：
 * 1. 检查环境（Node.js、MySQL）
 * 2. 初始化数据库
 * 3. 启动服务器
 * 4. 运行API测试
 * 5. 运行压力测试
 * 6. 生成测试报告
 *
 * 使用方法：
 * npm run test:all
 */

import { spawn } from 'child_process';
import { performance } from 'perf_hooks';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 测试结果
interface TestSuiteResult {
  name: string;
  status: 'pending' | 'running' | 'passed' | 'failed';
  duration: number;
  output: string;
  error?: string;
}

interface TestReport {
  startTime: number;
  endTime: number;
  totalDuration: number;
  suites: TestSuiteResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    successRate: number;
  };
}

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

function log(color: keyof typeof colors, message: string) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logTest(message: string) {
  console.log(`  ${message}`);
}

// 执行命令
function executeCommand(
  command: string,
  args: string[],
  cwd?: string
): Promise<{ stdout: string; stderr: string; exitCode: number | null }> {
  return new Promise((resolve) => {
    const proc = spawn(command, args, { cwd, shell: true });
    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('close', (exitCode) => {
      resolve({ stdout, stderr, exitCode });
    });
  });
}

// 检查环境
async function checkEnvironment(): Promise<boolean> {
  log('cyan', '\n🔍 步骤1: 检查环境...\n');

  // 检查Node.js版本
  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);

  if (majorVersion < 16) {
    log('red', `❌ Node.js版本过低: ${nodeVersion} (需要 >= 16.0)`);
    return false;
  }
  log('green', `✅ Node.js版本: ${nodeVersion}`);

  // 检查MySQL
  try {
    const { stdout } = await executeCommand('mysql', ['--version']);
    log('green', `✅ MySQL已安装: ${stdout.trim()}`);
  } catch (error) {
    log('red', '❌ MySQL未安装或未启动');
    log('yellow', '   请先安装并启动MySQL服务');
    return false;
  }

  // 检查依赖
  const packageJsonPath = path.join(__dirname, '../package.json');
  if (!fs.existsSync(packageJsonPath)) {
    log('red', '❌ package.json不存在');
    return false;
  }

  const nodeModulesPath = path.join(__dirname, '../node_modules');
  if (!fs.existsSync(nodeModulesPath)) {
    log('yellow', '⚠️  node_modules不存在，正在安装依赖...');
    await executeCommand('npm', ['install'], path.dirname(packageJsonPath));
  }

  log('green', '✅ 依赖已安装');

  return true;
}

// 数据库迁移
async function runDatabaseMigration(): Promise<TestSuiteResult> {
  log('cyan', '\n🗄️  步骤2: 数据库迁移...\n');

  const result: TestSuiteResult = {
    name: '数据库迁移',
    status: 'running',
    duration: 0,
    output: ''
  };

  const startTime = performance.now();

  try {
    // 运行迁移脚本
    const { stdout, stderr, exitCode } = await executeCommand(
      'npx',
      ['tsx', 'scripts/migrate.ts', 'up'],
      path.join(__dirname, '..')
    );

    result.output = stdout + stderr;
    result.duration = performance.now() - startTime;

    if (exitCode === 0) {
      result.status = 'passed';
      log('green', '✅ 数据库迁移成功');
      logTest(result.output);
    } else {
      result.status = 'failed';
      result.error = stderr;
      log('red', '❌ 数据库迁移失败');
      logTest(stderr);
    }
  } catch (error: any) {
    result.status = 'failed';
    result.error = error.message;
    result.duration = performance.now() - startTime;
    log('red', `❌ 数据库迁移异常: ${error.message}`);
  }

  return result;
}

// 启动服务器
async function startServer(): Promise<{ pid: number; success: boolean }> {
  log('cyan', '\n🚀 步骤3: 启动服务器...\n');

  const serverPath = path.join(__dirname, '../dist/index.js');

  // 检查是否需要编译
  if (!fs.existsSync(serverPath)) {
    log('yellow', '⚠️  需要先编译服务器代码...');
    const { exitCode } = await executeCommand('npm', ['run', 'build'], path.join(__dirname, '..'));
    if (exitCode !== 0) {
      log('red', '❌ 编译失败');
      return { pid: 0, success: false };
    }
  }

  // 启动服务器（后台）
  const proc = spawn('node', ['dist/index.js'], {
    cwd: path.join(__dirname, '..'),
    shell: true,
    detached: true,
    stdio: 'ignore',
    env: { ...process.env, NODE_ENV: 'test' }
  });

  proc.unref();

  // 等待服务器启动（增加等待时间并多次重试）
  log('yellow', '⏳ 等待服务器启动...');

  let serverReady = false;
  for (let i = 0; i < 10; i++) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    try {
      const response = await fetch('http://localhost:3001/health');
      if (response.ok) {
        serverReady = true;
        break;
      }
    } catch (error) {
      // 继续重试
      logTest(`   尝试 ${i + 1}/10...`);
    }
  }

  if (serverReady) {
    log('green', '✅ 服务器启动成功');
    logTest(`   进程ID: ${proc.pid}`);
    return { pid: proc.pid || -1, success: true };
  } else {
    log('red', '❌ 服务器启动失败（10秒超时）');
    return { pid: 0, success: false };
  }
}

// 停止服务器
async function stopServer(pid: number): Promise<void> {
  try {
    process.kill(pid);
    log('yellow', '⏹️  服务器已停止');
  } catch (error) {
    // 忽略错误
  }
}

// 运行API测试
async function runApiTests(): Promise<TestSuiteResult> {
  log('cyan', '\n🧪 步骤4: API测试...\n');

  const result: TestSuiteResult = {
    name: 'API功能测试',
    status: 'running',
    duration: 0,
    output: ''
  };

  const startTime = performance.now();

  try {
    // 运行API测试脚本
    const { stdout, stderr, exitCode } = await executeCommand(
      'npx',
      ['tsx', 'tests/api.test.ts'],
      path.join(__dirname, '..')
    );

    result.output = stdout + stderr;
    result.duration = performance.now() - startTime;

    // 解析结果
    const passed = (stdout.match(/✅/g) || []).length;
    const failed = (stdout.match(/❌/g) || []).length;

    if (failed === 0) {
      result.status = 'passed';
      log('green', `✅ API测试通过 (${passed} 个测试)`);
    } else {
      result.status = 'failed';
      log('yellow', `⚠️  API测试部分失败 (通过: ${passed}, 失败: ${failed})`);
    }

    // 显示详细输出
    if (stdout.includes('✅') || stdout.includes('❌')) {
      logTest('测试结果:');
      stdout.split('\n').forEach(line => {
        if (line.includes('✅') || line.includes('❌')) {
          logTest(line);
        }
      });
    }
  } catch (error: any) {
    result.status = 'failed';
    result.error = error.message;
    result.duration = performance.now() - startTime;
    log('red', `❌ API测试异常: ${error.message}`);
  }

  return result;
}

// 运行压力测试
async function runLoadTests(): Promise<TestSuiteResult> {
  log('cyan', '\n⚡ 步骤5: 压力测试...\n');

  const result: TestSuiteResult = {
    name: '压力测试',
    status: 'running',
    duration: 0,
    output: ''
  };

  const startTime = performance.now();

  try {
    const { stdout, stderr, exitCode } = await executeCommand(
      'npx',
      ['tsx', 'scripts/load-test.ts'],
      path.join(__dirname, '..')
    );

    result.output = stdout + stderr;
    result.duration = performance.now() - startTime;

    // 解析结果
    if (stdout.includes('✅ 压力测试完成')) {
      result.status = 'passed';
      log('green', '✅ 压力测试完成');
    } else {
      result.status = 'failed';
      log('yellow', '⚠️  压力测试未完全通过');
    }

    // 显示关键指标
    const lines = stdout.split('\n');
    lines.forEach(line => {
      if (line.includes('总请求数') || line.includes('吞吐量') || line.includes('错误率')) {
        logTest(line.trim());
      }
    });
  } catch (error: any) {
    result.status = 'failed';
    result.error = error.message;
    result.duration = performance.now() - startTime;
    log('red', `❌ 压力测试异常: ${error.message}`);
  }

  return result;
}

// 生成测试报告
async function generateReport(report: TestReport): Promise<void> {
  log('cyan', '\n📊 步骤6: 生成测试报告...\n');

  const reportPath = path.join(__dirname, '../test-report.md');
  const timestamp = new Date().toLocaleString('zh-CN');

  const markdown = `# MySQL主存储架构 - 自动化测试报告

> 生成时间: ${timestamp}
> 测试耗时: ${(report.totalDuration / 1000).toFixed(2)} 秒

---

## 📈 测试概览

| 指标 | 数值 |
|------|------|
| 总测试套件 | ${report.summary.total} |
| 通过套件 | ${report.summary.passed} |
| 失败套件 | ${report.summary.failed} |
| 成功率 | ${report.summary.successRate.toFixed(2)}% |
| 总耗时 | ${(report.totalDuration / 1000).toFixed(2)} 秒 |

---

## 📋 测试详情

### ${report.suites[0].status === 'passed' ? '✅' : '❌'} ${report.suites[0].name}

**状态**: ${report.suites[0].status.toUpperCase()}
**耗时**: ${(report.suites[0].duration / 1000).toFixed(2)} 秒

\`\`\`
${report.suites[0].output}
\`\`\`

---

### ${report.suites[1].status === 'passed' ? '✅' : '❌'} ${report.suites[1].name}

**状态**: ${report.suites[1].status.toUpperCase()}
**耗时**: ${(report.suites[1].duration / 1000).toFixed(2)} 秒

**关键指标**:
- 成功请求: ${report.suites[1].output.match(/成功请求: \d+/)?.[0].split(': ')[1] || 'N/A'}
- 失败请求: ${report.suites[1].output.match(/失败请求: \d+/)?.[0].split(': ')[1] || 'N/A'}
- 吞吐量: ${report.suites[1].output.match(/吞吐量: [\d.]+/)?.[0].split(': ')[1] || 'N/A'}

---

### ${report.suites[2].status === 'passed' ? '✅' : '❌'} ${report.suites[2].name}

**状态**: ${report.suites[2].status.toUpperCase()}
**耗时**: ${(report.suites[2].duration / 1000).toFixed(2)} 秒

\`\`\`
${report.suites[2].output.substring(0, 500)}...
\`\`\`

---

## 🎯 性能评估

| 项目 | 目标 | 实际 | 评级 |
|------|------|------|------|
| 平均响应时间 | <200ms | TBD | - |
| 吞吐量 | >50 req/s | TBD | - |
| 错误率 | <5% | TBD | - |
| 并发冲突处理 | 正常 | TBD | - |

---

## 💡 建议

${report.summary.failed > 0 ? '⚠️ 存在失败的测试，请查看详细日志并进行修复。' : '✅ 所有测试通过，系统可以投入生产使用。'}

---

*报告由自动化测试脚本生成*
`;

  fs.writeFileSync(reportPath, markdown, 'utf-8');
  log('green', `✅ 测试报告已生成: ${reportPath}`);
}

// 主测试流程
async function runAllTests(): Promise<TestReport> {
  const report: TestReport = {
    startTime: Date.now(),
    endTime: 0,
    totalDuration: 0,
    suites: [],
    summary: {
      total: 0,
      passed: 0,
      failed: 0,
      successRate: 0
    }
  };

  console.log(colors.cyan + colors.bright);
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║         MySQL主存储架构 - 完整自动化测试                       ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝');
  console.log(colors.reset);

  // 1. 检查环境
  const envOk = await checkEnvironment();
  if (!envOk) {
    log('red', '\n❌ 环境检查失败，测试终止');
    return report;
  }

  // 2. 数据库迁移
  const migrationResult = await runDatabaseMigration();
  report.suites.push(migrationResult);

  if (migrationResult.status === 'failed') {
    log('red', '\n❌ 数据库迁移失败，测试终止');
    return report;
  }

  // 3. 启动服务器
  const server = await startServer();
  if (!server.success) {
    log('red', '\n❌ 服务器启动失败，测试终止');
    return report;
  }

  try {
    // 等待服务器完全启动
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 4. API测试
    const apiResult = await runApiTests();
    report.suites.push(apiResult);

    // 5. 压力测试
    const loadResult = await runLoadTests();
    report.suites.push(loadResult);

  } finally {
    // 6. 清理
    log('cyan', '\n🧹 清理环境...\n');
    await stopServer(server.pid);
  }

  // 计算统计
  report.endTime = Date.now();
  report.totalDuration = report.endTime - report.startTime;
  report.summary.total = report.suites.length;
  report.summary.passed = report.suites.filter(s => s.status === 'passed').length;
  report.summary.failed = report.suites.filter(s => s.status === 'failed').length;
  report.summary.successRate = (report.summary.passed / report.summary.total) * 100;

  // 生成报告
  await generateReport(report);

  // 打印总结
  console.log(colors.cyan + colors.bright);
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║                      测试完成                                    ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝');
  console.log(colors.reset);

  console.log(`\n📊 测试总结:`);
  console.log(`   总测试套件: ${report.summary.total}`);
  console.log(`   通过: ${colors.green}${report.summary.passed}${colors.reset}`);
  console.log(`   失败: ${report.summary.failed > 0 ? colors.red : ''}${report.summary.failed}${colors.reset}`);
  console.log(`   成功率: ${report.summary.successRate.toFixed(2)}%`);
  console.log(`   总耗时: ${(report.totalDuration / 1000).toFixed(2)} 秒`);

  if (report.summary.failed === 0) {
    console.log(colors.green + colors.bright + '\n🎉 所有测试通过！系统已准备就绪。' + colors.reset);
  } else {
    console.log(colors.yellow + '\n⚠️  存在失败的测试，请查看测试报告。' + colors.reset);
  }

  return report;
}

// 执行测试
runAllTests()
  .then((report) => {
    process.exit(report.summary.failed > 0 ? 1 : 0);
  })
  .catch((error) => {
    console.error(colors.red + '\n❌ 测试运行失败:', error);
    console.error(colors.reset);
    process.exit(1);
  });
