# Email OTP Authentication Setup Guide

This guide explains how to configure Supabase email templates to work with the Email OTP (One-Time Password) authentication system in RealTimeX CRM.

## Overview

The OTP authentication system eliminates the need for `localhost` links in emails by using 6-digit codes instead. This is ideal for local-first/CLI applications where users may not have a browser accessible at `localhost`.

## Authentication Flows

### 1. Password Reset Flow

**User Experience:**
1. User clicks "Forgot Password?" in the app
2. User enters their email address
3. User receives a 6-digit code via email
4. User enters the code in the app
5. User is logged in and redirected to change password page
6. User sets a new password

**Technical Flow:**
```javascript
// Step 1: Request OTP
const { error } = await supabase.auth.signInWithOtp({
  email: 'user@example.com',
  options: {
    shouldCreateUser: false, // Only existing users
  },
})

// Step 2: Verify OTP
const { data, error } = await supabase.auth.verifyOtp({
  email: 'user@example.com',
  token: '123456',
  type: 'email',
})

// Step 3: Update password
const { error } = await supabase.auth.updateUser({
  password: 'new-secure-password'
})
```

### 2. New User Invite Flow

**User Experience:**
1. Admin creates user account in CRM
2. User receives welcome email (optional)
3. User opens the app and clicks "Login with email code (OTP)"
4. User enters their email address
5. User receives a 6-digit code via email
6. User enters the code in the app
7. User is logged in and redirected to set password page
8. User sets their password

**Technical Flow:**
```javascript
// Admin creates user (existing edge function)
// POST /users with { email, first_name, last_name, administrator, disabled }

// User logs in with OTP
const { error } = await supabase.auth.signInWithOtp({
  email: 'newuser@example.com',
  options: {
    shouldCreateUser: false, // User already exists in auth.users
  },
})

// User verifies OTP and sets password (same as password reset)
```

### 3. Regular OTP Login

**User Experience:**
1. User opens the app and clicks "Login with email code (OTP)"
2. User enters their email address
3. User receives a 6-digit code via email
4. User enters the code in the app
5. User is logged in and redirected to dashboard

## Supabase Email Template Configuration

### Accessing Email Templates

1. Go to **Supabase Dashboard**
2. Select your project
3. Navigate to **Authentication** → **Email Templates**

### Required Template Changes

You need to update the following email templates to display the 6-digit OTP code instead of magic links:

#### 1. Magic Link / OTP Template

This template is used for OTP login and password reset flows.

**Default Template (Link-based):**
```html
<h2>Magic Link</h2>
<p>Follow this link to login:</p>
<p><a href="{{ .ConfirmationURL }}">Log In</a></p>
```

**Updated Template (OTP-based):**
```html
<h2>Login to RealTimeX CRM</h2>

<p>Here is your login code:</p>

<h1 style="font-size: 32px; font-weight: bold; text-align: center; letter-spacing: 8px; padding: 20px; background-color: #f0f0f0; border-radius: 8px;">{{ .Token }}</h1>

<p>Enter this code in the application window to continue.</p>

<p style="color: #666; font-size: 12px;">This code will expire in 60 minutes.</p>

<p style="color: #666; font-size: 12px;">If you didn't request this code, you can safely ignore this email.</p>
```

**Template Variables:**
- `{{ .Token }}` - The 6-digit OTP code
- `{{ .Email }}` - User's email address
- `{{ .SiteURL }}` - Your app's URL (optional)

#### 2. Invite User Template (Optional)

If you want to send a welcome email when admins create new users, update this template:

**Recommended Template:**
```html
<h2>Welcome to RealTimeX CRM</h2>

<p>Hello {{ .Email }},</p>

<p>An administrator has created an account for you in RealTimeX CRM.</p>

<p>To get started:</p>
<ol>
  <li>Open the RealTimeX CRM application</li>
  <li>Click "Login with email code (OTP)"</li>
  <li>Enter your email: <strong>{{ .Email }}</strong></li>
  <li>You'll receive a 6-digit code via email</li>
  <li>Enter the code to log in</li>
  <li>Set your password on first login</li>
</ol>

<p>If you have any questions, please contact your administrator.</p>
```

**Note:** The current implementation doesn't send this email automatically. Admins can manually notify users or you can modify the `inviteUser` function in `supabase/functions/users/index.ts` to send a custom email.

#### 3. Confirm Signup Template

For completeness, you may want to update this template as well (used if email confirmation is enabled):

```html
<h2>Confirm Your Email</h2>

<p>Here is your confirmation code:</p>

<h1 style="font-size: 32px; font-weight: bold; text-align: center; letter-spacing: 8px; padding: 20px; background-color: #f0f0f0; border-radius: 8px;">{{ .Token }}</h1>

<p>Enter this code in the application to confirm your email address.</p>
```

### Email Template Best Practices

1. **Make the code prominent:** Use large, bold, monospace font with letter spacing for easy reading
2. **Add context:** Explain what the code is for and how to use it
3. **Include expiration time:** Let users know the code expires (default: 60 minutes)
4. **Security reminder:** Tell users to ignore the email if they didn't request it
5. **Branding:** Add your logo and company colors to match your app

### Testing Email Templates

After updating templates:

1. **Test password reset:**
   - Go to login page → "Forgot Password?"
   - Enter your email
   - Check that you receive an email with a 6-digit code (not a link)

