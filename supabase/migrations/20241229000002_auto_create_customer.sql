-- 自动为新用户创建customer记录的触发器
-- 当用户在auth.users表中注册时，自动在customers表中创建对应记录

-- 创建函数：自动创建customer记录
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- 为新注册用户自动创建customer记录
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
    3, -- 新用户赠送3积分
    'auto_' || NEW.id::text, -- 自动生成的creem_customer_id
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
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 为现有的auth.users创建customer记录（如果还没有的话）
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
  3, -- 赠送3积分
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
WHERE c.user_id IS NULL; -- 只为没有customer记录的用户创建

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
AND c.creem_customer_id LIKE 'existing_%'; -- 只为刚迁移的现有用户添加

-- 成功提示
DO $$
BEGIN
    RAISE NOTICE 'Auto-create customer trigger has been created successfully!';
    RAISE NOTICE 'All existing users now have customer records with 3 initial credits.';
    RAISE NOTICE 'New users will automatically get customer records when they register.';
END $$;