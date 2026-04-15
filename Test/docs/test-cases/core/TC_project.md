# 项目管理 - 核心测试用例

> **模块**: 项目管理
> **用例数**: 36
> **优先级**: P0/P1/P2

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

---

## TC-PROJ-17: 创建项目 - 必填字段为空提交

- id: TC-PROJ-17
- module: project
- priority: P0
- role: admin

**前置条件**: 已登录为 e2e_admin

**操作步骤**:
1. navigate: /projects
2. click: [data-testid=project-btn-create]
3. 不填写任何字段
4. click: [data-testid=project-btn-submit]

**验证**:
- 表单显示必填字段错误提示（编码、名称）
- 对话框未关闭
- 无网络请求发送到 POST /api/projects

**清理**: click: [data-testid=project-btn-cancel]

---

## TC-PROJ-18: 创建项目 - 截止日期早于开始日期

- id: TC-PROJ-18
- module: project
- priority: P0
- role: admin

**前置条件**: 已登录为 e2e_admin

**操作步骤**:
1. navigate: /projects
2. click: [data-testid=project-btn-create]
3. fill: [data-testid=project-input-code] → "E2E-DATE-001"
4. fill: [data-testid=project-input-name] → "日期验证测试"
5. fill: [data-testid=project-input-start-date] → "2026-08-01"
6. fill: [data-testid=project-input-deadline] → "2026-05-01"
7. click: [data-testid=project-btn-submit]

**验证**:
- alert 提示"截止日期不能早于开始日期"
- 对话框未关闭
- 项目未创建

**清理**: click: [data-testid=project-btn-cancel]

---

## TC-PROJ-19: 创建项目 - 含里程碑

- id: TC-PROJ-19
- module: project
- priority: P0
- role: admin

**前置条件**: 已登录为 e2e_admin

**操作步骤**:
1. navigate: /projects
2. click: [data-testid=project-btn-create]
3. fill: [data-testid=project-input-code] → "E2E-MS-001"
4. fill: [data-testid=project-input-name] → "含里程碑测试"
5. fill: [data-testid=project-select-type] → "产品开发"
6. fill: [data-testid=project-input-start-date] → "2026-05-01"
7. fill: [data-testid=project-input-deadline] → "2026-08-31"
8. click: [data-testid=project-btn-add-milestone]
9. fill: [data-testid=project-input-milestone-name] → "需求确认"
10. fill: [data-testid=project-input-milestone-date] → "2026-05-30"
11. fill: [data-testid=project-input-milestone-desc] → "完成需求评审"
12. click: [data-testid=project-btn-add-milestone]
13. fill 第二个里程碑: [data-testid=project-input-milestone-name] → "开发完成", [data-testid=project-input-milestone-date] → "2026-07-31"
14. click: [data-testid=project-btn-submit]
15. wait: [data-testid=project-card] text contains "含里程碑测试"

**验证**:
- element: [data-testid=project-card] text contains "含里程碑测试"
- 进入项目详情 → click: [data-testid=detail-tab-milestones]
- element: 里程碑列表显示2条记录
- api: GET /api/projects/:id/milestones → 数组长度 === 2

**清理**: 删除项目 E2E-MS-001

---

## TC-PROJ-20: 创建项目 - 移除里程碑

- id: TC-PROJ-20
- module: project
- priority: P1
- role: admin

**前置条件**: 已登录为 e2e_admin

**操作步骤**:
1. navigate: /projects
2. click: [data-testid=project-btn-create]
3. fill: [data-testid=project-input-code] → "E2E-RMMS-001"
4. fill: [data-testid=project-input-name] → "移除里程碑测试"
5. fill: [data-testid=project-input-start-date] → "2026-05-01"
6. fill: [data-testid=project-input-deadline] → "2026-08-31"
7. click: [data-testid=project-btn-add-milestone]
8. fill: [data-testid=project-input-milestone-name] → "待删除里程碑"
9. click: 里程碑右侧删除按钮（X 图标，.text-destructive 的 Button）
10. 验证里程碑区域显示"暂无里程碑，点击上方按钮添加"
11. click: [data-testid=project-btn-submit]
12. wait: [data-testid=project-card] text contains "移除里程碑测试"

**验证**:
- 表单中里程碑已移除
- 进入项目详情 → 里程碑Tab显示"暂无里程碑"
- api: GET /api/projects/:id/milestones → 数组长度 === 0

