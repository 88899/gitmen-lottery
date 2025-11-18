"""
大乐透预测策略基类
"""

import random
from typing import List, Dict
from abc import ABC, abstractmethod


class BaseStrategy(ABC):
    """预测策略基类"""
    
    FRONT_RANGE = list(range(1, 36))  # 前区范围 1-35
    BACK_RANGE = list(range(1, 13))   # 后区范围 1-12
    
    def __init__(self, name: str, description: str):
        """初始化策略
        
        Args:
            name: 策略名称
            description: 策略描述
        """
        self.name = name
        self.description = description
    
    @abstractmethod
    def generate_front_balls(self, context: Dict) -> List[int]:
        """生成前区号码（子类必须实现）
        
        Args:
            context: 上下文数据（历史数据、频率统计等）
            
        Returns:
            5个前区号码（已排序）
        """
        pass
    
    @abstractmethod
    def generate_back_balls(self, context: Dict) -> List[int]:
        """生成后区号码（子类必须实现）
        
        Args:
            context: 上下文数据
            
        Returns:
            2个后区号码（已排序）
        """
        pass
    
    def is_valid_front_combination(self, balls: List[int]) -> bool:
        """验证前区组合是否有效
        
        规则：不能有超过3个连号
        
        Args:
            balls: 前区号码列表
            
        Returns:
            是否有效
        """
        sorted_balls = sorted(balls)
        consecutive_count = 1
        
        for i in range(1, len(sorted_balls)):
            if sorted_balls[i] - sorted_balls[i-1] == 1:
                consecutive_count += 1
                if consecutive_count >= 3:
                    return False
            else:
                consecutive_count = 1
        
        return True
    
    def random_select(self, array: List, n: int) -> List:
        """从数组中随机选择 n 个不重复的元素
        
        Args:
            array: 源数组
            n: 选择数量
            
        Returns:
            选中的元素列表
        """
        return random.sample(array, min(n, len(array)))
    
    def score_combination(self, front_balls: List[int], front_frequency: Dict) -> float:
        """计算组合得分（用于排序）
        
        Args:
            front_balls: 前区组合
            front_frequency: 前区频率统计
            
        Returns:
            得分
        """
        score = 0
        
        # 频率得分
        for ball in front_balls:
            score += front_frequency.get(ball, 0)
        
        # 分布得分（号码分布越均匀得分越高）
        sorted_balls = sorted(front_balls)
        gaps = [sorted_balls[i+1] - sorted_balls[i] for i in range(len(sorted_balls)-1)]
        avg_gap = sum(gaps) / len(gaps)
        ideal_gap = 35 / 5  # 理想间距
        gap_score = 100 - abs(avg_gap - ideal_gap) * 10
        score += gap_score
        
        return score
    
    def get_info(self) -> Dict:
        """获取策略信息
        
        Returns:
            策略信息字典
        """
        return {
            'name': self.name,
            'description': self.description
        }
