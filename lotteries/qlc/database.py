"""
七乐彩数据库操作
"""

from core.base_database import BaseDatabase
from typing import List, Dict, Optional
import logging
from datetime import datetime
import pymysql

logger = logging.getLogger(__name__)


class QLCDatabase(BaseDatabase):
    """七乐彩数据库管理类"""

    def __init__(self, db_config: Dict):
        super().__init__(db_config)
        self.table_name = 'qlc_lottery'

    def create_table(self):
        """创建七乐彩表"""
        if not self.connection:
            self.connect()

        cursor = self.connection.cursor()

        sql = """
        CREATE TABLE IF NOT EXISTS qlc_lottery (
            id INT AUTO_INCREMENT PRIMARY KEY,
            lottery_no VARCHAR(20) UNIQUE NOT NULL COMMENT '期号',
            draw_date DATE NOT NULL COMMENT '开奖日期',
            basic1 INT NOT NULL COMMENT '基本号1',
            basic2 INT NOT NULL COMMENT '基本号2',
            basic3 INT NOT NULL COMMENT '基本号3',
            basic4 INT NOT NULL COMMENT '基本号4',
            basic5 INT NOT NULL COMMENT '基本号5',
            basic6 INT NOT NULL COMMENT '基本号6',
            basic7 INT NOT NULL COMMENT '基本号7',
            special INT NOT NULL COMMENT '特别号',
            sorted_code VARCHAR(50) NOT NULL COMMENT '号码组合（如：01,02,03,04,05,06,07-08）',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_draw_date (draw_date),
            INDEX idx_lottery_no (lottery_no)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        """

        try:
            cursor.execute(sql)
            self.connection.commit()
            logger.info("七乐彩表创建成功")
        except pymysql.Error as e:
            logger.error(f"创建表失败: {e}")
            raise
        finally:
            cursor.close()

    def lottery_exists(self, lottery_no: str) -> bool:
        """检查期号是否已存在"""
        if not self.connection:
            self.connect()

        cursor = self.connection.cursor()
        try:
            cursor.execute(
                f"SELECT COUNT(*) FROM {self.table_name} WHERE lottery_no = %s",
                (lottery_no,)
            )
            count = cursor.fetchone()[0]
            return count > 0
        finally:
            cursor.close()

    def insert_lottery_data(self, data: List[Dict], skip_existing: bool = True, batch_size: int = 100):
        """
        批量插入中奖数据
        
        Args:
            data: 中奖数据列表
            skip_existing: 是否跳过已存在的数据
            batch_size: 批量插入大小
            
        Returns:
            (inserted, duplicated, skipped) 元组
        """
        if not self.connection:
            self.connect()
        
        self.ensure_connection()

        inserted = 0
        duplicated = 0
        skipped = 0
        
        # 按期号从小到大排序
        sorted_data = sorted(data, key=lambda x: x['lottery_no'])
        
        # 批量查询已存在的期号
        existing_nos = set()
        if skip_existing and sorted_data:
            lottery_nos = [item['lottery_no'] for item in sorted_data]
            cursor = self.connection.cursor()
            try:
                placeholders = ','.join(['%s'] * len(lottery_nos))
                cursor.execute(
                    f"SELECT lottery_no FROM {self.table_name} WHERE lottery_no IN ({placeholders})",
                    lottery_nos
                )
                existing_nos = {row[0] for row in cursor.fetchall()}
            finally:
                cursor.close()

        # 准备批量插入的数据
        batch_data = []
        
        for item in sorted_data:
            try:
                if item['lottery_no'] in existing_nos:
                    skipped += 1
                    continue

                # 支持两种格式
                if 'basic1' in item:
                    basic_balls = [item[f'basic{i}'] for i in range(1, 8)]
                    special_ball = item['special']
                else:
                    basic_balls = item['basic_balls']
                    special_ball = item['special_ball']

                # 生成号码组合（基本号-特别号）
                sorted_code = ','.join(f'{n:02d}' for n in sorted(basic_balls)) + f'-{special_ball:02d}'

                batch_data.append((
                    item['lottery_no'],
                    item['draw_date'],
                    basic_balls[0],
                    basic_balls[1],
                    basic_balls[2],
                    basic_balls[3],
                    basic_balls[4],
                    basic_balls[5],
                    basic_balls[6],
                    special_ball,
                    sorted_code,
                    datetime.now()
                ))

            except (KeyError, ValueError, IndexError) as e:
                logger.warning(f"数据格式错误: {e}, 数据: {item}")
                continue

        # 批量插入
        if batch_data:
            cursor = self.connection.cursor()
            try:
                sql = """
                INSERT INTO qlc_lottery
                (lottery_no, draw_date, basic1, basic2, basic3, basic4, basic5, basic6, basic7, special, sorted_code, created_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON DUPLICATE KEY UPDATE updated_at = NOW()
                """
                
                for i in range(0, len(batch_data), batch_size):
                    batch = batch_data[i:i + batch_size]
                    cursor.executemany(sql, batch)
                    inserted += cursor.rowcount
                
                self.connection.commit()
                logger.info(f"新增 {inserted} 条，重复 {duplicated} 条，跳过 {skipped} 条")
                
            except pymysql.Error as e:
                self.connection.rollback()
                logger.error(f"批量插入失败: {e}")
                raise
            finally:
                cursor.close()

        return inserted, duplicated, skipped

    def get_all_lottery_data(self) -> List[Dict]:
        """获取所有中奖数据"""
        if not self.connection:
            self.connect()

        cursor = self.connection.cursor(pymysql.cursors.DictCursor)

        try:
            cursor.execute("""
                SELECT lottery_no, draw_date, basic1, basic2, basic3, basic4, basic5, basic6, basic7, special
                FROM qlc_lottery
                ORDER BY draw_date DESC
            """)

            results = []
            for row in cursor.fetchall():
                basic_balls = [row[f'basic{i}'] for i in range(1, 8)]
                results.append({
                    'lottery_no': row['lottery_no'],
                    'draw_date': str(row['draw_date']),
                    'basic_balls': basic_balls,
                    'special_ball': row['special']
                })

            return results
        finally:
            cursor.close()

    def get_latest_lottery(self) -> Optional[Dict]:
        """获取最新的中奖号码"""
        if not self.connection:
            self.connect()

        cursor = self.connection.cursor(pymysql.cursors.DictCursor)

        try:
            cursor.execute("""
                SELECT lottery_no, draw_date, basic1, basic2, basic3, basic4, basic5, basic6, basic7, special
                FROM qlc_lottery
                ORDER BY draw_date DESC
                LIMIT 1
            """)

            row = cursor.fetchone()
            if row:
                basic_balls = [row[f'basic{i}'] for i in range(1, 8)]
                return {
                    'lottery_no': row['lottery_no'],
                    'draw_date': str(row['draw_date']),
                    'basic_balls': basic_balls,
                    'special_ball': row['special']
                }
            return None
        finally:
            cursor.close()

    def get_sorted_codes(self) -> set:
        """获取所有历史中奖号码的组合（用于去重）"""
        if not self.connection:
            self.connect()

        cursor = self.connection.cursor()
        try:
            cursor.execute(f"SELECT sorted_code FROM {self.table_name}")
            return {row[0] for row in cursor.fetchall()}
        finally:
            cursor.close()
