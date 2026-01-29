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
      max-width: 1400px;
      margin: 0 auto;
      background: white;
      border-radius: 12px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.1);
      overflow: hidden;
    }
    
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 15px 30px;
      text-align: center;
    }
    
    .header h1 {
      font-size: 18px;
      font-weight: 600;
      margin-bottom: 5px;
    }
    
    .header p {
      opacity: 0.9;
      font-size: 12px;
    }
    
    .toolbar {
      display: flex;
      align-items: center;
      padding: 20px 30px;
      border-bottom: 1px solid #e0e0e0;
    }
    
    .lottery-tabs {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
    }
    
    .lottery-tab {
      padding: 10px 20px;
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
    
    .toolbar-spacer {
      flex: 1;
      min-width: 20px;
    }
    
    .search-bar {
      display: flex;
      gap: 10px;
      align-items: center;
      flex-wrap: wrap;
    }
    
    .search-input {
      padding: 8px 12px;
      border: 1px solid #ddd;
      border-radius: 6px;
      font-size: 13px;
      transition: border-color 0.3s;
      min-width: 140px;
    }
    
    .search-input#numbers {
      min-width: 220px;
    }
    
    .search-input:focus {
      outline: none;
      border-color: #667eea;
    }
    
    .search-input::placeholder {
      color: #999;
    }
    
    .btn {
      padding: 8px 16px;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 13px;
      font-weight: 500;
      transition: all 0.3s;
      white-space: nowrap;
    }
    
    .btn-primary {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }
    
    .btn-primary:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
    }
    
    .btn-secondary {
      background: white;
      color: #666;
      border: 1px solid #ddd;
    }
    
    .btn-secondary:hover {
      background: #f0f0f0;
    }
    
    .btn-predict {
      background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
      color: white;
    }
    
    .btn-predict:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(245, 87, 108, 0.4);
    }
    
    .main-content {
      display: flex;
      min-height: 600px;
    }
    
    .sidebar {
      width: 280px;
      background: #f8f9fa;
      padding: 20px;
      border-right: 1px solid #e0e0e0;
      overflow-y: auto;
      max-height: calc(100vh - 200px);
    }
    
    .content-area {
      flex: 1;
      padding: 30px;
      overflow-y: auto;
    }
    
    .section-title {
      font-size: 13px;
      font-weight: 600;
      color: #333;
      margin-bottom: 12px;
      padding-bottom: 6px;
      border-bottom: 2px solid #667eea;
    }
    
    .ball-selector-section {
      margin-bottom: 20px;
    }
    
    .ball-selector-group {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 10px;
    }
    
    .selectable-ball {
      width: 30px;
      height: 30px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      font-size: 11px;
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
      transform: scale(1.15);
      box-shadow: 0 3px 6px rgba(0,0,0,0.2);
    }
    
    .selectable-ball.selected {
      border-color: #333;
      box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.4);
      transform: scale(1.1);
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
      padding: 12px;
      text-align: left;
      font-weight: 600;
      color: #333;
      border-bottom: 2px solid #e0e0e0;
      font-size: 13px;
    }
    
    .history-table td {
      padding: 12px;
      border-bottom: 1px solid #f0f0f0;
      font-size: 13px;
    }
    
    .history-table tr:hover {
      background: #f8f9fa;
    }
    
    .balls-container {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
    }
    
    .ball {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      font-size: 11px;
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
      padding: 6px 14px;
      border: 1px solid #ddd;
      background: white;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.3s;
      font-size: 13px;
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
      font-size: 13px;
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
    
    .prediction-modal {
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      z-index: 1000;
      align-items: center;
      justify-content: center;
    }
    
    .prediction-modal.show {
      display: flex;
    }
    
    .prediction-content {
      background: white;
      border-radius: 12px;
      padding: 0;
      max-width: 900px;
      width: 90%;
      max-height: 85vh;
      overflow: hidden;
      box-shadow: 0 10px 40px rgba(0,0,0,0.3);
      position: relative;
      display: flex;
      flex-direction: column;
    }
    
    .prediction-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px 30px;
      border-bottom: 2px solid #e0e0e0;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }
    
    .prediction-header h2 {
      font-size: 20px;
      margin: 0;
    }
    
    .prediction-header-actions {
      display: flex;
      gap: 10px;
      align-items: center;
    }
    
    .btn-copy-modal {
      padding: 8px 16px;
      background: rgba(255, 255, 255, 0.2);
      color: white;
      border: 1px solid rgba(255, 255, 255, 0.3);
      border-radius: 6px;
      cursor: pointer;
      font-size: 13px;
      transition: all 0.3s;
    }
    
    .btn-copy-modal:hover {
      background: rgba(255, 255, 255, 0.3);
    }
    
    .btn-copy-modal.copied {
      background: rgba(56, 239, 125, 0.3);
      border-color: rgba(56, 239, 125, 0.5);
    }
    
    .close-btn {
      background: none;
      border: none;
      font-size: 28px;
      color: white;
      cursor: pointer;
      padding: 0;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      transition: all 0.3s;
    }
    
    .close-btn:hover {
      background: rgba(255, 255, 255, 0.2);
    }
    
    .prediction-body {
      flex: 1;
      overflow-y: auto;
      padding: 30px;
    }
    
    .prediction-item {
      background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
      border-radius: 8px;
      padding: 15px;
      margin-bottom: 15px;
      border-left: 4px solid #667eea;
    }
    
    .prediction-rank {
      display: inline-block;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: bold;
      margin-right: 10px;
    }
    
    .prediction-strategy {
      display: inline-block;
      background: white;
      color: #666;
      padding: 4px 10px;
      border-radius: 8px;
      font-size: 11px;
      margin-left: 10px;
    }
    
    .prediction-balls {
      margin-top: 12px;
    }
    
    .prediction-loading {
      text-align: center;
      padding: 40px;
      color: #999;
    }
    
    .prediction-error {
      background: #fee;
      color: #c33;
      padding: 15px;
      border-radius: 6px;
      margin-bottom: 20px;
    }
    
    .prediction-footer {
      padding: 15px 30px;
      text-align: center;
      color: #999;
      font-size: 12px;
      border-top: 1px solid #e0e0e0;
      background: #f8f9fa;
    }
    
    @media (max-width: 1024px) {
      .toolbar {
        flex-direction: column;
        align-items: stretch;
      }
      
      .toolbar-spacer {
        display: none;
      }
      
      .lottery-tabs {
        justify-content: center;
      }
      
      .search-bar {
        width: 100%;
        justify-content: center;
      }
      
      .main-content {
        flex-direction: column;
      }
      
      .sidebar {
        width: 100%;
        max-height: none;
        border-right: none;
        border-bottom: 1px solid #e0e0e0;
      }
    }
    
    @media (max-width: 768px) {
      .search-bar {
        flex-direction: column;
        align-items: stretch;
      }
      
      .search-input {
        width: 100%;
      }
      
      .history-table {
        font-size: 11px;
      }
      
      .history-table th,
      .history-table td {
        padding: 8px;
      }
      
      .ball {
        width: 24px;
        height: 24px;
        font-size: 10px;
      }
      
      .selectable-ball {
        width: 26px;
        height: 26px;
        font-size: 10px;
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
    
    <div class="toolbar">
      <div class="lottery-tabs">
        <div class="lottery-tab active" data-type="ssq">双色球</div>
        <div class="lottery-tab" data-type="dlt">大乐透</div>
        <div class="lottery-tab" data-type="qxc">七星彩</div>
        <div class="lottery-tab" data-type="qlc">七乐彩</div>
      </div>
      
      <div class="toolbar-spacer"></div>
      
      <div class="search-bar">
        <input type="text" id="issueNo" class="search-input" placeholder="期号：2025001">
        <input type="date" id="drawDate" class="search-input">
        <input type="text" id="numbers" class="search-input" placeholder="">
        <button class="btn btn-primary" onclick="search()">查询</button>
        <button class="btn btn-secondary" onclick="resetSearch()">重置</button>
        <button class="btn btn-predict" onclick="showPrediction()">预测</button>
      </div>
    </div>
    
    <div class="main-content">
      <div class="sidebar">
        <div class="ball-selector-section" id="redBallSection">
          <div class="section-title" id="redBallTitle">红球</div>
          <div class="ball-selector-group" id="redBallSelector"></div>
        </div>
        
        <div class="ball-selector-section" id="blueBallSection">
          <div class="section-title" id="blueBallTitle">蓝球</div>
          <div class="ball-selector-group" id="blueBallSelector"></div>
        </div>
      </div>
      
      <div class="content-area">
        <div id="errorMessage" class="error" style="display: none;"></div>
        <div id="loading" class="loading" style="display: none;">加载中...</div>
        <div id="results"></div>
        <div id="pagination" class="pagination" style="display: none;"></div>
      </div>
    </div>
  </div>
  
  <!-- 预测弹窗（备用方案） -->
  <div id="predictionModal" class="prediction-modal">
    <div class="prediction-content">
      <div class="prediction-header">
        <h2 id="predictionTitle">预测结果</h2>
        <div class="prediction-header-actions">
          <button class="btn-copy-modal" onclick="copyModalToClipboard()">📋 复制</button>
          <button class="close-btn" onclick="closePrediction()">&times;</button>
        </div>
      </div>
      <div class="prediction-body">
        <div id="predictionLoading" class="prediction-loading" style="display: none;">正在生成预测...</div>
        <div id="predictionError" class="prediction-error" style="display: none;"></div>
        <div id="predictionResults"></div>
      </div>
      <div class="prediction-footer">
        <p>⚠️ 预测结果仅供参考，不构成任何投注建议</p>
      </div>
    </div>
  </div>
  
  <script>
    let currentType = 'ssq';
    let currentPage = 1;
    let currentFilters = {};
    
    // 彩票配置
    const lotteryConfig = {
      ssq: {
        name: '双色球',
        placeholder: '例如：02,06,08,12,22,31-03',
        redRange: [1, 33],
        blueRange: [1, 16],
        redLabel: '红球',
        blueLabel: '蓝球'
      },
      dlt: {
        name: '大乐透',
        placeholder: '例如：01,02,03,04,05-06,07',
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
      
      // 更新标题
      document.getElementById('redBallTitle').textContent = config.redLabel;
      
      // 红球/前区/基本号/号码
      const redContainer = document.getElementById('redBallSelector');
      let redHtml = '';
      for (let i = config.redRange[0]; i <= config.redRange[1]; i++) {
        // 七星彩不补零，其他彩票补零
        const num = currentType === 'qxc' ? String(i) : String(i).padStart(2, '0');
        redHtml += \`<div class="selectable-ball red" data-type="red" data-value="\${num}">\${num}</div>\`;
      }
      redContainer.innerHTML = redHtml;
      
      // 蓝球/后区/特别号
      const blueBallSection = document.getElementById('blueBallSection');
      if (config.blueRange) {
        blueBallSection.style.display = 'block';
        document.getElementById('blueBallTitle').textContent = config.blueLabel;
        
        const blueContainer = document.getElementById('blueBallSelector');
        let blueHtml = '';
        for (let i = config.blueRange[0]; i <= config.blueRange[1]; i++) {
          const num = String(i).padStart(2, '0');
          blueHtml += \`<div class="selectable-ball blue" data-type="blue" data-value="\${num}">\${num}</div>\`;
        }
        blueContainer.innerHTML = blueHtml;
      } else {
        blueBallSection.style.display = 'none';
      }
      
      // 绑定点击事件（点击即查询）
      document.querySelectorAll('.selectable-ball').forEach(ball => {
        ball.addEventListener('click', function() {
          // 清除所有选中状态
          document.querySelectorAll('.selectable-ball.selected').forEach(b => {
            b.classList.remove('selected');
          });
          
          // 选中当前球
          this.classList.add('selected');
          
          // 立即查询（传递球类型）
          const value = this.dataset.value;
          const type = this.dataset.type;
          searchByBall(value, type);
        });
      });
    }
    
    // 通过球号查询
    function searchByBall(ballNumber, ballType) {
      // 清空其他查询条件
      document.getElementById('issueNo').value = '';
      document.getElementById('drawDate').value = '';
      document.getElementById('numbers').value = '';
      
      // 根据球类型设置号码查询条件
      if (currentType === 'ssq') {
        // 双色球：红球或蓝球
        if (ballType === 'red') {
          currentFilters = { numbers: ballNumber }; // 只查红球
        } else {
          currentFilters = { numbers: '-' + ballNumber }; // 只查蓝球
        }
      } else if (currentType === 'dlt') {
        // 大乐透：前区或后区
        if (ballType === 'red') {
          currentFilters = { numbers: ballNumber }; // 只查前区
        } else {
          currentFilters = { numbers: '-' + ballNumber }; // 只查后区
        }
      } else if (currentType === 'qxc') {
        // 七星彩：只有号码
        currentFilters = { numbers: ballNumber };
      } else if (currentType === 'qlc') {
        // 七乐彩：基本号或特别号
        if (ballType === 'red') {
          currentFilters = { numbers: ballNumber }; // 只查基本号
        } else {
          currentFilters = { numbers: '-' + ballNumber }; // 只查特别号
        }
      }
      
      currentPage = 1;
      loadData();
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
      
      // 优先级：期号 > 号码 > 日期
      if (issueNo) {
        if (!/^[0-9]{7}$/.test(issueNo)) {
          alert('期号格式错误，应为7位数字，例如：2025001');
          return;
        }
        currentFilters.lottery_no = issueNo;
      } else if (numbersInput) {
        currentFilters.numbers = numbersInput;
      } else if (drawDate) {
        currentFilters.draw_date = drawDate;
      }
      
      // 清除球号选中状态
      document.querySelectorAll('.selectable-ball.selected').forEach(ball => {
        ball.classList.remove('selected');
      });
      
      currentPage = 1;
      loadData();
    }
    
    // 重置搜索
    function resetSearch() {
      document.getElementById('issueNo').value = '';
      document.getElementById('drawDate').value = '';
      document.getElementById('numbers').value = '';
      currentFilters = {};
      currentPage = 1;
      
      // 清除选中状态
      document.querySelectorAll('.selectable-ball.selected').forEach(ball => {
        ball.classList.remove('selected');
      });
      
      loadData();
    }
    
    // 回车搜索
    document.querySelectorAll('.search-input').forEach(input => {
      input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') search();
      });
    });
    
    // 初始化
    updatePlaceholder();
    initBallSelector();
    loadData();
    
    // 显示预测
    // 显示预测
    async function showPrediction() {
      try {
        const config = lotteryConfig[currentType];
        
        // 显示加载提示
        const loadingMsg = document.createElement('div');
        loadingMsg.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:white;padding:20px;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,0.3);z-index:9999;';
        loadingMsg.textContent = '正在生成预测...';
        document.body.appendChild(loadingMsg);
        
        const response = await fetch('/predict/' + currentType + '?count=5');
        const data = await response.json();
        
        document.body.removeChild(loadingMsg);
        
        if (!data || !data.predictions || data.predictions.length === 0) {
          throw new Error('预测结果为空');
        }
        
        // 打开新窗口显示预测结果
        openPredictionWindow(data.predictions, config);
      } catch (err) {
        // 移除加载提示（如果还存在）
        const loadingMsg = document.querySelector('div[style*="position:fixed"]');
        if (loadingMsg) document.body.removeChild(loadingMsg);
        alert('预测失败: ' + err.message);
      }
    }
    
    // 在新窗口中显示预测结果
    function openPredictionWindow(predictions, config) {
      const newWindow = window.open('', '_blank', 'width=900,height=700,scrollbars=yes');
      
      if (!newWindow) {
        // 如果无法打开新窗口（被浏览器拦截），使用弹窗
        showPredictionModal(predictions, config);
        return;
      }
      
      // 生成预测结果的文本格式（用于复制）
      const textContent = generatePredictionText(predictions, config);
      
      // 生成预测结果的 HTML
      const predictionsHTML = renderPredictionsHTMLForWindow(predictions);
      
      // 构建 HTML 内容
      const htmlParts = [];
      htmlParts.push('<!DOCTYPE html>');
      htmlParts.push('<html lang="zh-CN">');
      htmlParts.push('<head>');
      htmlParts.push('<meta charset="UTF-8">');
      htmlParts.push('<meta name="viewport" content="width=device-width, initial-scale=1.0">');
      htmlParts.push('<title>' + config.name + ' - 预测结果</title>');
      htmlParts.push('<style>');
      htmlParts.push('* { margin: 0; padding: 0; box-sizing: border-box; }');
      htmlParts.push('body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; padding: 20px; }');
      htmlParts.push('.container { max-width: 800px; margin: 0 auto; background: white; border-radius: 12px; box-shadow: 0 10px 40px rgba(0,0,0,0.2); overflow: hidden; }');
      htmlParts.push('.header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px 30px; text-align: center; }');
      htmlParts.push('.header h1 { font-size: 24px; font-weight: 600; margin-bottom: 8px; }');
      htmlParts.push('.header p { opacity: 0.9; font-size: 14px; }');
      htmlParts.push('.toolbar { padding: 20px 30px; border-bottom: 1px solid #e0e0e0; display: flex; justify-content: space-between; align-items: center; }');
      htmlParts.push('.btn { padding: 10px 20px; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 500; transition: all 0.3s; }');
      htmlParts.push('.btn-copy { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; }');
      htmlParts.push('.btn-copy:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(245, 87, 108, 0.4); }');
      htmlParts.push('.btn-copy.copied { background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); }');
      htmlParts.push('.content { padding: 30px; }');
      htmlParts.push('.prediction-item { background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); border-radius: 8px; padding: 20px; margin-bottom: 20px; border-left: 4px solid #667eea; }');
      htmlParts.push('.prediction-rank { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 6px 14px; border-radius: 12px; font-size: 14px; font-weight: bold; margin-right: 10px; }');
      htmlParts.push('.prediction-strategy { display: inline-block; background: white; color: #666; padding: 6px 12px; border-radius: 8px; font-size: 12px; margin-left: 10px; }');
      htmlParts.push('.prediction-balls { margin-top: 15px; }');
      htmlParts.push('.balls-container { display: flex; gap: 8px; flex-wrap: wrap; }');
      htmlParts.push('.ball { width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 14px; color: white; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }');
      htmlParts.push('.ball-red { background: linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%); }');
      htmlParts.push('.ball-blue { background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); }');
      htmlParts.push('.ball-front { background: linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%); }');
      htmlParts.push('.ball-back { background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); }');
      htmlParts.push('.ball-basic { background: linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%); }');
      htmlParts.push('.ball-special { background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); }');
      htmlParts.push('.ball-number { background: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%); color: #333; }');
      htmlParts.push('.footer { padding: 20px 30px; text-align: center; color: #999; font-size: 12px; border-top: 1px solid #e0e0e0; }');
      htmlParts.push('</style>');
      htmlParts.push('</head>');
      htmlParts.push('<body>');
      htmlParts.push('<div class="container">');
      htmlParts.push('<div class="header">');
      htmlParts.push('<h1>🎲 ' + config.name + ' - 预测结果</h1>');
      htmlParts.push('<p>生成时间：' + new Date().toLocaleString('zh-CN') + '</p>');
      htmlParts.push('</div>');
      htmlParts.push('<div class="toolbar">');
      htmlParts.push('<div>共 ' + predictions.length + ' 注预测</div>');
      htmlParts.push('<button class="btn btn-copy" onclick="copyToClipboard()">📋 复制到剪贴板</button>');
      htmlParts.push('</div>');
      htmlParts.push('<div class="content">');
      htmlParts.push(predictionsHTML);
      htmlParts.push('</div>');
      htmlParts.push('<div class="footer">');
      htmlParts.push('<p>⚠️ 预测结果仅供参考，不构成任何投注建议</p>');
      htmlParts.push('</div>');
      htmlParts.push('</div>');
      htmlParts.push('<script>');
      htmlParts.push('var textContent = ' + JSON.stringify(textContent) + ';');
      htmlParts.push('function copyToClipboard() {');
      htmlParts.push('  var btn = document.querySelector(".btn-copy");');
      htmlParts.push('  navigator.clipboard.writeText(textContent).then(function() {');
      htmlParts.push('    btn.textContent = "✓ 已复制";');
      htmlParts.push('    btn.classList.add("copied");');
      htmlParts.push('    setTimeout(function() {');
      htmlParts.push('      btn.textContent = "📋 复制到剪贴板";');
      htmlParts.push('      btn.classList.remove("copied");');
      htmlParts.push('    }, 2000);');
      htmlParts.push('  }).catch(function(err) {');
      htmlParts.push('    alert("复制失败: " + err.message);');
      htmlParts.push('  });');
      htmlParts.push('}');
      htmlParts.push('</script>');
      htmlParts.push('</body>');
      htmlParts.push('</html>');
      
      newWindow.document.write(htmlParts.join('\n'));
      newWindow.document.close();
    }
    
    // 生成预测结果的文本格式
    function generatePredictionText(predictions, config) {
      let text = \`\${config.name} - 预测结果\\n\`;
      text += \`生成时间：\${new Date().toLocaleString('zh-CN')}\\n\`;
      text += \`${'='.repeat(50)}\\n\\n\`;
      
      predictions.forEach(pred => {
        text += \`第 \${pred.rank} 注 [\${pred.strategy_name || pred.strategy}]\\n\`;
        
        if (currentType === 'ssq') {
          text += \`红球：\${pred.red_balls.join(', ')}\\n\`;
          text += \`蓝球：\${pred.blue_ball}\\n\`;
        } else if (currentType === 'dlt') {
          text += \`前区：\${pred.front_balls.join(', ')}\\n\`;
          text += \`后区：\${pred.back_balls.join(', ')}\\n\`;
        } else if (currentType === 'qxc') {
          text += \`号码：\${pred.numbers.join(', ')}\\n\`;
        } else if (currentType === 'qlc') {
          text += \`基本号：\${pred.basic_balls.join(', ')}\\n\`;
          text += \`特别号：\${pred.special_ball}\\n\`;
        }
        
        text += \`\\n\`;
      });
      
      text += \`${'='.repeat(50)}\\n\`;
      text += \`⚠️ 预测结果仅供参考，不构成任何投注建议\`;
      
      return text;
    }
    
    // 渲染预测结果 HTML（用于新窗口）
    function renderPredictionsHTMLForWindow(predictions) {
      let html = '';
      
      predictions.forEach(pred => {
        html += '<div class="prediction-item">';
        html += '<div>';
        html += '<span class="prediction-rank">第 ' + pred.rank + ' 注</span>';
        html += '<span class="prediction-strategy">' + (pred.strategy_name || pred.strategy) + '</span>';
        html += '</div>';
        html += '<div class="prediction-balls"><div class="balls-container">';
        
        if (currentType === 'ssq') {
          pred.red_balls.forEach(ball => {
            html += '<div class="ball ball-red">' + ball + '</div>';
          });
          html += '<div class="ball ball-blue">' + pred.blue_ball + '</div>';
        } else if (currentType === 'dlt') {
          pred.front_balls.forEach(ball => {
            html += '<div class="ball ball-front">' + ball + '</div>';
          });
          pred.back_balls.forEach(ball => {
            html += '<div class="ball ball-back">' + ball + '</div>';
          });
        } else if (currentType === 'qxc') {
          pred.numbers.forEach(ball => {
            html += '<div class="ball ball-number">' + ball + '</div>';
          });
        } else if (currentType === 'qlc') {
          pred.basic_balls.forEach(ball => {
            html += '<div class="ball ball-basic">' + ball + '</div>';
          });
          html += '<div class="ball ball-special">' + pred.special_ball + '</div>';
        }
        
        html += '</div></div></div>';
      });
      
      return html;
    }
    
    // 渲染预测结果 HTML（用于弹窗）
    function renderPredictionsHTML(predictions) {
      let html = '';
      
      predictions.forEach(pred => {
        html += '<div class="prediction-item">';
        html += \`<div>\`;
        html += \`<span class="prediction-rank">第 \${pred.rank} 注</span>\`;
        html += \`<span class="prediction-strategy">\${pred.strategy_name || pred.strategy}</span>\`;
        html += \`</div>\`;
        html += '<div class="prediction-balls">';
        
        if (currentType === 'ssq') {
          html += '<div class="balls-container">';
          html += renderBalls(pred.red_balls, 'red');
          html += renderBall(pred.blue_ball, 'blue');
          html += '</div>';
        } else if (currentType === 'dlt') {
          html += '<div class="balls-container">';
          html += renderBalls(pred.front_balls, 'front');
          html += renderBalls(pred.back_balls, 'back');
          html += '</div>';
        } else if (currentType === 'qxc') {
          html += '<div class="balls-container">';
          html += renderBalls(pred.numbers, 'number');
          html += '</div>';
        } else if (currentType === 'qlc') {
          html += '<div class="balls-container">';
          html += renderBalls(pred.basic_balls, 'basic');
          html += renderBall(pred.special_ball, 'special');
          html += '</div>';
        }
        
        html += '</div>';
        html += '</div>';
      });
      
      return html;
    }
    
    // 使用弹窗显示（备用方案）
    function showPredictionModal(predictions, config) {
      const modal = document.getElementById('predictionModal');
      const title = document.getElementById('predictionTitle');
      const results = document.getElementById('predictionResults');
      
      title.textContent = \`\${config.name} - 预测结果\`;
      results.innerHTML = renderModalPredictions(predictions);
      
      // 保存预测数据供复制使用
      window.currentPredictions = predictions;
      
      modal.classList.add('show');
    }
    
    // 渲染弹窗中的预测结果
    function renderModalPredictions(predictions) {
      let html = '';
      
      predictions.forEach(pred => {
        html += '<div class="prediction-item">';
        html += \`<div>\`;
        html += \`<span class="prediction-rank">第 \${pred.rank} 注</span>\`;
        html += \`<span class="prediction-strategy">\${pred.strategy_name || pred.strategy}</span>\`;
        html += \`</div>\`;
        html += '<div class="prediction-balls">';
        
        if (currentType === 'ssq') {
          html += '<div class="balls-container">';
          html += renderBalls(pred.red_balls, 'red');
          html += renderBall(pred.blue_ball, 'blue');
          html += '</div>';
        } else if (currentType === 'dlt') {
          html += '<div class="balls-container">';
          html += renderBalls(pred.front_balls, 'front');
          html += renderBalls(pred.back_balls, 'back');
          html += '</div>';
        } else if (currentType === 'qxc') {
          html += '<div class="balls-container">';
          html += renderBalls(pred.numbers, 'number');
          html += '</div>';
        } else if (currentType === 'qlc') {
          html += '<div class="balls-container">';
          html += renderBalls(pred.basic_balls, 'basic');
          html += renderBall(pred.special_ball, 'special');
          html += '</div>';
        }
        
        html += '</div>';
        html += '</div>';
      });
      
      return html;
    }
    
    // 关闭预测弹窗
    function closePrediction() {
      document.getElementById('predictionModal').classList.remove('show');
    }
    
    // 点击弹窗外部关闭
    document.getElementById('predictionModal').addEventListener('click', function(e) {
      if (e.target === this) {
        closePrediction();
      }
    });
    
    // 复制弹窗中的预测结果到剪贴板
    function copyModalToClipboard() {
      if (!window.currentPredictions) {
        alert('没有可复制的预测结果');
        return;
      }
      
      const config = lotteryConfig[currentType];
      const textContent = generatePredictionText(window.currentPredictions, config);
      const btn = document.querySelector('.btn-copy-modal');
      
      navigator.clipboard.writeText(textContent).then(() => {
        btn.textContent = '✓ 已复制';
        btn.classList.add('copied');
        
        setTimeout(() => {
          btn.textContent = '📋 复制';
          btn.classList.remove('copied');
        }, 2000);
      }).catch(err => {
        alert('复制失败: ' + err.message);
      });
    }
  </script>
</body>
</html>`;
