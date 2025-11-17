#!/bin/bash

# 带代理的自动初始化脚本
# 用于首次运行时分批导入历史数据

# 配置
WORKER_URL="https://lottery-prediction.githubmen.workers.dev"
API_KEY="6690_042:A644AEpYn_658"
PROXY_PORT=7897
MAX_ITERATIONS=50
SLEEP_TIME=120

# 设置代理
export http_proxy="http://127.0.0.1:$PROXY_PORT"
export https_proxy="http://127.0.0.1:$PROXY_PORT"

echo "🚀 开始自动初始化（使用代理）"
echo "================================"
echo "Worker URL: $WORKER_URL"
echo "代理: 127.0.0.1:$PROXY_PORT"
echo "最多执行: $MAX_ITERATIONS 次"
echo "每次间隔: $SLEEP_TIME 秒"
echo ""

# 先测试连接
echo "🔍 测试连接..."
test_response=$(curl -s --max-time 10 "$WORKER_URL")
if echo "$test_response" | grep -q "彩票预测系统"; then
  echo "✅ Worker 可访问"
else
  echo "❌ Worker 无法访问"
  echo "请检查："
  echo "  1. 代理是否正确（端口 $PROXY_PORT）"
  echo "  2. Worker URL 是否正确"
  exit 1
fi

echo ""

# 检查当前数据量
echo "📊 检查当前数据量..."
stats=$(curl -s --max-time 10 "$WORKER_URL/stats")
current_count=$(echo "$stats" | grep -o '"total_count":[0-9]*' | cut -d: -f2)
echo "当前数据库中有 $current_count 条数据"
echo ""

# 执行初始化
for i in $(seq 1 $MAX_ITERATIONS); do
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "📊 执行第 $i 次..."
  echo "时间: $(date '+%Y-%m-%d %H:%M:%S')"
  echo ""
  
  # 调用 API（增加超时时间到 180 秒）
  echo "⏳ 正在调用 API（最多等待 180 秒）..."
  response=$(curl -s --max-time 180 -X POST "$WORKER_URL/run" \
    -H "Authorization: Bearer $API_KEY" \
    -H "Content-Type: application/json" 2>&1)
  
  # 检查是否超时
  if echo "$response" | grep -q "timed out"; then
    echo "⚠️  请求超时（Worker 可能在处理大量数据）"
    echo "这是正常的，Worker 可能仍在后台处理"
    echo ""
    
    # 等待一段时间后检查数据量
    echo "⏳ 等待 30 秒后检查数据量..."
    sleep 30
    
    new_stats=$(curl -s --max-time 10 "$WORKER_URL/stats")
    new_count=$(echo "$new_stats" | grep -o '"total_count":[0-9]*' | cut -d: -f2)
    
    if [ "$new_count" -gt "$current_count" ]; then
      echo "✅ 数据量增加了！从 $current_count 增加到 $new_count"
      current_count=$new_count
    else
      echo "⚠️  数据量没有变化，可能需要检查 Worker 日志"
    fi
  else
    # 显示响应
    echo "响应:"
    echo "$response" | jq '.' 2>/dev/null || echo "$response"
    echo ""
    
    # 检查是否完成
    if echo "$response" | grep -q "数据已是最新"; then
      echo "✅ 初始化完成！数据已是最新"
      
      # 显示最终统计
      final_stats=$(curl -s --max-time 10 "$WORKER_URL/stats")
      echo ""
      echo "📊 最终统计:"
      echo "$final_stats" | jq '.' 2>/dev/null || echo "$final_stats"
      exit 0
    fi
    
    # 检查是否成功
    if echo "$response" | grep -q '"success":true'; then
      echo "✅ 本批次成功"
      
      # 更新数据量
      new_stats=$(curl -s --max-time 10 "$WORKER_URL/stats")
      new_count=$(echo "$new_stats" | grep -o '"total_count":[0-9]*' | cut -d: -f2)
      if [ "$new_count" -gt "$current_count" ]; then
        added=$((new_count - current_count))
        echo "📈 新增 $added 条数据（总计: $new_count 条）"
        current_count=$new_count
      fi
    else
      echo "⚠️  本批次可能失败"
      echo "响应内容: $response"
    fi
  fi
  
  # 如果不是最后一次，等待
  if [ $i -lt $MAX_ITERATIONS ]; then
    echo ""
    echo "⏳ 等待 $SLEEP_TIME 秒后继续..."
    echo "（你可以按 Ctrl+C 停止）"
    sleep $SLEEP_TIME
  fi
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "⚠️  已执行 $MAX_ITERATIONS 次"
echo ""

# 显示最终统计
final_stats=$(curl -s --max-time 10 "$WORKER_URL/stats")
final_count=$(echo "$final_stats" | grep -o '"total_count":[0-9]*' | cut -d: -f2)
echo "📊 最终数据量: $final_count 条"
echo ""
echo "💡 如果数据还未完整，请再次运行此脚本"
echo "💡 或者查看 Cloudflare Dashboard 的 Worker 日志获取详细信息"
