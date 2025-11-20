"""
冷热号策略 - 结合冷号和热号
"""

from .base import BaseStrategy
from typing import List, Dict, Tuple
import random


class ColdHotStrategy(BaseStrategy):
    """冷热号策略：结合冷号（低频）和热号（高频）"""
    
    def __init__(self):
        super().__init__(
            name='冷热号策略',
            description='结合冷号（低频）和热号（高频）'
        )
    
    def generate_balls(self, context: Dict) -> Tuple[List[int], int]:
        """生成基本号和特别号"""
        basic_frequency = context.get('basic_frequency', {})
        special_frequency = context.get('special_frequency', {})
        
        if basic_frequency:
            # 获取热号（高频）和冷号（低频）
            sorted_balls = sorted(basic_frequency.keys(), key=lambda x: basic_frequency[x], reverse=True)
            hot_balls = sorted_balls[:10]  # 前10个热号
            cold_balls = sorted_balls[-10:]  # 后10个冷号
            
            # 4个热号 + 3个冷号
            basic_balls = []
            basic_balls.extend(self.random_select(hot_balls, 4))
            remaining_cold = [b for b in cold_balls if b not in basic_balls]
            basic_balls.extend(self.random_select(remaining_cold, 3))
        else:
            # 没有历史数据，随机选择
            basic_balls = self.random_select(self.BASIC_RANGE, self.BASIC_COUNT)
        
        # 选择特别号
        available_for_special = [b for b in self.BASIC_RANGE if b not in basic_balls]
        
        if special_frequency and available_for_special:
            # 50%热号，50%冷号
            sorted_special = sorted(special_frequency.keys(), key=lambda x: special_frequency[x], reverse=True)
            if random.random() < 0.5:
                # 热号
                hot_special = [b for b in sorted_special[:5] if b in available_for_special]
                special_ball = random.choice(hot_special) if hot_special else random.choice(available_for_special)
            else:
                # 冷号
                cold_special = [b for b in sorted_special[-5:] if b in available_for_special]
                special_ball = random.choice(cold_special) if cold_special else random.choice(available_for_special)
        else:
            special_ball = random.choice(available_for_special) if available_for_special else random.choice(self.BASIC_RANGE)
        
        return sorted(basic_balls), special_ball
