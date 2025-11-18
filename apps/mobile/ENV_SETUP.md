# Environment Variables Setup for Mobile App

## Required Environment Variables

The mobile app requires the following environment variables to connect to Supabase:

- `EXPO_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anonymous key

## How to Set Environment Variables

### Option 1: Share with Web App (Recommended) ✨

**The mobile app automatically shares environment variables with the web app!**

If you have a `.env.local` file in `apps/web/`, the mobile app will automatically:
- Read variables from `apps/web/.env.local`
- Map `NEXT_PUBLIC_SUPABASE_URL` → `EXPO_PUBLIC_SUPABASE_URL`
- Map `NEXT_PUBLIC_SUPABASE_ANON_KEY` → `EXPO_PUBLIC_SUPABASE_ANON_KEY`

**Just create/update `apps/web/.env.local` with:**
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

The mobile app will automatically use these values! No need to duplicate them.

**Priority order (first found wins):**
1. `apps/web/.env.local`
2. `apps/web/.env`
3. Root `.env.local`
4. Root `.env`
5. `apps/mobile/.env` (mobile-specific fallback)

### Option 2: Create a Mobile-Specific `.env` file

If you prefer to keep mobile and web separate, create a `.env` file in the `apps/mobile` directory:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

**Note:** Expo automatically loads `.env` files. Make sure to:
1. Create the file in `apps/mobile/.env` (not in the root)
2. Restart the Expo dev server after creating/updating the file
3. Never commit `.env` files to git (they should be in `.gitignore`)

### Option 3: Set System Environment Variables

You can also set these as system environment variables before running Expo:

**Windows (PowerShell):**
```powershell
$env:EXPO_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
$env:EXPO_PUBLIC_SUPABASE_ANON_KEY="your-anon-key-here"
expo start --dev-client
```

**Windows (Command Prompt):**
```cmd
set EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
set EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
expo start --dev-client
```

**macOS/Linux:**
```bash
export EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
export EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
expo start --dev-client
```

## Getting Your Supabase Credentials

1. Go to your Supabase project dashboard: https://app.supabase.com
2. Navigate to **Settings** → **API**
3. Copy the **Project URL** (this is your `EXPO_PUBLIC_SUPABASE_URL`)
4. Copy the **anon/public** key (this is your `EXPO_PUBLIC_SUPABASE_ANON_KEY`)

## Development Mode

If you don't set these variables, the app will:
- Show warnings (but continue running)
- Use a mock Supabase client for development
- Allow you to test the app UI without a real database connection

## Production Builds

For production builds (EAS Build), you **must** set these environment variables, otherwise the build will fail.

Set them in your `eas.json` or EAS dashboard under environment variables.

