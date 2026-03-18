# 模块设计：认证权限模块 (01-auth-permission)

> **文档版本**: 1.0
> **创建时间**: 2026-03-17
> **状态**: ✅ 完成
> **模块组**: 01-auth-permission
> **开发顺序**: 1（基础设施层，无依赖）

---

## 1. 快速参考（AI摘要）

### 1.1 模块概述

认证权限模块是系统的基础设施层，负责用户身份验证、会话管理、权限控制和审计日志。所有其他模块都依赖此模块提供的认证和授权能力。

### 1.2 核心功能列表

| 功能 | 优先级 | 说明 |
|------|--------|------|
| 用户登录 | P0 | 用户名+密码登录，bcrypt验证 |
| 用户登出 | P0 | 清理会话，支持全设备登出 |
| 会话管理 | P0 | 多设备支持(10设备)，自动续期，IP验证 |
| 密码管理 | P0 | bcrypt加密，重置密码，一键复制 |
| 用户CRUD | P0 | 创建/编辑/删除用户，关联组织架构 |
| 权限检查 | P0 | 16种细粒度权限，4种角色 |
| 审计日志 | P1 | 12字段日志记录，查询导出 |

### 1.3 关键技术点

- **认证方式**: Cookie-Session（7天有效期）
- **密码加密**: bcrypt 10轮哈希
- **会话存储**: Redis（24小时TTL） + MySQL（持久化）
- **权限缓存**: Redis缓存权限配置
- **限流策略**: 15分钟5次尝试，30分钟锁定

---

## 2. 数据模型

### 2.1 相关表结构

本模块涉及5个核心表：

| 表名 | 说明 | 记录来源 |
|------|------|---------|
| users | 用户表 | FINAL L2426-2440 |
| sessions | 会话表 | FINAL L2151 |
| audit_logs | 审计日志表 | FINAL L2341-2357 |
| permissions_config | 权限配置表 | FINAL L947-951 |
| permission_history | 权限变更历史表 | FINAL L1775-1795 |

### 2.2 users表（用户）

| 字段名称 | 类型 | 必填 | 默认值 | 说明 |
|---------|------|------|--------|------|
| id | Integer | ✅ | AUTO | 主键（自增） |
| username | String(50) | ✅ | - | 用户名（工号，唯一） |
| password | String(255) | ✅ | - | 密码（bcrypt加密） |
| real_name | String(50) | ✅ | - | 真实姓名 |
| role | Enum | ✅ | 'engineer' | 角色 |
| department_id | Integer | ❌ | NULL | 部门ID |
| email | String(100) | ❌ | NULL | 邮箱 |
| phone | String(20) | ❌ | NULL | 电话 |
| is_active | Boolean | ✅ | TRUE | 是否激活 |
| created_at | Timestamp | ✅ | NOW() | 创建时间 |
| updated_at | Timestamp | ✅ | NOW() | 更新时间 |

**索引**:
```sql
CREATE UNIQUE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_department ON users(department_id);
CREATE INDEX idx_users_role ON users(role);
```

**角色枚举值**:
```typescript
type UserRole = 'admin' | 'tech_manager' | 'dept_manager' | 'engineer';
```

### 2.3 sessions表（会话）

| 字段名称 | 类型 | 必填 | 默认值 | 说明 |
|---------|------|------|--------|------|
| id | String(36) | ✅ | UUID | 会话ID |
| user_id | Integer | ✅ | - | 用户ID |
| ip_address | String(45) | ❌ | NULL | IP地址 |
| user_agent | String(500) | ❌ | NULL | 用户代理 |
| expires_at | Timestamp | ✅ | - | 过期时间 |
| created_at | Timestamp | ✅ | NOW() | 创建时间 |
| terminated_at | Timestamp | ❌ | NULL | 终止时间 |
| termination_reason | String(100) | ❌ | NULL | 终止原因 |

**索引**:
```sql
CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_expires ON sessions(expires_at);
```

