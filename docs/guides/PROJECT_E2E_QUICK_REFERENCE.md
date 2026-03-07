# 项目管理 E2E 测试快速参考

> **快速查找常用测试命令、场景和解决方案**

---

## 🚀 快速开始

### 一分钟启动测试

```bash
# 1. 确保应用运行在 localhost:5173
cd app && npm run dev

# 2. 在另一个终端运行测试
cd Test/E2E_AutoTest
npm run test -- tests/projects
```

---

## 📋 测试文件速查

| 测试文件 | 测试内容 | 命令 |
|---------|---------|------|
| `project-list.spec.ts` | 项目列表、搜索、筛选 | `npm run test -- tests/projects/project-list.spec.ts` |
| `project-form.spec.ts` | 项目创建、表单验证 | `npm run test -- tests/projects/project-form.spec.ts` |
| `project-crud.spec.ts` | 编辑、删除、详情 | `npm run test -- tests/projects/project-crud.spec.ts` |
| `project-timeplan.spec.ts` | 时间计划、里程碑 | `npm run test -- tests/projects/project-timeplan.spec.ts` |
| `project-lifecycle.spec.ts` | 完整生命周期 | `npm run test -- tests/projects/project-lifecycle.spec.ts` |

---

## 🎯 常用测试场景

### 创建项目

```typescript
// 产品开发类项目
await projectFormPage.selectType('product');
await projectFormPage.fillBasicInfo({
  code: 'PRJ-001',
  name: '测试项目',
  description: '测试描述'
});
await projectFormPage.goToMembersTab();
// 选择成员...
await projectFormPage.goToTimePlanTab();
await projectFormPage.fillDateRange('2024-01-01', '2024-12-31');
await projectFormPage.submit();
```

### 搜索项目

```typescript
await projectListPage.searchProjects('关键词');
await page.waitForTimeout(1000);
```

### 编辑项目

```typescript
const projectCard = page.locator('text="项目名称"').locator('..');
await projectCard.locator('button:has-text("编辑")').click();
// 编辑表单...
await page.locator('button:has-text("保存修改")').click();
```

### 删除项目

```typescript
const projectCard = page.locator('text="项目名称"').locator('..');
await projectCard.locator('button:has-text("删除")').click();
// 确认删除
await page.locator('button:has-text("确认")').click();
```

---

## 🔧 调试技巧

### 查看失败原因

```bash
# 1. 查看截图
ls Test/E2E_AutoTest/reports/screenshots/

# 2. 查看HTML报告
npm run test:report

# 3. 使用调试模式
npm run test:debug -- tests/projects/project-form.spec.ts
```

### 常见问题解决

| 问题 | 解决方案 |
|------|---------|
| 元素找不到 | 增加等待时间或使用更精确的选择器 |
| 测试超时 | 增加 `test.setTimeout()` |
| 数据冲突 | 使用时间戳生成唯一数据 |
| 权限错误 | 检查测试用户角色 |
| 浏览器未安装 | 运行 `npx playwright install` |

---

## 📊 测试数据

### 测试用户

```typescript
// 管理员（全部权限）
{
  username: 'admin',
  password: 'admin123',
  role: 'admin'
}

// 技术经理（部分权限）
{
  username: 'tech_manager',
  password: '123456',
  role: 'tech_manager'
}

// 部门经理（部分权限）
{
  username: 'dept_manager',
  password: '123456',
  role: 'dept_manager'
}

// 工程师（只读权限）
{
  username: 'engineer',
  password: '123456',
  role: 'engineer'
}
```

### 生成唯一数据

```typescript
const timestamp = Date.now();
const projectName = `E2E测试项目_${timestamp}`;
const projectCode = `TEST-${timestamp}`;
```

---

## 🎨 选择器技巧

### 推荐选择器

```typescript
// 使用文本内容
page.locator('text="项目名称"')
page.locator('button:has-text("创建")')

// 使用data属性
page.locator('[data-testid="submit-button"]')

// 使用CSS选择器
page.locator('#project-name')
page.locator('.project-card')
```

### 避免的选择器

```typescript
// ❌ 不稳定的CSS类
page.locator('.css-123456')

// ❌ 过深的层级
page.locator('div > div > div > button')

// ❌ 索引选择
page.locator('button').nth(5)
```

---

## ⚡ 性能优化

### 减少等待时间

```typescript
// ✅ 使用智能等待
await waitForVisible(page, selector);

// ❌ 避免固定延迟
await page.waitForTimeout(5000);
```

### 并行执行

```bash
# 使用多个worker
npm run test:parallel -- tests/projects

# 或在playwright.config.ts中设置
workers: 8
```

---

## 📈 测试报告

### 查看报告

```bash
# HTML报告
npm run test:report

# 或直接打开
open Test/E2E_AutoTest/reports/html-report/index.html
```

### 报告内容

- 测试通过/失败统计
- 执行时间
- 失败截图和视频
- 错误堆栈
- 性能指标

---

## 🔍 测试覆盖检查

### 功能覆盖清单

```typescript
✅ 项目列表加载
✅ 项目搜索
✅ 项目筛选
✅ 项目排序
✅ 项目创建（两种类型）
✅ 项目编辑
✅ 项目删除
✅ 时间计划设置
✅ 里程碑管理
✅ 甘特图任务
✅ 权限控制（4种角色）
✅ 数据一致性
✅ 性能测试
```

---

## 🛠️ 开发工作流

### 修改代码后

```bash
# 1. 重新启动应用
cd app && npm run dev

# 2. 运行相关测试
cd ../Test/E2E_AutoTest
npm run test -- tests/project-form.spec.ts

# 3. 查看结果
npm run test:report
```

### 添加新测试

```typescript
test.describe('新功能测试', () => {
  test('应该执行新功能', async ({ page }) => {
    // 1. 设置测试环境
    await setupTest(page);

    // 2. 执行测试操作
    await performAction(page);

    // 3. 验证结果
    await expect(result).toBeVisible();
  });
});
```

---

## 📞 获取帮助

### 文档资源

- [Playwright文档](https://playwright.dev/)
- [完整测试报告](../reports/PROJECT_E2E_TEST_REPORT.md)
- [测试执行摘要](../reports/PROJECT_E2E_TEST_SUMMARY.md)

### 调试资源

```bash
# UI模式（可视化测试）
npm run test:ui -- tests/projects

# 调试模式（逐步执行）
npm run test:debug -- tests/projects/project-form.spec.ts

# 有头模式（显示浏览器）
npm run test:headed -- tests/projects
```

---

## ✅ 测试检查清单

### 提交前检查

- [ ] 所有测试通过
- [ ] 没有新的测试失败
- [ ] 测试覆盖率达标
- [ ] 性能指标正常
- [ ] 没有控制台错误
- [ ] 测试数据已清理

### 发布前检查

- [ ] 所有浏览器测试通过
- [ ] CI/CD测试通过
- [ ] 性能测试通过
- [ ] 安全测试通过
- [ ] 回归测试通过

---

**更新日期**: 2025-03-04
**版本**: 1.0.0
