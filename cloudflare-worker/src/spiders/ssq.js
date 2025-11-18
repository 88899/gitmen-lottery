/**
 * 双色球爬虫 - Cloudflare Worker 版本
 * 支持爬取最新数据和全量历史数据
 * 支持多数据源：zhcw.com (主) + 500.com (备用)
 */

export class SSQSpider {
  constructor() {
    // 主数据源：中彩网 API
    this.apiUrl = 'https://jc.zhcw.com/port/client_json.php';
    
    // 备用数据源：500彩票网
    this.backup500Url = 'https://datachart.500.com/ssq/history/newinc/history.php';
    
    this.headers = {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Referer': 'https://www.zhcw.com/',
      'Accept': 'application/json, text/plain, */*',
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8'
    };
    this.minDelay = 500;  // 最小延迟 500ms
    this.maxDelay = 2000; // 最大延迟 2000ms
    this.lastRequestTime = 0;
  }

  /**
   * 随机延迟，模拟人类行为
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
    // 先尝试主数据源
    try {
      console.log('尝试从主数据源获取最新数据...');
      return await this.fetchLatestFromZhcw();
    } catch (error) {
      console.error('主数据源失败:', error.message);
      
      // 主数据源失败，尝试备用数据源
      try {
        console.log('尝试从备用数据源 500.com 获取最新数据...');
        return await this.fetchLatestFrom500();
      } catch (backupError) {
        console.error('备用数据源也失败:', backupError.message);
        throw new Error(`所有数据源均失败: 主源(${error.message}), 备用源(${backupError.message})`);
      }
    }
  }

  /**
   * 从中彩网获取最新数据
   */
  async fetchLatestFromZhcw() {
    await this.randomDelay();
    
    // 获取最近的期号列表
    const params = new URLSearchParams({
      transactionType: '10001003',
      lotteryId: '1',
      count: '1',
      tt: Date.now().toString()
    });

    const response = await fetch(`${this.apiUrl}?${params}`, {
      headers: this.headers
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const text = await response.text();
    if (!text || text.trim() === '') {
      throw new Error('API 返回空响应');
    }

    const data = JSON.parse(text);
    
    if (data.resCode !== '000000') {
      throw new Error(`API错误: ${data.resCode} - ${data.message || ''}`);
    }

    const issues = data.issue || [];
    if (issues.length === 0) {
      throw new Error('未获取到期号');
    }

    // 获取最新期号的详细信息
    const latestIssue = issues[0];
    const detail = await this.fetchIssueDetail(latestIssue);
    
    if (!detail) {
      throw new Error('获取期号详情失败');
    }
    
    return detail;
  }

  /**
   * 从 500.com 获取最新数据（备用）
   */
  async fetchLatestFrom500() {
    await this.randomDelay();
    
    // 500.com 不带参数时返回最近30期数据
    const url = this.backup500Url;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': this.headers['User-Agent'],
        'Referer': 'https://www.500.com/',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
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
   * 获取指定期号的详细信息
   */
  async fetchIssueDetail(issue) {
    try {
      await this.randomDelay();
      
      const params = new URLSearchParams({
        transactionType: '10001002',
        lotteryId: '1',
        issue: issue,
        tt: Date.now().toString()
      });

      const response = await fetch(`${this.apiUrl}?${params}`, {
        headers: this.headers
      });

      if (!response.ok) {
        console.error(`期号 ${issue}: HTTP ${response.status}`);
        return null;
      }

      const text = await response.text();
      if (!text || text.trim() === '') {
        console.error(`期号 ${issue}: 返回空响应`);
        return null;
      }

      const data = JSON.parse(text);
      
      if (data.resCode !== '000000') {
        console.error(`期号 ${issue}: API错误 ${data.resCode}`);
        return null;
      }

      // 解析红球和蓝球
      const redStr = data.frontWinningNum || data.seqFrontWinningNum || '';
      const blueStr = data.backWinningNum || data.seqBackWinningNum || '';

      if (!redStr || !blueStr) {
        console.error(`期号 ${issue}: 缺少开奖号码`);
        return null;
      }

      const redMatches = redStr.match(/\d+/g);
      const blueMatches = blueStr.match(/\d+/g);

      if (!redMatches || redMatches.length !== 6 || !blueMatches || blueMatches.length === 0) {
        console.error(`期号 ${issue}: 号码格式错误`);
        return null;
      }

      const redBalls = redMatches.map(n => n.padStart(2, '0'));
      const blueBall = blueMatches[0].padStart(2, '0');

      return {
        lottery_no: data.issue || issue,
        draw_date: (data.openTime || '').substring(0, 10),
        red1: redBalls[0],
        red2: redBalls[1],
        red3: redBalls[2],
        red4: redBalls[3],
        red5: redBalls[4],
        red6: redBalls[5],
        blue: blueBall,
        red_balls: redBalls,
        blue_ball: blueBall,
        sorted_code: redBalls.sort().join(',') + '-' + blueBall
      };
    } catch (error) {
      console.error(`获取期号 ${issue} 详情失败:`, error.message);
      return null;
    }
  }

  /**
   * 获取全量历史数据（分批获取）
   * @param {number} maxCount - 最大获取数量，null 表示获取所有数据（真正的全量）
   * @param {string} startIssue - 起始期号（可选），如果指定则从该期号往前爬取
   */
  async fetchAll(maxCount = null, startIssue = null) {
    // 先尝试主数据源
    try {
      console.log('尝试从主数据源获取全量数据...');
      return await this.fetchAllFromZhcw(maxCount, startIssue);
    } catch (error) {
      console.error('主数据源失败:', error.message);
      
      // 主数据源失败，尝试备用数据源
      try {
        console.log('尝试从备用数据源 500.com 获取全量数据...');
        return await this.fetchAllFrom500(maxCount);
      } catch (backupError) {
        console.error('备用数据源也失败:', backupError.message);
        throw new Error(`所有数据源均失败: 主源(${error.message}), 备用源(${backupError.message})`);
      }
    }
  }

  /**
   * 从中彩网获取全量数据
   * 注意：API 单次最多返回 1000 个期号，如果需要更多数据，需要多次请求
   * @param {number} maxCount - 最大获取数量
   * @param {string} startIssue - 起始期号（可选），如果指定则从该期号往前爬取
   */
  async fetchAllFromZhcw(maxCount = null, startIssue = null) {
    const requestCount = maxCount || 10000;
    console.log(`开始从中彩网获取全量数据${maxCount ? `，最多 ${maxCount} 期` : '（所有历史数据）'}${startIssue ? `，从期号 ${startIssue} 往前爬取` : ''}...`);
    
    let issues = [];
    
    // 始终从 API 获取期号列表（最可靠的方式）
    await this.randomDelay();
    
    // 获取期号列表（API 单次最多 1000）
    const params = new URLSearchParams({
      transactionType: '10001003',
      lotteryId: '1',
      count: '1000',  // 获取最多的期号
      tt: Date.now().toString()
    });

    const response = await fetch(`${this.apiUrl}?${params}`, {
      headers: this.headers
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const text = await response.text();
    if (!text || text.trim() === '') {
      throw new Error('API 返回空响应');
    }

    const data = JSON.parse(text);
    
    if (data.resCode !== '000000') {
      throw new Error(`API错误: ${data.resCode}`);
    }

    const allIssues = data.issue || [];
    console.log(`从 API 获取到 ${allIssues.length} 个期号`);
    
    if (allIssues.length === 0) {
      throw new Error('未获取到期号列表');
    }
    
    if (startIssue) {
      // 如果指定了起始期号，找到该期号在列表中的位置，然后取后面的期号
      const startIndex = allIssues.indexOf(startIssue);
      
      if (startIndex === -1) {
        // 如果起始期号不在列表中
        console.log(`起始期号 ${startIssue} 不在 API 返回的列表中`);
        
        const oldestInList = allIssues[allIssues.length - 1];
        console.log(`API 返回的最旧期号: ${oldestInList}`);
        
        // 比较期号：如果数据库最旧期号比 API 最旧期号还要旧，说明已经爬完了
        if (parseInt(startIssue) <= parseInt(oldestInList)) {
          console.log(`数据库最旧期号 ${startIssue} <= API 最旧期号 ${oldestInList}，可能已爬取完成`);
          return {
            success: false,
            message: '未获取到数据',
            source: '中彩网',
            params: {
              startIssue: startIssue,
              oldestInList: oldestInList,
              maxCount: maxCount
            },
            total: 0
          };
        }
        
        // 否则，数据库最旧期号比 API 最旧期号新，说明中间有数据缺失
        // 使用 API 返回的所有期号（这些都是比数据库更旧的数据）
        console.log(`数据库最旧期号 ${startIssue} > API 最旧期号 ${oldestInList}，使用 API 返回的所有期号`);
        issues = allIssues.slice(0, maxCount || allIssues.length);
      } else {
        // 找到了起始期号，取它后面的期号（更早的数据）
        const remainingIssues = allIssues.slice(startIndex + 1);
        console.log(`从期号 ${startIssue} 往前，还有 ${remainingIssues.length} 个期号可爬取`);
        
        if (remainingIssues.length === 0) {
          console.log(`没有更早的数据了，可能已爬取完成`);
          return {
            success: false,
            message: '未获取到数据',
            source: '中彩网',
            params: {
              startIssue: startIssue,
              maxCount: maxCount
            },
            total: 0
          };
        }
        
        issues = remainingIssues.slice(0, maxCount || remainingIssues.length);
      }
      
      if (issues.length > 0) {
        console.log(`筛选后得到 ${issues.length} 个期号，范围: ${issues[issues.length - 1]} - ${issues[0]}`);
      }
    } else {
      // 如果没有指定起始期号，取最新的 maxCount 个期号
      issues = allIssues.slice(0, maxCount || allIssues.length);
      console.log(`取最新的 ${issues.length} 个期号`);
    }

    if (issues.length === 0) {
      throw new Error('未获取到期号列表');
    }

    const allData = [];
    
    // 分批处理，每批50个（减少批次大小，避免超时）
    const batchSize = 50;
    for (let i = 0; i < issues.length; i += batchSize) {
      const batch = issues.slice(i, i + batchSize);
      console.log(`处理第 ${i + 1}-${Math.min(i + batchSize, issues.length)} 期...`);
      
      for (const issue of batch) {
        const detail = await this.fetchIssueDetail(issue);
        if (detail) {
          allData.push(detail);
        }
        
        // 每10个请求后稍作延迟
        if (allData.length % 10 === 0) {
          await this.sleep(100);
        }
      }
      
      // 每批之间延迟
      if (i + batchSize < issues.length) {
        await this.sleep(1000);
      }
    }

    console.log(`全量爬取完成，共获取 ${allData.length} 条数据`);
    return allData;
  }

  /**
   * 从 500.com 获取最新期号
   */
  async getLatestIssueFrom500() {
    await this.randomDelay();
    
    const url = 'https://datachart.500.com/ssq/history/history.shtml';
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': this.headers['User-Agent'],
        'Referer': 'https://www.500.com/',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const html = await response.text();
    
    // 解析 HTML，获取第一条数据的期号
    const data = this.parse500Html(html);
    
    if (!data || data.length === 0) {
      throw new Error('无法获取最新期号');
    }
    
    // 返回最新期号（7位格式，如 2025132）
    const latestIssue = data[0].lottery_no;
    console.log(`500.com 最新期号: ${latestIssue}`);
    
    return latestIssue;
  }

  /**
   * 从 500.com 按期号范围获取数据（与 Python 版本一致）
   * @param {string} startIssue - 开始期号（5位格式，如 '03001'）
   * @param {string} endIssue - 结束期号（5位格式，如 '03200'）
   */
  async fetch500comByRange(startIssue, endIssue) {
    await this.randomDelay();
    
    const url = `${this.backup500Url}?start=${startIssue}&end=${endIssue}`;
    
    console.log(`      📊 数据源: 500.com`);
    console.log(`      🔗 查询: start=${startIssue}, end=${endIssue}`);
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': this.headers['User-Agent'],
        'Referer': 'https://www.500.com/',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
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
   * 从 500.com 获取数据（备用）
   * 支持按期号范围查询，每次获取 200 期（与 Python 版本一致）
   * @param {number} batchSize - 每批次获取的期数（默认 200）
   * @param {string} startIssue - 起始期号（可选），格式如 "2025132"（7位）
   */
  async fetchAllFrom500(batchSize = 200, startIssue = null) {
    console.log(`开始从 500.com 获取数据，每批 ${batchSize} 期${startIssue ? `，从期号 ${startIssue} 往前` : ''}...`);
    
    await this.randomDelay();
    
    let endIssue500; // 5位格式
    let startIssue500; // 5位格式
    
    if (startIssue) {
      // 如果指定了起始期号（7位格式，如 2025001）
      const year = parseInt(startIssue.substring(0, 4)); // 2025
      const yearPrefix = startIssue.substring(2, 4); // 25
      const issueNum = parseInt(startIssue.substring(4)); // 001
      
      // 往前一期
      let endNum = issueNum - 1;
      let endYear = year;
      let endYearPrefix = yearPrefix;
      
      if (endNum < 1) {
        // 跨年：从上一年开始
        endYear = year - 1;
        endYearPrefix = endYear.toString().substring(2); // 2024 -> 24
        endNum = 153; // 假设每年最多 153 期
        
        console.log(`跨年：从 ${year} 年第 1 期往前到 ${endYear} 年`);
        
        // 检查是否已经到达双色球开始年份（2003年）
        if (endYear < 2003) {
          console.log(`已到达双色球开始年份（2003年），无法继续往前`);
          return {
            success: false,
            message: '未获取到数据',
            source: '500.com',
            params: {
              startIssue: startIssue,
              endYear: endYear,
              reason: '已到达双色球开始年份（2003年）'
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
      const latestIssue = await this.getLatestIssueFrom500();
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
    console.log(`📊 数据源: 500.com`);
    console.log(`🔗 URL: ${url}`);
    console.log(`📝 参数: start=${startIssue500}, end=${endIssue500}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': this.headers['User-Agent'],
        'Referer': 'https://www.500.com/',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
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
      // 500.com 的表格结构：<tbody id="tdata">...</tbody>
      const tbodyMatch = html.match(/<tbody[^>]*id="tdata"[^>]*>([\s\S]*?)<\/tbody>/i);
      
      if (!tbodyMatch) {
        console.log('未找到数据表格');
        return results;
      }
      
      const tbody = tbodyMatch[1];
      
      // 先移除 HTML 注释（如 <!--<td>2</td>-->）
      const cleanTbody = tbody.replace(/<!--[\s\S]*?-->/g, '');
      
      // 提取每一行 <tr>...</tr>
      const trMatches = cleanTbody.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi);
      
      for (const trMatch of trMatches) {
        const tr = trMatch[1];
        
        // 提取所有 <td>
        const tdMatches = [...tr.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)];
        
        if (tdMatches.length < 10) continue;
        
        try {
          // 提取文本内容（去除所有 HTML 标签和空格）
          const texts = tdMatches.map(m => m[1].replace(/<[^>]+>/g, '').replace(/&nbsp;/g, '').replace(/,/g, '').trim());
          
          // 500.com 的表格结构（移除注释后）：
          // 第0列: 期号（如 "25132"，需要补全为 "2025132"）
          // 第1-6列: 红球
          // 第7列: 蓝球
          // 第8列: 快乐星期天
          // 第9列: 奖池
          // ...
          // 最后一列: 开奖日期
          
          let lotteryNo = texts[0];
          
          // 补全期号：如果是5位数字，补全为7位（加上年份前缀20）
          if (lotteryNo && /^\d{5}$/.test(lotteryNo)) {
            lotteryNo = '20' + lotteryNo;
          }
          
          // 红球（第1-6列）
          const redBalls = texts.slice(1, 7).filter(t => t && /^\d+$/.test(t)).map(t => t.padStart(2, '0'));
          
          // 蓝球（第7列）
          const blueBallText = texts[7];
          const blueBall = (blueBallText && /^\d+$/.test(blueBallText)) ? blueBallText.padStart(2, '0') : null;
          
          // 开奖日期（最后一列）
          const drawDate = texts[texts.length - 1];
          
          // 验证数据完整性
          if (lotteryNo && 
              redBalls.length === 6 && 
              blueBall && 
              drawDate &&
              /^\d{7}$/.test(lotteryNo) &&
              /^\d{4}-\d{2}-\d{2}$/.test(drawDate)) {
            
            results.push({
              lottery_no: lotteryNo,
              draw_date: drawDate,
              red1: redBalls[0],
              red2: redBalls[1],
              red3: redBalls[2],
              red4: redBalls[3],
              red5: redBalls[4],
              red6: redBalls[5],
              blue: blueBall,
              red_balls: redBalls,
              blue_ball: blueBall,
              sorted_code: [...redBalls].sort().join(',') + '-' + blueBall
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

  /**
   * 从中彩网按日期范围获取数据（支持分页，获取所有数据）
   * @param {string} startDate - 开始日期 YYYY-MM-DD
   * @param {string} endDate - 结束日期 YYYY-MM-DD
   */
  async fetchByDateRangeFromZhcw(startDate, endDate) {
    try {
      const allResults = [];
      let pageNum = 1;
      const pageSize = 30; // 中彩网默认 30 条/页
      
      console.log(`开始从中彩网按日期范围查询: ${startDate} 至 ${endDate}`);
      
      while (true) {
        await this.randomDelay();
        
        const timestamp = Date.now();
        const params = new URLSearchParams({
          callback: `jQuery${Math.random().toString().replace('.', '')}${timestamp}`,
          transactionType: '10001001',
          lotteryId: '1',
          issueCount: '0',
          startIssue: '0',
          endIssue: '0',
          startDate: startDate,
          endDate: endDate,
          type: '2',
          pageNum: pageNum.toString(),
          pageSize: pageSize.toString(),
          tt: Math.random().toString(),
          _: timestamp.toString()
        });

        const url = `${this.apiUrl}?${params}`;
        
        console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        console.log(`📊 数据源: 中彩网`);
        console.log(`🔗 URL: ${url}`);
        console.log(`📝 参数: startDate=${startDate}, endDate=${endDate}, pageNum=${pageNum}, pageSize=${pageSize}`);
        console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Referer': 'https://www.zhcw.com/',
            'Accept': '*/*',
            'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
            'Accept-Encoding': 'gzip, deflate, br'
          }
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const text = await response.text();
        
        // 处理 JSONP 格式（如果有 callback）
        let jsonText = text;
        if (text.includes('(') && text.includes(')')) {
          // 去掉 callback 包装: callback({...}) -> {...}
          jsonText = text.substring(text.indexOf('(') + 1, text.lastIndexOf(')'));
        }
        
        const data = JSON.parse(jsonText);
        
        if (data.resCode !== '000000') {
          console.log(`中彩网 API 返回错误: ${data.resCode} - ${data.message || ''}`);
          break;
        }

        const records = data.pageList || [];
        
        if (records.length === 0) {
          console.log(`第 ${pageNum} 页无数据，查询完成`);
          break;
        }
        
        console.log(`第 ${pageNum} 页: ${records.length} 条数据`);

        for (const record of records) {
          try {
            const redStr = record.frontWinningNum || record.seqFrontWinningNum || '';
            const blueStr = record.backWinningNum || record.seqBackWinningNum || '';

            if (!redStr || !blueStr) continue;

            const redBalls = redStr.match(/\d+/g).map(n => n.padStart(2, '0'));
            const blueBall = blueStr.match(/\d+/g)[0].padStart(2, '0');

            allResults.push({
              lottery_no: record.issue,
              draw_date: (record.openTime || '').substring(0, 10),
              red1: redBalls[0],
              red2: redBalls[1],
              red3: redBalls[2],
              red4: redBalls[3],
              red5: redBalls[4],
              red6: redBalls[5],
              blue: blueBall,
              red_balls: redBalls,
              blue_ball: blueBall,
              sorted_code: [...redBalls].sort().join(',') + '-' + blueBall
            });
          } catch (e) {
            console.error('解析记录失败:', e);
          }
        }
        
        // 如果返回的数据少于 pageSize，说明已经是最后一页
        if (records.length < pageSize) {
          console.log(`已获取所有数据，共 ${allResults.length} 条`);
          break;
        }
        
        pageNum++;
        
        // 安全限制：最多查询 20 页（避免无限循环）
        if (pageNum > 20) {
          console.log(`已查询 20 页，停止查询`);
          break;
        }
      }

      console.log(`中彩网日期范围查询完成: ${startDate} 至 ${endDate}，共 ${allResults.length} 条数据`);
      return allResults;
    } catch (error) {
      console.error('从中彩网按日期范围获取数据失败:', error);
      throw error;
    }
  }
}
