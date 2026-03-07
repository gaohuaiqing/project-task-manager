# Project Task Manager 3.0

企业级项目任务管理系统，支持 WBS 分解、多部门协作、实时数据同步。

## 功能特性

### 核心功能
- 📊 **WBS 任务分解** - 支持多级任务树结构与拖拽排序
- 👥 **多部门协作** - 基于 RBAC 的权限管理系统
- 🔄 **实时数据同步** - WebSocket 实时推送数据变更
- 🔒 **版本冲突检测** - 乐观锁机制防止数据覆盖
- 📈 **数据可视化** - 任务进度统计与甘特图展示
- 📝 **操作审计** - 完整的操作日志与变更历史

### 技术亮点
- ⚛️ **React 19** + **TypeScript** 前端框架
- 🚀 **Express** + **WebSocket** 后端服务
- 🗄️ **MySQL** 主存储 + **Redis** 缓存
- 🎨 **shadcn/ui** + **Tailwind CSS** 现代化 UI
- 🧪 **Vitest** + **Playwright** 完整测试覆盖

## 项目结构

```
project-task-manager/
├── app/                    # 应用源代码（纯源文件）
│   ├── src/               # 前端源代码
│   │   ├── services/      # 服务层
│   │   ├── utils/         # 工具函数
│   │   ├── components/    # UI 组件
│   │   ├── hooks/         # React Hooks
│   │   └── types/         # TypeScript 类型定义
│   ├── server/            # 后端源代码
│   │   └── src/           # Express 服务源码
│   │       ├── routes/    # API 路由
│   │       ├── services/  # 业务逻辑
│   │       ├── middleware/# 中间件
│   │       └── utils/     # 工具函数
│   ├── public/            # 静态资源
│   └── package.json       # 前端依赖
├── Test/                  # 统一测试目录
│   ├── frontend/          # 前端测试
│   │   ├── unit/          # 单元测试
│   │   │   ├── services/  # 服务层测试
│   │   │   ├── utils/     # 工具函数测试
│   │   │   ├── components/# 组件测试
│   │   │   └── hooks/     # Hooks 测试
│   │   ├── fixtures/      # 测试夹具和数据
│   │   ├── setup/         # 测试配置
│   │   └── .claude/       # AI 辅助文档
│   ├── backend/           # 后端测试
│   │   ├── integration/   # 集成测试
│   │   ├── unit/          # 单元测试
│   │   ├── load/          # 负载测试
│   │   └── .claude/       # AI 辅助文档
│   ├── reports/           # 测试报告输出
│   └── docs/              # 测试文档
├── Build/                 # 统一构建输出目录
│   ├── frontend/dist/     # 前端构建结果
│   └── backend/dist/      # 后端构建结果
├── .spec-workflow/        # AI 规格管理工作流
├── CLAUDE.md              # 项目 AI 指导文档
└── README.md
```

## 快速开始

### 环境要求

- Node.js >= 18.0.0
- MySQL >= 8.0
- Redis >= 6.0

### 安装依赖

```bash
# 安装所有依赖
npm run install:all
```

### 配置环境变量

创建 `app/server/.env` 文件：

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=task_manager
PORT=3001
HOST=0.0.0.0
REDIS_HOST=localhost
REDIS_PORT=6379
```

### 初始化数据库

```bash
cd app/server
npm run db:init
```

### 启动开发服务器

```bash
# 同时启动前后端
npm run dev

# 或分别启动
npm run dev:frontend  # http://localhost:5173
npm run dev:backend   # http://localhost:3001
```

### 构建生产版本

```bash
# 构建所有（前端 + 后端）
npm run build:all

