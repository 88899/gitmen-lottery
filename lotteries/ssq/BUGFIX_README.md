# Python 版本数据源修复说明

## 修复内容

为 Python 版本的双色球爬虫添加了**自动数据源切换机制**，提高数据获取的稳定性。

## 问题分析

虽然 Python 版本已经有 `fetch_500com_data()` 方法作为备用数据源，但存在以下问题：

1. **没有自动切换**：主要方法（`crawl_all`、`fetch_api_recent`）失败时不会自动切换到备用源
2. **需要手动调用**：用户需要知道并手动调用 `fetch_500com_data()`
3. **缺乏统一接口**：没有统一的获取最新数据的方法

## 新增功能

### 1. 新增方法：`fetch_latest()`

统一的获取最新数据接口，自动切换数据源：

```python
# 获取最新1期数据
data = spider.fetch_latest(count=1)

# 获取最新10期数据
data = spider.fetch_latest(count=10)
```

**工作流程**：
1. 优先使用主数据源（中彩网 API）
2. 如果失败，自动切换到备用数据源（500.com）
3. 如果两个都失败，抛出异常

### 2. 新增方法：`fetch_latest_from_500com()`

专门从 500.com 获取最新数据：

```python
# 获取最近30期数据（500.com 的限制）
data = spider.fetch_latest_from_500com(count=30)
```

**特点**：
- 不需要指定期号范围
- 自动获取最近30期数据
- 自动补全期号（25132 → 2025132）
- 解析 HTML 表格数据

### 3. 改进方法：`crawl_all()`

添加自动切换逻辑：

```python
# 优先使用 API，失败时自动切换到 500.com
data = spider.crawl_all(use_api_first=True)
```

**改进**：
- 主数据源失败时自动尝试备用数据源
- 更详细的日志输出
- 更好的错误处理

### 4. 废弃方法：`fetch_500com_data()`

原有的 `fetch_500com_data(start_issue, end_issue)` 方法已废弃，因为：
- 500.com 的期号范围查询不再可用
- 带参数的请求返回空数据
- 建议使用 `fetch_latest_from_500com()` 替代

## 测试验证

运行测试脚本：

```bash
python lotteries/ssq/test_spider.py
```

测试结果：
```
✅ 主数据源（中彩网 API）正常
✅ 备用数据源（500.com）正常
✅ 自动切换机制正常
✅ 批量爬取正常

总计: 4/4 通过
🎉 所有测试通过！
```

## 使用示例

### 示例 1：获取最新数据（推荐）

```python
from lotteries.ssq.spider import SSQSpider

spider = SSQSpider()

# 自动选择最佳数据源
latest = spider.fetch_latest(count=1)
print(f"最新期号: {latest[0]['lottery_no']}")
print(f"红球: {latest[0]['red_balls']}")
print(f"蓝球: {latest[0]['blue_ball']}")
```

### 示例 2：批量爬取（自动切换）

```python
from lotteries.ssq.spider import SSQSpider

spider = SSQSpider()

# 优先使用 API，失败时自动切换到 500.com
all_data = spider.crawl_all(use_api_first=True)
print(f"共获取 {len(all_data)} 条数据")
```

### 示例 3：强制使用备用数据源

```python
from lotteries.ssq.spider import SSQSpider

spider = SSQSpider()

# 直接使用 500.com（获取最近30期）
backup_data = spider.fetch_latest_from_500com(count=30)
print(f"从备用源获取 {len(backup_data)} 条数据")
```

## 代码变更

### 修改的文件

- `lotteries/ssq/spider.py` - 核心爬虫类

### 新增的文件

- `lotteries/ssq/test_spider.py` - 测试脚本

### 主要变更

1. **新增常量**：
   ```python
   BACKUP_500_URL = "https://datachart.500.com/ssq/history/newinc/history.php"
   ```

2. **新增方法**：
   - `fetch_latest()` - 统一获取最新数据接口
   - `fetch_latest_from_500com()` - 从 500.com 获取数据

3. **改进方法**：
   - `crawl_all()` - 添加自动切换逻辑

4. **废弃方法**：
   - `fetch_500com_data()` - 标记为废弃，建议使用新方法

## 技术细节

### 500.com 数据解析

**HTML 结构**：
```html
<tbody id="tdata">
  <tr>
    <td>25132</td>     <!-- 期号（5位） -->
    <td>04</td>        <!-- 红球1 -->
    <td>08</td>        <!-- 红球2 -->
    ...
    <td>11</td>        <!-- 蓝球 -->
    ...
    <td>2025-11-16</td> <!-- 开奖日期 -->
  </tr>
</tbody>
```

**关键处理**：
1. 期号补全：`25132` → `2025132`
2. 数据验证：确保红球6个、蓝球1个、日期格式正确
3. 排序：红球按升序排列

### 自动切换逻辑

```python
try:
    # 尝试主数据源
    data = fetch_from_main_source()
except Exception as e:
    logger.warning(f"主数据源失败: {e}")
    try:
        # 尝试备用数据源
        data = fetch_from_backup_source()
    except Exception as backup_error:
        logger.error(f"备用数据源也失败: {backup_error}")
        raise Exception("所有数据源均失败")
```

## 注意事项

1. **500.com 限制**：
   - 只能获取最近30期数据
   - 不支持期号范围查询
   - 适合日常更新，不适合首次初始化

2. **首次初始化**：
   - 建议使用主数据源（中彩网 API）
   - 可以获取1000+期历史数据
   - 如果主数据源失败，可以先用备用源获取最近30期

3. **日常更新**：
   - 两个数据源都可以满足需求
   - 自动切换机制保证稳定性

## 与 Cloudflare Worker 版本的对比

| 特性 | Python 版本 | Cloudflare Worker 版本 |
|------|------------|----------------------|
| 主数据源 | ✅ 中彩网 API | ✅ 中彩网 API |
| 备用数据源 | ✅ 500.com | ✅ 500.com |
| 自动切换 | ✅ 已实现 | ✅ 已实现 |
| HTML 解析 | ✅ BeautifulSoup | ✅ 正则表达式 |
| 测试脚本 | ✅ test_spider.py | ✅ test-spider.js |

## 后续优化建议

1. **添加更多数据源**：如彩票官网、其他彩票网站
2. **数据源健康检查**：定期检测数据源可用性
3. **智能选择**：根据历史成功率选择最优数据源
4. **缓存机制**：缓存最近的数据，减少请求次数

## 相关文档

- [spider.py](./spider.py) - 爬虫核心代码
- [test_spider.py](./test_spider.py) - 测试脚本
- [../cloudflare-worker/DATA_SOURCE_FIX.md](../../cloudflare-worker/DATA_SOURCE_FIX.md) - Cloudflare Worker 版本修复说明

---

**修复完成时间**：2025-11-17  
**测试状态**：✅ 所有测试通过
