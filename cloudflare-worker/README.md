# Cloudflare Worker 版本

## 概述

彩票预测系统的 Cloudflare Worker 版本，支持双色球、大乐透、七星彩和七乐彩。

## 支持的彩票类型

- **ssq** - 双色球
- **dlt** - 大乐透
- **qxc** - 七星彩
- **qlc** - 七乐彩

## 快速开始

### 1. 部署

```bash
# 安装依赖
npm install

# 部署到 Cloudflare
wrangler deploy
```

### 2. 配置

```bash
# 设置 API Key
wrangler kv:key put --binding=KV_BINDING API_KEY "your-secret-key"

# 设置 Telegram
wrangler kv:key put --binding=KV_BINDING TELEGRAM_BOT_TOKEN "your-bot-token"
wrangler kv:key put --binding=KV_BINDING TELEGRAM_CHAT_ID "your-chat-id"

# 设置默认策略
wrangler kv:key put --binding=KV_BINDING DEFAULT_STRATEGIES "frequency,balanced,coldHot"
wrangler kv:key put --binding=KV_BINDING DEFAULT_PREDICTION_COUNT "15"
```

### 3. 初始化数据

```bash
# 所有类型（推荐）
./scripts/init.sh

# 或指定类型
./scripts/init.sh ssq    # 仅双色球
./scripts/init.sh dlt    # 仅大乐透
./scripts/init.sh qxc    # 仅七星彩
```

**新特性**：
- 🚀 使用智能增量逻辑，通常 1-2 次调用即可完成
- 🎯 自动判断何时停止，避免无效重试
- ⚡ 减少 80%+ API 调用次数

## API 接口

### 支持多模块的接口

```
POST /run/{type}       - 手动执行每日任务
POST /init/{type}      - 初始化数据库
GET /latest/{type}     - 查询最新数据
GET /predict/{type}    - 获取预测结果
GET /strategies/{type} - 查看可用策略
GET /stats/{type}      - 查看统计信息
GET /test              - 测试 Telegram 连接
```

其中 `{type}` 可以是：`ssq`（双色球）、`dlt`（大乐透）、`qxc`（七星彩）或 `qlc`（七乐彩）

### 兼容旧接口

以下接口默认使用双色球（向后兼容）：

```
POST /run, POST /init, GET /latest, GET /predict, GET /strategies, GET /stats
```

## 使用示例

### 双色球

```bash
# 初始化数据库
curl -X POST https://your-worker.workers.dev/init/ssq \
  -H "Authorization: Bearer YOUR_API_KEY"

# 查询最新数据
curl https://your-worker.workers.dev/latest/ssq

# 预测号码
curl "https://your-worker.workers.dev/predict/ssq?count=10&strategies=frequency,balanced"

# 查看统计
curl https://your-worker.workers.dev/stats/ssq
```

### 大乐透

```bash
# 初始化数据库
curl -X POST https://your-worker.workers.dev/init/dlt \
  -H "Authorization: Bearer YOUR_API_KEY"

# 查询最新数据
curl https://your-worker.workers.dev/latest/dlt

# 预测号码
curl "https://your-worker.workers.dev/predict/dlt?count=15&strategies=frequency,coldHot"

# 查看统计
curl https://your-worker.workers.dev/stats/dlt
```

## 脚本工具

### init.sh - 批量初始化

```bash
# 双色球
./scripts/init.sh ssq

# 大乐透
./scripts/init.sh dlt
```

**功能**：
- 批量导入历史数据
- 自动断点续传
- 每日请求限制
- 智能停止

**配置**（`.env` 文件）：
```bash
WORKER_URL=https://your-worker.workers.dev
API_KEY=your-api-key
SLEEP_TIME=120
DAILY_REQUEST_LIMIT=500
AUTO_CONTINUE=false
```

详见：[scripts/INIT_USAGE.md](./scripts/INIT_USAGE.md)

## 定时任务

在 Cloudflare Dashboard 中配置触发器：

### 配置方式

