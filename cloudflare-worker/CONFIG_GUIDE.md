# Cloudflare Worker 配置指南

## 配置方式对比

Cloudflare Worker 有多种配置方式，每种都有其适用场景：

### 1. wrangler.toml 中的 [vars] 部分 ✅ 推荐用于非敏感配置

```toml
[vars]
TELEGRAM_CHANNEL_ID = "@renren500w"
TELEGRAM_SEND_TO_BOT = "true"
TELEGRAM_SEND_TO_CHANNEL = "true"
DEFAULT_STRATEGIES = "frequency,random,balanced,coldHot"
```

**优点**：
- 版本控制友好
- 部署时自动应用
- 适合非敏感配置

**缺点**：
- 配置会暴露在代码中
- 不适合敏感信息

### 2. KV 存储 ✅ 推荐用于敏感配置

```bash
# 使用 wrangler 命令设置
wrangler kv:key put --binding=KV_BINDING "TELEGRAM_BOT_TOKEN" "your_bot_token"
wrangler kv:key put --binding=KV_BINDING "TELEGRAM_CHAT_ID" "your_chat_id"
wrangler kv:key put --binding=KV_BINDING "API_KEY" "your_api_key"
```

**优点**：
- 敏感信息不暴露在代码中
- 可以在 Cloudflare Dashboard 中管理
- 支持运行时动态更新

**缺点**：
- 需要额外的 API 调用
- 管理相对复杂

### 3. Cloudflare Dashboard 环境变量 ✅ 推荐用于敏感配置

在 Cloudflare Dashboard 中设置：
1. 进入 Worker 设置页面
2. 找到 "Environment Variables" 部分
3. 添加变量

**优点**：
- 图形界面管理
- 敏感信息安全
- 部署时自动应用

## 当前项目的配置策略

### 非敏感配置 → wrangler.toml
```toml
[vars]
TELEGRAM_CHANNEL_ID = "@renren500w"
TELEGRAM_SEND_TO_BOT = "true"
TELEGRAM_SEND_TO_CHANNEL = "true"
DEFAULT_STRATEGIES = "frequency,random,balanced,coldHot"
DEFAULT_PREDICTION_COUNT = "4"
```

### 敏感配置 → KV 存储或 Dashboard
- `TELEGRAM_BOT_TOKEN` - 机器人令牌
- `TELEGRAM_CHAT_ID` - 聊天 ID
- `API_KEY` - API 密钥

## 你的配置是否正确？

**✅ 正确的部分**：
- 频道 ID：`@renren500w` 格式正确
- 配置项名称正确

**❌ 需要修正的部分**：
- ~~不能直接在文件末尾添加配置~~（已修正）
- ✅ 现在已经放在正确的 `[vars]` 部分

## 是否需要在 KV 中添加配置？

**不需要重复配置**！我们的代码有优先级机制：

```javascript
// 配置读取优先级：KV > 环境变量
if (!config.telegramChannelId) config.telegramChannelId = env.TELEGRAM_CHANNEL_ID;
```

**建议的配置分配**：

### wrangler.toml（非敏感）
```toml
[vars]
TELEGRAM_CHANNEL_ID = "@renren500w"
TELEGRAM_SEND_TO_BOT = "true"
TELEGRAM_SEND_TO_CHANNEL = "true"
DEFAULT_STRATEGIES = "frequency,random,balanced,coldHot"
DEFAULT_PREDICTION_COUNT = "4"
```

### KV 存储（敏感）
```bash
wrangler kv:key put --binding=KV_BINDING "TELEGRAM_BOT_TOKEN" "8497985042:AAEpYnQvCV9TAzGMvYn9qSStgwnaFj8yUwg"
wrangler kv:key put --binding=KV_BINDING "TELEGRAM_CHAT_ID" "6690658644"
wrangler kv:key put --binding=KV_BINDING "API_KEY" "d9464dbad6564438a37ff5245494152d"
```

## 部署和测试

### 1. 部署配置
```bash
cd cloudflare-worker
wrangler deploy
```

### 2. 测试配置
```bash
# 测试 API
curl https://your-worker.workers.dev/test

# 手动触发任务
curl -X POST https://your-worker.workers.dev/run \
  -H "Authorization: Bearer your_api_key"
```

### 3. 查看日志
```bash
wrangler tail
```

## 常见问题

### Q: 配置更新后不生效？
**A**: 重新部署 Worker：
```bash
wrangler deploy
```

### Q: KV 配置如何查看？
**A**: 使用命令行：
```bash
wrangler kv:key list --binding=KV_BINDING
wrangler kv:key get --binding=KV_BINDING "TELEGRAM_BOT_TOKEN"
```

### Q: 如何在 Dashboard 中管理？
**A**: 
1. 登录 Cloudflare Dashboard
2. 进入 Workers & Pages
3. 选择你的 Worker
4. 进入 Settings → Environment Variables

## 安全建议

1. **敏感信息**：永远不要在 `wrangler.toml` 中存储敏感信息
2. **版本控制**：确保 `.env` 文件在 `.gitignore` 中
3. **权限管理**：定期轮换 API 密钥和令牌
4. **访问控制**：使用 API_KEY 保护敏感接口