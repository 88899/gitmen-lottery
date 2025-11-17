# 部署检查清单

## ✅ 部署前检查

### Cloudflare Worker 版本

- [ ] 代码已更新到最新版本
- [ ] `wrangler.toml` 配置正确
  - [ ] `database_id` 已填写
  - [ ] `kv id` 已填写
- [ ] KV 中的配置已设置
  - [ ] `API_KEY`
  - [ ] `TELEGRAM_BOT_TOKEN`
  - [ ] `TELEGRAM_CHAT_ID`
- [ ] D1 数据库已创建
- [ ] 数据库表结构已创建（`schema.sql`）

### Python 版本

- [ ] 依赖已安装（`pip install -r requirements.txt`）
- [ ] `.env` 文件已配置
- [ ] 数据库已创建
- [ ] 数据库表结构已创建

---

## 🚀 部署步骤

### Cloudflare Worker

```bash
# 1. 进入目录
cd cloudflare-worker

# 2. 登录
npx wrangler login

# 3. 部署
npx wrangler deploy

# 4. 记录 Worker URL
# 例如：https://lottery-prediction.githubmen.workers.dev
```

### Python

```bash
# 1. 安装依赖
pip install -r requirements.txt

# 2. 配置环境
cp .env.example .env
# 编辑 .env

# 3. 初始化数据库
python scripts/init_database.py

# 4. 测试运行
python lottery.py
```

---

## 🧪 部署后验证

### Cloudflare Worker

```bash
# 设置代理（如果需要）
export http_proxy="http://127.0.0.1:7897"
export https_proxy="http://127.0.0.1:7897"

# 1. 测试首页
curl -s "https://your-worker.workers.dev"

# 2. 测试 /stats
curl -s "https://your-worker.workers.dev/stats" | jq '.'

# 3. 测试 /latest
curl -s "https://your-worker.workers.dev/latest" | jq '.'

# 4. 测试 /init（需要认证）
curl -X POST "https://your-worker.workers.dev/init" \
  -H "Authorization: Bearer YOUR_API_KEY" | jq '.'

# 5. 测试 /run（需要认证）
curl -X POST "https://your-worker.workers.dev/run" \
  -H "Authorization: Bearer YOUR_API_KEY" | jq '.'
```

**预期结果**：
- 首页：显示接口列表
- `/stats`：返回统计信息
- `/latest`：返回最新数据或"暂无数据"
- `/init`：返回批量导入结果
- `/run`：返回增量更新结果

### Python

```bash
# 1. 测试爬虫
python lotteries/ssq/test_spider.py

# 2. 测试获取最新数据
python -c "
from lotteries.ssq.spider import SSQSpider
spider = SSQSpider()
data = spider.fetch_latest(count=1)
print(f'✅ 获取到数据: {data[0][\"lottery_no\"]}')
"

# 3. 测试增量更新
python -c "
from lotteries.ssq.spider import SSQSpider
spider = SSQSpider()
data = spider.fetch_incremental('2025120')
print(f'✅ 增量更新: {len(data)} 条新数据')
"
```

**预期结果**：
- 所有测试通过
- 能够成功获取数据
- 双数据源都正常工作

---

## 📊 初始化数据

### Cloudflare Worker

```bash
# 方式 1：使用脚本（推荐）
bash cloudflare-worker/scripts/init.sh

# 方式 2：手动触发
for i in {1..50}; do
  curl -X POST "https://your-worker.workers.dev/init" \
    -H "Authorization: Bearer YOUR_API_KEY"
  sleep 120
done
```

**监控进度**：
```bash
# 查看当前数据量
curl -s "https://your-worker.workers.dev/stats" | jq '.total_count'
```

**停止条件**：
- 数据量 >= 1000（基本完整）
- 数据量 >= 4000（完全完整）
- 或者大部分数据已存在（跳过 > 90）

### Python

