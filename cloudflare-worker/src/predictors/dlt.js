/**
 * 大乐透预测器 - Cloudflare Worker 版本
 * 支持多种预测策略的组合使用
 */

import { getStrategy, getAllStrategies } from './strategies/dlt/index.js';

export class DLTPredictor {
  constructor(db, options = {}) {
    this.db = db;
    
    // 默认策略配置
    this.defaultStrategies = options.strategies || ['frequency'];
    
    // 每个策略生成的组合数
    this.countPerStrategy = options.countPerStrategy || null;
  }

  /**
   * 执行预测
   * @param {number} count - 预测组合总数
   * @param {Array} strategies - 使用的策略列表（可选）
   * @returns {Array} 预测结果
   */
  async predict(count = 5, strategies = null) {
    try {
      // 使用指定策略或默认策略
      const strategyNames = strategies || this.defaultStrategies;
      
      console.log(`使用策略: ${strategyNames.join(', ')}`);
      
      // 获取历史数据
      const historyData = await this.db.getAll('dlt', 500);
      
      if (historyData.length === 0) {
        throw new Error('没有历史数据');
      }

      // 获取频率统计
      const frequency = await this.db.getFrequency('dlt');
      
      // 获取历史组合（用于去重）
      const historicalCombinations = await this.db.getHistoricalCombinations('dlt');

      // 构建上下文数据
      const context = {
        historyData,
        frontFrequency: frequency.front,
        backFrequency: frequency.back,
        historicalCombinations
      };

      // 计算每个策略生成的组合数
      const countPerStrategy = this.countPerStrategy || Math.ceil(count / strategyNames.length);
      
      console.log(`总共需要 ${count} 个组合，使用 ${strategyNames.length} 个策略，每个策略生成 ${countPerStrategy} 个`);
      
      // 使用多个策略生成预测
      const predictions = [];
      
      for (const strategyName of strategyNames) {
        const strategyPredictions = await this.predictWithStrategy(
          strategyName,
          countPerStrategy,
          context,
          predictions
        );
        
        predictions.push(...strategyPredictions);
        
        console.log(`当前已生成 ${predictions.length} 个组合`);
        
        // 如果已经生成足够的组合，停止
        if (predictions.length >= count) {
          console.log(`已达到目标数量 ${count}，停止生成`);
          break;
        }
      }

      // 截取到指定数量
      const finalPredictions = predictions.slice(0, count);
      
      // 添加排名
      finalPredictions.forEach((pred, index) => {
        pred.rank = index + 1;
      });

      // 统计每个策略的数量
      const strategyCount = {};
      finalPredictions.forEach(pred => {
        strategyCount[pred.strategy] = (strategyCount[pred.strategy] || 0) + 1;
      });
      
      console.log(`生成了 ${finalPredictions.length} 个预测组合，策略分布:`, strategyCount);
      return finalPredictions;
    } catch (error) {
      console.error('预测失败:', error);
      throw error;
    }
  }

  /**
   * 使用指定策略生成预测
   * @param {string} strategyName - 策略名称
   * @param {number} count - 生成数量
   * @param {Object} context - 上下文数据
   * @param {Array} existingPredictions - 已生成的预测（用于去重）
   * @returns {Array} 预测结果
   */
  async predictWithStrategy(strategyName, count, context, existingPredictions = []) {
    const strategy = getStrategy(strategyName);
    const predictions = [];
    const maxAttempts = count * 100; // 最多尝试次数
    let attempts = 0;

    console.log(`使用 ${strategy.name} 生成 ${count} 个组合...`);

    while (predictions.length < count && attempts < maxAttempts) {
      attempts++;

      // 使用策略生成前区和后区
      const frontBalls = strategy.generateFrontBalls(context);
      const backBalls = strategy.generateBackBalls(context);

      // 检查是否重复
      const sortedCode = [...frontBalls].sort().join(',') + '-' + [...backBalls].sort().join(',');
      
      const isDuplicate = 
        context.historicalCombinations.has(sortedCode) ||
        existingPredictions.some(p => p.sorted_code === sortedCode) ||
        predictions.some(p => p.sorted_code === sortedCode);
      
      if (!isDuplicate) {
        predictions.push({
          front_balls: frontBalls,
          back_balls: backBalls,
          sorted_code: sortedCode,
          strategy: strategyName,
          strategy_name: strategy.name,
          prediction_time: new Date().toISOString()
        });
      }
    }

    console.log(`${strategy.name} 生成了 ${predictions.length} 个组合`);
    return predictions;
  }

  /**
   * 获取所有可用策略
   */
  static getAvailableStrategies() {
    return getAllStrategies();
  }
}
