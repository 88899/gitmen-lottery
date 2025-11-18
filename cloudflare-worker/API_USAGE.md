# Cloudflare Worker API 使用指南

## 🚀 快速开始

### 双色球（SSQ）

```bash
# 1. 初始化数据库（首次使用）
curl -X POST https://your-worker.workers.dev/init/ssq \
  -H "Authorization: Bearer YOUR_API_KEY"

# 2. 查询最新数据
curl https://your-worker.workers.dev/latest/ssq

# 3. 预测号码
curl https://your-worker.workers.dev/predict/ssq
```

### 大乐透（DLT）

```bash
# 1. 初始化数据库（首次使用）
curl -X POST https://your-worker.workers.dev/init/dlt \
  -H "Authorization: Bearer YOUR_API_KEY"

# 2. 查询最新数据
curl https://your-worker.workers.dev/latest/dlt

# 3. 预测号码
curl https://your-worker.workers.dev/predict/dlt
```

## 📖 API 接口

### 接口设计说明

- **批量操作接口**（`/init`、`/run`）：建议使用脚本或手动触发，通过脚本可以处理所有类型
- **查询接口**（`/latest`、`/predict`、`/stats`）：支持指定类型，不指定时默认返回双色球（向后兼容）

### 1. 初始化数据库

**接口**：`POST /init/{type}`

**说明**：初始化数据库并按年份批量导入历史数据

**参数**：
- `{type}`：彩票类型（`ssq` 或 `dlt`）

**认证**：需要 API Key

**推荐方式**（使用脚本）：
```bash
# 初始化所有类型
./scripts/init.sh

# 或指定类型
./scripts/init.sh ssq
./scripts/init.sh dlt
```

**直接调用 API**：
```bash
# 双色球
curl -X POST https://your-worker.workers.dev/init/ssq \
  -H "Authorization: Bearer YOUR_API_KEY"

# 大乐透
curl -X POST https://your-worker.workers.dev/init/dlt \
  -H "Authorization: Bearer YOUR_API_KEY"
```

**响应**：
```json
{
  "success": true,
  "message": "2025 年数据爬取完成",
  "inserted": 131,
  "skipped": 0,
  "total": 2799,
  "year": 2025,
  "hasMore": false,
  "lotteryType": "dlt"
}
```

**说明**：
- 每次调用爬取一年的数据
- 如果 `hasMore: true`，需要继续调用直到完成
- 自动跳过已存在的数据

### 2. 手动执行每日任务

**接口**：`POST /run`

**说明**：手动触发每日任务（同时处理所有彩票类型：爬取最新数据并预测）

**认证**：需要 API Key

**示例**：
```bash
curl -X POST https://your-worker.workers.dev/run \
  -H "Authorization: Bearer YOUR_API_KEY"
```

**响应**：
```json
{
  "success": true,
  "message": "每日任务执行完成",
  "results": [
    {
      "type": "ssq",
      "name": "双色球",
      "success": true,
      "hasNewData": true,
      "latest": { ... },
      "predictions": [ ... ]
    },
    {
      "type": "dlt",
      "name": "大乐透",
      "success": true,
      "hasNewData": false
    }
  ]
}
```

**说明**：
- 同时处理双色球和大乐透
- 如有新数据则自动入库并预测
- 发送综合的 Telegram 通知

### 3. 查询最新数据

**接口**：`GET /latest/{type}`

**说明**：查询最新一期开奖数据

**参数**：
- `{type}`：彩票类型（`ssq` 或 `dlt`），可选，默认 `ssq`

**认证**：无需认证

**示例**：
```bash
# 双色球
curl https://your-worker.workers.dev/latest/ssq
curl https://your-worker.workers.dev/latest    # 默认双色球

# 大乐透
curl https://your-worker.workers.dev/latest/dlt
```

**响应（双色球）**：
```json
{
  "lottery_no": "2025131",
  "draw_date": "2025-11-17",
  "red_balls": ["03", "09", "14", "17", "20", "27"],
  "blue_ball": "12",
  "sorted_code": "03,09,14,17,20,27-12"
}
```

**响应（大乐透）**：
```json
{
  "lottery_no": "2025131",
  "draw_date": "2025-11-17",
  "front_balls": ["03", "08", "25", "29", "32"],
  "back_balls": ["09", "12"],
  "sorted_code": "03,08,25,29,32-09,12"
}
```

### 4. 获取预测结果

**接口**：`GET /predict/{type}?count=5&strategies=frequency,balanced`

**说明**：获取预测号码

