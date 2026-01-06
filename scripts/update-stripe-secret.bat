@echo off
echo ========================================
echo Updating Stripe Secret Key in Supabase
echo ========================================
echo.

REM Set the Supabase access token
set SUPABASE_ACCESS_TOKEN=sbp_c8598aa11eb61e2cf12ef9aa88a492cbf1aafb67

REM Set the correct Stripe secret key (from .env.local)
set STRIPE_KEY=sk_test_51SDXwQJmZpzAEZO8AjpLog7IBoaXwl2pAc72E8UMWsLlHaKvDiEKHPlaH3vlNMPK2o01Vkx7MAqpPTBrRySZH3jy00wsQZd1cIt

echo Setting STRIPE_SECRET_KEY...
npx supabase secrets set STRIPE_SECRET_KEY="%STRIPE_KEY%" --project-ref ukrjudtlvapiajkjbcrd

echo.
echo Listing current secrets to verify...
npx supabase secrets list --project-ref ukrjudtlvapiajkjbcrd

echo.
echo ========================================
echo Complete! Please redeploy the Edge Function:
echo npx supabase functions deploy setup-contractor-payout --project-ref ukrjudtlvapiajkjbcrd
echo ========================================