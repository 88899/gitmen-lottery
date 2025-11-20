/**
 * 七乐彩爬虫 - Cloudflare Worker 版本
 */

export class QLCSpider {
  constructor() {
    this.baseUrl = 'https://datachart.500.com/qlc/history/newinc/history.php';
  }

  /**
   * 获取数据
   */
  async fetch(startIssue, endIssue) {
    let url = this.baseUrl;
    if (startIssue && endIssue) {
      url += `?start=${startIssue}&end=${endIssue}`;
    }
    
    console.log(`七乐彩爬虫: ${url}`);
    
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const html = await response.text();
      return this.parseHtml(html);
      
    } catch (error) {
      console.error('七乐彩爬虫错误:', error);
      throw error;
    }
  }

  /**
   * 解析 HTML
   */
  parseHtml(html) {
    const data = [];
    const rowRegex = /<tr[^>]*>.*?<td[^>]*>(\d+)<\/td>.*?<td[^>]*>([\d\s]+)<\/td>.*?<td[^>]*>[\d,]+<\/td>.*?<td[^>]*>[\d,]+<\/td>.*?<td[^>]*>[\d,]+<\/td>.*?<td[^>]*>([\d-]+)<\/td>/gs;
    
    let match;
    while ((match = rowRegex.exec(html)) !== null) {
      try {
        const lotteryNo = match[1];
        const numbersText = match[2].trim();
        const drawDate = match[3];
        
        // 补全期号
        const fullLotteryNo = lotteryNo.length === 5 ? '20' + lotteryNo : lotteryNo;
        
        // 解析号码
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
        
        if (numbers.length === 8) {
          const basicBalls = numbers.slice(0, 7);
          const specialBall = numbers[7];
          
          data.push({
            lottery_no: fullLotteryNo,
            draw_date: drawDate,
            basic1: String(basicBalls[0]),
            basic2: String(basicBalls[1]),
            basic3: String(basicBalls[2]),
            basic4: String(basicBalls[3]),
            basic5: String(basicBalls[4]),
            basic6: String(basicBalls[5]),
            basic7: String(basicBalls[6]),
            special: String(specialBall),
            sorted_code: basicBalls.slice().sort((a,b) => a-b).map(n => String(n).padStart(2, '0')).join(',') + '-' + String(specialBall).padStart(2, '0')
          });
        }
        
      } catch (error) {
        console.warn('解析行失败:', error);
        continue;
      }
    }
    
    console.log(`解析 ${data.length} 条七乐彩数据`);
    return data;
  }
}

export default QLCSpider;
