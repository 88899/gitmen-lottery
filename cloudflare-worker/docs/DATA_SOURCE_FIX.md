# 数据源修复说明

## 问题描述

在本地执行 `init.sh` 时，出现重复失败的情况：
```
📊 执行第 2 次...
⚠️  本批次可能失败，继续尝试...
⏳ 等待 120 秒后继续...
```

## 根本原因

Cloudflare Worker 版本只使用了单一数据源（中彩网 API），当该数据源出现问题时（如网络限制、IP 封禁等），系统无法获取数据。

## 解决方案

### 1. 添加备用数据源

现在系统支持两个数据源：

- **主数据源**: 中彩网 API (`jc.zhcw.com`)
  - 优点：数据完整，支持获取大量历史数据
  - 缺点：可能受 Cloudflare IP 限制

- **备用数据源**: 500彩票网 (`datachart.500.com`)
  - 优点：稳定性高，HTML 解析
  - 缺点：默认只返回最近30期数据

### 2. 自动切换机制

系统会自动尝试：
1. 首先使用主数据源（中彩网）
2. 如果主数据源失败，自动切换到备用数据源（500.com）
3. 如果两个数据源都失败，才报错

### 3. 改进的错误处理

- 更详细的错误日志
- 空响应检测
- 数据格式验证
- HTML 注释处理

## 测试结果

运行 `node cloudflare-worker/test-spider.js` 测试结果：

```
✅ 主数据源（中彩网）正常
✅ 备用数据源（500.com）正常
✅ 自动切换机制正常
✅ 历史数据获取正常
```

## 使用建议

### 本地测试

```bash
# 测试数据源
node cloudflare-worker/test-spider.js

# 本地运行 init.sh
./cloudflare-worker/init.sh
```

### Cloudflare Worker 部署

1. 部署更新后的代码：
```bash
cd cloudflare-worker
npm run deploy
```

2. 手动触发任务：
```bash
curl -X POST https://your-worker.workers.dev/run \
  -H "Authorization: Bearer YOUR_API_KEY"
```

3. 查看日志：
   - 访问 Cloudflare Dashboard
   - 进入 Workers & Pages
   - 查看实时日志

## 注意事项

1. **首次运行**: 由于数据量大，建议多次手动触发 `/run` 直到数据完整
2. **500.com 限制**: 备用数据源只能获取最近30期，如需更多历史数据请使用主数据源
3. **网络环境**: 如果在 Cloudflare Worker 环境中两个数据源都失败，可能是网络限制，建议：
   - 检查 Cloudflare Worker 的出站连接
   - 考虑使用代理
   - 或者在本地运行 Python 版本爬虫，然后通过 API 导入数据

## 代码变更

主要修改文件：
- `cloudflare-worker/src/spiders/ssq.js` - 添加备用数据源和自动切换逻辑
- `cloudflare-worker/test-spider.js` - 新增测试脚本

## 下一步

如果问题仍然存在，可以：
1. 查看 Cloudflare Worker 日志，确认具体错误信息
2. 尝试在本地运行 Python 版本爬虫（已验证可用）
3. 考虑使用定时任务在本地爬取，然后通过 API 同步到 Cloudflare
