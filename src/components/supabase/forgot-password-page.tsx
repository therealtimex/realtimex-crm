import { useState } from "react";
import { Form, required, useNotify, useTranslate } from "ra-core";
import { Layout } from "@/components/supabase/layout";
import type { FieldValues, SubmitHandler } from "react-hook-form";
import { TextInput } from "@/components/admin/text-input";
import { Button } from "@/components/ui/button";
import { OtpInput } from "@/components/supabase/otp-input";
import { supabase } from "@/components/atomic-crm/providers/supabase/supabase";
import { Link } from "react-router";

interface EmailFormData {
  email: string;
}

type Step = 'email' | 'otp';

export const ForgotPasswordPage = () => {
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState(false);

  const notify = useNotify();
  const translate = useTranslate();

  const submitEmail = async (values: EmailFormData) => {
    try {
      setLoading(true);
      // Normalize email to lowercase
      const normalizedEmail = values.email.trim().toLowerCase();
      setEmail(normalizedEmail);

      const { error } = await supabase.auth.signInWithOtp({
        email: normalizedEmail,
        options: {
          shouldCreateUser: false, // Only allow existing users to reset password
        },
      });

      if (error) {
        throw error;
      }

      notify('A 6-digit code has been sent to your email', { type: 'success' });
      setStep('otp');
    } catch (error: any) {
      notify(
        typeof error === "string"
          ? error
          : typeof error === "undefined" || !error.message
            ? "ra.auth.sign_in_error"
            : error.message,
        {
          type: "warning",
          messageArgs: {
            _:
              typeof error === "string"
                ? error
                : error && error.message
                  ? error.message
                  : undefined,
          },
        },
      );
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async (otpCode: string) => {
    try {
      setLoading(true);
      setOtpError(false);

      // Trim whitespace from OTP code
      const cleanOtp = otpCode.trim();

      console.log('Verifying OTP (forgot password):', { email, token: cleanOtp, type: 'email' });

      const { data, error } = await supabase.auth.verifyOtp({
        email: email.trim().toLowerCase(), // Normalize email
        token: cleanOtp,
        type: 'magiclink', // Changed from 'email' - some Supabase versions treat OTP as magiclink
      });

      console.log('OTP Verification result:', { data, error });

      if (error) {
        throw error;
      }

      if (!data.session) {
        throw new Error('Failed to create session');
      }

      console.log('Session created successfully for password reset');

      // User is now logged in, redirect to change password page
      notify('Code verified! Please set your new password.', { type: 'success' });

      // IMPORTANT: Don't call login() - user is already authenticated via Supabase
      // The OTP verification already set the session
      // Calling login({}) with empty params could cause session confusion

      // Navigate to change password page with reload
      console.log('Navigating to /change-password');
      window.location.href = '#/change-password';
      window.location.reload();
    } catch (error: any) {
      setOtpError(true);
      notify(
        typeof error === "string"
          ? error
          : typeof error === "undefined" || !error.message
            ? "Invalid or expired code"
            : error.message,
        {
          type: "warning",
          messageArgs: {
            _:
              typeof error === "string"
                ? error
                : error && error.message
                  ? error.message
                  : undefined,
          },
        },
      );
    } finally {
      setLoading(false);
    }
  };

  const handleOtpComplete = (otpCode: string) => {
    verifyOtp(otpCode);
  };

  const handleResendCode = async () => {
    setOtp('');
    setOtpError(false);
    await submitEmail({ email });
  };

  return (
    <Layout>
      {step === 'email' ? (
        <>
          <div className="flex flex-col space-y-2 text-center">
            <h1 className="text-2xl font-semibold tracking-tight">
              {translate("ra-supabase.reset_password.forgot_password", {
                _: "Forgot password?",
              })}
            </h1>
            <p>
              {translate("ra-supabase.reset_password.forgot_password_details", {
                _: "Enter your email to receive a 6-digit code.",
              })}
            </p>
          </div>
          <Form<EmailFormData>
            className="space-y-8"
            onSubmit={submitEmail as SubmitHandler<FieldValues>}
          >
            <TextInput
              source="email"
              label={translate("ra.auth.email", {
                _: "Email",
              })}
              autoComplete="email"
              validate={required()}
            />
            <Button type="submit" className="cursor-pointer w-full" disabled={loading}>
              {translate("ra.action.reset_password", {
                _: "Send code",
              })}
            </Button>
          </Form>
          <div className="text-center">
            <Link
              to="/"
              className="text-sm text-muted-foreground hover:text-primary underline-offset-4 hover:underline"
            >
              Back to login
            </Link>
          </div>
        </>
      ) : (
        <>
          <div className="flex flex-col space-y-2 text-center">
            <h1 className="text-2xl font-semibold tracking-tight">
              Enter verification code
            </h1>
            <p className="text-sm text-muted-foreground">
              We've sent a 6-digit code to {email}
            </p>
          </div>
          <div className="space-y-6">
            <div className="space-y-4">
              <OtpInput
                length={6}
                value={otp}
                onChange={setOtp}
                onComplete={handleOtpComplete}
                disabled={loading}
                error={otpError}
              />
              {otpError && (
                <p className="text-sm text-destructive text-center">
                  Invalid or expired code. Please try again.
                </p>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <Button
                type="button"
                className="cursor-pointer w-full"
                disabled={loading || otp.length !== 6}
                onClick={() => verifyOtp(otp)}
              >
                {loading ? 'Verifying...' : 'Verify code'}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="cursor-pointer w-full"
                disabled={loading}
                onClick={handleResendCode}
              >
                Resend code
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="cursor-pointer w-full"
                disabled={loading}
                onClick={() => {
                  setStep('email');
                  setOtp('');
                  setOtpError(false);
                }}
              >
                ← Back to email
              </Button>
            </div>
          </div>
          <div className="text-center">
            <Link
              to="/"
              className="text-sm text-muted-foreground hover:text-primary underline-offset-4 hover:underline"
            >
              Back to login
            </Link>
          </div>
        </>
      )}
    </Layout>
  );
};

ForgotPasswordPage.path = "forgot-password";
