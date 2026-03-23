# 环境变量配置说明

## 后端环境变量 (app/server/.env)

### 服务配置

| 变量名 | 必填 | 默认值 | 说明 |
|--------|------|--------|------|
| NODE_ENV | 是 | development | 运行环境：development, test, production |
| PORT | 是 | 3001 | 服务监听端口 |
| HOST | 否 | 0.0.0.0 | 服务监听地址 |

### 数据库配置

| 变量名 | 必填 | 默认值 | 说明 |
|--------|------|--------|------|
| DB_HOST | 是 | localhost | MySQL服务器地址 |
| DB_PORT | 是 | 3306 | MySQL端口 |
| DB_USER | 是 | - | 数据库用户名 |
| DB_PASSWORD | 是 | - | 数据库密码 |
| DB_NAME | 是 | task_manager | 数据库名称 |
| DB_CONNECTION_LIMIT | 否 | 10 | 连接池大小 |
| DB_QUEUE_LIMIT | 否 | 0 | 等待队列限制 |

### Redis配置（可选）

| 变量名 | 必填 | 默认值 | 说明 |
|--------|------|--------|------|
| REDIS_HOST | 否 | localhost | Redis服务器地址 |
| REDIS_PORT | 否 | 6379 | Redis端口 |
| REDIS_PASSWORD | 否 | - | Redis密码 |
| REDIS_DB | 否 | 0 | Redis数据库编号 |

### JWT认证配置

| 变量名 | 必填 | 默认值 | 说明 |
|--------|------|--------|------|
| JWT_SECRET | 是 | - | JWT签名密钥（至少32位） |
| JWT_EXPIRES_IN | 否 | 7d | Token有效期 |
| JWT_REFRESH_EXPIRES_IN | 否 | 30d | 刷新Token有效期 |

### 安全配置

| 变量名 | 必填 | 默认值 | 说明 |
|--------|------|--------|------|
| CORS_ORIGIN | 否 | * | 允许的跨域来源 |
| COOKIE_SECRET | 是 | - | Cookie签名密钥 |
| COOKIE_SECURE | 否 | false | 仅HTTPS传输Cookie |
| COOKIE_HTTP_ONLY | 否 | true | 禁止JS访问Cookie |

### 日志配置

| 变量名 | 必填 | 默认值 | 说明 |
|--------|------|--------|------|
| LOG_LEVEL | 否 | info | 日志级别：debug, info, warn, error |
| LOG_FILE | 否 | logs/app.log | 日志文件路径 |
| LOG_MAX_SIZE | 否 | 10m | 单个日志文件最大大小 |
| LOG_MAX_FILES | 否 | 5 | 保留日志文件数量 |

### 定时任务配置

| 变量名 | 必填 | 默认值 | 说明 |
|--------|------|--------|------|
| ENABLE_DAILY_SUMMARY | 否 | false | 是否启用每日任务摘要 |
| APPROVAL_TIMEOUT_DAYS | 否 | 7 | 审批超时天数 |
| DELAY_CHECK_HOUR | 否 | 1 | 延期检测时间（小时） |

---

## 前端环境变量 (app/.env)

### API配置

| 变量名 | 必填 | 默认值 | 说明 |
|--------|------|--------|------|
| VITE_API_BASE_URL | 是 | /api | 后端API基础路径 |
| VITE_WS_URL | 否 | - | WebSocket地址 |

### 功能开关

| 变量名 | 必填 | 默认值 | 说明 |
|--------|------|--------|------|
| VITE_ENABLE_ANALYTICS | 否 | true | 是否启用分析功能 |
| VITE_ENABLE_NOTIFICATIONS | 否 | true | 是否启用通知功能 |

### 第三方服务

| 变量名 | 必填 | 默认值 | 说明 |
|--------|------|--------|------|
| VITE_SENTRY_DSN | 否 | - | Sentry错误监控DSN |
| VITE_GA_ID | 否 | - | Google Analytics ID |

---

## 环境变量示例

### 开发环境 (.env.development)
```env
NODE_ENV=development
PORT=3001

DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=task_manager_dev

JWT_SECRET=dev_secret_key_for_testing_only
CORS_ORIGIN=http://localhost:5173

LOG_LEVEL=debug
```

### 测试环境 (.env.test)
```env
NODE_ENV=test
PORT=3001

DB_HOST=localhost
DB_PORT=3306
DB_USER=test_user
DB_PASSWORD=test_password
DB_NAME=task_manager_test

JWT_SECRET=test_secret_key_for_testing_only
CORS_ORIGIN=http://localhost:5173

LOG_LEVEL=debug
```

### 生产环境 (.env.production)
```env
NODE_ENV=production
PORT=3001

DB_HOST=your-db-host.com
DB_PORT=3306
DB_USER=task_user
DB_PASSWORD=your_secure_password_here
DB_NAME=task_manager
DB_CONNECTION_LIMIT=20

REDIS_HOST=your-redis-host.com
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password

JWT_SECRET=your_production_secret_key_at_least_32_characters_long
JWT_EXPIRES_IN=7d
CORS_ORIGIN=https://your-domain.com
COOKIE_SECURE=true

LOG_LEVEL=info
LOG_MAX_SIZE=50m
LOG_MAX_FILES=10

ENABLE_DAILY_SUMMARY=true
```

---

## 安全建议

1. **密钥管理**
   - 生产环境密钥至少32位
   - 使用环境变量或密钥管理服务
   - 不要将密钥提交到版本控制

2. **数据库安全**
   - 使用强密码
   - 限制数据库用户权限
   - 启用SSL连接

3. **网络安全**
   - 启用HTTPS
   - 配置正确的CORS
   - 启用Cookie安全选项

---

**文档版本**: 1.0
**最后更新**: 2026-03-20
