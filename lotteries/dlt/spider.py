"""
大乐透（DLT）爬虫 - 优化版本
只使用 500.com 作为数据源

大乐透规则：
- 前区：从1-35中选5个（不重复）
- 后区：从1-12中选2个（不重复）
- 每周一、三、六开奖
"""

import requests
from bs4 import BeautifulSoup
import logging
from typing import List, Dict
import re
from core.error_handler import handle_network_error, handle_parse_error

logger = logging.getLogger(__name__)


class DLTSpider:
    """大乐透爬虫类 - 只使用 500.com"""

    # 数据源：500彩票网（稳定可靠）
    BASE_URL = "https://datachart.500.com/dlt/history/newinc/history.php"

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
        统一的爬取接口（重构版）
        
        Args:
            start_issue: 起始期号（5位格式，如 '07001'），可选
            end_issue: 结束期号（5位格式，如 '25200'），可选
            count: 获取最新 N 条（仅当 start/end 都为 None 时使用），可选
            
        Returns:
            中奖数据列表
            
        使用场景：
            1. 全量爬取: fetch(start_issue="07001", end_issue="25200")
            2. 增量爬取: fetch(start_issue="25132", end_issue="25200")  # 获取所有新数据
            3. 获取最新: fetch() 或 fetch(count=1)  # 不带参数返回所有可用数据（约30条）
        """
        # 场景1: 获取最新数据（不带参数）
        if start_issue is None and end_issue is None:
            logger.info("从 500.com 获取大乐透最新数据...")
            data = self._fetch_from_500com()
            if data and len(data) > 0:
                # 如果指定了 count，则限制返回数量；否则返回所有数据
                result = data[:count] if count else data
                logger.info(f"成功获取 {len(data)} 条数据，返回 {len(result)} 条")
                return result
            raise Exception("未获取到数据")
        
        # 场景2: 按期号范围获取
        url = f"{self.BASE_URL}?start={start_issue}&end={end_issue}"
        logger.info(f"从 500.com 获取期号范围数据: {start_issue} - {end_issue}")
        
        try:
            response = self.session.get(url, headers=self.HEADERS, timeout=self.timeout)
            response.raise_for_status()
            
            data = self._parse_html(response.text)
            logger.info(f"成功获取 {len(data)} 条数据")
            return data
            
        except requests.exceptions.RequestException as e:
            # 网络错误，发送通知
            error_code = getattr(e.response, 'status_code', 'UNKNOWN') if hasattr(e, 'response') and e.response else 'NETWORK'
            handle_network_error(str(error_code), url, 'dlt')
            logger.error(f"网络请求失败: {e}")
            return []
        except Exception as e:
            # 其他错误，发送通知
            handle_parse_error(f"数据获取失败: {str(e)}", 'dlt', '500.com')
            logger.error(f"获取数据失败: {e}")
            return []
    
    # 兼容旧接口
    def fetch_latest(self, count: int = 1) -> List[Dict]:
        """获取最新数据（兼容旧接口）"""
        return self.fetch(count=count)
    
    def fetch_by_range(self, start_issue: str, end_issue: str) -> List[Dict]:
        """按期号范围获取（兼容旧接口）"""
        return self.fetch(start_issue=start_issue, end_issue=end_issue)
    
    def fetch_500com_data(self, start_issue: str, end_issue: str) -> List[Dict]:
        """按期号范围获取（兼容旧接口）"""
        return self.fetch(start_issue=start_issue, end_issue=end_issue)

    def _fetch_from_500com(self) -> List[Dict]:
        """从 500.com 获取数据（不带参数返回最近30期）"""
        try:
            response = self.session.get(
                self.BASE_URL,
                headers=self.HEADERS,
                timeout=self.timeout
            )
            response.raise_for_status()
            
            return self._parse_html(response.text)
            
        except requests.exceptions.RequestException as e:
            # 网络错误，发送通知
            error_code = getattr(e.response, 'status_code', 'UNKNOWN') if hasattr(e, 'response') and e.response else 'NETWORK'
            handle_network_error(str(error_code), self.BASE_URL, 'dlt')
            logger.error(f"从 500.com 网络请求失败: {e}")
            return []
        except Exception as e:
            # 其他错误，发送通知
            handle_parse_error(f"从 500.com 获取数据失败: {str(e)}", 'dlt', '500.com')
            logger.error(f"从 500.com 获取数据失败: {e}")
            return []

    def _parse_html(self, html: str) -> List[Dict]:
        """解析 500.com 的 HTML 数据
        
        注意：500.com 返回的数据已按期号从新到旧排序
        """
        results = []
        
        try:
            soup = BeautifulSoup(html, 'html.parser')
            tbody = soup.find('tbody', id='tdata')
            
            if not tbody:
                logger.warning("未找到数据表格")
                return results
            
            rows = tbody.find_all('tr')
            logger.info(f"找到 {len(rows)} 行数据")
            
            for row in rows:
                try:
                    cells = row.find_all('td')
                    if len(cells) < 10:
                        continue
                    
                    # 提取文本内容
                    texts = [cell.get_text(strip=True).replace(',', '') for cell in cells]
                    
                    # 期号（第0列）
                    lottery_no = texts[0]
                    # 补全期号：如果是5位数字，补全为7位
                    if lottery_no and re.match(r'^\d{5}$', lottery_no):
                        lottery_no = '20' + lottery_no
                    
                    # 前区（第1-5列）
                    front_balls = []
                    for i in range(1, 6):
                        if texts[i] and re.match(r'^\d+$', texts[i]):
                            front_balls.append(int(texts[i]))
                    front_balls = sorted(front_balls)
                    
                    # 后区（第6-7列）
                    back_balls = []
                    for i in range(6, 8):
                        if texts[i] and re.match(r'^\d+$', texts[i]):
                            back_balls.append(int(texts[i]))
                    back_balls = sorted(back_balls)
                    
                    # 开奖日期（最后一列）
                    draw_date = texts[-1]
                    
                    # 验证数据完整性
                    if (lottery_no and re.match(r'^\d{7}$', lottery_no) and
                        len(front_balls) == 5 and len(back_balls) == 2 and
                        draw_date and re.match(r'^\d{4}-\d{2}-\d{2}$', draw_date)):
                        
                        results.append({
                            'lottery_no': lottery_no,
                            'draw_date': draw_date,
                            'front_balls': front_balls,
                            'back_balls': back_balls
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
