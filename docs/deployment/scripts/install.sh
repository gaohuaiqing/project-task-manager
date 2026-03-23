#!/bin/bash

# 任务管理系统 - Linux 安装脚本
# 使用方法: chmod +x install.sh && ./install.sh

set -e

echo "================================"
echo "任务管理系统 - 安装脚本"
echo "================================"
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查是否为root用户
if [ "$EUID" -ne 0 ]; then
  echo -e "${YELLOW}建议使用root用户或sudo运行此脚本${NC}"
fi

# 检查操作系统
if [ -f /etc/os-release ]; then
  . /etc/os-release
  OS=$NAME
  VER=$VERSION_ID
else
  echo -e "${RED}无法检测操作系统${NC}"
  exit 1
fi

echo -e "检测到操作系统: ${GREEN}$OS $VER${NC}"
echo ""

# 检查Node.js
echo "检查 Node.js..."
if command -v node &> /dev/null; then
  NODE_VERSION=$(node -v)
  echo -e "${GREEN}已安装 Node.js: $NODE_VERSION${NC}"
else
  echo -e "${YELLOW}未安装 Node.js，正在安装...${NC}"

  if [[ "$OS" == *"Ubuntu"* ]] || [[ "$OS" == *"Debian"* ]]; then
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
  elif [[ "$OS" == *"CentOS"* ]] || [[ "$OS" == *"Red Hat"* ]]; then
    curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
    sudo yum install -y nodejs
  else
    echo -e "${RED}不支持的操作系统，请手动安装 Node.js${NC}"
    exit 1
  fi
fi

# 检查npm
echo "检查 npm..."
if command -v npm &> /dev/null; then
  NPM_VERSION=$(npm -v)
  echo -e "${GREEN}已安装 npm: $NPM_VERSION${NC}"
else
  echo -e "${RED}npm 未安装${NC}"
  exit 1
fi

# 检查MySQL
echo ""
echo "检查 MySQL..."
if command -v mysql &> /dev/null; then
  MYSQL_VERSION=$(mysql --version)
  echo -e "${GREEN}已安装 MySQL: $MYSQL_VERSION${NC}"
else
  echo -e "${YELLOW}未安装 MySQL${NC}"
  read -p "是否现在安装 MySQL? (y/n): " INSTALL_MYSQL
  if [ "$INSTALL_MYSQL" = "y" ]; then
    if [[ "$OS" == *"Ubuntu"* ]] || [[ "$OS" == *"Debian"* ]]; then
      sudo apt-get update
      sudo apt-get install -y mysql-server
      sudo mysql_secure_installation
    elif [[ "$OS" == *"CentOS"* ]] || [[ "$OS" == *"Red Hat"* ]]; then
      sudo yum install -y mysql-server
      sudo systemctl start mysqld
      sudo mysql_secure_installation
    fi
  else
    echo -e "${YELLOW}请确保 MySQL 已安装并运行${NC}"
  fi
fi

# 检查Redis（可选）
echo ""
echo "检查 Redis（可选）..."
if command -v redis-server &> /dev/null || command -v redis-cli &> /dev/null; then
  echo -e "${GREEN}已安装 Redis${NC}"
else
  echo -e "${YELLOW}未安装 Redis（可选组件）${NC}"
  read -p "是否现在安装 Redis? (y/n): " INSTALL_REDIS
  if [ "$INSTALL_REDIS" = "y" ]; then
    if [[ "$OS" == *"Ubuntu"* ]] || [[ "$OS" == *"Debian"* ]]; then
      sudo apt-get install -y redis-server
      sudo systemctl enable redis-server
      sudo systemctl start redis-server
    elif [[ "$OS" == *"CentOS"* ]] || [[ "$OS" == *"Red Hat"* ]]; then
      sudo yum install -y redis
      sudo systemctl enable redis
      sudo systemctl start redis
    fi
  fi
fi

# 安装项目依赖
echo ""
echo "================================"
echo "安装项目依赖"
echo "================================"

# 后端依赖
echo "安装后端依赖..."
cd app/server
npm install
cd ../..

# 前端依赖
echo "安装前端依赖..."
cd app
npm install
cd ..

# 创建环境变量文件
echo ""
echo "================================"
echo "配置环境变量"
echo "================================"

if [ ! -f "app/server/.env" ]; then
  echo "创建后端环境变量文件..."
  cp app/server/.env.example app/server/.env 2>/dev/null || cat > app/server/.env << EOF
NODE_ENV=development
PORT=3001

DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=task_manager

JWT_SECRET=your_development_secret_key_here
CORS_ORIGIN=http://localhost:5173

LOG_LEVEL=debug
EOF
  echo -e "${GREEN}已创建 app/server/.env${NC}"
  echo -e "${YELLOW}请编辑此文件配置数据库连接信息${NC}"
else
  echo -e "${GREEN}app/server/.env 已存在${NC}"
fi

if [ ! -f "app/.env" ]; then
  echo "创建前端环境变量文件..."
  cat > app/.env << EOF
VITE_API_BASE_URL=http://localhost:3001/api
EOF
  echo -e "${GREEN}已创建 app/.env${NC}"
else
  echo -e "${GREEN}app/.env 已存在${NC}"
fi

# 创建数据库
echo ""
echo "================================"
echo "数据库设置"
echo "================================"

read -p "是否创建数据库? (y/n): " CREATE_DB
if [ "$CREATE_DB" = "y" ]; then
  read -p "MySQL root密码: " -s MYSQL_ROOT_PASSWORD
  echo ""

  read -p "数据库用户名 [task_user]: " DB_USER
  DB_USER=${DB_USER:-task_user}

  read -p "数据库密码: " -s DB_PASSWORD
  echo ""

  mysql -u root -p"$MYSQL_ROOT_PASSWORD" << EOF
CREATE DATABASE IF NOT EXISTS task_manager CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS '$DB_USER'@'localhost' IDENTIFIED BY '$DB_PASSWORD';
GRANT ALL PRIVILEGES ON task_manager.* TO '$DB_USER'@'localhost';
FLUSH PRIVILEGES;
EOF

  echo -e "${GREEN}数据库创建成功${NC}"

  # 更新.env文件
  sed -i "s/DB_USER=.*/DB_USER=$DB_USER/" app/server/.env
  sed -i "s/DB_PASSWORD=.*/DB_PASSWORD=$DB_PASSWORD/" app/server/.env
fi

# 运行数据库迁移
echo ""
read -p "是否运行数据库迁移? (y/n): " RUN_MIGRATE
if [ "$RUN_MIGRATE" = "y" ]; then
  cd app/server
  npm run migrate
  cd ../..
  echo -e "${GREEN}数据库迁移完成${NC}"
fi

# 构建前端
echo ""
read -p "是否构建前端? (y/n): " BUILD_FRONTEND
if [ "$BUILD_FRONTEND" = "y" ]; then
  cd app
  npm run build
  cd ..
  echo -e "${GREEN}前端构建完成${NC}"
fi

echo ""
echo "================================"
echo -e "${GREEN}安装完成！${NC}"
echo "================================"
echo ""
echo "下一步操作："
echo "1. 编辑 app/server/.env 配置环境变量"
echo "2. 启动后端: cd app/server && npm run dev"
echo "3. 启动前端: cd app && npm run dev"
echo ""
