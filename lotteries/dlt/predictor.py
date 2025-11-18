"""
大乐透预测引擎
支持多种预测策略的组合使用
"""

from core.base_predictor import BasePredictor, BaseStatistics
from core.utils import has_consecutive_numbers, format_number
import logging
from typing import List, Tuple, Set, Dict
from collections import Counter
import itertools
from datetime import datetime
from .strategies import get_strategy, get_all_strategies

logger = logging.getLogger(__name__)


class DLTPredictor(BasePredictor):
    """大乐透预测类（支持策略模式）"""

    FRONT_RANGE = range(1, 36)  # 前区范围 1-35
    BACK_RANGE = range(1, 13)   # 后区范围 1-12
    FRONT_COUNT = 5  # 前区号码数量
    BACK_COUNT = 2   # 后区号码数量

    def __init__(self, lottery_data: List[dict], strategies: List[str] = None):
        """
        初始化预测器

        Args:
            lottery_data: 历史中奖数据列表
            strategies: 使用的策略列表（默认 ['frequency']）
        """
        self.all_front_balls = set(self.FRONT_RANGE)
        self.all_back_balls = set(self.BACK_RANGE)
        self.default_strategies = strategies or ['frequency']
        super().__init__(lottery_data)

    def _analyze_history(self):
        """分析历史数据"""
        self.historical_combinations = set()
        self.front_ball_frequency = Counter()
        self.back_ball_frequency = Counter()

        for data in self.lottery_data:
            # 处理前区号码（可能是字符串或整数）
            if isinstance(data['front_balls'][0], str):
                front_balls = tuple(sorted([int(b) for b in data['front_balls']]))
            else:
                front_balls = tuple(sorted(data['front_balls']))
            
            # 处理后区号码
            if isinstance(data['back_balls'][0], str):
                back_balls = tuple(sorted([int(b) for b in data['back_balls']]))
            else:
                back_balls = tuple(sorted(data['back_balls']))

            # 组合
            combination = (front_balls, back_balls)
            self.historical_combinations.add(combination)

            # 统计频率
            for ball in front_balls:
                self.front_ball_frequency[ball] += 1

            for ball in back_balls:
                self.back_ball_frequency[ball] += 1

        logger.info(f"历史中奖组合数: {len(self.historical_combinations)}")

    def _is_valid_combination(self, front_balls: List[int], back_balls: List[int]) -> bool:
        """
        验证组合是否有效

        规则:
        1. 不能是历史中奖号码
        2. 前区不能有3个或以上连号

        Args:
            front_balls: 前区号码列表
            back_balls: 后区号码列表

        Returns:
            True 表示有效
        """
        # 检查是否是历史中奖号码
        combination = (tuple(sorted(front_balls)), tuple(sorted(back_balls)))
        if combination in self.historical_combinations:
            return False

        # 检查前区是否有3个或以上连号
        if has_consecutive_numbers(sorted(front_balls), max_consecutive=3):
            return False

        return True

    def predict(self, count: int = 5, strategies: List[str] = None) -> List[Dict]:
        """
        执行预测

        Args:
            count: 预测组合数
            strategies: 使用的策略列表（可选）

        Returns:
            预测结果列表
        """
        # 使用指定策略或默认策略
        strategy_names = strategies or self.default_strategies
        
        logger.info(f"使用策略: {', '.join(strategy_names)}")
        
        # 构建上下文数据
        context = {
            'front_frequency': dict(self.front_ball_frequency),
            'back_frequency': dict(self.back_ball_frequency),
            'historical_combinations': self.historical_combinations
        }

        # 计算每个策略生成的组合数
        count_per_strategy = count // len(strategy_names)
        
        logger.info(f"总共需要 {count} 个组合，使用 {len(strategy_names)} 个策略，每个策略生成 {count_per_strategy}")
        
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
            
            logger.info(f"当前已生成 {len(predictions)} 个组合")
            
            # 如果已经生成足够的组合，停止
            if len(predictions) >= count:
                logger.info(f"已达到目标数量 {count}，停止生成")
                break

        # 截取到指定数量
        final_predictions = predictions[:count]
        
        # 统计每个策略的数量
        strategy_count = {}
        for pred in final_predictions:
            strategy_count[pred['strategy']] = strategy_count.get(pred['strategy'], 0) + 1
        
        logger.info(f"生成了 {len(final_predictions)} 个预测组合，策略分布: {strategy_count}")
        
        return final_predictions

    def _predict_with_strategy(self, strategy_name: str, count: int, context: Dict, existing_predictions: List[Dict] = None) -> List[Dict]:
        """
        使用指定策略生成预测

        Args:
            strategy_name: 策略名称
            count: 生成数量
            context: 上下文数据
            existing_predictions: 已生成的预测（用于去重）

        Returns:
            预测结果列表
        """
        if existing_predictions is None:
            existing_predictions = []
        
        strategy = get_strategy(strategy_name)
        predictions = []
        max_attempts = count * 100  # 最多尝试次数
        attempts = 0

        logger.info(f"使用 {strategy.name} 生成 {count} 个组合...")

        # 已存在的组合（用于去重）
        existing_codes = set()
        for pred in existing_predictions:
            existing_codes.add(pred['sorted_code'])

        while len(predictions) < count and attempts < max_attempts:
            attempts += 1

            # 使用策略生成前区和后区
            front_balls = strategy.generate_front_balls(context)
            back_balls = strategy.generate_back_balls(context)

            # 检查是否有效
            if not self._is_valid_combination(front_balls, back_balls):
                continue

            # 生成排序码
            sorted_code = ','.join([f"{x:02d}" for x in sorted(front_balls)]) + '-' + ','.join([f"{x:02d}" for x in sorted(back_balls)])
            
            # 检查是否重复
            if sorted_code in existing_codes:
                continue
            
            existing_codes.add(sorted_code)
            
            predictions.append({
                'front_balls': front_balls,
                'back_balls': back_balls,
                'sorted_code': sorted_code,
                'strategy': strategy_name,
                'strategy_name': strategy.name,
                'prediction_time': datetime.now().isoformat()
            })

        logger.info(f"{strategy.name} 生成了 {len(predictions)} 个组合")
        return predictions


