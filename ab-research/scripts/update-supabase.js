#!/usr/bin/env node
// update-supabase.js - 更新 Supabase 數據，不 redeploy

const https = require('https');

const SUPABASE_URL = 'https://gfulzxjfgdfmkkuzktil.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY;

// 檢查 API key
if (!SUPABASE_KEY) {
  console.error('❌ 請設置 SUPABASE_SERVICE_KEY 環境變數');
  process.exit(1);
}

// 獲取今天日期
function getTodayDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// 調用 Supabase REST API
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

// 主函數
async function main() {
  const today = getTodayDate();
  console.log(`🔄 更新 Supabase: ${today}`);

  try {
    // 檢查今天是否已有報告
    const { data: existing } = await supabaseRequest(
      'GET', 
      `/rest/v1/daily_reports?report_date=eq.${today}&select=id`
    );

    // 構建報告數據（這裡簡化示例，實際應從新聞源獲取）
    const reportData = {
      report_date: today,
      title: `${today} 每日市場情報`,
      summary: '自動更新摘要...',
      content_markdown: `# ${today} 市場情報\n\n（實際內容從新聞源獲取）`,
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

    if (existing && existing.length > 0) {
      // 更新現有報告
      console.log('📝 更新現有報告...');
      await supabaseRequest(
        'PATCH',
        `/rest/v1/daily_reports?report_date=eq.${today}`,
        reportData
      );
      console.log('✅ 報告已更新');
    } else {
      // 創建新報告
      console.log('➕ 創建新報告...');
      await supabaseRequest(
        'POST',
        '/rest/v1/daily_reports',
        reportData
      );
      console.log('✅ 報告已創建');
    }

    console.log('\n📊 完成！');
    console.log('網站將自動顯示最新數據（無需 redeploy）');
    console.log('🔗 https://ab-research.vercel.app/');

  } catch (error) {
    console.error('❌ 錯誤:', error.message);
    process.exit(1);
  }
}

main();
