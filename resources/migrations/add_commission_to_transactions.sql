-- Migration: Add commission field to transactions table
-- This field will store the commission percentage for transfer transactions

-- Add commission column to transactions table
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS commission DECIMAL(5,2);

-- Add comment to explain the field
COMMENT ON COLUMN transactions.commission IS 'Commission percentage applied to transfer transactions';