/**
 * 历史记录查询API
 */

export class HistoryAPI {
  constructor(db) {
    this.db = db;
  }

  /**
   * 查询历史记录
   * @param {string} type - 彩票类型
   * @param {Object} filters - 查询条件
   * @param {number} page - 页码
   * @param {number} limit - 每页数量
   */
  async query(type, filters = {}, page = 1, limit = 10) {
    try {
      // 构建查询条件
      const conditions = [];
      const params = [];
      
      // 期号查询
      if (filters.lottery_no) {
        conditions.push('lottery_no = ?');
        params.push(filters.lottery_no);
      }
      
      // 日期查询
      if (filters.draw_date) {
        conditions.push('draw_date = ?');
        params.push(filters.draw_date);
      }
      
      // 号码查询
      if (filters.numbers) {
        const numberConditions = this.buildNumberConditions(type, filters.numbers);
        if (numberConditions) {
          conditions.push(numberConditions.condition);
          params.push(...numberConditions.params);
        }
      }
      
      // 构建WHERE子句
      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      
      // 计算总数
      const countQuery = `SELECT COUNT(*) as total FROM ${type}_lottery ${whereClause}`;
      const countResult = await this.db.query(countQuery, params);
      const total = countResult[0]?.total || 0;
      
      // 计算分页
      const offset = (page - 1) * limit;
      const totalPages = Math.ceil(total / limit);
      
      // 查询数据
      const dataQuery = `
        SELECT * FROM ${type}_lottery 
        ${whereClause}
        ORDER BY lottery_no DESC 
        LIMIT ? OFFSET ?
      `;
      const data = await this.db.query(dataQuery, [...params, limit, offset]);
      
      return {
        success: true,
        data: data,
        page: page,
        limit: limit,
        total: total,
        totalPages: totalPages
      };
    } catch (error) {
      console.error('查询历史记录失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 构建号码查询条件
   * @param {string} type - 彩票类型
   * @param {string} numbers - 号码字符串，例如："01,02,08-06"
   */
  buildNumberConditions(type, numbers) {
    try {
      if (type === 'ssq') {
        // 双色球：红球-蓝球
        const parts = numbers.split('-');
        const conditions = [];
        const params = [];
        
        if (parts[0]) {
          const redBalls = parts[0].split(',').map(n => n.trim()).filter(n => n);
          if (redBalls.length > 0) {
            const redConditions = redBalls.map(ball => `red_balls LIKE ?`);
            conditions.push(`(${redConditions.join(' AND ')})`);
            redBalls.forEach(ball => params.push(`%${ball}%`));
          }
        }
        
        if (parts[1]) {
          const blueBall = parts[1].trim();
          if (blueBall) {
            conditions.push('blue_ball = ?');
            params.push(blueBall);
          }
        }
        
        return conditions.length > 0 ? {
          condition: conditions.join(' AND '),
          params: params
        } : null;
      } else if (type === 'dlt') {
        // 大乐透：前区-后区
        const parts = numbers.split('-');
        const conditions = [];
        const params = [];
        
        if (parts[0]) {
          const frontBalls = parts[0].split(',').map(n => n.trim()).filter(n => n);
          if (frontBalls.length > 0) {
            const frontConditions = frontBalls.map(ball => `front_balls LIKE ?`);
            conditions.push(`(${frontConditions.join(' AND ')})`);
            frontBalls.forEach(ball => params.push(`%${ball}%`));
          }
        }
        
        if (parts[1]) {
          const backBalls = parts[1].split(',').map(n => n.trim()).filter(n => n);
          if (backBalls.length > 0) {
            const backConditions = backBalls.map(ball => `back_balls LIKE ?`);
            conditions.push(`(${backConditions.join(' AND ')})`);
            backBalls.forEach(ball => params.push(`%${ball}%`));
          }
        }
        
        return conditions.length > 0 ? {
          condition: conditions.join(' AND '),
          params: params
        } : null;
      } else if (type === 'qxc') {
        // 七星彩：7位数字
        const nums = numbers.split(',').map(n => n.trim()).filter(n => n);
        if (nums.length > 0) {
          const conditions = nums.map(num => `numbers LIKE ?`);
          const params = nums.map(num => `%${num}%`);
          return {
            condition: conditions.join(' AND '),
            params: params
          };
        }
      } else if (type === 'qlc') {
        // 七乐彩：基本号-特别号
        const parts = numbers.split('-');
        const conditions = [];
        const params = [];
        
        if (parts[0]) {
          const basicBalls = parts[0].split(',').map(n => n.trim()).filter(n => n);
          if (basicBalls.length > 0) {
            const basicConditions = basicBalls.map(ball => `basic_balls LIKE ?`);
            conditions.push(`(${basicConditions.join(' AND ')})`);
            basicBalls.forEach(ball => params.push(`%${ball}%`));
          }
        }
        
        if (parts[1]) {
          const specialBall = parts[1].trim();
          if (specialBall) {
            conditions.push('special_ball = ?');
            params.push(specialBall);
          }
        }
        
        return conditions.length > 0 ? {
          condition: conditions.join(' AND '),
          params: params
        } : null;
      }
      
      return null;
    } catch (error) {
      console.error('构建号码查询条件失败:', error);
      return null;
    }
  }
}
