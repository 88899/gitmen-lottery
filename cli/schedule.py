"""
定时任务命令
"""

import logging
from apscheduler.schedulers.blocking import BlockingScheduler
from datetime import datetime
from core.config import LOG_DIR, LOTTERY_NAMES
from core.utils import load_db_config

logger = logging.getLogger(__name__)


def setup_logging(lottery_type: str):
    """设置日志"""
    log_dir = LOG_DIR / lottery_type
    log_dir.mkdir(exist_ok=True)
    
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[
            logging.FileHandler(log_dir / 'schedule.log'),
            logging.StreamHandler()
        ]
    )


def fetch_and_predict_single(lottery_type: str):
    """单个彩票类型的增量爬取和预测"""
    logger.info(f"\n{'=' * 60}")
    logger.info(f"处理 {LOTTERY_NAMES.get(lottery_type, lottery_type)}")
    logger.info(f"{'=' * 60}")
    
    try:
        if lottery_type == 'ssq':
            from lotteries.ssq.spider import SSQSpider
            from lotteries.ssq.database import SSQDatabase
            
            spider = SSQSpider(timeout=15, retry_times=3)
            db = SSQDatabase(load_db_config())
            
            db.connect()
            db.create_table()
            
            current_year = datetime.now().year
            year_short = str(current_year)[2:]
            start_issue = f"{year_short}001"
            end_issue = f"{year_short}200"
            
            logger.info(f"爬取 {current_year} 年最新数据")
            
            data = spider.fetch_500com_data(start_issue, end_issue)
            
            if data:
                logger.info(f"获取 {len(data)} 条数据")
                inserted, duplicated, skipped = db.insert_lottery_data(data, skip_existing=True)
                logger.info(f"入库: 新增 {inserted} 条，重复 {duplicated} 条，跳过 {skipped} 条")
                
                if inserted > 0:
                    logger.info(f"✓ 发现并入库 {inserted} 条新数据")
                else:
                    logger.info("✓ 暂无新数据")
            else:
                logger.warning("未获取到数据")
            
            # 显示最新一期
            latest = db.get_latest_lottery()
            if latest:
                logger.info(f"最新一期: {latest['lottery_no']} ({latest['draw_date']})")
                logger.info(f"号码: {latest['red_balls']} + {latest['blue_ball']}")
            
            # 预测下一期
            logger.info("\n开始预测下一期号码...")
            from lotteries.ssq.predictor import SSQPredictor
            
            # 获取历史数据用于预测
            history_data = db.get_latest_lotteries(limit=200)
            predictor = SSQPredictor(history_data)
            predictions = predictor.predict(count=5)
            
            logger.info(f"预测结果（共 {len(predictions)} 组）:")
            for i, pred in enumerate(predictions, 1):
                logger.info(f"  组合 {i}: {pred['red_balls']} + {pred['blue_ball']}")
            
            db.close()
            
            return {
                'lottery_type': lottery_type,
                'lottery_name': LOTTERY_NAMES.get(lottery_type),
                'inserted': inserted,
                'latest': latest,
                'predictions': predictions
            }
            
        elif lottery_type == 'dlt':
            from lotteries.dlt.spider import DLTSpider
            from lotteries.dlt.database import DLTDatabase
            
            spider = DLTSpider(timeout=15, retry_times=3)
            db = DLTDatabase(load_db_config())
            
            db.connect()
            db.create_table()
            
            current_year = datetime.now().year
            year_short = str(current_year)[2:]
            start_issue = f"{year_short}001"
            end_issue = f"{year_short}200"
            
            logger.info(f"爬取 {current_year} 年最新数据")
            
            data = spider.fetch_500com_data(start_issue, end_issue)
            
            if data:
                logger.info(f"获取 {len(data)} 条数据")
                inserted, duplicated, skipped = db.insert_lottery_data(data, skip_existing=True)
                logger.info(f"入库: 新增 {inserted} 条，重复 {duplicated} 条，跳过 {skipped} 条")
                
                if inserted > 0:
                    logger.info(f"✓ 发现并入库 {inserted} 条新数据")
                else:
                    logger.info("✓ 暂无新数据")
            else:
                logger.warning("未获取到数据")
            
            # 显示最新一期
            latest = db.get_latest_lottery()
            if latest:
                logger.info(f"最新一期: {latest['lottery_no']} ({latest['draw_date']})")
                front_str = ','.join([f"{int(b):02d}" for b in latest['front_balls']])
                back_str = ','.join([f"{int(b):02d}" for b in latest['back_balls']])
                logger.info(f"号码: 前区 {front_str} | 后区 {back_str}")
            
            # 预测下一期
            logger.info("\n开始预测下一期号码...")
            from lotteries.dlt.predictor import DLTPredictor
            
            # 获取历史数据用于预测
            history_data = db.get_latest_lotteries(limit=200)
            predictor = DLTPredictor(history_data)
            predictions = predictor.predict(count=5)
            
            db.close()
            
            logger.info(f"预测结果（共 {len(predictions)} 组）:")
            for i, pred in enumerate(predictions, 1):
                front_str = ','.join([f"{int(b):02d}" for b in pred['front_balls']])
                back_str = ','.join([f"{int(b):02d}" for b in pred['back_balls']])
                logger.info(f"  组合 {i}: 前区 {front_str} | 后区 {back_str}")
            
            db.close()
            
            return {
                'lottery_type': lottery_type,
                'lottery_name': LOTTERY_NAMES.get(lottery_type),
                'inserted': inserted,
                'latest': latest,
                'predictions': predictions
            }
            
        else:
            logger.error(f"暂不支持彩票类型: {lottery_type}")
            return None
            
    except Exception as e:
        logger.error(f"{LOTTERY_NAMES.get(lottery_type, lottery_type)} 处理失败: {e}", exc_info=True)
        return None


