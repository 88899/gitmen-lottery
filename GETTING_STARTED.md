# 快速开始

## 概述

彩票预测系统，支持双色球和大乐透，提供 Python 版本和 Cloudflare Worker 版本。

## 支持的彩票类型

- **双色球（SSQ）** - 红球 1-33 选 6，蓝球 1-16 选 1
- **大乐透（DLT）** - 前区 1-35 选 5，后区 1-12 选 2

## Python 版本

### 安装

```bash
# 1. 克隆项目
git clone https://github.com/your-repo/lottery-predictor.git
cd lottery-predictor

# 2. 安装依赖
pip install -r requirements.txt

# 3. 配置数据库
cp .env.example .env
vim .env  # 配置数据库连接

# 4. 创建数据库
mysql -u root -p -e "CREATE DATABASE lottery_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
```

### 使用

#### 双色球

```bash
# 爬取数据
python lottery.py fetch ssq --mode full

# 预测号码
python lottery.py predict ssq
```

#### 大乐透

```bash
# 爬取数据
python lottery.py fetch dlt --mode full

# 预测号码
python lottery.py predict dlt
```

### 配置策略

在 `.env` 文件中配置：

```bash
# 预测策略（逗号分隔）
DEFAULT_STRATEGIES=frequency,balanced,coldHot

# 预测条数
DEFAULT_PREDICTION_COUNT=15

# Telegram 通知（可选）
TELEGRAM_BOT_TOKEN=your-bot-token
TELEGRAM_CHAT_ID=your-chat-id
```

## Cloudflare Worker 版本

### 部署

```bash
# 1. 进入目录
cd cloudflare-worker

# 2. 安装依赖
npm install

# 3. 配置 wrangler.toml
vim wrangler.toml

# 4. 部署
wrangler deploy
```

### 配置

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

### 初始化数据

```bash
# 双色球
./scripts/init.sh ssq

# 大乐透
./scripts/init.sh dlt
```

### API 使用

```bash
# 查询最新数据
curl https://your-worker.workers.dev/latest/dlt

# 预测号码
curl "https://your-worker.workers.dev/predict/dlt?count=15&strategies=frequency,coldHot"

# 查看统计
curl https://your-worker.workers.dev/stats/dlt
```

## 预测策略

| 策略 | 说明 | 适用场景 |
|------|------|---------|
| frequency | 频率策略 | 追求高频号码，稳健型 |
| random | 随机策略 | 完全随机，冒险型 |
| balanced | 均衡策略 | 大小号均衡，平衡型 |
| coldHot | 冷热号策略 | 结合冷热号，综合型 |

## 常用命令

### Python 版本

```bash
# 查看帮助
python lottery.py --help

# 双色球
python lottery.py fetch ssq --mode full    # 爬取全量数据
python lottery.py fetch ssq --mode latest  # 爬取最新数据
python lottery.py predict ssq              # 预测号码

# 大乐透
python lottery.py fetch dlt --mode full    # 爬取全量数据
python lottery.py fetch dlt --mode latest  # 爬取最新数据
python lottery.py predict dlt              # 预测号码

# 定时任务（自动处理所有彩票类型）
python lottery.py schedule                 # 启动定时任务（双色球+大乐透）
```

### Worker 版本

```bash
# 双色球
curl https://your-worker.workers.dev/latest/ssq
curl https://your-worker.workers.dev/predict/ssq
curl https://your-worker.workers.dev/stats/ssq

# 大乐透
curl https://your-worker.workers.dev/latest/dlt
curl https://your-worker.workers.dev/predict/dlt
curl https://your-worker.workers.dev/stats/dlt
```

## 目录结构

```
lottery-predictor/
├── lotteries/              # 彩票模块
│   ├── ssq/               # 双色球
│   │   ├── strategies/    # 预测策略
│   │   ├── config.py      # 配置
│   │   ├── database.py    # 数据库
│   │   ├── spider.py      # 爬虫
│   │   ├── predictor.py   # 预测器
│   │   └── README.md      # 说明文档
│   └── dlt/               # 大乐透（结构同上）
├── cli/                   # CLI 命令
├── core/                  # 核心模块
├── cloudflare-worker/     # Worker 版本
│   ├── src/              # 源代码
│   ├── scripts/          # 脚本工具
│   └── README.md         # 说明文档
├── lottery.py            # 主入口
├── .env.example          # 配置示例
└── README.md             # 项目说明
```

## 文档

### Python 版本
- [双色球使用指南](./lotteries/ssq/README.md)
- [大乐透快速开始](./lotteries/dlt/QUICK_START.md)
- [大乐透使用指南](./lotteries/dlt/USAGE_GUIDE.md)

### Worker 版本
- [Worker 说明](./cloudflare-worker/README.md)
- [API 使用文档](./cloudflare-worker/API_USAGE.md)
- [脚本使用指南](./cloudflare-worker/scripts/INIT_USAGE.md)

### 其他
- [项目说明](./README.md)
- [更新日志](./CHANGELOG.md)
- [免责声明](./DISCLAIMER.md)

## 故障排查

### 数据库连接失败

```bash
# 检查配置
cat .env | grep DB_

# 测试连接
mysql -h localhost -u root -p lottery_db
```

### 爬取失败

```bash
# 检查网络
curl -I https://datachart.500.com/dlt/history/newinc/history.php

# 查看日志
tail -f logs/dlt/fetch.log
```

### 预测失败

```bash
# 检查数据
mysql -u root -p lottery_db -e "SELECT COUNT(*) FROM dlt_lottery;"

# 查看日志
tail -f logs/dlt/predict.log
```

## 技术栈

### Python 版本
- Python 3.8+
- MySQL 5.7+
- BeautifulSoup4
- APScheduler
- Requests

### Worker 版本
- Cloudflare Workers
- D1 数据库
- KV 存储
- Telegram Bot API

## 许可证

MIT License

## 免责声明

本项目仅供学习和研究使用，不构成任何投资建议。彩票具有随机性，请理性购彩。

---

**版本**：2.0.0  
**更新日期**：2025-11-18
