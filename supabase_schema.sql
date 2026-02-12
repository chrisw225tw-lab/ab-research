-- Supabase 數據庫結構設置
-- 用於 AB Research 每日報告

-- 1. 創建每日報告表
CREATE TABLE daily_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_date DATE UNIQUE NOT NULL,
  title TEXT NOT NULL,
  summary TEXT,
  content_markdown TEXT NOT NULL,
  market_data JSONB DEFAULT '{}',
  sources JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. 創建索引
CREATE INDEX idx_daily_reports_date ON daily_reports(report_date DESC);

-- 3. 啟用 Row Level Security
ALTER TABLE daily_reports ENABLE ROW LEVEL SECURITY;

-- 4. 允許匿名讀取（公開訪問）
CREATE POLICY "Allow anonymous read" 
ON daily_reports FOR SELECT 
TO anon USING (true);

-- 5. 允許服務角色寫入（用於 Cron job）
CREATE POLICY "Allow service role write"
ON daily_reports FOR ALL
TO service_role USING (true);

-- 6. 自動更新 updated_at 觸發器
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_daily_reports_updated_at
  BEFORE UPDATE ON daily_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 7. 插入測試數據（示例）
INSERT INTO daily_reports (report_date, title, summary, content_markdown, market_data, sources)
VALUES (
  '2026-02-12',
  '2026年2月12日 - 每日市場情報',
  'BTC 回升至 $67,500，ETH 穩定在 $1,950。Consensus HK 持續進行，香港監管利好頻傳。',
  '# 2026年2月12日 市場情報\n\n## 價格動態\n- BTC: $67,500 (+2.1%)\n- ETH: $1,950 (+0.8%)\n\n## 重點新聞\n...',
  '{"btc": 67500, "eth": 1950, "btc_24h": 2.1, "eth_24h": 0.8}',
  '[{"name": "BlockTempo", "url": "https://www.blocktempo.com/"}, {"name": "CoinDesk", "url": "https://www.coindesk.com/"}]'
) ON CONFLICT (report_date) DO NOTHING;
