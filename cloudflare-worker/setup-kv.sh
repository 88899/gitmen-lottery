#!/bin/bash

# Cloudflare Worker KV 配置设置脚本
# 用于设置敏感配置信息

echo "🔧 Cloudflare Worker KV 配置设置"
echo "=================================="

# 检查是否安装了 wrangler
if ! command -v wrangler &> /dev/null; then
    echo "❌ 错误: wrangler 未安装"
    echo "请先安装: npm install -g wrangler"
    exit 1
fi

# 检查是否已登录
if ! wrangler whoami &> /dev/null; then
    echo "❌ 错误: 未登录 Cloudflare"
    echo "请先登录: wrangler login"
    exit 1
fi

echo "✅ wrangler 已安装并已登录"
echo ""

# 读取当前配置
echo "📖 读取 .env 配置文件..."
if [ -f ".env" ]; then
    source .env
    echo "✅ .env 文件已加载"
else
    echo "⚠️  .env 文件不存在，将使用手动输入"
fi

echo ""
echo "🔑 设置敏感配置到 KV 存储"
echo "=========================="

# 设置 TELEGRAM_BOT_TOKEN
if [ -n "$TELEGRAM_BOT_TOKEN" ]; then
    echo "设置 TELEGRAM_BOT_TOKEN (从 .env 读取)..."
    wrangler kv:key put --binding=KV_BINDING "TELEGRAM_BOT_TOKEN" "$TELEGRAM_BOT_TOKEN"
else
    echo "请输入 TELEGRAM_BOT_TOKEN:"
    read -r bot_token
    if [ -n "$bot_token" ]; then
        wrangler kv:key put --binding=KV_BINDING "TELEGRAM_BOT_TOKEN" "$bot_token"
    fi
fi

# 设置 TELEGRAM_CHAT_ID
if [ -n "$TELEGRAM_CHAT_ID" ]; then
    echo "设置 TELEGRAM_CHAT_ID (从 .env 读取)..."
    wrangler kv:key put --binding=KV_BINDING "TELEGRAM_CHAT_ID" "$TELEGRAM_CHAT_ID"
else
    echo "请输入 TELEGRAM_CHAT_ID:"
    read -r chat_id
    if [ -n "$chat_id" ]; then
        wrangler kv:key put --binding=KV_BINDING "TELEGRAM_CHAT_ID" "$chat_id"
    fi
fi

# 设置 API_KEY
if [ -n "$API_KEY" ]; then
    echo "设置 API_KEY (从 .env 读取)..."
    wrangler kv:key put --binding=KV_BINDING "API_KEY" "$API_KEY"
else
    echo "请输入 API_KEY:"
    read -r api_key
    if [ -n "$api_key" ]; then
        wrangler kv:key put --binding=KV_BINDING "API_KEY" "$api_key"
    fi
fi

echo ""
echo "📋 验证 KV 配置"
echo "==============="

echo "当前 KV 中的配置:"
wrangler kv:key list --binding=KV_BINDING

echo ""
echo "✅ KV 配置设置完成！"
echo ""
echo "💡 提示:"
echo "1. 非敏感配置已在 wrangler.toml 中设置"
echo "2. 敏感配置已存储在 KV 中"
echo "3. 现在可以部署 Worker: wrangler deploy"
echo "4. 测试配置: curl https://your-worker.workers.dev/test"