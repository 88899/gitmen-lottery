/**
 * 彩票预测系统 - Cloudflare Workers 版本
 * 主入口文件
 * 
 * 说明：定时任务通过 Cloudflare Dashboard 的触发器配置
 */

import { SSQSpider } from './spiders/ssq.js';
import { SSQPredictor } from './predictors/ssq.js';
import { TelegramBot } from './utils/telegram.js';
import { Database } from './utils/database.js';

/**
 * 从 KV 获取配置
 */
async function getConfig(env) {
  const config = {
    telegramBotToken: await env.KV_BINDING.get('TELEGRAM_BOT_TOKEN'),
    telegramChatId: await env.KV_BINDING.get('TELEGRAM_CHAT_ID'),
    apiKey: await env.KV_BINDING.get('API_KEY')
  };
  
  // 如果 KV 中没有配置，尝试从环境变量获取（兼容性）
  if (!config.telegramBotToken) config.telegramBotToken = env.TELEGRAM_BOT_TOKEN;
  if (!config.telegramChatId) config.telegramChatId = env.TELEGRAM_CHAT_ID;
  if (!config.apiKey) config.apiKey = env.API_KEY;
  
  return config;
}

/**
 * 执行每日任务（由 Cloudflare 触发器调用）
 * 智能判断：首次运行爬取全量数据，后续运行爬取增量数据
 */
