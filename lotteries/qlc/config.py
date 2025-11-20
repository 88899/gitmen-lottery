"""
七乐彩配置
"""

# 七乐彩规则
QLC_CONFIG = {
    'name': '七乐彩',
    'code': 'qlc',
    'basic_count': 7,  # 7个基本号
    'basic_range': (1, 30),  # 基本号范围 1-30
    'special_count': 1,  # 1个特别号
    'start_year': 2007,  # 开始年份
    'draw_days': [1, 3, 5],  # 每周一、三、五开奖
}
