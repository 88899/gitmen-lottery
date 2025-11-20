#!/bin/bash

# 统一检查脚本 - 全面系统检查
# 用法: 
#   bash scripts/check.sh                    # 全面检查
#   bash scripts/check.sh [lottery_type]     # 集成检查

LOTTERY_TYPE="${1:-}"

PASSED=0
FAILED=0
WARNINGS=0

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 日志文件
LOG_DIR="logs"
mkdir -p "$LOG_DIR"
LOG_FILE="$LOG_DIR/check_$(date '+%Y%m%d_%H%M%S').log"

# 日志函数
log_output() {
    echo "$@" | tee -a "$LOG_FILE"
}

# ============================================================================
# 清理阶段：清理旧进程和日志
# ============================================================================

echo -e "${BLUE}🧹 清理旧进程和日志...${NC}"

# 清理正在运行的 check.sh 进程（排除当前进程）
CURRENT_PID=$$
RUNNING_PIDS=$(pgrep -f "bash scripts/check.sh" | grep -v "^$CURRENT_PID$")
if [ -n "$RUNNING_PIDS" ]; then
    echo "  清理旧的 check.sh 进程..."
    echo "$RUNNING_PIDS" | xargs kill -9 2>/dev/null
    sleep 1
    echo "  ✓ 旧进程已清理"
fi

# 清理旧的日志文件
if [ -f "$LOG_DIR/check_"*.log ] 2>/dev/null; then
    echo "  清理旧的日志文件..."
    rm -f "$LOG_DIR/check_"*.log "$LOG_DIR/schedule_"*.log 2>/dev/null
    echo "  ✓ 旧日志已清理"
fi

echo ""

# ============================================================================
# 第一部分：基础质量检查
# ============================================================================

