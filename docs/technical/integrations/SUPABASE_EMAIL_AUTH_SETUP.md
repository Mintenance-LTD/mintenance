# Supabase Email Authentication Setup Guide

## Overview

Your app is already configured to use Supabase Auth for email verification. This guide will help you complete the setup so email authentication works properly.

## Current Setup Status

✅ **Already Configured:**
- Supabase Auth is enabled (`enable_signup = true`)
- Email confirmations are required (`enable_confirmations = true`)
- Email verification callback handler exists (`/auth/callback`)
- Resend verification endpoint is working

⚠️ **Needs Configuration:**
- SMTP settings for sending actual emails (currently using Inbucket for local dev)

## Step-by-Step Setup

### Step 1: Local Development (Using Inbucket)

For local development, Supabase automatically uses **Inbucket** to capture emails. No additional setup needed!

1. **Start Supabase locally:**
   ```bash
   supabase start
   ```

2. **Check Inbucket:**
   - Emails are captured at: `http://localhost:54324`
   - When you click "Resend Email Verification", check Inbucket for the email

3. **Test the flow:**
   - Register a new user
   - Check Inbucket for verification email
   - Click the verification link
   - You'll be redirected to `/auth/callback` which verifies your email

### Step 2: Production Setup (Configure SMTP)

For production, you need to configure SMTP so emails are actually sent to users.

#### Option A: Using Resend (Recommended)

