@echo off
echo ============================================
echo Update Supabase Service Role Key
echo ============================================
echo.
echo STEP 1: Get your service role key
echo -----------------------------------------
echo 1. Open: https://supabase.com/dashboard/project/ukrjudtlvapiajkjbcrd/settings/api
echo 2. Scroll to "Project API keys"
echo 3. Find "service_role secret"
echo 4. Click "Reveal"
echo 5. Click "Copy"
echo.
echo STEP 2: Paste the key below
echo -----------------------------------------
echo.
set /p SERVICE_ROLE_KEY="Paste your service role key here and press Enter: "
echo.
echo STEP 3: Updating .env.local...
echo -----------------------------------------

REM Backup the current .env.local
copy apps\web\.env.local apps\web\.env.local.backup

REM Update the line using PowerShell
powershell -Command "(Get-Content apps\web\.env.local) -replace '^SUPABASE_SERVICE_ROLE_KEY=.*', 'SUPABASE_SERVICE_ROLE_KEY=%SERVICE_ROLE_KEY%' | Set-Content apps\web\.env.local"

echo.
echo ✅ Updated! Backup saved to: apps\web\.env.local.backup
echo.
echo STEP 4: Verify the update
echo -----------------------------------------
findstr "SUPABASE_SERVICE_ROLE_KEY" apps\web\.env.local
echo.
echo STEP 5: Restart your dev server
echo -----------------------------------------
echo Press Ctrl+C in your terminal to stop the server
echo Then run: npm run dev
echo.
echo ============================================
echo Done! Now test the payout setup.
echo ============================================
pause
