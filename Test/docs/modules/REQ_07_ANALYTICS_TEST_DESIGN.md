# 模块测试设计：分析模块

> **模块编号**: 07
> **模块名称**: 分析模块
> **需求文档**: REQ_07_analytics.md
> **创建日期**: 2026-03-20
> **版本**: 1.0

---

## 1. 模块概述

### 1.1 功能范围

| 子模块 | 功能描述 | 测试用例数 |
|--------|----------|------------|
| 数据看板 | 统计卡片、图表、提醒 | 5 |
| 报表分析 | 4种报表、导出 | 10 |
| 系统配置 | 类型配置、节假日 | 5 |
| 导入导出 | Excel/CSV/JSON | 4 |
| **总计** | | **24** |

---

## 2. API 测试设计

### 2.1 数据看板 API

#### API-DASH-001~003

```typescript
describe('API-DASH: 数据看板', () => {
  test('API-DASH-001: 统计卡片(4个)', async () => {
    const response = await request.get('/api/dashboard/stats');

    expect(response.status).toBe(200);
    expect(response.data.data).toMatchObject({
      project_count: expect.any(Number),
      in_progress_task_count: expect.any(Number),
      completed_task_count: expect.any(Number),
      delay_warning_count: expect.any(Number)
    });
  });

  test('API-DASH-002: 趋势数据', async () => {
    const response = await request.get('/api/dashboard/trends', {
      start_date: '2026-03-01',
      end_date: '2026-03-31',
      granularity: 'week'
    });

    expect(response.status).toBe(200);
    expect(response.data.data).toBeInstanceOf(Array);
    expect(response.data.data[0]).toMatchObject({
      date: expect.any(String),
      completed_count: expect.any(Number),
      created_count: expect.any(Number)
    });
  });

  test('API-DASH-003: 紧急任务列表', async () => {
    const response = await request.get('/api/dashboard/urgent-tasks');

    expect(response.status).toBe(200);
    // 只返回紧急和延期预警的任务
    response.data.data.items.forEach(task => {
      expect(['urgent', 'delay_warning', 'delayed']).toContain(task.priority);
    });
  });
});
```

### 2.2 报表分析 API

#### API-RPT-001~005

```typescript
describe('API-RPT: 报表分析', () => {
  test('API-RPT-001: 项目进度报表', async () => {
    const response = await request.get('/api/reports/project-progress', {
      project_id: 'p1',
      start_date: '2026-03-01',
      end_date: '2026-03-31'
    });

    expect(response.status).toBe(200);
    expect(response.data.data).toMatchObject({
      summary: {
        total_progress: expect.any(Number),
        completed_count: expect.any(Number),
        in_progress_count: expect.any(Number),
        milestone_count: expect.any(Number)
      },
      chart_data: {
        progress_trend: expect.any(Array),
        status_distribution: expect.any(Array)
      },
      table_data: expect.any(Array) // 里程碑列表
    });
  });

  test('API-RPT-002: 任务统计报表', async () => {
    const response = await request.get('/api/reports/task-statistics', {
      project_id: 'p1'
    });

    expect(response.status).toBe(200);
    expect(response.data.data).toMatchObject({
      summary: {
        total_count: expect.any(Number),
        avg_completion_rate: expect.any(Number),
        delay_rate: expect.any(Number),
        urgent_count: expect.any(Number)
      }
    });
  });

  test('API-RPT-003: 延期分析报表', async () => {
    const response = await request.get('/api/reports/delay-analysis', {
      delay_type: ['delay_warning', 'delayed', 'overdue_completed']
    });

    expect(response.status).toBe(200);
    expect(response.data.data.table_data[0]).toMatchObject({
      task_name: expect.any(String),
      assignee_name: expect.any(String),
      delay_days: expect.any(Number),
      delay_reason: expect.any(String),
      status: expect.any(String)
    });
  });

  test('API-RPT-004: 成员任务分析', async () => {
    const response = await request.get('/api/reports/member-analysis', {
      member_id: 'm1'
    });

    expect(response.status).toBe(200);
    expect(response.data.data).toMatchObject({
      summary: {
        current_task_count: expect.any(Number),
        full_time_ratio_sum: expect.any(Number),
        avg_completion_rate: expect.any(Number),
        capability_match: expect.any(Number)
      },
      capability_display: expect.stringMatching(/.+:\s*.+\|/), // 格式: 模型: 维度1:分数 | 维度2:分数
      chart_data: {
        task_load: expect.any(Array),
        completion_trend: expect.any(Array)
      }
    });
  });

  test('API-RPT-005: 报表导出Excel', async () => {
    const response = await request.get('/api/reports/project-progress/export', {
      format: 'xlsx',
      project_id: 'p1'
    });

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    expect(response.headers['content-disposition']).toContain('项目进度报表_');
  });
});
```

