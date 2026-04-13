# 仪表板 - 核心测试用例

> **模块**: 仪表板
> **用例数**: 10
> **优先级**: P0

---

## TC-DASH-01: 管理员仪表板加载

- id: TC-DASH-01
- module: dashboard
- priority: P0
- role: admin

**前置条件**: 已登录为 e2e_admin，seed数据存在

**操作步骤**:
1. navigate: /dashboard

**验证**:
- element: [data-testid=dash-stats-cards] exists（统计卡片区）
- element: [data-testid=dash-alert-section] exists（风险预警区）
- 统计卡片数量 >= 4
- api: GET /api/analytics/dashboard/stats → 返回有效数据

**清理**: 无

---

## TC-DASH-02: 部门经理仪表板数据范围

- id: TC-DASH-02
- module: dashboard
- priority: P0
- role: dept_manager

**前置条件**: 已登录为 e2e_dept_mgr

**操作步骤**:
1. navigate: /dashboard

**验证**:
- 统计数据仅包含本部门（研发部）
- api: GET /api/analytics/dashboard/stats → 数据范围限定为 dept_id

**清理**: 无

---

## TC-DASH-03: 技术经理仪表板数据范围

- id: TC-DASH-03
- module: dashboard
- priority: P0
- role: tech_manager

**前置条件**: 已登录为 e2e_tech_mgr

**操作步骤**:
1. navigate: /dashboard

**验证**:
- 统计数据仅包含本技术组
- 包含"待我审批"预警卡片
- api: GET /api/analytics/dashboard/stats → 数据范围限定

**清理**: 无

---

## TC-DASH-04: 工程师仪表板数据范围

- id: TC-DASH-04
- module: dashboard
- priority: P0
- role: engineer

**前置条件**: 已登录为 e2e_engineer

**操作步骤**:
1. navigate: /dashboard

**验证**:
- 只显示个人数据（参与项目数、个人任务）
- 不显示分布类分析组件（饼图/分布图）
- 不显示审批预警卡片
- api: GET /api/analytics/dashboard/stats → 数据范围为个人

**清理**: 无

---

## TC-DASH-05: 统计卡片跳转

- id: TC-DASH-05
- module: dashboard
- priority: P1
- role: admin

**前置条件**: 已登录为 e2e_admin

**操作步骤**:
1. navigate: /dashboard
2. click: [data-testid=dash-card-projects]（项目总数卡片）

**验证**:
- url: contains /projects
3. navigate back: /dashboard
4. click: [data-testid=dash-card-tasks-in-progress]

**验证**:
- url: contains /tasks
- 筛选条件包含 status=in_progress

**清理**: 无

---

## TC-DASH-06: 预警区显示（admin）

- id: TC-DASH-06
- module: dashboard
- priority: P0
- role: admin

**前置条件**: 已登录为 e2e_admin，存在延期/待审批数据

**操作步骤**:
1. navigate: /dashboard
2. 检查预警区

**验证**:
- element: [data-testid=dash-alert-delay-warning] exists（延期预警）
- element: [data-testid=dash-alert-delayed] exists（已延期）
- element: [data-testid=dash-alert-pending-approval] exists（待审批）
- 各卡片数量 > 0

**清理**: 无

---

## TC-DASH-07: 项目进度列表

- id: TC-DASH-07
- module: dashboard
- priority: P1
- role: admin

**前置条件**: 已登录为 e2e_admin

**操作步骤**:
1. navigate: /dashboard
2. 查看 [data-testid=dash-project-progress-list]

**验证**:
- element: [data-testid=dash-project-progress-list] exists
- 列表包含项目名称和进度百分比
- 点击项目可跳转到项目详情

**清理**: 无

---

## TC-DASH-08: 工程师紧急任务区

- id: TC-DASH-08
- module: dashboard
- priority: P0
- role: engineer

**前置条件**: 已登录为 e2e_engineer，有即将到期任务

**操作步骤**:
1. navigate: /dashboard

**验证**:
- element: [data-testid=dash-urgent-section] exists
- 显示逾期任务数、今日到期、本周到期三个预警卡片
- 点击可跳转到对应任务

**清理**: 无

---

## TC-DASH-09: 数据联动验证

- id: TC-DASH-09
- module: dashboard
- priority: P1
- role: admin

**前置条件**: 已登录为 e2e_admin，记录当前仪表板数据

**操作步骤**:
1. navigate: /dashboard，记录统计卡片数值
2. 创建一个新项目
3. navigate: /dashboard

**验证**:
- 项目总数 +1
- api: GET /api/analytics/dashboard/stats → 项目数增加

**清理**: 删除新项目

---

## TC-DASH-10: 加载状态

- id: TC-DASH-10
- module: dashboard
- priority: P2
- role: admin

**前置条件**: 已登录

**操作步骤**:
1. navigate: /dashboard
2. 观察加载过程（take_screenshot）

**验证**:
- 加载中显示骨架屏或Loading
- 加载完成后数据正确显示

**清理**: 无
