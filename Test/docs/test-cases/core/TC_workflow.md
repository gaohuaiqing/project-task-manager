# 审批流程 - 核心测试用例

> **模块**: 审批流程
> **用例数**: 10
> **优先级**: P0

---

## TC-WF-01: 工程师提交工期变更申请

- id: TC-WF-01
- module: workflow
- priority: P0
- role: engineer

**前置条件**: 已登录为 e2e_engineer，有已分配任务

**操作步骤**:
1. 编辑任务，修改工期
2. fill: [data-testid=task-form-input-duration] → "20"
3. fill: [data-testid=task-form-input-change-reason] → "E2E测试：工作量增加"
4. click: [data-testid=task-form-btn-submit]
5. wait: text contains "待审批"

**验证**:
- 任务状态变为"待审批"
- api: GET /api/workflow/plan-changes → 存在 status === "pending", change_type === "duration"
- api: GET /api/workflow/approvals/pending → 包含此变更

**清理**: 无

---

## TC-WF-02: 技术经理审批通过

- id: TC-WF-02
- module: workflow
- priority: P0
- role: tech_manager

**前置条件**: 存在待审批的变更申请（TC-WF-01 后续）

**操作步骤**:
1. 以 e2e_tech_mgr 登录
2. navigate: [data-testid=nav-menu-approvals]（或通过通知进入）
3. 找到待审批项，click: [data-testid=approval-btn-detail]
4. click: [data-testid=approval-btn-approve]
5. fill: [data-testid=approval-input-comment] → "同意"
6. click: [data-testid=approval-btn-confirm]

**验证**:
- 审批状态变为"已通过"
- 任务工期更新为20天
- api: GET /api/workflow/plan-changes/:id → status === "approved"
- api: GET /api/tasks/:id → duration === 20

**清理**: 无

---

## TC-WF-03: 审批驳回

- id: TC-WF-03
- module: workflow
- priority: P0
- role: tech_manager

**前置条件**: 存在待审批的变更申请

**操作步骤**:
1. 以 e2e_tech_mgr 登录
2. 进入审批列表
3. click: [data-testid=approval-btn-detail]
4. click: [data-testid=approval-btn-reject]
5. fill: [data-testid=approval-input-rejection-reason] → "工期不合理"
6. click: [data-testid=approval-btn-confirm]

**验证**:
- 审批状态变为"已驳回"
- 任务保持原值
- api: GET /api/workflow/plan-changes/:id → status === "rejected"
- e2e_engineer 收到驳回通知

**清理**: 无

---

## TC-WF-04: 驳回后可重新提交

- id: TC-WF-04
- module: workflow
- priority: P0
- role: engineer

**前置条件**: 存在被驳回的变更申请

**操作步骤**:
1. 以 e2e_engineer 登录
2. 编辑同一任务，修改工期
3. fill: [data-testid=task-form-input-change-reason] → "E2E重新申请"
4. click: [data-testid=task-form-btn-submit]

**验证**:
- 新变更申请提交成功
- api: GET /api/workflow/plan-changes → 存在新的 pending 记录

**清理**: 无

---

## TC-WF-05: 批量审批

- id: TC-WF-05
- module: workflow
- priority: P1
- role: tech_manager

**前置条件**: 存在多个待审批申请

**操作步骤**:
1. 以 e2e_tech_mgr 登录
2. 进入审批列表
3. click: [data-testid=approval-checkbox]（勾选多个）
4. click: [data-testid=approval-btn-batch-approve]
5. click: [data-testid=confirm-btn-ok]

**验证**:
- 所有选中项审批通过
- api: GET /api/workflow/plan-changes → 选中项 status === "approved"

**清理**: 无

---

## TC-WF-06: 审批权限验证（工程师无权限）

- id: TC-WF-06
- module: workflow
- priority: P0
- role: engineer

**前置条件**: 已登录为 e2e_engineer

**操作步骤**:
1. 查看侧边栏菜单

**验证**:
- 审批菜单不显示（或点击后无审批操作权限）
- api: GET /api/workflow/approvals/pending → 空列表或无权限

**清理**: 无

---

## TC-WF-07: 通知管理

- id: TC-WF-07
- module: workflow
- priority: P1
- role: engineer

**前置条件**: 审批已通过（TC-WF-02 后续）

**操作步骤**:
1. 以 e2e_engineer 登录
2. click: [data-testid=nav-btn-notifications]
3. 查看通知列表
4. click: [data-testid=notification-btn-mark-read]（第一条）
5. click: [data-testid=notification-btn-read-all]

**验证**:
- 通知列表包含审批结果通知
- 标记已读后红点消失
- 全部已读后未读数为0

**清理**: 无

---

## TC-WF-08: 管理员直接修改（无需审批）

- id: TC-WF-08
- module: workflow
- priority: P0
- role: admin

**前置条件**: 已登录为 e2e_admin

**操作步骤**:
1. 编辑任意任务
2. fill: [data-testid=task-form-input-duration] → "25"
3. click: [data-testid=task-form-btn-submit]

**验证**:
- 修改直接生效，无审批流程
- api: GET /api/tasks/:id → duration === 25

**清理**: 无

---

## TC-WF-09: 变更原因必填验证

- id: TC-WF-09
- module: workflow
- priority: P0
- role: engineer

**前置条件**: 已登录为 e2e_engineer，有已分配任务

**操作步骤**:
1. 编辑任务，修改工期
2. 不填写变更原因
3. click: [data-testid=task-form-btn-submit]

**验证**:
- 保存失败
- text: contains "变更原因" or "必填"

**清理**: 无

---

## TC-WF-10: 审批列表筛选

- id: TC-WF-10
- module: workflow
- priority: P1
- role: tech_manager

**前置条件**: 已登录为 e2e_tech_mgr，存在不同状态的审批

**操作步骤**:
1. 进入审批列表
2. select: [data-testid=approval-filter-status] → "已通过"

**验证**:
- 列表只显示已通过的审批
- 切换到"我发起的"标签只显示当前用户发起的

**清理**: 清除筛选
