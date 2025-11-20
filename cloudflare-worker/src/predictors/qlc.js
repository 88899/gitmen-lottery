/**
 * 七乐彩预测器 - Cloudflare Worker 版本
 */

export class QLCPredictor {
  constructor(db, options = {}) {
    this.db = db;
    this.strategies = options.strategies || ['frequency'];
    this.basicRange = Array.from({length: 30}, (_, i) => i + 1);
    this.basicCount = 7;
  }

  /**
   * 预测
   */
  async predict(count = 5, strategies = null) {
    const useStrategies = strategies || this.strategies;
    
    // 获取历史数据
    const historyData = await this.db.getAll('qlc', 100);
    
    if (!historyData || historyData.length === 0) {
      throw new Error('没有历史数据');
    }
    
    console.log(`七乐彩预测: ${historyData.length} 条历史数据`);
    
    // 分析数据
    const analysis = this.analyzeHistory(historyData);
    
    const predictions = [];
    const usedCombinations = new Set();
    
    // 记录历史组合
    historyData.forEach(item => {
      const combo = item.basic_balls.slice().sort().join(',') + '-' + item.special_ball;
      usedCombinations.add(combo);
    });
    
    let attempts = 0;
    const maxAttempts = count * 10;
    
    while (predictions.length < count && attempts < maxAttempts) {
      attempts++;
      
      const strategy = useStrategies[attempts % useStrategies.length];
      const prediction = this.generatePrediction(strategy, analysis);
      
      const combo = prediction.basic_balls.slice().sort().join(',') + '-' + prediction.special_ball;
      
      if (!usedCombinations.has(combo)) {
        predictions.push({
          ...prediction,
          rank: predictions.length + 1,
          strategy: strategy,
          strategy_name: this.getStrategyName(strategy)
        });
        usedCombinations.add(combo);
      }
    }
    
    console.log(`生成 ${predictions.length} 个七乐彩预测`);
    return predictions;
  }

  /**
   * 分析历史数据
   */
  analyzeHistory(historyData) {
    const basicFreq = {};
    const specialFreq = {};
    
    this.basicRange.forEach(num => {
      basicFreq[num] = 0;
      specialFreq[num] = 0;
    });
    
    historyData.forEach(item => {
      item.basic_balls.forEach(ball => {
        const num = parseInt(ball);
        basicFreq[num] = (basicFreq[num] || 0) + 1;
      });
      const specialNum = parseInt(item.special_ball);
      specialFreq[specialNum] = (specialFreq[specialNum] || 0) + 1;
    });
    
    return { basicFreq, specialFreq, totalCount: historyData.length };
  }

  /**
   * 生成预测
   */
  generatePrediction(strategy, analysis) {
    switch (strategy) {
      case 'frequency':
        return this.frequencyStrategy(analysis);
      case 'random':
        return this.randomStrategy();
      case 'balanced':
        return this.balancedStrategy();
      case 'coldHot':
        return this.coldHotStrategy(analysis);
      default:
        return this.randomStrategy();
    }
  }

  /**
   * 频率策略
   */
  frequencyStrategy(analysis) {
    const { basicFreq, specialFreq } = analysis;
    
    const sortedBasic = Object.entries(basicFreq)
      .sort(([,a], [,b]) => b - a)
      .map(([num]) => parseInt(num));
    
    const basicBalls = [];
    const topBalls = sortedBasic.slice(0, 15);
    
    for (let i = 0; i < 5 && i < topBalls.length; i++) {
      basicBalls.push(topBalls[i]);
    }
    
    const remaining = this.basicRange.filter(n => !basicBalls.includes(n));
    while (basicBalls.length < this.basicCount && remaining.length > 0) {
      const idx = Math.floor(Math.random() * remaining.length);
      basicBalls.push(remaining.splice(idx, 1)[0]);
    }
    
    const availableForSpecial = this.basicRange.filter(n => !basicBalls.includes(n));
    const sortedSpecial = Object.entries(specialFreq)
      .filter(([num]) => availableForSpecial.includes(parseInt(num)))
      .sort(([,a], [,b]) => b - a)
      .map(([num]) => parseInt(num));
    
    const specialBall = sortedSpecial.length > 0 ? 
      sortedSpecial[Math.floor(Math.random() * Math.min(5, sortedSpecial.length))] :
      availableForSpecial[Math.floor(Math.random() * availableForSpecial.length)];
    
    return {
      basic_balls: basicBalls.sort((a, b) => a - b),
      special_ball: specialBall
    };
  }

