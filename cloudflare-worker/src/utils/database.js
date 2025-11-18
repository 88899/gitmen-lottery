/**
 * 数据库操作工具 - D1 数据库
 */

export class Database {
  constructor(db) {
    this.db = db;
  }

  /**
   * 初始化数据库表
   */
  async init() {
    try {
      // 创建双色球表
      await this.db.prepare(`
        CREATE TABLE IF NOT EXISTS ssq_lottery (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          lottery_no TEXT UNIQUE NOT NULL,
          draw_date TEXT NOT NULL,
          red1 TEXT NOT NULL,
          red2 TEXT NOT NULL,
          red3 TEXT NOT NULL,
          red4 TEXT NOT NULL,
          red5 TEXT NOT NULL,
          red6 TEXT NOT NULL,
          blue TEXT NOT NULL,
          sorted_code TEXT NOT NULL,
          created_at TEXT DEFAULT (datetime('now')),
          updated_at TEXT DEFAULT (datetime('now'))
        )
      `).run();

      // 创建大乐透表
      await this.db.prepare(`
        CREATE TABLE IF NOT EXISTS dlt_lottery (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          lottery_no TEXT UNIQUE NOT NULL,
          draw_date TEXT NOT NULL,
          front1 TEXT NOT NULL,
          front2 TEXT NOT NULL,
          front3 TEXT NOT NULL,
          front4 TEXT NOT NULL,
          front5 TEXT NOT NULL,
          back1 TEXT NOT NULL,
          back2 TEXT NOT NULL,
          sorted_code TEXT NOT NULL,
          created_at TEXT DEFAULT (datetime('now')),
          updated_at TEXT DEFAULT (datetime('now'))
        )
      `).run();

      // 创建双色球索引
      await this.db.prepare(`
        CREATE INDEX IF NOT EXISTS idx_ssq_lottery_no ON ssq_lottery(lottery_no)
      `).run();
      
      await this.db.prepare(`
        CREATE INDEX IF NOT EXISTS idx_ssq_draw_date ON ssq_lottery(draw_date)
      `).run();
      
      await this.db.prepare(`
        CREATE INDEX IF NOT EXISTS idx_ssq_sorted_code ON ssq_lottery(sorted_code)
      `).run();

      // 创建大乐透索引
      await this.db.prepare(`
        CREATE INDEX IF NOT EXISTS idx_dlt_lottery_no ON dlt_lottery(lottery_no)
      `).run();
      
      await this.db.prepare(`
        CREATE INDEX IF NOT EXISTS idx_dlt_draw_date ON dlt_lottery(draw_date)
      `).run();
      
      await this.db.prepare(`
        CREATE INDEX IF NOT EXISTS idx_dlt_sorted_code ON dlt_lottery(sorted_code)
      `).run();

      console.log('数据库初始化完成');
    } catch (error) {
      console.error('数据库初始化失败:', error);
      // 如果表已存在，忽略错误
      if (!error.message.includes('already exists')) {
        throw error;
      }
    }
  }

  /**
   * 检查期号是否存在
   */
  async checkExists(table, lotteryNo) {
    if (!lotteryNo) {
      return false;
    }

    const result = await this.db
      .prepare(`SELECT COUNT(*) as count FROM ${table}_lottery WHERE lottery_no = ?`)
      .bind(lotteryNo)
      .first();
    
    return result && result.count > 0;
  }

  /**
   * 插入数据
   */
  async insert(table, data) {
    if (table === 'ssq') {
      const sql = `
        INSERT INTO ${table}_lottery 
        (lottery_no, draw_date, red1, red2, red3, red4, red5, red6, blue, sorted_code)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(lottery_no) DO UPDATE SET updated_at = datetime('now')
      `;

      await this.db
        .prepare(sql)
        .bind(
          data.lottery_no,
          data.draw_date,
          data.red1,
          data.red2,
          data.red3,
          data.red4,
          data.red5,
          data.red6,
          data.blue,
          data.sorted_code
        )
        .run();
    } else if (table === 'dlt') {
      const sql = `
        INSERT INTO ${table}_lottery 
        (lottery_no, draw_date, front1, front2, front3, front4, front5, back1, back2, sorted_code)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(lottery_no) DO UPDATE SET updated_at = datetime('now')
      `;

      await this.db
        .prepare(sql)
        .bind(
          data.lottery_no,
          data.draw_date,
          data.front1,
          data.front2,
          data.front3,
          data.front4,
          data.front5,
          data.back1,
          data.back2,
          data.sorted_code
        )
        .run();
    }

    console.log(`数据已插入: ${data.lottery_no}`);
  }

  /**
   * 批量插入数据
   * 注意：入库前会按期号从小到大排序，确保 ID 和期号都是递增的
   */
  async batchInsert(table, dataList) {
    // 检查输入
    if (!dataList || !Array.isArray(dataList) || dataList.length === 0) {
      console.log('批量插入: 数据列表为空');
      return { inserted: 0, skipped: 0 };
    }

    let inserted = 0;
    let skipped = 0;

    // 按期号从小到大排序
    const sortedDataList = [...dataList].sort((a, b) => {
      return a.lottery_no.localeCompare(b.lottery_no);
    });

    for (const data of sortedDataList) {
      try {
        // 验证数据完整性
        if (!data || !data.lottery_no) {
          console.error('数据不完整，跳过:', data);
          skipped++;
          continue;
        }

        const exists = await this.checkExists(table, data.lottery_no);
        if (!exists) {
          await this.insert(table, data);
          inserted++;
        } else {
          skipped++;
        }
      } catch (error) {
        console.error(`插入数据失败 ${data.lottery_no}:`, error);
        skipped++;
      }
    }

    console.log(`批量插入完成: 新增 ${inserted} 条，跳过 ${skipped} 条`);
    return { inserted, skipped };
  }

