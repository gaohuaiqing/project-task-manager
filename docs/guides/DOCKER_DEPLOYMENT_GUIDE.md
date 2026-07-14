# Docker 部署指南（内网服务器）

> 将项目任务管理系统部署为部门内网服务器，供办公电脑通过 IP 访问。
> 同一份配置可直接迁移到未来 Linux 生产服务器。

---

## 1. 部署架构

```
办公电脑浏览器
   │  http://<服务器IP>
   ▼
┌─────────────────────────────────┐
│  frontend 容器 (nginx:80)        │
│  ├─ 前端静态文件                  │
│  ├─ /api  → 反代 backend:3001    │
│  └─ /ws   → 反代 backend:3001    │
└──────────────┬──────────────────┘
               ▼
┌─────────────────────────────────┐
│  backend 容器 (node:3001)        │
│  Express + WebSocket            │
└───┬─────────────────┬───────────┘
    ▼                 ▼
┌────────┐      ┌──────────┐
│ mysql  │      │  redis   │
│ (3306) │      │  (6379)  │
└────────┘      └──────────┘
```

| 服务 | 镜像 | 端口 | 说明 |
|------|------|------|------|
| mysql | mysql:8.0 | 3306 | 数据库（数据卷持久化） |
| redis | redis:7-alpine | 6379 | 缓存（连不上自动降级内存缓存） |
| backend | 本机构建 | 3001 | Express API + WebSocket |
| frontend | 本机构建 | 80 | Nginx 静态托管 + 反向代理 |

---

## 2. 前置条件

- **Docker**：Windows 用 Docker Desktop（WSL2 后端）；Linux 用 `docker.io` + `docker-compose-plugin`
- **本机内网 IP**：需固定（示例全程使用 `10.8.180.55`，请替换为实际 IP）
- **80 端口空闲**：`netstat -ano | grep ":80 "`（Windows）/ `ss -tlnp | grep :80`（Linux）
- **内存**：Docker 至少分配 4GB（MySQL buffer pool 1G + Vite 构建吃内存）

验证 Docker：
```bash
docker --version
docker compose version
docker run --rm hello-world   # 看到 "Hello from Docker!" 即正常
```

---

## 3. HTTP 内网部署的关键配置

内网通过 `http://<IP>` 访问（非 HTTPS），必须注意：

| 配置项 | 值 | 原因 |
|--------|-----|------|
| `COOKIE_SECURE=false` | 必须为 false | 浏览器只在 HTTPS 下发送 `Secure` Cookie，HTTP 内网设 true 会导致**登录后立即 401** |
| `COOKIE_SAMESITE=lax` | lax | 兼顾 CSRF 防护与内网访问 |
| `CORS_ORIGIN=http://<IP>` | 实际访问地址 | WebSocket 握手与直连场景需要 |
| 后端 `/health` 端点 | 已内置 | 供容器 healthcheck 探测（`GET /health` 返回 200） |

> 未来若启用 HTTPS（反向代理 + 证书），改为 `COOKIE_SECURE=true`、`COOKIE_SAMESITE=strict`。

---

## 4. 环境变量（.env）

部署目录下的 `.env` 文件（示例值，生产请修改密码与密钥）：

```env
NODE_ENV=production
TZ=Asia/Shanghai

DB_HOST=mysql
DB_PORT=3306
DB_USER=root
DB_PASSWORD=<强密码>      # 须与 docker-compose.yml 一致
DB_NAME=task_manager

REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=            # 内网无密码模式

PORT=3001
HOST=0.0.0.0

CORS_ORIGIN=http://<服务器IP>
COOKIE_SECURE=false
COOKIE_SAMESITE=lax

BACKUP_ENCRYPTION_KEY=<强随机值>
LOG_LEVEL=info
ENABLE_DAILY_SUMMARY=false
```

---

## 5. 部署步骤

在部署目录（含 `docker-compose.yml`）下执行：

```bash
# 1. 构建镜像（首次较慢，后端 tsc + 前端 vite build）
docker compose build

# 2. 启动全部服务（后台）
docker compose up -d

# 3. 观察后端启动与迁移执行
docker compose logs -f backend
```