# 或分别构建
npm run build:frontend  # 输出到 Build/frontend/dist/
npm run build:backend   # 输出到 Build/backend/dist/
```

**注意**: 构建输出统一存放在 `Build/` 目录，`app/` 目录保持纯源文件状态，便于团队协作。

## 开发指南

### 前端开发

```bash
cd app
npm run dev           # 开发服务器
npm run build         # 生产构建（输出到 Build/frontend/dist/）
npm run typecheck     # 类型检查
npm run lint          # ESLint 检查
```

### 后端开发

```bash
cd app/server
npm run dev           # 监视模式启动
npm run build         # 编译 TypeScript（输出到 Build/backend/dist/）
npm run start         # 运行生产版本
npm run migrate:up    # 执行数据库迁移
```

## 权限系统 (RBAC)

### 角色定义

| 角色 | 权限 |
|------|------|
| `admin` | 系统管理员，全部权限 |
| `dept_manager` | 部门经理，管理本部门数据 |
| `tech_manager` | 技术经理，技术任务管理 |
| `engineer` | 工程师，基础操作权限 |

### 数据范围

- **全局数据**: projects, wbs_tasks, holidays (跨部门共享)
- **部门数据**: department_members, permissions (部门隔离)

## API 文档

### 认证

```http
POST /api/login
Content-Type: application/json

{
  "username": "admin",
  "password": "password"
}
```

### WebSocket 连接

```javascript
const ws = new WebSocket('ws://localhost:3001');

ws.onopen = () => {
  ws.send(JSON.stringify({
    type: 'auth',
    data: { sessionId: 'xxx', username: 'admin' }
  }));
};
```

## 测试

项目采用统一的 `Test/` 目录管理所有测试文件。

### 前端测试

```bash
npm run test:frontend          # 运行前端单元测试
npm run test:frontend:ui       # 运行测试并打开 UI 界面
npm run test:frontend:coverage # 生成覆盖率报告
```

### 后端测试

```bash
npm run test:backend           # 运行后端测试
```

### 所有测试

```bash
npm run test:all               # 运行所有测试
```

**测试目录说明**: 测试文件位于 `Test/frontend/unit/` 和 `Test/backend/`，测试报告输出到 `Test/reports/`。

详见 [测试指南](Test/docs/TESTING.md)

## 部署

### 构建准备

```bash
# 1. 安装所有依赖
npm run install:all

# 2. 构建所有（前端 + 后端）
npm run build:all

# 构建结果：
# - Build/frontend/dist/  (前端静态文件)
# - Build/backend/dist/   (后端编译代码)
```

### Docker 部署

```bash
docker-compose up -d
```

### 手动部署

1. **构建项目**: `npm run build:all`
2. **配置环境**: 编辑 `app/server/.env`
3. **初始化数据库**: `cd app/server && npm run db:init`
4. **启动后端**: 使用 PM2 启动 `pm2 start Build/backend/dist/index.js`
5. **部署前端**: 将 `Build/frontend/dist/` 内容部署到 Web 服务器

### PM2 配置示例

```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'task-manager-backend',
    script: './Build/backend/dist/index.js',
    instances: 1,
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    }
  }]
};
```

## 文档导航

### 项目文档
- [优化报告](docs/reports/) - 代码优化相关报告
- [代码分析](docs/analysis/) - 代码质量分析
- [测试指南](Test/docs/TESTING.md) - 完整的测试文档
- [E2E测试文档](Test/docs/e2e/) - 端到端测试文档

### 快速链接
- [WBS任务管理](app/src/components/task-management/) - 任务管理组件
- [权限系统](app/server/src/services/PermissionManagerOptimized.ts) - RBAC权限管理
- [WebSocket服务](app/server/src/services/DataSyncService.ts) - 实时数据同步

## 常见问题

### Q: 数据库连接失败？
A: 检查 `.env` 配置，确保 MySQL 服务已启动。

### Q: WebSocket 连接断开？
A: 检查 Redis 服务状态，WebSocket 依赖 Redis 进行会话管理。

### Q: 日志文件过大？
A: 参考 `LOGGING_GUIDE.md` 配置日志轮询。

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request！

---

**技术栈详情** | [前端文档](Test/frontend/.claude/CLAUDE.md) | [后端文档](Test/backend/.claude/CLAUDE.md) | [测试指南](Test/docs/TESTING.md)
