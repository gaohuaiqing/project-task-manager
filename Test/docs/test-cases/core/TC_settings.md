# 系统设置 - 核心测试用例

> **模块**: 系统设置
> **用例数**: 18
> **优先级**: P1

---

## TC-SET-01: Tab可见性按角色控制（管理员）

- id: TC-SET-01
- module: settings
- priority: P1
- role: admin

**前置条件**: 已登录为 e2e_admin

**操作步骤**:
1. navigate: /settings
2. 查看设置页Tab列表

**验证**:
- admin可见全部Tab：个人资料、用户管理、组织管理、权限管理、任务类型、能力模型、节假日、系统日志
- element: [data-testid=setting-tab-profile] exists
- element: [data-testid=setting-tab-users] exists
- element: [data-testid=setting-tab-organization] exists
- element: [data-testid=setting-tab-permissions] exists
- element: [data-testid=setting-tab-task-types] exists
- element: [data-testid=setting-tab-capability-models] exists
- element: [data-testid=setting-tab-holidays] exists
- element: [data-testid=setting-tab-audit-logs] exists

**清理**: 无

---

## TC-SET-02: Tab可见性按角色控制（部门经理）

- id: TC-SET-02
- module: settings
- priority: P1
- role: dept_manager

**前置条件**: 已登录为 e2e_dept_mgr

**操作步骤**:
1. navigate: /settings
2. 查看设置页Tab列表

**验证**:
- 部门经理可见：个人资料、组织管理、任务类型、能力模型、节假日、系统日志
- 不可见：用户管理、权限管理
- element: [data-testid=setting-tab-users] not exists
- element: [data-testid=setting-tab-permissions] not exists

**清理**: 无

---

## TC-SET-03: 工程师设置页权限受限

- id: TC-SET-03
- module: settings
- priority: P1
- role: engineer

**前置条件**: 已登录为 e2e_engineer

**操作步骤**:
1. navigate: /settings

**验证**:
- 侧边栏不显示"设置"菜单项（或仅显示"个人资料"）
- 直接访问 /settings/users 被拒绝或重定向
- element: [data-testid=setting-tab-users] not exists
- element: [data-testid=setting-tab-organization] not exists

**清理**: 无

---

## TC-SET-04: 个人资料编辑

- id: TC-SET-04
- module: settings
- priority: P1
- role: admin

**前置条件**: 已登录为 e2e_admin

**操作步骤**:
1. navigate: /settings
2. click: [data-testid=setting-tab-profile]
3. fill: [data-testid=profile-input-display-name] → "E2E管理员-已修改"
4. fill: [data-testid=profile-input-email] → "e2e_admin_new@test.com"
5. click: [data-testid=profile-btn-save]

**验证**:
- 保存成功提示
- 显示名称更新为 "E2E管理员-已修改"
- api: GET /api/auth/me → name === "E2E管理员-已修改"
- 刷新后信息保持

**清理**: 恢复原显示名称和邮箱

---

## TC-SET-05: 用户管理 - 新建用户

- id: TC-SET-05
- module: settings
- priority: P1
- role: admin

**前置条件**: 已登录为 e2e_admin

**操作步骤**:
1. navigate: /settings
2. click: [data-testid=setting-tab-users]
3. click: [data-testid=users-btn-create]
4. fill: [data-testid=users-input-username] → "e2e_test_user"
5. fill: [data-testid=users-input-display-name] → "E2E测试新建用户"
6. fill: [data-testid=users-input-email] → "e2e_test@test.com"
7. select: [data-testid=users-select-role] → "engineer"
8. select: [data-testid=users-select-department] → "E2E前端组"
9. click: [data-testid=users-btn-submit]

**验证**:
- 用户列表新增一行
- element: [data-testid=users-table] text contains "e2e_test_user"
- api: GET /api/org/members → 包含 username === "e2e_test_user"
- api: POST /api/auth/login with new user → 登录成功

**清理**: 删除测试用户

---

## TC-SET-06: 用户管理 - 编辑用户角色

- id: TC-SET-06
- module: settings
- priority: P1
- role: admin

**前置条件**: 已登录为 e2e_admin

**操作步骤**:
1. navigate: /settings → 用户管理Tab
2. 找到 e2e_engineer 行
3. click: [data-testid=users-menu-actions]
4. click: [data-testid=users-menuitem-edit]
5. select: [data-testid=users-select-role] → "tech_manager"
6. click: [data-testid=users-btn-submit]

