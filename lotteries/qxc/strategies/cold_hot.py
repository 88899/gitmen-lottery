"""
冷热号策略 - 结合冷号和热号
"""

from .base import BaseStrategy
from typing import List, Dict
import random


class ColdHotStrategy(BaseStrategy):
    """冷热号策略：结合冷号和热号"""
    
    def __init__(self):
        super().__init__(
            name='冷热号策略',
            description='结合冷号（低频）和热号（高频）'
        )
    
    def generate_numbers(self, context: Dict) -> List[int]:
        """生成7个号码"""
        position_frequency = context.get('position_frequency', {})
        numbers = []
        
        for pos in range(1, 8):
            pos_freq = position_frequency.get(pos, {})
            
            if pos_freq:
                # 50% 热号，50% 冷号
                if random.random() < 0.5:
                    # 热号（高频）
                    hot_numbers = sorted(pos_freq.keys(), key=lambda x: pos_freq[x], reverse=True)[:3]
                    numbers.append(random.choice(hot_numbers))
                else:
                    # 冷号（低频）
                    cold_numbers = sorted(pos_freq.keys(), key=lambda x: pos_freq[x])[:3]
                    numbers.append(random.choice(cold_numbers))
            else:
                numbers.append(random.choice(self.NUMBER_RANGE))
        
        return numbers
