# 报表分析 - 核心测试用例

> **模块**: 报表分析
> **用例数**: 8
> **优先级**: P1
> **权限**: 仅 admin/dept_manager/tech_manager 可见

---

## TC-RPT-01: 工程师无法访问报表

- id: TC-RPT-01
- module: reports
- priority: P1
- role: engineer

**前置条件**: 已登录为 e2e_engineer

**操作步骤**:
1. 查看侧边栏菜单
2. 直接 navigate: /reports

**验证**:
- 侧边栏不显示"报表分析"菜单项
- 直接访问URL被重定向或显示权限不足

**清理**: 无

---

## TC-RPT-02: 项目进度报表加载

- id: TC-RPT-02
- module: reports
- priority: P1
- role: admin

**前置条件**: 已登录为 e2e_admin

**操作步骤**:
1. navigate: /reports
2. 默认应显示项目进度报表Tab（或click: [data-testid=report-tab-project-progress]）

**验证**:
- element: [data-testid=report-stats-cards] exists
- element: [data-testid=report-chart] exists
- element: [data-testid=report-table] exists
- api: GET /api/analytics/reports/project-progress → 返回有效数据

**清理**: 无

---

## TC-RPT-03: 任务统计报表

- id: TC-RPT-03
- module: reports
- priority: P1
- role: admin

**前置条件**: 已登录为 e2e_admin

**操作步骤**:
1. click: [data-testid=report-tab-task-statistics]

**验证**:
- 统计卡片显示：任务总数、平均完成率、延期率
- 任务类型分布图表显示12种类型
- api: GET /api/analytics/reports/task-statistics → 返回有效数据

**清理**: 无

---

## TC-RPT-04: 延期分析报表

- id: TC-RPT-04
- module: reports
- priority: P1
- role: admin

**前置条件**: 已登录为 e2e_admin

**操作步骤**:
1. click: [data-testid=report-tab-delay-analysis]

**验证**:
- 显示延期统计卡片和图表
- api: GET /api/analytics/reports/delay-analysis → 返回有效数据

**清理**: 无

---

## TC-RPT-05: 报表筛选

- id: TC-RPT-05
- module: reports
- priority: P1
- role: admin

**前置条件**: 已登录为 e2e_admin

**操作步骤**:
1. 选择一个报表Tab
2. select: [data-testid=report-filter-project] → "E2E测试项目-职能管理"
3. select: [data-testid=report-filter-time-range] → "过去30天"
4. click: [data-testid=report-btn-refresh]

**验证**:
- 数据更新为筛选后的结果
- api请求包含对应筛选参数

**清理**: 清除筛选

---

## TC-RPT-06: 报表导出Excel

- id: TC-RPT-06
- module: reports
- priority: P1
- role: admin

**前置条件**: 已登录为 e2e_admin

**操作步骤**:
1. 在任意报表Tab
2. click: [data-testid=report-btn-export]
3. select: [data-testid=export-format-xlsx]
4. click: [data-testid=export-btn-confirm]

**验证**:
- 文件下载成功
- 文件名格式: [报表类型]_[日期].xlsx

**清理**: 删除下载文件

---

## TC-RPT-07: 部门经理数据范围

- id: TC-RPT-07
- module: reports
- priority: P1
- role: dept_manager

**前置条件**: 已登录为 e2e_dept_mgr

**操作步骤**:
1. navigate: /reports
2. 查看各报表数据

**验证**:
- 只显示本部门（研发部）的项目和成员数据
- api: GET /api/analytics/reports/* → 数据范围限定为部门

**清理**: 无

---

## TC-RPT-08: Tab切换与URL

- id: TC-RPT-08
- module: reports
- priority: P2
- role: admin

**前置条件**: 已登录为 e2e_admin

**操作步骤**:
1. navigate: /reports
2. 依次点击5个Tab
3. 记录URL变化

**验证**:
- 每个Tab切换后URL变化（/reports/project-progress, /reports/task-statistics 等）
- 刷新页面后仍停留在当前Tab

**清理**: 无
