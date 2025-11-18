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
      // 创建表
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

      // 创建索引
      await this.db.prepare(`
        CREATE INDEX IF NOT EXISTS idx_lottery_no ON ssq_lottery(lottery_no)
      `).run();
      
      await this.db.prepare(`
        CREATE INDEX IF NOT EXISTS idx_draw_date ON ssq_lottery(draw_date)
      `).run();
      
      await this.db.prepare(`
        CREATE INDEX IF NOT EXISTS idx_sorted_code ON ssq_lottery(sorted_code)
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
    const result = await this.db
      .prepare(`SELECT COUNT(*) as count FROM ${table}_lottery WHERE lottery_no = ?`)
      .bind(lotteryNo)
      .first();
    
    return result.count > 0;
  }

  /**
   * 插入数据
   */
  async insert(table, data) {
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

    console.log(`数据已插入: ${data.lottery_no}`);
  }

  /**
   * 批量插入数据
   * 注意：入库前会按期号从小到大排序，确保 ID 和期号都是递增的
   */
  async batchInsert(table, dataList) {
    let inserted = 0;
    let skipped = 0;

    // 按期号从小到大排序
    const sortedDataList = [...dataList].sort((a, b) => {
      return a.lottery_no.localeCompare(b.lottery_no);
    });

    for (const data of sortedDataList) {
      try {
        const exists = await this.checkExists(table, data.lottery_no);
        if (!exists) {
          await this.insert(table, data);
          inserted++;
        } else {
          skipped++;
        }
      } catch (error) {
        console.error(`插入数据失败 ${data.lottery_no}:`, error);
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

    return {
      lottery_no: result.lottery_no,
      draw_date: result.draw_date,
      red_balls: [result.red1, result.red2, result.red3, result.red4, result.red5, result.red6],
      blue_ball: result.blue,
      sorted_code: result.sorted_code
    };
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

    return {
      lottery_no: result.lottery_no,
      draw_date: result.draw_date,
      red_balls: [result.red1, result.red2, result.red3, result.red4, result.red5, result.red6],
      blue_ball: result.blue,
      sorted_code: result.sorted_code
    };
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

    return results.results.map(row => ({
      lottery_no: row.lottery_no,
      draw_date: row.draw_date,
      red_balls: [row.red1, row.red2, row.red3, row.red4, row.red5, row.red6],
      blue_ball: row.blue,
      sorted_code: row.sorted_code
    }));
  }

  /**
   * 获取号码频率统计
   */
  async getFrequency(table) {
    const results = await this.db
      .prepare(`SELECT red1, red2, red3, red4, red5, red6, blue FROM ${table}_lottery`)
      .all();

    const redFreq = {};
    const blueFreq = {};

    for (const row of results.results) {
      // 统计红球
      for (let i = 1; i <= 6; i++) {
        const ball = row[`red${i}`];
        redFreq[ball] = (redFreq[ball] || 0) + 1;
      }
      // 统计蓝球
      blueFreq[row.blue] = (blueFreq[row.blue] || 0) + 1;
    }

    // 排序
    const sortedRed = Object.entries(redFreq)
      .sort((a, b) => b[1] - a[1])
      .map(([ball, count]) => ({ ball, count }));

    const sortedBlue = Object.entries(blueFreq)
      .sort((a, b) => b[1] - a[1])
      .map(([ball, count]) => ({ ball, count }));

    return {
      red: sortedRed,
      blue: sortedBlue
    };
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

    return result.count;
  }
}
