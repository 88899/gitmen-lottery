#!/usr/bin/env python
"""
彩票预测系统 - 统一入口
"""

import sys
import argparse
from pathlib import Path

# 添加项目根目录到路径
sys.path.insert(0, str(Path(__file__).parent))

from core.config import SUPPORTED_LOTTERIES, LOTTERY_NAMES
from cli import fetch, predict, schedule


def main():
    """主函数"""
    parser = argparse.ArgumentParser(
        description='彩票预测系统',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
  # 双色球
  python lottery.py fetch ssq --mode full     # 爬取全量数据
  python lottery.py fetch ssq --mode latest   # 爬取最新数据
  python lottery.py predict ssq               # 预测号码
  python lottery.py schedule ssq              # 启动定时任务
  
  # 大乐透
  python lottery.py fetch dlt --mode full     # 爬取全量数据
  python lottery.py fetch dlt --mode latest   # 爬取最新数据
  python lottery.py predict dlt               # 预测号码
  
  # 定时任务（自动处理所有彩票类型）
  python lottery.py schedule                  # 启动定时任务（双色球+大乐透）

支持的彩票类型:
  ssq  - 双色球
  dlt  - 大乐透
  ks3  - 快开3
  sdlt - 超级大乐透
        """
    )
    
    subparsers = parser.add_subparsers(dest='command', help='命令')
    
    # fetch 命令
    fetch_parser = subparsers.add_parser('fetch', help='爬取数据')
    fetch_parser.add_argument(
        'lottery',
        choices=SUPPORTED_LOTTERIES,
        help='彩票类型'
    )
    fetch_parser.add_argument(
        '--mode',
        choices=['full', 'latest'],
        default='latest',
        help='爬取模式: full=全量, latest=增量（默认）'
    )
    
    # predict 命令
    predict_parser = subparsers.add_parser('predict', help='预测号码')
    predict_parser.add_argument(
        'lottery',
        choices=SUPPORTED_LOTTERIES,
        help='彩票类型'
    )
    
    # schedule 命令（不需要指定彩票类型，自动处理所有类型）
    schedule_parser = subparsers.add_parser('schedule', help='定时任务（自动处理所有彩票类型）')
    
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        return
    
    # 执行命令
    if args.command == 'fetch':
        if args.mode == 'full':
            fetch.fetch_full_history(args.lottery)
        else:
            fetch.fetch_latest(args.lottery)
    
    elif args.command == 'predict':
        predict.predict(args.lottery)
    
    elif args.command == 'schedule':
        schedule.start_schedule()


if __name__ == '__main__':
    main()
