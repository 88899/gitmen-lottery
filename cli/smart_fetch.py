"""
统一的智能爬取模块
重构后的核心爬取逻辑，支持全量、增量、定时任务
"""

import logging
from datetime import datetime
from typing import Dict, List, Optional, Tuple
from core.config import LOTTERY_NAMES
from core.utils import load_db_config

logger = logging.getLogger(__name__)


def get_lottery_modules(lottery_type: str):
    """获取彩票类型对应的模块"""
    modules = {
        'ssq': {
            'name': '双色球',
            'start_year': 2003,
            'spider_class': 'lotteries.ssq.spider.SSQSpider',
            'database_class': 'lotteries.ssq.database.SSQDatabase',
            'predictor_class': 'lotteries.ssq.predictor.SSQPredictor'
        },
        'dlt': {
            'name': '大乐透',
            'start_year': 2007,
            'spider_class': 'lotteries.dlt.spider.DLTSpider',
            'database_class': 'lotteries.dlt.database.DLTDatabase',
            'predictor_class': 'lotteries.dlt.predictor.DLTPredictor'
        },
        'qxc': {
            'name': '七星彩',
            'start_year': 2004,
            'spider_class': 'lotteries.qxc.spider.QXCSpider',
            'database_class': 'lotteries.qxc.database.QXCDatabase',
            'predictor_class': 'lotteries.qxc.predictor.QXCPredictor'
        },
        'qlc': {
            'name': '七乐彩',
            'start_year': 2007,
            'spider_class': 'lotteries.qlc.spider.QLCSpider',
            'database_class': 'lotteries.qlc.database.QLCDatabase',
            'predictor_class': 'lotteries.qlc.predictor.QLCPredictor'
        }
    }
    
    if lottery_type not in modules:
        raise ValueError(f"不支持的彩票类型: {lottery_type}。支持的类型: {list(modules.keys())}")
    
    return modules[lottery_type]


def import_class(class_path: str):
    """动态导入类"""
    module_path, class_name = class_path.rsplit('.', 1)
    module = __import__(module_path, fromlist=[class_name])
    return getattr(module, class_name)


def smart_fetch(lottery_type: str, mode: str = 'incremental', **options) -> Dict:
    """
    统一的智能爬取方法
    
    Args:
        lottery_type: 彩票类型 ('ssq', 'dlt', 'qxc' 或 'qlc')
        mode: 爬取模式 ('incremental' 增量, 'full' 全量, 'year' 指定年份)
        **options: 其他选项
            - target_year: 指定年份（mode='year' 时使用）
            - with_predict: 是否进行预测
            - batch_size: 批次大小（全量模式使用）
    
    Returns:
        dict: 爬取结果
    """
    try:
        # 获取模块信息
        modules = get_lottery_modules(lottery_type)
        
        # 动态导入类
        SpiderClass = import_class(modules['spider_class'])
        DatabaseClass = import_class(modules['database_class'])
        
        # 初始化
        spider = SpiderClass(timeout=15, retry_times=3)
        db = DatabaseClass(load_db_config())
        db.connect()
        db.create_table()
        
        logger.info(f"📊 智能爬取 {modules['name']} (模式: {mode})")
        
        # 根据模式执行不同的爬取逻辑
        if mode == 'incremental':
            result = _fetch_incremental(spider, db, modules, lottery_type, **options)
        elif mode == 'full':
            result = _fetch_full_history(spider, db, modules, lottery_type, **options)
        elif mode == 'year':
            target_year = options.get('target_year')
            if not target_year:
                raise ValueError("年份模式需要指定 target_year 参数")
            result = _fetch_single_year(spider, db, modules, lottery_type, target_year, **options)
        else:
            raise ValueError(f"不支持的模式: {mode}")
        
        # 添加基础信息
        result.update({
            'lottery_type': lottery_type,
            'lottery_name': modules['name'],
            'mode': mode
        })
        
        # 如果需要预测
        if options.get('with_predict', False) and result.get('inserted', 0) >= 0:
            result['predictions'] = _generate_predictions(db, modules, lottery_type, **options)
        
        db.close()
        return result
        
    except Exception as e:
        logger.error(f"{lottery_type} 爬取失败: {e}", exc_info=True)
        return {
            'success': False,
            'lottery_type': lottery_type,
            'error': str(e)
        }


