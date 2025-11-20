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
    """单个彩票类型的增量爬取和预测（重构版本）"""
    logger.info(f"处理 {LOTTERY_NAMES.get(lottery_type, lottery_type)}")
    
    # 调用统一的智能爬取方法
    from cli.smart_fetch import smart_fetch
    return smart_fetch(lottery_type, mode='incremental', with_predict=True)


def fetch_latest_data():
    """增量爬取所有彩票类型的最新数据并预测"""
    logger.info(f"定时任务开始: {datetime.now()}")
    
    results = []
    
    # 处理双色球
    ssq_result = fetch_and_predict_single('ssq')
    if ssq_result:
        results.append(ssq_result)
    
    # 处理大乐透
    dlt_result = fetch_and_predict_single('dlt')
    if dlt_result:
        results.append(dlt_result)
    
    # 处理七星彩
    qxc_result = fetch_and_predict_single('qxc')
    if qxc_result:
        results.append(qxc_result)
    
    # 处理七乐彩
    qlc_result = fetch_and_predict_single('qlc')
    if qlc_result:
        results.append(qlc_result)
    
    # 发送 Telegram 通知
    if results:
        try:
            from core.telegram_bot import TelegramBot
            telegram = TelegramBot()
            
            # 为每个彩票类型单独发送消息
            for result in results:
                predictions = result.get('predictions', [])
                
                # 只发送有预测结果的彩票类型
                if not predictions:
                    logger.info(f"跳过 {result['lottery_name']}：无预测结果")
                    continue
                
                # 构建单个彩票类型的消息
                message = f"🔮 <b>{result['lottery_name']}预测</b>\n\n"
                
                # 显示所有预测组合
                for i, pred in enumerate(predictions, 1):
                    strategy_name = pred.get('strategy_name', pred.get('strategy', '未知策略'))
                    
                    message += f"<b>组合 {i}: [{strategy_name}]</b>\n"
                    
                    if result['lottery_type'] == 'ssq':
                        red_str = ' '.join([f"{int(b):02d}" for b in pred['red_balls']])
                        message += f"🔴 红球: <code>{red_str}</code>\n"
                        message += f"🔵 蓝球: <code>{int(pred['blue_ball']):02d}</code>\n\n"
                    elif result['lottery_type'] == 'dlt':
                        front_str = ' '.join([f"{int(b):02d}" for b in pred['front_balls']])
                        back_str = ' '.join([f"{int(b):02d}" for b in pred['back_balls']])
                        message += f"🔴 前区: <code>{front_str}</code>\n"
                        message += f"🔵 后区: <code>{back_str}</code>\n\n"
                    elif result['lottery_type'] == 'qxc':
                        numbers_str = ' '.join([str(n) for n in pred['numbers']])
                        message += f"🔢 号码: <code>{numbers_str}</code>\n\n"
                    elif result['lottery_type'] == 'qlc':
                        basic_str = ' '.join([f"{int(b):02d}" for b in pred['basic_balls']])
                        special_str = f"{int(pred['special_ball']):02d}"
                        message += f"🔴 基本号: <code>{basic_str}</code>\n"
                        message += f"🔵 特别号: <code>{special_str}</code>\n\n"
                
                message += "━━━━━━━━━━━━━━━\n"
                message += "⚠️ 仅供参考，理性购彩"
                
                # 发送单个彩票类型的消息
                telegram.send_message(message)
                logger.info(f"✓ {result['lottery_name']} Telegram 通知已发送")
            
        except Exception as e:
            logger.error(f"发送 Telegram 通知失败: {e}", exc_info=True)
    
    logger.info(f"定时任务结束: {datetime.now()}")


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
    
    logger.info("定时任务已启动 - 每天 21:30 执行（双色球 + 大乐透 + 七星彩 + 七乐彩）")
    logger.info("按 Ctrl+C 停止")
    
    # 启动时立即执行一次
    logger.info("\n首次执行...")
    fetch_latest_data()
    
    try:
        scheduler.start()
    except (KeyboardInterrupt, SystemExit):
        logger.info("定时任务已停止")
