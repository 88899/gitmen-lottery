/**
 * 历史记录查询页面 HTML
 */

export const historyPageHTML = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>彩票历史记录查询</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      padding: 20px;
    }
    
    .container {
      max-width: 1200px;
      margin: 0 auto;
      background: white;
      border-radius: 12px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.1);
      overflow: hidden;
    }
    
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px;
      text-align: center;
    }
    
    .header h1 {
      font-size: 28px;
      margin-bottom: 10px;
    }
    
    .header p {
      opacity: 0.9;
      font-size: 14px;
    }
    
    .content {
      padding: 30px;
    }
    
    .lottery-tabs {
      display: flex;
      gap: 10px;
      margin-bottom: 30px;
      flex-wrap: wrap;
    }
    
    .lottery-tab {
      padding: 12px 24px;
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      background: white;
      cursor: pointer;
      transition: all 0.3s;
      font-size: 14px;
      font-weight: 500;
    }
    
    .lottery-tab:hover {
      border-color: #667eea;
      color: #667eea;
    }
    
    .lottery-tab.active {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border-color: transparent;
    }
    
    .search-box {
      background: #f8f9fa;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 30px;
    }
    
    .search-row {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 15px;
      margin-bottom: 15px;
    }
    
    .search-field {
      display: flex;
      flex-direction: column;
    }
    
    .search-field label {
      font-size: 13px;
      color: #666;
      margin-bottom: 5px;
      font-weight: 500;
    }
    
    .search-field input {
      padding: 10px;
      border: 1px solid #ddd;
      border-radius: 6px;
      font-size: 14px;
      transition: border-color 0.3s;
    }
    
    .search-field input:focus {
      outline: none;
      border-color: #667eea;
    }
    
    .ball-selector {
      margin-top: 15px;
      padding: 15px;
      background: white;
      border-radius: 6px;
      border: 1px solid #e0e0e0;
    }
    
    .ball-selector-title {
      font-size: 13px;
      color: #666;
      margin-bottom: 10px;
      font-weight: 500;
    }
    
    .ball-selector-group {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 15px;
    }
    
    .ball-selector-group:last-child {
      margin-bottom: 0;
    }
    
    .selectable-ball {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      font-size: 13px;
      cursor: pointer;
      transition: all 0.2s;
      border: 2px solid transparent;
    }
    
    .selectable-ball.red {
      background: linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%);
      color: white;
    }
    
    .selectable-ball.blue {
      background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
      color: white;
    }
    
    .selectable-ball:hover {
      transform: scale(1.1);
      box-shadow: 0 4px 8px rgba(0,0,0,0.2);
    }
    
    .selectable-ball.selected {
      border-color: #333;
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.3);
    }
    
    .search-actions {
      display: flex;
      gap: 10px;
      justify-content: flex-end;
    }
    
    .btn {
      padding: 10px 24px;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
      transition: all 0.3s;
    }
    
    .btn-primary {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }
    
    .btn-primary:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
    }
    
    .btn-secondary {
      background: white;
      color: #666;
      border: 1px solid #ddd;
    }
    
    .btn-secondary:hover {
      background: #f8f9fa;
    }
    
    .loading {
      text-align: center;
      padding: 40px;
      color: #999;
    }
    
    .error {
      background: #fee;
      color: #c33;
      padding: 15px;
      border-radius: 6px;
      margin-bottom: 20px;
    }
    
    .history-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }
    
    .history-table th {
      background: #f8f9fa;
      padding: 15px;
      text-align: left;
      font-weight: 600;
      color: #333;
      border-bottom: 2px solid #e0e0e0;
      font-size: 13px;
    }
    
    .history-table td {
      padding: 15px;
      border-bottom: 1px solid #f0f0f0;
      font-size: 14px;
    }
    
    .history-table tr:hover {
      background: #f8f9fa;
    }
    
    .balls-container {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }
    
    .ball {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      font-size: 13px;
      color: white;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    
    .ball-red {
      background: linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%);
    }
    
    .ball-blue {
      background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
    }
    
    .ball-front {
      background: linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%);
    }
    
    .ball-back {
      background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
    }
    
    .ball-basic {
      background: linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%);
    }
    
    .ball-special {
      background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
    }
    
    .ball-number {
      background: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%);
      color: #333;
    }
    
    .pagination {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 10px;
      margin-top: 30px;
    }
    
    .pagination button {
      padding: 8px 16px;
      border: 1px solid #ddd;
      background: white;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.3s;
    }
    
    .pagination button:hover:not(:disabled) {
      background: #667eea;
      color: white;
      border-color: #667eea;
    }
    
    .pagination button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    
    .pagination .page-info {
      color: #666;
      font-size: 14px;
    }
    
    .empty-state {
      text-align: center;
      padding: 60px 20px;
      color: #999;
    }
    
    .empty-state svg {
      width: 80px;
      height: 80px;
      margin-bottom: 20px;
      opacity: 0.3;
    }
    
    @media (max-width: 768px) {
      .search-row {
        grid-template-columns: 1fr;
      }
      
      .history-table {
        font-size: 12px;
      }
      
      .history-table th,
      .history-table td {
        padding: 10px;
      }
      
      .ball {
        width: 28px;
        height: 28px;
        font-size: 12px;
      }
      
      .selectable-ball {
        width: 32px;
        height: 32px;
        font-size: 12px;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎲 彩票历史记录查询</h1>
      <p>查询双色球、大乐透、七星彩、七乐彩的历史开奖记录</p>
    </div>
    
    <div class="content">
      <div class="lottery-tabs">
        <div class="lottery-tab active" data-type="ssq">双色球</div>
        <div class="lottery-tab" data-type="dlt">大乐透</div>
        <div class="lottery-tab" data-type="qxc">七星彩</div>
        <div class="lottery-tab" data-type="qlc">七乐彩</div>
      </div>
      
      <div class="search-box">
        <div class="search-row">
          <div class="search-field">
            <label>期号</label>
            <input type="text" id="issueNo" placeholder="例如：2025001">
          </div>
          <div class="search-field">
            <label>开奖日期</label>
            <input type="date" id="drawDate">
          </div>
          <div class="search-field">
            <label>号码查询</label>
            <input type="text" id="numbers" placeholder="">
          </div>
        </div>
        
        <div class="ball-selector" id="ballSelector">
          <div class="ball-selector-title">点选号码查询</div>
          <div id="ballSelectorContent"></div>
        </div>
        
        <div class="search-actions">
          <button class="btn btn-secondary" onclick="resetSearch()">重置</button>
          <button class="btn btn-primary" onclick="search()">查询</button>
        </div>
      </div>
      
      <div id="errorMessage" class="error" style="display: none;"></div>
      <div id="loading" class="loading" style="display: none;">加载中...</div>
      <div id="results"></div>
      <div id="pagination" class="pagination" style="display: none;"></div>
    </div>
  </div>
  
  <script>
    let currentType = 'ssq';
    let currentPage = 1;
    let currentFilters = {};
    let selectedBalls = { red: [], blue: [] };
    
    // 彩票配置
    const lotteryConfig = {
      ssq: {
        name: '双色球',
        placeholder: '例如：02,09,12,13,15,24-03',
        redRange: [1, 33],
        blueRange: [1, 16],
        redLabel: '红球',
        blueLabel: '蓝球'
      },
      dlt: {
        name: '大乐透',
        placeholder: '例如：22,24,29,31,35-04,11',
        redRange: [1, 35],
        blueRange: [1, 12],
        redLabel: '前区',
        blueLabel: '后区'
      },
      qxc: {
        name: '七星彩',
        placeholder: '例如：8,5,5,8,5,1,1',
        redRange: [0, 9],
        blueRange: null,
        redLabel: '号码',
        blueLabel: null
      },
      qlc: {
        name: '七乐彩',
        placeholder: '例如：04,14,19,22,26,29,30-11',
        redRange: [1, 30],
        blueRange: [1, 30],
        redLabel: '基本号',
        blueLabel: '特别号'
      }
    };
    
    // 初始化球号选择器
    function initBallSelector() {
      const config = lotteryConfig[currentType];
      const content = document.getElementById('ballSelectorContent');
      
      let html = '';
      
      // 红球/前区/基本号/号码
      html += \`<div class="ball-selector-title">\${config.redLabel}</div>\`;
      html += '<div class="ball-selector-group">';
      for (let i = config.redRange[0]; i <= config.redRange[1]; i++) {
        const num = String(i).padStart(2, '0');
        html += \`<div class="selectable-ball red" data-type="red" data-value="\${num}">\${num}</div>\`;
      }
      html += '</div>';
      
      // 蓝球/后区/特别号
      if (config.blueRange) {
        html += \`<div class="ball-selector-title">\${config.blueLabel}</div>\`;
        html += '<div class="ball-selector-group">';
        for (let i = config.blueRange[0]; i <= config.blueRange[1]; i++) {
          const num = String(i).padStart(2, '0');
          html += \`<div class="selectable-ball blue" data-type="blue" data-value="\${num}">\${num}</div>\`;
        }
        html += '</div>';
      }
      
      content.innerHTML = html;
      
      // 绑定点击事件
      document.querySelectorAll('.selectable-ball').forEach(ball => {
        ball.addEventListener('click', function() {
          const type = this.dataset.type;
          const value = this.dataset.value;
          
          if (this.classList.contains('selected')) {
            this.classList.remove('selected');
            selectedBalls[type] = selectedBalls[type].filter(v => v !== value);
          } else {
            this.classList.add('selected');
            if (!selectedBalls[type].includes(value)) {
              selectedBalls[type].push(value);
            }
          }
        });
      });
    }
    
    // 更新号码输入框提示
    function updatePlaceholder() {
      const config = lotteryConfig[currentType];
      document.getElementById('numbers').placeholder = config.placeholder;
    }
    
    // 切换彩票类型
    document.querySelectorAll('.lottery-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.lottery-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        currentType = tab.dataset.type;
        currentPage = 1;
        
        // 清空查询条件
        document.getElementById('issueNo').value = '';
        document.getElementById('drawDate').value = '';
        document.getElementById('numbers').value = '';
        currentFilters = {};
        selectedBalls = { red: [], blue: [] };
        
        // 更新UI
        updatePlaceholder();
        initBallSelector();
        
        // 加载数据
        loadData();
      });
    });
    
    // 加载数据
    async function loadData() {
      const loading = document.getElementById('loading');
      const results = document.getElementById('results');
      const pagination = document.getElementById('pagination');
      const errorMessage = document.getElementById('errorMessage');
      
      loading.style.display = 'block';
      results.innerHTML = '';
      pagination.style.display = 'none';
      errorMessage.style.display = 'none';
      
      try {
        const params = new URLSearchParams({
          page: currentPage,
          limit: 10,
          ...currentFilters
        });
        
        const response = await fetch(\`/api/history/\${currentType}?\${params}\`);
        const data = await response.json();
        
        if (!data.success) {
          throw new Error(data.error || '加载失败');
        }
        
        renderTable(data.data, data.total);
        renderPagination(data.page, data.totalPages, data.total);
      } catch (error) {
        errorMessage.textContent = error.message;
        errorMessage.style.display = 'block';
      } finally {
        loading.style.display = 'none';
      }
    }
    
    // 渲染表格
    function renderTable(data, total) {
      const results = document.getElementById('results');
      
      if (!data || data.length === 0) {
        results.innerHTML = \`
          <div class="empty-state">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
            </svg>
            <p>暂无数据</p>
          </div>
        \`;
        return;
      }
      
      let tableHTML = '<table class="history-table"><thead><tr>';
      tableHTML += '<th>期号</th><th>开奖日期</th>';
      
      if (currentType === 'ssq') {
        tableHTML += '<th>红球</th><th>蓝球</th>';
      } else if (currentType === 'dlt') {
        tableHTML += '<th>前区</th><th>后区</th>';
      } else if (currentType === 'qxc') {
        tableHTML += '<th>号码</th>';
      } else if (currentType === 'qlc') {
        tableHTML += '<th>基本号</th><th>特别号</th>';
      }
      
      tableHTML += '</tr></thead><tbody>';
      
      data.forEach(item => {
        tableHTML += '<tr>';
        tableHTML += \`<td><strong>\${item.lottery_no}</strong></td>\`;
        tableHTML += \`<td>\${item.draw_date}</td>\`;
        
        if (currentType === 'ssq') {
          tableHTML += \`<td><div class="balls-container">\${renderBalls(item.red_balls, 'red')}</div></td>\`;
          tableHTML += \`<td><div class="balls-container">\${renderBall(item.blue_ball, 'blue')}</div></td>\`;
        } else if (currentType === 'dlt') {
          tableHTML += \`<td><div class="balls-container">\${renderBalls(item.front_balls, 'front')}</div></td>\`;
          tableHTML += \`<td><div class="balls-container">\${renderBalls(item.back_balls, 'back')}</div></td>\`;
        } else if (currentType === 'qxc') {
          tableHTML += \`<td><div class="balls-container">\${renderBalls(item.numbers, 'number')}</div></td>\`;
        } else if (currentType === 'qlc') {
          tableHTML += \`<td><div class="balls-container">\${renderBalls(item.basic_balls, 'basic')}</div></td>\`;
          tableHTML += \`<td><div class="balls-container">\${renderBall(item.special_ball, 'special')}</div></td>\`;
        }
        
        tableHTML += '</tr>';
      });
      
      tableHTML += '</tbody></table>';
      results.innerHTML = tableHTML;
    }
    
    // 渲染球号
    function renderBalls(balls, type) {
      if (!balls) return '';
      const ballsArray = Array.isArray(balls) ? balls : balls.split(',');
      return ballsArray.map(ball => renderBall(ball, type)).join('');
    }
    
    function renderBall(ball, type) {
      return \`<div class="ball ball-\${type}">\${ball}</div>\`;
    }
    
    // 渲染分页
    function renderPagination(page, totalPages, total) {
      const pagination = document.getElementById('pagination');
      
      if (totalPages <= 1) {
        pagination.style.display = 'none';
        return;
      }
      
      pagination.style.display = 'flex';
      pagination.innerHTML = \`
        <button onclick="goToPage(1)" \${page === 1 ? 'disabled' : ''}">首页</button>
        <button onclick="goToPage(\${page - 1})" \${page === 1 ? 'disabled' : ''}">上一页</button>
        <span class="page-info">第 \${page} / \${totalPages} 页 (共 \${total} 条)</span>
        <button onclick="goToPage(\${page + 1})" \${page === totalPages ? 'disabled' : ''}">下一页</button>
        <button onclick="goToPage(\${totalPages})" \${page === totalPages ? 'disabled' : ''}">末页</button>
      \`;
    }
    
    // 跳转页面
    function goToPage(page) {
      currentPage = page;
      loadData();
    }
    
    // 搜索
    function search() {
      const issueNo = document.getElementById('issueNo').value.trim();
      const drawDate = document.getElementById('drawDate').value;
      const numbersInput = document.getElementById('numbers').value.trim();
      
      currentFilters = {};
      
      // 期号查询（安全验证）
      if (issueNo) {
        if (!/^[0-9]{7}$/.test(issueNo)) {
          alert('期号格式错误，应为7位数字，例如：2025001');
          return;
        }
        currentFilters.lottery_no = issueNo;
      }
      
      // 日期查询
      if (drawDate) {
        currentFilters.draw_date = drawDate;
      }
      
      // 号码查询（手动输入）
      if (numbersInput) {
        currentFilters.numbers = numbersInput;
      }
      
      // 号码查询（点选）
      if (selectedBalls.red.length > 0 || selectedBalls.blue.length > 0) {
        let ballQuery = '';
        if (selectedBalls.red.length > 0) {
          ballQuery = selectedBalls.red.join(',');
        }
        if (selectedBalls.blue.length > 0) {
          if (ballQuery) ballQuery += '-';
          ballQuery += selectedBalls.blue.join(',');
        }
        currentFilters.numbers = ballQuery;
      }
      
      currentPage = 1;
      loadData();
    }
    
    // 重置搜索
    function resetSearch() {
      document.getElementById('issueNo').value = '';
      document.getElementById('drawDate').value = '';
      document.getElementById('numbers').value = '';
      currentFilters = {};
      selectedBalls = { red: [], blue: [] };
      currentPage = 1;
      
      // 清除选中状态
      document.querySelectorAll('.selectable-ball.selected').forEach(ball => {
        ball.classList.remove('selected');
      });
      
      loadData();
    }
    
    // 回车搜索
    document.querySelectorAll('.search-field input').forEach(input => {
      input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') search();
      });
    });
    
    // 初始化
    updatePlaceholder();
    initBallSelector();
    loadData();
  </script>
</body>
</html>`;
