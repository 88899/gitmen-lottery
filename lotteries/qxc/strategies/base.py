"""
七星彩预测策略基类
"""

import random
from typing import List, Dict
from abc import ABC, abstractmethod


class BaseStrategy(ABC):
    """七星彩预测策略基类"""
    
    NUMBER_RANGE = list(range(0, 10))  # 每位数字范围 0-9
    POSITION_COUNT = 7  # 7个位置
    
    def __init__(self, name: str, description: str):
        self.name = name
        self.description = description
    
    @abstractmethod
    def generate_numbers(self, context: Dict) -> List[int]:
        """生成7个号码（子类必须实现）
        
        Args:
            context: 上下文数据（历史数据、频率统计等）
            
        Returns:
            7个号码
        """
        pass
    
    def random_select(self, array: List, n: int) -> List:
        """从数组中随机选择 n 个元素（可重复）"""
        return [random.choice(array) for _ in range(n)]
    
    def get_info(self) -> Dict:
        """获取策略信息"""
        return {
            'name': self.name,
            'description': self.description
        }
