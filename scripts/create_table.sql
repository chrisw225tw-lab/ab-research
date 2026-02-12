-- 在 Supabase Dashboard SQL Editor 中執行此腳本
-- 創建 daily_reports 表

CREATE TABLE IF NOT EXISTS daily_reports (
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

CREATE INDEX IF NOT EXISTS idx_daily_reports_date ON daily_reports(report_date DESC);

-- 啟用 RLS
ALTER TABLE daily_reports ENABLE ROW LEVEL SECURITY;

-- 允許匿名讀取
DROP POLICY IF EXISTS "Allow anonymous read" ON daily_reports;
CREATE POLICY "Allow anonymous read" 
ON daily_reports FOR SELECT 
TO anon USING (true);

-- 允許 service role 寫入
DROP POLICY IF EXISTS "Allow service role write" ON daily_reports;
CREATE POLICY "Allow service role write"
ON daily_reports FOR ALL
TO service_role USING (true);

-- 自動更新 updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_daily_reports_updated_at ON daily_reports;
CREATE TRIGGER update_daily_reports_updated_at
  BEFORE UPDATE ON daily_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
