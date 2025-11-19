"""
数据爬取命令
"""

import logging
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
            logging.FileHandler(log_dir / 'fetch.log'),
            logging.StreamHandler()
        ]
    )


def fetch_full_history(lottery_type: str):
    """
    爬取全量历史数据（逐年推进模式）
    
    循环爬取所有缺失年份，直到完成
    避免访问量过大，智能判断何时停止
    """
    setup_logging(lottery_type)
    
    logger.info("=" * 60)
    logger.info(f"开始爬取{LOTTERY_NAMES.get(lottery_type, lottery_type)}全量历史数据（逐年推进模式）")
    logger.info("=" * 60)
    
    try:
        # 获取起始年份
        start_years = {'ssq': 2003, 'dlt': 2007}
        if lottery_type not in start_years:
            logger.error(f"暂不支持彩票类型: {lottery_type}")
            return
        
        start_year = start_years[lottery_type]
        current_year = datetime.now().year
        
        logger.info(f"彩票类型: {LOTTERY_NAMES.get(lottery_type)}")
        logger.info(f"起始年份: {start_year}")
        logger.info(f"当前年份: {current_year}")
        
        # 动态导入对应的模块
        if lottery_type == 'ssq':
            from lotteries.ssq.spider import SSQSpider
            from lotteries.ssq.database import SSQDatabase
            
            spider = SSQSpider(timeout=15, retry_times=3)
            db = SSQDatabase(load_db_config())
            
            db.connect()
            db.create_table()
            
            total_inserted = 0
            year_count = 0
            
            # 循环爬取所有缺失年份
            while True:
                # 查找数据库中缺失的年份（从最早年份往后查找）
                target_year = None
                
                for year in range(start_year, current_year + 1):
                    year_short = str(year)[2:]
                    first_issue = f"20{year_short}001"  # 7位格式：2003001
                    
                    # 检查该年份的第一期是否存在
                    latest = db.get_latest_lottery()
                    if not latest or latest['lottery_no'] < first_issue:
                        target_year = year
                        break
                
                # 如果没有找到缺失的年份，说明数据已完整
                if not target_year:
                    total = db.get_total_count('ssq_lottery')
                    latest = db.get_latest_lottery()
                    
                    logger.info("\n" + "=" * 60)
                    logger.info("✅ 双色球全量爬取完成")
                    logger.info("=" * 60)
                    logger.info(f"爬取年份数: {year_count}")
                    logger.info(f"新增数据: {total_inserted} 条")
                    logger.info(f"数据库总记录数: {total}")
                    if latest:
                        logger.info(f"最新一期: {latest['lottery_no']} ({latest['draw_date']})")
                        logger.info(f"号码: {latest['red_balls']} + {latest['blue_ball']}")
                    logger.info("=" * 60)
                    
                    db.close()
                    return
                
                # 爬取目标年份的数据
                year_count += 1
                year_short = str(target_year)[2:]
                start_issue = f"{year_short}001"  # 5位格式：03001
                end_issue = f"{year_short}200"    # 5位格式：03200
                
                logger.info(f"\n📅 爬取第 {year_count} 年: {target_year} 年数据 (期号: {start_issue} - {end_issue})")
                
                # 使用统一的 fetch 方法爬取该年度数据
                data = spider.fetch(start_issue=start_issue, end_issue=end_issue)
                
                if not data or len(data) == 0:
                    logger.warning(f"   ⚠️ {target_year} 年无数据，跳过")
                    continue
                
                logger.info(f"   ✅ 获取 {len(data)} 条数据")
                
                # 批量插入（自动跳过已存在的数据）
                inserted, duplicated, skipped = db.insert_lottery_data(data, skip_existing=True)
                logger.info(f"   ✅ 入库: 新增 {inserted} 条，重复 {duplicated} 条，跳过 {skipped} 条")
                
                total_inserted += inserted
                
                # 添加延迟，避免访问过于频繁
                import time
                time.sleep(2)
            
        elif lottery_type == 'dlt':
            from lotteries.dlt.spider import DLTSpider
            from lotteries.dlt.database import DLTDatabase
            
            spider = DLTSpider(timeout=15, retry_times=3)
            db = DLTDatabase(load_db_config())
            
            db.connect()
            db.create_table()
            
            total_inserted = 0
            year_count = 0
            
            # 循环爬取所有缺失年份
            while True:
                # 查找数据库中缺失的年份（从最早年份往后查找）
                target_year = None
                
                for year in range(start_year, current_year + 1):
                    year_short = str(year)[2:]
                    first_issue = f"20{year_short}001"  # 7位格式：2007001
                    
                    # 检查该年份的第一期是否存在
                    latest = db.get_latest_lottery()
                    if not latest or latest['lottery_no'] < first_issue:
                        target_year = year
                        break
                
                # 如果没有找到缺失的年份，说明数据已完整
                if not target_year:
                    total = db.get_total_count('dlt_lottery')
                    latest = db.get_latest_lottery()
                    
                    logger.info("\n" + "=" * 60)
                    logger.info("✅ 大乐透全量爬取完成")
                    logger.info("=" * 60)
                    logger.info(f"爬取年份数: {year_count}")
                    logger.info(f"新增数据: {total_inserted} 条")
                    logger.info(f"数据库总记录数: {total}")
                    if latest:
                        logger.info(f"最新一期: {latest['lottery_no']} ({latest['draw_date']})")
                        front_str = ','.join([f"{int(b):02d}" for b in latest['front_balls']])
                        back_str = ','.join([f"{int(b):02d}" for b in latest['back_balls']])
                        logger.info(f"号码: 前区 {front_str} | 后区 {back_str}")
                    logger.info("=" * 60)
                    
                    db.close()
                    return
                
                # 爬取目标年份的数据
                year_count += 1
                year_short = str(target_year)[2:]
                start_issue = f"{year_short}001"  # 5位格式：07001
                end_issue = f"{year_short}200"    # 5位格式：07200
                
                logger.info(f"\n📅 爬取第 {year_count} 年: {target_year} 年数据 (期号: {start_issue} - {end_issue})")
                
                # 使用统一的 fetch 方法爬取该年度数据
                data = spider.fetch(start_issue=start_issue, end_issue=end_issue)
                
                if not data or len(data) == 0:
                    logger.warning(f"   ⚠️ {target_year} 年无数据，跳过")
                    continue
                
                logger.info(f"   ✅ 获取 {len(data)} 条数据")
                
                # 批量插入（自动跳过已存在的数据）
                inserted, duplicated, skipped = db.insert_lottery_data(data, skip_existing=True)
                logger.info(f"   ✅ 入库: 新增 {inserted} 条，重复 {duplicated} 条，跳过 {skipped} 条")
                
                total_inserted += inserted
                
                # 添加延迟，避免访问过于频繁
                import time
                time.sleep(2)
        
    except Exception as e:
        logger.error(f"全量爬取失败: {e}", exc_info=True)


