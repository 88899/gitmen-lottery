"""
全局异常处理和通知模块
"""

import logging
import traceback
from datetime import datetime, timedelta
from typing import Dict, Optional
import hashlib
import json
from pathlib import Path

logger = logging.getLogger(__name__)


class ErrorNotifier:
    """错误通知器"""
    
    def __init__(self):
        self.last_errors = {}  # 用于防止重复通知
        self.error_cache_file = Path("logs/error_cache.json")
        self.error_cache_file.parent.mkdir(exist_ok=True)
        self._load_error_cache()
    
    def _load_error_cache(self):
        """加载错误缓存"""
        try:
            if self.error_cache_file.exists():
                with open(self.error_cache_file, 'r', encoding='utf-8') as f:
                    self.last_errors = json.load(f)
        except Exception as e:
            logger.warning(f"加载错误缓存失败: {e}")
            self.last_errors = {}
    
    def _save_error_cache(self):
        """保存错误缓存"""
        try:
            with open(self.error_cache_file, 'w', encoding='utf-8') as f:
                json.dump(self.last_errors, f, ensure_ascii=False, indent=2)
        except Exception as e:
            logger.warning(f"保存错误缓存失败: {e}")
    
    def _get_error_hash(self, error_type: str, error_message: str) -> str:
        """生成错误哈希值，用于去重"""
        content = f"{error_type}:{error_message}"
        return hashlib.md5(content.encode()).hexdigest()[:8]
    
    def _should_notify(self, error_hash: str, cooldown_minutes: int = 30) -> bool:
        """判断是否应该发送通知（防止重复）"""
        now = datetime.now()
        
        if error_hash in self.last_errors:
            last_time = datetime.fromisoformat(self.last_errors[error_hash])
            if now - last_time < timedelta(minutes=cooldown_minutes):
                return False
        
        self.last_errors[error_hash] = now.isoformat()
        self._save_error_cache()
        return True
    
    def notify_error(self, 
                    error_type: str,
                    error_message: str,
                    context: Dict = None,
                    severity: str = "ERROR",
                    cooldown_minutes: int = 30) -> bool:
        """
        发送错误通知
        
        Args:
            error_type: 错误类型 (如 "NETWORK_ERROR", "PARSE_ERROR")
            error_message: 错误消息
            context: 上下文信息 (如 lottery_type, url 等)
            severity: 严重程度 ("INFO", "WARNING", "ERROR", "CRITICAL")
            cooldown_minutes: 冷却时间（分钟），防止重复通知
        
        Returns:
            bool: 是否成功发送通知
        """
        try:
            # 生成错误哈希
            error_hash = self._get_error_hash(error_type, error_message)
            
            # 检查是否需要通知
            if not self._should_notify(error_hash, cooldown_minutes):
                logger.debug(f"错误通知已在冷却期内，跳过: {error_type}")
                return False
            
            # 构建通知消息
            message = self._build_error_message(error_type, error_message, context, severity)
            
            # 发送 Telegram 通知
            return self._send_telegram_notification(message, severity)
            
        except Exception as e:
            logger.error(f"发送错误通知失败: {e}", exc_info=True)
            return False
    
    def _build_error_message(self, error_type: str, error_message: str, 
                           context: Dict, severity: str) -> str:
        """构建错误通知消息"""
        # 选择合适的图标
        icons = {
            "INFO": "ℹ️",
            "WARNING": "⚠️", 
            "ERROR": "❌",
            "CRITICAL": "🚨"
        }
        icon = icons.get(severity, "❌")
        
        # 构建消息
        message = f"{icon} <b>系统错误通知</b>\n\n"
        message += f"🔍 <b>错误类型:</b> {error_type}\n"
        message += f"📝 <b>错误信息:</b> {error_message}\n"
        message += f"⚡ <b>严重程度:</b> {severity}\n"
        message += f"🕐 <b>发生时间:</b> {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n"
        
        # 添加上下文信息
        if context:
            message += f"\n📊 <b>上下文信息:</b>\n"
            for key, value in context.items():
                message += f"  • {key}: {value}\n"
        
        message += f"\n🏷️ <b>错误ID:</b> <code>{self._get_error_hash(error_type, error_message)}</code>"
        message += f"\n💻 <b>环境:</b> Python版本"
        
        return message
    
    def _send_telegram_notification(self, message: str, severity: str) -> bool:
        """发送 Telegram 通知（独立实现，仅发送给 Bot）"""
        try:
            import os
            import requests
            
            # 获取配置
            bot_token = os.getenv('TELEGRAM_BOT_TOKEN')
            chat_id = os.getenv('TELEGRAM_CHAT_ID')
            
            if not bot_token or not chat_id:
                logger.warning("Telegram 配置不完整，无法发送错误通知")
                return False
            
            # 构建 API URL
            api_url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
            
            # 准备请求数据
            data = {
                'chat_id': chat_id,
                'text': message,
                'parse_mode': 'HTML',
                'disable_web_page_preview': True
            }
            
            # 代理配置（如果需要）
            proxies = None
            proxy_url = os.getenv('TELEGRAM_PROXY')
            if proxy_url:
                proxies = {
                    'http': proxy_url,
                    'https': proxy_url
                }
            
            # 发送请求
            response = requests.post(
                api_url,
                json=data,
                timeout=10,
                proxies=proxies
            )
            
            if response.status_code == 200:
                logger.info(f"错误通知已发送给 Bot: {severity}")
                return True
            else:
                logger.warning(f"错误通知发送失败: HTTP {response.status_code}")
                return False
                
        except Exception as e:
            logger.error(f"发送 Telegram 错误通知失败: {e}")
            return False


