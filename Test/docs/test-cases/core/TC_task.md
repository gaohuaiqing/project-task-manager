# 任务管理 - 核心测试用例

> **模块**: 任务管理
> **用例数**: 19
> **优先级**: P0

---

## TC-TASK-01: 创建WBS根任务

- id: TC-TASK-01
- module: task
- priority: P0
- role: tech_manager

**前置条件**: 已登录为 e2e_tech_mgr，项目 E2E-PROJ-002 存在

**操作步骤**:
1. navigate: /tasks
2. select: [data-testid=task-filter-project] → "E2E测试项目-职能管理"
3. click: [data-testid=task-btn-add-root]
4. fill: [data-testid=task-form-input-name] → "E2E新根任务"
5. select: [data-testid=task-form-select-type] → "固件"
6. select: [data-testid=task-form-select-priority] → "高"
7. fill: [data-testid=task-form-input-duration] → "10"
8. click: [data-testid=task-form-btn-submit]
9. wait: [data-testid=task-table] text contains "E2E新根任务"

**验证**:
- element: [data-testid=task-table-row] text contains "E2E新根任务"
- api: GET /api/tasks?project_id=xxx → 包含 name === "E2E新根任务"
- WBS编码自动生成

**清理**: 删除任务

---

## TC-TASK-02: 创建子任务

- id: TC-TASK-02
- module: task
- priority: P0
- role: tech_manager

**前置条件**: 已登录为 e2e_tech_mgr，存在根任务

**操作步骤**:
1. 在WBS表格中找到根任务行
2. click: [data-testid=task-row-btn-add-child]（根任务行的添加子任务按钮）
3. fill: [data-testid=task-form-input-name] → "E2E子任务"
4. click: [data-testid=task-form-btn-submit]

**验证**:
- 子任务出现在父任务下方，有缩进
- WBS编码为父任务编码 + ".1"
- 子任务继承父任务的项目和类型

**清理**: 删除子任务

---

## TC-TASK-03: 设置任务依赖

- id: TC-TASK-03
- module: task
- priority: P0
- role: tech_manager

**前置条件**: 已登录为 e2e_tech_mgr，存在两个任务

**操作步骤**:
1. 编辑第二个任务
2. fill: [data-testid=task-form-input-predecessor] → "第一个任务的WBS编码"
3. fill: [data-testid=task-form-input-lag-days] → "0"
4. click: [data-testid=task-form-btn-submit]

**验证**:
- 后续任务开始日期 = 前置任务结束日期 + 1
- api: GET /api/tasks/:id → predecessor_id 不为空

**清理**: 移除依赖

---

## TC-TASK-04: 分配任务负责人

- id: TC-TASK-04
- module: task
- priority: P0
- role: tech_manager

**前置条件**: 已登录为 e2e_tech_mgr，存在未分配的任务

**操作步骤**:
1. 编辑任务
2. select: [data-testid=task-form-select-assignee] → "e2e_engineer"
3. fill: [data-testid=task-form-input-fulltime-ratio] → "100"
4. click: [data-testid=task-form-btn-submit]

**验证**:
- 任务表格行显示负责人姓名
- api: GET /api/tasks/:id → assignee_id 不为空

**清理**: 无

---

## TC-TASK-05: 更新任务进度

- id: TC-TASK-05
- module: task
- priority: P0
- role: engineer

**前置条件**: 已登录为 e2e_engineer，有已分配的任务

**操作步骤**:
1. navigate: /tasks
2. 找到自己的任务，click: [data-testid=task-row-btn-detail]
3. fill: [data-testid=progress-input-content] → "E2E测试进展记录"
4. fill: [data-testid=progress-input-percent] → "50"
5. click: [data-testid=progress-btn-submit]

**验证**:
- 任务进度显示 50%
- api: GET /api/tasks/:id/progress → 最新记录 content === "E2E测试进展记录"

**清理**: 无

---

## TC-TASK-06: 工程师提交计划变更（触发审批）

- id: TC-TASK-06
- module: task
- priority: P0
- role: engineer

**前置条件**: 已登录为 e2e_engineer，有已分配的任务

**操作步骤**:
1. 编辑任务，修改工期
2. fill: [data-testid=task-form-input-duration] → "20"（原为10）
3. fill: [data-testid=task-form-input-change-reason] → "E2E测试变更原因"
4. click: [data-testid=task-form-btn-submit]

