-- Align point event producers with the drainer allowlist.
-- Parity: AD-001, GROWTH-001, IAP-001
--
-- The drainer intentionally rejects event_type/reason_code pairs outside its
-- allowlist. Keep DB trigger-produced rows on the same allowlist so legitimate
-- referral/signup/first-coaching bonuses do not fail closed.

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

CREATE OR REPLACE FUNCTION public.signup_bonus_to_point_events()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.point_events (user_id, event_type, source_id, points, reason_code)
  VALUES (NEW.id, 'signup_completed', NEW.id, 100, 'signup_bonus')
  ON CONFLICT (user_id, event_type, source_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
