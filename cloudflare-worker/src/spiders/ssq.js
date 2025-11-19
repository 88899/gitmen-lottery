/**
 * 双色球爬虫 - Cloudflare Worker 版本
 * 支持爬取最新数据和全量历史数据
 * 支持多数据源：zhcw.com (主) + 500.com (备用)
 */

export class SSQSpider {
  constructor() {
    // 数据源：500彩票网（稳定可靠）
    this.baseUrl = 'https://datachart.500.com/ssq/history/newinc/history.php';
    
    this.headers = {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Referer': 'https://www.500.com/',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
    };
    // 移除延迟，提高执行速度
    this.lastRequestTime = 0;
  }

  /**
   * 延迟函数（保留用于批量爬取时的节流）
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 统一的爬取接口（重构版）
   * 
   * @param {string} startIssue - 起始期号（5位格式，如 '03001'），可选
   * @param {string} endIssue - 结束期号（5位格式，如 '25200'），可选
   * @param {number} count - 获取最新 N 条（仅当 start/end 都为 null 时使用），可选
   * @returns {Promise<Array>} 中奖数据列表
   * 
   * 使用场景：
   *   1. 全量爬取: fetch('03001', '25200')
   *   2. 增量爬取: fetch('25133', '25200')  // 获取所有新数据
   *   3. 获取最新: fetch() 或 fetch(null, null, 1)  // 不带参数返回所有可用数据（约30条）
   */
  async fetch(startIssue = null, endIssue = null, count = null) {
    // 场景1: 获取最新数据（不带参数）
    if (!startIssue && !endIssue) {
      console.log('从 500.com 获取最新数据...');
      
      const response = await fetch(this.baseUrl, {
        headers: this.headers
      });

      if (!response.ok) {
        // 发送网络错误通知
        if (typeof handleNetworkError !== 'undefined') {
          await handleNetworkError(globalThis.env, response.status, this.baseUrl, 'ssq');
        }
        throw new Error(`HTTP ${response.status}`);
      }

      const html = await response.text();
      const data = this.parse500Html(html, true);
      
      if (!data || data.length === 0) {
        throw new Error('500.com 未返回数据');
      }
      
      // 如果指定了 count，则限制返回数量；否则返回所有数据
      const result = count ? data.slice(0, count) : data;
      console.log(`成功获取 ${data.length} 条数据，返回 ${result.length} 条`);
      return result;
    }
    
    // 场景2: 按期号范围获取
    const url = `${this.baseUrl}?start=${startIssue}&end=${endIssue}`;
    console.log(`从 500.com 获取期号范围数据: ${startIssue} - ${endIssue}`);
    
    const response = await fetch(url, {
      headers: this.headers
    });

    if (!response.ok) {
      // 发送网络错误通知
      if (typeof handleNetworkError !== 'undefined') {
        await handleNetworkError(globalThis.env, response.status, url, 'ssq');
      }
      throw new Error(`HTTP ${response.status}`);
    }

    const html = await response.text();
    const data = this.parse500Html(html);
    
    return data;
  }

  // 兼容旧接口
  async fetchLatest() {
    const data = await this.fetch();
    return data[0];
  }

  async fetch500comByRange(startIssue, endIssue) {
    return this.fetch(startIssue, endIssue);
  }

  /**
   * 解析 500.com 的 HTML 数据
   * @param {string} html - HTML 内容
   * @param {boolean} onlyFirst - 是否只解析第一条（用于获取最新数据）
   */
  parse500Html(html, onlyFirst = false) {
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
            
            // 如果只需要第一条，立即返回
            if (onlyFirst && results.length === 1) {
              console.log(`成功解析最新数据: ${lotteryNo}`);
              return results;
            }
          }
        } catch (e) {
          console.error('解析行数据失败:', e);
        }
      }
      
      if (!onlyFirst) {
        console.log(`成功解析 ${results.length} 条数据`);
      }
    } catch (error) {
      console.error('解析 500.com HTML 失败:', error);
    }
    
    return results;
  }


}
