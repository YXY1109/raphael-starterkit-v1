-- Create generation_batches table to store each generation session
create table public.generation_batches (
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

-- Create generated_names table to store individual names within each batch
create table public.generated_names (
    id uuid primary key default uuid_generate_v4(),
    batch_id uuid references public.generation_batches(id) on delete cascade not null,
    chinese_name text not null,
    pinyin text not null,
    characters jsonb not null, -- Store character breakdown as JSON
    meaning text not null,
    cultural_notes text not null,
    personality_match text not null,
    style text not null,
    position_in_batch integer not null, -- Order within the batch (0-5)
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create indexes for performance
create index generation_batches_user_id_idx on public.generation_batches(user_id);
create index generation_batches_created_at_idx on public.generation_batches(created_at);
create index generation_batches_plan_type_idx on public.generation_batches(plan_type);

create index generated_names_batch_id_idx on public.generated_names(batch_id);
create index generated_names_position_idx on public.generated_names(position_in_batch);
create index generated_names_chinese_name_idx on public.generated_names(chinese_name);

-- Create updated_at triggers
create trigger handle_generation_batches_updated_at
    before update on public.generation_batches
    for each row
    execute procedure update_updated_at_column();

create trigger handle_generated_names_updated_at
    before update on public.generated_names
    for each row
    execute procedure update_updated_at_column();

-- Enable RLS (Row Level Security)
alter table public.generation_batches enable row level security;
alter table public.generated_names enable row level security;

-- Create RLS policies for generation_batches
create policy "Users can view their own generation batches"
    on public.generation_batches for select
    using (auth.uid() = user_id);

create policy "Users can insert their own generation batches"
    on public.generation_batches for insert
    with check (auth.uid() = user_id);

create policy "Users can update their own generation batches"
    on public.generation_batches for update
    using (auth.uid() = user_id);

create policy "Users can delete their own generation batches"
    on public.generation_batches for delete
    using (auth.uid() = user_id);

-- Create RLS policies for generated_names
create policy "Users can view names from their own batches"
    on public.generated_names for select
    using (
        exists (
            select 1 from public.generation_batches 
            where id = generated_names.batch_id 
            and user_id = auth.uid()
        )
    );

create policy "Users can insert names to their own batches"
    on public.generated_names for insert
    with check (
        exists (
            select 1 from public.generation_batches 
            where id = generated_names.batch_id 
            and user_id = auth.uid()
        )
    );

create policy "Users can update names in their own batches"
    on public.generated_names for update
    using (
        exists (
            select 1 from public.generation_batches 
            where id = generated_names.batch_id 
            and user_id = auth.uid()
        )
    );

create policy "Users can delete names from their own batches"
    on public.generated_names for delete
    using (
        exists (
            select 1 from public.generation_batches 
            where id = generated_names.batch_id 
            and user_id = auth.uid()
        )
    );

-- Grant necessary permissions
grant usage on schema public to authenticated;
grant all on public.generation_batches to authenticated;
grant all on public.generated_names to authenticated;
grant all on public.generation_batches to service_role;
grant all on public.generated_names to service_role;