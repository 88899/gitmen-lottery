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

  async fetch(startIssue = null, endIssue = null, count = null) {
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

  async fetchLatest() {
    const data = await this.fetch();
    return data[0];
  }

  /**
   * 解析 HTML
   * 关键：所有 <tr class="t_tr1"> 都在一行上，需要逐个提取
   */
  parseHtml(html, latestOnly = false) {
    const data = [];
    
    try {
      // 第一步：找到 id="tablelist" 的表格（数据表格）
      const tableMatch = html.match(/<table[^>]*id="tablelist"[^>]*>([\s\S]*?)<\/table>/i);
      
      if (!tableMatch) {
        console.log(`⚠️ 未找到 id="tablelist" 的数据表格`);
        return data;
      }
      
      // 获取表格内容
      const dataTableContent = tableMatch[1];
      
      // 第二步：在表格内查找所有 <tr>
      const trMatches = [...dataTableContent.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)];
      console.log(`找到 ${trMatches.length} 行数据`);
      
      // 第三步：跳过表头（第一行），处理数据行
      for (let i = 1; i < trMatches.length; i++) {
        const trContent = trMatches[i][1];
        
        try {
          // 先移除 HTML 注释（如 <!--<td>2</td>-->）
          const cleanTrContent = trContent.replace(/<!--[\s\S]*?-->/g, '');
          
          // 在行内查找所有 <td>
          const tdMatches = [...cleanTrContent.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)];
          
          if (tdMatches.length < 6) continue;
          
          // 提取单元格文本
          const cells = tdMatches.map(m => 
            m[1]
              .replace(/<[^>]+>/g, '')
              .replace(/&nbsp;/g, ' ')
              .replace(/,/g, '')
              .trim()
          );
          
          // 第0列：期号
          let lotteryNo = cells[0];
          if (!lotteryNo || !/^\d{5,7}$/.test(lotteryNo)) {
            continue;
          }
          
          if (lotteryNo.length === 5) {
            lotteryNo = '20' + lotteryNo;
          }
          
          // 第1列：号码（7个基本号 + 1个特别号）
          const numbersText = cells[1];
          const parts = numbersText.split(/\s+/);
          const numbers = [];
          
          for (const part of parts) {
            if (part.length === 2 && /^\d{2}$/.test(part)) {
              numbers.push(parseInt(part));
            } else if (part.length === 4 && /^\d{4}$/.test(part)) {
              numbers.push(parseInt(part.substring(0, 2)));
              numbers.push(parseInt(part.substring(2, 4)));
            } else if (/^\d+$/.test(part)) {
              numbers.push(parseInt(part));
            }
          }
          
          if (numbers.length !== 8) {
            continue;
          }
          
          const basicBalls = numbers.slice(0, 7);
          const specialBall = numbers[7];
          
          // 第5列：开奖日期
          const drawDate = cells[5];
          if (!/^\d{4}-\d{2}-\d{2}$/.test(drawDate)) {
            continue;
          }
          
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
            return data;
          }
        } catch (e) {
          console.error('解析行数据失败:', e);
        }
      }
      
      console.log(`成功解析 ${data.length} 条七乐彩数据`);
    } catch (error) {
      console.error('解析 HTML 失败:', error);
    }
    
    return data;
  }
}
