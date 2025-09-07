
-- V2 Link Generation Tables
-- These are completely independent from V1 and won't affect existing functionality

CREATE TABLE IF NOT EXISTS short_links_v2 (
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

CREATE TABLE IF NOT EXISTS links_v2 (
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

CREATE TABLE IF NOT EXISTS brand_configs (
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

CREATE TABLE IF NOT EXISTS click_logs_v2 (
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

CREATE TABLE IF NOT EXISTS performance_metrics_v2 (
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
CREATE INDEX IF NOT EXISTS idx_short_links_v2_short_code ON short_links_v2(short_code);
CREATE INDEX IF NOT EXISTS idx_short_links_v2_creator_id ON short_links_v2(creator_id);
CREATE INDEX IF NOT EXISTS idx_links_v2_creator_id ON links_v2(creator_id);
CREATE INDEX IF NOT EXISTS idx_links_v2_brand_id ON links_v2(brand_id);
CREATE INDEX IF NOT EXISTS idx_click_logs_v2_short_link_id ON click_logs_v2(short_link_id);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_v2_created_at ON performance_metrics_v2(created_at);

