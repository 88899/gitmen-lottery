"""
均衡策略 - 大小号均衡
"""

from .base import BaseStrategy
from typing import List, Dict, Tuple
import random


class BalancedStrategy(BaseStrategy):
    """均衡策略：大小号均衡分布"""
    
    def __init__(self):
        super().__init__(
            name='均衡策略',
            description='大小号均衡分布（1-15为小号，16-30为大号）'
        )
    
    def generate_balls(self, context: Dict) -> Tuple[List[int], int]:
        """生成基本号和特别号"""
        small_numbers = list(range(1, 16))  # 1-15
        large_numbers = list(range(16, 31))  # 16-30
        
        # 3-4个小号，3-4个大号
        small_count = random.choice([3, 4])
        large_count = self.BASIC_COUNT - small_count
        
        basic_balls = []
        basic_balls.extend(self.random_select(small_numbers, small_count))
        basic_balls.extend(self.random_select(large_numbers, large_count))
        
        # 从剩余号码中选择特别号
        available_for_special = [b for b in self.BASIC_RANGE if b not in basic_balls]
        special_ball = random.choice(available_for_special) if available_for_special else random.choice(self.BASIC_RANGE)
        
        return sorted(basic_balls), special_ball
