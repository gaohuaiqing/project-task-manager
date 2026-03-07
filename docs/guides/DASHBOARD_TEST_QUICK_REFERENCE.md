# 仪表盘E2E测试快速参考指南

## 快速开始

### 1. 运行测试

```bash
# 导航到测试目录
cd Test/E2E_AutoTest

# 安装依赖（首次运行）
npm install

# 运行所有仪表盘测试
npm run test:e2e tests/dashboard/

# 运行完整测试套件
npm run test:e2e tests/dashboard/dashboard-complete.spec.ts

# 运行特定测试组
npm run test:e2e -g "统计卡片功能"
npm run test:e2e -g "工程师专属视图"
npm run test:e2e -g "性能测试"
```

### 2. 调试测试

```bash
# 显示浏览器窗口
npm run test:e2e -- --headed

# 慢动作执行
npm run test:e2e -- --slow-mo=1000

# 调试模式
npm run test:e2e -- --debug

# 运行特定测试文件
npm run test:e2e tests/dashboard/dashboard-complete.spec.ts -- --project=chromium
```

---

## 测试结构速查

### 测试套件组织

```
仪表盘模块 - 完整测试套件
├── 页面加载与初始化 (4)
├── 统计卡片功能 (8)
├── 项目概览组件 (9)
├── 团队工作饱和度图表 (10)
├── 任务预警系统 (9)
├── 工程师专属视图 (8)
├── 详情对话框功能 (4)
├── 数据刷新机制 (3)
├── 响应式布局 (4)
├── 性能测试 (3)
├── 可访问性 (3)
├── 错误处理 (2)
└── 冒烟测试 (1)
```

### 关键文件

```
Test/E2E_AutoTest/
├── src/
│   └── pages/
│       ├── DashboardPage.ts       # 仪表盘页面对象
│       ├── BasePage.ts            # 基础页面类
│       └── LoginPage.ts           # 登录页面
├── tests/
│   └── dashboard/
│       ├── dashboard.spec.ts                     # 原有测试
│       └── dashboard-complete.spec.ts            # 完整测试
└── playwright.config.ts           # Playwright配置
```

---

## 页面对象方法速查

### DashboardPage常用方法

```typescript
// 页面加载
await dashboardPage.waitForReady()

// 统计卡片
await dashboardPage.clickStatCard('projects')
const value = await dashboardPage.getStatCardValue('tasks')

// 项目概览
const count = await dashboardPage.getProjectCardCount()
const progress = await dashboardPage.getProjectProgress(0)

// 饱和度图表
const memberCount = await dashboardPage.getMemberCount()
const saturation = await dashboardPage.getMemberSaturation(0)

// 任务预警
const pendingCount = await dashboardPage.getPendingApprovalCount()
await dashboardPage.clickAlertTask(0)

// 工程师视图
const isEngineerView = await dashboardPage.isEngineerView()
const urgentCount = await dashboardPage.getUrgentTaskCount()

// 对话框
await dashboardPage.waitForDetailDialog()
await dashboardPage.closeDialog()
```

---

## 测试数据准备

### 快速数据检查

```bash
# 连接数据库
mysql -u root -p project_manager

# 检查用户
SELECT id, username, role FROM users WHERE role IN ('admin', 'engineer');

# 检查项目
SELECT id, name, status, progress FROM projects LIMIT 5;

# 检查任务
SELECT id, title, status, priority FROM wbs_tasks LIMIT 5;

# 检查成员
SELECT id, name, role, saturation FROM members LIMIT 5;
```

### 测试数据要求

**必需数据**:
- ✅ 至少1个管理员用户
- ✅ 至少1个工程师用户
- ✅ 至少1个项目
- ✅ 至少1个团队成员
- ✅ 至少1个WBS任务

**可选数据**（用于完整测试）:
- 多个不同状态的项目
- 多个不同状态的成员
- 多个不同优先级的任务
- 包含即将到期和已延期的任务

---

## 常见测试场景

### 场景1: 基本功能验证

```typescript
test('基本功能验证', async ({ page }) => {
  // 1. 登录
  await login(page, 'admin')

  // 2. 导航到仪表盘
  await sidebar.navigateTo('dashboard')

  // 3. 等待加载
  await dashboardPage.waitForReady()

  // 4. 验证组件
  await expect(dashboardPage.statsCardContainer).toBeVisible()
  await expect(dashboardPage.projectOverviewContainer).toBeVisible()

  // 5. 登出
  await logout(page)
})
```

### 场景2: 工程师视图测试

```typescript
test('工程师视图测试', async ({ page }) => {
  // 1. 切换到工程师
  await login(page, 'engineer')
  await sidebar.navigateTo('dashboard')

  // 2. 验证工程师视图
  const isEngineerView = await dashboardPage.isEngineerView()
  expect(isEngineerView).toBeTruthy()

  // 3. 查看个人统计
  const totalTasks = await dashboardPage.getEngineerTaskStat('total')
  expect(totalTasks).toBeGreaterThanOrEqual(0)

  // 4. 登出
  await logout(page)
})
```

