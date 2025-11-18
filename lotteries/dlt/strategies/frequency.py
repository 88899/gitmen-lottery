"""
频率策略
基于历史出现频率进行预测
"""

from .base import BaseStrategy
from typing import List, Dict
import random


class FrequencyStrategy(BaseStrategy):
    """频率策略：70% 高频号码 + 30% 随机号码"""
    
    def __init__(self):
        super().__init__(
            name='频率策略',
            description='基于历史出现频率，选择高频号码组合'
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
        
        # 获取高频号码（前15个）
        sorted_balls = sorted(front_frequency.keys(), key=lambda x: front_frequency[x], reverse=True)
        top_balls = sorted_balls[:15]
        
        # 增加随机性：从高频号码中随机选择数量
        high_freq_count = random.randint(3, 4)  # 3-4个高频号码
        random_count = 5 - high_freq_count      # 剩余的随机号码
        
        # 选择高频号码
        high_freq_balls = self.random_select(top_balls, high_freq_count)
        
        # 选择随机号码（不重复）
        remaining_balls = [b for b in self.FRONT_RANGE if b not in high_freq_balls]
        random_balls = self.random_select(remaining_balls, random_count)
        
        balls = high_freq_balls + random_balls
        
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
        
        # 80% 概率选择高频号码，20% 概率随机
        if random.random() < 0.8 and back_frequency:
            top_back = sorted(back_frequency.keys(), key=lambda x: back_frequency[x], reverse=True)[:6]
            return sorted(self.random_select(top_back, 2))
        else:
            return sorted(self.random_select(self.BACK_RANGE, 2))
