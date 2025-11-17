#!/bin/bash

# 自动初始化脚本
# 用于首次运行时分批导入历史数据

# 配置
WORKER_URL="https://your-worker.workers.dev"
API_KEY="your-api-key"
MAX_ITERATIONS=50  # 最多执行 50 次
SLEEP_TIME=120     # 每次间隔 120 秒（2 分钟）

echo "🚀 开始自动初始化..."
echo "Worker URL: $WORKER_URL"
echo "最多执行: $MAX_ITERATIONS 次"
echo "每次间隔: $SLEEP_TIME 秒"
echo ""

# 检查配置
if [ "$WORKER_URL" = "https://your-worker.workers.dev" ]; then
  echo "❌ 错误：请先修改脚本中的 WORKER_URL"
  exit 1
fi

if [ "$API_KEY" = "your-api-key" ]; then
  echo "❌ 错误：请先修改脚本中的 API_KEY"
  exit 1
fi

# 执行初始化
for i in $(seq 1 $MAX_ITERATIONS); do
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "📊 执行第 $i 次..."
  echo ""
  
  # 调用 API
  response=$(curl -s -X POST "$WORKER_URL/run" \
    -H "Authorization: Bearer $API_KEY" \
    -H "Content-Type: application/json")
  
  # 显示响应
  echo "$response" | jq '.' 2>/dev/null || echo "$response"
  echo ""
  
  # 检查是否完成
  if echo "$response" | grep -q "数据已是最新"; then
    echo "✅ 初始化完成！数据已是最新"
    exit 0
  fi
  
  # 检查是否成功
  if echo "$response" | grep -q '"success":true'; then
    echo "✅ 本批次成功"
  else
    echo "⚠️  本批次可能失败，继续尝试..."
  fi
  
  # 如果不是最后一次，等待
  if [ $i -lt $MAX_ITERATIONS ]; then
    echo ""
    echo "⏳ 等待 $SLEEP_TIME 秒后继续..."
    sleep $SLEEP_TIME
  fi
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "⚠️  已执行 $MAX_ITERATIONS 次"
echo "💡 如果数据还未完整，请再次运行此脚本"
