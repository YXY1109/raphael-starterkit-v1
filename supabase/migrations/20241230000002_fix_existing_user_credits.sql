-- Fix existing user credits - ensure all users have proper customer records and credits

-- First, let's see what we have
DO $$
BEGIN
    RAISE NOTICE 'Checking current user and customer data...';
END $$;

-- Create customer records for any auth.users without them, with credits
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
  10, -- Give 10 credits to existing users for testing
  'fix_' || au.id::text,
  au.created_at,
  NOW(),
  jsonb_build_object(
    'source', 'credit_fix_migration',
    'initial_credits', 10,
    'fix_date', NOW()
  )
FROM auth.users au
LEFT JOIN public.customers c ON au.id = c.user_id
WHERE c.user_id IS NULL;

-- Update existing customers with 0 credits to have some credits for testing
UPDATE public.customers 
SET 
  credits = 10,
  updated_at = NOW(),
  metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('credits_updated', NOW(), 'reason', 'testing_fix')
WHERE credits = 0;

-- Add credit history for the credits we just gave
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
  10,
  'add',
  'Credits fix for testing - existing user bonus',
  NOW(),
  jsonb_build_object(
    'source', 'testing_fix',
    'migration', true,
    'fix_date', NOW()
  )
FROM public.customers c
LEFT JOIN public.credits_history ch ON c.id = ch.customer_id AND ch.description LIKE '%testing%'
WHERE ch.customer_id IS NULL
AND c.metadata->>'reason' = 'testing_fix';

-- Show current status
DO $$
DECLARE
    user_count integer;
    customer_count integer;
    total_credits integer;
BEGIN
    SELECT COUNT(*) INTO user_count FROM auth.users;
    SELECT COUNT(*) INTO customer_count FROM public.customers;
    SELECT SUM(credits) INTO total_credits FROM public.customers;
    
    RAISE NOTICE 'Status: % auth users, % customers, % total credits distributed', user_count, customer_count, total_credits;
    RAISE NOTICE 'All users should now have customer records with credits!';
END $$;