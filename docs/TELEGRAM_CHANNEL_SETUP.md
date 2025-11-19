# Telegram 频道配置指南

## 概述

彩票预测系统现在支持同时发送消息到 Telegram 机器人和频道，可以通过配置项灵活管理发送目标。

## 功能特点

- ✅ **双目标发送**：支持同时发送给机器人和频道
- ✅ **灵活配置**：可以选择发送给机器人、频道或两者
- ✅ **错误处理**：单个目标失败不影响其他目标
- ✅ **统一接口**：Python 和 Cloudflare Worker 版本保持一致

## 配置步骤

### 1. 创建 Telegram 频道

1. 在 Telegram 中创建新频道
2. 设置频道名称和描述
3. 选择频道类型：
   - **公开频道**：有用户名，如 `@lottery_predictions`
   - **私有频道**：只有邀请链接

### 2. 获取频道 ID

#### 公开频道
使用频道用户名格式：`@channel_username`

#### 私有频道
1. 将 [@userinfobot](https://t.me/userinfobot) 添加到频道
2. 发送任意消息
3. 机器人会回复频道 ID（格式：`-1001234567890`）

### 3. 配置机器人权限

1. 将你的机器人添加为频道管理员
2. 给予以下权限：
   - ✅ 发送消息
   - ✅ 编辑消息（可选）
   - ❌ 删除消息（不需要）

### 4. 更新配置文件

#### Python 版本 (`.env`)

```bash
## Telegram 机器人配置
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_CHAT_ID=your_chat_id

## Telegram 频道配置
TELEGRAM_CHANNEL_ID=@your_channel_username  # 或 -1001234567890
TELEGRAM_SEND_TO_BOT=true                   # 是否发送给机器人
TELEGRAM_SEND_TO_CHANNEL=true              # 是否发送给频道
```

#### Cloudflare Worker 版本

在 Cloudflare Dashboard 的环境变量中添加：

```
TELEGRAM_CHANNEL_ID=@your_channel_username
TELEGRAM_SEND_TO_BOT=true
TELEGRAM_SEND_TO_CHANNEL=true
```

或在 KV 存储中添加相应的键值对。

## 配置选项说明

| 配置项 | 说明 | 默认值 | 示例 |
|--------|------|--------|------|
| `TELEGRAM_CHANNEL_ID` | 频道 ID 或用户名 | 无 | `@lottery_channel` 或 `-1001234567890` |
| `TELEGRAM_SEND_TO_BOT` | 是否发送给机器人 | `true` | `true` / `false` |
| `TELEGRAM_SEND_TO_CHANNEL` | 是否发送给频道 | `false` | `true` / `false` |

## 使用场景

### 场景 1：仅机器人（默认）
```bash
TELEGRAM_SEND_TO_BOT=true
TELEGRAM_SEND_TO_CHANNEL=false
```
- 适合：个人使用、测试环境
- 特点：私密性好，只有你能看到

### 场景 2：仅频道
```bash
TELEGRAM_SEND_TO_BOT=false
TELEGRAM_SEND_TO_CHANNEL=true
```
- 适合：公开分享预测结果
- 特点：所有订阅者都能看到

### 场景 3：双重发送（推荐）
```bash
TELEGRAM_SEND_TO_BOT=true
TELEGRAM_SEND_TO_CHANNEL=true
```
- 适合：生产环境
- 特点：既有私人通知，又有公开分享

## 测试配置

运行测试脚本验证配置：

```bash
python3 test_telegram_channel.py
```

测试脚本会：
- ✅ 检查配置完整性
- ✅ 测试机器人连接
- ✅ 测试频道权限
- ✅ 发送测试消息

## API 使用

### Python 版本

```python
from core.telegram_bot import TelegramBot

# 使用默认配置
bot = TelegramBot()

# 发送到所有配置的目标
bot.send_message("测试消息")

# 仅发送给机器人
bot.send_to_bot_only("私人消息")

# 仅发送给频道
bot.send_to_channel_only("公开消息")

# 获取配置信息
config = bot.get_config_info()
print(config)
```

### Cloudflare Worker 版本

```javascript
// 创建 TelegramBot 实例
const telegram = new TelegramBot(
  botToken, 
  chatId, 
  channelId, 
  sendToBot, 
  sendToChannel
);

// 发送消息
await telegram.sendMessage("测试消息");

// 仅发送给机器人
await telegram.sendToBotOnly("私人消息");

// 仅发送给频道
await telegram.sendToChannelOnly("公开消息");
```

## 常见问题

### Q: 频道 ID 格式错误
**A:** 确保使用正确格式：
- 公开频道：`@channel_username`（包含 @）
- 私有频道：`-1001234567890`（负数，以 -100 开头）

### Q: 机器人无法发送到频道
**A:** 检查以下几点：
1. 机器人是否已添加为频道管理员
2. 机器人是否有发送消息权限
3. 频道 ID 是否正确

### Q: 消息发送部分失败
**A:** 这是正常的，系统会：
1. 尝试发送到所有配置的目标
2. 记录每个目标的发送结果
3. 只要有一个目标成功就返回成功

### Q: 如何获取私有频道 ID
**A:** 使用 [@userinfobot](https://t.me/userinfobot)：
1. 将机器人添加到频道
2. 在频道中发送任意消息
3. 机器人会回复频道信息，包含 ID

## 安全建议

1. **保护 Bot Token**：不要在公开代码中暴露
2. **频道权限**：只给机器人必要的权限
3. **私有频道**：敏感信息建议使用私有频道
4. **访问控制**：定期检查频道成员和权限

## 更新日志

- **2025-11-19**：添加频道发送功能
- **2025-11-19**：支持配置管理和多目标发送
- **2025-11-19**：Python 和 Cloudflare Worker 版本同步更新