/**
 * E2E 并行测试执行脚本
 *
 * 功能：
 * 1. 同时启动多个AI代理，每个负责一个功能模块
 * 2. 完全自动化执行，无需人工确认
 * 3. 汇总测试结果并生成详细报告
 * 4. 测试过程不修改原有代码
 */

import { spawn, ChildProcess } from 'child_process';
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { E2ETestOrchestrator, E2ETestReport } from './orchestrator';
import { TestReportGenerator } from './test-reporter';

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

// 测试代理配置
interface TestAgent {
  id: string;
  name: string;
  module: string;
  testFiles: string[];
  color: keyof typeof colors;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startTime?: number;
  endTime?: number;
  output: string[];
}

// 并行测试执行器
export class ParallelTestRunner {
  private agents: Map<string, TestAgent> = new Map();
  private processes: Map<string, ChildProcess> = new Map();
  private testDir: string;
  private reportDir: string;
  private runId: string;

  constructor(
    testDir: string = join(process.cwd(), 'Test', 'E2E_AutoTest'),
    reportDir: string = join(process.cwd(), 'Test', 'E2E_AutoTest', 'reports')
  ) {
    this.testDir = testDir;
    this.reportDir = reportDir;
    this.runId = `run-${Date.now()}`;

    if (!existsSync(this.reportDir)) {
      mkdirSync(this.reportDir, { recursive: true });
    }
  }

  /**
   * 初始化所有测试代理
   */
  private initializeAgents(): void {
    const agentConfigs: TestAgent[] = [
      {
        id: 'auth-agent',
        name: '认证模块测试代理',
        module: 'AUTH',
        testFiles: ['tests/auth/login.spec.ts', 'tests/auth/logout.spec.ts', 'tests/auth/session.spec.ts'],
        color: 'green',
        status: 'pending',
        output: [],
      },
      {
        id: 'dashboard-agent',
        name: '仪表盘模块测试代理',
        module: 'DASHBOARD',
        testFiles: ['tests/dashboard/dashboard.spec.ts'],
        color: 'blue',
        status: 'pending',
        output: [],
      },
      {
        id: 'projects-agent',
        name: '项目管理模块测试代理',
        module: 'PROJECTS',
        testFiles: ['tests/projects/project-creation.spec.ts', 'tests/projects/project-deletion.spec.ts'],
        color: 'cyan',
        status: 'pending',
        output: [],
      },
      {
        id: 'tasks-agent',
        name: '任务管理模块测试代理',
        module: 'TASKS',
        testFiles: ['tests/tasks/task-creation.spec.ts', 'tests/tasks/task-status.spec.ts'],
        color: 'yellow',
        status: 'pending',
        output: [],
      },
      {
        id: 'gantt-agent',
        name: '甘特图模块测试代理',
        module: 'GANTT',
        testFiles: ['tests/gantt/gantt-view.spec.ts'],
        color: 'bright',
        status: 'pending',
        output: [],
      },
      {
        id: 'settings-agent',
        name: '设置管理模块测试代理',
        module: 'SETTINGS',
        testFiles: ['tests/settings/settings-management.spec.ts'],
        color: 'red',
        status: 'pending',
        output: [],
      },
      {
        id: 'organization-agent',
        name: '组织架构模块测试代理',
        module: 'ORGANIZATION',
        testFiles: ['tests/organization/organization.spec.ts'],
        color: 'gray',
        status: 'pending',
        output: [],
      },
      {
        id: 'approval-agent',
        name: '任务审批模块测试代理',
        module: 'APPROVAL',
        testFiles: ['tests/approval/approval-workflow.spec.ts'],
        color: 'cyan',
        status: 'pending',
        output: [],
      },
    ];

    for (const agent of agentConfigs) {
      this.agents.set(agent.id, agent);
    }
  }

