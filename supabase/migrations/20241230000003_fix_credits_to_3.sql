-- Fix credits to be 3 instead of 10 for testing users

-- Update customers that got 10 credits from testing fix back to 3
UPDATE public.customers
SET
  credits = 3,
  updated_at = NOW(),
  metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('credits_corrected', NOW(), 'reason', 'fix_to_3_credits')
WHERE credits = 10
AND (metadata->>'reason' = 'testing_fix' OR metadata->>'source' = 'credit_fix_migration');

-- Add credit history for the correction
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
  -7, -- Remove 7 credits (10 -> 3)
  'subtract',
  'Corrected credits from 10 to 3 for proper testing',
  NOW(),
  jsonb_build_object(
    'source', 'credit_correction',
    'from_credits', 10,
    'to_credits', 3,
    'correction_date', NOW()
  )
FROM public.customers c
WHERE c.credits = 3
AND c.metadata->>'reason' = 'fix_to_3_credits';

-- Show current status
DO $$
DECLARE
    total_customers integer;
    customers_with_credits integer;
    avg_credits numeric;
BEGIN
    SELECT COUNT(*) INTO total_customers FROM public.customers;
    SELECT COUNT(*) INTO customers_with_credits FROM public.customers WHERE credits > 0;
    SELECT AVG(credits) INTO avg_credits FROM public.customers;
    
    RAISE NOTICE 'Status: % total customers, % with credits, average credits: %', total_customers, customers_with_credits, avg_credits;
    RAISE NOTICE 'Credits corrected to 3 for all testing users!';
END $$;