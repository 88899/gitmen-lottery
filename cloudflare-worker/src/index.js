/**
 * 彩票预测系统 - Cloudflare Workers 版本
 */

import { SSQSpider } from './spiders/ssq.js';
import { SSQPredictor } from './predictors/ssq.js';
import { DLTSpider } from './spiders/dlt.js';
import { DLTPredictor } from './predictors/dlt.js';
import { TelegramBot } from './utils/telegram.js';
import { Database } from './utils/database.js';
import { handleNetworkError, handleParseError, handleCriticalError, withErrorHandling } from './utils/error-handler.js';

/**
 * 从 KV 获取配置
 */
async function getConfig(env) {
  const config = {
    telegramBotToken: await env.KV_BINDING.get('TELEGRAM_BOT_TOKEN'),
    telegramChatId: await env.KV_BINDING.get('TELEGRAM_CHAT_ID'),
    telegramChannelId: await env.KV_BINDING.get('TELEGRAM_CHANNEL_ID'),
    telegramSendToBot: await env.KV_BINDING.get('TELEGRAM_SEND_TO_BOT'),
    telegramSendToChannel: await env.KV_BINDING.get('TELEGRAM_SEND_TO_CHANNEL'),
    apiKey: await env.KV_BINDING.get('API_KEY'),
    defaultStrategies: await env.KV_BINDING.get('DEFAULT_STRATEGIES'),
    defaultPredictionCount: await env.KV_BINDING.get('DEFAULT_PREDICTION_COUNT')
  };
  
  // 如果 KV 中没有配置，尝试从环境变量获取（兼容性）
  if (!config.telegramBotToken) config.telegramBotToken = env.TELEGRAM_BOT_TOKEN;
  if (!config.telegramChatId) config.telegramChatId = env.TELEGRAM_CHAT_ID;
  if (!config.telegramChannelId) config.telegramChannelId = env.TELEGRAM_CHANNEL_ID;
  if (!config.telegramSendToBot) config.telegramSendToBot = env.TELEGRAM_SEND_TO_BOT || 'true';
  if (!config.telegramSendToChannel) config.telegramSendToChannel = env.TELEGRAM_SEND_TO_CHANNEL || 'false';
  if (!config.apiKey) config.apiKey = env.API_KEY;
  if (!config.defaultStrategies) config.defaultStrategies = env.DEFAULT_STRATEGIES || 'frequency';
  if (!config.defaultPredictionCount) config.defaultPredictionCount = parseInt(env.DEFAULT_PREDICTION_COUNT || '5');
  
  // 转换布尔值
  config.telegramSendToBot = config.telegramSendToBot.toLowerCase() === 'true';
  config.telegramSendToChannel = config.telegramSendToChannel.toLowerCase() === 'true';
  
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
 * 统一的智能爬取方法
 * 
 * 核心逻辑：
 * 1. 从数据库获取最新期号（如果为空则从起始年份开始）
 * 2. 计算下一批次的爬取范围（支持自动跨年）
 * 3. 爬取数据，如果无数据则自动跨年重试
 * 4. 返回爬取结果
 * 
 * 适用场景：初始化、增量更新、定时任务
 */
async function smartFetch(type, env, options = {}) {
  const modules = getLotteryModules(type);
  const db = new Database(env.DB);
  const spider = new modules.spider();
  
  const BATCH_SIZE = options.batchSize || 50;
  const maxRetries = options.maxRetries || 1;
  
  console.log(`📊 智能爬取 ${modules.name}`);
  
  try {
    // 获取数据库中最新期号
    const latestInDb = await db.getLatest(type);
    let startIssue, endIssue;
    
    if (latestInDb) {
      // 数据库有数据：基于最新期号计算下一批次范围
      const latestNo = latestInDb.lottery_no; // 格式：2003089（7位）
      console.log(`数据库最新期号: ${latestNo}`);
      
      // 解析期号：2003089 -> 年份2003, 期号089
      const dbYear = parseInt(latestNo.substring(0, 4)); // 2003
      const dbIssue = parseInt(latestNo.substring(4)); // 89
      const yearShort = latestNo.substring(2, 4); // 03
      
      // 计算下一批次起始期号（最新期号+1）
      const nextIssue = dbIssue + 1; // 89 + 1 = 90
      
      // 检查是否需要跨年
      if (nextIssue > 200) {
        // 跨年：进入下一年第一期
        const nextYear = dbYear + 1; // 2003 + 1 = 2004
        const nextYearShort = nextYear.toString().substring(2); // 04
        startIssue = `${nextYearShort}001`; // 04001
        endIssue = `${nextYearShort}${Math.min(1 + BATCH_SIZE - 1, 200).toString().padStart(3, '0')}`; // 04050
        console.log(`跨年处理: ${latestNo}(${dbYear}) -> ${startIssue}-${endIssue}(${nextYear}年)`);
      } else {
        // 同年：继续当年期号
        startIssue = `${yearShort}${nextIssue.toString().padStart(3, '0')}`; // 03090
        
        // 计算结束期号：start + 批次大小 - 1，但不超过200
        let endIssueNum = nextIssue + BATCH_SIZE - 1; // 90 + 50 - 1 = 139
        if (endIssueNum > 200) {
          endIssueNum = 200;
        }
        
        endIssue = `${yearShort}${endIssueNum.toString().padStart(3, '0')}`; // 03139
        console.log(`同年继续: ${latestNo} -> ${startIssue}-${endIssue}`);
      }
    } else {
      // 数据库为空：从起始年份开始
      const startYear = modules.startYear;
      const startYearShort = startYear.toString().substring(2);
      startIssue = `${startYearShort}001`;
      
      // 计算结束期号（小批量）
      const endIssueNum = Math.min(BATCH_SIZE, 200);
      endIssue = `${startYearShort}${endIssueNum.toString().padStart(3, '0')}`;
      console.log(`数据库为空，从起始年份 ${startYear} 开始`);
    }
    
    console.log(`爬取期号范围: ${startIssue} - ${endIssue}`);
    
    // 尝试爬取数据
    let data = await spider.fetch(startIssue, endIssue);
    let retryCount = 0;
    
    // 如果无数据，尝试跨年重新爬取
    while ((!data || data.length === 0) && retryCount < maxRetries) {
      retryCount++;
      
      // 解析当前查询的年份并计算跨年参数
      const currentQueryYear = parseInt(startIssue.substring(0, 2)) + 2000;
      const nextYear = currentQueryYear + 1;
      const nextYearShort = nextYear.toString().substring(2);
      
      // 计算跨年后的新查询范围
      const crossYearStart = `${nextYearShort}001`;
      const crossYearEnd = `${nextYearShort}${Math.min(BATCH_SIZE, 200).toString().padStart(3, '0')}`;
      
      console.log(`第${retryCount}次重试：${startIssue}-${endIssue} 无数据，跨年到 ${crossYearStart}-${crossYearEnd}`);
      
      // 用跨年参数重新爬取
      data = await spider.fetch(crossYearStart, crossYearEnd);
      startIssue = crossYearStart;
      endIssue = crossYearEnd;
      
      if (data && data.length > 0) {
        console.log(`跨年成功，获取 ${data.length} 条 ${nextYear} 年数据`);
        break;
      }
    }
    
    // 处理爬取结果
    let inserted = 0;
    let skipped = 0;
    
    if (data && data.length > 0) {
      console.log(`获取 ${data.length} 条数据`);
      const result = await db.batchInsert(type, data);
      inserted = result.inserted;
      skipped = result.skipped;
      console.log(`入库: 新增 ${inserted} 条，跳过 ${skipped} 条`);
    }
    
    const currentTotal = await db.getCount(type);
    const hasNewData = inserted > 0;
    const needsCrossYear = !hasNewData && retryCount < maxRetries;
    
    return {
      success: true,
      type: type,
      name: modules.name,
      inserted: inserted,
      skipped: skipped,
      total: currentTotal,
      dataSource: '500.com',
      queryParams: {
        start: startIssue,
        end: endIssue
      },
      hasMore: hasNewData || needsCrossYear,
      needsCrossYear: needsCrossYear,
      hasNewData: hasNewData,
      retryCount: retryCount,
      note: hasNewData ? 
        `获得 ${inserted} 条新数据` : 
        (needsCrossYear ? '本批次无数据，建议继续跨年' : '无数据，可能已完成')
    };
    
  } catch (error) {
    console.error(`${modules.name} 爬取失败:`, error);
    return {
      success: false,
      type: type,
      name: modules.name,
      error: error.message
    };
  }
}

/**
 * 处理单个彩票类型的增量更新和预测
 */
async function processSingleLottery(type, env, config) {
  const startTime = Date.now();
  const maxProcessTime = 3000; // 单个彩票类型最大处理时间 3 秒
  
  try {
    // 调用统一的智能爬取方法
    const fetchResult = await smartFetch(type, env, { batchSize: 50 });
    
    if (!fetchResult.success) {
      return {
        type: type,
        name: fetchResult.name,
        success: false,
        message: fetchResult.error
      };
    }
    
    // 获取最新一期（用于返回和显示）
    const db = new Database(env.DB);
    const latest = await db.getLatest(type);
    
    if (!latest) {
      return {
        type: type,
        name: fetchResult.name,
        success: true,
        message: '暂无数据',
        hasNewData: false
      };
    }
    
    const hasNewData = fetchResult.hasNewData;
    const inserted = fetchResult.inserted;
    
    // 检查是否超时
    if (Date.now() - startTime > maxProcessTime) {
      console.warn(`${fetchResult.name} 处理超时，跳过预测`);
      return {
        type: type,
        name: fetchResult.name,
        success: true,
        message: hasNewData ? '增量更新完成（跳过预测）' : '数据已是最新（跳过预测）',
        hasNewData: hasNewData,
        new_count: inserted,
        latest: latest,
        predictions: []
      };
    }
    
    // 预测下一期（无论是否有新数据）
    console.log('开始预测下一期...');
    const defaultStrategies = config.defaultStrategies.split(',').map(s => s.trim());
    const predictor = new modules.predictor(db, { strategies: defaultStrategies });
    const predictions = await predictor.predict(config.defaultPredictionCount);
    console.log(`✓ 预测完成: ${predictions.length} 组`);
    
    return {
      type: type,
      name: modules.name,
      success: true,
      message: hasNewData ? '增量更新完成' : '数据已是最新',
      hasNewData: hasNewData,
      new_count: inserted,
      latest: latest,
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
 * 执行每日任务
 */
async function runDailyTask(env) {
  console.log('🎰 每日任务开始执行:', new Date().toISOString());
  
  const taskStartTime = Date.now();
  const maxTaskTime = 8000; // 全局任务最大执行时间 8 秒（免费计划优化）
  
  const config = await getConfig(env);
  const telegram = new TelegramBot(config.telegramBotToken, config.telegramChatId, config.telegramChannelId, config.telegramSendToBot, config.telegramSendToChannel);
  
  try {
    // 并行处理双色球和大乐透（提高性能）
    const [ssqResult, dltResult] = await Promise.all([
      processSingleLottery('ssq', env, config),
      processSingleLottery('dlt', env, config)
    ]);
    
    // 检查全局超时
    if (Date.now() - taskStartTime > maxTaskTime) {
      console.warn('任务执行超时，跳过 Telegram 通知');
      return {
        success: true,
        message: '任务执行完成（超时跳过通知）',
        results: [ssqResult, dltResult]
      };
    }
    
    // 构建综合消息（总是发送通知，包含预测结果）
    const results = [ssqResult, dltResult].filter(r => r.success);
    const hasNewData = results.some(r => r.hasNewData);
    const hasPredictions = results.some(r => r.predictions && r.predictions.length > 0);
    
    // 发送 Telegram 通知（如果有新数据或有预测结果）
    if (hasNewData || hasPredictions) {
      // 为每个彩票类型单独发送消息，避免消息过长被截断
      for (const result of results) {
        // 跳过没有预测结果的彩票类型
        if (!result.predictions || result.predictions.length === 0) continue;
        
        // 构建单个彩票类型的消息（清晰明了的格式）
        let message = `🔮 <b>${result.name}预测</b>\n\n`;
        
        // 显示数据状态
        if (result.hasNewData) {
          message += `🆕 发现 ${result.new_count} 条新数据\n`;
        } else {
          message += `✅ 暂无新数据\n`;
        }
        
        const latest = result.latest;
        if (latest) {
          message += `📅 最新开奖: ${latest.lottery_no} (${latest.draw_date})\n`;
        }
        
        if (result.type === 'ssq') {
          const redStr = latest.red_balls.map(b => String(b).padStart(2, '0')).join(' ');
          message += `🔴 红球: <code>${redStr}</code>\n`;
          message += `� 蓝球: <codte>${String(latest.blue_ball).padStart(2, '0')}</code>\n\n`;
        } else {
          const frontStr = latest.front_balls.map(b => String(b).padStart(2, '0')).join(' ');
          const backStr = latest.back_balls.map(b => String(b).padStart(2, '0')).join(' ');
          message += `🔴 前区: <code>${frontStr}</code>\n`;
          message += `🔵 后区: <code>${backStr}</code>\n\n`;
        }
        
        // 预测结果（使用与 Python 版本一致的格式）
        if (result.predictions && Array.isArray(result.predictions) && result.predictions.length > 0) {
          // 显示所有预测组合
          for (let i = 0; i < result.predictions.length; i++) {
            const pred = result.predictions[i];
            const strategyName = pred.strategy_name || pred.strategy || '未知策略';
            
            message += `<b>组合 ${i + 1}: [${strategyName}]</b>\n`;
            
            if (result.type === 'ssq') {
              const redStr = pred.red_balls.map(b => String(b).padStart(2, '0')).join(' ');
              message += `🔴 红球: <code>${redStr}</code>\n`;
              message += `🔵 蓝球: <code>${String(pred.blue_ball).padStart(2, '0')}</code>\n\n`;
            } else {
              const frontStr = pred.front_balls.map(b => String(b).padStart(2, '0')).join(' ');
              const backStr = pred.back_balls.map(b => String(b).padStart(2, '0')).join(' ');
              message += `🔴 前区: <code>${frontStr}</code>\n`;
              message += `🔵 后区: <code>${backStr}</code>\n\n`;
            }
          }
        } else {
          message += `❌ 无法生成预测\n\n`;
        }
        
        message += `━━━━━━━━━━━━━━━\n`;
        message += `⚠️ 仅供参考，理性购彩`;
        
        // 发送单个彩票类型的消息
        console.log(`\n发送 ${result.name} Telegram 通知...`);
        await telegram.sendMessage(message);
        console.log(`✓ ${result.name} Telegram 通知已发送`);
      }
    } else {
      console.log('\n无新数据且无预测结果，跳过 Telegram 通知');
    }
    
    console.log('✅ 每日任务执行完成');
    
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
    // 设置全局环境变量，供错误处理使用
    globalThis.env = env;
    
    try {
    const url = new URL(request.url);
    const config = await getConfig(env);
    
    // 首页
    if (url.pathname === '/') {
      return new Response(
        '🎰 彩票预测系统 - Cloudflare Workers 版本\n\n' +
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
        '支持的彩票类型\n' +
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
        '  ssq - 双色球\n' +
        '  dlt - 大乐透\n\n' +
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
        'API 接口列表\n' +
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
        '┌─────────────────────────────────────────────────────────────────┐\n' +
        '│ 批量操作接口（需要认证）                                        │\n' +
        '└─────────────────────────────────────────────────────────────────┘\n' +
        '  POST /run\n' +
        '    说明: 手动执行每日任务\n' +
        '    行为: 同时处理所有类型（双色球 + 大乐透）\n' +
        '    认证: Bearer Token\n\n' +
        '  POST /init/{type}\n' +
        '    说明: 初始化数据库并导入历史数据\n' +
        '    参数: type = ssq | dlt\n' +
        '    示例: POST /init/ssq, POST /init/dlt\n' +
        '    认证: Bearer Token\n\n' +
        '┌─────────────────────────────────────────────────────────────────┐\n' +
        '│ 查询接口（无需认证）                                            │\n' +
        '└─────────────────────────────────────────────────────────────────┘\n' +
        '  GET /latest\n' +
        '    说明: 查询最新开奖数据\n' +
        '    默认: 返回所有类型\n' +
        '    指定: /latest/ssq 或 /latest/dlt\n\n' +
        '  GET /predict\n' +
        '    说明: 获取预测结果\n' +
        '    默认: 返回所有类型\n' +
        '    指定: /predict/ssq 或 /predict/dlt\n' +
        '    参数: ?count=5&strategies=frequency,balanced\n\n' +
        '  GET /stats\n' +
        '    说明: 查看号码频率统计\n' +
        '    默认: 返回所有类型\n' +
        '    指定: /stats/ssq 或 /stats/dlt\n\n' +
        '  GET /strategies\n' +
        '    说明: 查看可用预测策略\n' +
        '    默认: 返回所有类型\n' +
        '    指定: /strategies/ssq 或 /strategies/dlt\n\n' +
        '  GET /test\n' +
        '    说明: 测试 Telegram 连接\n\n' +
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
        '接口设计说明\n' +
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
        '  ✓ 不带 {type} 参数 → 返回所有类型的数据\n' +
        '  ✓ 带 {type} 参数   → 返回指定类型的数据\n' +
        '  ✓ 定时任务自动处理所有类型\n\n' +
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
        '快速开始\n' +
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
        '  1. 查看所有类型的最新数据:  GET /latest\n' +
        '  2. 查看所有类型的预测:      GET /predict\n' +
        '  3. 查看所有类型的统计:      GET /stats\n' +
        '  4. 查看所有类型的策略:      GET /strategies\n\n',
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
    
    // 初始化数据库（重构为调用统一方法）
    if (url.pathname.startsWith('/init') && request.method === 'POST') {
      // 提取彩票类型：/init/ssq 或 /init/dlt，默认 ssq
      const type = extractLotteryType(url.pathname) || 'ssq';
      try {
        const db = new Database(env.DB);
        await db.init();
        
        console.log(`🎯 初始化 ${getLotteryModules(type).name} 历史数据`);
        
        // 调用统一的智能爬取方法
        const result = await smartFetch(type, env, { batchSize: 50, maxRetries: 1 });
        
        if (!result.success) {
          return new Response(
            JSON.stringify({
              success: false,
              error: result.error
            }),
            {
              status: 500,
              headers: { 'Content-Type': 'application/json; charset=utf-8' }
            }
          );
        }
        
        console.log(`✅ ${result.name} 初始化完成: 新增 ${result.inserted} 条，总计 ${result.total} 条`);
        
        return new Response(
          JSON.stringify({
            success: true,
            message: result.note,
            inserted: result.inserted,
            skipped: result.skipped,
            total: result.total,
            dataSource: result.dataSource,
            lotteryType: type,
            queryParams: result.queryParams,
            hasMore: result.hasMore,
            needsCrossYear: result.needsCrossYear,
            note: result.note
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
        const db = new Database(env.DB);
        
        // 检查是否指定了类型
        const parts = url.pathname.split('/').filter(p => p);
        const hasType = parts.length >= 2 && (parts[1] === 'ssq' || parts[1] === 'dlt');
        
        if (hasType) {
          // 返回指定类型的最新数据
          const type = parts[1];
          const modules = getLotteryModules(type);
          const latest = await db.getLatest(type);
          
          if (!latest) {
            return new Response('暂无数据', {
              status: 404,
              headers: { 'Content-Type': 'text/plain; charset=utf-8' }
            });
          }
          
          return new Response(JSON.stringify({
            lottery_type: type,
            lottery_name: modules.name,
            ...latest
          }, null, 2), {
            headers: { 'Content-Type': 'application/json; charset=utf-8' }
          });
        } else {
          // 返回所有类型的最新数据
          const types = ['ssq', 'dlt'];
          const allLatest = [];
          
          for (const type of types) {
            const modules = getLotteryModules(type);
            const latest = await db.getLatest(type);
            
            if (latest) {
              allLatest.push({
                lottery_type: type,
                lottery_name: modules.name,
                ...latest
              });
            }
          }
          
          if (allLatest.length === 0) {
            return new Response('暂无数据', {
              status: 404,
              headers: { 'Content-Type': 'text/plain; charset=utf-8' }
            });
          }
          
          return new Response(JSON.stringify(allLatest, null, 2), {
            headers: { 'Content-Type': 'application/json; charset=utf-8' }
          });
        }
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
        const db = new Database(env.DB);
        
        // 获取参数
        const countParam = url.searchParams.get('count');
        const count = countParam ? parseInt(countParam) : config.defaultPredictionCount;
        
        const strategiesParam = url.searchParams.get('strategies');
        let strategies = null;
        if (strategiesParam) {
          strategies = strategiesParam.split(',').map(s => s.trim());
        } else {
          strategies = config.defaultStrategies.split(',').map(s => s.trim());
        }
        
        // 检查是否指定了类型
        const parts = url.pathname.split('/').filter(p => p);
        const hasType = parts.length >= 2 && (parts[1] === 'ssq' || parts[1] === 'dlt');
        
        if (hasType) {
          // 返回指定类型的预测
          const type = parts[1];
          const modules = getLotteryModules(type);
          const predictor = new modules.predictor(db);
          const predictions = await predictor.predict(count, strategies);
          
          return new Response(JSON.stringify({
            lottery_type: type,
            lottery_name: modules.name,
            predictions: predictions
          }, null, 2), {
            headers: { 'Content-Type': 'application/json; charset=utf-8' }
          });
        } else {
          // 返回所有类型的预测
          const types = ['ssq', 'dlt'];
          const allPredictions = [];
          
          for (const type of types) {
            const modules = getLotteryModules(type);
            const predictor = new modules.predictor(db);
            const predictions = await predictor.predict(count, strategies);
            
            allPredictions.push({
              lottery_type: type,
              lottery_name: modules.name,
              predictions: predictions
            });
          }
          
          return new Response(JSON.stringify(allPredictions, null, 2), {
            headers: { 'Content-Type': 'application/json; charset=utf-8' }
          });
        }
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
        // 检查是否指定了类型
        const parts = url.pathname.split('/').filter(p => p);
        const hasType = parts.length >= 2 && (parts[1] === 'ssq' || parts[1] === 'dlt');
        
        if (hasType) {
          // 返回指定类型的策略
          const type = parts[1];
          const modules = getLotteryModules(type);
          const strategies = modules.predictor.getAvailableStrategies();
          
          return new Response(JSON.stringify({
            lottery_type: type,
            lottery_name: modules.name,
            strategies: strategies
          }, null, 2), {
            headers: { 'Content-Type': 'application/json; charset=utf-8' }
          });
        } else {
          // 返回所有类型的策略（策略是通用的，但分别列出）
          const types = ['ssq', 'dlt'];
          const allStrategies = [];
          
          for (const type of types) {
            const modules = getLotteryModules(type);
            const strategies = modules.predictor.getAvailableStrategies();
            
            allStrategies.push({
              lottery_type: type,
              lottery_name: modules.name,
              strategies: strategies
            });
          }
          
          return new Response(JSON.stringify(allStrategies, null, 2), {
            headers: { 'Content-Type': 'application/json; charset=utf-8' }
          });
        }
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
        const db = new Database(env.DB);
        
        // 将频率对象转换为排序后的数组
        const convertToArray = (freqObj) => {
          if (!freqObj) return undefined;
          return Object.entries(freqObj)
            .map(([ball, count]) => ({ ball: String(ball).padStart(2, '0'), count }))
            .sort((a, b) => b.count - a.count);
        };
        
        // 检查是否指定了类型
        const parts = url.pathname.split('/').filter(p => p);
        const hasType = parts.length >= 2 && (parts[1] === 'ssq' || parts[1] === 'dlt');
        
        if (hasType) {
          // 返回指定类型的统计
          const type = parts[1];
          const modules = getLotteryModules(type);
          const frequency = await db.getFrequency(type);
          const count = await db.getCount(type);
          
          const stats = {
            lottery_type: type,
            lottery_name: modules.name,
            total_count: count,
            top_red_balls: frequency.red ? convertToArray(frequency.red).slice(0, 10) : undefined,
            top_blue_balls: frequency.blue ? convertToArray(frequency.blue).slice(0, 5) : undefined,
            top_front_balls: frequency.front ? convertToArray(frequency.front).slice(0, 10) : undefined,
            top_back_balls: frequency.back ? convertToArray(frequency.back).slice(0, 5) : undefined
          };
          
          return new Response(JSON.stringify(stats, null, 2), {
            headers: { 'Content-Type': 'application/json; charset=utf-8' }
          });
        } else {
          // 返回所有类型的统计
          const types = ['ssq', 'dlt'];
          const allStats = [];
          
          for (const type of types) {
            const modules = getLotteryModules(type);
            const frequency = await db.getFrequency(type);
            const count = await db.getCount(type);
            
            allStats.push({
              lottery_type: type,
              lottery_name: modules.name,
              total_count: count,
              top_red_balls: frequency.red ? convertToArray(frequency.red).slice(0, 10) : undefined,
              top_blue_balls: frequency.blue ? convertToArray(frequency.blue).slice(0, 5) : undefined,
              top_front_balls: frequency.front ? convertToArray(frequency.front).slice(0, 10) : undefined,
              top_back_balls: frequency.back ? convertToArray(frequency.back).slice(0, 5) : undefined
            });
          }
          
          return new Response(JSON.stringify(allStats, null, 2), {
            headers: { 'Content-Type': 'application/json; charset=utf-8' }
          });
        }
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
        const telegram = new TelegramBot(config.telegramBotToken, config.telegramChatId, config.telegramChannelId, config.telegramSendToBot, config.telegramSendToChannel);
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
    
    } catch (error) {
      // 全局错误处理
      console.error('全局错误:', error);
      
      // 发送严重错误通知
      try {
        await handleCriticalError(
          env,
          'UNHANDLED_EXCEPTION',
          `${error.name}: ${error.message}`,
          {
            stack: error.stack?.substring(0, 500),
            url: request.url
          }
        );
      } catch (notifyError) {
        console.error('发送错误通知失败:', notifyError);
      }
      
      return new Response('Internal Server Error', { status: 500 });
    }
  },

  /**
   * Cron 触发器处理器
   * 由 Cloudflare 定时任务自动调用
   */
  async scheduled(event, env, ctx) {
    console.log('Cron 触发器执行:', event.cron);
    
    // 使用 waitUntil 确保任务完成
    ctx.waitUntil(runDailyTask(env));
  }
};