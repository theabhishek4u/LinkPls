-- ═══════════════════════════════════════════════════════════════
-- InAutoDm — Database Schema v1
-- Follow-Gate Instagram Automation SaaS
-- ═══════════════════════════════════════════════════════════════

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Profiles (extends Supabase Auth) ──
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    ig_business_id TEXT,
    ig_username TEXT,
    ig_access_token TEXT,
    ig_page_id TEXT,
    plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'enterprise')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ── Campaigns (automation rule sets) ──
CREATE TABLE public.campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    trigger_keyword TEXT NOT NULL,
    comment_replies JSONB NOT NULL DEFAULT '[]'::jsonb,
    welcome_dm_text TEXT NOT NULL DEFAULT 'Hey there! I''m so happy you''re here, thanks so much for your interest 😊',
    welcome_dm_buttons JSONB NOT NULL DEFAULT '[
        {"content_type":"text","title":"Give me access","payload":"FOLLOW_CHECK"},
        {"content_type":"text","title":"I''m following ✅","payload":"FOLLOW_CHECK"}
    ]'::jsonb,
    resource_template JSONB NOT NULL DEFAULT '{
        "text": "You''re amazing! 🎉 Here''s your exclusive access:",
        "buttons": []
    }'::jsonb,
    error_template JSONB NOT NULL DEFAULT '{
        "text": "Oh no! It seems you''re not following me 👀... Visit my profile and hit follow, then tap the button again!",
        "buttons": [{"content_type":"text","title":"I''m following ✅","payload":"FOLLOW_CHECK"}]
    }'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ── Media Mappings (Reel/Post → Link) ──
CREATE TABLE public.media_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
    ig_media_id TEXT NOT NULL,
    media_type TEXT CHECK (media_type IN ('REEL', 'POST', 'STORY', 'CAROUSEL')),
    media_url TEXT,
    media_thumbnail TEXT,
    media_caption TEXT,
    resource_url TEXT NOT NULL,
    resource_label TEXT DEFAULT 'Your Resource',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(campaign_id, ig_media_id)
);

-- ── Interactions (full audit trail) ──
CREATE TABLE public.interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID REFERENCES public.campaigns(id) ON DELETE SET NULL,
    media_mapping_id UUID REFERENCES public.media_mappings(id) ON DELETE SET NULL,
    ig_user_id TEXT NOT NULL,
    ig_username TEXT,
    comment_id TEXT,
    comment_text TEXT,
    status TEXT DEFAULT 'triggered' CHECK (status IN (
        'triggered',
        'comment_replied',
        'dm_sent',
        'follow_verified',
        'follow_failed',
        'revoked',
        'error'
    )),
    error_message TEXT,
    follow_checked_at TIMESTAMPTZ,
    resource_sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ── Analytics Snapshots (daily rollups) ──
CREATE TABLE public.daily_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    total_triggers INTEGER DEFAULT 0,
    total_replies INTEGER DEFAULT 0,
    total_dms INTEGER DEFAULT 0,
    total_follows INTEGER DEFAULT 0,
    total_failures INTEGER DEFAULT 0,
    follow_rate NUMERIC(5,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, campaign_id, date)
);

-- ═══════════════════════════════════════════════════════════════
-- Indexes
-- ═══════════════════════════════════════════════════════════════

CREATE INDEX idx_interactions_ig_user ON public.interactions(ig_user_id);
CREATE INDEX idx_interactions_status ON public.interactions(status);
CREATE INDEX idx_interactions_campaign ON public.interactions(campaign_id);
CREATE INDEX idx_interactions_created ON public.interactions(created_at DESC);
CREATE INDEX idx_media_mappings_ig_media ON public.media_mappings(ig_media_id);
CREATE INDEX idx_media_mappings_campaign ON public.media_mappings(campaign_id);
CREATE INDEX idx_campaigns_keyword ON public.campaigns(trigger_keyword);
CREATE INDEX idx_campaigns_user ON public.campaigns(user_id);
CREATE INDEX idx_daily_stats_user_date ON public.daily_stats(user_id, date DESC);

-- ═══════════════════════════════════════════════════════════════
-- Row Level Security
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_stats ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE POLICY "profiles_own" ON public.profiles
    FOR ALL USING (auth.uid() = id);

-- Campaigns
CREATE POLICY "campaigns_own" ON public.campaigns
    FOR ALL USING (auth.uid() = user_id);

-- Media Mappings (via campaign ownership)
CREATE POLICY "media_mappings_own" ON public.media_mappings
    FOR ALL USING (
        campaign_id IN (SELECT id FROM public.campaigns WHERE user_id = auth.uid())
    );

-- Interactions (via campaign ownership)
CREATE POLICY "interactions_own" ON public.interactions
    FOR ALL USING (
        campaign_id IN (SELECT id FROM public.campaigns WHERE user_id = auth.uid())
    );

-- Daily Stats
CREATE POLICY "daily_stats_own" ON public.daily_stats
    FOR ALL USING (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════════
-- Triggers (auto-update updated_at)
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER campaigns_updated_at
    BEFORE UPDATE ON public.campaigns
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER interactions_updated_at
    BEFORE UPDATE ON public.interactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
