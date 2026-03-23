/**
 * 测试报告生成脚本
 * 解析 Playwright 测试结果并生成 Markdown 报告
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';

interface TestResult {
  status: 'passed' | 'failed' | 'skipped' | 'timedOut';
  name: string;
  duration: number;
  error?: {
    message: string;
    stack?: string;
  };
}

interface Issue {
  id: number;
  name: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  error: string;
  file: string;
}

function determineSeverity(error: string): 'Critical' | 'High' | 'Medium' | 'Low' {
  const errorLower = error.toLowerCase();
  
  if (errorLower.includes('timeout') || errorLower.includes('500')) {
    return 'Critical';
  }
  if (errorLower.includes('assert') || errorLower.includes('expected')) {
    return 'High';
  }
  if (errorLower.includes('not found') || errorLower.includes('not visible')) {
    return 'Medium';
  }
  return 'Low';
}

function generateIssueReport(): void {
  const reportPath = join(__dirname, '../reports/results.json');
  const outputPath = join(__dirname, '../reports/issues-report.md');
  const reportsDir = dirname(outputPath);

  // 确保报告目录存在
  if (!existsSync(reportsDir)) {
    mkdirSync(reportsDir, { recursive: true });
  }

  let passed = 0;
  let failed = 0;
  let skipped = 0;
  const issues: Issue[] = [];

  try {
    const reportData = JSON.parse(readFileSync(reportPath, 'utf-8'));

    // 递归解析测试结果
    function parseSpecs(specs: any[], parentPath: string = '') {
      for (const spec of specs) {
        const specName = spec.title || spec.name || 'Unknown';
        const fullPath = parentPath ? `${parentPath} > ${specName}` : specName;

        for (const test of spec.tests || []) {
          const testStatus = test.status || test.results?.[0]?.status || 'unknown';
          
          if (testStatus === 'passed') {
            passed++;
          } else if (testStatus === 'failed' || testStatus === 'timedOut') {
            failed++;
            const error = test.results?.[0]?.error || test.error;
            if (error) {
              issues.push({
                id: issues.length + 1,
                name: test.name || specName,
                severity: determineSeverity(error.message || String(error)),
                error: error.message || String(error),
                file: spec.file || fullPath,
              });
            }
          } else if (testStatus === 'skipped') {
            skipped++;
          }
        }

        // 递归处理子 suites
        if (spec.suites) {
          parseSpecs(spec.suites, fullPath);
        }
      }
    }

    parseSpecs(reportData.suites || []);
  } catch (error) {
    console.error('Failed to parse report:', error);
    // 创建空报告
    const emptyReport = `# E2E 测试问题报告

**测试时间**: ${new Date().toLocaleString('zh-CN')}
**状态**: 无法解析测试结果

**错误**: ${error}

请检查测试是否正常运行。
`;
    writeFileSync(outputPath, emptyReport, 'utf-8');
    return;
  }

  // 生成 Markdown 报告
  const report = `# E2E 测试问题报告

**测试时间**: ${new Date().toLocaleString('zh-CN')}
**测试环境**: Chromium
**通过/失败/跳过**: ${passed}/${failed}/${skipped}

---

## 测试摘要

| 指标 | 数量 |
|------|------|
| ✅ 通过 | ${passed} |
| ❌ 失败 | ${failed} |
| ⏭️ 跳过 | ${skipped} |
| 📊 总计 | ${passed + failed + skipped} |

---

## 问题列表

${
  issues.length === 0
    ? '✅ **所有测试通过，无问题需要修复！**'
    : issues
        .map(
          (issue) => `
### 问题 ${issue.id}: ${issue.name}
- **严重程度**: ${issue.severity}
- **测试文件**: ${issue.file}
- **错误信息**: 
\`\`\`
${issue.error}
\`\`\`
`
        )
        .join('\n')
}

---

## 下一步

${
  issues.length === 0
    ? '无需修复，可以继续其他工作。'
    : `请逐个确认以上 ${issues.length} 个问题后修复。`
}

---

**报告生成时间**: ${new Date().toLocaleString('zh-CN')}
`;

  writeFileSync(outputPath, report, 'utf-8');
  console.log(`\n✓ 报告已生成: ${outputPath}`);
  console.log(`  - 通过: ${passed}`);
  console.log(`  - 失败: ${failed}`);
  console.log(`  - 跳过: ${skipped}`);
  
  if (issues.length > 0) {
    console.log(`\n⚠️ 发现 ${issues.length} 个问题需要修复`);
  } else {
    console.log('\n✅ 所有测试通过！');
  }
}

// 执行
generateIssueReport();
