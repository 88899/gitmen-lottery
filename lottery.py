#!/usr/bin/env python
"""
彩票预测系统 - 统一入口
"""

import sys
import argparse
from pathlib import Path

# 添加项目根目录到路径
sys.path.insert(0, str(Path(__file__).parent))

# 设置全局异常处理
from core.error_handler import setup_global_exception_handler
setup_global_exception_handler()

from core.config import SUPPORTED_LOTTERIES, LOTTERY_NAMES
from cli import fetch, predict, schedule


def main():
    """主函数"""
    parser = argparse.ArgumentParser(
        description='彩票预测系统',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
  # 处理所有彩票类型（不带参数）
  python lottery.py fetch --mode full         # 爬取所有类型的全量数据
  python lottery.py fetch --mode latest       # 爬取所有类型的最新数据
  python lottery.py predict                   # 预测所有类型
  python lottery.py schedule                  # 启动定时任务（所有类型）
  
  # 处理指定彩票类型（带参数）
  python lottery.py fetch ssq --mode full     # 仅爬取双色球全量数据
  python lottery.py fetch dlt --mode latest   # 仅爬取大乐透最新数据
  python lottery.py predict ssq               # 仅预测双色球
  python lottery.py predict dlt               # 仅预测大乐透

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
        nargs='?',
        choices=SUPPORTED_LOTTERIES,
        help='彩票类型（可选，不指定则处理所有类型）'
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
        nargs='?',
        choices=SUPPORTED_LOTTERIES,
        help='彩票类型（可选，不指定则处理所有类型）'
    )
    
    # schedule 命令（不需要指定彩票类型，自动处理所有类型）
    schedule_parser = subparsers.add_parser('schedule', help='定时任务（自动处理所有彩票类型）')
    
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        return
    
    # 执行命令
    if args.command == 'fetch':
        # 如果没有指定彩票类型，处理所有类型
        lotteries = [args.lottery] if args.lottery else ['ssq', 'dlt']
        for lottery in lotteries:
            if args.mode == 'full':
                fetch.fetch_full_history(lottery)
            else:
                fetch.fetch_latest(lottery)
    
    elif args.command == 'predict':
        # 如果没有指定彩票类型，处理所有类型
        lotteries = [args.lottery] if args.lottery else ['ssq', 'dlt']
        for lottery in lotteries:
            predict.predict(lottery)
    
    elif args.command == 'schedule':
        schedule.start_schedule()


if __name__ == '__main__':
    main()
