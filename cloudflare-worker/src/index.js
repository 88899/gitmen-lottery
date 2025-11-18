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
    apiKey: await env.KV_BINDING.get('API_KEY'),
    defaultStrategies: await env.KV_BINDING.get('DEFAULT_STRATEGIES')
  };
  
  // 如果 KV 中没有配置，尝试从环境变量获取（兼容性）
  if (!config.telegramBotToken) config.telegramBotToken = env.TELEGRAM_BOT_TOKEN;
  if (!config.telegramChatId) config.telegramChatId = env.TELEGRAM_CHAT_ID;
  if (!config.apiKey) config.apiKey = env.API_KEY;
  if (!config.defaultStrategies) config.defaultStrategies = env.DEFAULT_STRATEGIES || 'frequency';
  
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
    
    // 解析默认策略配置
    const defaultStrategies = config.defaultStrategies.split(',').map(s => s.trim());
    const predictor = new SSQPredictor(db, { strategies: defaultStrategies });
    
    // /run 接口专注于增量更新
    // 用途：每日定时任务，检查并获取最新数据
    // 策略：从 500.com 获取最新一期，与数据库比较，如果不存在则入库
    
    console.log('开始增量更新模式...');
    
    // 获取数据库中最新的一期（按开奖日期排序）
    const latestInDb = await db.getLatest('ssq');
    console.log(`数据库最新记录: ${latestInDb ? `${latestInDb.lottery_no} (${latestInDb.draw_date})` : '无数据'}`);
    
    // 从 500.com 获取最新一期数据
    console.log('从 500.com 获取最新一期数据...');
    
    let latestOnline = null;
    
    try {
      const url = 'https://datachart.500.com/ssq/history/history.shtml';
      
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`📊 数据源: 500.com (增量爬取)`);
      console.log(`🔗 URL: ${url}`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Referer': 'https://www.500.com/',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const html = await response.text();
      
      // 解析 HTML，获取最新一期数据
      const dataList = spider.parse500Html(html);
      
      // 检查返回值
      if (!Array.isArray(dataList) || dataList.length === 0) {
        throw new Error('未解析到数据');
      }
      
      // 取第一条（最新一期）
      latestOnline = dataList[0];
      console.log(`线上最新记录: ${latestOnline.lottery_no} (${latestOnline.draw_date})`);
      
    } catch (error) {
      console.error('从 500.com 获取最新数据失败:', error.message);
      
      // 降级：使用中彩网
      console.log('降级到中彩网获取最新数据...');
      try {
        latestOnline = await spider.fetchLatestFromZhcw();
        console.log(`线上最新记录（中彩网）: ${latestOnline.lottery_no} (${latestOnline.draw_date})`);
      } catch (zhcwError) {
        console.error('中彩网也失败:', zhcwError.message);
        return {
          success: false,
          message: '所有数据源均失败',
          mode: 'incremental',
          primary_error: error.message,
          fallback_error: zhcwError.message
        };
      }
    }
    
    // 比较数据库和线上的最新记录
    if (latestInDb && latestInDb.lottery_no === latestOnline.lottery_no) {
      console.log('数据已是最新，无需更新');
      return {
        success: true,
        message: '数据已是最新',
        mode: 'incremental',
        lottery_no: latestInDb.lottery_no,
        draw_date: latestInDb.draw_date
      };
    }
    
    // 有新数据，检查是否已存在
    console.log('检测到新数据，检查是否需要入库...');
    
    const exists = await db.checkExists('ssq', latestOnline.lottery_no);
    
    if (exists) {
      console.log(`期号 ${latestOnline.lottery_no} 已存在数据库，无需更新`);
      return {
        success: true,
        message: '数据已存在',
        mode: 'incremental',
        lottery_no: latestOnline.lottery_no,
        draw_date: latestOnline.draw_date
      };
    }
    
    // 新数据，入库
    console.log(`准备入库新数据: ${latestOnline.lottery_no} (${latestOnline.draw_date})`);
    
    const result = await db.batchInsert('ssq', [latestOnline]);
    console.log(`入库完成: 新增 ${result.inserted} 条`);
    
    // 预测下一期
    const predictions = await predictor.predict(5);
    
    // 获取统计信息
    const frequency = await db.getFrequency('ssq');
    const stats = {
      top_red: frequency.red.slice(0, 5),
      top_blue: frequency.blue.slice(0, 3)
    };
    
    // 发送通知
    await telegram.sendDailyReport(latestOnline, predictions, stats);
    
    return {
      success: true,
      message: '增量更新完成',
      mode: 'incremental',
      new_count: result.inserted,
      lottery_no: latestOnline.lottery_no,
      draw_date: latestOnline.draw_date
    };
    
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
        '  GET /predict?count=5&strategies=frequency,balanced - 获取预测结果\n' +
        '  GET /strategies - 查看可用预测策略\n' +
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
        
        // 使用 500.com 作为主数据源（已验证可用）
        console.log(`\n========================================`);
        console.log(`🎯 开始爬取数据`);
        console.log(`========================================`);
        
        let dataSource = '500.com';
        let queryParams = {};
        
        try {
          if (oldest) {
            console.log(`📦 数据库状态: 有数据`);
            console.log(`📌 最旧记录: ${oldest.lottery_no} (${oldest.draw_date})`);
            
            const year = parseInt(oldest.lottery_no.substring(0, 4));
            const yearPrefix = oldest.lottery_no.substring(2, 4);
            const issueNum = parseInt(oldest.lottery_no.substring(4));
            
            let endNum = issueNum - 1;
            let endYearPrefix = yearPrefix;
            
            if (endNum < 1) {
              const endYear = year - 1;
              endYearPrefix = endYear.toString().substring(2);
              endNum = 153;
            }
            
            const endIssue = endYearPrefix + endNum.toString().padStart(3, '0');
            const startNum = Math.max(1, endNum - 49);
            const startIssue = endYearPrefix + startNum.toString().padStart(3, '0');
            
            queryParams = { start: startIssue, end: endIssue };
            
            console.log(`🎲 策略: 从期号 ${startIssue} 至 ${endIssue}`);
            console.log(`========================================\n`);
            
            allData = await spider.fetchAllFrom500(50, oldest.lottery_no);
            
            // 检查返回值是否为有效数组
            if (!Array.isArray(allData)) {
              console.log(`\n========================================`);
              console.log(`❌ 爬取失败: 返回值不是数组`);
              console.log(`   数据源: ${dataSource}`);
              console.log(`   查询参数: start=${queryParams.start}, end=${queryParams.end}`);
              console.log(`   返回值:`, JSON.stringify(allData));
              console.log(`========================================\n`);
              
              // 返回错误信息并终止
              return new Response(
                JSON.stringify({
                  success: false,
                  message: allData.message || '未获取到数据',
                  source: allData.source || dataSource,
                  params: allData.params || queryParams,
                  total: await db.getCount('ssq')
                }),
                {
                  headers: { 'Content-Type': 'application/json; charset=utf-8' }
                }
              );
            }
            
            console.log(`\n========================================`);
            console.log(`✅ 爬取完成: 获取到 ${allData.length} 条数据`);
            console.log(`   数据源: ${dataSource}`);
            console.log(`   查询参数: start=${queryParams.start}, end=${queryParams.end}`);
            console.log(`========================================\n`);
          } else {
            console.log(`📦 数据库状态: 空`);
            console.log(`🎲 策略: 获取最新 50 期`);
            console.log(`========================================\n`);
            
            allData = await spider.fetchAllFrom500(50);
            
            // 检查返回值是否为有效数组
            if (!Array.isArray(allData)) {
              console.log(`\n========================================`);
              console.log(`❌ 爬取失败: 返回值不是数组`);
              console.log(`   数据源: ${dataSource}`);
              console.log(`   返回值:`, JSON.stringify(allData));
              console.log(`========================================\n`);
              
              // 返回错误信息并终止
              return new Response(
                JSON.stringify({
                  success: false,
                  message: allData.message || '未获取到数据',
                  source: allData.source || dataSource,
                  params: allData.params || {},
                  total: await db.getCount('ssq')
                }),
                {
                  headers: { 'Content-Type': 'application/json; charset=utf-8' }
                }
              );
            }
            
            if (allData.length > 0) {
              const firstIssue = allData[0].lottery_no.substring(2);
              const lastIssue = allData[allData.length - 1].lottery_no.substring(2);
              queryParams = { start: lastIssue, end: firstIssue };
            }
            
            console.log(`\n========================================`);
            console.log(`✅ 爬取完成: 获取到 ${allData.length} 条数据`);
            console.log(`   数据源: ${dataSource}`);
            console.log(`   查询参数: start=${queryParams.start || '未知'}, end=${queryParams.end || '未知'}`);
            console.log(`========================================\n`);
          }
        } catch (error) {
          console.error(`\n❌ 爬取失败: ${error.message}`);
          console.error(`   数据源: ${dataSource}`);
          console.error(`   查询参数: start=${queryParams.start || '未知'}, end=${queryParams.end || '未知'}`);
          console.error(`   错误堆栈: ${error.stack}`);
          allData = [];
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
            dataSource: dataSource,
            queryParams: queryParams
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
        
        // 获取参数
        const count = parseInt(url.searchParams.get('count') || '5');
        const strategiesParam = url.searchParams.get('strategies');
        
        // 解析策略参数（逗号分隔）
        // 如果没有指定策略，使用配置的默认策略
        let strategies = null;
        if (strategiesParam) {
          strategies = strategiesParam.split(',').map(s => s.trim());
        } else {
          // 使用配置的默认策略
          strategies = config.defaultStrategies.split(',').map(s => s.trim());
        }
        
        const predictor = new SSQPredictor(db);
        const predictions = await predictor.predict(count, strategies);
        
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
    
    // 获取可用策略列表
    if (url.pathname === '/strategies') {
      try {
        const strategies = SSQPredictor.getAvailableStrategies();
        return new Response(JSON.stringify(strategies, null, 2), {
          headers: { 'Content-Type': 'application/json; charset=utf-8' }
        });
      } catch (error) {
        return new Response(`获取策略失败: ${error.message}`, {
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