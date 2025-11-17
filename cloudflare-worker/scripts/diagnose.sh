#!/bin/bash

# 完整诊断脚本

WORKER_URL="https://lottery-prediction.githubmen.workers.dev"
API_KEY="6690_042:A644AEpYn_658"

echo "🔍 Cloudflare Worker 完整诊断"
echo "================================"
echo ""

# 测试 1: 检查 Worker 是否可访问
echo "📊 测试 1: 检查 Worker 是否可访问"
echo "--------------------------------"
echo "URL: $WORKER_URL"
echo ""

response=$(curl -s -w "\nHTTP_CODE:%{http_code}\nTIME_TOTAL:%{time_total}s\n" "$WORKER_URL")
echo "$response"
echo ""

http_code=$(echo "$response" | grep "HTTP_CODE:" | cut -d: -f2)

if [ "$http_code" = "200" ]; then
  echo "✅ Worker 可访问"
elif [ "$http_code" = "000" ] || [ -z "$http_code" ]; then
  echo "❌ Worker 无法访问（连接失败）"
  echo ""
  echo "可能的原因："
  echo "  1. Worker 未部署"
  echo "  2. URL 不正确"
  echo "  3. 网络问题"
  echo ""
  echo "解决方案："
  echo "  1. 检查 Worker URL 是否正确"
  echo "  2. 在浏览器中访问: $WORKER_URL"
  echo "  3. 检查 Cloudflare Dashboard 中 Worker 的状态"
  echo "  4. 重新部署: cd cloudflare-worker && npx wrangler deploy"
  exit 1
else
  echo "⚠️  Worker 返回状态码: $http_code"
fi

echo ""

# 测试 2: 检查 /latest 接口
echo "📊 测试 2: 检查 /latest 接口（无需认证）"
echo "--------------------------------"

latest_response=$(curl -s -w "\nHTTP_CODE:%{http_code}\n" "$WORKER_URL/latest")
echo "$latest_response"
echo ""

latest_code=$(echo "$latest_response" | grep "HTTP_CODE:" | cut -d: -f2)

if [ "$latest_code" = "200" ]; then
  echo "✅ /latest 接口正常"
elif [ "$latest_code" = "404" ]; then
  echo "⚠️  数据库中暂无数据（需要初始化）"
else
  echo "❌ /latest 接口异常（状态码: $latest_code）"
fi

echo ""

# 测试 3: 检查 /stats 接口
echo "📊 测试 3: 检查 /stats 接口"
echo "--------------------------------"

stats_response=$(curl -s -w "\nHTTP_CODE:%{http_code}\n" "$WORKER_URL/stats")
echo "$stats_response"
echo ""

stats_code=$(echo "$stats_response" | grep "HTTP_CODE:" | cut -d: -f2)

if [ "$stats_code" = "200" ]; then
  echo "✅ /stats 接口正常"
  
  # 提取数据量
  total_count=$(echo "$stats_response" | grep -o '"total_count":[0-9]*' | cut -d: -f2)
  if [ -n "$total_count" ]; then
    echo "📊 数据库中现有数据: $total_count 条"
    
    if [ "$total_count" -eq 0 ]; then
      echo "⚠️  数据库为空，需要初始化"
    elif [ "$total_count" -lt 100 ]; then
      echo "⚠️  数据量较少，建议继续导入"
    else
      echo "✅ 数据量正常"
    fi
  fi
else
  echo "❌ /stats 接口异常（状态码: $stats_code）"
fi

echo ""

# 测试 4: 测试认证
echo "📊 测试 4: 测试 /run 接口认证"
echo "--------------------------------"

run_response=$(curl -s -w "\nHTTP_CODE:%{http_code}\n" -X POST "$WORKER_URL/run" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json")

echo "$run_response"
echo ""

run_code=$(echo "$run_response" | grep "HTTP_CODE:" | cut -d: -f2)

if [ "$run_code" = "200" ]; then
  echo "✅ 认证成功，任务执行中"
  
  # 检查响应内容
  if echo "$run_response" | grep -q '"success":true'; then
    echo "✅ 任务执行成功"
  elif echo "$run_response" | grep -q '"success":false'; then
    echo "⚠️  任务执行失败"
    echo "$run_response" | grep -o '"message":"[^"]*"'
  fi
elif [ "$run_code" = "401" ]; then
  echo "❌ 认证失败（API_KEY 不正确）"
  echo ""
  echo "解决方案："
  echo "  1. 检查 KV 中的 API_KEY 配置"
  echo "  2. 确保脚本中的 API_KEY 与 KV 中一致"
elif [ "$run_code" = "000" ]; then
  echo "❌ 连接失败（Worker 无响应）"
else
  echo "⚠️  返回状态码: $run_code"
fi

echo ""

# 总结
echo "================================"
echo "📋 诊断总结"
echo "================================"
echo ""

if [ "$http_code" = "200" ] && [ "$run_code" = "200" ]; then
  echo "✅ Worker 运行正常"
  echo ""
  echo "下一步："
  echo "  1. 如果数据库为空，运行: ./cloudflare-worker/init.sh"
  echo "  2. 查看 Cloudflare Dashboard 的 Worker 日志获取详细信息"
elif [ "$http_code" = "000" ]; then
  echo "❌ Worker 无法访问"
  echo ""
  echo "请执行以下步骤："
  echo "  1. 检查 Worker URL: $WORKER_URL"
  echo "  2. 在浏览器中访问该 URL"
  echo "  3. 检查 Cloudflare Dashboard 中 Worker 的状态"
  echo "  4. 重新部署: cd cloudflare-worker && npx wrangler deploy"
elif [ "$run_code" = "401" ]; then
  echo "❌ API 认证失败"
  echo ""
  echo "请执行以下步骤："
  echo "  1. 登录 Cloudflare Dashboard"
  echo "  2. 进入 KV 命名空间"
  echo "  3. 检查 API_KEY 的值"
  echo "  4. 更新脚本中的 API_KEY"
else
  echo "⚠️  存在问题，请查看上述详细信息"
  echo ""
  echo "建议："
  echo "  1. 查看 Cloudflare Dashboard 的 Worker 日志"
  echo "  2. 检查 Worker 的环境变量和绑定"
  echo "  3. 尝试重新部署 Worker"
fi

echo ""
