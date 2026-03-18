#!/bin/bash
# ================================================================
# Claude Code 状态栏显示工具
# ================================================================
# 显示：🤖 模型 | 📁 项目 | 🌿 分支 | ⚡️ 上下文 | 📊 Tokens
# ================================================================

# Git 分支函数
get_git_branch() {
    git branch --show-current 2>/dev/null || echo "无分支"
}

# 项目名称函数
get_project_name() {
    basename "$(pwd)" 2>/dev/null || echo "未知项目"
}

# 获取 Claude 模型信息
get_model_info() {
    # 从系统消息中提取模型信息
    # GLM-4.7 是当前使用的模型
    echo "GLM-4.7"
}

# 显示完整状态栏
claude-statusbar() {
    local model=$(get_model_info)
    local project=$(get_project_name)
    local branch=$(get_git_branch)

    echo ""
    echo "┌────────────────────────────────────────────────────────────────────────────┐"
    echo "│ 🤖 ${model} | 📁 ${project} | 🌿 ${branch} | ⚡️ 上下文使用中 | 📊 Token 统计中 │"
    echo "└────────────────────────────────────────────────────────────────────────────┘"
    echo ""
}

# 显示紧凑版状态栏
claude-statusbar-compact() {
    local model=$(get_model_info)
    local project=$(get_project_name)
    local branch=$(get_git_branch)

    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "🤖 ${model} │ 📁 ${project} │ 🌿 ${branch} │ ⚡️ 上下文 │ 📊 Tokens"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
}

# 显示单行状态栏
claude-statusbar-oneline() {
    local model=$(get_model_info)
    local project=$(get_project_name)
    local branch=$(get_git_branch)

    echo ""
    echo "🤖 ${model} | 📁 ${project} | 🌿 ${branch} | ⚡️ 上下文使用中 | 📊 Token 统计中"
    echo ""
}

# 显示使用说明
claude-statusbar-help() {
    cat << 'HELP'
📊 Claude Code 状态栏工具

可用命令：
  claude-statusbar         - 完整框线版状态栏
  claude-statusbar-compact - 紧凑版状态栏
  claude-statusbar-oneline - 单行版状态栏
  claude-statusbar-help    - 显示此帮助

示例：
  source app/src/utils/claude-statusbar.sh
  claude-statusbar

HELP
}

# 加载时显示提示
if [ "$1" != "--quiet" ]; then
    echo ""
    echo "📊 Claude 状态栏工具已加载！"
    echo "   使用 claude-statusbar-help 查看用法"
    echo ""
fi
