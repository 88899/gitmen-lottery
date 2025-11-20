# 项目质量保证检查清单

> 本文档记录所有优化经验和检查点，确保代码质量和功能完整性

## 📚 目录

1. [新增彩票类型集成](#新增彩票类型集成)
2. [业务逻辑一致性](#业务逻辑一致性)
3. [代码质量检查](#代码质量检查)
4. [性能优化检查](#性能优化检查)
5. [错误处理检查](#错误处理检查)
6. [文档完整性检查](#文档完整性检查)

---

# 新增彩票类型集成

> 当添加新的彩票类型时，必须检查以下所有位置

## ✅ 核心配置

### 1. core/config.py
- [ ] `SUPPORTED_LOTTERIES` 列表
- [ ] `LOTTERY_NAMES` 字典

## ✅ CLI 命令

### 2. cli/smart_fetch.py
- [ ] `get_lottery_modules()` 函数中添加配置
  - name
  - start_year
  - spider_class
  - database_class
  - predictor_class

### 3. cli/fetch.py
- [ ] 显示最新数据的逻辑（`elif lottery_type == 'xxx':`）
- [ ] 显示预测结果的逻辑（`elif lottery_type == 'xxx':`）

### 4. cli/predict.py
- [ ] 完整的预测逻辑（`elif lottery_type == 'xxx':`）
  - 导入模块
  - 创建数据库连接
  - 获取历史数据
  - 创建预测器
  - 生成预测
  - 显示结果
  - 显示统计
  - 发送 Telegram 通知

### 5. cli/schedule.py
- [ ] `fetch_latest_data()` 函数中添加处理逻辑
- [ ] Telegram 消息格式（`elif result['lottery_type'] == 'xxx':`）
- [ ] 日志说明更新

### 6. lottery.py
- [ ] fetch 命令的默认列表
- [ ] predict 命令的默认列表
- [ ] 帮助文档中的彩票类型列表

## ✅ Telegram 通知

### 7. core/telegram_bot.py
- [ ] `send_prediction()` 方法中添加格式化逻辑（`elif lottery_type == 'xxx':`）
- [ ] `send_daily_report()` 方法（如果需要）

## ✅ Cloudflare Worker

### 8. cloudflare-worker/src/index.js
- [ ] `getLotteryModules()` 函数中添加配置
- [ ] `extractLotteryType()` 函数中添加类型判断
- [ ] `buildPredictionMessage()` 函数中添加格式化逻辑
- [ ] `runDailyTask()` 函数中添加并行处理
- [ ] 所有 API 路由的类型检查数组
  - `/latest` 路由
  - `/predict` 路由
  - `/stats` 路由
  - `/strategies` 路由
- [ ] 首页帮助文档更新

### 9. cloudflare-worker/src/utils/database.js
- [ ] 创建表的 SQL
- [ ] 创建索引的 SQL
- [ ] `insert()` 方法
- [ ] `getLatest()` 方法
- [ ] `getOldest()` 方法
- [ ] `getAll()` 方法
- [ ] `getFrequency()` 方法

### 10. cloudflare-worker/schema.sql
- [ ] 添加表定义

### 11. cloudflare-worker/src/spiders/
- [ ] 创建新的爬虫文件 `xxx.js`

### 12. cloudflare-worker/src/predictors/
- [ ] 创建新的预测器文件 `xxx.js`

## ✅ 文档

### 13. README.md
- [ ] 支持的彩票类型列表
- [ ] 使用示例

### 14. TECHNICAL_DOCUMENTATION.md
- [ ] 彩票类型说明
- [ ] 数据结构文档

### 15. cloudflare-worker/README.md
- [ ] API 接口说明
- [ ] 彩票类型参数说明

### 16. cloudflare-worker/API_USAGE.md
- [ ] 所有接口的类型参数说明

### 17. cloudflare-worker/scripts/init.sh
- [ ] 类型验证逻辑

## ✅ 测试验证

### 18. 功能测试
```bash
# Python 版本
- [ ] python lottery.py fetch xxx --mode latest
- [ ] python lottery.py fetch xxx --mode full
- [ ] python lottery.py predict xxx
- [ ] python lottery.py fetch (包含新类型)
- [ ] python lottery.py predict (包含新类型)
- [ ] python lottery.py schedule (包含新类型)

# Worker 版本
- [ ] POST /init/xxx
- [ ] GET /latest/xxx
- [ ] GET /predict/xxx
- [ ] GET /stats/xxx
- [ ] GET /strategies/xxx
- [ ] GET /latest (包含新类型)
- [ ] GET /predict (包含新类型)
```

### 19. Telegram 测试
- [ ] 单独预测消息格式正确
- [ ] 批量预测包含新类型
- [ ] 定时任务包含新类型

## 📋 快速检查命令

```bash
# 搜索所有提到其他彩票类型但可能遗漏新类型的地方
grep -r "ssq.*dlt.*qxc" --include="*.py" --include="*.js" --exclude-dir=node_modules .

# 搜索所有列举彩票类型的数组
grep -r "\['ssq'" --include="*.py" --include="*.js" --exclude-dir=node_modules .

# 验证配置
python -c "from core.config import SUPPORTED_LOTTERIES, LOTTERY_NAMES; print(SUPPORTED_LOTTERIES); print(list(LOTTERY_NAMES.keys()))"

# 验证模块
python -c "from cli.smart_fetch import get_lottery_modules; [print(f'{t}: {get_lottery_modules(t)[\"name\"]}') for t in ['ssq', 'dlt', 'qxc', 'qlc']]"
```

---

# 业务逻辑一致性

> 确保所有彩票类型遵循相同的业务逻辑，只有数据结构不同

## ✅ 核心原则

**开闭原则**: 对扩展开放，对修改封闭
- 新增彩票类型不应修改核心业务逻辑
- 只有数据结构可以不同
- 所有业务流程必须保持一致

## ✅ 必须一致的业务逻辑

### 1. 期号处理
- [ ] 期号格式统一：7位数字（如 2025001）
- [ ] 5位期号自动补全为7位（如 25001 → 2025001）
- [ ] 期号解析逻辑一致（年份 + 期号）

### 2. 跨年逻辑
- [ ] 跨年判断条件统一：`next_issue > 200`
- [ ] 跨年后期号计算一致：`下一年001`
- [ ] 同年期号计算一致：`当年下一期`

### 3. 爬取逻辑

#### Python 版本
- [ ] 增量爬取：从最新期号+1开始
- [ ] 全量爬取：按年份查找缺失，逐年推进
- [ ] 不是逐年检查和跳过，而是查找缺失年份
- [ ] 一次爬取整年数据（001-200）

#### Worker 版本
- [ ] 批量爬取：每批50条
- [ ] 自动跨年：无数据时自动跨年重试
- [ ] 批次推进：基于最新期号计算下一批次

### 4. 错误处理
- [ ] 网络错误：使用 `handle_network_error()`
- [ ] 解析错误：使用 `handle_parse_error()`
- [ ] 统一的错误日志格式
- [ ] 统一的 Telegram 错误通知

### 5. 数据库操作
- [ ] 插入逻辑：自动去重（基于 lottery_no）
- [ ] 查询逻辑：按 draw_date 和 lottery_no 排序
- [ ] 统计逻辑：使用相同的频率计算方法

### 6. Telegram 通知
- [ ] 消息格式统一（只有号码显示不同）
- [ ] 发送逻辑统一
- [ ] 错误通知统一

## ✅ 验证命令

```bash
# 对比不同彩票类型的爬虫实现
diff lotteries/ssq/spider.py lotteries/qlc/spider.py

# 检查业务逻辑关键字
grep -n "next_issue > 200" cli/smart_fetch.py
grep -n "handle_network_error" lotteries/*/spider.py
grep -n "handle_parse_error" lotteries/*/spider.py
```

## 🎓 经验教训

### 会话 #3: 全量爬取逻辑被破坏
**问题**: Review 时误将智能批次推进改成了逐年检查
**教训**: 
- 不要轻易修改核心业务逻辑
- Review 时要区分"过程文档"和"核心代码"
- 修改前要充分理解原设计意图

### 会话 #4: 业务逻辑一致性
**问题**: 担心七星彩和七乐彩的业务逻辑与双色球和大乐透不一致
**教训**:
- 新增彩票类型必须遵循现有业务逻辑
- 只有数据结构可以不同
- 通过对比原始 commit 验证一致性

---

# 代码质量检查

> 确保代码质量和可维护性

## ✅ 语法和格式

### 1. Python 代码
```bash
# 语法检查
python -m py_compile file.py

# 诊断检查（使用 IDE）
# 检查所有 Python 文件是否有语法、类型、lint 错误
```

### 2. JavaScript 代码
```bash
# 语法检查
node --check file.js

# 或使用 wrangler
cd cloudflare-worker
wrangler dev --test
```

## ✅ 模块完整性

### 1. Python 模块
- [ ] `__init__.py` 文件存在
- [ ] 正确导出所有公共类和函数
- [ ] 模块可以正常导入

```bash
# 验证模块导入
python -c "from lotteries.xxx import XXXSpider, XXXPredictor, XXXDatabase"
```

### 2. Worker 模块
- [ ] 所有导入路径正确
- [ ] export/import 语法正确
- [ ] 模块依赖关系清晰

## ✅ 命名规范

### 1. 文件命名
- [ ] Python: 小写+下划线 (`spider.py`, `database.py`)
- [ ] JavaScript: 小写+下划线 (`ssq.js`, `database.js`)
- [ ] 配置文件: 大写+下划线 (`README.md`, `API_USAGE.md`)

### 2. 变量命名
- [ ] Python: 小写+下划线 (`lottery_type`, `draw_date`)
- [ ] JavaScript: 驼峰命名 (`lotteryType`, `drawDate`)
- [ ] 常量: 大写+下划线 (`BASE_URL`, `BATCH_SIZE`)

### 3. 函数命名
- [ ] 动词开头，描述清晰
- [ ] Python: `fetch_data()`, `get_latest()`
- [ ] JavaScript: `fetchData()`, `getLatest()`

## ✅ 注释和文档字符串

### 1. Python
- [ ] 所有模块有 docstring
- [ ] 所有类有 docstring
- [ ] 所有公共函数有 docstring
- [ ] 复杂逻辑有行内注释

### 2. JavaScript
- [ ] 所有函数有 JSDoc 注释
- [ ] 复杂逻辑有行内注释
- [ ] API 接口有详细说明

---

# 性能优化检查

> 确保系统性能和资源使用合理

## ✅ 数据库优化

### 1. 索引
- [ ] lottery_no 有唯一索引
- [ ] draw_date 有普通索引
- [ ] sorted_code 有普通索引（用于去重）

### 2. 查询优化
- [ ] 使用 LIMIT 限制结果数量
- [ ] 避免 SELECT *，只查询需要的字段
- [ ] 使用批量插入而不是逐条插入

### 3. 连接管理
- [ ] 使用完毕后关闭连接
- [ ] 使用连接池（如果需要）
- [ ] 避免长时间持有连接

## ✅ 爬虫优化

### 1. 请求频率
- [ ] 批量爬取之间有延迟（避免被封）
- [ ] 使用合理的 timeout
- [ ] 实现重试机制

### 2. 数据处理
- [ ] 按批次处理数据
- [ ] 避免一次性加载大量数据到内存
- [ ] 使用生成器处理大数据集

### 3. 缓存策略
- [ ] Worker: 使用 Cloudflare 缓存（5分钟）
- [ ] 避免重复爬取相同数据
- [ ] 使用数据库去重

## ✅ Worker 优化

### 1. 执行时间
- [ ] 单个彩票类型处理时间 < 3秒
- [ ] 全局任务执行时间 < 8秒（免费计划）
- [ ] 超时时跳过 Telegram 通知

### 2. 并行处理
- [ ] 使用 Promise.all() 并行处理多个彩票类型
- [ ] 避免串行等待
- [ ] 合理使用 waitUntil()

### 3. 资源使用
- [ ] 限制查询结果数量（最近100条）
- [ ] 批量处理大小合理（50条/批）
- [ ] 避免内存泄漏

---

# 错误处理检查

> 确保系统健壮性和可恢复性

## ✅ 异常捕获

### 1. 网络错误
- [ ] 捕获所有网络请求异常
- [ ] 使用 `handle_network_error()` 统一处理
- [ ] 记录错误日志
- [ ] 发送 Telegram 通知

### 2. 解析错误
- [ ] 捕获 HTML 解析异常
- [ ] 使用 `handle_parse_error()` 统一处理
- [ ] 记录原始数据（用于调试）
- [ ] 继续处理其他数据

### 3. 数据库错误
- [ ] 捕获连接错误
- [ ] 捕获查询错误
- [ ] 捕获插入错误
- [ ] 事务回滚（如果需要）

## ✅ 错误恢复

### 1. 重试机制
- [ ] 网络请求失败自动重试
- [ ] 重试次数限制（避免无限循环）
- [ ] 指数退避策略

### 2. 降级策略
- [ ] 主数据源失败时使用备用数据源
- [ ] 部分失败不影响整体流程
- [ ] 返回部分结果而不是完全失败

### 3. 状态恢复
- [ ] 记录处理进度
- [ ] 支持断点续传
- [ ] 避免重复处理

## ✅ 日志记录

### 1. 日志级别
- [ ] DEBUG: 详细调试信息
- [ ] INFO: 正常流程信息
- [ ] WARNING: 警告信息
- [ ] ERROR: 错误信息

### 2. 日志内容
- [ ] 包含时间戳
- [ ] 包含模块名称
- [ ] 包含关键参数
- [ ] 包含错误堆栈（ERROR 级别）

### 3. 日志管理
- [ ] 按彩票类型分目录
- [ ] 按日期轮转
- [ ] 定期清理旧日志

---

# 文档完整性检查

> 确保文档清晰、完整、最新

## ✅ 核心文档

### 1. README.md
- [ ] 项目简介清晰
- [ ] 功能列表完整
- [ ] 安装步骤详细
- [ ] 使用示例准确
- [ ] 支持的彩票类型列表最新

### 2. TECHNICAL_DOCUMENTATION.md
- [ ] 架构说明清晰
- [ ] 模块说明完整
- [ ] 数据结构文档准确
- [ ] API 接口文档详细

### 3. CHANGELOG.md
- [ ] 记录所有重要变更
- [ ] 按版本组织
- [ ] 包含日期和作者
- [ ] 说明变更原因

## ✅ 模块文档

### 1. 每个彩票类型的 README.md
- [ ] 彩票规则说明
- [ ] 数据结构说明
- [ ] 使用示例
- [ ] 注意事项

### 2. Worker 文档
- [ ] API_USAGE.md 完整
- [ ] 所有接口都有说明
- [ ] 参数说明清晰
- [ ] 示例代码准确

### 3. 架构文档
- [ ] docs/ARCHITECTURE.md 最新
- [ ] 系统架构图清晰
- [ ] 模块关系说明
- [ ] 数据流程说明

## ✅ 代码注释

### 1. 模块级注释
- [ ] 说明模块用途
- [ ] 说明主要功能
- [ ] 说明使用方法

### 2. 类级注释
- [ ] 说明类的职责
- [ ] 说明主要属性
- [ ] 说明主要方法

### 3. 函数级注释
- [ ] 说明函数用途
- [ ] 说明参数含义
- [ ] 说明返回值
- [ ] 说明异常情况

## ✅ 过程文档清理

### 1. 识别过程文档
- [ ] TODO.md（任务完成后删除）
- [ ] COMPLETION_SUMMARY.md（集成后删除）
- [ ] REVIEW_SUMMARY.md（Review 后删除）
- [ ] 各种临时测试文件

### 2. 保留核心文档
- [ ] README.md
- [ ] TECHNICAL_DOCUMENTATION.md
- [ ] CHANGELOG.md
- [ ] API_USAGE.md
- [ ] ARCHITECTURE.md

### 3. 会话历史
- [ ] SESSION_HISTORY.md（不提交到 Git）
- [ ] 记录重要决策和经验
- [ ] 定期整理和归档

---

# 自动化检查脚本

## ✅ 快速验证脚本

创建 `scripts/quality_check.sh`:

```bash
#!/bin/bash

echo "🔍 开始质量检查..."

# 1. 语法检查
echo "\n📝 检查 Python 语法..."
find . -name "*.py" -not -path "./venv/*" -exec python -m py_compile {} \;

# 2. 配置验证
echo "\n⚙️  验证配置..."
python -c "
from core.config import SUPPORTED_LOTTERIES, LOTTERY_NAMES
assert len(SUPPORTED_LOTTERIES) == len(LOTTERY_NAMES)
print(f'✓ 支持的彩票类型: {SUPPORTED_LOTTERIES}')
"

# 3. 模块验证
echo "\n📦 验证模块..."
for lottery in ssq dlt qxc qlc; do
    python -c "from cli.smart_fetch import get_lottery_modules; print(f'✓ $lottery: {get_lottery_modules(\"$lottery\")[\"name\"]}')"
done

# 4. 搜索遗漏
echo "\n🔎 搜索可能的遗漏..."
echo "检查是否所有提到 ssq, dlt, qxc 的地方都包含了 qlc..."
grep -r "ssq.*dlt.*qxc" --include="*.py" --include="*.js" --exclude-dir=node_modules . | grep -v "qlc" | grep -v ".md" || echo "✓ 未发现遗漏"

# 5. 文档检查
echo "\n📚 检查文档完整性..."
for file in README.md TECHNICAL_DOCUMENTATION.md CHANGELOG.md; do
    if [ -f "$file" ]; then
        echo "✓ $file 存在"
    else
        echo "✗ $file 缺失"
    fi
done

echo "\n✅ 质量检查完成！"
```

## ✅ 集成检查脚本

创建 `scripts/integration_check.sh`:

```bash
#!/bin/bash

LOTTERY_TYPE=$1

if [ -z "$LOTTERY_TYPE" ]; then
    echo "用法: $0 <lottery_type>"
    echo "示例: $0 qlc"
    exit 1
fi

echo "🔍 检查 $LOTTERY_TYPE 的集成完整性..."

# 检查所有关键位置
LOCATIONS=(
    "core/config.py:SUPPORTED_LOTTERIES"
    "core/config.py:LOTTERY_NAMES"
    "cli/smart_fetch.py:get_lottery_modules"
    "cli/fetch.py:elif lottery_type"
    "cli/predict.py:elif lottery_type"
    "cli/schedule.py:fetch_and_predict_single"
    "core/telegram_bot.py:send_prediction"
    "lottery.py:lotteries ="
)

for location in "${LOCATIONS[@]}"; do
    file="${location%%:*}"
    keyword="${location##*:}"
    
    if grep -q "$LOTTERY_TYPE" "$file"; then
        echo "✓ $file 包含 $LOTTERY_TYPE"
    else
        echo "✗ $file 缺少 $LOTTERY_TYPE"
    fi
done

echo "\n✅ 集成检查完成！"
```

---

# 🎓 经验教训总结

## 会话 #1: 七乐彩系统完整实现
**教训**: 
- 系统性检查的重要性
- 不能只实现核心功能，要检查所有相关位置
- 使用 grep 搜索确保没有遗漏

## 会话 #2: 项目全面 Review 和清理
**教训**:
- 定期清理过程文档
- 保持配置一致性
- 区分核心文档和过程文档

## 会话 #3: 修复全量爬取逻辑
**教训**:
- 不要轻易修改核心业务逻辑
- Review 时要理解原设计意图
- 修改后必须测试验证

## 会话 #4: 确保业务逻辑一致性
**教训**:
- 新增功能必须遵循现有模式
- 只有数据结构可以不同
- 主动查缺补漏，不等用户提醒

---

# 📌 使用指南

## 新增彩票类型时

1. **开始前**: 阅读"新增彩票类型集成"部分
2. **实现中**: 逐项检查清单
3. **完成后**: 运行自动化检查脚本
4. **测试**: 执行完整的功能测试
5. **文档**: 更新相关文档

## 修改核心逻辑时

1. **理解**: 充分理解原设计意图
2. **对比**: 对比其他彩票类型的实现
3. **验证**: 确保业务逻辑一致性
4. **测试**: 全面测试所有彩票类型

## 定期维护

1. **每周**: 运行质量检查脚本
2. **每月**: Review 文档完整性
3. **每季度**: 清理过程文档
4. **每次发布**: 更新 CHANGELOG.md

---

**文档创建**: 2025-11-20  
**最后更新**: 2025-11-20  
**维护者**: 项目团队


---

# 项目清理和维护检查

> 从会话历史中提取的实际经验

## ✅ 过程文档清理（会话 #2）

### 识别过程文档
- [ ] 检查根目录是否有临时文档
  - `*_CHECKLIST.md`（任务完成后）
  - `*_SUMMARY.md`（集成后）
  - `*_REPORT.md`（Review 后）
  - `test_*.py`（临时测试文件）

- [ ] 检查 cloudflare-worker/ 目录
  - `*_COMPLETION_SUMMARY.md`
  - `*_FINAL_REPORT.md`
  - `*_VERIFICATION_REPORT.md`
  - `*_TEST_CHECKLIST.md`
  - `*IntegrationStatus.md`

- [ ] 检查 lotteries/*/  目录
  - `COMPLETION_SUMMARY.md`
  - `TODO.md`（任务完成后）
  - `REVIEW_SUMMARY.md`

### 保留核心文档
- [ ] 项目级文档完整
  - `README.md`
  - `TECHNICAL_DOCUMENTATION.md`
  - `CHANGELOG.md`
  - `DISCLAIMER.md`
  - `SESSION_HISTORY.md`（不提交到 Git）

- [ ] 每个彩票类型有 README.md
- [ ] Worker 文档完整（README.md, API_USAGE.md）
- [ ] 架构文档完整（docs/ARCHITECTURE.md）

### 清理命令
```bash
# 查找可能的过程文档
find . -name "*_CHECKLIST.md" -o -name "*_SUMMARY.md" -o -name "*_REPORT.md" | grep -v scripts/

# 查找临时测试文件
find . -name "test_*.py" -not -path "./tests/*"
```

## ✅ 配置一致性检查（会话 #2）

### 配置文件检查
- [ ] `core/config.py` 中的 `SUPPORTED_LOTTERIES` 只包含已实现的类型
- [ ] `LOTTERY_NAMES` 与 `SUPPORTED_LOTTERIES` 一致
- [ ] `lottery.py` 帮助文档与实际支持的类型一致
- [ ] Worker 版本的类型列表与 Python 版本一致

### 验证命令
```bash
# 检查配置一致性
python -c "
from core.config import SUPPORTED_LOTTERIES, LOTTERY_NAMES
assert set(SUPPORTED_LOTTERIES) == set(LOTTERY_NAMES.keys())
print('✓ 配置一致')
"
```

## ✅ 核心逻辑保护（会话 #3）

### 全量爬取逻辑检查
- [ ] **不是**逐年检查和跳过
- [ ] **是**查找缺失年份并爬取
- [ ] 使用 while 循环，不是 for 循环遍历所有年份
- [ ] 一次爬取整年数据（001-200）
- [ ] 无缺失年份时停止，不打印"跳过"

### Python vs Worker 逻辑区分
- [ ] Python: 按年份爬取（001-200）
- [ ] Worker: 按批次爬取（50条/批）
- [ ] 不要混淆两种逻辑

### 验证方法
```bash
# 测试全量爬取（空数据库）
python lottery.py fetch qlc --mode full

# 应该看到：
# ✓ 批次 1: 从起始年份开始
# ✓ 批次 2: 继续当年
# ✓ 批次 N: 跨年到下一年
# ✗ 不应该看到: "XX年数据已存在，跳过"
```

## ✅ 完整性检查（会话 #1, #4）

### 系统性搜索
- [ ] 搜索所有提到其他彩票类型的地方
  ```bash
  grep -r "ssq.*dlt.*qxc" --include="*.py" --include="*.js" | grep -v "qlc"
  ```

- [ ] 检查所有列举彩票类型的数组
  ```bash
  grep -r "\['ssq'" --include="*.py" --include="*.js"
  ```

- [ ] 检查所有 if/elif 分支
  ```bash
  grep -r "lottery_type == 'ssq'" --include="*.py"
  grep -r "lotteryType === 'ssq'" --include="*.js"
  ```

### 功能对等性检查
- [ ] 所有彩票类型有相同的命令支持
  - fetch --mode latest
  - fetch --mode full
  - predict
  - schedule

- [ ] 所有彩票类型有相同的 API 支持
  - /init/{type}
  - /latest/{type}
  - /predict/{type}
  - /stats/{type}
  - /strategies/{type}

## ✅ Telegram 消息完整性（会话 #4）

### 检查所有彩票类型的消息格式
- [ ] `core/telegram_bot.py` 的 `send_prediction()` 方法
  - 每个彩票类型有完整的 elif 分支
  - 不要让新类型走到 else 分支
  - 消息格式与其他类型一致

- [ ] `cli/schedule.py` 的消息构建逻辑
  - 每个彩票类型有完整的 elif 分支
  - 格式化逻辑正确

### 测试方法
```bash
# 测试单个彩票类型
python lottery.py predict qlc

# 测试所有类型
python lottery.py predict

# 检查 Telegram 收到的消息是否完整
```

## ✅ Review 时的注意事项（会话 #3）

### 区分文档和代码
- [ ] 清理文档 ≠ 修改核心逻辑
- [ ] 只清理过程文档，不修改核心代码
- [ ] 修改核心逻辑前要充分理解原设计

### Review 检查清单
- [ ] 功能完整性检查
- [ ] 代码质量检查
- [ ] 文档完整性检查
- [ ] **不要**修改核心业务逻辑
- [ ] **不要**"优化"已经工作正常的代码

### 修改核心逻辑的流程
1. 充分理解原设计意图
2. 对比其他彩票类型的实现
3. 确认修改的必要性
4. 修改后全面测试
5. 记录修改原因

## ✅ 主动检查习惯（会话 #4, #5）

### 完成功能后的自查
- [ ] 运行 `bash scripts/quality_check.sh`
- [ ] 运行 `bash scripts/integration_check.sh <type>`
- [ ] 检查所有测试是否通过
- [ ] 不等用户提醒，主动发现问题

### 提交前检查
- [ ] 所有语法检查通过
- [ ] 所有功能测试通过
- [ ] 文档已更新
- [ ] 过程文档已清理
- [ ] SESSION_HISTORY.md 已更新

### 定期维护
- [ ] 每周运行质量检查
- [ ] 每月清理过程文档
- [ ] 每季度 Review 检查清单
- [ ] 发现新问题时更新检查清单

## 🎓 经验教训总结

### 会话 #1: 系统性检查
**教训**: 不能只实现核心功能，要检查所有相关位置
**检查项**:
- [ ] 使用 grep 搜索所有提到其他类型的地方
- [ ] 检查所有 if/elif 分支
- [ ] 检查所有数组和列表
- [ ] 检查所有文档

### 会话 #2: 定期清理
**教训**: 过程文档会快速累积，影响项目整洁度
**检查项**:
- [ ] 任务完成后立即清理过程文档
- [ ] 只保留核心文档
- [ ] 定期检查配置一致性

### 会话 #3: 保护核心逻辑
**教训**: Review 时可能误改核心逻辑
**检查项**:
- [ ] 修改前理解原设计
- [ ] 区分文档清理和代码修改
- [ ] 修改后全面测试

### 会话 #4: 业务逻辑一致性
**教训**: 新增功能必须遵循现有模式
**检查项**:
- [ ] 对比原始实现（如 commit 4a92739）
- [ ] 确保业务逻辑完全一致
- [ ] 只有数据结构可以不同

### 会话 #5: 主动性
**教训**: 不要等用户提醒，要主动查缺补漏
**检查项**:
- [ ] 完成后主动运行检查脚本
- [ ] 主动搜索可能的遗漏
- [ ] 主动测试所有功能

---

# 🔄 检查清单维护流程

## 更新检查清单

### 1. 发现新问题时
```bash
# 1. 记录到 SESSION_HISTORY.md
# 2. 提取检查点
# 3. 添加到本文档
# 4. 更新检查脚本
```

### 2. 完成新功能时
```bash
# 1. 运行检查脚本
bash scripts/quality_check.sh
bash scripts/integration_check.sh <type>

# 2. 记录遗漏的检查项
# 3. 更新检查清单
# 4. 更新检查脚本
```

### 3. 定期 Review
```bash
# 每月一次
# 1. Review SESSION_HISTORY.md
# 2. 提取新的经验教训
# 3. 更新检查清单
# 4. 优化检查脚本
```

## 检查清单版本控制

- **版本**: 1.0
- **创建日期**: 2025-11-20
- **最后更新**: 2025-11-20
- **更新记录**:
  - v1.0 (2025-11-20): 初始版本，包含4个会话的经验

---

**维护者**: 项目团队  
**更新频率**: 每次发现新问题时更新
