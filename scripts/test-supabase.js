#!/usr/bin/env node
// Quick test: Write today's data to Supabase

const https = require('https');

const SUPABASE_URL = 'https://gfulzxjfgdfmkkuzktil.supabase.co';
// Use anon key for this test - will fail if RLS blocks it
// Need service_role key for write
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY;

if (!SUPABASE_KEY) {
  console.log('⚠️  SUPABASE_SERVICE_KEY not set');
  console.log('Please add to ~/.openclaw/.env:');
  console.log('export SUPABASE_SERVICE_KEY="eyJhbG..."');
  process.exit(1);
}

const today = '2026-02-12';

const reportData = {
  report_date: today,
  title: '2026年2月12日 - 每日市場情報（測試數據）',
  summary: 'BTC 回升至 $67,500，ETH 穩定在 $1,950。Consensus HK 持續進行，香港監管利好頻傳。BlackRock $22億 BUIDL 上線 Uniswap。',
  content_markdown: `# 2026年2月12日 市場情報\n\n## 📈 價格動態\n| 資產 | 價格 | 24h 變化 |\n|------|------|----------|\n| BTC | $67,500 | +2.1% 🟢 |\n| ETH | $1,950 | +0.8% 🟢 |\n\n## 🔥 重大新聞\n1. **BlackRock 進軍 DeFi** - $22億 BUIDL 上線 Uniswap\n2. **香港穩定幣牌照** - 3月首批發放，36份申請審查中\n3. **Consensus HK** - 2月18-20日舉行\n4. **Animoca Nasdaq 上市** - 目標估值 $10億\n\n*數據來自 BlockTempo, CoinDesk*`,
  market_data: {
    btc: 67500,
    eth: 1950,
    btc_24h: 2.1,
    eth_24h: 0.8
  },
  sources: [
    { name: 'BlockTempo', url: 'https://www.blocktempo.com/' },
    { name: 'CoinDesk', url: 'https://www.coindesk.com/' }
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
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
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
          reject(new Error(`Parse error: ${e.message}`));
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
  try {
    console.log('🔄 寫入測試數據到 Supabase...');
    
    // Check if exists
    const { data: existing } = await supabaseRequest(
      'GET', 
      `/rest/v1/daily_reports?report_date=eq.${today}&select=id`
    );

    if (existing && existing.length > 0) {
      console.log('📝 更新現有數據...');
      await supabaseRequest(
        'PATCH',
        `/rest/v1/daily_reports?report_date=eq.${today}`,
        reportData
      );
    } else {
      console.log('➕ 創建新數據...');
      await supabaseRequest(
        'POST',
        '/rest/v1/daily_reports',
        reportData
      );
    }

    console.log('✅ 測試數據已寫入！');
    console.log('🔗 請刷新頁面查看：');
    console.log('   https://ab-research.vercel.app/reports/2026-02-12/');

  } catch (error) {
    console.error('❌ 錯誤:', error.message);
    console.log('\n💡 可能需要設置 SUPABASE_SERVICE_KEY');
    process.exit(1);
  }
}

main();
