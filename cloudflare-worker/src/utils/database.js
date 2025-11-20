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

      // 创建七星彩表
      await this.db.prepare(`
        CREATE TABLE IF NOT EXISTS qxc_lottery (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          lottery_no TEXT UNIQUE NOT NULL,
          draw_date TEXT NOT NULL,
          num1 TEXT NOT NULL,
          num2 TEXT NOT NULL,
          num3 TEXT NOT NULL,
          num4 TEXT NOT NULL,
          num5 TEXT NOT NULL,
          num6 TEXT NOT NULL,
          num7 TEXT NOT NULL,
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

      // 创建七星彩索引
      await this.db.prepare(`
        CREATE INDEX IF NOT EXISTS idx_qxc_lottery_no ON qxc_lottery(lottery_no)
      `).run();
      
      await this.db.prepare(`
        CREATE INDEX IF NOT EXISTS idx_qxc_draw_date ON qxc_lottery(draw_date)
      `).run();
      
      await this.db.prepare(`
        CREATE INDEX IF NOT EXISTS idx_qxc_sorted_code ON qxc_lottery(sorted_code)
      `).run();

      // 创建七乐彩表
      await this.db.prepare(`
        CREATE TABLE IF NOT EXISTS qlc_lottery (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          lottery_no TEXT UNIQUE NOT NULL,
          draw_date TEXT NOT NULL,
          basic1 TEXT NOT NULL,
          basic2 TEXT NOT NULL,
          basic3 TEXT NOT NULL,
          basic4 TEXT NOT NULL,
          basic5 TEXT NOT NULL,
          basic6 TEXT NOT NULL,
          basic7 TEXT NOT NULL,
          special TEXT NOT NULL,
          sorted_code TEXT NOT NULL,
          created_at TEXT DEFAULT (datetime('now')),
          updated_at TEXT DEFAULT (datetime('now'))
        )
      `).run();

      // 创建七乐彩索引
      await this.db.prepare(`
        CREATE INDEX IF NOT EXISTS idx_qlc_lottery_no ON qlc_lottery(lottery_no)
      `).run();
      
      await this.db.prepare(`
        CREATE INDEX IF NOT EXISTS idx_qlc_draw_date ON qlc_lottery(draw_date)
      `).run();
      
      await this.db.prepare(`
        CREATE INDEX IF NOT EXISTS idx_qlc_sorted_code ON qlc_lottery(sorted_code)
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
    } else if (table === 'qxc') {
      const sql = `
        INSERT INTO ${table}_lottery 
        (lottery_no, draw_date, num1, num2, num3, num4, num5, num6, num7, sorted_code)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(lottery_no) DO UPDATE SET updated_at = datetime('now')
      `;

      await this.db
        .prepare(sql)
        .bind(
          data.lottery_no,
          data.draw_date,
          data.num1,
          data.num2,
          data.num3,
          data.num4,
          data.num5,
          data.num6,
          data.num7,
          data.sorted_code
        )
        .run();
    } else if (table === 'qlc') {
      const sql = `
        INSERT INTO ${table}_lottery 
        (lottery_no, draw_date, basic1, basic2, basic3, basic4, basic5, basic6, basic7, special, sorted_code)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(lottery_no) DO UPDATE SET updated_at = datetime('now')
      `;

      await this.db
        .prepare(sql)
        .bind(
          data.lottery_no,
          data.draw_date,
          data.basic1,
          data.basic2,
          data.basic3,
          data.basic4,
          data.basic5,
          data.basic6,
          data.basic7,
          data.special,
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
    } else if (table === 'qxc') {
      return {
        lottery_no: result.lottery_no,
        draw_date: result.draw_date,
        numbers: [result.num1, result.num2, result.num3, result.num4, result.num5, result.num6, result.num7],
        sorted_code: result.sorted_code
      };
    } else if (table === 'qlc') {
      return {
        lottery_no: result.lottery_no,
        draw_date: result.draw_date,
        basic_balls: [result.basic1, result.basic2, result.basic3, result.basic4, result.basic5, result.basic6, result.basic7],
        special_ball: result.special,
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
    } else if (table === 'qxc') {
      return {
        lottery_no: result.lottery_no,
        draw_date: result.draw_date,
        numbers: [result.num1, result.num2, result.num3, result.num4, result.num5, result.num6, result.num7],
        sorted_code: result.sorted_code
      };
    } else if (table === 'qlc') {
      return {
        lottery_no: result.lottery_no,
        draw_date: result.draw_date,
        basic_balls: [result.basic1, result.basic2, result.basic3, result.basic4, result.basic5, result.basic6, result.basic7],
        special_ball: result.special,
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
    } else if (table === 'qxc') {
      return results.results.map(row => ({
        lottery_no: row.lottery_no,
        draw_date: row.draw_date,
        numbers: [row.num1, row.num2, row.num3, row.num4, row.num5, row.num6, row.num7],
        sorted_code: row.sorted_code
      }));
    } else if (table === 'qlc') {
      return results.results.map(row => ({
        lottery_no: row.lottery_no,
        draw_date: row.draw_date,
        basic_balls: [row.basic1, row.basic2, row.basic3, row.basic4, row.basic5, row.basic6, row.basic7],
        special_ball: row.special,
        sorted_code: row.sorted_code
      }));
    }
  }

  /**
   * 获取号码频率统计
   * 优化：只查询最近 100 条数据（免费计划优化）
   */
  async getFrequency(table) {
    if (table === 'ssq') {
      const results = await this.db
        .prepare(`SELECT red1, red2, red3, red4, red5, red6, blue FROM ${table}_lottery ORDER BY id DESC LIMIT 100`)
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
        .prepare(`SELECT front1, front2, front3, front4, front5, back1, back2 FROM ${table}_lottery ORDER BY id DESC LIMIT 100`)
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
    } else if (table === 'qxc') {
      const results = await this.db
        .prepare(`SELECT num1, num2, num3, num4, num5, num6, num7 FROM ${table}_lottery ORDER BY id DESC LIMIT 100`)
        .all();

      const numberFreq = {};

      if (!results || !results.results || results.results.length === 0) {
        return { numbers: {} };
      }

      for (const row of results.results) {
        for (let i = 1; i <= 7; i++) {
          const ball = row[`num${i}`];
          if (ball !== null && ball !== undefined) {
            numberFreq[ball] = (numberFreq[ball] || 0) + 1;
          }
        }
      }

      return { numbers: numberFreq };
    } else if (table === 'qlc') {
      const results = await this.db
        .prepare(`SELECT basic1, basic2, basic3, basic4, basic5, basic6, basic7, special FROM ${table}_lottery ORDER BY id DESC LIMIT 100`)
        .all();

      const basicFreq = {};
      const specialFreq = {};

      if (!results || !results.results || results.results.length === 0) {
        return { basic: {}, special: {} };
      }

      for (const row of results.results) {
        for (let i = 1; i <= 7; i++) {
          const ball = row[`basic${i}`];
          if (ball !== null && ball !== undefined) {
            basicFreq[ball] = (basicFreq[ball] || 0) + 1;
          }
        }
        if (row.special !== null && row.special !== undefined) {
          specialFreq[row.special] = (specialFreq[row.special] || 0) + 1;
        }
      }

      return { basic: basicFreq, special: specialFreq };
    }

    // 未知类型，返回空对象
    return {};
  }

  /**
   * 获取历史中奖组合（用于去重）
   * 优化：只查询最近 50 条数据（免费计划优化）
   */
  async getHistoricalCombinations(table) {
    const results = await this.db
      .prepare(`SELECT sorted_code FROM ${table}_lottery ORDER BY id DESC LIMIT 50`)
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