1. 进入 Workers & Pages > 你的 Worker > Triggers
2. 点击 "Add Cron Trigger"
3. 输入 Cron 表达式：`30 13 * * *`（每天 21:30 北京时间）
4. 保存

**说明**：
- Worker 会自动调用 `scheduled` 方法处理定时任务
- 定时任务会自动处理所有彩票类型（双色球、大乐透和七星彩）
- 无需配置多个触发器

**执行流程（统一的增量爬取逻辑）**：
1. 获取数据库最新期号
2. 计算爬取范围（下一期 -> 当年最后一期）
3. 调用 `spider.fetch(startIssue, endIssue)` 爬取所有新数据
4. 批量入库（自动跳过已存在）
5. 如有新数据则进行预测
6. 发送 Telegram 通知（与 Python 版本格式一致）

**Telegram 消息特性**：
- 🎯 与 Python 版本格式完全一致
- 📱 分别发送每个彩票类型，避免消息截断
- 🏷️ 显示策略名称（频率策略、均衡策略等）
- 📊 显示所有预测组合，不限制数量

## 配置文件

### wrangler.toml

```toml
name = "lottery-predictor"
main = "src/index.js"
compatibility_date = "2024-01-01"

[[d1_databases]]
binding = "DB"
database_name = "lottery_db"
database_id = "your-database-id"

[[kv_namespaces]]
binding = "KV_BINDING"
id = "your-kv-id"

[vars]
DEFAULT_STRATEGIES = "frequency,balanced,coldHot"
DEFAULT_PREDICTION_COUNT = "15"
```

## 目录结构

```
cloudflare-worker/
├── src/
│   ├── index.js              # 主入口
│   ├── spiders/
│   │   ├── ssq.js           # 双色球爬虫
│   │   └── dlt.js           # 大乐透爬虫
│   ├── predictors/
│   │   ├── ssq.js           # 双色球预测器
│   │   ├── dlt.js           # 大乐透预测器
│   │   └── strategies/      # 预测策略
│   │       ├── ssq/         # 双色球策略
│   │       └── dlt/         # 大乐透策略
│   └── utils/
│       ├── database.js      # 数据库工具
│       └── telegram.js      # Telegram 通知
├── scripts/
│   ├── init.sh              # 初始化脚本
│   ├── INIT_USAGE.md        # 使用指南
│   └── README.md            # 脚本说明
├── docs/                    # 文档目录
├── .env.example             # 配置示例
├── package.json
├── wrangler.toml
└── README.md                # 本文件
```

## 预测策略

| 策略 | 说明 |
|------|------|
| frequency | 频率策略 - 基于历史高频号码 |
| random | 随机策略 - 完全随机选择 |
| balanced | 均衡策略 - 大小号均衡分布 |
| coldHot | 冷热号策略 - 结合冷热号 |

## 故障排查

### 问题1：401 Unauthorized

**原因**：API Key 未配置或错误

**解决**：
```bash
wrangler kv:key put --binding=KV_BINDING API_KEY "your-secret-key"
```

### 问题2：404 Not Found

**原因**：接口路径错误

**解决**：确保路径包含彩票类型
```bash
# 错误
curl https://your-worker.workers.dev/predict

# 正确
curl https://your-worker.workers.dev/predict/dlt
```

### 问题3：500 Internal Server Error

**原因**：数据库未初始化

**解决**：
```bash
curl -X POST https://your-worker.workers.dev/init/dlt \
  -H "Authorization: Bearer YOUR_API_KEY"
```

## 相关文档

- [API 使用文档](./API_USAGE.md) - 详细的 API 说明
- [脚本使用指南](./scripts/INIT_USAGE.md) - init.sh 使用说明
- [部署指南](./docs/DEPLOY.md) - 部署步骤

## 技术栈

- Cloudflare Workers
- D1 数据库
- KV 存储
- Telegram Bot API

## 许可证

MIT License

---

**版本**：3.0.0  
**更新日期**：2025-11-18  
**重大更新**：统一增量爬取逻辑
