# 大乐透模块 - 快速开始

## 快速开始（5分钟）

### 1. 爬取数据

```bash
# 爬取当年数据（快速测试）
python lottery.py fetch dlt --mode latest

# 爬取全量历史数据（2007-2025）
python lottery.py fetch dlt --mode full
```

### 2. 预测号码

```bash
# 使用默认配置（频率策略，5条）
python lottery.py predict dlt
```

### 3. 查看结果

```
使用策略: frequency
预测条数: 5

组合 1 [频率策略]: 前区 03,09,14,17,20 | 后区 05,12
组合 2 [频率策略]: 前区 05,12,18,21,28 | 后区 03,08
组合 3 [频率策略]: 前区 02,11,15,23,29 | 后区 04,10
组合 4 [频率策略]: 前区 07,13,19,25,31 | 后区 02,11
组合 5 [频率策略]: 前区 01,08,16,22,33 | 后区 06,09
```

## 配置策略

### 方式1：环境变量

```bash
# 设置策略和条数
export DEFAULT_STRATEGIES="frequency,balanced,coldHot"
export DEFAULT_PREDICTION_COUNT="15"

# 运行预测
python lottery.py predict dlt
```

### 方式2：.env 文件

```bash
# 编辑 .env 文件
echo "DEFAULT_STRATEGIES=frequency,balanced,coldHot" >> .env
echo "DEFAULT_PREDICTION_COUNT=15" >> .env

# 运行预测
python lottery.py predict dlt
```

## 可用策略

| 策略名称 | 说明 | 适用场景 |
|---------|------|---------|
| `frequency` | 频率策略 | 追求高频号码 |
| `random` | 随机策略 | 完全随机 |
| `balanced` | 均衡策略 | 大小号均衡 |
| `coldHot` | 冷热号策略 | 结合冷热号 |

## 常用命令

```bash
# 查看帮助
python lottery.py --help
python lottery.py fetch --help
python lottery.py predict --help

# 爬取数据
python lottery.py fetch dlt --mode full    # 全量
python lottery.py fetch dlt --mode latest  # 增量

# 预测号码
python lottery.py predict dlt

# 查看数据库
mysql -u root -p lottery_db -e "SELECT COUNT(*) FROM dlt_lottery;"
mysql -u root -p lottery_db -e "SELECT * FROM dlt_lottery ORDER BY draw_date DESC LIMIT 10;"
```

## Cloudflare Worker 版本

### 1. 部署

```bash
cd cloudflare-worker
wrangler deploy
```

### 2. 配置

```bash
# 设置策略
wrangler kv:key put --binding=KV_BINDING DEFAULT_STRATEGIES "frequency,balanced,coldHot"
wrangler kv:key put --binding=KV_BINDING DEFAULT_PREDICTION_COUNT "15"
```

### 3. 使用

```bash
# 初始化数据库
curl https://your-worker.workers.dev/init

# 爬取数据
curl https://your-worker.workers.dev/fetch/dlt

# 预测号码
curl https://your-worker.workers.dev/predict/dlt

# 获取最新数据
curl https://your-worker.workers.dev/latest/dlt
```

## 故障排查

### 问题1：数据库连接失败

```bash
# 检查配置
cat .env | grep DB_

# 测试连接
mysql -h localhost -u root -p lottery_db
```

### 问题2：爬取失败

```bash
# 检查网络
curl -I https://datachart.500.com/dlt/history/newinc/history.php

# 查看日志
tail -f logs/dlt/fetch.log
```

### 问题3：预测失败

```bash
# 检查数据
mysql -u root -p lottery_db -e "SELECT COUNT(*) FROM dlt_lottery;"

# 查看日志
tail -f logs/dlt/predict.log
```

## 下一步

- 📖 阅读 [完整文档](./DLT_IMPLEMENTATION_SUMMARY.md)
- 🔧 配置 [Telegram 通知](../../docs/telegram_setup.md)
- 📊 查看 [统计分析](./README.md)
- 🚀 部署 [Worker 版本](../../cloudflare-worker/README.md)

## 支持

如有问题，请查看：
- [实现总结](./DLT_IMPLEMENTATION_SUMMARY.md)
- [项目文档](../../README.md)
- [双色球文档](../ssq/README.md)（参考）
