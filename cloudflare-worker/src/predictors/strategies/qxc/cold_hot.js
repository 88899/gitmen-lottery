/**
 * 七星彩冷热号策略
 */

import { BaseStrategy } from './base.js';

export class ColdHotStrategy extends BaseStrategy {
  constructor() {
    super('coldHot', '冷热号策略', '结合冷号（低频）和热号（高频）');
  }

  generateNumbers(context) {
    const { numberFrequency } = context;
    const numbers = [];
    
    if (numberFrequency && numberFrequency.length >= 5) {
      // 热号：前3个高频号码
      const hotNumbers = numberFrequency.slice(0, 3).map(item => parseInt(item.ball));
      
      // 冷号：后3个低频号码
      const coldNumbers = numberFrequency.slice(-3).map(item => parseInt(item.ball));
      
      // 3-4个热号
      const hotCount = 3 + Math.floor(Math.random() * 2);
      for (let i = 0; i < hotCount; i++) {
        numbers.push(this.randomChoice(hotNumbers));
      }
      
      // 剩余用冷号
      const coldCount = 7 - hotCount;
      for (let i = 0; i < coldCount; i++) {
        numbers.push(this.randomChoice(coldNumbers));
      }
      
      // 打乱顺序
      return this.shuffle(numbers);
    } else {
      // 如果没有频率数据，随机生成
      for (let i = 0; i < 7; i++) {
        numbers.push(this.randomNumber());
      }
      return numbers;
    }
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
