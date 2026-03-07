#!/bin/bash

# 项目目录结构验证脚本
# 用途: 验证项目是否符合目录结构规范

echo "=========================================="
echo "  项目目录结构验证"
echo "=========================================="
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查计数器
warnings=0
errors=0

# 1. 检查根目录 .md 文件
echo "📄 检查根目录 .md 文件..."
root_md_count=$(find . -maxdepth 1 -name "*.md" -type f | wc -l)

if [ $root_md_count -eq 2 ]; then
    echo -e "${GREEN}✅ 根目录有 $root_md_count 个 .md 文件（符合规范）${NC}"
    root_md_files=$(find . -maxdepth 1 -name "*.md" -type f -exec basename {} \; | sort)
    echo "   文件列表:"
    echo "$root_md_files" | sed 's/^/   - /'
    
    # 检查是否是正确的文件
    if echo "$root_md_files" | grep -q "CLAUDE.md" && echo "$root_md_files" | grep -q "README.md"; then
        echo -e "${GREEN}✅ 文件类型正确${NC}"
    else
        echo -e "${RED}❌ 根目录 .md 文件类型不正确${NC}"
        errors=$((errors + 1))
    fi
else
    echo -e "${RED}❌ 根目录有 $root_md_count 个 .md 文件（应该只有 2 个）${NC}"
    find . -maxdepth 1 -name "*.md" -type f
    errors=$((errors + 1))
fi
echo ""

# 2. 检查未跟踪的 .md 文件
echo "🔍 检查未跟踪的 .md 文件..."
untracked_md=$(git status --porcelain 2>/dev/null | grep "^??.*\.md$" || true)

if [ -z "$untracked_md" ]; then
    echo -e "${GREEN}✅ 没有未跟踪的 .md 文件${NC}"
else
    echo -e "${YELLOW}⚠️  发现未跟踪的 .md 文件:${NC}"
    echo "$untracked_md" | sed 's/^/   /'
    warnings=$((warnings + 1))
fi
echo ""

# 3. 检查 docs/ 目录结构
echo "📁 检查 docs/ 目录结构..."

if [ -d "docs" ]; then
    echo -e "${GREEN}✅ docs/ 目录存在${NC}"
    
    # 检查子目录
    expected_dirs=("reports" "analysis" "guides")
    for dir in "${expected_dirs[@]}"; do
        if [ -d "docs/$dir" ]; then
            echo -e "${GREEN}  ✅ docs/$dir/ 存在${NC}"
        else
            echo -e "${YELLOW}  ⚠️  docs/$dir/ 不存在${NC}"
            warnings=$((warnings + 1))
        fi
    done
    
    # 统计文档数量
    docs_count=$(find docs -name "*.md" -type f | wc -l)
    echo "   📊 docs/ 目录共有 $docs_count 个 .md 文件"
else
    echo -e "${RED}❌ docs/ 目录不存在${NC}"
    errors=$((errors + 1))
fi
echo ""

# 4. 检查 app/ 目录结构
echo "💻 检查 app/ 目录结构..."

if [ -d "app" ]; then
    echo -e "${GREEN}✅ app/ 目录存在${NC}"
    
    # 检查关键子目录
    if [ -d "app/src" ]; then
        echo -e "${GREEN}  ✅ app/src/ 存在${NC}"
    else
        echo -e "${RED}  ❌ app/src/ 不存在${NC}"
        errors=$((errors + 1))
    fi
    
    if [ -d "app/server" ]; then
        echo -e "${GREEN}  ✅ app/server/ 存在${NC}"
    else
        echo -e "${RED}  ❌ app/server/ 不存在${NC}"
        errors=$((errors + 1))
    fi
else
    echo -e "${RED}❌ app/ 目录不存在${NC}"
    errors=$((errors + 1))
fi
echo ""

# 5. 检查 Test/ 目录结构
echo "🧪 检查 Test/ 目录结构..."

if [ -d "Test" ]; then
    echo -e "${GREEN}✅ Test/ 目录存在${NC}"
    
    # 检查关键子目录
    test_dirs=("frontend" "backend" "E2E_AutoTest" "docs")
    for dir in "${test_dirs[@]}"; do
        if [ -d "Test/$dir" ]; then
            echo -e "${GREEN}  ✅ Test/$dir/ 存在${NC}"
        else
            echo -e "${YELLOW}  ⚠️  Test/$dir/ 不存在${NC}"
            warnings=$((warnings + 1))
        fi
    done
else
    echo -e "${YELLOW}⚠️  Test/ 目录不存在${NC}"
    warnings=$((warnings + 1))
fi
echo ""

# 6. 检查构建和日志目录
echo "🔨 检查构建和日志目录..."

if [ -d "Build" ]; then
    echo -e "${GREEN}✅ Build/ 目录存在${NC}"
else
    echo -e "${YELLOW}⚠️  Build/ 目录不存在${NC}"
    warnings=$((warnings + 1))
fi

if [ -d "logs" ]; then
    echo -e "${GREEN}✅ logs/ 目录存在${NC}"
else
    echo -e "${YELLOW}⚠️  logs/ 目录不存在${NC}"
    warnings=$((warnings + 1))
fi
echo ""

# 总结
echo "=========================================="
echo "  验证结果汇总"
echo "=========================================="
echo -e "错误: ${RED}$errors${NC}"
echo -e "警告: ${YELLOW}$warnings${NC}"

if [ $errors -eq 0 ] && [ $warnings -eq 0 ]; then
    echo -e "${GREEN}✅ 项目目录结构完全符合规范！${NC}"
    exit 0
elif [ $errors -eq 0 ]; then
    echo -e "${YELLOW}⚠️  项目目录结构基本符合规范，有 $warnings 个警告${NC}"
    exit 0
else
    echo -e "${RED}❌ 项目目录结构不符合规范，有 $errors 个错误${NC}"
    exit 1
fi
