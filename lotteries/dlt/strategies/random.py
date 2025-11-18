"""
随机策略
完全随机选择号码
"""

from .base import BaseStrategy
from typing import List, Dict


class RandomStrategy(BaseStrategy):
    """随机策略：完全随机选择号码"""
    
    def __init__(self):
        super().__init__(
            name='随机策略',
            description='完全随机选择号码，不考虑历史数据'
        )
    
    def generate_front_balls(self, context: Dict) -> List[int]:
        """生成前区号码
        
        Args:
            context: 上下文数据（本策略不使用）
            
        Returns:
            5个前区号码
        """
        balls = self.random_select(self.FRONT_RANGE, 5)
        
        # 验证组合有效性
        if not self.is_valid_front_combination(balls):
            return self.generate_front_balls(context)
        
        return sorted(balls)
    
    def generate_back_balls(self, context: Dict) -> List[int]:
        """生成后区号码
        
        Args:
            context: 上下文数据（本策略不使用）
            
        Returns:
            2个后区号码
        """
        return sorted(self.random_select(self.BACK_RANGE, 2))
