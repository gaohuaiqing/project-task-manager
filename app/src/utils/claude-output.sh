#!/bin/bash
# ================================================================
# Claude Code 醒目输出工具
# ================================================================
# 用法: source app/src/utils/claude-output.sh
# ================================================================

# 🔴 红色警告级别 - 最醒目
claude-alert() {
    local msg="$*"
    echo ""
    echo "🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴"
    echo "🔴  ${msg}"
    echo "🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴"
    echo ""
}

# 🟠 橙色重要级别
claude-important() {
    local msg="$*"
    echo ""
    echo "🟠🟠🟠🟠🟠🟠🟠🟠🟠🟠🟠🟠🟠🟠🟠🟠🟠🟠"
    echo "🟠  ${msg}"
    echo "🟠🟠🟠🟠🟠🟠🟠🟠🟠🟠🟠🟠🟠🟠🟠🟠🟠🟠"
    echo ""
}

# 🟡 黄色提醒级别
claude-warning() {
    local msg="$*"
    echo ""
    echo "🟡────────────────────────────────────────"
    echo "🟡  ${msg}"
    echo "🟡────────────────────────────────────────"
    echo ""
}

# 🔵 蓝色信息级别
claude-info() {
    local msg="$*"
    echo ""
    echo "🔵────────────────────────────────────────"
    echo "🔵  ${msg}"
    echo "🔵────────────────────────────────────────"
    echo ""
}

# 🟢 绿色成功级别
claude-success() {
    local msg="$*"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "✅  ${msg}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
}

# ⚪ 简单标题
claude-title() {
    local msg="$*"
    echo ""
    echo "════════════════════════════════════════"
    echo "  ${msg}"
    echo "════════════════════════════════════════"
    echo ""
}

# 📦 分隔线
claude-separator() {
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
}

# 🔸 小分隔线
claude-small-separator() {
    echo "────────────────────────────────────────"
}

# 显示使用说明
claude-help() {
    cat << 'HELP'
🎨 Claude Code 醒目输出工具

可用函数：
  claude-alert      "消息"   - 🔴 最高优先级警告
  claude-important  "消息"   - 🟠 重要信息
  claude-warning    "消息"   - 🟡 警告提醒
  claude-info       "消息"   - 🔵 一般信息
  claude-success    "消息"   - 🟢 成功消息
  claude-title      "标题"   - ⚪ 标题分隔
  claude-separator           - 📦 长分隔线
  claude-small-separator     - 🔸 短分隔线

示例：
  source app/src/utils/claude-output.sh
  claude-alert "这是一条重要警告！"
  claude-success "操作成功完成！"

HELP
}

# 加载时显示提示
if [ "$1" != "--quiet" ]; then
    echo ""
    echo "🎨 Claude 醒目输出工具已加载！输入 claude-help 查看用法"
    echo ""
fi
