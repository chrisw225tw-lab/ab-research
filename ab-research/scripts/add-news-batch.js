#!/usr/bin/env node
// add-news-batch.js - 批量添加今天收集的新聞到 Notion

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
  if (newsItem.angle && newsItem.angle.length > 0) {
    data.properties.Angle = {
      multi_select: newsItem.angle.map(a => ({ name: a }))
    };
  }

  return await notionRequest('POST', '/v1/pages', data);
}

// 主函數
async function main() {
  const today = getTodayDate();
  console.log(`🔄 添加 ${today} 收集的新聞到 Notion\n`);

  // 今天收集的新聞列表
  const newsList = [
    {
      title: "BlackRock: Asia 1% crypto allocation could unlock $2 trillion",
      summary: "BlackRock executive says even a 1% crypto allocation in Asia could unlock $2 trillion in new flows during Consensus Hong Kong panel discussion",
      source_url: "https://www.coindesk.com/markets/2026/02/11/blackrock-exec-says-even-a-1-crypto-allocation-in-asia-could-unlock-usd2-trillion-in-new-flows",
      category: "📈 Market",
      tags: ["Crypto", "Market", "Finance", "BlackRock"],
      impact: "🔥 High",
      angle: ["Catalyst", "Sentiment"]
    },
    {
      title: "Paxful fined $4M for illegal sex work, money laundering",
      summary: "Paxful Holdings sentenced to pay $4 million penalty for aiding illegal prostitution and violating money-laundering laws. Penalty reduced due to ability to pay.",
      source_url: "https://www.coindesk.com/policy/2026/02/11/u-s-doj-hits-paxful-for-usd4-million-in-case-tied-to-illegal-sex-work-money-laundering",
      category: "📜 Policy",
      tags: ["Crypto", "Policy", "Bitcoin", "Exchange"],
      impact: "⚡ Medium",
      angle: ["Risk", "Regulatory"]
    },
    {
      title: "Hong Kong competes with aggressive UAE for digital assets",
      summary: "Hong Kong remains committed to digital assets but faces competition from UAE which has established solid regulatory framework for virtual assets under single dedicated authority",
      source_url: "https://www.coindesk.com/business/2026/02/11/hong-kong-remains-committed-to-digital-assets-but-feels-competition-from-an-aggressive-uae",
      category: "📜 Policy",
      tags: ["Policy", "Hong Kong", "UAE", "Regulation"],
      impact: "⚡ Medium",
      angle: ["Competition", "Regulatory"]
    },
    {
      title: "Gen Z nihilism fuels $100 trillion crypto derivatives boom",
      summary: "Gen Z financial nihilism due to unattainable housing costs leads to $100 trillion crypto derivatives boom as response to broken system",
      source_url: "https://www.coindesk.com/business/2026/02/11/gen-z-nihilism-is-fueling-a-usd100-trillion-crypto-derivatives-boom-in-response-to-a-broken-system",
      category: "📈 Market",
      tags: ["Crypto", "Market", "Derivatives", "Gen Z"],
      impact: "⚡ Medium",
      angle: ["Sentiment", "Market Structure"]
    },
    {
      title: "Tokenization next phase: utility over hype - Ondo, Securitize",
      summary: "Executives say next phase of tokenization must prioritize functionality and compliance over hype during Consensus Hong Kong panel",
      source_url: "https://www.coindesk.com/business/2026/02/11/ondo-and-securitize-execs-say-utility-not-hype-will-drive-tokenization-s-next-phase",
      category: "📈 Market",
      tags: ["Crypto", "Tokenization", "RWA", "DeFi"],
      impact: "⚡ Medium",
      angle: ["Catalyst", "Innovation"]
    },
    {
      title: "SEC's Paul Atkins grilled on crypto enforcement pullback",
      summary: "SEC Chairman questioned on crypto enforcement pull-back including Justin Sun and Tron case. Open to confidential briefing for lawmakers.",
      source_url: "https://www.coindesk.com/policy/2026/02/11/sec-s-paul-atkins-grilled-on-crypto-enforcement-pull-back-including-with-justin-sun-tron",
      category: "📜 Policy",
      tags: ["Policy", "SEC", "Regulation", "Justin Sun"],
      impact: "🔥 High",
      angle: ["Regulatory", "Risk"]
    },
    {
      title: "Bitcoin crash: ETF record sell-off deleveraging cascade",
      summary: "Bitcoin crash caused by TradFi deleveraging. ETF record trading volume over $10B, twice previous high. Arthur Hayes says derivatives amplify volatility both ways.",
      source_url: "https://www.blocktempo.com/in-depth-analysis-of-the-reasons-for-the-bitcoin-crash/",
      category: "📈 Market",
      tags: ["Bitcoin", "ETF", "Market", "Daily"],
      impact: "🔥 High",
      angle: ["Risk", "Market Structure", "Sentiment"]
    },
    {
      title: "AI.com domain sold for $70M to Crypto.com",
      summary: "Malaysian boy bought ai.com for $100 in 1993. Sold 32 years later for $70 million to Crypto.com, highest domain price in history.",
      source_url: "https://www.blocktempo.com/arsyan-ismail-ai-com-domain-sold-crypto-com-70-million/",
      category: "📈 Market",
      tags: ["Crypto", "AI", "Market"],
      impact: "🧊 Low",
      angle: ["Interesting"]
    },
    {
      title: "SBF accuses Biden administration of political persecution",
      summary: "Sam Bankman-Fried claims in prison that FTX was always solvent and accuses Biden administration of political prosecution like Trump",
      source_url: "https://www.blocktempo.com/sbf-accuses-biden-administration-political-persecution-ftx-solvency-dispute/",
      category: "📜 Policy",
      tags: ["Crypto", "FTX", "Policy", "SBF"],
      impact: "⚡ Medium",
      angle: ["Interesting", "Legal"]
    },
    {
      title: "Davos for Degens: Vibes as BTC and ETH plummeted",
      summary: "REDACTED Live conference in Miami for reckless traders. By last day not many degen traders left standing as markets crashed.",
      source_url: "https://decrypt.co/357315/vibes-davos-degens-bitcoin-ethereum-plummeted",
      category: "📈 Market",
      tags: ["Crypto", "Bitcoin", "Ethereum", "Market"],
      impact: "🧊 Low",
      angle: ["Sentiment", "Interesting"]
    },
    {
      title: "JPMorgan bullish on crypto for rest of 2026",
      summary: "JPMorgan analysts remain optimistic on crypto outlook for remainder of 2026 despite recent volatility",
      source_url: "https://www.coindesk.com/",
      category: "📈 Market",
      tags: ["Crypto", "Market", "Finance", "JPMorgan"],
      impact: "⚡ Medium",
      angle: ["Sentiment", "Catalyst"]
    },
    {
      title: "PayPal Mafia: Every member changed world except PayPal",
      summary: "Musk, Thiel and PayPal alumni created over $2 trillion in market value but parent company declined from $300B to struggling",
      source_url: "https://www.blocktempo.com/every-member-of-the-paypal-mafia-has-changed-the-world/",
      category: "📈 Market",
      tags: ["Crypto", "PayPal", "Fintech"],
      impact: "🧊 Low",
      angle: ["Interesting", "History"]
    }
  ];

  console.log(`📰 共 ${newsList.length} 條新聞\n`);

  let successCount = 0;
  let failCount = 0;
  const addedUrls = [];

  for (let i = 0; i < newsList.length; i++) {
    const news = newsList[i];
    console.log(`[${i + 1}/${newsList.length}] ${news.title.substring(0, 60)}...`);
    
    try {
      const result = await addNewsRow(news);
      console.log(`   ✅ 已添加`);
      successCount++;
      addedUrls.push(result.url);
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
