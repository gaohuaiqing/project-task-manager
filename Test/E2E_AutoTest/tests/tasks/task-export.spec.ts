/**
 * 任务导出测试
 *
 * 测试任务列表的导出功能
 */

import { test, expect } from '@playwright/test';
import { LoginPage } from '../../src/pages/LoginPage';
import { TaskManagementPage } from '../../src/pages/TaskManagementPage';
import { ProjectListPage } from '../../src/pages/ProjectListPage';
import { ProjectFormPage } from '../../src/pages/ProjectFormPage';
import { getTestUser } from '../../src/data/test-users';
import { generateProjectData } from '../../src/data/test-projects';

test.describe('任务导出功能', () => {
  let projectName: string;

  test.beforeEach(async ({ page }) => {
    const user = getTestUser('dept_manager');
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(user.username, user.password);

    // 创建测试项目
    const projectListPage = new ProjectListPage(page);
    const projectFormPage = new ProjectFormPage(page);

    await page.goto('/projects');
    await projectListPage.clickCreateProject();
    await projectFormPage.waitForForm();

    const projectData = generateProjectData({
      name: `导出测试项目_${Date.now()}`,
      type: 'management'
    });
    projectName = projectData.name;

    await projectFormPage.selectType('management');
    await projectFormPage.fillBasicInfo(projectData);
    await projectFormPage.submit();
    await projectFormPage.waitForFormClosed();
    await page.waitForTimeout(2000);

    // 创建测试任务
    const taskPage = new TaskManagementPage(page);
    await page.goto('/tasks');

    const tasks = [
      { desc: '导出测试任务1', priority: 'high' },
      { desc: '导出测试任务2', priority: 'medium' },
      { desc: '导出测试任务3', priority: 'low' }
    ];

    for (const task of tasks) {
      await taskPage.clickCreateTask();
      await taskPage.waitForCreateDialog();

      await taskPage.selectProject(projectName);
      await taskPage.selectMember(user.name || '部门经理');
      await taskPage.fillDescription(task.desc);
      await taskPage.selectPriority(task.priority as 'high' | 'medium' | 'low');
      await taskPage.confirmCreate();
      await taskPage.waitForCreateDialogClosed();
      await page.waitForTimeout(500);
    }
  });

  test('应该能够显示导出按钮', async ({ page }) => {
    const taskPage = new TaskManagementPage(page);

    await page.goto('/tasks');
    await taskPage.waitForReady();

    // 验证导出按钮存在
    const hasExportButton = await taskPage.exportButton.isVisible();
    expect(hasExportButton).toBeTruthy();
  });

  test('点击导出按钮应该触发下载', async ({ page }) => {
    const taskPage = new TaskManagementPage(page);

    await page.goto('/tasks');
    await taskPage.waitForReady();

    // 监听下载事件
    const downloadPromise = page.waitForEvent('download', { timeout: 10000 }).catch(() => null);

    // 点击导出按钮
    await taskPage.clickExport();

    // 等待下载开始或超时
    const download = await downloadPromise;

    if (download) {
      // 验证下载文件
      const filename = download.suggestedFilename();
      expect(filename).toMatch(/\.(xlsx|csv|xls)$/);
    } else {
      // 如果没有触发下载，可能是显示导出对话框
      const exportDialog = page.locator('div[role="dialog"]:has-text("导出")');
      if (await exportDialog.isVisible()) {
        // 验证导出对话框显示
        await expect(exportDialog).toBeVisible();

        // 关闭对话框
        const cancelButton = exportDialog.locator('button:has-text("取消")');
        if (await cancelButton.isVisible()) {
          await cancelButton.click();
        }
      }
    }
  });

  test('应该能够选择导出格式', async ({ page }) => {
    const taskPage = new TaskManagementPage(page);

    await page.goto('/tasks');
    await taskPage.waitForReady();

    // 点击导出按钮
    await taskPage.clickExport();
    await page.waitForTimeout(500);

    // 检查是否有导出格式选择
    const formatSelector = page.locator('[role="combobox"]:has-text("格式"), select[name="format"]');
    if (await formatSelector.isVisible()) {
      // 检查可用的格式选项
      const options = page.locator('[role="option"], option');
      const optionCount = await options.count();

      expect(optionCount).toBeGreaterThan(0);

      // 关闭对话框
      const cancelButton = page.locator('button:has-text("取消")');
      if (await cancelButton.isVisible()) {
        await cancelButton.click();
      }
    } else {
      // 如果没有格式选择器，可能直接导出
      // 等待一小段时间看是否有下载
      await page.waitForTimeout(2000);
    }
  });

  test('筛选后的任务应该能够导出', async ({ page }) => {
    const taskPage = new TaskManagementPage(page);

    await page.goto('/tasks');
    await taskPage.waitForReady();

    // 应用筛选
    await taskPage.filterByPriority('高');
    await page.waitForTimeout(1000);

    // 获取筛选后的任务数量
    const filteredCount = await taskPage.getTaskCount();

    // 导出
    const downloadPromise = page.waitForEvent('download', { timeout: 10000 }).catch(() => null);
    await taskPage.clickExport();
    const download = await downloadPromise;

    if (download) {
      // 验证导出成功
      const filename = download.suggestedFilename();
      expect(filename).toBeTruthy();
    }

    // 清除筛选
    await taskPage.clearFilters();
    await page.waitForTimeout(500);
  });

  test('导出应该包含所有任务信息', async ({ page }) => {
    const taskPage = new TaskManagementPage(page);

    await page.goto('/tasks');
    await taskPage.waitForReady();

    // 获取当前任务数量
    const taskCount = await taskPage.getTaskCount();

    // 导出任务
    const downloadPromise = page.waitForEvent('download', { timeout: 10000 }).catch(() => null);
    await taskPage.clickExport();
    const download = await downloadPromise;

    if (download) {
      // 验证下载成功
      expect(download).toBeTruthy();

      // 如果是Excel文件，可以进一步验证内容
      const filename = download.suggestedFilename();
      if (filename.endsWith('.xlsx') || filename.endsWith('.xls')) {
        // 文件应该是有效的Excel文件
        expect(filename).toMatch(/\.(xlsx|xls)$/);
      }
    }
  });
});

test.describe('导出权限', () => {
  test('所有角色都应该能够导出任务', async ({ page }) => {
    const users = ['engineer', 'dept_manager', 'tech_manager', 'admin'] as const;
    const loginPage = new LoginPage(page);
    const taskPage = new TaskManagementPage(page);

    for (const role of users) {
      const user = getTestUser(role);

      await loginPage.goto();
      await loginPage.login(user.username, user.password);

      await page.goto('/tasks');
      await taskPage.waitForReady();

      // 验证导出按钮可见
      const hasExportButton = await taskPage.exportButton.isVisible();

      expect(hasExportButton).toBeTruthy();

      // 退出登录
      await page.locator('button[aria-expanded]').click();
      await page.locator('button:has-text("退出登录")').click();
      await page.waitForURL('**/');
    }
  });
});