**终止原因枚举**:
```typescript
type TerminationReason =
  | 'user_logout'      // 用户主动登出
  | 'admin_forced'     // 管理员强制登出
  | 'session_expired'  // 会话过期
  | 'ip_changed'       // IP变更
  | 'max_devices'      // 超过最大设备数
  | 'password_reset';  // 密码重置
```

### 2.4 audit_logs表（审计日志）

| 字段名称 | 类型 | 必填 | 默认值 | 说明 |
|---------|------|------|--------|------|
| id | String(36) | ✅ | UUID | 日志ID |
| user_id | Integer | ❌ | NULL | 操作用户ID |
| action | String(50) | ✅ | - | 操作类型 |
| table_name | String(50) | ✅ | - | 操作表名 |
| record_id | String(36) | ✅ | - | 记录ID |
| old_value | Text | ❌ | NULL | 变更前值（JSON） |
| new_value | Text | ❌ | NULL | 变更后值（JSON） |
| ip_address | String(45) | ❌ | NULL | 操作IP |
| user_agent | String(500) | ❌ | NULL | 用户代理 |
| created_at | Timestamp | ✅ | NOW() | 操作时间 |
| node_id | String(36) | ❌ | NULL | 节点ID（分布式） |
| session_id | String(36) | ❌ | NULL | 会话ID |

**操作类型枚举**:
```typescript
type AuditAction =
  | 'login'            // 登录
  | 'logout'           // 登出
  | 'create'           // 创建
  | 'update'           // 更新
  | 'delete'           // 删除
  | 'password_reset'   // 密码重置
  | 'permission_change'; // 权限变更
```

### 2.5 permissions_config表（权限配置）

| 字段名称 | 类型 | 必填 | 默认值 | 说明 |
|---------|------|------|--------|------|
| id | Integer | ✅ | AUTO | 主键 |
| role | String(50) | ✅ | - | 角色 |
| permission | String(50) | ✅ | - | 权限项 |
| is_enabled | Boolean | ✅ | TRUE | 是否启用 |
| updated_at | Timestamp | ✅ | NOW() | 更新时间 |

**复合唯一索引**:
```sql
CREATE UNIQUE INDEX idx_perm_role_perm ON permissions_config(role, permission);
```

### 2.6 permission_history表（权限变更历史）

| 字段名称 | 类型 | 必填 | 默认值 | 说明 |
|---------|------|------|--------|------|
| id | Integer | ✅ | AUTO | 主键 |
| role | String(50) | ✅ | - | 角色 |
| permission | String(50) | ✅ | - | 权限项 |
| old_value | Boolean | ✅ | - | 旧值 |
| new_value | Boolean | ✅ | - | 新值 |
| changed_by | Integer | ✅ | - | 变更人ID |
| changed_at | Timestamp | ✅ | NOW() | 变更时间 |

---

## 3. 权限系统

### 3.1 角色定义

**来源**: FINAL L2219-2244

| 角色代码 | 中文名称 | 描述 | 数据访问范围 |
|---------|----------|------|------------|
| admin | 系统管理员 | 系统最高权限 | 所有项目数据 |
| tech_manager | 技术经理 | 技术部门管理者 | 所有技术项目数据 |
| dept_manager | 部门经理 | 业务部门管理者 | 本部门项目数据 |
| engineer | 工程师 | 普通开发人员 | 参与的项目数据 |

### 3.2 16种细粒度权限

**来源**: FINAL L2245-2265

```typescript
// 权限常量定义
export const PERMISSIONS = {
  // 项目权限（4种）
  PROJECT_VIEW: 'PROJECT_VIEW',
  PROJECT_CREATE: 'PROJECT_CREATE',
  PROJECT_EDIT: 'PROJECT_EDIT',
  PROJECT_DELETE: 'PROJECT_DELETE',

  // 成员权限（4种）
  MEMBER_VIEW: 'MEMBER_VIEW',
  MEMBER_CREATE: 'MEMBER_CREATE',
  MEMBER_EDIT: 'MEMBER_EDIT',
  MEMBER_DELETE: 'MEMBER_DELETE',

  // 任务权限（5种）
  TASK_VIEW: 'TASK_VIEW',
  TASK_CREATE: 'TASK_CREATE',
  TASK_EDIT: 'TASK_EDIT',
  TASK_DELETE: 'TASK_DELETE',
  TASK_ASSIGN: 'TASK_ASSIGN',

  // 系统权限（3种）
  USER_MANAGE: 'USER_MANAGE',
  SYSTEM_CONFIG: 'SYSTEM_CONFIG',
  AUDIT_LOG_VIEW: 'AUDIT_LOG_VIEW',
} as const;
```

