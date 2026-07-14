# Docker Compose 生产部署设计

> 日期：2026-05-20
> 状态：已确认

## 背景

将项目任务管理系统部署到部门 Ubuntu 服务器，供 10-50 人使用。服务器已安装 Docker。

## 方案

Docker Compose 一键部署，包含 MySQL + Redis + Backend + Frontend(Nginx) 四个服务。

## 部署包结构

```
project-task-manager-deploy/
├── docker-compose.yml
├── Dockerfile.backend
├── Dockerfile.frontend
├── nginx.conf
├── .env.example
├── deploy.sh
├── backup.sh
├── restore.sh
├── README.md
├── database/
│   └── init.sql
├── package.json
├── package-lock.json
└── app/
    ├── package.json / package-lock.json
    ├── tsconfig*.json
    ├── vite.config.ts / tailwind.config.js / postcss.config.js
    ├── index.html
    ├── src/ (前端源码)
    └── server/
        ├── package.json / package-lock.json
        ├── tsconfig.json
        └── src/ (后端源码)
```

## 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| DB_HOST | MySQL 地址 | mysql |
| DB_PORT | MySQL 端口 | 3306 |
| DB_USER | MySQL 用户 | root |
| DB_PASSWORD | MySQL 密码 | (必填) |
| DB_NAME | 数据库名 | task_manager |
| REDIS_URL | Redis URL | redis://redis:6379 |
| CORS_ORIGIN | 跨域白名单 | http://localhost |
| BACKUP_ENCRYPTION_KEY | 备份加密密钥 | (必填) |
| PORT | 后端端口 | 3001 |
| NODE_ENV | 环境 | production |

## 需要修改的文件

1. docker-compose.yml — 去掉弃用 version 字段，通过 .env 管理密码
2. Dockerfile.backend — 多阶段构建，支持 monorepo
3. Dockerfile.frontend — 多阶段构建，支持 monorepo

## 需要新建的文件

1. .env.example — 环境变量模板
2. deploy.sh — 一键部署
3. backup.sh — 数据库备份
4. restore.sh — 数据库恢复
5. database/init.sql — 本地数据库导出
6. README.md — 部署说明

## 运行架构

- Nginx(:80) — 前端静态 + API/WS 反向代理
- Backend(:3001) — Express 服务
- MySQL(:3306) — 数据库
- Redis(:6379) — 缓存（可选，失败降级为内存缓存）

## 排除项

node_modules/, Build/, logs/, Test/, .git/, docs/, IDE/AI 配置
