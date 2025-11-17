#!/bin/bash

# 调试脚本 - 查看实际的 API 响应

# 配置
WORKER_URL="https://lottery-prediction.githubmen.workers.dev"
API_KEY="6690_042:A644AEpYn_658"

echo "🔍 调试模式 - 查看 API 响应"
echo "Worker URL: $WORKER_URL"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 测试 1: 调用 /run 接口"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 调用 API，显示详细信息
echo "请求详情："
echo "  URL: $WORKER_URL/run"
echo "  Method: POST"
echo "  Authorization: Bearer ${API_KEY:0:10}..."
echo ""

echo "响应内容："
response=$(curl -s -w "\n\nHTTP Status: %{http_code}\n" -X POST "$WORKER_URL/run" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json")

echo "$response"
echo ""

# 尝试格式化 JSON
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 格式化的 JSON（如果是 JSON）："
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "$response" | jq '.' 2>/dev/null || echo "（不是有效的 JSON 或 jq 未安装）"
echo ""

# 检查关键字
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔎 关键字检查："
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if echo "$response" | grep -q "success"; then
  echo "✅ 包含 'success'"
else
  echo "❌ 不包含 'success'"
fi

if echo "$response" | grep -q "error"; then
  echo "⚠️  包含 'error'"
else
  echo "✅ 不包含 'error'"
fi

if echo "$response" | grep -q "Unauthorized"; then
  echo "❌ 认证失败 (Unauthorized)"
else
  echo "✅ 认证通过"
fi

if echo "$response" | grep -q "数据已是最新"; then
  echo "✅ 数据已是最新"
fi

if echo "$response" | grep -q "未获取到数据"; then
  echo "⚠️  未获取到数据"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 测试 2: 调用 /latest 接口（无需认证）"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

latest_response=$(curl -s "$WORKER_URL/latest")
echo "$latest_response" | jq '.' 2>/dev/null || echo "$latest_response"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ 调试完成"
echo ""
echo "💡 提示："
echo "  1. 如果看到 'Unauthorized'，请检查 API_KEY 是否正确"
echo "  2. 如果看到 '未获取到数据'，说明数据源有问题"
echo "  3. 如果看到 'success: true'，说明运行正常"
echo "  4. 查看 Cloudflare Dashboard 的 Worker 日志获取更多信息"
