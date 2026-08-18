-- Phase 5 — 공유 리워드 (양방향 친구 초대 보상)
-- 잠금 L10: 공유 리워드 SDK 연동·DB·자동화는 본 플랜에 포함
-- 출처: /Users/family/.claude/plans/unified-finding-yao.md §3.7 (C5.1, C5.2, C5.3)
--
-- 보상: 양방향 500pt × 2 = 1쌍당 1,000원 (사용자 합의)
-- 어뷰징 방어: 7일 이내 + 행동기록 3건 + IP/디바이스 자가초대 차단 + 월 50쌍 한도

-- ===== 1. users.share_code 컬럼 추가 + 자동 생성 =====
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS share_code TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS uq_users_share_code
  ON public.users (share_code)
  WHERE share_code IS NOT NULL;

CREATE OR REPLACE FUNCTION public.generate_share_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';  -- I, O, 0, 1 제외 (혼동 방지)
  result TEXT := '';
  i INT;
BEGIN
  FOR i IN 1..6 LOOP
    result := result || SUBSTR(chars, (RANDOM() * LENGTH(chars))::INT + 1, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql VOLATILE;

CREATE OR REPLACE FUNCTION public.assign_share_code_on_insert()
RETURNS TRIGGER AS $$
DECLARE
  attempt_count INT := 0;
  new_code TEXT;
BEGIN
  IF NEW.share_code IS NOT NULL THEN RETURN NEW; END IF;
  LOOP
    new_code := public.generate_share_code();
    BEGIN
      NEW.share_code := new_code;
      EXIT;
    EXCEPTION WHEN unique_violation THEN
      attempt_count := attempt_count + 1;
      IF attempt_count > 10 THEN
        RAISE EXCEPTION 'Failed to generate unique share_code after 10 attempts';
      END IF;
    END;
  END LOOP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_assign_share_code_on_insert ON public.users;
CREATE TRIGGER trg_assign_share_code_on_insert
  BEFORE INSERT ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_share_code_on_insert();

-- 기존 사용자에 share_code 일괄 부여
UPDATE public.users SET share_code = public.generate_share_code() WHERE share_code IS NULL;

-- ===== 2. referrals 테이블 =====
CREATE TABLE IF NOT EXISTS public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  invitee_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  share_code TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'granted', 'expired')),
  invitee_ip TEXT,  -- 자가초대 검증용 (auth.users.last_sign_in_ip 미러)
  invitee_action_count INT NOT NULL DEFAULT 0,  -- 행동기록 3건 검증용
  granted_at TIMESTAMPTZ,
  expired_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT no_self_referral CHECK (referrer_user_id != invitee_user_id),
  CONSTRAINT uq_invitee UNIQUE (invitee_user_id)  -- 1유저는 1번만 초대받음
);

CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON public.referrals (referrer_user_id);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON public.referrals (status);
CREATE INDEX IF NOT EXISTS idx_referrals_pending_created
  ON public.referrals (created_at)
  WHERE status IN ('pending', 'accepted');

-- ===== 3. status='granted' 전이 시 point_events 양방향 INSERT 트리거 =====
-- 주: point_events 테이블은 Phase 5의 §3.5 마이그레이션에서 신설 예정. 본 마이그레이션은 그보다 먼저
--     적용될 수 있으므로 point_events가 존재할 때만 INSERT (방어적)
CREATE OR REPLACE FUNCTION public.referral_granted_to_point_events()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'granted' AND (OLD.status IS NULL OR OLD.status != 'granted') THEN
    NEW.granted_at := COALESCE(NEW.granted_at, now());

    IF to_regclass('public.point_events') IS NOT NULL THEN
      INSERT INTO public.point_events (user_id, event_type, source_id, points, reason_code)
      VALUES
        (NEW.referrer_user_id, 'referral_granted', NEW.id, 500, 'referral_reward'),
        (NEW.invitee_user_id, 'referral_granted', NEW.id, 500, 'referral_reward');
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_referral_granted ON public.referrals;
CREATE TRIGGER trg_referral_granted
  BEFORE UPDATE OF status ON public.referrals
  FOR EACH ROW
  EXECUTE FUNCTION public.referral_granted_to_point_events();

-- ===== 4. RLS =====
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

-- 본인의 referral 만 SELECT
CREATE POLICY referrals_select_own ON public.referrals
  FOR SELECT
  USING (referrer_user_id = auth.uid() OR invitee_user_id = auth.uid());

-- INSERT/UPDATE는 service_role만 (Edge Function 경유)
GRANT SELECT ON public.referrals TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.referrals TO service_role;

COMMENT ON TABLE public.referrals IS
  'Phase 5: 양방향 친구 초대 보상. 1쌍당 양쪽 500pt = 1,000원 비용. 7일+3건 조건 + IP 자가초대 차단 + 월 50쌍 한도.';
COMMENT ON COLUMN public.users.share_code IS
  '친구 초대 코드 (6자리 영숫자, I/O/0/1 제외). 가입 시 자동 생성.';
