/**
 * E2E 测试并行编排器
 *
 * 负责协调多个功能模块的并行测试执行
 * 每个功能模块由独立的AI代理负责测试
 */

import { spawn, ChildProcess } from 'child_process';
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

// 测试结果接口
export interface ModuleTestResult {
  moduleName: string;
  status: 'pending' | 'running' | 'passed' | 'failed';
  startTime: number;
  endTime?: number;
  duration?: number;
  testCases: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
  };
  error?: string;
  logs: string[];
  screenshots: string[];
  coverage: {
    uiComponents: string[];
    userFlows: string[];
    apiEndpoints: string[];
  };
}

// 测试报告接口
export interface E2ETestReport {
  runId: string;
  startTime: number;
  endTime?: number;
  totalDuration?: number;
  results: ModuleTestResult[];
  summary: {
    totalModules: number;
    passedModules: number;
    failedModules: number;
    totalTestCases: number;
    passedTestCases: number;
    failedTestCases: number;
    successRate: number;
  };
  environment: {
    os: string;
    nodeVersion: string;
    playwrightVersion: string;
    baseURL: string;
    browsers: string[];
  };
}

// 功能模块定义
export const TEST_MODULES = {
  AUTH: {
    name: '认证模块',
    description: '用户登录、登出、会话管理、权限验证',
    testFile: 'tests/auth/login.spec.ts',
    priority: 'critical',
    estimatedDuration: 300000, // 5分钟
  },
  DASHBOARD: {
    name: '仪表盘模块',
    description: '项目概览、统计卡片、饱和度图表、任务预警',
    testFile: 'tests/dashboard/dashboard.spec.ts',
    priority: 'high',
    estimatedDuration: 400000, // 6.5分钟
  },
  PROJECTS: {
    name: '项目管理模块',
    description: '项目列表、创建项目、编辑项目、删除项目、项目表单',
    testFile: 'tests/projects/project-management.spec.ts',
    priority: 'critical',
    estimatedDuration: 600000, // 10分钟
  },
  TASKS: {
    name: '任务管理模块',
    description: 'WBS任务列表、创建任务、编辑任务、任务筛选、任务审批',
    testFile: 'tests/tasks/task-management.spec.ts',
    priority: 'critical',
    estimatedDuration: 600000, // 10分钟
  },
  GANTT: {
    name: '甘特图模块',
    description: '甘特图视图、任务拖拽、缩放、时间节点编辑',
    testFile: 'tests/gantt/gantt-view.spec.ts',
    priority: 'high',
    estimatedDuration: 500000, // 8分钟
  },
  SETTINGS: {
    name: '设置管理模块',
    description: '个人信息、用户管理、权限管理、节假日管理、系统日志',
    testFile: 'tests/settings/settings-management.spec.ts',
    priority: 'medium',
    estimatedDuration: 500000, // 8分钟
  },
  ORGANIZATION: {
    name: '组织架构模块',
    description: '组织树、部门管理、成员管理、能力评估',
    testFile: 'tests/organization/organization.spec.ts',
    priority: 'medium',
    estimatedDuration: 400000, // 6.5分钟
  },
  APPROVAL: {
    name: '任务审批模块',
    description: '任务提交流程、审批流程、审批历史、变更说明',
    testFile: 'tests/approval/approval-workflow.spec.ts',
    priority: 'high',
    estimatedDuration: 450000, // 7.5分钟
  },
};

export class E2ETestOrchestrator {
  private results: Map<string, ModuleTestResult> = new Map();
  private processes: Map<string, ChildProcess> = new Map();
  private runId: string;
  private reportsDir: string;

  constructor(reportsDir: string = join(process.cwd(), 'Test', 'E2E_AutoTest', 'reports')) {
    this.runId = `test-run-${Date.now()}`;
    this.reportsDir = reportsDir;
    this.ensureReportsDir();
  }

  private ensureReportsDir(): void {
    if (!existsSync(this.reportsDir)) {
      mkdirSync(this.reportsDir, { recursive: true });
    }
  }

