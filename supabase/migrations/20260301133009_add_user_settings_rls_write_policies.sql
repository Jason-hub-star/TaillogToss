-- APP-001: user_settings 사용자 쓰기 정책 추가
-- onboarding/notification -> settings fallback 경로에서 upsert가 RLS로 차단되는 이슈를 해소한다.

ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_settings'
      AND policyname = 'Users insert own settings'
  ) THEN
    CREATE POLICY "Users insert own settings"
      ON public.user_settings
      FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_settings'
      AND policyname = 'Users update own settings'
  ) THEN
    CREATE POLICY "Users update own settings"
      ON public.user_settings
      FOR UPDATE
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_settings'
      AND policyname = 'Users delete own settings'
  ) THEN
    CREATE POLICY "Users delete own settings"
      ON public.user_settings
      FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END;
$$;