**验证**:
- 用户角色标签更新
- element: [data-testid=users-badge-role] text contains "技术经理"
- api: GET /api/org/members/:id → role === "tech_manager"

**清理**: 恢复 engineer 角色

---

## TC-SET-07: 用户管理 - 停用用户

- id: TC-SET-07
- module: settings
- priority: P1
- role: admin

**前置条件**: 已登录为 e2e_admin

**操作步骤**:
1. navigate: /settings → 用户管理Tab
2. 找到 e2e_engineer 行
3. click: [data-testid=users-menu-actions]
4. click: [data-testid=users-menuitem-deactivate]
5. 确认操作

**验证**:
- 用户状态变为"停用"
- 以 e2e_engineer 登录 → 登录失败
- api: GET /api/org/members/:id → is_active === false

**清理**: 重新启用用户

---

## TC-SET-08: 用户管理 - 重置密码

- id: TC-SET-08
- module: settings
- priority: P1
- role: admin

**前置条件**: 已登录为 e2e_admin

**操作步骤**:
1. navigate: /settings → 用户管理Tab
2. 找到 e2e_engineer 行
3. click: [data-testid=users-menu-actions]
4. click: [data-testid=users-menuitem-reset-password]
5. 确认重置
6. 记录显示的新密码

**验证**:
- 显示重置成功提示和新密码
- 用新密码可以登录 e2e_engineer
- api: POST /api/org/members/:id/reset-password → 返回新密码

**清理**: 恢复原密码

---

## TC-SET-09: 组织管理 - 添加部门

- id: TC-SET-09
- module: settings
- priority: P1
- role: admin

**前置条件**: 已登录为 e2e_admin

**操作步骤**:
1. navigate: /settings
2. click: [data-testid=setting-tab-organization]
3. 选择 "E2E研发部" 节点
4. click: [data-testid=org-btn-add-department]
5. fill: [data-testid=org-input-department-name] → "E2E测试新增组"
6. fill: [data-testid=org-input-department-code] → "E2E-TEST-GROUP"
7. click: 提交按钮

**验证**:
- 部门树新增节点 "E2E测试新增组"，位于 E2E研发部 下
- element: [data-testid=org-tree-container] text contains "E2E测试新增组"
- api: GET /api/org/departments → 包含 name === "E2E测试新增组"

**清理**: 删除测试部门

---

## TC-SET-10: 组织管理 - 添加部门成员

- id: TC-SET-10
- module: settings
- priority: P1
- role: admin

**前置条件**: 已登录为 e2e_admin

**操作步骤**:
1. navigate: /settings → 组织管理Tab
2. 选择 "E2E前端组"
3. click: [data-testid=org-btn-add-member]
4. fill: [data-testid=org-input-member-name] → "E2E测试成员"
5. fill: [data-testid=org-input-member-username] → "e2e_new_member"
6. fill: [data-testid=org-input-member-email] → "e2e_new@test.com"
7. select: [data-testid=org-select-member-role] → "engineer"
8. click: 提交按钮

**验证**:
- 成功提示
- 成员表格新增一行
- element: [data-testid=org-table-members] text contains "E2E测试成员"
- api: GET /api/org/departments/:id/members → 包含新成员

**清理**: 删除测试成员

---

## TC-SET-11: 组织管理 - 导入导出

- id: TC-SET-11
- module: settings
- priority: P2
- role: admin

**前置条件**: 已登录为 e2e_admin

**操作步骤**:
1. navigate: /settings → 组织管理Tab
2. click: [data-testid=org-btn-download-template]
3. 验证模板文件下载成功
4. click: [data-testid=org-btn-export]
5. 验证导出文件包含 E2E 开头的组织数据

**验证**:
- 模板文件格式正确（Excel/CSV）
- 导出文件包含完整部门层级和成员信息
- api: GET /api/org/export → 返回文件

**清理**: 无

---

## TC-SET-12: 权限管理 - 查看权限矩阵

- id: TC-SET-12
- module: settings
- priority: P1
- role: admin

**前置条件**: 已登录为 e2e_admin

**操作步骤**:
1. navigate: /settings
2. click: [data-testid=setting-tab-permissions]
3. select: [data-testid=permissions-select-role] → "engineer"
4. 查看权限矩阵

