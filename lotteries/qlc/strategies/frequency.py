"""
频率策略 - 基于历史出现频率
"""

from .base import BaseStrategy
from typing import List, Dict, Tuple
import random


class FrequencyStrategy(BaseStrategy):
    """频率策略：基于历史频率选择号码"""
    
    def __init__(self):
        super().__init__(
            name='频率策略',
            description='基于历史出现频率选择号码'
        )
    
    def generate_balls(self, context: Dict) -> Tuple[List[int], int]:
        """生成基本号和特别号"""
        basic_frequency = context.get('basic_frequency', {})
        special_frequency = context.get('special_frequency', {})
        
        # 获取高频基本号
        if basic_frequency:
            top_balls = sorted(basic_frequency.keys(), key=lambda x: basic_frequency[x], reverse=True)[:15]
        else:
            top_balls = self.BASIC_RANGE
        
        # 选择7个基本号（80%高频 + 20%随机）
        high_freq_count = 5
        basic_balls = self.random_select(top_balls, high_freq_count)
        
        # 补充随机号码
        remaining = [b for b in self.BASIC_RANGE if b not in basic_balls]
        basic_balls.extend(self.random_select(remaining, self.BASIC_COUNT - high_freq_count))
        
        # 选择特别号（从未被选为基本号的号码中选择）
        available_for_special = [b for b in self.BASIC_RANGE if b not in basic_balls]
        
        if special_frequency and available_for_special:
            # 80%概率选择高频特别号
            if random.random() < 0.8:
                top_special = [b for b in sorted(special_frequency.keys(), 
                              key=lambda x: special_frequency[x], reverse=True)[:5]
                              if b in available_for_special]
                if top_special:
                    special_ball = random.choice(top_special)
                else:
                    special_ball = random.choice(available_for_special)
            else:
                special_ball = random.choice(available_for_special)
        else:
            special_ball = random.choice(available_for_special) if available_for_special else random.choice(self.BASIC_RANGE)
        
        return sorted(basic_balls), special_ball
