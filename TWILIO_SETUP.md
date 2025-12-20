# Twilio Verify Setup Guide

## Quick Setup (3 Steps)

### Step 1: Open your `.env.local` file
**Location:** `apps/web/.env.local`

If it doesn't exist, create it in the `apps/web/` folder.

### Step 2: Add these 3 lines at the end of the file

Copy and paste these exact lines:

```env
# Twilio Verify Configuration (Fallback for SMS when Supabase times out)
TWILIO_ACCOUNT_SID=your_twilio_account_sid_here
TWILIO_AUTH_TOKEN=your_twilio_auth_token_here
TWILIO_VERIFY_SERVICE_SID=your_twilio_verify_service_sid_here
```

**Important:**
- Each line must be `KEY=value` format
- No spaces around the `=` sign
- One variable per line
- No commas or quotes

### Step 3: Restart your Next.js server

1. Stop the server (press `Ctrl+C` in the terminal)
2. Start it again: `npm run dev`

## Security: Regenerate Auth Token

⚠️ **Your Twilio Auth Token was exposed in chat. Regenerate it:**

1. Go to https://console.twilio.com/
2. Log in to your account
3. Click **Account** (top right) → **API Keys & Tokens**
4. Find your **Auth Token**
5. Click **Regenerate**
6. Copy the new token
7. Replace the auth token in `.env.local` with the new token

## How It Works

When phone verification is requested:

1. **First:** Tries Supabase SMS (primary method)
2. **If Supabase times out:** Tries Supabase Admin API (fallback)
3. **If Admin API times out:** Tries Twilio Verify (final fallback)

The system automatically uses Twilio when Supabase SMS times out.

## Testing

After setup:
1. Go to Settings page
2. Click "Verify Phone Number"
3. Check browser console for debug logs
4. You should receive an SMS code

## Troubleshooting

**If you get "Twilio Verify fallback not configured":**
- Check that `.env.local` is in `apps/web/` folder (not root)
- Check that variables are in `KEY=value` format (no spaces)
- Restart your Next.js server after adding variables

**If SMS still doesn't work:**
- Check debug logs in `.cursor/debug.log`
- Verify Twilio credentials are correct
- Check Twilio Console for any errors

