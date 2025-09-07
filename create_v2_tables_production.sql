-- Create V2 tables in production database
-- Run this in Supabase SQL Editor

-- Drop existing tables if they exist (to ensure clean creation)
DROP TABLE IF EXISTS performance_metrics_v2 CASCADE;
DROP TABLE IF EXISTS click_logs_v2 CASCADE;
DROP TABLE IF EXISTS links_v2 CASCADE;
DROP TABLE IF EXISTS short_links_v2 CASCADE;
DROP TABLE IF EXISTS brand_configs CASCADE;

-- Create V2 tables
CREATE TABLE short_links_v2 (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    short_code TEXT UNIQUE NOT NULL,
    original_url TEXT NOT NULL,
    impact_link TEXT,
    brand_id TEXT,
    creator_id TEXT NOT NULL,
    clicks INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE links_v2 (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    short_link_id TEXT UNIQUE NOT NULL,
    destination_url TEXT NOT NULL,
    impact_link TEXT,
    qr_code_url TEXT,
    brand_id TEXT,
    creator_id TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (short_link_id) REFERENCES short_links_v2(id) ON DELETE CASCADE
);

CREATE TABLE brand_configs (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    impact_account_sid TEXT,
    impact_auth_token TEXT,
    impact_program_id TEXT,
    default_commission_rate DOUBLE PRECISION DEFAULT 0.1,
    custom_domain TEXT,
    is_active BOOLEAN DEFAULT true,
    settings JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE click_logs_v2 (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    short_link_id TEXT NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    referrer TEXT,
    country TEXT,
    city TEXT,
    device TEXT,
    browser TEXT,
    os TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (short_link_id) REFERENCES short_links_v2(id) ON DELETE CASCADE
);

CREATE TABLE performance_metrics_v2 (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    short_link_id TEXT NOT NULL,
    generation_time INTEGER NOT NULL,
    api_calls INTEGER NOT NULL,
    cache_hits INTEGER NOT NULL,
    errors INTEGER NOT NULL,
    brand_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (short_link_id) REFERENCES short_links_v2(id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX idx_short_links_v2_short_code ON short_links_v2(short_code);
CREATE INDEX idx_short_links_v2_creator_id ON short_links_v2(creator_id);
CREATE INDEX idx_links_v2_creator_id ON links_v2(creator_id);
CREATE INDEX idx_links_v2_brand_id ON links_v2(brand_id);
CREATE INDEX idx_click_logs_v2_short_link_id ON click_logs_v2(short_link_id);
CREATE INDEX idx_performance_metrics_v2_created_at ON performance_metrics_v2(created_at);

-- Verify tables were created
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE '%v2%'
ORDER BY table_name;