  /**
   * 随机策略
   */
  randomStrategy() {
    const basicBalls = this.randomSelect(this.basicRange, this.basicCount);
    const availableForSpecial = this.basicRange.filter(n => !basicBalls.includes(n));
    const specialBall = availableForSpecial[Math.floor(Math.random() * availableForSpecial.length)];
    
    return {
      basic_balls: basicBalls.sort((a, b) => a - b),
      special_ball: specialBall
    };
  }

  /**
   * 均衡策略
   */
  balancedStrategy() {
    const smallNums = Array.from({length: 15}, (_, i) => i + 1);
    const largeNums = Array.from({length: 15}, (_, i) => i + 16);
    
    const smallCount = Math.random() < 0.5 ? 3 : 4;
    const largeCount = this.basicCount - smallCount;
    
    const basicBalls = [
      ...this.randomSelect(smallNums, smallCount),
      ...this.randomSelect(largeNums, largeCount)
    ];
    
    const availableForSpecial = this.basicRange.filter(n => !basicBalls.includes(n));
    const specialBall = availableForSpecial[Math.floor(Math.random() * availableForSpecial.length)];
    
    return {
      basic_balls: basicBalls.sort((a, b) => a - b),
      special_ball: specialBall
    };
  }

  /**
   * 冷热号策略
   */
  coldHotStrategy(analysis) {
    const { basicFreq, specialFreq } = analysis;
    
    const sortedBasic = Object.entries(basicFreq)
      .sort(([,a], [,b]) => b - a)
      .map(([num]) => parseInt(num));
    
    const hotBalls = sortedBasic.slice(0, 10);
    const coldBalls = sortedBasic.slice(-10);
    
    const basicBalls = [
      ...this.randomSelect(hotBalls, 4),
      ...this.randomSelect(coldBalls, 3)
    ];
    
    const availableForSpecial = this.basicRange.filter(n => !basicBalls.includes(n));
    const sortedSpecial = Object.entries(specialFreq)
      .filter(([num]) => availableForSpecial.includes(parseInt(num)))
      .sort(([,a], [,b]) => b - a)
      .map(([num]) => parseInt(num));
    
    const specialBall = sortedSpecial.length > 0 ?
      (Math.random() < 0.5 ? 
        sortedSpecial[Math.floor(Math.random() * Math.min(3, sortedSpecial.length))] :
        sortedSpecial[Math.max(0, sortedSpecial.length - Math.floor(Math.random() * 3) - 1)]
      ) :
      availableForSpecial[Math.floor(Math.random() * availableForSpecial.length)];
    
    return {
      basic_balls: basicBalls.sort((a, b) => a - b),
      special_ball: specialBall
    };
  }

  /**
   * 随机选择
   */
  randomSelect(array, count) {
    const result = [];
    const available = [...array];
    
    for (let i = 0; i < count && available.length > 0; i++) {
      const idx = Math.floor(Math.random() * available.length);
      result.push(available.splice(idx, 1)[0]);
    }
    
    return result;
  }

  /**
   * 获取策略名称
   */
  getStrategyName(strategy) {
    const names = {
      frequency: '频率策略',
      random: '随机策略',
      balanced: '均衡策略',
      coldHot: '冷热号策略'
    };
    return names[strategy] || '未知策略';
  }

  /**
   * 获取可用策略
   */
  static getAvailableStrategies() {
    return [
      { name: 'frequency', description: '频率策略 - 基于历史出现频率' },
      { name: 'random', description: '随机策略 - 完全随机生成' },
      { name: 'balanced', description: '均衡策略 - 大小号均衡分布' },
      { name: 'coldHot', description: '冷热号策略 - 结合冷热号分析' }
    ];
  }
}

export default QLCPredictor;
