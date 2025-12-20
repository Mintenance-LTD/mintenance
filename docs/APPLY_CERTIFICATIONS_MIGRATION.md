# Apply Contractor Certifications Migration

## Migration File
`supabase/migrations/20250113000002_create_contractor_certifications.sql`

## Quick Apply via Supabase Dashboard

1. **Go to Supabase Dashboard**
   - Navigate to https://supabase.com/dashboard
   - Select your project

2. **Open SQL Editor**
   - Click on "SQL Editor" in the left sidebar
   - Click "New query"

3. **Copy and Paste SQL**
   - Copy the entire contents of `supabase/migrations/20250113000002_create_contractor_certifications.sql`
   - Paste into the SQL Editor
   - Click "Run" or press `Ctrl+Enter` (Windows) / `Cmd+Enter` (Mac)

4. **Verify Success**
   - You should see "Success. No rows returned" message
   - The `contractor_certifications` table should now exist

## Alternative: Supabase CLI

If you have Supabase CLI installed:

```bash
supabase db push
```

This will apply all pending migrations including the certifications migration.

## What This Migration Creates

- **Table**: `contractor_certifications`
  - Stores professional certifications and licenses for contractors
  - Fields: name, issuer, issue_date, expiry_date, credential_id, document_url, category, is_verified
  - Includes indexes for performance
  - Includes RLS policies for security
  - Includes triggers for automatic timestamp updates

## Verification

After applying, verify the table exists:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'contractor_certifications';
```

You should see `contractor_certifications` in the results.