**参数**：
- `{type}`：彩票类型（`ssq` 或 `dlt`），可选，默认 `ssq`
- `count`：预测条数（可选，默认使用 KV 配置的值）
- `strategies`：策略列表（可选，默认使用 KV 配置的值）

**认证**：无需认证

**示例**：
```bash
# 双色球 - 使用默认配置
curl https://your-worker.workers.dev/predict/ssq
curl https://your-worker.workers.dev/predict    # 默认双色球

# 双色球 - 自定义参数
curl "https://your-worker.workers.dev/predict/ssq?count=10&strategies=frequency,balanced"

# 大乐透 - 使用默认配置
curl https://your-worker.workers.dev/predict/dlt

# 大乐透 - 自定义参数
curl "https://your-worker.workers.dev/predict/dlt?count=15&strategies=frequency,coldHot"
```

**响应（双色球）**：
```json
[
  {
    "rank": 1,
    "red_balls": [3, 9, 14, 17, 20, 27],
    "blue_ball": 12,
    "sorted_code": "03,09,14,17,20,27-12",
    "strategy": "frequency",
    "strategy_name": "频率策略",
    "prediction_time": "2025-11-18T05:00:00.000Z"
  },
  {
    "rank": 2,
    "red_balls": [5, 12, 18, 21, 28, 31],
    "blue_ball": 8,
    "sorted_code": "05,12,18,21,28,31-08",
    "strategy": "balanced",
    "strategy_name": "均衡策略",
    "prediction_time": "2025-11-18T05:00:00.000Z"
  }
]
```

**响应（大乐透）**：
```json
[
  {
    "rank": 1,
    "front_balls": [2, 18, 22, 31, 35],
    "back_balls": [2, 10],
    "sorted_code": "02,18,22,31,35-02,10",
    "strategy": "frequency",
    "strategy_name": "频率策略",
    "prediction_time": "2025-11-18T05:00:00.000Z"
  },
  {
    "rank": 2,
    "front_balls": [3, 6, 10, 23, 26],
    "back_balls": [4, 9],
    "sorted_code": "03,06,10,23,26-04,09",
    "strategy": "coldHot",
    "strategy_name": "冷热号策略",
    "prediction_time": "2025-11-18T05:00:00.000Z"
  }
]
```

### 5. 查看可用策略

**接口**：`GET /strategies/{type}`

**说明**：查看可用的预测策略

**参数**：
- `{type}`：彩票类型（`ssq` 或 `dlt`），可选，默认 `ssq`

**认证**：无需认证

**示例**：
```bash
# 双色球
curl https://your-worker.workers.dev/strategies/ssq
curl https://your-worker.workers.dev/strategies    # 默认双色球

# 大乐透
curl https://your-worker.workers.dev/strategies/dlt
```

**响应**：
```json
[
  {
    "key": "frequency",
    "name": "频率策略",
    "description": "基于历史出现频率，选择高频号码组合"
  },
  {
    "key": "random",
    "name": "随机策略",
    "description": "完全随机选择号码，不考虑历史数据"
  },
  {
    "key": "balanced",
    "name": "均衡策略",
    "description": "追求号码分布均衡，大小号、奇偶号均衡"
  },
  {
    "key": "coldHot",
    "name": "冷热号策略",
    "description": "结合冷号（低频）和热号（高频）"
  }
]
```

### 6. 查看统计信息

**接口**：`GET /stats/{type}`

**说明**：查看号码频率统计

**参数**：
- `{type}`：彩票类型（`ssq` 或 `dlt`），可选，默认 `ssq`

**认证**：无需认证

**示例**：
```bash
# 双色球
curl https://your-worker.workers.dev/stats/ssq
curl https://your-worker.workers.dev/stats    # 默认双色球

# 大乐透
curl https://your-worker.workers.dev/stats/dlt
```

**响应（双色球）**：
```json
{
  "lottery_type": "ssq",
  "lottery_name": "双色球",
  "total_count": 3378,
  "top_red_balls": [
    { "ball": "03", "count": 520 },
    { "ball": "09", "count": 515 },
    { "ball": "14", "count": 510 }
  ],
  "top_blue_balls": [
    { "ball": "12", "count": 280 },
    { "ball": "08", "count": 275 }
  ]
}
```

**响应（大乐透）**：
```json
{
  "lottery_type": "dlt",
  "lottery_name": "大乐透",
  "total_count": 2799,
  "top_front_balls": [
    { "ball": "29", "count": 483 },
    { "ball": "35", "count": 466 },
    { "ball": "33", "count": 466 }
  ],
  "top_back_balls": [
    { "ball": "10", "count": 503 },
    { "ball": "07", "count": 495 }
  ]
}
```

