# 部署更新指南

## 修复内容

✅ 修复了初始化逻辑：
- 之前：只要有数据就进入增量模式
- 现在：数据量 < 1000 期时继续爬取历史数据

## 部署步骤

### 方式 1：本地部署（推荐）

```bash
# 1. 进入目录
cd cloudflare-worker

# 2. 登录（如果还没登录）
npx wrangler login

# 3. 部署
npx wrangler deploy

# 4. 等待部署完成
# 会显示：Published lottery-prediction (x.xx sec)
```

### 方式 2：通过 GitHub 自动部署

如果你的 Worker 是通过 GitHub Pages 部署的：

```bash
# 1. 提交代码
git add .
git commit -m "fix: 修复初始化逻辑，支持持续爬取历史数据"
git push

# 2. Cloudflare 会自动部署
# 在 Dashboard 中查看部署状态
```

## 验证部署

部署完成后，测试一下：

```bash
# 设置代理
export http_proxy="http://127.0.0.1:7897"
export https_proxy="http://127.0.0.1:7897"

# 测试接口
curl -s "https://lottery-prediction.githubmen.workers.dev/stats" | jq '.'

# 手动触发一次
curl -X POST "https://lottery-prediction.githubmen.workers.dev/run" \
  -H "Authorization: Bearer d9464dbad6564438a37ff5245494152d" | jq '.'
```

**预期结果**：
- 如果数据量 < 1000，应该返回：`"message": "初始化中（xxx/1000）"`
- 如果数据量 >= 1000，应该返回：`"message": "数据已是最新"`

## 重新初始化

如果你想从头开始：

### 1. 清空数据库

在 Cloudflare Dashboard 的 D1 Console 中执行：
```sql
DELETE FROM ssq_lottery;
```

### 2. 运行初始化脚本

```bash
bash cloudflare-worker/init.sh
```

脚本会自动：
- 每次爬取 100 期
- 显示进度（如：200/1000）
- 继续运行直到数据量达到 1000 期

## 预计时间

- **每批次**：100 期，约 1-2 分钟
- **达到 1000 期**：约 10 批次，20-30 分钟
- **达到 4000 期**：约 40 批次，80-120 分钟

## 故障排查

### 问题 1：部署失败

```bash
# 检查配置
cat cloudflare-worker/wrangler.toml

# 确保 database_id 和 kv id 已填写
```

### 问题 2：仍然显示"数据已是最新"

可能是缓存问题，等待几分钟或：

```bash
# 强制刷新
curl -X POST "https://lottery-prediction.githubmen.workers.dev/run" \
  -H "Authorization: Bearer d9464dbad6564438a37ff5245494152d" \
  -H "Cache-Control: no-cache" | jq '.'
```

### 问题 3：超时

如果请求超时，可能是 Worker 在处理大量数据：
- 等待 2-3 分钟
- 检查数据量是否增加：`curl -s "$WORKER_URL/stats" | jq '.total_count'`

---

**重要**：部署后才能生效！请先部署再运行 `init.sh`。
