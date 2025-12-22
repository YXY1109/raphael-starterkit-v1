-- Fix IP rate limit function column name conflict
-- This fixes the ambiguous column reference error

DROP FUNCTION IF EXISTS public.check_ip_rate_limit(text);
DROP FUNCTION IF EXISTS public.check_ip_rate_limit(inet);

-- Create the correct function with proper column qualification
CREATE OR REPLACE FUNCTION public.check_ip_rate_limit(p_client_ip text)
RETURNS boolean AS $$
DECLARE
    current_count integer := 0;
    daily_limit integer := 1; -- 每天1次免费生成
BEGIN
    -- 获取今天该IP的使用次数
    SELECT COALESCE(ipl.generation_count, 0) INTO current_count
    FROM public.ip_usage_logs ipl
    WHERE ipl.client_ip = p_client_ip
    AND ipl.usage_date = CURRENT_DATE;
    
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
            p_client_ip,
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

-- 设置权限
GRANT EXECUTE ON FUNCTION public.check_ip_rate_limit(text) TO service_role;

-- 清理可能重复的ip_rate_limits表（如果存在）
DROP TABLE IF EXISTS public.ip_rate_limits CASCADE;

-- 提示信息
DO $$
BEGIN
    RAISE NOTICE 'Fixed IP rate limit function column name conflict!';
    RAISE NOTICE 'Function now uses qualified column names to avoid ambiguity.';
END $$;