# 安装和部署指南

## 前置要求

- Node.js >= 18.0.0
- MySQL >= 8.0
- Redis >= 6.0
- npm >= 9.0.0

## 安装步骤

### 1. 安装依赖

由于pino包安装受网络限制，提供以下解决方案：

**方案A：使用公司内部npm镜像（推荐）**
```bash
cd app/server
npm config set registry http://npm.internal-mirror.company.com/
npm install
```

**方案B：配置代理**
```bash
cd app/server
npm config set proxy http://proxy.mindray.corp:port
npm config set https-proxy http://proxy.mindray.corp:port
npm install
```

**方案C：跳过pino安装（临时方案）**
```bash
cd app/server
npm install --ignore-scripts
# pino是可选依赖，系统已有完善的日志服务
```

### 2. 配置环境变量

```bash
cd app/server
cp .env.example .env
# 根据实际情况修改 .env 文件
```

关键配置项：
```bash
# Redis配置（必需）
REDIS_HOST=localhost
REDIS_PORT=6379

# 数据库配置
DB_HOST=localhost
DB_NAME=task_manager
```

### 3. 初始化数据库

```bash
cd app/server
npm run db:init
```

### 4. 启动服务

**开发模式**：
```bash
npm run dev
```

**生产模式**：
```bash
npm run build
npm start
```

## 验证安装

### 1. 检查服务状态

访问健康检查端点：
```bash
curl http://localhost:3001/api/system/health/v2
```

预期响应：
```json
{
  "success": true,
  "data": {
    "redis": { "healthy": true, "latency": 5 },
    "websocket": { "totalClients": 0 },
    "messageBroker": { "channels": 0, "callbacks": 0 }
  }
}
```

### 2. 测试登录

```bash
curl -X POST http://localhost:3001/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

### 3. 测试刷新免登录

```bash
# 使用返回的sessionId测试会话验证
curl http://localhost:3001/api/auth/validate \
  -H "Cookie: session_id=YOUR_SESSION_ID"
```

## 性能测试

### 1. 使用k6进行压力测试

```javascript
// load-test.js
import http from 'k6/http';
import { check } from 'k6';

export let options = {
  stages: [
    { duration: '30s', target: 100 },
    { duration: '1m', target: 100 },
    { duration: '10s', target: 0 },
  ],
};

export default function () {
  let res = http.get('http://localhost:3001/api/projects/v2');
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time <50ms': (r) => r.timings.duration < 50,
  });
}
```

运行测试：
```bash
k6 run load-test.js
```

### 2. 预期性能指标

| 指标 | 目标值 |
|------|--------|
| API响应 | <50ms (P95) |
| 数据库读 | <10ms |
| 数据库写 | <20ms |
| 实时推送 | <100ms |
| 并发支持 | 100用户 |

## 故障排查

### 问题1：Redis连接失败

**症状**：
```
[服务器] ❌ Redis服务连接失败
```

**解决方案**：
1. 检查Redis是否运行：`redis-cli ping`
2. 检查端口配置：`REDIS_PORT=6379`
3. 系统会自动切换到离线模式（使用LRU缓存）

### 问题2：会话验证失败

**症状**：
```
[API] 验证会话失败: 会话不存在
```

**解决方案**：
1. 检查Cookie中的session_id
2. 检查Redis中的会话数据
3. 尝试重新登录

### 问题3：版本冲突

**症状**：
```
409 Conflict: 版本冲突：该项目已被其他用户修改
```

**解决方案**：
1. 获取最新数据：`GET /api/projects/v2/:id`
2. 显示差异给用户
3. 用户选择：覆盖/合并/放弃

## 部署检查清单

- [ ] Node.js版本 >= 18.0.0
- [ ] MySQL已启动并创建数据库
- [ ] Redis已启动
- [ ] 环境变量已配置
- [ ] 依赖已安装
- [ ] 数据库已初始化
- [ ] 服务启动成功
- [ ] 健康检查通过
- [ ] 登录功能正常
- [ ] 刷新免登录正常
- [ ] 实时同步正常
