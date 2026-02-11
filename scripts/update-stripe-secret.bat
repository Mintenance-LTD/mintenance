@echo off
echo ========================================
echo Updating Stripe Secret Key in Supabase
echo ========================================
echo.

REM REQUIRED: Set these environment variables before running:
REM   SUPABASE_ACCESS_TOKEN - Your Supabase access token
REM   STRIPE_SECRET_KEY - Your Stripe secret key
REM   SUPABASE_PROJECT_REF - Your Supabase project reference ID

if "%SUPABASE_ACCESS_TOKEN%"=="" (
    echo ERROR: SUPABASE_ACCESS_TOKEN environment variable is not set
    exit /b 1
)
if "%STRIPE_SECRET_KEY%"=="" (
    echo ERROR: STRIPE_SECRET_KEY environment variable is not set
    exit /b 1
)
if "%SUPABASE_PROJECT_REF%"=="" (
    echo ERROR: SUPABASE_PROJECT_REF environment variable is not set
    exit /b 1
)

echo Setting STRIPE_SECRET_KEY...
npx supabase secrets set STRIPE_SECRET_KEY="%STRIPE_SECRET_KEY%" --project-ref %SUPABASE_PROJECT_REF%

echo.
echo Listing current secrets to verify...
npx supabase secrets list --project-ref %SUPABASE_PROJECT_REF%

echo.
echo ========================================
echo Complete! Please redeploy the Edge Function:
echo npx supabase functions deploy setup-contractor-payout --project-ref %SUPABASE_PROJECT_REF%
echo ========================================