**验证**:
- element: [data-testid=permissions-table-permissions] exists
- 矩阵行包含各功能模块
- engineer 的权限勾选与预期一致（如不可创建项目、不可审批）
- api: GET /api/settings/permissions?role=engineer → 返回权限配置

**清理**: 无

---

## TC-SET-13: 权限管理 - 修改并保存

- id: TC-SET-13
- module: settings
- priority: P1
- role: admin

**前置条件**: 已登录为 e2e_admin

**操作步骤**:
1. navigate: /settings → 权限管理Tab
2. select: [data-testid=permissions-select-role] → "engineer"
3. 取消勾选某项权限
4. click: [data-testid=permissions-btn-save]
5. 验证保存成功

**验证**:
- 保存提示成功
- 以 engineer 登录后对应功能不可用
- api: GET /api/settings/permissions?role=engineer → 权限已更新
- 刷新页面后权限配置保持

**清理**: 恢复原权限

---

## TC-SET-14: 任务类型 - 添加映射

- id: TC-SET-14
- module: settings
- priority: P2
- role: admin

**前置条件**: 已登录为 e2e_admin

**操作步骤**:
1. navigate: /settings
2. click: [data-testid=setting-tab-task-types]
3. click: [data-testid=tasktype-btn-add]
4. select: [data-testid=tasktype-select-task-type] → "系统设计"
5. select: [data-testid=tasktype-select-model] → 选择一个能力模型
6. fill: [data-testid=tasktype-input-priority] → "3"
7. click: 提交按钮

**验证**:
- 表格新增一行映射记录
- element: [data-testid=tasktype-table] text contains "系统设计"
- api: GET /api/settings/task-types → 包含新映射

**清理**: 删除测试映射

---

## TC-SET-15: 能力模型 - 添加/编辑

- id: TC-SET-15
- module: settings
- priority: P2
- role: admin

**前置条件**: 已登录为 e2e_admin

**操作步骤**:
1. navigate: /settings
2. click: [data-testid=setting-tab-capability-models]
3. click: [data-testid=model-btn-add]
4. fill: [data-testid=model-input-name] → "E2E测试能力模型"
5. fill: [data-testid=model-textarea-description] → "E2E测试用能力模型描述"
6. click: 提交按钮

**验证**:
- 模型列表新增一条记录
- element: [data-testid=model-table] text contains "E2E测试能力模型"
- api: GET /api/settings/capability-models → 包含新模型

**清理**: 删除测试模型

---

## TC-SET-16: 节假日管理

- id: TC-SET-16
- module: settings
- priority: P2
- role: admin

**前置条件**: 已登录为 e2e_admin

**操作步骤**:
1. navigate: /settings
2. click: [data-testid=setting-tab-holidays]
3. click: [data-testid=holiday-btn-add]
4. fill: [data-testid=holiday-input-name] → "E2E测试节假日"
5. fill: [data-testid=holiday-input-date] → "2026-06-15"
6. select: [data-testid=holiday-select-type] → "公司假期"
7. click: 提交按钮

**验证**:
- 节假日列表新增一条记录
- element: [data-testid=holiday-table] text contains "E2E测试节假日"
- api: GET /api/settings/holidays?year=2026 → 包含新记录

**清理**: 删除测试节假日

---

## TC-SET-17: 审计日志查询

- id: TC-SET-17
- module: settings
- priority: P1
- role: admin

**前置条件**: 已登录为 e2e_admin，存在操作记录

**操作步骤**:
1. navigate: /settings → 系统日志Tab
2. 查看日志列表
3. select: [data-testid=log-select-category] → 选择一个分类
4. select: [data-testid=log-select-action] → 选择操作类型
5. 验证筛选结果

**验证**:
- element: [data-testid=log-table] exists
- 日志列表包含：操作人、操作类型、时间、详情
- 筛选后只显示匹配的日志
- api: GET /api/audit-logs?category=xxx&action=xxx → 返回筛选后的数据

**清理**: 清除筛选

---

## TC-SET-18: 审计日志导出

- id: TC-SET-18
- module: settings
- priority: P2
- role: admin

**前置条件**: 已登录为 e2e_admin，存在操作记录

**操作步骤**:
1. navigate: /settings → 系统日志Tab
2. click: [data-testid=log-btn-export]
3. 等待文件下载

**验证**:
- 下载文件格式正确（Excel/CSV）
- 文件内容与页面显示一致
- api: GET /api/audit-logs/export → 返回文件

**清理**: 无