  /**
   * 运行所有模块的并行测试
   */
  async runAllTests(): Promise<E2ETestReport> {
    const startTime = Date.now();
    console.log(`\n🚀 开始并行E2E测试 - RunID: ${this.runId}`);
    console.log(`📊 测试模块数量: ${Object.keys(TEST_MODULES).length}\n`);

    // 初始化所有模块结果
    for (const [key, module] of Object.entries(TEST_MODULES)) {
      this.results.set(key, {
        moduleName: module.name,
        status: 'pending',
        startTime: 0,
        testCases: { total: 0, passed: 0, failed: 0, skipped: 0 },
        logs: [],
        screenshots: [],
        coverage: { uiComponents: [], userFlows: [], apiEndpoints: [] },
      });
    }

    // 并行启动所有模块测试
    const testPromises = Object.entries(TEST_MODULES).map(([key, module]) =>
      this.runModuleTest(key, module)
    );

    // 等待所有测试完成
    await Promise.all(testPromises);

    // 生成最终报告
    const report = this.generateReport(startTime);
    this.saveReport(report);

    return report;
  }

  /**
   * 运行单个模块的测试
   */
  private async runModuleTest(
    moduleKey: string,
    module: typeof TEST_MODULES[keyof typeof TEST_MODULES]
  ): Promise<void> {
    const result = this.results.get(moduleKey)!;
    result.status = 'running';
    result.startTime = Date.now();

    console.log(`🔄 启动测试: ${module.name}`);

    try {
      // 运行Playwright测试
      const testResult = await this.executePlaywrightTest(moduleKey, module);

      result.endTime = Date.now();
      result.duration = result.endTime - result.startTime;
      result.status = testResult.success ? 'passed' : 'failed';
      result.testCases = testResult.testCases;
      result.coverage = testResult.coverage;
      result.logs = testResult.logs;
      result.screenshots = testResult.screenshots;

      if (!testResult.success) {
        result.error = testResult.error;
      }

      console.log(
        `${result.status === 'passed' ? '✅' : '❌'} ${module.name}: ` +
        `${result.testCases.passed}/${result.testCases.total} 通过 ` +
        `(${this.formatDuration(result.duration)})`
      );
    } catch (error) {
      result.endTime = Date.now();
      result.duration = result.endTime - result.startTime;
      result.status = 'failed';
      result.error = error instanceof Error ? error.message : String(error);

      console.log(`❌ ${module.name}: 测试执行失败 - ${result.error}`);
    }
  }

  /**
   * 执行Playwright测试
   */
  private async executePlaywrightTest(
    moduleKey: string,
    module: typeof TEST_MODULES[keyof typeof TEST_MODULES]
  ): Promise<{
    success: boolean;
    testCases: ModuleTestResult['testCases'];
    coverage: ModuleTestResult['coverage'];
    logs: string[];
    screenshots: string[];
    error?: string;
  }> {
    return new Promise((resolve) => {
      const logs: string[] = [];
      const screenshots: string[] = [];
      const testFile = join(process.cwd(), 'Test', 'E2E_AutoTest', module.testFile);

      // 检查测试文件是否存在
      if (!existsSync(testFile)) {
        resolve({
          success: false,
          testCases: { total: 0, passed: 0, failed: 0, skipped: 0 },
          coverage: { uiComponents: [], userFlows: [], apiEndpoints: [] },
          logs: [`测试文件不存在: ${testFile}`],
          screenshots: [],
          error: `测试文件不存在: ${module.testFile}`,
        });
        return;
      }

      const proc = spawn('npx', ['playwright', 'test', module.testFile, '--reporter=json'], {
        cwd: join(process.cwd(), 'Test', 'E2E_AutoTest'),
        shell: true,
      });

      this.processes.set(moduleKey, proc);

      let stdout = '';
      let stderr = '';

      proc.stdout?.on('data', (data) => {
        const message = data.toString();
        stdout += message;
        logs.push(message);
      });

      proc.stderr?.on('data', (data) => {
        const message = data.toString();
        stderr += message;
        logs.push(`[ERROR] ${message}`);
      });

      proc.on('close', (code) => {
        this.processes.delete(moduleKey);

        // 解析测试结果
        try {
          const jsonReportPath = join(
            process.cwd(),
            'Test',
            'E2E_AutoTest',
            'reports',
            'test-results.json'
          );

          let testCases = { total: 0, passed: 0, failed: 0, skipped: 0 };
          let coverage = { uiComponents: [], userFlows: [], apiEndpoints: [] };

          if (existsSync(jsonReportPath)) {
            const reportData = JSON.parse(readFileSync(jsonReportPath, 'utf-8'));
            // 解析测试结果统计
            // 这里需要根据实际的Playwright报告格式进行调整
          }

          resolve({
            success: code === 0,
            testCases,
            coverage,
            logs,
            screenshots,
            error: code !== 0 ? stderr : undefined,
          });
        } catch (parseError) {
          resolve({
            success: code === 0,
            testCases: { total: 1, passed: code === 0 ? 1 : 0, failed: code !== 0 ? 1 : 0, skipped: 0 },
            coverage: { uiComponents: [], userFlows: [], apiEndpoints: [] },
            logs,
            screenshots,
            error: code !== 0 ? stderr : undefined,
          });
        }
      });

      // 设置超时
      setTimeout(() => {
        if (this.processes.has(moduleKey)) {
          proc.kill();
          resolve({
            success: false,
            testCases: { total: 0, passed: 0, failed: 0, skipped: 0 },
            coverage: { uiComponents: [], userFlows: [], apiEndpoints: [] },
            logs: ['测试超时'],
            screenshots: [],
            error: `测试超时 (${module.estimatedDuration}ms)`,
          });
        }
      }, module.estimatedDuration);
    });
  }

