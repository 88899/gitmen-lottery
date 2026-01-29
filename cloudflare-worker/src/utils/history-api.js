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
   * 构建号码查询条件（优化版 - 使用 sorted_code）
   * @param {string} type - 彩票类型
   * @param {string} numbers - 号码字符串
   *   - 双色球："02,06,08,12,22,31-22" 或 "08"（查询包含该号码）
   *   - 大乐透："01,02,03,04,05-06,07" 或 "08"（查询包含该号码）
   *   - 七星彩："8,5,5,8,5,1,1"（用户输入位置顺序，需要转换为排序后的格式）
   *   - 七乐彩："04,14,19,22,26,29,30-11" 或 "08"（查询包含该号码）
   */
  buildNumberConditions(type, numbers) {
    try {
      // 安全验证：输入长度限制
      if (!numbers || numbers.length > 100) {
        return null;
      }
      
      const numbersStr = String(numbers).trim();
      
      // 检查是否是完整的号码组合（包含分隔符 - 或逗号）
      const hasFullFormat = numbersStr.includes(',') || numbersStr.includes('-');
      
      if (hasFullFormat) {
        // 完整号码组合：直接使用 sorted_code 精确匹配
        // 需要对输入进行格式化处理
        let formattedCode = '';
        
        if (type === 'ssq') {
          // 双色球：红球需要排序，格式：02,06,08,12,22,31-03
          const parts = numbersStr.split('-');
          if (parts[0]) {
            const redBalls = parts[0].split(',').map(n => n.trim().padStart(2, '0')).filter(n => n);
            redBalls.sort();
            formattedCode = redBalls.join(',');
          }
          if (parts.length > 1 && parts[1]) {
            const blueBall = parts[1].trim().padStart(2, '0');
            formattedCode += '-' + blueBall;
          }
        } else if (type === 'dlt') {
          // 大乐透：前区和后区都需要排序，格式：01,02,03,04,05-06,07
          const parts = numbersStr.split('-');
          if (parts[0]) {
            const frontBalls = parts[0].split(',').map(n => n.trim().padStart(2, '0')).filter(n => n);
            frontBalls.sort();
            formattedCode = frontBalls.join(',');
          }
          if (parts.length > 1 && parts[1]) {
            const backBalls = parts[1].split(',').map(n => n.trim().padStart(2, '0')).filter(n => n);
            backBalls.sort();
            formattedCode += '-' + backBalls.join(',');
          }
        } else if (type === 'qxc') {
          // 七星彩：用户输入位置顺序（如 8,5,5,8,5,1,1），需要排序并补零
          // 数据库存储格式：01,01,05,05,08,08,08（排序后补零）
          const nums = numbersStr.split(',').map(n => parseInt(n.trim())).filter(n => !isNaN(n));
          if (nums.length === 7) {
            // 排序并补零
            const sortedNums = [...nums].sort((a, b) => a - b);
            formattedCode = sortedNums.map(n => String(n).padStart(2, '0')).join(',');
          }
        } else if (type === 'qlc') {
          // 七乐彩：基本号需要排序，格式：01,02,03,04,05,06,07-08
          const parts = numbersStr.split('-');
          if (parts[0]) {
            const basicBalls = parts[0].split(',').map(n => n.trim().padStart(2, '0')).filter(n => n);
            basicBalls.sort();
            formattedCode = basicBalls.join(',');
          }
          if (parts.length > 1 && parts[1]) {
            const specialBall = parts[1].trim().padStart(2, '0');
            formattedCode += '-' + specialBall;
          }
        }
        
        // 使用 sorted_code 精确匹配
        return {
          condition: 'sorted_code = ?',
          params: [formattedCode]
        };
      } else {
        // 单个号码：使用 LIKE 模糊匹配
        let searchPattern = '';
        
        if (type === 'ssq' || type === 'dlt' || type === 'qlc' || type === 'qxc') {
          // 所有类型都需要补零到两位（因为数据库中都是补零存储的）
          searchPattern = numbersStr.padStart(2, '0');
        }
        
        // 使用 LIKE 查询包含该号码的记录
        return {
          condition: 'sorted_code LIKE ?',
          params: [`%${searchPattern}%`]
        };
      }
      
    } catch (error) {
      console.error('构建号码查询条件失败:', error);
      throw error;
    }
  }
}
