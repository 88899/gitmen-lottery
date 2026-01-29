"""
预测路由
"""
from fastapi import APIRouter, Query
from typing import Optional
import sys
from pathlib import Path

# 添加项目根目录到路径
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

from core.config import DB_CONFIG, LOTTERY_NAMES
from lotteries.ssq.predictor import SSQPredictor
from lotteries.ssq.database import SSQDatabase
from lotteries.dlt.predictor import DLTPredictor
from lotteries.dlt.database import DLTDatabase
from lotteries.qxc.predictor import QXCPredictor
from lotteries.qxc.database import QXCDatabase
from lotteries.qlc.predictor import QLCPredictor
from lotteries.qlc.database import QLCDatabase

router = APIRouter()

def get_predictor(lottery_type: str):
    """获取预测器"""
    db = None
    try:
        if lottery_type == "ssq":
            db = SSQDatabase(DB_CONFIG)
            db.connect()
            data = db.get_all_lottery_data()
            return SSQPredictor(data), LOTTERY_NAMES["ssq"], db
        elif lottery_type == "dlt":
            db = DLTDatabase(DB_CONFIG)
            db.connect()
            data = db.get_all_lottery_data()
            return DLTPredictor(data), LOTTERY_NAMES["dlt"], db
        elif lottery_type == "qxc":
            db = QXCDatabase(DB_CONFIG)
            db.connect()
            data = db.get_all_lottery_data()
            return QXCPredictor(data), LOTTERY_NAMES["qxc"], db
        elif lottery_type == "qlc":
            db = QLCDatabase(DB_CONFIG)
            db.connect()
            data = db.get_all_lottery_data()
            return QLCPredictor(data), LOTTERY_NAMES["qlc"], db
        else:
            return None, None, None
    except Exception as e:
        if db and db.connection:
            db.close()
        raise e

@router.get("/predict/{lottery_type}")
async def predict(
    lottery_type: str,
    count: int = Query(5, ge=1, le=20),
    strategies: Optional[str] = None
):
    """
    预测接口
    
    参数:
    - lottery_type: 彩票类型 (ssq/dlt/qxc/qlc)
    - count: 预测数量
    - strategies: 策略列表，逗号分隔
    """
    predictor, name, db = get_predictor(lottery_type)
    
    if not predictor:
        return {"success": False, "error": "不支持的彩票类型"}
    
    try:
        # 解析策略
        strategy_list = None
        if strategies:
            strategy_list = [s.strip() for s in strategies.split(",")]
        
        # 执行预测
        predictions = predictor.predict(count, strategy_list)
        
        return {
            "success": True,
            "lottery_type": lottery_type,
            "lottery_name": name,
            "predictions": predictions
        }
    
    except Exception as e:
        return {"success": False, "error": str(e)}
    finally:
        if db and db.connection:
            db.close()

@router.get("/latest/{lottery_type}")
async def get_latest(lottery_type: str):
    """获取最新开奖数据"""
    predictor, name, db = get_predictor(lottery_type)
    
    if not predictor:
        return {"success": False, "error": "不支持的彩票类型"}
    
    try:
        latest = db.get_latest_lottery()
        
        if not latest:
            return {"success": False, "error": "暂无数据"}
        
        return {
            "success": True,
            "lottery_type": lottery_type,
            "lottery_name": name,
            **latest
        }
    
    except Exception as e:
        return {"success": False, "error": str(e)}
    finally:
        if db and db.connection:
            db.close()
