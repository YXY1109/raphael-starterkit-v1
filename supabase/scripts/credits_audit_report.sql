-- 积分核算和审计报表SQL脚本
-- 用于追踪所有积分操作，确保核算清晰

-- ==== 1. 用户积分完整审计报告 ====
-- 替换 'your_email@example.com' 为实际邮箱
SELECT 
    '=== USER CREDITS AUDIT REPORT ===' as report_section,
    au.email as user_email,
    au.id as user_id,
    c.id as customer_id,
    c.credits as current_credits,
    c.created_at as customer_since,
    c.updated_at as last_updated
FROM auth.users au
LEFT JOIN public.customers c ON au.id = c.user_id
WHERE au.email = 'your_email@example.com'

UNION ALL

-- ==== 2. 积分历史记录详情 ====
SELECT 
    '=== CREDITS HISTORY DETAILS ===' as report_section,
    CONCAT(
        ch.created_at::date, ' | ',
        CASE WHEN ch.type = 'add' THEN '+' ELSE '-' END,
        ch.amount, ' | ',
        ch.description, ' | ',
        COALESCE(ch.metadata->>'source', 'unknown')
    ) as transaction_details,
    NULL, NULL, NULL, NULL, NULL
FROM auth.users au
JOIN public.customers c ON au.id = c.user_id
JOIN public.credits_history ch ON c.id = ch.customer_id
WHERE au.email = 'your_email@example.com'
ORDER BY ch.created_at DESC;

-- ==== 3. 积分流水账汇总 ====
-- 替换 'your_email@example.com' 为实际邮箱
WITH user_credits_summary AS (
    SELECT 
        au.email,
        c.credits as current_credits,
        -- 计算总充值
        COALESCE(SUM(CASE WHEN ch.type = 'add' THEN ch.amount ELSE 0 END), 0) as total_credits_added,
        -- 计算总消费
        COALESCE(SUM(CASE WHEN ch.type = 'subtract' THEN ch.amount ELSE 0 END), 0) as total_credits_used,
        -- 计算理论余额
        COALESCE(SUM(CASE WHEN ch.type = 'add' THEN ch.amount ELSE -ch.amount END), 0) as calculated_balance,
        -- 统计操作次数
        COUNT(CASE WHEN ch.type = 'add' THEN 1 END) as total_additions,
        COUNT(CASE WHEN ch.type = 'subtract' THEN 1 END) as total_subtractions,
        COUNT(*) as total_transactions
    FROM auth.users au
    LEFT JOIN public.customers c ON au.id = c.user_id
    LEFT JOIN public.credits_history ch ON c.id = ch.customer_id
    WHERE au.email = 'your_email@example.com'
    GROUP BY au.email, c.credits
)
SELECT 
    '=== CREDITS SUMMARY REPORT ===' as section,
    email as user_email,
    current_credits,
    total_credits_added,
    total_credits_used,
    calculated_balance,
    -- 检查账务是否平衡
    CASE 
        WHEN current_credits = calculated_balance THEN '✅ BALANCED'
        ELSE '❌ UNBALANCED (Diff: ' || (current_credits - calculated_balance) || ')'
    END as balance_status,
    total_additions,
    total_subtractions,
    total_transactions
FROM user_credits_summary;

-- ==== 4. 管理员操作审计 ====
-- 查看所有管理员手动添加的积分记录
SELECT 
    '=== ADMIN ACTIONS AUDIT ===' as section,
    au.email as target_user,
    ch.created_at as action_date,
    ch.amount as credits_added,
    ch.description,
    ch.metadata->>'source' as operation_source,
    CASE 
        WHEN ch.metadata->>'admin_action' = 'true' THEN '👨‍💼 ADMIN'
        ELSE '🤖 SYSTEM'
    END as action_type,
    ch.metadata->>'credits_before' as credits_before,
    ch.metadata->>'credits_after' as credits_after
FROM public.credits_history ch
JOIN public.customers c ON ch.customer_id = c.id
JOIN auth.users au ON c.user_id = au.id
WHERE ch.type = 'add' 
AND (ch.metadata->>'admin_action' = 'true' OR ch.description ILIKE '%manual%')
ORDER BY ch.created_at DESC;

-- ==== 5. 系统完整性检查 ====
-- 检查是否有孤立的记录或数据不一致
SELECT 
    '=== SYSTEM INTEGRITY CHECK ===' as section,
    COUNT(DISTINCT au.id) as total_users,
    COUNT(DISTINCT c.id) as total_customers,
    COUNT(ch.id) as total_credit_transactions,
    SUM(CASE WHEN au.id IS NULL THEN 1 ELSE 0 END) as orphaned_customers,
    SUM(CASE WHEN c.id IS NULL THEN 1 ELSE 0 END) as orphaned_credit_history
FROM auth.users au
FULL OUTER JOIN public.customers c ON au.id = c.user_id
FULL OUTER JOIN public.credits_history ch ON c.id = ch.customer_id;