-- Marketing capture seed for DEV_LOCAL screenshots.
-- Scope: mock_stable_user_001 only. Safe to re-run.

BEGIN;

WITH target_user AS (
  SELECT id
  FROM public.users
  WHERE toss_user_key = 'mock_stable_user_001'
  LIMIT 1
),
upsert_subscription AS (
  INSERT INTO public.subscriptions (
    id,
    user_id,
    plan_type,
    next_billing_date,
    is_active,
    ai_tokens_remaining,
    ai_tokens_total,
    updated_at
  )
  SELECT
    '11111111-1111-4111-8111-111111111101'::uuid,
    id,
    'PRO_MONTHLY',
    (current_date + interval '30 days')::date,
    true,
    42,
    60,
    now()
  FROM target_user
  ON CONFLICT (user_id) DO UPDATE SET
    plan_type = excluded.plan_type,
    next_billing_date = excluded.next_billing_date,
    is_active = excluded.is_active,
    ai_tokens_remaining = excluded.ai_tokens_remaining,
    ai_tokens_total = excluded.ai_tokens_total,
    updated_at = now()
  RETURNING 1
),
upsert_dog AS (
  INSERT INTO public.dogs (
    id,
    user_id,
    name,
    breed,
    birth_date,
    sex,
    weight_kg,
    profile_image_url,
    vet_name,
    parent_address,
    updated_at
  )
  SELECT
    '11111111-1111-4111-8111-111111111201'::uuid,
    id,
    '메이',
    '비숑프리제',
    '2022-04-18',
    'FEMALE_NEUTERED',
    5.4,
    null,
    '테일로그 동물병원',
    '서울 강남구',
    now()
  FROM target_user
  ON CONFLICT (id) DO UPDATE SET
    name = excluded.name,
    breed = excluded.breed,
    birth_date = excluded.birth_date,
    sex = excluded.sex,
    weight_kg = excluded.weight_kg,
    profile_image_url = excluded.profile_image_url,
    vet_name = excluded.vet_name,
    parent_address = excluded.parent_address,
    updated_at = now()
  RETURNING 1
),
upsert_env AS (
  INSERT INTO public.dog_env (
    id,
    dog_id,
    household_info,
    health_meta,
    profile_meta,
    rewards_meta,
    chronic_issues,
    antecedents,
    triggers,
    past_attempts,
    temperament,
    activity_meta,
    onboarding_survey,
    updated_at
  )
  VALUES (
    '11111111-1111-4111-8111-111111111202'::uuid,
    '11111111-1111-4111-8111-111111111201'::uuid,
    '{"members": 2, "home_type": "apartment", "has_children": false}'::jsonb,
    '{"conditions": ["슬개골 주의"], "food": "저지방 사료"}'::jsonb,
    '{"energy_level": "medium", "social_style": "cautious"}'::jsonb,
    '{"favorite_rewards": ["닭가슴살", "노즈워크", "짧은 칭찬"]}'::jsonb,
    '{"top_issues": ["barking", "anxiety", "separation_anxiety"], "severity": "moderate"}'::jsonb,
    '{"items": ["초인종", "택배 도착", "보호자 외출 준비"]}'::jsonb,
    '{"ids": ["doorbell", "stranger", "separation", "loud_noise"]}'::jsonb,
    '{"tried": ["초인종 녹음", "외출 전 산책", "간식 보상"], "worked": ["노즈워크 후 대기"]}'::jsonb,
    '{"sensitivity": "sound", "recovery": "improving", "confidence": "building"}'::jsonb,
    '{"walk_minutes": 45, "play_routine": "저녁 노즈워크 10분", "sleep_quality": "good"}'::jsonb,
    '{"completion_stage": 3, "primary_behaviors": ["barking", "anxiety", "separation_anxiety"], "goals": ["초인종 짖음 줄이기", "20분 혼자 있기", "산책 중 회복 시간 줄이기"]}'::jsonb,
    now()
  )
  ON CONFLICT (dog_id) DO UPDATE SET
    household_info = excluded.household_info,
    health_meta = excluded.health_meta,
    profile_meta = excluded.profile_meta,
    rewards_meta = excluded.rewards_meta,
    chronic_issues = excluded.chronic_issues,
    antecedents = excluded.antecedents,
    triggers = excluded.triggers,
    past_attempts = excluded.past_attempts,
    temperament = excluded.temperament,
    activity_meta = excluded.activity_meta,
    onboarding_survey = excluded.onboarding_survey,
    updated_at = now()
  RETURNING 1
),
clear_existing_logs AS (
  DELETE FROM public.behavior_logs
  WHERE dog_id = '11111111-1111-4111-8111-111111111201'::uuid
  RETURNING 1
),
insert_logs AS (
  INSERT INTO public.behavior_logs (
    id,
    dog_id,
    is_quick_log,
    type_id,
    quick_category,
    intensity,
    duration_minutes,
    antecedent,
    behavior,
    consequence,
    daily_activity,
    location,
    memo,
    occurrence_count,
    occurrence_count_is_minimum,
    occurred_at,
    created_at,
    updated_at
  )
  SELECT
    ('11111111-1111-4111-8111-' || lpad(n::text, 12, '0'))::uuid,
    '11111111-1111-4111-8111-111111111201'::uuid,
    n % 4 <> 0,
    categories.category,
    categories.category,
    CASE
      WHEN n <= 18 THEN 7 + (n % 3)
      WHEN n <= 42 THEN 4 + (n % 4)
      ELSE 2 + (n % 3)
    END,
    5 + (n % 12),
    CASE WHEN n % 4 = 0 THEN categories.antecedent ELSE NULL END,
    CASE WHEN n % 4 = 0 THEN categories.behavior ELSE NULL END,
    CASE WHEN n % 4 = 0 THEN categories.consequence ELSE NULL END,
    jsonb_build_object(
      'walk_minutes', 35 + (n % 20),
      'sleep_quality', CASE WHEN n > 42 THEN 'good' ELSE 'normal' END,
      'training_minutes', 5 + (n % 10)
    ),
    categories.location,
    categories.memo,
    CASE WHEN n % 9 = 0 THEN 5 WHEN n % 5 = 0 THEN 3 ELSE 1 + (n % 2) END,
    n % 9 = 0,
    now() - ((64 - n) || ' days')::interval + ((8 + (n % 13)) || ' hours')::interval,
    now(),
    now()
  FROM generate_series(1, 64) AS n
  CROSS JOIN LATERAL (
    SELECT *
    FROM (
      VALUES
        ('barking', '초인종 소리', '현관 쪽을 보고 20초 짖음', '자리로 돌아오면 간식 보상', '현관', '초인종 볼륨 낮춘 날'),
        ('anxiety', '보호자 외출 준비', '문 앞을 따라다니며 낑낑거림', '노즈워크 매트 후 8분 만에 안정', '거실', '외출 전 루틴 연습'),
        ('separation_anxiety', '보호자 15분 외출', '초반 3분 하울링 후 안정', '돌아온 뒤 차분히 인사', '거실', '혼자 있기 15분 성공'),
        ('fear', '엘리베이터 소음', '귀를 젖히고 뒤로 물러남', '거리 확보 후 회복', '아파트 복도', '회복 시간 단축'),
        ('pulling', '산책 중 다른 강아지 발견', '줄을 당기며 앞으로 나감', '3m 거리에서 이름 부르기 성공', '산책로', '대체 행동 반응 좋음'),
        ('play', '저녁 놀이', '터그 후 흥분도 상승', '쉬어 신호 후 1분 내 진정', '거실', '놀이 종료 루틴')
    ) AS v(category, antecedent, behavior, consequence, location, memo)
    OFFSET (n % 6)
    LIMIT 1
  ) AS categories
  ON CONFLICT (id) DO UPDATE SET
    dog_id = excluded.dog_id,
    is_quick_log = excluded.is_quick_log,
    type_id = excluded.type_id,
    quick_category = excluded.quick_category,
    intensity = excluded.intensity,
    duration_minutes = excluded.duration_minutes,
    antecedent = excluded.antecedent,
    behavior = excluded.behavior,
    consequence = excluded.consequence,
    daily_activity = excluded.daily_activity,
    location = excluded.location,
    memo = excluded.memo,
    occurrence_count = excluded.occurrence_count,
    occurrence_count_is_minimum = excluded.occurrence_count_is_minimum,
    occurred_at = excluded.occurred_at,
    updated_at = now()
  RETURNING id
),
clear_training_status AS (
  DELETE FROM public.user_training_status
  WHERE dog_id = '11111111-1111-4111-8111-111111111201'::uuid
  RETURNING 1
),
insert_training_status AS (
  INSERT INTO public.user_training_status (
    id,
    user_id,
    dog_id,
    curriculum_id,
    stage_id,
    step_number,
    status,
    current_variant,
    memo,
    created_at
  )
  SELECT
    ('11111111-1111-4111-8222-' || lpad(row_number() over ()::text, 12, '0'))::uuid,
    target_user.id,
    '11111111-1111-4111-8111-111111111201'::uuid,
    status_rows.curriculum_id,
    status_rows.stage_id,
    status_rows.step_number,
    status_rows.status::public.training_status,
    'B',
    status_rows.memo,
    now() - status_rows.age
  FROM target_user
  CROSS JOIN (
    VALUES
      ('separation_anxiety', 'day_1', 1, 'COMPLETED', '5분 혼자 있기 성공', interval '13 days'),
      ('separation_anxiety', 'day_1', 2, 'COMPLETED', '외출 전 노즈워크 반응 좋음', interval '12 days'),
      ('separation_anxiety', 'day_2', 1, 'COMPLETED', '10분 혼자 있기 성공', interval '10 days'),
      ('separation_anxiety', 'day_2', 2, 'COMPLETED', '문 앞 대기 감소', interval '9 days'),
      ('separation_anxiety', 'day_3', 1, 'HIDDEN_BY_AI', '오늘 진행 예정', interval '2 days'),
      ('fear_desensitization', 'day_1', 1, 'COMPLETED', '엘리베이터 소리 낮은 볼륨 성공', interval '7 days'),
      ('fear_desensitization', 'day_1', 2, 'COMPLETED', '복도 거리 확보 훈련', interval '6 days'),
      ('fear_desensitization', 'day_2', 1, 'HIDDEN_BY_AI', '중간 볼륨 준비', interval '1 day'),
      ('leash_manners', 'day_1', 1, 'COMPLETED', '3m 거리 이름 부르기 성공', interval '5 days')
  ) AS status_rows(curriculum_id, stage_id, step_number, status, memo, age)
  ON CONFLICT (user_id, curriculum_id, stage_id, step_number) DO UPDATE SET
    dog_id = excluded.dog_id,
    status = excluded.status,
    current_variant = excluded.current_variant,
    memo = excluded.memo,
    created_at = excluded.created_at
  RETURNING 1
),
clear_attempts AS (
  DELETE FROM public.training_step_attempts
  WHERE dog_id = '11111111-1111-4111-8111-111111111201'::uuid
  RETURNING 1
),
insert_attempts AS (
  INSERT INTO public.training_step_attempts (
    id,
    dog_id,
    step_id,
    curriculum_id,
    day_number,
    attempt_number,
    reaction,
    situation_tags,
    method_used,
    what_worked,
    what_didnt_work,
    recorded_by,
    created_at
  )
  SELECT
    ('11111111-1111-4111-8333-' || lpad(row_number() over ()::text, 12, '0'))::uuid,
    '11111111-1111-4111-8111-111111111201'::uuid,
    attempt_rows.step_id,
    attempt_rows.curriculum_id,
    attempt_rows.day_number,
    attempt_rows.attempt_number,
    attempt_rows.reaction,
    attempt_rows.situation_tags,
    attempt_rows.method_used,
    attempt_rows.what_worked,
    attempt_rows.what_didnt_work,
    target_user.id,
    now() - attempt_rows.age
  FROM target_user
  CROSS JOIN (
    VALUES
      ('separation_anxiety_d1_s1', 'separation_anxiety', 1, 1, 'neutral', ARRAY['외출 전', '노즈워크'], '5분 분리 연습', '나가기 전 노즈워크를 깔아두니 초반 하울링이 줄었어요', '문 닫는 소리가 아직 큰 자극이에요', interval '13 days'),
      ('separation_anxiety_d1_s2', 'separation_anxiety', 1, 1, 'enjoyed', ARRAY['현관', '간식'], '현관 대기 신호', '자리 신호 후 기다림이 30초 늘었어요', null, interval '12 days'),
      ('separation_anxiety_d2_s1', 'separation_anxiety', 2, 1, 'neutral', ARRAY['혼자 있기', '15분'], '짧은 외출 반복', '8분 이후부터 침대에서 쉬었어요', '초반 1분 낑낑거림', interval '10 days'),
      ('fear_desensitization_d1_s1', 'fear_desensitization', 1, 1, 'enjoyed', ARRAY['엘리베이터', '소음'], '낮은 볼륨 소리 노출', '귀를 세웠지만 간식을 먹을 수 있었어요', null, interval '7 days'),
      ('leash_manners_d1_s1', 'leash_manners', 1, 1, 'sensitive', ARRAY['산책로', '다른 강아지'], '3m 거리 이름 부르기', '이름 부르면 돌아보는 횟수가 늘었어요', '거리가 가까우면 당김이 남아요', interval '5 days')
  ) AS attempt_rows(step_id, curriculum_id, day_number, attempt_number, reaction, situation_tags, method_used, what_worked, what_didnt_work, age)
  ON CONFLICT (id) DO UPDATE SET
    dog_id = excluded.dog_id,
    step_id = excluded.step_id,
    curriculum_id = excluded.curriculum_id,
    day_number = excluded.day_number,
    attempt_number = excluded.attempt_number,
    reaction = excluded.reaction,
    situation_tags = excluded.situation_tags,
    method_used = excluded.method_used,
    what_worked = excluded.what_worked,
    what_didnt_work = excluded.what_didnt_work,
    recorded_by = excluded.recorded_by,
    created_at = excluded.created_at
  RETURNING 1
),
clear_coaching AS (
  DELETE FROM public.ai_coaching
  WHERE dog_id = '11111111-1111-4111-8111-111111111201'::uuid
  RETURNING 1
),
insert_coaching AS (
  INSERT INTO public.ai_coaching (
    id,
    dog_id,
    report_type,
    blocks,
    feedback_score,
    ai_tokens_used,
    created_at
  )
  VALUES (
    '11111111-1111-4111-8444-111111111001'::uuid,
    '11111111-1111-4111-8111-111111111201'::uuid,
    'INSIGHT',
    '{
      "insight": {
        "trend": "improving",
        "title": "짖음과 분리불안이 안정 흐름으로 바뀌고 있어요",
        "key_patterns": ["초인종 반응 강도 42% 감소", "혼자 있기 15분 성공", "산책 중 회복 시간 단축"],
        "summary": "최근 30일 기록에서 메이는 초반 하울링이 줄고, 초인종 뒤 회복 시간이 짧아졌어요. 지금은 루틴을 유지하면서 노출 강도를 아주 조금씩 올릴 타이밍이에요."
      },
      "action_plan": {
        "items": [
          {"id": "ap1", "text": "초인종 소리 중간 볼륨으로 3회 연습", "priority": "high", "reference_curriculum_ids": ["fear_desensitization"]},
          {"id": "ap2", "text": "혼자 있기 시간을 15분에서 20분으로 확장", "priority": "high", "reference_curriculum_ids": ["separation_anxiety"]},
          {"id": "ap3", "text": "산책 중 다른 강아지 5m 거리에서 이름 부르기", "priority": "medium", "reference_curriculum_ids": ["leash_manners"]},
          {"id": "ap4", "text": "저녁 노즈워크 뒤 휴식 신호 고정", "priority": "low", "reference_curriculum_ids": ["impulse_control"]}
        ]
      },
      "dog_voice": {
        "message": "나 이제 혼자 있어도 조금 덜 무서워. 초인종 소리는 아직 놀라지만, 엄마가 알려준 자리로 가면 괜찮아져!",
        "emotion": "hopeful"
      },
      "next_7_days": [
        {"day": 1, "focus": "초인종 중간 볼륨", "tasks": ["소리 3회 노출", "자리로 가면 간식"], "time": "저녁 8분", "place": "거실", "tools": ["초인종 녹음", "작은 간식"], "progression": "강도 4 이하 유지", "reference_curriculum_ids": ["fear_desensitization"]},
        {"day": 2, "focus": "20분 혼자 있기", "tasks": ["노즈워크 후 외출", "귀가 후 차분히 인사"], "time": "오전 20분", "place": "거실", "tools": ["노즈워크 매트"], "progression": "초반 하울링 2분 이하", "reference_curriculum_ids": ["separation_anxiety"]},
        {"day": 3, "focus": "산책 회복", "tasks": ["5m 거리 이름 부르기", "돌아보면 보상"], "time": "산책 중 5분", "place": "조용한 산책로", "tools": ["하네스", "간식"], "progression": "3회 중 2회 성공", "reference_curriculum_ids": ["leash_manners"]},
        {"day": 4, "focus": "휴식 신호", "tasks": ["노즈워크 후 매트", "쉬어 신호"], "time": "저녁 10분", "place": "거실", "tools": ["매트"], "progression": "1분 안에 눕기"},
        {"day": 5, "focus": "초인종+대기", "tasks": ["소리 후 자리 이동", "10초 대기"], "time": "저녁 8분", "place": "현관 앞", "tools": ["초인종 녹음"], "progression": "짖음 3회 이하"},
        {"day": 6, "focus": "혼자 있기 확장", "tasks": ["22분 외출", "귀가 후 무반응"], "time": "오전 22분", "place": "집", "tools": ["카메라 타이머"], "progression": "중간 안정 유지"},
        {"day": 7, "focus": "주간 리뷰", "tasks": ["성공 기록 체크", "다음 주 볼륨 조정"], "time": "저녁 5분", "place": "거실", "tools": ["테일로그 기록"], "progression": "성공률 70% 이상"}
      ],
      "risk_signals": {
        "overall_risk": "low",
        "signals": [
          {"label": "개선 흐름 유지", "severity": "info", "recommendation": "강도를 급격히 올리지 말고 10~20%만 확장해요."},
          {"label": "초인종 소리 민감", "severity": "watch", "recommendation": "반복 횟수보다 회복 시간을 우선 기록해요."}
        ]
      },
      "consultation": {
        "recommended_specialist": "반려견 행동전문가",
        "reason": "현재 개선 흐름을 유지하며 분리 시간을 확장하는 단계예요.",
        "questions": ["혼자 있기 시간을 늘리는 속도", "초인종 탈감작 볼륨 단계", "산책 중 다른 강아지와의 거리 조정"]
      }
    }'::jsonb,
    5,
    430,
    now() - interval '10 minutes'
  )
  ON CONFLICT (id) DO UPDATE SET
    dog_id = excluded.dog_id,
    report_type = excluded.report_type,
    blocks = excluded.blocks,
    feedback_score = excluded.feedback_score,
    ai_tokens_used = excluded.ai_tokens_used,
    created_at = excluded.created_at
  RETURNING 1
),
insert_action_tracker AS (
  INSERT INTO public.action_tracker (
    id,
    coaching_id,
    action_item_id,
    is_completed,
    completed_at,
    created_at,
    updated_at
  )
  VALUES
    ('11111111-1111-4111-8555-111111111001'::uuid, '11111111-1111-4111-8444-111111111001'::uuid, 'ap1', true, now() - interval '2 days', now(), now()),
    ('11111111-1111-4111-8555-111111111002'::uuid, '11111111-1111-4111-8444-111111111001'::uuid, 'ap2', true, now() - interval '1 day', now(), now()),
    ('11111111-1111-4111-8555-111111111003'::uuid, '11111111-1111-4111-8444-111111111001'::uuid, 'ap3', false, null, now(), now()),
    ('11111111-1111-4111-8555-111111111004'::uuid, '11111111-1111-4111-8444-111111111001'::uuid, 'ap4', false, null, now(), now())
  ON CONFLICT (id) DO UPDATE SET
    is_completed = excluded.is_completed,
    completed_at = excluded.completed_at,
    updated_at = now()
  RETURNING 1
),
upsert_settings AS (
  INSERT INTO public.user_settings (
    id,
    user_id,
    notification_pref,
    ai_persona,
    marketing_agreed,
    marketing_agreed_at,
    updated_at
  )
  SELECT
    '11111111-1111-4111-8666-111111111001'::uuid,
    id,
    '{"channels": {"smart_message": true}, "types": {"log_reminder": true, "coaching_ready": true, "promo": true}, "quiet_hours": {"enabled": true, "start": "22:00", "end": "08:00"}}'::jsonb,
    'woody',
    true,
    now(),
    now()
  FROM target_user
  ON CONFLICT (user_id) DO UPDATE SET
    notification_pref = excluded.notification_pref,
    ai_persona = excluded.ai_persona,
    marketing_agreed = excluded.marketing_agreed,
    marketing_agreed_at = excluded.marketing_agreed_at,
    updated_at = now()
  RETURNING 1
)
SELECT
  (SELECT id FROM target_user) AS user_id,
  (SELECT count(*) FROM upsert_subscription) AS subscription_upserts,
  (SELECT count(*) FROM upsert_dog) AS dog_upserts,
  (SELECT count(*) FROM upsert_env) AS env_upserts,
  (SELECT count(*) FROM insert_logs) AS inserted_logs,
  (SELECT count(*) FROM insert_training_status) AS training_status_upserts,
  (SELECT count(*) FROM insert_attempts) AS inserted_attempts,
  (SELECT count(*) FROM insert_coaching) AS inserted_coaching,
  (SELECT count(*) FROM insert_action_tracker) AS action_tracker_upserts,
  (SELECT count(*) FROM upsert_settings) AS settings_upserts,
  (SELECT count(*) FROM public.dogs WHERE id = '11111111-1111-4111-8111-111111111201'::uuid) AS dog_count,
  (SELECT count(*) FROM public.behavior_logs WHERE dog_id = '11111111-1111-4111-8111-111111111201'::uuid) AS log_count,
  (SELECT count(*) FROM public.ai_coaching WHERE dog_id = '11111111-1111-4111-8111-111111111201'::uuid) AS coaching_count;

COMMIT;
