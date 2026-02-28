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
├── app/                    # 前端 React 应用
│   ├── src/               # 源代码
│   ├── public/            # 静态资源
│   └── package.json       # 前端依赖
├── app/server/            # 后端 Express 服务
│   ├── src/              # 后端源代码
│   │   ├── routes/       # API 路由
│   │   ├── services/     # 业务逻辑
│   │   ├── middleware/   # 中间件
│   │   └── utils/        # 工具函数
│   └── package.json      # 后端依赖
├── database/              # 数据库脚本
├── scripts/               # 构建与部署脚本
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
npm run build
```

## 开发指南

### 前端开发

```bash
cd app
npm run dev           # 开发服务器
npm run build         # 生产构建
npm run typecheck     # 类型检查
npm run lint          # ESLint 检查
npm run test          # 单元测试
npm run test:e2e      # E2E 测试
```

### 后端开发

```bash
cd app/server
npm run dev           # 监视模式启动
npm run build         # 编译 TypeScript
npm run start         # 运行生产版本
npm run test:api      # API 测试
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

```bash
# 单元测试
npm run test

# E2E 测试
npm run test:e2e

# 测试覆盖率
npm run test:coverage
```

## 部署

### Docker 部署

```bash
docker-compose up -d
```

### 手动部署

1. 构建前端：`cd app && npm run build`
2. 构建后端：`cd server && npm run build`
3. 使用 PM2 启动：`pm2 start ecosystem.config.js`

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

**技术栈详情** | [前端文档](app/.claude/CLAUDE.md) | [后端文档](app/server/.claude/CLAUDE.md)
