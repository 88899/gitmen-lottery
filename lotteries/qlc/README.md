# 七乐彩预测系统

## 概述

七乐彩（QLC）是中国福利彩票的一种玩法，从 1-30 中选择 7 个基本号码，再从剩余号码中选择 1 个特别号码。

## 规则

- **基本号码**: 从 1-30 中选择 7 个不重复的号码
- **特别号码**: 从剩余 23 个号码中选择 1 个号码
- **开奖频率**: 每周三次（周一、周三、周五）
- **起始年份**: 2007 年

## 实现状态

### ✅ Python 版本（已完成）

#### 核心模块
- `spider.py` - 数据爬虫（从 500.com 获取数据）
- `database.py` - 数据库操作（SQLite）
- `predictor.py` - 预测引擎
- `statistics.py` - 统计分析

#### 预测策略
1. **频率策略** (`frequency`) - 基于历史出现频率
2. **随机策略** (`random`) - 完全随机生成
3. **均衡策略** (`balanced`) - 大小号均衡分布
4. **冷热号策略** (`cold_hot`) - 结合冷热号分析

#### CLI 命令
```bash
# 爬取最新数据
python lottery.py fetch qlc --mode latest

# 爬取全量数据
python lottery.py fetch qlc --mode full

# 生成预测
python lottery.py predict qlc

# 定时任务（包含七乐彩）
python lottery.py schedule
```

### ✅ Cloudflare Worker 版本（已完成）

#### 核心模块
- `src/spiders/qlc.js` - 数据爬虫
- `src/predictors/qlc.js` - 预测引擎
- `src/utils/database.js` - D1 数据库操作（已添加七乐彩支持）

#### API 接口
```bash
# 初始化数据
POST /init/qlc

# 查询最新数据
GET /latest/qlc

# 获取预测
GET /predict/qlc?count=5&strategies=frequency,balanced

# 查看统计
GET /stats/qlc

# 查看策略
GET /strategies/qlc
```

## 数据结构

### 数据库表结构
```sql
CREATE TABLE qlc_lottery (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lottery_no TEXT UNIQUE NOT NULL,      -- 期号（如 2025132）
    draw_date TEXT NOT NULL,              -- 开奖日期
    basic1 TEXT NOT NULL,                 -- 基本号 1
    basic2 TEXT NOT NULL,                 -- 基本号 2
    basic3 TEXT NOT NULL,                 -- 基本号 3
    basic4 TEXT NOT NULL,                 -- 基本号 4
    basic5 TEXT NOT NULL,                 -- 基本号 5
    basic6 TEXT NOT NULL,                 -- 基本号 6
    basic7 TEXT NOT NULL,                 -- 基本号 7
    special TEXT NOT NULL,                -- 特别号
    sorted_code TEXT NOT NULL,            -- 排序后的号码组合
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);
```

### Python 数据格式
```python
{
    'lottery_no': '2025132',
    'draw_date': '2025-11-19',
    'basic_balls': [4, 9, 15, 20, 23, 25, 27],
    'special_ball': 21
}
```

### JavaScript 数据格式
```javascript
{
    lottery_no: '2025132',
    draw_date: '2025-11-19',
    basic_balls: [4, 9, 15, 20, 23, 25, 27],
    special_ball: 21
}
```

## 预测示例

```
🔮 七乐彩预测

组合 1: [频率策略]
🔴 基本号: 03 09 15 19 20 23 25
🔵 特别号: 13

组合 2: [频率策略]
🔴 基本号: 03 09 15 19 20 23 25
🔵 特别号: 07

组合 3: [均衡策略]
🔴 基本号: 02 08 14 18 22 26 29
🔵 特别号: 11

━━━━━━━━━━━━━━━
⚠️ 仅供参考，理性购彩
```

## 测试结果

### Python 版本测试
```bash
✅ 爬取测试: 成功获取 30 条数据
✅ 入库测试: 新增 30 条，重复 0 条
✅ 预测测试: 生成 5 组预测
✅ CLI 测试: 所有命令正常工作
```

### Worker 版本测试
```bash
✅ 数据库表: 已创建
✅ 爬虫模块: 已实现
✅ 预测模块: 已实现
✅ API 集成: 已完成
```

## 系统集成

七乐彩已完全集成到系统中：

### Python 系统
- ✅ 核心配置 (`core/config.py`)
- ✅ 智能爬取 (`cli/smart_fetch.py`)
- ✅ CLI 命令 (`cli/fetch.py`, `cli/predict.py`)
- ✅ 定时任务 (`cli/schedule.py`)
- ✅ Telegram 通知 (`core/telegram_bot.py`)
- ✅ 主入口 (`lottery.py`)

### Cloudflare Worker
- ✅ 数据库表 (`schema.sql`)
- ✅ 数据库操作 (`src/utils/database.js`)
- ✅ 爬虫 (`src/spiders/qlc.js`)
- ✅ 预测器 (`src/predictors/qlc.js`)
- ✅ 主路由 (`src/index.js`)
- ✅ 定时任务集成

## 数据源

- **主数据源**: 500.com (https://datachart.500.com/qlc/history/newinc/history.php)
- **数据格式**: HTML 表格
- **更新频率**: 每周三次

## 注意事项

1. **号码范围**: 基本号 1-30，特别号从剩余号码中选择
2. **去重逻辑**: 基本号不能重复，特别号不能与基本号重复
3. **数据验证**: 确保每期有 7 个基本号 + 1 个特别号
4. **历史去重**: 预测时避免生成历史中奖组合

## 开发者

- 实现日期: 2025-11-20
- 版本: 1.0.0
- 状态: ✅ 生产就绪
