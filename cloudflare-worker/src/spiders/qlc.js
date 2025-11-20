/**
 * 七乐彩爬虫 - Cloudflare Worker 版本
 */

export class QLCSpider {
  constructor() {
    this.baseUrl = 'https://datachart.500.com/qlc/history/newinc/history.php';
    this.headers = {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Referer': 'https://www.500.com/',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
    };
  }

  /**
   * 获取数据
   * @param {string} startIssue - 起始期号（5位，如 07001）
   * @param {string} endIssue - 结束期号（5位，如 07050）
   * @returns {Array} 数据数组
   */
  async fetch(startIssue = null, endIssue = null, count = null) {
    // 场景1: 获取最新数据（不带参数）
    if (!startIssue && !endIssue) {
      console.log('从 500.com 获取七乐彩最新数据...');
      
      const response = await fetch(this.baseUrl, {
        headers: this.headers
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const html = await response.text();
      const data = this.parseHtml(html, true);
      
      if (!data || data.length === 0) {
        throw new Error('500.com 未返回数据');
      }
      
      const result = count ? data.slice(0, count) : data;
      console.log(`成功获取 ${data.length} 条数据，返回 ${result.length} 条`);
      return result;
    }
    
    // 场景2: 按期号范围获取
    let url = this.baseUrl;
    if (startIssue && endIssue) {
      url += `?start=${startIssue}&end=${endIssue}`;
    }
    
    console.log(`从 500.com 获取七乐彩期号范围数据: ${startIssue} - ${endIssue}`);
    
    const response = await fetch(url, {
      headers: this.headers
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const html = await response.text();
    return this.parseHtml(html);
  }

  /**
   * 兼容旧接口
   */
  async fetchLatest() {
    const data = await this.fetch();
    return data[0];
  }

  /**
   * 解析 HTML
   * @param {string} html - HTML 内容
   * @param {boolean} latestOnly - 是否只解析第一条
   */
  parseHtml(html, latestOnly = false) {
    const data = [];
    
    try {
      // 提取表格数据
      const tbodyMatch = html.match(/<tbody[^>]*id="tdata"[^>]*>([\s\S]*?)<\/tbody>/i);
      
      if (!tbodyMatch) {
        console.log('未找到数据表格');
        return data;
      }
      
      const tbody = tbodyMatch[1];
      const cleanTbody = tbody.replace(/<!--[\s\S]*?-->/g, '');
      
      // 提取每一行
      const trMatches = cleanTbody.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi);
      
      for (const trMatch of trMatches) {
        const tr = trMatch[1];
        const tdMatches = [...tr.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)];
        
        if (tdMatches.length < 10) continue;
        
        try {
          const texts = tdMatches.map(m => m[1].replace(/<[^>]+>/g, '').replace(/&nbsp;/g, '').replace(/,/g, '').trim());
          
          let lotteryNo = texts[0];
          if (lotteryNo && /^\d{5}$/.test(lotteryNo)) {
            lotteryNo = '20' + lotteryNo;
          }
          
          // 七乐彩：7个基本号 + 1个特别号 = 8个数字
          const basicBalls = texts.slice(1, 8).filter(t => t && /^\d+$/.test(t)).map(t => parseInt(t));
          const specialBall = texts[8] && /^\d+$/.test(texts[8]) ? parseInt(texts[8]) : null;
          const drawDate = texts[texts.length - 1];
          
          if (lotteryNo && 
              basicBalls.length === 7 && 
              specialBall !== null && 
              drawDate &&
              /^\d{7}$/.test(lotteryNo) &&
              /^\d{4}-\d{2}-\d{2}$/.test(drawDate)) {
            
            data.push({
              lottery_no: lotteryNo,
              draw_date: drawDate,
              basic1: String(basicBalls[0]),
              basic2: String(basicBalls[1]),
              basic3: String(basicBalls[2]),
              basic4: String(basicBalls[3]),
              basic5: String(basicBalls[4]),
              basic6: String(basicBalls[5]),
              basic7: String(basicBalls[6]),
              special: String(specialBall),
              sorted_code: [...basicBalls].sort((a,b) => a-b).map(n => String(n).padStart(2, '0')).join(',') + '-' + String(specialBall).padStart(2, '0')
            });
            
            if (latestOnly && data.length === 1) {
              console.log(`成功解析最新数据: ${lotteryNo}`);
              return data;
            }
          }
        } catch (e) {
          console.error('解析行数据失败:', e);
        }
      }
      
      if (!latestOnly) {
        console.log(`成功解析 ${data.length} 条七乐彩数据`);
      }
    } catch (error) {
      console.error('解析 HTML 失败:', error);
    }
    
    return data;
  }
}


