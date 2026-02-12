#!/usr/bin/env node
// add-news-to-notion.js - 每條新聞一個 Row

const https = require('https');

const NOTION_TOKEN = process.env.NOTION_API_KEY || 'ntn_c20242664764w93RjoMJYOZkqZaf13CfY5XPDpLFbnF3gC';
const DATABASE_ID = '302078a7daec80b99473c70a619c755e';

if (!NOTION_TOKEN) {
  console.error('❌ NOTION_API_KEY not set');
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

// Notion API 請求
async function notionRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.notion.com',
      port: 443,
      path: path,
      method: method,
      headers: {
        'Authorization': `Bearer ${NOTION_TOKEN}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let responseData = '';
      res.on('data', chunk => responseData += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseData);
          if (parsed.object === 'error') {
            reject(new Error(`Notion API Error: ${parsed.message}`));
          } else {
            resolve(parsed);
          }
        } catch (e) {
          resolve(responseData);
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

// 添加單條新聞到 Notion
async function addNewsRow(newsItem) {
  const data = {
    parent: { database_id: DATABASE_ID },
    properties: {
      Name: {
        title: [{ text: { content: newsItem.title } }]
      },
      Date: {
        date: { start: newsItem.date || getTodayDate() }
      },
      Summary: {
        rich_text: [{ text: { content: newsItem.summary || '' } }]
      },
      Source: {
        url: newsItem.source_url || null
      },
      Category: {
        select: { name: newsItem.category || '📈 Market' }
      },
      Tags: {
        multi_select: newsItem.tags?.map(tag => ({ name: tag })) || [{ name: 'Daily' }]
      },
      Impact: {
        select: { name: newsItem.impact || '⚡ Medium' }
      },
      'Review status': {
        select: { name: 'Todo' }
      }
    }
  };

  // 只有當 Angle 有值時才添加
  if (newsItem.angle) {
    data.properties.Angle = {
      multi_select: newsItem.angle.map(a => ({ name: a }))
    };
  }

  return await notionRequest('POST', '/v1/pages', data);
}

// 主函數
async function main() {
  const today = getTodayDate();
  console.log(`🔄 添加新聞到 Notion: ${today}\n`);

  // 示例新聞列表（實際應從網絡抓取）
  const newsList = [
    {
      title: "Anichess 發布 King's Gambit",
      summary: "與 Chess.com 合作的下一代國際象棋平台，在 Speed Chess Championship 2025 總決賽上首次亮相，現已上架 App Store 和 Google Play",
      source_url: "https://www.animocabrands.com/",
      category: "🎯 Animoca",
      tags: ["Animoca", "Gaming", "AI"],
      impact: "🔥 High",
      angle: ["Marketing", "Catalyst"]
    },
    {
      title: "Animoca 收購 SOMO",
      summary: "2026年1月完成對數字收藏品公司 SOMO 的收購，擴展 Web3 收藏品生態",
      source_url: "https://www.animocabrands.com/",
      category: "🎯 Animoca",
      tags: ["Animoca", "Finance"],
      impact: "⚡ Medium",
      angle: ["Moat"]
    },
    {
      title: "OSL Group 推出 USDGO 穩定幣",
      summary: "受香港監管的企業級穩定幣，1:1 美元儲備，目標企業級用戶",
      source_url: "https://www.coindesk.com/",
      category: "📜 Policy",
      tags: ["Policy", "Crypto", "Finance"],
      impact: "⚡ Medium",
      angle: ["Catalyst"]
    },
    {
      title: "L1-zkEVM 工作坊新提案",
      summary: "提升驗證效率的新提案，降低 zk-Rollup 計算成本，加速 Layer 2 商業化",
      source_url: "https://www.theblock.co/",
      category: "📈 Market",
      tags: ["Market", "Crypto", "AI Infrastructure"],
      impact: "🧊 Low",
      angle: ["Catalyst"]
    },
    {
      title: "BTC 跌破 $68,000",
      summary: "比特幣持續承壓，24h 下跌 2.09%，市場觀望情緒濃厚",
      source_url: "https://coinmarketcap.com/",
      category: "📈 Market",
      tags: ["Market", "Crypto", "Market Monitor"],
      impact: "🔥 High",
      angle: ["Risk", "Sentiment"]
    }
  ];

  console.log(`📰 共 ${newsList.length} 條新聞\n`);

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < newsList.length; i++) {
    const news = newsList[i];
    console.log(`[${i + 1}/${newsList.length}] ${news.title}`);
    
    try {
      const result = await addNewsRow(news);
      console.log(`   ✅ 已添加: ${result.url}`);
      successCount++;
    } catch (err) {
      console.log(`   ❌ 失敗: ${err.message}`);
      failCount++;
    }
    
    // 避免 API 速率限制
    if (i < newsList.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  console.log(`\n🎉 完成！`);
  console.log(`   ✅ 成功: ${successCount}`);
  console.log(`   ❌ 失敗: ${failCount}`);
  console.log(`\n📊 Notion 數據庫: https://www.notion.so/${DATABASE_ID}`);
}

main().catch(console.error);
