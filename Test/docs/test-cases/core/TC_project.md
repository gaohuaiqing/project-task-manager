# 项目管理 - 核心测试用例

> **模块**: 项目管理
> **用例数**: 16
> **优先级**: P0

---

## TC-PROJ-01: 创建项目

- id: TC-PROJ-01
- module: project
- priority: P0
- role: admin

**前置条件**: 已登录为 e2e_admin

**操作步骤**:
1. navigate: /projects
2. click: [data-testid=project-btn-create]
3. fill: [data-testid=project-form-input-name] → "E2E新建测试项目"
4. fill: [data-testid=project-form-input-code] → "E2E-NEW-001"
5. fill: [data-testid=project-form-select-type] → "产品开发"
6. fill: [data-testid=project-form-input-start-date] → "2026-05-01"
7. fill: [data-testid=project-form-input-end-date] → "2026-08-31"
8. click: [data-testid=project-form-btn-submit]
9. wait: [data-testid=project-card] contains "E2E新建测试项目"

**验证**:
- element: [data-testid=project-card] text contains "E2E新建测试项目"
- api: GET /api/projects → 列表包含 code === "E2E-NEW-001"
- api: GET /api/projects/:id → status === "planning", progress === 0

**清理**: 删除项目 E2E-NEW-001

---

## TC-PROJ-02: 编辑项目信息

- id: TC-PROJ-02
- module: project
- priority: P0
- role: admin

**前置条件**: 已登录为 e2e_admin，seed项目存在

**操作步骤**:
1. navigate: /projects
2. click: 项目卡片 "E2E测试项目-产品开发"
3. click: [data-testid=project-btn-edit]
4. fill: [data-testid=project-form-input-name] → "E2E测试项目-已修改"
5. click: [data-testid=project-form-btn-submit]
6. wait: text contains "E2E测试项目-已修改"

**验证**:
- text: contains "E2E测试项目-已修改"
- api: GET /api/projects/:id → name === "E2E测试项目-已修改"

**清理**: 改回原名称 "E2E测试项目-产品开发"

---

## TC-PROJ-03: 删除项目（无任务）

- id: TC-PROJ-03
- module: project
- priority: P0
- role: admin

**前置条件**: 已创建无任务的项目 E2E-DEL-001

**操作步骤**:
1. 进入项目 E2E-DEL-001 详情
2. click: [data-testid=project-btn-delete]
3. wait: [data-testid=confirm-dialog] visible
4. click: [data-testid=confirm-btn-ok]

**验证**:
- api: GET /api/projects → 列表不包含 E2E-DEL-001
- text: not contains "E2E-DEL-001"

**清理**: 无

---

## TC-PROJ-04: 有任务的项目不能删除

- id: TC-PROJ-04
- module: project
- priority: P0
- role: admin

**前置条件**: 已登录为 e2e_admin，seed项目 E2E-PROJ-002 有任务

**操作步骤**:
1. 进入项目 E2E-PROJ-002 详情
2. click: [data-testid=project-btn-delete]
3. wait: [data-testid=confirm-dialog] visible
4. click: [data-testid=confirm-btn-ok]

**验证**:
- text: contains "任务" or "无法删除"
- api: GET /api/projects/:id → 项目仍存在

**清理**: 无

---

## TC-PROJ-05: 添加项目成员

- id: TC-PROJ-05
- module: project
- priority: P0
- role: admin

**前置条件**: 已登录为 e2e_admin，项目 E2E-PROJ-001 存在

**操作步骤**:
1. 进入项目 E2E-PROJ-001 详情
2. click: [data-testid=project-tab-members]
3. click: [data-testid=member-btn-add]
4. select: [data-testid=member-select-user] → "e2e_engineer"
5. click: [data-testid=member-btn-confirm]

**验证**:
- element: [data-testid=member-list] text contains "e2e_engineer"
- api: GET /api/projects/:id/members → 包含 e2e_engineer

**清理**: 移除成员 e2e_engineer

---

## TC-PROJ-06: 创建里程碑

- id: TC-PROJ-06
- module: project
- priority: P0
- role: admin

**前置条件**: 已登录为 e2e_admin，项目 E2E-PROJ-001 存在

**操作步骤**:
1. 进入项目 E2E-PROJ-001 详情
2. click: [data-testid=project-tab-milestones]
3. click: [data-testid=milestone-btn-create]
4. fill: [data-testid=milestone-form-input-name] → "E2E测试里程碑"
5. fill: [data-testid=milestone-form-input-date] → "2026-06-30"
6. click: [data-testid=milestone-form-btn-submit]

**验证**:
- element: [data-testid=milestone-list] text contains "E2E测试里程碑"
- api: GET /api/projects/:id/milestones → 包含 name === "E2E测试里程碑"

**清理**: 无

---

## TC-PROJ-07: 工程师无法创建项目

- id: TC-PROJ-07
- module: project
- priority: P0
- role: engineer

**前置条件**: 已登录为 e2e_engineer

**操作步骤**:
1. navigate: /projects

**验证**:
- element: [data-testid=project-btn-create] not exists or disabled

**清理**: 无

---

## TC-PROJ-08: 项目筛选

- id: TC-PROJ-08
- module: project
- priority: P1
- role: admin

**前置条件**: 已登录为 e2e_admin，存在多个项目

