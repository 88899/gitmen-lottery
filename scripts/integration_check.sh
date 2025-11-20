#!/bin/bash

LOTTERY_TYPE=$1

if [ -z "$LOTTERY_TYPE" ]; then
    echo "用法: $0 <lottery_type>"
    echo "示例: $0 qlc"
    exit 1
fi

echo "🔍 检查 $LOTTERY_TYPE 的集成完整性..."
echo ""

# 定义检查项
declare -A CHECKS=(
    ["core/config.py"]="SUPPORTED_LOTTERIES.*$LOTTERY_TYPE"
    ["core/config.py"]="LOTTERY_NAMES.*$LOTTERY_TYPE"
    ["cli/smart_fetch.py"]="'$LOTTERY_TYPE':"
    ["cli/fetch.py"]="lottery_type == '$LOTTERY_TYPE'"
    ["cli/predict.py"]="lottery_type == '$LOTTERY_TYPE'"
    ["cli/schedule.py"]="'$LOTTERY_TYPE'"
    ["core/telegram_bot.py"]="lottery_type == '$LOTTERY_TYPE'"
    ["lottery.py"]="'$LOTTERY_TYPE'"
)

PASSED=0
FAILED=0

# 检查 Python 文件
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
    else
        echo "⚠️  $file 不存在"
    fi
done

# 检查 Worker 文件
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
    else
        echo "⚠️  $file 不存在"
    fi
done

# 检查模块文件
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

# 检查 Worker 模块文件
echo ""
echo "🌐 检查 Worker 模块文件..."
for file in cloudflare-worker/src/spiders/$LOTTERY_TYPE.js cloudflare-worker/src/predictors/$LOTTERY_TYPE.js; do
    if [ -f "$file" ]; then
        echo "✓ $file 存在"
        ((PASSED++))
    else
        echo "✗ $file 缺失"
        ((FAILED++))
    fi
done

# 功能测试
echo ""
echo "🧪 功能测试..."
python -c "
try:
    from cli.smart_fetch import get_lottery_modules
    modules = get_lottery_modules('$LOTTERY_TYPE')
    print(f'✓ 模块配置正确: {modules[\"name\"]}')
except Exception as e:
    print(f'✗ 模块配置错误: {e}')
    exit(1)
"
if [ $? -eq 0 ]; then
    ((PASSED++))
else
    ((FAILED++))
fi

# 总结
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "检查结果: ✓ $PASSED 项通过, ✗ $FAILED 项失败"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ $FAILED -eq 0 ]; then
    echo "✅ $LOTTERY_TYPE 集成完整！"
    exit 0
else
    echo "❌ $LOTTERY_TYPE 集成不完整，请检查失败项"
    exit 1
fi
