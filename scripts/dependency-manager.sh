#!/bin/bash

# ============================================
# Project Task Manager 3.0 依赖管理工具
# ============================================

set -e

# 颜色
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
print_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# ============================================
# 依赖分析
# ============================================
analyze_deps() {
    print_info "分析依赖结构..."

    echo ""
    echo "📊 依赖统计:"
    echo "================================"

    # 根目录依赖
    if [ -d "node_modules" ]; then
        ROOT_COUNT=$(find node_modules -maxdepth 1 -type d | wc -l)
        ROOT_SIZE=$(du -sh node_modules 2>/dev/null | cut -f1)
        echo "根目录: $ROOT_COUNT 个包, $ROOT_SIZE"
    fi

    # 前端依赖
    if [ -d "app/node_modules" ]; then
        APP_COUNT=$(find app/node_modules -maxdepth 1 -type d 2>/dev/null | wc -l)
        APP_SIZE=$(du -sh app/node_modules 2>/dev/null | cut -f1)
        echo "前端 (app): $APP_COUNT 个包, $APP_SIZE"
    fi

    # 后端依赖
    if [ -d "app/server/node_modules" ]; then
        SERVER_COUNT=$(find app/server/node_modules -maxdepth 1 -type d 2>/dev/null | wc -l)
        SERVER_SIZE=$(du -sh app/server/node_modules 2>/dev/null | cut -f1)
        echo "后端 (app/server): $SERVER_COUNT 个包, $SERVER_SIZE"
    fi

    echo "================================"

    # 检查重复依赖
    print_info "检查重复依赖..."
    npx npm-dedupe --dry-run 2>/dev/null || echo "需要安装 npm-dedupe: npm install -g npm-dedupe"

    # 检查未使用依赖
    print_info "检查未使用依赖..."
    npx depcheck 2>/dev/null || echo "需要安装 depcheck: npm install -g depcheck"
}

# ============================================
# 清理依赖
# ============================================
clean_deps() {
    print_warning "这将删除所有 node_modules 目录！"
    read -p "确认继续? (y/N) " -n 1 -r
    echo

    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_info "清理依赖..."

        # 删除所有 node_modules
        rm -rf node_modules
        rm -rf app/node_modules
        rm -rf app/server/node_modules
        rm -rf packages/*/node_modules

        # 删除锁文件（可选）
        # rm -f package-lock.json
        # rm -f app/package-lock.json
        # rm -f app/server/package-lock.json

        # 清理 npm 缓存
        print_info "清理 npm 缓存..."
        npm cache clean --force

        print_success "清理完成！"
    else
        print_info "已取消"
    fi
}

# ============================================
# 重新安装依赖
# ============================================
reinstall_deps() {
    print_info "重新安装依赖..."

    # 使用 npm ci（生产环境推荐）或 npm install
    if [ -f "package-lock.json" ]; then
        print_info "使用 npm ci (快速、可靠)..."
        npm ci
    else
        print_info "使用 npm install..."
        npm install
    fi

    print_success "依赖安装完成！"
}

# ============================================
# 检查依赖更新
# ============================================
check_updates() {
    print_info "检查依赖更新..."

    # 检查过时的包
    npm outdated

    print_info "运行安全审计..."
    npm audit

    print_warning "如需更新，请运行: npm update"
}

# ============================================
# 优化依赖
# ============================================
optimize_deps() {
    print_info "优化依赖..."

    # 去重
    print_info "去重依赖..."
    npx npm-dedupe || print_warning "跳过去重（需要安装 npm-dedupe）"

    # 检查未使用依赖
    print_info "检查未使用依赖..."
    npx depcheck || print_warning "跳过检查（需要安装 depcheck）"

    print_success "优化完成！"
}

# ============================================
# 迁移到 pnpm
# ============================================
migrate_pnpm() {
    print_info "迁移到 pnpm..."

    # 检查 pnpm 是否安装
    if ! command -v pnpm &> /dev/null; then
        print_info "安装 pnpm..."
        npm install -g pnpm
    fi

    # 创建 pnpm-workspace.yaml
    print_info "创建 pnpm-workspace.yaml..."
    cat > pnpm-workspace.yaml << EOF
packages:
  - 'app'
  - 'app/server'
  - 'packages/*'
EOF

    # 删除现有 node_modules
    print_warning "删除现有 node_modules..."
    rm -rf node_modules
    rm -rf app/node_modules
    rm -rf app/server/node_modules

    # 安装依赖
    print_info "使用 pnpm 安装依赖..."
    pnpm import  # 从 package-lock.json 导入
    pnpm install

    print_success "迁移完成！"
    print_info "现在可以使用 pnpm 命令了"
}

# ============================================
# 显示帮助
# ============================================
show_help() {
    echo "Project Task Manager 3.0 依赖管理工具"
    echo ""
    echo "用法: ./scripts/dependency-manager.sh [命令]"
    echo ""
    echo "命令:"
    echo "  analyze     分析依赖结构"
    echo "  clean       清理所有 node_modules"
    echo "  reinstall   重新安装依赖"
    echo "  check       检查依赖更新"
    echo "  optimize    优化依赖（去重）"
    echo "  pnpm        迁移到 pnpm"
    echo "  help        显示此帮助信息"
    echo ""
    echo "示例:"
    echo "  ./scripts/dependency-manager.sh analyze"
    echo "  ./scripts/dependency-manager.sh clean"
}

# ============================================
# 主函数
# ============================================
main() {
    case "${1:-help}" in
        analyze)
            analyze_deps
            ;;
        clean)
            clean_deps
            ;;
        reinstall)
            clean_deps
            reinstall_deps
            ;;
        check)
            check_updates
            ;;
        optimize)
            optimize_deps
            ;;
        pnpm)
            migrate_pnpm
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

main "$@"
