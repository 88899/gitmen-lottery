"""
均衡策略 - 大小号均衡
"""

from .base import BaseStrategy
from typing import List, Dict
import random


class BalancedStrategy(BaseStrategy):
    """均衡策略：大小号均衡分布"""
    
    def __init__(self):
        super().__init__(
            name='均衡策略',
            description='大小号均衡分布（0-4为小号，5-9为大号）'
        )
    
    def generate_numbers(self, context: Dict) -> List[int]:
        """生成7个号码"""
        small_numbers = list(range(0, 5))  # 0-4
        large_numbers = list(range(5, 10))  # 5-9
        
        numbers = []
        
        # 3-4个小号，3-4个大号
        small_count = random.choice([3, 4])
        large_count = 7 - small_count
        
        for _ in range(small_count):
            numbers.append(random.choice(small_numbers))
        
        for _ in range(large_count):
            numbers.append(random.choice(large_numbers))
        
        # 打乱顺序
        random.shuffle(numbers)
        
        return numbers