**操作步骤**:
1. navigate: /projects
2. fill: [data-testid=project-filter-status] → "规划中"

**验证**:
- 列表只显示状态为"规划中"的项目
- api: GET /api/projects?status=planning → 所有项目 status === "planning"

**清理**: 清除筛选

---

## TC-PROJ-09: 项目代号唯一性

- id: TC-PROJ-09
- module: project
- priority: P0
- role: admin

**前置条件**: 已登录为 e2e_admin，项目 E2E-PROJ-001 存在

**操作步骤**:
1. click: [data-testid=project-btn-create]
2. fill: [data-testid=project-form-input-code] → "E2E-PROJ-001"
3. fill other required fields
4. click: [data-testid=project-form-btn-submit]

**验证**:
- text: contains "已存在" or "重复"
- api: POST /api/projects → status !== 201

**清理**: 无

---

## TC-PROJ-10: 项目详情Tab切换

- id: TC-PROJ-10
- module: project
- priority: P1
- role: admin

**前置条件**: 已登录为 e2e_admin，项目 E2E-PROJ-002 存在

**操作步骤**:
1. 进入项目 E2E-PROJ-002 详情
2. click: [data-testid=project-tab-members]
3. wait: [data-testid=member-list] visible
4. click: [data-testid=project-tab-milestones]
5. wait: [data-testid=milestone-list] visible
6. click: [data-testid=project-tab-timeline]
7. wait: [data-testid=timeline-view] visible

**验证**:
- 每次Tab切换后对应内容区域显示
- URL随Tab变化

**清理**: 无

---

## TC-PROJ-11: 时间线视图显示

- id: TC-PROJ-11
- module: project
- priority: P1
- role: admin

**前置条件**: 已登录为 e2e_admin，项目有时间线数据

**操作步骤**:
1. 进入项目详情 → 时间线Tab
2. 观察: [data-testid=timeline-view] 显示

**验证**:
- element: [data-testid=timeline-ruler] exists
- element: [data-testid=timeline-today-line] exists（如项目范围包含今天）

**清理**: 无

---

## TC-PROJ-12: 工程师只能看到参与的项目

- id: TC-PROJ-12
- module: project
- priority: P0
- role: engineer

**前置条件**: 已登录为 e2e_engineer，只参与 E2E-PROJ-002

**操作步骤**:
1. navigate: /projects

**验证**:
- 列表只包含 e2e_engineer 参与的项目
- api: GET /api/projects → 所有项目 e2e_engineer 都是成员
- element: not contains "E2E-PROJ-001"（未参与的项目）

**清理**: 无

---

## TC-PROJ-13: 时间线标尺和轨道显示

- id: TC-PROJ-13
- module: project
- priority: P1
- role: admin

**前置条件**: 已登录为 e2e_admin，项目 E2E-PROJ-002 有任务数据

**操作步骤**:
1. 进入项目 E2E-PROJ-002 详情
2. click: [data-testid=detail-tab-timelines]
3. 等待时间线加载

**验证**:
- element: [data-testid=detail-timeline-view] exists
- element: [data-testid=detail-timeline-ruler] exists
- 时间线标尺显示日期刻度（月份/周）
- element: [data-testid=detail-timeline-track-row] count >= 1（至少一条轨道）
- 任务轨道条显示任务名称和时间跨度

**清理**: 无

---

## TC-PROJ-14: 时间线今天标记和工具栏

- id: TC-PROJ-14
- module: project
- priority: P1
- role: admin

**前置条件**: 已登录为 e2e_admin，项目时间范围包含今天

**操作步骤**:
1. 进入项目详情 → 时间线Tab
2. 查看工具栏按钮
3. click: "📍今天"按钮（如有）
4. 验证视图跳转到今天

**验证**:
- element: [data-testid=detail-today-indicator] exists（今天标记线可见）
- 今天标记位置与当前日期一致
- 工具栏包含缩放按钮（放大/缩小/适应屏幕）
- api: GET /api/projects/:id/timelines → 返回时间线数据

**清理**: 无

---

## TC-PROJ-15: 项目导入（下载模板+上传）

- id: TC-PROJ-15
- module: project
- priority: P1
- role: admin

**前置条件**: 已登录为 e2e_admin

**操作步骤**:
1. navigate: /projects
2. 找到导入导出工具栏按钮
3. click: "下载导入模板"
4. 验证模板文件下载
5. 填写模板文件（项目名称、编码、类型等）
6. click: "导入项目"
7. 上传填写好的文件
8. 预览导入数据
9. click: 确认导入

**验证**:
- 模板文件格式正确（含示例数据和表头说明）
- 导入预览显示解析的数据
- 确认后项目列表新增导入的项目
- api: GET /api/projects → 包含导入的项目
- 导入错误时显示具体错误行和原因

**清理**: 删除导入的项目

---

## TC-PROJ-16: 项目导出

- id: TC-PROJ-16
- module: project
- priority: P1
- role: admin

**前置条件**: 已登录为 e2e_admin，存在项目数据

**操作步骤**:
1. navigate: /projects
2. 找到导入导出工具栏按钮
3. click: "导出项目"
4. 等待文件下载

**验证**:
- 下载文件格式正确（Excel/CSV）
- 文件包含所有可见项目的数据（编码、名称、状态、类型、日期等）
- 文件数据与页面显示一致
- api: GET /api/projects/export → 返回文件

**清理**: 无
