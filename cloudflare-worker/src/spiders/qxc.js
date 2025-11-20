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
   *                           如果为 null，则从 startIssue 开始获取全量数据（扩展功能）
   * @returns {Array} 数据数组
   */
  async fetch(startIssue, endIssue) {
    if (!startIssue && !endIssue) {
      console.log('从 500.com 获取七星彩最新数据...');
      
      const response = await fetch(this.baseUrl, {
        headers: this.headers
      });

      if (!response.ok) {
        if (typeof handleNetworkError !== 'undefined') {
          await handleNetworkError(globalThis.env, response.status, this.baseUrl, 'qxc');
        }
        throw new Error(`HTTP ${response.status}`);
      }

      const html = await response.text();
      const data = this.parse500Html(html, true);
      
      return data;
    }

    // 扩展功能：不传 endIssue 时，从 startIssue 开始获取全量数据
    let url;
    if (endIssue === null || endIssue === undefined) {
      url = `${this.baseUrl}?start=${startIssue}`;
      console.log(`从 500.com 获取七星彩全量数据（从 ${startIssue} 开始）`);
    } else {
      url = `${this.baseUrl}?start=${startIssue}&end=${endIssue}`;
      console.log(`从 500.com 获取七星彩期号范围数据: ${startIssue} - ${endIssue}`);
    }
    
    const response = await fetch(url, {
      headers: this.headers
    });

    if (!response.ok) {
      if (typeof handleNetworkError !== 'undefined') {
        await handleNetworkError(globalThis.env, response.status, url, 'qxc');
      }
      throw new Error(`HTTP ${response.status}`);
    }

    const html = await response.text();
    const data = this.parse500Html(html);
    
    return data;
  }

  /**
   * 解析 500.com HTML
   * HTML 结构：
   * <tr class="t_tr1">
   *   <td class="t_tr1">25133</td>           <!-- 期号 -->
   *   <td class="cfont2">2 4 7 9 1 3 4...</td> <!-- 号码 -->
   *   <td>30</td>                             <!-- 和值 -->
   *   <td class="t_tr1">16814218</td>        <!-- 销售额 -->
   *   <td class="t_tr1">2025-11-18</td>      <!-- 日期 -->
   * </tr>
   */
  parse500Html(html, latestOnly = false) {
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
          
          // 七星彩：7个数字
          const numbers = texts.slice(1, 8).filter(t => t && /^\d+$/.test(t)).map(t => parseInt(t));
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
              console.log(`成功解析最新数据: ${lotteryNo}`);
              return data;
            }
          }
        } catch (e) {
          console.error('解析行数据失败:', e);
        }
      }
      
      if (!latestOnly) {
        console.log(`成功解析 ${data.length} 条七星彩数据`);
      }
    } catch (error) {
      console.error('解析 HTML 失败:', error);
    }
    
    return data;
  }

  /**
   * 兼容旧接口
   */
  async fetchLatest() {
    const data = await this.fetch();
    return data[0];
  }
}
