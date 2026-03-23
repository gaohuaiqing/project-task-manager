#!/bin/bash

# 任务管理系统 - 数据库备份脚本
# 使用方法: chmod +x backup.sh && ./backup.sh

set -e

# 配置
BACKUP_DIR="/var/backups/task-manager"
DATE=$(date +%Y%m%d_%H%M%S)
MYSQL_USER="${DB_USER:-task_user}"
MYSQL_PASSWORD="${DB_PASSWORD:-}"
MYSQL_HOST="${DB_HOST:-localhost}"
MYSQL_PORT="${DB_PORT:-3306}"
DATABASE="${DB_NAME:-task_manager}"

# 保留天数
RETENTION_DAYS=7

# 创建备份目录
mkdir -p "$BACKUP_DIR"

echo "================================"
echo "数据库备份开始"
echo "时间: $(date)"
echo "================================"

# 备份文件名
BACKUP_FILE="$BACKUP_DIR/task_manager_$DATE.sql"

# 执行备份
if [ -n "$MYSQL_PASSWORD" ]; then
  mysqldump -h"$MYSQL_HOST" -P"$MYSQL_PORT" -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" \
    --single-transaction \
    --routines \
    --triggers \
    --events \
    "$DATABASE" > "$BACKUP_FILE"
else
  mysqldump -h"$MYSQL_HOST" -P"$MYSQL_PORT" -u"$MYSQL_USER" \
    --single-transaction \
    --routines \
    --triggers \
    --events \
    "$DATABASE" > "$BACKUP_FILE"
fi

# 压缩备份
gzip "$BACKUP_FILE"
BACKUP_FILE="$BACKUP_FILE.gz"

# 检查备份是否成功
if [ -f "$BACKUP_FILE" ]; then
  BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
  echo "备份成功: $BACKUP_FILE"
  echo "备份大小: $BACKUP_SIZE"
else
  echo "备份失败!"
  exit 1
fi

# 清理旧备份
echo ""
echo "清理超过 $RETENTION_DAYS 天的旧备份..."
find "$BACKUP_DIR" -name "task_manager_*.sql.gz" -mtime +$RETENTION_DAYS -delete
echo "清理完成"

# 列出当前备份
echo ""
echo "当前备份列表:"
ls -lh "$BACKUP_DIR"/task_manager_*.sql.gz 2>/dev/null | tail -10

echo ""
echo "================================"
echo "数据库备份完成"
echo "================================"

# 可选：上传到远程存储
# 例如上传到 S3
# aws s3 cp "$BACKUP_FILE" s3://your-bucket/backups/
