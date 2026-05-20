-- LOG-001: per-log occurrence count for quick record frequency UX
ALTER TABLE public.behavior_logs
  ADD COLUMN IF NOT EXISTS occurrence_count integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS occurrence_count_is_minimum boolean DEFAULT false;

UPDATE public.behavior_logs
SET occurrence_count = 1
WHERE occurrence_count IS NULL;

UPDATE public.behavior_logs
SET occurrence_count_is_minimum = false
WHERE occurrence_count_is_minimum IS NULL;

ALTER TABLE public.behavior_logs
  ALTER COLUMN occurrence_count SET DEFAULT 1,
  ALTER COLUMN occurrence_count_is_minimum SET DEFAULT false;
