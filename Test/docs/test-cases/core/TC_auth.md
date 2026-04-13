# 登录认证 - 核心测试用例

> **模块**: 登录认证
> **用例数**: 12
> **优先级**: P0

---

## TC-AUTH-01: 管理员登录成功

- id: TC-AUTH-01
- module: auth
- priority: P0
- role: admin

**前置条件**:
- seed.sql 已执行
- 用户 e2e_admin / Test@123 存在

**操作步骤**:
1. navigate: /login
2. fill: [data-testid=login-input-username] → "e2e_admin"
3. fill: [data-testid=login-input-password] → "Test@123"
4. click: [data-testid=login-btn-submit]
5. wait: url contains /dashboard

**验证**:
- url: contains /dashboard
- element: [data-testid=sidebar-nav] exists
- api: GET /api/auth/me → role === "admin"

**清理**: 无

---

## TC-AUTH-02: 技术经理登录成功

- id: TC-AUTH-02
- module: auth
- priority: P0
- role: tech_manager

**前置条件**: seed.sql 已执行

**操作步骤**:
1. navigate: /login
2. fill: [data-testid=login-input-username] → "e2e_tech_mgr"
3. fill: [data-testid=login-input-password] → "Test@123"
4. click: [data-testid=login-btn-submit]
5. wait: url contains /dashboard

**验证**:
- url: contains /dashboard
- api: GET /api/auth/me → role === "tech_manager"

**清理**: 无

---

## TC-AUTH-03: 部门经理登录成功

- id: TC-AUTH-03
- module: auth
- priority: P0
- role: dept_manager

**前置条件**: seed.sql 已执行

**操作步骤**:
1. navigate: /login
2. fill: [data-testid=login-input-username] → "e2e_dept_mgr"
3. fill: [data-testid=login-input-password] → "Test@123"
4. click: [data-testid=login-btn-submit]
5. wait: url contains /dashboard

**验证**:
- url: contains /dashboard
- api: GET /api/auth/me → role === "dept_manager"

**清理**: 无

---

## TC-AUTH-04: 工程师登录成功

- id: TC-AUTH-04
- module: auth
- priority: P0
- role: engineer

**前置条件**: seed.sql 已执行

**操作步骤**:
1. navigate: /login
2. fill: [data-testid=login-input-username] → "e2e_engineer"
3. fill: [data-testid=login-input-password] → "Test@123"
4. click: [data-testid=login-btn-submit]
5. wait: url contains /dashboard

**验证**:
- url: contains /dashboard
- api: GET /api/auth/me → role === "engineer"

**清理**: 无

---

## TC-AUTH-05: 错误密码登录失败

- id: TC-AUTH-05
- module: auth
- priority: P0
- role: any

**前置条件**: seed.sql 已执行

**操作步骤**:
1. navigate: /login
2. fill: [data-testid=login-input-username] → "e2e_admin"
3. fill: [data-testid=login-input-password] → "WrongPassword"
4. click: [data-testid=login-btn-submit]

**验证**:
- url: not contains /dashboard
- element: [data-testid=login-alert-error] exists
- text: contains "密码错误" or "用户名或密码错误"
- api: POST /api/auth/login → status !== 200

**清理**: 无

---

## TC-AUTH-06: 不存在的用户登录

- id: TC-AUTH-06
- module: auth
- priority: P0
- role: any

**前置条件**: 系统运行正常

**操作步骤**:
1. navigate: /login
2. fill: [data-testid=login-input-username] → "nonexistent_user_xyz"
3. fill: [data-testid=login-input-password] → "Test@123"
4. click: [data-testid=login-btn-submit]

**验证**:
- url: not contains /dashboard
- element: [data-testid=login-alert-error] exists
- text: contains "用户不存在" or "用户名或密码错误"

**清理**: 无

---

## TC-AUTH-07: 空用户名登录

- id: TC-AUTH-07
- module: auth
- priority: P0
- role: any

**前置条件**: 系统运行正常

**操作步骤**:
1. navigate: /login
2. fill: [data-testid=login-input-username] → ""
3. fill: [data-testid=login-input-password] → "Test@123"
4. click: [data-testid=login-btn-submit]

**验证**:
- url: not contains /dashboard
- element: [data-testid=login-input-username] has validation error

**清理**: 无

---

## TC-AUTH-08: 空密码登录

- id: TC-AUTH-08
- module: auth
- priority: P0
- role: any

**前置条件**: 系统运行正常

**操作步骤**:
1. navigate: /login
2. fill: [data-testid=login-input-username] → "e2e_admin"
3. fill: [data-testid=login-input-password] → ""
4. click: [data-testid=login-btn-submit]

**验证**:
- url: not contains /dashboard
- element: [data-testid=login-input-password] has validation error

**清理**: 无

---

## TC-AUTH-09: 退出登录

- id: TC-AUTH-09
- module: auth
- priority: P0
- role: admin

**前置条件**: 已登录为 e2e_admin

**操作步骤**:
1. click: [data-testid=nav-user-menu]
2. click: [data-testid=nav-btn-logout]
3. wait: url contains /login

**验证**:
- url: contains /login
- api: GET /api/auth/me → status === 401

**清理**: 无

---

## TC-AUTH-10: 密码显示/隐藏切换

- id: TC-AUTH-10
- module: auth
- priority: P1
- role: any

**前置条件**: 系统运行正常

**操作步骤**:
1. navigate: /login
2. fill: [data-testid=login-input-password] → "Test@123"
3. click: [data-testid=login-btn-toggle-password]

**验证**:
- element: [data-testid=login-input-password] type === "text"
4. click: [data-testid=login-btn-toggle-password]
- element: [data-testid=login-input-password] type === "password"

**清理**: 无

---

## TC-AUTH-11: 修改密码

- id: TC-AUTH-11
- module: auth
- priority: P1
- role: admin

**前置条件**: 已登录为 e2e_admin

**操作步骤**:
1. navigate: /settings/profile
2. click: [data-testid=profile-btn-change-password]
3. fill: [data-testid=password-input-old] → "Test@123"
4. fill: [data-testid=password-input-new] → "NewTest@456"
5. fill: [data-testid=password-input-confirm] → "NewTest@456"
6. click: [data-testid=password-btn-submit]

**验证**:
- text: contains "密码修改成功"
- api: POST /api/auth/login (username=e2e_admin, password=NewTest@456) → status === 200

**清理**: 修改密码回 "Test@123"

---

## TC-AUTH-12: 登录后不同角色侧边栏菜单差异

- id: TC-AUTH-12
- module: auth
- priority: P1
- role: all

**前置条件**: seed.sql 已执行

**操作步骤**:
1. 以 e2e_engineer 登录
2. take_snapshot: 侧边栏
3. 退出
4. 以 e2e_admin 登录
5. take_snapshot: 侧边栏

**验证**:
- engineer: 不显示 "报表分析" 菜单项
- admin: 显示 "报表分析" 菜单项
- admin: 显示 "系统设置" 且包含全部Tab

**清理**: 退出所有账号