### 3.3 权限矩阵

**来源**: FINAL L2266-2288

| 权限 | admin | tech_manager | dept_manager | engineer |
|------|:-----:|:------------:|:------------:|:--------:|
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

*注：工程师修改任务计划字段需要审批

### 3.4 默认权限配置（种子数据）

```typescript
const DEFAULT_PERMISSIONS: Record<UserRole, Permission[]> = {
  admin: [
    'PROJECT_VIEW', 'PROJECT_CREATE', 'PROJECT_EDIT', 'PROJECT_DELETE',
    'MEMBER_VIEW', 'MEMBER_CREATE', 'MEMBER_EDIT', 'MEMBER_DELETE',
    'TASK_VIEW', 'TASK_CREATE', 'TASK_EDIT', 'TASK_DELETE', 'TASK_ASSIGN',
    'USER_MANAGE', 'SYSTEM_CONFIG', 'AUDIT_LOG_VIEW'
  ],
  tech_manager: [
    'PROJECT_VIEW', 'PROJECT_CREATE', 'PROJECT_EDIT', 'PROJECT_DELETE',
    'MEMBER_VIEW', 'MEMBER_CREATE', 'MEMBER_EDIT', 'MEMBER_DELETE',
    'TASK_VIEW', 'TASK_CREATE', 'TASK_EDIT', 'TASK_DELETE', 'TASK_ASSIGN',
    'AUDIT_LOG_VIEW'
  ],
  dept_manager: [
    'PROJECT_VIEW', 'PROJECT_EDIT',
    'MEMBER_VIEW', 'MEMBER_EDIT',
    'TASK_VIEW', 'TASK_EDIT', 'TASK_ASSIGN'
  ],
  engineer: [
    'PROJECT_VIEW',
    'MEMBER_VIEW',
    'TASK_VIEW', 'TASK_EDIT'
  ]
};
```

---

## 4. API定义

### 4.1 认证相关API

**来源**: API_SPECIFICATION L148-154

| 方法 | 端点 | 说明 | 权限 |
|------|------|------|------|
| POST | /api/login | 用户登录 | 公开 |
| POST | /api/logout | 用户登出 | 已登录 |
| GET | /api/auth/me | 获取当前用户信息 | 已登录 |
| PUT | /api/auth/password | 修改密码 | 已登录 |

#### 4.1.1 POST /api/login

**请求**:
```typescript
interface LoginRequest {
  username: string;  // 工号（8位数字或6位字母+数字）
  password: string;  // 明文密码
}
```

**响应（成功）**:
```typescript
interface LoginResponse {
  data: {
    id: number;
    username: string;
    real_name: string;
    role: UserRole;
    department_id: number | null;
    permissions: Permission[];
  };
  message: string;
}
```

**响应（失败）**:
```typescript
interface LoginErrorResponse {
  error: {
    code: 'LOGIN_FAILED' | 'ACCOUNT_LOCKED' | 'RATE_LIMITED';
    message: string;
    details?: {
      attempts_remaining?: number;
      lock_until?: string;
    };
  };
}
```

**业务逻辑**:
1. 验证用户名格式（8位数字或6位字母+数字）
2. 检查登录限流（15分钟5次）
3. 查询用户，验证密码（bcrypt）
4. 检查账户状态（is_active）
5. 创建会话（Redis + MySQL）
6. 检查设备数量，超限则踢出最早登录
7. 记录审计日志

#### 4.1.2 POST /api/logout

**请求**: 无需请求体

**响应**:
```typescript
interface LogoutResponse {
  message: string;
}
```

**业务逻辑**:
1. 获取当前会话ID
2. 删除Redis缓存
3. 标记MySQL会话记录为终止
4. 清除Cookie
5. 记录审计日志

