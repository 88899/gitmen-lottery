/**
 * 大乐透预测策略模块
 */

import { FrequencyStrategy } from './frequency.js';
import { RandomStrategy } from './random.js';
import { BalancedStrategy } from './balanced.js';
import { ColdHotStrategy } from './coldHot.js';

// 策略注册表
const STRATEGIES = {
  frequency: FrequencyStrategy,
  random: RandomStrategy,
  balanced: BalancedStrategy,
  coldHot: ColdHotStrategy
};

/**
 * 获取策略实例
 * @param {string} strategyName - 策略名称
 * @returns {Object} 策略实例
 */
export function getStrategy(strategyName) {
  const StrategyClass = STRATEGIES[strategyName];
  
  if (!StrategyClass) {
    const available = Object.keys(STRATEGIES).join(', ');
    throw new Error(`未知的策略: ${strategyName}。可用策略: ${available}`);
  }
  
  return new StrategyClass();
}

/**
 * 获取所有可用策略
 * @returns {Array} 策略列表
 */
export function getAllStrategies() {
  return Object.entries(STRATEGIES).map(([key, StrategyClass]) => {
    const instance = new StrategyClass();
    return {
      key,
      name: instance.name,
      description: instance.description
    };
  });
}
