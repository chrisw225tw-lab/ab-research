const https = require('https');
const fs = require('fs');
const path = require('path');

const NOTION_TOKEN = process.env.NOTION_TOKEN || process.env.NOTION_API_KEY;
const DB_ID = '302078a7-daec-80b9-9473-c70a619c755e';
const DOCS_DIR = '/home/chris/.openclaw/workspace-work/ab-research/docs/reports';
const MKDOCS_FILE = '/home/chris/.openclaw/workspace-work/ab-research/mkdocs.yml';

if (!NOTION_TOKEN) {
    console.error('❌ NOTION_TOKEN not set');
    process.exit(1);
}

console.log('🔄 Notion → MkDocs 同步開始');

// 1. 查詢 Notion 數據庫
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
            
            // 调试输出
            console.log('API Response status:', res.statusCode);
            console.log('Results count:', result.results ? result.results.length : 0);
            
            if (result.error) {
                console.error('❌ Notion API Error:', result.error.message);
                process.exit(1);
            }
            
            if (!result.results || result.results.length === 0) {
                console.log('⚠️  No reports found in Notion database');
                process.exit(0);
            }
            
            console.log(`📊 找到 ${result.results.length} 條報告`);
            
            const navEntries = [];
            
            // 為每個頁面創建 Markdown
            result.results.forEach((page, index) => {
                console.log(`Processing page ${index + 1}:`, page.id);
                
                const title = page.properties?.Name?.title?.[0]?.text?.content || 'Untitled';
                const date = page.properties?.Date?.date?.start || new Date().toISOString().split('T')[0];
                const summary = page.properties?.Summary?.rich_text?.[0]?.text?.content || '';
                const source = page.properties?.Source?.rich_text?.[0]?.text?.content || '';
                const url = page.url || `https://notion.so/${page.id.replace(/-/g, '')}`;
                
                // 生成文件名
                const filename = `${date}_Notion.md`;
                const filepath = path.join(DOCS_DIR, filename);
                
                const content = `# ${title}

**來源：** [Notion Abby's Research Reports](${url})  
**同步時間：** ${new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Hong_Kong' })} HKT  
**原始日期：** ${date}

---

## 摘要

${summary || '（無摘要）'}

---

## 來源資訊

${source || '（無來源資訊）'}

---

[🔗 在 Notion 中查看](${url})

*此報告自動同步自 Notion*
`;
                
                // 檢查文件是否已存在且內容相同
                let shouldWrite = true;
                if (fs.existsSync(filepath)) {
                    const existingContent = fs.readFileSync(filepath, 'utf8');
                    if (existingContent.includes(summary) && summary.length > 10) {
                        console.log(`⏭️  跳過（無變更）: ${filename}`);
                        shouldWrite = false;
                    }
                }
                
                if (shouldWrite) {
                    fs.writeFileSync(filepath, content);
                    console.log(`✅ 已創建/更新: ${filename}`);
                }
                
                navEntries.push({ date, filename: `reports/${filename}` });
            });
            
            // 2. 更新 mkdocs.yml
            updateMkdocs(navEntries);
            
        } catch (e) {
            console.error('❌ Error:', e.message);
            process.exit(1);
        }
    });
});

req.on('error', (e) => {
    console.error('❌ Request Error:', e.message);
    process.exit(1);
});

req.write(queryData);
req.end();

function updateMkdocs(navEntries) {
    console.log('\n📝 更新 mkdocs.yml...');
    
    let mkdocsContent = fs.readFileSync(MKDOCS_FILE, 'utf8');
    
    // 找到每日報告部分
    const navPattern = /(  - 📊 每日報告:\n)([\s\S]*?)(?=  - 🔗|$)/;
    
    // 生成新的導航條目（最新的 7 個）
    const latestEntries = navEntries.slice(0, 7);
    let newNavSection = '  - 📊 每日報告:\n';
    
    latestEntries.forEach(entry => {
        const displayName = entry.date;
        newNavSection += `    - ${displayName}: ${entry.filename}\n`;
    });
    
    // 替換舊的導航部分
    if (navPattern.test(mkdocsContent)) {
        mkdocsContent = mkdocsContent.replace(navPattern, newNavSection);
    } else {
        // 如果找不到，在首頁後面插入
        mkdocsContent = mkdocsContent.replace(
            /(nav:\n  - 首頁: index\.md\n)/,
            `$1${newNavSection}`
        );
    }
    
    fs.writeFileSync(MKDOCS_FILE, mkdocsContent);
    console.log('✅ mkdocs.yml 已更新');
    
    // 3. 也更新 index.md
    updateIndex(latestEntries);
}

function updateIndex(navEntries) {
    console.log('\n📝 更新 index.md...');
    
    const indexPath = '/home/chris/.openclaw/workspace-work/ab-research/docs/index.md';
    let indexContent = fs.readFileSync(indexPath, 'utf8');
    
    // 生成新的報告表格
    let newTable = '## 📊 最新報告\n\n| 日期 | 報告 | 來源 |\n|------|------|------|\n';
    
    navEntries.slice(0, 5).forEach(entry => {
        const reportName = entry.date.includes('Notion') ? 'Notion 同步' : '每日情報報告';
        newTable += `| ${entry.date} | [${reportName}](${entry.filename.replace('.md', '/')}) | Notion |\n`;
    });
    
    // 替換舊的報告部分
    const tablePattern = /## 📊 最新報告[\s\S]*?(?=## 🔗|$)/;
    if (tablePattern.test(indexContent)) {
        indexContent = indexContent.replace(tablePattern, newTable + '\n');
    }
    
    // 更新最後更新時間
    indexContent = indexContent.replace(
        /\*最後更新：.*\*/,
        `*最後更新：${new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Hong_Kong' })}*`
    );
    
    fs.writeFileSync(indexPath, indexContent);
    console.log('✅ index.md 已更新');
}