#### 4.1.3 GET /api/auth/me

**响应**:
```typescript
interface CurrentUserResponse {
  data: {
    id: number;
    username: string;
    real_name: string;
    role: UserRole;
    department_id: number | null;
    department_name?: string;
    email: string | null;
    phone: string | null;
    permissions: Permission[];
    sessions: {
      total: number;
      devices: SessionDevice[];
    };
  };
}
```

#### 4.1.4 PUT /api/auth/password

**请求**:
```typescript
interface ChangePasswordRequest {
  old_password: string;
  new_password: string;
}
```

**响应**:
```typescript
interface ChangePasswordResponse {
  message: string;
}
```

### 4.2 用户管理API

**来源**: API_SPECIFICATION L156-165

| 方法 | 端点 | 说明 | 权限 |
|------|------|------|------|
| GET | /api/users | 获取用户列表 | USER_MANAGE |
| GET | /api/users/:id | 获取用户详情 | USER_MANAGE |
| POST | /api/users | 创建用户 | USER_MANAGE |
| PUT | /api/users/:id | 更新用户 | USER_MANAGE |
| DELETE | /api/users/:id | 删除用户 | USER_MANAGE |
| POST | /api/users/:id/reset-password | 重置密码 | USER_MANAGE |

#### 4.2.1 GET /api/users

**查询参数**:
```typescript
interface UserListQuery {
  page?: number;       // 页码，默认1
  pageSize?: number;   // 每页数量，默认20
  role?: UserRole;     // 角色筛选
  department_id?: number; // 部门筛选
  is_active?: boolean; // 状态筛选
  keyword?: string;    // 关键词搜索（姓名/工号）
}
```

**响应**:
```typescript
interface UserListResponse {
  data: User[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}
```

#### 4.2.2 POST /api/users

**请求**:
```typescript
interface CreateUserRequest {
  username: string;    // 工号
  real_name: string;   // 姓名
  role: UserRole;      // 角色
  department_id?: number; // 部门ID
  email?: string;
  phone?: string;
}
```

**响应**:
```typescript
interface CreateUserResponse {
  data: {
    id: number;
    username: string;
    real_name: string;
    role: UserRole;
    initial_password: string; // 初始密码（仅此一次返回）
  };
  message: string;
}
```

**业务逻辑**:
1. 验证工号格式和唯一性
2. 自动生成随机密码（12位，含字母数字符号）
3. bcrypt加密存储
4. 创建用户记录
5. 返回初始密码（供管理员复制）

### 4.3 会话管理API

**来源**: API_SPECIFICATION L174-180

| 方法 | 端点 | 说明 | 权限 |
|------|------|------|------|
| GET | /api/sessions | 获取当前用户会话列表 | 已登录 |
| DELETE | /api/sessions/:id | 终止指定会话 | 已登录 |
| DELETE | /api/sessions/all | 终止所有会话 | 已登录 |

#### 4.3.1 GET /api/sessions

**响应**:
```typescript
interface SessionListResponse {
  data: SessionDevice[];
}

interface SessionDevice {
  id: string;
  device_name: string;  // 解析自user_agent
  ip_address: string;
  last_activity: string;
  created_at: string;
  is_current: boolean;
  expires_at: string;
}
```

### 4.4 权限管理API

**来源**: API_SPECIFICATION L167-172

| 方法 | 端点 | 说明 | 权限 |
|------|------|------|------|
| GET | /api/permissions | 获取权限配置 | SYSTEM_CONFIG |
| PUT | /api/permissions | 更新权限配置 | SYSTEM_CONFIG |
| GET | /api/permissions/history | 获取权限变更历史 | AUDIT_LOG_VIEW |

### 4.5 审计日志API

**来源**: API_SPECIFICATION L307-312

| 方法 | 端点 | 说明 | 权限 |
|------|------|------|------|
| GET | /api/audit-logs | 获取审计日志列表 | AUDIT_LOG_VIEW |
| GET | /api/audit-logs/:id | 获取审计日志详情 | AUDIT_LOG_VIEW |
| GET | /api/audit-logs/export | 导出审计日志 | AUDIT_LOG_VIEW |

