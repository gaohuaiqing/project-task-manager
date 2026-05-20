#!/bin/bash
# Test/scripts/run-tests.sh - 测试执行启动脚本

set -e

echo "======================================"
echo "  项目任务管理系统 - 交付前测试"
echo "======================================"
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 显示测试账号信息
echo "测试账号信息 (登录名=密码=工号):"
echo "  admin      : admin / admin (系统管理员)"
echo "  dept_manager: 50223183 / 50223183 (高怀庆)"
echo "  tech_manager: 50233164 / 50233164 (汪志明)"
echo "  tech_manager: 50234447 / 50234447 (陈理)"
echo "  engineer   : 50241392 / 50241392 (张达)"
echo "  engineer   : 50260249 / 50260249 (陈霄)"
echo "  engineer   : 50261934 / 50261934 (叶协通)"
echo "  engineer   : 50265571 / 50265571 (胡斌)"
echo ""

# 检查环境
echo "检查测试环境..."

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}错误: Node.js 未安装${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Node.js 版本: $(node -v)${NC}"

# 检查配置文件
if [ ! -f "Test/data/test-data.json" ]; then
    echo -e "${YELLOW}警告: 测试数据配置文件不存在${NC}"
fi

echo ""
echo "======================================"
echo "  测试执行选项"
echo "======================================"
echo "1. 准备测试数据（项目、任务）"
echo "2. 清理测试数据"
echo "3. 查看测试方案"
echo "4. 查看执行检查清单"
echo "5. 生成测试报告（示例）"
echo "6. 显示测试账号列表"
echo "7. 退出"
echo ""

read -p "请选择操作 (1-7): " choice

case $choice in
    1)
        echo "准备测试数据..."
        cd app/server && npx tsx ../../Test/scripts/setup-test-data.ts
        ;;
    2)
        echo "清理测试数据..."
        cd app/server && npx tsx ../../Test/scripts/clear-test-data.ts
        ;;
    3)
        echo "测试方案文档:"
        echo "  Test/docs/DELIVERY_TEST_PLAN.md"
        echo ""
        echo "使用 Chrome DevTools MCP 按测试方案执行测试"
        ;;
    4)
        echo "执行检查清单:"
        echo "  Test/docs/TEST_EXECUTION_CHECKLIST.md"
        echo ""
        echo "使用 Chrome DevTools MCP 按检查清单执行测试"
        ;;
    5)
        echo "生成测试报告示例..."
        npx tsx Test/scripts/generate-test-report.ts
        ;;
    6)
        echo ""
        echo "测试账号列表:"
        echo "  角色: admin, 工号: admin, 密码: admin"
        echo "  角色: dept_manager, 工号: 50223183, 密码: 50223183, 姓名: 高怀庆"
        echo "  角色: tech_manager, 工号: 50233164, 密码: 50233164, 姓名: 汪志明"
        echo "  角色: tech_manager, 工号: 50234447, 密码: 50234447, 姓名: 陈理"
        echo "  角色: engineer, 工号: 50241392, 密码: 50241392, 姓名: 张达"
        echo "  角色: engineer, 工号: 50260249, 密码: 50260249, 姓名: 陈霄"
        echo "  角色: engineer, 工号: 50261934, 密码: 50261934, 姓名: 叶协通"
        echo "  角色: engineer, 工号: 50265571, 密码: 50265571, 姓名: 胡斌"
        ;;
    7)
        echo "退出"
        exit 0
        ;;
    *)
        echo -e "${RED}无效选择${NC}"
        exit 1
        ;;
esac

echo ""
echo -e "${GREEN}操作完成${NC}"