/**
 * 历史记录查询API
 */

export class HistoryAPI {
  constructor(db) {
    this.db = db; // D1 Database instance
  }

  /**
   * 查询历史记录（优化版：优先级查询）
   * @param {string} type - 彩票类型
   * @param {Object} filters - 查询条件
   * @param {number} page - 页码
   * @param {number} limit - 每页数量
   */
  async query(type, filters = {}, page = 1, limit = 10) {
    try {
      // 安全验证：彩票类型
      if (!['ssq', 'dlt', 'qxc', 'qlc'].includes(type)) {
        throw new Error('不支持的彩票类型');
      }
      
      // 安全验证：分页参数
      page = Math.max(1, Math.min(parseInt(page) || 1, 1000)); // 最多1000页
      limit = Math.max(1, Math.min(parseInt(limit) || 10, 100)); // 每页最多100条
      
      // 优先级查询：期号 > 号码 > 日期
      let whereClause = '';
      let params = [];
      
      // 优先级1：期号查询（精确匹配，直接返回）
      if (filters.lottery_no) {
        const lotteryNo = String(filters.lottery_no).trim();
        if (!/^[0-9]{7}$/.test(lotteryNo)) {
          throw new Error('期号格式错误');
        }
        whereClause = 'WHERE lottery_no = ?';
        params = [lotteryNo];
      }
      // 优先级2：号码查询（如果没有期号查询）
      else if (filters.numbers) {
        const numberConditions = this.buildNumberConditions(type, filters.numbers);
        if (numberConditions) {
          whereClause = `WHERE ${numberConditions.condition}`;
          params = numberConditions.params;
        }
      }
      // 优先级3：日期查询（如果没有期号和号码查询）
      else if (filters.draw_date) {
        const drawDate = String(filters.draw_date).trim();
        if (!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(drawDate)) {
          throw new Error('日期格式错误');
        }
        whereClause = 'WHERE draw_date = ?';
        params = [drawDate];
      }
      
      // 计算总数
      const countQuery = `SELECT COUNT(*) as total FROM ${type}_lottery ${whereClause}`;
      const countStmt = this.db.prepare(countQuery).bind(...params);
      const countResult = await countStmt.first();
      const total = countResult?.total || 0;
      
      // 如果没有数据，直接返回
      if (total === 0) {
        return {
          success: true,
          data: [],
          page: page,
          limit: limit,
          total: 0,
          totalPages: 0
        };
      }
      
      // 计算分页
      const offset = (page - 1) * limit;
      const totalPages = Math.ceil(total / limit);
      
      // 验证页码是否超出范围
      if (page > totalPages) {
        return {
          success: true,
          data: [],
          page: page,
          limit: limit,
          total: total,
          totalPages: totalPages
        };
      }
      
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
   * 构建号码查询条件（优化版）
   * @param {string} type - 彩票类型
   * @param {string} numbers - 号码字符串，例如："01,02,08-06" 或 "01"（只查红球）或 "-06"（只查蓝球）
   */
  buildNumberConditions(type, numbers) {
    try {
      // 安全验证：输入长度限制
      if (!numbers || numbers.length > 100) {
        return null;
      }
      
      const numbersStr = String(numbers).trim();
      
      if (type === 'ssq') {
        // 双色球：红球-蓝球
        const parts = numbersStr.split('-');
        const conditions = [];
        const params = [];
        
        // 红球查询
        if (parts[0] && parts[0].length > 0) {
          const redBalls = parts[0].split(',').map(n => n.trim()).filter(n => n);
          // 安全验证：红球数量限制
          if (redBalls.length > 6) {
            throw new Error('红球数量不能超过6个');
          }
          
          redBalls.forEach(ball => {
            // 安全验证：红球范围
            if (!/^[0-9]{1,2}$/.test(ball) || parseInt(ball) < 1 || parseInt(ball) > 33) {
              throw new Error('红球号码无效');
            }
            const paddedBall = ball.padStart(2, '0');
            const redConditions = [];
            for (let i = 1; i <= 6; i++) {
              redConditions.push(`red${i} = ?`);
              params.push(paddedBall);
            }
            conditions.push(`(${redConditions.join(' OR ')})`);
          });
        }
        
        // 蓝球查询
        if (parts.length > 1 && parts[1] && parts[1].length > 0) {
          const blueBalls = parts[1].split(',').map(n => n.trim()).filter(n => n);
          blueBalls.forEach(blueBall => {
            // 安全验证：蓝球范围
            if (!/^[0-9]{1,2}$/.test(blueBall) || parseInt(blueBall) < 1 || parseInt(blueBall) > 16) {
              throw new Error('蓝球号码无效');
            }
            const paddedBall = blueBall.padStart(2, '0');
            conditions.push('blue = ?');
            params.push(paddedBall);
          });
        }
        
        return conditions.length > 0 ? {
          condition: conditions.join(' AND '),
          params: params
        } : null;
      } else if (type === 'dlt') {
        // 大乐透：前区-后区
        const parts = numbersStr.split('-');
        const conditions = [];
        const params = [];
        
        // 前区查询
        if (parts[0] && parts[0].length > 0) {
          const frontBalls = parts[0].split(',').map(n => n.trim()).filter(n => n);
          // 安全验证：前区数量限制
          if (frontBalls.length > 5) {
            throw new Error('前区号码不能超过5个');
          }
          
          frontBalls.forEach(ball => {
            // 安全验证：前区范围
            if (!/^[0-9]{1,2}$/.test(ball) || parseInt(ball) < 1 || parseInt(ball) > 35) {
              throw new Error('前区号码无效');
            }
            const paddedBall = ball.padStart(2, '0');
            const frontConditions = [];
            for (let i = 1; i <= 5; i++) {
              frontConditions.push(`front${i} = ?`);
              params.push(paddedBall);
            }
            conditions.push(`(${frontConditions.join(' OR ')})`);
          });
        }
        
        // 后区查询
        if (parts.length > 1 && parts[1] && parts[1].length > 0) {
          const backBalls = parts[1].split(',').map(n => n.trim()).filter(n => n);
          // 安全验证：后区数量限制
          if (backBalls.length > 2) {
            throw new Error('后区号码不能超过2个');
          }
          
          backBalls.forEach(ball => {
            // 安全验证：后区范围
            if (!/^[0-9]{1,2}$/.test(ball) || parseInt(ball) < 1 || parseInt(ball) > 12) {
              throw new Error('后区号码无效');
            }
            const paddedBall = ball.padStart(2, '0');
            const backConditions = [];
            for (let i = 1; i <= 2; i++) {
              backConditions.push(`back${i} = ?`);
              params.push(paddedBall);
            }
            conditions.push(`(${backConditions.join(' OR ')})`);
          });
        }
        
        return conditions.length > 0 ? {
          condition: conditions.join(' AND '),
          params: params
        } : null;
      } else if (type === 'qxc') {
        // 七星彩：7位数字
        const nums = numbersStr.split(',').map(n => n.trim()).filter(n => n);
        // 安全验证：数量限制
        if (nums.length > 7) {
          throw new Error('号码数量不能超过7个');
        }
        
        if (nums.length > 0) {
          const conditions = [];
          const params = [];
          
          nums.forEach(num => {
            // 安全验证：号码范围
            if (!/^[0-9]$/.test(num)) {
              throw new Error('号码无效');
            }
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
        const parts = numbersStr.split('-');
        const conditions = [];
        const params = [];
        
        // 基本号查询
        if (parts[0] && parts[0].length > 0) {
          const basicBalls = parts[0].split(',').map(n => n.trim()).filter(n => n);
          // 安全验证：基本号数量限制
          if (basicBalls.length > 7) {
            throw new Error('基本号数量不能超过7个');
          }
          
          basicBalls.forEach(ball => {
            // 安全验证：基本号范围
            if (!/^[0-9]{1,2}$/.test(ball) || parseInt(ball) < 1 || parseInt(ball) > 30) {
              throw new Error('基本号号码无效');
            }
            const paddedBall = ball.padStart(2, '0');
            const basicConditions = [];
            for (let i = 1; i <= 7; i++) {
              basicConditions.push(`basic${i} = ?`);
              params.push(paddedBall);
            }
            conditions.push(`(${basicConditions.join(' OR ')})`);
          });
        }
        
        // 特别号查询
        if (parts.length > 1 && parts[1] && parts[1].length > 0) {
          const specialBalls = parts[1].split(',').map(n => n.trim()).filter(n => n);
          specialBalls.forEach(specialBall => {
            // 安全验证：特别号范围
            if (!/^[0-9]{1,2}$/.test(specialBall) || parseInt(specialBall) < 1 || parseInt(specialBall) > 30) {
              throw new Error('特别号号码无效');
            }
            const paddedBall = specialBall.padStart(2, '0');
            conditions.push('special = ?');
            params.push(paddedBall);
          });
        }
        
        return conditions.length > 0 ? {
          condition: conditions.join(' AND '),
          params: params
        } : null;
      }
      
      return null;
    } catch (error) {
      console.error('构建号码查询条件失败:', error);
      throw error; // 抛出错误以便前端显示
    }
  }
}
