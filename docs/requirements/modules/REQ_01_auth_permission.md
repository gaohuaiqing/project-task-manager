# 模块需求：认证权限模块 (01-auth-permission)

> **创建时间**: 2026-03-17
> **状态**: ✅ 完成
> **来源文档**: FINAL_REQUIREMENTS_0316-2023.md, UI_Requirement_0316-2023.md

---

## 需求来源汇总

| 来源文档 | 涉及行号/章节 | 内容类型 |
|----------|---------------|----------|
| FINAL_REQUIREMENTS | L68-77 | 用户角色定义 |
| FINAL_REQUIREMENTS | L914-1068 | 模块#4 组织架构与权限 |
| FINAL_REQUIREMENTS | L1700-1727 | 模块#13 增强审计 |
| FINAL_REQUIREMENTS | L1754-1774 | 模块#15 高级会话管理 |
| FINAL_REQUIREMENTS | L1775-1795 | 模块#16 动态权限系统 |
| FINAL_REQUIREMENTS | L2115-2160 | 3.1 认证系统 |
| FINAL_REQUIREMENTS | L2162-2215 | 3.2 用户管理 |
| FINAL_REQUIREMENTS | L2217-2336 | 3.3 角色与权限系统 |
| FINAL_REQUIREMENTS | L2339-2372 | 3.4 安全审计 |
| FINAL_REQUIREMENTS | L2426-2440 | 4.3.1 用户表结构 |

---

## 1. 认证系统

### 1.1 登录功能

**来源**: FINAL_REQUIREMENTS#L2119-2129, L970-983

#### 功能需求
| 功能 | 描述 |
|------|------|
| 用户名+密码登录 | 标准登录方式，使用工号作为用户名 |
| bcrypt密码校验 | 10轮加密哈希验证 |
| 登录限流 | 15分钟内最多5次尝试 |
| 锁定机制 | 5次失败后锁定30分钟 |
| 错误提示 | 区分用户不存在/密码错误 |

#### 验收标准
- 验证成功后进入工作台
- 根据角色显示相应功能
- 如果有其他设备登录，收到通知

#### 边界条件
- 用户名格式：8位数字或6位字母+数字
- 密码：bcrypt加密存储

#### API端点
```
POST /api/login
```

### 1.2 登出功能

**来源**: FINAL_REQUIREMENTS#L2131-2138

#### 功能需求
| 功能 | 描述 |
|------|------|
| 主动登出 | 清理Cookie + Redis + 标记session失效 |
| 全设备登出 | 管理员可强制所有设备登出 |

#### API端点
```
POST /api/logout
```

### 1.3 会话管理

**来源**: FINAL_REQUIREMENTS#L2140-2151, L1754-1774

#### 功能需求
| 功能 | 描述 |
|------|------|
| Cookie存储 | 7天有效期，httpOnly |
| Redis缓存 | 24小时TTL，快速验证 |
| 多设备支持 | 同账号最多10设备 |
| 设备踢出 | 超过10设备时踢出最早登录 |
| 自动续期 | 到期前5分钟如有活动，自动续期7天 |
| IP验证 | 支持同子网IP变更（/24前缀） |
| IP变更策略 | 同子网允许，否则终止会话 |
| 会话终止追踪 | 记录会话终止原因 |

#### 会话管理规则
| 规则 | 说明 |
|------|------|
| 最大会话数 | 10个/用户 |
| 会话有效期 | 7天 |
| 自动续期阈值 | 到期前5分钟（需有活动） |
| 续期后有效期 | 7天 |

### 1.4 密码策略

**来源**: FINAL_REQUIREMENTS#L2153-2159

#### 功能需求
| 功能 | 描述 |
|------|------|
| bcrypt加密 | 10轮哈希 |
| 默认密码 | 按角色预设默认密码 |
| 初始密码生成 | 创建用户时自动生成，方便拷贝 |
| 密码复制功能 | 提供一键复制按钮，点击后密码复制到剪贴板 |

---

## 2. 用户管理

### 2.1 用户生命周期

**来源**: FINAL_REQUIREMENTS#L2164-2189

#### 创建用户
| 功能 | 描述 |
|------|------|
| 权限要求 | 管理员 或 有权限创建组织架构的角色 |
| 创建方式 | 在组织架构中添加成员时自动创建账户 |
| 必填字段 | 姓名、工号、角色 |
| 默认密码 | 自动生成，方便拷贝（一次性显示） |

