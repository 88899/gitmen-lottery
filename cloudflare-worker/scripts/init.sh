#!/bin/bash

# 自动初始化脚本
# 用于首次运行时分批导入历史数据

# 配置
WORKER_URL=""
API_KEY=""
MAX_ITERATIONS=50  # 最多执行 50 次
SLEEP_TIME=120     # 每次间隔 120 秒（2 分钟）

# 代理配置（如果需要）
# 取消下面的注释并设置你的代理端口
PROXY_PORT=7897
USE_PROXY=true

# 设置代理
if [ "$USE_PROXY" = "true" ]; then
  export http_proxy="http://127.0.0.1:$PROXY_PORT"
  export https_proxy="http://127.0.0.1:$PROXY_PORT"
  echo "🔧 使用代理: 127.0.0.1:$PROXY_PORT"
fi

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
  
  # 调用 /init API（全量爬取模式）
  response=$(curl -s -X POST "$WORKER_URL/init" \
    -H "Authorization: Bearer $API_KEY" \
    -H "Content-Type: application/json")
  
  # 显示响应
  echo "$response" | jq '.' 2>/dev/null || echo "$response"
  echo ""
  
  # 提取数据
  inserted=$(echo "$response" | jq -r '.inserted // 0' 2>/dev/null)
  skipped=$(echo "$response" | jq -r '.skipped // 0' 2>/dev/null)
  total=$(echo "$response" | jq -r '.total // 0' 2>/dev/null)
  
  # 检查是否成功
  if echo "$response" | grep -q '"success":true'; then
    echo "✅ 本批次成功"
    echo "   新增: $inserted 条"
    echo "   跳过: $skipped 条"
    echo "   总计: $total 条"
    
    # 如果跳过的数量等于批次大小，说明这批数据都已存在
    # 可能已经爬取完成
    if [ "$skipped" -ge 90 ] && [ "$inserted" -le 10 ]; then
      echo ""
      echo "⚠️  本批次大部分数据已存在（跳过 $skipped 条）"
      echo "可能已经爬取完成，或者需要爬取更早的数据"
      echo ""
      echo "建议："
      echo "  1. 检查数据量是否足够：curl -s \"$WORKER_URL/stats\" | jq '.total_count'"
      echo "  2. 如果数据量 < 1000，继续运行此脚本"
      echo "  3. 如果数据量 >= 1000，可以停止"
    fi
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
