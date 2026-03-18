#!/bin/bash
# Claude Code 上下文查看器

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}Claude Code 状态信息${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# 当前模型
MODEL="${ANTHROPIC_MODEL:-${ANTHROPIC_DEFAULT_SONNET_MODEL:-glm-4.7}}"
echo -e "${YELLOW}🤖  模型:${NC} $MODEL"

# 当前目录
echo -e "${YELLOW}📁  目录:${NC} $(basename $(pwd))"

# Git 分支
if git rev-parse --git-dir > /dev/null 2>&1; then
    BRANCH=$(git branch --show-current)
    echo -e "${YELLOW}🌿  分支:${NC} $BRANCH"
fi

# 估算上下文使用（基于对话历史）
if [ -f "$HOME/.claude/history.jsonl" ]; then
    # 获取最后几条消息的大小
    RECENT_MSGS=$(tail -5 "$HOME/.claude/history.jsonl" 2>/dev/null | wc -c)
    ESTIMATED_TOKENS=$((RECENT_MSGS / 3))  # 粗略估算：1 token ≈ 3 字符
    CONTEXT_LIMIT=128000  # GLM-4.7 的上下文限制
    PERCENT=$((ESTIMATED_TOKENS * 100 / CONTEXT_LIMIT))

    echo -e "${YELLOW}⚡️  上下文:${NC} ~$(printf "%'d" $ESTIMATED_TOKENS) / $CONTEXT_LIMIT tokens (${PERCENT}%)"
fi

# API 基础 URL
API_BASE="${ANTHROPIC_BASE_URL:-https://api.anthropic.com}"
if [[ "$API_BASE" == *"bigmodel"* ]]; then
    echo -e "${YELLOW}🔗  API:${NC} 智谱AI (bigmodel.cn)"
else
    echo -e "${YELLOW}🔗  API:${NC} Anthropic"
fi

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}已安装插件:${NC}"
echo -e "  • frontend-design (前端界面设计)"
echo -e "  • code-simplifier (代码简化)"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
