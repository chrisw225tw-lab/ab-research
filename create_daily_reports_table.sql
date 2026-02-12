-- Run this SQL in Supabase Dashboard SQL Editor to create the daily_reports table

CREATE TABLE IF NOT EXISTS daily_reports (
    id SERIAL PRIMARY KEY,
    report_date DATE UNIQUE NOT NULL,
    market_data JSONB,
    content_markdown TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS (optional but recommended)
ALTER TABLE daily_reports ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access (for website)
CREATE POLICY "Allow public read access" ON daily_reports
    FOR SELECT USING (true);

-- Create policy for service role insert/update
CREATE POLICY "Allow service role full access" ON daily_reports
    FOR ALL USING (true) WITH CHECK (true);

-- Create index on report_date for faster queries
CREATE INDEX IF NOT EXISTS idx_daily_reports_date ON daily_reports(report_date);
