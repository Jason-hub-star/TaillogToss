-- Phase 5 의존 — 행동 이벤트 → 토스 포인트 자동 지급 큐 시스템
-- 출처: /Users/family/.claude/plans/unified-finding-yao.md Phase 5 + B2/B10 (자기리뷰 발견 이슈)
--
-- 흐름:
--   1) 도메인 이벤트 발생 (referrals.granted, ai_coaching INSERT 등)
--   2) DB 트리거 또는 Edge Function 이 point_events INSERT (processed=false)
--   3) drainer (process-point-events) 가 매 10분 큐 폴링 → grant-toss-points 호출
--   4) point_transactions 에 토스 거래 결과 누적
--
-- 예산 가드레일 (L5 별도): MONTHLY_POINT_BUDGET_KRW=50000
--   누적 ≥ 40,000원 시 텔레그램 알림, ≥ 50,000원 시 drainer 일시정지

-- ===== 1. point_events 큐 =====
CREATE TABLE IF NOT EXISTS public.point_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  source_id UUID,                          -- 원본 이벤트 ID (referrals.id, ai_coaching.id 등)
  points INT NOT NULL CHECK (points > 0 AND points <= 5000),  -- 토스 4114 한도
  reason_code TEXT NOT NULL,
  processed BOOLEAN NOT NULL DEFAULT false,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_point_events_pending
  ON public.point_events (created_at)
  WHERE processed = false;

CREATE INDEX IF NOT EXISTS idx_point_events_user
  ON public.point_events (user_id, created_at DESC);

-- 중복 지급 방지 — 같은 (user_id, event_type, source_id) 조합은 1회만
CREATE UNIQUE INDEX IF NOT EXISTS uq_point_events_dedup
  ON public.point_events (user_id, event_type, source_id)
  WHERE source_id IS NOT NULL;

-- ===== 2. point_transactions — 토스 S2S 결과 추적 =====
CREATE TABLE IF NOT EXISTS public.point_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  point_event_id UUID NOT NULL REFERENCES public.point_events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  toss_grant_key TEXT,
  toss_transaction_id TEXT,
  toss_error_code TEXT,
  points INT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'granted', 'failed', 'skipped_budget')),
  retry_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_point_transactions_event ON public.point_transactions (point_event_id);
CREATE INDEX IF NOT EXISTS idx_point_transactions_user_status
  ON public.point_transactions (user_id, status, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS uq_point_transactions_grant_key
  ON public.point_transactions (toss_grant_key)
  WHERE toss_grant_key IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_point_transactions_toss_tx
  ON public.point_transactions (toss_transaction_id)
  WHERE toss_transaction_id IS NOT NULL;

-- ===== 3. 월별 누적 지급 합계 함수 (가드레일용) =====
CREATE OR REPLACE FUNCTION public.monthly_point_grants_total_krw(target_month TIMESTAMPTZ DEFAULT now())
RETURNS INT AS $$
DECLARE
  total INT;
BEGIN
  SELECT COALESCE(SUM(points), 0) INTO total
  FROM public.point_transactions
  WHERE status = 'granted'
    AND created_at >= date_trunc('month', target_month)
    AND created_at < date_trunc('month', target_month) + INTERVAL '1 month';
  RETURN total;  -- 1pt = 1원이므로 그대로 KRW
END;
$$ LANGUAGE plpgsql STABLE;

-- ===== 4. referrals 트리거에서 호출되는 함수가 이제 정상 동작 =====
-- referrals.granted 전이 시 referral_granted_to_point_events 트리거가 작동
-- 위 트리거는 to_regclass('public.point_events') 검사 후 INSERT — 본 마이그레이션 적용 후 활성화됨

-- ===== 5. AI 코칭 첫 건 INSERT 시 자동 point_events 트리거 =====
-- 사용자별 첫 코칭에만 500pt (스팸 방지)
CREATE OR REPLACE FUNCTION public.first_coaching_to_point_events()
RETURNS TRIGGER AS $$
DECLARE
  is_first BOOLEAN;
BEGIN
  SELECT NOT EXISTS (
    SELECT 1 FROM public.ai_coaching
    WHERE user_id = NEW.user_id AND id != NEW.id
  ) INTO is_first;

  IF is_first THEN
    INSERT INTO public.point_events (user_id, event_type, source_id, points, reason_code)
    VALUES (NEW.user_id, 'first_coaching_created', NEW.id, 500, 'first_coaching_bonus')
    ON CONFLICT (user_id, event_type, source_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ai_coaching 테이블이 존재할 때만 트리거 부착 (방어)
DO $$
BEGIN
  IF to_regclass('public.ai_coaching') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS trg_first_coaching_to_point_events ON public.ai_coaching;
    CREATE TRIGGER trg_first_coaching_to_point_events
      AFTER INSERT ON public.ai_coaching
      FOR EACH ROW
      EXECUTE FUNCTION public.first_coaching_to_point_events();
  END IF;
END;
$$;

-- ===== 6. 신규 가입 시 1,000pt 자동 지급 트리거 =====
-- 참고: 사용자가 합의한 정책은 이전 답변에서 1,000원이었지만 5만원 예산 가드레일 고려해서 보수적 100pt로 출발
--      나중에 ENV로 조정 가능하도록 reasonCode 기반
CREATE OR REPLACE FUNCTION public.signup_bonus_to_point_events()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.point_events (user_id, event_type, source_id, points, reason_code)
  VALUES (NEW.id, 'signup_completed', NEW.id, 100, 'signup_bonus')
  ON CONFLICT (user_id, event_type, source_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_signup_bonus_to_point_events ON public.users;
CREATE TRIGGER trg_signup_bonus_to_point_events
  AFTER INSERT ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.signup_bonus_to_point_events();

-- ===== 7. RLS =====
ALTER TABLE public.point_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.point_transactions ENABLE ROW LEVEL SECURITY;

-- 본인 거래 내역만 SELECT 가능
CREATE POLICY point_events_select_own ON public.point_events
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY point_transactions_select_own ON public.point_transactions
  FOR SELECT
  USING (user_id = auth.uid());

REVOKE ALL ON public.point_events FROM PUBLIC, anon;
REVOKE ALL ON public.point_transactions FROM PUBLIC, anon;
GRANT SELECT ON public.point_events TO authenticated;
GRANT SELECT ON public.point_transactions TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.point_events TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.point_transactions TO service_role;

COMMENT ON TABLE public.point_events IS
  'Phase 5 - 행동 이벤트 → 포인트 지급 큐. drainer (process-point-events) 가 폴링. 1pt=1원, 회당 ≤5000pt.';
COMMENT ON TABLE public.point_transactions IS
  'Phase 5 - 토스 S2S 포인트 지급 결과 추적. status=granted 합계로 월 예산 가드레일 산출.';
