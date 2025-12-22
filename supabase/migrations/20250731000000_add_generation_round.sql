-- Add generation_round field to support multiple generations within the same batch
-- This allows users to continue generating more names with the same form parameters

-- Add generation_round column to generated_names table
ALTER TABLE public.generated_names 
ADD COLUMN generation_round integer NOT NULL DEFAULT 1;

-- Create index for better performance when querying by generation round
CREATE INDEX IF NOT EXISTS generated_names_round_idx ON public.generated_names(generation_round);

-- Create composite index for batch_id + generation_round for efficient pagination within batch
CREATE INDEX IF NOT EXISTS generated_names_batch_round_idx ON public.generated_names(batch_id, generation_round);

-- Update existing records to set generation_round = 1
-- This ensures backward compatibility with existing data
UPDATE public.generated_names 
SET generation_round = 1 
WHERE generation_round IS NULL OR generation_round = 0;

-- Add comment to document the new field
COMMENT ON COLUMN public.generated_names.generation_round IS 'Indicates which generation round within the same batch (1, 2, 3, etc.). Each round generates 6 names and represents a page in the UI.';