"""
七乐彩预测引擎
"""

from core.base_predictor import BasePredictor, BaseStatistics
import logging
from typing import List, Dict
from collections import Counter
from datetime import datetime
from .strategies import get_strategy, get_all_strategies

logger = logging.getLogger(__name__)


class QLCPredictor(BasePredictor):
    """七乐彩预测类"""

    BASIC_RANGE = range(1, 31)  # 基本号范围 1-30
    BASIC_COUNT = 7  # 基本号个数

    def __init__(self, lottery_data: List[dict], strategies: List[str] = None):
        """
        初始化预测器
        
        Args:
            lottery_data: 历史中奖数据列表
            strategies: 使用的策略列表（默认 ['frequency']）
        """
        self.all_basic_balls = set(self.BASIC_RANGE)
        self.default_strategies = strategies or ['frequency']
        super().__init__(lottery_data)

    def _analyze_history(self):
        """分析历史数据"""
        self.historical_combinations = set()
        self.basic_ball_frequency = Counter()
        self.special_ball_frequency = Counter()
        
        for data in self.lottery_data:
            basic_balls = tuple(sorted(data['basic_balls']))
            special_ball = data['special_ball']
            
            # 记录历史组合
            self.historical_combinations.add((basic_balls, special_ball))
            
            # 统计基本号频率
            for ball in data['basic_balls']:
                self.basic_ball_frequency[ball] += 1
            
            # 统计特别号频率
            self.special_ball_frequency[special_ball] += 1
        
        logger.info(f"历史中奖组合数: {len(self.historical_combinations)}")
    
    def _is_valid_combination(self, basic_balls: List[int]) -> bool:
        """验证基本号组合是否有效"""
        # 检查是否有重复
        if len(set(basic_balls)) != len(basic_balls):
            return False
        # 检查范围
        if not all(ball in self.BASIC_RANGE for ball in basic_balls):
            return False
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
            'basic_frequency': dict(self.basic_ball_frequency),
            'special_frequency': dict(self.special_ball_frequency),
            'historical_combinations': self.historical_combinations,
            'basic_range': self.BASIC_RANGE,
            'basic_count': self.BASIC_COUNT
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
            
            # 使用策略生成基本号和特别号
            basic_balls, special_ball = strategy.generate_balls(context)
            
            # 检查是否重复
            basic_tuple = tuple(sorted(basic_balls))
            combo = (basic_tuple, special_ball)
            
            is_duplicate = (
                combo in context['historical_combinations'] or
                any((tuple(sorted(p['basic_balls'])), p['special_ball']) == combo for p in existing_predictions) or
                any((tuple(sorted(p['basic_balls'])), p['special_ball']) == combo for p in predictions)
            )
            
            if not is_duplicate and self._is_valid_combination(basic_balls):
                predictions.append({
                    'basic_balls': basic_balls,
                    'special_ball': special_ball,
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


class QLCStatistics(BaseStatistics):
    """七乐彩统计类"""

    def __init__(self, lottery_data: List[dict]):
        super().__init__(lottery_data)

    def get_frequency(self) -> dict:
        """获取号码频率统计"""
        basic_freq = Counter()
        special_freq = Counter()
        
        for data in self.lottery_data:
            for ball in data['basic_balls']:
                basic_freq[ball] += 1
            special_freq[data['special_ball']] += 1
        
        return {
            'basic_balls': dict(sorted(basic_freq.items())),
            'special_ball': dict(sorted(special_freq.items()))
        }
    
    def get_ball_frequency(self) -> dict:
        """获取号码频率统计（兼容旧接口）"""
        return self.get_frequency()
    
    def get_consecutive_analysis(self) -> dict:
        """分析连号情况"""
        consecutive_stats = {
            '无连号': 0,
            '2个连号': 0,
            '3个连号': 0,
            '3个以上连号': 0
        }
        
        for data in self.lottery_data:
            sorted_balls = sorted(data['basic_balls'])
            max_consecutive = self._find_max_consecutive(sorted_balls)
            
            if max_consecutive == 0:
                consecutive_stats['无连号'] += 1
            elif max_consecutive == 1:
                consecutive_stats['2个连号'] += 1
            elif max_consecutive == 2:
                consecutive_stats['3个连号'] += 1
            else:
                consecutive_stats['3个以上连号'] += 1
        
        return consecutive_stats
    
    @staticmethod
    def _find_max_consecutive(balls: List[int]) -> int:
        """找出最长连号个数"""
        if not balls:
            return 0
        sorted_balls = sorted(balls)
        max_consecutive = 0
        current_consecutive = 0
        
        for i in range(1, len(sorted_balls)):
            if sorted_balls[i] - sorted_balls[i-1] == 1:
                current_consecutive += 1
            else:
                max_consecutive = max(max_consecutive, current_consecutive)
                current_consecutive = 0
        
        return max(max_consecutive, current_consecutive)
