#!/bin/bash

# 测试增量爬取逻辑
# 用途：验证增量爬取是否正确工作

set -e

# 加载环境变量
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
else
  echo "❌ 错误: .env 文件不存在"
  exit 1
fi

# 检查必需的环境变量
if [ -z "$WORKER_URL" ] || [ -z "$API_KEY" ]; then
  echo "❌ 错误: 缺少必需的环境变量 WORKER_URL 或 API_KEY"
  exit 1
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🧪 测试增量爬取逻辑"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 步骤1: 查看数据库当前状态
echo "📊 步骤1: 查看数据库当前状态"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
curl -s "${WORKER_URL}/latest" | jq '.'
echo ""
echo ""

# 步骤2: 执行增量爬取
echo "🚀 步骤2: 执行增量爬取"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
response=$(curl -s -X POST \
  -H "Authorization: Bearer ${API_KEY}" \
  "${WORKER_URL}/run")

echo "$response" | jq '.'
echo ""

# 解析响应
success=$(echo "$response" | jq -r '.success')
message=$(echo "$response" | jq -r '.message')

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 测试结果"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ "$success" = "true" ]; then
  echo "✅ 增量爬取成功"
  echo "   消息: $message"
  
  if [ "$message" = "数据已是最新" ] || [ "$message" = "数据已存在" ]; then
    echo ""
    echo "💡 说明: 数据库已是最新，这是正常的"
    echo "   如需测试新数据入库，可以："
    echo "   1. 删除数据库中最新的一条记录"
    echo "   2. 等待新一期开奖后再测试"
  elif [ "$message" = "增量更新完成" ]; then
    echo ""
    echo "🎉 成功入库新数据！"
    echo ""
    echo "📊 步骤3: 查看更新后的数据"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    curl -s "${WORKER_URL}/latest" | jq '.'
  fi
else
  echo "❌ 增量爬取失败"
  echo "   错误: $message"
  echo ""
  echo "🔍 可能的原因:"
  echo "   1. 数据源不可用"
  echo "   2. 网络连接问题"
  echo "   3. 数据解析失败"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