async function runDailyTask(env) {
  console.log('每日任务开始执行:', new Date().toISOString());
  
  const config = await getConfig(env);
  const telegram = new TelegramBot(config.telegramBotToken, config.telegramChatId);
  
  try {
    const db = new Database(env.DB);
    const spider = new SSQSpider();
    const predictor = new SSQPredictor(db);
    
    // 检查数据库中是否有数据
    const dataCount = await db.getCount('ssq');
    console.log(`数据库中现有数据: ${dataCount} 条`);
    
    // 首次运行：爬取全量数据（分批处理，避免超时）
    if (dataCount === 0) {
      console.log('检测到首次运行，开始爬取历史数据...');
      await telegram.sendMessage(
        '🚀 系统首次运行，开始初始化历史数据...\n\n' +
        '⚠️ 由于数据量大，将分批爬取\n' +
        '建议：多次手动触发 /run 直到数据完整'
      );
      
      // 每次只爬取 100 期，避免超时
      const batchSize = 100;
      const allData = await spider.fetchAll(batchSize);
      console.log(`本次爬取到 ${allData.length} 条历史数据`);
      
      if (allData.length === 0) {
        return {
          success: false,
          message: '未获取到数据',
          mode: 'full'
        };
      }
      
      const result = await db.batchInsert('ssq', allData);
      console.log(`批量插入完成: 新增 ${result.inserted} 条，跳过 ${result.skipped} 条`);
      
      await telegram.sendMessage(
        `✅ 本批次数据导入完成\n\n` +
        `新增: ${result.inserted} 条\n` +
        `跳过: ${result.skipped} 条\n` +
        `总计: ${allData.length} 条\n\n` +
        `💡 提示：请继续手动触发 /run\n` +
        `直到提示"数据已是最新"`
      );
      
      return {
        success: true,
        message: '首次运行完成（分批模式）',
        mode: 'full',
        inserted: result.inserted,
        skipped: result.skipped,
        batch_size: batchSize
      };
    }
    
    // 后续运行：智能增量爬取
    console.log('开始智能增量爬取...');
    
    // 获取数据库中最新的期号
    const latestInDb = await db.getLatest('ssq');
    const latestLotteryNo = latestInDb ? latestInDb.lottery_no : null;
    console.log(`数据库最新期号: ${latestLotteryNo}`);
    
    // 爬取最新数据
    const latestOnline = await spider.fetchLatest();
    if (!latestOnline) {
      console.log('未获取到线上最新数据');
      return { success: false, message: '未获取到线上数据' };
    }
    
    console.log(`线上最新期号: ${latestOnline.lottery_no}`);
    
    // 如果线上最新期号与数据库一致，说明没有新数据
    if (latestLotteryNo === latestOnline.lottery_no) {
      console.log('数据已是最新，无需更新');
      return { 
        success: true, 
        message: '数据已是最新', 
        mode: 'incremental',
        lottery_no: latestLotteryNo 
      };
    }
    
    // 有新数据，开始增量爬取
    console.log('检测到新数据，开始增量爬取...');
    const newDataList = [];
    let currentIssue = latestOnline.lottery_no;
    let consecutiveNotFound = 0;
    const maxNotFound = 3; // 连续3次未找到新数据则停止
    
    // 从最新期号开始往前爬，直到遇到数据库中已有的数据
    while (consecutiveNotFound < maxNotFound) {
      // 检查当前期号是否已存在
      const exists = await db.checkExists('ssq', currentIssue);
      
      if (exists) {
        console.log(`期号 ${currentIssue} 已存在，停止爬取`);
        break;
      }
      
      // 获取当前期号的数据
      const issueData = await spider.fetchIssueDetail(currentIssue);
      
      if (issueData) {
        console.log(`获取到新数据: ${currentIssue}`);
        newDataList.push(issueData);
        consecutiveNotFound = 0;
        
        // 计算上一期期号（简单递减，实际可能需要更复杂的逻辑）
        const issueNum = parseInt(currentIssue);
        currentIssue = (issueNum - 1).toString().padStart(currentIssue.length, '0');
      } else {
        consecutiveNotFound++;
        console.log(`期号 ${currentIssue} 未找到数据，连续未找到次数: ${consecutiveNotFound}`);
        
        // 尝试上一期
        const issueNum = parseInt(currentIssue);
        currentIssue = (issueNum - 1).toString().padStart(currentIssue.length, '0');
      }
      
      // 安全限制：最多爬取 100 期
      if (newDataList.length >= 100) {
        console.log('已爬取 100 期，停止');
        break;
      }
    }
    
    // 保存新数据
    if (newDataList.length > 0) {
      console.log(`准备保存 ${newDataList.length} 条新数据`);
      
      // 按期号排序（从旧到新）
      newDataList.sort((a, b) => a.lottery_no.localeCompare(b.lottery_no));
      
      const result = await db.batchInsert('ssq', newDataList);
      console.log(`保存完成: 新增 ${result.inserted} 条`);
      
      // 预测下一期
      const predictions = await predictor.predict(5);
      
      // 获取统计信息
      const frequency = await db.getFrequency('ssq');
      const stats = {
        top_red: frequency.red.slice(0, 5),
        top_blue: frequency.blue.slice(0, 3)
      };
      
      // 发送通知（使用最新一期的数据）
      const latestNew = newDataList[newDataList.length - 1];
      await telegram.sendDailyReport(latestNew, predictions, stats);
      
      return {
        success: true,
        message: '增量更新完成',
        mode: 'incremental',
        new_count: result.inserted,
        latest_lottery_no: latestNew.lottery_no
      };
    } else {
      console.log('没有新数据需要保存');
      return {
        success: true,
        message: '没有新数据',
        mode: 'incremental'
      };
    }
    
  } catch (error) {
    console.error('每日任务执行失败:', error);
    
    // 发送错误通知
    try {
      await telegram.sendError(error);
    } catch (e) {
      console.error('发送错误通知失败:', e);
    }
    
    throw error;
  }
}