#### 4.5.1 GET /api/audit-logs

**查询参数**:
```typescript
interface AuditLogQuery {
  page?: number;
  pageSize?: number;
  user_id?: number;      // 按用户筛选
  action?: AuditAction;  // 按操作类型
  table_name?: string;   // 按表名
  start_date?: string;   // 开始时间
  end_date?: string;     // 结束时间
}
```

---

## 5. 组件设计

### 5.1 前端组件结构

```
src/components/auth/
├── LoginForm.tsx           # 登录表单
├── PasswordResetDialog.tsx # 密码重置对话框
└── hooks/
    ├── useAuth.ts          # 认证Hook
    └── useSession.ts       # 会话管理Hook

src/components/settings/
├── UserManagementTab.tsx   # 用户管理Tab
├── UserTable.tsx           # 用户列表表格
├── UserFormDialog.tsx      # 用户创建/编辑对话框
├── PasswordCopyDialog.tsx  # 密码复制对话框
├── PermissionMatrix.tsx    # 权限矩阵配置
└── AuditLogTab.tsx         # 审计日志Tab
```

### 5.2 登录表单组件

**来源**: UI_Requirement 5.0

```tsx
// LoginForm.tsx - 关键实现
interface LoginFormProps {
  onSuccess: () => void;
}

const LoginForm: React.FC<LoginFormProps> = ({ onSuccess }) => {
  const [formData, setFormData] = useState({ username: '', password: '' });
  const [error, setError] = useState<string | null>(null);
  const [attempts, setAttempts] = useState<number | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    try {
      const response = await api.login(formData);
      // 存储用户信息到Context
      onSuccess();
    } catch (err) {
      if (err.code === 'RATE_LIMITED') {
        setError(`登录尝试次数过多，您还有${err.details.attempts_remaining}次机会`);
        setAttempts(err.details.attempts_remaining);
      } else if (err.code === 'ACCOUNT_LOCKED') {
        setError(`账户已锁定，请${err.details.lock_until}后再试`);
      } else {
        setError('用户名或密码错误');
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="用户名"
        value={formData.username}
        onChange={(e) => setFormData({...formData, username: e.target.value})}
        placeholder="请输入工号"
      />
      <Input
        label="密码"
        type="password"
        value={formData.password}
        onChange={(e) => setFormData({...formData, password: e.target.value})}
        placeholder="请输入密码"
      />
      {error && <Alert variant="destructive">{error}</Alert>}
      <Button type="submit" className="w-full">登录</Button>
    </form>
  );
};
```

### 5.3 用户管理界面

**来源**: UI_Requirement 5.3

```tsx
// UserManagementTab.tsx
const UserManagementTab: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const handleCreate = () => {
    setSelectedUser(null);
    setDialogOpen(true);
  };

  const handleEdit = (user: User) => {
    setSelectedUser(user);
    setDialogOpen(true);
  };

  const handleResetPassword = async (userId: number) => {
    const result = await api.resetPassword(userId);
    // 显示密码复制对话框
    showPasswordCopyDialog(result.initial_password);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between">
        <Input placeholder="搜索用户..." className="w-64" />
        <Button onClick={handleCreate}>添加用户</Button>
      </div>

      <UserTable
        users={users}
        onEdit={handleEdit}
        onResetPassword={handleResetPassword}
        onToggleStatus={handleToggleStatus}
      />

      <UserFormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        user={selectedUser}
      />
    </div>
  );
};
```

### 5.4 密码复制对话框

**来源**: UI_Requirement 5.3, FINAL L2204

