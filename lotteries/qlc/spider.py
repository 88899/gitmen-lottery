"""
七乐彩 (QLC) 爬虫
从 500.com 获取七乐彩开奖数据

七乐彩规则：
- 7个基本号（从1-30中选择，不重复）
- 1个特别号（从剩余号码中选择）
- 每周一、三、五开奖
"""

import requests
from bs4 import BeautifulSoup
import logging
from typing import List, Dict
import re
from core.error_handler import handle_network_error, handle_parse_error

logger = logging.getLogger(__name__)


class QLCSpider:
    """七乐彩爬虫类 - 使用 500.com"""

    BASE_URL = "https://datachart.500.com/qlc/history/newinc/history.php"

    HEADERS = {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Referer': 'https://www.500.com/',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
    }

    def __init__(self, timeout: int = 10, retry_times: int = 3):
        self.timeout = timeout
        self.retry_times = retry_times
        self.session = requests.Session()

    def fetch(self, start_issue: str = None, end_issue: str = None, count: int = None) -> List[Dict]:
        """
        统一的爬取接口
        
        Args:
            start_issue: 起始期号（5位格式，如 '04001'）
            end_issue: 结束期号（5位格式，如 '25133'）
            count: 获取最新 N 条（仅当 start/end 都为 None 时使用）
            
        Returns:
            中奖数据列表
        """
        # 场景1: 获取最新数据
        if start_issue is None and end_issue is None:
            logger.info("从 500.com 获取七乐彩最新数据...")
            data = self._fetch_from_500com()
            if data and len(data) > 0:
                result = data[:count] if count else data
                logger.info(f"成功获取 {len(data)} 条数据，返回 {len(result)} 条")
                return result
            raise Exception("未获取到数据")
        
        # 场景2: 按期号范围获取
        url = f"{self.BASE_URL}?start={start_issue}&end={end_issue}"
        logger.info(f"从 500.com 获取七乐彩期号范围数据: {start_issue} - {end_issue}")
        
        try:
            response = self.session.get(url, headers=self.HEADERS, timeout=self.timeout)
            response.raise_for_status()
            
            data = self._parse_html(response.text)
            logger.info(f"成功获取 {len(data)} 条数据")
            return data
            
        except requests.exceptions.RequestException as e:
            error_code = getattr(e.response, 'status_code', 'UNKNOWN') if hasattr(e, 'response') and e.response else 'NETWORK'
            handle_network_error(str(error_code), url, 'qlc')
            logger.error(f"网络请求失败: {e}")
            return []
        except Exception as e:
            handle_parse_error(f"数据获取失败: {str(e)}", 'qlc', '500.com')
            logger.error(f"获取数据失败: {e}")
            return []
    
    def fetch_latest(self, count: int = 1) -> List[Dict]:
        """获取最新数据（兼容旧接口）"""
        return self.fetch(count=count)
    
    def fetch_by_range(self, start_issue: str, end_issue: str) -> List[Dict]:
        """按期号范围获取（兼容旧接口）"""
        return self.fetch(start_issue=start_issue, end_issue=end_issue)

    def _fetch_from_500com(self) -> List[Dict]:
        """从 500.com 获取数据"""
        try:
            response = self.session.get(
                self.BASE_URL,
                headers=self.HEADERS,
                timeout=self.timeout
            )
            response.raise_for_status()
            
            return self._parse_html(response.text)
            
        except requests.exceptions.RequestException as e:
            error_code = getattr(e.response, 'status_code', 'UNKNOWN') if hasattr(e, 'response') and e.response else 'NETWORK'
            handle_network_error(str(error_code), self.BASE_URL, 'qlc')
            logger.error(f"从 500.com 网络请求失败: {e}")
            return []
        except Exception as e:
            handle_parse_error(f"从 500.com 获取数据失败: {str(e)}", 'qlc', '500.com')
            logger.error(f"从 500.com 获取数据失败: {e}")
            return []

    def _parse_html(self, html: str) -> List[Dict]:
        """解析 500.com 的 HTML 数据
        
        七乐彩的 HTML 结构：
        - 第三个 table 是数据表
        - 第0列：期号
        - 第1列：中奖号码（7个基本号 + 1个特别号，空格分隔）
        - 第5列：开奖日期
        """
        results = []
        
        try:
            soup = BeautifulSoup(html, 'html.parser')
            
            # 查找所有 table，数据在第三个表格
            tables = soup.find_all('table')
            
            if len(tables) < 3:
                logger.warning(f"未找到数据表格，只找到 {len(tables)} 个表格")
                return results
            
            # 第三个表格是数据表
            data_table = tables[2]
            rows = data_table.find_all('tr')
            logger.info(f"找到 {len(rows)} 行数据")
            
            # 跳过表头（第一行）
            for row in rows[1:]:
                try:
                    cells = row.find_all('td')
                    if len(cells) < 6:
                        continue
                    
                    # 第0列：期号
                    lottery_no = cells[0].get_text(strip=True)
                    if not lottery_no or not re.match(r'^\d{5,7}$', lottery_no):
                        continue
                    
                    # 补全期号为7位
                    if len(lottery_no) == 5:
                        lottery_no = '20' + lottery_no
                    
                    # 第1列：中奖号码（格式如 "04 09 15 20 23 25 2721"，最后两个数字连在一起）
                    numbers_text = cells[1].get_text(strip=True)
                    
                    # 先按空格分割
                    parts = numbers_text.split()
                    numbers = []
                    
                    for part in parts:
                        # 如果是2位数字，直接添加
                        if len(part) == 2 and part.isdigit():
                            numbers.append(int(part))
                        # 如果是4位数字，拆分成两个2位数字（特别号连在一起的情况）
                        elif len(part) == 4 and part.isdigit():
                            numbers.append(int(part[:2]))
                            numbers.append(int(part[2:]))
                        # 其他情况尝试解析
                        elif part.isdigit():
                            numbers.append(int(part))
                    
                    if len(numbers) != 8:
                        logger.debug(f"期号 {lottery_no} 号码数量不对: {len(numbers)}, 原文: {numbers_text}")
                        continue
                    
                    # 前7个是基本号，最后1个是特别号
                    basic_balls = numbers[:7]
                    special_ball = numbers[7]
                    
                    # 第5列：开奖日期
                    draw_date = cells[5].get_text(strip=True)
                    if not re.match(r'^\d{4}-\d{2}-\d{2}$', draw_date):
                        logger.debug(f"期号 {lottery_no} 日期格式不对: {draw_date}")
                        continue
                    
                    results.append({
                        'lottery_no': lottery_no,
                        'draw_date': draw_date,
                        'basic_balls': basic_balls,
                        'special_ball': special_ball,
                        'basic1': basic_balls[0],
                        'basic2': basic_balls[1],
                        'basic3': basic_balls[2],
                        'basic4': basic_balls[3],
                        'basic5': basic_balls[4],
                        'basic6': basic_balls[5],
                        'basic7': basic_balls[6],
                        'special': special_ball
                    })
                    
                except Exception as e:
                    logger.debug(f"解析行数据失败: {e}")
                    continue
            
            logger.info(f"成功解析 {len(results)} 条数据")
            
        except Exception as e:
            logger.error(f"解析 HTML 失败: {e}")
        
        return results

    def close(self):
        """关闭会话"""
        self.session.close()
