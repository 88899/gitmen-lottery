# 功能特性

## 🎯 智能初始化和增量爬取

### 自动检测首次运行

系统会自动检测数据库是否为空：

```javascript
const dataCount = await db.getCount('ssq');

if (dataCount === 0) {
  // 首次运行：爬取全量数据
  await spider.fetchAll(1000);
} else {
  // 后续运行：智能增量爬取
  await incrementalFetch();
}
```

### 首次运行（全量爬取）

**触发条件**：数据库中没有任何数据

**执行流程**：
1. 检测到数据库为空
2. 发送初始化开始通知
3. 爬取最近 1000 期历史数据
4. 批量保存到数据库
5. 发送初始化完成通知

**特点**：
- ✅ 自动触发，检测数据库为空
- ✅ 分批执行，避免 CPU 超时
- ✅ 每次爬取 100 期数据
- ✅ 需要多次触发（约 40 次）
- ⏱️ 每次耗时约 1-2 分钟
- 📊 总耗时约 1-2 小时

### 后续运行（增量爬取）

**触发条件**：数据库中已有数据

**执行流程**：
1. 获取数据库中最新期号
2. 获取线上最新期号
3. 对比判断是否有新数据
4. 如果有新数据，从最新期号往前爬取
5. 遇到已存在的数据则停止
6. 保存新数据并发送通知

**智能判断**：
```javascript
// 情况 1: 数据已是最新
if (latestInDb === latestOnline) {
  return '数据已是最新，无需更新';
}

// 情况 2: 有新数据，开始增量爬取
while (consecutiveNotFound < 3) {
  if (exists) break;  // 遇到已存在的数据则停止
  if (issueData) {
    newDataList.push(issueData);
  } else {
    consecutiveNotFound++;  // 连续未找到则停止
  }
}
```

**特点**：
- ✅ 智能判断，只爬取缺失的数据
- ✅ 自动停止，防止无限循环
- ✅ 处理各种异常情况
- ⏱️ 耗时约 30 秒

## 🔄 增量爬取场景

### 场景 1: 正常每日运行

```
数据库最新期号: 2025130
线上最新期号: 2025131

执行流程:
1. 检测到有 1 期新数据
2. 爬取 2025131
3. 保存到数据库
4. 预测下一期
5. 发送 Telegram 通知

结果: 新增 1 条数据
```

### 场景 2: 停止运行几天后

```
数据库最新期号: 2025130
线上最新期号: 2025135

执行流程:
1. 检测到有多期新数据
2. 从 2025135 开始往前爬取
3. 爬取 2025135, 2025134, 2025133, 2025132, 2025131
4. 遇到 2025130（已存在）则停止
5. 保存 5 条新数据
6. 发送通知

结果: 新增 5 条数据
```

### 场景 3: 当天没有开奖

```
数据库最新期号: 2025131
线上最新期号: 2025131

执行流程:
1. 检测到期号一致
2. 判断数据已是最新
3. 跳过爬取

结果: 无需更新
```

### 场景 4: 期号不连续

```
数据库最新期号: 2025130
线上最新期号: 2025135
但 2025132, 2025133 不存在

执行流程:
1. 爬取 2025135 ✅
2. 爬取 2025134 ✅
3. 爬取 2025133 ❌ (未找到)
4. 爬取 2025132 ❌ (未找到)
5. 爬取 2025131 ✅
6. 连续 2 次未找到，继续
7. 爬取 2025130 ✅ (已存在，停止)

结果: 新增 3 条数据
```

## 🛡️ 安全机制

### 1. 防止无限循环

```javascript
const maxNotFound = 3;  // 连续 3 次未找到则停止
let consecutiveNotFound = 0;

while (consecutiveNotFound < maxNotFound) {
  if (!issueData) {
    consecutiveNotFound++;
  } else {
    consecutiveNotFound = 0;
  }
}
```

### 2. 限制爬取数量

```javascript
// 最多爬取 100 期
if (newDataList.length >= 100) {
  console.log('已爬取 100 期，停止');
  break;
}
```

### 3. 数据去重

```javascript
// 数据库唯一约束
lottery_no TEXT UNIQUE NOT NULL

// 插入前检查
const exists = await db.checkExists('ssq', currentIssue);
if (exists) break;
```

### 4. 错误通知

```javascript
try {
  // 执行任务
} catch (error) {
  // 发送错误通知到 Telegram
  await telegram.sendError(error);
}
```

## 📊 性能优化

### 批量插入

```javascript
// 首次运行：批量插入 1000 条数据
await db.batchInsert('ssq', allData);

// 增量运行：批量插入新数据
await db.batchInsert('ssq', newDataList);
```

### 智能排序

```javascript
// 按期号排序（从旧到新）
newDataList.sort((a, b) => a.lottery_no.localeCompare(b.lottery_no));
```

### 防封禁策略

```javascript
// 随机延迟 500-2000ms
await spider.randomDelay();

// 随机 User-Agent
headers: { 'User-Agent': getRandomUserAgent() }
```

## 🎯 使用建议

### 首次部署

1. 部署 Worker
2. 创建数据库表结构
3. 配置 KV 存储
4. 手动触发首次运行：
   ```bash
   curl -X POST https://your-worker.workers.dev/run \
     -H "Authorization: Bearer YOUR_API_KEY"
   ```
5. 等待 5-10 分钟完成初始化
6. 配置定时触发器

### 日常运行

- ✅ 定时触发器每天自动执行
- ✅ 系统自动判断并爬取增量数据
- ✅ 无需人工干预
- ✅ 出错自动通知

### 异常处理

**如果 Worker 停止运行了一段时间**：
- ✅ 重新启动后会自动爬取所有缺失的数据
- ✅ 不会丢失任何期号
- ✅ 自动补全数据

**如果数据库被清空**：
- ✅ 下次运行会自动检测并重新初始化
- ✅ 重新爬取全量历史数据

## 💡 技术亮点

1. **零配置** - 自动检测，无需手动初始化
2. **智能判断** - 自动区分首次运行和增量更新
3. **容错性强** - 处理各种异常情况
4. **性能优化** - 批量操作，减少请求次数
5. **安全可靠** - 多重保护机制，防止异常
6. **分批处理** - 避免 Cloudflare CPU 时间限制

## ⚠️ Cloudflare Workers 限制

### CPU 时间限制
- **免费套餐**: 每次请求最多 10ms CPU 时间
- **付费套餐**: 每次请求最多 50ms CPU 时间

### 为什么要分批？

**问题**：
- 爬取 4000 期数据需要约 2000 秒（33 分钟）
- 远超 10ms CPU 时间限制
- Worker 会被强制终止

**解决方案**：
- 每次只爬取 100 期（约 50 秒）
- 分 40 次执行完成
- 每次都在限制内

### 其他限制

- **请求数**: 100,000 次/天（足够）
- **D1 存储**: 5GB（足够）
- **内存**: 128MB（足够）

---

**这就是为什么系统如此智能和可靠！** 🚀
