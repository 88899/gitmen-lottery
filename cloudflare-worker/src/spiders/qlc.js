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
      // 调试：检查 HTML 是否包含表格标记
      const hasTablelist = html.includes('id="tablelist"');
      const hasTdata = html.includes('id="tdata"');
      const hasTtr1 = html.includes('class="t_tr1"');
      console.log(`HTML 检查: tablelist=${hasTablelist}, tdata=${hasTdata}, t_tr1=${hasTtr1}`);
      
      // 七乐彩的表格结构：<table id="tablelist"> 直接包含 <tr>，没有 <tbody>
      // 先尝试找 id="tablelist" 的表格
      let tableMatch = html.match(/<table[^>]*id="tablelist"[^>]*>([\s\S]*?)<\/table>/i);
      
      if (!tableMatch) {
        // 尝试找 id="tdata" 的 tbody
        tableMatch = html.match(/<tbody[^>]*id="tdata"[^>]*>([\s\S]*?)<\/tbody>/i);
      }
      
      if (!tableMatch) {
        console.log('⚠️ 未找到表格，尝试直接匹配 <tr> 行...');
        // 直接查找所有 tr 行
        const allTrMatches = [...html.matchAll(/<tr[^>]*class="t_tr1"[^>]*>([\s\S]*?)<\/tr>/gi)];
        console.log(`直接查找到 ${allTrMatches.length} 行 t_tr1 数据`);
        if (allTrMatches.length > 0) {
          tableMatch = [null, html];
        } else {
          return data;
        }
      }
      
      const tableContent = tableMatch[1];
      
      // 提取所有 <tr class="t_tr1"> 行（数据行）
      const trMatches = [...tableContent.matchAll(/<tr[^>]*class="t_tr1"[^>]*>([\s\S]*?)<\/tr>/gi)];
      console.log(`找到 ${trMatches.length} 行数据`);
      
      if (trMatches.length === 0) {
        console.log('❌ 未找到任何数据行');
        return data;
      }
      
      // 处理找到的行
      for (const trMatch of trMatches) {
        const tr = trMatch[1];
        const tdMatches = [...tr.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)];
        
        if (tdMatches.length < 5) continue;
        
        try {
          const texts = tdMatches.map(m => m[1].replace(/<[^>]+>/g, '').replace(/&nbsp;/g, '').replace(/,/g, '').trim());
          
          // 七乐彩表格结构：
          // 第0列: 期号
          // 第1列: 7个基本号 + 1个特别号（用空格分隔）
          // 第2列: 和值
          // 第3列: 销售额
          // 第4列: 开奖日期
          
          let lotteryNo = texts[0];
          if (lotteryNo && /^\d{5}$/.test(lotteryNo)) {
            lotteryNo = '20' + lotteryNo;
          }
          
          // 从第1列提取8个数字（7个基本号 + 1个特别号）
          const numbersStr = texts[1];
          const numbers = numbersStr.split(/\s+/).map(n => parseInt(n)).filter(n => !isNaN(n));
          const drawDate = texts[texts.length - 1];
          
          if (lotteryNo && 
              numbers.length === 8 && 
              drawDate &&
              /^\d{7}$/.test(lotteryNo) &&
              /^\d{4}-\d{2}-\d{2}$/.test(drawDate)) {
            
            const basicBalls = numbers.slice(0, 7);
            const specialBall = numbers[7];
            
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
