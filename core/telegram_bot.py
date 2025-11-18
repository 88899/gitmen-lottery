"""
Telegram 机器人通知模块
"""

import requests
import logging
from typing import List, Dict, Optional
import os

logger = logging.getLogger(__name__)


class TelegramBot:
    """Telegram 机器人类"""

    def __init__(self, bot_token: str = None, chat_id: str = None):
        """
        初始化 Telegram 机器人

        Args:
            bot_token: 机器人 Token
            chat_id: 聊天 ID
        """
        self.bot_token = bot_token or os.getenv('TELEGRAM_BOT_TOKEN')
        self.chat_id = chat_id or os.getenv('TELEGRAM_CHAT_ID')
        self.api_url = f"https://api.telegram.org/bot{self.bot_token}"

        if not self.bot_token or not self.chat_id:
            logger.warning("Telegram 配置未设置，通知功能将不可用")

    def send_message(self, text: str, parse_mode: str = 'HTML') -> bool:
        """
        发送消息

        Args:
            text: 消息内容
            parse_mode: 解析模式 (HTML/Markdown)

        Returns:
            是否发送成功
        """
        if not self.bot_token or not self.chat_id:
            logger.warning("Telegram 未配置，跳过发送")
            return False

        try:
            url = f"{self.api_url}/sendMessage"
            data = {
                'chat_id': self.chat_id,
                'text': text,
                'parse_mode': parse_mode
            }

            response = requests.post(url, json=data, timeout=10)
            response.raise_for_status()

            logger.info("Telegram 消息发送成功")
            return True

        except Exception as e:
            logger.error(f"Telegram 消息发送失败: {e}")
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

    def test_connection(self) -> bool:
        """
        测试连接

        Returns:
            是否连接成功
        """
        try:
            url = f"{self.api_url}/getMe"
            response = requests.get(url, timeout=10)
            response.raise_for_status()
            
            data = response.json()
            if data.get('ok'):
                bot_info = data.get('result', {})
                logger.info(f"Telegram 机器人连接成功: @{bot_info.get('username')}")
                return True
            else:
                logger.error("Telegram 机器人连接失败")
                return False

        except Exception as e:
            logger.error(f"Telegram 连接测试失败: {e}")
            return False
