# 大乐透模块使用指南

## 📋 目录

- [快速开始](#快速开始)
- [命令详解](#命令详解)
- [配置说明](#配置说明)
- [定时任务](#定时任务)
- [常见问题](#常见问题)

## 🚀 快速开始

### 1. 首次使用

```bash
# 步骤1: 爬取历史数据
python lottery.py fetch dlt --mode full

# 步骤2: 预测号码
python lottery.py predict dlt

# 步骤3: 启动定时任务（可选）
python lottery.py schedule dlt
```

### 2. 日常使用

```bash
# 更新最新数据
python lottery.py fetch dlt --mode latest

# 预测号码
python lottery.py predict dlt
```

## 📖 命令详解

### fetch - 爬取数据

#### 全量爬取
```bash
python lottery.py fetch dlt --mode full
```

**说明**：
- 爬取 2007-2025 年所有历史数据
- 按年份分批爬取
- 自动去重
- 耗时约 30-60 秒

**输出示例**：
```
爬取 2007 年数据 (期号: 07001 - 07200)
  获取 154 条数据
  入库: 新增 154 条，重复 0 条，跳过 0 条

爬取 2008 年数据 (期号: 08001 - 08200)
  获取 153 条数据
  入库: 新增 153 条，重复 0 条，跳过 0 条

...

爬取完成，新增 2799 条，跳过 0 条
数据库总记录数: 2799
最新一期: 2025131 (2025-11-17)
号码: 前区 03,08,25,29,32 | 后区 09,12
```

#### 增量爬取
```bash
python lottery.py fetch dlt --mode latest
```

**说明**：
- 仅爬取当年数据
- 自动去重
- 耗时约 1-2 秒

**输出示例**：
```
获取 131 条数据
入库: 新增 0 条，重复 0 条，跳过 131 条

最新一期: 2025131 (2025-11-17)
号码: 前区 03,08,25,29,32 | 后区 09,12
```

### predict - 预测号码

#### 使用默认配置
```bash
python lottery.py predict dlt
```

**说明**：
- 使用默认策略：frequency
- 默认条数：5

**输出示例**：
```
使用策略: frequency
预测条数: 5

组合 1 [频率策略]: 前区 02,18,22,31,35 | 后区 02,10
组合 2 [频率策略]: 前区 05,12,18,21,28 | 后区 03,08
组合 3 [频率策略]: 前区 07,13,19,25,31 | 后区 04,11
组合 4 [频率策略]: 前区 01,08,16,22,33 | 后区 06,09
组合 5 [频率策略]: 前区 03,09,14,17,20 | 后区 05,12

历史数据统计:
前区频率前10: 29(483), 35(466), 33(466), 30(454), 32(450), ...
后区频率前5: 10(503), 7(495), 5(486), 12(476), 9(467)
连号分析: {1: 1406, 2: 1256, 4: 11, 3: 126}

最新一期: 2025131 (2025-11-17)
号码: 前区 03,08,25,29,32 | 后区 09,12

✓ Telegram 预测发送成功
```

#### 使用自定义配置
```bash
# 方式1: 环境变量
export DEFAULT_STRATEGIES="frequency,balanced,coldHot"
export DEFAULT_PREDICTION_COUNT="15"
python lottery.py predict dlt

# 方式2: .env 文件
echo "DEFAULT_STRATEGIES=frequency,balanced,coldHot" >> .env
echo "DEFAULT_PREDICTION_COUNT=15" >> .env
python lottery.py predict dlt
```

**输出示例**：
```
使用策略: frequency, balanced, coldHot
预测条数: 15

组合 1 [频率策略]: 前区 02,18,22,31,35 | 后区 02,10
组合 2 [频率策略]: 前区 05,12,18,21,28 | 后区 03,08
组合 3 [频率策略]: 前区 07,13,19,25,31 | 后区 04,11
组合 4 [频率策略]: 前区 01,08,16,22,33 | 后区 06,09
组合 5 [频率策略]: 前区 03,09,14,17,20 | 后区 05,12
组合 6 [均衡策略]: 前区 02,11,15,23,29 | 后区 04,10
组合 7 [均衡策略]: 前区 06,10,18,26,34 | 后区 02,11
组合 8 [均衡策略]: 前区 04,13,19,27,35 | 后区 06,09
组合 9 [均衡策略]: 前区 01,08,16,24,32 | 后区 03,08
组合 10 [均衡策略]: 前区 05,12,20,28,33 | 后区 05,12
组合 11 [冷热号策略]: 前区 07,14,17,31,33 | 后区 08,12
组合 12 [冷热号策略]: 前区 03,09,15,22,30 | 后区 02,10
组合 13 [冷热号策略]: 前区 01,11,18,25,35 | 后区 04,11
组合 14 [冷热号策略]: 前区 05,13,19,27,32 | 后区 06,09
组合 15 [冷热号策略]: 前区 02,08,16,23,29 | 后区 03,08
```

### schedule - 定时任务

```bash
python lottery.py schedule dlt
```

**说明**：
- 每天 21:30 自动执行
- 自动爬取最新数据
- 启动时立即执行一次
- 按 Ctrl+C 停止

**输出示例**：
```
============================================================
定时任务已启动 - 大乐透
执行时间: 每天 21:30
按 Ctrl+C 停止
============================================================

首次执行...
============================================================
定时任务开始: 2025-11-18 13:00:46
============================================================
爬取 2025 年最新数据
获取 131 条数据
入库: 新增 0 条，重复 0 条，跳过 131 条
✓ 暂无新数据
最新一期: 2025131 (2025-11-17)
号码: 前区 03,08,25,29,32 | 后区 09,12
============================================================
定时任务结束: 2025-11-18 13:00:51
============================================================

等待下次执行 (21:30)...
```

## ⚙️ 配置说明

### 环境变量

在 `.env` 文件中配置：

```bash
# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=lottery_db

# 预测策略配置
DEFAULT_STRATEGIES=frequency,balanced,coldHot
DEFAULT_PREDICTION_COUNT=15

# Telegram 配置（可选）
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_CHAT_ID=your_chat_id
```

### 可用策略

| 策略名称 | 说明 | 特点 |
|---------|------|------|
| `frequency` | 频率策略 | 基于历史高频号码 |
| `random` | 随机策略 | 完全随机选择 |
| `balanced` | 均衡策略 | 大小号均衡分布 |
| `coldHot` | 冷热号策略 | 结合冷热号 |

### 策略组合建议

```bash
# 保守型（追求高频）
DEFAULT_STRATEGIES=frequency
DEFAULT_PREDICTION_COUNT=5

# 平衡型（综合考虑）
DEFAULT_STRATEGIES=frequency,balanced
DEFAULT_PREDICTION_COUNT=10

# 激进型（多样化）
DEFAULT_STRATEGIES=frequency,random,balanced,coldHot
DEFAULT_PREDICTION_COUNT=20

# 冷热结合型
DEFAULT_STRATEGIES=frequency,coldHot
DEFAULT_PREDICTION_COUNT=10
```

## ⏰ 定时任务

### 使用 systemd（推荐）

创建服务文件 `/etc/systemd/system/dlt-schedule.service`：

```ini
[Unit]
Description=大乐透定时任务
After=network.target

[Service]
Type=simple
User=your_user
WorkingDirectory=/path/to/gitmen-lottery
ExecStart=/usr/bin/python3 lottery.py schedule dlt
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

启动服务：

```bash
sudo systemctl daemon-reload
sudo systemctl enable dlt-schedule
sudo systemctl start dlt-schedule
sudo systemctl status dlt-schedule
```

### 使用 cron

编辑 crontab：

```bash
crontab -e
```

添加定时任务（每天 21:30 执行）：

```bash
30 21 * * * cd /path/to/gitmen-lottery && python lottery.py fetch dlt --mode latest >> logs/dlt/cron.log 2>&1
```

### 使用 Docker

创建 `docker-compose.yml`：

```yaml
version: '3'
services:
  dlt-schedule:
    build: .
    command: python lottery.py schedule dlt
    volumes:
      - ./logs:/app/logs
      - ./.env:/app/.env
    restart: always
```

启动：

```bash
docker-compose up -d dlt-schedule
```

## ❓ 常见问题

### Q1: 数据库连接失败

**问题**：
```
ERROR - 数据库连接失败: (2003, "Can't connect to MySQL server")
```

**解决**：
1. 检查 MySQL 是否运行：`sudo systemctl status mysql`
2. 检查 `.env` 配置是否正确
3. 测试连接：`mysql -h localhost -u root -p lottery_db`

### Q2: 爬取失败

**问题**：
```
ERROR - 从 500.com 获取数据失败: HTTP 403
```

**解决**：
1. 检查网络连接
2. 等待几分钟后重试
3. 使用代理（如果需要）

### Q3: 预测失败

**问题**：
```
ERROR - 预测失败: 没有历史数据
```

**解决**：
1. 先爬取数据：`python lottery.py fetch dlt --mode full`
2. 检查数据库：`mysql -u root -p lottery_db -e "SELECT COUNT(*) FROM dlt_lottery;"`

### Q4: Telegram 通知失败

**问题**：
```
WARNING - Telegram 未配置，跳过通知
```

**解决**：
1. 配置 `.env` 文件中的 `TELEGRAM_BOT_TOKEN` 和 `TELEGRAM_CHAT_ID`
2. 测试连接：`python -c "from core.telegram_bot import TelegramBot; bot = TelegramBot(); print(bot.test_connection())"`

### Q5: 定时任务不执行

**问题**：
定时任务启动后没有在指定时间执行

**解决**：
1. 检查系统时间：`date`
2. 检查日志：`tail -f logs/dlt/schedule.log`
3. 手动测试：`python lottery.py fetch dlt --mode latest`

## 📊 数据统计

### 查看数据库统计

```bash
# 总记录数
mysql -u root -p lottery_db -e "SELECT COUNT(*) FROM dlt_lottery;"

# 最新10期
mysql -u root -p lottery_db -e "SELECT * FROM dlt_lottery ORDER BY draw_date DESC LIMIT 10;"

# 前区频率统计
mysql -u root -p lottery_db -e "
SELECT ball, COUNT(*) as count FROM (
    SELECT front1 as ball FROM dlt_lottery
    UNION ALL SELECT front2 FROM dlt_lottery
    UNION ALL SELECT front3 FROM dlt_lottery
    UNION ALL SELECT front4 FROM dlt_lottery
    UNION ALL SELECT front5 FROM dlt_lottery
) t GROUP BY ball ORDER BY count DESC LIMIT 10;
"

# 后区频率统计
mysql -u root -p lottery_db -e "
SELECT ball, COUNT(*) as count FROM (
    SELECT back1 as ball FROM dlt_lottery
    UNION ALL SELECT back2 FROM dlt_lottery
) t GROUP BY ball ORDER BY count DESC;
"
```

## 🔧 高级用法

### 批量预测

```bash
# 生成多组预测
for i in {1..5}; do
    echo "=== 第 $i 组 ==="
    python lottery.py predict dlt
    echo ""
done
```

### 导出预测结果

```bash
# 导出到文件
python lottery.py predict dlt > predictions_$(date +%Y%m%d).txt

# 导出到 CSV
python lottery.py predict dlt | grep "组合" | sed 's/.*前区 //' | sed 's/ | 后区 /,/' > predictions.csv
```

### 自动化脚本

创建 `auto_predict.sh`：

```bash
#!/bin/bash

# 更新数据
python lottery.py fetch dlt --mode latest

# 预测号码
python lottery.py predict dlt

# 发送邮件（可选）
# mail -s "大乐透预测" your@email.com < predictions.txt
```

## 📚 相关文档

- [实现总结](./DLT_IMPLEMENTATION_SUMMARY.md)
- [快速开始](./QUICK_START.md)
- [完成报告](../../DLT_MODULE_COMPLETE.md)
- [项目文档](../../README.md)

## 💡 提示

1. **首次使用**：建议先爬取全量数据
2. **定期更新**：建议每天更新一次数据
3. **策略选择**：可以根据个人喜好选择不同策略
4. **条数建议**：建议使用策略数的倍数（如 3个策略用 9/15/30 条）
5. **备份数据**：定期备份数据库

## 🎯 最佳实践

1. **数据管理**
   - 每天自动更新数据
   - 定期备份数据库
   - 监控数据质量

2. **预测策略**
   - 使用多策略组合
   - 根据历史数据调整
   - 记录预测结果

3. **系统维护**
   - 定期检查日志
   - 监控系统资源
   - 及时更新代码

---

**祝您好运！** 🍀
