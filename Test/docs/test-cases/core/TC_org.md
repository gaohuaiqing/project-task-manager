# 组织架构 - 核心测试用例

> **模块**: 组织架构
> **用例数**: 8
> **优先级**: P1

---

## TC-ORG-01: 部门树显示

- id: TC-ORG-01
- module: org
- priority: P1
- role: admin

**前置条件**: 已登录为 e2e_admin，seed部门数据存在

**操作步骤**:
1. navigate: /settings/organization
2. 查看 [data-testid=org-department-tree]

**验证**:
- element: [data-testid=org-department-tree] exists
- 显示层级结构：E2E总公司 → E2E研发部 → E2E前端组
- 部门节点显示人数
- api: GET /api/org/departments → 返回树形结构

**清理**: 无

---

## TC-ORG-02: 添加成员

- id: TC-ORG-02
- module: org
- priority: P1
- role: admin

**前置条件**: 已登录为 e2e_admin

**操作步骤**:
1. navigate: /settings/organization
2. 选择 "E2E研发部-前端组"
3. click: [data-testid=org-btn-add-member]
4. fill: [data-testid=member-form-input-name] → "E2E新成员"
5. fill: [data-testid=member-form-input-employee-id] → "E2E90001"
6. select: [data-testid=member-form-select-role] → "engineer"
7. click: [data-testid=member-form-btn-submit]

**验证**:
- 成员添加成功，显示初始密码
- api: GET /api/org/members → 包含新成员
- 新成员可用工号+初始密码登录

**清理**: 删除新成员

---

## TC-ORG-03: 编辑成员角色

- id: TC-ORG-03
- module: org
- priority: P1
- role: admin

**前置条件**: 已登录为 e2e_admin

**操作步骤**:
1. 找到 e2e_engineer
2. click: [data-testid=member-btn-edit]
3. select: [data-testid=member-form-select-role] → "tech_manager"
4. click: [data-testid=member-form-btn-submit]

**验证**:
- 角色变更成功
- e2e_engineer 重新登录后权限变化（可见审批菜单）
- api: GET /api/auth/me → role === "tech_manager"

**清理**: 改回 engineer

---

## TC-ORG-04: 停用成员

- id: TC-ORG-04
- module: org
- priority: P1
- role: admin

**前置条件**: 已登录为 e2e_admin

**操作步骤**:
1. 找到 e2e_engineer
2. click: [data-testid=member-btn-deactivate]
3. click: [data-testid=confirm-btn-ok]

**验证**:
- 成员状态变为"停用"
- e2e_engineer 无法登录
- api: POST /api/auth/login (e2e_engineer) → 失败

**清理**: 重新启用成员

---

## TC-ORG-05: 工号唯一性验证

- id: TC-ORG-05
- module: org
- priority: P1
- role: admin

**前置条件**: 已登录为 e2e_admin

**操作步骤**:
1. click: [data-testid=org-btn-add-member]
2. fill: [data-testid=member-form-input-employee-id] → "E2E00001"（已存在）
3. fill other required fields
4. click: [data-testid=member-form-btn-submit]

**验证**:
- 保存失败
- text: contains "已存在"

**清理**: 无

---

## TC-ORG-06: 部门经理创建子部门

- id: TC-ORG-06
- module: org
- priority: P1
- role: dept_manager

**前置条件**: 已登录为 e2e_dept_mgr

**操作步骤**:
1. navigate: /settings/organization
2. 选择 "E2E研发部"
3. click: [data-testid=org-btn-add-department]
4. fill: [data-testid=dept-form-input-name] → "E2E测试子部门"
5. click: [data-testid=dept-form-btn-submit]

**验证**:
- 子部门创建成功
- api: GET /api/org/departments → 包含新子部门

**清理**: 删除子部门

---

## TC-ORG-07: 审批人查找顺序

- id: TC-ORG-07
- module: org
- priority: P1
- role: engineer

**前置条件**: 已登录为 e2e_engineer

**操作步骤**:
1. e2e_engineer 提交任务变更
2. 查看审批人

**验证**:
- 审批人为 e2e_tech_mgr（直接主管/技术经理）
- 如无直接主管，逐级向上

**清理**: 无

---

## TC-ORG-08: 成员部门变更影响数据权限

- id: TC-ORG-08
- module: org
- priority: P1
- role: admin

**前置条件**: 已登录为 e2e_admin，e2e_engineer 在前端组

**操作步骤**:
1. 编辑 e2e_engineer，将部门改为"E2E产品部"
2. e2e_engineer 重新登录
3. navigate: /projects

**验证**:
- e2e_engineer 可见数据范围变化
- api: GET /api/projects → 数据范围基于新部门

**清理**: 改回原部门