# 全局错误通知器实例
error_notifier = ErrorNotifier()


def handle_critical_error(error_type: str, error_message: str, context: Dict = None):
    """处理严重错误（立即通知）"""
    error_notifier.notify_error(
        error_type=error_type,
        error_message=error_message,
        context=context,
        severity="CRITICAL",
        cooldown_minutes=5  # 严重错误冷却时间较短
    )


def handle_network_error(error_code: str, url: str = None, lottery_type: str = None):
    """处理网络错误"""
    context = {}
    if url:
        context['url'] = url
    if lottery_type:
        context['lottery_type'] = lottery_type
    
    error_notifier.notify_error(
        error_type="NETWORK_ERROR",
        error_message=f"网络请求失败，错误代码: {error_code}",
        context=context,
        severity="ERROR",
        cooldown_minutes=15
    )


def handle_parse_error(error_message: str, lottery_type: str = None, data_source: str = None):
    """处理数据解析错误"""
    context = {}
    if lottery_type:
        context['lottery_type'] = lottery_type
    if data_source:
        context['data_source'] = data_source
    
    error_notifier.notify_error(
        error_type="PARSE_ERROR", 
        error_message=error_message,
        context=context,
        severity="WARNING",
        cooldown_minutes=20
    )


def handle_database_error(error_message: str, operation: str = None):
    """处理数据库错误"""
    context = {}
    if operation:
        context['operation'] = operation
    
    error_notifier.notify_error(
        error_type="DATABASE_ERROR",
        error_message=error_message,
        context=context,
        severity="ERROR",
        cooldown_minutes=10
    )


def setup_global_exception_handler():
    """设置全局异常处理器"""
    import sys
    
    def global_exception_handler(exc_type, exc_value, exc_traceback):
        """全局异常处理函数"""
        if issubclass(exc_type, KeyboardInterrupt):
            # 用户中断，不发送通知
            sys.__excepthook__(exc_type, exc_value, exc_traceback)
            return
        
        # 构建错误信息
        error_message = str(exc_value)
        traceback_str = ''.join(traceback.format_exception(exc_type, exc_value, exc_traceback))
        
        # 发送严重错误通知
        handle_critical_error(
            error_type="UNHANDLED_EXCEPTION",
            error_message=f"{exc_type.__name__}: {error_message}",
            context={
                'traceback': traceback_str[-500:]  # 只取最后500字符，避免消息过长
            }
        )
        
        # 调用默认异常处理器
        sys.__excepthook__(exc_type, exc_value, exc_traceback)
    
    # 设置全局异常处理器
    sys.excepthook = global_exception_handler
    logger.info("全局异常处理器已设置")