**清理**: 删除项目 E2E-RMMS-001

---

## TC-PROJ-21: 编辑项目 - 修改里程碑（增/改/删同步）

- id: TC-PROJ-21
- module: project
- priority: P0
- role: admin

**前置条件**: 已登录为 e2e_admin，项目 E2E-PROJ-001 有2个以上里程碑

**操作步骤**:
1. 进入项目 E2E-PROJ-001 详情
2. click: [data-testid=detail-header-btn-edit]
3. 删除第一个里程碑（click X 按钮）
4. 修改第二个里程碑名称 → "E2E修改后里程碑"
5. click: [data-testid=project-btn-add-milestone]
6. fill 新里程碑: [data-testid=project-input-milestone-name] → "E2E新增里程碑", [data-testid=project-input-milestone-date] → "2026-09-30"
7. click: [data-testid=project-btn-submit]
8. 返回详情 → click: [data-testid=detail-tab-milestones]

**验证**:
- 第一个里程碑已不存在
- element: 里程碑列表 text contains "E2E修改后里程碑"
- element: 里程碑列表 text contains "E2E新增里程碑"
- api: GET /api/projects/:id/milestones → 数量 = 原始数量 - 1 + 1

**清理**: 无

---

## TC-PROJ-22: 创建项目 - 取消操作

- id: TC-PROJ-22
- module: project
- priority: P1
- role: admin

**前置条件**: 已登录为 e2e_admin

**操作步骤**:
1. navigate: /projects
2. click: [data-testid=project-btn-create]
3. fill: [data-testid=project-input-code] → "E2E-CANCEL"
4. fill: [data-testid=project-input-name] → "取消测试"
5. click: [data-testid=project-btn-cancel]
6. 验证对话框已关闭
7. click: [data-testid=project-btn-create]

**验证**:
- 第一次取消后对话框关闭
- 再次打开表单为空白（code 和 name 字段为空）
- 项目列表无变化

**清理**: 无

---

## TC-PROJ-23: 类型筛选

- id: TC-PROJ-23
- module: project
- priority: P1
- role: admin

**前置条件**: 已登录为 e2e_admin，存在不同类型的项目

**操作步骤**:
1. navigate: /projects
2. fill: [data-testid=project-select-type] → "产品开发"

**验证**:
- 列表只显示"产品开发"类型的项目
- element: 所有 [data-testid=project-card-type-badge] text contains "产品开发"
- api: GET /api/projects?project_type=product_dev → 所有项目 project_type === "product_dev"

**清理**: fill: [data-testid=project-select-type] → "全部类型"

---

## TC-PROJ-24: 组合筛选（搜索 + 状态 + 类型）

- id: TC-PROJ-24
- module: project
- priority: P1
- role: admin

**前置条件**: 已登录为 e2e_admin，存在多个不同状态和类型的项目

**操作步骤**:
1. navigate: /projects
2. fill: [data-testid=project-input-search] → "E2E"
3. fill: [data-testid=project-select-status] → "进行中"
4. fill: [data-testid=project-select-type] → "产品开发"

**验证**:
- 列表只显示同时满足三个条件的项目
- 所有 [data-testid=project-card-title] text contains "E2E"
- 所有 [data-testid=project-card-status-badge] text contains "进行中"
- 所有 [data-testid=project-card-type-badge] text contains "产品开发"

**清理**: 清除所有筛选条件（重新 fill 各字段为空/全部）

---

## TC-PROJ-25: 空状态展示 - 无搜索结果

- id: TC-PROJ-25
- module: project
- priority: P1
- role: admin

**前置条件**: 已登录为 e2e_admin

**操作步骤**:
1. navigate: /projects
2. fill: [data-testid=project-input-search] → "ZZZZZZZ_NOT_EXIST"

**验证**:
- element: text contains "没有找到项目"
- element: 存在"清除筛选条件"按钮
- click: "清除筛选条件"按钮
- 验证搜索框清空，项目列表恢复显示

**清理**: 无

---

## TC-PROJ-26: 从卡片下拉菜单操作

- id: TC-PROJ-26
- module: project
- priority: P0
- role: admin

**前置条件**: 已登录为 e2e_admin，存在项目

