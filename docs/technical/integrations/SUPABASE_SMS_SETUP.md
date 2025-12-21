# Supabase SMS Configuration Guide

## TextLocal Setup (UK-based SMS Provider)

### Step 1: Add Environment Variable

Add your TextLocal API key to your environment. For **local development**, add it to your `.env.local` file in the project root:

```bash
SUPABASE_AUTH_SMS_TEXTLOCAL_API_KEY=your_aky_35FtIzLoT9uxHLkk6dEd5o8msJT
```

**For Supabase CLI**, you can also set it as a system environment variable or in your shell profile.

### Step 2: Restart Supabase

After adding the environment variable, restart your local Supabase instance:

```bash
supabase stop
supabase start
```

### Step 3: Verify Configuration

The TextLocal provider is now enabled in `supabase/config.toml`:

```toml
[auth.sms.textlocal]
enabled = true
api_key = "env(SUPABASE_AUTH_SMS_TEXTLOCAL_API_KEY)"
sender = "Mintenance"
```

### Step 4: Test SMS Sending

1. Navigate to `/verify-phone` in your app
2. Enter a phone number (e.g., `+44 7984 596545`)
3. Click "Send Verification Code"
4. Check your phone for the SMS code

## Production Setup

For production (Supabase Cloud), add the environment variable in your Supabase project settings:

1. Go to your Supabase project dashboard
2. Navigate to **Settings** → **Auth** → **SMS Provider**
3. Select **TextLocal**
4. Add your API key: `your_aky_35FtIzLoT9uxHLkk6dEd5o8msJT`
5. Set sender name: `Mintenance`

## ⚠️ Security Warning

**IMPORTANT**: Your API key has been exposed in this conversation. For security:

1. **Regenerate your TextLocal API key** immediately:
   - Log in to https://www.textlocal.com/
   - Go to **API Settings**
   - Generate a new API key
   - Update the environment variable with the new key

2. **Never commit API keys to version control**
   - Ensure `.env.local` is in your `.gitignore`
   - Use environment variables in production
   - Use Supabase's environment variable substitution (`env(...)`) in config files

## Alternative SMS Providers

If you want to use a different provider, uncomment the relevant section in `supabase/config.toml`:

### MessageBird
```toml
[auth.sms.messagebird]
enabled = true
access_key = "env(SUPABASE_AUTH_SMS_MESSAGEBIRD_ACCESS_KEY)"
originator = "Mintenance"
```

### Vonage (formerly Nexmo)
```toml
[auth.sms.vonage]
enabled = true
api_key = "env(SUPABASE_AUTH_SMS_VONAGE_API_KEY)"
api_secret = "env(SUPABASE_AUTH_SMS_VONAGE_API_SECRET)"
from = "Mintenance"
```

### Twilio
```toml
[auth.sms.twilio]
enabled = true
account_sid = "env(SUPABASE_AUTH_SMS_TWILIO_ACCOUNT_SID)"
message_service_sid = "env(SUPABASE_AUTH_SMS_TWILIO_MESSAGE_SERVICE_SID)"
auth_token = "env(SUPABASE_AUTH_SMS_TWILIO_AUTH_TOKEN)"
```

## Troubleshooting

### SMS Not Sending

1. **Check environment variable**: Ensure `SUPABASE_AUTH_SMS_TEXTLOCAL_API_KEY` is set
2. **Check Supabase logs**: Run `supabase logs` to see error messages
3. **Verify API key**: Test your TextLocal API key directly via their API
4. **Check phone format**: Ensure phone numbers are in international format (`+44...`)

### Development Mode

In development, Supabase may not send actual SMS. Check:
- Supabase logs: `supabase logs`
- Inbucket interface: http://localhost:54324 (if enabled)
- Server console logs

## Testing

To test SMS functionality:

```bash
# Check Supabase status
supabase status

# View logs
supabase logs

# Test SMS sending via API
curl -X POST http://127.0.0.1:54321/auth/v1/otp \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"phone": "+447984596545"}'
```

