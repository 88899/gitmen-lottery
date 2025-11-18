"""
大乐透（DLT）爬虫
数据源：500.com
"""

import requests
from bs4 import BeautifulSoup
import logging
from typing import List, Dict
import time
from datetime import datetime
import re

logger = logging.getLogger(__name__)


class DLTSpider:
    """大乐透爬虫类"""

    # 500.com 数据源
    BACKUP_500_URL = "https://datachart.500.com/dlt/history/newinc/history.php"

    HEADERS = {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Referer': 'https://www.500.com/',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
    }

    def __init__(self, timeout: int = 10, retry_times: int = 3):
        self.timeout = timeout
        self.retry_times = retry_times
        self.session = requests.Session()

    def fetch_500com_data(self, start_issue: str, end_issue: str) -> List[Dict]:
        """
        从 500.com 获取历史数据（支持期号范围查询）

        Args:
            start_issue: 开始期号（5位格式，如 '07001'）
            end_issue: 结束期号（5位格式，如 '07200'）

        Returns:
            中奖数据列表
        """
        all_results = []
        url = f'{self.BACKUP_500_URL}?start={start_issue}&end={end_issue}'

        logger.info(f"从 500.com 获取历史数据: {start_issue} - {end_issue}")

        try:
            response = self.session.get(url, headers=self.HEADERS, timeout=self.timeout)
            response.encoding = 'utf-8'
            response.raise_for_status()

            soup = BeautifulSoup(response.text, 'lxml')
            tbody = soup.find('tbody', {'id': 'tdata'})

            if not tbody:
                logger.warning("未找到表格数据")
                return []

            rows = tbody.find_all('tr')
            logger.info(f"找到 {len(rows)} 行数据")

            for row in rows:
                try:
                    tds = row.find_all('td')
                    if len(tds) < 10:
                        continue

                    # 解析表格列
                    # 期号 | 前区1-5 | 后区1-2 | 奖池 | 一等奖注 | 一等奖金 | 二等奖注 | 二等奖金 | 投注额 | 开奖日期
                    lottery_no = tds[0].text.strip()

                    # 补全期号：如果是5位数字，补全为7位（加上年份前缀20）
                    if lottery_no and re.match(r'^\d{5}$', lottery_no):
                        lottery_no = '20' + lottery_no

                    # 前区（前5列）
                    front_texts = [tds[i].text.strip() for i in range(1, 6)]
                    front_balls = sorted([int(t) for t in front_texts if t.isdigit()])

                    # 后区（第6-7列）
                    back_texts = [tds[i].text.strip() for i in range(6, 8)]
                    back_balls = sorted([int(t) for t in back_texts if t.isdigit()])

                    # 开奖日期（最后一列）
                    draw_date_text = tds[-1].text.strip()
                    # 尝试提取 YYYY-MM-DD 格式
                    draw_date_match = re.search(r'\d{4}-\d{2}-\d{2}', draw_date_text)
                    draw_date = draw_date_match.group() if draw_date_match else ''

                    if (lottery_no and len(front_balls) == 5 and len(back_balls) == 2 and draw_date):
                        all_results.append({
                            'lottery_no': lottery_no,
                            'draw_date': draw_date,
                            'front_balls': front_balls,
                            'back_balls': back_balls,
                            'created_at': datetime.now().isoformat()
                        })

                except (ValueError, IndexError, AttributeError) as e:
                    logger.debug(f"解析行失败: {e}")
                    continue

            logger.info(f"从 500.com 获取 {len(all_results)} 条数据")

        except Exception as e:
            logger.error(f"从 500.com 获取数据失败: {e}")

        return all_results

    def fetch_latest_from_500com(self, count: int = 30) -> List[Dict]:
        """从 500.com 获取最新数据（备用数据源）

        Args:
            count: 期望获取的数量（实际最多30期）

        Returns:
            中奖数据列表
        """
        all_results = []
        # 500.com 不带参数返回最近30期
        url = self.BACKUP_500_URL

        logger.info(f"从 500.com 获取最新数据（最多30期）...")

        try:
            response = self.session.get(url, headers=self.HEADERS, timeout=self.timeout)
            response.encoding = 'utf-8'
            response.raise_for_status()

            soup = BeautifulSoup(response.text, 'lxml')
            tbody = soup.find('tbody', {'id': 'tdata'})

            if not tbody:
                logger.warning("未找到表格数据")
                return []

            rows = tbody.find_all('tr')
            logger.info(f"找到 {len(rows)} 行数据")

            for row in rows:
                try:
                    tds = row.find_all('td')
                    if len(tds) < 10:
                        continue

                    # 解析表格列
                    lottery_no = tds[0].text.strip()

                    # 补全期号
                    if lottery_no and re.match(r'^\d{5}$', lottery_no):
                        lottery_no = '20' + lottery_no

                    # 前区
                    front_texts = [tds[i].text.strip() for i in range(1, 6)]
                    front_balls = sorted([int(t) for t in front_texts if t.isdigit()])

                    # 后区
                    back_texts = [tds[i].text.strip() for i in range(6, 8)]
                    back_balls = sorted([int(t) for t in back_texts if t.isdigit()])

                    # 开奖日期
                    draw_date_text = tds[-1].text.strip()
                    draw_date_match = re.search(r'\d{4}-\d{2}-\d{2}', draw_date_text)
                    draw_date = draw_date_match.group() if draw_date_match else ''

                    if (lottery_no and len(front_balls) == 5 and len(back_balls) == 2 and draw_date):
                        all_results.append({
                            'lottery_no': lottery_no,
                            'draw_date': draw_date,
                            'front_balls': front_balls,
                            'back_balls': back_balls,
                            'created_at': datetime.now().isoformat()
                        })

                except (ValueError, IndexError, AttributeError) as e:
                    logger.debug(f"解析行失败: {e}")
                    continue

            logger.info(f"从 500.com 获取 {len(all_results)} 条数据")

            # 限制返回数量
            return all_results[:count] if count else all_results

        except Exception as e:
            logger.error(f"从 500.com 获取数据失败: {e}")
            raise


if __name__ == '__main__':
    logging.basicConfig(level=logging.INFO)
    spider = DLTSpider()

    # 测试爬取
    try:
        data = spider.fetch_500com_data('25102', '25131')
        print(f"\n共爬取 {len(data)} 条数据")
        for item in data[:3]:
            print(item)
    except Exception as e:
        logger.error(f"爬取失败: {e}")
