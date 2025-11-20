"""
频率策略 - 基于每个位置的历史出现频率
"""

from .base import BaseStrategy
from typing import List, Dict
import random


class FrequencyStrategy(BaseStrategy):
    """频率策略：基于每个位置的历史频率选择号码"""
    
    def __init__(self):
        super().__init__(
            name='频率策略',
            description='基于每个位置的历史出现频率选择号码'
        )
    
    def generate_numbers(self, context: Dict) -> List[int]:
        """生成7个号码
        
        Args:
            context: 包含 position_frequency 的上下文
            
        Returns:
            7个号码
        """
        position_frequency = context.get('position_frequency', {})
        numbers = []
        
        for pos in range(1, 8):
            pos_freq = position_frequency.get(pos, {})
            
            if pos_freq:
                # 80% 概率选择高频号码
                if random.random() < 0.8:
                    top_numbers = sorted(pos_freq.keys(), key=lambda x: pos_freq[x], reverse=True)[:5]
                    numbers.append(random.choice(top_numbers))
                else:
                    numbers.append(random.choice(self.NUMBER_RANGE))
            else:
                numbers.append(random.choice(self.NUMBER_RANGE))
        
        return numbers
