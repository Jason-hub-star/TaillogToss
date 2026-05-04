-- subscriptions.user_id UNIQUE 제약 추가
-- verify-iap-order Edge Function이 on_conflict=user_id upsert로 구독 활성화
ALTER TABLE public.subscriptions
  ADD CONSTRAINT subscriptions_user_id_key UNIQUE (user_id);
