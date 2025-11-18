/**
 * 随机策略
 * 完全随机选择号码
 */

import { BaseStrategy } from './base.js';

export class RandomStrategy extends BaseStrategy {
  constructor() {
    super('随机策略', '完全随机选择号码，不考虑历史数据');
  }

  generateFrontBalls(context) {
    const balls = this.randomSelect(this.FRONT_RANGE, 5);
    
    // 验证组合有效性
    if (!this.isValidFrontCombination(balls)) {
      return this.generateFrontBalls(context);
    }
    
    return balls.sort((a, b) => a - b);
  }

  generateBackBalls(context) {
    return this.randomSelect(this.BACK_RANGE, 2).sort((a, b) => a - b);
  }
}
