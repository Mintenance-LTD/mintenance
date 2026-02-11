@echo off
REM Script to set Edge Function environment variables/secrets
REM Run this after logging into Supabase CLI with: npx supabase login
REM
REM REQUIRED: Set these environment variables before running:
REM   STRIPE_SECRET_KEY  - Your Stripe secret key
REM   SUPABASE_SERVICE_ROLE_KEY - Your Supabase service role key
REM   SUPABASE_PROJECT_REF - Your Supabase project reference ID

if "%STRIPE_SECRET_KEY%"=="" (
    echo ERROR: STRIPE_SECRET_KEY environment variable is not set
    echo Set it with: set STRIPE_SECRET_KEY=your_key_here
    exit /b 1
)
if "%SUPABASE_SERVICE_ROLE_KEY%"=="" (
    echo ERROR: SUPABASE_SERVICE_ROLE_KEY environment variable is not set
    echo Set it with: set SUPABASE_SERVICE_ROLE_KEY=your_key_here
    exit /b 1
)
if "%SUPABASE_PROJECT_REF%"=="" (
    echo ERROR: SUPABASE_PROJECT_REF environment variable is not set
    echo Set it with: set SUPABASE_PROJECT_REF=your_project_ref_here
    exit /b 1
)

echo Setting Edge Function secrets for setup-contractor-payout...

npx supabase secrets set STRIPE_SECRET_KEY="%STRIPE_SECRET_KEY%" --project-ref %SUPABASE_PROJECT_REF%

npx supabase secrets set APP_URL="http://localhost:3000" --project-ref %SUPABASE_PROJECT_REF%

npx supabase secrets set SUPABASE_URL="https://%SUPABASE_PROJECT_REF%.supabase.co" --project-ref %SUPABASE_PROJECT_REF%

npx supabase secrets set SUPABASE_SERVICE_ROLE_KEY="%SUPABASE_SERVICE_ROLE_KEY%" --project-ref %SUPABASE_PROJECT_REF%

echo.
echo Secrets set successfully!
echo.
echo Note: Edge Functions will automatically restart to pick up new secrets.
echo You may need to wait a few seconds before testing again.
pause
