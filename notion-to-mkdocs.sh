#!/bin/bash
# notion-to-mkdocs.sh - 同步 Notion 到 MkDocs 並部署

set -e

echo "🔄 Notion → MkDocs 同步開始"

# 配置
NOTION_DB_ID="302078a7-daec-80b9-9473-c70a619c755e"
WORKSPACE="/home/chris/.openclaw/workspace-work/ab-research"
DOCS_DIR="$WORKSPACE/docs"

# 檢查 NOTION_TOKEN
if [ -z "$NOTION_TOKEN" ]; then
    echo "❌ NOTION_TOKEN 未設置"
    exit 1
fi

cd "$WORKSPACE"

# 1. 獲取 Notion 數據庫內容
echo "📥 從 Notion 獲取研究報告..."

# 使用 Node.js 腳本調用 Notion API
node << 'NODEEOF'
const https = require('https');
const fs = require('fs');
const path = require('path');

const NOTION_TOKEN = process.env.NOTION_TOKEN;
const DB_ID = '302078a7-daec-80b9-9473-c70a619c755e';
const DOCS_DIR = '/home/chris/.openclaw/workspace-work/ab-research/docs/reports';

if (!NOTION_TOKEN) {
    console.error('NOTION_TOKEN not set');
    process.exit(1);
}

// 查詢數據庫
const queryData = JSON.stringify({
    filter: {
        property: 'Status',
        select: {
            equals: 'Done'
        }
    },
    sorts: [
        {
            property: 'Date',
            direction: 'descending'
        }
    ],
    page_size: 10
});

const options = {
    hostname: 'api.notion.com',
    port: 443,
    path: `/v1/databases/${DB_ID}/query`,
    method: 'POST',
    headers: {
        'Authorization': `Bearer ${NOTION_TOKEN}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
        'Content-Length': queryData.length
    }
};

const req = https.request(options, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        try {
            const result = JSON.parse(data);
            if (result.error) {
                console.error('Notion API Error:', result.error.message);
                process.exit(1);
            }
            
            console.log(`📊 找到 ${result.results.length} 條報告`);
            
            // 為每個頁面創建 Markdown
            result.results.forEach(page => {
                const title = page.properties.Name?.title[0]?.text?.content || 'Untitled';
                const date = page.properties.Date?.date?.start || new Date().toISOString().split('T')[0];
                const summary = page.properties.Summary?.rich_text[0]?.text?.content || '';
                const source = page.properties.Source?.rich_text[0]?.text?.content || '';
                
                // 生成文件名
                const filename = `${date}_Notion_Sync.md`;
                const filepath = path.join(DOCS_DIR, filename);
                
                const content = `# ${title}

**來源：** Notion Abby's Research Reports  
**同步時間：** ${new Date().toISOString()}  
**原始日期：** ${date}

---

## 摘要

${summary}

---

## 來源

${source}

---

*此報告自動同步自 Notion*
`;
                
                fs.writeFileSync(filepath, content);
                console.log(`✅ 已創建: ${filename}`);
            });
            
        } catch (e) {
            console.error('Error:', e.message);
            process.exit(1);
        }
    });
});

req.on('error', (e) => {
    console.error('Request Error:', e.message);
    process.exit(1);
});

req.write(queryData);
req.end();
NODEEOF

# 2. 更新 mkdocs.yml 導航
echo "📝 更新 mkdocs.yml 導航..."

# 獲取最新的 5 個報告文件
LATEST_REPORTS=$(ls -t $DOCS_DIR/reports/*.md 2>/dev/null | head -5 | sed 's|.*/||; s|.md||')

# 生成新的導航部分
NAV_SECTION=""
for report in $LATEST_REPORTS; do
    # 提取日期和標題
    DATE=$(echo $report | grep -oE '^[0-9]{4}-[0-9]{2}-[0-9]{2}' || echo $report)
    NAV_SECTION="${NAV_SECTION}    - ${DATE}: reports/${report}.md\n"
done

echo "📋 最新報告:"
echo -e "$NAV_SECTION"

# 3. 構建和部署
echo "🔨 構建 MkDocs..."
mkdocs build

echo "🚀 部署到 Vercel..."
vercel --prod --yes

echo "✅ 同步完成！"
