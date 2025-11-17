# 脚本使用说明

## 快速开始

```bash
# 1. 配置
cd cloudflare-worker
cp .env.example .env
vim .env  # 填写 WORKER_URL 和 API_KEY

# 2. 初始化数据
cd scripts
./init.sh
```

## 脚本说明

### init.sh - 数据初始化

批量导入历史数据，自动管理每日请求限制。

```bash
./init.sh
```

### diagnose.sh - 诊断检查

检查 Worker 运行状态。

```bash
./diagnose.sh
```

## 配置项

在 `.env` 文件中配置：

```bash
# 必填
WORKER_URL=https://your-worker.workers.dev
API_KEY=your-api-key-here

# 可选
USE_PROXY=false              # 是否使用代理
PROXY_PORT=7897              # 代理端口
SLEEP_TIME=120               # 爬取间隔（秒）
DAILY_REQUEST_LIMIT=500      # 每日请求限制
AUTO_CONTINUE=false          # 是否自动跨天继续
```

## 常见用法

### 后台运行

```bash
nohup ./init.sh > init.log 2>&1 &
tail -f init.log
```

### 自动跨天继续

在 `.env` 中设置：
```bash
AUTO_CONTINUE=true
```

### 使用代理

在 `.env` 中设置：
```bash
USE_PROXY=true
PROXY_PORT=7897
```