  /**
   * 生成测试报告
   */
  private generateReport(startTime: number): E2ETestReport {
    const endTime = Date.now();
    const resultsArray = Array.from(this.results.values());

    const summary = {
      totalModules: resultsArray.length,
      passedModules: resultsArray.filter((r) => r.status === 'passed').length,
      failedModules: resultsArray.filter((r) => r.status === 'failed').length,
      totalTestCases: resultsArray.reduce((sum, r) => sum + r.testCases.total, 0),
      passedTestCases: resultsArray.reduce((sum, r) => sum + r.testCases.passed, 0),
      failedTestCases: resultsArray.reduce((sum, r) => sum + r.testCases.failed, 0),
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
      totalDuration: endTime - startTime,
      results: resultsArray,
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
   * 保存测试报告
   */
  private saveReport(report: E2ETestReport): void {
    const reportPath = join(this.reportsDir, `e2e-report-${this.runId}.json`);
    writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📄 测试报告已保存: ${reportPath}`);
  }

  /**
   * 停止所有测试
   */
  stopAll(): void {
    console.log('\n⏹️  停止所有测试...');
    for (const [key, proc] of this.processes.entries()) {
      proc.kill();
      console.log(`  - 已停止: ${TEST_MODULES[key as keyof typeof TEST_MODULES].name}`);
    }
  }

  /**
   * 格式化持续时间
   */
  private formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return minutes > 0 ? `${minutes}m${remainingSeconds}s` : `${remainingSeconds}s`;
  }

  /**
   * 打印测试摘要
   */
  printSummary(report: E2ETestReport): void {
    console.log('\n' + '='.repeat(80));
    console.log('📊 E2E 测试执行摘要');
    console.log('='.repeat(80));
    console.log(`Run ID: ${report.runId}`);
    console.log(`执行时间: ${this.formatDuration(report.totalDuration!)}`);
    console.log(`环境: ${report.environment.os} | Node ${report.environment.nodeVersion}`);
    console.log('\n模块测试结果:');
    console.log('-'.repeat(80));

    for (const result of report.results) {
      const statusIcon = result.status === 'passed' ? '✅' : result.status === 'failed' ? '❌' : '⏳';
      console.log(
        `${statusIcon} ${result.moduleName.padEnd(20)} ` +
        `${result.testCases.passed.toString().padStart(3)}/${result.testCases.total.toString().padEnd(3)} 通过 ` +
        `(${this.formatDuration(result.duration!)})`
      );
    }

    console.log('-'.repeat(80));
    console.log('总计:');
    console.log(`  模块: ${report.summary.passedModules}/${report.summary.totalModules} 通过`);
    console.log(`  测试用例: ${report.summary.passedTestCases}/${report.summary.totalTestCases} 通过`);
    console.log(`  成功率: ${report.summary.successRate.toFixed(1)}%`);
    console.log('='.repeat(80) + '\n');
  }
}

// CLI入口
export async function main(): Promise<void> {
  const orchestrator = new E2ETestOrchestrator();

  // 处理中断信号
  process.on('SIGINT', () => {
    orchestrator.stopAll();
    process.exit(1);
  });

  process.on('SIGTERM', () => {
    orchestrator.stopAll();
    process.exit(1);
  });

  try {
    const report = await orchestrator.runAllTests();
    orchestrator.printSummary(report);

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
