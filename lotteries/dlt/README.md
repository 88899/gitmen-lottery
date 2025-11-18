# 大乐透模块

## 简介

大乐透（DLT）预测模块，支持数据爬取、多策略预测、统计分析等功能。

## 快速开始

```bash
# 1. 爬取数据
python lottery.py fetch dlt --mode full

# 2. 预测号码
python lottery.py predict dlt

# 3. 定时任务
python lottery.py schedule dlt
```

## 功能特性

- ✅ 数据爬取（全量 + 增量）
- ✅ 多策略预测（4种策略）
- ✅ 统计分析（频率、连号、奇偶）
- ✅ CLI 命令支持
- ✅ 定时任务
- ✅ Telegram 通知

## 预测策略

| 策略 | 说明 |
|------|------|
| frequency | 频率策略 - 基于历史高频号码 |
| random | 随机策略 - 完全随机选择 |
| balanced | 均衡策略 - 大小号均衡分布 |
| coldHot | 冷热号策略 - 结合冷热号 |

## 配置

在 `.env` 文件中配置：

```bash
# 预测策略
DEFAULT_STRATEGIES=frequency,balanced,coldHot
DEFAULT_PREDICTION_COUNT=15

# 数据库
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=lottery_db

# Telegram（可选）
TELEGRAM_BOT_TOKEN=your_token
TELEGRAM_CHAT_ID=your_chat_id
```

## 命令

### fetch - 爬取数据

```bash
# 全量爬取（2007-2025）
python lottery.py fetch dlt --mode full

# 增量爬取（当年数据）
python lottery.py fetch dlt --mode latest
```

### predict - 预测号码

```bash
# 使用默认配置
python lottery.py predict dlt

# 使用自定义配置
export DEFAULT_STRATEGIES="frequency,balanced,coldHot"
export DEFAULT_PREDICTION_COUNT="15"
python lottery.py predict dlt
```

### schedule - 定时任务

```bash
# 启动定时任务（每天 21:30 执行）
python lottery.py schedule dlt
```

## 输出示例

```
使用策略: frequency, balanced, coldHot
预测条数: 15

组合 1 [频率策略]: 前区 02,18,22,31,35 | 后区 02,10
组合 2 [频率策略]: 前区 05,12,18,21,28 | 后区 03,08
组合 3 [均衡策略]: 前区 03,06,10,23,26 | 后区 04,09
组合 4 [均衡策略]: 前区 07,13,19,25,31 | 后区 02,11
组合 5 [冷热号策略]: 前区 01,08,16,22,33 | 后区 06,09
...

历史数据统计:
前区频率前10: 29(483), 35(466), 33(466), 30(454), 32(450), ...
后区频率前5: 10(503), 7(495), 5(486), 12(476), 9(467)
连号分析: {1: 1406, 2: 1256, 4: 11, 3: 126}

最新一期: 2025131 (2025-11-17)
号码: 前区 03,08,25,29,32 | 后区 09,12

✓ Telegram 预测发送成功
```

## 数据库表结构

```sql
CREATE TABLE dlt_lottery (
    id INT AUTO_INCREMENT PRIMARY KEY,
    lottery_no VARCHAR(20) UNIQUE NOT NULL,
    draw_date DATE NOT NULL,
    front1 VARCHAR(2) NOT NULL,
    front2 VARCHAR(2) NOT NULL,
    front3 VARCHAR(2) NOT NULL,
    front4 VARCHAR(2) NOT NULL,
    front5 VARCHAR(2) NOT NULL,
    back1 VARCHAR(2) NOT NULL,
    back2 VARCHAR(2) NOT NULL,
    sorted_code VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_lottery_no (lottery_no),
    INDEX idx_draw_date (draw_date),
    INDEX idx_sorted_code (sorted_code)
);
```

## 文档

- [快速开始](./QUICK_START.md) - 5分钟快速上手
- [使用指南](./USAGE_GUIDE.md) - 完整的使用文档
- [实现总结](./DLT_IMPLEMENTATION_SUMMARY.md) - 详细的实现说明
- [最终总结](../../DLT_FINAL_SUMMARY.md) - 实现完成报告

## 技术栈

- Python 3.8+
- MySQL 5.7+
- BeautifulSoup4（HTML 解析）
- APScheduler（定时任务）
- Requests（HTTP 请求）

## 数据源

- 500.com - https://datachart.500.com/dlt/history/newinc/history.php

## 规则

- 前区：1-35 选 5 个号码
- 后区：1-12 选 2 个号码
- 开奖时间：周一、周三、周六 20:30
- 历史数据：2007年至今

## 验证规则

- 前区不能有3个或以上连号
- 不能是历史中奖号码
- 号码不能重复

## 常见问题

### Q: 如何配置策略？

A: 在 `.env` 文件中设置 `DEFAULT_STRATEGIES` 和 `DEFAULT_PREDICTION_COUNT`。

### Q: 如何启动定时任务？

A: 运行 `python lottery.py schedule dlt`，每天 21:30 自动执行。

### Q: 如何查看历史数据？

A: 使用 MySQL 查询：`SELECT * FROM dlt_lottery ORDER BY draw_date DESC LIMIT 10;`

### Q: 如何配置 Telegram 通知？

A: 在 `.env` 文件中设置 `TELEGRAM_BOT_TOKEN` 和 `TELEGRAM_CHAT_ID`。

## 许可证

MIT License

## 作者

Kiro AI Assistant

## 版本

1.0.0

---

**祝您好运！** 🍀
