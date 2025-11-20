"""
七星彩 (QXC) 爬虫
从 500.com 获取七星彩开奖数据

七星彩规则：
- 7个号码，每个号码范围 0-9
- 每周二、五开奖
"""

import requests
from bs4 import BeautifulSoup
import logging
from typing import List, Dict
import re
from core.error_handler import handle_network_error, handle_parse_error

logger = logging.getLogger(__name__)


class QXCSpider:
    """七星彩爬虫类 - 使用 500.com"""

    BASE_URL = "https://datachart.500.com/qxc/history/inc/history.php"

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
            logger.info("从 500.com 获取七星彩最新数据...")
            data = self._fetch_from_500com()
            if data and len(data) > 0:
                result = data[:count] if count else data
                logger.info(f"成功获取 {len(data)} 条数据，返回 {len(result)} 条")
                return result
            raise Exception("未获取到数据")
        
        # 场景2: 按期号范围获取
        url = f"{self.BASE_URL}?start={start_issue}&end={end_issue}"
        logger.info(f"从 500.com 获取七星彩期号范围数据: {start_issue} - {end_issue}")
        
        try:
            response = self.session.get(url, headers=self.HEADERS, timeout=self.timeout)
            response.raise_for_status()
            
            data = self._parse_html(response.text)
            logger.info(f"成功获取 {len(data)} 条数据")
            return data
            
        except requests.exceptions.RequestException as e:
            error_code = getattr(e.response, 'status_code', 'UNKNOWN') if hasattr(e, 'response') and e.response else 'NETWORK'
            handle_network_error(str(error_code), url, 'qxc')
            logger.error(f"网络请求失败: {e}")
            return []
        except Exception as e:
            handle_parse_error(f"数据获取失败: {str(e)}", 'qxc', '500.com')
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
            handle_network_error(str(error_code), self.BASE_URL, 'qxc')
            logger.error(f"从 500.com 网络请求失败: {e}")
            return []
        except Exception as e:
            handle_parse_error(f"从 500.com 获取数据失败: {str(e)}", 'qxc', '500.com')
            logger.error(f"从 500.com 获取数据失败: {e}")
            return []

    def _parse_html(self, html: str) -> List[Dict]:
        """解析 500.com 的 HTML 数据
        
        七星彩的 HTML 结构：
        - 第三个 table 是数据表
        - 第0列：期号
        - 第1列：中奖号码（空格分隔的7个数字）
        - 第4列：开奖日期
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
                    if len(cells) < 5:
                        continue
                    
                    # 第0列：期号
                    lottery_no = cells[0].get_text(strip=True)
                    if not lottery_no or not re.match(r'^\d{5,7}$', lottery_no):
                        continue
                    
                    # 补全期号为7位
                    if len(lottery_no) == 5:
                        lottery_no = '20' + lottery_no
                    
                    # 第1列：中奖号码（空格分隔）
                    numbers_text = cells[1].get_text(strip=True)
                    numbers = [int(n) for n in numbers_text.split() if n.isdigit()]
                    
                    if len(numbers) != 7:
                        logger.debug(f"期号 {lottery_no} 号码数量不对: {len(numbers)}")
                        continue
                    
                    # 第4列：开奖日期
                    draw_date = cells[4].get_text(strip=True)
                    if not re.match(r'^\d{4}-\d{2}-\d{2}$', draw_date):
                        logger.debug(f"期号 {lottery_no} 日期格式不对: {draw_date}")
                        continue
                    
                    results.append({
                        'lottery_no': lottery_no,
                        'draw_date': draw_date,
                        'numbers': numbers,
                        'num1': numbers[0],
                        'num2': numbers[1],
                        'num3': numbers[2],
                        'num4': numbers[3],
                        'num5': numbers[4],
                        'num6': numbers[5],
                        'num7': numbers[6]
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