  /**
   * 获取最新数据
   */
  async getLatest(table) {
    const result = await this.db
      .prepare(`
        SELECT * FROM ${table}_lottery 
        ORDER BY draw_date DESC, lottery_no DESC 
        LIMIT 1
      `)
      .first();

    if (!result) return null;

    if (table === 'ssq') {
      return {
        lottery_no: result.lottery_no,
        draw_date: result.draw_date,
        red_balls: [result.red1, result.red2, result.red3, result.red4, result.red5, result.red6],
        blue_ball: result.blue,
        sorted_code: result.sorted_code
      };
    } else if (table === 'dlt') {
      return {
        lottery_no: result.lottery_no,
        draw_date: result.draw_date,
        front_balls: [result.front1, result.front2, result.front3, result.front4, result.front5],
        back_balls: [result.back1, result.back2],
        sorted_code: result.sorted_code
      };
    }
  }

  /**
   * 获取最旧数据（按开奖日期排序，而不是期号）
   */
  async getOldest(table) {
    const result = await this.db
      .prepare(`
        SELECT * FROM ${table}_lottery 
        ORDER BY draw_date ASC, lottery_no ASC 
        LIMIT 1
      `)
      .first();

    if (!result) return null;

    if (table === 'ssq') {
      return {
        lottery_no: result.lottery_no,
        draw_date: result.draw_date,
        red_balls: [result.red1, result.red2, result.red3, result.red4, result.red5, result.red6],
        blue_ball: result.blue,
        sorted_code: result.sorted_code
      };
    } else if (table === 'dlt') {
      return {
        lottery_no: result.lottery_no,
        draw_date: result.draw_date,
        front_balls: [result.front1, result.front2, result.front3, result.front4, result.front5],
        back_balls: [result.back1, result.back2],
        sorted_code: result.sorted_code
      };
    }
  }

  /**
   * 获取所有数据
   */
  async getAll(table, limit = 1000) {
    const results = await this.db
      .prepare(`
        SELECT * FROM ${table}_lottery 
        ORDER BY draw_date DESC, lottery_no DESC 
        LIMIT ?
      `)
      .bind(limit)
      .all();

    if (table === 'ssq') {
      return results.results.map(row => ({
        lottery_no: row.lottery_no,
        draw_date: row.draw_date,
        red_balls: [row.red1, row.red2, row.red3, row.red4, row.red5, row.red6],
        blue_ball: row.blue,
        sorted_code: row.sorted_code
      }));
    } else if (table === 'dlt') {
      return results.results.map(row => ({
        lottery_no: row.lottery_no,
        draw_date: row.draw_date,
        front_balls: [row.front1, row.front2, row.front3, row.front4, row.front5],
        back_balls: [row.back1, row.back2],
        sorted_code: row.sorted_code
      }));
    }
  }

  /**
   * 获取号码频率统计
   */
  async getFrequency(table) {
    if (table === 'ssq') {
      const results = await this.db
        .prepare(`SELECT red1, red2, red3, red4, red5, red6, blue FROM ${table}_lottery`)
        .all();

      const redFreq = {};
      const blueFreq = {};

      // 检查是否有数据
      if (!results || !results.results || results.results.length === 0) {
        return {
          red: {},
          blue: {}
        };
      }

      for (const row of results.results) {
        // 统计红球
        for (let i = 1; i <= 6; i++) {
          const ball = row[`red${i}`];
          if (ball) {
            redFreq[ball] = (redFreq[ball] || 0) + 1;
          }
        }
        // 统计蓝球
        if (row.blue) {
          blueFreq[row.blue] = (blueFreq[row.blue] || 0) + 1;
        }
      }

      return {
        red: redFreq,
        blue: blueFreq
      };
    } else if (table === 'dlt') {
      const results = await this.db
        .prepare(`SELECT front1, front2, front3, front4, front5, back1, back2 FROM ${table}_lottery`)
        .all();

      const frontFreq = {};
      const backFreq = {};

      // 检查是否有数据
      if (!results || !results.results || results.results.length === 0) {
        return {
          front: {},
          back: {}
        };
      }

      for (const row of results.results) {
        // 统计前区
        for (let i = 1; i <= 5; i++) {
          const ball = row[`front${i}`];
          if (ball) {
            frontFreq[ball] = (frontFreq[ball] || 0) + 1;
          }
        }
        // 统计后区
        for (let i = 1; i <= 2; i++) {
          const ball = row[`back${i}`];
          if (ball) {
            backFreq[ball] = (backFreq[ball] || 0) + 1;
          }
        }
      }

      return {
        front: frontFreq,
        back: backFreq
      };
    }

    // 未知类型，返回空对象
    return {};
  }

  /**
   * 获取历史中奖组合（用于去重）
   */
  async getHistoricalCombinations(table) {
    const results = await this.db
      .prepare(`SELECT sorted_code FROM ${table}_lottery`)
      .all();

    return new Set(results.results.map(row => row.sorted_code));
  }

  /**
   * 获取数据总数
   */
  async getCount(table) {
    const result = await this.db
      .prepare(`SELECT COUNT(*) as count FROM ${table}_lottery`)
      .first();

    return result ? (result.count || 0) : 0;
  }
}