**操作步骤**:
1. navigate: /projects
2. click: 第一个项目的 [data-testid=project-card-btn-menu]
3. 验证下拉菜单显示"编辑"和"删除"选项
4. click: [data-testid=project-card-btn-edit]
5. wait: [data-testid=project-dialog-form] visible
6. 验证表单已预填充项目数据
7. click: [data-testid=project-btn-cancel]
8. click: 第二个项目的 [data-testid=project-card-btn-menu]
9. click: [data-testid=project-card-btn-delete]
10. wait: [data-testid=confirm-dialog] visible

**验证**:
- 下拉菜单正确显示"编辑"和"删除"选项
- 编辑打开的表单包含项目已有数据（name、code 非空）
- 删除打开确认对话框

**清理**: 取消删除确认

---

## TC-PROJ-27: 创建时间线

- id: TC-PROJ-27
- module: project
- priority: P0
- role: admin

**前置条件**: 已登录为 e2e_admin，项目 E2E-PROJ-001 存在

**操作步骤**:
1. 进入项目 E2E-PROJ-001 详情
2. click: [data-testid=detail-tab-timelines]
3. click: [data-testid=timeline-btn-add-timeline]（或空状态时 [data-testid=detail-btn-add-timeline]）
4. fill: 时间线名称 Input → "E2E开发阶段"
5. fill: 类型 Select → "development"（开发）
6. fill: 开始日期 → "2026-05-01"
7. fill: 结束日期 → "2026-07-31"
8. click: 创建按钮

**验证**:
- 时间线视图显示新轨道
- 左侧面板显示"E2E开发阶段"名称
- api: GET /api/projects/:id/timelines → 包含 name === "E2E开发阶段"

**清理**: 无

---

## TC-PROJ-28: 编辑时间线

- id: TC-PROJ-28
- module: project
- priority: P1
- role: admin

**前置条件**: 已登录为 e2e_admin，项目有时间线数据

**操作步骤**:
1. 进入项目详情 → click: [data-testid=detail-tab-timelines]
2. click: 左侧时间线标签（触发 handleTimelineClick）
3. wait: EditTimelineDialog visible
4. 验证对话框显示当前时间线数据
5. fill: 时间线名称 → "E2E修改后时间线"
6. click: 保存按钮

**验证**:
- 对话框关闭
- 左侧标签更新为"E2E修改后时间线"
- api: PUT /api/projects/timelines/:id → 成功

**清理**: 无

---

## TC-PROJ-29: 删除时间线

- id: TC-PROJ-29
- module: project
- priority: P1
- role: admin

**前置条件**: 已登录为 e2e_admin，项目有2条以上时间线

**操作步骤**:
1. 进入项目详情 → click: [data-testid=detail-tab-timelines]
2. click: 左侧时间线标签 → EditTimelineDialog
3. click: 编辑对话框中的"删除"按钮
4. wait: AlertDialog visible（text contains "确认删除时间轴"）
5. click: AlertDialogAction（"删除"按钮，bg-red-600）

**验证**:
- 时间线从视图移除
- 左侧标签列表减少一条
- api: DELETE /api/projects/timelines/:id → 成功

**清理**: 无

---

## TC-PROJ-30: 时间线缩放控制

- id: TC-PROJ-30
- module: project
- priority: P1
- role: admin

**前置条件**: 已登录为 e2e_admin，项目有时间线数据

**操作步骤**:
1. 进入项目详情 → click: [data-testid=detail-tab-timelines]
2. 记录当前标尺显示（默认周视图）
3. click: [data-testid=timeline-toggle-zoom-day]
4. wait: 标尺切换为日视图
5. click: [data-testid=timeline-toggle-zoom-month]
6. wait: 标尺切换为月视图
7. click: [data-testid=timeline-toggle-zoom-week]
8. wait: 恢复周视图

**验证**:
- 日视图: 标尺显示每日刻度（细粒度）
- 周视图: 标尺显示每周刻度（中粒度）
- 月视图: 标尺显示每月刻度（粗粒度）
- 缩放滑块位置与当前级别联动

**清理**: 无

---

## TC-PROJ-31: 时间线"定位到今天"

- id: TC-PROJ-31
- module: project
- priority: P1
- role: admin

**前置条件**: 已登录为 e2e_admin，项目时间范围包含今天

**操作步骤**:
1. 进入项目详情 → click: [data-testid=detail-tab-timelines]
2. 向右滚动一段距离（使今天标记不在视口内）
3. click: [data-testid=timeline-btn-go-today]
4. 等待滚动动画完成

**验证**:
- 视图滚动到今天标记位置附近
- 今天标记（红色竖线 + 日期标签）可见
- 标签显示当前月份/日期