### 场景3: 对话框交互

```typescript
test('对话框交互测试', async ({ page }) => {
  await login(page, 'admin')
  await sidebar.navigateTo('dashboard')

  // 1. 点击统计卡片
  await dashboardPage.clickStatCard('projects')

  // 2. 等待对话框
  await dashboardPage.waitForDetailDialog()

  // 3. 验证对话框
  await expect(dashboardPage.statsDetailDialog).toBeVisible()

  // 4. 关闭对话框
  await dashboardPage.closeDialog()

  // 5. 验证关闭
  await expect(dashboardPage.statsDetailDialog).not.toBeVisible()
})
```

---

## 故障排查

### 常见问题

**问题1: 元素找不到**
```
Error: Timeout waiting for selector
```
**解决方案**:
- 检查选择器是否正确
- 增加等待时间
- 验证元素确实存在

**问题2: 测试超时**
```
Error: Test timeout of 30000ms exceeded
```
**解决方案**:
- 检查网络连接
- 增加测试超时时间
- 查看是否有性能问题

**问题3: 登录失败**
```
Error: User authentication failed
```
**解决方案**:
- 验证用户凭据
- 检查后端服务状态
- 确认测试数据存在

**问题4: 数据不匹配**
```
Error: Expected 5 but got 3
```
**解决方案**:
- 更新测试数据
- 调整测试断言
- 检查数据库状态

### 调试技巧

```typescript
// 1. 截图
await page.screenshot({ path: 'debug.png' })

// 2. 查看页面内容
const content = await page.content()
console.log(content)

// 3. 暂停执行
await page.pause()

// 4. 查看元素状态
const isVisible = await element.isVisible()
console.log('Element visible:', isVisible)

// 5. 获取元素文本
const text = await element.textContent()
console.log('Element text:', text)
```

---

## 测试报告

### 查看测试结果

```bash
# HTML报告
npm run test:e2e -- --reporter=html

# JSON报告
npm.run test:e2e -- --reporter=json

# Allure报告
npm run test:e2e -- --reporter=line
```

### 报告位置

```
Test/E2E_AutoTest/
├── playwright-report/          # HTML报告
├── test-results/               # 测试结果
└── allure-results/             # Allure结果（如果配置）
```

---

## 最佳实践

### 1. 测试编写

- ✅ 使用页面对象模式
- ✅ 保持测试独立性
- ✅ 使用有意义的测试名称
- ✅ 添加适当的断言
- ✅ 处理异步操作

### 2. 选择器使用

- ✅ 优先使用data-testid
- ✅ 使用稳定的属性选择器
- ✅ 避免使用索引选择器
- ❌ 避免使用脆弱的CSS类名

### 3. 等待策略

- ✅ 使用显式等待
- ✅ 等待特定条件
- ❌ 避免固定延迟
- ❌ 避免过长等待时间

### 4. 测试数据

- ✅ 使用独立的测试数据
- ✅ 清理测试数据
- ✅ 使用可预测的数据
- ❌ 避免依赖生产数据

---

## 性能基准

### 预期性能指标

| 操作 | 预期时间 | 最大时间 |
|------|---------|---------|
| 页面加载 | < 2s | 5s |
| 组件渲染 | < 1s | 3s |
| 对话框打开 | < 0.5s | 1s |
| 数据刷新 | < 1s | 2s |
| 页面滚动 | < 0.5s | 1s |

### 性能测试

```typescript
test('性能测试', async ({ page }) => {
  const startTime = Date.now()

  await dashboardPage.waitForReady()

  const loadTime = Date.now() - startTime
  expect(loadTime).toBeLessThan(5000)
})
```

---

## 相关文档

### 完整文档

- [详细测试报告](../reports/DASHBOARD_E2E_TEST_REPORT.md)
- [测试执行摘要](../reports/DASHBOARD_TEST_SUMMARY.md)
- [项目README](../../../README.md)

### 组件文档

- [ProjectOverview组件](../../../app/src/components/dashboard/ProjectOverview.tsx)
- [StatsCard组件](../../../app/src/components/dashboard/StatsCard.tsx)
- [SaturationChart组件](../../../app/src/components/dashboard/SaturationChart.tsx)
- [TaskAlerts组件](../../../app/src/components/dashboard/TaskAlerts.tsx)
- [EngineerDashboard组件](../../../app/src/components/dashboard/EngineerDashboard.tsx)

---

## 快速联系

### 问题反馈

- **测试问题**: 在项目Issue追踪中创建issue
- **文档问题**: 提交文档更新PR
- **功能建议**: 联系测试负责人

### 团队联系

- **测试负责人**: [联系方式]
- **开发团队**: [联系方式]
- **QA团队**: [联系方式]

---

**最后更新**: 2026-03-04
**版本**: v2.0.0
**维护者**: Dashboard E2E Testing Expert
