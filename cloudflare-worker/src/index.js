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
 * 
 * 核心逻辑：
 * 1. 从数据库获取最新期号
 * 2. 从下一期开始爬取到当年最后一期（如 25134 -> 25200）
 * 3. 入库所有新数据（自动跳过已存在的）
 * 4. 如果有新数据，进行预测
 * 
 * 注意：此逻辑与 Python 版本完全一致
 */
async function processSingleLottery(type, env, config) {
  const modules = getLotteryModules(type);
  const db = new Database(env.DB);
  const spider = new modules.spider();
  
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`📊 处理 ${modules.name}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  
  const startTime = Date.now();
  const maxProcessTime = 3000; // 单个彩票类型最大处理时间 3 秒
  
  try {
    // 获取数据库中最新期号
    const latestInDb = await db.getLatest(type);
    
    // 确定爬取范围
    const currentYear = new Date().getFullYear();
    const yearShort = currentYear.toString().substring(2); // 25
    
    let startIssue;
    
    if (latestInDb) {
      // 从数据库最新期号的下一期开始爬取
      const latestNo = latestInDb.lottery_no; // 2025133
      console.log(`数据库最新期号: ${latestNo}`);
      
      // 解析期号：2025133 -> 25, 133
      const yearPart = latestNo.substring(2, 4); // 25
      const issuePart = parseInt(latestNo.substring(4)); // 133
      
      // 下一期
      const nextIssue = issuePart + 1;
      startIssue = `${yearPart}${nextIssue.toString().padStart(3, '0')}`; // 25134
    } else {
      // 数据库为空，从当年第一期开始
      startIssue = `${yearShort}001`;
      console.log('数据库为空，从当年第一期开始');
    }
    
    const endIssue = `${yearShort}200`;
    
    console.log(`爬取期号范围: ${startIssue} - ${endIssue}`);
    
    // 调用统一的 fetch 方法
    const data = await spider.fetch(startIssue, endIssue);
    
    let inserted = 0;
    if (data && data.length > 0) {
      console.log(`获取 ${data.length} 条数据`);
      const result = await db.batchInsert(type, data);
      inserted = result.inserted;
      console.log(`入库: 新增 ${result.inserted} 条，跳过 ${result.skipped} 条`);
      
      if (inserted > 0) {
        console.log(`✓ 发现并入库 ${inserted} 条新数据`);
      } else {
        console.log('✓ 暂无新数据');
      }
    } else {
      console.log('✓ 暂无新数据');
    }
    
    // 获取最新一期（用于返回和显示）
    const latest = await db.getLatest(type);
    
    if (!latest) {
      return {
        type: type,
        name: modules.name,
        success: true,
        message: '暂无数据',
        hasNewData: false
      };
    }
    
    // 记录是否有新数据
    const hasNewData = inserted > 0;
    
    // 检查是否超时
    if (Date.now() - startTime > maxProcessTime) {
      console.warn(`${modules.name} 处理超时，跳过预测`);
      return {
        type: type,
        name: modules.name,
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
 * 执行每日任务（由 Cloudflare 触发器调用）
 * 同时处理双色球和大乐透
 */
async function runDailyTask(env) {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🎰 每日任务开始执行');
  console.log('时间:', new Date().toISOString());
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
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
    
    // 初始化数据库（智能增量模式）
    // 用途：首次运行时批量导入历史数据
    // 逻辑：使用统一的增量爬取方法，从数据库最新期号开始爬取
    // 特点：复用增量逻辑，智能判断是否完成，避免无效重试
    if (url.pathname.startsWith('/init') && request.method === 'POST') {
      // 提取彩票类型：/init/ssq 或 /init/dlt，默认 ssq
      const type = extractLotteryType(url.pathname) || 'ssq';
      try {
        const modules = getLotteryModules(type);
        const db = new Database(env.DB);
        await db.init();
        
        const spider = new modules.spider();
        
        console.log(`\n========================================`);
        console.log(`🎯 开始爬取 ${modules.name} 历史数据（智能增量模式）`);
        console.log(`========================================`);
        
        // 获取数据库最新期号
        const latestInDb = await db.getLatest(type);
        
        // 确定爬取范围
        const currentYear = new Date().getFullYear();
        const yearShort = currentYear.toString().substring(2);
        
        let startIssue, endIssue;
        
        if (latestInDb) {
          // 从数据库最新期号的下一期开始爬取
          const latestNo = latestInDb.lottery_no;
          console.log(`数据库最新期号: ${latestNo}`);
          
          // 解析期号：2025133 -> 25, 133
          const yearPart = latestNo.substring(2, 4);
          const issuePart = parseInt(latestNo.substring(4));
          
          // 下一期
          const nextIssue = issuePart + 1;
          startIssue = `${yearPart}${nextIssue.toString().padStart(3, '0')}`;
          
          // 如果跨年了，从新年第一期开始
          if (nextIssue > 200) {
            const nextYear = parseInt(yearPart) + 1;
            startIssue = `${nextYear.toString().padStart(2, '0')}001`;
          }
        } else {
          // 数据库为空，从起始年份开始
          const startYear = modules.startYear;
          const startYearShort = startYear.toString().substring(2);
          startIssue = `${startYearShort}001`;
          console.log('数据库为空，从起始年份开始');
        }
        
        // 结束期号：当年最后一期
        endIssue = `${yearShort}200`;
        
        console.log(`爬取期号范围: ${startIssue} - ${endIssue}`);
        
        // 调用统一的 fetch 方法
        const data = await spider.fetch(startIssue, endIssue);
        
        if (!data || data.length === 0) {
          // 没有新数据，说明已经是最新的
          const currentTotal = await db.getCount(type);
          console.log(`\n========================================`);
          console.log(`✅ ${modules.name} 数据已是最新，无需爬取`);
          console.log(`   当前总计: ${currentTotal} 条`);
          console.log(`========================================\n`);
          
          return new Response(
            JSON.stringify({
              success: true,
              message: `${modules.name} 数据已完整，所有历史数据已存在`,
              inserted: 0,
              skipped: 0,
              total: currentTotal,
              dataSource: '500.com',
              lotteryType: type,
              queryParams: {
                start: startIssue,
                end: endIssue
              },
              hasMore: false,
              note: '历史数据已全部爬取完成'
            }),
            {
              headers: { 'Content-Type': 'application/json; charset=utf-8' }
            }
          );
        }
        
        console.log(`✓ 获取 ${data.length} 条数据`);
        
        // 批量插入（自动跳过已存在的数据）
        const result = await db.batchInsert(type, data);
        console.log(`✓ 入库: 新增 ${result.inserted} 条，跳过 ${result.skipped} 条`);
        
        const currentTotal = await db.getCount(type);
        
        // 智能判断是否还有更多数据
        // 如果本次爬取的数据量很少（< 10条），可能接近完成
        const hasMore = data.length >= 10;
        
        console.log(`\n========================================`);
        console.log(`✅ ${modules.name} 本次爬取完成`);
        console.log(`   新增: ${result.inserted} 条`);
        console.log(`   跳过: ${result.skipped} 条`);
        console.log(`   当前总计: ${currentTotal} 条`);
        if (hasMore) {
          console.log(`   💡 提示: 可能还有更多数据，请继续执行 /init/${type}`);
        } else {
          console.log(`   🎉 ${modules.name} 所有历史数据可能已爬取完成！`);
        }
        console.log(`========================================\n`);
        
        // 注意：初始化不发送 Telegram 通知，只有增量更新和预测才发送
        console.log('初始化完成，不发送 Telegram 通知');
        
        return new Response(
          JSON.stringify({
            success: true,
            message: `${modules.name} 数据爬取完成`,
            inserted: result.inserted,
            skipped: result.skipped,
            total: currentTotal,
            dataSource: '500.com',
            lotteryType: type,
            queryParams: {
              start: startIssue,
              end: endIssue
            },
            hasMore: hasMore,
            note: hasMore ? '可能还有更多数据需要爬取' : `${modules.name} 所有历史数据可能已爬取完成`
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