/**
 * 七乐彩爬虫 - Cloudflare Worker 版本
 * 参考 Python 版本的实现逻辑
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
   * 参考 Python 版本：使用第三个 table（tables[2]）
   * 表格结构：
   * - 第0列：期号
   * - 第1列：8个数字（7个基本号 + 1个特别号，空格分隔，可能有连在一起的情况）
   * - 第5列：开奖日期
   */
  parseHtml(html, latestOnly = false) {
    const data = [];
    
    try {
      // 查找所有 table
      const tableMatches = [...html.matchAll(/<table[^>]*>([\s\S]*?)<\/table>/gi)];
      console.log(`找到 ${tableMatches.length} 个表格`);
      
      if (tableMatches.length < 3) {
        console.log(`⚠️ 未找到数据表格，只找到 ${tableMatches.length} 个表格`);
        return data;
      }
      
      // 使用第三个表格（索引为2）
      const dataTableContent = tableMatches[2][1];
      
      // 提取所有行
      const trMatches = [...dataTableContent.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)];
      console.log(`找到 ${trMatches.length} 行数据`);
      
      if (trMatches.length === 0) {
        return data;
      }
      
      // 跳过表头（第一行），从第二行开始
      for (let i = 1; i < trMatches.length; i++) {
        const tr = trMatches[i][1];
        const tdMatches = [...tr.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)];
        
        if (tdMatches.length < 6) continue;
        
        try {
          // 提取单元格文本
          const cells = tdMatches.map(m => m[1].replace(/<[^>]+>/g, '').replace(/&nbsp;/g, '').replace(/,/g, '').trim());
          
          // 第0列：期号
          let lotteryNo = cells[0];
          if (!lotteryNo || !/^\d{5,7}$/.test(lotteryNo)) {
            continue;
          }
          
          // 补全期号为7位
          if (lotteryNo.length === 5) {
            lotteryNo = '20' + lotteryNo;
          }
          
          // 第1列：中奖号码（7个基本号 + 1个特别号，空格分隔）
          // 可能的格式：
          // - "04 09 15 20 23 25 27 21" (正常)
          // - "04 09 15 20 23 25 2721" (最后两个连在一起)
          const numbersText = cells[1];
          const parts = numbersText.split(/\s+/);
          const numbers = [];
          
          for (const part of parts) {
            // 如果是2位数字，直接添加
            if (part.length === 2 && /^\d{2}$/.test(part)) {
              numbers.push(parseInt(part));
            }
            // 如果是4位数字，拆分成两个2位数字
            else if (part.length === 4 && /^\d{4}$/.test(part)) {
              numbers.push(parseInt(part.substring(0, 2)));
              numbers.push(parseInt(part.substring(2, 4)));
            }
            // 其他情况尝试解析
            else if (/^\d+$/.test(part)) {
              numbers.push(parseInt(part));
            }
          }
          
          if (numbers.length !== 8) {
            continue;
          }
          
          // 前7个是基本号，最后1个是特别号
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
