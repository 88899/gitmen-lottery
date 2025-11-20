#!/bin/bash

# 彩票数据初始化脚本
# 功能：批量导入历史数据，支持断点续传，自动管理每日请求限制

# 获取脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# 加载 .env 配置文件
ENV_FILE="$PROJECT_DIR/.env"
if [ -f "$ENV_FILE" ]; then
  set -a
  source "$ENV_FILE"
  set +a
else
  echo "❌ 错误：未找到配置文件 $ENV_FILE"
  echo "💡 请先配置："
  echo "   cp $PROJECT_DIR/.env.example $PROJECT_DIR/.env"
  echo "   vim $PROJECT_DIR/.env"
  exit 1
fi

# 配置（可在 .env 文件中覆盖）
SLEEP_TIME=${SLEEP_TIME:-30}  # 优化：减少等待时间到30秒
MAX_NO_NEW_DATA=3  # 优化：连续3次没有数据就停止（考虑跨年情况）
DAILY_REQUEST_LIMIT=${DAILY_REQUEST_LIMIT:-1000}  # 优化：增加每日限制（小批量处理）
AUTO_CONTINUE=${AUTO_CONTINUE:-false}  # 是否自动跨天继续

# 设置代理
if [ "$USE_PROXY" = "true" ]; then
  export http_proxy="http://127.0.0.1:$PROXY_PORT"
  export https_proxy="http://127.0.0.1:$PROXY_PORT"
  echo "🔧 使用代理: 127.0.0.1:$PROXY_PORT"
fi

# 彩票类型（可通过参数指定，不指定则处理所有类型）
LOTTERY_TYPE=${1:-}

# 如果没有指定类型，处理所有类型
if [ -z "$LOTTERY_TYPE" ]; then
  echo ""
  echo "🚀 初始化所有彩票类型"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  
  # 初始化双色球
  echo "📊 开始初始化双色球..."
  "$0" ssq
  
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  
  # 初始化大乐透
  echo "📊 开始初始化大乐透..."
  "$0" dlt
  
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "✅ 所有彩票类型初始化完成！"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  exit 0
fi

# 验证彩票类型
if [ "$LOTTERY_TYPE" != "ssq" ] && [ "$LOTTERY_TYPE" != "dlt" ]; then
  echo "❌ 错误：不支持的彩票类型 '$LOTTERY_TYPE'"
  echo "💡 支持的类型："
  echo "   ssq - 双色球"
  echo "   dlt - 大乐透"
  echo "   (空) - 所有类型"
  echo ""
  echo "使用方法："
  echo "   $0       # 初始化所有类型"
  echo "   $0 ssq   # 仅初始化双色球"
  echo "   $0 dlt   # 仅初始化大乐透"
  exit 1
fi

# 设置彩票名称
case "$LOTTERY_TYPE" in
  ssq)
    LOTTERY_NAME="双色球"
    ;;
  dlt)
    LOTTERY_NAME="大乐透"
    ;;
esac

echo ""
echo "🚀 ${LOTTERY_NAME}数据初始化"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "彩票类型: $LOTTERY_TYPE ($LOTTERY_NAME)"
echo "Worker URL: $WORKER_URL"
echo "每日限制: $DAILY_REQUEST_LIMIT 次"
echo "爬取间隔: $SLEEP_TIME 秒"
echo "自动跨天: $([ "$AUTO_CONTINUE" = "true" ] && echo "是" || echo "否")"
echo ""

# 检查配置
if [ "$WORKER_URL" = "https://your-worker.workers.dev" ] || [ -z "$WORKER_URL" ]; then
  echo "❌ 错误：请先配置 WORKER_URL"
  exit 1
fi

if [ "$API_KEY" = "your-api-key" ] || [ -z "$API_KEY" ]; then
  echo "❌ 错误：请先配置 API_KEY"
  exit 1
fi

# 初始化计数器
iteration=0
no_new_data_count=0
last_total=0
today=$(date '+%Y-%m-%d')
request_count_file="/tmp/lottery_init_count_${today}.txt"

# 读取今天已经执行的次数
if [ -f "$request_count_file" ]; then
  today_requests=$(cat "$request_count_file")