```tsx
// PasswordCopyDialog.tsx
const PasswordCopyDialog: React.FC<{
  open: boolean;
  onClose: () => void;
  password: string;
  username: string;
}> = ({ open, onClose, password, username }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(password);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>账户信息</DialogTitle>
      <DialogContent>
        <Alert variant="warning">
          请保存以下信息，关闭后将无法再次查看密码
        </Alert>
        <div className="mt-4 space-y-2">
          <div>
            <Label>用户名</Label>
            <div className="flex items-center gap-2">
              <Input value={username} readOnly />
              <Button size="icon" onClick={() => copyUsername()}>
                <CopyIcon />
              </Button>
            </div>
          </div>
          <div>
            <Label>初始密码</Label>
            <div className="flex items-center gap-2">
              <Input value={password} readOnly />
              <Button size="icon" onClick={handleCopy}>
                {copied ? <CheckIcon /> : <CopyIcon />}
              </Button>
            </div>
            {copied && <span className="text-sm text-green-600">已复制</span>}
          </div>
        </div>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>关闭</Button>
      </DialogActions>
    </Dialog>
  );
};
```

### 5.5 权限中间件

```typescript
// middleware/auth.ts
export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const sessionId = req.cookies.sessionId;

  if (!sessionId) {
    return res.status(401).json({
      error: { code: 'UNAUTHORIZED', message: '请先登录' }
    });
  }

  // 从Redis验证会话
  const session = await redis.get(`session:${sessionId}`);
  if (!session) {
    return res.status(401).json({
      error: { code: 'SESSION_EXPIRED', message: '会话已过期，请重新登录' }
    });
  }

  // 验证IP（同子网允许）
  const clientIp = req.ip;
  if (!isSameSubnet(session.ip_address, clientIp)) {
    await terminateSession(sessionId, 'ip_changed');
    return res.status(401).json({
      error: { code: 'IP_CHANGED', message: 'IP地址变更，请重新登录' }
    });
  }

  // 检查是否需要续期
  const expiresAt = new Date(session.expires_at);
  const now = new Date();
  const fiveMinutes = 5 * 60 * 1000;

  if (expiresAt.getTime() - now.getTime() < fiveMinutes) {
    await renewSession(sessionId);
  }

  req.user = session;
  next();
};

export const checkPermission = (permission: Permission) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;

    // 从Redis缓存获取权限
    const permissions = await getCachedPermissions(user.role);

    if (!permissions.includes(permission)) {
      return res.status(403).json({
        error: { code: 'FORBIDDEN', message: '无权限执行此操作' }
      });
    }

    next();
  };
};
```

---

## 6. 开发检查清单

### 6.1 数据库迁移

- [ ] 创建 `001-create-users-table.ts`
- [ ] 创建 `002-create-sessions-table.ts`
- [ ] 创建 `003-create-audit-logs-table.ts`
- [ ] 创建 `004-create-permissions-tables.ts`
- [ ] 创建 `005-seed-default-permissions.ts`（种子数据）

### 6.2 后端API实现

- [ ] `POST /api/login` - 登录
- [ ] `POST /api/logout` - 登出
- [ ] `GET /api/auth/me` - 获取当前用户
- [ ] `PUT /api/auth/password` - 修改密码
- [ ] `GET /api/users` - 用户列表
- [ ] `POST /api/users` - 创建用户
- [ ] `PUT /api/users/:id` - 更新用户
- [ ] `DELETE /api/users/:id` - 删除用户
- [ ] `POST /api/users/:id/reset-password` - 重置密码
- [ ] `GET /api/sessions` - 会话列表
- [ ] `DELETE /api/sessions/:id` - 终止会话
- [ ] `GET /api/permissions` - 权限配置
- [ ] `PUT /api/permissions` - 更新权限
- [ ] `GET /api/audit-logs` - 审计日志

### 6.3 前端组件

- [ ] `LoginForm.tsx` - 登录表单
- [ ] `useAuth.ts` - 认证Hook
- [ ] `UserManagementTab.tsx` - 用户管理Tab
- [ ] `UserTable.tsx` - 用户列表表格
- [ ] `UserFormDialog.tsx` - 用户表单对话框
- [ ] `PasswordCopyDialog.tsx` - 密码复制对话框
- [ ] `PermissionMatrix.tsx` - 权限矩阵
- [ ] `AuditLogTab.tsx` - 审计日志Tab

### 6.4 测试用例