**验证**:
- 任务状态变为"待审批"
- api: GET /api/workflow/plan-changes → 存在 status === "pending" 的记录

**清理**: 无（由审批用例继续）

---

## TC-TASK-07: 技术经理直接修改任务（无需审批）

- id: TC-TASK-07
- module: task
- priority: P0
- role: tech_manager

**前置条件**: 已登录为 e2e_tech_mgr

**操作步骤**:
1. 编辑任务
2. fill: [data-testid=task-form-input-duration] → "15"
3. click: [data-testid=task-form-btn-submit]

**验证**:
- 修改直接生效，无需审批
- api: GET /api/tasks/:id → duration === 15

**清理**: 无

---

## TC-TASK-08: 删除任务

- id: TC-TASK-08
- module: task
- priority: P0
- role: tech_manager

**前置条件**: 已登录为 e2e_tech_mgr，存在测试任务

**操作步骤**:
1. 找到任务行
2. click: [data-testid=task-row-btn-delete]
3. wait: [data-testid=confirm-dialog] visible
4. click: [data-testid=confirm-btn-ok]

**验证**:
- 任务从列表消失
- api: GET /api/tasks/:id → 404

**清理**: 无

---

## TC-TASK-09: 工程师无法创建根任务

- id: TC-TASK-09
- module: task
- priority: P0
- role: engineer

**前置条件**: 已登录为 e2e_engineer

**操作步骤**:
1. navigate: /tasks

**验证**:
- element: [data-testid=task-btn-add-root] not exists or disabled

**清理**: 无

---

## TC-TASK-10: 任务筛选（组合条件）

- id: TC-TASK-10
- module: task
- priority: P1
- role: tech_manager

**前置条件**: 已登录为 e2e_tech_mgr，存在多种任务

**操作步骤**:
1. navigate: /tasks
2. select: [data-testid=task-filter-project] → "E2E测试项目-职能管理"
3. select: [data-testid=task-filter-status] → ["未开始", "进行中"]
4. select: [data-testid=task-filter-assignee] → "e2e_engineer"

**验证**:
- 列表只显示同时满足三个条件的任务
- api: GET /api/tasks?project_id=xxx&status=not_started,in_progress&assignee_id=xxx

**清理**: 清除筛选

---

## TC-TASK-11: 任务状态转换（关键路径）

- id: TC-TASK-11
- module: task
- priority: P0
- role: engineer

**前置条件**: 已登录为 e2e_engineer，有未开始的任务

**操作步骤**:
1. 编辑任务
2. fill: [data-testid=task-form-input-actual-start] → "2026-04-10"
3. click: [data-testid=task-form-btn-submit]
4. 验证状态变为"进行中"
5. fill: [data-testid=task-form-input-actual-end] → "2026-04-15"
6. fill: [data-testid=task-form-input-progress] → "100"
7. click: [data-testid=task-form-btn-submit]

**验证**:
- 步骤4后: api GET /api/tasks/:id → status === "in_progress"
- 步骤7后: api GET /api/tasks/:id → status 包含 "completed"

**清理**: 无

---

## TC-TASK-12: 循环依赖检测

- id: TC-TASK-12
- module: task
- priority: P0
- role: tech_manager

**前置条件**: 已登录为 e2e_tech_mgr，任务B依赖任务A

**操作步骤**:
1. 编辑任务A
2. fill: [data-testid=task-form-input-predecessor] → "任务B的WBS编码"
3. click: [data-testid=task-form-btn-submit]

**验证**:
- 保存失败
- text: contains "循环依赖"

**清理**: 无

---

## TC-TASK-13: 多级WBS展开/折叠

- id: TC-TASK-13
- module: task
- priority: P1
- role: tech_manager

**前置条件**: 已登录为 e2e_tech_mgr，seed数据含多级任务

**操作步骤**:
1. navigate: /tasks，选择项目 E2E-PROJ-002
2. 找到有子任务的根任务行
3. click: [data-testid=task-row-btn-expand]
4. 验证子任务显示
5. click: [data-testid=task-row-btn-collapse]
6. 验证子任务隐藏

**验证**:
- 展开后显示子任务，缩进正确
- 折叠后子任务隐藏