1. **Get Resend API Key:**
   - Sign up at [https://resend.com](https://resend.com)
   - Create an API key (starts with `re_`)
   - Verify your domain (for production)

2. **Add to Environment Variables:**
   ```bash
   # In your .env.local or production environment
   RESEND_API_KEY=re_your_api_key_here
   EMAIL_FROM=noreply@yourdomain.com
   EMAIL_FROM_NAME=Mintenance
   ```

3. **Configure Supabase Cloud SMTP:**
   - Go to your Supabase project dashboard
   - Navigate to **Settings** → **Auth** → **SMTP Settings**
   - Configure:
     - **Host**: `smtp.resend.com`
     - **Port**: `465` (SSL/TLS) or `587` (STARTTLS) - both work
     - **Username**: `resend`
     - **Password**: Your Resend API key (`re_...`)
     - **Sender email**: Your verified domain email (e.g., `noreply@mintenance.co.uk`)
     - **Sender name**: `Mintenance`
   - Click **Save**

#### Option B: Using SendGrid

1. **Get SendGrid API Key:**
   - Sign up at [https://sendgrid.com](https://sendgrid.com)
   - Create an API key with "Mail Send" permissions

2. **Add to Environment Variables:**
   ```bash
   SENDGRID_API_KEY=SG.your_api_key_here
   EMAIL_FROM=noreply@yourdomain.com
   EMAIL_FROM_NAME=Mintenance
   ```

3. **Configure Supabase Cloud SMTP:**
   - Go to **Settings** → **Auth** → **SMTP Settings**
   - Configure:
     - **Host**: `smtp.sendgrid.net`
     - **Port**: `587`
     - **Username**: `apikey`
     - **Password**: Your SendGrid API key
     - **Sender email**: Your verified email
     - **Sender name**: `Mintenance`

### Step 3: Verify Environment Variables

Make sure these are set in your `.env.local` (local) or production environment:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321  # Local
# OR
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co  # Production

SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# App URL (for email redirect links)
NEXT_PUBLIC_APP_URL=http://localhost:3000  # Local
# OR
NEXT_PUBLIC_APP_URL=https://yourdomain.com  # Production

# Email Service (Optional - for custom emails, not Auth emails)
RESEND_API_KEY=re_your_key_here  # Optional
EMAIL_FROM=noreply@yourdomain.com
EMAIL_FROM_NAME=Mintenance
```

### Step 4: Test Email Authentication

#### Test Registration Flow:

1. **Register a new user:**
   - Go to `/register`
   - Fill in the form and submit
   - You should see a success message

2. **Check for verification email:**
   - **Local**: Check `http://localhost:54324` (Inbucket)
   - **Production**: Check your actual email inbox

3. **Click verification link:**
   - The link should redirect to `/auth/callback?type=signup&token=...`
   - You'll be redirected to `/login` with a success message
   - Your email is now verified!

4. **Try to log in:**
   - Go to `/login`
   - Enter your credentials
   - You should be able to log in successfully

#### Test Resend Verification:

1. **If email not received:**
   - Go to a page that requires verification (e.g., `/jobs/create`)
   - Click "Resend Email Verification"
   - Check Inbucket (local) or your inbox (production)

### Step 5: Verify Configuration

Check that everything is working:

1. **Check Supabase Auth Settings:**
   - Go to Supabase Dashboard → **Authentication** → **Settings**
   - Verify:
     - ✅ "Enable email signup" is ON
     - ✅ "Confirm email" is ON
     - ✅ SMTP is configured (production only)

2. **Check Email Templates:**
   - Go to **Authentication** → **Email Templates**
   - Verify the "Confirm signup" template looks correct
   - The redirect URL should be: `{{ .SiteURL }}/auth/callback`

3. **Test the callback:**
   - Visit: `http://localhost:3000/auth/callback?type=signup&token=test`
   - You should see an error (expected - invalid token)
   - This confirms the route is working

## Troubleshooting

### Issue: Emails not being sent

**Local Development:**
- ✅ Check Inbucket at `http://localhost:54324`
- ✅ Make sure Supabase is running: `supabase status`
- ✅ Restart Supabase: `supabase stop && supabase start`

**Production:**
- ❌ Check SMTP settings in Supabase Dashboard
- ❌ Verify your API key is correct
- ❌ Check email service logs (Resend/SendGrid dashboard)
- ❌ Verify domain is verified (for Resend)

### Issue: Verification link not working

1. **Check the redirect URL:**
   - Should be: `{{ .SiteURL }}/auth/callback`
   - `{{ .SiteURL }}` is automatically replaced by Supabase

2. **Check environment variables:**
   - `NEXT_PUBLIC_APP_URL` must be set correctly
   - For local: `http://localhost:3000`
   - For production: `https://yourdomain.com`

3. **Check the callback route:**
   - File: `apps/web/app/auth/callback/route.ts`
   - Should handle `type=signup` and `token` parameters

### Issue: "Email already verified" but still can't log in

1. **Check database:**
   ```sql
   SELECT id, email, email_verified FROM users WHERE email = 'your@email.com';
   ```

2. **Manually verify in Supabase:**
   - Go to Supabase Dashboard → **Authentication** → **Users**
   - Find your user
   - Click "Confirm Email" button

### Issue: Users not appearing in Supabase Auth dashboard

If you're using the old custom auth system, users won't appear. The app should be using Supabase Auth (which it is in `auth-manager.ts`). Check:

1. **Verify registration uses Supabase Auth:**
   - Check `apps/web/lib/auth-manager.ts`
   - Should call `serverSupabase.auth.signUp()`

2. **Check database trigger:**
   - There should be a trigger that syncs `auth.users` → `public.users`
   - Check Supabase SQL Editor for `handle_new_user` trigger

## Quick Reference

### Local Development URLs:
- **App**: `http://localhost:3000`
- **Supabase Studio**: `http://localhost:54323`
- **Inbucket (Emails)**: `http://localhost:54324`
- **Supabase API**: `http://127.0.0.1:54321`

### Production URLs:
- **App**: Your production domain
- **Supabase Dashboard**: `https://app.supabase.com`
- **Emails**: Actual email inbox

### Key Files:
- **Auth Manager**: `apps/web/lib/auth-manager.ts`
- **Registration API**: `apps/web/app/api/auth/register/route.ts`
- **Email Callback**: `apps/web/app/auth/callback/route.ts`
- **Resend Verification**: `apps/web/app/api/auth/resend-verification/route.ts`
- **Supabase Config**: `supabase/config.toml`

## Next Steps

1. ✅ Set up SMTP for production (Resend or SendGrid)
2. ✅ Test registration flow end-to-end
3. ✅ Test email verification
4. ✅ Test resend verification
5. ✅ Verify users appear in Supabase Auth dashboard

## Need Help?

- **Supabase Auth Docs**: https://supabase.com/docs/guides/auth
- **Resend Docs**: https://resend.com/docs
- **SendGrid Docs**: https://docs.sendgrid.com

