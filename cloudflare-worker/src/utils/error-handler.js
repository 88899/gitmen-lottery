/**
 * 全局异常处理和通知模块 - Cloudflare Workers 版本
 */

import { TelegramBot } from './telegram.js';

class ErrorNotifier {
  constructor(env) {
    this.env = env;
    this.lastErrors = new Map(); // 用于防止重复通知
  }

  /**
   * 生成错误哈希值，用于去重
   */
  _getErrorHash(errorType, errorMessage) {
    const content = `${errorType}:${errorMessage}`;
    const encoder = new TextEncoder();
    const data = encoder.encode(content);
    
    // 简单哈希算法（Worker 环境限制）
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      hash = ((hash << 5) - hash + data[i]) & 0xffffffff;
    }
    return Math.abs(hash).toString(16).substring(0, 8);
  }

  /**
   * 判断是否应该发送通知（防止重复）
   */
  _shouldNotify(errorHash, cooldownMinutes = 30) {
    const now = Date.now();
    const cooldownMs = cooldownMinutes * 60 * 1000;
    
    if (this.lastErrors.has(errorHash)) {
      const lastTime = this.lastErrors.get(errorHash);
      if (now - lastTime < cooldownMs) {
        return false;
      }
    }
    
    this.lastErrors.set(errorHash, now);
    return true;
  }

  /**
   * 发送错误通知
   */
  async notifyError(errorType, errorMessage, context = {}, severity = 'ERROR', cooldownMinutes = 30) {
    try {
      // 生成错误哈希
      const errorHash = this._getErrorHash(errorType, errorMessage);
      
      // 检查是否需要通知
      if (!this._shouldNotify(errorHash, cooldownMinutes)) {
        console.log(`错误通知已在冷却期内，跳过: ${errorType}`);
        return false;
      }
      
      // 构建通知消息
      const message = this._buildErrorMessage(errorType, errorMessage, context, severity, errorHash);
      
      // 发送 Telegram 通知
      return await this._sendTelegramNotification(message, severity);
      
    } catch (error) {
      console.error('发送错误通知失败:', error);
      return false;
    }
  }

  /**
   * 构建错误通知消息
   */
  _buildErrorMessage(errorType, errorMessage, context, severity, errorHash) {
    // 选择合适的图标
    const icons = {
      'INFO': 'ℹ️',
      'WARNING': '⚠️',
      'ERROR': '❌',
      'CRITICAL': '🚨'
    };
    const icon = icons[severity] || '❌';
    
    // 构建消息
    let message = `${icon} <b>系统错误通知</b>\n\n`;
    message += `🔍 <b>错误类型:</b> ${errorType}\n`;
    message += `📝 <b>错误信息:</b> ${errorMessage}\n`;
    message += `⚡ <b>严重程度:</b> ${severity}\n`;
    message += `🕐 <b>发生时间:</b> ${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}\n`;
    
    // 添加上下文信息
    if (Object.keys(context).length > 0) {
      message += `\n📊 <b>上下文信息:</b>\n`;
      for (const [key, value] of Object.entries(context)) {
        message += `  • ${key}: ${value}\n`;
      }
    }
    
    message += `\n🏷️ <b>错误ID:</b> <code>${errorHash}</code>`;
    message += `\n💻 <b>环境:</b> Cloudflare Workers`;
    
    return message;
  }

  /**
   * 发送 Telegram 通知（独立实现，仅发送给 Bot）
   */
  async _sendTelegramNotification(message, severity) {
    try {
      // 获取配置
      const config = await this._getConfig();
      
      if (!config.telegramBotToken || !config.telegramChatId) {
        console.warn('Telegram 配置不完整，无法发送错误通知');
        return false;
      }
      
      // 构建 API URL
      const apiUrl = `https://api.telegram.org/bot${config.telegramBotToken}/sendMessage`;
      
      // 准备请求数据
      const data = {
        chat_id: config.telegramChatId,
        text: message,
        parse_mode: 'HTML',
        disable_web_page_preview: true
      };
      
      // 发送请求
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });
      
      if (response.ok) {
        console.log(`错误通知已发送给 Bot: ${severity}`);
        return true;
      } else {
        console.warn(`错误通知发送失败: HTTP ${response.status}`);
        return false;
      }
      
    } catch (error) {
      console.error('发送 Telegram 错误通知失败:', error);
      return false;
    }
  }

  /**
   * 获取配置（仅获取 Bot 相关配置）
   */
  async _getConfig() {
    const config = {
      telegramBotToken: await this.env.KV_BINDING?.get('TELEGRAM_BOT_TOKEN'),
      telegramChatId: await this.env.KV_BINDING?.get('TELEGRAM_CHAT_ID')
    };
    
    // 如果 KV 中没有配置，尝试从环境变量获取
    if (!config.telegramBotToken) config.telegramBotToken = this.env.TELEGRAM_BOT_TOKEN;
    if (!config.telegramChatId) config.telegramChatId = this.env.TELEGRAM_CHAT_ID;
    
    return config;
  }
}

/**
 * 处理严重错误（立即通知）
 */
export async function handleCriticalError(env, errorType, errorMessage, context = {}) {
  const notifier = new ErrorNotifier(env);
  return await notifier.notifyError(
    errorType,
    errorMessage,
    context,
    'CRITICAL',
    5 // 严重错误冷却时间较短
  );
}

/**
 * 处理网络错误
 */
export async function handleNetworkError(env, errorCode, url = null, lotteryType = null) {
  const context = {};
  if (url) context.url = url;
  if (lotteryType) context.lottery_type = lotteryType;
  
  const notifier = new ErrorNotifier(env);
  return await notifier.notifyError(
    'NETWORK_ERROR',
    `网络请求失败，错误代码: ${errorCode}`,
    context,
    'ERROR',
    15
  );
}

/**
 * 处理数据解析错误
 */
export async function handleParseError(env, errorMessage, lotteryType = null, dataSource = null) {
  const context = {};
  if (lotteryType) context.lottery_type = lotteryType;
  if (dataSource) context.data_source = dataSource;
  
  const notifier = new ErrorNotifier(env);
  return await notifier.notifyError(
    'PARSE_ERROR',
    errorMessage,
    context,
    'WARNING',
    20
  );
}

/**
 * 处理数据库错误
 */
export async function handleDatabaseError(env, errorMessage, operation = null) {
  const context = {};
  if (operation) context.operation = operation;
  
  const notifier = new ErrorNotifier(env);
  return await notifier.notifyError(
    'DATABASE_ERROR',
    errorMessage,
    context,
    'ERROR',
    10
  );
}

/**
 * 处理 API 错误
 */
export async function handleApiError(env, errorMessage, endpoint = null, statusCode = null) {
  const context = {};
  if (endpoint) context.endpoint = endpoint;
  if (statusCode) context.status_code = statusCode;
  
  const notifier = new ErrorNotifier(env);
  return await notifier.notifyError(
    'API_ERROR',
    errorMessage,
    context,
    'ERROR',
    15
  );
}

/**
 * 全局错误处理包装器
 */
export function withErrorHandling(env, handler) {
  return async (...args) => {
    try {
      return await handler(...args);
    } catch (error) {
      // 发送严重错误通知
      await handleCriticalError(
        env,
        'UNHANDLED_EXCEPTION',
        `${error.name}: ${error.message}`,
        {
          stack: error.stack?.substring(0, 500) // 只取前500字符
        }
      );
      
      // 重新抛出错误
      throw error;
    }
  };
}