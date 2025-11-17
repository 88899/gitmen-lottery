# 部署指南

## 🚀 部署步骤

### 1. 准备工作

确保已完成：
- ✅ 创建 D1 数据库
- ✅ 创建 KV 命名空间
- ✅ 在 KV 中添加配置（TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, API_KEY）
- ✅ 填写 `wrangler.toml` 中的 `database_id` 和 KV `id`

### 2. 部署

```bash
cd cloudflare-worker

# 安装依赖
npm install

# 登录 Cloudflare
npx wrangler login

# 部署
npx wrangler deploy
```

### 3. 初始化数据库

```bash
# 在 D1 控制台执行 schema.sql 创建表结构
```

#### 方式 1: 使用自动化脚本（推荐）

```bash
# 编辑 init.sh，填入你的 Worker URL 和 API_KEY
nano init.sh

# 运行脚本
./init.sh
```

脚本会自动执行多次，直到数据完整。

#### 方式 2: 手动多次触发

```bash
# 执行多次，每次间隔 2 分钟
curl -X POST https://your-worker.workers.dev/run \
  -H "Authorization: Bearer YOUR_API_KEY"

# 等待 2 分钟后再次执行
# 重复约 40 次，直到收到"数据已是最新"的通知
```

**说明**：
- 由于 CPU 时间限制，每次只爬取 100 期
- 4000 期数据需要约 40 次执行
- 每次耗时约 1-2 分钟
- 总耗时约 1-2 小时

### 4. 配置触发器

在 Cloudflare Dashboard 配置定时触发器：
- Cron: `0 14 * * *` (UTC 14:00 = 北京时间 22:00)
- URL: `https://your-worker.workers.dev/run`
- Method: POST
- Header: `Authorization: Bearer YOUR_API_KEY`

## 🔧 故障排查

### 错误：`binding KV_BINDING not found`

**原因**：KV 绑定未配置或名称不匹配

**解决**：确保 `wrangler.toml` 中的绑定名称是 `KV_BINDING`：
```toml
[[kv_namespaces]]
binding = "KV_BINDING"  # 必须与 Cloudflare 中的一致
id = "你的KV_id"
```

### 错误：`binding DB not found`

**原因**：D1 数据库绑定未配置

**解决**：确保 `wrangler.toml` 中填写了正确的 `database_id`

### 部署成功但无法访问

**检查**：
1. Worker URL 是否正确
2. 访问 `/` 查看接口列表
3. 使用 `npx wrangler tail` 查看实时日志

## 📋 检查清单

### 部署前
- [ ] 已创建 D1 数据库
- [ ] 已创建 KV 命名空间
- [ ] 已在 KV 中添加 3 个配置项
- [ ] 已填写 `wrangler.toml` 中的 `database_id`
- [ ] 已填写 `wrangler.toml` 中的 KV `id`
- [ ] KV 绑定名称是 `KV_BINDING`（与 Cloudflare 中的一致）

### 部署后
- [ ] 访问 Worker URL 确认部署成功
- [ ] 执行 `/test` 测试 Telegram 连接
- [ ] 在 D1 控制台执行 `schema.sql`
- [ ] 执行 `/init` 初始化数据库
- [ ] 配置定时触发器

## 💡 提示

1. **查看日志**：`npx wrangler tail`
2. **测试接口**：先访问 `/` 查看可用接口
3. **检查配置**：确认 KV 中的配置项已添加
4. **绑定名称**：代码中使用 `CONFIG`，不要改成其他名称

## 🔗 相关文档

- [README.md](./README.md) - 完整项目文档
- [Wrangler 文档](https://developers.cloudflare.com/workers/wrangler/)
