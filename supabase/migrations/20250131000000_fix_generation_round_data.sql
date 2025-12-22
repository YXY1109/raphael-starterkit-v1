-- Fix generation_round data consistency issues
-- This migration ensures all generation_round values are properly set and adds constraints

-- First, let's check and fix any NULL or 0 values in generation_round
UPDATE public.generated_names 
SET generation_round = 1 
WHERE generation_round IS NULL OR generation_round = 0 OR generation_round < 1;

-- Add a check constraint to prevent invalid generation_round values in the future
ALTER TABLE public.generated_names 
ADD CONSTRAINT check_generation_round_positive 
CHECK (generation_round > 0);

-- Ensure generation_round is NOT NULL
ALTER TABLE public.generated_names 
ALTER COLUMN generation_round SET NOT NULL;

-- Update any batches that might have incorrect names_count
-- This helps ensure totalRounds calculation is accurate
UPDATE public.generation_batches 
SET names_count = (
  SELECT COUNT(*) 
  FROM public.generated_names 
  WHERE generated_names.batch_id = generation_batches.id
)
WHERE names_count IS NULL OR names_count = 0;

-- Add indexes for better performance if they don't exist
CREATE INDEX IF NOT EXISTS idx_generated_names_batch_id_round 
ON public.generated_names(batch_id, generation_round);

CREATE INDEX IF NOT EXISTS idx_generated_names_user_batch 
ON public.generated_names(batch_id) 
WHERE batch_id IN (
  SELECT id FROM public.generation_batches
);

-- Add an index on generation_batches for user_id and created_at for faster profile queries
CREATE INDEX IF NOT EXISTS idx_generation_batches_user_created 
ON public.generation_batches(user_id, created_at DESC);

-- Add comment for documentation
COMMENT ON CONSTRAINT check_generation_round_positive ON public.generated_names 
IS 'Ensures generation_round is always a positive integer (>= 1)';