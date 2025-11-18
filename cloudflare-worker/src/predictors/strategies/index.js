/**
 * 策略注册中心
 * 管理所有可用的预测策略
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
 * @returns {BaseStrategy} 策略实例
 */
export function getStrategy(strategyName) {
  const StrategyClass = STRATEGIES[strategyName];
  
  if (!StrategyClass) {
    throw new Error(`未知的策略: ${strategyName}。可用策略: ${Object.keys(STRATEGIES).join(', ')}`);
  }
  
  return new StrategyClass();
}

/**
 * 获取所有可用策略
 * @returns {Array} 策略列表
 */
export function getAllStrategies() {
  return Object.keys(STRATEGIES).map(key => {
    const strategy = new STRATEGIES[key]();
    return {
      key: key,
      ...strategy.getInfo()
    };
  });
}

/**
 * 导出所有策略类（供直接使用）
 */
export {
  FrequencyStrategy,
  RandomStrategy,
  BalancedStrategy,
  ColdHotStrategy
};
