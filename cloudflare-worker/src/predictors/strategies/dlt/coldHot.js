/**
 * 冷热号策略
 * 结合冷号和热号
 */

import { BaseStrategy } from './base.js';

export class ColdHotStrategy extends BaseStrategy {
  constructor() {
    super('冷热号策略', '结合冷号（低频）和热号（高频）');
  }

  generateFrontBalls(context) {
    const frontFrequency = context.frontFrequency || {};
    
    if (Object.keys(frontFrequency).length === 0) {
      // 如果没有频率数据，使用随机策略
      return this.randomSelect(this.FRONT_RANGE, 5).sort((a, b) => a - b);
    }
    
    // 获取热号（高频，前10个）
    const sortedBalls = Object.keys(frontFrequency)
      .map(k => parseInt(k))
      .sort((a, b) => frontFrequency[b] - frontFrequency[a]);
    const hotBalls = sortedBalls.slice(0, 10);
    
    // 获取冷号（低频，后10个）
    const coldBalls = sortedBalls.slice(-10);
    
    // 选择 2-3 个热号，2-3 个冷号
    const hotCount = Math.random() < 0.5 ? 2 : 3;
    const coldCount = 5 - hotCount;
    
    const selectedHot = this.randomSelect(hotBalls, hotCount);
    const selectedCold = this.randomSelect(coldBalls, coldCount);
    
    const balls = [...selectedHot, ...selectedCold];
    
    // 验证组合有效性
    if (!this.isValidFrontCombination(balls)) {
      return this.generateFrontBalls(context);
    }
    
    return balls.sort((a, b) => a - b);
  }

  generateBackBalls(context) {
    const backFrequency = context.backFrequency || {};
    
    if (Object.keys(backFrequency).length === 0) {
      return this.randomSelect(this.BACK_RANGE, 2).sort((a, b) => a - b);
    }
    
    // 获取热号和冷号
    const sortedBack = Object.keys(backFrequency)
      .map(k => parseInt(k))
      .sort((a, b) => backFrequency[b] - backFrequency[a]);
    const hotBack = sortedBack.slice(0, 4);
    const coldBack = sortedBack.slice(-4);
    
    // 1个热号，1个冷号
    const selected = [
      hotBack[Math.floor(Math.random() * hotBack.length)],
      coldBack[Math.floor(Math.random() * coldBack.length)]
    ];
    
    return selected.sort((a, b) => a - b);
  }
}
