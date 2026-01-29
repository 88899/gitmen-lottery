# Web 服务 - FastAPI

## 功能

- 历史记录查询页面
- 历史记录查询 API
- 预测 API
- 统计信息 API

## 安装依赖

```bash
pip install -r requirements.txt
```

## 启动服务

```bash
# 方式1：直接运行
python web/main.py

# 方式2：使用 uvicorn
uvicorn web.main:app --reload --host 0.0.0.0 --port 8000
```

## API 文档

启动后访问：
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## 接口列表

### 页面
- `GET /history` - 历史记录查询页面

### API
- `GET /api/history/{type}` - 历史记录查询
  - 参数：page, limit, lottery_no, draw_date, numbers
  
- `GET /predict/{type}` - 预测
  - 参数：count, strategies
  
- `GET /latest/{type}` - 最新开奖数据

- `GET /stats/{type}` - 统计信息

### 彩票类型
- `ssq` - 双色球
- `dlt` - 大乐透
- `qxc` - 七星彩
- `qlc` - 七乐彩

## 示例

```bash
# 查询双色球历史记录
curl "http://localhost:8000/api/history/ssq?page=1&limit=10"

# 预测双色球
curl "http://localhost:8000/predict/ssq?count=5"

# 获取双色球最新数据
curl "http://localhost:8000/latest/ssq"

# 获取双色球统计信息
curl "http://localhost:8000/stats/ssq"
```
