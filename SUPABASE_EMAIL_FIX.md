# 📧 Supabase Email Confirmation Fix

## Problem
Email confirmation links redirect to `localhost` which causes "This site can't be reached" errors.

## Solution Overview
Configure proper redirect URLs in Supabase and set up deep linking in your React Native app.

---

## 🔧 Step 1: Configure Supabase Dashboard

### Go to Supabase Dashboard → Authentication → URL Configuration

**Site URL:**
```
mintenance://auth/callback
```

**Redirect URLs (Add all of these):**
```
mintenance://auth/callback
mintenance://auth/confirmed  
mintenance://auth/confirm
http://localhost:3000/auth/confirm
https://mintenance-app.netlify.app/auth/confirm
```

### Email Templates
Go to **Authentication → Email Templates** and update:

**Confirm signup template:**
```html
<h2>Confirm your signup</h2>
<p>Follow this link to confirm your user:</p>
<p><a href="{{ .ConfirmationURL }}">Confirm your mail</a></p>
```

**Confirmation URL should be:**
```
{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup
```

---

## 🔧 Step 2: Update App Configuration (Already Done)

✅ Added `scheme: "mintenance"` to `app.config.js`

---

## 🔧 Step 3: Handle Deep Links in Your App

### Update AuthService.ts to handle email confirmation:

```typescript
// Add this method to your AuthService class
static async handleEmailConfirmation(url: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: this.extractTokenFromUrl(url),
      type: 'signup'
    });
    
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Email confirmation failed:', error);
    return false;
  }
}

private static extractTokenFromUrl(url: string): string {
  const urlParams = new URLSearchParams(url.split('?')[1]);
  return urlParams.get('token_hash') || '';
}
```

### Add deep link handling to App.tsx:

```typescript
import * as Linking from 'expo-linking';

// In your App component
useEffect(() => {
  const handleDeepLink = (url: string) => {
    if (url.includes('auth/confirm')) {
      AuthService.handleEmailConfirmation(url)
        .then(success => {
          if (success) {
            // Navigate to success screen
            console.log('Email confirmed successfully');
          }
        });
    }
  };

  // Handle app launch from link
  Linking.getInitialURL().then(url => {
    if (url) handleDeepLink(url);
  });

  // Handle links while app is running
  const subscription = Linking.addEventListener('url', ({ url }) => {
    handleDeepLink(url);
  });

  return () => subscription?.remove();
}, []);
```

---

## 🔧 Step 4: Alternative Web Fallback (Recommended)

### Host the auth-confirm.html file:

**Option 1: Use Netlify (Free)**
1. Create account at [netlify.com](https://netlify.com)
2. Drag and drop the `auth-confirm.html` file
3. Get your URL (e.g., `https://your-site.netlify.app`)
4. Update Supabase Site URL to: `https://your-site.netlify.app/auth-confirm.html`

**Option 2: Use GitHub Pages**
1. Create GitHub repo
2. Upload `auth-confirm.html` as `index.html`  
3. Enable GitHub Pages
4. Use that URL in Supabase

---

## 🔧 Step 5: Update Supabase Settings (Final Config)

### In Supabase Dashboard → Authentication → URL Configuration:

**Site URL:**
```
https://your-deployed-site.netlify.app/auth-confirm.html
```

**Redirect URLs:**
```
https://your-deployed-site.netlify.app/auth-confirm.html
mintenance://auth/confirmed
mintenance://auth/callback
http://localhost:3000/auth/confirm
```

---

## 🧪 Testing the Fix

### Test Email Confirmation:
1. Register a new user in your app
2. Check email for confirmation link
3. Click the link - should show success page
4. App should open automatically or via button
5. User should be able to sign in

### Verification Commands:
```bash
# Test authentication
node test-auth.js

# Check if deep linking works
npx uri-scheme open mintenance://auth/confirmed --ios
npx uri-scheme open mintenance://auth/confirmed --android
```

---

## 🔧 Alternative: Disable Email Confirmation (Quick Fix)

If you want to skip email confirmation for development:

### In Supabase Dashboard → Authentication → Settings:

1. **Disable "Enable email confirmations"**
2. Users can sign in immediately after signup
3. **⚠️ Re-enable for production!**

---

## 📱 Expected User Flow

1. **User signs up** → Receives confirmation email
2. **Clicks email link** → Opens web confirmation page
3. **Success page shows** → "Email confirmed" with app link
4. **Clicks "Open App"** → App opens via deep link
5. **User signs in** → Successfully authenticated

---

## 🚨 Common Issues & Solutions

**Issue: "This site can't be reached"**
- ✅ Fixed by proper URL configuration above

**Issue: Deep link doesn't work**
- Check app scheme is correct: `mintenance://`
- Test with: `npx uri-scheme list`

**Issue: Still redirecting to localhost**
- Clear Supabase cache in dashboard
- Wait 5 minutes for DNS propagation
- Check all redirect URLs are updated

**Issue: Email not sending**
- Check Supabase email settings
- Verify email templates are correct
- Check spam folder

---

## 🎯 Next Steps

1. ✅ Run the `supabase-fix.sql` script
2. 🔄 Configure Supabase Dashboard URLs  
3. 🔄 Deploy `auth-confirm.html` to web
4. 🔄 Update Site URL in Supabase
5. 🔄 Test email confirmation flow

Once completed, your email confirmation will work properly and users can successfully verify their accounts!