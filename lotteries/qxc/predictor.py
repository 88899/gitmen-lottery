"""
七星彩预测引擎
"""

from core.base_predictor import BasePredictor, BaseStatistics
import logging
from typing import List, Dict
from collections import Counter
from datetime import datetime
from .strategies import get_strategy, get_all_strategies

logger = logging.getLogger(__name__)


class QXCPredictor(BasePredictor):
    """七星彩预测类"""

    def __init__(self, lottery_data: List[dict], strategies: List[str] = None):
        """
        初始化预测器
        
        Args:
            lottery_data: 历史中奖数据列表
            strategies: 使用的策略列表（默认 ['frequency']）
        """
        self.default_strategies = strategies or ['frequency']
        super().__init__(lottery_data)

    def _analyze_history(self):
        """分析历史数据"""
        self.historical_combinations = set()
        self.position_frequency = {}  # 每个位置的号码频率
        
        # 初始化每个位置的频率统计
        for pos in range(1, 8):
            self.position_frequency[pos] = Counter()
        
        for data in self.lottery_data:
            numbers = data['numbers']
            
            # 记录历史组合
            self.historical_combinations.add(tuple(numbers))
            
            # 统计每个位置的号码频率
            for pos, num in enumerate(numbers, 1):
                self.position_frequency[pos][num] += 1
        
        logger.info(f"历史中奖组合数: {len(self.historical_combinations)}")
    
    def _is_valid_combination(self, numbers: List[int]) -> bool:
        """验证组合是否有效（七星彩没有特殊限制，总是有效）"""
        return True

    def predict(self, count: int = 5, strategies: List[str] = None) -> List[dict]:
        """
        完整预测（支持多策略）
        
        Args:
            count: 预测组合总数
            strategies: 使用的策略列表（可选）
            
        Returns:
            预测结果列表
        """
        strategy_names = strategies or self.default_strategies
        
        logger.info(f"使用策略: {', '.join(strategy_names)}")
        
        # 构建上下文数据
        context = {
            'history_data': self.lottery_data,
            'position_frequency': {
                pos: dict(freq) for pos, freq in self.position_frequency.items()
            },
            'historical_combinations': self.historical_combinations
        }
        
        # 计算每个策略生成的组合数
        count_per_strategy = max(1, count // len(strategy_names))
        
        # 使用多个策略生成预测
        predictions = []
        
        for strategy_name in strategy_names:
            strategy_predictions = self._predict_with_strategy(
                strategy_name,
                count_per_strategy,
                context,
                predictions
            )
            predictions.extend(strategy_predictions)
            
            if len(predictions) >= count:
                break
        
        # 截取到指定数量
        final_predictions = predictions[:count]
        
        # 添加排名
        for i, pred in enumerate(final_predictions):
            pred['rank'] = i + 1
        
        logger.info(f"生成了 {len(final_predictions)} 个预测组合")
        return final_predictions
    
    def _predict_with_strategy(
        self, 
        strategy_name: str, 
        count: int, 
        context: Dict,
        existing_predictions: List[dict]
    ) -> List[dict]:
        """使用指定策略生成预测"""
        import time
        
        strategy = get_strategy(strategy_name)
        predictions = []
        max_attempts = min(count * 20, 200)
        start_time = time.time()
        max_time = 5.0
        attempts = 0
        
        logger.info(f"使用 {strategy.name} 生成 {count} 个组合...")
        
        while len(predictions) < count and attempts < max_attempts:
            attempts += 1
            
            if attempts % 10 == 0 and time.time() - start_time > max_time:
                logger.warning(f"{strategy.name} 预测超时，已生成 {len(predictions)} 个组合")
                break
            
            # 使用策略生成号码
            numbers = strategy.generate_numbers(context)
            
            # 检查是否重复
            numbers_tuple = tuple(numbers)
            
            is_duplicate = (
                numbers_tuple in context['historical_combinations'] or
                any(tuple(p['numbers']) == numbers_tuple for p in existing_predictions) or
                any(tuple(p['numbers']) == numbers_tuple for p in predictions)
            )
            
            if not is_duplicate:
                predictions.append({
                    'numbers': numbers,
                    'strategy': strategy_name,
                    'strategy_name': strategy.name,
                    'prediction_time': datetime.now().isoformat()
                })
        
        logger.info(f"{strategy.name} 生成了 {len(predictions)} 个组合（尝试 {attempts} 次）")
        return predictions
    
    @staticmethod
    def get_available_strategies() -> List[dict]:
        """获取所有可用策略"""
        return get_all_strategies()


class QXCStatistics(BaseStatistics):
    """七星彩统计类"""

    def __init__(self, lottery_data: List[dict]):
        super().__init__(lottery_data)

    def get_frequency(self) -> dict:
        """获取号码频率统计"""
        position_freq = {}
        
        for pos in range(1, 8):
            position_freq[pos] = Counter()
        
        for data in self.lottery_data:
            for pos, num in enumerate(data['numbers'], 1):
                position_freq[pos][num] += 1
        
        return {
            f'position_{pos}': dict(sorted(freq.items()))
            for pos, freq in position_freq.items()
        }
    
    def get_ball_frequency(self) -> dict:
        """获取号码频率统计（兼容旧接口）"""
        return self.get_frequency()
    
    def get_consecutive_analysis(self) -> dict:
        """分析连号情况（七星彩不需要连号分析）"""
        return {
            '说明': '七星彩每位独立，不进行连号分析'
        }
