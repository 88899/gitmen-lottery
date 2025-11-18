# 🎰 彩票预测系统

基于历史数据分析的彩票预测系统，支持双色球和大乐透。

提供 **Python** 和 **Cloudflare Workers** 两个版本。

## ✨ 特性

- 🎯 **双彩票支持**：双色球（SSQ）+ 大乐透（DLT）
- 🔄 **数据源**：500.com，稳定可靠
- 🤖 **智能爬取**：全量初始化 + 增量更新
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

# 3. 爬取数据
python lottery.py fetch dlt --mode full

# 4. 预测号码
python lottery.py predict dlt
```

### Cloudflare Workers 版本

```bash
# 1. 部署
cd cloudflare-worker
wrangler deploy

# 2. 初始化数据
./scripts/init.sh dlt

# 3. 使用 API
curl https://your-worker.workers.dev/predict/dlt
```

## 📖 文档

- [快速开始](./GETTING_STARTED.md) - 详细的入门指南
- [Python 版本](./lotteries/dlt/README.md) - Python 使用说明
- [Worker 版本](./cloudflare-worker/README.md) - Worker 使用说明
- [API 文档](./cloudflare-worker/API_USAGE.md) - API 接口说明

## 🎲 支持的彩票

| 彩票 | 代码 | 规则 | 开奖时间 |
|------|------|------|---------|
| 双色球 | ssq | 红球 1-33 选 6，蓝球 1-16 选 1 | 周二、四、日 |
| 大乐透 | dlt | 前区 1-35 选 5，后区 1-12 选 2 | 周一、三、六 |

## 🔧 使用示例

### Python 版本

```bash
# 处理所有彩票类型（推荐）
python lottery.py fetch --mode full    # 爬取所有类型
python lottery.py predict              # 预测所有类型
python lottery.py schedule             # 定时任务

# 处理指定类型
python lottery.py fetch ssq --mode full    # 仅双色球
python lottery.py predict dlt              # 仅大乐透
```

### Worker 版本

```bash
# 双色球
curl https://your-worker.workers.dev/latest/ssq
curl https://your-worker.workers.dev/predict/ssq

# 大乐透
curl https://your-worker.workers.dev/latest/dlt
curl https://your-worker.workers.dev/predict/dlt
```

## 📊 预测策略

| 策略 | 说明 |
|------|------|
| frequency | 基于历史高频号码 |
| random | 完全随机选择 |
| balanced | 大小号均衡分布 |
| coldHot | 结合冷热号 |

## 🛠️ 技术栈

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
│   └── dlt/           # 大乐透
├── cli/               # CLI 命令
├── core/              # 核心模块
├── cloudflare-worker/ # Worker 版本
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

# 预测策略
DEFAULT_STRATEGIES=frequency,balanced,coldHot
DEFAULT_PREDICTION_COUNT=15

# Telegram（可选）
TELEGRAM_BOT_TOKEN=your_token
TELEGRAM_CHAT_ID=your_chat_id
```

## ⚠️ 免责声明

本项目仅供学习和研究使用，不构成任何投资建议。彩票具有随机性，请理性购彩。

## 📄 许可证

MIT License

---

**版本**：2.0.0  
**更新日期**：2025-11-18
python lottery.py
```

详细文档：[docs/USAGE.md](./docs/USAGE.md)

## 📊 核心功能

### 1. 数据爬取

**双数据源架构**，自动切换：
- 主源：中彩网 API（支持大量历史数据）
- 备用源：500.com（稳定性高）

**两种模式**：
- **全量爬取**：首次初始化，获取所有历史数据
- **增量更新**：日常运行，只获取新数据

### 2. 智能预测

基于历史数据的多维度分析：
- 频率分析：统计每个号码的出现频率
- 遗漏分析：计算号码的遗漏期数
- 冷热分析：识别冷号和热号
- 组合优化：生成最优号码组合

### 3. 实时通知

通过 Telegram Bot 推送：
- 每日开奖结果
- 预测号码推荐
- 统计信息
- 错误告警

## 🏗️ 架构设计

```
┌─────────────────────────────────────────┐
│          数据源（自动切换）              │
│  ┌──────────────┐  ┌──────────────┐    │
│  │  中彩网 API  │  │  500.com     │    │
│  └──────────────┘  └──────────────┘    │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│              爬虫模块                    │
│  • 双数据源支持                          │
│  • 自动切换                              │
│  • 错误重试                              │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│            数据存储                      │
│  • Cloudflare D1 (Workers 版本)         │
│  • MySQL/SQLite (Python 版本)           │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│            预测算法                      │
│  • 频率分析                              │
│  • 遗漏分析                              │
│  • 冷热分析                              │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│          Telegram 通知                   │
│  • 开奖结果                              │
│  • 预测推荐                              │
│  • 统计信息                              │
└─────────────────────────────────────────┘
```

## 📁 项目结构

```
gitmen-lottery/
├── cloudflare-worker/      # Cloudflare Workers 版本
│   ├── src/               # 源代码
│   ├── docs/              # 文档
│   └── scripts/           # 脚本
├── lotteries/             # Python 版本
│   └── ssq/              # 双色球模块
├── core/                  # 核心模块
├── docs/                  # 项目文档
├── scripts/               # 工具脚本
└── tests/                 # 测试文件
```

详细说明：[PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md)

## 🔧 核心改进

### 2025-11-17 重大更新

1. **双数据源支持**
   - 添加 500.com 作为备用数据源
   - 主源失败自动切换到备用源
   - 提高数据获取成功率

2. **全量爬取修复**
   - 移除 1000 条限制
   - 支持获取所有历史数据（4000+ 期）
   - 自动去重，可重复执行

3. **增量更新优化**
   - 从数据库最新期号往后爬
   - 避免漏掉中间的数据
   - 智能检测，自动补全

4. **接口分离**
   - `/init` 专注批量导入
   - `/run` 专注增量更新
   - 逻辑清晰，互不干扰

详细说明：[docs/fixes/](./docs/fixes/)

## 📚 文档

### 快速开始
- [Cloudflare Worker 快速开始](./cloudflare-worker/docs/快速开始.md)
- [Python 版本使用指南](./docs/USAGE.md)

### 架构设计
- [系统架构](./docs/ARCHITECTURE.md)
- [项目设计](./docs/PROJECT_DESIGN.md)
- [接口设计](./cloudflare-worker/docs/接口设计说明.md)

### 修复文档
- [数据源修复](./docs/fixes/数据源修复总结.md)
- [全量爬取修复](./docs/fixes/全量爬取修复总结.md)
- [增量更新修复](./cloudflare-worker/docs/增量更新逻辑修复.md)

### 部署文档
- [Cloudflare Worker 部署](./cloudflare-worker/README.md)
- [Docker 部署](./deployment/README.md)

## 🎯 使用场景

### 场景 1：个人使用

使用 Cloudflare Workers 版本：
- 完全免费
- 无需服务器
- 自动运行

### 场景 2：团队使用

使用 Python 版本：
- 部署在自己的服务器
- 数据完全掌控
- 易于定制

### 场景 3：数据分析

使用 Python 版本：
- 导出数据
- 自定义分析
- 集成到其他系统

## ⚠️ 免责声明

本项目仅供学习和研究使用，严禁用于任何商业或非法用途。

- 所有预测结果基于历史数据统计，不代表未来结果
- 不保证任何中奖概率
- 请理性对待彩票，切勿沉迷
- 使用本项目产生的任何后果由使用者自行承担

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT License

## 🌟 Star History

如果觉得有用，请给项目一个 Star ⭐

---

**最后更新**：2025-11-17  
**版本**：2.0.0
