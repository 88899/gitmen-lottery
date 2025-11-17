"""
双色球 (SSQ - Super Lotto) 爬虫 - 改进版本
处理动态加载的网站数据

网址: https://www.zhcw.com/kjxx/ssq/

双色球规则：
- 红球：从1-33中选6个（不重复）
- 蓝球：从1-16中选1个
- 每周二、四、日开奖
"""

import requests
from bs4 import BeautifulSoup
import logging
from typing import List, Dict
import time
from datetime import datetime, timedelta
import json
import re

try:
    from dateutil.relativedelta import relativedelta
except ImportError:
    # 如果没有 dateutil，提供备选方案
    def relativedelta(months=0, days=0, **kwargs):
        """简化版的 relativedelta，仅支持months和days参数"""
        class RD:
            def __init__(self, m=0, d=0):
                self.months = m
                self.days = d
            def __add__(self, dt):
                if self.months > 0:
                    month = dt.month + self.months
                    year = dt.year + (month - 1) // 12
                    month = (month - 1) % 12 + 1
                    return datetime(year, month, dt.day, dt.hour, dt.minute, dt.second)
                return dt + timedelta(days=self.days)
        return RD(m=months, d=days)

logger = logging.getLogger(__name__)


class SSQSpider:
    """双色球爬虫类 - 支持动态网站"""

    # 中奖网 API 端点 (基于逆向工程)
    API_BASE_URL = "https://www.zhcw.com/api"
    BASE_URL = "https://www.zhcw.com/kjxx/ssq/"
    API_ENDPOINT = "https://jc.zhcw.com/port/client_json.php"

    HEADERS = {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Referer': 'https://www.zhcw.com/',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'zh-CN,zh;q=0.9',
    }

    # 备用数据源：500彩票网
    BACKUP_500_URL = "https://datachart.500.com/ssq/history/newinc/history.php"

    def __init__(self, timeout: int = 10, retry_times: int = 3):
        self.timeout = timeout
        self.retry_times = retry_times
        self.session = requests.Session()

    def fetch_latest(self, count: int = 1) -> List[Dict]:
        """获取最新开奖数据（支持自动切换数据源）
        
        优先使用主数据源（中彩网），失败时自动切换到备用数据源（500.com）
        
        Args:
            count: 要获取的期数（默认1期）
            
        Returns:
            中奖数据列表
        """
        # 先尝试主数据源（中彩网 API）
        try:
            logger.info("尝试从主数据源（中彩网）获取最新数据...")
            api_data = self.fetch_api_recent(max_count=count)
            if api_data and len(api_data) > 0:
                logger.info(f"主数据源成功获取 {len(api_data)} 条数据")
                return api_data[:count]
        except Exception as e:
            logger.warning(f"主数据源失败: {e}")
        
        # 主数据源失败，尝试备用数据源（500.com）
        try:
            logger.info("尝试从备用数据源（500.com）获取最新数据...")
            backup_data = self.fetch_latest_from_500com(count=count)
            if backup_data and len(backup_data) > 0:
                logger.info(f"备用数据源成功获取 {len(backup_data)} 条数据")
                return backup_data
        except Exception as backup_error:
            logger.error(f"备用数据源也失败: {backup_error}")
        
        # 所有数据源都失败
        raise Exception("所有数据源均失败，无法获取数据")

    def fetch_page(self, page: int = 1) -> str:
        """
        获取分页数据（HTML形式）

        Args:
            page: 页码，从1开始

        Returns:
            HTML内容
        """
        url = f"{self.BASE_URL}?page={page}"

        for attempt in range(self.retry_times):
            try:
                response = self.session.get(
                    url,
                    headers=self.HEADERS,
                    timeout=self.timeout
                )
                response.encoding = 'utf-8'
                response.raise_for_status()
                return response.text
            except requests.RequestException as e:
                logger.warning(f"第 {attempt + 1} 次尝试失败 (页 {page}): {e}")
                if attempt < self.retry_times - 1:
                    time.sleep(2 ** attempt)
                else:
                    logger.error(f"获取第 {page} 页失败: {e}")
                    raise

    def parse_lottery_data(self, html: str) -> List[Dict]:
        """
        解析HTML中的彩票数据

        Returns:
            中奖号码列表，每条包含：
            {
                'lottery_no': '期号',
                'draw_date': '开奖日期',
                'red_balls': [红球号码列表],
                'blue_ball': 蓝球号码,
                'created_at': '爬取时间'
            }
        """
        soup = BeautifulSoup(html, 'lxml')
        lottery_list = []

        # 方法1: 尝试从表格结构解析（最可靠）
        try:
            rows = soup.select('table tbody tr')
            if not rows:
                rows = soup.select('table tr')

            for row in rows:
                try:
                    cols = row.find_all('td')
                    if len(cols) >= 4:
                        lottery_data = self._parse_table_row(cols)
                        if lottery_data:
                            lottery_list.append(lottery_data)
                except (ValueError, AttributeError, IndexError) as e:
                    logger.debug(f"解析行数据失败: {e}")
                    continue

            if lottery_list:
                logger.debug(f"表格解析成功，获取 {len(lottery_list)} 条数据")
                return lottery_list
        except Exception as e:
            logger.debug(f"表格解析失败: {e}")

        # 方法2: 尝试从 HTML 中提取 JSON 数据（动态渲染页面）
        try:
            scripts = soup.find_all('script')
            for script in scripts:
                if script.string and 'window.__' in script.string:
                    match = re.search(r'window\.__[A-Z_]+\s*=\s*({.*?});', script.string, re.DOTALL)
                    if match:
                        data = json.loads(match.group(1))
                        lottery_data = self._extract_from_json(data)
                        if lottery_data:
                            logger.debug(f"JSON解析成功，获取 {len(lottery_data)} 条数据")
                            return lottery_data
        except Exception as e:
            logger.debug(f"JSON 解析失败: {e}")

        # 方法3: 尝试 div 结构（备选方案）
        if not lottery_list:
            lottery_list = self._parse_div_structure(soup)

        return lottery_list

    def _parse_table_row(self, cols) -> Dict:
        """解析表格行 - 支持多种表格结构"""
        try:
            # 清理文本
            texts = [col.text.strip() for col in cols]

            # 过滤空值
            texts = [t for t in texts if t]

            if len(texts) < 4:
                return None

            # 常见表格结构：期号 | 日期 | 红球1-6 | 蓝球 | 其他
            # 尝试识别期号（通常是纯数字，6-8位）
            lottery_no = None
            for i, text in enumerate(texts):
                if re.match(r'^\d{5,8}$', text):
                    lottery_no = text
                    break

            if not lottery_no and texts[0]:
                # 如果第一列看起来像期号，就用它
                lottery_no = texts[0]

            # 查找日期（YYYY-MM-DD 格式）
            draw_date = None
            for text in texts:
                if re.search(r'\d{4}-\d{2}-\d{2}', text):
                    draw_date = re.search(r'\d{4}-\d{2}-\d{2}', text).group()
                    break

            # 查找红球和蓝球（数字集合）
            red_balls = None
            blue_ball = None

            for text in texts:
                numbers = self._extract_numbers(text)
                if len(numbers) == 6 and not red_balls:
                    red_balls = sorted(numbers)
                elif len(numbers) == 1 and not blue_ball and numbers[0] <= 16:
                    blue_ball = numbers[0]

            # 数据有效性检查
            if (lottery_no and
                draw_date and
                red_balls and len(red_balls) == 6 and
                blue_ball and 1 <= blue_ball <= 16):
                return {
                    'lottery_no': lottery_no,
                    'draw_date': draw_date,
                    'red_balls': red_balls,
                    'blue_ball': blue_ball,
                    'created_at': datetime.now().isoformat()
                }
        except Exception as e:
            logger.debug(f"解析表格行失败: {e}")

        return None

    def _extract_numbers(self, text: str) -> List[int]:
        """从文本中提取数字"""
        numbers = re.findall(r'\d+', text)
        return [int(n) for n in numbers]

    def _extract_from_json(self, data: Dict) -> List[Dict]:
        """从 JSON 数据中提取彩票信息"""
        lottery_list = []

        # 常见的 JSON 结构模式
        possible_keys = ['data', 'result', 'items', 'draws', 'records', 'content']

        for key in possible_keys:
            if key in data and isinstance(data[key], (list, dict)):
                items = data[key] if isinstance(data[key], list) else data[key].get('items', [])
                for item in (items if isinstance(items, list) else []):
                    if isinstance(item, dict):
                        lottery_item = self._parse_json_item(item)
                        if lottery_item:
                            lottery_list.append(lottery_item)

        return lottery_list

    def _parse_json_item(self, item: Dict) -> Dict:
        """解析 JSON 项目"""
        try:
            result = {}

            # 期号映射
            for name in ['qh', 'number', 'id', 'issueNumber', 'issue', 'code']:
                if name in item:
                    result['lottery_no'] = str(item[name])
                    break

            # 日期映射
            for name in ['kjsj', 'date', 'drawDate', 'time', 'openTime']:
                if name in item:
                    result['draw_date'] = str(item[name])[:10]  # 只取日期部分
                    break

            # 红球映射
            for name in ['red', 'redBalls', 'reds', 'redNumbers', 'hongqiu']:
                if name in item:
                    value = item[name]
                    if isinstance(value, str):
                        result['red_balls'] = sorted(self._extract_numbers(value))
                    elif isinstance(value, list):
                        result['red_balls'] = sorted([int(x) if isinstance(x, (int, str)) else 0 for x in value if x])
                    break

            # 蓝球映射
            for name in ['blue', 'blueBall', 'blues', 'blueNumber', 'lanqiu']:
                if name in item:
                    value = item[name]
                    if isinstance(value, str):
                        nums = self._extract_numbers(value)
                        result['blue_ball'] = nums[0] if nums else 0
                    else:
                        result['blue_ball'] = int(value) if value else 0
                    break

            # 验证数据完整性
            if (result.get('lottery_no') and
                len(result.get('red_balls', [])) == 6 and
                1 <= result.get('blue_ball', 0) <= 16 and
                result.get('draw_date')):
                result['created_at'] = datetime.now().isoformat()
                return result
        except Exception as e:
            logger.debug(f"解析 JSON 项目失败: {e}")

        return None

    def _parse_div_structure(self, soup) -> List[Dict]:
        """尝试从 div 结构解析数据"""
        lottery_list = []

        # 尝试找到包含数据的 div
        items = soup.select('[data-number], [data-issue], .lottery-item, .draw-record')

        for item in items:
            try:
                lottery_item = {}

                # 从数据属性提取
                lottery_item['lottery_no'] = item.get('data-number') or item.get('data-issue', '')

                if lottery_item['lottery_no']:
                    lottery_list.append(lottery_item)
            except Exception as e:
                logger.debug(f"解析 div 结构失败: {e}")

        return lottery_list

    def crawl_all(self, max_pages: int = None, use_api_first: bool = False) -> List[Dict]:
        """
        爬取所有历史数据（分页模式，支持全量数据）
        支持自动切换数据源：主源（中彩网）失败时自动切换到备用源（500.com）

        Args:
            max_pages: 最大页数，None表示爬取所有页（真正的全量）
            use_api_first: 是否先尝试 API 快速获取（默认False，因为API只能获取1000期）
                          如果设为True，会先尝试API获取1000期，然后继续分页爬取剩余数据

        Returns:
            所有中奖号码列表
        """
        all_data = []

        # 可选：先尝试通过 API 快速获取最近1000期（作为起点，然后继续分页爬取更早的数据）
        # 注意：这里不会直接返回，而是作为初始数据，然后继续分页爬取
        if use_api_first:
            try:
                logger.info("尝试通过主数据源（中彩网 API）快速获取最近1000期...")
                api_data = self.fetch_api_recent(max_count=1000)
                if api_data and len(api_data) > 0:
                    logger.info(f"通过 API 快速获取到 {len(api_data)} 条最近数据")
                    all_data.extend(api_data)
                    logger.info("继续分页爬取更早的历史数据...")
            except Exception as e:
                logger.warning(f"API 快速获取失败: {e}，将直接使用分页爬取")
                # API 失败不影响后续的分页爬取

        # 分页爬取所有历史数据
        logger.info("开始分页爬取全量历史数据...")
        page = 1
        consecutive_empty_pages = 0

        while True:
            try:
                logger.info(f"正在爬取第 {page} 页...")
                html = self.fetch_page(page)
                page_data = self.parse_lottery_data(html)

                if not page_data or len(page_data) == 0:
                    consecutive_empty_pages += 1
                    logger.info(f"第 {page} 页无数据")

                    # 连续3页无数据则认为已爬完
                    if consecutive_empty_pages >= 3:
                        logger.info(f"连续3页无数据，爬取完成")
                        break
                else:
                    consecutive_empty_pages = 0
                    all_data.extend(page_data)
                    logger.info(f"第 {page} 页获取 {len(page_data)} 条数据，累计 {len(all_data)} 条")

                if max_pages and page >= max_pages:
                    logger.info(f"已达到最大页数限制 ({max_pages})，爬取完成")
                    break

                page += 1
                time.sleep(0.5)  # 防止请求过快

            except Exception as e:
                logger.error(f"爬取第 {page} 页失败: {e}")
                consecutive_empty_pages += 1
                if consecutive_empty_pages >= 3:
                    logger.warning(f"连续错误达3次，停止爬取")
                    break
                page += 1
                time.sleep(2)

        logger.info(f"分页爬取完成，共获取 {len(all_data)} 条数据")
        return all_data

    def fetch_api_recent(self, max_count: int = 1000) -> List[Dict]:
        """通过站点 API 获取最近若干期中奖数据（单次调用，最多1000期）。

        Args:
            max_count: 要获取的最大期数（API最大限制约1000）

        Returns:
            中奖数据列表
        """
        all_results = []

        try:
            logger.info(f"通过 API 单次调用获取最近 {max_count} 期数据...")

            # 获取期号列表
            params = {
                'transactionType': '10001003',
                'lotteryId': '1',
                'count': min(max_count, 1000),  # API 最大 1000
                'tt': str(time.time())
            }

            response = self.session.get(
                self.API_ENDPOINT,
                params=params,
                headers=self.HEADERS,
                timeout=self.timeout
            )
            response.raise_for_status()

            # API 返回 JSON
            data = response.json()
            if data.get('resCode') != '000000':
                logger.warning(f"API 返回错误: {data.get('resCode')}")
                return []

            issues = data.get('issue', [])
            if not issues:
                logger.warning("未获取到期号列表")
                return []

            logger.info(f"获取到 {len(issues)} 个期号")

            # 逐个请求每个期号的详细信息
            for i, issue in enumerate(issues):
                try:
                    detail = self.fetch_api_issue(issue)
                    if detail:
                        all_results.append(detail)
                    if (i + 1) % 100 == 0:
                        logger.info(f"已处理 {i + 1}/{len(issues)} 个期号...")
                except Exception as e:
                    logger.debug(f"获取期号 {issue} 详情失败: {e}")
                    continue
                time.sleep(0.01)  # 防止请求过快

            logger.info(f"共从 API 获取 {len(all_results)} 条数据")

        except Exception as e:
            logger.error(f"通过 API 获取数据失败: {e}")

        return all_results

    def fetch_by_date_range(self, start_date: str, end_date: str, page_size: int = 30) -> List[Dict]:
        """通过日期范围和分页获取中奖数据（推荐用于全量爬取）

        Args:
            start_date: 开始日期 (YYYY-MM-DD)
            end_date: 结束日期 (YYYY-MM-DD)
            page_size: 每页数量（API默认30）

        Returns:
            中奖数据列表
        """
        all_results = []
        page_num = 1
        max_pages_per_range = 100  # 每个日期范围最多查询100页

        logger.info(f"按日期范围爬取数据: {start_date} - {end_date}")

        while page_num <= max_pages_per_range:
            try:
                params = {
                    'transactionType': '10001001',
                    'lotteryId': '1',
                    'startDate': start_date,
                    'endDate': end_date,
                    'pageNum': page_num,
                    'pageSize': page_size,
                    'type': 2,
                    'tt': str(time.time())
                }

                logger.info(f"  获取第 {page_num} 页（{start_date} - {end_date}）...")

                response = self.session.get(
                    self.API_ENDPOINT,
                    params=params,
                    headers=self.HEADERS,
                    timeout=self.timeout
                )
                response.raise_for_status()

                data = response.json()

                if data.get('resCode') != '000000':
                    logger.warning(f"  API返回错误: {data.get('resCode')}")
                    break

                # 获取数据
                records = data.get('pageList', [])

                if not records or len(records) == 0:
                    logger.info(f"  第 {page_num} 页无数据，本日期范围爬取完成")
                    break

                logger.info(f"  获取 {len(records)} 条数据")

                # 解析每条记录
                for record in records:
                    try:
                        # API 返回的字段
                        red_str = record.get('frontWinningNum') or record.get('seqFrontWinningNum', '')
                        blue_str = record.get('backWinningNum') or record.get('seqBackWinningNum', '')

                        if not red_str or not blue_str:
                            continue

                        red_balls = sorted([int(x) for x in re.findall(r'\d+', red_str)])
                        blue_ball = int(re.findall(r'\d+', blue_str)[0])

                        if len(red_balls) != 6 or not (1 <= blue_ball <= 16):
                            continue

                        # 格式化为两位数
                        formatted_data = {
                            'lottery_no': str(record.get('issue', '')),
                            'draw_date': record.get('openTime', '')[:10],
                            'red1': f"{red_balls[0]:02d}",
                            'red2': f"{red_balls[1]:02d}",
                            'red3': f"{red_balls[2]:02d}",
                            'red4': f"{red_balls[3]:02d}",
                            'red5': f"{red_balls[4]:02d}",
                            'red6': f"{red_balls[5]:02d}",
                            'blue': f"{blue_ball:02d}",
                            'created_at': datetime.now().isoformat()
                        }

                        all_results.append(formatted_data)
                    except (ValueError, IndexError, KeyError) as e:
                        logger.debug(f"  解析记录失败: {e}")
                        continue

                page_num += 1
                time.sleep(0.3)  # 防止请求过快

            except Exception as e:
                logger.error(f"  爬取第 {page_num} 页失败: {e}")
                break

        logger.info(f"日期范围 {start_date} - {end_date} 获取 {len(all_results)} 条数据")
        return all_results

    def fetch_all_by_months(self, start_date: str = None, end_date: str = None) -> List[Dict]:
        """按月份逐步爬取全量历史数据（推荐方案）

        Args:
            start_date: 开始日期 (YYYY-MM-DD)，默认为1年前
            end_date: 结束日期 (YYYY-MM-DD)，默认为今天

        Returns:
            全部中奖数据
        """
        from datetime import datetime, timedelta
        from dateutil.relativedelta import relativedelta

        if not end_date:
            end_date = datetime.now().strftime('%Y-%m-%d')

        if not start_date:
            # 默认从1年前开始
            start_date = (datetime.strptime(end_date, '%Y-%m-%d') - timedelta(days=365)).strftime('%Y-%m-%d')

        all_results = []

        # 按月份循环爬取
        current_start = datetime.strptime(start_date, '%Y-%m-%d')
        end_datetime = datetime.strptime(end_date, '%Y-%m-%d')

        logger.info(f"开始按月份逐步爬取全量数据: {start_date} - {end_date}")

        while current_start <= end_datetime:
            # 计算本月末
            next_month = current_start + relativedelta(months=1)
            current_end = min(next_month - timedelta(days=1), end_datetime)

            date_start_str = current_start.strftime('%Y-%m-%d')
            date_end_str = current_end.strftime('%Y-%m-%d')

            logger.info(f"\n--- 爬取 {date_start_str} 至 {date_end_str} ---")

            try:
                monthly_data = self.fetch_by_date_range(date_start_str, date_end_str)
                if monthly_data:
                    logger.info(f"本月获取 {len(monthly_data)} 条数据")
                    all_results.extend(monthly_data)
                    # 注意：具体的数据库操作应在调用方处理（main.py 中），这样可以逐月入库
            except Exception as e:
                logger.error(f"爬取 {date_start_str} - {date_end_str} 失败: {e}")

            # 移到下个月
            current_start = next_month
            time.sleep(0.5)

        logger.info(f"\n========================================")
        logger.info(f"全量爬取完成，共获取 {len(all_results)} 条数据")
        logger.info(f"========================================")

        return all_results

    def fetch_latest_from_500com(self, count: int = 30) -> List[Dict]:
        """从 500.com 获取最新数据（备用数据源）
        
        注意：500.com 不带参数时返回最近30期数据
        
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
                    # 期号 | 红球1-6 | 蓝球 | 快乐星期天 | 奖池 | 一等奖注 | 一等奖金 | 二等奖注 | 二等奖金 | 投注额 | 开奖日期
                    lottery_no = tds[0].text.strip()
                    
                    # 补全期号：如果是5位数字，补全为7位（加上年份前缀20）
                    if lottery_no and re.match(r'^\d{5}$', lottery_no):
                        lottery_no = '20' + lottery_no

                    # 红球（前6列）
                    red_texts = [tds[i].text.strip() for i in range(1, 7)]
                    red_balls = sorted([int(t) for t in red_texts if t.isdigit()])

                    # 蓝球
                    blue_text = tds[7].text.strip()
                    blue_ball = int(blue_text) if blue_text.isdigit() else 0

                    # 开奖日期（倒数第一列）
                    draw_date_text = tds[-1].text.strip()
                    # 尝试提取 YYYY-MM-DD 格式
                    draw_date_match = re.search(r'\d{4}-\d{2}-\d{2}', draw_date_text)
                    draw_date = draw_date_match.group() if draw_date_match else ''

                    if (lottery_no and len(red_balls) == 6 and
                        1 <= blue_ball <= 16 and draw_date):
                        all_results.append({
                            'lottery_no': lottery_no,
                            'draw_date': draw_date,
                            'red_balls': red_balls,
                            'blue_ball': blue_ball,
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

    def fetch_500com_data(self, start_issue: str, end_issue: str) -> List[Dict]:
        """从 500.com 获取历史数据（备选源，支持大范围查询）
        
        注意：此方法已废弃，500.com 的期号范围查询不再可用
        建议使用 fetch_latest_from_500com() 获取最近30期数据

        Args:
            start_issue: 开始期号
            end_issue: 结束期号

        Returns:
            中奖数据列表
        """
        logger.warning("fetch_500com_data 方法已废弃，500.com 的期号范围查询不再可用")
        logger.info("建议使用 fetch_latest_from_500com() 获取最近30期数据")
        
        all_results = []
        url = f'https://datachart.500.com/ssq/history/newinc/history.php?start={start_issue}&end={end_issue}'

        logger.info(f"尝试从 500.com 获取数据: {start_issue} - {end_issue}")

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
                    # 期号 | 红球1-6 | 蓝球 | 快乐星期天 | 奖池 | 一等奖注 | 一等奖金 | 二等奖注 | 二等奖金 | 投注额 | 开奖日期
                    lottery_no = tds[0].text.strip()

                    # 红球（前6列）
                    red_texts = [tds[i].text.strip() for i in range(1, 7)]
                    red_balls = sorted([int(t) for t in red_texts if t.isdigit()])

                    # 蓝球
                    blue_text = tds[7].text.strip()
                    blue_ball = int(blue_text) if blue_text.isdigit() else 0

                    # 开奖日期（倒数第二列）
                    draw_date_text = tds[-1].text.strip()
                    # 尝试提取 YYYY-MM-DD 格式
                    draw_date_match = re.search(r'\d{4}-\d{2}-\d{2}', draw_date_text)
                    draw_date = draw_date_match.group() if draw_date_match else ''

                    if (lottery_no and len(red_balls) == 6 and
                        1 <= blue_ball <= 16 and draw_date):
                        all_results.append({
                            'lottery_no': lottery_no,
                            'draw_date': draw_date,
                            'red_balls': red_balls,
                            'blue_ball': blue_ball,
                            'created_at': datetime.now().isoformat()
                        })

                except (ValueError, IndexError, AttributeError) as e:
                    logger.debug(f"解析行失败: {e}")
                    continue

            logger.info(f"从 500.com 获取 {len(all_results)} 条数据")

        except Exception as e:
            logger.error(f"从 500.com 获取数据失败: {e}")

        return all_results

    def fetch_api_by_range(self, start_issue: str, end_issue: str) -> List[Dict]:
        """通过 API 按期号范围获取中奖数据（用于获取全量历史）。

        Args:
            start_issue: 开始期号（如 '2020001'）
            end_issue: 结束期号（如 '2025131'）

        Returns:
            中奖数据列表
        """
        all_results = []

        # 将期号转换为整数便于范围处理
        try:
            start_num = int(start_issue)
            end_num = int(end_issue)
        except ValueError:
            logger.error(f"无效的期号格式: {start_issue} - {end_issue}")
            return []

        batch_size = 100  # 每批处理100个期号
        current = start_num

        while current <= end_num:
            batch_end = min(current + batch_size - 1, end_num)
            try:
                logger.info(f"获取期号 {current:07d} 到 {batch_end:07d}...")

                for issue_num in range(current, batch_end + 1):
                    issue = f"{issue_num:07d}"
                    try:
                        detail = self.fetch_api_issue(issue)
                        if detail:
                            all_results.append(detail)
                    except Exception as e:
                        logger.debug(f"获取期号 {issue} 详情失败: {e}")
                        continue
                    time.sleep(0.02)  # 防止请求过快

                current = batch_end + 1
                logger.info(f"已获取 {len(all_results)} 条数据，继续...")
                time.sleep(0.5)

            except Exception as e:
                logger.error(f"获取期号范围 {current:07d}-{batch_end:07d} 失败: {e}")
                break

        logger.info(f"共获取 {len(all_results)} 条数据")
        return all_results

    def fetch_api_issue(self, issue: str) -> Dict:
        """获取指定期号的开奖详情

        Returns:
            单条开奖信息 dict 或 None
        """
        params = {
            'transactionType': '10001002',
            'lotteryId': '1',
            'issue': issue,
            'tt': str(time.time())
        }

        response = self.session.get(self.API_ENDPOINT, params=params, headers=self.HEADERS, timeout=self.timeout)
        response.raise_for_status()
        data = response.json()

        if data.get('resCode') != '000000':
            return None

        # 解析开奖号码
        # 示例字段名: 'frontWinningNum' (红球), 'backWinningNum' (蓝球), 'openTime' (开奖日期)
        red_str = data.get('frontWinningNum') or data.get('seqFrontWinningNum')
        blue_str = data.get('backWinningNum') or data.get('seqBackWinningNum')

        if not red_str or not blue_str:
            return None

        red_balls = [int(x) for x in re.findall(r"\d+", red_str)]
        blue_ball = int(re.findall(r"\d+", blue_str)[0]) if re.findall(r"\d+", blue_str) else 0

        return {
            'lottery_no': str(data.get('issue', issue)),
            'draw_date': data.get('openTime', '')[:10],
            'red_balls': sorted(red_balls),
            'blue_ball': blue_ball,
            'created_at': datetime.now().isoformat()
        }


if __name__ == '__main__':
    logging.basicConfig(level=logging.INFO)
    spider = SSQSpider()

    # 测试爬取
    try:
        data = spider.crawl_all(max_pages=1)
        print(f"\n共爬取 {len(data)} 条数据")
        for item in data[:3]:
            print(item)
    except Exception as e:
        logger.error(f"爬取失败: {e}")