#!/usr/bin/env node
// setup-supabase-table.js - 創建 daily_reports 表並插入數據

const https = require('https');

const SUPABASE_URL = 'https://gfulzxjfgdfmkkuzktil.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdmdWx6eGpmZ2RmbWtrdXprdGlsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDgzNzkzNSwiZXhwIjoyMDg2NDEzOTM1fQ.oeOWO87TlBjQ9Fg4UxRBPjDQC-QMSPYPtBUvU0xIHSU';

// 今天的報告數據（從 cron job 輸出提取）
const todayReport = {
  report_date: '2026-02-12',
  title: '2026年2月12日 - 每日市場情報',
  summary: "BTC $67,530 (-2.09%)，ETH $1,958 (-3.14%)。Anichess 發布 King's Gambit，Animoca 收購 SOMO。OSL Group 推出 USDGO 穩定幣。",
  content_markdown: `# 2026年2月12日 市場情報

## 📊 價格動態
| 資產 | 價格 | 24h 變化 |
|------|------|----------|
| BTC | $67,530.73 | -2.09% 📉 |
| ETH | $1,958.68 | -3.14% 📉 |

## 🔥 Animoca Brands 相關新聞

### Anichess 發布 King''s Gambit
- 與 Chess.com 合作的下一代國際象棋平台
- 在 Speed Chess Championship 2025 總決賽上首次亮相
- 生存類手機遊戲，現已上架 App Store 和 Google Play

### 收購 SOMO
- 2026年1月完成對數字收藏品公司 SOMO 的收購
- 擴展 Web3 收藏品生態

## 📈 市場動態
- OSL Group 於 2/11 推出受監管的企業級穩定幣 USDGO
- L1-zkEVM 工作坊 2/11 舉行，新提案提升驗證效率
- Michael Saylor 比特幣策略持續引發關注

*數據來源：CoinDesk, CoinMarketCap, The Block, CoinEdition*`,
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

// 執行 SQL 創建表
async function createTable() {
  const sql = `
CREATE TABLE IF NOT EXISTS daily_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_date DATE UNIQUE NOT NULL,
  title TEXT NOT NULL,
  summary TEXT,
  content_markdown TEXT NOT NULL,
  market_data JSONB DEFAULT '{}',
  sources JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_daily_reports_date ON daily_reports(report_date DESC);

ALTER TABLE daily_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anonymous read" ON daily_reports;
CREATE POLICY "Allow anonymous read" 
ON daily_reports FOR SELECT 
TO anon USING (true);

DROP POLICY IF EXISTS "Allow service role write" ON daily_reports;
CREATE POLICY "Allow service role write"
ON daily_reports FOR ALL
TO service_role USING (true);
  `;

  console.log('🔨 創建 daily_reports 表...');
  
  try {
    // 使用 Supabase REST API 執行 SQL
    const result = await supabaseRequest('POST', '/rest/v1/', { query: sql });
    console.log('✅ 表創建成功！');
    return true;
  } catch (err) {
    console.log('⚠️  表可能已存在或通過其他方式創建');
    console.log('錯誤:', err.message);
    return false;
  }
}

// 插入今天數據
async function insertTodayData() {
  console.log('📝 插入今天數據...');
  
  try {
    // 檢查是否已存在
    const { data: existing } = await supabaseRequest(
      'GET', 
      `/rest/v1/daily_reports?report_date=eq.${todayReport.report_date}&select=id`
    );

    if (existing && existing.length > 0) {
      console.log('📝 更新現有數據...');
      await supabaseRequest(
        'PATCH',
        `/rest/v1/daily_reports?report_date=eq.${todayReport.report_date}`,
        todayReport
      );
    } else {
      console.log('➕ 創建新數據...');
      await supabaseRequest(
        'POST',
        '/rest/v1/daily_reports',
        todayReport
      );
    }

    console.log('✅ 數據插入成功！');
    return true;
  } catch (err) {
    console.error('❌ 插入失敗:', err.message);
    return false;
  }
}

// 驗證數據
async function verifyData() {
  try {
    const { data } = await supabaseRequest(
      'GET',
      `/rest/v1/daily_reports?report_date=eq.${todayReport.report_date}`
    );
    
    if (data && data.length > 0) {
      console.log('\n✅ 驗證成功！數據已寫入 Supabase');
      console.log('📊 報告:', data[0].title);
      console.log('🔗 刷新頁面查看：');
      console.log('   https://ab-research.vercel.app/reports/2026-02-12/');
      return true;
    } else {
      console.log('\n⚠️  未找到數據');
      return false;
    }
  } catch (err) {
    console.error('❌ 驗證失敗:', err.message);
    return false;
  }
}

// 主函數
async function main() {
  console.log('🚀 Supabase 設置開始\n');
  
  await createTable();
  await insertTodayData();
  await verifyData();
  
  console.log('\n🎉 完成！');
  console.log('下次 cron job (每小時) 將自動更新數據');
}

main().catch(console.error);
