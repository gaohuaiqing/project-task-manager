/**
 * E2E 测试报告生成器
 *
 * 负责收集各模块测试结果并生成综合测试报告
 */

import { writeFileSync, readFileSync, existsSync, mkdirSync, readdirSync } from 'fs';
import { join } from 'path';
import { E2ETestReport, ModuleTestResult } from './orchestrator';

export interface TestCoverage {
  module: string;
  uiComponents: { name: string; file: string; tested: boolean }[];
  userFlows: { name: string; tested: boolean }[];
  apiEndpoints: { endpoint: string; tested: boolean }[];
  coverage: number;
}

export interface TestPath {
  module: string;
  testId: string;
  testName: string;
  path: string;
  result: 'pass' | 'fail' | 'skip';
  duration: number;
  timestamp: number;
  error?: string;
}

export class TestReportGenerator {
  private reportsDir: string;
  private coverageData: Map<string, TestCoverage>;

  constructor(reportsDir: string = join(process.cwd(), 'Test', 'E2E_AutoTest', 'reports')) {
    this.reportsDir = reportsDir;
    this.coverageData = new Map();
    this.ensureReportsDir();
  }

  private ensureReportsDir(): void {
    if (!existsSync(this.reportsDir)) {
      mkdirSync(this.reportsDir, { recursive: true });
    }
  }

