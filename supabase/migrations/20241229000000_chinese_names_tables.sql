-- Add Chinese Names related tables

-- Create name_generation_logs table to track name generation usage
create table public.name_generation_logs (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid references auth.users(id) on delete cascade not null,
    plan_type text not null check (plan_type in ('1', '4')),
    credits_used integer not null default 1,
    names_generated integer not null default 1,
    english_name text not null,
    gender text not null check (gender in ('male', 'female', 'other')),
    birth_year text,
    has_personality_traits boolean default false,
    has_name_preferences boolean default false,
    metadata jsonb default '{}'::jsonb,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create saved_names table to store users' favorite/saved Chinese names
create table public.saved_names (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid references auth.users(id) on delete cascade not null,
    chinese_name text not null,
    pinyin text not null,
    meaning text not null,
    cultural_notes text,
    personality_match text,
    characters jsonb not null, -- Store character breakdown as JSON
    generation_metadata jsonb default '{}'::jsonb, -- Store original generation data
    is_selected boolean default false, -- Mark if this is the user's selected name
    is_favorite boolean default true, -- Mark if this is favorited
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create popular_names view for displaying trending names
create table public.popular_names (
    id uuid primary key default uuid_generate_v4(),
    chinese_name text not null unique,
    pinyin text not null,
    meaning text not null,
    cultural_significance text not null,
    gender text not null check (gender in ('male', 'female', 'unisex')),
    popularity_score integer default 0,
    times_generated integer default 0,
    times_favorited integer default 0,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create indexes for performance
create index name_generation_logs_user_id_idx on public.name_generation_logs(user_id);
create index name_generation_logs_created_at_idx on public.name_generation_logs(created_at);
create index name_generation_logs_plan_type_idx on public.name_generation_logs(plan_type);

create index saved_names_user_id_idx on public.saved_names(user_id);
create index saved_names_is_selected_idx on public.saved_names(is_selected);
create index saved_names_is_favorite_idx on public.saved_names(is_favorite);
create index saved_names_chinese_name_idx on public.saved_names(chinese_name);

create index popular_names_popularity_score_idx on public.popular_names(popularity_score desc);
create index popular_names_gender_idx on public.popular_names(gender);
create index popular_names_times_generated_idx on public.popular_names(times_generated desc);

-- Create updated_at triggers for tables that need them
create trigger handle_saved_names_updated_at
    before update on public.saved_names
    for each row
    execute function public.handle_updated_at();

create trigger handle_popular_names_updated_at
    before update on public.popular_names
    for each row
    execute function public.handle_updated_at();

-- Create RLS policies

-- Name generation logs policies
create policy "Users can view their own name generation logs"
    on public.name_generation_logs for select
    using (auth.uid() = user_id);

create policy "Service role can manage name generation logs"
    on public.name_generation_logs for all
    using (auth.role() = 'service_role');

-- Saved names policies
create policy "Users can view their own saved names"
    on public.saved_names for select
    using (auth.uid() = user_id);

create policy "Users can insert their own saved names"
    on public.saved_names for insert
    with check (auth.uid() = user_id);

create policy "Users can update their own saved names"
    on public.saved_names for update
    using (auth.uid() = user_id);

create policy "Users can delete their own saved names"
    on public.saved_names for delete
    using (auth.uid() = user_id);

create policy "Service role can manage saved names"
    on public.saved_names for all
    using (auth.role() = 'service_role');

-- Popular names policies (public read access)
create policy "Anyone can view popular names"
    on public.popular_names for select
    using (true);

create policy "Service role can manage popular names"
    on public.popular_names for all
    using (auth.role() = 'service_role');

-- Grant permissions to service role
grant all on public.name_generation_logs to service_role;
grant all on public.saved_names to service_role;
grant all on public.popular_names to service_role;

-- Insert some sample popular names data
insert into public.popular_names 
(chinese_name, pinyin, meaning, cultural_significance, gender, popularity_score, times_generated, times_favorited) 
values 
('李雨桐', 'Lǐ Yǔtóng', 'Rain and paulownia tree - symbolizing grace and growth', 'A name that represents natural beauty and strength', 'female', 95, 150, 45),
('王志明', 'Wáng Zhìmíng', 'Bright ambition - representing wisdom and determination', 'Classic name embodying traditional values of wisdom and aspiration', 'male', 92, 142, 38),
('陈美丽', 'Chén Měilì', 'Beautiful and graceful - representing inner and outer beauty', 'Timeless name celebrating feminine grace and beauty', 'female', 88, 130, 35),
('张伟强', 'Zhāng Wěiqiáng', 'Great strength - symbolizing power and resilience', 'Name reflecting strength of character and leadership qualities', 'male', 87, 125, 32),
('刘慧敏', 'Liú Huìmǐn', 'Wise and quick-minded - representing intelligence and agility', 'Name celebrating intellectual prowess and sharp thinking', 'female', 85, 118, 28),
('黄文昊', 'Huáng Wénhào', 'Literary and vast - representing scholarly achievement', 'Name honoring academic excellence and broad knowledge', 'male', 83, 112, 25),
('林雅静', 'Lín Yǎjìng', 'Elegant and tranquil - representing refined peace', 'A name that embodies serenity and sophistication', 'female', 81, 105, 22),
('周建国', 'Zhōu Jiànguó', 'Building the nation - representing patriotic spirit', 'Name reflecting dedication to country and community service', 'male', 79, 98, 20);

-- Create function to update popular names statistics
create or replace function public.update_popular_name_stats(name_text text, action_type text)
returns void as $$
begin
    if action_type = 'generated' then
        insert into public.popular_names 
        (chinese_name, pinyin, meaning, cultural_significance, gender, times_generated, popularity_score)
        values (name_text, '', 'AI generated name', 'Modern AI-generated Chinese name', 'unisex', 1, 1)
        on conflict (chinese_name) 
        do update set 
            times_generated = public.popular_names.times_generated + 1,
            popularity_score = public.popular_names.popularity_score + 1,
            updated_at = timezone('utc'::text, now());
    elsif action_type = 'favorited' then
        update public.popular_names 
        set 
            times_favorited = times_favorited + 1,
            popularity_score = popularity_score + 2,
            updated_at = timezone('utc'::text, now())
        where chinese_name = name_text;
    end if;
end;
$$ language plpgsql security definer;

-- Grant execute permission on the function
grant execute on function public.update_popular_name_stats(text, text) to service_role;