**启动成功的标志**（backend 日志依次出现）：
```
Database pool initialized
🔍 检查待执行的数据库迁移...
🚀 开始执行数据库迁移 002...  （一系列迁移）
📋 默认账户信息: admin / admin123
✅ 数据库迁移检查完成
Server running on port 3001
```

**四容器健康检查**：
```bash
docker compose ps     # 四个服务 STATUS 均为 Up (healthy)
```

---

## 6. 访问与防火墙

### 访问地址
- 系统：`http://<服务器IP>`
- 健康检查：`http://<服务器IP>/health`（nginx 直返 200）
- 后端直连：`http://<服务器IP>:3001/health`（返回 JSON）

### 默认账号（迁移 031 自动创建）
| 用户名 | 密码 | 角色 |
|--------|------|------|
| admin | admin123 | 系统管理员 |
| tech_manager | admin123 | 技术经理 |
| dept_manager | admin123 | 部门经理 |
| engineer1 / engineer2 / tester1 / ops1 | admin123 | 工程师 |

> ⚠️ **首次登录后立即用 admin 修改所有默认密码**。

### 开放防火墙端口
```powershell
# Windows（管理员 PowerShell）
New-NetFirewallRule -DisplayName "TaskManager HTTP 80" -Direction Inbound -Protocol TCP -LocalPort 80 -Action Allow -Profile Any
```
```bash
# Linux
sudo ufw allow 80/tcp
sudo ufw allow 3001/tcp   # 可选，仅调试直连后端
```

---

## 7. 稳定性验证清单

部署成功后，按以下清单逐项验证（每项含方法与通过标准）。

### 7.1 服务启动稳定性
- `docker compose ps` → 4 容器 `Up (healthy)`，连续观察 30 分钟无重启
- `docker inspect --format='{{.RestartCount}}' task-manager-backend` → RestartCount = 0

### 7.2 数据库迁移完整性
```bash
docker compose exec mysql mysql -uroot -p<密码> task_manager -e "SELECT COUNT(*) FROM migrations;"
# 通过标准：≥ 32 条迁移记录
docker compose exec mysql mysql -uroot -p<密码> task_manager -e "SHOW TABLES;"
# 通过标准：含 users/members/departments/wbs_tasks/sessions/notifications/plan_changes 等
```
- 重启 backend (`docker compose restart backend`) → 日志全部显示「已执行，跳过」，无报错（幂等性）

### 7.3 核心功能（HTTP 端到端）
- **登录**：浏览器 DevTools → Network 看 `/api/auth/login` 响应头含 `Set-Cookie: sessionId=...; HttpOnly; SameSite=Lax`（**无 Secure**），状态 200
- 刷新页面 → `/api/auth/me` 返回 200 + 用户信息（Cookie 正常携带）
- 权限矩阵：admin / tech_manager / engineer 登录，菜单按钮可见性符合角色
- 项目/任务 CRUD、WBS 编码、工作流审批、分析报表 → 全部无 500

### 7.4 WebSocket 实时通信
- DevTools → Network → WS，`/ws` 连接状态 101 Switching Protocols 并保持
- 两台电脑同时登录，A 给 B 派任务 → B 实时收到通知
- A 改任务状态 → B 端 1s 内同步

### 7.5 并发压力
```bash
# 10 并发登录压测（npx autocannon，无需安装）
npx autocannon -c 10 -d 30 -m POST -H "Content-Type: application/json" \
  -b '{"username":"admin","password":"admin123"}' http://<IP>/api/auth/login
```
- 通过标准：0 错误，p99 < 500ms，backend 无 OOM

### 7.6 长时间运行与内存
```bash
docker stats     # 实时监控四容器 CPU/内存（q 退出）
```
- backend 启动 < 200MB，压测后 < 400MB，30 分钟后回落（V8 GC 正常）
- 空载 CPU < 5%；连续 2 小时内存不回落且持续上涨 = 疑似泄漏

