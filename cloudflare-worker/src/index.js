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
    
    // /run 接口专注于增量更新
    // 用途：每日定时任务，检查并获取最新数据
    // 特点：从数据库最新期号开始，往后爬取到线上最新期号
    
    console.log('开始增量更新模式...');
    
    // 获取数据库中最新的期号
    const latestInDb = await db.getLatest('ssq');
    const dbLotteryNo = latestInDb ? latestInDb.lottery_no : null;
    console.log(`数据库最新期号: ${dbLotteryNo}`);
    
    // 爬取线上最新数据
    const latestOnline = await spider.fetchLatest();
    if (!latestOnline) {
      console.log('未获取到线上最新数据');
      return { success: false, message: '未获取到线上数据' };
    }
    
    const onlineLotteryNo = latestOnline.lottery_no;
    console.log(`线上最新期号: ${onlineLotteryNo}`);
    
    // 如果线上最新期号与数据库一致，说明没有新数据
    if (dbLotteryNo === onlineLotteryNo) {
      console.log('数据已是最新，无需更新');
      return { 
        success: true, 
        message: '数据已是最新', 
        mode: 'incremental',
        lottery_no: dbLotteryNo 
      };
    }
    
    // 有新数据，开始增量爬取
    // 策略：从数据库最新期号的下一期开始，往后爬到线上最新期号
    console.log('检测到新数据，开始增量爬取...');
    const newDataList = [];
    
    // 计算起始期号（数据库最新期号 + 1）
    const dbIssueNum = parseInt(dbLotteryNo);
    const onlineIssueNum = parseInt(onlineLotteryNo);
    
    console.log(`需要爬取期号范围: ${dbIssueNum + 1} 到 ${onlineIssueNum}`);
    
    // 从数据库最新期号的下一期开始，逐个爬取到线上最新期号
    for (let issueNum = dbIssueNum + 1; issueNum <= onlineIssueNum; issueNum++) {
      const currentIssue = issueNum.toString().padStart(dbLotteryNo.length, '0');
      
      // 检查是否已存在（防止重复）
      const exists = await db.checkExists('ssq', currentIssue);
      if (exists) {
        console.log(`期号 ${currentIssue} 已存在，跳过`);
        continue;
      }
      
      // 获取当前期号的数据
      const issueData = await spider.fetchIssueDetail(currentIssue);
      
      if (issueData) {
        console.log(`获取到新数据: ${currentIssue}`);
        newDataList.push(issueData);
      } else {
        console.log(`期号 ${currentIssue} 未找到数据，跳过`);
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
    
    // 初始化数据库（全量爬取模式）
    // 用途：首次运行时批量导入历史数据
    // 特点：每次爬取固定数量，从数据库最旧的期号往前爬，自动去重
    if (url.pathname === '/init' && request.method === 'POST') {
      try {
        const db = new Database(env.DB);
        await db.init();
        
        const spider = new SSQSpider();
        
        // 获取数据库中最旧的记录
        const oldest = await db.getOldest('ssq');
        let allData = [];
        
        if (oldest) {
          // 如果数据库有数据，从最旧的日期往前推
          const oldestDate = new Date(oldest.draw_date);
          
          // 结束日期：最旧记录的前一天
          const endDate = new Date(oldestDate);
          endDate.setDate(endDate.getDate() - 1);
          
          // 开始日期：往前推 6 个月（双色球每周3次，6个月约78期）
          const startDate = new Date(endDate);
          startDate.setMonth(startDate.getMonth() - 6);
          
          // 格式化日期
          const startDateStr = startDate.toISOString().split('T')[0];
          const endDateStr = endDate.toISOString().split('T')[0];
          
          console.log(`数据库最旧记录: ${oldest.lottery_no} (${oldest.draw_date})`);
          console.log(`查询日期范围: ${startDateStr} 至 ${endDateStr}`);
          
          // 按日期范围查询（查到多少就返回多少）
          try {
            allData = await spider.fetchByDateRange(startDateStr, endDateStr);
            console.log(`从主数据源查询到 ${allData.length} 条数据`);
          } catch (error) {
            console.log(`主数据源失败: ${error.message}，尝试备用数据源...`);
            // 主数据源失败，尝试备用数据源
            try {
              allData = await spider.fetchAllFrom500(100);
              console.log(`从备用数据源获取到 ${allData.length} 条数据`);
            } catch (backupError) {
              console.log(`备用数据源也失败: ${backupError.message}`);
              allData = [];
            }
          }
        } else {
          // 如果数据库为空，获取最新数据
          console.log(`数据库为空，获取最新数据...`);
          
          try {
            // 先尝试主数据源
            allData = await spider.fetchAll(100);
            console.log(`从主数据源获取到 ${allData.length} 条数据`);
          } catch (error) {
            console.log(`主数据源失败: ${error.message}，尝试备用数据源...`);
            // 主数据源失败，尝试备用数据源（500.com）
            try {
              allData = await spider.fetchAllFrom500(30);
              console.log(`从备用数据源获取到 ${allData.length} 条数据`);
            } catch (backupError) {
              console.log(`备用数据源也失败: ${backupError.message}`);
              allData = [];
            }
          }
        }
        
        if (allData.length === 0) {
          return new Response(
            JSON.stringify({
              success: false,
              message: '未获取到数据',
              total: await db.getCount('ssq')
            }),
            {
              headers: { 'Content-Type': 'application/json; charset=utf-8' }
            }
          );
        }
        
        // 批量插入（存在的自动跳过）
        const result = await db.batchInsert('ssq', allData);
        const currentTotal = await db.getCount('ssq');
        
        console.log(`插入完成: 新增 ${result.inserted} 条，跳过 ${result.skipped} 条，当前总计 ${currentTotal} 条`);
        
        // 发送通知
        if (config.telegramBotToken && config.telegramChatId) {
          const telegram = new TelegramBot(config.telegramBotToken, config.telegramChatId);
          await telegram.sendMessage(
            `✅ 批量导入完成\n\n` +
            `新增: ${result.inserted} 条\n` +
            `跳过: ${result.skipped} 条\n` +
            `当前总计: ${currentTotal} 条\n\n` +
            `💡 继续触发 /init 可导入更多历史数据`
          );
        }
        
        return new Response(
          JSON.stringify({
            success: true,
            message: '批量导入完成',
            inserted: result.inserted,
            skipped: result.skipped,
            total: currentTotal,
            batch_size: batchSize
          }),
          {
            headers: { 'Content-Type': 'application/json; charset=utf-8' }
          }
        );
      } catch (error) {
        console.error('初始化失败:', error);
        return new Response(
          JSON.stringify({
            success: false,
            error: error.message
          }),
          {
            status: 500,
            headers: { 'Content-Type': 'application/json; charset=utf-8' }
          }
        );
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
