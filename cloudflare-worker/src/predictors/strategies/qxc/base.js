/**
 * 七星彩预测策略基类
 */

export class BaseStrategy {
  constructor(key, name, description) {
    this.key = key;
    this.name = name;
    this.description = description;
  }

  /**
   * 生成7个数字（0-9）
   */
  generateNumbers(context) {
    throw new Error('子类必须实现 generateNumbers 方法');
  }

  /**
   * 验证号码组合
   */
  validate(numbers) {
    if (!Array.isArray(numbers) || numbers.length !== 7) {
      return false;
    }
    
    return numbers.every(n => Number.isInteger(n) && n >= 0 && n <= 9);
  }

  /**
   * 随机选择一个数字（0-9）
   */
  randomNumber() {
    return Math.floor(Math.random() * 10);
  }

  /**
   * 从数组中随机选择
   */
  randomChoice(array) {
    return array[Math.floor(Math.random() * array.length)];
  }
}