def _fetch_incremental(spider, db, modules, lottery_type, **options) -> Dict:
    """增量爬取逻辑"""
    # 获取数据库中最新期号
    latest_in_db = db.get_latest_lottery()
    
    # 确定爬取范围
    current_year = datetime.now().year
    year_short = str(current_year)[2:]
    
    if latest_in_db:
        # 从数据库最新期号的下一期开始爬取
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
            logger.info(f"跨年爬取：从 {2000 + next_year} 年开始")
        else:
            # 同年：继续当年的期号
            start_issue = f"{year_part}{next_issue:03d}"
            end_issue = f"{year_part}200"
            logger.info(f"同年爬取：继续 {2000 + int(year_part)} 年")
    else:
        # 数据库为空，从起始年份开始
        start_year_short = str(modules['start_year'])[2:]
        start_issue = f"{start_year_short}001"
        end_issue = f"{start_year_short}200"
        logger.info(f"数据库为空，从起始年份 {modules['start_year']} 开始")
    
    logger.info(f"爬取期号范围: {start_issue} - {end_issue}")
    
    # 调用爬取方法
    data = spider.fetch(start_issue=start_issue, end_issue=end_issue)
    
    inserted = 0
    if data:
        logger.info(f"获取 {len(data)} 条数据")
        inserted, duplicated, skipped = db.insert_lottery_data(data, skip_existing=True)
        logger.info(f"入库: 新增 {inserted} 条，重复 {duplicated} 条，跳过 {skipped} 条")
    else:
        logger.info("暂无新数据")
    
    # 获取最新一期
    latest = db.get_latest_lottery()
    
    return {
        'success': True,
        'inserted': inserted,
        'latest': latest,
        'has_new_data': inserted > 0
    }


def _fetch_full_history(spider, db, modules, lottery_type, **options) -> Dict:
    """全量爬取逻辑（按年份推进，自动查找缺失年份）"""
    start_year = modules['start_year']
    current_year = datetime.now().year
    
    logger.info(f"起始年份: {start_year}, 当前年份: {current_year}")
    
    total_inserted = 0
    year_count = 0
    
    # 循环爬取所有缺失年份
    while True:
        # 查找数据库中缺失的年份
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
            break
        
        # 爬取目标年份的数据
        year_count += 1
        year_short = str(target_year)[2:]
        start_issue = f"{year_short}001"
        end_issue = f"{year_short}200"
        
        logger.info(f"📅 爬取第 {year_count} 年: {target_year} 年数据 (期号: {start_issue} - {end_issue})")
        
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
    
    # 获取最终统计
    table_name = f'{lottery_type}_lottery'
    total = db.get_total_count(table_name)
    latest = db.get_latest_lottery()
    
    logger.info(f"✅ {modules['name']}全量爬取完成")
    logger.info(f"爬取年份数: {year_count}")
    logger.info(f"新增数据: {total_inserted} 条")
    logger.info(f"数据库总记录数: {total}")
    
    return {
        'success': True,
        'inserted': total_inserted,
        'total': total,
        'year_count': year_count,
        'latest': latest
    }


def _fetch_single_year(spider, db, modules, lottery_type, target_year: int, **options) -> Dict:
    """爬取指定年份的数据"""
    year_short = str(target_year)[2:]
    start_issue = f"{year_short}001"
    end_issue = f"{year_short}200"
    
    logger.info(f"📅 爬取 {target_year} 年数据 (期号: {start_issue} - {end_issue})")
    
    # 使用统一的 fetch 方法爬取该年度数据
    data = spider.fetch(start_issue=start_issue, end_issue=end_issue)
    
    inserted = 0
    if data and len(data) > 0:
        logger.info(f"✅ 获取 {len(data)} 条数据")
        
        # 批量插入（自动跳过已存在的数据）
        inserted, duplicated, skipped = db.insert_lottery_data(data, skip_existing=True)
        logger.info(f"✅ 入库: 新增 {inserted} 条，重复 {duplicated} 条，跳过 {skipped} 条")
    else:
        logger.warning(f"⚠️ {target_year} 年无数据")
    
    # 获取最新一期
    latest = db.get_latest_lottery()
    
    return {
        'success': True,
        'inserted': inserted,
        'target_year': target_year,
        'latest': latest
    }


def _generate_predictions(db, modules, lottery_type, **options) -> List[Dict]:
    """生成预测结果"""
    try:
        # 动态导入预测器
        PredictorClass = import_class(modules['predictor_class'])
        
        # 获取历史数据
        history_data = db.get_all_lottery_data()
        if not history_data:
            logger.warning("无历史数据，无法进行预测")
            return []
        
        # 获取预测配置
        from core.config import DEFAULT_STRATEGIES, DEFAULT_PREDICTION_COUNT
        
        # 创建预测器并预测
        predictor = PredictorClass(history_data, strategies=DEFAULT_STRATEGIES)
        predictions = predictor.predict(count=DEFAULT_PREDICTION_COUNT)
        
        logger.info(f"预测结果（共 {len(predictions)} 组）")
        return predictions
        
    except Exception as e:
        logger.error(f"预测失败: {e}", exc_info=True)
        return []