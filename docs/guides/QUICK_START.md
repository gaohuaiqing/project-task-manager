# 快速开始指南

## 5分钟启动系统

### 步骤1: 安装依赖

```bash
cd app/server

# 如果有公司npm镜像
npm config set registry http://npm.internal-mirror.company.com/

# 安装依赖
npm install
```

### 步骤2: 配置环境

```bash
# 复制环境变量模板
cp .env.example .env

# 编辑 .env 文件（至少配置Redis）
# REDIS_HOST=localhost
# REDIS_PORT=6379
```

### 步骤3: 启动服务

```bash
# 开发模式
npm run dev

# 生产模式
npm run build
npm start
```

### 步骤4: 访问系统

打开浏览器访问：
```
http://localhost:3001
```

默认管理员账号：
- 用户名: `admin`
- 密码: `admin123`

## 新功能测试

### 1. 测试刷新免登录

1. 登录系统
2. 按 F5 刷新浏览器
3. ✅ 无需重新登录

### 2. 测试实时同步

1. 在两个浏览器中登录同一账号
2. 浏览器A修改项目状态
3. 浏览器B自动看到更新（<100ms）

### 3. 测试版本冲突控制

1. 在两个浏览器中打开同一项目
2. 浏览器A修改并保存
3. 浏览器B修改并保存
4. ✅ 浏览器B收到冲突提示

## API端点

### 认证
```
POST /api/login           # 登录
POST /api/logout          # 登出
GET  /api/auth/validate   # 验证会话（刷新免登录）
```

### 项目（带版本控制）
```
GET    /api/projects/v2         # 获取项目列表
GET    /api/projects/v2/:id     # 获取项目详情
POST   /api/projects/v2         # 创建项目
PUT    /api/projects/v2/:id     # 更新项目（需version字段）
DELETE /api/projects/v2/:id     # 删除项目（需version字段）
```

### 成员（带版本控制）
```
GET    /api/members/v2          # 获取成员列表
```

### 任务（带版本控制）
```
GET    /api/tasks/v2            # 获取任务列表
```

### 系统状态
```
GET    /api/system/health/v2    # 系统健康检查
GET    /api/initial-data/v2     # 获取初始数据
GET    /api/statistics/v2       # 获取数据统计
```

## 常见问题

### Q: pino安装失败怎么办？

A: pino是可选依赖，系统已有完善的日志服务（AsyncSystemLogger），可以跳过安装：
```bash
npm install --ignore-scripts
```

### Q: Redis连接失败怎么办？

A: 系统会自动切换到离线模式，使用LRU内存缓存，不影响核心功能。

### Q: 如何查看实时同步状态？

A: 访问健康检查端点：
```bash
curl http://localhost:3001/api/system/health/v2
```

### Q: 版本冲突怎么处理？

A: 前端会收到409状态码和冲突详情，显示差异让用户选择：
- 覆盖：使用自己的版本
- 合并：手动合并数据
- 放弃：刷新获取最新数据

## 性能优化建议

1. **启用Redis缓存**：确保Redis正常运行
2. **配置连接池**：调整DB_CONNECTION_LIMIT（默认100）
3. **监控内存使用**：定期检查 /api/system/health/v2
4. **定期清理日志**：系统会自动清理，但建议定期检查logs/目录

## 下一步

- 查看 [集成指南](./INTEGRATION_GUIDE.md) 了解架构详情
- 查看 [安装指南](./INSTALLATION_GUIDE.md) 了解部署细节
- 查看 [完成报告](../reports/REFACTORING_COMPLETION_REPORT.md) 了解重构内容
