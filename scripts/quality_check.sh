#!/bin/bash

echo "🔍 开始质量检查..."

# 1. 语法检查
echo "\n📝 检查 Python 语法..."
find . -name "*.py" -not -path "./venv/*" -not -path "./.venv/*" -not -path "./node_modules/*" -exec python -m py_compile {} \; 2>&1 | head -20

# 2. 配置验证
echo "\n⚙️  验证配置..."
python -c "
from core.config import SUPPORTED_LOTTERIES, LOTTERY_NAMES
assert len(SUPPORTED_LOTTERIES) == len(LOTTERY_NAMES), '彩票类型数量不匹配'
assert set(SUPPORTED_LOTTERIES) == set(LOTTERY_NAMES.keys()), '彩票类型不一致'
print(f'✓ 支持的彩票类型: {SUPPORTED_LOTTERIES}')
print(f'✓ 彩票名称映射: {list(LOTTERY_NAMES.keys())}')
"

# 3. 模块验证
echo "\n📦 验证模块..."
python -c "
from cli.smart_fetch import get_lottery_modules
for lottery_type in ['ssq', 'dlt', 'qxc', 'qlc']:
    try:
        modules = get_lottery_modules(lottery_type)
        print(f'✓ {lottery_type}: {modules[\"name\"]}')
    except Exception as e:
        print(f'✗ {lottery_type}: {e}')
"

# 4. 搜索遗漏
echo "\n🔎 搜索可能的遗漏..."
echo "检查是否所有提到 ssq, dlt, qxc 的地方都包含了 qlc..."
MISSING=$(grep -r "ssq.*dlt.*qxc" --include="*.py" --include="*.js" --exclude-dir=node_modules --exclude-dir=venv --exclude-dir=.venv . 2>/dev/null | grep -v "qlc" | grep -v ".md" | grep -v "SESSION_HISTORY" | grep -v "INTEGRATION_CHECKLIST" | wc -l)
if [ "$MISSING" -eq 0 ]; then
    echo "✓ 未发现遗漏"
else
    echo "⚠️  发现 $MISSING 处可能的遗漏，请检查："
    grep -r "ssq.*dlt.*qxc" --include="*.py" --include="*.js" --exclude-dir=node_modules --exclude-dir=venv --exclude-dir=.venv . 2>/dev/null | grep -v "qlc" | grep -v ".md" | grep -v "SESSION_HISTORY" | grep -v "INTEGRATION_CHECKLIST" | head -5
fi

# 5. 文档检查
echo "\n📚 检查文档完整性..."
for file in README.md TECHNICAL_DOCUMENTATION.md CHANGELOG.md DISCLAIMER.md; do
    if [ -f "$file" ]; then
        echo "✓ $file 存在"
    else
        echo "✗ $file 缺失"
    fi
done

# 6. 彩票类型文档检查
echo "\n📖 检查彩票类型文档..."
for lottery in ssq dlt qxc qlc; do
    if [ -f "lotteries/$lottery/README.md" ]; then
        echo "✓ lotteries/$lottery/README.md 存在"
    else
        echo "✗ lotteries/$lottery/README.md 缺失"
    fi
done

# 7. Worker 文档检查
echo "\n🌐 检查 Worker 文档..."
for file in README.md API_USAGE.md; do
    if [ -f "cloudflare-worker/$file" ]; then
        echo "✓ cloudflare-worker/$file 存在"
    else
        echo "✗ cloudflare-worker/$file 缺失"
    fi
done

# 8. 项目清理检查
echo "\n🧹 检查项目清理..."

# 检查过程文档
PROCESS_DOCS=$(find . -name "*_CHECKLIST.md" -o -name "*_SUMMARY.md" -o -name "*_REPORT.md" 2>/dev/null | grep -v "scripts/" | grep -v "SESSION_HISTORY" | wc -l)
if [ "$PROCESS_DOCS" -eq 0 ]; then
    echo "✓ 未发现过程文档"
else
    echo "⚠️  发现 $PROCESS_DOCS 个可能的过程文档："
    find . -name "*_CHECKLIST.md" -o -name "*_SUMMARY.md" -o -name "*_REPORT.md" 2>/dev/null | grep -v "scripts/" | grep -v "SESSION_HISTORY" | head -5
fi

# 检查临时测试文件
TEMP_TESTS=$(find . -name "test_*.py" -not -path "./tests/*" 2>/dev/null | wc -l)
if [ "$TEMP_TESTS" -eq 0 ]; then
    echo "✓ 未发现临时测试文件"
else
    echo "⚠️  发现 $TEMP_TESTS 个临时测试文件："
    find . -name "test_*.py" -not -path "./tests/*" 2>/dev/null | head -5
fi

# 9. 配置一致性检查
echo "\n🔧 检查配置一致性..."
python -c "
from core.config import SUPPORTED_LOTTERIES, LOTTERY_NAMES
try:
    assert set(SUPPORTED_LOTTERIES) == set(LOTTERY_NAMES.keys()), '彩票类型不一致'
    print('✓ SUPPORTED_LOTTERIES 与 LOTTERY_NAMES 一致')
except AssertionError as e:
    print(f'✗ 配置不一致: {e}')
    exit(1)
"

echo "\n✅ 质量检查完成！"
