/**
 * 七星彩爬虫 - Cloudflare Worker 版本
 */

export class QXCSpider {
  constructor() {
    this.baseUrl = 'https://datachart.500.com/qxc/history/inc/history.php';
    this.headers = {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Referer': 'https://www.500.com/',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
    };
  }

  /**
   * 爬取七星彩数据
   * @param {string} startIssue - 起始期号（5位，如 04101）
   * @param {string} endIssue - 结束期号（5位，如 04200）
   * @returns {Array} 数据数组
   */
  async fetch(startIssue = null, endIssue = null, count = null) {
    // 场景1: 获取最新数据（不带参数）
    if (!startIssue && !endIssue) {
      console.log('从 500.com 获取七星彩最新数据...');
      
      const response = await fetch(this.baseUrl, {
        headers: this.headers
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const html = await response.text();
      const data = this.parse500Html(html, true);
      
      if (!data || data.length === 0) {
        throw new Error('500.com 未返回数据');
      }
      
      const result = count ? data.slice(0, count) : data;
      console.log(`成功获取 ${data.length} 条数据，返回 ${result.length} 条`);
      return result;
    }

    // 场景2: 按期号范围获取
    const url = `${this.baseUrl}?start=${startIssue}&end=${endIssue}`;
    console.log(`从 500.com 获取七星彩期号范围数据: ${startIssue} - ${endIssue}`);
    
    const response = await fetch(url, {
      headers: this.headers
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const html = await response.text();
    return this.parse500Html(html);
  }

  /**
   * 兼容旧接口
   */
  async fetchLatest() {
    const data = await this.fetch();
    return data[0];
  }

  /**
   * 解析 500.com HTML
   * 表格结构：<table id="tablelist"> 包含 <tr class="t_tr1">
   * 每行包含：期号、7个数字、和值、销售额、开奖日期
   */
  parse500Html(html, latestOnly = false) {
    const data = [];
    
    try {
      // 查找表格
      let tableMatch = html.match(/<table[^>]*id="tablelist"[^>]*>([\s\S]*?)<\/table>/i);
      
      if (!tableMatch) {
        tableMatch = html.match(/<tbody[^>]*id="tdata"[^>]*>([\s\S]*?)<\/tbody>/i);
      }
      
      if (!tableMatch) {
        console.log('⚠️ 未找到表格');
        return data;
      }
      
      const tableContent = tableMatch[1];
      
      // 提取数据行
      const trMatches = [...tableContent.matchAll(/<tr[^>]*class="t_tr1"[^>]*>([\s\S]*?)<\/tr>/gi)];
      console.log(`找到 ${trMatches.length} 行数据`);
      
      if (trMatches.length === 0) {
        return data;
      }
      
      // 处理每一行
      for (const trMatch of trMatches) {
        const tr = trMatch[1];
        const tdMatches = [...tr.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)];
        
        if (tdMatches.length < 5) continue;
        
        try {
          const texts = tdMatches.map(m => m[1].replace(/<[^>]+>/g, '').replace(/&nbsp;/g, '').replace(/,/g, '').trim());
          
          let lotteryNo = texts[0];
          if (lotteryNo && /^\d{5}$/.test(lotteryNo)) {
            lotteryNo = '20' + lotteryNo;
          }
          
          const numbersStr = texts[1];
          const numbers = numbersStr.split(/\s+/).map(n => parseInt(n)).filter(n => !isNaN(n));
          const drawDate = texts[texts.length - 1];
          
          if (lotteryNo && 
              numbers.length === 7 && 
              drawDate &&
              /^\d{7}$/.test(lotteryNo) &&
              /^\d{4}-\d{2}-\d{2}$/.test(drawDate)) {
            
            data.push({
              lottery_no: lotteryNo,
              draw_date: drawDate,
              num1: String(numbers[0]),
              num2: String(numbers[1]),
              num3: String(numbers[2]),
              num4: String(numbers[3]),
              num5: String(numbers[4]),
              num6: String(numbers[5]),
              num7: String(numbers[6]),
              sorted_code: [...numbers].sort((a,b) => a-b).map(n => String(n).padStart(2, '0')).join(',')
            });
            
            if (latestOnly && data.length === 1) {
              return data;
            }
          }
        } catch (e) {
          console.error('解析行数据失败:', e);
        }
      }
      
      console.log(`成功解析 ${data.length} 条七星彩数据`);
    } catch (error) {
      console.error('解析 HTML 失败:', error);
    }
    
    return data;
  }
}
