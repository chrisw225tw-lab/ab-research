#!/usr/bin/env node
// sync-to-notion.js - 同步研究報告到 Notion

const https = require('https');
const fs = require('fs');
const path = require('path');

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

// 在數據庫中創建頁面
async function createReportPage(reportData) {
  console.log('📝 創建 Notion 頁面...');
  
  const data = {
    parent: { database_id: DATABASE_ID },
    properties: {
      Name: {
        title: [{ text: { content: reportData.title } }]
      },
      Date: {
        date: { start: reportData.date }
      },
      Summary: {
        rich_text: [{ text: { content: reportData.summary } }]
      }
    },
    children: [
      {
        object: 'block',
        type: 'heading_2',
        heading_2: {
          rich_text: [{ text: { content: '📊 市場數據' } }]
        }
      },
      {
        object: 'block',
        type: 'bulleted_list_item',
        bulleted_list_item: {
          rich_text: [{ text: { content: `BTC: $${reportData.btc_price} (${reportData.btc_change}%)` } }]
        }
      },
      {
        object: 'block',
        type: 'bulleted_list_item',
        bulleted_list_item: {
          rich_text: [{ text: { content: `ETH: $${reportData.eth_price} (${reportData.eth_change}%)` } }]
        }
      },
      {
        object: 'block',
        type: 'heading_2',
        heading_2: {
          rich_text: [{ text: { content: '🎯 執行摘要' } }]
        }
      },
      {
        object: 'block',
        type: 'paragraph',
        paragraph: {
          rich_text: [{ text: { content: reportData.summary } }]
        }
      },
      {
        object: 'block',
        type: 'heading_2',
        heading_2: {
          rich_text: [{ text: { content: '🔥 重點新聞' } }]
        }
      },
      ...reportData.headlines.map(h => ({
        object: 'block',
        type: 'bulleted_list_item',
        bulleted_list_item: {
          rich_text: [{ text: { content: h } }]
        }
      })),
      {
        object: 'block',
        type: 'heading_2',
        heading_2: {
          rich_text: [{ text: { content: '🔗 來源連結' } }]
        }
      },
      ...reportData.sources.map(s => ({
        object: 'block',
        type: 'bulleted_list_item',
        bulleted_list_item: {
          rich_text: [
            { text: { content: s.name + ': ' } },
            { text: { content: s.url, link: { url: s.url } } }
          ]
        }
      })),
      {
        object: 'block',
        type: 'divider',
        divider: {}
      },
      {
        object: 'block',
        type: 'paragraph',
        paragraph: {
          rich_text: [
            { 
              type: 'text',
              text: { content: '🤖 自動生成於 ' },
              annotations: { italic: true, color: 'gray' }
            },
            { 
              type: 'text',
              text: { content: new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Hong_Kong' }) + ' HKT' },
              annotations: { italic: true, color: 'gray' }
            }
          ]
        }
      }
    ]
  };

  const result = await notionRequest('POST', '/v1/pages', data);
  return result;
}

// 主函數
async function main() {
  const today = getTodayDate();
  console.log(`🔄 同步報告到 Notion: ${today}\n`);

  // 從本地報告文件讀取數據（簡化示例，實際應解析 Markdown）
  const reportPath = `/home/chris/.openclaw/workspace-work/ab-research/docs/reports/${today}.md`;
  
  // 構建報告數據（實際應從 Markdown 解析）
  const reportData = {
    title: `${today} 每日市場情報`,
    date: today,
    summary: `BTC $67,530 (-2.09%)，ETH $1,958 (-3.14%)。Anichess 發布 King's Gambit，Animoca 收購 SOMO。OSL Group 推出 USDGO 穩定幣。`,
    btc_price: '67,530.73',
    btc_change: '-2.09',
    eth_price: '1,958.68',
    eth_change: '-3.14',
    headlines: [
      'Anichess 發布 King\'s Gambit — 與 Chess.com 合作的下一代國際象棋平台',
      'Animoca 收購 SOMO — 擴展 Web3 數字收藏品生態',
      'OSL Group 推出 USDGO — 受監管的企業級穩定幣',
      'L1-zkEVM 工作坊 — 新提案提升驗證效率'
    ],
    sources: [
      { name: 'CoinDesk', url: 'https://www.coindesk.com/' },
      { name: 'CoinMarketCap', url: 'https://coinmarketcap.com/' },
      { name: 'The Block', url: 'https://www.theblock.co/' }
    ]
  };

  try {
    const page = await createReportPage(reportData);
    console.log('✅ Notion 頁面創建成功！');
    console.log(`🔗 ${page.url}`);
    
    // 保存 Notion 頁面 URL 供後續使用
    fs.writeFileSync(`/tmp/notion_page_${today}.txt`, page.url);
    
  } catch (err) {
    console.error('❌ 錯誤:', err.message);
    process.exit(1);
  }
}

main();