def fetch_incremental_data(lottery_type: str, with_predict: bool = False):
    """
    增量爬取最新数据（核心方法）
    
    Args:
        lottery_type: 彩票类型 ('ssq' 或 'dlt')
        with_predict: 是否在爬取后进行预测（定时任务使用）
        
    Returns:
        dict: 包含爬取结果和预测结果（如果 with_predict=True）
    """
    logger.info(f"{'=' * 60}")
    logger.info(f"增量爬取 {LOTTERY_NAMES.get(lottery_type, lottery_type)}")
    logger.info(f"{'=' * 60}")
    
    try:
        if lottery_type == 'ssq':
            from lotteries.ssq.spider import SSQSpider
            from lotteries.ssq.database import SSQDatabase
            from lotteries.ssq.config import START_YEAR
            
            spider = SSQSpider(timeout=15, retry_times=3)
            db = SSQDatabase(load_db_config())
            
            db.connect()
            db.create_table()
            
            # 获取数据库中最新期号
            latest_in_db = db.get_latest_lottery()
            
            # 确定爬取范围
            current_year = datetime.now().year
            year_short = str(current_year)[2:]
            
            if latest_in_db:
                # 从数据库最新期号的下一期开始爬取（逐年模式）
                latest_no = latest_in_db['lottery_no']
                logger.info(f"数据库最新期号: {latest_no}")
                
                # 解析期号：2025001 -> 25, 001
                year_part = latest_no[2:4]
                issue_part = int(latest_no[4:])
                
                # 下一期
                next_issue = issue_part + 1
                
                # 检查是否跨年
                if next_issue > 200:
                    # 跨年：进入下一年的第一期
                    next_year = int(year_part) + 1
                    start_issue = f"{next_year:02d}001"
                    end_issue = f"{next_year:02d}200"
                    logger.info(f"跨年爬取：从 {2000 + next_year} 年开始（逐年模式）")
                else:
                    # 同年：继续当年的期号
                    start_issue = f"{year_part}{next_issue:03d}"
                    end_issue = f"{year_part}200"
                    logger.info(f"同年爬取：继续 {2000 + int(year_part)} 年（逐年模式）")
            else:
                # 数据库为空，从起始年份开始（逐年爬取）
                start_year_short = str(START_YEAR)[2:]
                start_issue = f"{start_year_short}001"
                
                # 逐年爬取：只爬取起始年份的数据
                end_issue = f"{start_year_short}200"
                logger.info(f"数据库为空，从起始年份 {START_YEAR} 开始（逐年爬取）")
            
            logger.info(f"爬取期号范围: {start_issue} - {end_issue}")
            
            # 调用统一的 fetch 方法
            data = spider.fetch(start_issue=start_issue, end_issue=end_issue)
            
            inserted = 0
            if data:
                logger.info(f"获取 {len(data)} 条数据")
                inserted, duplicated, skipped = db.insert_lottery_data(data, skip_existing=True)
                logger.info(f"入库: 新增 {inserted} 条，重复 {duplicated} 条，跳过 {skipped} 条")
                
                if inserted > 0:
                    logger.info(f"✓ 发现并入库 {inserted} 条新数据")
                else:
                    logger.info("✓ 暂无新数据")
            else:
                logger.info("✓ 暂无新数据")
            
            # 显示最新一期
            latest = db.get_latest_lottery()
            if latest:
                logger.info(f"\n最新一期: {latest['lottery_no']} ({latest['draw_date']})")
                logger.info(f"号码: {latest['red_balls']} + {latest['blue_ball']}")
            
            result = {
                'lottery_type': lottery_type,
                'lottery_name': LOTTERY_NAMES.get(lottery_type),
                'inserted': inserted,
                'latest': latest
            }
            
            # 如果需要预测
            if with_predict:
                # 获取最新数据用于预测（如果没有latest，重新获取）
                prediction_latest = latest or db.get_latest_lottery()
                
                if prediction_latest:
                    logger.info("\n开始预测下一期号码...")
                    from lotteries.ssq.predictor import SSQPredictor
                    from core.config import DEFAULT_STRATEGIES, DEFAULT_PREDICTION_COUNT
                    
                    history_data = db.get_all_lottery_data()
                    predictor = SSQPredictor(history_data, strategies=DEFAULT_STRATEGIES)
                    predictions = predictor.predict(count=DEFAULT_PREDICTION_COUNT)
                    
                    logger.info(f"预测结果（共 {len(predictions)} 组）:")
                    for i, pred in enumerate(predictions, 1):
                        logger.info(f"  组合 {i}: {pred['red_balls']} + {pred['blue_ball']}")
                    
                    result['predictions'] = predictions
                    # 如果没有latest，使用prediction_latest
                    if not latest:
                        result['latest'] = prediction_latest
                else:
                    logger.warning("数据库中没有历史数据，无法进行预测")
                    result['predictions'] = []
            
            db.close()
            return result
            
        elif lottery_type == 'dlt':
            from lotteries.dlt.spider import DLTSpider
            from lotteries.dlt.database import DLTDatabase
            from lotteries.dlt.config import START_YEAR
            
            spider = DLTSpider(timeout=15, retry_times=3)
            db = DLTDatabase(load_db_config())
            
            db.connect()
            db.create_table()
            
            # 获取数据库中最新期号
            latest_in_db = db.get_latest_lottery()
            
            # 确定爬取范围
            current_year = datetime.now().year
            year_short = str(current_year)[2:]
            
            if latest_in_db:
                # 从数据库最新期号的下一期开始爬取（逐年模式）
                latest_no = latest_in_db['lottery_no']
                logger.info(f"数据库最新期号: {latest_no}")
                
                # 解析期号：2025001 -> 25, 001
                year_part = latest_no[2:4]
                issue_part = int(latest_no[4:])
                
                # 下一期
                next_issue = issue_part + 1
                
                # 检查是否跨年
                if next_issue > 200:
                    # 跨年：进入下一年的第一期
                    next_year = int(year_part) + 1
                    start_issue = f"{next_year:02d}001"
                    end_issue = f"{next_year:02d}200"
                    logger.info(f"跨年爬取：从 {2000 + next_year} 年开始（逐年模式）")
                else:
                    # 同年：继续当年的期号
                    start_issue = f"{year_part}{next_issue:03d}"
                    end_issue = f"{year_part}200"
                    logger.info(f"同年爬取：继续 {2000 + int(year_part)} 年（逐年模式）")
            else:
                # 数据库为空，从起始年份开始（逐年爬取）
                start_year_short = str(START_YEAR)[2:]
                start_issue = f"{start_year_short}001"
                
                # 逐年爬取：只爬取起始年份的数据
                end_issue = f"{start_year_short}200"
                logger.info(f"数据库为空，从起始年份 {START_YEAR} 开始（逐年爬取）")
            
            logger.info(f"爬取期号范围: {start_issue} - {end_issue}")
            
            # 调用统一的 fetch 方法
            data = spider.fetch(start_issue=start_issue, end_issue=end_issue)
            
            inserted = 0
            if data:
                logger.info(f"获取 {len(data)} 条数据")
                inserted, duplicated, skipped = db.insert_lottery_data(data, skip_existing=True)
                logger.info(f"入库: 新增 {inserted} 条，重复 {duplicated} 条，跳过 {skipped} 条")
                
                if inserted > 0:
                    logger.info(f"✓ 发现并入库 {inserted} 条新数据")
                else:
                    logger.info("✓ 暂无新数据")
            else:
                logger.info("✓ 暂无新数据")
            
            # 显示最新一期
            latest = db.get_latest_lottery()
            if latest:
                logger.info(f"\n最新一期: {latest['lottery_no']} ({latest['draw_date']})")
                front_str = ','.join([f"{int(b):02d}" for b in latest['front_balls']])
                back_str = ','.join([f"{int(b):02d}" for b in latest['back_balls']])
                logger.info(f"号码: 前区 {front_str} | 后区 {back_str}")
            
            result = {
                'lottery_type': lottery_type,
                'lottery_name': LOTTERY_NAMES.get(lottery_type),
                'inserted': inserted,
                'latest': latest
            }
            
            # 如果需要预测
            if with_predict:
                # 获取最新数据用于预测（如果没有latest，重新获取）
                prediction_latest = latest or db.get_latest_lottery()
                
                if prediction_latest:
                    logger.info("\n开始预测下一期号码...")
                    from lotteries.dlt.predictor import DLTPredictor
                    from core.config import DEFAULT_STRATEGIES, DEFAULT_PREDICTION_COUNT
                    
                    history_data = db.get_all_lottery_data()
                    predictor = DLTPredictor(history_data, strategies=DEFAULT_STRATEGIES)
                    predictions = predictor.predict(count=DEFAULT_PREDICTION_COUNT)
                    
                    logger.info(f"预测结果（共 {len(predictions)} 组）:")
                    for i, pred in enumerate(predictions, 1):
                        front_str = ','.join([f"{int(b):02d}" for b in pred['front_balls']])
                        back_str = ','.join([f"{int(b):02d}" for b in pred['back_balls']])
                        logger.info(f"  组合 {i}: 前区 {front_str} | 后区 {back_str}")
                    
                    result['predictions'] = predictions
                    # 如果没有latest，使用prediction_latest
                    if not latest:
                        result['latest'] = prediction_latest
                else:
                    logger.warning("数据库中没有历史数据，无法进行预测")
                    result['predictions'] = []
            
            db.close()
            return result
            
        else:
            logger.error(f"暂不支持彩票类型: {lottery_type}")
            return None
            
    except Exception as e:
        logger.error(f"处理失败: {e}", exc_info=True)
        return None


def fetch_latest(lottery_type: str):
    """增量爬取最新数据（CLI 入口）"""
    setup_logging(lottery_type)
    
    logger.info("=" * 60)
    logger.info(f"增量爬取{LOTTERY_NAMES.get(lottery_type, lottery_type)}最新数据")
    logger.info("=" * 60)
    
    # 调用核心方法
    fetch_incremental_data(lottery_type, with_predict=False)