### 2.3 系统配置 API

#### API-CFG-001~003

```typescript
describe('API-CFG: 系统配置', () => {
  test('API-CFG-001: 项目类型配置', async () => {
    // 获取
    const getResponse = await request.get('/api/config/project-types');
    expect(getResponse.data.data.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'product_dev' }),
        expect.objectContaining({ code: 'func_mgmt' }),
        expect.objectContaining({ code: 'material_sub' }),
        expect.objectContaining({ code: 'quality_handle' })
      ])
    );

    // 更新
    const updateResponse = await request.post('/api/config/project-types', {
      items: [
        { code: 'product_dev', name: '产品开发' },
        { code: 'new_type', name: '新类型' }
      ]
    });
    expect(updateResponse.status).toBe(200);
  });

  test('API-CFG-002: 任务类型配置', async () => {
    const response = await request.get('/api/config/task-types');

    // 验证12种默认类型
    expect(response.data.data.items.length).toBe(12);
    expect(response.data.data.items.map(t => t.code)).toContain('firmware');
  });

  test('API-CFG-003: 节假日管理', async () => {
    // 添加节假日
    const addResponse = await request.post('/api/config/holidays', {
      date: '2026-05-01',
      name: '劳动节',
      type: 'legal_holiday'
    });
    expect(addResponse.status).toBe(201);

    // 批量设置周末
    const batchResponse = await request.post('/api/config/holidays/batch', {
      operation: 'set_weekends',
      year: 2026
    });
    expect(batchResponse.status).toBe(200);
  });
});
```

### 2.4 导入导出 API

#### API-IMP/EXP-001~004

```typescript
describe('API-IMP: 导入功能', () => {
  test('API-IMP-001: 上传文件', async () => {
    const file = fs.readFileSync('./test-data/projects.xlsx');
    const response = await request.post('/api/import/projects', {
      file: file,
      conflict_strategy: 'merge'
    });

    expect(response.status).toBe(200);
    expect(response.data.data).toMatchObject({
      total_rows: expect.any(Number),
      success_count: expect.any(Number),
      error_count: expect.any(Number),
      errors: expect.any(Array)
    });
  });

  test('API-IMP-002: 导入进度', async () => {
    const importId = 'import-123';

    const response = await request.get(`/api/import/${importId}/progress`);

    expect(response.data.data).toMatchObject({
      status: expect.stringMatching(/pending|processing|completed|failed/),
      progress: expect.any(Number), // 0-100
      processed_rows: expect.any(Number),
      total_rows: expect.any(Number)
    });
  });

  test('API-IMP-003: 导入错误报告', async () => {
    const importId = 'import-with-errors';

    const response = await request.get(`/api/import/${importId}/errors`);

    expect(response.data.data.items[0]).toMatchObject({
      row_number: expect.any(Number),
      field: expect.any(String),
      error_message: expect.any(String)
    });
  });
});

describe('API-EXP: 导出功能', () => {
  test('API-EXP-001~004: 多格式导出', async () => {
    const formats = ['xlsx', 'csv', 'json'];

    for (const format of formats) {
      const response = await request.get('/api/export/tasks', {
        format,
        fields: ['id', 'description', 'status', 'start_date', 'end_date']
      });

      expect(response.status).toBe(200);

      if (format === 'xlsx') {
        expect(response.headers['content-type']).toContain('spreadsheet');
      } else if (format === 'csv') {
        expect(response.headers['content-type']).toContain('text/csv');
      } else {
        expect(response.headers['content-type']).toContain('application/json');
      }
    }
  });
});
```

