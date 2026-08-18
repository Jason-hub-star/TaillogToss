-- Phase 2-4 — 마케팅 큐 + 인사이트 로그 테이블
-- 출처: mungmungfit 스키마 차용, /Users/family/.claude/plans/unified-finding-yao.md §3.7 (C2.1, C3.1, C4.2)

-- ===== threads_queue =====
CREATE TABLE IF NOT EXISTS public.threads_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  text TEXT NOT NULL,
  media_url TEXT,
  link_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'published', 'failed', 'skipped')),
  scheduled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  threads_post_id TEXT,
  published_at TIMESTAMPTZ,
  source TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_threads_queue_status_scheduled
  ON public.threads_queue (status, scheduled_at)
  WHERE status = 'pending';

CREATE UNIQUE INDEX IF NOT EXISTS uq_threads_queue_link_url
  ON public.threads_queue (link_url)
  WHERE link_url IS NOT NULL;

-- ===== instagram_queue =====
CREATE TABLE IF NOT EXISTS public.instagram_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type TEXT NOT NULL CHECK (content_type IN ('text', 'image', 'carousel', 'reel')),
  media_urls TEXT[] DEFAULT '{}',
  caption TEXT NOT NULL,
  hashtags TEXT,
  link_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'published', 'failed', 'skipped')),
  scheduled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  instagram_post_id TEXT,
  published_at TIMESTAMPTZ,
  source TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_instagram_queue_status_scheduled
  ON public.instagram_queue (status, scheduled_at)
  WHERE status = 'pending';

-- ===== insights_log =====
CREATE TABLE IF NOT EXISTS public.insights_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_id UUID NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('instagram', 'threads', 'blog', 'karrot')),
  views INT,
  reach INT,
  likes INT,
  comments INT,
  shares INT,
  saves INT,
  raw JSONB,
  collected_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_insights_log_queue_id ON public.insights_log (queue_id);
CREATE INDEX IF NOT EXISTS idx_insights_log_platform_collected
  ON public.insights_log (platform, collected_at DESC);

-- ===== marketing_budget_log (월 5만원 가드레일 추적) =====
CREATE TABLE IF NOT EXISTS public.marketing_budget_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel TEXT NOT NULL CHECK (channel IN ('instagram_ads', 'karrot_local', 'domain', 'tokens', 'other')),
  amount_krw INT NOT NULL CHECK (amount_krw > 0),
  description TEXT,
  incurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_marketing_budget_log_incurred
  ON public.marketing_budget_log (incurred_at DESC);

-- ===== RLS — service_role만 모든 마케팅 큐/로그 접근 =====
ALTER TABLE public.threads_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.instagram_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insights_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_budget_log ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.threads_queue FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.instagram_queue FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.insights_log FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.marketing_budget_log FROM PUBLIC, anon, authenticated;

GRANT SELECT, INSERT, UPDATE ON public.threads_queue TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.instagram_queue TO service_role;
GRANT SELECT, INSERT ON public.insights_log TO service_role;
GRANT SELECT, INSERT ON public.marketing_budget_log TO service_role;

COMMENT ON TABLE public.threads_queue IS 'Phase 2: Threads 자동 발행 큐. mungmungfit 스키마 차용.';
COMMENT ON TABLE public.instagram_queue IS 'Phase 3: Instagram 자동 발행 큐.';
COMMENT ON TABLE public.insights_log IS 'Phase 4: 4채널 인사이트 누적. Instagram Insights API + Threads + GA4 referer.';
COMMENT ON TABLE public.marketing_budget_log IS 'Phase 4: L3 월 5만원 가드레일 모니터링. 4만원 도달 시 알림, 5만원 도달 시 일시정지.';
