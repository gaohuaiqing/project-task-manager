# 通知系统 - 核心测试用例

> **模块**: 通知系统
> **用例数**: 6
> **优先级**: P1

---

## TC-NOTI-01: 打开通知面板

- id: TC-NOTI-01
- module: notification
- priority: P1
- role: engineer

**前置条件**: 已登录为 e2e_engineer，seed通知数据存在

**操作步骤**:
1. 观察页面头部通知铃铛上的未读徽章
2. click: [data-testid=header-btn-notification]
3. 等待通知面板打开

**验证**:
- element: [data-testid=header-popover-notification] visible
- 铃铛上有未读数量徽章（数字 >= 1）
- 面板中显示通知列表

**清理**: 无

---

## TC-NOTI-02: 未读通知列表显示

- id: TC-NOTI-02
- module: notification
- priority: P1
- role: engineer

**前置条件**: 已登录为 e2e_engineer，存在未读通知

**操作步骤**:
1. click: [data-testid=header-btn-notification]
2. 查看通知列表

**验证**:
- 通知列表包含 "E2E测试通知-任务分配"
- 通知显示标题、内容摘要、时间
- 未读通知有视觉区分（如背景色、加粗、圆点标记）
- api: GET /api/notifications?is_read=false → 返回未读通知列表

**清理**: 无

---

## TC-NOTI-03: 全部标记已读

- id: TC-NOTI-03
- module: notification
- priority: P1
- role: engineer

**前置条件**: 已登录为 e2e_engineer，存在多条未读通知

**操作步骤**:
1. click: [data-testid=header-btn-notification]
2. click: [data-testid=header-btn-mark-all-read]
3. 等待操作完成

**验证**:
- 所有通知变为已读状态（视觉区分消失）
- 铃铛上的未读徽章消失或变为 0
- api: GET /api/notifications?is_read=false → 返回空数组
- api: GET /api/notifications?is_read=true → 包含所有原未读通知

**清理**: 重新执行 seed.sql 恢复未读状态

---

## TC-NOTI-04: 点击通知跳转

- id: TC-NOTI-04
- module: notification
- priority: P1
- role: engineer

**前置条件**: 已登录为 e2e_engineer，存在关联任务的通知

**操作步骤**:
1. click: [data-testid=header-btn-notification]
2. 点击 "E2E测试通知-任务分配" 通知
3. 等待页面跳转

**验证**:
- 页面跳转到通知 link 指向的地址（项目详情页或任务页）
- 该通知自动标记为已读
- url: contains /projects/e2e-proj-002

**清理**: 无

---

## TC-NOTI-05: 任务分配后产生通知

- id: TC-NOTI-05
- module: notification
- priority: P1
- role: multi_role

**前置条件**: 已登录为 e2e_tech_mgr，存在未分配的任务

**操作步骤**:
1. navigate: /tasks
2. 编辑一个未分配的任务
3. select: [data-testid=task-form-select-assignee] → "e2e_engineer"
4. click: [data-testid=task-form-btn-submit]
5. 切换到 e2e_engineer 账户
6. 查看通知铃铛

**验证**:
- e2e_engineer 收到新的任务分配通知
- 通知标题包含任务名称
- api: GET /api/notifications → 最新通知 type === "task_assigned"

**清理**: 无

---

## TC-NOTI-06: 未读数量徽章准确性

- id: TC-NOTI-06
- module: notification
- priority: P1
- role: admin

**前置条件**: 已登录为 e2e_admin

**操作步骤**:
1. 查看通知铃铛上的数字 N
2. click: [data-testid=header-btn-notification]
3. 统计未读通知数量

**验证**:
- 徽章显示数字与实际未读通知数一致
- api: GET /api/notifications?is_read=false → count === N
- 无未读通知时徽章不显示

**清理**: 无
