/**
 * 大乐透爬虫 - Cloudflare Worker 版本
 * 数据源：500.com
 */

export class DLTSpider {
  constructor() {
    // 500.com 数据源
    this.backup500Url = 'https://datachart.500.com/dlt/history/newinc/history.php';
    
    this.headers = {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Referer': 'https://www.500.com/',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
    };
    this.minDelay = 500;
    this.maxDelay = 2000;
    this.lastRequestTime = 0;
  }

  /**
   * 随机延迟
   */
  async randomDelay() {
    const now = Date.now();
    const elapsed = now - this.lastRequestTime;
    
    if (elapsed < this.minDelay) {
      await this.sleep(this.minDelay - elapsed);
    }
    
    const extraDelay = Math.random() * (this.maxDelay - this.minDelay);
    if (extraDelay > 0) {
      await this.sleep(extraDelay);
    }
    
    this.lastRequestTime = Date.now();
  }

  /**
   * 延迟函数
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 获取最新一期数据
   */
  async fetchLatest() {
    return await this.fetchLatestFrom500();
  }

  /**
   * 从 500.com 获取最新数据
   */
  async fetchLatestFrom500() {
    await this.randomDelay();
    
    // 500.com 不带参数返回最近30期数据
    const url = this.backup500Url;
    
    console.log('从 500.com 获取大乐透最新数据...');
    
    const response = await fetch(url, {
      headers: this.headers
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const html = await response.text();
    
    // 解析 HTML 获取最新一期数据
    const data = this.parse500Html(html);
    
    if (!data || data.length === 0) {
      throw new Error('500.com 未返回数据');
    }
    
    console.log(`从 500.com 获取到 ${data.length} 条数据`);
    
    // 返回最新一期（第一条）
    return data[0];
  }

  /**
   * 从 500.com 按期号范围获取数据
   * @param {string} startIssue - 开始期号（5位格式，如 '07001'）
   * @param {string} endIssue - 结束期号（5位格式，如 '07200'）
   */
  async fetch500comByRange(startIssue, endIssue) {
    await this.randomDelay();
    
    const url = `${this.backup500Url}?start=${startIssue}&end=${endIssue}`;
    
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`📊 数据源: 500.com (大乐透)`);
    console.log(`🔗 查询: start=${startIssue}, end=${endIssue}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    
    const response = await fetch(url, {
      headers: this.headers
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const html = await response.text();
    
    // 解析 HTML
    const data = this.parse500Html(html);
    
    return data;
  }

  /**
   * 获取全量历史数据
   * @param {number} batchSize - 每批次获取的期数（默认 200）
   * @param {string} startIssue - 起始期号（可选），格式如 "2025131"（7位）
   */
  async fetchAll(batchSize = 200, startIssue = null) {
    console.log(`开始从 500.com 获取大乐透数据，每批 ${batchSize} 期${startIssue ? `，从期号 ${startIssue} 往前` : ''}...`);
    
    await this.randomDelay();
    
    let endIssue500; // 5位格式
    let startIssue500; // 5位格式
    
    if (startIssue) {
      // 如果指定了起始期号（7位格式，如 2025001）
      const year = parseInt(startIssue.substring(0, 4));
      const yearPrefix = startIssue.substring(2, 4);
      const issueNum = parseInt(startIssue.substring(4));
      
      // 往前一期
      let endNum = issueNum - 1;
      let endYear = year;
      let endYearPrefix = yearPrefix;
      
      if (endNum < 1) {
        // 跨年：从上一年开始
        endYear = year - 1;
        endYearPrefix = endYear.toString().substring(2);
        endNum = 153; // 假设每年最多 153 期
        
        console.log(`跨年：从 ${year} 年第 1 期往前到 ${endYear} 年`);
        
        // 检查是否已经到达大乐透开始年份（2007年）
        if (endYear < 2007) {
          console.log(`已到达大乐透开始年份（2007年），无法继续往前`);
          return {
            success: false,
            message: '未获取到数据',
            source: '500.com',
            params: {
              startIssue: startIssue,
              endYear: endYear,
              reason: '已到达大乐透开始年份（2007年）'
            },
            total: 0
          };
        }
      }
      
      endIssue500 = endYearPrefix + endNum.toString().padStart(3, '0');
      
      // 计算开始期号（往前推 batchSize 期）
      let startNum = endNum - batchSize + 1;
      if (startNum < 1) startNum = 1;
      
      startIssue500 = endYearPrefix + startNum.toString().padStart(3, '0');
      
      console.log(`从数据库最旧期号 ${startIssue} 往前，查询 ${startIssue500} - ${endIssue500}`);
    } else {
      // 如果没有指定，获取最新期号
      const latestData = await this.fetchLatestFrom500();
      const latestIssue = latestData.lottery_no;
      endIssue500 = latestIssue.substring(2);
      const yearPrefix = endIssue500.substring(0, 2);
      const endNum = parseInt(endIssue500.substring(2));
      
      // 计算开始期号（往前推 batchSize 期）
      let startNum = endNum - batchSize + 1;
      if (startNum < 1) startNum = 1;
      
      startIssue500 = yearPrefix + startNum.toString().padStart(3, '0');
      
      console.log(`获取最新数据，查询 ${startIssue500} - ${endIssue500}`);
    }
    
    const url = `${this.backup500Url}?start=${startIssue500}&end=${endIssue500}`;
    
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`📊 数据源: 500.com (大乐透)`);
    console.log(`🔗 URL: ${url}`);
    console.log(`📝 参数: start=${startIssue500}, end=${endIssue500}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    
    const response = await fetch(url, {
      headers: this.headers
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const html = await response.text();
    
    // 解析 HTML
    const data = this.parse500Html(html);
    
    if (!data || data.length === 0) {
      console.log('500.com 未返回数据');
      return {
        success: false,
        message: '未获取到数据',
        source: '500.com',
        params: {
          url: url,
          start: startIssue500,
          end: endIssue500
        },
        total: 0
      };
    }
    
    console.log(`从 500.com 获取到 ${data.length} 条数据`);
    
    return data;
  }

  /**
   * 解析 500.com 的 HTML 数据
   */
  parse500Html(html) {
    const results = [];
    
    try {
      // 使用正则表达式提取表格数据
      const tbodyMatch = html.match(/<tbody[^>]*id="tdata"[^>]*>([\s\S]*?)<\/tbody>/i);
      
      if (!tbodyMatch) {
        console.log('未找到数据表格');
        return results;
      }
      
      const tbody = tbodyMatch[1];
      
      // 先移除 HTML 注释
      const cleanTbody = tbody.replace(/<!--[\s\S]*?-->/g, '');
      
      // 提取每一行 <tr>...</tr>
      const trMatches = cleanTbody.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi);
      
      for (const trMatch of trMatches) {
        const tr = trMatch[1];
        
        // 提取所有 <td>
        const tdMatches = [...tr.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)];
        
        if (tdMatches.length < 10) continue;
        
        try {
          // 提取文本内容
          const texts = tdMatches.map(m => m[1].replace(/<[^>]+>/g, '').replace(/&nbsp;/g, '').replace(/,/g, '').trim());
          
          // 500.com 大乐透表格结构：
          // 第0列: 期号（如 "25131"，需要补全为 "2025131"）
          // 第1-5列: 前区号码
          // 第6-7列: 后区号码
          // ...
          // 最后一列: 开奖日期
          
          let lotteryNo = texts[0];
          
          // 补全期号：如果是5位数字，补全为7位（加上年份前缀20）
          if (lotteryNo && /^\d{5}$/.test(lotteryNo)) {
            lotteryNo = '20' + lotteryNo;
          }
          
          // 前区（第1-5列）
          const frontBalls = texts.slice(1, 6).filter(t => t && /^\d+$/.test(t)).map(t => t.padStart(2, '0'));
          
          // 后区（第6-7列）
          const backBalls = texts.slice(6, 8).filter(t => t && /^\d+$/.test(t)).map(t => t.padStart(2, '0'));
          
          // 开奖日期（最后一列）
          const drawDate = texts[texts.length - 1];
          
          // 验证数据完整性
          if (lotteryNo && 
              frontBalls.length === 5 && 
              backBalls.length === 2 && 
              drawDate &&
              /^\d{7}$/.test(lotteryNo) &&
              /^\d{4}-\d{2}-\d{2}$/.test(drawDate)) {
            
            results.push({
              lottery_no: lotteryNo,
              draw_date: drawDate,
              front1: frontBalls[0],
              front2: frontBalls[1],
              front3: frontBalls[2],
              front4: frontBalls[3],
              front5: frontBalls[4],
              back1: backBalls[0],
              back2: backBalls[1],
              front_balls: frontBalls,
              back_balls: backBalls,
              sorted_code: [...frontBalls].sort().join(',') + '-' + [...backBalls].sort().join(',')
            });
          }
        } catch (e) {
          console.error('解析行数据失败:', e);
        }
      }
      
      console.log(`成功解析 ${results.length} 条数据`);
    } catch (error) {
      console.error('解析 500.com HTML 失败:', error);
    }
    
    return results;
  }
}
