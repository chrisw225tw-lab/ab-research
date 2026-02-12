// Supabase client for AB Research
// 動態載入每日報告數據

(function() {
  'use strict';

  // Supabase 配置
  const SUPABASE_URL = 'https://gfulzxjfgdfmkkuzktil.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_iLopC9XI5S5vfZoiJrW-ag_HWl3Ysuh'; // Anon Key

  // 初始化 Supabase 客戶端
  let supabaseClient = null;

  // 檢查是否為報告頁面
  function isReportPage() {
    return window.location.pathname.includes('/reports/');
  }

  // 從 URL 提取日期
  function getReportDateFromURL() {
    const match = window.location.pathname.match(/\/reports\/(\d{4}-\d{2}-\d{2})/);
    return match ? match[1] : null;
  }

  // 獲取今天的日期
  function getTodayDate() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // 初始化 Supabase
  async function initSupabase() {
    // 如果已有 Supabase 庫，直接使用
    if (window.supabase) {
      supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
      return supabaseClient;
    }

    // 動態載入 Supabase 庫
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js';
      script.onload = () => {
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
        resolve(supabaseClient);
      };
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  // 從 Supabase 獲取報告
  async function fetchReport(date) {
    try {
      if (!supabaseClient) {
        await initSupabase();
      }

      const { data, error } = await supabaseClient
        .from('daily_reports')
        .select('*')
        .eq('report_date', date)
        .single();

      if (error) {
        console.error('Supabase error:', error);
        return null;
      }

      return data;
    } catch (err) {
      console.error('Fetch error:', err);
      return null;
    }
  }

  // 獲取最新報告列表
  async function fetchLatestReports(limit = 10) {
    try {
      if (!supabaseClient) {
        await initSupabase();
      }

      const { data, error } = await supabaseClient
        .from('daily_reports')
        .select('report_date, title, summary, updated_at')
        .order('report_date', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Supabase error:', error);
        return [];
      }

      return data || [];
    } catch (err) {
      console.error('Fetch error:', err);
      return [];
    }
  }

  // 渲染報告內容
  function renderReport(data) {
    // 查找內容容器
    const contentDiv = document.querySelector('.md-content__inner');
    if (!contentDiv) return;

    // 如果已有動態內容，不覆蓋
    if (contentDiv.querySelector('.dynamic-report')) return;

    // 創建動態內容區塊
    const dynamicSection = document.createElement('div');
    dynamicSection.className = 'dynamic-report admonition info';
    
    const marketData = data.market_data || {};
    
    dynamicSection.innerHTML = `
      <p class="admonition-title">📊 實時市場數據</p>
      <div class="market-data">
        <table>
          <tr>
            <td><strong>BTC</strong></td>
            <td>$${marketData.btc?.toLocaleString() || 'N/A'}</td>
            <td class="${marketData.btc_24h >= 0 ? 'positive' : 'negative'}">
              ${marketData.btc_24h >= 0 ? '+' : ''}${marketData.btc_24h || 0}%
            </td>
          </tr>
          <tr>
            <td><strong>ETH</strong></td>
            <td>$${marketData.eth?.toLocaleString() || 'N/A'}</td>
            <td class="${marketData.eth_24h >= 0 ? 'positive' : 'negative'}">
              ${marketData.eth_24h >= 0 ? '+' : ''}${marketData.eth_24h || 0}%
            </td>
          </tr>
        </table>
      </div>
      <p class="last-updated"><small>🔄 最後更新：${new Date(data.updated_at).toLocaleString('zh-TW', {timeZone: 'Asia/Hong_Kong'})} HKT</small></p>
    `;

    // 插入到文章開頭
    const firstHeading = contentDiv.querySelector('h1');
    if (firstHeading && firstHeading.nextSibling) {
      contentDiv.insertBefore(dynamicSection, firstHeading.nextSibling);
    }

    // 添加樣式
    const style = document.createElement('style');
    style.textContent = `
      .dynamic-report { margin: 1rem 0; }
      .dynamic-report .positive { color: #00c853; }
      .dynamic-report .negative { color: #ff1744; }
      .dynamic-report table { width: auto; }
      .dynamic-report td { padding: 0.5rem 1rem; }
      .last-updated { color: #666; margin-top: 0.5rem; }
    `;
    document.head.appendChild(style);
  }

  // 更新首頁報告列表
  async function updateHomepageReports() {
    const tableBody = document.querySelector('.report-table tbody');
    if (!tableBody) return;

    const reports = await fetchLatestReports(10);
    if (reports.length === 0) return;

    // 清空現有內容
    tableBody.innerHTML = '';

    // 填充新數據
    reports.forEach(report => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${report.report_date}</td>
        <td><a href="reports/${report.report_date}/">${report.title || '每日情報報告'}</a></td>
        <td>${report.summary || '（無摘要）'}</td>
      `;
      tableBody.appendChild(row);
    });
  }

  // 主函數
  async function main() {
    // 等待頁面載入完成
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }
  }

  async function init() {
    try {
      // 初始化 Supabase
      await initSupabase();

      if (isReportPage()) {
        // 報告頁面：載入該日數據
        const reportDate = getReportDateFromURL() || getTodayDate();
        const data = await fetchReport(reportDate);
        if (data) {
          renderReport(data);
        }
      } else if (window.location.pathname === '/' || window.location.pathname === '/index.html') {
        // 首頁：更新報告列表
        await updateHomepageReports();
      }
    } catch (err) {
      console.error('Initialization error:', err);
    }
  }

  // 執行
  main();
})();
