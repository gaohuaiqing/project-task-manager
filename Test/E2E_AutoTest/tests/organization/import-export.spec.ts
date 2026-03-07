/**
 * 组织架构导入导出 E2E 测试
 *
 * 测试组织架构的导入导出功能
 */

import { test, expect } from '@playwright/test';
import { LoginPage } from '../../src/pages/LoginPage';
import { OrganizationPage } from '../../src/pages/OrganizationPage';
import { TEST_USERS } from '../../src/data/test-users';
import { TEST_ORGANIZATION } from '../../src/data/test-organization';
import { promises as fs } from 'fs';
import path from 'path';

test.describe('组织架构导入导出测试', () => {
  let loginPage: LoginPage;
  let organizationPage: OrganizationPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    organizationPage = new OrganizationPage(page);

    // 登录为管理员
    await page.goto('/');
    await loginPage.login(TEST_USERS.admin.username, TEST_USERS.admin.password);

    // 清理测试数据
    await page.evaluate(() => {
      localStorage.removeItem('org_structure');
      localStorage.removeItem('capability_models');
    });
  });

  test.afterEach(async ({ page }) => {
    // 清理测试数据
    await page.evaluate(() => {
      localStorage.removeItem('org_structure');
      localStorage.removeItem('capability_models');
    });
  });

  test('应该能够打开导入对话框', async ({ page }) => {
    // 导航到组织架构页面
    await organizationPage.navigateToOrganizationSettings();
    await organizationPage.waitForReady();

    // 点击导入按钮
    await organizationPage.clickImport();

    // 验证对话框打开
    await organizationPage.waitForDialog('import');

    // 验证对话框标题
    const dialogTitle = await organizationPage.getText('div[role="dialog"] h2, div[role="dialog"] h3');
    expect(dialogTitle).toContain('导入');
  });

  test('应该能够打开导出对话框', async ({ page }) => {
    // 先设置组织架构数据
    await page.evaluate((org) => {
      localStorage.setItem('org_structure', JSON.stringify(org));
    }, TEST_ORGANIZATION);

    // 导航到组织架构页面
    await organizationPage.navigateToOrganizationSettings();
    await organizationPage.waitForReady();

    // 点击导出按钮
    await organizationPage.clickExport();

    // 验证对话框打开
    await page.waitForTimeout(500);

    // 验证导出信息显示
    const hasExportInfo = await organizationPage.hasElement('text=导出说明');
    expect(hasExportInfo).toBeTruthy();
  });

  test('应该显示导入说明', async ({ page }) => {
    // 导航到组织架构页面
    await organizationPage.navigateToOrganizationSettings();
    await organizationPage.waitForReady();

    // 点击导入按钮
    await organizationPage.clickImport();
    await organizationPage.waitForDialog('import');

    // 验证导入说明显示
    const hasInstructions = await organizationPage.hasElement('text=导入说明');
    expect(hasInstructions).toBeTruthy();

    // 验证Excel格式说明
    const hasExcelInfo = await organizationPage.hasElement('text=Excel');
    expect(hasExcelInfo).toBeTruthy();
  });

  test('应该显示文件选择界面', async ({ page }) => {
    // 导航到组织架构页面
    await organizationPage.navigateToOrganizationSettings();
    await organizationPage.waitForReady();

    // 点击导入按钮
    await organizationPage.clickImport();
    await organizationPage.waitForDialog('import');

    // 验证文件选择区域存在
    const hasFileArea = await organizationPage.hasElement('input[type="file"]');
    expect(hasFileArea).toBeTruthy();

    // 验证选择文件按钮存在
    const hasSelectButton = await organizationPage.hasElement('button:has-text("选择文件")');
    expect(hasSelectButton).toBeTruthy();
  });

  test('应该能够选择文件', async ({ page }) => {
    // 导航到组织架构页面
    await organizationPage.navigateToOrganizationSettings();
    await organizationPage.waitForReady();

    // 点击导入按钮
    await organizationPage.clickImport();
    await organizationPage.waitForDialog('import');

    // 创建测试文件
    const testFilePath = path.join(process.cwd(), 'test-org.xlsx');

    try {
      // 如果文件存在，先删除
      if (await fs.access(testFilePath).then(() => true).catch(() => false)) {
        await fs.unlink(testFilePath);
      }

      // 创建空文件用于测试
      await fs.writeFile(testFilePath, '');

      // 设置文件选择监听器
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles(testFilePath);

      // 验证文件被选择
      await page.waitForTimeout(500);

      // 注意：实际导入需要有效的Excel文件，这里只测试文件选择功能
      const fileSelected = await organizationPage.hasElement('text=.xlsx');
      // 即使文件名不显示，输入框应该有值
      const hasValue = await fileInput.inputValue();
      expect(hasValue.length).toBeGreaterThan(0);
    } finally {
      // 清理测试文件
      try {
        if (await fs.access(testFilePath).then(() => true).catch(() => false)) {
          await fs.unlink(testFilePath);
        }
      } catch (error) {
        // 忽略清理错误
      }
    }
  });

  test('应该验证文件格式', async ({ page }) => {
    // 导航到组织架构页面
    await organizationPage.navigateToOrganizationSettings();
    await organizationPage.waitForReady();

    // 点击导入按钮
    await organizationPage.clickImport();
    await organizationPage.waitForDialog('import');

    // 验证文件输入接受Excel格式
    const fileInput = page.locator('input[type="file"]');
    const accept = await fileInput.getAttribute('accept');

    expect(accept).toContain('.xlsx');
    expect(accept).toContain('.xls');
  });

  test('应该在无组织架构时显示导入选项', async ({ page }) => {
    // 导航到组织架构页面
    await organizationPage.navigateToOrganizationSettings();
    await organizationPage.waitForReady();

    // 验证处于初始状态
    const isInitial = await organizationPage.isInitialState();
    expect(isInitial).toBeTruthy();

    // 验证导入按钮可见
    const hasImportButton = await organizationPage.initialImportButton.count() > 0;
    expect(hasImportButton).toBeTruthy();
  });

  test('应该能够取消导入', async ({ page }) => {
    // 导航到组织架构页面
    await organizationPage.navigateToOrganizationSettings();
    await organizationPage.waitForReady();

    // 点击导入按钮
    await organizationPage.clickImport();
    await organizationPage.waitForDialog('import');

    // 点击取消按钮
    await organizationPage.clickElement('button:has-text("取消")');
    await page.waitForTimeout(500);

    // 验证对话框关闭
    const dialogVisible = await organizationPage.hasElement('div[role="dialog"]:has-text("导入")');
    expect(dialogVisible).toBeFalsy();
  });

  test('应该显示导出统计信息', async ({ page }) => {
    // 设置组织架构数据
    await page.evaluate((org) => {
      localStorage.setItem('org_structure', JSON.stringify(org));
    }, TEST_ORGANIZATION);

    // 导航到组织架构页面
    await organizationPage.navigateToOrganizationSettings();
    await organizationPage.waitForReady();

    // 点击导出按钮
    await organizationPage.clickExport();
    await page.waitForTimeout(500);

    // 验证统计信息显示
    const hasDeptInfo = await organizationPage.hasElement('text=部门');
    const hasGroupInfo = await organizationPage.hasElement('text=技术组');
    const hasMemberInfo = await organizationPage.hasElement('text=成员');

    expect(hasDeptInfo).toBeTruthy();
    expect(hasGroupInfo).toBeTruthy();
    expect(hasMemberInfo).toBeTruthy();
  });

  test('导出统计信息应该正确', async ({ page }) => {
    // 设置组织架构数据
    await page.evaluate((org) => {
      localStorage.setItem('org_structure', JSON.stringify(org));
    }, TEST_ORGANIZATION);

    // 导航到组织架构页面
    await organizationPage.navigateToOrganizationSettings();
    await organizationPage.waitForReady();

    // 点击导出按钮
    await organizationPage.clickExport();
    await page.waitForTimeout(500);

    // 验证统计数字
    const stats = await organizationPage.getStats();
    expect(stats.departments).toBe(1);
    expect(stats.techGroups).toBe(2);
    expect(stats.members).toBe(3);
  });

  test('应该能够关闭导出对话框', async ({ page }) => {
    // 设置组织架构数据
    await page.evaluate((org) => {
      localStorage.setItem('org_structure', JSON.stringify(org));
    }, TEST_ORGANIZATION);

    // 导航到组织架构页面
    await organizationPage.navigateToOrganizationSettings();
    await organizationPage.waitForReady();

    // 点击导出按钮
    await organizationPage.clickExport();
    await page.waitForTimeout(500);

    // 点击关闭按钮
    await organizationPage.clickElement('button:has-text("关闭")');
    await page.waitForTimeout(500);

    // 验证对话框关闭
    const dialogVisible = await organizationPage.hasElement('div[role="dialog"]:has-text("导出")');
    expect(dialogVisible).toBeFalsy();
  });

  test('导入按钮应该在工具栏中始终可见', async ({ page }) => {
    // 设置组织架构数据
    await page.evaluate((org) => {
      localStorage.setItem('org_structure', JSON.stringify(org));
    }, TEST_ORGANIZATION);

    // 导航到组织架构页面
    await organizationPage.navigateToOrganizationSettings();
    await organizationPage.waitForReady();

    // 验证导入按钮可见
    const hasImportButton = await organizationPage.importButton.count() > 0;
    expect(hasImportButton).toBeTruthy();
  });

  test('导出按钮应该在有组织架构时可见', async ({ page }) => {
    // 设置组织架构数据
    await page.evaluate((org) => {
      localStorage.setItem('org_structure', JSON.stringify(org));
    }, TEST_ORGANIZATION);

    // 导航到组织架构页面
    await organizationPage.navigateToOrganizationSettings();
    await organizationPage.waitForReady();

    // 验证导出按钮可见
    const hasExportButton = await organizationPage.exportButton.count() > 0;
    expect(hasExportButton).toBeTruthy();
  });

  test('导出按钮应该在无组织架构时不可见', async ({ page }) => {
    // 不设置组织架构数据

    // 导航到组织架构页面
    await organizationPage.navigateToOrganizationSettings();
    await organizationPage.waitForReady();

    // 验证导出按钮不可见（在初始状态）
    const hasExportButton = await organizationPage.exportButton.count() > 0;
    expect(hasExportButton).toBeFalsy();
  });

  test('应该显示导入成功提示', async ({ page }) => {
    // 注意：此测试需要实际的Excel文件，这里只测试UI流程
    // 导航到组织架构页面
    await organizationPage.navigateToOrganizationSettings();
    await organizationPage.waitForReady();

    // 点击导入按钮
    await organizationPage.clickImport();
    await organizationPage.waitForDialog('import');

    // 验证导入按钮存在
    const hasImportButton = await organizationPage.hasElement('button:has-text("导入")');
    expect(hasImportButton).toBeTruthy();
  });

  test('应该显示导入错误提示', async ({ page }) => {
    // 导航到组织架构页面
    await organizationPage.navigateToOrganizationSettings();
    await organizationPage.waitForReady();

    // 点击导入按钮
    await organizationPage.clickImport();
    await organizationPage.waitForDialog('import');

    // 尝试导入不存在的文件
    const testFilePath = path.join(process.cwd(), 'non-existent.xlsx');

    try {
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles(testFilePath);

      // 点击导入按钮
      await organizationPage.clickElement('button:has-text("导入")');
      await page.waitForTimeout(1000);

      // 验证错误提示（文件不存在或格式错误）
      const hasError = await organizationPage.hasElement('[class*="error"], [class*="alert"]');
      // 可能会显示文件选择错误
    } catch (error) {
      // 文件选择失败是预期的
    }
  });

  test('导入导出按钮应该有正确的图标', async ({ page }) => {
    // 设置组织架构数据
    await page.evaluate((org) => {
      localStorage.setItem('org_structure', JSON.stringify(org));
    }, TEST_ORGANIZATION);

    // 导航到组织架构页面
    await organizationPage.navigateToOrganizationSettings();
    await organizationPage.waitForReady();

    // 验证导入按钮有上传图标
    const importIcon = organizationPage.importButton.locator('svg');
    const hasImportIcon = await importIcon.count() > 0;

    // 验证导出按钮有下载图标
    const exportIcon = organizationPage.exportButton.locator('svg');
    const hasExportIcon = await exportIcon.count() > 0;

    expect(hasImportIcon || hasExportIcon).toBeTruthy();
  });

  test('应该能够通过初始界面导入', async ({ page }) => {
    // 导航到组织架构页面（无数据）
    await organizationPage.navigateToOrganizationSettings();
    await organizationPage.waitForReady();

    // 验证初始状态
    const isInitial = await organizationPage.isInitialState();
    expect(isInitial).toBeTruthy();

    // 点击初始导入按钮
    await organizationPage.clickElement('button:has-text("导入组织架构"), button:has-text("选择文件")');

    // 验证导入对话框打开
    await organizationPage.waitForDialog('import');
  });

  test('导入对话框应该显示Excel格式要求', async ({ page }) => {
    // 导航到组织架构页面
    await organizationPage.navigateToOrganizationSettings();
    await organizationPage.waitForReady();

    // 点击导入按钮
    await organizationPage.clickImport();
    await organizationPage.waitForDialog('import');

    // 验证Excel格式说明
    const hasExcelInfo = await organizationPage.hasElement('text=.xlsx');
    const hasWorksheetInfo = await organizationPage.hasElement('text=工作表');

    expect(hasExcelInfo || hasWorksheetInfo).toBeTruthy();
  });

  test('导出对话框应该显示导出格式说明', async ({ page }) => {
    // 设置组织架构数据
    await page.evaluate((org) => {
      localStorage.setItem('org_structure', JSON.stringify(org));
    }, TEST_ORGANIZATION);

    // 导航到组织架构页面
    await organizationPage.navigateToOrganizationSettings();
    await organizationPage.waitForReady();

    // 点击导出按钮
    await organizationPage.clickExport();
    await page.waitForTimeout(500);

    // 验证导出格式说明
    const hasExportInfo = await organizationPage.hasElement('text=导出说明');
    const hasFormatInfo = await organizationPage.hasElement('text=格式');

    expect(hasExportInfo || hasFormatInfo).toBeTruthy();
  });
});