class DLTStatistics(BaseStatistics):
    """大乐透统计类"""

    def __init__(self, lottery_data: List[dict]):
        super().__init__(lottery_data)

    def get_frequency(self) -> Dict:
        """获取号码频率统计"""
        front_frequency = Counter()
        back_frequency = Counter()

        for data in self.lottery_data:
            # 处理前区号码
            if isinstance(data['front_balls'][0], str):
                front_balls = [int(b) for b in data['front_balls']]
            else:
                front_balls = data['front_balls']
            
            # 处理后区号码
            if isinstance(data['back_balls'][0], str):
                back_balls = [int(b) for b in data['back_balls']]
            else:
                back_balls = data['back_balls']

            for ball in front_balls:
                front_frequency[ball] += 1

            for ball in back_balls:
                back_frequency[ball] += 1

        return {
            'front_balls': dict(front_frequency),
            'back_balls': dict(back_frequency)
        }

    def get_consecutive_analysis(self) -> Dict:
        """获取连号分析"""
        consecutive_counts = Counter()

        for data in self.lottery_data:
            # 处理前区号码
            if isinstance(data['front_balls'][0], str):
                front_balls = sorted([int(b) for b in data['front_balls']])
            else:
                front_balls = sorted(data['front_balls'])

            # 统计连号
            max_consecutive = 1
            current_consecutive = 1

            for i in range(1, len(front_balls)):
                if front_balls[i] - front_balls[i-1] == 1:
                    current_consecutive += 1
                    max_consecutive = max(max_consecutive, current_consecutive)
                else:
                    current_consecutive = 1

            consecutive_counts[max_consecutive] += 1

        return dict(consecutive_counts)

    def get_odd_even_analysis(self) -> Dict:
        """获取奇偶分析"""
        odd_even_counts = Counter()

        for data in self.lottery_data:
            # 处理前区号码
            if isinstance(data['front_balls'][0], str):
                front_balls = [int(b) for b in data['front_balls']]
            else:
                front_balls = data['front_balls']

            odd_count = sum(1 for ball in front_balls if ball % 2 == 1)
            even_count = len(front_balls) - odd_count

            odd_even_counts[f"{odd_count}奇{even_count}偶"] += 1

        return dict(odd_even_counts)
