/**
 * 彩票预测系统 - Cloudflare Workers 版本
 */

import { SSQSpider } from './spiders/ssq.js';
import { SSQPredictor } from './predictors/ssq.js';
import { DLTSpider } from './spiders/dlt.js';
import { DLTPredictor } from './predictors/dlt.js';
import { QXCSpider } from './spiders/qxc.js';
import { QXCPredictor } from './predictors/qxc.js';
import { QLCSpider } from './spiders/qlc.js';
import { QLCPredictor } from './predictors/qlc.js';
import { TelegramBot } from './utils/telegram.js';
import { Database } from './utils/database.js';
import { DataExporter } from './utils/exporter.js';
import { HistoryAPI } from './utils/history-api.js';
import { handleNetworkError, handleParseError, handleCriticalError } from './utils/error-handler.js';

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
      lastIssue: '03000'  // 2003 年第 000 期（虚拟期号，实际从 001 开始）
    },
    dlt: {
      name: '大乐透',
      spider: DLTSpider,
      predictor: DLTPredictor,
      lastIssue: '07000'  // 2007 年第 000 期（虚拟期号，实际从 001 开始）
    },
    qxc: {
      name: '七星彩',
      spider: QXCSpider,
      predictor: QXCPredictor,
      lastIssue: '04100'  // 2004 年第 100 期（虚拟期号，实际从 101 开始）
    },
    qlc: {
      name: '七乐彩',
      spider: QLCSpider,
      predictor: QLCPredictor,
      lastIssue: '07000'  // 2007 年第 000 期（虚拟期号，实际从 001 开始）
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
    if (type === 'ssq' || type === 'dlt' || type === 'qxc' || type === 'qlc') {
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
      // 数据库为空：从最后期号 +1 开始
      const lastIssue = modules.lastIssue;
      const yearShort = lastIssue.substring(0, 2);
      const lastIssueNum = parseInt(lastIssue.substring(2));
      const startIssueNum = lastIssueNum + 1;
      startIssue = `${yearShort}${startIssueNum.toString().padStart(3, '0')}`;
      
      // 计算结束期号：start + 批次大小 - 1，但不超过200
      let endIssueNum = startIssueNum + BATCH_SIZE - 1;
      if (endIssueNum > 200) {
        endIssueNum = 200;
      }
      endIssue = `${yearShort}${endIssueNum.toString().padStart(3, '0')}`;
      console.log(`数据库为空，从最后期号 ${lastIssue} 的下一期 ${startIssue} 开始`);
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
      // 关键：跨年时应该从下一年的起始期号开始，而不是从 lastIssue 的期号开始
      // 例如：双色球从 03001 开始，跨年后应该从 04001 开始
      // 例如：七星彩从 04101 开始，跨年后应该从 05101 开始
      const crossYearStartNum = 1;  // 下一年的第一期
      const crossYearStart = `${nextYearShort}${crossYearStartNum.toString().padStart(3, '0')}`;
      const crossYearEnd = `${nextYearShort}${Math.min(crossYearStartNum + BATCH_SIZE - 1, 200).toString().padStart(3, '0')}`;
      
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
    // 修复：只有在没有重试过且没有数据时才需要跨年
    const needsCrossYear = !hasNewData && retryCount === 0 && maxRetries > 0;
    // 修复：只有有新数据时才认为还有更多数据，跨年建议不算 hasMore
    const hasMore = hasNewData;
    
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
      hasMore: hasMore,
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
 * 构建开奖消息（只包含开奖数据）
 */
function buildDrawMessage(lotteryName, lotteryType, latest) {
  let message = `🎰 <b>${lotteryName}开奖</b>\n\n`;
  message += `期号: ${latest.lottery_no}\n`;
  message += `日期: ${latest.draw_date}\n`;
  
  if (lotteryType === 'ssq') {
    const redStr = latest.red_balls.map(b => String(b).padStart(2, '0')).join(' ');
    message += `🔴 <code>${redStr}</code>\n`;
    message += `🔵 <code>${String(latest.blue_ball).padStart(2, '0')}</code>\n`;
  } else if (lotteryType === 'dlt') {
    const frontStr = latest.front_balls.map(b => String(b).padStart(2, '0')).join(' ');
    const backStr = latest.back_balls.map(b => String(b).padStart(2, '0')).join(' ');
    message += `🔴 前区: <code>${frontStr}</code>\n`;
    message += `🔵 后区: <code>${backStr}</code>\n`;
  } else if (lotteryType === 'qxc') {
    const numbersStr = latest.numbers.map(n => String(n)).join(' ');
    message += `🔢 <code>${numbersStr}</code>\n`;
  } else if (lotteryType === 'qlc') {
    const basicStr = latest.basic_balls.map(b => String(b).padStart(2, '0')).join(' ');
    const specialStr = String(latest.special_ball).padStart(2, '0');
    message += `🔴 基本号: <code>${basicStr}</code>\n`;
    message += `🔵 特别号: <code>${specialStr}</code>\n`;
  }
  
  message += `\n━━━━━━━━━━━━━━━\n`;
  message += `⚠️ 仅供参考，理性购彩`;
  
  return message;
}

/**
 * 构建通知消息（包含新数据和预测）
 */
function buildNotificationMessage(lotteryName, lotteryType, result) {
  let message = '';
  
  // 如果有新数据，先显示新开奖数据
  if (result.hasNewData && result.latest) {
    message += `🎰 <b>${lotteryName}开奖</b>\n\n`;
    message += `期号: ${result.latest.lottery_no}\n`;
    message += `日期: ${result.latest.draw_date}\n`;
    
    if (lotteryType === 'ssq') {
      // getLatest 返回的是 red_balls 数组和 blue_ball
      const redStr = result.latest.red_balls.map(b => String(b).padStart(2, '0')).join(' ');
      message += `🔴 <code>${redStr}</code>\n`;
      message += `🔵 <code>${String(result.latest.blue_ball).padStart(2, '0')}</code>\n`;
    } else if (lotteryType === 'dlt') {
      // getLatest 返回的是 front_balls 和 back_balls 数组
      const frontStr = result.latest.front_balls.map(b => String(b).padStart(2, '0')).join(' ');
      const backStr = result.latest.back_balls.map(b => String(b).padStart(2, '0')).join(' ');
      message += `🔴 前区: <code>${frontStr}</code>\n`;
      message += `🔵 后区: <code>${backStr}</code>\n`;
    } else if (lotteryType === 'qxc') {
      // getLatest 返回的是 numbers 数组
      const numbersStr = result.latest.numbers.map(n => String(n)).join(' ');
      message += `🔢 <code>${numbersStr}</code>\n`;
    } else if (lotteryType === 'qlc') {
      // getLatest 返回的是 basic_balls 数组和 special_ball
      const basicStr = result.latest.basic_balls.map(b => String(b).padStart(2, '0')).join(' ');
      const specialStr = String(result.latest.special_ball).padStart(2, '0');
      message += `🔴 基本号: <code>${basicStr}</code>\n`;
      message += `🔵 特别号: <code>${specialStr}</code>\n`;
    }
    
    message += `\n━━━━━━━━━━━━━━━\n\n`;
  }
  
  // 预测结果（总是显示）
  message += `🔮 <b>${lotteryName}预测</b>\n\n`;
  
  const predictions = result.predictions;
  if (predictions && Array.isArray(predictions) && predictions.length > 0) {
    for (let i = 0; i < predictions.length; i++) {
      const pred = predictions[i];
      const strategyName = pred.strategy_name || pred.strategy || '';
      
      message += `<b>组合 ${i + 1}:</b>`;
      
      if (strategyName) {
        message += ` <i>[${strategyName}]</i>`;
      }
      
      message += `\n`;
      
      if (lotteryType === 'ssq') {
        const redStr = pred.red_balls.map(b => String(b).padStart(2, '0')).join(' ');
        message += `🔴 <code>${redStr}</code>\n`;
        message += `🔵 <code>${String(pred.blue_ball).padStart(2, '0')}</code>\n\n`;
      } else if (lotteryType === 'dlt') {
        const frontStr = pred.front_balls.map(b => String(b).padStart(2, '0')).join(' ');
        const backStr = pred.back_balls.map(b => String(b).padStart(2, '0')).join(' ');
        message += `🔴 前区: <code>${frontStr}</code>\n`;
        message += `🔵 后区: <code>${backStr}</code>\n\n`;
      } else if (lotteryType === 'qxc') {
        const numbersStr = pred.numbers.map(n => String(n)).join(' ');
        message += `🔢 <code>${numbersStr}</code>\n\n`;
      } else if (lotteryType === 'qlc') {
        const basicStr = pred.basic_balls.map(b => String(b).padStart(2, '0')).join(' ');
        const specialStr = String(pred.special_ball).padStart(2, '0');
        message += `🔴 基本号: <code>${basicStr}</code>\n`;
        message += `🔵 特别号: <code>${specialStr}</code>\n\n`;
      }
    }
  } else {
    message += `⚠️ 暂时无法生成预测\n`;
  }
  
  message += `━━━━━━━━━━━━━━━\n`;
  message += `⚠️ 仅供参考，理性购彩`;
  
  return message;
}

/**
 * 构建预测消息（仅预测，用于手动预测接口）
 */
function buildPredictionMessage(lotteryName, lotteryType, predictions) {
  let message = `🔮 <b>${lotteryName}预测</b>\n\n`;
  
  // 预测结果
  if (predictions && Array.isArray(predictions) && predictions.length > 0) {
    for (let i = 0; i < predictions.length; i++) {
      const pred = predictions[i];
      const strategyName = pred.strategy_name || pred.strategy || '';
      
      message += `<b>组合 ${i + 1}:</b>`;
      
      if (strategyName) {
        message += ` <i>[${strategyName}]</i>`;
      }
      
      message += `\n`;
      
      if (lotteryType === 'ssq') {
        const redStr = pred.red_balls.map(b => String(b).padStart(2, '0')).join(' ');
        message += `🔴 <code>${redStr}</code>\n`;
        message += `🔵 <code>${String(pred.blue_ball).padStart(2, '0')}</code>\n\n`;
      } else if (lotteryType === 'dlt') {
        const frontStr = pred.front_balls.map(b => String(b).padStart(2, '0')).join(' ');
        const backStr = pred.back_balls.map(b => String(b).padStart(2, '0')).join(' ');
        message += `🔴 前区: <code>${frontStr}</code>\n`;
        message += `🔵 后区: <code>${backStr}</code>\n\n`;
      } else if (lotteryType === 'qxc') {
        const numbersStr = pred.numbers.map(n => String(n)).join(' ');
        message += `🔢 <code>${numbersStr}</code>\n\n`;
      } else if (lotteryType === 'qlc') {
        const basicStr = pred.basic_balls.map(b => String(b).padStart(2, '0')).join(' ');
        const specialStr = String(pred.special_ball).padStart(2, '0');
        message += `🔴 基本号: <code>${basicStr}</code>\n`;
        message += `🔵 特别号: <code>${specialStr}</code>\n\n`;
      }
    }
  } else {
    // 没有预测结果时的提示
    message += `⚠️ 暂时无法生成预测\n`;
  }
  
  message += `━━━━━━━━━━━━━━━\n`;
  message += `⚠️ 仅供参考，理性购彩`;
  
  return message;
}

/**
 * 处理单个彩票类型的增量更新和预测
 */
async function processSingleLottery(type, env, config, telegram) {
  const startTime = Date.now();
  const maxProcessTime = 3000; // 单个彩票类型最大处理时间 3 秒
  const modules = getLotteryModules(type);
  
  try {
    // 步骤 1: 爬取数据
    const fetchResult = await smartFetch(type, env, { batchSize: 50 });
    
    if (!fetchResult.success) {
      console.error(`${modules.name} 爬取失败: ${fetchResult.error}`);
      return {
        type: type,
        name: modules.name,
        success: false,
        message: fetchResult.error
      };
    }
    
    // 步骤 2: 如果有新数据，立即发送开奖消息
    const db = new Database(env.DB);
    const latest = await db.getLatest(type);
    
    if (fetchResult.hasNewData && latest) {
      console.log(`${modules.name} 有新数据，发送开奖消息...`);
      try {
        const drawMessage = buildDrawMessage(modules.name, type, latest);
        await telegram.sendMessage(drawMessage);
        console.log(`✓ ${modules.name} 开奖消息已发送`);
      } catch (sendError) {
        console.error(`✗ ${modules.name} 开奖消息发送失败:`, sendError);
      }
    }
    
    // 步骤 3: 预测下一期
    console.log(`开始预测 ${modules.name} 下一期...`);
    
    let predictions = [];
    try {
      const dataCount = await db.getCount(type);
      console.log(`${modules.name} 数据库记录数: ${dataCount}`);
      
      if (dataCount === 0) {
        console.warn(`${modules.name} 数据库无数据，无法预测`);
      } else {
        const defaultStrategies = config.defaultStrategies.split(',').map(s => s.trim());
        console.log(`${modules.name} 使用策略: ${defaultStrategies.join(', ')}`);
        
        const predictor = new modules.predictor(db, { strategies: defaultStrategies });
        predictions = await predictor.predict(config.defaultPredictionCount);
        console.log(`✓ ${modules.name} 预测完成: ${predictions.length} 组`);
      }
    } catch (predictError) {
      console.error(`${modules.name} 预测失败:`, predictError);
      console.error(`错误堆栈:`, predictError.stack);
    }
    
    // 步骤 4: 发送预测消息
    if (predictions.length > 0) {
      console.log(`${modules.name} 发送预测消息...`);
      try {
        const predMessage = buildPredictionMessage(modules.name, type, predictions);
        await telegram.sendMessage(predMessage);
        console.log(`✓ ${modules.name} 预测消息已发送`);
      } catch (sendError) {
        console.error(`✗ ${modules.name} 预测消息发送失败:`, sendError);
      }
    }
    
    return {
      type: type,
      name: modules.name,
      success: true,
      message: fetchResult.hasNewData ? '爬取、预测、通知完成' : '预测、通知完成'
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
  
  // 防重复执行：检查是否正在执行
  const isRunning = await env.KV_BINDING.get('task_running');
  if (isRunning === 'true') {
    console.log('⚠️ 任务正在执行中，跳过本次触发');
    return { 
      success: false, 
      message: '任务正在执行中，跳过重复触发',
      skipped: true 
    };
  }
  
  // 设置执行标志（10分钟过期，防止异常情况下锁未释放）
  await env.KV_BINDING.put('task_running', 'true', { expirationTtl: 600 });
  console.log('✓ 已设置任务执行锁');
  
  const taskStartTime = Date.now();
  const maxTaskTime = 8000; // 全局任务最大执行时间 8 秒（免费计划优化）
  
  const config = await getConfig(env);
  const telegram = new TelegramBot(config.telegramBotToken, config.telegramChatId, config.telegramChannelId, config.telegramSendToBot, config.telegramSendToChannel);
  
  try {
    // 串行处理四种彩票（每个彩票独立闭环：爬取 → 发送开奖 → 预测 → 发送预测）
    console.log('开始处理双色球...');
    const ssqResult = await processSingleLottery('ssq', env, config, telegram);
    
    console.log('开始处理大乐透...');
    const dltResult = await processSingleLottery('dlt', env, config, telegram);
    
    console.log('开始处理七星彩...');
    const qxcResult = await processSingleLottery('qxc', env, config, telegram);
    
    console.log('开始处理七乐彩...');
    const qlcResult = await processSingleLottery('qlc', env, config, telegram);
    
    console.log('✅ 每日任务执行完成');
    
    return {
      success: true,
      message: '每日任务执行完成',
      results: [ssqResult, dltResult, qxcResult, qlcResult]
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
  } finally {
    // 清除执行标志（无论成功还是失败）
    try {
      await env.KV_BINDING.delete('task_running');
      console.log('✓ 已清除任务执行锁');
    } catch (e) {
      console.error('清除执行锁失败:', e);
    }
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
        '  dlt - 大乐透\n' +
        '  qxc - 七星彩\n' +
        '  qlc - 七乐彩\n\n' +
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
        'API 接口列表\n' +
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
        '┌─────────────────────────────────────────────────────────────────┐\n' +
        '│ 批量操作接口（需要认证）                                        │\n' +
        '└─────────────────────────────────────────────────────────────────┘\n' +
        '  POST /run\n' +
        '    说明: 手动执行每日任务\n' +
        '    行为: 同时处理所有类型（双色球 + 大乐透 + 七星彩 + 七乐彩）\n' +
        '    认证: Bearer Token\n\n' +
        '  POST /init/{type}\n' +
        '    说明: 初始化数据库并导入历史数据\n' +
        '    参数: type = ssq | dlt | qxc | qlc\n' +
        '    示例: POST /init/ssq, POST /init/dlt, POST /init/qxc, POST /init/qlc\n' +
        '    认证: Bearer Token\n\n' +
        '  POST /export\n' +
        '    说明: 导出全量数据（Excel + SQL）\n' +
        '    默认: 导出所有类型\n' +
        '    指定: /export/ssq 或 /export/dlt 或 /export/qxc 或 /export/qlc\n' +
        '    返回: 下载链接（上传到 R2）\n' +
        '    认证: Bearer Token\n\n' +
        '┌─────────────────────────────────────────────────────────────────┐\n' +
        '│ 查询接口（无需认证）                                            │\n' +
        '└─────────────────────────────────────────────────────────────────┘\n' +
        '  GET /latest\n' +
        '    说明: 查询最新开奖数据\n' +
        '    默认: 返回所有类型\n' +
        '    指定: /latest/ssq 或 /latest/dlt 或 /latest/qxc 或 /latest/qlc\n\n' +
        '  GET /predict\n' +
        '    说明: 获取预测结果\n' +
        '    默认: 返回所有类型\n' +
        '    指定: /predict/ssq 或 /predict/dlt 或 /predict/qxc 或 /predict/qlc\n' +
        '    参数: ?count=5&strategies=frequency,balanced\n\n' +
        '  GET /stats\n' +
        '    说明: 查看号码频率统计\n' +
        '    默认: 返回所有类型\n' +
        '    指定: /stats/ssq 或 /stats/dlt 或 /stats/qxc 或 /stats/qlc\n\n' +
        '  GET /strategies\n' +
        '    说明: 查看可用预测策略\n' +
        '    默认: 返回所有类型\n' +
        '    指定: /strategies/ssq 或 /strategies/dlt 或 /strategies/qxc 或 /strategies/qlc\n\n' +
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
      // 提取彩票类型：/init/ssq、/init/dlt、/init/qxc 或 /init/qlc，默认 ssq
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
        const hasType = parts.length >= 2 && (['ssq', 'dlt', 'qxc', 'qlc'].includes(parts[1]));
        
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
          const types = ['ssq', 'dlt', 'qxc', 'qlc'];
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
        const telegram = new TelegramBot(
          config.telegramBotToken,
          config.telegramChatId,
          config.telegramChannelId,
          config.telegramSendToBot,
          config.telegramSendToChannel
        );
        
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
        const hasType = parts.length >= 2 && (['ssq', 'dlt', 'qxc', 'qlc'].includes(parts[1]));
        
        if (hasType) {
          // 返回指定类型的预测
          const type = parts[1];
          const modules = getLotteryModules(type);
          const predictor = new modules.predictor(db);
          const predictions = await predictor.predict(count, strategies);
          
          // 发送 Telegram 通知
          const message = buildPredictionMessage(modules.name, type, predictions);
          await telegram.sendMessage(message).catch(err => 
            console.error('Telegram 通知发送失败:', err)
          );
          
          return new Response(JSON.stringify({
            lottery_type: type,
            lottery_name: modules.name,
            predictions: predictions
          }, null, 2), {
            headers: { 'Content-Type': 'application/json; charset=utf-8' }
          });
        } else {
          // 返回所有类型的预测
          const types = ['ssq', 'dlt', 'qxc', 'qlc'];
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
          
          // 并行发送所有 Telegram 通知
          const messages = allPredictions.map(pred => ({
            name: pred.lottery_name,
            content: buildPredictionMessage(pred.lottery_name, pred.lottery_type, pred.predictions)
          }));
          
          await Promise.all(
            messages.map(msg => 
              telegram.sendMessage(msg.content)
                .then(() => console.log(`✓ ${msg.name} Telegram 通知已发送`))
                .catch(err => console.error(`✗ ${msg.name} Telegram 通知发送失败:`, err))
            )
          );
          
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
        const hasType = parts.length >= 2 && (['ssq', 'dlt', 'qxc', 'qlc'].includes(parts[1]));
        
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
          const types = ['ssq', 'dlt', 'qxc', 'qlc'];
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
        const hasType = parts.length >= 2 && (['ssq', 'dlt', 'qxc', 'qlc'].includes(parts[1]));
        
        if (hasType) {
          // 返回指定类型的统计
          const type = parts[1];
          const modules = getLotteryModules(type);
          const frequency = await db.getFrequency(type);
          const count = await db.getCount(type);
          
          const stats = {
            lottery_type: type,
            lottery_name: modules.name,
            total_count: count
          };
          
          // 根据彩票类型添加相应的频率统计
          if (frequency.red) {
            stats.top_red_balls = convertToArray(frequency.red).slice(0, 10);
          }
          if (frequency.blue) {
            stats.top_blue_balls = convertToArray(frequency.blue).slice(0, 5);
          }
          if (frequency.front) {
            stats.top_front_balls = convertToArray(frequency.front).slice(0, 10);
          }
          if (frequency.back) {
            stats.top_back_balls = convertToArray(frequency.back).slice(0, 5);
          }
          if (frequency.numbers) {
            stats.top_numbers = convertToArray(frequency.numbers).slice(0, 10);
          }
          if (frequency.basic) {
            stats.top_basic_balls = convertToArray(frequency.basic).slice(0, 10);
          }
          if (frequency.special) {
            stats.top_special_balls = convertToArray(frequency.special).slice(0, 5);
          }
          
          return new Response(JSON.stringify(stats, null, 2), {
            headers: { 'Content-Type': 'application/json; charset=utf-8' }
          });
        } else {
          // 返回所有类型的统计
          const types = ['ssq', 'dlt', 'qxc', 'qlc'];
          const allStats = [];
          
          for (const type of types) {
            const modules = getLotteryModules(type);
            const frequency = await db.getFrequency(type);
            const count = await db.getCount(type);
            
            const stats = {
              lottery_type: type,
              lottery_name: modules.name,
              total_count: count
            };
            
            // 根据彩票类型添加相应的频率统计
            if (frequency.red) {
              stats.top_red_balls = convertToArray(frequency.red).slice(0, 10);
            }
            if (frequency.blue) {
              stats.top_blue_balls = convertToArray(frequency.blue).slice(0, 5);
            }
            if (frequency.front) {
              stats.top_front_balls = convertToArray(frequency.front).slice(0, 10);
            }
            if (frequency.back) {
              stats.top_back_balls = convertToArray(frequency.back).slice(0, 5);
            }
            if (frequency.numbers) {
              stats.top_numbers = convertToArray(frequency.numbers).slice(0, 10);
            }
            if (frequency.basic) {
              stats.top_basic_balls = convertToArray(frequency.basic).slice(0, 10);
            }
            if (frequency.special) {
              stats.top_special_balls = convertToArray(frequency.special).slice(0, 5);
            }
            
            allStats.push(stats);
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
    
    // 文件下载接口（从 R2 获取导出的文件）
    if (url.pathname.startsWith('/download/')) {
      const filePath = url.pathname.replace('/download/', '');
      
      try {
        // 从 R2 获取文件
        const object = await env.R2_BUCKET.get(filePath);
        
        if (!object) {
          return new Response('File not found', { 
            status: 404,
            headers: { 'Content-Type': 'text/plain; charset=utf-8' }
          });
        }
        
        // 返回文件
        return new Response(object.body, {
          headers: {
            'Content-Type': object.httpMetadata.contentType || 'application/octet-stream',
            'Content-Disposition': `attachment; filename="${filePath.split('/').pop()}"`,
            'Cache-Control': 'public, max-age=3600'
          }
        });
      } catch (error) {
        console.error('下载文件失败:', error);
        return new Response(`Download failed: ${error.message}`, {
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
    
    // 数据导出接口（需要认证）
    if (url.pathname.startsWith('/export') && request.method === 'POST') {
      // 验证授权
      const authHeader = request.headers.get('Authorization');
      if (!authHeader || authHeader !== `Bearer ${config.apiKey}`) {
        return new Response('Unauthorized', { status: 401 });
      }
      
      try {
        const db = new Database(env.DB);
        const exporter = new DataExporter(db, env.R2_BUCKET);
        
        // 检查是否指定了类型
        const parts = url.pathname.split('/').filter(p => p);
        const hasType = parts.length >= 2 && (['ssq', 'dlt', 'qxc', 'qlc'].includes(parts[1]));
        
        if (hasType) {
          // 导出指定类型的数据
          const type = parts[1];
          const modules = getLotteryModules(type);
          
          console.log(`开始导出 ${modules.name} 数据...`);
          const result = await exporter.exportLotteryData(type, modules.name);
          
          return new Response(JSON.stringify({
            success: true,
            lottery_type: type,
            lottery_name: modules.name,
            count: result.count,
            exportTime: result.exportTime,
            downloads: {
              csv: result.csv,
              sql: result.sql,
              sqlite: result.sqlite
            }
          }, null, 2), {
            headers: { 'Content-Type': 'application/json; charset=utf-8' }
          });
        } else {
          // 导出所有类型的数据
          const types = ['ssq', 'dlt', 'qxc', 'qlc'];
          const allResults = [];
          
          for (const type of types) {
            const modules = getLotteryModules(type);
            console.log(`开始导出 ${modules.name} 数据...`);
            
            try {
              const result = await exporter.exportLotteryData(type, modules.name);
              allResults.push({
                lottery_type: type,
                lottery_name: modules.name,
                count: result.count,
                exportTime: result.exportTime,
                downloads: {
                  csv: result.csv,
                  sql: result.sql,
                  sqlite: result.sqlite
                }
              });
            } catch (error) {
              console.error(`导出 ${modules.name} 失败:`, error);
              allResults.push({
                lottery_type: type,
                lottery_name: modules.name,
                success: false,
                error: error.message
              });
            }
          }
          
          return new Response(JSON.stringify({
            success: true,
            message: '批量导出完成',
            results: allResults
          }, null, 2), {
            headers: { 'Content-Type': 'application/json; charset=utf-8' }
          });
        }
      } catch (error) {
        console.error('导出失败:', error);
        return new Response(JSON.stringify({
          success: false,
          error: error.message
        }, null, 2), {
          status: 500,
          headers: { 'Content-Type': 'application/json; charset=utf-8' }
        });
      }
    }
    
    // 历史记录查询页面
    if (url.pathname === '/history') {
      try {
        // 导入HTML模块
        const { historyPageHTML } = await import('./views/history.js');
        return new Response(historyPageHTML, {
          headers: { 'Content-Type': 'text/html; charset=utf-8' }
        });
      } catch (error) {
        console.error('加载历史记录页面失败:', error);
        return new Response('页面加载失败', {
          status: 500,
          headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        });
      }
    }
    
    // 历史记录查询API
    if (url.pathname.startsWith('/api/history/')) {
      try {
        const db = new Database(env.DB);
        const historyAPI = new HistoryAPI(db);
        
        // 提取彩票类型
        const parts = url.pathname.split('/').filter(p => p);
        if (parts.length < 3) {
          return new Response(JSON.stringify({
            success: false,
            error: '缺少彩票类型参数'
          }), {
            status: 400,
            headers: { 'Content-Type': 'application/json; charset=utf-8' }
          });
        }
        
        const type = parts[2];
        if (!['ssq', 'dlt', 'qxc', 'qlc'].includes(type)) {
          return new Response(JSON.stringify({
            success: false,
            error: '不支持的彩票类型'
          }), {
            status: 400,
            headers: { 'Content-Type': 'application/json; charset=utf-8' }
          });
        }
        
        // 获取查询参数
        const page = parseInt(url.searchParams.get('page') || '1');
        const limit = parseInt(url.searchParams.get('limit') || '10');
        const filters = {};
        
        if (url.searchParams.get('lottery_no')) {
          filters.lottery_no = url.searchParams.get('lottery_no');
        }
        if (url.searchParams.get('draw_date')) {
          filters.draw_date = url.searchParams.get('draw_date');
        }
        if (url.searchParams.get('numbers')) {
          filters.numbers = url.searchParams.get('numbers');
        }
        
        // 查询数据
        const result = await historyAPI.query(type, filters, page, limit);
        
        return new Response(JSON.stringify(result), {
          headers: { 'Content-Type': 'application/json; charset=utf-8' }
        });
      } catch (error) {
        console.error('历史记录查询失败:', error);
        return new Response(JSON.stringify({
          success: false,
          error: error.message
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json; charset=utf-8' }
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
   * Cron 触发器处理器（优化版本）
   * 由 Cloudflare 定时任务自动调用
   */
  async scheduled(event, env, ctx) {
    const startTime = Date.now();
    const now = new Date();
    const utcTime = now.toISOString();
    const chinaTime = new Date(now.getTime() + 8 * 60 * 60 * 1000).toISOString().replace('T', ' ').substring(0, 19);
    console.log('⏰ Cron 触发器执行:');
    console.log('  - Cron 表达式:', event.cron);
    console.log('  - UTC 时间:', utcTime);
    console.log('  - 北京时间:', chinaTime);
    console.log('  - 配置时间: 00 14 * * * (UTC 14:00 / 北京时间 22:00)');
    
    // 使用 waitUntil 确保任务完成（即使响应已返回）
    ctx.waitUntil(
      (async () => {
        try {
          const result = await runDailyTask(env);
          const executionTime = Date.now() - startTime;
          
          console.log(`✅ 定时任务执行${result.success ? '成功' : '失败'}, 耗时: ${executionTime}ms`);
          
          // 如果执行时间过长，记录警告
          if (executionTime > 10000) {
            console.warn(`⚠️ 定时任务执行时间过长: ${executionTime}ms`);
          }
          
        } catch (error) {
          console.error('❌ 定时任务执行异常:', error);
          
          // 尝试发送错误通知
          try {
            const config = await getConfig(env);
            const telegram = new TelegramBot(
              config.telegramBotToken,
              config.telegramChatId,
              config.telegramChannelId,
              config.telegramSendToBot,
              config.telegramSendToChannel
            );
            await telegram.sendError(error);
          } catch (notifyError) {
            console.error('发送错误通知失败:', notifyError);
          }
        }
      })()
    );
  }
};