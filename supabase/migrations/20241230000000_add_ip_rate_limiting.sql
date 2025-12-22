-- Add IP rate limiting for free name generation
-- This prevents abuse of the free name generation feature

-- Create table to track IP addresses and their usage
create table public.ip_rate_limits (
    id uuid primary key default uuid_generate_v4(),
    ip_address inet not null,
    generation_count integer not null default 1,
    first_generation_at timestamp with time zone default timezone('utc'::text, now()) not null,
    last_generation_at timestamp with time zone default timezone('utc'::text, now()) not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create unique index on IP address
create unique index ip_rate_limits_ip_address_idx on public.ip_rate_limits(ip_address);

-- Create index on last_generation_at for cleanup queries
create index ip_rate_limits_last_generation_at_idx on public.ip_rate_limits(last_generation_at);

-- Create updated_at trigger
create trigger handle_ip_rate_limits_updated_at
    before update on public.ip_rate_limits
    for each row
    execute function public.handle_updated_at();

-- Create RLS policies
create policy "Service role can manage IP rate limits"
    on public.ip_rate_limits for all
    using (auth.role() = 'service_role');

-- Grant permissions to service role
grant all on public.ip_rate_limits to service_role;

-- Function to check and update IP rate limit
create or replace function public.check_ip_rate_limit(client_ip inet)
returns boolean as $$
declare
    limit_record public.ip_rate_limits%rowtype;
    rate_limit_hours constant integer := 24; -- 24 hour rate limit window
    max_generations constant integer := 1; -- Maximum 1 free generation per IP per day
begin
    -- Try to get existing record for this IP
    select * into limit_record 
    from public.ip_rate_limits 
    where ip_address = client_ip;
    
    if not found then
        -- First time for this IP, create record
        insert into public.ip_rate_limits (ip_address, generation_count, first_generation_at, last_generation_at)
        values (client_ip, 1, timezone('utc'::text, now()), timezone('utc'::text, now()));
        return true; -- Allow generation
    else
        -- Check if the rate limit window has passed
        if limit_record.last_generation_at < (timezone('utc'::text, now()) - interval '1 day' * rate_limit_hours / 24) then
            -- Rate limit window has passed, reset counter
            update public.ip_rate_limits 
            set 
                generation_count = 1,
                first_generation_at = timezone('utc'::text, now()),
                last_generation_at = timezone('utc'::text, now()),
                updated_at = timezone('utc'::text, now())
            where ip_address = client_ip;
            return true; -- Allow generation
        elsif limit_record.generation_count < max_generations then
            -- Within rate limit window but under the limit
            update public.ip_rate_limits 
            set 
                generation_count = generation_count + 1,
                last_generation_at = timezone('utc'::text, now()),
                updated_at = timezone('utc'::text, now())
            where ip_address = client_ip;
            return true; -- Allow generation
        else
            -- Rate limit exceeded
            return false; -- Deny generation
        end if;
    end if;
end;
$$ language plpgsql security definer;

-- Grant execute permission on the function
grant execute on function public.check_ip_rate_limit(inet) to service_role;

-- Function to clean up old IP rate limit records (optional, for maintenance)
create or replace function public.cleanup_old_ip_rate_limits()
returns void as $$
begin
    -- Delete records older than 7 days to keep the table clean
    delete from public.ip_rate_limits 
    where last_generation_at < (timezone('utc'::text, now()) - interval '7 days');
end;
$$ language plpgsql security definer;

-- Grant execute permission on cleanup function
grant execute on function public.cleanup_old_ip_rate_limits() to service_role;