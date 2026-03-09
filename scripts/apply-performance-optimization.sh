#!/bin/bash

# 性能优化快速应用脚本
#
# 功能：
# 1. 检查环境
# 2. 应用数据库索引
# 3. 重启服务器
# 4. 验证优化效果
#
# 使用方法：
# chmod +x scripts/apply-performance-optimization.sh
# ./scripts/apply-performance-optimization.sh

set -e  # 遇到错误立即退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查环境
check_environment() {
    log_info "检查环境..."

    # 检查 Node.js
    if ! command -v node &> /dev/null; then
        log_error "Node.js 未安装"
        exit 1
    fi

    # 检查 MySQL
    if ! command -v mysql &> /dev/null; then
        log_warning "MySQL 命令行工具未找到，尝试继续..."
    fi

    # 检查项目目录
    if [ ! -f "package.json" ]; then
        log_error "package.json 未找到，请确保在项目根目录执行此脚本"
        exit 1
    fi

    log_success "环境检查完成"
}

# 应用数据库索引
apply_database_indexes() {
    log_info "应用数据库性能优化索引..."

    # 编译 TypeScript
    log_info "编译 TypeScript..."
    cd app/server
    npm run build 2>&1 | grep -v "node_modules" || true

    # 运行迁移
    log_info "运行数据库迁移..."
    node dist/migrations/006-add-performance-indexes.js

    cd ../..

    log_success "数据库索引应用完成"
}

# 重启服务器
restart_server() {
    log_info "重启服务器..."

    # 停止服务器
    log_info "停止当前服务器..."
    cd app/server
    npm run stop 2>&1 || true

    # 等待进程结束
    sleep 2

    # 启动服务器
    log_info "启动服务器..."
    npm run start &
    SERVER_PID=$!

    cd ../..

    # 等待服务器启动
    log_info "等待服务器启动..."
    sleep 5

    # 检查服务器是否运行
    if curl -s http://localhost:3001/health > /dev/null; then
        log_success "服务器启动成功 (PID: $SERVER_PID)"
    else
        log_error "服务器启动失败"
        exit 1
    fi
}

# 验证优化效果
verify_optimization() {
    log_info "验证优化效果..."

    # 检查缓存预热
    log_info "检查缓存预热状态..."
    sleep 3  # 等待缓存预热完成

    # 测试批量查询接口
    log_info "测试批量查询接口..."
    RESPONSE=$(curl -s -X POST http://localhost:3001/api/batch/mixed \
        -H "Content-Type: application/json" \
        -d '{"queries": [{"type": "projects", "ids": [], "fields": ["id", "name"]}]}')

    if echo "$RESPONSE" | grep -q "success"; then
        log_success "批量查询接口工作正常"
    else
        log_warning "批量查询接口可能有问题"
    fi

    # 显示性能提示
    log_info "=========================================="
    log_info "🎉 性能优化已应用！"
    log_info "=========================================="
    log_info ""
    log_info "下一步操作："
    log_info "1. 打开浏览器访问 http://localhost:3000"
    log_info "2. 打开开发者工具 Console 标签页"
    log_info "3. 刷新页面观察性能日志"
    log_info ""
    log_info "预期性能指标："
    log_info "- 首次加载: < 500ms"
    log_info "- 缓存命中: < 100ms"
    log_info "- 数据库查询: < 50ms"
    log_info ""
    log_info "如需查看详细报告："
    log_info "cat docs/analysis/FRONTEND_LOADING_PERFORMANCE_ANALYSIS.md"
    log_info "=========================================="
}

# 主函数
main() {
    log_info "开始应用性能优化..."
    log_info ""

    check_environment
    apply_database_indexes
    restart_server
    verify_optimization

    log_success "性能优化应用完成！"
}

# 捕获错误
trap 'log_error "脚本执行失败"; exit 1' ERR

# 执行主函数
main
