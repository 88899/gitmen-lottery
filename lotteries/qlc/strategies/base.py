"""
七乐彩预测策略基类
"""

import random
from typing import List, Dict, Tuple
from abc import ABC, abstractmethod


class BaseStrategy(ABC):
    """七乐彩预测策略基类"""
    
    BASIC_RANGE = list(range(1, 31))  # 基本号范围 1-30
    BASIC_COUNT = 7  # 基本号个数
    
    def __init__(self, name: str, description: str):
        self.name = name
        self.description = description
    
    @abstractmethod
    def generate_balls(self, context: Dict) -> Tuple[List[int], int]:
        """生成基本号和特别号（子类必须实现）
        
        Args:
            context: 上下文数据（历史数据、频率统计等）
            
        Returns:
            (basic_balls, special_ball) 元组
        """
        pass
    
    def random_select(self, array: List, n: int) -> List:
        """从数组中随机选择 n 个不重复的元素"""
        return random.sample(array, min(n, len(array)))
    
    def get_info(self) -> Dict:
        """获取策略信息"""
        return {
            'name': self.name,
            'description': self.description
        }
