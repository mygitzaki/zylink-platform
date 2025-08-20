-- Safe SQL script to add missing accountType column
-- This script adds the column without migration locks

-- Add the accountType column with a default value
ALTER TABLE "PaymentAccount" 
ADD COLUMN IF NOT EXISTS "accountType" TEXT DEFAULT 'BANK_ACCOUNT';

-- Update existing records to have a default account type
UPDATE "PaymentAccount" 
SET "accountType" = 'BANK_ACCOUNT' 
WHERE "accountType" IS NULL;

-- Make the column NOT NULL after setting defaults
ALTER TABLE "PaymentAccount" 
ALTER COLUMN "accountType" SET NOT NULL;

-- Verify the column was added
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'PaymentAccount' AND column_name = 'accountType';
