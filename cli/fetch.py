"""
数据爬取命令（重构版本）
"""

import logging
from core.config import LOG_DIR, LOTTERY_NAMES
from cli.smart_fetch import smart_fetch

logger = logging.getLogger(__name__)


def setup_logging(lottery_type: str):
    """设置日志"""
    log_dir = LOG_DIR / lottery_type
    log_dir.mkdir(exist_ok=True)
    
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[
            logging.FileHandler(log_dir / 'fetch.log'),
            logging.StreamHandler()
        ]
    )


def fetch_full_history(lottery_type: str):
    """爬取全量历史数据（重构版本）"""
    setup_logging(lottery_type)
    
    logger.info("=" * 60)
    logger.info(f"开始爬取{LOTTERY_NAMES.get(lottery_type, lottery_type)}全量历史数据")
    logger.info("=" * 60)
    
    # 调用统一的智能爬取方法
    result = smart_fetch(lottery_type, mode='full')
    
    if result.get('success'):
        logger.info("=" * 60)
        logger.info(f"✅ {result['lottery_name']}全量爬取完成")
        logger.info(f"爬取年份数: {result.get('year_count', 0)}")
        logger.info(f"新增数据: {result.get('inserted', 0)} 条")
        logger.info(f"数据库总记录数: {result.get('total', 0)}")
        if result.get('latest'):
            latest = result['latest']
            logger.info(f"最新一期: {latest['lottery_no']} ({latest['draw_date']})")
        logger.info("=" * 60)
    else:
        logger.error(f"全量爬取失败: {result.get('error', '未知错误')}")


def fetch_incremental_data(lottery_type: str, with_predict: bool = False):
    """增量爬取最新数据（重构版本）"""
    logger.info("=" * 60)
    logger.info(f"增量爬取 {LOTTERY_NAMES.get(lottery_type, lottery_type)}")
    logger.info("=" * 60)
    
    # 调用统一的智能爬取方法
    result = smart_fetch(lottery_type, mode='incremental', with_predict=with_predict)
    
    if result.get('success'):
        # 显示最新一期信息
        if result.get('latest'):
            latest = result['latest']
            logger.info(f"最新一期: {latest['lottery_no']} ({latest['draw_date']})")
            
            # 根据彩票类型显示号码
            if lottery_type == 'ssq':
                logger.info(f"号码: {latest['red_balls']} + {latest['blue_ball']}")
            elif lottery_type == 'dlt':
                front_str = ','.join([f"{int(b):02d}" for b in latest['front_balls']])
                back_str = ','.join([f"{int(b):02d}" for b in latest['back_balls']])
                logger.info(f"号码: 前区 {front_str} | 后区 {back_str}")
            elif lottery_type == 'qxc':
                numbers_str = ' '.join([str(n) for n in latest['numbers']])
                logger.info(f"号码: {numbers_str}")
            elif lottery_type == 'qlc':
                basic_str = ' '.join([f"{int(b):02d}" for b in latest['basic_balls']])
                logger.info(f"基本号: {basic_str}")
                logger.info(f"特别号: {int(latest['special_ball']):02d}")
        
        # 显示预测结果
        if result.get('predictions'):
            predictions = result['predictions']
            logger.info(f"预测结果（共 {len(predictions)} 组）:")
            for i, pred in enumerate(predictions, 1):
                if lottery_type == 'ssq':
                    logger.info(f"  组合 {i}: {pred['red_balls']} + {pred['blue_ball']}")
                elif lottery_type == 'dlt':
                    front_str = ','.join([f"{int(b):02d}" for b in pred['front_balls']])
                    back_str = ','.join([f"{int(b):02d}" for b in pred['back_balls']])
                    logger.info(f"  组合 {i}: 前区 {front_str} | 后区 {back_str}")
                elif lottery_type == 'qxc':
                    numbers_str = ' '.join([str(n) for n in pred['numbers']])
                    logger.info(f"  组合 {i}: {numbers_str}")
                elif lottery_type == 'qlc':
                    basic_str = ' '.join([f"{int(b):02d}" for b in pred['basic_balls']])
                    logger.info(f"  组合 {i}: {basic_str} + {int(pred['special_ball']):02d}")
    
    return result


def fetch_latest(lottery_type: str):
    """增量爬取最新数据（CLI 入口）"""
    setup_logging(lottery_type)
    
    # 调用核心方法
    fetch_incremental_data(lottery_type, with_predict=False)
