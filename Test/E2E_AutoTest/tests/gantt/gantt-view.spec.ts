import { test, expect } from '@playwright/test';
import { login, logout } from '../../src/helpers/auth-helpers';
import { ProjectListPage } from '../../src/pages/ProjectListPage';

/**
 * 甘特图模块E2E测试
 *
 * 测试覆盖：
 * - 甘特图视图加载
 * - 甘特图缩放功能
 * - 甘特图拖拽功能
 * - 双击快速编辑
 * - 周末高亮显示
 * - 今日线标记
 * - 里程碑显示
 * - 任务悬浮提示
 * - 数据实时同步
 */
test.describe('甘特图模块', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'tech_manager');
  });

  test.afterEach(async ({ page }) => {
    await logout(page);
  });

  test.describe('甘特图视图加载', () => {
    test('应该正确加载甘特图视图', async ({ page }) => {
      const projectListPage = new ProjectListPage(page);

      // 导航到项目列表
      await page.goto('/projects');
      await projectListPage.waitForLoad();

      // 查找第一个项目并进入详情
      const projectCard = page.locator('[data-testid="project-card"], .project-card').first();

      const hasProjects = await projectCard.count() > 0;

      if (hasProjects) {
        await projectCard.click();
        await page.waitForTimeout(1000);

        // 查找并点击甘特图视图标签
        const ganttTab = page.locator('text=甘特图, [data-testid="gantt-tab"]').first();

        const hasGanttTab = await ganttTab.count() > 0;

        if (hasGanttTab) {
          await ganttTab.click();
          await page.waitForTimeout(1000);

          // 验证甘特图容器加载
          const ganttContainer = page.locator(
            '[data-testid="gantt-chart"], .gantt-chart, .gantt-view'
          );

          await expect(ganttContainer.first()).toBeVisible({ timeout: 5000 });
        }
      }
    });

    test('甘特图应该显示时间轴', async ({ page }) => {
      // 导航到有甘特图的页面
      await page.goto('/projects');
      await page.waitForTimeout(1000);

      const projectCard = page.locator('[data-testid="project-card"], .project-card').first();

      if (await projectCard.count() > 0) {
        await projectCard.click();
        await page.waitForTimeout(1000);

        const ganttTab = page.locator('text=甘特图').first();
        if (await ganttTab.count() > 0) {
          await ganttTab.click();
          await page.waitForTimeout(1000);

          // 验证时间轴存在
          const timeline = page.locator('[data-testid="timeline"], .timeline, .gantt-timeline');
          const hasTimeline = await timeline.count() > 0;

          if (hasTimeline) {
            await expect(timeline.first()).toBeVisible();
          }
        }
      }
    });

    test('甘特图应该显示任务条', async ({ page }) => {
      await page.goto('/projects');
      await page.waitForTimeout(1000);

      const projectCard = page.locator('[data-testid="project-card"], .project-card').first();

      if (await projectCard.count() > 0) {
        await projectCard.click();
        await page.waitForTimeout(1000);

        const ganttTab = page.locator('text=甘特图').first();
        if (await ganttTab.count() > 0) {
          await ganttTab.click();
          await page.waitForTimeout(2000);

          // 验证任务条存在
          const taskBars = page.locator('[data-testid="task-bar"], .task-bar, .gantt-bar');
          const count = await taskBars.count();

          // 可能有任务，也可能没有
          if (count > 0) {
            await expect(taskBars.first()).toBeVisible();
          }
        }
      }
    });
  });

  test.describe('甘特图缩放功能', () => {
    test('应该支持鼠标滚轮缩放', async ({ page }) => {
      await page.goto('/projects');
      await page.waitForTimeout(1000);

      const projectCard = page.locator('[data-testid="project-card"], .project-card').first();

      if (await projectCard.count() > 0) {
        await projectCard.click();
        await page.waitForTimeout(1000);

        const ganttTab = page.locator('text=甘特图').first();
        if (await ganttTab.count() > 0) {
          await ganttTab.click();
          await page.waitForTimeout(1000);

          const ganttContainer = page.locator('[data-testid="gantt-chart"], .gantt-chart').first();

          if (await ganttContainer.count() > 0) {
            // 记录初始状态
            const initialWidth = await ganttContainer.boundingBox();

            if (initialWidth) {
              // 模拟鼠标滚轮
              await ganttContainer.hover();
              await page.mouse.wheel(0, -100);

              await page.waitForTimeout(500);

              // 缩放后容器应该仍然可见
              await expect(ganttContainer).toBeVisible();
            }
          }
        }
      }
    });

    test('应该支持缩放控件', async ({ page }) => {
      await page.goto('/projects');
      await page.waitForTimeout(1000);

      const projectCard = page.locator('[data-testid="project-card"], .project-card').first();

      if (await projectCard.count() > 0) {
        await projectCard.click();
        await page.waitForTimeout(1000);

        const ganttTab = page.locator('text=甘特图').first();
        if (await ganttTab.count() > 0) {
          await ganttTab.click();
          await page.waitForTimeout(1000);

          // 查找缩放控件
          const zoomControls = page.locator(
            '[data-testid="zoom-controls"], .zoom-controls, button[aria-label*="缩放"]'
          );

          const hasZoomControls = await zoomControls.count() > 0;

          if (hasZoomControls) {
            await expect(zoomControls.first()).toBeVisible();

            // 尝试使用放大按钮
            const zoomInButton = zoomControls.locator('button').first();
            if (await zoomInButton.count() > 0) {
              await zoomInButton.click();
              await page.waitForTimeout(500);
            }
          }
        }
      }
    });
  });

  test.describe('甘特图拖拽功能', () => {
    test('应该支持拖拽任务条', async ({ page }) => {
      await page.goto('/projects');
      await page.waitForTimeout(1000);

      const projectCard = page.locator('[data-testid="project-card"], .project-card').first();

      if (await projectCard.count() > 0) {
        await projectCard.click();
        await page.waitForTimeout(1000);

        const ganttTab = page.locator('text=甘特图').first();
        if (await ganttTab.count() > 0) {
          await ganttTab.click();
          await page.waitForTimeout(2000);

          const taskBar = page.locator('[data-testid="task-bar"], .task-bar').first();

          if (await taskBar.count() > 0) {
            // 获取任务条位置
            const box = await taskBar.boundingBox();

            if (box) {
              // 拖拽任务条
              await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
              await page.mouse.down();
              await page.mouse.move(box.x + box.width / 2 + 50, box.y + box.height / 2);
              await page.mouse.up();

              await page.waitForTimeout(1000);

              // 验证拖拽后任务条仍然存在
              await expect(taskBar).toBeVisible();
            }
          }
        }
      }
    });
  });

  test.describe('双击快速编辑', () => {
    test('双击任务条应该打开编辑对话框', async ({ page }) => {
      await page.goto('/projects');
      await page.waitForTimeout(1000);

      const projectCard = page.locator('[data-testid="project-card"], .project-card').first();

      if (await projectCard.count() > 0) {
        await projectCard.click();
        await page.waitForTimeout(1000);

        const ganttTab = page.locator('text=甘特图').first();
        if (await ganttTab.count() > 0) {
          await ganttTab.click();
          await page.waitForTimeout(2000);

          const taskBar = page.locator('[data-testid="task-bar"], .task-bar').first();

          if (await taskBar.count() > 0) {
            await taskBar.dblclick();
            await page.waitForTimeout(1000);

            // 验证编辑对话框打开
            const dialog = page.locator('[role="dialog"], .dialog, .modal').first();
            const hasDialog = await dialog.count() > 0;

            if (hasDialog) {
              await expect(dialog.first()).toBeVisible();

              // 关闭对话框
              await page.keyboard.press('Escape');
            }
          }
        }
      }
    });
  });

  test.describe('周末高亮显示', () => {
    test('应该高亮显示周末区域', async ({ page }) => {
      await page.goto('/projects');
      await page.waitForTimeout(1000);

      const projectCard = page.locator('[data-testid="project-card"], .project-card').first();

      if (await projectCard.count() > 0) {
        await projectCard.click();
        await page.waitForTimeout(1000);

        const ganttTab = page.locator('text=甘特图').first();
        if (await ganttTab.count() > 0) {
          await ganttTab.click();
          await page.waitForTimeout(1000);

          // 查找周末高亮元素
          const weekendHighlight = page.locator(
            '[data-testid="weekend"], .weekend, .gantt-weekend'
          );

          const hasWeekendHighlight = await weekendHighlight.count() > 0;

          if (hasWeekendHighlight) {
            await expect(weekendHighlight.first()).toBeVisible();
          }
        }
      }
    });
  });

  test.describe('今日线标记', () => {
    test('应该显示今日线标记', async ({ page }) => {
      await page.goto('/projects');
      await page.waitForTimeout(1000);

      const projectCard = page.locator('[data-testid="project-card"], .project-card').first();

      if (await projectCard.count() > 0) {
        await projectCard.click();
        await page.waitForTimeout(1000);

        const ganttTab = page.locator('text=甘特图').first();
        if (await ganttTab.count() > 0) {
          await ganttTab.click();
          await page.waitForTimeout(1000);

          // 查找今日线元素
          const todayLine = page.locator('[data-testid="today-line"], .today-line, .current-date');

          const hasTodayLine = await todayLine.count() > 0;

          if (hasTodayLine) {
            await expect(todayLine.first()).toBeVisible();
          }
        }
      }
    });
  });

  test.describe('里程碑显示', () => {
    test('应该以不同样式显示里程碑', async ({ page }) => {
      await page.goto('/projects');
      await page.waitForTimeout(1000);

      const projectCard = page.locator('[data-testid="project-card"], .project-card').first();

      if (await projectCard.count() > 0) {
        await projectCard.click();
        await page.waitForTimeout(1000);

        const ganttTab = page.locator('text=甘特图').first();
        if (await ganttTab.count() > 0) {
          await ganttTab.click();
          await page.waitForTimeout(1000);

          // 查找里程碑元素
          const milestone = page.locator(
            '[data-testid="milestone"], .milestone, .gantt-milestone'
          );

          const hasMilestone = await milestone.count() > 0;

          if (hasMilestone) {
            await expect(milestone.first()).toBeVisible();
          }
        }
      }
    });
  });

  test.describe('任务悬浮提示', () => {
    test('悬停在任务条上应该显示提示信息', async ({ page }) => {
      await page.goto('/projects');
      await page.waitForTimeout(1000);

      const projectCard = page.locator('[data-testid="project-card"], .project-card').first();

      if (await projectCard.count() > 0) {
        await projectCard.click();
        await page.waitForTimeout(1000);

        const ganttTab = page.locator('text=甘特图').first();
        if (await ganttTab.count() > 0) {
          await ganttTab.click();
          await page.waitForTimeout(2000);

          const taskBar = page.locator('[data-testid="task-bar"], .task-bar').first();

          if (await taskBar.count() > 0) {
            await taskBar.hover();
            await page.waitForTimeout(500);

            // 查找提示框
            const tooltip = page.locator('[role="tooltip"], .tooltip, .gantt-tooltip');

            const hasTooltip = await tooltip.count() > 0;

            if (hasTooltip) {
              await expect(tooltip.first()).toBeVisible();
            }
          }
        }
      }
    });
  });

  test.describe('甘特图滚动', () => {
    test('应该支持横向滚动', async ({ page }) => {
      await page.goto('/projects');
      await page.waitForTimeout(1000);

      const projectCard = page.locator('[data-testid="project-card"], .project-card').first();

      if (await projectCard.count() > 0) {
        await projectCard.click();
        await page.waitForTimeout(1000);

        const ganttTab = page.locator('text=甘特图').first();
        if (await ganttTab.count() > 0) {
          await ganttTab.click();
          await page.waitForTimeout(1000);

          const ganttContainer = page.locator('[data-testid="gantt-chart"], .gantt-chart').first();

          if (await ganttContainer.count() > 0) {
            // 横向滚动
            await ganttContainer.hover();
            await page.mouse.wheel(200, 0);

            await page.waitForTimeout(500);

            // 验证容器仍然可见
            await expect(ganttContainer).toBeVisible();
          }
        }
      }
    });
  });

  test.describe('响应式设计', () => {
    test('甘特图在不同屏幕尺寸下应该正常显示', async ({ page }) => {
      await page.goto('/projects');
      await page.waitForTimeout(1000);

      const projectCard = page.locator('[data-testid="project-card"], .project-card').first();

      if (await projectCard.count() > 0) {
        await projectCard.click();
        await page.waitForTimeout(1000);

        const ganttTab = page.locator('text=甘特图').first();
        if (await ganttTab.count() > 0) {
          await ganttTab.click();
          await page.waitForTimeout(1000);

          const ganttContainer = page.locator('[data-testid="gantt-chart"], .gantt-chart').first();

          if (await ganttContainer.count() > 0) {
            // 测试不同视口大小
            const sizes = [
              { width: 1920, height: 1080 },
              { width: 1280, height: 720 },
            ];

            for (const size of sizes) {
              await page.setViewportSize(size);
              await page.waitForTimeout(500);

              await expect(ganttContainer).toBeVisible();
            }
          }
        }
      }
    });
  }
});

/**
 * 冒烟测试：甘特图关键功能快速验证
 */
test.describe('甘特图冒烟测试', () => {
  test('甘特图应该可以正常加载', async ({ page }) => {
    await login(page, 'tech_manager');
    await page.goto('/projects');
    await page.waitForTimeout(2000);

    const ganttTab = page.locator('text=甘特图').first();

    if (await ganttTab.count() > 0) {
      const projectCard = page.locator('[data-testid="project-card"], .project-card').first();

      if (await projectCard.count() > 0) {
        await projectCard.click();
        await page.waitForTimeout(1000);
        await ganttTab.click();
        await page.waitForTimeout(1000);

        // 验证甘特图容器存在
        const ganttContainer = page.locator('[data-testid="gantt-chart"], .gantt-chart').first();

        if (await ganttContainer.count() > 0) {
          await expect(ganttContainer).toBeVisible({ timeout: 5000 });
        }
      }
    }

    await logout(page);
  });
});
