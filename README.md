<div align="center">

# 🎰 彩票预测系统

**基于历史数据的智能彩票号码预测系统 | 支持 Docker 多容器部署**

[![GitHub stars](https://img.shields.io/github/stars/88899/gitmen-lottery?style=social)](https://github.com/88899/gitmen-lottery/stargazers)
[![GitHub forks](https://img.shields.io/github/forks/88899/gitmen-lottery?style=social)](https://github.com/88899/gitmen-lottery/network/members)
[![GitHub watchers](https://img.shields.io/github/watchers/88899/gitmen-lottery?style=social)](https://github.com/88899/gitmen-lottery/watchers)

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Python](https://img.shields.io/badge/python-3.8+-blue.svg)](https://www.python.org/)
[![Docker](https://img.shields.io/badge/docker-ready-brightgreen.svg)](https://www.docker.com/)

---

### 🌟 如果这个项目对你有帮助，请点击右上角 ⭐ Star 支持一下！

**你的 Star 是我持续更新的动力！** 🚀

[⭐ 点击 Star](https://github.com/88899/gitmen-lottery) | [🐛 报告问题](https://github.com/88899/gitmen-lottery/issues) | [💡 功能建议](https://github.com/88899/gitmen-lottery/issues/new)

---

</div>

## ⚠️ 免责声明

**本项目仅供学习和研究使用，严禁用于任何商业或非法用途。**

### 重要提示

1. **纯属学习项目** - 本项目仅用于学习数据分析、机器学习和软件工程技术
2. **无中奖保证** - 所有预测结果基于历史数据统计，不代表未来结果，不保证任何中奖概率
3. **理性购彩** - 彩票具有随机性，请理性对待，切勿沉迷
4. **风险自负** - 使用本项目产生的任何后果由使用者自行承担
5. **遵守法律** - 请遵守所在地区关于彩票的法律法规

### 法律声明

- 本项目不提供任何形式的购彩建议或投资建议
- 本项目不对使用者的任何损失负责
- 本项目不鼓励、不支持任何形式的赌博行为
- 使用本项目即表示您已阅读并同意本免责声明

### 适用范围

本项目适用于：
- ✅ 学习数据分析和统计方法
- ✅ 研究机器学习算法
- ✅ 学习 Python 编程和 Docker 部署
- ✅ 研究爬虫技术和数据处理

本项目不适用于：
- ❌ 商业用途
- ❌ 赌博或投机
- ❌ 任何违法活动
- ❌ 向他人提供购彩建议

**请理性对待彩票，远离赌博！**

---

<div align="center">

## 🎯 为什么选择这个项目？

| 特点 | 说明 |
|:---:|:---|
| 🎓 **学习价值** | 完整的数据分析、机器学习、Docker 部署实战项目 |
| 🏗️ **生产级架构** | 多容器部署、自动化任务、完善的错误处理 |
| 📚 **文档完善** | 详细的部署指南、使用手册、架构说明 |
| 🔧 **开箱即用** | 一键部署脚本，5分钟快速启动 |
| 🔄 **持续更新** | 活跃维护，欢迎贡献代码 |

### 💖 如果觉得有用，请给个 Star 吧！

**已有 XXX 位开发者 Star 了这个项目** ⭐

</div>

---

## ✨ 核心特性

- 🐳 **Docker 多容器部署** - 每个彩票类型独立容器
- 📱 **Telegram 机器人通知** - 实时推送开奖和预测结果
- ⏰ **自动定时任务** - 每天自动爬取和预测
- 🔄 **增量数据更新** - 智能跳过已存在数据
- 🛡️ **防封禁爬虫** - 模拟人类浏览行为
- 📊 **数据分析** - 频率统计、连号分析

## 📸 项目展示

<div align="center">

### 🎯 Telegram 通知效果

```
📊 双色球每日报告

━━━━━━━━━━━━━━━
🎰 最新开奖

📅 期号: 2025131
📆 日期: 2025-11-13

🔴 红球: 03 13 14 18 24 31
🔵 蓝球: 03

━━━━━━━━━━━━━━━
🔮 下期预测

组合 1: 06 07 17 22 26 32 - 15
组合 2: 06 08 17 22 26 32 - 15
组合 3: 02 07 17 22 26 32 - 15

━━━━━━━━━━━━━━━
📈 统计信息

高频红球: 17(765), 26(757), 14(755)
高频蓝球: 15(270), 16(264), 1(258)
```

### 💡 觉得有用？给个 Star 吧！⭐

</div>

---

## 🚀 快速开始

### 前置要求

- Docker 20.10+
- Docker Compose 1.29+
- Linux 服务器（推荐）

### 一键部署

```bash
# 1. 克隆项目
git clone <repository_url>
cd lottery-prediction

# 2. 配置环境
cp .env.example .env
nano .env  # 填入数据库和 Telegram 配置

# 3. 部署
cd deployment
./deploy.sh
```

## 📖 文档导航

- **[⚠️ 免责声明](DISCLAIMER.md)** - 使用前必读 ⭐
- **[文档索引](docs/INDEX.md)** - 完整的文档导航
- **[部署指南](docs/deployment/DOCKER_DEPLOYMENT.md)** - Docker 部署详细步骤
- **[Telegram 配置](docs/guides/TELEGRAM_SETUP.md)** - 机器人配置教程
- **[使用手册](docs/USAGE.md)** - 完整的使用说明
- **[项目设计](docs/PROJECT_DESIGN.md)** - 架构和设计理念

## 🎯 支持的彩票

| 彩票类型 | 代码 | 容器名 | 状态 |
|---------|------|--------|------|
| 双色球 | ssq | lottery-ssq | ✅ 已实现 |
| 大乐透 | dlt | lottery-dlt | 🚧 开发中 |
| 快开3 | ks3 | lottery-ks3 | 🚧 开发中 |

## 🐳 Docker 部署

### 多容器架构

每个彩票类型运行在独立的容器中：

```
lottery-ssq    # 双色球容器
lottery-dlt    # 大乐透容器
lottery-ks3    # 快开3容器
```

### 部署选项

```bash
# 仅部署双色球
docker-compose up -d lottery-ssq

# 部署双色球和大乐透
docker-compose up -d lottery-ssq lottery-dlt

# 部署所有彩票类型
docker-compose up -d
```

### 容器管理

```bash
# 查看状态
docker-compose ps

# 查看日志
docker-compose logs -f lottery-ssq

# 重启容器
docker-compose restart lottery-ssq

# 停止容器
docker-compose stop

# 进入容器
docker-compose exec lottery-ssq bash
```

## 📱 Telegram 通知

系统会自动发送以下通知：

- 🎰 **最新开奖结果** - 期号、日期、号码
- 🔮 **下期预测** - 3-5组预测组合
- 📈 **统计信息** - 高频号码分析
- ❌ **错误通知** - 任务失败提醒

### 配置步骤

1. 创建机器人：在 Telegram 搜索 `@BotFather`
2. 获取 Token：发送 `/newbot` 并按提示操作
3. 获取 Chat ID：搜索 `@userinfobot` 并发送消息
4. 配置到 `.env` 文件

详细步骤：[Telegram 配置指南](docs/guides/TELEGRAM_SETUP.md)

## ⚙️ 配置说明

### 必需配置

```bash
# 数据库
MYSQL_HOST=your_host
MYSQL_USER=your_user
MYSQL_PASSWORD=your_password
MYSQL_DATABASE=your_database

# Telegram
TELEGRAM_BOT_TOKEN=123456789:ABC...
TELEGRAM_CHAT_ID=123456789
```

### 可选配置

```bash
# 定时任务时间（小时，24小时制）
SSQ_CRON_HOUR=22  # 双色球 22:00
DLT_CRON_HOUR=22  # 大乐透 22:00
KS3_CRON_HOUR=22  # 快开3 22:00

# 爬虫配置
SPIDER_MIN_DELAY=0.5  # 最小请求间隔（秒）
SPIDER_MAX_DELAY=2.0  # 最大请求间隔（秒）

# 数据库性能
DB_BATCH_SIZE=100  # 批量插入大小
```

## 📊 项目结构

```
lottery-prediction/
├── core/              # 核心框架（数据库、爬虫、预测、Telegram）
├── lotteries/         # 彩票模块
│   ├── ssq/          # 双色球 ✅
│   └── dlt/          # 大乐透 🚧
├── cli/               # 命令行工具
├── scripts/           # 初始化和定时任务脚本
├── deployment/        # Docker 部署配置
│   ├── docker/
│   ├── docker-compose.yml
│   └── deploy.sh
├── docs/              # 完整文档
│   ├── deployment/   # 部署指南
│   └── guides/       # 使用教程
├── logs/              # 日志文件
└── data/              # 数据文件
```

## 🔧 常用命令

### 本地开发

```bash
# 安装依赖
pip install -r requirements.txt

# 配置环境
cp .env.example .env

# 运行命令
python lottery.py fetch ssq --mode full
python lottery.py predict ssq
```

### Docker 部署

```bash
# 进入部署目录
cd deployment

# 部署
./deploy.sh

# 查看日志
docker-compose logs -f

# 手动执行任务
docker-compose exec lottery-ssq python scripts/daily_task.py
```

## 🛡️ 安全特性

- ✅ 多 User-Agent 轮换
- ✅ 随机请求间隔（0.5-2秒）
- ✅ 429 限流自动处理
- ✅ SSL/TLS 数据库连接
- ✅ 环境变量隔离
- ✅ 容器网络隔离

## 📈 性能指标

- **内存使用**: ~200MB/容器
- **CPU 使用**: <5%（空闲时）
- **初始化时间**: ~15分钟（全量数据）
- **每日任务**: ~30秒
- **预测速度**: ~2秒

## ⚠️ 使用须知

### 技术注意事项

1. **数据准确性** - 爬虫数据仅供参考，请以官方数据为准
2. **网站规则** - 爬虫已优化防封禁，但仍需遵守目标网站的使用规则
3. **数据备份** - 建议定期备份数据库，避免数据丢失
4. **资源监控** - 注意监控服务器资源使用情况

### 法律合规

1. **遵守法律** - 严格遵守所在地区关于彩票和数据爬取的法律法规
2. **个人使用** - 本项目仅限个人学习研究使用
3. **禁止传播** - 不得将预测结果用于商业传播或销售
4. **风险提示** - 使用者需自行承担所有使用风险

### 道德准则

1. **理性购彩** - 彩票应作为娱乐，不应作为投资或赚钱手段
2. **量力而行** - 购彩金额应在个人承受范围内
3. **拒绝沉迷** - 如发现沉迷倾向，请立即停止使用
4. **保护他人** - 不向未成年人或易受影响人群推荐使用

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

### 如何贡献

1. Fork 本项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

**贡献者将会在这里展示！** 🎉

## 📄 许可证

MIT License

**使用本项目即表示您已完全理解并同意上述免责声明和使用须知。**

## 📞 支持

- 📖 [完整文档](docs/INDEX.md)
- 🐛 [问题反馈](https://github.com/88899/gitmen-lottery/issues)
- 💬 [讨论区](https://github.com/88899/gitmen-lottery/discussions)
- ⭐ [给个 Star](https://github.com/88899/gitmen-lottery)

---

<div align="center">

## ⭐ Star 历史

[![Star History Chart](https://api.star-history.com/svg?repos=88899/gitmen-lottery&type=Date)](https://star-history.com/#88899/gitmen-lottery&Date)

### 🌟 如果这个项目帮助到了你，请不要吝啬你的 Star！

**你的支持是我最大的动力！** 💪

[![GitHub stars](https://img.shields.io/github/stars/88899/gitmen-lottery?style=for-the-badge&logo=github)](https://github.com/88899/gitmen-lottery/stargazers)

---

**版本**: 2.2.2  
**更新日期**: 2025-11-15  
**状态**: 🟢 生产就绪  
**重要**: ⚠️ 使用前请阅读 [免责声明](DISCLAIMER.md)

---

Made with ❤️ by [88899](https://github.com/88899)

**如果觉得不错，请点击右上角 ⭐ Star 支持一下！**

</div>
