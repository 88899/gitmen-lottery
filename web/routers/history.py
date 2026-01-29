"""
历史记录查询路由
"""
from fastapi import APIRouter, Query, Request
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from typing import Optional
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
templates = Jinja2Templates(directory="web/templates")

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

@router.get("/history", response_class=HTMLResponse)
async def history_page(request: Request):
    """历史记录查询页面"""
    return templates.TemplateResponse("history.html", {"request": request})

@router.get("/api/history/{lottery_type}")
async def query_history(
    lottery_type: str,
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    lottery_no: Optional[str] = None,
    draw_date: Optional[str] = None,
    numbers: Optional[str] = None
):
    """
    历史记录查询 API
    
    参数:
    - lottery_type: 彩票类型 (ssq/dlt/qxc/qlc)
    - page: 页码
    - limit: 每页数量
    - lottery_no: 期号
    - draw_date: 开奖日期
    - numbers: 号码查询
    """
    if lottery_type not in ["ssq", "dlt", "qxc", "qlc"]:
        return {"success": False, "error": "不支持的彩票类型"}
    
    db = get_database(lottery_type)
    if not db:
        return {"success": False, "error": "数据库初始化失败"}
    
    try:
        db.connect()
        table_name = db.table_name
        
        # 构建查询条件
        where_clauses = []
        params = []
        
        if lottery_no:
            where_clauses.append("lottery_no = %s")
            params.append(lottery_no)
        
        if draw_date:
            where_clauses.append("draw_date = %s")
            params.append(draw_date)
        
        if numbers:
            # 号码查询逻辑
            where_clauses.append("sorted_code LIKE %s")
            params.append(f"%{numbers}%")
        
        where_sql = " AND ".join(where_clauses) if where_clauses else "1=1"
        
        # 查询总数
        cursor = db.connection.cursor()
        count_sql = f"SELECT COUNT(*) as total FROM {table_name} WHERE {where_sql}"
        cursor.execute(count_sql, tuple(params))
        total = cursor.fetchone()[0]
        cursor.close()
        
        # 查询数据
        offset = (page - 1) * limit
        query_sql = f"""
            SELECT * FROM {table_name}
            WHERE {where_sql}
            ORDER BY lottery_no DESC
            LIMIT %s OFFSET %s
        """
        
        cursor = db.connection.cursor()
        cursor.execute(query_sql, tuple(params + [limit, offset]))
        
        # 获取列名
        columns = [desc[0] for desc in cursor.description]
        rows = cursor.fetchall()
        cursor.close()
        
        data = []
        for row in rows:
            item = dict(zip(columns, row))
            
            # 转换数据格式
            if lottery_type == "ssq":
                item["red_balls"] = [item[f"red{i}"] for i in range(1, 7)]
                item["blue_ball"] = item["blue"]
                # 清理原始字段
                for i in range(1, 7):
                    del item[f"red{i}"]
                del item["blue"]
            
            elif lottery_type == "dlt":
                item["front_balls"] = [item[f"front{i}"] for i in range(1, 6)]
                item["back_balls"] = [item[f"back{i}"] for i in range(1, 3)]
                for i in range(1, 6):
                    del item[f"front{i}"]
                for i in range(1, 3):
                    del item[f"back{i}"]
            
            elif lottery_type == "qxc":
                item["numbers"] = [item[f"num{i}"] for i in range(1, 8)]
                for i in range(1, 8):
                    del item[f"num{i}"]
            
            elif lottery_type == "qlc":
                item["basic_balls"] = [item[f"basic{i}"] for i in range(1, 8)]
                item["special_ball"] = item["special"]
                for i in range(1, 8):
                    del item[f"basic{i}"]
                del item["special"]
            
            # 转换日期为字符串
            if "draw_date" in item:
                item["draw_date"] = str(item["draw_date"])
            if "created_at" in item:
                item["created_at"] = str(item["created_at"])
            if "updated_at" in item:
                item["updated_at"] = str(item["updated_at"])
            
            data.append(item)
        
        db.close()
        
        total_pages = (total + limit - 1) // limit
        
        return {
            "success": True,
            "data": data,
            "page": page,
            "limit": limit,
            "total": total,
            "totalPages": total_pages
        }
    
    except Exception as e:
        if db and db.connection:
            db.close()
        return {"success": False, "error": str(e)}
