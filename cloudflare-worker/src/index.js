/**
 * 彩票预测系统 - Cloudflare Workers 版本
 * 主入口文件
 * 
 * 说明：定时任务通过 Cloudflare Dashboard 的触发器配置
 */

import { SSQSpider } from './spiders/ssq.js';
import { SSQPredictor } from './predictors/ssq.js';
import { DLTSpider } from './spiders/dlt.js';
import { DLTPredictor } from './predictors/dlt.js';
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
    defaultStrategies: await env.KV_BINDING.get('DEFAULT_STRATEGIES'),
    defaultPredictionCount: await env.KV_BINDING.get('DEFAULT_PREDICTION_COUNT')
  };
  
  // 如果 KV 中没有配置，尝试从环境变量获取（兼容性）
  if (!config.telegramBotToken) config.telegramBotToken = env.TELEGRAM_BOT_TOKEN;
  if (!config.telegramChatId) config.telegramChatId = env.TELEGRAM_CHAT_ID;
  if (!config.apiKey) config.apiKey = env.API_KEY;
  if (!config.defaultStrategies) config.defaultStrategies = env.DEFAULT_STRATEGIES || 'frequency';
  if (!config.defaultPredictionCount) config.defaultPredictionCount = parseInt(env.DEFAULT_PREDICTION_COUNT || '5');
  
  return config;
}

/**
 * 获取彩票类型的爬虫和预测器
 */
function getLotteryModules(type) {
  const modules = {
    ssq: {
      name: '双色球',
      spider: SSQSpider,
      predictor: SSQPredictor,
      startYear: 2003
    },
    dlt: {
      name: '大乐透',
      spider: DLTSpider,
      predictor: DLTPredictor,
      startYear: 2007
    }
  };
  
  if (!modules[type]) {
    throw new Error(`不支持的彩票类型: ${type}。支持的类型: ${Object.keys(modules).join(', ')}`);
  }
  
  return modules[type];
}

/**
 * 从 URL 路径中提取彩票类型
 * 支持 /action/type 格式，如果没有指定类型则默认为 ssq（兼容旧版本）
 */
function extractLotteryType(pathname) {
  const parts = pathname.split('/').filter(p => p);
  
  // 如果路径有两部分，第二部分是彩票类型
  if (parts.length >= 2) {
    const type = parts[1];
    if (type === 'ssq' || type === 'dlt') {
      return type;
    }
  }
  
  // 默认返回 ssq（兼容旧版本）
  return 'ssq';
}

/**
 * 处理单个彩票类型的增量更新和预测
 */
