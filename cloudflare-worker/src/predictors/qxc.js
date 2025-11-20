/**
 * 七星彩预测器 - Cloudflare Worker 版本
 */

import { getStrategy, getAllStrategies } from './strategies/qxc/index.js';

export class QXCPredictor {
  constructor(db, options = {}) {
    this.db = db;
    this.defaultStrategies = options.strategies || ['frequency'];
    this.countPerStrategy = options.countPerStrategy || null;
  }

  /**
   * 执行预测
   */
  async predict(count = 5, strategies = null) {
    try {
      const strategyNames = strategies || this.defaultStrategies;
      
      console.log(`使用策略: ${strategyNames.join(', ')}`);
      
      // 并行获取所有需要的数据
      const [historyData, frequency, historicalCombinations] = await Promise.all([
        this.db.getAll('qxc', 100),
        this.db.getFrequency('qxc'),
        this.db.getHistoricalCombinations('qxc')
      ]);
      
      if (historyData.length === 0) {
        throw new Error('没有历史数据');
      }
      
      // 将频率对象转换为排序后的数组
      const convertToArray = (freqObj) => {
        if (!freqObj) return [];
        return Object.entries(freqObj)
          .map(([ball, count]) => ({ ball: String(ball), count }))
          .sort((a, b) => b.count - a.count);
      };
      
      const numberFrequency = convertToArray(frequency.numbers || {});
      
      // 构建预测上下文
      const context = {
        historyData,
        numberFrequency,
        historicalCombinations: new Set(historicalCombinations || [])
      };
      
      // 按策略生成预测
      const predictions = [];
      const countPerStrategy = this.countPerStrategy || Math.ceil(count / strategyNames.length);
      
      for (const strategyName of strategyNames) {
        const strategyPredictions = await this.predictWithStrategy(
          strategyName,
          countPerStrategy,
          context,
          predictions
        );
        predictions.push(...strategyPredictions);
        
        if (predictions.length >= count) {
          break;
        }
      }
      
      return predictions.slice(0, count);
      
    } catch (error) {
      console.error('七星彩预测失败:', error);
      throw error;
    }
  }

  /**
   * 使用指定策略预测
   */
  async predictWithStrategy(strategyName, count, context, existingPredictions = []) {
    const strategy = getStrategy(strategyName);
    const predictions = [];
    const maxAttempts = Math.min(count * 20, 200);
    const startTime = Date.now();
    const maxTime = 500;
    let attempts = 0;

    console.log(`使用 ${strategy.name} 生成 ${count} 个组合...`);

    while (predictions.length < count && attempts < maxAttempts) {
      attempts++;

      if (attempts % 10 === 0 && Date.now() - startTime > maxTime) {
        console.warn(`${strategy.name} 预测超时，已生成 ${predictions.length} 个组合`);
        break;
      }

      const numbers = strategy.generateNumbers(context);
      
      const sortedCode = numbers.join(',');
      
      const isDuplicate = 
        context.historicalCombinations.has(sortedCode) ||
        existingPredictions.some(p => p.sorted_code === sortedCode) ||
        predictions.some(p => p.sorted_code === sortedCode);

      if (!isDuplicate && strategy.validate(numbers)) {
        predictions.push({
          numbers: numbers,
          sorted_code: sortedCode,
          strategy: strategyName,
          strategy_name: strategy.name
        });
      }
    }

    console.log(`${strategy.name} 生成了 ${predictions.length} 个组合（尝试 ${attempts} 次）`);
    return predictions;
  }

  /**
   * 获取可用策略列表
   */
  static getAvailableStrategies() {
    return getAllStrategies();
  }
}
