"""
Telegram 机器人通知模块
"""

import requests
import logging
from typing import List, Dict, Optional
import os

logger = logging.getLogger(__name__)


class TelegramBot:
    """Telegram 机器人类 - 支持机器人和频道发送"""

    def __init__(self, bot_token: str = None, chat_id: str = None, channel_id: str = None):
        """
        初始化 Telegram 机器人

        Args:
            bot_token: 机器人 Token
            chat_id: 聊天 ID（机器人私聊或群组）
            channel_id: 频道 ID（可选）
        """
        from core.config import (
            TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, TELEGRAM_CHANNEL_ID,
            TELEGRAM_SEND_TO_BOT, TELEGRAM_SEND_TO_CHANNEL
        )
        
        self.bot_token = bot_token or TELEGRAM_BOT_TOKEN
        self.chat_id = chat_id or TELEGRAM_CHAT_ID
        self.channel_id = channel_id or TELEGRAM_CHANNEL_ID
        self.send_to_bot = TELEGRAM_SEND_TO_BOT
        self.send_to_channel = TELEGRAM_SEND_TO_CHANNEL
        self.api_url = f"https://api.telegram.org/bot{self.bot_token}"
        
        # 代理配置（仅本地测试使用，生产环境不需要）
        self.proxies = None
        proxy_url = os.getenv('TELEGRAM_PROXY')
        if proxy_url:
            self.proxies = {
                'http': proxy_url,
                'https': proxy_url
            }
            logger.info(f"使用代理: {proxy_url}")

        # 检查配置
        if not self.bot_token:
            logger.warning("Telegram Bot Token 未设置，通知功能将不可用")
        
        # 检查发送目标
        targets = []
        if self.send_to_bot and self.chat_id:
            targets.append(f"机器人({self.chat_id})")
        if self.send_to_channel and self.channel_id:
            targets.append(f"频道({self.channel_id})")
        
        if targets:
            logger.info(f"Telegram 发送目标: {', '.join(targets)}")
        else:
            logger.warning("未配置有效的 Telegram 发送目标")

    def send_message(self, text: str, parse_mode: str = 'HTML') -> bool:
        """
        发送消息到配置的目标（机器人和/或频道）

        Args:
            text: 消息内容
            parse_mode: 解析模式 (HTML/Markdown)

        Returns:
            是否至少有一个目标发送成功
        """
        if not self.bot_token:
            logger.warning("Telegram Bot Token 未配置，跳过发送")
            return False

        success_count = 0
        total_targets = 0

        # 发送给机器人
        if self.send_to_bot and self.chat_id:
            total_targets += 1
            if self._send_to_target(self.chat_id, text, parse_mode, "机器人"):
                success_count += 1

        # 发送给频道
        if self.send_to_channel and self.channel_id:
            total_targets += 1
            if self._send_to_target(self.channel_id, text, parse_mode, "频道"):
                success_count += 1

        if total_targets == 0:
            logger.warning("未配置有效的 Telegram 发送目标")
            return False

        logger.info(f"Telegram 消息发送完成: {success_count}/{total_targets} 成功")
        return success_count > 0

    def _send_to_target(self, target_id: str, text: str, parse_mode: str, target_type: str) -> bool:
        """
        发送消息到指定目标

        Args:
            target_id: 目标 ID
            text: 消息内容
            parse_mode: 解析模式
            target_type: 目标类型（用于日志）

        Returns:
            是否发送成功
        """
        try:
            url = f"{self.api_url}/sendMessage"
            data = {
                'chat_id': target_id,
                'text': text,
                'parse_mode': parse_mode
            }

            response = requests.post(url, json=data, timeout=10, proxies=self.proxies)
            response.raise_for_status()

            logger.info(f"Telegram 消息发送成功 -> {target_type}({target_id})")
            return True

        except Exception as e:
            logger.error(f"Telegram 消息发送失败 -> {target_type}({target_id}): {e}")
            return False

    def send_lottery_result(self, lottery_type: str, lottery_no: str, 
                           draw_date: str, numbers: Dict) -> bool:
        """
        发送开奖结果

        Args:
            lottery_type: 彩票类型
            lottery_no: 期号
            draw_date: 开奖日期
            numbers: 号码数据

        Returns:
            是否发送成功
        """
        if lottery_type == 'ssq':
            red_balls = numbers.get('red_balls', [])
            blue_ball = numbers.get('blue_ball', 0)
            
            red_str = ' '.join([f"{x:02d}" for x in red_balls])
            blue_str = f"{blue_ball:02d}"
            
            message = f"""
🎰 <b>双色球开奖结果</b>

📅 期号: {lottery_no}
📆 日期: {draw_date}

🔴 红球: <code>{red_str}</code>
🔵 蓝球: <code>{blue_str}</code>

━━━━━━━━━━━━━━━
"""
        else:
            message = f"开奖结果: {lottery_type} {lottery_no}"

        return self.send_message(message)

    def send_prediction(self, lottery_type: str, predictions: List[Dict]) -> bool:
        """
        发送预测结果

        Args:
            lottery_type: 彩票类型
            predictions: 预测结果列表

        Returns:
            是否发送成功
        """
        if not predictions:
            return False

        if lottery_type == 'ssq':
            message = "🔮 <b>双色球预测</b>\n\n"
            
            for i, pred in enumerate(predictions[:5], 1):
                red_balls = pred.get('red_balls', [])
                blue_ball = pred.get('blue_ball', 0)
                strategy_name = pred.get('strategy_name', '')
                
                red_str = ' '.join([f"{x:02d}" for x in red_balls])
                blue_str = f"{blue_ball:02d}"
                
                message += f"<b>组合 {i}:</b>"
                
                # 添加策略名称（如果有）
                if strategy_name:
                    message += f" <i>[{strategy_name}]</i>"
                
                message += "\n"
                message += f"🔴 <code>{red_str}</code>\n"
                message += f"🔵 <code>{blue_str}</code>\n\n"
            
            message += "━━━━━━━━━━━━━━━\n"
            message += "⚠️ 仅供参考，理性购彩"
            
        elif lottery_type == 'dlt':
            message = "🔮 <b>大乐透预测</b>\n\n"
            
            for i, pred in enumerate(predictions[:5], 1):
                front_balls = pred.get('front_balls', [])
                back_balls = pred.get('back_balls', [])
                strategy_name = pred.get('strategy_name', '')
                
                front_str = ' '.join([f"{x:02d}" for x in front_balls])
                back_str = ' '.join([f"{x:02d}" for x in back_balls])
                
                message += f"<b>组合 {i}:</b>"
                
                # 添加策略名称（如果有）
                if strategy_name:
                    message += f" <i>[{strategy_name}]</i>"
                
                message += "\n"
                message += f"🔴 前区: <code>{front_str}</code>\n"
                message += f"🔵 后区: <code>{back_str}</code>\n\n"
            
            message += "━━━━━━━━━━━━━━━\n"
            message += "⚠️ 仅供参考，理性购彩"
            
        elif lottery_type == 'qxc':
            message = "🔮 <b>七星彩预测</b>\n\n"
            
            for i, pred in enumerate(predictions[:5], 1):
                numbers = pred.get('numbers', [])
                strategy_name = pred.get('strategy_name', '')
                
                numbers_str = ' '.join([str(n) for n in numbers])
                
                message += f"<b>组合 {i}:</b>"
                
                if strategy_name:
                    message += f" <i>[{strategy_name}]</i>"
                
                message += "\n"
                message += f"🔢 <code>{numbers_str}</code>\n\n"
            
            message += "━━━━━━━━━━━━━━━\n"
            message += "⚠️ 仅供参考，理性购彩"
            
        elif lottery_type == 'qlc':
            message = "🔮 <b>七乐彩预测</b>\n\n"
            
            for i, pred in enumerate(predictions[:5], 1):
                basic_balls = pred.get('basic_balls', [])
                special_ball = pred.get('special_ball', 0)
                strategy_name = pred.get('strategy_name', '')
                
                basic_str = ' '.join([f"{int(b):02d}" for b in basic_balls])
                special_str = f"{int(special_ball):02d}"
                
                message += f"<b>组合 {i}:</b>"
                
                if strategy_name:
                    message += f" <i>[{strategy_name}]</i>"
                
                message += "\n"
                message += f"🔴 基本号: <code>{basic_str}</code>\n"
                message += f"🔵 特别号: <code>{special_str}</code>\n\n"
            
            message += "━━━━━━━━━━━━━━━\n"
            message += "⚠️ 仅供参考，理性购彩"
        else:
            message = f"预测结果: {lottery_type}"

        return self.send_message(message)

    def send_daily_report(self, lottery_type: str, latest_result: Dict, 
                         predictions: List[Dict], stats: Dict = None) -> bool:
        """
        发送每日报告

        Args:
            lottery_type: 彩票类型
            latest_result: 最新开奖结果
            predictions: 预测结果
            stats: 统计信息

        Returns:
            是否发送成功
        """
        if lottery_type == 'ssq':
            # 开奖结果
            red_balls = latest_result.get('red_balls', [])
            blue_ball = latest_result.get('blue_ball', 0)
            red_str = ' '.join([f"{x:02d}" for x in red_balls])
            blue_str = f"{blue_ball:02d}"
            
            message = f"""
📊 <b>双色球每日报告</b>

━━━━━━━━━━━━━━━
🎰 <b>最新开奖</b>

📅 期号: {latest_result.get('lottery_no', 'N/A')}
📆 日期: {latest_result.get('draw_date', 'N/A')}

🔴 红球: <code>{red_str}</code>
🔵 蓝球: <code>{blue_str}</code>

━━━━━━━━━━━━━━━
🔮 <b>下期预测</b>

"""
            # 预测结果
            for i, pred in enumerate(predictions[:3], 1):
                pred_red = pred.get('red_balls', [])
                pred_blue = pred.get('blue_ball', 0)
                strategy_name = pred.get('strategy_name', '')
                
                pred_red_str = ' '.join([f"{x:02d}" for x in pred_red])
                pred_blue_str = f"{pred_blue:02d}"
                
                message += f"<b>组合 {i}:</b>"
                
                # 添加策略名称（如果有）
                if strategy_name:
                    message += f" <i>[{strategy_name}]</i>"
                
                message += "\n"
                message += f"🔴 <code>{pred_red_str}</code>\n"
                message += f"🔵 <code>{pred_blue_str}</code>\n\n"
            
            # 统计信息
            if stats:
                message += "━━━━━━━━━━━━━━━\n"
                message += "📈 <b>统计信息</b>\n\n"
                
                if 'top_red' in stats:
                    top_red = ', '.join([f"{k}({v})" for k, v in stats['top_red'][:5]])
                    message += f"高频红球: {top_red}\n"
                
                if 'top_blue' in stats:
                    top_blue = ', '.join([f"{k}({v})" for k, v in stats['top_blue'][:3]])
                    message += f"高频蓝球: {top_blue}\n"
            
            message += "\n━━━━━━━━━━━━━━━\n"
            message += "⚠️ 仅供参考，理性购彩"
        else:
            message = f"每日报告: {lottery_type}"

        return self.send_message(message)

    def send_to_bot_only(self, text: str, parse_mode: str = 'HTML') -> bool:
        """
        仅发送给机器人

        Args:
            text: 消息内容
            parse_mode: 解析模式

        Returns:
            是否发送成功
        """
        if not self.bot_token or not self.chat_id:
            logger.warning("机器人未配置，跳过发送")
            return False

        return self._send_to_target(self.chat_id, text, parse_mode, "机器人")

    def send_to_channel_only(self, text: str, parse_mode: str = 'HTML') -> bool:
        """
        仅发送给频道

        Args:
            text: 消息内容
            parse_mode: 解析模式

        Returns:
            是否发送成功
        """
        if not self.bot_token or not self.channel_id:
            logger.warning("频道未配置，跳过发送")
            return False

        return self._send_to_target(self.channel_id, text, parse_mode, "频道")

    def get_channel_info(self) -> Optional[Dict]:
        """
        获取频道信息

        Returns:
            频道信息字典，失败返回 None
        """
        if not self.bot_token or not self.channel_id:
            return None

        try:
            url = f"{self.api_url}/getChat"
            data = {'chat_id': self.channel_id}
            
            response = requests.post(url, json=data, timeout=10, proxies=self.proxies)
            response.raise_for_status()
            
            result = response.json()
            if result.get('ok'):
                return result.get('result')
            else:
                logger.error(f"获取频道信息失败: {result.get('description')}")
                return None

        except Exception as e:
            logger.error(f"获取频道信息失败: {e}")
            return None

    def test_connection(self) -> bool:
        """
        测试连接

        Returns:
            是否连接成功
        """
        try:
            url = f"{self.api_url}/getMe"
            response = requests.get(url, timeout=10, proxies=self.proxies)
            response.raise_for_status()
            
            data = response.json()
            if data.get('ok'):
                bot_info = data.get('result', {})
                logger.info(f"Telegram 机器人连接成功: @{bot_info.get('username')}")
                
                # 测试频道连接（如果配置了）
                if self.channel_id:
                    channel_info = self.get_channel_info()
                    if channel_info:
                        channel_title = channel_info.get('title', 'Unknown')
                        channel_username = channel_info.get('username', '')
                        if channel_username:
                            logger.info(f"频道连接成功: {channel_title} (@{channel_username})")
                        else:
                            logger.info(f"频道连接成功: {channel_title}")
                    else:
                        logger.warning("频道连接失败或无权限")
                
                return True
            else:
                logger.error("Telegram 机器人连接失败")
                return False

        except Exception as e:
            logger.error(f"Telegram 连接测试失败: {e}")
            return False

    def get_config_info(self) -> Dict:
        """
        获取当前配置信息

        Returns:
            配置信息字典
        """
        return {
            'bot_token_configured': bool(self.bot_token),
            'chat_id': self.chat_id,
            'channel_id': self.channel_id,
            'send_to_bot': self.send_to_bot,
            'send_to_channel': self.send_to_channel,
            'proxy_configured': bool(self.proxies)
        }
