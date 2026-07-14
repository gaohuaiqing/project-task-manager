/**
 * PM2 配置文件
 * 用于生产环境进程管理
 */

module.exports = {
  apps: [
    {
      name: 'task-manager-backend',
      // 用 tsx 运行 TS 源码：TS 源码 import 无扩展名，编译产物用 node ESM 会失败，
      // tsx 容忍无扩展名并运行时转译；PM2 daemon 守护，独立于终端会话持续运行
      script: './node_modules/tsx/dist/cli.mjs',
      args: 'app/server/src/index.ts',
      cwd: './',
      instances: 1, // 单实例，避免 WebSocket 连接问题
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 8080,
        HOST: '0.0.0.0',
        DB_HOST: '127.0.0.1',
        DB_PORT: '3306',
        DB_USER: 'root',
        DB_PASSWORD: '',
        DB_NAME: 'task_manager',
        REDIS_HOST: '127.0.0.1',
        REDIS_PORT: '6379',
        CORS_ORIGIN: 'http://10.8.180.55:8080,http://localhost:8080',
        COOKIE_SECURE: 'false',
        COOKIE_SAMESITE: 'lax',
        BACKUP_ENCRYPTION_KEY: 'TaskManagerBackupKey2026',
        LOG_LEVEL: 'info',
      },
      env_development: {
        NODE_ENV: 'development',
        PORT: 3001,
      },
      // 日志配置
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_file: './logs/pm2-combined.log',
      time: true,
      // 自动重启配置
      watch: false,
      max_memory_restart: '1G',
      // 进程管理
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      // 优雅关闭
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000,
      // 环境变量
      env_production: {
        NODE_ENV: 'production',
      },
    },
  ],

  // 部署配置
  deploy: {
    production: {
      user: 'node',
      host: 'localhost',
      ref: 'origin/main',
      repo: 'git@github.com:username/project-task-manager.git',
      path: '/var/www/project-task-manager',
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env production',
      'pre-setup': 'apt-get install git',
    },
  },
};
