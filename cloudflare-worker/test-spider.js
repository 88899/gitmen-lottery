/**
 * 测试爬虫脚本
 * 用于本地测试数据源是否正常工作
 */

import { SSQSpider } from './src/spiders/ssq.js';

async function testSpider() {
  console.log('🧪 开始测试爬虫...\n');
  
  const spider = new SSQSpider();
  
  // 测试1: 获取最新数据
  console.log('📊 测试1: 获取最新数据');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  try {
    const latest = await spider.fetchLatest();
    if (latest) {
      console.log('✅ 成功获取最新数据:');
      console.log(`   期号: ${latest.lottery_no}`);
      console.log(`   日期: ${latest.draw_date}`);
      console.log(`   红球: ${latest.red_balls.join(', ')}`);
      console.log(`   蓝球: ${latest.blue_ball}`);
    } else {
      console.log('❌ 未获取到数据');
    }
  } catch (error) {
    console.log('❌ 获取失败:', error.message);
  }
  
  console.log('\n');
  
  // 测试2: 从主数据源获取
  console.log('📊 测试2: 从主数据源（中彩网）获取');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  try {
    const zhcwData = await spider.fetchLatestFromZhcw();
    if (zhcwData) {
      console.log('✅ 中彩网数据源正常');
      console.log(`   期号: ${zhcwData.lottery_no}`);
    } else {
      console.log('❌ 中彩网数据源无数据');
    }
  } catch (error) {
    console.log('⚠️  中彩网数据源失败:', error.message);
  }
  
  console.log('\n');
  
  // 测试3: 从备用数据源获取
  console.log('📊 测试3: 从备用数据源（500.com）获取');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  try {
    const data500 = await spider.fetchLatestFrom500();
    if (data500) {
      console.log('✅ 500.com 数据源正常');
      console.log(`   期号: ${data500.lottery_no}`);
      console.log(`   日期: ${data500.draw_date}`);
      console.log(`   红球: ${data500.red_balls.join(', ')}`);
      console.log(`   蓝球: ${data500.blue_ball}`);
    } else {
      console.log('❌ 500.com 数据源无数据');
    }
  } catch (error) {
    console.log('⚠️  500.com 数据源失败:', error.message);
  }
  
  console.log('\n');
  
  // 测试4: 获取少量历史数据
  console.log('📊 测试4: 获取少量历史数据（10期）');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  try {
    const allData = await spider.fetchAll(10);
    console.log(`✅ 成功获取 ${allData.length} 条历史数据`);
    if (allData.length > 0) {
      console.log(`   最新期号: ${allData[0].lottery_no}`);
      console.log(`   最旧期号: ${allData[allData.length - 1].lottery_no}`);
    }
  } catch (error) {
    console.log('❌ 获取历史数据失败:', error.message);
  }
  
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🎉 测试完成！');
}

// 运行测试
testSpider().catch(console.error);
