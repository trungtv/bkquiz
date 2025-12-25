-- Create function to generate CUID-like IDs
-- This is a simplified version - Prisma Client will handle actual CUID generation
-- But we need a default for the database column
CREATE OR REPLACE FUNCTION generate_cuid() RETURNS TEXT AS $$
BEGIN
  -- Prisma Client will generate the actual CUID, but we need a placeholder
  -- In practice, Prisma Client handles this, but we set a default to satisfy the constraint
  RETURN 'c' || substr(md5(random()::text || clock_timestamp()::text), 1, 24);
END;
$$ LANGUAGE plpgsql;

-- Add default values to User.id
ALTER TABLE "User" ALTER COLUMN "id" SET DEFAULT generate_cuid();

-- Add default values to Account.id  
ALTER TABLE "Account" ALTER COLUMN "id" SET DEFAULT generate_cuid();

-- Add default values to Session.id
ALTER TABLE "Session" ALTER COLUMN "id" SET DEFAULT generate_cuid();

-- Note: Prisma Client will still generate proper CUIDs when creating records
-- This default is just to satisfy the NOT NULL constraint if somehow id is not provided
