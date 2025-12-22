-- 安全删除并重新创建所有表
-- 注意：这会删除所有现有数据！

-- 删除现有表（按依赖关系倒序删除）
DROP TABLE IF EXISTS public.credits_history CASCADE;
DROP TABLE IF EXISTS public.subscriptions CASCADE;
DROP TABLE IF EXISTS public.customers CASCADE;

-- 删除可能存在的函数
DROP FUNCTION IF EXISTS public.handle_updated_at() CASCADE;

-- 重新创建customers表
CREATE TABLE public.customers (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    creem_customer_id text NOT NULL UNIQUE,
    email text NOT NULL,
    name text,
    country text,
    credits integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb,
    CONSTRAINT customers_email_match CHECK (email = lower(email)),
    CONSTRAINT credits_non_negative CHECK (credits >= 0)
);

-- 创建credits_history表
CREATE TABLE public.credits_history (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id uuid REFERENCES public.customers(id) ON DELETE CASCADE NOT NULL,
    amount integer NOT NULL,
    type text NOT NULL CHECK (type IN ('add', 'subtract')),
    description text,
    creem_order_id text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb
);

-- 创建subscriptions表
CREATE TABLE public.subscriptions (
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

-- 创建索引
CREATE INDEX customers_user_id_idx ON public.customers(user_id);
CREATE INDEX customers_creem_customer_id_idx ON public.customers(creem_customer_id);
CREATE INDEX subscriptions_customer_id_idx ON public.subscriptions(customer_id);
CREATE INDEX subscriptions_status_idx ON public.subscriptions(status);

-- 创建credits_history索引
CREATE INDEX credits_history_customer_id_idx ON public.credits_history(customer_id);
CREATE INDEX credits_history_created_at_idx ON public.credits_history(created_at);

-- 创建updated_at触发器函数
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger AS $$
BEGIN
    new.updated_at = timezone('utc'::text, now());
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 创建更新时间触发器
CREATE TRIGGER handle_customers_updated_at
    BEFORE UPDATE ON public.customers
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_subscriptions_updated_at
    BEFORE UPDATE ON public.subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- 启用RLS
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credits_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- 创建RLS策略
-- Customers policies
CREATE POLICY "Users can view their own customer data"
    ON public.customers FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own customer data"
    ON public.customers FOR UPDATE
    USING (auth.uid() = user_id);

-- Add policy for service role to insert/update customer data
CREATE POLICY "Service role can manage customer data"
    ON public.customers FOR ALL
    USING (auth.role() = 'service_role');

-- Subscriptions policies
CREATE POLICY "Users can view their own subscriptions"
    ON public.subscriptions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.customers
            WHERE customers.id = subscriptions.customer_id
            AND customers.user_id = auth.uid()
        )
    );

-- Add policy for service role to manage subscriptions
CREATE POLICY "Service role can manage subscriptions"
    ON public.subscriptions FOR ALL
    USING (auth.role() = 'service_role');

-- Credits history policies
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

-- 确保表对service_role可访问
GRANT ALL ON public.customers TO service_role;
GRANT ALL ON public.subscriptions TO service_role;
GRANT ALL ON public.credits_history TO service_role;

-- 成功提示
DO $$
BEGIN
    RAISE NOTICE 'Successfully recreated all tables: customers, credits_history, subscriptions';
    RAISE NOTICE 'All indexes, triggers, and RLS policies have been created';
    RAISE NOTICE 'Tables are ready for use!';
END $$;