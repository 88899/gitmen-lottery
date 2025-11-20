# 🎰 彩票预测系统

基于历史数据分析的彩票预测系统，支持双色球、大乐透和七星彩。

提供 **Python** 和 **Cloudflare Workers** 两个版本。

## ✨ 特性

- 🎯 **四彩票支持**：双色球（SSQ）+ 大乐透（DLT）+ 七星彩（QXC）+ 七乐彩（QLC）
- 🔄 **数据源**：500.com，稳定可靠
- 🤖 **智能爬取**：统一的增量爬取逻辑
- 📊 **多策略预测**：频率、随机、均衡、冷热号
- 📱 **Telegram 通知**：实时推送预测结果
- ☁️ **双版本**：Python 本地版 + Worker 云端版

## 🚀 快速开始

### Python 版本

```bash
# 1. 安装依赖
pip install -r requirements.txt

# 2. 配置
cp .env.example .env
vim .env

# 3. 全量爬取（首次使用，自动完成所有年份）
python lottery.py fetch ssq --mode full  # 双色球：自动爬取所有年份直到完成
python lottery.py fetch dlt --mode full  # 大乐透：自动爬取所有年份直到完成
python lottery.py fetch qxc --mode full  # 七星彩：自动爬取所有年份直到完成

# 4. 增量更新（日常使用）
python lottery.py fetch ssq
python lottery.py fetch dlt
python lottery.py fetch qxc

# 5. 预测号码
python lottery.py predict ssq
python lottery.py predict dlt
python lottery.py predict qxc

# 6. 定时任务（自动增量 + 预测）
python lottery.py schedule
```

### Cloudflare Workers 版本

```bash
# 1. 部署
cd cloudflare-worker
wrangler deploy

# 2. 初始化数据（首次使用）
./scripts/init.sh ssq
./scripts/init.sh dlt
./scripts/init.sh qxc

# 3. 使用 API
curl https://your-worker.workers.dev/latest/ssq
curl https://your-worker.workers.dev/predict/dlt
curl https://your-worker.workers.dev/predict/qxc
```

## 📖 文档

- [架构说明](./docs/ARCHITECTURE.md) - 系统架构和设计
- [Worker 版本](./cloudflare-worker/README.md) - Worker 使用说明
- [API 文档](./cloudflare-worker/API_USAGE.md) - API 接口说明
- [Telegram 设置](./docs/guides/TELEGRAM_SETUP.md) - Telegram 配置指南
- [质量保证](./scripts/README.md) - 检查清单和验证脚本 ⭐

## 🎲 支持的彩票

| 彩票 | 代码 | 规则 | 开奖时间 |
|------|------|------|---------|
| 双色球 | ssq | 红球 1-33 选 6，蓝球 1-16 选 1 | 周二、四、日 21:15 |
| 大乐透 | dlt | 前区 1-35 选 5，后区 1-12 选 2 | 周一、三、六 21:25 |
| 七星彩 | qxc | 7个位置，每位 0-9 | 周二、五 20:30 |
| 七乐彩 | qlc | 基本号 1-30 选 7，特别号 1-30 选 1 | 周一、三、五 21:15 |

## 🔧 核心功能

### 1. 统一的爬取接口

Python 和 Cloudflare Worker 使用相同的爬取逻辑：

```python
# Python
spider.fetch(start_issue, end_issue)  # 按期号范围爬取
spider.fetch()                         # 获取最新数据
```

```javascript
// Cloudflare Worker
spider.fetch(startIssue, endIssue)  // 按期号范围爬取
spider.fetch()                       // 获取最新数据
```

### 2. 智能增量更新

自动从数据库最新期号的下一期开始爬取：

```
数据库最新期号: 2025133
爬取范围: 25134 -> 25200
自动跳过已存在的数据
```

### 3. 定时任务

定时任务 = 增量爬取 + 预测：

```python
# Python
fetch_incremental_data('ssq', with_predict=True)
```

```javascript
// Cloudflare Worker
processSingleLottery('ssq', env, config)
```

## 📊 预测策略

| 策略 | 说明 | 特点 |
|------|------|------|
| frequency | 基于历史高频号码 | 统计分析，选择出现频率高的号码 |
| balanced | 大小号均衡分布 | 保持大号小号的平衡，避免极端分布 |
| coldHot | 冷热号结合 | 结合冷号（长期未出现）和热号（近期频繁） |
| random | 完全随机选择 | 纯随机生成，增加预测的多样性 |

### 策略配置

在 `.env` 文件中配置使用的策略：

```bash
# 预测策略配置
DEFAULT_STRATEGIES=frequency,balanced,coldHot,random  # 使用的策略（逗号分隔）
DEFAULT_PREDICTION_COUNT=5                            # 每种策略生成的组合数
```