else
  today_requests=0
fi

echo "📊 今日已执行: $today_requests/$DAILY_REQUEST_LIMIT 次"
echo ""

# 主循环
while true; do
  # 检查日期是否变化（跨天）
  current_date=$(date '+%Y-%m-%d')
  if [ "$current_date" != "$today" ]; then
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "📅 日期变更: $today → $current_date"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    today=$current_date
    today_requests=0
    request_count_file="/tmp/lottery_init_count_${today}.txt"
    echo "✅ 重置今日请求计数器"
    echo ""
  fi
  
  iteration=$((iteration + 1))
  today_requests=$((today_requests + 1))
  
  # 检查是否达到每日限制
  if [ "$today_requests" -gt "$DAILY_REQUEST_LIMIT" ]; then
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "⏸️  已达到今日请求限制"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "📊 今日统计："
    echo "   执行次数: $today_requests 次"
    echo "   数据库数据量: $last_total 条"
    echo ""
    
    # 保存今日请求次数
    echo "$today_requests" > "$request_count_file"
    
    if [ "$AUTO_CONTINUE" = "true" ]; then
      # 自动跨天继续
      tomorrow=$(date -v+1d '+%Y-%m-%d 00:00:00' 2>/dev/null || date -d 'tomorrow 00:00:00' '+%Y-%m-%d %H:%M:%S')
      now=$(date '+%s')
      tomorrow_ts=$(date -j -f '%Y-%m-%d %H:%M:%S' "$tomorrow" '+%s' 2>/dev/null || date -d "$tomorrow" '+%s')
      wait_seconds=$((tomorrow_ts - now))
      wait_hours=$((wait_seconds / 3600))
      wait_minutes=$(((wait_seconds % 3600) / 60))
      
      echo "⏰ 将在 $wait_hours 小时 $wait_minutes 分钟后（明天 00:00）自动继续"
      echo "   （按 Ctrl+C 可停止）"
      echo ""
      
      sleep $wait_seconds
      continue
    else
      # 手动模式，停止并提示
      echo "💡 建议："
      echo "  1. 明天再次运行此脚本继续爬取"
      echo "  2. 或在 .env 中设置 AUTO_CONTINUE=true 自动跨天继续"
      echo "  3. 或调整 DAILY_REQUEST_LIMIT（当前: $DAILY_REQUEST_LIMIT）"
      echo ""
      exit 0
    fi
  fi
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "📊 执行第 $iteration 次..."
  echo "时间: $(date '+%Y-%m-%d %H:%M:%S')"
  echo ""
  
  # 调用 /init/{type} API（全量爬取模式）
  response=$(curl -s -X POST "$WORKER_URL/init/$LOTTERY_TYPE" \
    -H "Authorization: Bearer $API_KEY" \
    -H "Content-Type: application/json")
  
  # 显示响应
  echo "$response" | jq '.' 2>/dev/null || echo "$response"
  echo ""
  
  # 提取数据
  inserted=$(echo "$response" | jq -r '.inserted // 0' 2>/dev/null)
  skipped=$(echo "$response" | jq -r '.skipped // 0' 2>/dev/null)
  total=$(echo "$response" | jq -r '.total // 0' 2>/dev/null)
  
  # 提取数据源和参数信息
  dataSource=$(echo "$response" | jq -r '.dataSource // "未知"' 2>/dev/null)
  queryParams=$(echo "$response" | jq -r '.queryParams // {}' 2>/dev/null)
  
  # 检查是否成功
  if echo "$response" | grep -q '"success":true'; then
    echo "✅ 本批次成功"
    echo "   新增: $inserted 条"
    echo "   跳过: $skipped 条"
    echo "   当前总计: $total 条"
    echo "   数据源: $dataSource"
    
    # 显示查询参数
    if [ "$dataSource" = "500.com" ]; then
      start=$(echo "$queryParams" | jq -r '.start // ""' 2>/dev/null)
      end=$(echo "$queryParams" | jq -r '.end // ""' 2>/dev/null)
      if [ -n "$start" ] && [ -n "$end" ]; then
        echo "   查询参数: start=$start, end=$end"
      fi
    elif [ "$dataSource" = "中彩网" ]; then
      startDate=$(echo "$queryParams" | jq -r '.startDate // ""' 2>/dev/null)
      endDate=$(echo "$queryParams" | jq -r '.endDate // ""' 2>/dev/null)
      if [ -n "$startDate" ] && [ -n "$endDate" ]; then
        echo "   查询参数: startDate=$startDate, endDate=$endDate"
      fi
    fi
    
    # 检查是否有新数据
    if [ "$total" -eq "$last_total" ] || [ "$inserted" -eq 0 ]; then
      no_new_data_count=$((no_new_data_count + 1))
      echo ""
      echo "⚠️  本批次没有新增数据（连续 $no_new_data_count 次）"
      
      # 检查是否需要跨年
      needsCrossYear=$(echo "$response" | jq -r 'if .needsCrossYear == null then false else .needsCrossYear end' 2>/dev/null)
      currentYear=$(echo "$response" | jq -r '.currentYear // 0' 2>/dev/null)
      hasMore=$(echo "$response" | jq -r 'if .hasMore == null then true else .hasMore end' 2>/dev/null)
      
      if [ "$needsCrossYear" = "true" ]; then
        echo "📅 检测到年底，当前年份: $currentYear"
        echo "🔄 准备跨年继续爬取..."
        # 重置无数据计数器，因为跨年是正常的
        no_new_data_count=0
      elif [ "$hasMore" = "false" ] || [ "$no_new_data_count" -ge "$MAX_NO_NEW_DATA" ]; then
        echo ""
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo "🎉 数据爬取完成！"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo ""
        echo "📊 最终统计："
        echo "   总执行次数: $iteration 次"
        echo "   数据库总数据量: $total 条"
        
        if [ "$needsCrossYear" = "true" ]; then
          echo "   停止原因: 跨年后仍无数据，可能已完成"
        elif [ "$hasMore" = "false" ]; then
          echo "   停止原因: API 返回 hasMore=false（智能判断已完成）"
        else
          echo "   停止原因: 连续 $no_new_data_count 次无新数据"
        fi
        echo ""
        
        # 获取详细统计
        stats=$(curl -s "$WORKER_URL/stats/$LOTTERY_TYPE")
        echo "📈 详细统计："
        echo "$stats" | jq '.' 2>/dev/null || echo "$stats"
        echo ""
        
        echo "✅ ${LOTTERY_NAME}所有历史数据已成功导入！"
        exit 0
      fi
    else
      # 有新数据，重置计数器
      no_new_data_count=0
      last_total=$total
      echo ""
      echo "✅ 本批次新增 $inserted 条数据，继续爬取..."
    fi
    
    # 如果数据量已经很大，提示用户
    if [ "$LOTTERY_TYPE" = "ssq" ] && [ "$total" -ge 3000 ]; then
      echo ""
      echo "💡 提示：数据库已有 $total 条数据（双色球从2003年开始，约有3000+期）"
      echo "   如果数据量接近历史总期数，可能即将完成"
    elif [ "$LOTTERY_TYPE" = "dlt" ] && [ "$total" -ge 2700 ]; then
      echo ""
      echo "💡 提示：数据库已有 $total 条数据（大乐透从2007年开始，约有2700+期）"
      echo "   如果数据量接近历史总期数，可能即将完成"
    fi
  else
    echo "⚠️  本批次可能失败，继续尝试..."
    
    # 检查是否是认证错误
    if echo "$response" | grep -q "Unauthorized"; then
      echo ""
      echo "❌ 认证失败！请检查 .env 文件中的 API_KEY 是否正确"
      exit 1
    fi
  fi
  
  # 保存今日请求次数
  echo "$today_requests" > "$request_count_file"
  
  echo ""
  echo "⏳ 等待 $SLEEP_TIME 秒后继续..."
  echo "   本次会话: 第 $iteration 次 | 今日总计: $today_requests/$DAILY_REQUEST_LIMIT 次"
  echo "   （按 Ctrl+C 可随时停止）"
  sleep $SLEEP_TIME
done
