"""
全局配置
"""

import os
from pathlib import Path

# 加载环境变量
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    # 如果没有安装 python-dotenv，忽略
    pass

# 项目根目录
PROJECT_ROOT = Path(__file__).parent.parent

# 日志目录
LOG_DIR = PROJECT_ROOT / 'logs'
LOG_DIR.mkdir(exist_ok=True)

# 数据目录
DATA_DIR = PROJECT_ROOT / 'data'
DATA_DIR.mkdir(exist_ok=True)

# 备份目录
BACKUP_DIR = DATA_DIR / 'backup'
BACKUP_DIR.mkdir(exist_ok=True)

# 导出目录
EXPORT_DIR = DATA_DIR / 'export'
EXPORT_DIR.mkdir(exist_ok=True)

# 日志配置
LOG_FORMAT = '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO')

# 数据库配置
DB_CONFIG = {
    'host': os.getenv('MYSQL_HOST'),
    'port': int(os.getenv('MYSQL_PORT', 3306)),
    'user': os.getenv('MYSQL_USER'),
    'password': os.getenv('MYSQL_PASSWORD'),
    'database': os.getenv('MYSQL_DATABASE'),
}

# SSL配置
if os.getenv('MYSQL_USE_SSL', 'false').lower() in ['1', 'true', 'yes']:
    DB_CONFIG['use_ssl'] = True
    DB_CONFIG['ssl_ca'] = os.getenv('MYSQL_SSL_CA')

# 爬虫配置
SPIDER_CONFIG = {
    'timeout': int(os.getenv('SPIDER_TIMEOUT', 15)),
    'retry_times': int(os.getenv('SPIDER_RETRY_TIMES', 3)),
    'min_delay': float(os.getenv('SPIDER_MIN_DELAY', 0.5)),  # 最小请求间隔（秒）
    'max_delay': float(os.getenv('SPIDER_MAX_DELAY', 2.0)),  # 最大请求间隔（秒）
    'batch_size': int(os.getenv('SPIDER_BATCH_SIZE', 100)),  # 批量处理大小
}

# 数据库性能配置
DB_PERFORMANCE = {
    'batch_insert_size': int(os.getenv('DB_BATCH_SIZE', 100)),  # 批量插入大小
    'connection_timeout': int(os.getenv('DB_CONNECT_TIMEOUT', 10)),
    'read_timeout': int(os.getenv('DB_READ_TIMEOUT', 30)),
    'write_timeout': int(os.getenv('DB_WRITE_TIMEOUT', 30)),
}

# 安全配置
SECURITY_CONFIG = {
    'max_retry_attempts': 3,  # 最大重试次数
    'rate_limit_delay': 60,  # 触发限流后的等待时间（秒）
    'enable_ssl_verify': True,  # 是否验证SSL证书
}

# 支持的彩票类型
SUPPORTED_LOTTERIES = ['ssq', 'dlt', 'ks3', 'sdlt']

# 彩票名称映射
LOTTERY_NAMES = {
    'ssq': '双色球',
    'dlt': '大乐透',
    'ks3': '快开3',
    'sdlt': '超级大乐透',
}

# 预测配置
DEFAULT_STRATEGIES = os.getenv('DEFAULT_STRATEGIES', 'frequency,balanced,coldHot').split(',')
DEFAULT_PREDICTION_COUNT = int(os.getenv('DEFAULT_PREDICTION_COUNT', 5))

# Telegram 配置
TELEGRAM_BOT_TOKEN = os.getenv('TELEGRAM_BOT_TOKEN')
TELEGRAM_CHAT_ID = os.getenv('TELEGRAM_CHAT_ID')
TELEGRAM_CHANNEL_ID = os.getenv('TELEGRAM_CHANNEL_ID')  # 频道 ID（可选）
TELEGRAM_SEND_TO_BOT = os.getenv('TELEGRAM_SEND_TO_BOT', 'true').lower() in ['true', '1', 'yes']
TELEGRAM_SEND_TO_CHANNEL = os.getenv('TELEGRAM_SEND_TO_CHANNEL', 'false').lower() in ['true', '1', 'yes']
TELEGRAM_PROXY_HOST = os.getenv('TELEGRAM_PROXY_HOST')
TELEGRAM_PROXY_PORT = int(os.getenv('TELEGRAM_PROXY_PORT', 0)) if os.getenv('TELEGRAM_PROXY_PORT') else None
