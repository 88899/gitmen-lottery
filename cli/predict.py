"""
预测命令
"""

import logging
import os
from core.config import LOG_DIR, LOTTERY_NAMES
from core.utils import load_db_config
from core.telegram_bot import TelegramBot

logger = logging.getLogger(__name__)


def setup_logging(lottery_type: str):
    """设置日志"""
    log_dir = LOG_DIR / lottery_type
    log_dir.mkdir(exist_ok=True)
    
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[
            logging.FileHandler(log_dir / 'predict.log'),
            logging.StreamHandler()
        ]
    )


def predict(lottery_type: str):
    """执行预测"""
    setup_logging(lottery_type)
    
    logger.info("=" * 60)
    logger.info(f"开始预测{LOTTERY_NAMES.get(lottery_type, lottery_type)}下一期号码")
    logger.info("=" * 60)
    
    try:
        if lottery_type == 'ssq':
            from lotteries.ssq.database import SSQDatabase
            from lotteries.ssq.predictor import SSQPredictor, SSQStatistics
            
            db = SSQDatabase(load_db_config())
            db.connect()
            
            # 获取历史数据
            lottery_data = db.get_all_lottery_data()
            
            if not lottery_data:
                logger.error("数据库中没有历史数据，请先运行爬取命令")
                db.close()
                return
            
            logger.info(f"使用 {len(lottery_data)} 条历史数据进行预测")
            
            # 从环境变量读取配置
            default_strategies = os.getenv('DEFAULT_STRATEGIES', 'frequency').split(',')
            default_strategies = [s.strip() for s in default_strategies]
            default_count = int(os.getenv('DEFAULT_PREDICTION_COUNT', '5'))
            
            logger.info(f"使用策略: {', '.join(default_strategies)}")
            logger.info(f"预测条数: {default_count}")
            
            # 创建预测器（使用配置的策略）
            predictor = SSQPredictor(lottery_data, strategies=default_strategies)
            
            # 预测（使用配置的条数）
            predictions = predictor.predict(count=default_count)
            
            # 显示预测结果
            logger.info("\n" + "=" * 60)
            logger.info("预测结果:")
            logger.info("=" * 60)
            
            for i, pred in enumerate(predictions, 1):
                red_str = ','.join([f"{x:02d}" for x in pred['red_balls']])
                blue_str = f"{pred['blue_ball']:02d}"
                strategy_name = pred.get('strategy_name', '')
                
                # 显示策略名称（如果有）
                if strategy_name:
                    logger.info(f"组合 {i} [{strategy_name}]: 红球 {red_str} | 蓝球 {blue_str}")
                else:
                    logger.info(f"组合 {i}: 红球 {red_str} | 蓝球 {blue_str}")
            
            # 显示统计信息
            logger.info("\n" + "=" * 60)
            logger.info("历史数据统计")
            logger.info("=" * 60)
            
            stats = SSQStatistics(lottery_data)
            
            # 红球频率
            freq_data = stats.get_frequency()
            red_freq = freq_data['red_balls']
            top_red = sorted(red_freq.items(), key=lambda x: x[1], reverse=True)[:10]
            logger.info(f"红球频率前10: {[f'{k}({v})' for k, v in top_red]}")
            
            # 蓝球频率
            blue_freq = freq_data['blue_ball']
            top_blue = sorted(blue_freq.items(), key=lambda x: x[1], reverse=True)[:5]
            logger.info(f"蓝球频率前5: {[f'{k}({v})' for k, v in top_blue]}")
            
            # 连号分析
            consecutive = stats.get_consecutive_analysis()
            logger.info(f"连号分析: {consecutive}")
            
            # 最新一期
            latest = db.get_latest_lottery()
            if latest:
                logger.info(f"\n最新一期: {latest['lottery_no']} ({latest['draw_date']})")
                red_str = ','.join([f"{x:02d}" for x in latest['red_balls']])
                logger.info(f"号码: {red_str} + {latest['blue_ball']:02d}")
            
            db.close()
            
            # 发送 Telegram 通知
            logger.info("\n" + "=" * 60)
            logger.info("发送 Telegram 通知")
            logger.info("=" * 60)
            
            bot = TelegramBot()
            
            if not bot.bot_token or not bot.chat_id:
                logger.warning("Telegram 未配置，跳过通知")
            else:
                # 测试连接
                if not bot.test_connection():
                    logger.error("Telegram 连接失败")
                else:
                    # 发送预测结果
                    success = bot.send_prediction('ssq', predictions)
                    if success:
                        logger.info("✓ Telegram 预测发送成功")
                    else:
                        logger.error("✗ Telegram 预测发送失败")
            
        elif lottery_type == 'dlt':
            from lotteries.dlt.database import DLTDatabase
            from lotteries.dlt.predictor import DLTPredictor, DLTStatistics
            
            db = DLTDatabase(load_db_config())
            db.connect()
            
            # 获取历史数据
            lottery_data = db.get_all_lottery_data()
            
            if not lottery_data:
                logger.error("数据库中没有历史数据，请先运行爬取命令")
                db.close()
                return
            
            logger.info(f"使用 {len(lottery_data)} 条历史数据进行预测")
            
            # 从环境变量读取配置
            default_strategies = os.getenv('DEFAULT_STRATEGIES', 'frequency').split(',')
            default_strategies = [s.strip() for s in default_strategies]
            default_count = int(os.getenv('DEFAULT_PREDICTION_COUNT', '5'))
            
            logger.info(f"使用策略: {', '.join(default_strategies)}")
            logger.info(f"预测条数: {default_count}")
            
            # 创建预测器（使用配置的策略）
            predictor = DLTPredictor(lottery_data, strategies=default_strategies)
            
            # 预测（使用配置的条数）
            predictions = predictor.predict(count=default_count)
            
            # 显示预测结果
            logger.info("\n" + "=" * 60)
            logger.info("预测结果:")
            logger.info("=" * 60)
            
            for i, pred in enumerate(predictions, 1):
                front_str = ','.join([f"{x:02d}" for x in pred['front_balls']])
                back_str = ','.join([f"{x:02d}" for x in pred['back_balls']])
                strategy_name = pred.get('strategy_name', '')
                
                # 显示策略名称（如果有）
                if strategy_name:
                    logger.info(f"组合 {i} [{strategy_name}]: 前区 {front_str} | 后区 {back_str}")
                else:
                    logger.info(f"组合 {i}: 前区 {front_str} | 后区 {back_str}")
            
            # 显示统计信息
            logger.info("\n" + "=" * 60)
            logger.info("历史数据统计")
            logger.info("=" * 60)
            
            stats = DLTStatistics(lottery_data)
            
            # 号码频率
            freq_data = stats.get_frequency()
            front_freq = freq_data['front_balls']
            top_front = sorted(front_freq.items(), key=lambda x: x[1], reverse=True)[:10]
            logger.info(f"前区频率前10: {[f'{k}({v})' for k, v in top_front]}")
            
            # 后区频率
            back_freq = freq_data['back_balls']
            top_back = sorted(back_freq.items(), key=lambda x: x[1], reverse=True)[:5]
            logger.info(f"后区频率前5: {[f'{k}({v})' for k, v in top_back]}")
            
            # 连号分析
            consecutive = stats.get_consecutive_analysis()
            logger.info(f"连号分析: {consecutive}")
            
            # 最新一期
            latest = db.get_latest_lottery()
            if latest:
                logger.info(f"\n最新一期: {latest['lottery_no']} ({latest['draw_date']})")
                front_str = ','.join([f"{x:02d}" for x in [int(b) for b in latest['front_balls']]])
                back_str = ','.join([f"{x:02d}" for x in [int(b) for b in latest['back_balls']]])
                logger.info(f"号码: 前区 {front_str} | 后区 {back_str}")
            
            db.close()
            
            # 发送 Telegram 通知
            logger.info("\n" + "=" * 60)
            logger.info("发送 Telegram 通知")
            logger.info("=" * 60)
            
            bot = TelegramBot()
            
            if not bot.bot_token or not bot.chat_id:
                logger.warning("Telegram 未配置，跳过通知")
            else:
                # 测试连接
                if not bot.test_connection():
                    logger.error("Telegram 连接失败")
                else:
                    # 发送预测结果
                    success = bot.send_prediction('dlt', predictions)
                    if success:
                        logger.info("✓ Telegram 预测发送成功")
                    else:
                        logger.error("✗ Telegram 预测发送失败")
            
        elif lottery_type == 'qxc':
            from lotteries.qxc.database import QXCDatabase
            from lotteries.qxc.predictor import QXCPredictor, QXCStatistics
            
            db = QXCDatabase(load_db_config())
            db.connect()
            
            # 获取历史数据
            lottery_data = db.get_all_lottery_data()
            
            if not lottery_data:
                logger.error("数据库中没有历史数据，请先运行爬取命令")
                db.close()
                return
            
            logger.info(f"使用 {len(lottery_data)} 条历史数据进行预测")
            
            # 从环境变量读取配置
            default_strategies = os.getenv('DEFAULT_STRATEGIES', 'frequency').split(',')
            default_strategies = [s.strip() for s in default_strategies]
            default_count = int(os.getenv('DEFAULT_PREDICTION_COUNT', '5'))
            
            logger.info(f"使用策略: {', '.join(default_strategies)}")
            logger.info(f"预测条数: {default_count}")
            
            # 创建预测器
            predictor = QXCPredictor(lottery_data, strategies=default_strategies)
            
            # 预测
            predictions = predictor.predict(count=default_count)
            
            # 显示预测结果
            logger.info("\n" + "=" * 60)
            logger.info("预测结果:")
            logger.info("=" * 60)
            
            for i, pred in enumerate(predictions, 1):
                numbers_str = ' '.join([str(n) for n in pred['numbers']])
                strategy_name = pred.get('strategy_name', '')
                
                if strategy_name:
                    logger.info(f"组合 {i} [{strategy_name}]: {numbers_str}")
                else:
                    logger.info(f"组合 {i}: {numbers_str}")
            
            # 显示统计信息
            logger.info("\n" + "=" * 60)
            logger.info("历史数据统计")
            logger.info("=" * 60)
            
            stats = QXCStatistics(lottery_data)
            
            # 号码频率
            freq_data = stats.get_frequency()
            for pos in range(1, 8):
                pos_freq = freq_data.get(f'position_{pos}', {})
                if pos_freq:
                    top_nums = sorted(pos_freq.items(), key=lambda x: x[1], reverse=True)[:3]
                    logger.info(f"第{pos}位频率前3: {[f'{k}({v})' for k, v in top_nums]}")
            
            # 最新一期
            latest = db.get_latest_lottery()
            if latest:
                logger.info(f"\n最新一期: {latest['lottery_no']} ({latest['draw_date']})")
                numbers_str = ' '.join([str(n) for n in latest['numbers']])
                logger.info(f"号码: {numbers_str}")
            
            db.close()
            
            # 发送 Telegram 通知
            logger.info("\n" + "=" * 60)
            logger.info("发送 Telegram 通知")
            logger.info("=" * 60)
            
            bot = TelegramBot()
            
            if not bot.bot_token or not bot.chat_id:
                logger.warning("Telegram 未配置，跳过通知")
            else:
                if not bot.test_connection():
                    logger.error("Telegram 连接失败")
                else:
                    success = bot.send_prediction('qxc', predictions)
                    if success:
                        logger.info("✓ Telegram 预测发送成功")
                    else:
                        logger.error("✗ Telegram 预测发送失败")
            
        elif lottery_type == 'qlc':
            from lotteries.qlc.database import QLCDatabase
            from lotteries.qlc.predictor import QLCPredictor, QLCStatistics
            
            db = QLCDatabase(load_db_config())
            db.connect()
            
            # 获取历史数据
            lottery_data = db.get_all_lottery_data()
            
            if not lottery_data:
                logger.error("数据库中没有历史数据，请先运行爬取命令")
                db.close()
                return
            
            logger.info(f"使用 {len(lottery_data)} 条历史数据进行预测")
            
            # 从环境变量读取配置
            default_strategies = os.getenv('DEFAULT_STRATEGIES', 'frequency').split(',')
            default_strategies = [s.strip() for s in default_strategies]
            default_count = int(os.getenv('DEFAULT_PREDICTION_COUNT', '5'))
            
            logger.info(f"使用策略: {', '.join(default_strategies)}")
            logger.info(f"预测条数: {default_count}")
            
            # 创建预测器
            predictor = QLCPredictor(lottery_data, strategies=default_strategies)
            
            # 预测
            predictions = predictor.predict(count=default_count)
            
            # 显示预测结果
            logger.info("\n" + "=" * 60)
            logger.info("预测结果:")
            logger.info("=" * 60)
            
            for i, pred in enumerate(predictions, 1):
                basic_str = ' '.join([f"{int(b):02d}" for b in pred['basic_balls']])
                special_str = f"{int(pred['special_ball']):02d}"
                strategy_name = pred.get('strategy_name', '')
                
                if strategy_name:
                    logger.info(f"组合 {i} [{strategy_name}]: {basic_str} + {special_str}")
                else:
                    logger.info(f"组合 {i}: {basic_str} + {special_str}")
            
            # 显示统计信息
            logger.info("\n" + "=" * 60)
            logger.info("历史数据统计")
            logger.info("=" * 60)
            
            stats = QLCStatistics(lottery_data)
            
            # 号码频率
            freq_data = stats.get_frequency()
            basic_freq = freq_data.get('basic_balls', {})
            special_freq = freq_data.get('special_ball', {})
            
            if basic_freq:
                top_basic = sorted(basic_freq.items(), key=lambda x: x[1], reverse=True)[:5]
                logger.info(f"基本号频率前5: {[f'{k}({v})' for k, v in top_basic]}")
            
            if special_freq:
                top_special = sorted(special_freq.items(), key=lambda x: x[1], reverse=True)[:3]
                logger.info(f"特别号频率前3: {[f'{k}({v})' for k, v in top_special]}")
            
            # 最新一期
            latest = db.get_latest_lottery()
            if latest:
                logger.info(f"\n最新一期: {latest['lottery_no']} ({latest['draw_date']})")
                basic_str = ' '.join([f"{int(b):02d}" for b in latest['basic_balls']])
                logger.info(f"基本号: {basic_str}")
                logger.info(f"特别号: {int(latest['special_ball']):02d}")
            
            db.close()
            
            # 发送 Telegram 通知
            logger.info("\n" + "=" * 60)
            logger.info("发送 Telegram 通知")
            logger.info("=" * 60)
            
            bot = TelegramBot()
            
            if not bot.bot_token or not bot.chat_id:
                logger.warning("Telegram 未配置，跳过通知")
            else:
                if not bot.test_connection():
                    logger.error("Telegram 连接失败")
                else:
                    success = bot.send_prediction('qlc', predictions)
                    if success:
                        logger.info("✓ Telegram 预测发送成功")
                    else:
                        logger.error("✗ Telegram 预测发送失败")
            
        else:
            logger.error(f"暂不支持彩票类型: {lottery_type}")
            
    except Exception as e:
        logger.error(f"预测失败: {e}", exc_info=True)
