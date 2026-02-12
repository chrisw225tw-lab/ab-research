#!/usr/bin/env node
// add-today-news.js - Add real collected news to Notion

const https = require('https');

const NOTION_TOKEN = process.env.NOTION_API_KEY || 'ntn_c20242664764w93RjoMJYOZkqZaf13CfY5XPDpLFbnF3gC';
const DATABASE_ID = '302078a7daec80b99473c70a619c755e';

function getTodayDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

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
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function addNewsRow(newsItem) {
  const data = {
    parent: { database_id: DATABASE_ID },
    properties: {
      Name: { title: [{ text: { content: newsItem.title } }] },
      Date: { date: { start: newsItem.date || getTodayDate() } },
      Summary: { rich_text: [{ text: { content: newsItem.summary || '' } }] },
      Source: { url: newsItem.source_url || null },
      Category: { select: { name: newsItem.category || '📈 Market' } },
      Tags: { multi_select: newsItem.tags?.map(tag => ({ name: tag })) || [{ name: 'Daily' }] },
      Impact: { select: { name: newsItem.impact || '⚡ Medium' } },
      'Review status': { select: { name: 'Todo' } }
    }
  };

  if (newsItem.angle) {
    data.properties.Angle = { multi_select: newsItem.angle.map(a => ({ name: a })) };
  }

  return await notionRequest('POST', '/v1/pages', data);
}

async function main() {
  const today = getTodayDate();
  console.log(`🔄 添加今日新聞到 Notion: ${today}\n`);

  // Real collected news from web search
  const newsList = [
    {
      title: "Anichess debuts King's Gambit at Speed Chess Championship",
      summary: "Animoca Brands subsidiary Anichess launched King's Gambit mobile game at Chess.com Speed Chess Championship 2025 Finals in London. Event featured $250K prize pool, Magnus Carlsen victory, and 5M+ viewers. Game targets $82B mobile gaming market.",
      source_url: "https://coinedition.com/anichess-debuts-kings-gambit-at-speed-chess-championship-hosted-by-chess-com/",
      category: "🎯 Animoca",
      tags: ["Animoca", "Gaming", "Chess", "Mobile"],
      impact: "🔥 High",
      angle: ["Marketing", "Catalyst"]
    },
    {
      title: "Animoca Brands receives full crypto brokerage license in UAE",
      summary: "Animoca Brands obtained full license from Dubai's VARA (Virtual Asset Regulatory Authority) to offer crypto brokerage and virtual asset investment management services. Follows in-principle approval from ADGM in Nov 2025. Part of aggressive MENA expansion strategy.",
      source_url: "https://www.cryptopolitan.com/animoca-brands-receives-crypto-license-uae/",
      category: "🎯 Animoca",
      tags: ["Animoca", "UAE", "VARA", "License", "MENA"],
      impact: "🔥 High",
      angle: ["Catalyst", "Moat"]
    },
    {
      title: "Institutions Lead RWA Growth, Panel Says at Consensus Hong Kong",
      summary: "Panel at Consensus Hong Kong featuring Animoca Brands, Mastercard, and Robinhood discussed how institutions are driving tokenized RWA growth. Tokenized RWAs now exceed $24B led by US bonds and commodities. BlackRock COO called distributed ledgers transformative advance in finance.",
      source_url: "https://bitcoinethereumnews.com/tech/institutions-lead-rwa-growth-panel-says-at-consensus-hong-kong/",
      category: "📈 Market",
      tags: ["RWA", "Animoca", "Mastercard", "Robinhood", "Consensus"],
      impact: "⚡ Medium",
      angle: ["Catalyst", "Sentiment"]
    }
  ];

  console.log(`📰 共 ${newsList.length} 條新聞\n`);

  let successCount = 0;
  let failCount = 0;
  const addedTitles = [];

  for (let i = 0; i < newsList.length; i++) {
    const news = newsList[i];
    console.log(`[${i + 1}/${newsList.length}] ${news.title}`);
    
    try {
      const result = await addNewsRow(news);
      console.log(`   ✅ 已添加: ${result.url}`);
      addedTitles.push(news.title);
      successCount++;
    } catch (err) {
      console.log(`   ❌ 失敗: ${err.message}`);
      failCount++;
    }
    
    if (i < newsList.length - 1) await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log(`\n🎉 完成！`);
  console.log(`   ✅ 成功: ${successCount}`);
  console.log(`   ❌ 失敗: ${failCount}`);
  console.log(`\n📊 Notion 數據庫: https://www.notion.so/${DATABASE_ID}`);
  
  // Output for notification
  console.log(`\n---NOTIFICATION---`);
  console.log(JSON.stringify({count: successCount, titles: addedTitles}));
}

main().catch(console.error);
