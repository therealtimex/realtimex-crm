# Welcome Email Template Setup

## Overview

When admins create new users, the system automatically sends a welcome email with instructions on how to log in using OTP authentication.

## Supabase Email Template Configuration

### Step 1: Access Email Templates

1. Go to **Supabase Dashboard**
2. Select your project
3. Navigate to **Authentication** → **Email Templates**
4. Find **"Invite user"** template (NOT "Confirm signup")

**Important:** Make sure you're editing the **"Invite user"** template, not "Confirm signup".

### Step 2: Update the "Invite User" Template

Replace the entire template with the following:

```html
<h2>Welcome to RealTimeX CRM</h2>

<p>Hi there,</p>

<p>Your account has been created in RealTimeX CRM! We're excited to have you on board.</p>

<h3>How to Access Your Account</h3>

<p>Follow these simple steps to log in:</p>

<ol style="line-height: 1.8;">
  <li>Open the RealTimeX CRM application</li>
  <li>Click <strong>"Login with email code (OTP)"</strong></li>
  <li>Enter your email address: <strong>{{ .Email }}</strong></li>
  <li>Check your email for a 6-digit verification code</li>
  <li>Enter the code in the application</li>
  <li>Set your password when prompted (first login only)</li>
</ol>

<h3>Why OTP Login?</h3>

<p>We use One-Time Password (OTP) authentication for enhanced security and convenience. Each time you log in, you'll receive a unique 6-digit code that expires after 60 minutes.</p>

<h3>Future Logins</h3>

<p>After your first login, you can choose to:</p>
<ul>
  <li>Continue using OTP login (recommended for security)</li>
  <li>Use your email and password</li>
</ul>

<h3>Need Help?</h3>

<p>If you have any questions or need assistance, please contact your administrator.</p>

<p style="color: #666; font-size: 12px; margin-top: 30px;">
If you didn't expect this email, please contact your administrator immediately.
</p>
```

### Step 3: Save the Template

Click **Save** to apply the changes.

### Step 4: Test the Email

1. Create a test user in the CRM
2. Check the email inbox
3. Verify the welcome email is received with correct instructions

## Email Template Variables

The template uses these Supabase variables:

| Variable | Description | Example |
|----------|-------------|---------|
| `{{ .Email }}` | User's email address | `user@example.com` |
| `{{ .SiteURL }}` | Your application URL | `https://yourapp.com` |
| `{{ .ConfirmationURL }}` | **Do NOT use** - This is a magic link we're avoiding |
| `{{ .Token }}` | **Do NOT use** - This is for OTP emails, not invites |

**Important:** Do NOT include `{{ .ConfirmationURL }}` or `{{ .Token }}` in this template. We want users to request their own OTP via the app, not receive one in the invite email.

## Custom Styling (Optional)

You can customize the email design to match your brand:

### Example with Company Branding

```html
<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background-color: #0066cc;
      color: white;
      padding: 20px;
      border-radius: 8px 8px 0 0;
      text-align: center;
    }
    .content {
      background-color: #f9f9f9;
      padding: 30px;
      border-radius: 0 0 8px 8px;
    }
    .steps {
      background-color: white;
      padding: 20px;
      border-radius: 8px;
      margin: 20px 0;
    }
    .cta-button {
      display: inline-block;
      background-color: #0066cc;
      color: white;
      padding: 12px 24px;
      text-decoration: none;
      border-radius: 4px;
      margin: 20px 0;
    }
    .footer {
      text-align: center;
      color: #666;
      font-size: 12px;
      margin-top: 30px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Welcome to RealTimeX CRM</h1>
  </div>
  <div class="content">
    <p>Hi there,</p>

    <p>Your account has been created! Here's how to get started:</p>

    <div class="steps">
      <h3>Login Steps:</h3>
      <ol>
        <li>Open the RealTimeX CRM application</li>
        <li>Click "Login with email code (OTP)"</li>
        <li>Enter your email: <strong>{{ .Email }}</strong></li>
        <li>Check your email for a 6-digit code</li>
        <li>Enter the code to log in</li>
        <li>Set your password (first login only)</li>
      </ol>
    </div>

    <p><strong>Security Note:</strong> We use One-Time Passwords (OTP) for enhanced security. Each code expires after 60 minutes.</p>

    <div class="footer">
      <p>Questions? Contact your administrator.</p>
      <p>If you didn't expect this email, please contact us immediately.</p>
    </div>
  </div>
</body>
</html>
```

## Email Delivery Testing

### Test Checklist

After configuring the template:

- [ ] Create a test user
- [ ] Check email arrives within 1-2 minutes
- [ ] Verify email content is correct
- [ ] Verify `{{ .Email }}` variable is populated
- [ ] Check email is not in spam folder
- [ ] Test OTP login flow works as described

### Common Issues

**Email not received:**
- Check SMTP settings in Supabase
- Verify email provider (use custom SMTP for production)
- Check spam/junk folder
- Look at Supabase auth logs for errors

**Wrong email content:**
- Make sure you saved the template
- Wait 1-2 minutes for changes to propagate
- Clear browser cache and retry

**Variables not populated:**
- Ensure you're using exact syntax: `{{ .Email }}`
- Check for typos in variable names

## Production Recommendations

### 1. Custom SMTP Configuration

For better email deliverability in production:

1. Go to **Authentication** → **Settings** → **SMTP Settings**
2. Configure custom email provider:
   - **SendGrid** (recommended)
   - **Mailgun**
   - **AWS SES**
   - **Postmark**

### 2. Email Design Best Practices

- Keep design simple and responsive
- Test on multiple email clients (Gmail, Outlook, Apple Mail)
- Include clear call-to-action
- Add company logo and branding
- Include contact information

### 3. Compliance

Ensure your email includes:
- Clear sender identification
- Unsubscribe option (if applicable)
- Privacy policy link (if applicable)
- Company contact information

## Flow Diagram

```
Admin creates user in CRM
         ↓
Edge function creates user in Supabase
         ↓
Supabase sends "Invite User" email
         ↓
User receives welcome email with instructions
         ↓
User opens app → Clicks "Login with OTP"
         ↓
User enters email → Receives OTP code
         ↓
User enters OTP → Logs in
         ↓
First login → Sets password
```

## Alternative: Custom Email Service

If you prefer more control over emails, you can replace `inviteUserByEmail()` with a custom email service:

**Example with SendGrid:**

```typescript
// In supabase/functions/users/index.ts

import { SendGrid } from 'sendgrid';

// After user creation:
await sendWelcomeEmail({
  to: email,
  name: first_name,
  template: 'welcome-template-id',
  data: {
    email: email,
    firstName: first_name,
  }
});
```

**Benefits:**
- More control over email design
- Better analytics and tracking
- A/B testing capabilities
- Advanced features (attachments, etc.)

**Drawbacks:**
- Requires external service setup
- Additional cost
- More complex configuration

For most use cases, the Supabase email template is sufficient.

## Summary

**What happens now:**
1. Admin creates user → Automatic welcome email sent
2. Email contains clear OTP login instructions
3. User follows steps to log in
4. No manual notification needed ✅

**Key points:**
- Email contains instructions, not an OTP code
- No magic links (avoids localhost issues)
- Fully automated workflow
- User-friendly and secure
