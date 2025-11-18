"""
大乐透（DLT）数据库操作
"""

import logging
from typing import List, Dict
from core.base_database import BaseDatabase

logger = logging.getLogger(__name__)


class DLTDatabase(BaseDatabase):
    """大乐透数据库类"""

    def __init__(self, config: Dict):
        super().__init__(config)
        self.table_name = 'dlt_lottery'

    def create_table(self):
        """创建大乐透数据表"""
        create_table_sql = f"""
        CREATE TABLE IF NOT EXISTS {self.table_name} (
            id INT AUTO_INCREMENT PRIMARY KEY,
            lottery_no VARCHAR(20) UNIQUE NOT NULL COMMENT '期号',
            draw_date DATE NOT NULL COMMENT '开奖日期',
            front1 VARCHAR(2) NOT NULL COMMENT '前区号码1',
            front2 VARCHAR(2) NOT NULL COMMENT '前区号码2',
            front3 VARCHAR(2) NOT NULL COMMENT '前区号码3',
            front4 VARCHAR(2) NOT NULL COMMENT '前区号码4',
            front5 VARCHAR(2) NOT NULL COMMENT '前区号码5',
            back1 VARCHAR(2) NOT NULL COMMENT '后区号码1',
            back2 VARCHAR(2) NOT NULL COMMENT '后区号码2',
            sorted_code VARCHAR(50) NOT NULL COMMENT '排序后的号码组合',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
            INDEX idx_lottery_no (lottery_no),
            INDEX idx_draw_date (draw_date),
            INDEX idx_sorted_code (sorted_code)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='大乐透开奖数据表';
        """

        cursor = self.connection.cursor()
        try:
            cursor.execute(create_table_sql)
            self.connection.commit()
            logger.info(f"表 {self.table_name} 创建成功")
        except Exception as e:
            logger.error(f"创建表失败: {e}")
            raise
        finally:
            cursor.close()

    def insert_lottery_data(self, data: List[Dict], skip_existing: bool = True, batch_size: int = 100):
        """
        批量插入中奖数据，使用事务保证数据一致性
        注意：入库前会按期号从小到大排序，确保 ID 和期号都是递增的

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

                # 支持新格式（独立列）和旧格式（front_balls/back_balls数组）
                if 'front1' in item:
                    front_balls = [item[f'front{i}'] for i in range(1, 6)]
                    back_balls = [item['back1'], item['back2']]
                else:
                    front_balls = [f"{int(x):02d}" for x in sorted(item['front_balls'])]
                    back_balls = [f"{int(x):02d}" for x in sorted(item['back_balls'])]

                # 生成排序后的号码组合
                sorted_code = ','.join(front_balls) + '-' + ','.join(back_balls)

                batch_data.append((
                    item['lottery_no'],
                    item['draw_date'],
                    front_balls[0],
                    front_balls[1],
                    front_balls[2],
                    front_balls[3],
                    front_balls[4],
                    back_balls[0],
                    back_balls[1],
                    sorted_code,
                ))

                # 达到批次大小，执行插入
                if len(batch_data) >= batch_size:
                    inserted += self._batch_insert(batch_data)
                    batch_data = []

            except Exception as e:
                logger.error(f"处理数据失败 {item.get('lottery_no', 'unknown')}: {e}")
                continue

        # 插入剩余数据
        if batch_data:
            inserted += self._batch_insert(batch_data)

        logger.info(f"批量插入完成: 新增 {inserted} 条，跳过 {skipped} 条")
        return inserted, duplicated, skipped

    def _batch_insert(self, batch_data: List[tuple]) -> int:
        """执行批量插入"""
        if not batch_data:
            return 0

        insert_sql = f"""
        INSERT INTO {self.table_name}
        (lottery_no, draw_date, front1, front2, front3, front4, front5, back1, back2, sorted_code)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """

        cursor = self.connection.cursor()
        try:
            cursor.executemany(insert_sql, batch_data)
            self.connection.commit()
            return len(batch_data)
        except Exception as e:
            self.connection.rollback()
            logger.error(f"批量插入失败: {e}")
            return 0
        finally:
            cursor.close()

    def get_latest_lottery(self) -> Dict:
        """获取最新一期开奖数据"""
        cursor = self.connection.cursor()
        try:
            cursor.execute(f"""
                SELECT lottery_no, draw_date,
                       front1, front2, front3, front4, front5,
                       back1, back2
                FROM {self.table_name}
                ORDER BY draw_date DESC, lottery_no DESC
                LIMIT 1
            """)

            row = cursor.fetchone()
            if not row:
                return None

            return {
                'lottery_no': row[0],
                'draw_date': str(row[1]),
                'front_balls': [row[2], row[3], row[4], row[5], row[6]],
                'back_balls': [row[7], row[8]]
            }
        finally:
            cursor.close()

    def get_all_lottery_data(self, limit: int = None) -> List[Dict]:
        """获取所有开奖数据"""
        cursor = self.connection.cursor()
        try:
            sql = f"""
                SELECT lottery_no, draw_date,
                       front1, front2, front3, front4, front5,
                       back1, back2
                FROM {self.table_name}
                ORDER BY draw_date DESC, lottery_no DESC
            """

            if limit:
                sql += f" LIMIT {limit}"

            cursor.execute(sql)
            rows = cursor.fetchall()

            return [
                {
                    'lottery_no': row[0],
                    'draw_date': str(row[1]),
                    'front_balls': [row[2], row[3], row[4], row[5], row[6]],
                    'back_balls': [row[7], row[8]]
                }
                for row in rows
            ]
        finally:
            cursor.close()
