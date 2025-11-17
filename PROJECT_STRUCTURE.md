# 项目结构说明

## 📁 目录结构

```
gitmen-lottery/
├── cloudflare-worker/          # Cloudflare Workers 版本
│   ├── src/                    # 源代码
│   │   ├── index.js           # 主入口
│   │   ├── spiders/           # 爬虫模块
│   │   ├── predictors/        # 预测模块
│   │   └── utils/             # 工具模块
│   ├── docs/                   # 文档
│   │   ├── 快速开始.md
│   │   ├── 接口设计说明.md
│   │   ├── 增量更新逻辑修复.md
│   │   └── ...
│   ├── scripts/                # 脚本
│   │   ├── init.sh            # 初始化脚本
│   │   ├── diagnose.sh        # 诊断脚本
│   │   └── ...
│   ├── README.md              # 说明文档
│   ├── wrangler.toml          # Cloudflare 配置
│   └── schema.sql             # 数据库结构
│
├── lotteries/                  # Python 版本
│   ├── ssq/                   # 双色球模块
│   │   ├── spider.py          # 爬虫
│   │   ├── predictor.py       # 预测
│   │   ├── database.py        # 数据库
│   │   ├── test_spider.py     # 测试
│   │   └── BUGFIX_README.md   # 修复说明
│   └── dlt/                   # 大乐透模块（预留）
│
├── core/                       # 核心模块
│   ├── base_spider.py         # 爬虫基类
│   ├── base_predictor.py      # 预测基类
│   ├── base_database.py       # 数据库基类
│   ├── config.py              # 配置管理
│   ├── telegram_bot.py        # Telegram 通知
│   └── utils.py               # 工具函数
│
├── cli/                        # 命令行工具
│   ├── fetch.py               # 数据获取
│   ├── predict.py             # 预测
│   └── schedule.py            # 定时任务
│
├── docs/                       # 项目文档
│   ├── fixes/                 # 修复文档
│   │   ├── 数据源修复总结.md
│   │   ├── 全量爬取修复总结.md
│   │   └── 全量爬取说明.md
│   ├── guides/                # 使用指南
│   ├── deployment/            # 部署文档
│   ├── ARCHITECTURE.md        # 架构设计
│   ├── PROJECT_DESIGN.md      # 项目设计
│   └── USAGE.md               # 使用说明
│
├── scripts/                    # 脚本工具
│   ├── init_database.py       # 初始化数据库
│   ├── daily_task.py          # 每日任务
│   └── setup_github.sh        # GitHub 设置
│
├── tests/                      # 测试文件
│   ├── test_telegram.py       # Telegram 测试
│   └── README.md              # 测试说明
│
├── deployment/                 # 部署配置
│   ├── docker/                # Docker 配置
│   ├── docker-compose.yml     # Docker Compose
│   └── README.md              # 部署说明
│
├── data/                       # 数据目录
│   ├── backup/                # 备份
│   └── export/                # 导出
│
├── logs/                       # 日志目录
│   └── ssq/                   # 双色球日志
│
├── .env.example               # 环境变量示例
├── .gitignore                 # Git 忽略文件
├── requirements.txt           # Python 依赖
├── lottery.py                 # 主程序入口
├── README.md                  # 项目说明
├── CHANGELOG.md               # 更新日志
└── PROJECT_STRUCTURE.md       # 本文档
```

## 🎯 核心模块说明

### Cloudflare Worker 版本

**用途**：无服务器部署，适合自动化运行

**特点**：
- 完全免费（Cloudflare 免费套餐）
- 自动扩展
- 全球 CDN
- D1 数据库 + KV 存储

**主要文件**：
- `src/index.js` - HTTP 路由和任务调度
- `src/spiders/ssq.js` - 双数据源爬虫
- `scripts/init.sh` - 初始化脚本

**接口**：
- `/init` - 批量导入历史数据
- `/run` - 增量更新
- `/latest` - 查询最新数据
- `/predict` - 获取预测
- `/stats` - 统计信息

### Python 版本

**用途**：本地运行，功能完整

**特点**：
- 功能丰富
- 易于扩展
- 支持多种数据库
- 命令行工具

**主要文件**：
- `lotteries/ssq/spider.py` - 爬虫（双数据源）
- `lotteries/ssq/predictor.py` - 预测算法
- `lotteries/ssq/database.py` - 数据库操作

**使用方式**：
```python
from lotteries.ssq.spider import SSQSpider

spider = SSQSpider()

# 获取最新数据
latest = spider.fetch_latest(count=1)

# 增量更新
new_data = spider.fetch_incremental(db_latest_no='2025120')

# 全量爬取
all_data = spider.crawl_all(max_pages=None)
```

## 📚 文档说明

### 快速开始

1. **Cloudflare Worker**：[cloudflare-worker/docs/快速开始.md](./cloudflare-worker/docs/快速开始.md)
2. **Python 版本**：[docs/USAGE.md](./docs/USAGE.md)

### 架构设计

- [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) - 系统架构
- [docs/PROJECT_DESIGN.md](./docs/PROJECT_DESIGN.md) - 项目设计

### 修复文档

- [docs/fixes/数据源修复总结.md](./docs/fixes/数据源修复总结.md)
- [docs/fixes/全量爬取修复总结.md](./docs/fixes/全量爬取修复总结.md)
- [cloudflare-worker/docs/增量更新逻辑修复.md](./cloudflare-worker/docs/增量更新逻辑修复.md)

### 部署文档

- [cloudflare-worker/README.md](./cloudflare-worker/README.md) - Worker 部署
- [deployment/README.md](./deployment/README.md) - Docker 部署

## 🔧 核心功能

### 1. 数据爬取

**双数据源架构**：
- 主源：中彩网 API
- 备用源：500.com
- 自动切换

**爬取模式**：
- 全量爬取：`/init` 或 `crawl_all()`
- 增量更新：`/run` 或 `fetch_incremental()`

### 2. 数据预测

**算法**：
- 频率分析
- 遗漏分析
- 冷热分析
- 组合优化

### 3. 通知推送

**Telegram Bot**：
- 每日开奖通知
- 预测结果推送
- 错误告警

## 🚀 快速使用

### Cloudflare Worker

```bash
# 1. 部署
cd cloudflare-worker
npx wrangler deploy

# 2. 初始化
bash scripts/init.sh

# 3. 配置定时任务（Dashboard）
```

### Python 版本

```bash
# 1. 安装依赖
pip install -r requirements.txt

# 2. 配置环境变量
cp .env.example .env
# 编辑 .env

# 3. 初始化数据库
python scripts/init_database.py

# 4. 运行
python lottery.py
```

## 📊 数据流程

```
数据源（中彩网/500.com）
    ↓
爬虫（自动切换）
    ↓
数据验证
    ↓
数据库（D1/MySQL）
    ↓
预测算法
    ↓
Telegram 通知
```

## 🔄 更新日志

详见 [CHANGELOG.md](./CHANGELOG.md)

## 📝 贡献指南

1. Fork 项目
2. 创建分支
3. 提交更改
4. 发起 Pull Request

## 📄 许可证

MIT License

---

**最后更新**：2025-11-17  
**版本**：2.0.0
