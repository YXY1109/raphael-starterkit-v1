-- 给特定用户添加积分的安全SQL脚本
-- 使用方法：将下面的邮箱和积分数量替换为实际值

-- ==== 配置部分 ====
-- 请修改这两个变量
DO $$
DECLARE
    target_user_email TEXT := 'your_email@example.com'; -- 替换为你的邮箱
    credits_to_add INTEGER := 10; -- 替换为要添加的积分数量
    
    -- 内部变量
    target_customer_id UUID;
    current_credits INTEGER;
    new_credits INTEGER;
    target_user_id UUID;
BEGIN
    -- 1. 首先通过邮箱查找用户ID
    SELECT au.id INTO target_user_id
    FROM auth.users au
    WHERE au.email = target_user_email;
    
    IF target_user_id IS NULL THEN
        RAISE EXCEPTION 'User with email % not found', target_user_email;
    END IF;
    
    RAISE NOTICE 'Found user: % (ID: %)', target_user_email, target_user_id;
    
    -- 2. 查找或创建客户记录
    SELECT id, credits INTO target_customer_id, current_credits
    FROM public.customers
    WHERE user_id = target_user_id;
    
    IF target_customer_id IS NULL THEN
        -- 如果客户记录不存在，创建一个
        INSERT INTO public.customers (
            user_id,
            email,
            credits,
            creem_customer_id,
            created_at,
            updated_at,
            metadata
        ) VALUES (
            target_user_id,
            target_user_email,
            credits_to_add,
            'manual_' || target_user_id::text,
            NOW(),
            NOW(),
            jsonb_build_object(
                'source', 'manual_credit_addition',
                'created_by', 'admin',
                'initial_credits', credits_to_add
            )
        ) RETURNING id, credits INTO target_customer_id, current_credits;
        
        RAISE NOTICE 'Created new customer record with % credits', credits_to_add;
    ELSE
        -- 如果客户记录存在，更新积分
        new_credits := current_credits + credits_to_add;
        
        UPDATE public.customers
        SET 
            credits = new_credits,
            updated_at = NOW(),
            metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
                'last_credit_addition', NOW(),
                'last_addition_amount', credits_to_add
            )
        WHERE id = target_customer_id;
        
        RAISE NOTICE 'Updated customer credits: % + % = %', current_credits, credits_to_add, new_credits;
        current_credits := new_credits;
    END IF;
    
    -- 3. 记录积分历史
    INSERT INTO public.credits_history (
        customer_id,
        amount,
        type,
        description,
        created_at,
        metadata
    ) VALUES (
        target_customer_id,
        credits_to_add,
        'add',
        'Manual credit addition by admin',
        NOW(),
        jsonb_build_object(
            'source', 'manual_admin_addition',
            'admin_action', true,
            'target_email', target_user_email,
            'credits_before', COALESCE(current_credits - credits_to_add, 0),
            'credits_after', current_credits,
            'addition_date', NOW()
        )
    );
    
    RAISE NOTICE 'Credit history record created successfully';
    
    -- 4. 显示最终状态
    RAISE NOTICE '=== FINAL STATUS ===';
    RAISE NOTICE 'User: % (ID: %)', target_user_email, target_user_id;
    RAISE NOTICE 'Customer ID: %', target_customer_id;
    RAISE NOTICE 'Final Credits: %', current_credits;
    RAISE NOTICE 'Credits Added: %', credits_to_add;
    
END $$;