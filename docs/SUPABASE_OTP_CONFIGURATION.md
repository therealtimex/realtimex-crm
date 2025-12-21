# Supabase OTP Configuration Guide

## Problem: Receiving Magic Links Instead of OTP Codes

If you're receiving magic links (URLs) in emails instead of 6-digit codes, follow these steps carefully.

## Solution 1: Enable Email OTP (Recommended)

### Step 1: Enable Email OTP Provider

1. Go to **Supabase Dashboard** → Select your project
2. Navigate to **Authentication** → **Providers**
3. Find the **Email** provider in the list
4. Click to expand settings
5. Look for **"Enable Email OTP"** checkbox
6. ✅ **Check this box** to enable Email OTP
7. Click **Save**

### Step 2: Update Email OTP Template

1. Go to **Authentication** → **Email Templates**
2. Find **"Email OTP"** template (may also be labeled "OTP" or "One-Time Password")
3. Click to edit
4. Replace the entire template with:

```html
<h2>Login to RealTimeX CRM</h2>

<p>Here is your login code:</p>

<h1 style="font-size: 32px; font-weight: bold; text-align: center; letter-spacing: 8px; padding: 20px; background-color: #f0f0f0; border-radius: 8px;">{{ .Token }}</h1>

<p>Enter this code in the application window to continue.</p>

<p style="color: #666; font-size: 12px;">This code will expire in 60 minutes.</p>
<p style="color: #666; font-size: 12px;">If you didn't request this code, you can safely ignore this email.</p>
```

5. Click **Save**

### Step 3: Test

1. Open app → "Login with email code (OTP)"
2. Enter email
3. Check inbox - should receive **6-digit code** (e.g., `123456`)

## Solution 2: If "Email OTP" Template Doesn't Exist

Some Supabase projects may not have a separate Email OTP template. In this case:

### Update the Magic Link Template

1. Go to **Authentication** → **Email Templates**
2. Select **"Magic Link"** template
3. **Important:** This template needs to support BOTH magic links and OTP codes
4. Replace with this dual-purpose template:

```html
<h2>Login to RealTimeX CRM</h2>

{{#if .Token}}
<!-- OTP Flow -->
<p>Here is your login code:</p>

<h1 style="font-size: 32px; font-weight: bold; text-align: center; letter-spacing: 8px; padding: 20px; background-color: #f0f0f0; border-radius: 8px;">{{ .Token }}</h1>

<p>Enter this code in the application window to continue.</p>

<p style="color: #666; font-size: 12px;">This code will expire in 60 minutes.</p>
{{else}}
<!-- Magic Link Flow (Fallback) -->
<p>Click the link below to sign in:</p>
<p><a href="{{ .ConfirmationURL }}">Sign In</a></p>
{{/if}}

<p style="color: #666; font-size: 12px;">If you didn't request this, you can safely ignore this email.</p>
```

This template will:
- Show the 6-digit code when `{{ .Token }}` is available (OTP flow)
- Show the magic link when `{{ .ConfirmationURL }}` is available (fallback)

## Solution 3: Debugging - Check What Supabase is Sending

### Test the API Response

To see what Supabase is actually doing, you can add temporary logging:

1. Open: `src/components/supabase/otp-login-page.tsx`
2. Find the `submitEmail` function (around line 30)
3. Temporarily add logging after the OTP call:

```typescript
const { data, error } = await supabase.auth.signInWithOtp({
  email: values.email,
  options: {
    shouldCreateUser: false,
  },
});

// Add these lines to debug:
console.log('OTP Response:', { data, error });
console.log('Check your email for the OTP code');

if (error) {
  throw error;
}
```

4. Open browser DevTools Console
5. Try logging in with OTP
6. Check the console output - it should confirm if Supabase sent the OTP

### Check Supabase Logs

1. Go to **Supabase Dashboard** → **Logs** → **Auth**
2. Look for recent `signInWithOtp` requests
3. Check if they succeeded and what type of email was sent

## Common Issues

### Issue 1: Email Template Variable Not Working

**Symptom:** Email shows literal `{{ .Token }}` text instead of the code

**Solution:**
- Make sure you're editing the correct template (Email OTP, not Recovery or Invite)
- Check template syntax - use exactly `{{ .Token }}` (with spaces)
- Save the template and wait a few seconds for changes to propagate

### Issue 2: No "Email OTP" Template Available

**Symptom:** Only see "Magic Link", "Confirm signup", "Invite user", "Reset password" templates

**Solution:**
- Your Supabase project may need Email OTP enabled first (see Solution 1, Step 1)
- After enabling, the Email OTP template should appear
- If still not available, use Solution 2 (dual-purpose template)

### Issue 3: Still Receiving Links After Template Update

**Symptom:** Updated template but still getting magic links

**Possible Causes:**
1. **Wrong template updated** - Make sure you updated "Email OTP" not "Magic Link"
2. **Template not saved** - Click Save button after editing
3. **Cache issue** - Wait 1-2 minutes for Supabase to propagate changes
4. **Email OTP not enabled** - Check Solution 1, Step 1

**Try:**
- Clear browser cache
- Wait a few minutes and try again
- Double-check the Email provider has "Enable Email OTP" checked
- Try using an incognito/private browser window

## Verification Checklist

Before testing, ensure:

- [ ] Email OTP is enabled in Authentication → Providers → Email
- [ ] Email OTP template exists and is updated with `{{ .Token }}`
- [ ] Template changes are saved
- [ ] Waited 1-2 minutes for changes to propagate
- [ ] Using the `/otp-login` route in the app (not regular login)

## Expected Behavior

### Correct OTP Email:
```
Subject: Login to RealTimeX CRM

Here is your login code:

  1  2  3  4  5  6

Enter this code in the application window to continue.

This code will expire in 60 minutes.
```

### Incorrect (Magic Link) Email:
```
Subject: Magic Link

Click the link below to sign in:

https://yourproject.supabase.co/auth/v1/verify?token=...
```

## Alternative: Temporarily Disable Email Confirmation

If OTP emails are still not working, you can temporarily test with email confirmation disabled:

1. Go to **Authentication** → **Settings**
2. Find **"Confirm email"** option
3. Temporarily disable it
4. Test OTP login - should still send codes
5. Re-enable after testing

## Need More Help?

If you're still having issues:

1. **Check Supabase Status:** https://status.supabase.com/
2. **Supabase Discord:** Ask in #help-auth channel
3. **Check Auth Logs:** Dashboard → Logs → Auth (filter for errors)
4. **Verify SMTP:** Dashboard → Settings → SMTP (ensure email delivery is working)

## Reference Links

- [Supabase Email OTP Documentation](https://supabase.com/docs/guides/auth/auth-email-otp)
- [Supabase Email Templates](https://supabase.com/docs/guides/auth/auth-email-templates)
- [Supabase Auth Configuration](https://supabase.com/docs/guides/auth/auth-smtp)
