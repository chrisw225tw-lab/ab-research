# AB Research - MkDocs + Supabase 架構

## 🏗️ 新架構說明

### 問題
- 每天更新 4 次 → 需要 redeploy 4 次
- 每次 redeploy 耗時且產生新的 build

### 解決方案
- **靜態結構**（MkDocs）：導航、布局、樣式 → 很少 redeploy
- **動態數據**（Supabase）：市場數據、報告內容 → 實時更新

---

## 📁 文件結構

```
ab-research/
├── docs/
│   ├── javascripts/
│   │   └── supabase-client.js    # 客戶端數據載入
│   ├── reports/
│   │   ├── 2026-02-11.md         # 靜態模板（數據從 Supabase 載入）
│   │   └── ...
│   └── index.md                  # 首頁（動態更新報告列表）
├── scripts/
│   └── update-supabase.js        # 更新 Supabase 數據腳本
├── supabase_schema.sql           # Supabase 表結構
└── mkdocs.yml                    # MkDocs 配置
```

---

## 🗄️ Supabase 表結構

### daily_reports

| 欄位 | 類型 | 說明 |
|------|------|------|
| id | UUID | 主鍵 |
| report_date | DATE | 報告日期（唯一） |
| title | TEXT | 標題 |
| summary | TEXT | 摘要 |
| content_markdown | TEXT | Markdown 內容 |
| market_data | JSONB | 市場數據（BTC/ETH 價格等） |
| sources | JSONB | 來源連結 |
| created_at | TIMESTAMP | 創建時間 |
| updated_at | TIMESTAMP | 更新時間 |

---

## 🔄 更新流程

### 新流程（推薦）

```
Cron Job (每 6 小時)
  │
  ▼
運行 update-supabase.js
  │
  ▼
寫入 Supabase（只更新數據）
  │
  ▼
網站自動顯示新數據（無需 redeploy）
```

### 舊流程（對比）

```
Cron Job (每 6 小時)
  │
  ▼
生成 Markdown 文件
  │
  ▼
git commit → push
  │
  ▼
Vercel rebuild → redeploy（耗時）
```

---

## 🚀 設置步驟

### 1. 設置 Supabase

```bash
# 登入 Supabase Dashboard
# https://app.supabase.com/project/gfulzxjfgdfmkkuzktil

# 在 SQL Editor 中執行：
supabase_schema.sql
```

### 2. 獲取 Service Role Key

```
Supabase Dashboard → Project Settings → API
→ service_role key（用於服務端寫入）
```

### 3. 設置環境變數

```bash
# 在 ~/.openclaw/.env 中添加：
export SUPABASE_SERVICE_KEY='你的 service_role key'
```

### 4. 測試更新

```bash
cd /home/chris/.openclaw/workspace-work/ab-research
node scripts/update-supabase.js
```

### 5. 部署 MkDocs（只執行一次）

```bash
mkdocs build
vercel --prod
```

---

## 📅 Cron Job 更新

### 新 Cron Job（只更新 Supabase）

```javascript
{
  "name": "Update Supabase Daily Report",
  "schedule": "0 */6 * * *",  // 每 6 小時
  "command": "cd /home/chris/.openclaw/workspace-work/ab-research && node scripts/update-supabase.js"
}
```

### 何時需要 Redeploy？

| 情況 | 操作 |
|------|------|
| 添加新頁面/修改導航 | `vercel --prod` |
| 修改樣式/布局 | `vercel --prod` |
| 更新 JavaScript | `vercel --prod` |
| 只更新報告內容 | **無需 redeploy** |

---

## 💡 優點

- ✅ **減少 90% redeploy**：數據更新不再觸發 rebuild
- ✅ **即時更新**：Supabase 更新後，頁面刷新即見
- ✅ **更低成本**：減少 Vercel build 時間
- ✅ **保留 MkDocs**：美觀界面 + 搜索功能
- ✅ **可擴展**：容易添加更多動態數據

---

## 🔧 進階功能

### 實時訂閱（可選）

```javascript
// 在 supabase-client.js 中添加
supabaseClient
  .channel('daily_reports')
  .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'daily_reports' },
    payload => {
      console.log('數據更新:', payload);
      location.reload(); // 自動刷新頁面
    }
  )
  .subscribe();
```

### 緩存策略

- 靜態資源：Vercel CDN 緩存
- API 數據：Supabase 自動處理

---

## 📊 數據流

```
[新聞源] → [Cron Job] → [Supabase] ← [瀏覽器]
                              ↑
                         [MkDocs 靜態站點]
                              ↑
                         [Vercel CDN]
```
