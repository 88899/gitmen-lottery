"""
双色球配置文件 - 彩票规则和常量定义
"""

# 双色球规则
SSQ_RULES = {
    'name': '双色球',
    'code': 'ssq',
    'description': '中国体育彩票双色球',
    'draw_days': ['周二', '周四', '周日'],
    'draw_time': '20:30',

    # 红球规则
    'red_ball': {
        'range': (1, 33),
        'count': 6,
        'description': '从1-33中选择6个不重复的号码'
    },

    # 蓝球规则
    'blue_ball': {
        'range': (1, 16),
        'count': 1,
        'description': '从1-16中选择1个号码'
    },

    # 中奖等级
    'prize_levels': [
        {
            'level': 1,
            'name': '一等奖',
            'condition': '红球6个 + 蓝球1个',
            'probability': '1/17,850,370'
        },
        {
            'level': 2,
            'name': '二等奖',
            'condition': '红球6个',
            'probability': '1/1,122,523'
        },
        {
            'level': 3,
            'name': '三等奖',
            'condition': '红球5个 + 蓝球1个',
            'probability': '1/185,261'
        },
        {
            'level': 4,
            'name': '四等奖',
            'condition': '红球5个 或 红球4个 + 蓝球1个',
            'probability': '1/10,291'
        },
        {
            'level': 5,
            'name': '五等奖',
            'condition': '红球4个 或 红球3个 + 蓝球1个',
            'probability': '1/733'
        },
        {
            'level': 6,
            'name': '六等奖',
            'condition': '红球2个 + 蓝球1个 或 蓝球1个',
            'probability': '1/89'
        }
    ]
}

# 预测策略配置
PREDICTION_STRATEGIES = {
    'conservative': {
        'name': '保守策略',
        'description': '基于高频号码和历史组合分析',
        'max_consecutive': 3,
        'use_frequency': True,
        'weight': {
            'frequency': 0.4,
            'distribution': 0.3,
            'gap': 0.3
        }
    },
    'aggressive': {
        'name': '激进策略',
        'description': '考虑更多低频号码，增加中奖多样性',
        'max_consecutive': 4,
        'use_frequency': True,
        'weight': {
            'frequency': 0.2,
            'distribution': 0.4,
            'gap': 0.4
        }
    },
    'balanced': {
        'name': '均衡策略',
        'description': '综合多个因素的平衡策略',
        'max_consecutive': 3,
        'use_frequency': True,
        'weight': {
            'frequency': 0.33,
            'distribution': 0.33,
            'gap': 0.34
        }
    }
}

# 数据过滤规则
DATA_FILTERS = {
    'exclude_high_consecutive': True,  # 排除高连号
    'max_consecutive_count': 3,        # 最大连号个数
    'exclude_historical': True,        # 排除历史中奖号码
    'min_gap': 1,                      # 最小间距
    'max_gap': 10                      # 最大间距
}

# 预测输出配置
OUTPUT_CONFIG = {
    'red_combinations_count': 5,  # 输出红球组合数
    'blue_combinations_count': 1,  # 输出蓝球组合数
    'sort_by': 'score',            # 排序方式: 'score', 'probability', 'random'
    'include_statistics': True,    # 是否包含统计信息
}

# 历史数据
START_YEAR = 2003  # 双色球从2003年开始

if __name__ == '__main__':
    print("SSQ (双色球) 规则:")
    print(SSQ_RULES)
    print("\n预测策略:")
    print(PREDICTION_STRATEGIES)
