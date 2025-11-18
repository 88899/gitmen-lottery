# 📚 文档索引

欢迎查阅彩票预测系统文档！

## 🚀 快速开始

| 文档 | 说明 |
|------|------|
| [README.md](../README.md) | 项目介绍和快速开始 ⭐ |
| [快速开始指南](../GETTING_STARTED.md) | 详细的使用步骤 ⭐ |
| [Telegram 配置](guides/TELEGRAM_SETUP.md) | 机器人配置教程 ⭐ |

## 📖 核心文档

| 文档 | 说明 |
|------|------|
| [项目架构](ARCHITECTURE.md) | 完整的架构说明 |
| [Telegram 代理配置](TELEGRAM_PROXY_SETUP.md) | 代理配置说明 |

## 🎰 彩票模块

| 模块 | 说明 | 状态 |
|------|------|------|
| [双色球](../lotteries/ssq/README.md) | 双色球模块 | ✅ 已实现 |
| [大乐透](../lotteries/dlt/README.md) | 大乐透模块 | 🚧 开发中 |

## 🎯 按场景导航

### 场景 1: 首次使用

1. 阅读 [README.md](../README.md) 了解项目
2. 查看 [快速开始指南](../GETTING_STARTED.md)
3. 配置 [Telegram 机器人](guides/TELEGRAM_SETUP.md)

### 场景 2: 本地开发

1. 查看 [README.md](../README.md) 快速开始
2. 参考 [双色球模块](../lotteries/ssq/)
3. 查看 [项目架构](ARCHITECTURE.md)

### 场景 3: 故障排查

1. 查看 [Telegram 配置](guides/TELEGRAM_SETUP.md#常见问题)
2. 查看 [Telegram 代理配置](TELEGRAM_PROXY_SETUP.md)
3. 检查日志文件

## ❓ 常见问题

### 如何开始使用？

```bash
# 安装依赖
pip install -r requirements.txt

# 配置环境变量
cp .env.example .env
vim .env

# 爬取数据
python lottery.py fetch ssq --mode full

# 预测号码
python lottery.py predict ssq
```

### 如何配置 Telegram？

查看 [Telegram 配置指南](guides/TELEGRAM_SETUP.md)

### 如何查看日志？

```bash
# 应用日志
tail -f logs/ssq/fetch.log
tail -f logs/ssq/predict.log
```

### 遇到问题怎么办？

1. 查看对应文档的故障排查部分
2. 检查日志文件
3. 提交 Issue

## 📝 文档结构

```
docs/
├── INDEX.md                    # 本文件（文档索引）
├── ARCHITECTURE.md             # 项目架构说明
├── TELEGRAM_PROXY_SETUP.md     # Telegram 代理配置
│
└── guides/                     # 使用指南
    └── TELEGRAM_SETUP.md      # Telegram 配置
```

## 🔗 外部资源

- [Docker 官方文档](https://docs.docker.com/)
- [Docker Compose 文档](https://docs.docker.com/compose/)
- [Telegram Bot API](https://core.telegram.org/bots/api)
- [Python 官方文档](https://docs.python.org/3/)

## 📅 更新日志

| 日期 | 更新内容 |
|------|----------|
| 2025-11-18 | 清理过时文档和脚本 |
| 2025-11-15 | 重构项目结构 |
| 2025-11-15 | 添加 Telegram 文档 |

---

**提示**: 建议从 [README.md](../README.md) 开始阅读，然后根据需要查看其他文档。