---

## 3. UI/E2E 测试设计

### 3.1 报表界面

#### UI-RPT-001~005

```typescript
describe('UI-RPT: 报表界面', () => {
  test('UI-RPT-001: 报表Tab导航', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/reports');

    // 验证4个Tab
    const tabs = ['项目进度报表', '任务统计报表', '延期分析报表', '成员任务分析'];
    for (const tab of tabs) {
      await page.click(`text=${tab}`);
      await expect(page.locator('.report-content')).toBeVisible();
    }
  });

  test('UI-RPT-002: 筛选条件', async ({ page }) => {
    await page.goto('/reports/project-progress');

    // 项目筛选
    await page.click('[data-testid="project-filter"]');
    await page.click('text=智能管理平台');

    // 时间范围
    await page.fill('[name="start_date"]', '2026-03-01');
    await page.fill('[name="end_date"]', '2026-03-31');

    // 刷新
    await page.click('button:has-text("刷新")');

    // 验证数据更新
    await expect(page.locator('.stat-card').first()).toBeVisible();
  });

  test('UI-RPT-005: 导出Excel', async ({ page }) => {
    await page.goto('/reports/project-progress');

    // 下载监听
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.click('button:has-text("导出Excel")')
    ]);

    expect(download.suggestedFilename()).toMatch(/项目进度报表_.*\.xlsx/);
  });
});
```

### 3.2 设置界面

#### UI-CFG-001~003

```typescript
describe('UI-CFG: 设置界面', () => {
  test('UI-CFG-001: 项目类型配置', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/settings');
    await page.click('text=任务类型');

    // 添加新类型
    await page.click('button:has-text("添加类型")');
    await page.fill('[name="name"]', '新类型');
    await page.fill('[name="code"]', 'new_type');
    await page.click('button:has-text("保存")');

    await expect(page.locator('text=新类型')).toBeVisible();
  });

  test('UI-IMP-001: 拖拽上传', async ({ page }) => {
    await page.goto('/projects');
    await page.click('[data-testid="import-export-menu"]');
    await page.click('text=导入项目');

    // 验证拖拽区域
    const dropZone = page.locator('[data-testid="file-drop-zone"]');
    await expect(dropZone).toBeVisible();

    // 上传文件
    await dropZone.setInputFiles('./test-data/projects.xlsx');
    await expect(page.locator('.import-progress')).toBeVisible();
  });
});
```

---

## 4. 集成测试设计

### 4.1 INT-RPT-001: 报表数据一致性

```typescript
describe('INT-RPT-001: 报表数据一致性', () => {
  test('报表数据与实际数据一致', async () => {
    // 准备测试数据
    const project = await createProject();
    await createTask({ project_id: project.id, status: 'completed' });
    await createTask({ project_id: project.id, status: 'in_progress' });
    await createTask({ project_id: project.id, status: 'delayed' });

    // 获取报表
    const report = await request.get('/api/reports/project-progress', {
      project_id: project.id
    });

    // 验证统计
    expect(report.data.data.summary.completed_count).toBe(1);
    expect(report.data.data.summary.in_progress_count).toBe(1);
    // 延期数应该为1
  });
});
```

---

## 5. 测试数据

```typescript
export const testReports = {
  filters: {
    dateRange: {
      start: '2026-03-01',
      end: '2026-03-31'
    },
    project: 'TEST-PROJECT',
    member: 'TEST-USER'
  },
  exportFields: {
    tasks: ['id', 'wbs_code', 'description', 'status', 'assignee_id', 'start_date', 'end_date'],
    projects: ['id', 'code', 'name', 'status', 'progress', 'planned_start_date', 'planned_end_date']
  }
};
```

---

**相关文档**:
- [需求文档](../../requirements/modules/REQ_07_analytics.md)
- [需求-测试映射](../REQUIREMENT_TRACEABILITY.md)