2. **Test OTP login:**
   - Go to login page → "Login with email code (OTP)"
   - Enter your email
   - Check that you receive an email with a 6-digit code

3. **Test new user invite:**
   - As admin, create a new user in the CRM
   - As the new user, use "Login with email code (OTP)"
   - Verify you receive a code and can log in

## Supabase Configuration Settings

### OTP Settings

You can configure OTP behavior in **Supabase Dashboard** → **Authentication** → **Settings**:

1. **OTP Expiration:** Default is 3600 seconds (60 minutes)
2. **OTP Length:** Default is 6 digits (not configurable via UI)
3. **Rate Limiting:** Supabase automatically rate limits OTP requests to prevent abuse

### Email Provider Configuration

For production, configure a custom email provider:

1. Go to **Authentication** → **Settings** → **SMTP Settings**
2. Configure your SMTP server (SendGrid, Mailgun, AWS SES, etc.)
3. This ensures better deliverability than Supabase's default email service

**Recommended Providers:**
- **SendGrid** - Easy setup, generous free tier
- **AWS SES** - Cost-effective for high volume
- **Mailgun** - Good deliverability
- **Postmark** - Excellent for transactional emails

## Security Considerations

### OTP Security

1. **Codes expire after 60 minutes** - Users must request a new code if it expires
2. **Codes are single-use** - Once verified, the code cannot be reused
3. **Rate limiting** - Supabase limits how many OTP requests can be made per email/IP
4. **Secure transmission** - Codes are sent via email (ensure email provider uses TLS)

### Access Control

The OTP login implementation includes access control:

```javascript
// After OTP verification, check if user is in sales table
const { data: saleData, error: saleError } = await supabase
  .from('sales')
  .select('id, email_confirmed_at')
  .eq('user_id', data.user.id)
  .single();

if (saleError || !saleData) {
  // User authenticated but not authorized
  await supabase.auth.signOut();
  throw new Error('You do not have access to this application.');
}
```

This prevents unauthorized users from accessing the CRM even if they verify an OTP.

### First Login Detection

The system detects first-time logins using the `email_confirmed_at` field:

```javascript
if (!saleData.email_confirmed_at) {
  // First login - redirect to set password
  navigate('/change-password');
} else {
  // Regular login - go to dashboard
  navigate('/');
}
```

## Comparison: Links vs. OTP

| Feature | Link-Based Auth | OTP-Based Auth |
|---------|----------------|----------------|
| **Dependency** | Relies on `localhost` port & path | Zero network dependency |
| **User Flow** | User leaves app → Email → Browser → App | User stays in app → Email → Copy code → Paste in app |
| **Browser Issues** | "Connection Refused" if app closed | None |
| **Security** | Standard token | Standard OTP |
| **Offline Setup** | Breaks with network issues | Works (code can be copied manually) |
| **Email Complexity** | Contains URL with tokens | Simple 6-digit code |

## Troubleshooting

### OTP Code Not Received

1. **Check spam folder** - OTP emails may be filtered
2. **Verify email provider** - Check SMTP settings in Supabase
3. **Check rate limits** - Too many requests may be blocked
4. **Verify email template** - Ensure `{{ .Token }}` is present

### Invalid or Expired Code Error

1. **Code expired** - Codes expire after 60 minutes, request a new one
2. **Code already used** - Codes are single-use, request a new one
3. **Wrong code** - Double-check the 6-digit code from email

### User Not Found Error

1. **User doesn't exist** - Admin must create user first via CRM
2. **Email mismatch** - Verify email address is correct
3. **User not in sales table** - Database trigger may have failed

### Access Denied After OTP Verification

1. **User not in sales table** - User exists in auth.users but not in sales
2. **User disabled** - Check user's `disabled` flag in sales table
3. **Database trigger failure** - Check Supabase logs for trigger errors

## Migration from Link-Based to OTP-Based Auth

If you're migrating from the old link-based system:

1. **Update email templates** (as shown above)
2. **Deploy code changes** (already included in this implementation)
3. **Notify users** - Send an email explaining the new login process
4. **Update documentation** - Update any user guides or onboarding materials

**No data migration required** - The new system works with existing user accounts.

## Advanced: Customizing OTP Behavior

### Changing OTP Expiration Time

Currently controlled by Supabase (60 minutes default). To change:

1. Go to **Authentication** → **Settings**
2. Look for "OTP Expiration" (may require Supabase Pro plan)

### Custom OTP Email Logic

To send custom emails (e.g., styled welcome emails), you can:

1. Create a new edge function for sending emails
2. Use a third-party email service (SendGrid, Mailgun)
3. Trigger the email after user creation in `supabase/functions/users/index.ts`

Example:
```typescript
// In supabase/functions/users/index.ts after creating user
await sendWelcomeEmail(email, first_name, last_name);
```

## Support

For issues with OTP authentication:

1. **Check Supabase logs:** Dashboard → Logs → Auth logs
2. **Check browser console:** Look for JavaScript errors
3. **Check email deliverability:** Use an email testing tool
4. **Review this guide:** Ensure all steps were followed

For more information, see:
- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Supabase OTP Documentation](https://supabase.com/docs/guides/auth/auth-email-otp)
- [RealTimeX CRM Documentation](../README.md)