  /**
   * 运行单个测试代理
   */
  private async runAgent(agentId: string): Promise<void> {
    const agent = this.agents.get(agentId)!;
    agent.status = 'running';
    agent.startTime = Date.now();

    this.log(agent.color, `🚀 启动 ${agent.name}`);

    return new Promise((resolve) => {
      const testFiles = agent.testFiles.join(' ');
      const args = ['playwright', 'test', testFiles, '--reporter=line'];

      const proc = spawn('npx', args, {
        cwd: this.testDir,
        shell: true,
        stdio: 'pipe',
        env: {
          ...process.env,
          NODE_ENV: 'test',
        },
      });

      this.processes.set(agentId, proc);

      let stdout = '';
      let stderr = '';

      proc.stdout?.on('data', (data) => {
        const message = data.toString();
        stdout += message;
        agent.output.push(message);

        // 实时输出重要信息
        if (message.includes('✓') || message.includes('✗') || message.includes('passed') || message.includes('failed')) {
          this.log(agent.color, `  ${message.trim()}`);
        }
      });

      proc.stderr?.on('data', (data) => {
        const message = data.toString();
        stderr += message;
        agent.output.push(`[ERROR] ${message}`);
        this.log('red', `  ❌ ${agent.name} 错误: ${message.trim()}`);
      });

      proc.on('close', (code) => {
        this.processes.delete(agentId);
        agent.endTime = Date.now();
        agent.status = code === 0 ? 'completed' : 'failed';

        const duration = ((agent.endTime! - agent.startTime!) / 1000).toFixed(1);
        const statusIcon = agent.status === 'completed' ? '✅' : '❌';

        this.log(
          agent.status === 'completed' ? 'green' : 'red',
          `${statusIcon} ${agent.name} 完成 (耗时: ${duration}秒)`
        );

        resolve();
      });

      // 设置超时（根据模块复杂度设置不同超时时间）
      const timeout = this.getTimeoutForModule(agent.module);
      setTimeout(() => {
        if (this.processes.has(agentId)) {
          proc.kill();
          agent.endTime = Date.now();
          agent.status = 'failed';
          agent.output.push(`[TIMEOUT] 测试超时 (${timeout}ms)`);

          this.log('red', `⏱️ ${agent.name} 超时 (${timeout / 1000}秒)`);
          resolve();
        }
      }, timeout);
    });
  }

  /**
   * 根据模块获取超时时间
   */
  private getTimeoutForModule(module: string): number {
    const timeouts: Record<string, number> = {
      AUTH: 300000,      // 5分钟
      DASHBOARD: 400000, // 6.5分钟
      PROJECTS: 600000,  // 10分钟
      TASKS: 600000,     // 10分钟
      GANTT: 500000,     // 8分钟
      SETTINGS: 500000,  // 8分钟
      ORGANIZATION: 400000, // 6.5分钟
      APPROVAL: 450000,  // 7.5分钟
    };

    return timeouts[module] || 300000;
  }

  /**
   * 并行运行所有测试代理
   */
  async runAll(): Promise<E2ETestReport> {
    this.initializeAgents();

    const startTime = Date.now();

    this.log('bright', '\n' + '='.repeat(80));
    this.log('bright', '🤖 E2E 并行自动化测试系统');
    this.log('bright', '='.repeat(80));
    this.log('cyan', `\n📅 Run ID: ${this.runId}`);
    this.log('cyan', `🔢 测试代理数量: ${this.agents.size}`);
    this.log('cyan', `📂 测试目录: ${this.testDir}`);
    this.log('cyan', `📄 报告目录: ${this.reportDir}\n`);

    // 并行启动所有测试代理
    this.log('bright', '🔄 启动所有测试代理...\n');

    const agentPromises = Array.from(this.agents.keys()).map((agentId) =>
      this.runAgent(agentId)
    );

    // 等待所有代理完成
    await Promise.all(agentPromises);

    const endTime = Date.now();
    const totalDuration = endTime - startTime;

    // 生成测试报告
    this.log('bright', '\n📊 生成测试报告...\n');

    const report = this.generateReport(startTime, endTime, totalDuration);
    this.saveReport(report);

    return report;
  }

  /**
   * 生成测试报告
   */
  private generateReport(startTime: number, endTime: number, totalDuration: number): E2ETestReport {
    const results = Array.from(this.agents.values()).map((agent) => {
      // 从输出中解析测试结果
      const testCases = this.parseTestOutput(agent.output);

      return {
        moduleName: agent.name,
        status: agent.status as 'passed' | 'failed',
        startTime: agent.startTime!,
        endTime: agent.endTime!,
        duration: agent.endTime! - agent.startTime!,
        testCases,
        logs: agent.output,
        screenshots: [],
        coverage: {
          uiComponents: [],
          userFlows: [],
          apiEndpoints: [],
        },
      };
    });

    const summary = {
      totalModules: results.length,
      passedModules: results.filter((r) => r.status === 'passed').length,
      failedModules: results.filter((r) => r.status === 'failed').length,
      totalTestCases: results.reduce((sum, r) => sum + r.testCases.total, 0),
      passedTestCases: results.reduce((sum, r) => sum + r.testCases.passed, 0),
      failedTestCases: results.reduce((sum, r) => sum + r.testCases.failed, 0),
      successRate: 0,
    };

    summary.successRate =
      summary.totalTestCases > 0
        ? (summary.passedTestCases / summary.totalTestCases) * 100
        : 0;

    return {
      runId: this.runId,
      startTime,
      endTime,
      totalDuration,
      results,
      summary,
      environment: {
        os: process.platform,
        nodeVersion: process.version,
        playwrightVersion: '1.50.0',
        baseURL: process.env.BASE_URL || 'http://localhost:5173',
        browsers: ['chrome', 'edge'],
      },
    };
  }

