# 任务管理系统部署指南

## 一、系统要求

### 硬件要求
- CPU: 2核及以上
- 内存: 4GB及以上
- 磁盘: 20GB及以上

### 软件要求
- Node.js: v18.x 或更高版本
- MySQL: 8.0 或更高版本
- Redis: 6.x 或更高版本（可选，用于缓存）
- npm: 9.x 或更高版本

## 二、环境准备

### 2.1 安装Node.js

**Linux (Ubuntu/Debian):**
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

**Windows:**
从 https://nodejs.org/ 下载并安装LTS版本

### 2.2 安装MySQL

**Linux (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install mysql-server
sudo mysql_secure_installation
```

**Windows:**
从 https://dev.mysql.com/downloads/mysql/ 下载并安装

### 2.3 安装Redis（可选）

**Linux:**
```bash
sudo apt install redis-server
sudo systemctl enable redis-server
```

**Windows:**
从 https://github.com/microsoftarchive/redis/releases 下载

## 三、数据库配置

### 3.1 创建数据库
```sql
CREATE DATABASE task_manager CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'task_user'@'localhost' IDENTIFIED BY 'your_secure_password';
GRANT ALL PRIVILEGES ON task_manager.* TO 'task_user'@'localhost';
FLUSH PRIVILEGES;
```

### 3.2 运行迁移
```bash
cd app/server
npm run migrate
```

## 四、应用配置

### 4.1 环境变量

创建 `app/server/.env` 文件：

```env
# 服务配置
NODE_ENV=production
PORT=3001

# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_USER=task_user
DB_PASSWORD=your_secure_password
DB_NAME=task_manager

# Redis配置（可选）
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT密钥
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRES_IN=7d

# 前端URL
CORS_ORIGIN=http://localhost:5173
```

### 4.2 前端配置

创建 `app/.env` 文件：

```env
VITE_API_BASE_URL=http://localhost:3001/api
```

## 五、安装依赖

```bash
# 安装后端依赖
cd app/server
npm install --production

# 安装前端依赖
cd ../
npm install
```

## 六、构建应用

```bash
# 构建前端
cd app
npm run build

# 构建后端（如果有TypeScript编译）
cd server
npm run build
```

## 七、启动应用

### 7.1 开发模式
```bash
# 启动后端
cd app/server
npm run dev

# 启动前端（新终端）
cd app
npm run dev
```

### 7.2 生产模式
```bash
# 启动后端
cd app/server
npm start

# 前端已构建到 dist 目录，使用nginx或其他web服务器托管
```

## 八、Nginx配置（生产环境）

```nginx
# /etc/nginx/sites-available/task-manager
server {
    listen 80;
    server_name your-domain.com;

    # 前端静态文件
    location / {
        root /var/www/task-manager/dist;
        try_files $uri $uri/ /index.html;
    }

    # API代理
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 九、PM2配置（生产环境）

安装PM2:
```bash
npm install -g pm2
```

创建 `ecosystem.config.js`:
```javascript
module.exports = {
  apps: [{
    name: 'task-manager-server',
    cwd: './app/server',
    script: 'dist/index.js',
    instances: 2,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    }
  }]
};
```

启动:
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

## 十、备份策略

### 10.1 数据库备份脚本

```bash
#!/bin/bash
# backup.sh

BACKUP_DIR="/var/backups/task-manager"
DATE=$(date +%Y%m%d_%H%M%S)
MYSQL_USER="task_user"
MYSQL_PASSWORD="your_password"
DATABASE="task_manager"

mkdir -p $BACKUP_DIR

mysqldump -u$MYSQL_USER -p$MYSQL_PASSWORD $DATABASE > $BACKUP_DIR/task_manager_$DATE.sql

# 保留最近7天的备份
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete

echo "Backup completed: task_manager_$DATE.sql"
```

### 10.2 设置定时备份

```bash
# 每天凌晨2点执行备份
crontab -e
0 2 * * * /path/to/backup.sh
```

## 十一、监控与日志

### 11.1 日志位置
- 后端日志: `app/server/logs/`
- Nginx日志: `/var/log/nginx/`

### 11.2 健康检查
```bash
curl http://localhost:3001/api/health
```

## 十二、故障排除

### 常见问题

1. **数据库连接失败**
   - 检查MySQL服务是否运行
   - 验证数据库用户名和密码
   - 检查防火墙设置

2. **前端无法访问API**
   - 检查CORS配置
   - 验证API服务是否运行
   - 检查Nginx代理配置

3. **定时任务不执行**
   - 检查node-cron是否正确安装
   - 查看服务日志是否有错误

## 十三、升级指南

1. 备份数据库
2. 拉取最新代码
3. 安装新依赖: `npm install`
4. 运行数据库迁移: `npm run migrate`
5. 重启服务: `pm2 restart all`

---

**文档版本**: 1.0
**最后更新**: 2026-03-20
