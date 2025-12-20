@echo off

REM Mintenance App Setup Script for Windows
REM Run this script to set up your development environment

echo 🚀 Setting up Mintenance app...

REM Check if Node.js is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed. Please install Node.js first.
    pause
    exit /b 1
)

REM Check if npm is installed  
where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ npm is not installed. Please install npm first.
    pause
    exit /b 1
)

REM Install dependencies
echo 📦 Installing dependencies...
call npm install

REM Check if .env exists
if not exist ".env" (
    echo 📝 Creating .env file from .env.example...
    copy ".env.example" ".env"
    echo ⚠️  Please update .env with your actual Supabase credentials!
) else (
    echo ✅ .env file already exists
)

REM Install EAS CLI globally if not installed
where eas >nul 2>nul
if %errorlevel% neq 0 (
    echo 🔧 Installing EAS CLI globally...
    call npm install -g @expo/cli eas-cli
) else (
    echo ✅ EAS CLI already installed
)

echo.
echo ✅ Setup complete!
echo.
echo Next steps:
echo 1. Update .env with your Supabase credentials
echo 2. Run the database setup script in Supabase SQL editor
echo 3. Run 'npm start' to start development server
echo 4. Run 'eas login' to authenticate with Expo
echo 5. Run 'eas build:configure' to set up builds
echo.
pause