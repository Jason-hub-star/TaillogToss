-- Phase 1B — 마케팅용 익명화 뷰 + 행동 개선률 계산 함수
-- 잠금 L11: 사용자명·반려견명·정확한 일시·세부 견종 모두 미노출
--   견종 → 소/중/대형견 카테고리
--   일시 → 가입 후 N일차로 상대화
--   ID → 해시(SHA256 prefix 8자)
-- 출처: /Users/family/.claude/plans/unified-finding-yao.md §3.7 (C1B.2, C1B.3)

-- ===== 1. 견종 → 사이즈 카테고리 매핑 함수 =====
CREATE OR REPLACE FUNCTION public.dog_size_category(weight_kg NUMERIC)
RETURNS TEXT AS $$
BEGIN
  IF weight_kg IS NULL THEN RETURN '미상'; END IF;
  IF weight_kg < 10 THEN RETURN '소형견'; END IF;
  IF weight_kg < 25 THEN RETURN '중형견'; END IF;
  RETURN '대형견';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ===== 2. 나이 → 연령대 매핑 함수 =====
CREATE OR REPLACE FUNCTION public.dog_age_range(birth_date DATE)
RETURNS TEXT AS $$
DECLARE
  age_years INT;
BEGIN
  IF birth_date IS NULL THEN RETURN '미상'; END IF;
  age_years = EXTRACT(YEAR FROM age(birth_date));
  IF age_years < 2 THEN RETURN '퍼피'; END IF;
  IF age_years < 7 THEN RETURN '성견'; END IF;
  RETURN '노령견';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ===== 3. 사례 ID 해시 함수 (개인 식별 불가) =====
CREATE OR REPLACE FUNCTION public.marketing_case_id(user_id UUID, dog_id UUID)
RETURNS TEXT AS $$
BEGIN
  RETURN '사례 #' || SUBSTR(encode(digest(user_id::text || dog_id::text, 'sha256'), 'hex'), 1, 8);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ===== 4. 익명화 행동 개선률 뷰 =====
-- 동의 사용자(marketing_data_consent=true)의 7일 평균 강도를
-- 첫 7일(week_1_avg) vs 4주차(week_4_avg)로 비교
-- 견종 카테고리·연령대·행동 카테고리별로 노출
-- 절대 노출 금지: user_id, dog_id, owner_name, dog_name, exact dates
CREATE OR REPLACE VIEW public.vw_marketing_behavior_improvement AS
WITH consented_dogs AS (
  SELECT d.id AS dog_id,
         d.user_id,
         d.weight_kg,
         d.birth_date,
         u.created_at AS user_signup_at
  FROM public.dogs d
  JOIN public.users u ON u.id = d.user_id
  JOIN public.user_settings us ON us.user_id = u.id
  WHERE us.marketing_data_consent = true
),
week_buckets AS (
  SELECT cd.dog_id,
         cd.user_id,
         cd.weight_kg,
         cd.birth_date,
         bl.behavior_category,
         FLOOR(EXTRACT(EPOCH FROM (bl.occurred_at - cd.user_signup_at)) / (7 * 86400))::INT AS week_index,
         bl.intensity
  FROM consented_dogs cd
  JOIN public.behavior_logs bl ON bl.dog_id = cd.dog_id
  WHERE bl.occurred_at >= cd.user_signup_at
    AND bl.occurred_at < cd.user_signup_at + INTERVAL '30 days'
),
aggregated AS (
  SELECT dog_id,
         user_id,
         weight_kg,
         birth_date,
         behavior_category,
         AVG(CASE WHEN week_index = 0 THEN intensity END) AS week_1_avg,
         AVG(CASE WHEN week_index = 3 THEN intensity END) AS week_4_avg,
         COUNT(*) FILTER (WHERE week_index = 0) AS week_1_n,
         COUNT(*) FILTER (WHERE week_index = 3) AS week_4_n
  FROM week_buckets
  GROUP BY dog_id, user_id, weight_kg, birth_date, behavior_category
)
SELECT public.marketing_case_id(user_id, dog_id) AS case_id,
       public.dog_size_category(weight_kg) AS dog_size,
       public.dog_age_range(birth_date) AS dog_age_range,
       behavior_category,
       ROUND(week_1_avg::NUMERIC, 1) AS week_1_avg,
       ROUND(week_4_avg::NUMERIC, 1) AS week_4_avg,
       CASE
         WHEN week_1_avg > 0 AND week_4_avg IS NOT NULL
         THEN ROUND(((week_1_avg - week_4_avg) / week_1_avg * 100)::NUMERIC, 1)
         ELSE NULL
       END AS improvement_pct
FROM aggregated
WHERE week_1_n >= 3 AND week_4_n >= 3;

COMMENT ON VIEW public.vw_marketing_behavior_improvement IS
  '마케팅 콘텐츠 생성용 익명화 행동 개선률 뷰. PII(이름·정확한 일시·세부 견종) 모두 미노출. L11 잠금 사항.';

-- ===== 5. PII 검증 SQL — 뷰 검증용 (Phase 1B 자기리뷰 통과 조건) =====
-- 실행: SELECT COUNT(*) FROM vw_marketing_behavior_improvement WHERE case_id !~ '^사례 #[a-f0-9]{8}$';
-- 기대값: 0 (해시 형식 외 ID 없음)

-- ===== 6. RLS — 익명화 뷰는 service_role만 접근 (마케팅 자동화 전용) =====
-- 뷰는 RLS를 직접 못 가지므로 GRANT로 제한
REVOKE ALL ON public.vw_marketing_behavior_improvement FROM PUBLIC;
REVOKE ALL ON public.vw_marketing_behavior_improvement FROM authenticated;
REVOKE ALL ON public.vw_marketing_behavior_improvement FROM anon;
GRANT SELECT ON public.vw_marketing_behavior_improvement TO service_role;
