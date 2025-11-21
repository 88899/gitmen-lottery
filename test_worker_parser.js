// 测试 Worker 版本的解析逻辑
const fs = require('fs');

// 读取实际的 HTML
const qxcHtml = fs.readFileSync('/tmp/qxc_test.html', 'utf-8');
const qlcHtml = fs.readFileSync('/tmp/qlc_test.html', 'utf-8');

console.log('='.repeat(60));
console.log('测试七星彩解析逻辑');
console.log('='.repeat(60));

// 七星彩解析逻辑
function parseQXC(html) {
  const data = [];
  
  try {
    // 找到 id="tablelist" 的表格
    const tableMatch = html.match(/<table[^>]*id="tablelist"[^>]*>([\s\S]*?)<\/table>/i);
    
    if (!tableMatch) {
      console.log(`⚠️ 未找到 id="tablelist" 的表格`);
      return data;
    }
    
    console.log(`找到数据表格`);
    
    const dataTableContent = tableMatch[1];
    const trMatches = [...dataTableContent.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)];
    console.log(`找到 ${trMatches.length} 行数据`);
    
    // 跳过表头（第一行），处理数据行
    for (let i = 1; i < Math.min(trMatches.length, 4); i++) {
      const trContent = trMatches[i][1];
      
      console.log(`\n--- 处理第 ${i} 行 ---`);
      
      const hasComments = /<!--[\s\S]*?-->/.test(trContent);
      console.log(`是否包含 HTML 注释: ${hasComments}`);
      
      try {
        // 先移除 HTML 注释
        const cleanTrContent = trContent.replace(/<!--[\s\S]*?-->/g, '');
        
        const tdMatches = [...cleanTrContent.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)];
        
        console.log(`找到 ${tdMatches.length} 个 td`);
        
        if (tdMatches.length < 5) {
          console.log(`⚠️ td 数量不足，跳过`);
          continue;
        }
        
        const cells = tdMatches.map(m => 
          m[1]
            .replace(/<[^>]+>/g, '')
            .replace(/&nbsp;/g, ' ')
            .replace(/,/g, '')
            .trim()
        );
        
        console.log(`单元格内容:`);
        cells.slice(0, 6).forEach((cell, idx) => {
          console.log(`  [${idx}]: "${cell}"`);
        });
        
        let lotteryNo = cells[0];
        if (!lotteryNo || !/^\d{5,7}$/.test(lotteryNo)) {
          console.log(`⚠️ 期号格式不对: "${lotteryNo}"`);
          continue;
        }
        
        if (lotteryNo.length === 5) {
          lotteryNo = '20' + lotteryNo;
        }
        
        const numbersText = cells[1];
        const numbers = numbersText.split(/\s+/).map(n => parseInt(n)).filter(n => !isNaN(n));
        
        console.log(`号码解析: "${numbersText}" -> [${numbers.join(', ')}]`);
        
        if (numbers.length !== 7) {
          console.log(`⚠️ 号码数量不对: ${numbers.length}`);
          continue;
        }
        
        const drawDate = cells[4];
        if (!/^\d{4}-\d{2}-\d{2}$/.test(drawDate)) {
          console.log(`⚠️ 日期格式不对: "${drawDate}"`);
          continue;
        }
        
        console.log(`✅ 解析成功: ${lotteryNo}, ${numbers.join(' ')}, ${drawDate}`);
        
        data.push({
          lottery_no: lotteryNo,
          draw_date: drawDate,
          numbers: numbers
        });
        
      } catch (e) {
        console.log(`❌ 解析失败: ${e.message}`);
      }
    }
    
  } catch (e) {
    console.log(`❌ 整体解析失败: ${e.message}`);
    console.log(e.stack);
  }
  
  return data;
}

// 七乐彩解析逻辑
function parseQLC(html) {
  const data = [];
  
  try {
    const tableMatch = html.match(/<table[^>]*id="tablelist"[^>]*>([\s\S]*?)<\/table>/i);
    
    if (!tableMatch) {
      console.log(`⚠️ 未找到 id="tablelist" 的表格`);
      return data;
    }
    
    console.log(`找到数据表格`);
    
    const dataTableContent = tableMatch[1];
    const trMatches = [...dataTableContent.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)];
    console.log(`找到 ${trMatches.length} 行数据`);
    
    for (let i = 1; i < Math.min(trMatches.length, 4); i++) {
      const trContent = trMatches[i][1];
      
      console.log(`\n--- 处理第 ${i} 行 ---`);
      
      const hasComments = /<!--[\s\S]*?-->/.test(trContent);
      console.log(`是否包含 HTML 注释: ${hasComments}`);
      
      try {
        const cleanTrContent = trContent.replace(/<!--[\s\S]*?-->/g, '');
        
        const tdMatches = [...cleanTrContent.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)];
        
        console.log(`找到 ${tdMatches.length} 个 td`);
        
        if (tdMatches.length < 6) {
          console.log(`⚠️ td 数量不足，跳过`);
          continue;
        }
        
        const cells = tdMatches.map(m => 
          m[1]
            .replace(/<[^>]+>/g, '')
            .replace(/&nbsp;/g, ' ')
            .replace(/,/g, '')
            .trim()
        );
        
        console.log(`单元格内容:`);
        cells.slice(0, 7).forEach((cell, idx) => {
          console.log(`  [${idx}]: "${cell}"`);
        });
        
        let lotteryNo = cells[0];
        if (!lotteryNo || !/^\d{5,7}$/.test(lotteryNo)) {
          console.log(`⚠️ 期号格式不对: "${lotteryNo}"`);
          continue;
        }
        
        if (lotteryNo.length === 5) {
          lotteryNo = '20' + lotteryNo;
        }
        
        const numbersText = cells[1];
        console.log(`原始号码文本: "${numbersText}"`);
        
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
        
        console.log(`号码解析: [${numbers.join(', ')}]`);
        
        if (numbers.length !== 8) {
          console.log(`⚠️ 号码数量不对: ${numbers.length} (应该是8个)`);
          continue;
        }
        
        const drawDate = cells[5];
        if (!/^\d{4}-\d{2}-\d{2}$/.test(drawDate)) {
          console.log(`⚠️ 日期格式不对: "${drawDate}"`);
          continue;
        }
        
        console.log(`✅ 解析成功: ${lotteryNo}, 基本号: ${numbers.slice(0, 7).join(' ')}, 特别号: ${numbers[7]}, ${drawDate}`);
        
        data.push({
          lottery_no: lotteryNo,
          draw_date: drawDate,
          basic_balls: numbers.slice(0, 7),
          special_ball: numbers[7]
        });
        
      } catch (e) {
        console.log(`❌ 解析失败: ${e.message}`);
      }
    }
    
  } catch (e) {
    console.log(`❌ 整体解析失败: ${e.message}`);
  }
  
  return data;
}

// 执行测试
const qxcData = parseQXC(qxcHtml);
console.log(`\n✅ 七星彩解析结果: ${qxcData.length} 条数据\n`);

console.log('='.repeat(60));
console.log('测试七乐彩解析逻辑');
console.log('='.repeat(60));

const qlcData = parseQLC(qlcHtml);
console.log(`\n✅ 七乐彩解析结果: ${qlcData.length} 条数据`);
