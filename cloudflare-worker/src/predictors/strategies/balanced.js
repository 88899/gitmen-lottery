/**
 * 均衡策略
 * 追求号码分布均衡
 * 策略：将号码分为3个区间，每个区间选择2个号码
 */

import { BaseStrategy } from './base.js';

export class BalancedStrategy extends BaseStrategy {
  constructor() {
    super(
      '均衡策略',
      '追求号码分布均衡，从不同区间选择号码'
    );
  }

  /**
   * 生成红球组合
   */
  generateRedBalls(context) {
    const balls = [];
    
    // 将红球分为3个区间
    // 区间1: 01-11
    // 区间2: 12-22
    // 区间3: 23-33
    const zone1 = this.RED_RANGE.filter(b => parseInt(b) <= 11);
    const zone2 = this.RED_RANGE.filter(b => parseInt(b) >= 12 && parseInt(b) <= 22);
    const zone3 = this.RED_RANGE.filter(b => parseInt(b) >= 23);
    
    // 每个区间选择2个号码
    balls.push(...this.randomSelect(zone1, 2));
    balls.push(...this.randomSelect(zone2, 2));
    balls.push(...this.randomSelect(zone3, 2));
    
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
    const { blueFrequency } = context;
    
    // 50% 概率选择高频，50% 概率随机
    if (Math.random() < 0.5 && blueFrequency.length > 0) {
      const topBlue = blueFrequency.slice(0, 8);
      return topBlue[Math.floor(Math.random() * topBlue.length)].ball;
    } else {
      return this.BLUE_RANGE[Math.floor(Math.random() * this.BLUE_RANGE.length)];
    }
  }
}