### 7. 测试 Telegram 连接

**接口**：`GET /test`

**说明**：测试 Telegram Bot 连接

**认证**：无需认证

**示例**：
```bash
curl https://your-worker.workers.dev/test
```

**响应**：
```
Telegram 连接正常
```

## 🔧 兼容旧接口

为了向后兼容，以下接口默认使用双色球（ssq）：

```bash
# 这些接口等同于 /xxx/ssq
curl https://your-worker.workers.dev/latest
curl https://your-worker.workers.dev/predict
curl https://your-worker.workers.dev/strategies
curl https://your-worker.workers.dev/stats
curl -X POST https://your-worker.workers.dev/init
curl -X POST https://your-worker.workers.dev/run
```

## 📊 使用场景

### 场景1：首次部署

```bash
# 1. 初始化双色球数据库
curl -X POST https://your-worker.workers.dev/init/ssq \
  -H "Authorization: Bearer YOUR_API_KEY"

# 2. 继续爬取（如果 hasMore: true）
# 重复执行直到 hasMore: false

# 3. 初始化大乐透数据库
curl -X POST https://your-worker.workers.dev/init/dlt \
  -H "Authorization: Bearer YOUR_API_KEY"

# 4. 继续爬取（如果 hasMore: true）
```

### 场景2：每日预测

```bash
# 1. 查询最新数据
curl https://your-worker.workers.dev/latest/dlt

# 2. 获取预测
curl "https://your-worker.workers.dev/predict/dlt?count=15&strategies=frequency,balanced,coldHot"
```

### 场景3：手动更新

```bash
# 手动触发每日任务
curl -X POST https://your-worker.workers.dev/run/dlt \
  -H "Authorization: Bearer YOUR_API_KEY"
```

### 场景4：查看统计

```bash
# 查看双色球统计
curl https://your-worker.workers.dev/stats/ssq

# 查看大乐透统计
curl https://your-worker.workers.dev/stats/dlt
```

## 🔐 认证

需要认证的接口：
- `POST /init/{type}`
- `POST /run/{type}`

认证方式：
```bash
curl -X POST https://your-worker.workers.dev/init/dlt \
  -H "Authorization: Bearer YOUR_API_KEY"
```

API Key 配置：
```bash
wrangler kv:key put --binding=KV_BINDING API_KEY "your-secret-key"
```

## ⚙️ 配置

### 默认策略

```bash
# 设置默认策略
wrangler kv:key put --binding=KV_BINDING DEFAULT_STRATEGIES "frequency,balanced,coldHot"

# 设置默认预测条数
wrangler kv:key put --binding=KV_BINDING DEFAULT_PREDICTION_COUNT "15"
```

### Telegram 通知

```bash
# 设置 Bot Token
wrangler kv:key put --binding=KV_BINDING TELEGRAM_BOT_TOKEN "your-bot-token"

# 设置 Chat ID
wrangler kv:key put --binding=KV_BINDING TELEGRAM_CHAT_ID "your-chat-id"
```

## 📝 注意事项

1. **初始化**：首次使用需要调用 `/init/{type}` 初始化数据库
2. **批量爬取**：每次 `/init` 爬取一年数据，需要多次调用
3. **认证**：POST 接口需要 API Key
4. **兼容性**：旧接口默认使用双色球
5. **定时任务**：通过 Cloudflare Dashboard 配置

## 🐛 故障排查

### 问题1：401 Unauthorized

**原因**：API Key 未配置或错误

**解决**：
```bash
wrangler kv:key put --binding=KV_BINDING API_KEY "your-secret-key"
```

### 问题2：404 Not Found

**原因**：接口路径错误

**解决**：检查路径格式，确保包含彩票类型
```bash
# 错误
curl https://your-worker.workers.dev/predict

# 正确
curl https://your-worker.workers.dev/predict/dlt
```

### 问题3：500 Internal Server Error

**原因**：数据库未初始化或数据为空

**解决**：
```bash
# 初始化数据库
curl -X POST https://your-worker.workers.dev/init/dlt \
  -H "Authorization: Bearer YOUR_API_KEY"
```

## 📚 相关文档

- [Worker 更新指南](./WORKER_DLT_UPDATE_GUIDE.md)
- [部署指南](./docs/DEPLOY.md)
- [配置说明](./docs/配置说明.md)

---

**版本**：2.0.0  
**更新日期**：2025-11-18
