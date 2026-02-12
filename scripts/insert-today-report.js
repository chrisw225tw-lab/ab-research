#!/usr/bin/env node
// insert-today-report.js - 插入今天報告數據

const https = require('https');

const SUPABASE_URL = 'https://gfulzxjfgdfmkkuzktil.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdmdWx6eGpmZ2RmbWtrdXprdGlsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDgzNzkzNSwiZXhwIjoyMDg2NDEzOTM1fQ.oeOWO87TlBjQ9Fg4UxRBPjDQC-QMSPYPtBUvU0xIHSU';

const todayReport = {
  report_date: '2026-02-12',
  title: '2026年2月12日 - 每日市場情報',
  summary: "BTC $67,530 (-2.09%)，ETH $1,958 (-3.14%)。Anichess 發布 King's Gambit，Animoca 收購 SOMO。OSL Group 推出 USDGO 穩定幣。",
  content_markdown: `# 2026年2月12日 市場情報\n\n## 📊 價格動態\n| 資產 | 價格 | 24h 變化 |\n|------|------|----------|\n| BTC | $67,530.73 | -2.09% 📉 |\n| ETH | $1,958.68 | -3.14% 📉 |\n\n## 🔥 Animoca Brands 相關新聞\n\n### Anichess 發布 King's Gambit\n- 與 Chess.com 合作的下一代國際象棋平台\n- 在 Speed Chess Championship 2025 總決賽上首次亮相\n- 生存類手機遊戲，現已上架 App Store 和 Google Play\n\n### 收購 SOMO\n- 2026年1月完成對數字收藏品公司 SOMO 的收購\n- 擴展 Web3 收藏品生態\n\n## 📈 市場動態\n- OSL Group 於 2/11 推出受監管的企業級穩定幣 USDGO\n- L1-zkEVM 工作坊 2/11 舉行，新提案提升驗證效率\n- Michael Saylor 比特幣策略持續引發關注\n\n*數據來源：CoinDesk, CoinMarketCap, The Block, CoinEdition*`,
  market_data: {
    btc: 67530.73,
    eth: 1958.68,
    btc_24h: -2.09,
    eth_24h: -3.14
  },
  sources: [
    { name: 'CoinDesk', url: 'https://www.coindesk.com/' },
    { name: 'CoinMarketCap', url: 'https://coinmarketcap.com/' },
    { name: 'The Block', url: 'https://www.theblock.co/' }
  ]
};

async function supabaseRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, SUPABASE_URL);
    
    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      }
    };

    if (data) {
      const jsonData = JSON.stringify(data);
      options.headers['Content-Length'] = Buffer.byteLength(jsonData);
    }

    const req = https.request(options, (res) => {
      let responseData = '';
      res.on('data', chunk => responseData += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseData);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve({ data: parsed, status: res.statusCode });
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${JSON.stringify(parsed)}`));
          }
        } catch (e) {
          resolve({ data: responseData, status: res.statusCode });
        }
      });
    });

    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function main() {
  console.log('📝 插入今天報告數據...\n');
  
  try {
    // 嘗試插入數據
    const result = await supabaseRequest('POST', '/rest/v1/daily_reports', todayReport);
    console.log('✅ 數據插入成功！');
    console.log('\n📊 報告：', todayReport.title);
    console.log('🔗 刷新頁面查看：');
    console.log('   https://ab-research.vercel.app/reports/2026-02-12/');
    
  } catch (err) {
    if (err.message.includes('42P01') || err.message.includes('relation') || err.message.includes('does not exist')) {
      console.error('❌ 錯誤：daily_reports 表不存在');
      console.log('\n🔧 請先創建表：');
      console.log('1. 登入 https://app.supabase.com/project/gfulzxjfgdfmkkuzktil');
      console.log('2. 進入 SQL Editor');
      console.log('3. 執行 scripts/create_table.sql');
      console.log('4. 然後重新運行此腳本');
    } else if (err.message.includes('23505') || err.message.includes('duplicate')) {
      console.log('⚠️  數據已存在，嘗試更新...');
      try {
        await supabaseRequest(
          'PATCH',
          `/rest/v1/daily_reports?report_date=eq.${todayReport.report_date}`,
          todayReport
        );
        console.log('✅ 數據更新成功！');
      } catch (updateErr) {
        console.error('❌ 更新失敗:', updateErr.message);
      }
    } else {
      console.error('❌ 錯誤:', err.message);
    }
  }
}

main();