**清理**: 无

---

## TC-TASK-14: 版本冲突检测（并发编辑）

- id: TC-TASK-14
- module: task
- priority: P1
- role: tech_manager

**前置条件**: 两个用户同时编辑同一任务

**操作步骤**:
1. 用户A（e2e_tech_mgr）编辑任务并保存
2. 用户B（e2e_admin）编辑同一任务（不刷新）并保存

**验证**:
- 用户B保存失败
- text: contains "已被修改" or "版本冲突"
- api: PUT /api/tasks/:id → status === 409

**清理**: 无

---

## TC-TASK-15: 任务搜索

- id: TC-TASK-15
- module: task
- priority: P1
- role: tech_manager

**前置条件**: 已登录为 e2e_tech_mgr

**操作步骤**:
1. navigate: /tasks
2. fill: [data-testid=task-filter-search] → "系统设计"

**验证**:
- 列表显示包含"系统设计"的任务
- 搜索不区分大小写

**清理**: 清除搜索

---

## TC-TASK-16: 任务导入（预览+确认）

- id: TC-TASK-16
- module: task
- priority: P1
- role: tech_manager

**前置条件**: 已登录为 e2e_tech_mgr，已下载导入模板

**操作步骤**:
1. navigate: /tasks
2. 准备导入文件（包含任务描述、类型、优先级、工期等字段）
3. click: 导入按钮
4. upload: [data-testid=task-import-btn-upload] → 上传文件
5. 等待解析完成
6. 查看 [data-testid=task-import-table-preview] 预览

**验证**:
- element: [data-testid=task-dialog-import] visible
- 预览表格显示解析后的任务数据
- 校验结果列显示：有效行/错误行/警告行
- click: [data-testid=task-import-btn-confirm]
- 导入成功后任务列表新增导入的任务
- api: POST /api/tasks/import → 返回导入结果（成功数、失败数、错误详情）

**清理**: 删除导入的任务

---

## TC-TASK-17: 任务导出

- id: TC-TASK-17
- module: task
- priority: P1
- role: tech_manager

**前置条件**: 已登录为 e2e_tech_mgr，存在任务数据

**操作步骤**:
1. navigate: /tasks
2. select: [data-testid=task-filter-project] → "E2E测试项目-职能管理"
3. click: [data-testid=task-menu-export]
4. click: [data-testid=task-menuitem-export-filtered]（导出筛选结果）

**验证**:
- 下载文件格式正确（Excel/CSV）
- 文件包含筛选后的任务数据（WBS编码、描述、状态、类型、负责人等）
- 如勾选 [data-testid=task-checkbox-export-history]，文件包含延期历史列
- 文件数据与页面显示一致
- api: GET /api/tasks/export → 返回文件

**清理**: 无

---

## TC-TASK-18: 列显示/隐藏设置

- id: TC-TASK-18
- module: task
- priority: P2
- role: tech_manager

**前置条件**: 已登录为 e2e_tech_mgr

**操作步骤**:
1. navigate: /tasks
2. click: [data-testid=task-popover-column-settings]
3. 取消勾选某一列（如"优先级"）
4. 验证表格列变化
5. 重新勾选该列
6. 验证列恢复显示

**验证**:
- 取消勾选后表格中该列消失
- 重新勾选后该列恢复
- 列设置持久化（刷新后保持）
- 必须列（如任务描述、WBS编码）不可隐藏

**清理**: 恢复默认列设置

---

## TC-TASK-19: WBS多级展开/折叠全部

- id: TC-TASK-19
- module: task
- priority: P1
- role: tech_manager

**前置条件**: 已登录为 e2e_tech_mgr，seed数据含多级任务

**操作步骤**:
1. navigate: /tasks，选择项目 E2E-PROJ-002
2. 默认状态：仅显示根任务
3. click: "全部展开"按钮（如有）
4. 验证所有层级任务显示
5. click: "全部折叠"按钮
6. 验证仅显示根任务

**验证**:
- 全部展开：element: [data-testid=task-table-row] count > 2（子任务也显示）
- 全部折叠：element: [data-testid=task-table-row] count === 2（仅根任务）
- 展开后子任务有正确的缩进层级
- api: GET /api/tasks?project_id=xxx → 返回全部任务（不受展开折叠影响）

**清理**: 无
