"""
随机策略 - 完全随机选择
"""

from .base import BaseStrategy
from typing import List, Dict, Tuple
import random


class RandomStrategy(BaseStrategy):
    """随机策略：完全随机选择号码"""
    
    def __init__(self):
        super().__init__(
            name='随机策略',
            description='完全随机选择号码，不考虑历史数据'
        )
    
    def generate_balls(self, context: Dict) -> Tuple[List[int], int]:
        """生成基本号和特别号"""
        # 随机选择7个基本号
        basic_balls = self.random_select(self.BASIC_RANGE, self.BASIC_COUNT)
        
        # 从剩余号码中随机选择特别号
        available_for_special = [b for b in self.BASIC_RANGE if b not in basic_balls]
        special_ball = random.choice(available_for_special) if available_for_special else random.choice(self.BASIC_RANGE)
        
        return sorted(basic_balls), special_ball
