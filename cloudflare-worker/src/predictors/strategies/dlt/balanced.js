/**
 * 均衡策略
 * 追求号码分布的均衡性
 */

import { BaseStrategy } from './base.js';

export class BalancedStrategy extends BaseStrategy {
  constructor() {
    super('均衡策略', '追求号码分布均衡，大小号、奇偶号均衡');
  }

  generateFrontBalls(context) {
    const frontFrequency = context.frontFrequency || {};
    
    // 将号码分为小号(1-17)、大号(18-35)
    const smallBalls = Array.from({ length: 17 }, (_, i) => i + 1);
    const largeBalls = Array.from({ length: 18 }, (_, i) => i + 18);
    
    // 选择 2-3 个小号，2-3 个大号
    const smallCount = Math.random() < 0.5 ? 2 : 3;
    const largeCount = 5 - smallCount;
    
    let selectedSmall, selectedLarge;
    
    // 如果有频率数据，优先选择中频号码
    if (Object.keys(frontFrequency).length > 0) {
      // 获取中频号码（排名 10-25）
      const sortedBalls = Object.keys(frontFrequency)
        .map(k => parseInt(k))
        .sort((a, b) => frontFrequency[b] - frontFrequency[a]);
      const midFreqBalls = sortedBalls.slice(10, 25);
      
      // 从中频号码中筛选小号和大号
      let midSmall = midFreqBalls.filter(b => smallBalls.includes(b));
      let midLarge = midFreqBalls.filter(b => largeBalls.includes(b));
      
      // 如果中频号码不够，补充随机号码
      if (midSmall.length < smallCount) {
        midSmall = smallBalls;
      }
      if (midLarge.length < largeCount) {
        midLarge = largeBalls;
      }
      
      selectedSmall = this.randomSelect(midSmall, smallCount);
      selectedLarge = this.randomSelect(midLarge, largeCount);
    } else {
      selectedSmall = this.randomSelect(smallBalls, smallCount);
      selectedLarge = this.randomSelect(largeBalls, largeCount);
    }
    
    const balls = [...selectedSmall, ...selectedLarge];
    
    // 验证组合有效性
    if (!this.isValidFrontCombination(balls)) {
      return this.generateFrontBalls(context);
    }
    
    return balls.sort((a, b) => a - b);
  }

  generateBackBalls(context) {
    const backFrequency = context.backFrequency || {};
    
    // 后区追求大小号均衡：1个小号(1-6)，1个大号(7-12)
    const smallBack = Array.from({ length: 6 }, (_, i) => i + 1);
    const largeBack = Array.from({ length: 6 }, (_, i) => i + 7);
    
    let selected;
    
    if (Object.keys(backFrequency).length > 0) {
      // 从中频号码中选择
      const sortedBack = Object.keys(backFrequency)
        .map(k => parseInt(k))
        .sort((a, b) => backFrequency[b] - backFrequency[a]);
      const midFreqBack = sortedBack.slice(3, 9);
      
      let midSmall = midFreqBack.filter(b => smallBack.includes(b));
      let midLarge = midFreqBack.filter(b => largeBack.includes(b));
      
      if (midSmall.length === 0) {
        midSmall = smallBack;
      }
      if (midLarge.length === 0) {
        midLarge = largeBack;
      }
      
      selected = [
        midSmall[Math.floor(Math.random() * midSmall.length)],
        midLarge[Math.floor(Math.random() * midLarge.length)]
      ];
    } else {
      selected = [
        smallBack[Math.floor(Math.random() * smallBack.length)],
        largeBack[Math.floor(Math.random() * largeBack.length)]
      ];
    }
    
    return selected.sort((a, b) => a - b);
  }
}
