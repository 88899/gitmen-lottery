# 彩票预测系统 - 完整技术文档

**版本**: v1.0.0  
**更新日期**: 2025-11-20  
**作者**: Lottery Prediction Team

---

## 📋 目录

1. [项目概述](#项目概述)
2. [需求清单](#需求清单)
3. [技术架构](#技术架构)
4. [模块设计](#模块设计)
5. [功能清单](#功能清单)
6. [实现思路](#实现思路)
7. [部署指南](#部署指南)
8. [测试指南](#测试指南)
9. [运维指南](#运维指南)
10. [扩展开发](#扩展开发)
11. [故障排查](#故障排查)

---

## 项目概述

### 1.1 项目简介

彩票预测系统是一个基于历史数据分析的智能预测平台，支持双色球（SSQ）、大乐透（DLT）和七星彩（QXC）三种彩票类型。系统采用混合架构：
- **Python 版本**：本地运行，功能完整，适合开发和测试
- **Cloudflare Worker 版本**：云端部署，无服务器架构，适合生产环境

### 1.2 核心特性

- ✅ **三彩票支持**：双色球 + 大乐透 + 七星彩
- ✅ **智能爬取**：增量更新，自动跨年处理
- ✅ **多策略预测**：频率、随机、均衡、冷热号等
- ✅ **Telegram 通知**：支持机器人和频道推送
- ✅ **定时任务**：每日自动更新和预测
- ✅ **RESTful API**：完整的 HTTP 接口
- ✅ **无服务器**：基于 Cloudflare Workers
- ✅ **免费部署**：Free Plan 可用

### 1.3 技术栈

**后端（Python）**
- Python 3.12+
- SQLite 数据库
- Requests（HTTP 客户端）
- BeautifulSoup4（HTML 解析）

**后端（Cloudflare Worker）**
- JavaScript ES6+
- Cloudflare Workers（无服务器）
- D1 Database（SQLite）
- KV Storage（配置存储）

**数据源**
- 500.com（主要数据源）

**通知**
- Telegram Bot API

---


## 需求清单

### 2.1 功能需求

#### FR-001: 数据爬取
- **优先级**: P0
- **描述**: 从 500.com 爬取双色球、大乐透和七星彩历史数据
- **需求**:
  - 支持增量爬取（只爬取新数据）
  - 自动跨年处理（2025 → 2026）
  - 智能判断完成状态
  - 批量入库，自动去重
- **验收标准**:
  - 双色球：从 2003 年至今，约 3300+ 期
  - 大乐透：从 2007 年至今，约 2700+ 期
  - 数据完整性 > 99.9%

#### FR-002: 预测算法
- **优先级**: P0
- **描述**: 基于历史数据生成预测号码
- **需求**:
  - 支持多种策略（频率、随机、均衡、冷热号）
  - 可配置预测数量
  - 可组合多种策略
  - 去重历史组合
- **验收标准**:
  - 预测生成时间 < 500ms
  - 预测结果不重复
  - 符合彩票规则

#### FR-003: Telegram 通知
- **优先级**: P1
- **描述**: 通过 Telegram 推送预测结果
- **需求**:
  - 支持机器人私聊
  - 支持频道推送
  - 可配置发送目标
  - 消息格式美观
- **验收标准**:
  - 消息发送成功率 > 95%
  - 消息格式清晰易读
  - 支持 HTML 格式

#### FR-004: 定时任务
- **优先级**: P0
- **描述**: 每日自动执行爬取和预测
- **需求**:
  - 可配置执行时间
  - 自动增量更新
  - 失败重试机制
  - 执行日志记录
- **验收标准**:
  - 定时任务准时执行
  - 执行成功率 > 99%
  - 异常自动通知

#### FR-005: RESTful API
- **优先级**: P0
- **描述**: 提供 HTTP 接口供外部调用
- **需求**:
  - 查询最新数据
  - 获取预测结果
  - 查看统计信息
  - 手动触发任务
- **验收标准**:
  - API 响应时间 < 1s
  - 接口文档完整
  - 支持 CORS

### 2.2 非功能需求

#### NFR-001: 性能
- **单次请求响应时间**: < 1s
- **预测生成时间**: < 500ms
- **定时任务执行时间**: < 10s
- **并发支持**: 100 QPS

#### NFR-002: 可用性
- **系统可用性**: > 99.9%
- **数据准确性**: > 99.9%
- **错误恢复时间**: < 5min

#### NFR-003: 可扩展性
- **支持新彩票类型**: 模块化设计
- **支持新预测策略**: 插件化架构
- **支持新数据源**: 适配器模式

#### NFR-004: 安全性
- **API 认证**: Bearer Token
- **敏感信息加密**: KV 存储
- **防爬虫策略**: 请求限流

#### NFR-005: 成本
- **Cloudflare Workers**: Free Plan
- **D1 Database**: Free Plan
- **KV Storage**: Free Plan
- **月度成本**: $0

---


## 技术架构

### 3.1 整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                        用户层                                │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ Web 浏览器│  │ API 客户端│  │ Telegram │  │ Cron 触发│   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    Cloudflare Workers                        │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                   API Gateway                         │  │
│  │  /init  /run  /latest  /predict  /stats  /test      │  │
│  └──────────────────────────────────────────────────────┘  │
│                            ↓                                 │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                  业务逻辑层                           │  │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐    │  │
│  │  │ smartFetch │  │ Predictor  │  │ Telegram   │    │  │
│  │  │  (爬取)    │  │  (预测)    │  │  (通知)    │    │  │
│  │  └────────────┘  └────────────┘  └────────────┘    │  │
│  └──────────────────────────────────────────────────────┘  │
│                            ↓                                 │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                  数据访问层                           │  │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐    │  │
│  │  │ D1 Database│  │ KV Storage │  │ Spider     │    │  │
│  │  │  (数据)    │  │  (配置)    │  │  (爬虫)    │    │  │
│  │  └────────────┘  └────────────┘  └────────────┘    │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                      外部服务                                │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                 │
│  │ 500.com  │  │ Telegram │  │ Cloudflare│                 │
│  │ (数据源) │  │   API    │  │   CDN     │                 │
│  └──────────┘  └──────────┘  └──────────┘                 │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 数据流

#### 3.2.1 爬取流程
```
1. 定时任务触发 / 手动调用 API
   ↓
2. smartFetch() 获取数据库最新期号
   ↓
3. 计算爬取范围（下一期 → 当年最后一期）
   ↓
4. Spider.fetch(startIssue, endIssue) 爬取数据
   ↓
5. 批量入库（自动去重）
   ↓
6. 返回结果（inserted, total, hasMore）
```

#### 3.2.2 预测流程
```
1. 接收预测请求（count, strategies）
   ↓
2. 从数据库获取历史数据（最近 100 期）
   ↓
3. 计算号码频率统计
   ↓
4. 按策略生成预测组合
   ↓
5. 去重（历史组合 + 已生成组合）
   ↓
6. 返回预测结果
```

#### 3.2.3 通知流程
```
1. 预测完成后触发
   ↓
2. 构建消息（buildPredictionMessage）
   ↓
3. 并行发送到机器人/频道
   ↓
4. 记录发送结果
```

### 3.3 技术选型

#### 3.3.1 为什么选择 Cloudflare Workers？

**优势**：
- ✅ **零成本**：Free Plan 足够使用
- ✅ **全球 CDN**：边缘计算，低延迟
- ✅ **自动扩展**：无需管理服务器
- ✅ **高可用**：99.99% SLA
- ✅ **简单部署**：一键发布

**限制**：
- ⚠️ CPU 时间：10ms (Free) / 50ms (Paid)
- ⚠️ 内存：128MB
- ⚠️ 执行时间：10s (Free) / 30s (Paid)

**应对策略**：
- 并行处理减少总时间
- 超时保护（500ms）
- 数据查询限制（100 条）
- 批量操作优化

#### 3.3.2 为什么选择 D1 Database？

**优势**：
- ✅ **SQLite 兼容**：标准 SQL
- ✅ **免费额度**：5GB 存储
- ✅ **低延迟**：边缘数据库
- ✅ **自动备份**：数据安全

**限制**：
- ⚠️ 读取：500 万次/天
- ⚠️ 写入：10 万次/天

**应对策略**：
- 批量插入减少写入次数
- 增量更新避免重复
- 查询优化（索引、LIMIT）

#### 3.3.3 为什么选择 KV Storage？

**优势**：
- ✅ **全球分布**：低延迟读取
- ✅ **简单易用**：Key-Value 存储
- ✅ **免费额度**：10 万次读取/天

**用途**：
- 配置存储（API_KEY, TELEGRAM_BOT_TOKEN）
- 策略配置（DEFAULT_STRATEGIES）
- 预测参数（DEFAULT_PREDICTION_COUNT）

---


## 模块设计

### 4.1 目录结构

```
lottery-prediction/
├── cloudflare-worker/          # Cloudflare Worker 版本
│   ├── src/
│   │   ├── index.js           # 主入口，API 路由
│   │   ├── spiders/           # 爬虫模块
│   │   │   ├── ssq.js        # 双色球爬虫
│   │   │   └── dlt.js        # 大乐透爬虫
│   │   ├── predictors/        # 预测模块
│   │   │   ├── ssq.js        # 双色球预测器
│   │   │   ├── dlt.js        # 大乐透预测器
│   │   │   └── strategies/   # 预测策略
│   │   │       ├── index.js
│   │   │       ├── base.js
│   │   │       ├── frequency.js
│   │   │       ├── random.js
│   │   │       ├── balanced.js
│   │   │       └── cold_hot.js
│   │   └── utils/             # 工具模块
│   │       ├── database.js   # 数据库操作
│   │       ├── telegram.js   # Telegram 通知
│   │       └── error-handler.js
│   ├── scripts/               # 脚本工具
│   │   ├── init.sh           # 初始化脚本
│   │   └── README.md
│   ├── wrangler.toml          # Worker 配置
│   ├── schema.sql             # 数据库 Schema
│   └── .env                   # 环境变量
│
├── lotteries/                  # Python 版本（彩票模块）
│   ├── ssq/                   # 双色球
│   │   ├── spider.py
│   │   ├── predictor.py
│   │   └── strategies/
│   └── dlt/                   # 大乐透
│       ├── spider.py
│       ├── predictor.py
│       └── strategies/
│
├── core/                       # Python 核心模块
│   ├── base_spider.py
│   ├── base_predictor.py
│   ├── base_database.py
│   ├── telegram_bot.py
│   └── config.py
│
├── cli/                        # Python CLI 工具
│   ├── fetch.py
│   ├── predict.py
│   └── schedule.py
│
├── docs/                       # 文档
│   ├── ARCHITECTURE.md
│   └── TELEGRAM_CHANNEL_SETUP.md
│
├── README.md
└── TECHNICAL_DOCUMENTATION.md  # 本文档
```

### 4.2 核心模块

#### 4.2.1 smartFetch（智能爬取）

**文件**: `cloudflare-worker/src/index.js`

**职责**:
- 增量爬取新数据
- 自动跨年处理
- 智能判断完成状态

**关键函数**:
```javascript
async function smartFetch(type, env, options = {})
```

**输入**:
- `type`: 彩票类型（'ssq' | 'dlt' | 'qxc'）
- `env`: Worker 环境变量
- `options`: 配置选项
  - `batchSize`: 批次大小（默认 50）
  - `maxRetries`: 最大重试次数（默认 1）

**输出**:
```javascript
{
  success: true,
  type: 'ssq',
  name: '双色球',
  inserted: 50,      // 新增数据量
  skipped: 0,        // 跳过数据量
  total: 3379,       // 总数据量
  hasMore: false,    // 是否还有更多数据
  needsCrossYear: false,
  note: '无数据，可能已完成'
}
```

**核心逻辑**:
1. 获取数据库最新期号
2. 计算下一批次范围
3. 调用爬虫爬取数据
4. 批量入库（自动去重）
5. 判断是否需要跨年
6. 返回结果

#### 4.2.2 Spider（爬虫）

**文件**: 
- `cloudflare-worker/src/spiders/ssq.js`
- `cloudflare-worker/src/spiders/dlt.js`

**职责**:
- 从 500.com 爬取数据
- 解析 HTML 提取号码
- 数据格式化

**关键方法**:
```javascript
class SSQSpider {
  async fetch(startIssue, endIssue)  // 爬取期号范围
  parse500Html(html, latestOnly)     // 解析 HTML
}
```

**数据格式**:
```javascript
// 双色球
{
  lottery_no: '2025133',
  draw_date: '2025-11-18',
  red_balls: [5, 14, 17, 19, 20, 33],
  blue_ball: 7
}

// 大乐透
{
  lottery_no: '2025132',
  draw_date: '2025-11-18',
  front_balls: [3, 8, 25, 29, 32],
  back_balls: [9, 12]
}
```

#### 4.2.3 Predictor（预测器）

**文件**:
- `cloudflare-worker/src/predictors/ssq.js`
- `cloudflare-worker/src/predictors/dlt.js`

**职责**:
- 基于历史数据生成预测
- 支持多种策略
- 去重历史组合

**关键方法**:
```javascript
class SSQPredictor {
  constructor(db, options)
  async predict(count, strategies)
  async predictWithStrategy(strategyName, count, context)
}
```

**预测流程**:
1. 获取历史数据（最近 100 期）
2. 计算频率统计
3. 按策略生成组合
4. 去重验证
5. 返回结果

#### 4.2.4 Strategy（预测策略）

**文件**: `cloudflare-worker/src/predictors/strategies/`

**策略列表**:

| 策略 | 文件 | 描述 |
|------|------|------|
| frequency | frequency.js | 基于历史频率，选择高频号码 |
| random | random.js | 完全随机，不考虑历史 |
| balanced | balanced.js | 追求号码分布均衡 |
| coldHot | cold_hot.js | 结合冷号和热号 |

**策略接口**:
```javascript
class BaseStrategy {
  generateRedBalls(context)   // 生成红球
  generateBlueBall(context)   // 生成蓝球
  validate(redBalls, blueBall) // 验证组合
}
```

#### 4.2.5 Database（数据库）

**文件**: `cloudflare-worker/src/utils/database.js`

**职责**:
- D1 数据库操作
- CRUD 接口
- 统计查询

**关键方法**:
```javascript
class Database {
  async init()                    // 初始化表
  async batchInsert(type, data)   // 批量插入
  async getLatest(type)           // 获取最新数据
  async getAll(type, limit)       // 获取历史数据
  async getFrequency(type)        // 获取频率统计
  async getCount(type)            // 获取总数
}
```

**数据库 Schema**:
```sql
-- 双色球
CREATE TABLE ssq_lottery (
  id INTEGER PRIMARY KEY,
  lottery_no TEXT UNIQUE,
  draw_date TEXT,
  red1, red2, red3, red4, red5, red6 INTEGER,
  blue INTEGER,
  sorted_code TEXT
);

-- 大乐透
CREATE TABLE dlt_lottery (
  id INTEGER PRIMARY KEY,
  lottery_no TEXT UNIQUE,
  draw_date TEXT,
  front1, front2, front3, front4, front5 INTEGER,
  back1, back2 INTEGER,
  sorted_code TEXT
);
```

#### 4.2.6 Telegram（通知）

**文件**: `cloudflare-worker/src/utils/telegram.js`

**职责**:
- 发送 Telegram 消息
- 支持机器人和频道
- 消息格式化

**关键方法**:
```javascript
class TelegramBot {
  constructor(botToken, chatId, channelId, sendToBot, sendToChannel)
  async sendMessage(text, parseMode)
  async sendError(error)
}
```

**消息格式**:
```
🔮 双色球预测
组合 1: [频率策略]
🔴 红球: 03 07 15 22 28 33
🔵 蓝球: 12

组合 2: [随机策略]
🔴 红球: 02 09 14 19 26 31
🔵 蓝球: 05

━━━━━━━━━━━━━━━
⚠️ 仅供参考，理性购彩
```

---


## 功能清单

### 5.1 已实现功能

| 功能 | 描述 | 状态 | 优先级 |
|------|------|------|--------|
| 双色球爬取 | 从 500.com 爬取双色球历史数据 | ✅ | P0 |
| 大乐透爬取 | 从 500.com 爬取大乐透历史数据 | ✅ | P0 |
| 增量更新 | 只爬取新数据，避免重复 | ✅ | P0 |
| 自动跨年 | 自动处理年份切换 | ✅ | P0 |
| 频率策略 | 基于历史频率预测 | ✅ | P0 |
| 随机策略 | 完全随机预测 | ✅ | P1 |
| 均衡策略 | 号码分布均衡预测 | ✅ | P1 |
| 冷热号策略 | 结合冷热号预测 | ✅ | P1 |
| Telegram 机器人 | 发送到机器人私聊 | ✅ | P0 |
| Telegram 频道 | 发送到频道 | ✅ | P0 |
| 定时任务 | 每日自动执行 | ✅ | P0 |
| RESTful API | HTTP 接口 | ✅ | P0 |
| 初始化脚本 | 批量导入历史数据 | ✅ | P1 |
| 错误处理 | 异常捕获和通知 | ✅ | P0 |
| 日志记录 | 执行日志 | ✅ | P1 |

### 5.2 API 接口清单

| 接口 | 方法 | 认证 | 描述 |
|------|------|------|------|
| `/init/{type}` | POST | ✅ | 初始化数据库 |
| `/run` | POST | ✅ | 手动执行任务 |
| `/latest/{type}` | GET | ❌ | 查询最新数据 |
| `/predict/{type}` | GET | ❌ | 获取预测结果 |
| `/stats/{type}` | GET | ❌ | 查看统计信息 |
| `/strategies/{type}` | GET | ❌ | 查看可用策略 |
| `/test` | GET | ❌ | 测试 Telegram |

**说明**:
- `{type}` 可选值：`ssq`（双色球）、`dlt`（大乐透）、`qxc`（七星彩）
- 不指定 `{type}` 时返回所有类型
- 认证方式：`Authorization: Bearer YOUR_API_KEY`

### 5.3 待实现功能

| 功能 | 描述 | 优先级 | 预计工作量 |
|------|------|--------|-----------|
| 历史预测记录 | 保存预测结果，用于验证准确率 | P2 | 2天 |
| 准确率统计 | 统计预测命中率 | P2 | 1天 |
| 更多彩票类型 | 支持 3D、排列三等 | P3 | 3天/类型 |
| 机器学习预测 | 基于 ML 的预测策略 | P3 | 1周 |
| Web 界面 | 可视化界面 | P3 | 2周 |
| 用户系统 | 多用户支持 | P3 | 1周 |

---


## 实现思路

### 6.1 智能爬取算法

**问题**: 如何高效地爬取历史数据？

**解决方案**: 增量爬取 + 智能判断

**核心思路**:
1. **获取起点**: 从数据库获取最新期号
2. **计算范围**: 下一期 → 当年最后一期（200期）
3. **批量爬取**: 一次爬取 50 期
4. **自动跨年**: 如果无数据，尝试下一年
5. **智能判断**: 通过 `hasMore` 标志判断是否完成

**优势**:
- ✅ 避免重复爬取
- ✅ 自动处理跨年
- ✅ 减少 API 调用
- ✅ 智能判断完成

**代码示例**:
```javascript
async function smartFetch(type, env, options) {
  // 1. 获取最新期号
  const latest = await db.getLatest(type);
  const latestNo = latest.lottery_no; // 2025133
  
  // 2. 计算下一批次
  const year = parseInt(latestNo.substring(0, 4));
  const issue = parseInt(latestNo.substring(4));
  const nextIssue = issue + 1;
  
  // 3. 检查是否跨年
  if (nextIssue > 200) {
    // 跨年处理
    startIssue = `${year+1}001`;
  } else {
    startIssue = `${year}${nextIssue.toString().padStart(3, '0')}`;
  }
  
  // 4. 爬取数据
  const data = await spider.fetch(startIssue, endIssue);
  
  // 5. 批量入库
  const result = await db.batchInsert(type, data);
  
  // 6. 返回结果
  return {
    hasMore: result.inserted > 0,
    inserted: result.inserted,
    total: await db.getCount(type)
  };
}
```

### 6.2 预测算法设计

**问题**: 如何生成有效的预测组合？

**解决方案**: 多策略组合 + 去重验证

**核心思路**:
1. **数据准备**: 获取最近 100 期历史数据
2. **频率统计**: 计算每个号码出现频率
3. **策略生成**: 按不同策略生成组合
4. **去重验证**: 
   - 去除历史出现过的组合
   - 去除本次已生成的组合
5. **超时保护**: 最多尝试 200 次或 500ms

**策略实现**:

**频率策略**:
```javascript
generateRedBalls(context) {
  // 按频率排序，选择前 N 个高频号码
  const sorted = context.redFrequency.sort((a, b) => b.count - a.count);
  return sorted.slice(0, 6).map(item => parseInt(item.ball));
}
```

**随机策略**:
```javascript
generateRedBalls(context) {
  // 完全随机选择
  const balls = [];
  while (balls.length < 6) {
    const ball = Math.floor(Math.random() * 33) + 1;
    if (!balls.includes(ball)) balls.push(ball);
  }
  return balls.sort((a, b) => a - b);
}
```

**均衡策略**:
```javascript
generateRedBalls(context) {
  // 确保大小号、奇偶号均衡
  const balls = [];
  // 3个小号（1-16）+ 3个大号（17-33）
  // 3个奇数 + 3个偶数
  return balls.sort((a, b) => a - b);
}
```

### 6.3 性能优化

**问题**: 如何在 Free Plan 限制下运行？

**解决方案**: 多层优化

#### 6.3.1 并行处理
```javascript
// 并行处理三种彩票
const [ssqResult, dltResult, qxcResult] = await Promise.all([
  processSingleLottery('ssq', env, config),
  processSingleLottery('dlt', env, config),
  processSingleLottery('qxc', env, config)
]);

// 并行发送 Telegram 消息
await Promise.all(
  messages.map(msg => telegram.sendMessage(msg.content))
);
```

#### 6.3.2 数据查询优化
```javascript
// 限制查询数量
const historyData = await db.getAll('ssq', 100);  // 只取 100 条

// 并行查询
const [historyData, frequency, combinations] = await Promise.all([
  db.getAll('ssq', 100),
  db.getFrequency('ssq'),
  db.getHistoricalCombinations('ssq')
]);
```

#### 6.3.3 超时保护
```javascript
const startTime = Date.now();
const maxTime = 500; // 500ms 限制

while (predictions.length < count && attempts < maxAttempts) {
  // 每 10 次检查一次时间
  if (attempts % 10 === 0 && Date.now() - startTime > maxTime) {
    console.warn('预测超时');
    break;
  }
  // 生成预测...
}
```

### 6.4 错误处理

**问题**: 如何保证系统稳定性？

**解决方案**: 多层错误处理

#### 6.4.1 网络错误
```javascript
try {
  const response = await fetch(url);
  if (!response.ok) {
    await handleNetworkError(env, response.status, url, type);
    throw new Error(`HTTP ${response.status}`);
  }
} catch (error) {
  console.error('网络请求失败:', error);
  // 发送 Telegram 通知
  await telegram.sendError(error);
}
```

#### 6.4.2 数据解析错误
```javascript
try {
  const data = this.parse500Html(html);
  if (!data || data.length === 0) {
    throw new Error('解析结果为空');
  }
} catch (error) {
  await handleParseError(env, error, html.substring(0, 500));
  throw error;
}
```

#### 6.4.3 预测错误
```javascript
try {
  const predictions = await predictor.predict(count);
} catch (predictError) {
  console.error('预测失败:', predictError);
  // 返回空数组，不中断流程
  return {
    predictions: [],
    error: predictError.message
  };
}
```

---


## 部署指南

### 7.1 前置条件

**必需**:
- Cloudflare 账号（Free Plan 即可）
- Node.js 18+ 和 npm
- Wrangler CLI
- Telegram Bot Token（可选）

**安装 Wrangler**:
```bash
npm install -g wrangler
wrangler login
```

### 7.2 部署步骤

#### 步骤 1: 克隆项目
```bash
git clone https://github.com/your-repo/lottery-prediction.git
cd lottery-prediction/cloudflare-worker
```

#### 步骤 2: 创建 D1 数据库
```bash
# 创建数据库
wrangler d1 create lottery_db

# 记录返回的 database_id，更新到 wrangler.toml
```

#### 步骤 3: 初始化数据库表
```bash
# 执行 schema.sql
wrangler d1 execute lottery_db --file=schema.sql
```

#### 步骤 4: 创建 KV 命名空间
```bash
# 创建 KV
wrangler kv:namespace create KV_BINDING

# 记录返回的 id，更新到 wrangler.toml
```

#### 步骤 5: 配置环境变量
```bash
# 配置 API Key
wrangler kv:key put --binding=KV_BINDING API_KEY "your-secret-key"

# 配置 Telegram（可选）
wrangler kv:key put --binding=KV_BINDING TELEGRAM_BOT_TOKEN "your-bot-token"
wrangler kv:key put --binding=KV_BINDING TELEGRAM_CHAT_ID "your-chat-id"

# 配置预测参数
wrangler kv:key put --binding=KV_BINDING DEFAULT_STRATEGIES "frequency,random,balanced,coldHot"
wrangler kv:key put --binding=KV_BINDING DEFAULT_PREDICTION_COUNT "4"
```

#### 步骤 6: 部署 Worker
```bash
wrangler deploy
```

#### 步骤 7: 配置自定义域名（可选）
```bash
# 在 wrangler.toml 中添加
[[routes]]
pattern = "your-domain.com"
custom_domain = true

# 重新部署
wrangler deploy
```

#### 步骤 8: 初始化数据
```bash
# 配置 .env
cp .env.example .env
vim .env  # 修改 WORKER_URL 和 API_KEY

# 运行初始化脚本
./scripts/init.sh
```

### 7.3 验证部署

```bash
# 1. 测试 API
curl https://your-worker.workers.dev/

# 2. 查询最新数据
curl https://your-worker.workers.dev/latest/ssq

# 3. 获取预测
curl https://your-worker.workers.dev/predict/ssq

# 4. 测试 Telegram
curl https://your-worker.workers.dev/test
```

### 7.4 配置定时任务

定时任务已在 `wrangler.toml` 中配置：
```toml
[triggers]
crons = ["00 14 * * *"]  # 每天 UTC 14:00 = 北京时间 22:00
```

修改后重新部署：
```bash
wrangler deploy
```

### 7.5 更新部署

```bash
# 1. 拉取最新代码
git pull

# 2. 重新部署
cd cloudflare-worker
wrangler deploy

# 3. 验证
curl https://your-worker.workers.dev/latest/ssq
```

---


## 测试指南

### 8.1 功能测试

#### 8.1.1 数据爬取测试

**测试用例 TC-001**: 初始化双色球数据
```bash
# 执行
curl -X POST https://your-worker.workers.dev/init/ssq \
  -H "Authorization: Bearer YOUR_API_KEY"

# 预期结果
{
  "success": true,
  "inserted": 50,
  "total": 50,
  "hasMore": true
}

# 验证
curl https://your-worker.workers.dev/stats/ssq
# 应该显示 total_count: 50
```

**测试用例 TC-002**: 增量更新
```bash
# 第一次爬取
curl -X POST https://your-worker.workers.dev/init/ssq \
  -H "Authorization: Bearer YOUR_API_KEY"
# 记录 total: 50

# 第二次爬取
curl -X POST https://your-worker.workers.dev/init/ssq \
  -H "Authorization: Bearer YOUR_API_KEY"
# 预期 total: 100, inserted: 50, skipped: 0
```

**测试用例 TC-003**: 跨年处理
```bash
# 当数据库最新期号为 2025200 时
curl -X POST https://your-worker.workers.dev/init/ssq \
  -H "Authorization: Bearer YOUR_API_KEY"

# 预期
# queryParams.start: "26001"
# queryParams.end: "26050"
```

#### 8.1.2 预测功能测试

**测试用例 TC-004**: 基础预测
```bash
# 执行
curl https://your-worker.workers.dev/predict/ssq

# 预期结果
{
  "lottery_type": "ssq",
  "predictions": [
    {
      "red_balls": [3, 9, 14, 17, 20, 27],
      "blue_ball": 12,
      "strategy": "frequency"
    }
  ]
}

# 验证
- predictions 数组长度 = DEFAULT_PREDICTION_COUNT
- red_balls 长度 = 6
- red_balls 范围 1-33
- blue_ball 范围 1-16
- 无重复号码
```

**测试用例 TC-005**: 自定义参数预测
```bash
# 执行
curl "https://your-worker.workers.dev/predict/ssq?count=10&strategies=frequency,balanced"

# 预期结果
- predictions 数组长度 = 10
- 策略只包含 frequency 和 balanced
```

**测试用例 TC-006**: 预测去重
```bash
# 多次调用预测
for i in {1..5}; do
  curl https://your-worker.workers.dev/predict/ssq
done

# 验证
- 每次返回的组合不同
- 不包含历史出现过的组合
```

#### 8.1.3 Telegram 通知测试

**测试用例 TC-007**: 测试连接
```bash
# 执行
curl https://your-worker.workers.dev/test

# 预期结果
"Telegram 连接正常"

# 验证
- Telegram 收到测试消息
```

**测试用例 TC-008**: 预测通知
```bash
# 执行
curl https://your-worker.workers.dev/predict/ssq

# 验证
- Telegram 收到预测消息
- 消息格式正确
- 包含所有预测组合
```

#### 8.1.4 定时任务测试

**测试用例 TC-009**: 手动触发
```bash
# 执行
curl -X POST https://your-worker.workers.dev/run \
  -H "Authorization: Bearer YOUR_API_KEY"

# 预期结果
{
  "success": true,
  "results": [
    {
      "type": "ssq",
      "success": true,
      "predictions": [...]
    },
    {
      "type": "dlt",
      "success": true,
      "predictions": [...]
    }
  ]
}

# 验证
- Telegram 收到双色球预测
- Telegram 收到大乐透预测
```

### 8.2 性能测试

#### 8.2.1 响应时间测试

**测试用例 TC-010**: API 响应时间
```bash
# 测试查询接口
time curl https://your-worker.workers.dev/latest/ssq

# 预期
- 响应时间 < 1s
```

**测试用例 TC-011**: 预测生成时间
```bash
# 测试预测接口
time curl https://your-worker.workers.dev/predict/ssq

# 预期
- 响应时间 < 1s
- Worker CPU 时间 < 10ms (Free Plan)
```

**测试用例 TC-012**: 定时任务执行时间
```bash
# 查看 Cloudflare Dashboard > Workers > Metrics

# 预期
- 执行时间 < 10s
- CPU 时间 < 10ms (Free Plan)
```

#### 8.2.2 并发测试

**测试用例 TC-013**: 并发请求
```bash
# 使用 ab 工具
ab -n 100 -c 10 https://your-worker.workers.dev/latest/ssq

# 预期
- 成功率 > 99%
- 平均响应时间 < 1s
```

### 8.3 异常测试

#### 8.3.1 错误处理测试

**测试用例 TC-014**: 无效认证
```bash
# 执行
curl -X POST https://your-worker.workers.dev/init/ssq \
  -H "Authorization: Bearer INVALID_KEY"

# 预期结果
HTTP 401 Unauthorized
```

**测试用例 TC-015**: 无效参数
```bash
# 执行
curl https://your-worker.workers.dev/predict/invalid

# 预期结果
HTTP 404 Not Found
```

**测试用例 TC-016**: 数据库为空
```bash
# 在空数据库上执行预测
curl https://your-worker.workers.dev/predict/ssq

# 预期结果
{
  "error": "没有历史数据"
}
```

### 8.4 测试清单

| 测试项 | 测试用例 | 状态 | 备注 |
|--------|---------|------|------|
| 数据爬取 | TC-001, TC-002, TC-003 | ✅ | |
| 预测功能 | TC-004, TC-005, TC-006 | ✅ | |
| Telegram | TC-007, TC-008 | ✅ | |
| 定时任务 | TC-009 | ✅ | |
| 性能 | TC-010, TC-011, TC-012 | ✅ | |
| 并发 | TC-013 | ✅ | |
| 异常处理 | TC-014, TC-015, TC-016 | ✅ | |

---


## 运维指南

### 9.1 日常监控

#### 9.1.1 查看 Worker 日志
```bash
# 实时日志
wrangler tail

# 或在 Cloudflare Dashboard 查看
# Workers & Pages > lottery-prediction > Logs
```

#### 9.1.2 监控指标

**关键指标**:
- **请求数**: 每日请求量
- **成功率**: 成功请求 / 总请求
- **响应时间**: P50, P95, P99
- **CPU 时间**: 平均 CPU 时间
- **错误率**: 错误请求 / 总请求

**查看方式**:
- Cloudflare Dashboard > Workers > Analytics
- 或使用 Cloudflare API

#### 9.1.3 定时任务监控

**检查项**:
- 定时任务是否按时执行
- 执行是否成功
- Telegram 通知是否发送

**查看方式**:
```bash
# 查看 Cron 触发记录
# Cloudflare Dashboard > Workers > Triggers > Cron Triggers

# 查看执行日志
wrangler tail --format pretty
```

### 9.2 数据库维护

#### 9.2.1 查看数据量
```bash
# 查询双色球数据量
wrangler d1 execute lottery_db --command="SELECT COUNT(*) FROM ssq_lottery"

# 查询大乐透数据量
wrangler d1 execute lottery_db --command="SELECT COUNT(*) FROM dlt_lottery"
```

#### 9.2.2 数据备份
```bash
# 导出数据
wrangler d1 export lottery_db --output=backup.sql

# 定期备份（建议每周）
crontab -e
# 添加：0 0 * * 0 cd /path/to/project && wrangler d1 export lottery_db --output=backup-$(date +\%Y\%m\%d).sql
```

#### 9.2.3 数据恢复
```bash
# 从备份恢复
wrangler d1 execute lottery_db --file=backup.sql
```

### 9.3 配置管理

#### 9.3.1 查看配置
```bash
# 查看 KV 中的配置
wrangler kv:key list --binding=KV_BINDING

# 查看具体配置
wrangler kv:key get --binding=KV_BINDING API_KEY
wrangler kv:key get --binding=KV_BINDING DEFAULT_STRATEGIES
```

#### 9.3.2 更新配置
```bash
# 更新预测策略
wrangler kv:key put --binding=KV_BINDING DEFAULT_STRATEGIES "frequency,balanced"

# 更新预测数量
wrangler kv:key put --binding=KV_BINDING DEFAULT_PREDICTION_COUNT "5"

# 更新 Telegram 配置
wrangler kv:key put --binding=KV_BINDING TELEGRAM_BOT_TOKEN "new-token"
```

### 9.4 故障处理

#### 9.4.1 定时任务未执行

**症状**: Telegram 没有收到通知

**排查步骤**:
1. 检查 Cron 配置
   ```bash
   # 查看 wrangler.toml
   cat wrangler.toml | grep crons
   ```

2. 查看执行日志
   ```bash
   wrangler tail --format pretty
   ```

3. 手动触发测试
   ```bash
   curl -X POST https://your-worker.workers.dev/run \
     -H "Authorization: Bearer YOUR_API_KEY"
   ```

**解决方案**:
- 检查 Cron 表达式是否正确
- 检查 Worker 是否部署成功
- 检查 Telegram 配置是否正确

#### 9.4.2 数据爬取失败

**症状**: `hasMore: true` 但一直无新数据

**排查步骤**:
1. 检查数据源
   ```bash
   curl "https://datachart.500.com/ssq/history/newinc/history.php?start=25134&end=25183"
   ```

2. 查看错误日志
   ```bash
   wrangler tail | grep ERROR
   ```

3. 检查数据库
   ```bash
   wrangler d1 execute lottery_db --command="SELECT * FROM ssq_lottery ORDER BY id DESC LIMIT 1"
   ```

**解决方案**:
- 数据源变更：更新爬虫逻辑
- 网络问题：重试或更换数据源
- 数据库问题：检查表结构

#### 9.4.3 预测失败

**症状**: 预测接口返回空数组

**排查步骤**:
1. 检查数据量
   ```bash
   curl https://your-worker.workers.dev/stats/ssq
   ```

2. 查看错误日志
   ```bash
   wrangler tail | grep "预测失败"
   ```

3. 测试预测器
   ```bash
   curl "https://your-worker.workers.dev/predict/ssq?count=1&strategies=frequency"
   ```

**解决方案**:
- 数据不足：至少需要 10 期数据
- 策略错误：检查策略名称
- 超时：增加超时时间或减少预测数量

#### 9.4.4 CPU 时间超限

**症状**: Worker 执行失败，提示 CPU 时间超限

**排查步骤**:
1. 查看 CPU 时间
   ```bash
   # Cloudflare Dashboard > Workers > Analytics > CPU Time
   ```

2. 分析慢查询
   ```bash
   wrangler tail | grep "执行时间"
   ```

**解决方案**:
- 减少预测数量：`DEFAULT_PREDICTION_COUNT = "3"`
- 减少策略数量：`DEFAULT_STRATEGIES = "frequency,random"`
- 减少查询数据量：`getAll(type, 50)` 改为 50 条
- 升级到 Paid Plan：CPU 时间限制 50ms

### 9.5 性能优化

#### 9.5.1 优化数据库查询
```javascript
// 添加索引
CREATE INDEX idx_lottery_no ON ssq_lottery(lottery_no);
CREATE INDEX idx_draw_date ON ssq_lottery(draw_date);

// 限制查询数量
const historyData = await db.getAll('ssq', 50);  // 从 100 减少到 50
```

#### 9.5.2 优化预测算法
```javascript
// 减少尝试次数
const maxAttempts = Math.min(count * 10, 100);  // 从 200 减少到 100

// 减少超时时间
const maxTime = 300;  // 从 500ms 减少到 300ms
```

#### 9.5.3 优化并行处理
```javascript
// 改为串行处理（减少 CPU 峰值）
const ssqResult = await processSingleLottery('ssq', env, config);
const dltResult = await processSingleLottery('dlt', env, config);
```

### 9.6 安全管理

#### 9.6.1 API Key 轮换
```bash
# 生成新 Key
NEW_KEY=$(openssl rand -hex 32)

# 更新 KV
wrangler kv:key put --binding=KV_BINDING API_KEY "$NEW_KEY"

# 更新 .env
echo "API_KEY=$NEW_KEY" >> cloudflare-worker/.env
```

#### 9.6.2 访问日志审计
```bash
# 查看访问日志
wrangler tail --format pretty | grep "POST /init"

# 分析异常访问
wrangler tail | grep "401\|403\|500"
```

---


## 扩展开发

### 10.1 添加新彩票类型

#### 步骤 1: 创建爬虫
```javascript
// cloudflare-worker/src/spiders/new_lottery.js
export class NewLotterySpider {
  constructor() {
    this.baseUrl = 'https://datachart.500.com/new_lottery/';
    this.headers = {
      'User-Agent': 'Mozilla/5.0...'
    };
  }
  
  async fetch(startIssue, endIssue) {
    // 实现爬取逻辑
    const url = `${this.baseUrl}?start=${startIssue}&end=${endIssue}`;
    const response = await fetch(url, { headers: this.headers });
    const html = await response.text();
    return this.parseHtml(html);
  }
  
  parseHtml(html) {
    // 实现解析逻辑
    return [];
  }
}
```

#### 步骤 2: 创建预测器
```javascript
// cloudflare-worker/src/predictors/new_lottery.js
export class NewLotteryPredictor {
  constructor(db, options = {}) {
    this.db = db;
    this.strategies = options.strategies || ['frequency'];
  }
  
  async predict(count = 5, strategies = null) {
    // 实现预测逻辑
    const historyData = await this.db.getAll('new_lottery', 100);
    // ... 预测算法
    return predictions;
  }
}
```

#### 步骤 3: 创建数据库表
```sql
-- schema.sql
CREATE TABLE IF NOT EXISTS new_lottery_lottery (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lottery_no TEXT UNIQUE NOT NULL,
  draw_date TEXT NOT NULL,
  -- 添加号码字段
  ball1 INTEGER,
  ball2 INTEGER,
  -- ...
  sorted_code TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_new_lottery_no ON new_lottery_lottery(lottery_no);
CREATE INDEX idx_new_lottery_date ON new_lottery_lottery(draw_date);
```

#### 步骤 4: 注册模块
```javascript
// cloudflare-worker/src/index.js
import { NewLotterySpider } from './spiders/new_lottery.js';
import { NewLotteryPredictor } from './predictors/new_lottery.js';

function getLotteryModules(type) {
  const modules = {
    ssq: { ... },
    dlt: { ... },
    new_lottery: {
      name: '新彩票',
      spider: NewLotterySpider,
      predictor: NewLotteryPredictor,
      startYear: 2020
    }
  };
  return modules[type];
}
```

#### 步骤 5: 测试
```bash
# 初始化数据
curl -X POST https://your-worker.workers.dev/init/new_lottery \
  -H "Authorization: Bearer YOUR_API_KEY"

# 获取预测
curl https://your-worker.workers.dev/predict/new_lottery
```

### 10.2 添加新预测策略

#### 步骤 1: 创建策略类
```javascript
// cloudflare-worker/src/predictors/strategies/ml_strategy.js
import { BaseStrategy } from './base.js';

export class MLStrategy extends BaseStrategy {
  constructor() {
    super('ml', 'ML策略', '基于机器学习的预测');
  }
  
  generateRedBalls(context) {
    // 实现 ML 预测逻辑
    const { historyData, redFrequency } = context;
    
    // 特征工程
    const features = this.extractFeatures(historyData);
    
    // 模型预测
    const predictions = this.mlModel.predict(features);
    
    return predictions.slice(0, 6);
  }
  
  generateBlueBall(context) {
    // 实现蓝球预测
    return Math.floor(Math.random() * 16) + 1;
  }
  
  extractFeatures(historyData) {
    // 提取特征
    return [];
  }
}
```

#### 步骤 2: 注册策略
```javascript
// cloudflare-worker/src/predictors/strategies/index.js
import { MLStrategy } from './ml_strategy.js';

const strategies = {
  frequency: FrequencyStrategy,
  random: RandomStrategy,
  balanced: BalancedStrategy,
  coldHot: ColdHotStrategy,
  ml: MLStrategy  // 新增
};

export function getStrategy(name) {
  const StrategyClass = strategies[name];
  if (!StrategyClass) {
    throw new Error(`未知策略: ${name}`);
  }
  return new StrategyClass();
}
```

#### 步骤 3: 使用新策略
```bash
# 使用 ML 策略预测
curl "https://your-worker.workers.dev/predict/ssq?strategies=ml"

# 组合使用
curl "https://your-worker.workers.dev/predict/ssq?strategies=frequency,ml"
```

### 10.3 添加新数据源

#### 步骤 1: 创建适配器
```javascript
// cloudflare-worker/src/spiders/adapters/new_source.js
export class NewSourceAdapter {
  constructor() {
    this.baseUrl = 'https://new-source.com/api/';
  }
  
  async fetch(type, startIssue, endIssue) {
    const url = `${this.baseUrl}${type}?start=${startIssue}&end=${endIssue}`;
    const response = await fetch(url);
    const data = await response.json();
    return this.transform(data);
  }
  
  transform(data) {
    // 转换为统一格式
    return data.map(item => ({
      lottery_no: item.issue,
      draw_date: item.date,
      red_balls: item.red,
      blue_ball: item.blue
    }));
  }
}
```

#### 步骤 2: 集成到爬虫
```javascript
// cloudflare-worker/src/spiders/ssq.js
import { NewSourceAdapter } from './adapters/new_source.js';

export class SSQSpider {
  constructor() {
    this.sources = [
      { name: '500.com', adapter: this.fetch500 },
      { name: 'NewSource', adapter: new NewSourceAdapter() }
    ];
  }
  
  async fetch(startIssue, endIssue) {
    // 尝试多个数据源
    for (const source of this.sources) {
      try {
        const data = await source.adapter.fetch('ssq', startIssue, endIssue);
        if (data && data.length > 0) {
          console.log(`使用数据源: ${source.name}`);
          return data;
        }
      } catch (error) {
        console.warn(`${source.name} 失败:`, error);
      }
    }
    throw new Error('所有数据源均失败');
  }
}
```

### 10.4 添加新通知渠道

#### 步骤 1: 创建通知类
```javascript
// cloudflare-worker/src/utils/wechat.js
export class WeChatNotifier {
  constructor(corpId, agentId, secret) {
    this.corpId = corpId;
    this.agentId = agentId;
    this.secret = secret;
    this.apiUrl = 'https://qyapi.weixin.qq.com/cgi-bin/';
  }
  
  async sendMessage(text) {
    // 获取 access_token
    const token = await this.getAccessToken();
    
    // 发送消息
    const url = `${this.apiUrl}message/send?access_token=${token}`;
    const response = await fetch(url, {
      method: 'POST',
      body: JSON.stringify({
        touser: '@all',
        msgtype: 'text',
        agentid: this.agentId,
        text: { content: text }
      })
    });
    
    return response.ok;
  }
  
  async getAccessToken() {
    // 实现获取 token 逻辑
    return 'token';
  }
}
```

#### 步骤 2: 集成到通知系统
```javascript
// cloudflare-worker/src/index.js
import { WeChatNotifier } from './utils/wechat.js';

async function sendNotifications(message, config) {
  const notifiers = [];
  
  // Telegram
  if (config.telegramBotToken) {
    notifiers.push(new TelegramBot(...));
  }
  
  // WeChat
  if (config.wechatCorpId) {
    notifiers.push(new WeChatNotifier(...));
  }
  
  // 并行发送
  await Promise.all(
    notifiers.map(notifier => notifier.sendMessage(message))
  );
}
```

### 10.5 开发最佳实践

#### 10.5.1 代码规范
- 使用 ES6+ 语法
- 函数命名：驼峰命名法
- 类命名：帕斯卡命名法
- 常量命名：全大写下划线分隔
- 添加 JSDoc 注释

#### 10.5.2 错误处理
```javascript
// 统一错误处理
try {
  const result = await someOperation();
} catch (error) {
  console.error('操作失败:', error);
  await handleError(env, error);
  throw error;  // 或返回默认值
}
```

#### 10.5.3 日志记录
```javascript
// 关键操作记录日志
console.log('📊 开始爬取:', type);
console.log('✓ 爬取完成:', inserted, '条');
console.error('✗ 爬取失败:', error);
```

#### 10.5.4 性能优化
```javascript
// 并行处理
const [data1, data2] = await Promise.all([
  fetchData1(),
  fetchData2()
]);

// 超时保护
const startTime = Date.now();
if (Date.now() - startTime > maxTime) {
  break;
}

// 限制查询
const data = await db.getAll(type, 100);  // 限制数量
```

---


## 故障排查

### 11.1 常见问题

#### Q1: init.sh 脚本一直循环，不退出

**原因**: jq 无法正确读取布尔值 `hasMore=false`

**解决方案**:
```bash
# 检查脚本中的 jq 命令
grep "hasMore" cloudflare-worker/scripts/init.sh

# 应该使用
hasMore=$(echo "$response" | jq -r 'if .hasMore == null then true else .hasMore end')

# 而不是
hasMore=$(echo "$response" | jq -r '.hasMore // true')  # 错误！
```

#### Q2: Telegram 没有收到通知

**排查步骤**:
1. 测试连接
   ```bash
   curl https://your-worker.workers.dev/test
   ```

2. 检查配置
   ```bash
   wrangler kv:key get --binding=KV_BINDING TELEGRAM_BOT_TOKEN
   wrangler kv:key get --binding=KV_BINDING TELEGRAM_CHAT_ID
   ```

3. 检查发送目标
   ```bash
   # 查看 wrangler.toml
   TELEGRAM_SEND_TO_BOT = "true"
   TELEGRAM_SEND_TO_CHANNEL = "true"
   ```

4. 查看日志
   ```bash
   wrangler tail | grep Telegram
   ```

#### Q3: 预测结果为空

**排查步骤**:
1. 检查数据量
   ```bash
   curl https://your-worker.workers.dev/stats/ssq
   ```

2. 检查策略配置
   ```bash
   wrangler kv:key get --binding=KV_BINDING DEFAULT_STRATEGIES
   ```

3. 测试单个策略
   ```bash
   curl "https://your-worker.workers.dev/predict/ssq?strategies=frequency"
   ```

#### Q4: CPU 时间超限

**症状**: Worker 执行失败，提示 "CPU time limit exceeded"

**解决方案**:
1. 减少预测数量
   ```bash
   wrangler kv:key put --binding=KV_BINDING DEFAULT_PREDICTION_COUNT "3"
   ```

2. 减少策略数量
   ```bash
   wrangler kv:key put --binding=KV_BINDING DEFAULT_STRATEGIES "frequency,random"
   ```

3. 优化代码
   ```javascript
   // 改为串行处理
   const ssqResult = await processSingleLottery('ssq', env, config);
   const dltResult = await processSingleLottery('dlt', env, config);
   ```

4. 升级到 Paid Plan
   ```bash
   # $5/月，CPU 时间限制 50ms
   ```

#### Q5: 数据爬取失败

**排查步骤**:
1. 测试数据源
   ```bash
   curl "https://datachart.500.com/ssq/history/newinc/history.php?start=25134&end=25183"
   ```

2. 检查解析逻辑
   ```bash
   wrangler tail | grep "解析"
   ```

3. 查看错误日志
   ```bash
   wrangler tail | grep ERROR
   ```

### 11.2 错误代码

| 错误代码 | 描述 | 解决方案 |
|---------|------|---------|
| 401 | 认证失败 | 检查 API_KEY |
| 404 | 接口不存在 | 检查 URL 路径 |
| 500 | 服务器错误 | 查看日志，检查代码 |
| 1001 | 数据库错误 | 检查 D1 配置 |
| 1002 | 爬取失败 | 检查数据源 |
| 1003 | 预测失败 | 检查数据量 |
| 1004 | 通知失败 | 检查 Telegram 配置 |

### 11.3 调试技巧

#### 11.3.1 本地调试
```bash
# 使用 wrangler dev
cd cloudflare-worker
wrangler dev

# 访问本地服务
curl http://localhost:8787/latest/ssq
```

#### 11.3.2 远程调试
```bash
# 实时查看日志
wrangler tail --format pretty

# 过滤特定日志
wrangler tail | grep "预测"
```

#### 11.3.3 数据库调试
```bash
# 查询数据
wrangler d1 execute lottery_db --command="SELECT * FROM ssq_lottery LIMIT 10"

# 查看表结构
wrangler d1 execute lottery_db --command="PRAGMA table_info(ssq_lottery)"

# 查看索引
wrangler d1 execute lottery_db --command="PRAGMA index_list(ssq_lottery)"
```

### 11.4 性能分析

#### 11.4.1 查看执行时间
```bash
# Cloudflare Dashboard > Workers > Analytics
# 查看：
# - CPU Time (ms)
# - Duration (ms)
# - Requests
```

#### 11.4.2 分析慢查询
```bash
# 添加时间日志
const startTime = Date.now();
const result = await someOperation();
console.log(`执行时间: ${Date.now() - startTime}ms`);
```

#### 11.4.3 优化建议
- 减少数据库查询次数
- 使用并行处理
- 添加超时保护
- 限制查询数据量
- 优化算法复杂度

---

## 附录

### A. 配置参数说明

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| DEFAULT_STRATEGIES | String | frequency,random,balanced,coldHot | 默认预测策略 |
| DEFAULT_PREDICTION_COUNT | Number | 4 | 默认预测数量 |
| TELEGRAM_BOT_TOKEN | String | - | Telegram Bot Token |
| TELEGRAM_CHAT_ID | String | - | Telegram Chat ID |
| TELEGRAM_CHANNEL_ID | String | - | Telegram 频道 ID |
| TELEGRAM_SEND_TO_BOT | Boolean | false | 是否发送到机器人 |
| TELEGRAM_SEND_TO_CHANNEL | Boolean | true | 是否发送到频道 |
| API_KEY | String | - | API 认证密钥 |

### B. API 接口速查

| 接口 | 方法 | 认证 | 描述 |
|------|------|------|------|
| `/` | GET | ❌ | 首页，接口说明 |
| `/init/{type}` | POST | ✅ | 初始化数据库 |
| `/run` | POST | ✅ | 手动执行任务 |
| `/latest/{type}` | GET | ❌ | 查询最新数据 |
| `/predict/{type}` | GET | ❌ | 获取预测结果 |
| `/stats/{type}` | GET | ❌ | 查看统计信息 |
| `/strategies/{type}` | GET | ❌ | 查看可用策略 |
| `/test` | GET | ❌ | 测试 Telegram |

### C. 数据库 Schema

```sql
-- 双色球
CREATE TABLE ssq_lottery (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lottery_no TEXT UNIQUE NOT NULL,
  draw_date TEXT NOT NULL,
  red1 INTEGER, red2 INTEGER, red3 INTEGER,
  red4 INTEGER, red5 INTEGER, red6 INTEGER,
  blue INTEGER,
  sorted_code TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 大乐透
CREATE TABLE dlt_lottery (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lottery_no TEXT UNIQUE NOT NULL,
  draw_date TEXT NOT NULL,
  front1 INTEGER, front2 INTEGER, front3 INTEGER,
  front4 INTEGER, front5 INTEGER,
  back1 INTEGER, back2 INTEGER,
  sorted_code TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### D. 相关链接

- **项目仓库**: https://github.com/your-repo/lottery-prediction
- **Cloudflare Workers 文档**: https://developers.cloudflare.com/workers/
- **D1 Database 文档**: https://developers.cloudflare.com/d1/
- **KV Storage 文档**: https://developers.cloudflare.com/kv/
- **Telegram Bot API**: https://core.telegram.org/bots/api
- **500.com**: https://www.500.com/

### E. 版本历史

| 版本 | 日期 | 更新内容 |
|------|------|---------|
| v1.0.0 | 2025-11-20 | 首个完整版本发布 |
| - | - | ✅ 双色球、大乐透和七星彩支持 |
| - | - | ✅ 智能增量爬取 |
| - | - | ✅ 多策略预测 |
| - | - | ✅ Telegram 通知 |
| - | - | ✅ RESTful API |
| - | - | ✅ 定时任务 |

---

## 总结

本文档涵盖了彩票预测系统的完整技术细节，包括：

1. **需求清单**: 明确功能和非功能需求
2. **技术架构**: 整体架构和技术选型
3. **模块设计**: 核心模块和接口设计
4. **功能清单**: 已实现和待实现功能
5. **实现思路**: 关键算法和优化策略
6. **部署指南**: 从零到一的部署步骤
7. **测试指南**: 完整的测试用例
8. **运维指南**: 日常监控和故障处理
9. **扩展开发**: 如何添加新功能
10. **故障排查**: 常见问题和解决方案

**适用人群**:
- ✅ 开发者：了解系统架构，进行二次开发
- ✅ 测试人员：按测试用例进行功能测试
- ✅ 运维人员：日常监控和故障处理
- ✅ 项目经理：了解项目全貌和进度

**下一步**:
1. 按部署指南完成部署
2. 运行测试用例验证功能
3. 配置监控和告警
4. 根据需求进行扩展开发

---

**文档维护**: 请在每次重大更新后同步更新本文档

**反馈**: 如有问题或建议，请提交 Issue

**版权**: © 2025 Lottery Prediction Team. All rights reserved.

