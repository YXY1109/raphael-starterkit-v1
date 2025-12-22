-- IP限制表和函数，支持未注册用户免费生成
-- 每个IP每天可以免费生成1个中文名字

-- 创建IP使用记录表
CREATE TABLE IF NOT EXISTS public.ip_usage_logs (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_ip text NOT NULL,
    usage_date date NOT NULL DEFAULT CURRENT_DATE,
    generation_count integer DEFAULT 0 NOT NULL,
    last_generation_at timestamp with time zone DEFAULT NOW(),
    created_at timestamp with time zone DEFAULT NOW() NOT NULL,
    updated_at timestamp with time zone DEFAULT NOW() NOT NULL,
    CONSTRAINT unique_ip_date UNIQUE (client_ip, usage_date)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS ip_usage_logs_client_ip_idx ON public.ip_usage_logs(client_ip);
CREATE INDEX IF NOT EXISTS ip_usage_logs_usage_date_idx ON public.ip_usage_logs(usage_date);
CREATE INDEX IF NOT EXISTS ip_usage_logs_created_at_idx ON public.ip_usage_logs(created_at);

-- 创建更新时间触发器
DROP TRIGGER IF EXISTS handle_ip_usage_logs_updated_at ON public.ip_usage_logs;
CREATE TRIGGER handle_ip_usage_logs_updated_at
    BEFORE UPDATE ON public.ip_usage_logs
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- 创建检查IP限制的函数
CREATE OR REPLACE FUNCTION public.check_ip_rate_limit(client_ip text)
RETURNS boolean AS $$
DECLARE
    current_count integer := 0;
    daily_limit integer := 1; -- 每天1次免费生成
BEGIN
    -- 获取今天该IP的使用次数
    SELECT COALESCE(generation_count, 0) INTO current_count
    FROM public.ip_usage_logs
    WHERE ip_usage_logs.client_ip = check_ip_rate_limit.client_ip
    AND usage_date = CURRENT_DATE;
    
    -- 如果没有记录，说明今天还没有使用过
    IF current_count IS NULL THEN
        current_count := 0;
    END IF;
    
    -- 检查是否超过限制
    IF current_count >= daily_limit THEN
        RETURN false; -- 已达到限制
    ELSE
        -- 更新或插入使用记录
        INSERT INTO public.ip_usage_logs (
            client_ip,
            usage_date,
            generation_count,
            last_generation_at,
            updated_at
        ) VALUES (
            check_ip_rate_limit.client_ip,
            CURRENT_DATE,
            1,
            NOW(),
            NOW()
        )
        ON CONFLICT (client_ip, usage_date)
        DO UPDATE SET
            generation_count = ip_usage_logs.generation_count + 1,
            last_generation_at = NOW(),
            updated_at = NOW();
            
        RETURN true; -- 可以生成
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 创建查看IP使用统计的函数（管理员用）
CREATE OR REPLACE FUNCTION public.get_ip_usage_stats(days_back integer DEFAULT 7)
RETURNS TABLE (
    client_ip text,
    usage_date date,
    generation_count integer,
    last_generation_at timestamp with time zone
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ipl.client_ip,
        ipl.usage_date,
        ipl.generation_count,
        ipl.last_generation_at
    FROM public.ip_usage_logs ipl
    WHERE ipl.usage_date >= CURRENT_DATE - days_back
    ORDER BY ipl.usage_date DESC, ipl.generation_count DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 创建清理旧记录的函数（可以设置定期任务调用）
CREATE OR REPLACE FUNCTION public.cleanup_old_ip_logs(days_to_keep integer DEFAULT 30)
RETURNS integer AS $$
DECLARE
    deleted_count integer;
BEGIN
    DELETE FROM public.ip_usage_logs
    WHERE usage_date < CURRENT_DATE - days_to_keep;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RAISE NOTICE 'Cleaned up % old IP usage records older than % days', deleted_count, days_to_keep;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 启用RLS
ALTER TABLE public.ip_usage_logs ENABLE ROW LEVEL SECURITY;

-- 创建RLS策略（只有service_role可以访问）
CREATE POLICY "Service role can manage IP usage logs"
    ON public.ip_usage_logs FOR ALL
    USING (auth.role() = 'service_role');

-- 管理员可以查看统计（可选）
CREATE POLICY "Admins can view IP usage stats"
    ON public.ip_usage_logs FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.customers c
            WHERE c.user_id = auth.uid()
            AND c.metadata->>'role' = 'admin'
        )
    );

-- 设置权限
GRANT ALL ON public.ip_usage_logs TO service_role;
GRANT EXECUTE ON FUNCTION public.check_ip_rate_limit(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_ip_usage_stats(integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.cleanup_old_ip_logs(integer) TO service_role;

-- 成功提示
DO $$
BEGIN
    RAISE NOTICE 'IP rate limiting system created successfully!';
    RAISE NOTICE 'Free users can generate 1 name per day per IP address.';
    RAISE NOTICE 'Use check_ip_rate_limit(client_ip) function to check limits.';
    RAISE NOTICE 'Use get_ip_usage_stats() to view usage statistics.';
END $$;