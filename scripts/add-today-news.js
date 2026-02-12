#!/usr/bin/env node
// add-today-news-to-notion.js - 添加今日 Web3 新聞

const https = require('https');

const NOTION_TOKEN = process.env.NOTION_API_KEY || 'ntn_c20242664764w93RjoMJYOZkqZaf13CfY5XPDpLFbnF3gC';
const DATABASE_ID = '302078a7daec80b99473c70a619c755e';

if (!NOTION_TOKEN) {
  console.error('❌ NOTION_API_KEY not set');
  process.exit(1);
}

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
  console.log(`🔄 添加 ${today} Web3 新聞到 Notion\n`);

  const newsList = [
    {
      title: "Anichess Launches 'King's Gambit' Mobile Game at Speed Chess Championship",
      summary: "Anichess (Animoca subsidiary) debuted chess-inspired survival mobile game at Speed Chess Championship 2025 Finals in London. Event featured $250K prize pool, 5M+ viewers. Game targets $82B mobile gaming market.",
      source_url: "https://coinedition.com/anichess-debuts-kings-gambit-at-speed-chess-championship-hosted-by-chess-com/",
      category: "🎯 Animoca",
      tags: ["Animoca", "Gaming", "Daily"],
      impact: "🔥 High",
      angle: ["Marketing", "Catalyst", "Moat"]
    },
    {
      title: "LayerZero Unveils 'Zero' L1 Blockchain with Wall Street Backing",
      summary: "LayerZero announced Zero, a new Layer 1 targeting 2M TPS with backing from Citadel Securities, ARK Invest, DTCC, ICE, Google Cloud, and Tether. Cathie Wood joins advisory board.",
      source_url: "https://decrypt.co/357706/morning-minute-layer-zero-debuts-most-impressive-blockchain-tech-upgrade-in-years",
      category: "📈 Market",
      tags: ["Market", "Crypto", "AI", "Daily"],
      impact: "🔥 High",
      angle: ["Catalyst", "Moat", "Sentiment"]
    },
    {
      title: "Animoca Brands to List on Nasdaq via Reverse Merger",
      summary: "Animoca Brands entered agreement with Nasdaq-listed Currenc Group (CURR) for reverse merger. Target valuation $1B, expected to close end of 2026. $110M revenue from Sandbox/Mocaverse.",
      source_url: "https://finance.yahoo.com/news/animoca-brands-eyes-1-billion-160444104.html",
      category: "🎯 Animoca",
      tags: ["Animoca", "Moca Network", "Finance", "Daily"],
      impact: "🔥 High",
      angle: ["Catalyst", "Marketing"]
    },
    {
      title: "White House Crypto Bill Stalled on Stablecoin Yield Dispute",
      summary: "Bankers demand ban on stablecoin yields in Digital Asset Market Clarity Act. No progress made despite White House pressure. Coinbase, Ripple, a16z vs Bank Policy Institute.",
      source_url: "https://www.coindesk.com/policy/2026/02/10/crypto-s-banker-adversaries-didn-t-want-to-deal-in-latest-white-house-meeting-on-bill",
      category: "📜 Policy",
      tags: ["Policy", "Crypto", "Finance", "Daily"],
      impact: "⚡ Medium",
      angle: ["Risk", "Catalyst"]
    },
    {
      title: "Robinhood Q4 Misses, Crypto Revenue Down 38% YoY",
      summary: "Robinhood Q4 revenue $1.28B missed $1.35B expected. Crypto revenue fell 38% YoY to $221M. However, prediction market volume spiked 4x. Robinhood Chain testnet launched on Arbitrum.",
      source_url: "https://decrypt.co/357649/robinhood-shares-slide-q4-miss-bitcoin-crypto-weakness",
      category: "📈 Market",
      tags: ["Market", "Crypto", "Daily"],
      impact: "⚡ Medium",
      angle: ["Risk", "Sentiment"]
    },
    {
      title: "Goldman Sachs Discloses $2.1B Crypto Holdings",
      summary: "Goldman Sachs disclosed holding $1.1B BTC and $1B ETH (0.33% of portfolio). Continued institutional accumulation trend.",
      source_url: "https://decrypt.co/357706/morning-minute-layer-zero-debuts-most-impressive-blockchain-tech-upgrade-in-years",
      category: "📈 Market",
      tags: ["Market", "Crypto", "Finance", "Daily"],
      impact: "🧊 Low",
      angle: ["Sentiment"]
    },
    {
      title: "Polymarket Partners with Kaito AI for Attention Markets",
      summary: "Polymarket announced attention markets powered by Kaito AI, combining prediction markets with AI-driven attention tracking.",
      source_url: "https://decrypt.co/357706/morning-minute-layer-zero-debuts-most-impressive-blockchain-tech-upgrade-in-years",
      category: "🤖 AI Tools",
      tags: ["AI", "Crypto", "Daily"],
      impact: "⚡ Medium",
      angle: ["Catalyst"]
    },
    {
      title: "SBF Files for New Trial After Firing Attorney",
      summary: "Sam Bankman-Fried filed pro se motion for new trial after firing lawyer, claiming new evidence. Potential path to get out of prison.",
      source_url: "https://decrypt.co/357619/ftx-founder-sam-bankman-fried-requests-new-trial-firing-attorney",
      category: "📜 Policy",
      tags: ["Policy", "Crypto", "Daily"],
      impact: "🧊 Low",
      angle: ["Risk"]
    }
  ];

  console.log(`📰 共 ${newsList.length} 條新聞\n`);

  let successCount = 0;
  let failCount = 0;
  const addedNews = [];

  for (let i = 0; i < newsList.length; i++) {
    const news = newsList[i];
    console.log(`[${i + 1}/${newsList.length}] ${news.title}`);
    
    try {
      const result = await addNewsRow(news);
      console.log(`   ✅ 已添加`);
      successCount++;
      addedNews.push(news);
    } catch (err) {
      console.log(`   ❌ 失敗: ${err.message}`);
      failCount++;
    }
    
    if (i < newsList.length - 1) await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log(`\n🎉 完成！`);
  console.log(`   ✅ 成功: ${successCount}`);
  console.log(`   ❌ 失敗: ${failCount}`);
  
  // 輸出給 Telegram 的通知內容
  console.log(`\n📱 Telegram 通知內容:`);
  console.log(`已添加 ${successCount} 條新聞到 Notion:`);
  addedNews.forEach((n, i) => console.log(`${i + 1}. ${n.title}`));
}

main().catch(console.error);