export default {
  /**
   * HTTP 请求处理器
   */
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const config = await getConfig(env);
    
    // 首页
    if (url.pathname === '/') {
      return new Response(
        '🎰 彩票预测系统 - Cloudflare Workers 版本\n\n' +
        '可用接口:\n' +
        '  POST /run - 手动执行每日任务\n' +
        '  POST /init - 初始化数据库并导入历史数据\n' +
        '  GET /latest - 查询最新开奖数据\n' +
        '  GET /predict - 获取预测结果\n' +
        '  GET /stats - 查看统计信息\n' +
        '  GET /test - 测试 Telegram 连接\n\n' +
        '说明：定时任务通过 Cloudflare Dashboard 的触发器配置\n',
        {
          headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        }
      );
    }
    
    // 验证授权（需要 API_KEY 的接口）
    const requireAuth = ['/init', '/run'];
    if (requireAuth.includes(url.pathname)) {
      const authHeader = request.headers.get('Authorization');
      if (!authHeader || authHeader !== `Bearer ${config.apiKey}`) {
        return new Response('Unauthorized', { status: 401 });
      }
    }
    
    // 初始化数据库
    if (url.pathname === '/init' && request.method === 'POST') {
      try {
        const db = new Database(env.DB);
        await db.init();
        
        // 爬取全量数据
        const spider = new SSQSpider();
        const maxCount = parseInt(url.searchParams.get('count') || '1000');
        const allData = await spider.fetchAll(maxCount);
        
        // 批量插入
        const result = await db.batchInsert('ssq', allData);
        
        // 发送通知
        if (config.telegramBotToken && config.telegramChatId) {
          const telegram = new TelegramBot(config.telegramBotToken, config.telegramChatId);
          await telegram.sendInitComplete(result.inserted);
        }
        
        return new Response(
          `初始化完成\n\n` +
          `新增: ${result.inserted} 条\n` +
          `跳过: ${result.skipped} 条\n` +
          `总计: ${allData.length} 条`,
          {
            headers: { 'Content-Type': 'text/plain; charset=utf-8' }
          }
        );
      } catch (error) {
        return new Response(`初始化失败: ${error.message}`, {
          status: 500,
          headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        });
      }
    }
    
    // 手动执行每日任务
    if (url.pathname === '/run' && request.method === 'POST') {
      try {
        const result = await runDailyTask(env);
        return new Response(JSON.stringify(result, null, 2), {
          headers: { 'Content-Type': 'application/json; charset=utf-8' }
        });
      } catch (error) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: error.message 
        }, null, 2), {
          status: 500,
          headers: { 'Content-Type': 'application/json; charset=utf-8' }
        });
      }
    }
    
    // 查询最新数据
    if (url.pathname === '/latest') {
      try {
        const db = new Database(env.DB);
        const latest = await db.getLatest('ssq');
        
        if (!latest) {
          return new Response('暂无数据', {
            status: 404,
            headers: { 'Content-Type': 'text/plain; charset=utf-8' }
          });
        }
        
        return new Response(JSON.stringify(latest, null, 2), {
          headers: { 'Content-Type': 'application/json; charset=utf-8' }
        });
      } catch (error) {
        return new Response(`查询失败: ${error.message}`, {
          status: 500,
          headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        });
      }
    }
    
    // 预测
    if (url.pathname === '/predict') {
      try {
        const db = new Database(env.DB);
        const predictor = new SSQPredictor(db);
        const count = parseInt(url.searchParams.get('count') || '5');
        const predictions = await predictor.predict(count);
        
        return new Response(JSON.stringify(predictions, null, 2), {
          headers: { 'Content-Type': 'application/json; charset=utf-8' }
        });
      } catch (error) {
        return new Response(`预测失败: ${error.message}`, {
          status: 500,
          headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        });
      }
    }
    
    // 统计信息
    if (url.pathname === '/stats') {
      try {
        const db = new Database(env.DB);
        const frequency = await db.getFrequency('ssq');
        const count = await db.getCount('ssq');
        
        const stats = {
          total_count: count,
          top_red_balls: frequency.red.slice(0, 10),
          top_blue_balls: frequency.blue.slice(0, 5)
        };
        
        return new Response(JSON.stringify(stats, null, 2), {
          headers: { 'Content-Type': 'application/json; charset=utf-8' }
        });
      } catch (error) {
        return new Response(`查询失败: ${error.message}`, {
          status: 500,
          headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        });
      }
    }
    
    // 测试 Telegram 连接
    if (url.pathname === '/test') {
      try {
        const telegram = new TelegramBot(config.telegramBotToken, config.telegramChatId);
        const success = await telegram.testConnection();
        
        if (success) {
          await telegram.sendMessage('✅ Telegram 连接测试成功！');
          return new Response('Telegram 连接正常', {
            headers: { 'Content-Type': 'text/plain; charset=utf-8' }
          });
        } else {
          return new Response('Telegram 连接失败', {
            status: 500,
            headers: { 'Content-Type': 'text/plain; charset=utf-8' }
          });
        }
      } catch (error) {
        return new Response(`测试失败: ${error.message}`, {
          status: 500,
          headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        });
      }
    }
    
    return new Response('Not Found', { status: 404 });
  }
};

// 导出 runDailyTask 供 Cloudflare 触发器使用
export { runDailyTask };
