/**
 * 七星彩预测策略索引
 */

import { FrequencyStrategy } from './frequency.js';
import { RandomStrategy } from './random.js';
import { BalancedStrategy } from './balanced.js';
import { ColdHotStrategy } from './cold_hot.js';

const strategies = {
  frequency: FrequencyStrategy,
  random: RandomStrategy,
  balanced: BalancedStrategy,
  coldHot: ColdHotStrategy
};

export function getStrategy(name) {
  const StrategyClass = strategies[name];
  if (!StrategyClass) {
    throw new Error(`未知策略: ${name}`);
  }
  return new StrategyClass();
}

export function getAllStrategies() {
  return Object.values(strategies).map(StrategyClass => {
    const instance = new StrategyClass();
    return {
      key: instance.key,
      name: instance.name,
      description: instance.description
    };
  });
}
