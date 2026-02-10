import { useState } from "react";
import { Form, required, useLogin, useNotify, useTranslate } from "ra-core";
import type { SubmitHandler, FieldValues } from "react-hook-form";
import { Link as RouterLink } from "react-router";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ds/ui/badge";
import { TextInput } from "@/components/admin/text-input";
import { Notification } from "@/components/admin/notification";
import { useConfigurationContext } from "@/components/atomic-crm/root/ConfigurationContext.tsx";
import { ThemeModeToggle } from "@/components/admin/theme-mode-toggle";
import { LocalesMenuButton } from "@/components/admin/locales-menu-button";
import { AnimatedCircuitSVG } from "@/components/atomic-crm/misc/AnimatedCircuitSVG";

/**
 * Login page displayed when authentication is enabled and the user is not authenticated.
 *
 * Automatically shown when an unauthenticated user tries to access a protected route.
 * Handles login via authProvider.login() and displays error notifications on failure.
 *
 * @see {@link https://marmelab.com/shadcn-admin-kit/docs/loginpage LoginPage documentation}
 * @see {@link https://marmelab.com/shadcn-admin-kit/docs/security Security documentation}
 */
export const LoginPage = (props: { redirectTo?: string }) => {
  const { darkModeLogo, lightModeLogo, title, isDemo } =
    useConfigurationContext();
  const { redirectTo } = props;
  const [loading, setLoading] = useState(false);
  const login = useLogin();
  const notify = useNotify();
  const translate = useTranslate();

  const handleSubmit: SubmitHandler<FieldValues> = (values) => {
    setLoading(true);
    login(values, redirectTo)
      .then(() => {
        setLoading(false);
      })
      .catch((error) => {
        setLoading(false);
        notify(
          typeof error === "string"
            ? error
            : typeof error === "undefined" || !error.message
              ? "ra.auth.sign_in_error"
              : error.message,
          {
            type: "error",
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
      });
  };

  const demoDefaultValues = {
    email: "janedoe@realtimex.ai",
    password: "crmdemo",
  };

  return (
    <div className="min-h-screen flex text-foreground bg-background">
      <div className="container relative flex flex-col items-center justify-center lg:grid lg:max-w-none lg:grid-cols-2 lg:px-0">
        <div className="relative hidden h-full flex-col bg-muted p-10 dark:border-r lg:flex overflow-hidden">
          <div className="relative z-20 flex items-center text-lg font-medium">
            <img
              className="[.dark_&]:hidden h-6 mr-2"
              src={lightModeLogo}
              alt={title}
            />
            <img
              className="[.light_&]:hidden h-6 mr-2"
              src={darkModeLogo}
              alt={title}
            />
            {title}
          </div>
          <div className="relative z-10 flex-1 flex items-center justify-center">
            <AnimatedCircuitSVG />
          </div>
        </div>
        <div className="p-4 lg:p-10 relative flex flex-col h-full justify-center w-full max-w-[400px] lg:max-w-none">
          <div className="absolute top-4 right-4 lg:top-10 lg:right-10 flex items-center gap-2 z-20">
            <LocalesMenuButton />
            <ThemeModeToggle />
          </div>
          <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
            <div className="flex flex-col space-y-2 text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <h1 className="text-2xl font-semibold tracking-tight">
                  {translate("crm.auth.sign_in")}
                </h1>
                {isDemo && (
                  <Badge variant="secondary" className="animate-pulse">
                    Demo
                  </Badge>
                )}
              </div>
              {isDemo && (
                <p className="text-sm text-muted-foreground">
                  Welcome to the Live Demo! Explore all features using the
                  prefilled credentials.
                </p>
              )}
            </div>
            <Form
              className="space-y-8"
              onSubmit={handleSubmit}
              defaultValues={isDemo ? demoDefaultValues : {}}
            >
              <TextInput
                label={translate("ra.auth.email")}
                source="email"
                type="email"
                validate={required()}
              />
              <TextInput
                label={translate("ra.auth.password")}
                source="password"
                type="password"
                validate={required()}
              />
              <Button
                type="submit"
                className="cursor-pointer w-full"
                disabled={loading}
              >
                {translate("crm.auth.sign_in")}
              </Button>
            </Form>

            <div className="flex flex-col gap-2 text-sm text-center">
              <RouterLink
                to={"/forgot-password"}
                className="hover:underline text-muted-foreground"
              >
                {translate("ra-supabase.reset_password.forgot_password")}
              </RouterLink>
              <RouterLink
                to={"/otp-login"}
                className="hover:underline text-muted-foreground"
              >
                {translate("crm.auth.login_otp_link")}
              </RouterLink>
            </div>
          </div>
        </div>
      </div>
      <Notification />
    </div>
  );
};
