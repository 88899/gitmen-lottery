"""
七星彩预测策略模块
"""

from .base import BaseStrategy
from .frequency import FrequencyStrategy
from .random import RandomStrategy
from .balanced import BalancedStrategy
from .cold_hot import ColdHotStrategy

__all__ = [
    'BaseStrategy',
    'FrequencyStrategy',
    'RandomStrategy',
    'BalancedStrategy',
    'ColdHotStrategy',
    'get_strategy',
    'get_all_strategies'
]

# 策略注册表
STRATEGIES = {
    'frequency': FrequencyStrategy,
    'random': RandomStrategy,
    'balanced': BalancedStrategy,
    'coldHot': ColdHotStrategy
}


def get_strategy(strategy_name: str) -> BaseStrategy:
    """获取策略实例"""
    if strategy_name not in STRATEGIES:
        available = ', '.join(STRATEGIES.keys())
        raise ValueError(f"未知的策略: {strategy_name}。可用策略: {available}")
    
    return STRATEGIES[strategy_name]()


def get_all_strategies() -> list:
    """获取所有可用策略"""
    return [
        {
            'key': key,
            'name': strategy().name,
            'description': strategy().description
        }
        for key, strategy in STRATEGIES.items()
    ]
