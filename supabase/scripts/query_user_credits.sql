-- 查询特定用户积分和历史记录的SQL脚本

-- ==== 方法1：通过邮箱查询用户积分 ====
-- 替换 'your_email@example.com' 为实际邮箱
SELECT 
    au.email,
    au.id as user_id,
    c.id as customer_id,
    c.credits as current_credits,
    c.created_at as customer_created,
    c.updated_at as last_updated,
    c.metadata
FROM auth.users au
LEFT JOIN public.customers c ON au.id = c.user_id
WHERE au.email = 'your_email@example.com';

-- ==== 方法2：查看用户的积分历史记录 ====
-- 替换 'your_email@example.com' 为实际邮箱
SELECT 
    au.email,
    ch.created_at,
    ch.type,
    ch.amount,
    ch.description,
    ch.metadata
FROM auth.users au
JOIN public.customers c ON au.id = c.user_id
JOIN public.credits_history ch ON c.id = ch.customer_id
WHERE au.email = 'your_email@example.com'
ORDER BY ch.created_at DESC
LIMIT 10;

-- ==== 方法3：查看所有用户的积分统计 ====
SELECT 
    au.email,
    c.credits as current_credits,
    c.created_at as customer_since,
    (
        SELECT COUNT(*) 
        FROM public.credits_history ch 
        WHERE ch.customer_id = c.id AND ch.type = 'subtract'
    ) as total_generations,
    (
        SELECT SUM(ch.amount) 
        FROM public.credits_history ch 
        WHERE ch.customer_id = c.id AND ch.type = 'add'
    ) as total_credits_added
FROM auth.users au
JOIN public.customers c ON au.id = c.user_id
ORDER BY c.credits DESC;

-- ==== 方法4：快速给用户添加积分（简化版）====
-- 使用前请先将邮箱和积分数量替换为实际值
/*
DO $$
DECLARE
    user_email TEXT := 'your_email@example.com'; -- 替换邮箱
    add_credits INTEGER := 5; -- 替换积分数量
    customer_record RECORD;
BEGIN
    -- 查找并更新客户积分
    SELECT c.* INTO customer_record
    FROM public.customers c
    JOIN auth.users au ON c.user_id = au.id
    WHERE au.email = user_email;
    
    IF customer_record.id IS NOT NULL THEN
        -- 更新积分
        UPDATE public.customers 
        SET credits = credits + add_credits, updated_at = NOW()
        WHERE id = customer_record.id;
        
        -- 记录历史
        INSERT INTO public.credits_history (customer_id, amount, type, description, created_at)
        VALUES (customer_record.id, add_credits, 'add', 'Quick admin credit addition', NOW());
        
        RAISE NOTICE 'Added % credits to %. New balance: %', add_credits, user_email, customer_record.credits + add_credits;
    ELSE
        RAISE NOTICE 'User % not found', user_email;
    END IF;
END $$;
*/