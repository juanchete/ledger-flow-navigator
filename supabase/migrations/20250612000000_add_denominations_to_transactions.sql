ALTER TABLE public.transactions
ADD COLUMN denominations JSONB;

ALTER TABLE public.transactions_audit
ADD COLUMN denominations JSONB; 