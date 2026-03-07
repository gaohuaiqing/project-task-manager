#!/bin/bash

# ============================================
# 登录性能测试脚本
# ============================================

# 配置
SERVER_URL="http://localhost:3001"
ITERATIONS=10
USERNAME="admin"
PASSWORD="admin123"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "============================================"
echo "登录性能测试 - 登录数据库访问性能优化"
echo "============================================"
echo "服务器地址: $SERVER_URL"
echo "测试次数: $ITERATIONS"
echo "用户名: $USERNAME"
echo ""

# 检查服务器是否运行
echo -n "检查服务器状态... "
HEALTH_CHECK=$(curl -s -o /dev/null -w "%{http_code}" "$SERVER_URL/health" 2>/dev/null)

if [ "$HEALTH_CHECK" != "200" ]; then
    echo -e "${RED}失败${NC}"
    echo "错误: 服务器未响应或未启动"
    exit 1
fi

echo -e "${GREEN}正常${NC}"

# 测试 1: 功能测试
echo ""
echo "--------------------------------------------"
echo "测试 1: 功能测试"
echo "--------------------------------------------"
echo -n "执行登录请求... "

LOGIN_RESPONSE=$(curl -s -X POST "$SERVER_URL/api/login" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"$USERNAME\",\"password\":\"$PASSWORD\",\"ip\":\"local\"}")

if echo "$LOGIN_RESPONSE" | grep -q '"success":true'; then
    echo -e "${GREEN}成功${NC}"
    SESSION_ID=$(echo "$LOGIN_RESPONSE" | grep -o '"sessionId":"[^"]*"' | cut -d'"' -f4)
    echo "Session ID: $SESSION_ID"
else
    echo -e "${RED}失败${NC}"
    echo "响应: $LOGIN_RESPONSE"
    exit 1
fi

# 测试 2: 性能测试
echo ""
echo "--------------------------------------------"
echo "测试 2: 性能测试（$ITERATIONS 次登录）"
echo "--------------------------------------------"

TOTAL_TIME=0
SUCCESS_COUNT=0
FAIL_COUNT=0

for i in $(seq 1 $ITERATIONS); do
    START_TIME=$(date +%s%3N)

    RESPONSE=$(curl -s -X POST "$SERVER_URL/api/login" \
      -H "Content-Type: application/json" \
      -d "{\"username\":\"$USERNAME\",\"password\":\"$PASSWORD\",\"ip\":\"local\"}")

    END_TIME=$(date +%s%3N)
    DURATION=$((END_TIME - START_TIME))

    if echo "$RESPONSE" | grep -q '"success":true'; then
        SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
        TOTAL_TIME=$((TOTAL_TIME + DURATION))
        echo -e "  [$i/$ITERATIONS] ${GREEN}✓${NC} ${DURATION}ms"
    else
        FAIL_COUNT=$((FAIL_COUNT + 1))
        echo -e "  [$i/$ITERATIONS] ${RED}✗${NC} 失败"
    fi
done

# 计算统计信息
if [ $SUCCESS_COUNT -gt 0 ]; then
    AVG_TIME=$((TOTAL_TIME / SUCCESS_COUNT))
    MIN_TIME=$AVG_TIME
    MAX_TIME=$AVG_TIME
else
    AVG_TIME=0
    MIN_TIME=0
    MAX_TIME=0
fi

# 测试 3: 连接池状态
echo ""
echo "--------------------------------------------"
echo "测试 3: 数据库连接池状态"
echo "--------------------------------------------"

POOL_STATUS=$(curl -s "$SERVER_URL/api/db-pool-status" 2>/dev/null)

if [ -n "$POOL_STATUS" ]; then
    echo "$POOL_STATUS" | grep -E '(total|active|free|usageRate)' | sed 's/^\s*/  /'
else
    echo -e "  ${YELLOW}警告: 无法获取连接池状态${NC}"
fi

# 测试 4: 缓存状态
echo ""
echo "--------------------------------------------"
echo "测试 4: 缓存状态"
echo "--------------------------------------------"

REDIS_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" "$SERVER_URL/health/redis" 2>/dev/null)

if [ "$REDIS_HEALTH" = "200" ]; then
    echo -e "  Redis: ${GREEN}正常${NC}"
else
    echo -e "  Redis: ${RED}异常${NC}"
fi

# 结果汇总
echo ""
echo "============================================"
echo "测试结果汇总"
echo "============================================"
echo -e "成功登录: ${GREEN}$SUCCESS_COUNT${NC}/$ITERATIONS"
echo -e "失败登录: ${RED}$FAIL_COUNT${NC}/$ITERATIONS"

if [ $SUCCESS_COUNT -gt 0 ]; then
    echo "平均响应时间: ${AVG_TIME}ms"

    # 性能评估
    if [ $AVG_TIME -lt 100 ]; then
        echo -e "性能评估: ${GREEN}优秀${NC} (目标: <100ms)"
    elif [ $AVG_TIME -lt 200 ]; then
        echo -e "性能评估: ${YELLOW}良好${NC} (目标: <200ms)"
    else
        echo -e "性能评估: ${RED}需优化${NC} (目标: <200ms)"
    fi
else
    echo -e "性能评估: ${RED}无法评估${NC} (无成功登录)"
fi

echo ""
echo "============================================"
echo "性能优化目标"
echo "============================================"
echo "正常登录:     < 150ms"
echo "IP获取优化:   移除外部请求 (0-10s → 0ms)"
echo "用户信息缓存: 50-200ms → 1-5ms"
echo "连接池优化:   高并发流畅处理"
echo "============================================"

# 退出码
if [ $FAIL_COUNT -eq 0 ]; then
    exit 0
else
    exit 1
fi