### 7.7 数据持久化
- `docker compose restart` → 重新登录，项目/任务数据完整
- `docker volume ls` → 含 `mysql_data`、`redis_data` 卷

### 7.8 日志与异常
```bash
docker compose logs --tail=500 backend   # 检查 Unhandled error / ERR_MODULE_NOT_FOUND
```
- 启动期无未捕获异常；运行期 500 内部错误 = 0

---

## 8. 常见问题排查

| 症状 | 原因 | 处理 |
|------|------|------|
| 登录成功但刷新 401 | `COOKIE_SECURE=true`（HTTP 丢弃 Cookie） | `.env` 设 `COOKIE_SECURE=false`，重建 backend |
| backend 容器 Restarting | DB 未就绪或密码不符 | 等 mysql healthy；核对 `.env` 与 compose 的 DB_PASSWORD |
| 前端访问 502 Bad Gateway | backend 还未 healthy | 等 40s；查 `docker compose ps` |
| `ECONNREFUSED 127.0.0.1:3306` | DB_HOST 写成 localhost | `.env` 设 `DB_HOST=mysql`（容器名） |
| 端口 80 被占用 | IIS / 其他服务 | 改 compose `ports: "8080:80"`，访问带 :8080 |
| MySQL 起不来 | 内存不足 | Docker 分配 ≥4GB，或减 `innodb-buffer-pool-size=512M` |
| `npm ci` lockfile 不匹配 | 复制时漏了 lockfile | 确保根/app/app/server 三处 package-lock.json 都在 |

---

## 9. 迁移到未来 Linux 服务器

本部署配置可直接用于 Linux，仅需替换 Windows 专属步骤：

| Windows | Linux |
|---------|-------|
| Docker Desktop (WSL2) | `apt install docker.io docker-compose-plugin` |
| `New-NetFirewallRule` | `ufw allow 80/tcp` |
| 盘符 `F:\` | `/opt/project-task-manager` |
| robocopy | `rsync -av --exclude` 或 `git clone` |

**换行符（关键）**：Windows 上 git 可能将 LF 转 CRLF，导致容器内 Dockerfile/shell 报 `bad interpreter`。迁移前确保：
```bash
dos2unix Dockerfile.* *.sh          # 或
git config --global core.autocrlf false
```

**仅需修改的值**：`.env` 中 `CORS_ORIGIN` 改为 Linux 服务器 IP/域名，`DB_PASSWORD`、`BACKUP_ENCRYPTION_KEY` 改为生产强随机值。

---

## 10. 完全清理重置

```bash
# 停止并删除容器、网络、数据卷（数据全清，慎用）
docker compose down -v

# 强制重建镜像
docker compose build --no-cache

# 清理悬空镜像（释放磁盘）
docker system prune -f
```

---

## 11. 已修复的部署缺陷清单

本次部署修复了原 Docker 配置中以下导致部署失败的问题（详见 git 历史）：

1. **Cookie secure 阻断登录**：`auth/routes.ts` 三处 `secure` 改为 `COOKIE_SECURE` 环境变量可控
2. **tsconfig 排除 migrations**：移除 `src/migrations/**` 排除，确保运行时迁移文件被编译
3. **后端构建类型债**：Dockerfile 用 `tsc --noCheck` 跳过历史类型错误（mysql2/null 收窄等），仅做转译 emit
4. **tsc outDir 路径不一致**：Dockerfile 用 `--outDir ./dist` 覆盖本地 PM2 路径
5. **Dockerfile npm ci 漏 devDeps**：改为 `npm ci`（含 typescript）后 `npm prune --omit=dev`
6. **前端 vite outDir 路径**：`--outDir ./dist` 覆盖 + `NODE_OPTIONS` 提升内存
7. **缺失 init.sql 挂载**：移除不存在的 `database/init.sql` 挂载（由 migrations 自动建表）
8. **无 /health 端点**：后端新增 `GET /health`
9. **CORS 单源**：支持 `CORS_ORIGIN` 逗号分隔多源
10. **docker-compose version 弃用字段**：已移除；frontend 依赖 backend 健康检查；redis 内网无密码模式
