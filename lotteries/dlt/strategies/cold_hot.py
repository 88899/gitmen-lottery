"""
冷热号策略
结合冷号和热号
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
    
    def generate_front_balls(self, context: Dict) -> List[int]:
        """生成前区号码
        
        Args:
            context: 包含 front_frequency 的上下文
            
        Returns:
            5个前区号码
        """
        front_frequency = context.get('front_frequency', {})
        
        if not front_frequency:
            # 如果没有频率数据，使用随机策略
            return sorted(self.random_select(self.FRONT_RANGE, 5))
        
        # 获取热号（高频，前10个）
        sorted_balls = sorted(front_frequency.keys(), key=lambda x: front_frequency[x], reverse=True)
        hot_balls = sorted_balls[:10]
        
        # 获取冷号（低频，后10个）
        cold_balls = sorted_balls[-10:]
        
        # 选择 2-3 个热号，2-3 个冷号
        hot_count = random.choice([2, 3])
        cold_count = 5 - hot_count
        
        selected_hot = self.random_select(hot_balls, hot_count)
        selected_cold = self.random_select(cold_balls, cold_count)
        
        balls = selected_hot + selected_cold
        
        # 验证组合有效性
        if not self.is_valid_front_combination(balls):
            return self.generate_front_balls(context)
        
        return sorted(balls)
    
    def generate_back_balls(self, context: Dict) -> List[int]:
        """生成后区号码
        
        Args:
            context: 包含 back_frequency 的上下文
            
        Returns:
            2个后区号码
        """
        back_frequency = context.get('back_frequency', {})
        
        if not back_frequency:
            return sorted(self.random_select(self.BACK_RANGE, 2))
        
        # 获取热号和冷号
        sorted_back = sorted(back_frequency.keys(), key=lambda x: back_frequency[x], reverse=True)
        hot_back = sorted_back[:4]
        cold_back = sorted_back[-4:]
        
        # 1个热号，1个冷号
        selected = [
            random.choice(hot_back),
            random.choice(cold_back)
        ]
        
        return sorted(selected)
