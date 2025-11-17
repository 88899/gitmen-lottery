# 快速开始

## 1. 配置

```bash
cd cloudflare-worker
cp .env.example .env
vim .env
```

填写：
```bash
WORKER_URL=https://your-worker.workers.dev
API_KEY=your-api-key-here
```

## 2. 检查

```bash
cd scripts
./diagnose.sh
```

## 3. 初始化

```bash
./init.sh
```

完成！查看数据：
```bash
curl -s "$WORKER_URL/stats"
```