async function processSingleLottery(type, env, config) {
  const modules = getLotteryModules(type);
  const db = new Database(env.DB);
  const spider = new modules.spider();
  
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`📊 处理 ${modules.name}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  
  try {
    
    // 获取数据库中最新的一期
    const latestInDb = await db.getLatest(type);
    console.log(`数据库最新记录: ${latestInDb ? `${latestInDb.lottery_no} (${latestInDb.draw_date})` : '无数据'}`);
    
    // 获取线上最新一期数据
    console.log('获取线上最新数据...');
    let latestOnline = await spider.fetchLatest();
    
    if (!latestOnline) {
      console.log('⚠ 未获取到线上数据');
      return {
        type: type,
        name: modules.name,
        success: false,
        message: '未获取到线上数据'
      };
    }
    
    console.log(`线上最新记录: ${latestOnline.lottery_no} (${latestOnline.draw_date})`);
    
    // 比较数据库和线上的最新记录
    if (latestInDb && latestInDb.lottery_no === latestOnline.lottery_no) {
      console.log('✓ 数据已是最新，无需更新');
      return {
        type: type,
        name: modules.name,
        success: true,
        message: '数据已是最新',
        hasNewData: false,
        lottery_no: latestInDb.lottery_no,
        draw_date: latestInDb.draw_date
      };
    }
    
    // 有新数据，检查是否已存在
    console.log('检测到新数据，检查是否需要入库...');
    const exists = await db.checkExists(type, latestOnline.lottery_no);
    
    if (exists) {
      console.log(`✓ 期号 ${latestOnline.lottery_no} 已存在数据库`);
      return {
        type: type,
        name: modules.name,
        success: true,
        message: '数据已存在',
        hasNewData: false,
        lottery_no: latestOnline.lottery_no,
        draw_date: latestOnline.draw_date
      };
    }
    
    // 新数据，入库
    console.log(`准备入库新数据: ${latestOnline.lottery_no} (${latestOnline.draw_date})`);
    const result = await db.batchInsert(type, [latestOnline]);
    console.log(`✓ 入库完成: 新增 ${result.inserted} 条`);
    
    // 预测下一期
    console.log('开始预测下一期...');
    const defaultStrategies = config.defaultStrategies.split(',').map(s => s.trim());
    const predictor = new modules.predictor(db, { strategies: defaultStrategies });
    const predictions = await predictor.predict(config.defaultPredictionCount);
    console.log(`✓ 预测完成: ${predictions.length} 组`);
    
    return {
      type: type,
      name: modules.name,
      success: true,
      message: '增量更新完成',
      hasNewData: true,
      new_count: result.inserted,
      latest: latestOnline,
      predictions: predictions
    };
    
  } catch (error) {
    console.error(`${modules.name} 处理失败:`, error);
    return {
      type: type,
      name: modules.name,
      success: false,
      message: error.message
    };
  }
}

/**
 * 执行每日任务（由 Cloudflare 触发器调用）
 * 同时处理双色球和大乐透
 */
async function runDailyTask(env) {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🎰 每日任务开始执行');
  console.log('时间:', new Date().toISOString());
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  const config = await getConfig(env);
  const telegram = new TelegramBot(config.telegramBotToken, config.telegramChatId);
  
  try {
    // 处理双色球
    const ssqResult = await processSingleLottery('ssq', env, config);
    
    // 处理大乐透
    const dltResult = await processSingleLottery('dlt', env, config);
    
    // 构建综合消息
    const results = [ssqResult, dltResult].filter(r => r.success);
    
    if (results.length > 0) {
      let message = '🎰 <b>彩票预测系统 - 每日更新</b>\n\n';
      
      for (const result of results) {
        message += `━━━━━━━━━━━━━━━━━━━━━━━━\n`;
        message += `<b>${result.name}</b>\n\n`;
        
        if (result.hasNewData) {
          const latest = result.latest;
          message += `📅 最新开奖: ${latest.lottery_no} (${latest.draw_date})\n`;
          
          if (result.type === 'ssq') {
            message += `🔴 号码: ${latest.red_balls} + ${latest.blue_ball}\n\n`;
          } else {
            const frontStr = latest.front_balls.map(b => String(b).padStart(2, '0')).join(',');
            const backStr = latest.back_balls.map(b => String(b).padStart(2, '0')).join(',');
            message += `🔴 号码: 前区 ${frontStr} | 后区 ${backStr}\n\n`;
          }
          
          // 预测结果（只显示前3组）
          message += `🔮 <b>预测下一期（${result.predictions.length} 组）</b>\n`;
          for (let i = 0; i < Math.min(3, result.predictions.length); i++) {
            const pred = result.predictions[i];
            if (result.type === 'ssq') {
              message += `  ${i + 1}. ${pred.red_balls} + ${pred.blue_ball}\n`;
            } else {
              const frontStr = pred.front_balls.map(b => String(b).padStart(2, '0')).join(',');
              const backStr = pred.back_balls.map(b => String(b).padStart(2, '0')).join(',');
              message += `  ${i + 1}. ${frontStr} | ${backStr}\n`;
            }
          }
          
          if (result.predictions.length > 3) {
            message += `  ... 还有 ${result.predictions.length - 3} 组\n`;
          }
        } else {
          message += `✅ 暂无新数据\n`;
        }
        
        message += '\n';
      }
      
      message += `━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      message += `⏰ 更新时间: ${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}\n`;
      
      // 发送 Telegram 通知
      console.log('\n发送 Telegram 通知...');
      await telegram.sendMessage(message);
      console.log('✓ Telegram 通知已发送');
    }
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ 每日任务执行完成');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    return {
      success: true,
      message: '每日任务执行完成',
      results: [ssqResult, dltResult]
    };
    
  } catch (error) {
    console.error('每日任务执行失败:', error);
    
    // 发送错误通知
    try {
      await telegram.sendError(error);
    } catch (e) {
      console.error('发送错误通知失败:', e);
    }
    
    return {
      success: false,
      message: error.message
    };
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
        '支持的彩票类型:\n' +
        '  ssq - 双色球\n' +
        '  dlt - 大乐透\n\n' +
        '可用接口:\n' +
        '  POST /run/{type} - 手动执行每日任务\n' +
        '    示例: POST /run/ssq, POST /run/dlt\n\n' +
        '  POST /init/{type} - 初始化数据库并导入历史数据\n' +
        '    示例: POST /init/ssq, POST /init/dlt\n\n' +
        '  GET /latest/{type} - 查询最新开奖数据\n' +
        '    示例: GET /latest/ssq, GET /latest/dlt\n\n' +
        '  GET /predict/{type}?count=5&strategies=frequency,balanced - 获取预测结果\n' +
        '    示例: GET /predict/ssq?count=10&strategies=frequency,balanced\n' +
        '          GET /predict/dlt?count=15&strategies=frequency,coldHot\n\n' +
        '  GET /strategies/{type} - 查看可用预测策略\n' +
        '    示例: GET /strategies/ssq, GET /strategies/dlt\n\n' +
        '  GET /stats/{type} - 查看统计信息\n' +
        '    示例: GET /stats/ssq, GET /stats/dlt\n\n' +
        '  GET /test - 测试 Telegram 连接\n\n' +
        '兼容接口（默认双色球）:\n' +
        '  POST /run, POST /init, GET /latest, GET /predict, GET /strategies, GET /stats\n\n' +
        '说明：定时任务通过 Cloudflare Dashboard 的触发器配置\n',
        {
          headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        }
      );
    }
    
    // 验证授权（需要 API_KEY 的接口）
    const requireAuth = url.pathname.startsWith('/init') || url.pathname.startsWith('/run');
    if (requireAuth) {
      const authHeader = request.headers.get('Authorization');
      if (!authHeader || authHeader !== `Bearer ${config.apiKey}`) {
        return new Response('Unauthorized', { status: 401 });
      }
    }
    
    // 初始化数据库（批次爬取模式）
    // 用途：首次运行时批量导入历史数据
    // 逻辑：每次爬取一年的数据（001-200 期），按年份正序（从 2003 年往后）
    // 特点：避免 Worker 单次调用限制，可多次执行直到完成，期号越新 ID 越大
    if (url.pathname.startsWith('/init') && request.method === 'POST') {
      // 提取彩票类型：/init/ssq 或 /init/dlt，默认 ssq
      const type = extractLotteryType(url.pathname) || 'ssq';
      try {
        const modules = getLotteryModules(type);
        const db = new Database(env.DB);
        await db.init();
        
        const spider = new modules.spider();
        
        console.log(`\n========================================`);
        console.log(`🎯 开始按年份爬取 ${modules.name} 历史数据（批次模式）`);
        console.log(`========================================`);
        
        // 获取起始年份
        const currentYear = new Date().getFullYear();
        const startYear = modules.startYear;
        const dataSource = '500.com';
        
        // 查找数据库中缺失的年份
        // 策略：从最早年份往后查找，找到第一个缺失数据的年份
        // 这样期号越新 ID 也越大，数据更有序
        let targetYear = null;
        
        for (let year = startYear; year <= currentYear; year++) {
          const yearShort = year.toString().substring(2);
          const firstIssue = `20${yearShort}001`; // 7位格式：2003001
          
          // 检查该年份的第一期是否存在
          const exists = await db.checkExists(type, firstIssue);
          
          if (!exists) {
            targetYear = year;
            break;
          }
        }
        
        // 如果没有找到缺失的年份，说明数据已完整
        if (!targetYear) {
          const currentTotal = await db.getCount(type);
          console.log(`\n========================================`);
          console.log(`✅ ${modules.name} 数据已完整，无需爬取`);
          console.log(`   当前总计: ${currentTotal} 条`);
          console.log(`========================================\n`);
          
          return new Response(
            JSON.stringify({
              success: true,
              message: `${modules.name} 数据已完整，所有年份数据已存在`,
              inserted: 0,
              skipped: 0,
              total: currentTotal,
              dataSource: dataSource,
              lotteryType: type,
              note: '历史数据已全部爬取完成'
            }),
            {
              headers: { 'Content-Type': 'application/json; charset=utf-8' }
            }
          );
        }
        
        // 爬取目标年份的数据
        const yearShort = targetYear.toString().substring(2);
        const startIssue = `${yearShort}001`; // 5位格式：03001
        const endIssue = `${yearShort}200`;   // 5位格式：03200
        
        console.log(`\n📅 爬取 ${targetYear} 年数据 (期号: ${startIssue} - ${endIssue})`);
        
        try {
          // 使用 500.com 爬取该年度数据
          const yearData = await spider.fetch500comByRange(startIssue, endIssue);
          
          if (!yearData || yearData.length === 0) {
            console.log(`   ⚠ ${targetYear} 年无数据`);
            
            return new Response(
              JSON.stringify({
                success: false,
                message: `${modules.name} ${targetYear} 年无数据`,
                total: await db.getCount(type),
                lotteryType: type
              }),
              {
                headers: { 'Content-Type': 'application/json; charset=utf-8' }
              }
            );
          }
          
          console.log(`   ✓ 获取 ${yearData.length} 条数据`);
          
          // 批量插入（自动跳过已存在的数据）
          const result = await db.batchInsert(type, yearData);
          console.log(`   ✓ 入库: 新增 ${result.inserted} 条，跳过 ${result.skipped} 条`);
          
          const currentTotal = await db.getCount(type);
          
          // 检查是否还有更多年份需要爬取
          let hasMore = false;
          for (let year = targetYear + 1; year <= currentYear; year++) {
            const yearShort = year.toString().substring(2);
            const firstIssue = `20${yearShort}001`;
            const exists = await db.checkExists(type, firstIssue);
            if (!exists) {
              hasMore = true;
              break;
            }
          }
          
          console.log(`\n========================================`);
          console.log(`✅ ${modules.name} ${targetYear} 年爬取完成`);
          console.log(`   新增: ${result.inserted} 条`);
          console.log(`   跳过: ${result.skipped} 条`);
          console.log(`   当前总计: ${currentTotal} 条`);
          if (hasMore) {
            console.log(`   💡 提示: 还有更新年份的数据需要爬取，请继续执行 /init/${type}`);
          } else {
            console.log(`   🎉 ${modules.name} 所有历史数据已爬取完成！`);
          }
          console.log(`========================================\n`);
          
          // 注意：初始化不发送 Telegram 通知，只有增量更新和预测才发送
          console.log('初始化完成，不发送 Telegram 通知');
          
          return new Response(
            JSON.stringify({
              success: true,
              message: `${modules.name} ${targetYear} 年数据爬取完成`,
              inserted: result.inserted,
              skipped: result.skipped,
              total: currentTotal,
              dataSource: dataSource,
              lotteryType: type,
              queryParams: {
                start: startIssue,
                end: endIssue
              },
              year: targetYear,
              hasMore: hasMore,
              note: hasMore ? '还有更新年份的数据需要爬取' : `${modules.name} 所有历史数据已爬取完成`
            }),
            {
              headers: { 'Content-Type': 'application/json; charset=utf-8' }
            }
          );
        } catch (error) {
          console.error(`   ✗ 爬取 ${targetYear} 年失败: ${error.message}`);
          throw error;
        }
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
    if (url.pathname.startsWith('/run') && request.method === 'POST') {
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
    if (url.pathname.startsWith('/latest')) {
      try {
        const type = extractLotteryType(url.pathname);
        const db = new Database(env.DB);
        const latest = await db.getLatest(type);
        
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
    if (url.pathname.startsWith('/predict')) {
      try {
        const type = extractLotteryType(url.pathname);
        const modules = getLotteryModules(type);
        const db = new Database(env.DB);
        
        // 获取参数
        // 如果没有指定 count，使用配置的默认值
        const countParam = url.searchParams.get('count');
        const count = countParam ? parseInt(countParam) : config.defaultPredictionCount;
        
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
        
        const predictor = new modules.predictor(db);
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
    if (url.pathname.startsWith('/strategies')) {
      try {
        const type = extractLotteryType(url.pathname);
        const modules = getLotteryModules(type);
        const strategies = modules.predictor.getAvailableStrategies();
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
    if (url.pathname.startsWith('/stats')) {
      try {
        const type = extractLotteryType(url.pathname);
        const db = new Database(env.DB);
        const frequency = await db.getFrequency(type);
        const count = await db.getCount(type);
        
        const stats = {
          lottery_type: type,
          total_count: count,
          top_red_balls: frequency.red ? frequency.red.slice(0, 10) : undefined,
          top_blue_balls: frequency.blue ? frequency.blue.slice(0, 5) : undefined,
          top_front_balls: frequency.front ? frequency.front.slice(0, 10) : undefined,
          top_back_balls: frequency.back ? frequency.back.slice(0, 5) : undefined
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