-- =====================================================================
-- Raphael Starter Kit - 完整数据库设置脚本
-- =====================================================================
-- 这个脚本会创建所有必需的数据库表、函数、触发器和 RLS 策略
--
-- 执行方式：
-- 1. 登录 Supabase 控制台
-- 2. 进入 SQL Editor
-- 3. 复制整个文件内容并粘贴
-- 4. 点击 "Run" 按钮执行
-- =====================================================================

-- 启用必需的扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================================
-- 第一部分: 基础表结构 (客户、订阅、积分)
-- =====================================================================

-- 创建 customers 表 - 链接 Supabase 用户与 Creem 客户
CREATE TABLE IF NOT EXISTS public.customers (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    creem_customer_id text NOT NULL UNIQUE,
    email text NOT NULL,
    name text,
    country text,
    credits integer DEFAULT 3 NOT NULL, -- 新用户默认获得 3 积分
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb,
    CONSTRAINT customers_email_match CHECK (email = lower(email)),
    CONSTRAINT credits_non_negative CHECK (credits >= 0)
);

-- 创建 credits_history 表 - 积分交易历史
CREATE TABLE IF NOT EXISTS public.credits_history (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id uuid REFERENCES public.customers(id) ON DELETE CASCADE NOT NULL,
    amount integer NOT NULL,
    type text NOT NULL CHECK (type IN ('add', 'subtract')),
    description text,
    creem_order_id text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb
);

-- 创建 subscriptions 表 - 订阅信息
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id uuid REFERENCES public.customers(id) ON DELETE CASCADE NOT NULL,
    creem_subscription_id text NOT NULL UNIQUE,
    creem_product_id text NOT NULL,
    status text NOT NULL CHECK (status IN ('incomplete', 'expired', 'active', 'past_due', 'canceled', 'unpaid', 'paused', 'trialing')),
    current_period_start timestamp with time zone NOT NULL,
    current_period_end timestamp with time zone NOT NULL,
    canceled_at timestamp with time zone,
    trial_end timestamp with time zone,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 创建索引 - customers 表
CREATE INDEX IF NOT EXISTS customers_user_id_idx ON public.customers(user_id);
CREATE INDEX IF NOT EXISTS customers_creem_customer_id_idx ON public.customers(creem_customer_id);

-- 创建索引 - credits_history 表
CREATE INDEX IF NOT EXISTS credits_history_customer_id_idx ON public.credits_history(customer_id);
CREATE INDEX IF NOT EXISTS credits_history_created_at_idx ON public.credits_history(created_at);

-- 创建索引 - subscriptions 表
CREATE INDEX IF NOT EXISTS subscriptions_customer_id_idx ON public.subscriptions(customer_id);
CREATE INDEX IF NOT EXISTS subscriptions_status_idx ON public.subscriptions(status);

-- =====================================================================
-- 第二部分: 中文名字生成相关表
-- =====================================================================

