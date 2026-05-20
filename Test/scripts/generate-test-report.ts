/**
 * 测试报告生成脚本
 * 生成 Markdown 格式的测试报告
 */
import * as fs from 'fs';
import * as path from 'path';

interface TestResult {
  scenarioId: string;
  scenarioName: string;
  status: 'pass' | 'fail' | 'blocked';
  duration: number;
  error?: string;
}

interface TestReportConfig {
  date: string;
  executor: string;
  environment: string;
  totalScenarios: number;
  executedScenarios: number;
  passedScenarios: number;
  failedScenarios: number;
  blockedScenarios: number;
  passRate: string;
  results: TestResult[];
  testAccounts: { role: string; username: string; real_name: string }[];
}

function generateTestReport(config: TestReportConfig): string {
  const failedResults = config.results.filter(r => r.status === 'fail');
  const passRate = config.executedScenarios > 0
    ? (config.passedScenarios / config.executedScenarios)
    : 0;

  const reportContent = `# 交付前测试报告

## 1. 测试概述

| 项目 | 内容 |
|------|------|
| 测试日期 | ${config.date} |
| 测试执行人 | ${config.executor} |
| 测试环境 | ${config.environment} |
| 测试范围 | 全系统功能测试 |
| 测试方案 | Test/docs/DELIVERY_TEST_PLAN.md |

## 2. 测试统计

| 指标 | 数量 |
|------|------|
| 测试场景总数 | ${config.totalScenarios} |
| 测试执行数 | ${config.executedScenarios} |
| 通过数 | ${config.passedScenarios} |
| 失败数 | ${config.failedScenarios} |
| 阻塞数 | ${config.blockedScenarios} |
| 通过率 | ${config.passRate} |

## 3. 问题汇总

| 级别 | 数量 | 已修复 | 待修复 |
|------|------|--------|--------|
| P0-CRITICAL | 0 | 0 | 0 |
| P1-HIGH | ${failedResults.length} | 0 | ${failedResults.length} |
| P2-MEDIUM | 0 | 0 | 0 |
| P3-LOW | 0 | 0 | 0 |

## 4. 问题详情列表

| 序号 | 场景编号 | 问题描述 | 问题级别 | 发现时间 | 处理状态 |
|------|---------|---------|---------|---------|---------|
${failedResults.length > 0
  ? failedResults.map((r, i) =>
    `| ${i + 1} | ${r.scenarioId} | ${r.error || '测试失败'} | P1 | ${config.date} | 待修复 |`
  ).join('\n')
  : '| - | 无问题 | - | - | - | - |'}

## 5. 交付建议

- **是否可以交付**: ${passRate >= 0.95 ? '是' : '否'}
- **交付条件**: P0问题已修复，P1问题已处理或记录
- **风险提示**: ${passRate >= 0.95 ? '无重大风险' : '存在较多问题，建议修复后再交付'}
- **建议措施**: ${passRate >= 0.95 ? '可按计划交付' : '优先修复失败场景，重新测试后评估'}

## 6. 测试账户说明

本次测试使用系统已有员工账户，登录名=工号，密码=工号：

| 角色 | 工号 | 姓名 | 用途 |
|------|------|------|------|
${config.testAccounts.map(a =>
  `| ${a.role} | ${a.username} | ${a.real_name} | ${a.role === 'admin' ? '管理功能测试' : a.role === 'dept_manager' ? '部门经理角色测试' : a.role === 'tech_manager' ? '技术经理角色测试' : '工程师角色测试'} |`
).join('\n')}

## 7. 附录

- 测试数据清单: Test/data/test-data.json
- 测试方案文档: Test/docs/DELIVERY_TEST_PLAN.md
- 执行检查清单: Test/docs/TEST_EXECUTION_CHECKLIST.md

---

**报告生成时间**: ${new Date().toISOString()}
`;

  return reportContent;
}

// 主函数
async function generateReport() {
  console.log('========================================');
  console.log('  生成测试报告');
  console.log('========================================');
  console.log('');

  // 示例测试结果（实际测试时需要替换为真实数据）
  const sampleResults: TestResult[] = [
    { scenarioId: 'G-AUTH-01', scenarioName: '正常登录', status: 'pass', duration: 2.5 },
    { scenarioId: 'G-AUTH-02', scenarioName: '错误密码登录', status: 'pass', duration: 1.8 },
    { scenarioId: 'G-AUTH-03', scenarioName: '退出登录', status: 'pass', duration: 1.2 },
  ];

  // 读取测试数据配置获取账号信息
  const configPath = path.join(__dirname, '../data/test-data.json');
  const testData = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

  const reportConfig: TestReportConfig = {
    date: new Date().toISOString().split('T')[0],
    executor: 'AI (Chrome DevTools MCP)',
    environment: '测试环境',
    totalScenarios: 310,
    executedScenarios: sampleResults.length,
    passedScenarios: sampleResults.filter(r => r.status === 'pass').length,
    failedScenarios: sampleResults.filter(r => r.status === 'fail').length,
    blockedScenarios: sampleResults.filter(r => r.status === 'blocked').length,
    passRate: ((sampleResults.filter(r => r.status === 'pass').length / sampleResults.length) * 100).toFixed(2) + '%',
    results: sampleResults,
    testAccounts: testData.testAccounts.map(a => ({
      role: a.role,
      username: a.username,
      real_name: a.real_name || '系统管理员'
    }))
  };

  const report = generateTestReport(reportConfig);
  const reportDir = path.join(__dirname, '../reports');
  const reportPath = path.join(reportDir, `TEST_REPORT_${new Date().toISOString().split('T')[0].replace(/-/g, '')}.md`);

  // 创建报告目录
  fs.mkdirSync(reportDir, { recursive: true });
  fs.writeFileSync(reportPath, report, 'utf-8');

  console.log(`✅ 测试报告已生成: ${reportPath}`);
  console.log('');
}

generateReport()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ 报告生成失败:', err);
    process.exit(1);
  });

// 导出函数供其他模块使用
export { generateTestReport, TestResult, TestReportConfig };