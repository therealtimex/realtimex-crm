# User Invite Flow with OTP Authentication

## Overview

The user invite flow has been updated to use **OTP-only authentication**, eliminating magic links that require `localhost` redirects.

## New User Invite Flow

### Step 1: Admin Creates User

**In CRM:** Sales → Users → Create New User

**What happens:**
- User account is created in `auth.users`
- User record is created in `sales` table
- `email_confirm` is set to `true` (no email confirmation needed)
- **No invite email is sent** (changed from previous behavior)

### Step 2: Admin Notifies User

Admin should manually notify the user (via email, Slack, etc.):

**Sample message:**
```
Subject: Your RealTimeX CRM Account

Hi [Name],

An account has been created for you in RealTimeX CRM.

To get started:
1. Open the RealTimeX CRM application
2. Click "Login with email code (OTP)"
3. Enter your email: [user@example.com]
4. Check your email for a 6-digit code
5. Enter the code to log in
6. Set your password when prompted

If you have questions, please contact [admin contact].
```

### Step 3: User Logs In with OTP

**User actions:**
1. Opens app
2. Clicks **"Login with email code (OTP)"**
3. Enters email address
4. Receives 6-digit OTP code via email
5. Enters code in app
6. Logs in successfully

### Step 4: First Login - Set Password

**Automatic redirect:**
- System detects first login (no `email_confirmed_at`)
- Redirects to `/change-password`
- User sets their password
- Can use email/password login in future

## Comparison: Old vs New Flow

| Step | Old Flow (Magic Links) | New Flow (OTP) |
|------|----------------------|----------------|
| Admin creates user | ✅ Creates account | ✅ Creates account |
| Email sent | ✅ Magic link invite | ❌ No email (manual notification) |
| User clicks link | ✅ Opens browser, redirects | ❌ N/A |
| User sets password | ✅ Via link redirect | ✅ After OTP login |
| Localhost required | ⚠️ Yes (fails in CLI/local apps) | ✅ No |

## Resend Invite Function

**Old behavior:** Sent magic link email

**New behavior:** Returns success but doesn't send email

**Reason:** Users should just use OTP login - no invite email needed

**If user needs help:**
- Admin can click "Resend Invite" (won't send email)
- Admin should manually send instructions again
- User uses OTP login flow

## Password Reset

**Old behavior:** Admin clicks "Reset Password" → User gets magic link

**New behavior:** User uses "Forgot Password?" page
1. User clicks "Forgot Password?" on login page
2. Enters email
3. Receives OTP code
4. Enters code
5. Sets new password

Admin doesn't need to trigger password reset - users do it themselves.

## Benefits

✅ **No localhost dependency** - Works in CLI/desktop apps
✅ **Simpler flow** - No email confirmation needed
✅ **User control** - Users reset their own passwords
✅ **Consistent** - Same OTP flow for login and password reset
✅ **Secure** - OTP codes expire in 60 minutes

## Edge Cases

### User Never Received OTP Code

**Check:**
1. Email in spam folder
2. Supabase email settings (SMTP configured?)
3. User entered correct email

**Solution:**
- User requests new code (clicks "Resend code")
- Admin verifies email is correct in system

### User Lost Access to Email

**Admin action:**
1. Update user's email in CRM
2. Notify user of new email
3. User uses OTP login with new email

### User Already Set Password but Forgot It

**User action:**
1. Use "Forgot Password?" page
2. Enter email → Get OTP code
3. Reset password

## Future Enhancements

### Optional: Automated Welcome Email

If you want to send automated welcome emails:

1. Create custom email template
2. Use third-party email service (SendGrid, Mailgun)
3. Trigger after user creation in `inviteUser()` function

**Example:**
```typescript
// In supabase/functions/users/index.ts after user creation:
await sendWelcomeEmail({
  to: email,
  name: first_name,
  subject: 'Welcome to RealTimeX CRM',
  body: `
    Hi ${first_name},

    Your account has been created. To log in:
    1. Open the app
    2. Click "Login with email code (OTP)"
    3. Enter your email: ${email}
    4. Use the 6-digit code sent to your email
  `
});
```

### Optional: Self-Service Signup

To allow anyone to sign up without admin approval:

**Change in `src/components/supabase/otp-login-page.tsx`:**
```typescript
shouldCreateUser: true, // Allow new users to sign up
```

**Security note:** This makes signup public. Consider:
- Email domain restrictions
- Admin approval workflow
- Rate limiting

## Migration Guide

If you have existing users with magic link invites:

1. **Users who haven't clicked their invite link:**
   - They can ignore the old email
   - Use OTP login instead

2. **Users who already set password via link:**
   - Can continue using email/password login
   - Or switch to OTP login

3. **Admins:**
   - Update user notification process
   - Use manual email instead of "Resend Invite" button

## Summary

**Key change:** User invites no longer send automatic emails with magic links.

**New process:**
1. Admin creates user
2. Admin manually notifies user
3. User uses OTP login
4. User sets password on first login

**Why:** Eliminates localhost redirect requirement for local/CLI apps.
