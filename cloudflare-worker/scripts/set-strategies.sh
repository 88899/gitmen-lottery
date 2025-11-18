#!/bin/bash

# 设置默认预测策略
# 用途：配置 Worker 的默认预测策略

set -e

# 显示使用说明
show_usage() {
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "🎯 设置默认预测策略"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  echo "用法: $0 <策略列表>"
  echo ""
  echo "可用策略:"
  echo "  frequency  - 频率策略（基于历史高频号码）"
  echo "  random     - 随机策略（完全随机）"
  echo "  balanced   - 均衡策略（追求号码分布均衡）"
  echo "  coldHot    - 冷热号策略（结合冷热号）"
  echo ""
  echo "示例:"
  echo "  $0 frequency                    # 单个策略"
  echo "  $0 frequency,balanced           # 多个策略"
  echo "  $0 frequency,balanced,coldHot   # 三个策略组合"
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  exit 1
}

# 检查参数
if [ $# -eq 0 ]; then
  show_usage
fi

STRATEGIES="$1"

# 验证策略名称
VALID_STRATEGIES="frequency random balanced coldHot"
IFS=',' read -ra STRATEGY_ARRAY <<< "$STRATEGIES"

for strategy in "${STRATEGY_ARRAY[@]}"; do
  strategy=$(echo "$strategy" | xargs) # 去除空格
  if [[ ! " $VALID_STRATEGIES " =~ " $strategy " ]]; then
    echo "❌ 错误: 无效的策略名称 '$strategy'"
    echo ""
    show_usage
  fi
done

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎯 设置默认预测策略"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "策略: $STRATEGIES"
echo ""

# 方法1: 更新 wrangler.toml
echo "📝 步骤1: 更新 wrangler.toml"
if [ -f wrangler.toml ]; then
  # 检查是否已存在 DEFAULT_STRATEGIES 配置
  if grep -q "DEFAULT_STRATEGIES" wrangler.toml; then
    # 更新现有配置
    if [[ "$OSTYPE" == "darwin"* ]]; then
      # macOS
      sed -i '' "s/DEFAULT_STRATEGIES = .*/DEFAULT_STRATEGIES = \"$STRATEGIES\"/" wrangler.toml
    else
      # Linux
      sed -i "s/DEFAULT_STRATEGIES = .*/DEFAULT_STRATEGIES = \"$STRATEGIES\"/" wrangler.toml
    fi
    echo "   ✅ 已更新 wrangler.toml"
  else
    # 添加新配置
    echo "DEFAULT_STRATEGIES = \"$STRATEGIES\"" >> wrangler.toml
    echo "   ✅ 已添加到 wrangler.toml"
  fi
else
  echo "   ⚠️  未找到 wrangler.toml"
fi

echo ""

# 方法2: 更新 KV 存储
echo "📝 步骤2: 更新 KV 存储"
if command -v wrangler &> /dev/null; then
  wrangler kv:key put --binding=KV_BINDING "DEFAULT_STRATEGIES" "$STRATEGIES" 2>/dev/null && \
    echo "   ✅ 已更新 KV 存储" || \
    echo "   ⚠️  KV 更新失败（可能需要先登录: wrangler login）"
else
  echo "   ⚠️  未安装 wrangler CLI"
fi

echo ""

# 方法3: 更新 .env 文件
echo "📝 步骤3: 更新 .env 文件"
if [ -f .env ]; then
  if grep -q "DEFAULT_STRATEGIES" .env; then
    # 更新现有配置
    if [[ "$OSTYPE" == "darwin"* ]]; then
      sed -i '' "s/DEFAULT_STRATEGIES=.*/DEFAULT_STRATEGIES=$STRATEGIES/" .env
    else
      sed -i "s/DEFAULT_STRATEGIES=.*/DEFAULT_STRATEGIES=$STRATEGIES/" .env
    fi
    echo "   ✅ 已更新 .env"
  else
    # 添加新配置
    echo "" >> .env
    echo "# 预测策略配置" >> .env
    echo "DEFAULT_STRATEGIES=$STRATEGIES" >> .env
    echo "   ✅ 已添加到 .env"
  fi
else
  echo "   ⚠️  未找到 .env 文件"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ 配置完成"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📌 下一步:"
echo "   1. 重新部署 Worker: wrangler publish"
echo "   2. 测试预测接口: curl \"\${WORKER_URL}/predict?count=5\""
echo ""
echo "💡 提示:"
echo "   - API 请求可以覆盖默认策略"
echo "   - 例如: curl \"\${WORKER_URL}/predict?count=5&strategies=random\""
echo ""
