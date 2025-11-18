"""
双色球数据库操作
支持 MySQL 和 Cloudflare R2 存储
"""

from core.base_database import BaseDatabase
from typing import List, Dict, Optional
import logging
import json
from datetime import datetime
import pymysql

logger = logging.getLogger(__name__)


class SSQDatabase(BaseDatabase):
    """双色球数据库管理类"""

    def __init__(self, db_config: Dict):
        """
        初始化数据库连接

        Args:
            db_config: 数据库配置
        """
        super().__init__(db_config)
        self.table_name = 'ssq_lottery'

    def create_table(self):
        """创建双色球表（优化后的结构：每个红球一列 + 蓝球一列 + 排序号码组合）"""
        if not self.connection:
            self.connect()

        cursor = self.connection.cursor()

        sql = """
        CREATE TABLE IF NOT EXISTS ssq_lottery (
            id INT AUTO_INCREMENT PRIMARY KEY,
            lottery_no VARCHAR(20) UNIQUE NOT NULL COMMENT '期号',
            draw_date DATE NOT NULL COMMENT '开奖日期',
            red1 VARCHAR(2) NOT NULL COMMENT '红球1',
            red2 VARCHAR(2) NOT NULL COMMENT '红球2',
            red3 VARCHAR(2) NOT NULL COMMENT '红球3',
            red4 VARCHAR(2) NOT NULL COMMENT '红球4',
            red5 VARCHAR(2) NOT NULL COMMENT '红球5',
            red6 VARCHAR(2) NOT NULL COMMENT '红球6',
            blue VARCHAR(2) NOT NULL COMMENT '蓝球',
            sorted_code VARCHAR(50) NOT NULL COMMENT '排序后的号码组合（如：02,06,08,12,22,31-22）',
            sales BIGINT COMMENT '销售额',
            pool_money BIGINT COMMENT '奖池',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_draw_date (draw_date),
            INDEX idx_lottery_no (lottery_no)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        """

        try:
            cursor.execute(sql)
            self.connection.commit()
            logger.info("表创建成功")
        except pymysql.Error as e:
            logger.error(f"创建表失败: {e}")
            raise
        finally:
            cursor.close()

    def lottery_exists(self, lottery_no: str) -> bool:
        """
        检查期号是否已存在

        Args:
            lottery_no: 期号

        Returns:
            True表示已存在
        """
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
        批量插入中奖数据，使用事务保证数据一致性
        注意：入库前会按期号从小到大排序，确保 ID 和期号都是递增的

        Args:
            data: 中奖数据列表（支持新旧格式）
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
        
        # 如果启用跳过，先批量查询已存在的期号
        existing_nos = set()
        if skip_existing and sorted_data:
            lottery_nos = [item['lottery_no'] for item in sorted_data]
            cursor = self.connection.cursor()
            try:
                # 批量查询已存在的期号
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
                # 如果已存在，跳过
                if item['lottery_no'] in existing_nos:
                    skipped += 1
                    continue

                # 支持新格式（独立列）和旧格式（red_balls数组）
                if 'red1' in item:
                    red_balls = [item[f'red{i}'] for i in range(1, 7)]
                    blue = item['blue']
                else:
                    red_balls = [f"{int(x):02d}" for x in sorted(item['red_balls'])]
                    blue = f"{int(item['blue_ball']):02d}"

                # 生成排序后的号码组合
                sorted_code = ','.join(red_balls) + '-' + blue

                batch_data.append((
                    item['lottery_no'],
                    item['draw_date'],
                    red_balls[0],
                    red_balls[1],
                    red_balls[2],
                    red_balls[3],
                    red_balls[4],
                    red_balls[5],
                    blue,
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
                INSERT INTO ssq_lottery
                (lottery_no, draw_date, red1, red2, red3, red4, red5, red6, blue, sorted_code, created_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON DUPLICATE KEY UPDATE updated_at = NOW()
                """
                
                # 分批插入
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
                SELECT lottery_no, draw_date, red1, red2, red3, red4, red5, red6, blue
                FROM ssq_lottery
                ORDER BY draw_date DESC
            """)

            results = []
            for row in cursor.fetchall():
                red_balls = [int(row[f'red{i}']) for i in range(1, 7)]
                results.append({
                    'lottery_no': row['lottery_no'],
                    'draw_date': str(row['draw_date']),
                    'red_balls': red_balls,
                    'blue_ball': int(row['blue'])
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
                SELECT lottery_no, draw_date, red1, red2, red3, red4, red5, red6, blue
                FROM ssq_lottery
                ORDER BY draw_date DESC
                LIMIT 1
            """)

            row = cursor.fetchone()
            if row:
                red_balls = [int(row[f'red{i}']) for i in range(1, 7)]
                return {
                    'lottery_no': row['lottery_no'],
                    'draw_date': str(row['draw_date']),
                    'red_balls': red_balls,
                    'blue_ball': int(row['blue'])
                }
            return None
        finally:
            cursor.close()


    def get_sorted_codes(self) -> set:
        """
        获取所有历史中奖号码的排序组合（用于去重）

        Returns:
            排序号码组合的集合
        """
        if not self.connection:
            self.connect()

        cursor = self.connection.cursor()
        try:
            cursor.execute(f"SELECT sorted_code FROM {self.table_name}")
            return {row[0] for row in cursor.fetchall()}
        finally:
            cursor.close()

class SSQR2Storage:
    """双色球 Cloudflare R2 存储类 (可选)"""

    def __init__(self, r2_config: Dict):
        """
        初始化 R2 存储

        Args:
            r2_config: R2配置
        """
        try:
            import boto3
            self.s3_client = boto3.client(
                's3',
                endpoint_url=r2_config['endpoint'],
                aws_access_key_id=r2_config['access_key_id'],
                aws_secret_access_key=r2_config['secret_access_key']
            )
            self.bucket_name = r2_config['bucket_name']
            logger.info("R2 存储初始化成功")
        except ImportError:
            logger.warning("boto3 未安装，R2 功能不可用")

    def upload_data(self, data: List[Dict], filename: str = "ssq_data.json"):
        """上传数据到 R2"""
        try:
            json_data = json.dumps(data, ensure_ascii=False, indent=2)
            self.s3_client.put_object(
                Bucket=self.bucket_name,
                Key=filename,
                Body=json_data.encode('utf-8'),
                ContentType='application/json'
            )
            logger.info(f"数据已上传到 R2: {filename}")
        except Exception as e:
            logger.error(f"上传到 R2 失败: {e}")


if __name__ == '__main__':
    logging.basicConfig(level=logging.INFO)

    # 测试数据库连接
    db_config = {
        'host': 'localhost',
        'port': 3306,
        'user': 'root',
        'password': 'password',
        'database': 'lottery_db'
    }

    try:
        db = SSQDatabase(db_config)
        db.connect()
        db.create_table()
        db.close()
    except Exception as e:
        logger.error(f"测试失败: {e}")
