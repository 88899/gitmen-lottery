/**
 * 七星彩频率策略
 */

import { BaseStrategy } from './base.js';

export class FrequencyStrategy extends BaseStrategy {
  constructor() {
    super('frequency', '频率策略', '基于历史出现频率，选择高频号码');
  }

  generateNumbers(context) {
    const { numberFrequency } = context;
    const numbers = [];
    
    if (numberFrequency && numberFrequency.length > 0) {
      // 按位置选择高频号码（带随机性）
      for (let i = 0; i < 7; i++) {
        // 从前5个高频号码中随机选择
        const topNumbers = numberFrequency.slice(0, 5);
        const selected = this.randomChoice(topNumbers);
        numbers.push(parseInt(selected.ball));
      }
    } else {
      // 如果没有频率数据，随机生成
      for (let i = 0; i < 7; i++) {
        numbers.push(this.randomNumber());
      }
    }
    
    return numbers;
  }
}
