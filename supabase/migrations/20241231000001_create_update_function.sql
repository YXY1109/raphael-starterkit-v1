-- Create the update_updated_at_column function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Enable uuid-ossp extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Now create the generation_batches table
CREATE TABLE IF NOT EXISTS public.generation_batches (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid references auth.users(id) on delete cascade not null,
    english_name text not null,
    gender text not null check (gender in ('male', 'female', 'other')),
    birth_year text,
    personality_traits text,
    name_preferences text,
    plan_type text not null check (plan_type in ('1', '4')),
    credits_used integer not null default 0,
    names_count integer not null default 0,
    generation_metadata jsonb default '{}'::jsonb,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create generated_names table
CREATE TABLE IF NOT EXISTS public.generated_names (
    id uuid primary key default uuid_generate_v4(),
    batch_id uuid references public.generation_batches(id) on delete cascade not null,
    chinese_name text not null,
    pinyin text not null,
    characters jsonb not null,
    meaning text not null,
    cultural_notes text not null,
    personality_match text not null,
    style text not null,
    position_in_batch integer not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS generation_batches_user_id_idx on public.generation_batches(user_id);
CREATE INDEX IF NOT EXISTS generation_batches_created_at_idx on public.generation_batches(created_at);
CREATE INDEX IF NOT EXISTS generation_batches_plan_type_idx on public.generation_batches(plan_type);

CREATE INDEX IF NOT EXISTS generated_names_batch_id_idx on public.generated_names(batch_id);
CREATE INDEX IF NOT EXISTS generated_names_position_idx on public.generated_names(position_in_batch);
CREATE INDEX IF NOT EXISTS generated_names_chinese_name_idx on public.generated_names(chinese_name);

-- Create updated_at triggers
DROP TRIGGER IF EXISTS handle_generation_batches_updated_at ON public.generation_batches;
CREATE TRIGGER handle_generation_batches_updated_at
    before update on public.generation_batches
    for each row
    execute procedure update_updated_at_column();

DROP TRIGGER IF EXISTS handle_generated_names_updated_at ON public.generated_names;
CREATE TRIGGER handle_generated_names_updated_at
    before update on public.generated_names
    for each row
    execute procedure update_updated_at_column();

-- Enable RLS (Row Level Security)
ALTER TABLE public.generation_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generated_names ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own generation batches" ON public.generation_batches;
DROP POLICY IF EXISTS "Users can insert their own generation batches" ON public.generation_batches;
DROP POLICY IF EXISTS "Users can update their own generation batches" ON public.generation_batches;
DROP POLICY IF EXISTS "Users can delete their own generation batches" ON public.generation_batches;

DROP POLICY IF EXISTS "Users can view names from their own batches" ON public.generated_names;
DROP POLICY IF EXISTS "Users can insert names to their own batches" ON public.generated_names;
DROP POLICY IF EXISTS "Users can update names in their own batches" ON public.generated_names;
DROP POLICY IF EXISTS "Users can delete names from their own batches" ON public.generated_names;

-- Create RLS policies for generation_batches
CREATE POLICY "Users can view their own generation batches"
    ON public.generation_batches FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own generation batches"
    ON public.generation_batches FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own generation batches"
    ON public.generation_batches FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own generation batches"
    ON public.generation_batches FOR DELETE
    USING (auth.uid() = user_id);

-- Create RLS policies for generated_names
CREATE POLICY "Users can view names from their own batches"
    ON public.generated_names FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.generation_batches 
            WHERE id = generated_names.batch_id 
            AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert names to their own batches"
    ON public.generated_names FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.generation_batches 
            WHERE id = generated_names.batch_id 
            AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update names in their own batches"
    ON public.generated_names FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.generation_batches 
            WHERE id = generated_names.batch_id 
            AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete names from their own batches"
    ON public.generated_names FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.generation_batches 
            WHERE id = generated_names.batch_id 
            AND user_id = auth.uid()
        )
    );

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.generation_batches TO authenticated;
GRANT ALL ON public.generated_names TO authenticated;
GRANT ALL ON public.generation_batches TO service_role;
GRANT ALL ON public.generated_names TO service_role;