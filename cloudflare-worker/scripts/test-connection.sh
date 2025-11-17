#!/bin/bash

# 测试连接脚本

WORKER_URL="https://lottery-prediction.githubmen.workers.dev"
API_KEY="6690_042:A644AEpYn_658"

echo "🔍 测试 Cloudflare Worker 连接"
echo "================================"
echo ""

# 测试 1: 使用 curl 测试首页（增加超时时间）
echo "📊 测试 1: curl 测试首页（30秒超时）"
echo "--------------------------------"

response=$(curl -s --max-time 30 -w "\nHTTP_CODE:%{http_code}\n" "$WORKER_URL")
http_code=$(echo "$response" | grep "HTTP_CODE:" | cut -d: -f2)

echo "$response"
echo ""

if [ "$http_code" = "200" ]; then
  echo "✅ curl 可以访问 Worker"
else
  echo "❌ curl 无法访问 Worker（状态码: $http_code）"
  echo ""
  echo "💡 但你说浏览器可以访问，说明是本地网络或 curl 配置问题"
  echo ""
  echo "可能的原因："
  echo "  1. 需要配置代理"
  echo "  2. curl 版本太旧"
  echo "  3. DNS 解析问题"
  echo ""
  echo "解决方案："
  echo "  1. 尝试使用 Python 脚本测试（见下方）"
  echo "  2. 检查是否需要配置代理"
  echo "  3. 使用浏览器的开发者工具手动测试 API"
fi

echo ""

# 测试 2: 使用 Python 测试（如果有 Python）
echo "📊 测试 2: Python 测试"
echo "--------------------------------"

if command -v python3 &> /dev/null; then
  echo "使用 Python 测试连接..."
  
  python3 << 'EOF'
import urllib.request
import json

WORKER_URL = "https://lottery-prediction.githubmen.workers.dev"
API_KEY = "6690_042:A644AEpYn_658"

print("\n1. 测试首页:")
try:
    response = urllib.request.urlopen(WORKER_URL, timeout=30)
    content = response.read().decode('utf-8')
    print(f"✅ 状态码: {response.status}")
    print(f"内容预览: {content[:100]}...")
except Exception as e:
    print(f"❌ 失败: {e}")

print("\n2. 测试 /latest 接口:")
try:
    response = urllib.request.urlopen(f"{WORKER_URL}/latest", timeout=30)
    content = response.read().decode('utf-8')
    data = json.loads(content)
    print(f"✅ 状态码: {response.status}")
    print(f"数据: {json.dumps(data, indent=2, ensure_ascii=False)}")
except Exception as e:
    print(f"❌ 失败: {e}")

print("\n3. 测试 /stats 接口:")
try:
    response = urllib.request.urlopen(f"{WORKER_URL}/stats", timeout=30)
    content = response.read().decode('utf-8')
    data = json.loads(content)
    print(f"✅ 状态码: {response.status}")
    print(f"数据: {json.dumps(data, indent=2, ensure_ascii=False)}")
except Exception as e:
    print(f"❌ 失败: {e}")

print("\n4. 测试 /run 接口（需要认证）:")
try:
    req = urllib.request.Request(
        f"{WORKER_URL}/run",
        method='POST',
        headers={
            'Authorization': f'Bearer {API_KEY}',
            'Content-Type': 'application/json'
        }
    )
    response = urllib.request.urlopen(req, timeout=60)
    content = response.read().decode('utf-8')
    data = json.loads(content)
    print(f"✅ 状态码: {response.status}")
    print(f"响应: {json.dumps(data, indent=2, ensure_ascii=False)}")
except urllib.error.HTTPError as e:
    print(f"❌ HTTP 错误: {e.code}")
    print(f"响应: {e.read().decode('utf-8')}")
except Exception as e:
    print(f"❌ 失败: {e}")
EOF

else
  echo "⚠️  Python 未安装，跳过此测试"
fi

echo ""
echo "================================"
echo "📋 总结"
echo "================================"
echo ""
echo "如果 curl 失败但浏览器可以访问："
echo "  1. 使用上面的 Python 脚本测试"
echo "  2. 或者在浏览器中手动测试 API"
echo "  3. 或者配置 curl 的代理设置"
echo ""
echo "浏览器手动测试方法："
echo "  1. 打开浏览器开发者工具（F12）"
echo "  2. 进入 Console 标签"
echo "  3. 运行以下代码："
echo ""
echo "fetch('$WORKER_URL/run', {"
echo "  method: 'POST',"
echo "  headers: {"
echo "    'Authorization': 'Bearer $API_KEY',"
echo "    'Content-Type': 'application/json'"
echo "  }"
echo "}).then(r => r.json()).then(console.log)"
echo ""
