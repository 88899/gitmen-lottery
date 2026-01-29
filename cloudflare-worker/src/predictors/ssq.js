/**
 * 双色球预测器 - Cloudflare Worker 版本
 * 支持多种预测策略的组合使用
 */

import { getStrategy, getAllStrategies } from './strategies/index.js';

export class SSQPredictor {
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
      
      // 并行获取所有需要的数据（免费计划优化：减少查询数量）
      const [historyData, frequency, historicalCombinations] = await Promise.all([
        this.db.getAll('ssq', 100),  // 减少到 100 条
        this.db.getFrequency('ssq'),
        this.db.getHistoricalCombinations('ssq')
      ]);
      
      if (historyData.length === 0) {
        throw new Error('没有历史数据');
      }
      
      // 将频率对象转换为排序后的数组
      const convertToArray = (freqObj) => {
        if (!freqObj) return [];
        return Object.entries(freqObj)
          .map(([ball, count]) => ({ ball: String(ball).padStart(2, '0'), count }))
          .sort((a, b) => b.count - a.count);
      };

      // 构建上下文数据
      const context = {
        historyData,
        redFrequency: convertToArray(frequency.red),
        blueFrequency: convertToArray(frequency.blue),
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
    const maxAttempts = Math.min(count * 20, 200); // 大幅减少尝试次数（免费计划优化）
    const startTime = Date.now();
    const maxTime = 500; // 最大执行时间 500ms（免费计划优化）
    let attempts = 0;
    let duplicateCount = 0; // 统计重复次数

    console.log(`使用 ${strategy.name} 生成 ${count} 个组合（已排除 ${context.historicalCombinations.size} 个历史组合）...`);

    while (predictions.length < count && attempts < maxAttempts) {
      attempts++;

      // 每 10 次检查一次时间（减少 Date.now() 调用）
      if (attempts % 10 === 0 && Date.now() - startTime > maxTime) {
        console.warn(`${strategy.name} 预测超时，已生成 ${predictions.length} 个组合`);
        break;
      }

      // 使用策略生成红球和蓝球
      const redBalls = strategy.generateRedBalls(context);
      const blueBall = strategy.generateBlueBall(context);

      // 检查是否重复
      const sortedCode = [...redBalls].sort().join(',') + '-' + blueBall;
      
      const isDuplicate = 
        context.historicalCombinations.has(sortedCode) ||
        existingPredictions.some(p => p.sorted_code === sortedCode) ||
        predictions.some(p => p.sorted_code === sortedCode);
      
      if (isDuplicate) {
        duplicateCount++;
      } else {
        predictions.push({
          red_balls: redBalls,
          blue_ball: blueBall,
          sorted_code: sortedCode,
          strategy: strategyName,
          strategy_name: strategy.name,
          prediction_time: new Date().toISOString()
        });
      }
    }

    console.log(`${strategy.name} 生成了 ${predictions.length} 个组合（尝试 ${attempts} 次，排除重复 ${duplicateCount} 次）`);
    return predictions;
  }

  /**
   * 获取所有可用策略
   */
  static getAvailableStrategies() {
    return getAllStrategies();
  }

}
