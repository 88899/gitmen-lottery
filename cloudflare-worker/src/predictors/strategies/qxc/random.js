/**
 * 七星彩随机策略
 */

import { BaseStrategy } from './base.js';

export class RandomStrategy extends BaseStrategy {
  constructor() {
    super('random', '随机策略', '完全随机选择号码');
  }

  generateNumbers(context) {
    const numbers = [];
    
    for (let i = 0; i < 7; i++) {
      numbers.push(this.randomNumber());
    }
    
    return numbers;
  }
}
