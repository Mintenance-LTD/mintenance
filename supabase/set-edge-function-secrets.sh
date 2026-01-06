#!/bin/bash

# Script to set Edge Function environment variables/secrets
# Run this after logging into Supabase CLI with: npx supabase login

echo "Setting Edge Function secrets for setup-contractor-payout..."

# Set secrets one by one
npx supabase secrets set STRIPE_SECRET_KEY="sk_test_51SDXwQJmZpzAEZO8AjpLog7IBoaXwl2pAc72E8UMWsLlHaKvDiEKHPlaH3vlNMPK2o01Vkx7MAqpPTBrRySZH3jy00wsQZd1cIt" --project-ref ukrjudtlvapiajkjbcrd

npx supabase secrets set APP_URL="http://localhost:3000" --project-ref ukrjudtlvapiajkjbcrd

npx supabase secrets set SUPABASE_URL="https://ukrjudtlvapiajkjbcrd.supabase.co" --project-ref ukrjudtlvapiajkjbcrd

npx supabase secrets set SUPABASE_SERVICE_ROLE_KEY="sb_secret_AMoaugS1OiiCYsvyXtRJNw_uVUJwLan" --project-ref ukrjudtlvapiajkjbcrd

echo "✅ Secrets set successfully!"
echo ""
echo "Note: Edge Functions will automatically restart to pick up new secrets."
echo "You may need to wait a few seconds before testing again."
