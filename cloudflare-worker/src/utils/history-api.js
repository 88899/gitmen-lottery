/**
 * 历史记录查询API
 */

export class HistoryAPI {
  constructor(db) {
    this.db = db; // D1 Database instance
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
      const countStmt = this.db.prepare(countQuery).bind(...params);
      const countResult = await countStmt.first();
      const total = countResult?.total || 0;
      
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
      const dataStmt = this.db.prepare(dataQuery).bind(...params, limit, offset);
      const dataResult = await dataStmt.all();
      
      // 转换数据格式
      const formattedData = this.formatData(type, dataResult.results || []);
      
      return {
        success: true,
        data: formattedData,
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
   * 格式化数据
   */
  formatData(type, rows) {
    if (type === 'ssq') {
      return rows.map(row => ({
        lottery_no: row.lottery_no,
        draw_date: row.draw_date,
        red_balls: [row.red1, row.red2, row.red3, row.red4, row.red5, row.red6],
        blue_ball: row.blue
      }));
    } else if (type === 'dlt') {
      return rows.map(row => ({
        lottery_no: row.lottery_no,
        draw_date: row.draw_date,
        front_balls: [row.front1, row.front2, row.front3, row.front4, row.front5],
        back_balls: [row.back1, row.back2]
      }));
    } else if (type === 'qxc') {
      return rows.map(row => ({
        lottery_no: row.lottery_no,
        draw_date: row.draw_date,
        numbers: [row.num1, row.num2, row.num3, row.num4, row.num5, row.num6, row.num7]
      }));
    } else if (type === 'qlc') {
      return rows.map(row => ({
        lottery_no: row.lottery_no,
        draw_date: row.draw_date,
        basic_balls: [row.basic1, row.basic2, row.basic3, row.basic4, row.basic5, row.basic6, row.basic7],
        special_ball: row.special
      }));
    }
    return rows;
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
            // 对于每个红球，检查是否在 red1-red6 中的任意一个
            redBalls.forEach(ball => {
              const redConditions = [];
              for (let i = 1; i <= 6; i++) {
                redConditions.push(`red${i} = ?`);
                params.push(ball);
              }
              conditions.push(`(${redConditions.join(' OR ')})`);
            });
          }
        }
        
        if (parts[1]) {
          const blueBall = parts[1].trim();
          if (blueBall) {
            conditions.push('blue = ?');
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
            frontBalls.forEach(ball => {
              const frontConditions = [];
              for (let i = 1; i <= 5; i++) {
                frontConditions.push(`front${i} = ?`);
                params.push(ball);
              }
              conditions.push(`(${frontConditions.join(' OR ')})`);
            });
          }
        }
        
        if (parts[1]) {
          const backBalls = parts[1].split(',').map(n => n.trim()).filter(n => n);
          if (backBalls.length > 0) {
            backBalls.forEach(ball => {
              const backConditions = [];
              for (let i = 1; i <= 2; i++) {
                backConditions.push(`back${i} = ?`);
                params.push(ball);
              }
              conditions.push(`(${backConditions.join(' OR ')})`);
            });
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
          const conditions = [];
          const params = [];
          
          nums.forEach(num => {
            const numConditions = [];
            for (let i = 1; i <= 7; i++) {
              numConditions.push(`num${i} = ?`);
              params.push(num);
            }
            conditions.push(`(${numConditions.join(' OR ')})`);
          });
          
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
            basicBalls.forEach(ball => {
              const basicConditions = [];
              for (let i = 1; i <= 7; i++) {
                basicConditions.push(`basic${i} = ?`);
                params.push(ball);
              }
              conditions.push(`(${basicConditions.join(' OR ')})`);
            });
          }
        }
        
        if (parts[1]) {
          const specialBall = parts[1].trim();
          if (specialBall) {
            conditions.push('special = ?');
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
