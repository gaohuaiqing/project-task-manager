#!/bin/bash
# Claude Code 终端状态栏

# 获取当前信息
MODEL="GLM-4.7"
DIR=$(basename $(pwd))
BRANCH=$(git branch --show-current 2>/dev/null || echo "no-git")

# 估算上下文使用
if [ -f "$HOME/.claude/history.jsonl" ]; then
    RECENT_SIZE=$(tail -50 "$HOME/.claude/history.jsonl" 2>/dev/null | wc -c)
    ESTIMATED_TOKENS=$((RECENT_SIZE / 3))
else
    ESTIMATED_TOKENS=0
fi
CONTEXT_LIMIT=128000

# 获取总使用量
if [ -f "$HOME/.claude/stats-cache.json" ]; then
    MSG_COUNT=$(grep -o '"messageCount":[0-9]*' "$HOME/.claude/stats-cache.json" 2>/dev/null | head -1 | cut -d':' -f2)
    if [ -n "$MSG_COUNT" ] && [ "$MSG_COUNT" != "0" ]; then
        TOTAL_EST=$((MSG_COUNT * 2000))
        if [ $TOTAL_EST -gt 1000000 ]; then
            TOTAL_FMT="$((TOTAL_EST / 1000000)).$(((TOTAL_EST % 1000000) / 100000))M"
        elif [ $TOTAL_EST -gt 1000 ]; then
            TOTAL_FMT="$((TOTAL_EST / 1000)).$(((TOTAL_EST % 1000) / 100))K"
        else
            TOTAL_FMT="$TOTAL_EST"
        fi
    else
        TOTAL_FMT="0"
    fi
else
    TOTAL_FMT="0"
fi

# 输出状态栏
echo "🤖 $MODEL | 📁 $DIR | 🌿 $BRANCH | ⚡️ $ESTIMATED_TOKENS / $CONTEXT_LIMIT | 📊 $TOTAL_FMT tokens"
