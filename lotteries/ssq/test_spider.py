#!/usr/bin/env python3
"""
测试双色球爬虫 - 验证数据源切换机制
"""

import sys
import logging
from spider import SSQSpider

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

logger = logging.getLogger(__name__)


def test_main_source():
    """测试主数据源（中彩网）"""
    print("\n" + "="*50)
    print("测试1: 主数据源（中彩网 API）")
    print("="*50)
    
    spider = SSQSpider()
    try:
        data = spider.fetch_api_recent(max_count=1)
        if data and len(data) > 0:
            print(f"✅ 主数据源正常")
            print(f"   期号: {data[0]['lottery_no']}")
            print(f"   日期: {data[0]['draw_date']}")
            print(f"   红球: {data[0]['red_balls']}")
            print(f"   蓝球: {data[0]['blue_ball']}")
            return True
        else:
            print("❌ 主数据源无数据")
            return False
    except Exception as e:
        print(f"⚠️  主数据源失败: {e}")
        return False


def test_backup_source():
    """测试备用数据源（500.com）"""
    print("\n" + "="*50)
    print("测试2: 备用数据源（500.com）")
    print("="*50)
    
    spider = SSQSpider()
    try:
        data = spider.fetch_latest_from_500com(count=1)
        if data and len(data) > 0:
            print(f"✅ 备用数据源正常")
            print(f"   期号: {data[0]['lottery_no']}")
            print(f"   日期: {data[0]['draw_date']}")
            print(f"   红球: {data[0]['red_balls']}")
            print(f"   蓝球: {data[0]['blue_ball']}")
            return True
        else:
            print("❌ 备用数据源无数据")
            return False
    except Exception as e:
        print(f"⚠️  备用数据源失败: {e}")
        return False


def test_auto_switch():
    """测试自动切换机制"""
    print("\n" + "="*50)
    print("测试3: 自动切换机制")
    print("="*50)
    
    spider = SSQSpider()
    try:
        data = spider.fetch_latest(count=1)
        if data and len(data) > 0:
            print(f"✅ 自动切换机制正常")
            print(f"   期号: {data[0]['lottery_no']}")
            print(f"   日期: {data[0]['draw_date']}")
            print(f"   红球: {data[0]['red_balls']}")
            print(f"   蓝球: {data[0]['blue_ball']}")
            return True
        else:
            print("❌ 自动切换失败，无数据")
            return False
    except Exception as e:
        print(f"❌ 自动切换失败: {e}")
        return False


def test_crawl_all():
    """测试批量爬取（少量数据）"""
    print("\n" + "="*50)
    print("测试4: 批量爬取（5期）")
    print("="*50)
    
    spider = SSQSpider()
    try:
        # 只爬取5期数据进行测试
        data = spider.crawl_all(max_pages=0, use_api_first=True)
        
        # 限制为5期
        data = data[:5] if len(data) > 5 else data
        
        if data and len(data) > 0:
            print(f"✅ 批量爬取成功")
            print(f"   获取数据: {len(data)} 条")
            print(f"   最新期号: {data[0]['lottery_no']}")
            if len(data) > 1:
                print(f"   最旧期号: {data[-1]['lottery_no']}")
            return True
        else:
            print("❌ 批量爬取失败，无数据")
            return False
    except Exception as e:
        print(f"❌ 批量爬取失败: {e}")
        return False


def main():
    """运行所有测试"""
    print("\n" + "🧪 开始测试双色球爬虫...")
    print("="*50)
    
    results = []
    
    # 测试1: 主数据源
    results.append(("主数据源", test_main_source()))
    
    # 测试2: 备用数据源
    results.append(("备用数据源", test_backup_source()))
    
    # 测试3: 自动切换
    results.append(("自动切换", test_auto_switch()))
    
    # 测试4: 批量爬取
    results.append(("批量爬取", test_crawl_all()))
    
    # 汇总结果
    print("\n" + "="*50)
    print("📊 测试结果汇总")
    print("="*50)
    
    for name, result in results:
        status = "✅ 通过" if result else "❌ 失败"
        print(f"{name}: {status}")
    
    # 统计
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    print("\n" + "="*50)
    print(f"总计: {passed}/{total} 通过")
    print("="*50)
    
    if passed == total:
        print("\n🎉 所有测试通过！")
        return 0
    else:
        print(f"\n⚠️  {total - passed} 个测试失败")
        return 1


if __name__ == '__main__':
    sys.exit(main())
