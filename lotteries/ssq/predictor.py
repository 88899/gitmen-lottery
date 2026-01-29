"""
双色球预测引擎
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


class SSQPredictor(BasePredictor):
    """双色球预测类（支持策略模式）"""

    RED_RANGE = range(1, 34)  # 红球范围 1-33
    BLUE_RANGE = range(1, 17)  # 蓝球范围 1-16
    RED_COUNT = 6  # 红球个数

    def __init__(self, lottery_data: List[dict], strategies: List[str] = None):
        """
        初始化预测器

        Args:
            lottery_data: 历史中奖数据列表
            strategies: 使用的策略列表（默认 ['frequency']）
        """
        self.all_red_balls = set(self.RED_RANGE)
        self.all_blue_balls = set(self.BLUE_RANGE)
        self.default_strategies = strategies or ['frequency']
        super().__init__(lottery_data)

    def _analyze_history(self):
        """分析历史数据"""
        self.historical_combinations = set()  # 完整组合（红球+蓝球）
        self.red_ball_frequency = Counter()
        self.blue_ball_frequency = Counter()

        for data in self.lottery_data:
            # 保存完整的中奖组合（红球排序 + 蓝球）
            red_balls_sorted = tuple(sorted(data['red_balls']))
            blue_ball = data['blue_ball']
            sorted_code = ','.join([f"{x:02d}" for x in red_balls_sorted]) + f"-{blue_ball:02d}"
            self.historical_combinations.add(sorted_code)

            # 统计频率
            for ball in data['red_balls']:
                self.red_ball_frequency[ball] += 1
            self.blue_ball_frequency[blue_ball] += 1

        logger.info(f"历史中奖组合数: {len(self.historical_combinations)}")

    def _is_valid_combination(self, red_balls: List[int]) -> bool:
        """
        验证组合是否有效

        规则:
        1. 不能是历史中奖号码
        2. 不能有3个或以上连号

        Args:
            red_balls: 红球号码列表

        Returns:
            True 表示有效
        """
        # 检查是否是历史中奖号码
        if tuple(sorted(red_balls)) in self.historical_red_combinations:
            return False

        # 检查是否有3个或以上连号
        if has_consecutive_numbers(sorted(red_balls), max_consecutive=3):
            return False

        return True

    def predict_red_balls(self, count: int = 5) -> List[List[int]]:
        """
        预测红球组合

        使用策略：
        1. 基于历史频率分析，选择高频号码
        2. 排除历史中奖组合
        3. 排除超过3个连号的组合
        4. 综合考虑号码分布

        Args:
            count: 预测组合数

        Returns:
            预测的红球组合列表
        """
        predictions = []

        # 获取高频号码
        top_balls = self._get_top_frequency_balls(count=15)
        logger.info(f"高频号码: {top_balls}")

        # 生成候选组合
        candidate_combinations = []
        for combo in itertools.combinations(top_balls, self.RED_COUNT):
            if self._is_valid_combination(list(combo)):
                candidate_combinations.append(sorted(list(combo)))

        # 如果高频号码的组合不足，扩展到全部号码
        if len(candidate_combinations) < count:
            logger.info("高频号码组合不足，扩展到全部号码")
            for combo in itertools.combinations(self.all_red_balls, self.RED_COUNT):
                if self._is_valid_combination(list(combo)):
                    candidate_combinations.append(sorted(list(combo)))
                    if len(candidate_combinations) >= count * 2:
                        break

        # 评分并选择最优组合
        scored_combinations = [
            (combo, self._score_combination(combo))
            for combo in candidate_combinations
        ]
        scored_combinations.sort(key=lambda x: x[1], reverse=True)

        predictions = [combo for combo, score in scored_combinations[:count]]

        logger.info(f"生成了 {len(predictions)} 个预测组合")
        return predictions

    def _get_top_frequency_balls(self, count: int = 15) -> List[int]:
        """获取高频号码"""
        return [ball for ball, freq in self.red_ball_frequency.most_common(count)]

    def _score_combination(self, combo: List[int]) -> float:
        """
        对组合进行评分

        评分规则：
        1. 号码频率得分：高频号码得分高
        2. 分布得分：号码分布越均匀得分越高
        3. 间距得分：号码间距适当得分高
        """
        score = 0

        # 频率得分 (40%)
        frequency_score = sum(self.red_ball_frequency[ball] for ball in combo)
        score += frequency_score * 0.4

        # 分布得分 (30%) - 号码在1-33范围内的分布
        segments = [0] * 6  # 分成6段，每段5-6个数
        for ball in combo:
            segment = min((ball - 1) // 6, 5)
            segments[segment] += 1
        distribution_score = 6 - len([s for s in segments if s == 0])
        score += distribution_score * 30

        # 间距得分 (30%) - 相邻号码的间距
        sorted_combo = sorted(combo)
        gaps = [sorted_combo[i+1] - sorted_combo[i] for i in range(len(sorted_combo)-1)]
        avg_gap = sum(gaps) / len(gaps)
        gap_score = min(avg_gap / 6 * 100, 30)  # 理想间距约为6
        score += gap_score

        return score

    def predict_blue_ball(self, count: int = 1) -> List[int]:
        """
        预测蓝球

        使用高频号码预测

        Args:
            count: 预测个数

        Returns:
            预测的蓝球号码列表
        """
        top_blue_balls = [ball for ball, freq in self.blue_ball_frequency.most_common(count)]
        logger.info(f"预测的蓝球: {top_blue_balls}")
        return top_blue_balls

    def predict(self, count: int = 5, strategies: List[str] = None) -> List[dict]:
        """
        完整预测（支持多策略）

        Args:
            count: 预测组合总数
            strategies: 使用的策略列表（可选）

        Returns:
            预测结果列表
        """
        # 使用指定策略或默认策略
        strategy_names = strategies or self.default_strategies
        
        logger.info(f"使用策略: {', '.join(strategy_names)}")
        
        # 构建上下文数据
        context = {
            'history_data': self.lottery_data,
            'red_frequency': dict(self.red_ball_frequency),
            'blue_frequency': dict(self.blue_ball_frequency),
            'historical_combinations': self.historical_combinations  # 使用完整组合
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
            
            # 如果已经生成足够的组合，停止
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
        """使用指定策略生成预测（优化版：排除完整历史组合）
        
        Args:
            strategy_name: 策略名称
            count: 生成数量
            context: 上下文数据
            existing_predictions: 已生成的预测（用于去重）
            
        Returns:
            预测结果列表
        """
        import time
        
        strategy = get_strategy(strategy_name)
        predictions = []
        max_attempts = min(count * 20, 200)  # 减少尝试次数（优化）
        start_time = time.time()
        max_time = 5.0  # 最大执行时间 5 秒（优化）
        attempts = 0
        duplicate_count = 0  # 统计重复次数
        
        logger.info(f"使用 {strategy.name} 生成 {count} 个组合（已排除 {len(context['historical_combinations'])} 个历史组合）...")
        
        while len(predictions) < count and attempts < max_attempts:
            attempts += 1
            
            # 每 10 次检查一次时间（减少时间检查开销）
            if attempts % 10 == 0 and time.time() - start_time > max_time:
                logger.warning(f"{strategy.name} 预测超时，已生成 {len(predictions)} 个组合")
                break
            
            # 使用策略生成红球和蓝球
            red_balls = strategy.generate_red_balls(context)
            blue_ball = strategy.generate_blue_ball(context)
            
            # 生成 sorted_code（红球排序 + 蓝球）
            sorted_red = sorted(red_balls)
            sorted_code = ','.join([f"{x:02d}" for x in sorted_red]) + f"-{blue_ball:02d}"
            
            # 检查是否与历史组合重复
            is_duplicate = (
                sorted_code in context['historical_combinations'] or
                any(
                    ','.join([f"{x:02d}" for x in sorted(p['red_balls'])]) + f"-{p['blue_ball']:02d}" == sorted_code
                    for p in existing_predictions
                ) or
                any(
                    ','.join([f"{x:02d}" for x in sorted(p['red_balls'])]) + f"-{p['blue_ball']:02d}" == sorted_code
                    for p in predictions
                )
            )
            
            if is_duplicate:
                duplicate_count += 1
            else:
                predictions.append({
                    'red_balls': red_balls,
                    'blue_ball': blue_ball,
                    'sorted_code': sorted_code,
                    'strategy': strategy_name,
                    'strategy_name': strategy.name,
                    'prediction_time': datetime.now().isoformat()
                })
        
        logger.info(f"{strategy.name} 生成了 {len(predictions)} 个组合（尝试 {attempts} 次，排除重复 {duplicate_count} 次）")
        return predictions
    
    @staticmethod
    def get_available_strategies() -> List[dict]:
        """获取所有可用策略
        
        Returns:
            策略列表
        """
        return get_all_strategies()


class SSQStatistics(BaseStatistics):
    """双色球统计类"""

    def __init__(self, lottery_data: List[dict]):
        super().__init__(lottery_data)

    def get_frequency(self) -> dict:
        """获取号码频率统计"""
        red_freq = Counter()
        blue_freq = Counter()

        for data in self.lottery_data:
            for ball in data['red_balls']:
                red_freq[ball] += 1
            blue_freq[data['blue_ball']] += 1

        return {
            'red_balls': dict(sorted(red_freq.items())),
            'blue_ball': dict(sorted(blue_freq.items()))
        }
    
    def get_ball_frequency(self) -> dict:
        """获取号码频率统计（兼容旧接口）"""
        return self.get_frequency()

    def get_consecutive_analysis(self) -> dict:
        """分析连号情况"""
        consecutive_stats = {
            '1个连号': 0,
            '2个连号': 0,
            '3个连号': 0,
            '无连号': 0
        }

        for data in self.lottery_data:
            consecutive_count = self._find_max_consecutive(data['red_balls'])
            if consecutive_count == 0:
                consecutive_stats['无连号'] += 1
            elif consecutive_count == 1:
                consecutive_stats['1个连号'] += 1
            elif consecutive_count == 2:
                consecutive_stats['2个连号'] += 1
            else:
                consecutive_stats['3个连号'] += 1

        return consecutive_stats

    @staticmethod
    def _find_max_consecutive(balls: List[int]) -> int:
        """找出最长连号个数"""
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


if __name__ == '__main__':
    logging.basicConfig(level=logging.INFO)

    # 示例数据
    sample_data = [
        {
            'lottery_no': '2024001',
            'draw_date': '2024-01-01',
            'red_balls': [1, 5, 10, 15, 20, 25],
            'blue_ball': 8
        },
        {
            'lottery_no': '2024002',
            'draw_date': '2024-01-04',
            'red_balls': [2, 6, 11, 16, 21, 26],
            'blue_ball': 12
        }
    ]

    predictor = SSQPredictor(sample_data)
    predictions = predictor.predict()

    print("预测结果:")
    for pred in predictions:
        print(pred)
