const https = require('https');

const NOTION_TOKEN = process.env.NOTION_API_KEY || process.env.NOTION_TOKEN;
const DB_ID = '302078a7-daec-80b9-9473-c70a619c755e';

if (!NOTION_TOKEN) {
    console.error('❌ NOTION_TOKEN/NOTION_API_KEY not set');
    process.exit(1);
}

// 今日新聞數據
const todayNews = [
    {
        title: "Moca Network beta launches MocaProof digital identity verification platform",
        summary: "Moca Network launched MocaProof beta, a gamified digital identity verification platform using zkProof technology. Features Mocat virtual companion that evolves with verified credentials. Mainnet launch scheduled for 2026.",
        source: "https://www.animocabrands.com/announcement/moca-network-beta-launches-mocaproof-the-digital-identity-verification-and-reward-platform",
        category: "🎯 Animoca",
        tags: ["Animoca", "Moca Network", "Identity", "Daily"],
        impact: "🔥 High",
        angle: ["Catalyst", "Moat"]
    },
    {
        title: "Moca Network to debut Layer-1 blockchain for digital identity",
        summary: "Animoca Brands' Moca Network plans to launch Moca Chain L1 blockchain in Q3 2025 testnet, year-end mainnet. Enables cross-chain user verification without centralized platforms. MOCA token up 6% on announcement.",
        source: "https://www.coindesk.com/business/2025/06/25/animoca-brands-flagship-project-moca-network-to-debut-l1-for-digital-identity",
        category: "🎯 Animoca",
        tags: ["Animoca", "Moca Network", "Infrastructure", "Daily"],
        impact: "🔥 High",
        angle: ["Catalyst", "Moat", "Marketing"]
    },
    {
        title: "Immutable unifies X and zkEVM blockchains to streamline Web3 gaming",
        summary: "Immutable announced unification of Immutable X and Immutable zkEVM into single chain starting Feb 11, 2026. Automated trustless asset migration, centralizes liquidity and developer tooling. Major competitor move against Animoca ecosystem.",
        source: "https://www.cointrust.com/market-news/immutable-unifies-its-blockchains-to-streamline-web3-gaming",
        category: "⚔️ Competitor",
        tags: ["Immutable", "Gaming", "Infrastructure", "Daily"],
        impact: "⚡ Medium",
        angle: ["Risk", "Catalyst"]
    },
    {
        title: "Hong Kong SFC to allow regulated perpetual contracts for crypto",
        summary: "SFC CEO Julia Leung announced at Consensus HK 2026: 3 new measures including margin financing for BTC/ETH, perpetual contracts framework (pro investors only), and affiliated market maker liquidity provision.",
        source: "https://www.banklesstimes.com/articles/2026/02/11/hong-kong-working-to-allow-perpetual-contracts/",
        category: "📜 Policy",
        tags: ["Policy", "Hong Kong", "Crypto", "Daily"],
        impact: "🔥 High",
        angle: ["Catalyst", "Sentiment"]
    }
];

const today = '2026-02-12';

console.log(`📝 Adding ${todayNews.length} news items to Notion...\n`);

async function addToNotion(news, index) {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify({
            parent: { database_id: DB_ID },
            properties: {
                "Name": {
                    title: [{ text: { content: news.title } }]
                },
                "Date": {
                    date: { start: today }
                },
                "Summary": {
                    rich_text: [{ text: { content: news.summary } }]
                },
                "Source": {
                    url: news.source
                },
                "Category": {
                    select: { name: news.category }
                },
                "Tags": {
                    multi_select: news.tags.map(tag => ({ name: tag }))
                },
                "Impact": {
                    select: { name: news.impact }
                },
                "Angle": {
                    multi_select: news.angle.map(a => ({ name: a }))
                },
                "Review status": {
                    status: { name: "Todo" }
                }
            }
        });

        const options = {
            hostname: 'api.notion.com',
            port: 443,
            path: '/v1/pages',
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${NOTION_TOKEN}`,
                'Notion-Version': '2022-06-28',
                'Content-Type': 'application/json',
                'Content-Length': data.length
            }
        };

        const req = https.request(options, (res) => {
            let responseData = '';
            res.on('data', chunk => responseData += chunk);
            res.on('end', () => {
                try {
                    const result = JSON.parse(responseData);
                    if (result.error) {
                        console.error(`❌ [${index + 1}] ${news.title.substring(0, 50)}...`);
                        console.error(`   Error: ${result.error.message}`);
                        reject(result.error);
                    } else {
                        console.log(`✅ [${index + 1}] Added: ${news.title.substring(0, 60)}...`);
                        resolve(result);
                    }
                } catch (e) {
                    reject(e);
                }
            });
        });

        req.on('error', (e) => {
            console.error(`❌ [${index + 1}] Request failed:`, e.message);
            reject(e);
        });

        req.write(data);
        req.end();
    });
}

async function run() {
    let success = 0;
    let failed = 0;
    
    for (let i = 0; i < todayNews.length; i++) {
        try {
            await addToNotion(todayNews[i], i);
            success++;
            // Small delay to avoid rate limits
            if (i < todayNews.length - 1) {
                await new Promise(r => setTimeout(r, 500));
            }
        } catch (e) {
            failed++;
        }
    }
    
    console.log(`\n📊 Summary: ${success} added, ${failed} failed`);
    process.exit(failed > 0 ? 1 : 0);
}

run();
