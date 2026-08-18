-- Phase 1B — 마케팅 데이터 활용 동의 컬럼 (user_settings 일관성)
-- 잠금 L11: 동의자(marketing_data_consent=true) 데이터만 마케팅 콘텐츠 풀에 진입
-- 출처: docs/marketing/MARKETING-BOARD.md, /Users/family/.claude/plans/unified-finding-yao.md §3.7 (Phase 1B)
--
-- 동의는 user_settings 테이블에 보관 (marketing_agreed 와 같은 패턴).
-- 익명화 뷰(`vw_marketing_behavior_improvement`)는 JOIN user_settings 로 필터링.

ALTER TABLE public.user_settings
  ADD COLUMN IF NOT EXISTS marketing_data_consent BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS marketing_data_consent_at TIMESTAMPTZ;

-- 동의 토글 시점 자동 기록
CREATE OR REPLACE FUNCTION public.set_marketing_data_consent_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.marketing_data_consent = true AND (OLD.marketing_data_consent IS DISTINCT FROM true) THEN
    NEW.marketing_data_consent_at = now();
  ELSIF NEW.marketing_data_consent = false AND (OLD.marketing_data_consent IS DISTINCT FROM false) THEN
    NEW.marketing_data_consent_at = NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_marketing_data_consent_at ON public.user_settings;
CREATE TRIGGER trg_set_marketing_data_consent_at
  BEFORE UPDATE OF marketing_data_consent ON public.user_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.set_marketing_data_consent_at();

COMMENT ON COLUMN public.user_settings.marketing_data_consent IS
  '마케팅 데이터 익명 활용 동의 (Phase 1B, L11). true 사용자만 vw_marketing_behavior_improvement 뷰에 노출.';
COMMENT ON COLUMN public.user_settings.marketing_data_consent_at IS
  '동의 일시. 동의 철회 시 NULL.';
