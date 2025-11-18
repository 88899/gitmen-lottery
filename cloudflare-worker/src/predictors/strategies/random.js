/**
 * 随机策略
 * 完全随机选择号码
 * 策略：纯随机，不考虑历史数据
 */

import { BaseStrategy } from './base.js';

export class RandomStrategy extends BaseStrategy {
  constructor() {
    super(
      '随机策略',
      '完全随机选择号码，不考虑历史数据'
    );
  }

  /**
   * 生成红球组合
   */
  generateRedBalls(context) {
    const balls = this.randomSelect(this.RED_RANGE, 6);
    
    // 验证组合有效性
    if (!this.isValidRedCombination(balls)) {
      return this.generateRedBalls(context);
    }
    
    return balls.sort();
  }

  /**
   * 生成蓝球
   */
  generateBlueBall(context) {
    return this.BLUE_RANGE[Math.floor(Math.random() * this.BLUE_RANGE.length)];
  }
}