#### 用户创建流程
```
1. 在组织架构中选择部门
2. 点击"添加成员"
3. 填写姓名、工号
4. 系统自动创建账户，生成默认密码
5. 弹窗显示账户信息（用户名=工号，默认密码）
6. 可一键拷贝账户信息
```

#### 编辑/删除用户
| 功能 | 描述 |
|------|------|
| 编辑用户 | 修改姓名、角色 |
| 删除用户 | 软删除（admin不可删除） |

### 2.2 个人信息管理

**来源**: FINAL_REQUIREMENTS#L2190-2197

| 功能 | 描述 |
|------|------|
| 查看个人信息 | 当前登录用户的资料 |
| 修改个人信息 | 姓名 |
| 修改密码 | 用户自助修改（需验证旧密码） |

### 2.3 密码管理

**来源**: FINAL_REQUIREMENTS#L2198-2206

| 功能 | 描述 |
|------|------|
| 管理员重置密码 | 管理员可重置任意用户密码 |
| 初始密码生成 | 创建用户时自动生成，方便拷贝 |
| 密码复制功能 | 提供一键复制按钮 |
| 重置密码复制 | 重置密码后同样提供一键复制功能 |

### 2.4 工号管理

**来源**: FINAL_REQUIREMENTS#L2207-2214

| 功能 | 描述 |
|------|------|
| 工号格式 | 8位数字 或 6位字母+数字 |
| 唯一性验证 | 工号不可重复 |
| 作为登录账号 | 工号即用户名 |

---

## 3. 权限系统

### 3.1 角色定义

**来源**: FINAL_REQUIREMENTS#L68-77, L2219-2244

| 角色代码 | 中文名称 | 描述 | 可编辑WBS | 数据访问范围 |
|---------|----------|------|----------|------------|
| admin | 系统管理员 | 系统最高权限 | ✅ | 所有项目数据 |
| tech_manager | 技术经理 | 技术部门管理者 | ✅ | 所有技术项目数据 |
| dept_manager | 部门经理 | 业务部门管理者 | ✅ | 本部门项目数据 |
| engineer | 工程师 | 普通开发人员 | ✅* | 参与的项目数据 |

*注：工程师编辑计划相关字段需要审批

### 3.2 16种细粒度权限

**来源**: FINAL_REQUIREMENTS#L926-946, L1786-1795, L2245-2265

| 权限类别 | 权限项 | 说明 |
|----------|--------|------|
| **项目权限**（4种） | PROJECT_VIEW | 查看项目 |
| | PROJECT_CREATE | 创建项目 |
| | PROJECT_EDIT | 编辑项目 |
| | PROJECT_DELETE | 删除项目 |
| **成员权限**（4种） | MEMBER_VIEW | 查看成员 |
| | MEMBER_CREATE | 添加成员 |
| | MEMBER_EDIT | 编辑成员 |
| | MEMBER_DELETE | 删除成员 |
| **任务权限**（5种） | TASK_VIEW | 查看任务 |
| | TASK_CREATE | 创建任务 |
| | TASK_EDIT | 编辑任务 |
| | TASK_DELETE | 删除任务 |
| | TASK_ASSIGN | 分配任务 |
| **系统权限**（3种） | USER_MANAGE | 用户管理 |
| | SYSTEM_CONFIG | 系统配置 |
| | AUDIT_LOG_VIEW | 审计日志查看 |

### 3.3 权限矩阵

**来源**: FINAL_REQUIREMENTS#L2266-2288

| 权限 | admin | tech_manager | dept_manager | engineer |
|------|-------|-------------|--------------|----------|
| PROJECT_VIEW | ✅ | ✅ | ✅ | ✅ |
| PROJECT_CREATE | ✅ | ✅ | ❌ | ❌ |
| PROJECT_EDIT | ✅ | ✅ | ✅ | ❌ |
| PROJECT_DELETE | ✅ | ✅ | ❌ | ❌ |
| MEMBER_VIEW | ✅ | ✅ | ✅ | ✅ |
| MEMBER_CREATE | ✅ | ✅ | ❌ | ❌ |
| MEMBER_EDIT | ✅ | ✅ | ✅ | ❌ |
| MEMBER_DELETE | ✅ | ✅ | ❌ | ❌ |
| TASK_VIEW | ✅ | ✅ | ✅ | ✅ |
| TASK_CREATE | ✅ | ✅ | ❌ | ❌ |
| TASK_EDIT | ✅ | ✅ | ✅ | ✅* |
| TASK_DELETE | ✅ | ✅ | ❌ | ❌ |
| TASK_ASSIGN | ✅ | ✅ | ✅ | ❌ |
| USER_MANAGE | ✅ | ❌ | ❌ | ❌ |
| SYSTEM_CONFIG | ✅ | ❌ | ❌ | ❌ |
| AUDIT_LOG_VIEW | ✅ | ✅ | ❌ | ❌ |

