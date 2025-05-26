-- Add installments column to debts table
ALTER TABLE debts ADD COLUMN installments INTEGER DEFAULT 1;

-- Add installments column to receivables table  
ALTER TABLE receivables ADD COLUMN installments INTEGER DEFAULT 1;

-- Add installments column to debts_audit table
ALTER TABLE debts_audit ADD COLUMN installments INTEGER;

-- Add installments column to receivables_audit table
ALTER TABLE receivables_audit ADD COLUMN installments INTEGER;
