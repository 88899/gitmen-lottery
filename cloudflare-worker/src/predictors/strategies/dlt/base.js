/**
 * 大乐透预测策略基类
 */

export class BaseStrategy {
  constructor(name, description) {
    this.name = name;
    this.description = description;
    this.FRONT_RANGE = Array.from({ length: 35 }, (_, i) => i + 1); // 1-35
    this.BACK_RANGE = Array.from({ length: 12 }, (_, i) => i + 1);  // 1-12
  }

  /**
   * 生成前区号码（子类必须实现）
   * @param {Object} context - 上下文数据
   * @returns {Array} 5个前区号码
   */
  generateFrontBalls(context) {
    throw new Error('子类必须实现 generateFrontBalls 方法');
  }

  /**
   * 生成后区号码（子类必须实现）
   * @param {Object} context - 上下文数据
   * @returns {Array} 2个后区号码
   */
  generateBackBalls(context) {
    throw new Error('子类必须实现 generateBackBalls 方法');
  }

  /**
   * 验证前区组合是否有效
   * 规则：不能有超过3个连号
   * @param {Array} balls - 前区号码列表
   * @returns {boolean} 是否有效
   */
  isValidFrontCombination(balls) {
    const sorted = [...balls].sort((a, b) => a - b);
    let consecutiveCount = 1;
    
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i] - sorted[i-1] === 1) {
        consecutiveCount++;
        if (consecutiveCount >= 3) {
          return false;
        }
      } else {
        consecutiveCount = 1;
      }
    }
    
    return true;
  }

  /**
   * 从数组中随机选择 n 个不重复的元素
   * @param {Array} array - 源数组
   * @param {number} n - 选择数量
   * @returns {Array} 选中的元素列表
   */
  randomSelect(array, n) {
    const result = [];
    const copy = [...array];
    
    for (let i = 0; i < Math.min(n, copy.length); i++) {
      const index = Math.floor(Math.random() * copy.length);
      result.push(copy[index]);
      copy.splice(index, 1);
    }
    
    return result;
  }

  /**
   * 获取策略信息
   * @returns {Object} 策略信息
   */
  getInfo() {
    return {
      name: this.name,
      description: this.description
    };
  }
}