echo -e "${BLUE}🔍 开始全面检查...${NC}\n"

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}第一部分：基础质量检查${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

# 1. Python 语法检查
echo "📝 检查 Python 语法..."
SYNTAX_ERRORS=$(find . -name "*.py" -not -path "./venv/*" -not -path "./.venv/*" -not -path "./node_modules/*" -exec python -m py_compile {} \; 2>&1 | wc -l)
if [ "$SYNTAX_ERRORS" -eq 0 ]; then
    echo "✓ Python 语法检查通过"
    ((PASSED++))
else
    echo "✗ 发现 $SYNTAX_ERRORS 个语法错误"
    ((FAILED++))
fi

# 1.5. Cloudflare Worker JavaScript 语法检查
echo "📝 检查 Cloudflare Worker JavaScript 语法..."
if command -v node &> /dev/null; then
    JS_SYNTAX_ERRORS=$(find cloudflare-worker/src -name "*.js" -exec node -c {} \; 2>&1 | grep -c "SyntaxError" || true)
    if [ "$JS_SYNTAX_ERRORS" -eq 0 ]; then
        echo "✓ Worker JavaScript 语法检查通过"
        ((PASSED++))
    else
        echo "✗ 发现 $JS_SYNTAX_ERRORS 个 JavaScript 语法错误"
        ((FAILED++))
    fi
else
    echo "⚠️  Node.js 未安装，跳过 JavaScript 语法检查"
    ((WARNINGS++))
fi

# 2. Python 配置验证
echo "⚙️  验证 Python 配置..."
python -c "
from core.config import SUPPORTED_LOTTERIES, LOTTERY_NAMES
assert len(SUPPORTED_LOTTERIES) == len(LOTTERY_NAMES), '彩票类型数量不匹配'
assert set(SUPPORTED_LOTTERIES) == set(LOTTERY_NAMES.keys()), '彩票类型不一致'
print(f'✓ 支持的彩票类型: {SUPPORTED_LOTTERIES}')
print(f'✓ 彩票名称映射: {list(LOTTERY_NAMES.keys())}')
" && ((PASSED+=2)) || ((FAILED++))

# 2.5. Worker 配置验证
echo "⚙️  验证 Worker 配置..."
if [ -f "cloudflare-worker/src/index.js" ]; then
    # 检查所有彩票类型是否在 Worker 配置中
    for lottery in ssq dlt qxc qlc; do
        if grep -q "lastIssue.*$lottery" cloudflare-worker/src/index.js 2>/dev/null || grep -q "'$lottery'" cloudflare-worker/src/index.js 2>/dev/null; then
            echo "✓ Worker 支持 $lottery"
            ((PASSED++))
        else
            echo "✗ Worker 不支持 $lottery"
            ((FAILED++))
        fi
    done
else
    echo "✗ Worker 配置文件不存在"
    ((FAILED++))
fi

# 3. Python 模块验证
echo "📦 验证 Python 模块..."
python -c "
from cli.smart_fetch import get_lottery_modules
for lottery_type in ['ssq', 'dlt', 'qxc', 'qlc']:
    try:
        modules = get_lottery_modules(lottery_type)
        print(f'✓ {lottery_type}: {modules[\"name\"]}')
    except Exception as e:
        print(f'✗ {lottery_type}: {e}')
        exit(1)
" && ((PASSED+=4)) || ((FAILED++))

# 3.5. Worker 爬虫文件验证
echo "📦 验证 Worker 爬虫文件..."
for lottery in ssq dlt qxc qlc; do
    if [ -f "cloudflare-worker/src/spiders/${lottery}.js" ]; then
        echo "✓ cloudflare-worker/src/spiders/${lottery}.js 存在"
        ((PASSED++))
    else
        echo "✗ cloudflare-worker/src/spiders/${lottery}.js 缺失"
        ((FAILED++))
    fi
done

echo "📦 验证 Worker 预测器文件..."
for lottery in ssq dlt qxc qlc; do
    if [ -f "cloudflare-worker/src/predictors/${lottery}.js" ]; then
        echo "✓ cloudflare-worker/src/predictors/${lottery}.js 存在"
        ((PASSED++))
    else
        echo "✗ cloudflare-worker/src/predictors/${lottery}.js 缺失"
        ((FAILED++))
    fi
done

# 4. 搜索遗漏
echo "🔎 搜索可能的遗漏..."
MISSING=$(grep -r "ssq.*dlt.*qxc" --include="*.py" --include="*.js" --exclude-dir=node_modules --exclude-dir=venv --exclude-dir=.venv . 2>/dev/null | grep -v "qlc" | grep -v ".md" | grep -v "SESSION_HISTORY" | grep -v "INTEGRATION_CHECKLIST" | wc -l)
if [ "$MISSING" -eq 0 ]; then
    echo "✓ 未发现遗漏"
    ((PASSED++))
else
    echo "⚠️  发现 $MISSING 处可能的遗漏"
fi

echo ""

# ============================================================================
# 第二部分：文档完整性检查
# ============================================================================

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}第二部分：文档完整性检查${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

echo "📚 检查核心文档..."
for file in README.md TECHNICAL_DOCUMENTATION.md CHANGELOG.md DISCLAIMER.md; do
    if [ -f "$file" ]; then
        echo "✓ $file 存在"
        ((PASSED++))
    else
        echo "✗ $file 缺失"
        ((FAILED++))
    fi
done

echo ""
echo "📖 检查彩票类型文档..."
for lottery in ssq dlt qxc qlc; do
    if [ -f "lotteries/$lottery/README.md" ]; then
        echo "✓ lotteries/$lottery/README.md 存在"
        ((PASSED++))
    else
        echo "✗ lotteries/$lottery/README.md 缺失"
        ((FAILED++))
    fi
done

echo ""
echo "🌐 检查 Worker 文档..."
for file in README.md API_USAGE.md; do
    if [ -f "cloudflare-worker/$file" ]; then
        echo "✓ cloudflare-worker/$file 存在"
        ((PASSED++))
    else
        echo "✗ cloudflare-worker/$file 缺失"
        ((FAILED++))
    fi
done

echo ""

# ============================================================================
# 第三部分：项目清理检查
# ============================================================================

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}第三部分：项目清理检查${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

echo "🧹 检查项目清理..."
PROCESS_DOCS=$(find . -name "*_CHECKLIST.md" -o -name "*_SUMMARY.md" -o -name "*_REPORT.md" 2>/dev/null | grep -v "scripts/" | grep -v "SESSION_HISTORY" | wc -l)
if [ "$PROCESS_DOCS" -eq 0 ]; then
    echo "✓ 未发现过程文档"
    ((PASSED++))
else
    echo "⚠️  发现 $PROCESS_DOCS 个过程文档"
fi

TEMP_TESTS=$(find . -name "test_*.py" -not -path "./tests/*" 2>/dev/null | wc -l)
if [ "$TEMP_TESTS" -eq 0 ]; then
    echo "✓ 未发现临时测试文件"
    ((PASSED++))
else
    echo "⚠️  发现 $TEMP_TESTS 个临时测试文件"
fi

echo ""
echo "📄 检查 .env 文件格式..."
ENV_FORMAT_ERRORS=$(grep -n " = " .env cloudflare-worker/.env 2>/dev/null | wc -l)
if [ "$ENV_FORMAT_ERRORS" -eq 0 ]; then
    echo "✓ .env 文件格式正确"
    ((PASSED++))
else
    echo "⚠️  发现 $ENV_FORMAT_ERRORS 处格式错误"
fi

echo ""

# ============================================================================
# 第四部分：系统环境检查
# ============================================================================

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}第四部分：系统环境检查${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

echo "📦 检查 Python 版本..."
PYTHON_VERSION=$(python --version 2>&1)
echo "  $PYTHON_VERSION"
if python -c "import sys; sys.exit(0 if sys.version_info >= (3, 7) else 1)" 2>/dev/null; then
    echo "  ✓ Python 版本满足要求 (>= 3.7)"
    ((PASSED++))
else
    echo "  ✗ Python 版本过低"
    ((FAILED++))
fi

echo ""
echo "📦 检查依赖包..."
if python -c "import requests" 2>/dev/null; then
    echo "  ✓ requests 已安装"
    ((PASSED++))
else
    echo "  ✗ requests 未安装"
    ((FAILED++))
fi

if python -c "import bs4" 2>/dev/null; then
    echo "  ✓ beautifulsoup4 已安装"
    ((PASSED++))
else
    echo "  ✗ beautifulsoup4 未安装"
    ((FAILED++))
fi

if python -c "import lxml" 2>/dev/null; then
    echo "  ✓ lxml 已安装"
    ((PASSED++))
else
    echo "  ✗ lxml 未安装"
    ((FAILED++))
fi

if python -c "import telegram" 2>/dev/null; then
    echo "  ✓ python-telegram-bot 已安装"
    ((PASSED++))
else
    echo "  ✗ python-telegram-bot 未安装"
    ((FAILED++))
fi

echo ""

# ============================================================================
# 第五部分：lottery.py 命令执行测试
# ============================================================================

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}第五部分：lottery.py 命令执行测试${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

# 5.1 fetch 命令测试 - 按照 lottery.py --help 的顺序
echo "📊 测试 fetch 命令..."
echo ""

echo "  执行: python lottery.py fetch --mode full"
echo "  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
python lottery.py fetch --mode full 2>&1 | tee -a "$LOG_FILE"
FETCH_FULL_EXIT=$?
echo "  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ $FETCH_FULL_EXIT -eq 0 ]; then
    echo "  ✓ fetch --mode full 执行成功"
    ((PASSED++))
else
    echo "  ✗ fetch --mode full 执行失败"
    ((FAILED++))
fi

echo ""

echo "  执行: python lottery.py fetch --mode latest"
echo "  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
python lottery.py fetch --mode latest 2>&1 | tee -a "$LOG_FILE"
FETCH_LATEST_EXIT=$?
echo "  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ $FETCH_LATEST_EXIT -eq 0 ]; then
    echo "  ✓ fetch --mode latest 执行成功"
    ((PASSED++))
else
    echo "  ✗ fetch --mode latest 执行失败"
    ((FAILED++))
fi

echo ""

echo "  执行: python lottery.py fetch ssq --mode full"
echo "  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
python lottery.py fetch ssq --mode full 2>&1 | tee -a "$LOG_FILE"
FETCH_SSQ_FULL_EXIT=$?
echo "  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ $FETCH_SSQ_FULL_EXIT -eq 0 ]; then
    echo "  ✓ fetch ssq --mode full 执行成功"
    ((PASSED++))
else
    echo "  ✗ fetch ssq --mode full 执行失败"
    ((FAILED++))
fi

echo ""

echo "  执行: python lottery.py fetch ssq --mode latest"
echo "  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
python lottery.py fetch ssq --mode latest 2>&1 | tee -a "$LOG_FILE"
FETCH_SSQ_LATEST_EXIT=$?
echo "  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ $FETCH_SSQ_LATEST_EXIT -eq 0 ]; then
    echo "  ✓ fetch ssq --mode latest 执行成功"
    ((PASSED++))
else
    echo "  ✗ fetch ssq --mode latest 执行失败"
    ((FAILED++))
fi

echo ""

echo "  执行: python lottery.py fetch dlt --mode full"
echo "  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
python lottery.py fetch dlt --mode full 2>&1 | tee -a "$LOG_FILE"
FETCH_DLT_FULL_EXIT=$?
echo "  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ $FETCH_DLT_FULL_EXIT -eq 0 ]; then
    echo "  ✓ fetch dlt --mode full 执行成功"
    ((PASSED++))
else
    echo "  ✗ fetch dlt --mode full 执行失败"
    ((FAILED++))
fi

echo ""

echo "  执行: python lottery.py fetch dlt --mode latest"
echo "  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
python lottery.py fetch dlt --mode latest 2>&1 | tee -a "$LOG_FILE"
FETCH_DLT_LATEST_EXIT=$?
echo "  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ $FETCH_DLT_LATEST_EXIT -eq 0 ]; then
    echo "  ✓ fetch dlt --mode latest 执行成功"
    ((PASSED++))
else
    echo "  ✗ fetch dlt --mode latest 执行失败"
    ((FAILED++))
fi

echo ""

echo "  执行: python lottery.py fetch qxc --mode full"
echo "  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
python lottery.py fetch qxc --mode full 2>&1 | tee -a "$LOG_FILE"
FETCH_QXC_FULL_EXIT=$?
echo "  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ $FETCH_QXC_FULL_EXIT -eq 0 ]; then
    echo "  ✓ fetch qxc --mode full 执行成功"
    ((PASSED++))
else
    echo "  ✗ fetch qxc --mode full 执行失败"
    ((FAILED++))
fi

echo ""

echo "  执行: python lottery.py fetch qxc --mode latest"
echo "  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
python lottery.py fetch qxc --mode latest 2>&1 | tee -a "$LOG_FILE"
FETCH_QXC_LATEST_EXIT=$?
echo "  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ $FETCH_QXC_LATEST_EXIT -eq 0 ]; then
    echo "  ✓ fetch qxc --mode latest 执行成功"
    ((PASSED++))
else
    echo "  ✗ fetch qxc --mode latest 执行失败"
    ((FAILED++))
fi

echo ""

echo "  执行: python lottery.py fetch qlc --mode full"
echo "  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
python lottery.py fetch qlc --mode full 2>&1 | tee -a "$LOG_FILE"
FETCH_QLC_FULL_EXIT=$?
echo "  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ $FETCH_QLC_FULL_EXIT -eq 0 ]; then
    echo "  ✓ fetch qlc --mode full 执行成功"
    ((PASSED++))
else
    echo "  ✗ fetch qlc --mode full 执行失败"
    ((FAILED++))
fi

echo ""

echo "  执行: python lottery.py fetch qlc --mode latest"
echo "  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
python lottery.py fetch qlc --mode latest 2>&1 | tee -a "$LOG_FILE"
FETCH_QLC_LATEST_EXIT=$?
echo "  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ $FETCH_QLC_LATEST_EXIT -eq 0 ]; then
    echo "  ✓ fetch qlc --mode latest 执行成功"
    ((PASSED++))
else
    echo "  ✗ fetch qlc --mode latest 执行失败"
    ((FAILED++))
fi

echo ""

# 5.2 predict 命令测试 - 按照 lottery.py --help 的顺序
echo "📊 测试 predict 命令..."
echo ""

echo "  执行: python lottery.py predict"
echo "  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
python lottery.py predict 2>&1 | tee -a "$LOG_FILE"
PREDICT_ALL_EXIT=$?
echo "  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ $PREDICT_ALL_EXIT -eq 0 ]; then
    echo "  ✓ predict 执行成功"
    ((PASSED++))
else
    echo "  ✗ predict 执行失败"
    ((FAILED++))
fi

echo ""

echo "  执行: python lottery.py predict ssq"
echo "  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
python lottery.py predict ssq 2>&1 | tee -a "$LOG_FILE"
PREDICT_SSQ_EXIT=$?
echo "  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ $PREDICT_SSQ_EXIT -eq 0 ]; then
    echo "  ✓ predict ssq 执行成功"
    ((PASSED++))
else
    echo "  ✗ predict ssq 执行失败"
    ((FAILED++))
fi

echo ""

echo "  执行: python lottery.py predict dlt"
echo "  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
python lottery.py predict dlt 2>&1 | tee -a "$LOG_FILE"
PREDICT_DLT_EXIT=$?
echo "  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ $PREDICT_DLT_EXIT -eq 0 ]; then
    echo "  ✓ predict dlt 执行成功"
    ((PASSED++))
else
    echo "  ✗ predict dlt 执行失败"
    ((FAILED++))
fi

echo ""

echo "  执行: python lottery.py predict qxc"
echo "  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
python lottery.py predict qxc 2>&1 | tee -a "$LOG_FILE"
PREDICT_QXC_EXIT=$?
echo "  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ $PREDICT_QXC_EXIT -eq 0 ]; then
    echo "  ✓ predict qxc 执行成功"
    ((PASSED++))
else
    echo "  ✗ predict qxc 执行失败"
    ((FAILED++))
fi

echo ""

echo "  执行: python lottery.py predict qlc"
echo "  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
python lottery.py predict qlc 2>&1 | tee -a "$LOG_FILE"
PREDICT_QLC_EXIT=$?
echo "  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ $PREDICT_QLC_EXIT -eq 0 ]; then
    echo "  ✓ predict qlc 执行成功"
    ((PASSED++))
else
    echo "  ✗ predict qlc 执行失败"
    ((FAILED++))
fi

echo ""

# 5.3 schedule 命令测试 - 在新终端中运行
echo "📊 测试 schedule 命令..."
echo ""

echo "  执行: python lottery.py schedule (在新终端中运行)"
echo "  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
SCHEDULE_LOG="$LOG_DIR/schedule_$(date '+%Y%m%d_%H%M%S').log"

# 在新终端中运行schedule命令，显示完整输出
if command -v open &> /dev/null; then
    # macOS: 使用 open -a Terminal 打开新终端
    open -a Terminal "bash -c 'cd \"$(pwd)\" && python lottery.py schedule 2>&1 | tee \"$SCHEDULE_LOG\"; read -p \"按 Enter 关闭此窗口...\"'"
    echo "  ✓ schedule 命令已在新终端中启动"
elif command -v gnome-terminal &> /dev/null; then
    # Linux (GNOME): 使用 gnome-terminal
    gnome-terminal -- bash -c "cd \"$(pwd)\" && python lottery.py schedule 2>&1 | tee \"$SCHEDULE_LOG\"; read -p \"按 Enter 关闭此窗口...\""
    echo "  ✓ schedule 命令已在新终端中启动"
elif command -v xterm &> /dev/null; then
    # Linux (备选): 使用 xterm
    xterm -e "bash -c 'cd \"$(pwd)\" && python lottery.py schedule 2>&1 | tee \"$SCHEDULE_LOG\"; read -p \"按 Enter 关闭此窗口...\"'"
    echo "  ✓ schedule 命令已在新终端中启动"
else
    # 备选方案：前台运行
    echo "  ⚠️  无法打开新终端，在当前终端运行..."
    python lottery.py schedule 2>&1 | tee -a "$LOG_FILE" "$SCHEDULE_LOG"
fi

echo "  日志文件: $SCHEDULE_LOG"
echo "  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
((PASSED++))

echo ""

# ============================================================================
# 第六部分：cloudflare-worker/scripts/init.sh 命令验证
# ============================================================================

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}第六部分：init.sh 命令验证${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

echo "📋 检查 init.sh 脚本..."

INIT_SCRIPT="cloudflare-worker/scripts/init.sh"

if [ -f "$INIT_SCRIPT" ]; then
    echo "✓ init.sh 脚本存在"
    ((PASSED++))
    
    if [ -x "$INIT_SCRIPT" ]; then
        echo "✓ init.sh 脚本可执行"
        ((PASSED++))
    else
        chmod +x "$INIT_SCRIPT"
        echo "✓ init.sh 脚本已修复权限"
        ((PASSED++))
    fi
    
    # 检查帮助信息中是否包含所有彩票类型
    echo ""
    echo "  检查 init.sh 支持的彩票类型..."
    
    for lottery in ssq dlt qxc qlc; do
        if bash "$INIT_SCRIPT" invalid 2>&1 | grep -q "$lottery"; then
            echo "  ✓ init.sh 支持彩票类型: $lottery"
            ((PASSED++))
        else
            echo "  ✗ init.sh 不支持彩票类型: $lottery"
            ((FAILED++))
        fi
    done
    
    # 检查使用方法中是否包含所有彩票类型
    echo ""
    echo "  检查 init.sh 使用方法..."
    
    for lottery in ssq dlt qxc qlc; do
        if bash "$INIT_SCRIPT" invalid 2>&1 | grep -q "init.sh $lottery"; then
            echo "  ✓ init.sh 使用方法包含: $lottery"
            ((PASSED++))
        else
            echo "  ✗ init.sh 使用方法缺少: $lottery"
            ((FAILED++))
        fi
    done
    
    # 检查初始化循环中是否包含所有彩票类型
    echo ""
    echo "  检查 init.sh 初始化循环..."
    
    for lottery in ssq dlt qxc qlc; do
        if grep -q '\"\$0\" '$lottery "$INIT_SCRIPT"; then
            echo "  ✓ init.sh 初始化循环包含: $lottery"
            ((PASSED++))
        else
            echo "  ✗ init.sh 初始化循环缺少: $lottery"
            ((FAILED++))
        fi
    done
    
    # 检查 case 语句中是否包含所有彩票类型
    echo ""
    echo "  检查 init.sh case 语句..."
    
    for lottery in ssq dlt qxc qlc; do
        if grep -q "$lottery)" "$INIT_SCRIPT"; then
            echo "  ✓ init.sh case 语句包含: $lottery"
            ((PASSED++))
        else
            echo "  ✗ init.sh case 语句缺少: $lottery"
            ((FAILED++))
        fi
    done
else
    echo "✗ init.sh 脚本不存在"
    ((FAILED++))
fi

echo ""

# ============================================================================
# 第七部分：Cloudflare Worker API 端点测试
# ============================================================================

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}第七部分：Cloudflare Worker 初始化和 API 端点测试${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

# 检查 Worker URL 配置
WORKER_URL=$(grep "WORKER_URL" cloudflare-worker/.env 2>/dev/null | cut -d'=' -f2 | tr -d ' ')
API_KEY=$(grep "API_KEY" cloudflare-worker/.env 2>/dev/null | cut -d'=' -f2 | tr -d ' ')

if [ -z "$WORKER_URL" ] || [ "$WORKER_URL" = "https://your-worker.workers.dev" ]; then
    echo "⚠️  Worker URL 未配置或为默认值，跳过 Worker 测试"
    echo "   请在 cloudflare-worker/.env 中配置 WORKER_URL"
    echo ""
else
    echo "📊 测试 Worker 初始化和 API 端点..."
    echo "   Worker URL: $WORKER_URL"
    echo ""
    
    # ========================================================================
    # 第一步：验证 Worker 连接（无依赖）
    # ========================================================================
    echo "  [步骤 1/4] 验证 Worker 连接..."
    echo "  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    # 测试 GET / 端点（首页）
    echo "  执行: GET /"
    RESPONSE=$(curl -s "$WORKER_URL/" 2>&1)
    echo "$RESPONSE" | tee -a "$LOG_FILE" | head -3
    WORKER_CONNECTED=false
    if echo "$RESPONSE" | grep -q "彩票\|Cloudflare"; then
        echo "  ✓ GET / 执行成功"
        ((PASSED++))
        WORKER_CONNECTED=true
    else
        echo "  ✗ GET / 执行失败"
        ((FAILED++))
    fi
    echo ""
    
    # 如果 Worker 连接失败，直接退出
    if [ "$WORKER_CONNECTED" = false ]; then
        echo ""
        echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo -e "${RED}❌ Worker 连接失败，后续测试无意义，直接退出${NC}"
        echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo "✓ 通过: $PASSED 项"
        echo "✗ 失败: $FAILED 项"
        echo ""
        echo "📋 完整日志: $LOG_FILE"
        exit 1
    else
        # ========================================================================
        # 第二步：通过 init.sh 初始化数据库（必须在查询数据之前！）
        # ========================================================================
        echo "  [步骤 2/4] 通过 init.sh 初始化 Worker 数据库..."
        echo "  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        
        INIT_SCRIPT="cloudflare-worker/scripts/init.sh"
        if [ ! -f "$INIT_SCRIPT" ] || [ ! -x "$INIT_SCRIPT" ]; then
            echo "  ✗ init.sh 脚本不存在或不可执行"
            ((FAILED++))
            echo ""
            echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
            echo -e "${RED}❌ init.sh 初始化失败，后续测试无意义，直接退出${NC}"
            echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
            echo "✓ 通过: $PASSED 项"
            echo "✗ 失败: $FAILED 项"
            echo ""
            echo "📋 完整日志: $LOG_FILE"
            exit 1
        fi
        
        # 测试 1: 不带参数 - 全量初始化所有彩票类型
        echo "  [2.1] 执行: $INIT_SCRIPT (不带参数，全量初始化所有彩票类型)"
        echo "  ⏳ 这可能需要较长时间，请耐心等待..."
        bash "$INIT_SCRIPT" 2>&1 | tee -a "$LOG_FILE"
        INIT_EXIT_CODE=${PIPESTATUS[0]}
        
        if [ $INIT_EXIT_CODE -ne 0 ]; then
            echo "  ✗ init.sh 全量初始化失败"
            ((FAILED++))
            echo ""
            echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
            echo -e "${RED}❌ init.sh 初始化失败，后续测试无意义，直接退出${NC}"
            echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
            echo "✓ 通过: $PASSED 项"
            echo "✗ 失败: $FAILED 项"
            echo ""
            echo "📋 完整日志: $LOG_FILE"
            exit 1
        fi
        echo "  ✓ init.sh 全量初始化成功"
        ((PASSED++))
        echo ""
        
        # ========================================================================
        # 第三步：测试每日任务（POST /run）
        # ========================================================================
        if [ "$INIT_SUCCESS" = true ]; then
            echo "  [步骤 3/4] 测试每日任务（POST /run）..."
            echo "  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
            
            echo "  执行: POST /run (执行每日任务：爬取+预测+通知)"
            RESPONSE=$(curl -s -X POST "$WORKER_URL/run" \
                -H "Authorization: Bearer $API_KEY" \
                -H "Content-Type: application/json" 2>&1)
            echo "$RESPONSE" | tee -a "$LOG_FILE"
            if echo "$RESPONSE" | grep -q "success\|complete"; then
                echo "  ✓ POST /run 执行成功"
                ((PASSED++))
            else
                echo "  ⚠️  POST /run 执行可能失败"
            fi
            echo ""
        else
            echo "  ⚠️  初始化失败，跳过每日任务测试"
            echo ""
        fi
        
        # ========================================================================
        # 第四步：查询数据（依赖于前面的初始化和任务执行）
        # ========================================================================
        if [ "$INIT_SUCCESS" = true ]; then
            echo "  [步骤 4/4] 查询数据..."
            echo "  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
            echo ""
        else
            echo "  ⚠️  初始化失败，跳过数据查询测试"
            echo ""
        fi
    fi
    
    # 只有在 Worker 连接成功且初始化成功时，才执行查询测试
    if [ "$WORKER_CONNECTED" = true ] && [ "$INIT_SUCCESS" = true ]; then
    
    # 测试 GET /latest 端点
    echo "  执行: GET /latest"
    echo "  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    RESPONSE=$(curl -s "$WORKER_URL/latest" 2>&1)
    echo "$RESPONSE" | tee -a "$LOG_FILE"
    if echo "$RESPONSE" | grep -q "ssq\|dlt\|qxc\|qlc\|success"; then
        echo "  ✓ GET /latest 执行成功"
        ((PASSED++))
    else
        echo "  ✗ GET /latest 执行失败"
        ((FAILED++))
    fi
    echo ""
    
    # 测试各彩票类型的 /latest/{type} 端点
    for lottery in ssq dlt qxc qlc; do
        echo "  执行: GET /latest/$lottery"
        echo "  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        RESPONSE=$(curl -s "$WORKER_URL/latest/$lottery" 2>&1)
        echo "$RESPONSE" | tee -a "$LOG_FILE"
        if echo "$RESPONSE" | grep -q "success\|lottery\|data"; then
            echo "  ✓ GET /latest/$lottery 执行成功"
            ((PASSED++))
        else
            echo "  ✗ GET /latest/$lottery 执行失败"
            ((FAILED++))
        fi
        echo ""
    done
    
    # 测试 GET /predict 端点
    echo "  执行: GET /predict"
    echo "  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    RESPONSE=$(curl -s "$WORKER_URL/predict" 2>&1)
    echo "$RESPONSE" | tee -a "$LOG_FILE"
    if echo "$RESPONSE" | grep -q "ssq\|dlt\|qxc\|qlc\|success"; then
        echo "  ✓ GET /predict 执行成功"
        ((PASSED++))
    else
        echo "  ✗ GET /predict 执行失败"
        ((FAILED++))
    fi
    echo ""
    
    # 测试各彩票类型的 /predict/{type} 端点
    for lottery in ssq dlt qxc qlc; do
        echo "  执行: GET /predict/$lottery"
        echo "  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        RESPONSE=$(curl -s "$WORKER_URL/predict/$lottery" 2>&1)
        echo "$RESPONSE" | tee -a "$LOG_FILE"
        if echo "$RESPONSE" | grep -q "success\|prediction\|data"; then
            echo "  ✓ GET /predict/$lottery 执行成功"
            ((PASSED++))
        else
            echo "  ✗ GET /predict/$lottery 执行失败"
            ((FAILED++))
        fi
        echo ""
    done
    
    # 测试 GET /strategies 端点
    echo "  执行: GET /strategies"
    echo "  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    RESPONSE=$(curl -s "$WORKER_URL/strategies" 2>&1)
    echo "$RESPONSE" | tee -a "$LOG_FILE"
    if echo "$RESPONSE" | grep -q "frequency\|random\|balanced\|coldHot\|success"; then
        echo "  ✓ GET /strategies 执行成功"
        ((PASSED++))
    else
        echo "  ✗ GET /strategies 执行失败"
        ((FAILED++))
    fi
    echo ""
    
    # 测试各彩票类型的 /strategies/{type} 端点
    for lottery in ssq dlt qxc qlc; do
        echo "  执行: GET /strategies/$lottery"
        echo "  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        RESPONSE=$(curl -s "$WORKER_URL/strategies/$lottery" 2>&1)
        echo "$RESPONSE" | tee -a "$LOG_FILE"
        if echo "$RESPONSE" | grep -q "frequency\|random\|balanced\|coldHot\|success"; then
            echo "  ✓ GET /strategies/$lottery 执行成功"
            ((PASSED++))
        else
            echo "  ✗ GET /strategies/$lottery 执行失败"
            ((FAILED++))
        fi
        echo ""
    done
    
    # 测试 GET /stats 端点
    echo "  执行: GET /stats"
    echo "  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    RESPONSE=$(curl -s "$WORKER_URL/stats" 2>&1)
    echo "$RESPONSE" | tee -a "$LOG_FILE"
    if echo "$RESPONSE" | grep -q "success\|stats\|data"; then
        echo "  ✓ GET /stats 执行成功"
        ((PASSED++))
    else
        echo "  ✗ GET /stats 执行失败"
        ((FAILED++))
    fi
    echo ""
    
    # 测试各彩票类型的 /stats/{type} 端点
    for lottery in ssq dlt qxc qlc; do
        echo "  执行: GET /stats/$lottery"
        echo "  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        RESPONSE=$(curl -s "$WORKER_URL/stats/$lottery" 2>&1)
        echo "$RESPONSE" | tee -a "$LOG_FILE"
        if echo "$RESPONSE" | grep -q "success\|stats\|data"; then
            echo "  ✓ GET /stats/$lottery 执行成功"
            ((PASSED++))
        else
            echo "  ✗ GET /stats/$lottery 执行失败"
            ((FAILED++))
        fi
        echo ""
    done
    fi
fi

echo ""

# ============================================================================
# 第八部分：集成检查（如果指定了彩票类型）
# ============================================================================

if [ -n "$LOTTERY_TYPE" ]; then
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}第八部分：集成检查 ($LOTTERY_TYPE)${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
    
    echo "📝 检查 Python 文件..."
    for file in core/config.py cli/smart_fetch.py cli/fetch.py cli/predict.py cli/schedule.py core/telegram_bot.py lottery.py; do
        if [ -f "$file" ]; then
            if grep -q "$LOTTERY_TYPE" "$file"; then
                echo "✓ $file 包含 $LOTTERY_TYPE"
                ((PASSED++))
            else
                echo "✗ $file 缺少 $LOTTERY_TYPE"
                ((FAILED++))
            fi
        fi
    done
    
    echo ""
    echo "🌐 检查 Worker 文件..."
    for file in cloudflare-worker/src/index.js cloudflare-worker/src/utils/database.js cloudflare-worker/schema.sql; do
        if [ -f "$file" ]; then
            if grep -q "$LOTTERY_TYPE" "$file"; then
                echo "✓ $file 包含 $LOTTERY_TYPE"
                ((PASSED++))
            else
                echo "✗ $file 缺少 $LOTTERY_TYPE"
                ((FAILED++))
            fi
        fi
    done
    
    echo ""
    echo "📦 检查模块文件..."
    MODULE_DIR="lotteries/$LOTTERY_TYPE"
    if [ -d "$MODULE_DIR" ]; then
        echo "✓ $MODULE_DIR 目录存在"
        ((PASSED++))
        
        for file in spider.py database.py predictor.py __init__.py; do
            if [ -f "$MODULE_DIR/$file" ]; then
                echo "  ✓ $file 存在"
                ((PASSED++))
            else
                echo "  ✗ $file 缺失"
                ((FAILED++))
            fi
        done
    else
        echo "✗ $MODULE_DIR 目录不存在"
        ((FAILED++))
    fi
    
    echo ""
    echo "🌐 检查 Worker 模块..."
    for file in cloudflare-worker/src/spiders/$LOTTERY_TYPE.js cloudflare-worker/src/predictors/$LOTTERY_TYPE.js; do
        if [ -f "$file" ]; then
            echo "✓ $file 存在"
            ((PASSED++))
        else
            echo "✗ $file 缺失"
            ((FAILED++))
        fi
    done
    
    echo ""
fi



# ============================================================================
# 总结
# ============================================================================

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}检查结果总结${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

echo "✓ 通过: $PASSED 项"
echo "⚠️  警告: $WARNINGS 项"
echo "✗ 失败: $FAILED 项"
echo ""
echo "📋 完整日志: $LOG_FILE"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ 所有检查通过！${NC}"
    if [ -n "$LOTTERY_TYPE" ]; then
        echo -e "${GREEN}✅ $LOTTERY_TYPE 集成完整！${NC}"
    fi
    exit 0
else
    echo -e "${RED}❌ 发现 $FAILED 项失败，请检查${NC}"
    exit 1
fi
