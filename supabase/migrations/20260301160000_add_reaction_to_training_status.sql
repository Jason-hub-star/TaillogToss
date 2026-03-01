-- Add reaction column to user_training_status for step-level feedback
ALTER TABLE public.user_training_status
  ADD COLUMN IF NOT EXISTS reaction VARCHAR(20)
  CHECK (reaction IN ('enjoyed','neutral','sensitive'));

-- Index for efficient reaction queries per dog+curriculum
CREATE INDEX IF NOT EXISTS idx_training_status_reaction
  ON public.user_training_status(dog_id, curriculum_id)
  WHERE reaction IS NOT NULL;