def fetch_latest_data():
    """增量爬取所有彩票类型的最新数据并预测"""
    logger.info("=" * 60)
    logger.info(f"定时任务开始: {datetime.now()}")
    logger.info("=" * 60)
    
    results = []
    
    # 处理双色球
    ssq_result = fetch_and_predict_single('ssq')
    if ssq_result:
        results.append(ssq_result)
    
    # 处理大乐透
    dlt_result = fetch_and_predict_single('dlt')
    if dlt_result:
        results.append(dlt_result)
    
    # 发送 Telegram 通知
    if results:
        try:
            from core.telegram_bot import TelegramBot
            telegram = TelegramBot()
            
            # 构建综合消息
            message = "🎰 <b>彩票预测系统 - 每日更新</b>\n\n"
            
            for result in results:
                message += f"━━━━━━━━━━━━━━━━━━━━━━━━\n"
                message += f"<b>{result['lottery_name']}</b>\n\n"
                
                if result['inserted'] > 0:
                    latest = result['latest']
                    
                    if result['lottery_type'] == 'ssq':
                        message += f"📅 最新开奖: {latest['lottery_no']} ({latest['draw_date']})\n"
                        message += f"🔴 号码: {latest['red_balls']} + {latest['blue_ball']}\n\n"
                    else:  # dlt
                        front_str = ','.join([f"{int(b):02d}" for b in latest['front_balls']])
                        back_str = ','.join([f"{int(b):02d}" for b in latest['back_balls']])
                        message += f"📅 最新开奖: {latest['lottery_no']} ({latest['draw_date']})\n"
                        message += f"🔴 号码: 前区 {front_str} | 后区 {back_str}\n\n"
                    
                    # 预测结果
                    message += f"🔮 <b>预测下一期（{len(result['predictions'])} 组）</b>\n"
                    for i, pred in enumerate(result['predictions'][:3], 1):  # 只显示前3组
                        if result['lottery_type'] == 'ssq':
                            message += f"  {i}. {pred['red_balls']} + {pred['blue_ball']}\n"
                        else:  # dlt
                            front_str = ','.join([f"{int(b):02d}" for b in pred['front_balls']])
                            back_str = ','.join([f"{int(b):02d}" for b in pred['back_balls']])
                            message += f"  {i}. {front_str} | {back_str}\n"
                    
                    if len(result['predictions']) > 3:
                        message += f"  ... 还有 {len(result['predictions']) - 3} 组\n"
                else:
                    message += "✅ 暂无新数据\n"
                
                message += "\n"
            
            message += "━━━━━━━━━━━━━━━━━━━━━━━━\n"
            message += f"⏰ 更新时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n"
            
            telegram.send_message(message)
            logger.info("✓ Telegram 通知已发送")
            
        except Exception as e:
            logger.error(f"发送 Telegram 通知失败: {e}", exc_info=True)
    
    logger.info("=" * 60)
    logger.info(f"定时任务结束: {datetime.now()}")
    logger.info("=" * 60 + "\n")


def start_schedule(lottery_type: str = None):
    """启动定时任务
    
    Args:
        lottery_type: 彩票类型，如果为 None 则处理所有类型
    """
    # 使用通用日志目录
    log_dir = LOG_DIR / 'schedule'
    log_dir.mkdir(exist_ok=True)
    
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[
            logging.FileHandler(log_dir / 'schedule.log'),
            logging.StreamHandler()
        ]
    )
    
    scheduler = BlockingScheduler()
    
    # 每天晚上21:30执行（开奖后1小时）
    scheduler.add_job(
        fetch_latest_data,
        'cron',
        hour=21,
        minute=30
    )
    
    logger.info("=" * 60)
    logger.info("定时任务已启动 - 所有彩票类型")
    logger.info("执行时间: 每天 21:30")
    logger.info("处理类型: 双色球 + 大乐透")
    logger.info("按 Ctrl+C 停止")
    logger.info("=" * 60)
    
    # 启动时立即执行一次
    logger.info("\n首次执行...")
    fetch_latest_data()
    
    try:
        scheduler.start()
    except (KeyboardInterrupt, SystemExit):
        logger.info("\n定时任务已停止")
