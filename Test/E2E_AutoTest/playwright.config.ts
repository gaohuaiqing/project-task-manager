import { defineConfig, devices } from '@playwright/test';
import path from 'path';

export default defineConfig({
  // 测试文件位置
  testDir: './tests',

  // 测试文件匹配模式
  testMatch: '**/*.spec.ts',

  // 完全并行运行测试（每个文件独立运行）
  fullyParallel: true,

  // 失败时重试次数
  retries: process.env.CI ? 2 : 1,

  // 并发 worker 数量 - 支持多浏览器并行
  // 使用 4 个 worker，可以同时运行 4 个测试文件
  workers: 4,

  // 全局测试超时（开发环境下需要更长的时间）
  timeout: 60 * 1000, // 60 秒

  // 测试报告
  reporter: [
    ['html', { outputFolder: 'reports/html-report' }],
    ['json', { outputFile: 'reports/test-results.json' }],
    ['junit', { outputFile: 'reports/junit-results.xml' }],
    ['list']
  ],

  // 全局设置
  use: {
    // 基础 URL - 使用网络 IP 避免 McAfee 代理拦截
    baseURL: process.env.BASE_URL || 'http://10.8.180.55:5173',

    // 浏览器上下文选项
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',

    // 超时设置（开发环境下需要更长的时间）
    actionTimeout: 15000, // 15 秒（增加）
    navigationTimeout: 60000, // 60 秒（增加）

    // 视口设置
    viewport: { width: 1280, height: 720 },

    // 忽略 HTTPS 错误
    ignoreHTTPSErrors: true,
  },

  // 项目配置 - Chrome 和 Edge 同时并行测试
  projects: [
    {
      name: 'chrome',
      use: {
        ...devices['Desktop Chrome'],
        // Chrome 特定配置
        channel: 'chrome', // 使用系统安装的 Chrome
      },
    },
    {
      name: 'edge',
      use: {
        ...devices['Desktop Chrome'],
        // Edge 特定配置
        channel: 'msedge', // 使用系统安装的 Edge
      },
    },
  ],

  // 全局设置
  globalSetup: path.join(__dirname, 'src/fixtures/global-setup.ts'),
  globalTeardown: path.join(__dirname, 'src/fixtures/global-teardown.ts'),

  // 期望超时
  expect: {
    timeout: 10000 // 增加到 10 秒
  },

  // 输出目录
  outputDir: 'reports/artifacts',
});
