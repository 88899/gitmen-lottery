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
    """爬取全量历史数据"""
    setup_logging(lottery_type)
    
    logger.info("=" * 60)
    logger.info(f"开始爬取{LOTTERY_NAMES.get(lottery_type, lottery_type)}全量历史数据")
    logger.info("=" * 60)
    
    # 动态导入对应的模块
    try:
        if lottery_type == 'ssq':
            from lotteries.ssq.spider import SSQSpider
            from lotteries.ssq.database import SSQDatabase
            
            spider = SSQSpider(timeout=15, retry_times=3)
            db = SSQDatabase(load_db_config())
            
            db.connect()
            db.create_table()
            
            # 双色球从2003年开始
            current_year = datetime.now().year
            start_year = 2003
            
            total_inserted = 0
            total_skipped = 0
            
            for year in range(start_year, current_year + 1):
                year_short = str(year)[2:]
                start_issue = f"{year_short}001"
                end_issue = f"{year_short}200"
                
                logger.info(f"\n爬取 {year} 年数据 (期号: {start_issue} - {end_issue})")
                
                try:
                    year_data = spider.fetch_500com_data(start_issue, end_issue)
                    
                    if year_data:
                        logger.info(f"  获取 {len(year_data)} 条数据")
                        inserted, duplicated, skipped = db.insert_lottery_data(year_data, skip_existing=True)
                        logger.info(f"  入库: 新增 {inserted} 条，重复 {duplicated} 条，跳过 {skipped} 条")
                        total_inserted += inserted
                        total_skipped += skipped
                    else:
                        logger.warning(f"  {year} 年无数据")
                        
                except Exception as e:
                    logger.error(f"  爬取 {year} 年失败: {e}")
                    continue
            
            logger.info("\n" + "=" * 60)
            logger.info(f"爬取完成，新增 {total_inserted} 条，跳过 {total_skipped} 条")
            logger.info("=" * 60)
            
            # 显示统计
            total = db.get_total_count('ssq_lottery')
            latest = db.get_latest_lottery()
            
            logger.info(f"数据库总记录数: {total}")
            if latest:
                logger.info(f"最新一期: {latest['lottery_no']} ({latest['draw_date']})")
                logger.info(f"号码: {latest['red_balls']} + {latest['blue_ball']}")
            
            db.close()
            
        elif lottery_type == 'dlt':
            from lotteries.dlt.spider import DLTSpider
            from lotteries.dlt.database import DLTDatabase
            
            spider = DLTSpider(timeout=15, retry_times=3)
            db = DLTDatabase(load_db_config())
            
            db.connect()
            db.create_table()
            
            # 大乐透从2007年开始
            current_year = datetime.now().year
            start_year = 2007
            
            total_inserted = 0
            total_skipped = 0
            
            for year in range(start_year, current_year + 1):
                year_short = str(year)[2:]
                start_issue = f"{year_short}001"
                end_issue = f"{year_short}200"
                
                logger.info(f"\n爬取 {year} 年数据 (期号: {start_issue} - {end_issue})")
                
                try:
                    year_data = spider.fetch_500com_data(start_issue, end_issue)
                    
                    if year_data:
                        logger.info(f"  获取 {len(year_data)} 条数据")
                        inserted, duplicated, skipped = db.insert_lottery_data(year_data, skip_existing=True)
                        logger.info(f"  入库: 新增 {inserted} 条，重复 {duplicated} 条，跳过 {skipped} 条")
                        total_inserted += inserted
                        total_skipped += skipped
                    else:
                        logger.warning(f"  {year} 年无数据")
                        
                except Exception as e:
                    logger.error(f"  爬取 {year} 年失败: {e}")
                    continue
            
            logger.info("\n" + "=" * 60)
            logger.info(f"爬取完成，新增 {total_inserted} 条，跳过 {total_skipped} 条")
            logger.info("=" * 60)
            
            # 显示统计
            total = db.get_total_count('dlt_lottery')
            latest = db.get_latest_lottery()
            
            logger.info(f"数据库总记录数: {total}")
            if latest:
                logger.info(f"最新一期: {latest['lottery_no']} ({latest['draw_date']})")
                logger.info(f"号码: 前区 {latest['front_balls']} + 后区 {latest['back_balls']}")
            
            db.close()
            
        else:
            logger.error(f"暂不支持彩票类型: {lottery_type}")
            
    except Exception as e:
        logger.error(f"爬取失败: {e}", exc_info=True)


def fetch_latest(lottery_type: str):
    """增量爬取最新数据"""
    setup_logging(lottery_type)
    
    logger.info("=" * 60)
    logger.info(f"增量爬取{LOTTERY_NAMES.get(lottery_type, lottery_type)}最新数据")
    logger.info("=" * 60)
    
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
            
            data = spider.fetch_500com_data(start_issue, end_issue)
            
            if data:
                logger.info(f"获取 {len(data)} 条数据")
                inserted, duplicated, skipped = db.insert_lottery_data(data, skip_existing=True)
                logger.info(f"入库: 新增 {inserted} 条，重复 {duplicated} 条，跳过 {skipped} 条")
            else:
                logger.warning("未获取到数据")
            
            # 显示最新一期
            latest = db.get_latest_lottery()
            if latest:
                logger.info(f"\n最新一期: {latest['lottery_no']} ({latest['draw_date']})")
                logger.info(f"号码: {latest['red_balls']} + {latest['blue_ball']}")
            
            db.close()
            
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
            
            data = spider.fetch_500com_data(start_issue, end_issue)
            
            if data:
                logger.info(f"获取 {len(data)} 条数据")
                inserted, duplicated, skipped = db.insert_lottery_data(data, skip_existing=True)
                logger.info(f"入库: 新增 {inserted} 条，重复 {duplicated} 条，跳过 {skipped} 条")
            else:
                logger.warning("未获取到数据")
            
            # 显示最新一期
            latest = db.get_latest_lottery()
            if latest:
                logger.info(f"\n最新一期: {latest['lottery_no']} ({latest['draw_date']})")
                logger.info(f"号码: 前区 {latest['front_balls']} + 后区 {latest['back_balls']}")
            
            db.close()
            
        else:
            logger.error(f"暂不支持彩票类型: {lottery_type}")
            
    except Exception as e:
        logger.error(f"爬取失败: {e}", exc_info=True)
