# 七星彩 (QXC) 模块

七星彩预测和数据管理模块。

## 规则

- **号码**: 7个位置，每个位置 0-9
- **开奖**: 每周二、五开奖
- **开始年份**: 2004年

## 模块结构

```
qxc/
├── __init__.py          # 模块入口
├── config.py            # 配置
├── spider.py            # 爬虫（从 500.com 获取数据）
├── database.py          # 数据库操作
├── predictor.py         # 预测引擎
├── strategies/          # 预测策略
│   ├── __init__.py
│   ├── base.py         # 策略基类
│   ├── frequency.py    # 频率策略
│   ├── random.py       # 随机策略
│   ├── balanced.py     # 均衡策略
│   └── cold_hot.py     # 冷热号策略
└── README.md
```

## 使用示例

### 1. 爬取数据

```python
from lotteries.qxc import QXCSpider

spider = QXCSpider()

# 获取最新数据
latest_data = spider.fetch_latest(count=10)

# 按期号范围获取
data = spider.fetch_by_range('2004001', '2025133')
```

### 2. 数据库操作

```python
from lotteries.qxc import QXCDatabase

db_config = {
    'host': 'localhost',
    'port': 3306,
    'user': 'root',
    'password': 'password',
    'database': 'lottery_db'
}

db = QXCDatabase(db_config)
db.connect()
db.create_table()

# 插入数据
db.insert_lottery_data(data)

# 获取最新数据
latest = db.get_latest_lottery()
```

### 3. 预测

```python
from lotteries.qxc import QXCPredictor

# 获取历史数据
history_data = db.get_all_lottery_data()

# 创建预测器
predictor = QXCPredictor(history_data)

# 生成预测（使用默认策略）
predictions = predictor.predict(count=5)

# 使用多个策略
predictions = predictor.predict(
    count=10,
    strategies=['frequency', 'balanced', 'coldHot']
)

# 查看可用策略
strategies = QXCPredictor.get_available_strategies()
```

## 预测策略

### 1. 频率策略 (frequency)
基于每个位置的历史出现频率选择号码。

### 2. 随机策略 (random)
完全随机选择号码，不考虑历史数据。

### 3. 均衡策略 (balanced)
大小号均衡分布（0-4为小号，5-9为大号）。

### 4. 冷热号策略 (coldHot)
结合冷号（低频）和热号（高频）。

## 数据格式

```python
{
    'lottery_no': '2025133',
    'draw_date': '2025-11-18',
    'numbers': [2, 4, 7, 9, 1, 3, 4]
}
```

## 预测结果格式

```python
{
    'rank': 1,
    'numbers': [1, 2, 3, 4, 5, 6, 7],
    'strategy': 'frequency',
    'strategy_name': '频率策略',
    'prediction_time': '2025-11-20T10:30:00'
}
```
