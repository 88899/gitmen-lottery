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

**说明**：初始化数据库并智能导入历史数据（使用统一的增量爬取逻辑）

**参数**：
- `{type}`：彩票类型（`ssq`、`dlt`、`qxc` 或 `qlc`）

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
# 双色球（从 2003 年开始）
curl -X POST https://your-worker.workers.dev/init/ssq \
  -H "Authorization: Bearer YOUR_API_KEY"

# 大乐透（从 2007 年开始）
curl -X POST https://your-worker.workers.dev/init/dlt \
  -H "Authorization: Bearer YOUR_API_KEY"
```

**响应**：
```json
{
  "success": true,
  "message": "双色球数据爬取完成",
  "inserted": 133,
  "skipped": 0,
  "total": 3378,
  "dataSource": "500.com",
  "queryParams": {
    "start": "25134",
    "end": "25200"
  },
  "hasMore": false,
  "lotteryType": "ssq",
  "note": "所有历史数据可能已爬取完成"
}
```

**新逻辑优势**：
- 🚀 **智能增量**：从数据库最新期号开始爬取，避免重复
- 🎯 **智能判断**：通过 `hasMore` 字段智能判断是否完成
- ⚡ **高效率**：通常 1-2 次调用即可完成，减少 80%+ API 调用
- 🔄 **复用逻辑**：使用与定时任务相同的增量爬取方法

**说明**：
- 如果 `hasMore: false`，说明已完成，无需继续调用
- 如果 `hasMore: true`，建议继续调用直到完成
- 自动跳过已存在的数据
- 数据源：500.com（稳定可靠）

### 2. 手动执行每日任务

**接口**：`POST /run`

**说明**：手动触发每日任务（同时处理所有彩票类型：增量爬取 + 预测）

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
      "new_count": 1,
      "latest": {
        "lottery_no": "2025133",
        "draw_date": "2025-11-18",
        "red_balls": ["05", "14", "17", "19", "20", "33"],
        "blue_ball": "07"
      },
      "predictions": [ ... ]
    },
    {
      "type": "dlt",
      "name": "大乐透",
      "success": true,
      "hasNewData": false,
      "latest": {
        "lottery_no": "2025131",
        "draw_date": "2025-11-17"
      }
    }
  ]
}
```

**执行逻辑（统一的增量爬取）**：
1. 获取数据库最新期号
2. 计算爬取范围（下一期 -> 当年最后一期）
3. 调用 `spider.fetch(startIssue, endIssue)` 爬取所有新数据
4. 批量入库（自动跳过已存在）
5. 如有新数据则进行预测
6. 发送 Telegram 通知

**说明**：
- 同时处理双色球、大乐透和七星彩
- 使用统一的增量爬取逻辑（与 Python 版本一致）
- 只在有新数据时发送 Telegram 通知

### 3. 查询最新数据

**接口**：`GET /latest/{type}`

**说明**：查询最新一期开奖数据

**参数**：
- `{type}`：彩票类型（`ssq`、`dlt`、`qxc` 或 `qlc`），可选，不指定则返回所有类型

**认证**：无需认证

**示例**：
```bash
# 所有类型（推荐）
curl https://your-worker.workers.dev/latest

# 指定类型
curl https://your-worker.workers.dev/latest/ssq    # 仅双色球
curl https://your-worker.workers.dev/latest/dlt    # 仅大乐透
```