  /**
   * 从输出中解析测试结果
   */
  private parseTestOutput(output: string[]): {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
  } {
    let total = 0;
    let passed = 0;
    let failed = 0;
    let skipped = 0;

    const outputText = output.join('\n');

    // 解析Playwright输出
    const passedMatch = outputText.match(/(\d+) passed/);
    const failedMatch = outputText.match(/(\d+) failed/);
    const skippedMatch = outputText.match(/(\d+) skipped/);

    if (passedMatch) passed = parseInt(passedMatch[1], 10);
    if (failedMatch) failed = parseInt(failedMatch[1], 10);
    if (skippedMatch) skipped = parseInt(skippedMatch[1], 10);

    total = passed + failed + skipped;

    // 如果没有匹配到，尝试其他格式
    if (total === 0) {
      const testMatches = outputText.matchAll(/✓|✗|passed|failed/g);
      total = Array.from(testMatches).length;
    }

    return { total, passed, failed, skipped };
  }

  /**
   * 保存测试报告
   */
  private saveReport(report: E2ETestReport): void {
    const generator = new TestReportGenerator(this.reportDir);

    // 生成所有格式的报告
    const { html, markdown, json, junit } = generator.generateAllReports(report);

    this.log('green', `✅ HTML报告: ${html}`);
    this.log('green', `✅ Markdown报告: ${markdown}`);
    this.log('green', `✅ JSON报告: ${json}`);
    this.log('green', `✅ JUnit报告: ${junit}`);
  }

  /**
   * 停止所有测试代理
   */
  stopAll(): void {
    this.log('red', '\n⏹️  停止所有测试代理...\n');

    for (const [agentId, proc] of this.processes.entries()) {
      const agent = this.agents.get(agentId);
      proc.kill();
      this.log('yellow', `  - 已停止: ${agent?.name}`);
    }
  }

  /**
   * 彩色日志输出
   */
  private log(color: keyof typeof colors, message: string): void {
    const colorCode = colors[color] || colors.reset;
    console.log(`${colorCode}${message}${colors.reset}`);
  }

  /**
   * 打印测试摘要
   */
  printSummary(report: E2ETestReport): void {
    this.log('bright', '\n' + '='.repeat(80));
    this.log('bright', '📊 测试执行摘要');
    this.log('bright', '='.repeat(80));
    this.log('cyan', `Run ID: ${report.runId}`);
    this.log('cyan', `执行时间: ${this.formatDuration(report.totalDuration!)}`);
    this.log('cyan', `环境: ${report.environment.os} | Node ${report.environment.nodeVersion}\n`);

    this.log('bright', '模块测试结果:');
    this.log('gray', '-'.repeat(80));

    for (const result of report.results) {
      const statusIcon = result.status === 'passed' ? '✅' : '❌';
      const statusColor = result.status === 'passed' ? 'green' : 'red';
      const successRate = result.testCases.total > 0
        ? ((result.testCases.passed / result.testCases.total) * 100).toFixed(1)
        : '0.0';

      this.log(
        statusColor,
        `${statusIcon} ${result.moduleName.padEnd(25)} ` +
        `${result.testCases.passed.toString().padStart(3)}/${result.testCases.total.toString().padEnd(3)} 通过 ` +
        `(${successRate}%) ` +
        `${this.formatDuration(result.duration).padStart(10)}`
      );
    }

    this.log('gray', '-'.repeat(80));
    this.log('bright', '总计:');
    this.log('green', `  ✅ 模块: ${report.summary.passedModules}/${report.summary.totalModules}`);
    this.log('green', `  ✅ 测试用例: ${report.summary.passedTestCases}/${report.summary.totalTestCases}`);
    if (report.summary.failedTestCases > 0) {
      this.log('red', `  ❌ 失败用例: ${report.summary.failedTestCases}`);
    }
    this.log('cyan', `  📈 成功率: ${report.summary.successRate.toFixed(1)}%`);
    this.log('gray', '='.repeat(80) + '\n');
  }

  /**
   * 格式化持续时间
   */
  private formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    if (minutes > 0) {
      return `${minutes}分${remainingSeconds}秒`;
    }
    return `${remainingSeconds}秒`;
  }
}

/**
 * 主函数
 */
async function main(): Promise<void> {
  const runner = new ParallelTestRunner();

  // 处理中断信号
  process.on('SIGINT', () => {
    runner.stopAll();
    process.exit(1);
  });

  process.on('SIGTERM', () => {
    runner.stopAll();
    process.exit(1);
  });

  try {
    const report = await runner.runAll();
    runner.printSummary(report);

    // 根据测试结果设置退出码
    const exitCode = report.summary.failedModules > 0 ? 1 : 0;
    process.exit(exitCode);
  } catch (error) {
    console.error('❌ 测试执行失败:', error);
    process.exit(1);
  }
}

// 如果直接运行此文件
if (require.main === module) {
  main();
}

export { ParallelTestRunner };
