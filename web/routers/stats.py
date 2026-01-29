"""
统计信息路由
"""
from fastapi import APIRouter
import sys
from pathlib import Path

# 添加项目根目录到路径
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

from core.config import DB_CONFIG, LOTTERY_NAMES
from lotteries.ssq.database import SSQDatabase
from lotteries.dlt.database import DLTDatabase
from lotteries.qxc.database import QXCDatabase
from lotteries.qlc.database import QLCDatabase

router = APIRouter()

def get_database(lottery_type: str):
    """获取数据库实例"""
    if lottery_type == "ssq":
        return SSQDatabase(DB_CONFIG)
    elif lottery_type == "dlt":
        return DLTDatabase(DB_CONFIG)
    elif lottery_type == "qxc":
        return QXCDatabase(DB_CONFIG)
    elif lottery_type == "qlc":
        return QLCDatabase(DB_CONFIG)
    return None

@router.get("/stats/{lottery_type}")
async def get_stats(lottery_type: str):
    """
    获取统计信息
    
    参数:
    - lottery_type: 彩票类型 (ssq/dlt/qxc/qlc)
    """
    if lottery_type not in ["ssq", "dlt", "qxc", "qlc"]:
        return {"success": False, "error": "不支持的彩票类型"}
    
    db = get_database(lottery_type)
    if not db:
        return {"success": False, "error": "数据库初始化失败"}
    
    try:
        db.connect()
        table_name = db.table_name
        cursor = db.connection.cursor()
        
        # 获取总数
        cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
        total_count = cursor.fetchone()[0]
        
        # 获取频率统计
        stats = {
            "lottery_type": lottery_type,
            "lottery_name": LOTTERY_NAMES[lottery_type],
            "total_count": total_count
        }
        
        if lottery_type == "ssq":
            # 红球频率
            red_freq = {}
            for i in range(1, 7):
                cursor.execute(f"SELECT red{i}, COUNT(*) as count FROM {table_name} GROUP BY red{i}")
                for row in cursor.fetchall():
                    ball, count = row
                    red_freq[ball] = red_freq.get(ball, 0) + count
            
            # 蓝球频率
            cursor.execute(f"SELECT blue, COUNT(*) as count FROM {table_name} GROUP BY blue")
            blue_freq = {row[0]: row[1] for row in cursor.fetchall()}
            
            stats["top_red_balls"] = sorted(
                [{"ball": str(k).zfill(2), "count": v} for k, v in red_freq.items()],
                key=lambda x: x["count"],
                reverse=True
            )[:10]
            
            stats["top_blue_balls"] = sorted(
                [{"ball": str(k).zfill(2), "count": v} for k, v in blue_freq.items()],
                key=lambda x: x["count"],
                reverse=True
            )[:5]
        
        elif lottery_type == "dlt":
            # 前区频率
            front_freq = {}
            for i in range(1, 6):
                cursor.execute(f"SELECT front{i}, COUNT(*) as count FROM {table_name} GROUP BY front{i}")
                for row in cursor.fetchall():
                    ball, count = row
                    front_freq[ball] = front_freq.get(ball, 0) + count
            
            # 后区频率
            back_freq = {}
            for i in range(1, 3):
                cursor.execute(f"SELECT back{i}, COUNT(*) as count FROM {table_name} GROUP BY back{i}")
                for row in cursor.fetchall():
                    ball, count = row
                    back_freq[ball] = back_freq.get(ball, 0) + count
            
            stats["top_front_balls"] = sorted(
                [{"ball": str(k).zfill(2), "count": v} for k, v in front_freq.items()],
                key=lambda x: x["count"],
                reverse=True
            )[:10]
            
            stats["top_back_balls"] = sorted(
                [{"ball": str(k).zfill(2), "count": v} for k, v in back_freq.items()],
                key=lambda x: x["count"],
                reverse=True
            )[:5]
        
        elif lottery_type == "qxc":
            # 号码频率
            num_freq = {}
            for i in range(1, 8):
                cursor.execute(f"SELECT num{i}, COUNT(*) as count FROM {table_name} GROUP BY num{i}")
                for row in cursor.fetchall():
                    ball, count = row
                    num_freq[ball] = num_freq.get(ball, 0) + count
            
            stats["top_numbers"] = sorted(
                [{"ball": str(k), "count": v} for k, v in num_freq.items()],
                key=lambda x: x["count"],
                reverse=True
            )[:10]
        
        elif lottery_type == "qlc":
            # 基本号频率
            basic_freq = {}
            for i in range(1, 8):
                cursor.execute(f"SELECT basic{i}, COUNT(*) as count FROM {table_name} GROUP BY basic{i}")
                for row in cursor.fetchall():
                    ball, count = row
                    basic_freq[ball] = basic_freq.get(ball, 0) + count
            
            # 特别号频率
            cursor.execute(f"SELECT special, COUNT(*) as count FROM {table_name} GROUP BY special")
            special_freq = {row[0]: row[1] for row in cursor.fetchall()}
            
            stats["top_basic_balls"] = sorted(
                [{"ball": str(k).zfill(2), "count": v} for k, v in basic_freq.items()],
                key=lambda x: x["count"],
                reverse=True
            )[:10]
            
            stats["top_special_balls"] = sorted(
                [{"ball": str(k).zfill(2), "count": v} for k, v in special_freq.items()],
                key=lambda x: x["count"],
                reverse=True
            )[:5]
        
        cursor.close()
        db.close()
        
        return {"success": True, **stats}
    
    except Exception as e:
        if db and db.connection:
            db.close()
        return {"success": False, "error": str(e)}