```bash
# 方式 1：使用脚本
python scripts/init_database.py

# 方式 2：使用爬虫
python -c "
from lotteries.ssq.spider import SSQSpider
spider = SSQSpider()
data = spider.crawl_all(max_pages=None, use_api_first=False)
print(f'共获取 {len(data)} 条数据')
# 然后保存到数据库
"
```

---

## ⚙️ 配置定时任务

### Cloudflare Worker

1. 进入 Cloudflare Dashboard
2. Workers & Pages > 你的 Worker > Triggers
3. Add Cron Trigger
4. 设置：`0 14 * * *`（每天 22:00 北京时间）
5. 保存

### Python

**使用 crontab**：
```bash
# 编辑 crontab
crontab -e

# 添加定时任务（每天 22:00）
0 22 * * * cd /path/to/project && python scripts/daily_task.py
```

**使用 systemd timer**：
```bash
# 创建 service 文件
sudo nano /etc/systemd/system/lottery.service

# 创建 timer 文件
sudo nano /etc/systemd/system/lottery.timer

# 启用
sudo systemctl enable lottery.timer
sudo systemctl start lottery.timer
```

---

## 🔍 监控和维护

### 日志查看

**Cloudflare Worker**：
- Dashboard > Workers > 你的 Worker > Logs
- 实时查看日志和错误

**Python**：
```bash
# 查看日志
tail -f logs/ssq/spider.log
```

### 数据备份

**Cloudflare Worker**：
```bash
# 导出数据
npx wrangler d1 execute lottery_db --remote \
  --command "SELECT * FROM ssq_lottery" > backup.sql
```

**Python**：
```bash
# 导出数据
mysqldump -u user -p lottery_db > backup.sql
```

### 健康检查

**Cloudflare Worker**：
```bash
# 检查服务状态
curl -s "https://your-worker.workers.dev/stats" | jq '.total_count'

# 检查最新数据
curl -s "https://your-worker.workers.dev/latest" | jq '.lottery_no'
```

**Python**：
```bash
# 检查数据库连接
python -c "
from lotteries.ssq.database import SSQDatabase
db = SSQDatabase()
count = db.get_count()
print(f'数据库中有 {count} 条数据')
"
```

---

## 🐛 故障排查

### 问题 1：Worker 无法访问

**检查**：
- Worker 是否已部署
- URL 是否正确
- 网络是否正常

**解决**：
```bash
# 重新部署
cd cloudflare-worker
npx wrangler deploy
```

### 问题 2：认证失败

**检查**：
- API_KEY 是否正确
- KV 中的配置是否正确

**解决**：
- 在 KV 中更新 API_KEY
- 更新脚本中的 API_KEY

### 问题 3：数据不更新

**检查**：
- 查看 Worker 日志
- 检查数据源是否正常

**解决**：
```bash
# 测试数据源
node cloudflare-worker/test-spider.js

# 手动触发更新
curl -X POST "https://your-worker.workers.dev/run" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

### 问题 4：Python 依赖错误

**检查**：
- Python 版本（需要 3.7+）
- 依赖是否安装

**解决**：
```bash
# 重新安装依赖
pip install -r requirements.txt --upgrade
```

---

## ✅ 部署完成检查

- [ ] Worker/服务正常运行
- [ ] 数据库已初始化
- [ ] 数据已导入（至少 1000 条）
- [ ] 定时任务已配置
- [ ] Telegram 通知正常
- [ ] 日志正常记录
- [ ] 备份策略已设置

---

## 📞 获取帮助

如果遇到问题：

1. 查看文档：
   - [README.md](./README.md)
   - [cloudflare-worker/README.md](./cloudflare-worker/README.md)
   - [docs/](./docs/)

2. 查看日志：
   - Cloudflare Dashboard > Logs
   - `logs/ssq/spider.log`

3. 运行诊断：
   ```bash
   bash cloudflare-worker/scripts/diagnose.sh
   ```

4. 提交 Issue：
   - GitHub Issues

---

**祝部署顺利！** 🚀