**清理**: 无

---

## TC-PROJ-32: 时间线键盘快捷键

- id: TC-PROJ-32
- module: project
- priority: P2
- role: admin

**前置条件**: 已登录为 e2e_admin，项目有时间线数据

**操作步骤**:
1. 进入项目详情 → click: [data-testid=detail-tab-timelines]
2. click: 时间线区域内部（确保焦点在组件内）
3. press_key: "t"
4. 验证视图跳转到今天位置
5. press_key: "ArrowRight"
6. 验证视图向右滚动
7. press_key: "ArrowLeft"
8. 验证视图向左滚动
9. click: 一条时间线轨道（选中状态）
10. press_key: "Escape"
11. 验证选中状态取消

**验证**:
- T 键: 视图居中到今天
- ArrowRight: 滚动位置增大
- ArrowLeft: 滚动位置减小
- Escape: 取消选中状态

**清理**: 无

---

## TC-PROJ-33: 详情页编辑里程碑

- id: TC-PROJ-33
- module: project
- priority: P0
- role: admin

**前置条件**: 已登录为 e2e_admin，项目 E2E-PROJ-001 有里程碑

**操作步骤**:
1. 进入项目 E2E-PROJ-001 详情
2. click: [data-testid=detail-tab-timelines]（时间线视图包含里程碑标记）
3. click: 里程碑标记（🚩 图标，在里程碑行中）
4. wait: EditMilestoneDialog visible
5. fill: 里程碑名称 → "E2E编辑后里程碑"
6. fill: 目标日期 → "2026-07-15"
7. 调整完成百分比滑块到 50%
8. click: 保存按钮

**验证**:
- EditMilestoneDialog 关闭
- 时间线上里程碑标记更新
- api: PUT /api/projects/milestones/:id → 成功
- click: [data-testid=detail-tab-milestones]
- element: 里程碑列表 text contains "E2E编辑后里程碑"

**清理**: 无

---

## TC-PROJ-34: 详情页删除里程碑

- id: TC-PROJ-34
- module: project
- priority: P0
- role: admin

**前置条件**: 已登录为 e2e_admin，项目 E2E-PROJ-001 有2个以上里程碑

**操作步骤**:
1. 进入项目详情 → click: [data-testid=detail-tab-timelines]
2. click: 里程碑标记 → EditMilestoneDialog
3. 记录当前里程碑数量
4. click: 编辑对话框中的"删除"按钮
5. wait: AlertDialog visible（text contains "确认删除里程碑"）
6. click: AlertDialogAction（"删除"按钮）

**验证**:
- 里程碑从时间线和列表移除
- api: DELETE /api/projects/milestones/:id → 成功
- click: [data-testid=detail-tab-milestones]
- 里程碑数量比之前减少1

**清理**: 无

---

## TC-PROJ-35: 详情页添加里程碑（从时间线工具栏）

- id: TC-PROJ-35
- module: project
- priority: P0
- role: admin

**前置条件**: 已登录为 e2e_admin，项目 E2E-PROJ-001 存在

**操作步骤**:
1. 进入项目 E2E-PROJ-001 详情
2. click: [data-testid=detail-tab-timelines]
3. click: [data-testid=timeline-btn-add-milestone]
4. wait: AddMilestoneDialog visible
5. fill: 里程碑名称 → "E2E工具栏创建里程碑"
6. fill: 目标日期 → "2026-06-15"
7. click: 提交按钮

**验证**:
- AddMilestoneDialog 关闭
- 时间线视图新增里程碑标记
- api: POST /api/projects/:id/milestones → 成功
- click: [data-testid=detail-tab-milestones]
- element: 里程碑列表 text contains "E2E工具栏创建里程碑"

**清理**: 无

---

## TC-PROJ-36: 删除项目 - 取消确认

- id: TC-PROJ-36
- module: project
- priority: P1
- role: admin

**前置条件**: 已登录为 e2e_admin，seed项目存在

**操作步骤**:
1. 进入项目详情页
2. click: [data-testid=detail-header-btn-delete]（MoreHorizontal 下拉菜单中的删除选项）
3. wait: ConfirmDialog visible
4. click: 取消按钮（AlertDialogCancel）

**验证**:
- 确认对话框关闭
- 项目仍存在
- api: GET /api/projects/:id → 项目数据正常返回

**清理**: 无