### 3.4 数据访问规则

**来源**: FINAL_REQUIREMENTS#L2289-2320, L1051-1067

#### 规则1：项目数据隔离
- 只能看到自己参与的项目的数据
- 项目成员关系由项目经理设置
- 系统管理员可以查看所有数据

#### 规则2：审批权限
- 工程师修改计划 → 需要审批
- 技术经理修改 → 直接生效
- 系统管理员修改 → 直接生效

### 3.5 动态权限配置

**来源**: FINAL_REQUIREMENTS#L947-951, L1775-1795

| 功能 | 描述 |
|------|------|
| 运行时权限配置 | 无需重启即可调整权限 |
| 权限存储 | permissions_config表 |
| 权限变更历史 | permission_history表 |
| 权限缓存 | 权限配置缓存在Redis |

### 3.6 授权机制

**来源**: FINAL_REQUIREMENTS#L2320-2336

| 功能 | 描述 |
|------|------|
| 授权说明 | 部门经理可授权技术经理管理其他技术组 |
| 授权范围 | 项目访问、任务管理、人员管理 |
| 授权记录 | 系统记录授权历史 |

**数据访问范围明细：**

| 角色 | 数据访问范围 | 人员管理范围 |
|------|-------------|-------------|
| admin | 所有项目、任务 | 所有人员 |
| dept_manager | 本部门所有人员涉及的项目、任务 | 本部门所有人员 |
| tech_manager | 本技术组所有人员涉及的项目、任务 | 本技术组人员 |
| tech_manager（授权） | 部门经理授权的其他技术组的项目、任务 | 授权范围内的其他技术组人员 |
| engineer | 参与的项目、任务 | 无 |

---

## 4. 审计日志

### 4.1 审计日志记录

**来源**: FINAL_REQUIREMENTS#L1700-1727, L2341-2357

#### 功能需求
| 功能 | 描述 |
|------|------|
| 完整审计日志 | 记录所有数据变更 |
| 12字段记录 | 包含操作人、时间、IP、变更内容等 |
| 变更追溯 | 支持查看任意数据的历史变更 |
| 导出功能 | 支持导出审计日志 |

#### 日志类型
| 日志类型 | 记录内容 |
|---------|---------|
| 登录日志 | 登录时间、IP、设备、结果 |
| 操作日志 | 操作时间、用户、操作类型、目标 |
| 变更记录 | 变更前值、变更后值、变更时间 |

#### 审计日志字段（12字段）
| 字段 | 说明 |
|------|------|
| id | 日志ID |
| user_id | 操作用户ID |
| action | 操作类型 |
| table_name | 操作表名 |
| record_id | 记录ID |
| old_value | 变更前值 |
| new_value | 变更后值 |
| ip_address | 操作IP |
| user_agent | 用户代理 |
| created_at | 操作时间 |
| node_id | 节点ID（分布式） |
| session_id | 会话ID |

### 4.2 日志查询

**来源**: FINAL_REQUIREMENTS#L2358-2365

| 功能 | 描述 |
|------|------|
| 按时间范围查询 | 支持开始/结束时间筛选 |
| 按用户查询 | 查看特定用户的操作记录 |
| 按操作类型查询 | 筛选特定类型的操作 |

### 4.3 安全告警

**来源**: FINAL_REQUIREMENTS#L2366-2372

| 功能 | 描述 |
|------|------|
| 新设备登录通知 | 新设备登录时通知其他在线设备 |
| 多设备登录提示 | 显示当前在线设备数量 |

---

## 数据需求

### 数据模型

#### users表
**来源**: FINAL_REQUIREMENTS#L2426-2440

| 字段名称 | 类型 | 必填 | 说明 |
|---------|------|------|------|
| id | Integer | ✅ | 主键（自增） |
| username | String(50) | ✅ | 用户名（工号） |
| password | String(255) | ✅ | 密码（bcrypt加密） |
| real_name | String(50) | ✅ | 真实姓名 |
| role | Enum | ✅ | 角色（admin/tech_manager/dept_manager/engineer） |
| department_id | Integer | ❌ | 部门ID |
| email | String(100) | ❌ | 邮箱 |
| phone | String(20) | ❌ | 电话 |
| is_active | Boolean | ✅ | 是否激活 |
| created_at | Timestamp | ✅ | 创建时间 |
| updated_at | Timestamp | ✅ | 更新时间 |