-- 创建 name_generation_logs 表 - 跟踪名字生成使用记录
CREATE TABLE IF NOT EXISTS public.name_generation_logs (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    plan_type text NOT NULL CHECK (plan_type IN ('1', '4')),
    credits_used integer NOT NULL DEFAULT 1,
    names_generated integer NOT NULL DEFAULT 1,
    english_name text NOT NULL,
    gender text NOT NULL CHECK (gender IN ('male', 'female', 'other')),
    birth_year text,
    has_personality_traits boolean DEFAULT false,
    has_name_preferences boolean DEFAULT false,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 创建 saved_names 表 - 用户收藏的名字
CREATE TABLE IF NOT EXISTS public.saved_names (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    chinese_name text NOT NULL,
    pinyin text NOT NULL,
    meaning text NOT NULL,
    cultural_notes text,
    personality_match text,
    characters jsonb NOT NULL,
    generation_metadata jsonb DEFAULT '{}'::jsonb,
    is_selected boolean DEFAULT false,
    is_favorite boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 创建 popular_names 表 - 热门名字
CREATE TABLE IF NOT EXISTS public.popular_names (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    chinese_name text NOT NULL UNIQUE,
    pinyin text NOT NULL,
    meaning text NOT NULL,
    cultural_significance text NOT NULL,
    gender text NOT NULL CHECK (gender IN ('male', 'female', 'unisex')),
    popularity_score integer DEFAULT 0,
    times_generated integer DEFAULT 0,
    times_favorited integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 创建索引 - name_generation_logs
CREATE INDEX IF NOT EXISTS name_generation_logs_user_id_idx ON public.name_generation_logs(user_id);
CREATE INDEX IF NOT EXISTS name_generation_logs_created_at_idx ON public.name_generation_logs(created_at);
CREATE INDEX IF NOT EXISTS name_generation_logs_plan_type_idx ON public.name_generation_logs(plan_type);

-- 创建索引 - saved_names
CREATE INDEX IF NOT EXISTS saved_names_user_id_idx ON public.saved_names(user_id);
CREATE INDEX IF NOT EXISTS saved_names_is_selected_idx ON public.saved_names(is_selected);
CREATE INDEX IF NOT EXISTS saved_names_is_favorite_idx ON public.saved_names(is_favorite);
CREATE INDEX IF NOT EXISTS saved_names_chinese_name_idx ON public.saved_names(chinese_name);

-- 创建索引 - popular_names
CREATE INDEX IF NOT EXISTS popular_names_popularity_score_idx ON public.popular_names(popularity_score DESC);
CREATE INDEX IF NOT EXISTS popular_names_gender_idx ON public.popular_names(gender);
CREATE INDEX IF NOT EXISTS popular_names_times_generated_idx ON public.popular_names(times_generated DESC);

-- =====================================================================
-- 第三部分: 生成批次和名字表 (支持多轮生成)
-- =====================================================================

-- 创建 generation_batches 表 - 每次生成会话
CREATE TABLE IF NOT EXISTS public.generation_batches (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    english_name text NOT NULL,
    gender text NOT NULL CHECK (gender IN ('male', 'female', 'other')),
    birth_year text,
    personality_traits text,
    name_preferences text,
    plan_type text NOT NULL CHECK (plan_type IN ('1', '4')),
    credits_used integer NOT NULL DEFAULT 0,
    names_count integer NOT NULL DEFAULT 0,
    generation_metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 创建 generated_names 表 - 每批次中的单个名字
CREATE TABLE IF NOT EXISTS public.generated_names (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    batch_id uuid REFERENCES public.generation_batches(id) ON DELETE CASCADE NOT NULL,
    chinese_name text NOT NULL,
    pinyin text NOT NULL,
    characters jsonb NOT NULL,
    meaning text NOT NULL,
    cultural_notes text NOT NULL,
    personality_match text NOT NULL,
    style text NOT NULL,
    position_in_batch integer NOT NULL,
    generation_round integer NOT NULL DEFAULT 1, -- 支持多轮生成
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT check_generation_round_positive CHECK (generation_round > 0)
);

-- 创建索引 - generation_batches
CREATE INDEX IF NOT EXISTS generation_batches_user_id_idx ON public.generation_batches(user_id);
CREATE INDEX IF NOT EXISTS generation_batches_created_at_idx ON public.generation_batches(created_at);
CREATE INDEX IF NOT EXISTS generation_batches_plan_type_idx ON public.generation_batches(plan_type);
CREATE INDEX IF NOT EXISTS idx_generation_batches_user_created ON public.generation_batches(user_id, created_at DESC);

-- 创建索引 - generated_names
CREATE INDEX IF NOT EXISTS generated_names_batch_id_idx ON public.generated_names(batch_id);
CREATE INDEX IF NOT EXISTS generated_names_position_idx ON public.generated_names(position_in_batch);
CREATE INDEX IF NOT EXISTS generated_names_chinese_name_idx ON public.generated_names(chinese_name);
CREATE INDEX IF NOT EXISTS generated_names_round_idx ON public.generated_names(generation_round);
CREATE INDEX IF NOT EXISTS generated_names_batch_round_idx ON public.generated_names(batch_id, generation_round);
CREATE INDEX IF NOT EXISTS idx_generated_names_batch_id_round ON public.generated_names(batch_id, generation_round);

-- =====================================================================
-- 第四部分: IP 限流表 (支持未登录用户免费生成)
-- =====================================================================

-- 创建 ip_usage_logs 表 - IP 使用记录
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

-- 创建索引 - ip_usage_logs
CREATE INDEX IF NOT EXISTS ip_usage_logs_client_ip_idx ON public.ip_usage_logs(client_ip);
CREATE INDEX IF NOT EXISTS ip_usage_logs_usage_date_idx ON public.ip_usage_logs(usage_date);
CREATE INDEX IF NOT EXISTS ip_usage_logs_created_at_idx ON public.ip_usage_logs(created_at);

-- =====================================================================
-- 第五部分: 触发器函数
-- =====================================================================

-- 创建 updated_at 触发器函数
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 为各表创建 updated_at 触发器
DROP TRIGGER IF EXISTS handle_customers_updated_at ON public.customers;
CREATE TRIGGER handle_customers_updated_at
    BEFORE UPDATE ON public.customers
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_subscriptions_updated_at ON public.subscriptions;
CREATE TRIGGER handle_subscriptions_updated_at
    BEFORE UPDATE ON public.subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_saved_names_updated_at ON public.saved_names;
CREATE TRIGGER handle_saved_names_updated_at
    BEFORE UPDATE ON public.saved_names
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_popular_names_updated_at ON public.popular_names;
CREATE TRIGGER handle_popular_names_updated_at
    BEFORE UPDATE ON public.popular_names
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_generation_batches_updated_at ON public.generation_batches;
CREATE TRIGGER handle_generation_batches_updated_at
    BEFORE UPDATE ON public.generation_batches
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_generated_names_updated_at ON public.generated_names;
CREATE TRIGGER handle_generated_names_updated_at
    BEFORE UPDATE ON public.generated_names
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_ip_usage_logs_updated_at ON public.ip_usage_logs;
CREATE TRIGGER handle_ip_usage_logs_updated_at
    BEFORE UPDATE ON public.ip_usage_logs
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- =====================================================================
-- 第六部分: 自动创建客户记录触发器
-- =====================================================================

-- 创建函数：为新注册用户自动创建 customer 记录
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    INSERT INTO public.customers (
        user_id,
        email,
        credits,
        creem_customer_id,
        created_at,
        updated_at,
        metadata
    ) VALUES (
        NEW.id,
        NEW.email,
        3, -- 新用户赠送 3 积分
        'auto_' || NEW.id::text,
        NOW(),
        NOW(),
        jsonb_build_object(
            'source', 'auto_registration',
            'initial_credits', 3,
            'registration_date', NOW()
        )
    );

    -- 记录初始积分赠送历史
    INSERT INTO public.credits_history (
        customer_id,
        amount,
        type,
        description,
        created_at,
        metadata
    ) VALUES (
        (SELECT id FROM public.customers WHERE user_id = NEW.id),
        3,
        'add',
        'Welcome bonus for new user registration',
        NOW(),
        jsonb_build_object(
            'source', 'welcome_bonus',
            'user_registration', true
        )
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 创建触发器：在用户注册时自动触发
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- =====================================================================
-- 第七部分: 辅助函数
-- =====================================================================

-- IP 限流检查函数
CREATE OR REPLACE FUNCTION public.check_ip_rate_limit(p_client_ip text)
RETURNS boolean AS $$
DECLARE
    current_count integer := 0;
    daily_limit integer := 1; -- 每天 1 次免费生成
BEGIN
    SELECT COALESCE(ipl.generation_count, 0) INTO current_count
    FROM public.ip_usage_logs ipl
    WHERE ipl.client_ip = p_client_ip
    AND ipl.usage_date = CURRENT_DATE;

    IF current_count IS NULL THEN
        current_count := 0;
    END IF;

    IF current_count >= daily_limit THEN
        RETURN false;
    ELSE
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

        RETURN true;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 更新热门名字统计函数
CREATE OR REPLACE FUNCTION public.update_popular_name_stats(name_text text, action_type text)
RETURNS void AS $$
BEGIN
    IF action_type = 'generated' THEN
        INSERT INTO public.popular_names
        (chinese_name, pinyin, meaning, cultural_significance, gender, times_generated, popularity_score)
        VALUES (name_text, '', 'AI generated name', 'Modern AI-generated Chinese name', 'unisex', 1, 1)
        ON CONFLICT (chinese_name)
        DO UPDATE SET
            times_generated = public.popular_names.times_generated + 1,
            popularity_score = public.popular_names.popularity_score + 1,
            updated_at = timezone('utc'::text, now());
    ELSIF action_type = 'favorited' THEN
        UPDATE public.popular_names
        SET
            times_favorited = times_favorited + 1,
            popularity_score = popularity_score + 2,
            updated_at = timezone('utc'::text, now())
        WHERE chinese_name = name_text;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 清理旧 IP 日志函数
CREATE OR REPLACE FUNCTION public.cleanup_old_ip_logs(days_to_keep integer DEFAULT 30)
RETURNS integer AS $$
DECLARE
    deleted_count integer;
BEGIN
    DELETE FROM public.ip_usage_logs
    WHERE usage_date < CURRENT_DATE - days_to_keep;

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================================
-- 第八部分: RLS (行级安全) 策略
-- =====================================================================

-- 启用 RLS
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credits_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.name_generation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_names ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.popular_names ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generation_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generated_names ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ip_usage_logs ENABLE ROW LEVEL SECURITY;

-- Customers 策略
CREATE POLICY "Users can view their own customer data"
    ON public.customers FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own customer data"
    ON public.customers FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage customer data"
    ON public.customers FOR ALL
    USING (auth.role() = 'service_role');

-- Credits history 策略
CREATE POLICY "Users can view their own credits history"
    ON public.credits_history FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.customers
            WHERE customers.id = credits_history.customer_id
            AND customers.user_id = auth.uid()
        )
    );

CREATE POLICY "Service role can manage credits history"
    ON public.credits_history FOR ALL
    USING (auth.role() = 'service_role');

-- Subscriptions 策略
CREATE POLICY "Users can view their own subscriptions"
    ON public.subscriptions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.customers
            WHERE customers.id = subscriptions.customer_id
            AND customers.user_id = auth.uid()
        )
    );

CREATE POLICY "Service role can manage subscriptions"
    ON public.subscriptions FOR ALL
    USING (auth.role() = 'service_role');

-- Name generation logs 策略
CREATE POLICY "Users can view their own name generation logs"
    ON public.name_generation_logs FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage name generation logs"
    ON public.name_generation_logs FOR ALL
    USING (auth.role() = 'service_role');

-- Saved names 策略
CREATE POLICY "Users can view their own saved names"
    ON public.saved_names FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own saved names"
    ON public.saved_names FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own saved names"
    ON public.saved_names FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own saved names"
    ON public.saved_names FOR DELETE
    USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage saved names"
    ON public.saved_names FOR ALL
    USING (auth.role() = 'service_role');

-- Popular names 策略 (公开读取)
CREATE POLICY "Anyone can view popular names"
    ON public.popular_names FOR SELECT
    USING (true);

CREATE POLICY "Service role can manage popular names"
    ON public.popular_names FOR ALL
    USING (auth.role() = 'service_role');

-- Generation batches 策略
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

-- Generated names 策略
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

-- IP usage logs 策略
CREATE POLICY "Service role can manage IP usage logs"
    ON public.ip_usage_logs FOR ALL
    USING (auth.role() = 'service_role');

-- =====================================================================
-- 第九部分: 权限设置
-- =====================================================================

-- 授予 service_role 权限
GRANT ALL ON public.customers TO service_role;
GRANT ALL ON public.credits_history TO service_role;
GRANT ALL ON public.subscriptions TO service_role;
GRANT ALL ON public.name_generation_logs TO service_role;
GRANT ALL ON public.saved_names TO service_role;
GRANT ALL ON public.popular_names TO service_role;
GRANT ALL ON public.generation_batches TO service_role;
GRANT ALL ON public.generated_names TO service_role;
GRANT ALL ON public.ip_usage_logs TO service_role;

-- 授予函数执行权限
GRANT EXECUTE ON FUNCTION public.check_ip_rate_limit(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.update_popular_name_stats(text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.cleanup_old_ip_logs(integer) TO service_role;

-- 授予 authenticated 用户权限
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.generation_batches TO authenticated;
GRANT ALL ON public.generated_names TO authenticated;

-- =====================================================================
-- 第十部分: 初始化数据
-- =====================================================================

-- 插入示例热门名字数据
INSERT INTO public.popular_names
(chinese_name, pinyin, meaning, cultural_significance, gender, popularity_score, times_generated, times_favorited)
VALUES
    ('李雨桐', 'Lǐ Yǔtóng', 'Rain and paulownia tree - symbolizing grace and growth', 'A name that represents natural beauty and strength', 'female', 95, 150, 45),
    ('王志明', 'Wáng Zhìmíng', 'Bright ambition - representing wisdom and determination', 'Classic name embodying traditional values of wisdom and aspiration', 'male', 92, 142, 38),
    ('陈美丽', 'Chén Měilì', 'Beautiful and graceful - representing inner and outer beauty', 'Timeless name celebrating feminine grace and beauty', 'female', 88, 130, 35),
    ('张伟强', 'Zhāng Wěiqiáng', 'Great strength - symbolizing power and resilience', 'Name reflecting strength of character and leadership qualities', 'male', 87, 125, 32),
    ('刘慧敏', 'Liú Huìmǐn', 'Wise and quick-minded - representing intelligence and agility', 'Name celebrating intellectual prowess and sharp thinking', 'female', 85, 118, 28),
    ('黄文昊', 'Huáng Wénhào', 'Literary and vast - representing scholarly achievement', 'Name honoring academic excellence and broad knowledge', 'male', 83, 112, 25),
    ('林雅静', 'Lín Yǎjìng', 'Elegant and tranquil - representing refined peace', 'A name that embodies serenity and sophistication', 'female', 81, 105, 22),
    ('周建国', 'Zhōu Jiànguó', 'Building the nation - representing patriotic spirit', 'Name reflecting dedication to country and community service', 'male', 79, 98, 20)
ON CONFLICT (chinese_name) DO NOTHING;

-- =====================================================================
-- 第十一部分: 为现有用户创建客户记录
-- =====================================================================

-- 为现有的 auth.users 创建 customer 记录（如果还没有的话）
INSERT INTO public.customers (
    user_id,
    email,
    credits,
    creem_customer_id,
    created_at,
    updated_at,
    metadata
)
SELECT
    au.id,
    au.email,
    3, -- 赠送 3 积分
    'existing_' || au.id::text,
    au.created_at,
    NOW(),
    jsonb_build_object(
        'source', 'existing_user_migration',
        'initial_credits', 3,
        'migration_date', NOW()
    )
FROM auth.users au
LEFT JOIN public.customers c ON au.id = c.user_id
WHERE c.user_id IS NULL;

-- 为现有用户添加初始积分历史记录
INSERT INTO public.credits_history (
    customer_id,
    amount,
    type,
    description,
    created_at,
    metadata
)
SELECT
    c.id,
    3,
    'add',
    'Welcome bonus for existing user',
    NOW(),
    jsonb_build_object(
        'source', 'existing_user_bonus',
        'migration', true
    )
FROM public.customers c
LEFT JOIN public.credits_history ch ON c.id = ch.customer_id
WHERE ch.customer_id IS NULL
AND c.creem_customer_id LIKE 'existing_%';

-- =====================================================================
-- 完成提示
-- =====================================================================

DO $$
BEGIN
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE 'Raphael Starter Kit 数据库设置完成！';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '已创建的表：';
    RAISE NOTICE '  ✓ customers - 客户信息';
    RAISE NOTICE '  ✓ credits_history - 积分历史';
    RAISE NOTICE '  ✓ subscriptions - 订阅信息';
    RAISE NOTICE '  ✓ name_generation_logs - 名字生成日志';
    RAISE NOTICE '  ✓ saved_names - 收藏的名字';
    RAISE NOTICE '  ✓ popular_names - 热门名字';
    RAISE NOTICE '  ✓ generation_batches - 生成批次';
    RAISE NOTICE '  ✓ generated_names - 生成的名字';
    RAISE NOTICE '  ✓ ip_usage_logs - IP 使用记录';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '已创建的功能：';
    RAISE NOTICE '  ✓ 自动为新用户创建客户记录（赠送 3 积分）';
    RAISE NOTICE '  ✓ IP 限流（未登录用户每天 1 次免费生成）';
    RAISE NOTICE '  ✓ 热门名字统计';
    RAISE NOTICE '  ✓ 完整的 RLS 行级安全策略';
    RAISE NOTICE '  ✓ 所有必要的索引和触发器';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '数据库已准备就绪，可以开始使用！';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
END $$;