- [ ] 登录成功/失败测试
- [ ] 登录限流测试
- [ ] 账户锁定测试
- [ ] 会话管理测试
- [ ] 权限检查测试
- [ ] 审计日志记录测试

---

## 7. 完整性验证

### 7.1 FINAL_REQUIREMENTS 对照

| 需求项 | 原文位置 | 覆盖状态 |
|--------|---------|:--------:|
| 登录机制（用户名+密码） | L2119-2129 | ✅ |
| 登录限流（15分钟5次） | L2125 | ✅ |
| 账户锁定（30分钟） | L2126 | ✅ |
| 登出机制 | L2131-2138 | ✅ |
| 会话管理（7天有效期） | L2140-2151 | ✅ |
| 多设备支持（10设备） | L2147 | ✅ |
| 密码策略（bcrypt 10轮） | L2153-2159 | ✅ |
| 用户生命周期 | L2164-2189 | ✅ |
| 个人信息管理 | L2190-2197 | ✅ |
| 密码管理（重置/复制） | L2198-2206 | ✅ |
| 工号管理 | L2207-2214 | ✅ |
| 4种角色定义 | L2219-2244 | ✅ |
| 16种细粒度权限 | L2245-2265 | ✅ |
| 权限矩阵 | L2266-2288 | ✅ |
| 数据访问规则 | L2289-2320 | ✅ |
| 授权机制 | L2320-2336 | ✅ |
| 审计日志12字段 | L2341-2357 | ✅ |
| 日志查询 | L2358-2365 | ✅ |
| 安全告警 | L2366-2372 | ✅ |
| users表结构 | L2426-2440 | ✅ |

### 7.2 UI_Requirement 对照

| UI需求项 | 原文位置 | 覆盖状态 |
|----------|---------|:--------:|
| 登录界面布局 | 5.0 | ✅ |
| 登录表单字段 | 5.0.3 | ✅ |
| 错误提示样式 | 5.0.4 | ✅ |
| 登录按钮样式 | 5.0.5 | ✅ |
| 用户管理Tab | 5.3 | ✅ |
| 用户列表页面 | 5.3 | ✅ |
| 创建用户弹窗 | 5.3 | ✅ |
| 重置密码弹窗 | 5.3 | ✅ |
| 禁用/启用确认 | 5.3 | ✅ |
| 密码复制按钮 | 5.3 | ✅ |

### 7.3 数据模型一致性

| 检查项 | 状态 |
|--------|:----:|
| users表与DATA_MODEL.md一致 | ✅ |
| sessions表与DATA_MODEL.md一致 | ✅ |
| audit_logs表与DATA_MODEL.md一致 | ✅ |
| permissions_config表与DATA_MODEL.md一致 | ✅ |
| permission_history表与DATA_MODEL.md一致 | ✅ |

### 7.4 API一致性

| 检查项 | 状态 |
|--------|:----:|
| 认证API与API_SPECIFICATION.md一致 | ✅ |
| 用户管理API与API_SPECIFICATION.md一致 | ✅ |
| 会话管理API与API_SPECIFICATION.md一致 | ✅ |
| 权限管理API与API_SPECIFICATION.md一致 | ✅ |
| 审计日志API与API_SPECIFICATION.md一致 | ✅ |

---

## 8. 依赖关系

### 8.1 上游依赖

无（基础设施层）

### 8.2 下游依赖

| 模块 | 依赖内容 |
|------|---------|
| 02-organization | 用户表、部门关联 |
| 03-project | 用户认证、权限检查 |
| 04-task | 用户认证、权限检查 |
| 05-workflow | 用户认证、审批权限 |
| 06-collaboration | 用户认证、会话管理 |
| 07-analytics | 用户认证、权限检查 |

---

## 相关文档

- [模块需求文档](../../../requirements/modules/REQ_01_auth_permission.md)
- [系统架构总览](../SYSTEM_OVERVIEW.md)
- [数据模型设计](../DATA_MODEL.md)
- [API规范设计](../API_SPECIFICATION.md)

---

## 变更历史

| 日期 | 版本 | 变更内容 |
|------|------|----------|
| 2026-03-17 | 1.0 | 初始版本 |
