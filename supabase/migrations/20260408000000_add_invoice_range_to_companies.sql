-- Add invoice number range fields for the legal printer block on the PDF
ALTER TABLE invoice_companies
ADD COLUMN IF NOT EXISTS invoice_range_from VARCHAR(50),
ADD COLUMN IF NOT EXISTS invoice_range_to VARCHAR(50);
