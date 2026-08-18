-- user_training_status UNIQUE 에 dog_id 추가
--
-- 문제: 초기 스키마의 UNIQUE(user_id, curriculum_id, stage_id, step_number) 에
--       dog_id 가 빠져 있다(20260420000000_toss_project_init.sql:425).
--       dog_id 컬럼은 나중에 추가됐지만(20260228015912) 제약에는 반영되지 않았다.
--       한 사용자가 강아지 두 마리를 같은 커리큘럼·같은 스텝에 올리면 충돌한다.
--       /dog/switcher 는 이미 Done 상태라 다견 사용자는 현재 존재 가능하다.
--
-- 안전성: 유니크 키에 컬럼을 '추가'하는 방향이므로 제약이 더 느슨해진다.
--        기존 행이 새 제약을 위반할 수 없다.
--
-- 주의: dog_id 는 nullable 이다. Postgres 는 UNIQUE 안의 NULL 을 서로 구별하므로
--       dog_id IS NULL 인 레거시 행끼리는 중복이 허용된다. 그 행들은 다견 이전
--       데이터라 실질 위험이 없고, dog_id 백필은 별도 과제로 둔다.

DO $$
DECLARE
  c record;
BEGIN
  -- 대상 컬럼 조합의 기존 UNIQUE 제약을 이름과 무관하게 찾아 제거
  FOR c IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace ns ON ns.oid = rel.relnamespace
    WHERE ns.nspname = 'public'
      AND rel.relname = 'user_training_status'
      AND con.contype = 'u'
      AND (
        SELECT array_agg(att.attname ORDER BY att.attname)
        FROM unnest(con.conkey) AS k(attnum)
        JOIN pg_attribute att ON att.attrelid = con.conrelid AND att.attnum = k.attnum
      ) = ARRAY['curriculum_id','stage_id','step_number','user_id']::name[]
  LOOP
    EXECUTE format('ALTER TABLE public.user_training_status DROP CONSTRAINT %I', c.conname);
    RAISE NOTICE 'dropped stale unique constraint: %', c.conname;
  END LOOP;
END $$;

ALTER TABLE public.user_training_status
  DROP CONSTRAINT IF EXISTS uq_user_training_status_dog_step;

ALTER TABLE public.user_training_status
  ADD CONSTRAINT uq_user_training_status_dog_step
  UNIQUE (user_id, dog_id, curriculum_id, stage_id, step_number);
