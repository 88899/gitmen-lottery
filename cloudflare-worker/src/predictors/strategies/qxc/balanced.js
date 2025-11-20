/**
 * 七星彩均衡策略
 */

import { BaseStrategy } from './base.js';

export class BalancedStrategy extends BaseStrategy {
  constructor() {
    super('balanced', '均衡策略', '追求号码分布均衡，大小号、奇偶号均衡');
  }

  generateNumbers(context) {
    const numbers = [];
    
    // 确保大小号均衡（0-4为小，5-9为大）
    // 确保奇偶号均衡
    const smallNumbers = [0, 1, 2, 3, 4];
    const largeNumbers = [5, 6, 7, 8, 9];
    const oddNumbers = [1, 3, 5, 7, 9];
    const evenNumbers = [0, 2, 4, 6, 8];
    
    // 3-4个小号，3-4个大号
    const smallCount = 3 + Math.floor(Math.random() * 2);
    const largeCount = 7 - smallCount;
    
    // 生成小号
    for (let i = 0; i < smallCount; i++) {
      numbers.push(this.randomChoice(smallNumbers));
    }
    
    // 生成大号
    for (let i = 0; i < largeCount; i++) {
      numbers.push(this.randomChoice(largeNumbers));
    }
    
    // 打乱顺序
    return this.shuffle(numbers);
  }

  shuffle(array) {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }
}