**响应（所有类型）**：
```json
[
  {
    "lottery_type": "ssq",
    "lottery_name": "双色球",
    "lottery_no": "2025131",
    "draw_date": "2025-11-17",
    "red_balls": ["03", "09", "14", "17", "20", "27"],
    "blue_ball": "12",
    "sorted_code": "03,09,14,17,20,27-12"
  },
  {
    "lottery_type": "dlt",
    "lottery_name": "大乐透",
    "lottery_no": "2025131",
    "draw_date": "2025-11-17",
    "front_balls": ["03", "08", "25", "29", "32"],
    "back_balls": ["09", "12"],
    "sorted_code": "03,08,25,29,32-09,12"
  }
]
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
- `{type}`：彩票类型（`ssq`、`dlt`、`qxc` 或 `qlc`），可选，不指定则返回所有类型
- `count`：预测条数（可选，默认使用 KV 配置的值）
- `strategies`：策略列表（可选，默认使用 KV 配置的值）

**认证**：无需认证

**示例**：
```bash
# 所有类型（推荐）
curl https://your-worker.workers.dev/predict
curl "https://your-worker.workers.dev/predict?count=10&strategies=frequency,balanced"

# 指定类型
curl https://your-worker.workers.dev/predict/ssq    # 仅双色球
curl https://your-worker.workers.dev/predict/dlt    # 仅大乐透
curl "https://your-worker.workers.dev/predict/ssq?count=10&strategies=frequency,balanced"
```

**响应（所有类型）**：
```json
[
  {
    "lottery_type": "ssq",
    "lottery_name": "双色球",
    "predictions": [
      {
        "rank": 1,
        "red_balls": [3, 9, 14, 17, 20, 27],
        "blue_ball": 12,
        "sorted_code": "03,09,14,17,20,27-12",
        "strategy": "frequency"
      }
    ]
  },
  {
    "lottery_type": "dlt",
    "lottery_name": "大乐透",
    "predictions": [
      {
        "rank": 1,
        "front_balls": [3, 8, 25, 29, 32],
        "back_balls": [9, 12],
        "sorted_code": "03,08,25,29,32-09,12",
        "strategy": "frequency"
      }
    ]
  }
]
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
- `{type}`：彩票类型（`ssq`、`dlt`、`qxc` 或 `qlc`），可选，不指定则返回所有类型

**认证**：无需认证

**示例**：
```bash
# 所有类型（推荐）
curl https://your-worker.workers.dev/strategies

# 指定类型
curl https://your-worker.workers.dev/strategies/ssq    # 仅双色球
curl https://your-worker.workers.dev/strategies/dlt    # 仅大乐透
```

**响应（所有类型）**：
```json
[
  {
    "lottery_type": "ssq",
    "lottery_name": "双色球",
    "strategies": [
      {
        "key": "frequency",
        "name": "频率策略",
        "description": "基于历史出现频率"
      },
      {
        "key": "balanced",
        "name": "均衡策略",
        "description": "追求号码分布均衡"
      }
    ]
  },
  {
    "lottery_type": "dlt",
    "lottery_name": "大乐透",
    "strategies": [
      {
        "key": "frequency",
        "name": "频率策略",
        "description": "基于历史出现频率"
      },
      {
        "key": "balanced",
        "name": "均衡策略",
        "description": "追求号码分布均衡"
      }
    ]
  }
]
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
- `{type}`：彩票类型（`ssq`、`dlt`、`qxc` 或 `qlc`），可选，不指定则返回所有类型

**认证**：无需认证

**示例**：
```bash
# 所有类型（推荐）
curl https://your-worker.workers.dev/stats

# 指定类型
curl https://your-worker.workers.dev/stats/ssq    # 仅双色球
curl https://your-worker.workers.dev/stats/dlt    # 仅大乐透
```

**响应（所有类型）**：
```json
[
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
      { "ball": "15", "count": 275 }
    ]
  },
  {
    "lottery_type": "dlt",
    "lottery_name": "大乐透",
    "total_count": 2799,
    "top_front_balls": [
      { "ball": "07", "count": 420 },
      { "ball": "12", "count": 415 }
    ],
    "top_back_balls": [
      { "ball": "09", "count": 280 },
      { "ball": "12", "count": 275 }
    ]
  }
]
```

**响应（指定类型 - 双色球）**：
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

**版本**：3.0.0  
**更新日期**：2025-11-18  
**重大更新**：统一增量爬取逻辑
