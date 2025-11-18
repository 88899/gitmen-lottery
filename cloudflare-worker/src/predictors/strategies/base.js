/**
 * 预测策略基类
 * 所有预测策略都需要继承此类
 */

export class BaseStrategy {
  constructor(name, description) {
    this.name = name;
    this.description = description;
    this.RED_RANGE = Array.from({ length: 33 }, (_, i) => (i + 1).toString().padStart(2, '0'));
    this.BLUE_RANGE = Array.from({ length: 16 }, (_, i) => (i + 1).toString().padStart(2, '0'));
  }

  /**
   * 生成红球组合（子类必须实现）
   * @param {Object} context - 上下文数据（历史数据、频率统计等）
   * @returns {Array} 6个红球号码
   */
  generateRedBalls(context) {
    throw new Error('子类必须实现 generateRedBalls 方法');
  }

  /**
   * 生成蓝球（子类必须实现）
   * @param {Object} context - 上下文数据
   * @returns {string} 蓝球号码
   */
  generateBlueBall(context) {
    throw new Error('子类必须实现 generateBlueBall 方法');
  }

  /**
   * 验证红球组合是否有效
   * 规则：不能有超过3个连号
   */
  isValidRedCombination(balls) {
    const sorted = balls.map(b => parseInt(b)).sort((a, b) => a - b);
    
    let consecutiveCount = 1;
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i] - sorted[i - 1] === 1) {
        consecutiveCount++;
        if (consecutiveCount >= 3) {
          return false; // 超过3个连号
        }
      } else {
        consecutiveCount = 1;
      }
    }
    
    return true;
  }

  /**
   * 从数组中随机选择 n 个不重复的元素
   */
  randomSelect(array, n) {
    const shuffled = [...array].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, n);
  }

  /**
   * 计算组合得分（用于排序）
   */
  scoreCombin(redBalls, redFrequency) {
    let score = 0;
    
    // 频率得分
    for (const ball of redBalls) {
      const freq = redFrequency.find(f => f.ball === ball);
      if (freq) {
        score += freq.count;
      }
    }
    
    // 分布得分（号码分布越均匀得分越高）
    const sorted = redBalls.map(b => parseInt(b)).sort((a, b) => a - b);
    const gaps = [];
    for (let i = 1; i < sorted.length; i++) {
      gaps.push(sorted[i] - sorted[i - 1]);
    }
    const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;
    const idealGap = 33 / 6; // 理想间距
    const gapScore = 100 - Math.abs(avgGap - idealGap) * 10;
    score += gapScore;
    
    return score;
  }

  /**
   * 获取策略信息
   */
  getInfo() {
    return {
      name: this.name,
      description: this.description
    };
  }
}
