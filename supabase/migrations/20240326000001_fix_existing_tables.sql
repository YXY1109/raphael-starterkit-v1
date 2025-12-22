-- 修复已存在表的结构和策略
-- 这个脚本安全地处理已存在的表

-- 确保customers表有所有必需的列
DO $$ 
BEGIN
    -- 添加可能缺失的列（如果不存在）
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customers' AND column_name='credits') THEN
        ALTER TABLE public.customers ADD COLUMN credits integer DEFAULT 0 NOT NULL;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customers' AND column_name='metadata') THEN
        ALTER TABLE public.customers ADD COLUMN metadata jsonb DEFAULT '{}'::jsonb;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customers' AND column_name='updated_at') THEN
        ALTER TABLE public.customers ADD COLUMN updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL;
    END IF;
END $$;

-- 创建credits_history表（如果不存在）
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

-- 创建subscriptions表（如果不存在）
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

-- 创建索引（如果不存在）
CREATE INDEX IF NOT EXISTS customers_user_id_idx ON public.customers(user_id);
CREATE INDEX IF NOT EXISTS customers_creem_customer_id_idx ON public.customers(creem_customer_id);
CREATE INDEX IF NOT EXISTS credits_history_customer_id_idx ON public.credits_history(customer_id);
CREATE INDEX IF NOT EXISTS credits_history_created_at_idx ON public.credits_history(created_at);
CREATE INDEX IF NOT EXISTS subscriptions_customer_id_idx ON public.subscriptions(customer_id);
CREATE INDEX IF NOT EXISTS subscriptions_status_idx ON public.subscriptions(status);

-- 创建更新时间触发器函数（如果不存在）
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger AS $$
BEGIN
    new.updated_at = timezone('utc'::text, now());
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 创建触发器（如果不存在）
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

-- 启用RLS
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credits_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- 创建RLS策略（如果不存在）
DROP POLICY IF EXISTS "Users can view their own customer data" ON public.customers;
CREATE POLICY "Users can view their own customer data"
    ON public.customers FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own customer data" ON public.customers;
CREATE POLICY "Users can update their own customer data"
    ON public.customers FOR UPDATE
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can manage customer data" ON public.customers;
CREATE POLICY "Service role can manage customer data"
    ON public.customers FOR ALL
    USING (auth.role() = 'service_role');

-- Credits history policies
DROP POLICY IF EXISTS "Users can view their own credits history" ON public.credits_history;
CREATE POLICY "Users can view their own credits history"
    ON public.credits_history FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.customers
            WHERE customers.id = credits_history.customer_id
            AND customers.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Service role can manage credits history" ON public.credits_history;
CREATE POLICY "Service role can manage credits history"
    ON public.credits_history FOR ALL
    USING (auth.role() = 'service_role');

-- Subscriptions policies
DROP POLICY IF EXISTS "Users can view their own subscriptions" ON public.subscriptions;
CREATE POLICY "Users can view their own subscriptions"
    ON public.subscriptions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.customers
            WHERE customers.id = subscriptions.customer_id
            AND customers.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Service role can manage subscriptions" ON public.subscriptions;
CREATE POLICY "Service role can manage subscriptions"
    ON public.subscriptions FOR ALL
    USING (auth.role() = 'service_role');

-- 确保权限正确
GRANT ALL ON public.customers TO service_role;
GRANT ALL ON public.subscriptions TO service_role;
GRANT ALL ON public.credits_history TO service_role;

-- 完成提示
DO $$
BEGIN
    RAISE NOTICE 'Fixed existing tables structure and policies successfully!';
END $$;