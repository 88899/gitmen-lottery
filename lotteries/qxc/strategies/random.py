"""
随机策略 - 完全随机选择
"""

from .base import BaseStrategy
from typing import List, Dict
import random


class RandomStrategy(BaseStrategy):
    """随机策略：完全随机选择号码"""
    
    def __init__(self):
        super().__init__(
            name='随机策略',
            description='完全随机选择号码，不考虑历史数据'
        )
    
    def generate_numbers(self, context: Dict) -> List[int]:
        """生成7个号码"""
        return [random.choice(self.NUMBER_RANGE) for _ in range(7)]
