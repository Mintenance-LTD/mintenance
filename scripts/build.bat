@echo off

REM Mintenance App Build Script for Windows
REM Usage: scripts\build.bat [profile] [platform]
REM Example: scripts\build.bat production android

set PROFILE=%1
set PLATFORM=%2

if "%PROFILE%"=="" set PROFILE=preview
if "%PLATFORM%"=="" set PLATFORM=android

echo 🏗️  Building Mintenance app...
echo Profile: %PROFILE%
echo Platform: %PLATFORM%

REM Validate profile
if "%PROFILE%"=="development" goto valid_profile
if "%PROFILE%"=="staging" goto valid_profile  
if "%PROFILE%"=="preview" goto valid_profile
if "%PROFILE%"=="production" goto valid_profile
if "%PROFILE%"=="production-store" goto valid_profile
echo ❌ Invalid profile. Use: development, staging, preview, production, or production-store
pause
exit /b 1

:valid_profile
echo ✅ Valid build profile: %PROFILE%

REM Validate platform
if "%PLATFORM%"=="android" goto valid_platform
if "%PLATFORM%"=="ios" goto valid_platform
if "%PLATFORM%"=="all" goto valid_platform
echo ❌ Invalid platform. Use: android, ios, or all
pause
exit /b 1

:valid_platform
echo ✅ Valid platform: %PLATFORM%

REM Check if logged into EAS
call eas whoami >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Not logged into EAS. Please run 'eas login' first.
    pause
    exit /b 1
)

REM Set environment based on profile
set ENV_FILE=.env
if "%PROFILE%"=="production" set ENV_FILE=.env.production
if "%PROFILE%"=="production-store" set ENV_FILE=.env.production
if "%PROFILE%"=="staging" set ENV_FILE=.env.staging

echo 📝 Using environment file: %ENV_FILE%

REM Copy appropriate env file if it exists
if exist "%ENV_FILE%" (
    copy "%ENV_FILE%" ".env" >nul
    echo ✅ Environment configured
) else (
    echo ⚠️  Environment file %ENV_FILE% not found, using current .env
)

REM Pre-build checks
echo 🔍 Running pre-build checks...

REM Start build
echo 🚀 Starting EAS build...

if "%PLATFORM%"=="all" (
    call eas build --profile "%PROFILE%" --platform all --non-interactive
) else (
    call eas build --profile "%PROFILE%" --platform "%PLATFORM%" --non-interactive
)

echo ✅ Build command completed!
echo.
echo 📱 Check build status: https://expo.dev/accounts/[your-account]/projects/mintenance/builds
echo.
pause