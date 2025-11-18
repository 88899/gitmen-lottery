#!/usr/bin/env python
"""
Telegram 连接测试脚本
"""

import os
from dotenv import load_dotenv
from core.telegram_bot import TelegramBot
import logging

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

# 加载环境变量
load_dotenv()

def main():
    print("=" * 60)
    print("Telegram 连接测试")
    print("=" * 60)
    print()
    
    # 检查配置
    bot_token = os.getenv('TELEGRAM_BOT_TOKEN')
    chat_id = os.getenv('TELEGRAM_CHAT_ID')
    proxy = os.getenv('TELEGRAM_PROXY')
    
    print(f"Bot Token: {bot_token[:20]}..." if bot_token else "Bot Token: 未配置")
    print(f"Chat ID: {chat_id}")
    print(f"代理: {proxy if proxy else '未配置（直连）'}")
    print()
    
    # 创建 Bot 实例
    bot = TelegramBot()
    
    # 测试连接
    print("测试连接...")
    if bot.test_connection():
        print("✅ 连接成功！")
        print()
        
        # 发送测试消息
        print("发送测试消息...")
        if bot.send_message("🎰 <b>测试消息</b>\n\n这是一条测试消息，Telegram Bot 配置正常！"):
            print("✅ 消息发送成功！")
        else:
            print("❌ 消息发送失败")
    else:
        print("❌ 连接失败")
        print()
        print("请检查：")
        print("1. TELEGRAM_BOT_TOKEN 和 TELEGRAM_CHAT_ID 是否正确")
        print("2. 如果在中国大陆，是否配置了 TELEGRAM_PROXY")
        print("3. 代理服务是否正常运行")

if __name__ == '__main__':
    main()