#### sessions表
| 字段名称 | 类型 | 必填 | 说明 |
|---------|------|------|------|
| id | String | ✅ | 会话ID |
| user_id | Integer | ✅ | 用户ID |
| ip_address | String | ❌ | IP地址 |
| user_agent | String | ❌ | 用户代理 |
| expires_at | Timestamp | ✅ | 过期时间 |
| created_at | Timestamp | ✅ | 创建时间 |
| terminated_at | Timestamp | ❌ | 终止时间 |
| termination_reason | String | ❌ | 终止原因 |

#### audit_logs表
| 字段名称 | 类型 | 必填 | 说明 |
|---------|------|------|------|
| id | UUID | ✅ | 日志ID |
| user_id | Integer | ❌ | 操作用户ID |
| action | String | ✅ | 操作类型 |
| table_name | String | ✅ | 操作表名 |
| record_id | String | ✅ | 记录ID |
| old_value | Text | ❌ | 变更前值 |
| new_value | Text | ❌ | 变更后值 |
| ip_address | String | ❌ | 操作IP |
| user_agent | String | ❌ | 用户代理 |
| created_at | Timestamp | ✅ | 操作时间 |
| node_id | String | ❌ | 节点ID |
| session_id | String | ❌ | 会话ID |

#### permissions_config表
| 字段名称 | 类型 | 必填 | 说明 |
|---------|------|------|------|
| id | Integer | ✅ | 主键 |
| role | String | ✅ | 角色 |
| permission | String | ✅ | 权限项 |
| is_enabled | Boolean | ✅ | 是否启用 |
| updated_at | Timestamp | ✅ | 更新时间 |

#### permission_history表
| 字段名称 | 类型 | 必填 | 说明 |
|---------|------|------|------|
| id | Integer | ✅ | 主键 |
| role | String | ✅ | 角色 |
| permission | String | ✅ | 权限项 |
| old_value | Boolean | ✅ | 旧值 |
| new_value | Boolean | ✅ | 新值 |
| changed_by | Integer | ✅ | 变更人ID |
| changed_at | Timestamp | ✅ | 变更时间 |

---

## 接口需求

### API列表

#### 认证相关
```
POST   /api/login                    # 登录
POST   /api/logout                   # 登出
GET    /api/auth/me                  # 获取当前用户信息
PUT    /api/auth/password            # 修改密码
```

#### 用户管理
```
GET    /api/users                    # 获取用户列表
GET    /api/users/:id                # 获取用户详情
POST   /api/users                    # 创建用户
PUT    /api/users/:id                # 更新用户
DELETE /api/users/:id                # 删除用户
POST   /api/users/:id/reset-password # 重置密码
```

#### 权限管理
```
GET    /api/permissions              # 获取权限配置
PUT    /api/permissions              # 更新权限配置
GET    /api/permissions/history      # 获取权限变更历史
```

#### 会话管理
```
GET    /api/sessions                 # 获取当前用户会话列表
DELETE /api/sessions/:id             # 终止指定会话
DELETE /api/sessions/all             # 终止所有会话
```

#### 审计日志
```
GET    /api/audit-logs               # 获取审计日志列表
GET    /api/audit-logs/:id           # 获取审计日志详情
GET    /api/audit-logs/export        # 导出审计日志
```

---

## 非功能需求

### 安全要求
- bcrypt 10轮加密
- Cookie httpOnly
- 登录限流（15分钟5次）
- 锁定机制（30分钟）
- IP验证（同子网）

### 性能要求
- 会话验证 < 50ms（Redis缓存）
- 权限检查 < 20ms（Redis缓存）

### 可用性要求
- 多设备支持（10设备/用户）
- 自动会话续期
- 新设备登录通知

---

## 完整性验证

- [x] 已覆盖第三部分"账户系统与权限管理"所有章节
- [x] 已覆盖模块#4组织架构与权限
- [x] 已覆盖模块#13增强审计
- [x] 已覆盖模块#15高级会话管理
- [x] 已覆盖模块#16动态权限系统
- [x] 数据模型与第四部分一致
- [x] 16种细粒度权限完整

---

## 待确认项

无

---

## 变更历史

| 日期 | 版本 | 变更内容 |
|------|------|----------|
| 2026-03-17 | 1.0 | 初始版本，从需求文档提取 |