**预测结果**：
- 如果配置 4 种策略，每种生成 5 组，总共 20 组预测
- 每种策略会在日志中显示使用情况和生成结果
- 可根据需要调整策略组合，如只使用 `frequency,random`

## �️ 技术栈

### Python 版本
- Python 3.8+
- MySQL 5.7+
- BeautifulSoup4
- APScheduler

### Worker 版本
- Cloudflare Workers
- D1 数据库
- KV 存储

## 📁 项目结构

```
lottery-predictor/
├── lotteries/          # 彩票模块
│   ├── ssq/           # 双色球
│   ├── dlt/           # 大乐透
│   ├── qxc/           # 七星彩
│   └── qlc/           # 七乐彩
├── cli/               # CLI 命令
│   ├── fetch.py       # 爬取命令（核心方法）
│   ├── predict.py     # 预测命令
│   ├── schedule.py    # 定时任务
│   └── smart_fetch.py # 智能爬取核心
├── core/              # 核心模块
├── cloudflare-worker/ # Worker 版本
├── scripts/           # 质量保证脚本 ⭐
│   ├── README.md                  # 脚本使用说明
│   ├── INTEGRATION_CHECKLIST.md  # 完整检查清单
│   ├── quality_check.sh           # 全面质量检查
│   └── integration_check.sh       # 集成完整性检查
├── docs/              # 文档
├── lottery.py         # 主入口
└── README.md          # 本文件
```

## 📝 配置

在 `.env` 文件中配置：

```bash
# 数据库
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=lottery_db

# 预测策略配置
DEFAULT_STRATEGIES=frequency,balanced,coldHot,random  # 使用的策略
DEFAULT_PREDICTION_COUNT=5                            # 每种策略生成组合数

# Telegram（可选）
TELEGRAM_BOT_TOKEN=your_token
TELEGRAM_CHAT_ID=your_chat_id

# Telegram 频道配置（可选）
TELEGRAM_CHANNEL_ID=@your_channel_username  # 或 -1001234567890
TELEGRAM_SEND_TO_BOT=true                   # 是否发送给机器人
TELEGRAM_SEND_TO_CHANNEL=false             # 是否发送给频道

# 代理（可选，用于本地测试）
# 如果在中国大陆需要代理访问 Telegram API
TELEGRAM_PROXY=http://127.0.0.1:7890  # 代理地址，根据你的代理工具调整端口
```

## 🔄 最新更新（2025-11-19）

### 📢 Telegram 频道支持
- **新功能**：支持同时发送消息到 Telegram 机器人和频道
- **灵活配置**：可选择发送给机器人、频道或两者
- **统一接口**：Python 和 Cloudflare Worker 版本保持一致
- **配置文档**：[Telegram 频道设置指南](./docs/TELEGRAM_CHANNEL_SETUP.md)

### 🎯 预测策略配置修复
- **修复问题**：预测器只使用 `frequency` 策略，忽略 `.env` 配置
- **根本原因**：所有预测器调用都没有传入 `strategies` 参数
- **修复文件**：`cli/fetch.py`、`cli/predict.py`、`cli/schedule.py`

### 📱 Telegram 消息格式优化
- **分开发送**：每种彩票分别发送，避免消息过长
- **格式清晰**：每个组合单独显示，策略名称明确标注
- **等宽字体**：使用 `<code>` 标签确保号码对齐
- **简洁明了**：去除冗余信息，专注于预测结果
- **修复效果**：现在完全按照 `.env` 中的 `DEFAULT_STRATEGIES` 配置工作

### 📊 多策略预测增强
- **配置示例**：`DEFAULT_STRATEGIES=frequency,balanced,coldHot,random`
- **预测结果**：每种策略生成指定数量组合（如 4策略×5组=20组）
- **日志显示**：清晰显示每种策略的使用和生成结果
- **灵活配置**：可通过 `.env` 自由调整策略组合

### 🔧 系统架构优化
1. **统一爬虫接口**
   - Python 和 Worker 使用相同的 `fetch()` 方法
   - 支持全量、增量、获取最新三种场景

2. **智能全量爬取**
   - 逐年推进模式，避免访问量过大被限制
   - 智能判断缺失年份，自动循环爬取直到完成
   - 一次执行完成所有年份，无需重复执行

3. **统一增量逻辑**
   - 从数据库最新期号的下一期开始爬取
   - 自动跳过已存在的数据
   - Python 和 Worker 使用相同的逻辑

4. **优化 Telegram 消息**
   - 与 Python 版本格式完全一致
   - 显示策略名称和所有预测组合
   - 分别发送，避免消息截断

## ⚠️ 免责声明

本项目仅供学习和研究使用，不构成任何投资建议。彩票具有随机性，请理性购彩。

详细说明：[DISCLAIMER.md](./DISCLAIMER.md)

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT License

---

**版本**：3.1.0  
**更新日期**：2025-11-19