#!/bin/bash

# ============================================
# Project Task Manager 3.0 部署脚本
# ============================================

set -e  # 遇到错误立即退出

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 打印带颜色的消息
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查必要的命令
check_requirements() {
    print_info "检查系统依赖..."

    if ! command -v node &> /dev/null; then
        print_error "Node.js 未安装，请先安装 Node.js >= 18.0.0"
        exit 1
    fi

    if ! command -v npm &> /dev/null; then
        print_error "npm 未安装"
        exit 1
    fi

    print_success "系统依赖检查通过"
}

# 安装依赖
install_dependencies() {
    print_info "安装项目依赖..."

    # 安装前端依赖
    print_info "安装前端依赖..."
    cd app && npm install && cd ..

    # 安装后端依赖
    print_info "安装后端依赖..."
    cd app/server && npm install && cd ../..

    print_success "依赖安装完成"
}

# 构建项目
build_project() {
    print_info "构建项目..."

    # 创建构建目录
    mkdir -p Build/frontend Build/backend

    # 构建前端
    print_info "构建前端..."
    cd app
    npm run build
    cd ..

    # 构建后端
    print_info "构建后端..."
    cd app/server
    npm run build
    cd ../..

    print_success "项目构建完成"
}

# 初始化数据库
init_database() {
    print_info "初始化数据库..."

    cd app/server
    npm run db:init
    cd ../..

    print_success "数据库初始化完成"
}

# 启动开发服务器
start_dev() {
    print_info "启动开发服务器..."

    # 检查环境变量文件
    if [ ! -f "app/server/.env" ]; then
        print_warning "未找到 .env 文件，从 .env.example 创建..."
        cp .env.example app/server/.env
        print_warning "请编辑 app/server/.env 文件配置数据库连接信息"
    fi

    # 启动 MySQL 和 Redis（如果使用 Docker）
    if command -v docker &> /dev/null; then
        print_info "启动 Docker 服务..."
        docker-compose up -d mysql redis
        sleep 5
    fi

    # 启动前后端开发服务器
    print_info "启动后端服务..."
    cd app/server && npm run dev &

    print_info "启动前端服务..."
    cd ../.. && npm run dev:frontend &

    print_success "开发服务器启动完成"
    print_info "前端地址: http://localhost:5173"
    print_info "后端地址: http://localhost:3001"
}

# Docker 部署
deploy_docker() {
    print_info "使用 Docker 部署..."

    # 检查 Docker
    if ! command -v docker &> /dev/null; then
        print_error "Docker 未安装"
        exit 1
    fi

    if ! command -v docker-compose &> /dev/null; then
        print_error "docker-compose 未安装"
        exit 1
    fi

    # 检查环境变量文件
    if [ ! -f ".env" ]; then
        print_warning "未找到 .env 文件，从 .env.example 创建..."
        cp .env.example .env
        print_warning "请编辑 .env 文件配置环境变量"
        read -p "按回车继续..."
    fi

    # 构建并启动服务
    print_info "构建 Docker 镜像..."
    docker-compose build

    print_info "启动服务..."
    docker-compose up -d

    print_success "Docker 部署完成"
    print_info "前端地址: http://localhost"
    print_info "后端地址: http://localhost:3001"
    print_info "查看日志: docker-compose logs -f"
}

# PM2 生产部署
deploy_pm2() {
    print_info "使用 PM2 部署生产环境..."

    # 检查 PM2
    if ! command -v pm2 &> /dev/null; then
        print_info "安装 PM2..."
        npm install -g pm2
    fi

    # 构建项目
    build_project

    # 使用 PM2 启动后端
    print_info "启动 PM2 服务..."
    pm2 start ecosystem.config.js

    print_success "PM2 部署完成"
    print_info "查看状态: pm2 status"
    print_info "查看日志: pm2 logs"
}

# 显示帮助信息
show_help() {
    echo "Project Task Manager 3.0 部署脚本"
    echo ""
    echo "用法: ./deploy.sh [命令]"
    echo ""
    echo "命令:"
    echo "  install     安装项目依赖"
    echo "  build       构建项目"
    echo "  db:init     初始化数据库"
    echo "  dev         启动开发服务器"
    echo "  docker      使用 Docker 部署"
    echo "  pm2         使用 PM2 部署生产环境"
    echo "  help        显示此帮助信息"
    echo ""
    echo "示例:"
    echo "  ./deploy.sh install    # 安装依赖"
    echo "  ./deploy.sh dev        # 启动开发环境"
    echo "  ./deploy.sh docker     # Docker 部署"
}

# ============================================
# 主函数
# ============================================
main() {
    case "${1:-help}" in
        install)
            check_requirements
            install_dependencies
            ;;
        build)
            check_requirements
            build_project
            ;;
        db:init)
            init_database
            ;;
        dev)
            check_requirements
            start_dev
            ;;
        docker)
            deploy_docker
            ;;
        pm2)
            deploy_pm2
            ;;
        help|--help|-h)
            show_help
            ;;
        *)
            print_error "未知命令: $1"
            show_help
            exit 1
            ;;
    esac
}

# 执行主函数
main "$@"
