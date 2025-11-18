"""
大乐透（DLT）配置
"""

# 彩票规则
FRONT_BALL_MIN = 1  # 前区最小号码
FRONT_BALL_MAX = 35  # 前区最大号码
FRONT_BALL_COUNT = 5  # 前区号码数量

BACK_BALL_MIN = 1  # 后区最小号码
BACK_BALL_MAX = 12  # 后区最大号码
BACK_BALL_COUNT = 2  # 后区号码数量

# 数据源
DATA_SOURCE_500COM = "https://datachart.500.com/dlt/history/newinc/history.php"
DATA_SOURCE_ZHCW = "https://www.zhcw.com/kjxx/dlt/"

# 开奖时间
DRAW_DAYS = ["周一", "周三", "周六"]
DRAW_TIME = "20:30"

# 历史数据
START_YEAR = 2007  # 大乐透从2007年开始