  /**
   * 生成HTML测试报告
   */
  generateHTMLReport(report: E2ETestReport): string {
    const html = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>E2E 测试报告 - ${report.runId}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #f5f5f5;
            padding: 20px;
        }
        .container { max-width: 1400px; margin: 0 auto; }
        .header {
            background: white;
            padding: 24px;
            border-radius: 8px;
            margin-bottom: 20px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .header h1 { color: #1a1a1a; margin-bottom: 8px; }
        .header .meta { color: #666; font-size: 14px; }
        .summary {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 16px;
            margin-bottom: 20px;
        }
        .summary-card {
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .summary-card .label { color: #666; font-size: 14px; margin-bottom: 8px; }
        .summary-card .value { font-size: 32px; font-weight: bold; }
        .summary-card.pass .value { color: #52c41a; }
        .summary-card.fail .value { color: #ff4d4f; }
        .summary-card.duration .value { color: #1890ff; }
        .summary-card.rate .value { color: #722ed1; }
        .modules {
            background: white;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .module-item {
            padding: 20px;
            border-bottom: 1px solid #f0f0f0;
            display: flex;
            align-items: center;
            gap: 20px;
        }
        .module-item:last-child { border-bottom: none; }
        .module-status {
            width: 24px;
            height: 24px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 14px;
        }
        .module-status.pass { background: #f6ffed; color: #52c41a; }
        .module-status.fail { background: #fff1f0; color: #ff4d4f; }
        .module-info { flex: 1; }
        .module-name { font-weight: 500; color: #1a1a1a; margin-bottom: 4px; }
        .module-stats { color: #666; font-size: 14px; }
        .module-duration { color: #999; font-size: 14px; }
        .progress-bar {
            height: 4px;
            background: #f0f0f0;
            border-radius: 2px;
            overflow: hidden;
            margin-top: 8px;
        }
        .progress-fill {
            height: 100%;
            background: #52c41a;
            transition: width 0.3s;
        }
        .progress-fill.fail { background: #ff4d4f; }
        .test-paths {
            background: white;
            border-radius: 8px;
            padding: 20px;
            margin-top: 20px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .test-paths h2 { margin-bottom: 16px; }
        .test-path-item {
            padding: 12px;
            border-left: 3px solid #f0f0f0;
            margin-bottom: 8px;
            background: #fafafa;
        }
        .test-path-item.pass { border-left-color: #52c41a; }
        .test-path-item.fail { border-left-color: #ff4d4f; }
        .test-path-id { font-weight: 500; color: #1a1a1a; }
        .test-path-name { color: #666; font-size: 14px; margin-top: 4px; }
        .test-path-result {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 12px;
            margin-left: 8px;
        }
        .test-path-result.pass { background: #f6ffed; color: #52c41a; }
        .test-path-result.fail { background: #fff1f0; color: #ff4d4f; }
        .environment {
            background: white;
            border-radius: 8px;
            padding: 20px;
            margin-top: 20px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .environment h2 { margin-bottom: 16px; }
        .environment-item {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid #f0f0f0;
        }
        .environment-item:last-child { border-bottom: none; }
        .environment-label { color: #666; }
        .environment-value { color: #1a1a1a; font-weight: 500; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📊 E2E 测试报告</h1>
            <div class="meta">
                Run ID: ${report.runId} |
                开始时间: ${new Date(report.startTime).toLocaleString('zh-CN')} |
                总耗时: ${this.formatDuration(report.totalDuration!)}
            </div>
        </div>

        <div class="summary">
            <div class="summary-card">
                <div class="label">测试模块</div>
                <div class="value">${report.summary.passedModules}/${report.summary.totalModules}</div>
            </div>
            <div class="summary-card pass">
                <div class="label">通过用例</div>
                <div class="value">${report.summary.passedTestCases}</div>
            </div>
            <div class="summary-card fail">
                <div class="label">失败用例</div>
                <div class="value">${report.summary.failedTestCases}</div>
            </div>
            <div class="summary-card rate">
                <div class="label">成功率</div>
                <div class="value">${report.summary.successRate.toFixed(1)}%</div>
            </div>
            <div class="summary-card duration">
                <div class="label">总耗时</div>
                <div class="value">${this.formatDuration(report.totalDuration!)}</div>
            </div>
        </div>

        <div class="modules">
            ${report.results.map(result => `
                <div class="module-item">
                    <div class="module-status ${result.status}">${result.status === 'passed' ? '✓' : result.status === 'failed' ? '✗' : '○'}</div>
                    <div class="module-info">
                        <div class="module-name">${result.moduleName}</div>
                        <div class="module-stats">
                            ${result.testCases.passed}/${result.testCases.total} 通过
                            ${result.testCases.failed > 0 ? `| ${result.testCases.failed} 失败` : ''}
                            ${result.testCases.skipped > 0 ? `| ${result.testCases.skipped} 跳过` : ''}
                        </div>
                        <div class="progress-bar">
                            <div class="progress-fill ${result.testCases.failed > 0 ? 'fail' : ''}" style="width: ${result.testCases.total > 0 ? (result.testCases.passed / result.testCases.total * 100) : 0}%"></div>
                        </div>
                    </div>
                    <div class="module-duration">${this.formatDuration(result.duration!)}</div>
                </div>
            `).join('')}
        </div>

        <div class="environment">
            <h2>🖥️ 测试环境</h2>
            <div class="environment-item">
                <span class="environment-label">操作系统</span>
                <span class="environment-value">${report.environment.os}</span>
            </div>
            <div class="environment-item">
                <span class="environment-label">Node版本</span>
                <span class="environment-value">${report.environment.nodeVersion}</span>
            </div>
            <div class="environment-item">
                <span class="environment-label">Playwright版本</span>
                <span class="environment-value">${report.environment.playwrightVersion}</span>
            </div>
            <div class="environment-item">
                <span class="environment-label">测试URL</span>
                <span class="environment-value">${report.environment.baseURL}</span>
            </div>
            <div class="environment-item">
                <span class="environment-label">测试浏览器</span>
                <span class="environment-value">${report.environment.browsers.join(', ')}</span>
            </div>
        </div>

        <div class="test-paths">
            <h2>🛤️ 详细测试路径</h2>
            ${this.generateTestPathsHTML(report)}
        </div>
    </div>
</body>
</html>
    `;

    const reportPath = join(this.reportsDir, `e2e-report-${report.runId}.html`);
    writeFileSync(reportPath, html, 'utf-8');

    return reportPath;
  }

  /**
   * 生成测试路径HTML
   */
  private generateTestPathsHTML(report: E2ETestReport): string {
    const paths: string[] = [];

    for (const result of report.results) {
      paths.push(`
        <div style="margin-bottom: 24px;">
          <h3 style="margin-bottom: 12px;">${result.moduleName}</h3>
          ${result.logs.map((log, index) => `
            <div class="test-path-item ${result.status}">
              <div class="test-path-id">${result.moduleName}-${index + 1}</div>
              <div class="test-path-name">${log}</div>
            </div>
          `).join('')}
        </div>
      `);
    }

    return paths.join('');
  }

  /**
   * 生成Markdown测试报告
   */
  generateMarkdownReport(report: E2ETestReport): string {
    const markdown = `# E2E 测试报告

## 测试概要

- **Run ID**: ${report.runId}
- **开始时间**: ${new Date(report.startTime).toLocaleString('zh-CN')}
- **结束时间**: ${new Date(report.endTime!).toLocaleString('zh-CN')}
- **总耗时**: ${this.formatDuration(report.totalDuration!)}

## 测试结果

### 统计摘要

| 指标 | 数值 |
|------|------|
| 测试模块 | ${report.summary.passedModules}/${report.summary.totalModules} |
| 测试用例 | ${report.summary.passedTestCases}/${report.summary.totalTestCases} |
| 失败用例 | ${report.summary.failedTestCases} |
| 成功率 | ${report.summary.successRate.toFixed(1)}% |

### 模块详细结果

| 模块 | 状态 | 通过/总数 | 失败 | 跳过 | 耗时 |
|------|------|-----------|------|------|------|
${report.results.map(r => {
  const statusIcon = r.status === 'passed' ? '✅' : r.status === 'failed' ? '❌' : '⏳';
  return `| ${r.moduleName} | ${statusIcon} | ${r.testCases.passed}/${r.testCases.total} | ${r.testCases.failed} | ${r.testCases.skipped} | ${this.formatDuration(r.duration!)} |`;
}).join('\n')}

## 测试环境

- **操作系统**: ${report.environment.os}
- **Node版本**: ${report.environment.nodeVersion}
- **Playwright版本**: ${report.environment.playwrightVersion}
- **测试URL**: ${report.environment.baseURL}
- **测试浏览器**: ${report.environment.browsers.join(', ')}

## 详细测试路径

${report.results.map(result => `
### ${result.moduleName}

${result.logs.map((log, index) => `
**${index + 1}.** ${log}
`).join('\n')}
`).join('\n---\n')}

## 测试覆盖

### UI组件覆盖

| 模块 | 组件数量 | 已测试 | 覆盖率 |
|------|----------|--------|--------|
${this.generateCoverageTable('ui')}

### API端点覆盖

| 模块 | 端点数量 | 已测试 | 覆盖率 |
|------|----------|--------|--------|
${this.generateCoverageTable('api')}

---
*报告生成时间: ${new Date().toLocaleString('zh-CN')}*
`;

    const reportPath = join(this.reportsDir, `e2e-report-${report.runId}.md`);
    writeFileSync(reportPath, markdown, 'utf-8');

    return reportPath;
  }

  /**
   * 生成覆盖率表格
   */
  private generateCoverageTable(type: 'ui' | 'api'): string {
    // 这里应该从coverage数据中生成
    // 暂时返回占位符
    return '| 模块 | 数量 | 已测试 | 覆盖率 |\n|------|------|--------|--------|\n';
  }

  /**
   * 生成JSON测试报告
   */
  generateJSONReport(report: E2ETestReport): string {
    const reportPath = join(this.reportsDir, `e2e-report-${report.runId}.json`);
    writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf-8');
    return reportPath;
  }

  /**
   * 生成JUnit XML报告
   */
  generateJUnitReport(report: E2ETestReport): string {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<testsuites name="E2E Tests" time="${(report.totalDuration! / 1000).toFixed(2)}" tests="${report.summary.totalTestCases}" failures="${report.summary.failedTestCases}">
${report.results.map(result => `  <testsuite name="${result.moduleName}" time="${(result.duration! / 1000).toFixed(2)}" tests="${result.testCases.total}" failures="${result.testCases.failed}">
${result.logs.map((log, index) => `    <testcase name="${result.moduleName}-${index + 1}: ${log.substring(0, 50)}" time="${(result.duration! / result.testCases.total / 1000).toFixed(2)}">
${result.status === 'failed' && index === 0 ? '      <failure message="Test failed"/>' : ''}
    </testcase>`).join('\n')}
  </testsuite>`).join('\n')}
</testsuites>`;

    const reportPath = join(this.reportsDir, `e2e-report-${report.runId}.xml`);
    writeFileSync(reportPath, xml, 'utf-8');

    return reportPath;
  }

  /**
   * 生成所有格式的报告
   */
  generateAllReports(report: E2ETestReport): {
    html: string;
    markdown: string;
    json: string;
    junit: string;
  } {
    return {
      html: this.generateHTMLReport(report),
      markdown: this.generateMarkdownReport(report),
      json: this.generateJSONReport(report),
      junit: this.generateJUnitReport(report),
    };
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

  /**
   * 从Playwright报告中读取结果
   */
  readPlaywrightResults(): E2ETestReport | null {
    const resultsPath = join(this.reportsDir, 'test-results.json');

    if (!existsSync(resultsPath)) {
      return null;
    }

    try {
      const data = readFileSync(resultsPath, 'utf-8');
      const playwrightResults = JSON.parse(data);

      // 转换为我们的报告格式
      return this.convertPlaywrightToReport(playwrightResults);
    } catch (error) {
      console.error('读取Playwright报告失败:', error);
      return null;
    }
  }

  /**
   * 转换Playwright结果到报告格式
   */
  private convertPlaywrightToReport(playwrightResults: any): E2ETestReport {
    // 这里需要根据实际的Playwright报告格式进行转换
    // 暂时返回基本结构
    return {
      runId: `pw-${Date.now()}`,
      startTime: Date.now(),
      endTime: Date.now(),
      totalDuration: 0,
      results: [],
      summary: {
        totalModules: 0,
        passedModules: 0,
        failedModules: 0,
        totalTestCases: 0,
        passedTestCases: 0,
        failedTestCases: 0,
        successRate: 0,
      },
      environment: {
        os: process.platform,
        nodeVersion: process.version,
        playwrightVersion: '1.50.0',
        baseURL: process.env.BASE_URL || 'http://localhost:5173',
        browsers: ['chrome', 'edge'],
      },
    };
  }
}
