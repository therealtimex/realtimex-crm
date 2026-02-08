import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { useDataProvider, useLogin, useNotify, useTranslate } from "ra-core";
import { useForm, type SubmitHandler } from "react-hook-form";
import { useState } from "react";
import { Navigate } from "react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ThemeModeToggle } from "@/components/admin/theme-mode-toggle";
import { LocalesMenuButton } from "@/components/admin/locales-menu-button";

import type { CrmDataProvider } from "../providers/types";
import { useConfigurationContext } from "../root/ConfigurationContext";
import type { SignUpData } from "../types";
import { LoginSkeleton } from "./LoginSkeleton";

export const SignupPage = () => {
  const queryClient = useQueryClient();
  const dataProvider = useDataProvider<CrmDataProvider>();
  const { darkModeLogo, lightModeLogo, title } = useConfigurationContext();
  const translate = useTranslate();
  const { data: isInitialized, isPending } = useQuery({
    queryKey: ["init"],
    queryFn: async () => {
      return dataProvider.isInitialized();
    },
  });

  const { isPending: isSignUpPending, mutate } = useMutation({
    mutationKey: ["signup"],
    mutationFn: async (data: SignUpData) => {
      return dataProvider.signUp(data);
    },
    onSuccess: (data) => {
      login({
        email: data.email,
        password: data.password,
        redirectTo: "/contacts",
      }).then(() => {
        notify(translate("crm.signup.notification.success"));
        // FIXME: We should probably provide a hook for that in the ra-core package
        queryClient.invalidateQueries({
          queryKey: ["auth", "canAccess"],
        });
      });
    },
    onError: () => {
      notify(translate("crm.signup.notification.error"));
    },
  });

  const login = useLogin();
  const notify = useNotify();
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { isValid },
  } = useForm<SignUpData>({
    mode: "onChange",
  });

  if (isPending) {
    return <LoginSkeleton />;
  }

  // For the moment, we only allow one user to sign up. Other users must be created by the administrator.
  if (isInitialized) {
    return <Navigate to="/login" />;
  }

  const onSubmit: SubmitHandler<SignUpData> = async (data) => {
    mutate(data);
  };

  return (
    <div className="h-screen p-8 bg-background text-foreground relative">
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <LocalesMenuButton />
        <ThemeModeToggle />
      </div>

      <div className="flex items-center gap-4">
        <img className="[.light_&]:hidden h-6" src={darkModeLogo} alt={title} />
        <img className="[.dark_&]:hidden h-6" src={lightModeLogo} alt={title} />
        <h1 className="text-xl font-semibold">{title}</h1>
      </div>
      <div className="h-full">
        <div className="max-w-sm mx-auto h-full flex flex-col justify-center gap-4">
          <h1 className="text-2xl font-bold mb-4">
            {translate("crm.signup.title", { title })}
          </h1>
          <p className="text-base mb-4">{translate("crm.signup.subtitle")}</p>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="first_name">
                {translate("crm.contact.field.first_name")}
              </Label>
              <Input
                {...register("first_name", { required: true })}
                id="first_name"
                type="text"
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="last_name">
                {translate("crm.contact.field.last_name")}
              </Label>
              <Input
                {...register("last_name", { required: true })}
                id="last_name"
                type="text"
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">{translate("ra.auth.email")}</Label>
              <Input
                {...register("email", { required: true })}
                id="email"
                type="email"
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="password">{translate("ra.auth.password")}</Label>
              <div className="relative">
                <Input
                  {...register("password", { required: true })}
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showPassword ? translate("ra.auth.hide_password") : translate("ra.auth.show_password")}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
            <div className="flex justify-between items-center mt-8">
              <Button
                type="submit"
                disabled={!isValid || isSignUpPending}
                className="w-full"
              >
                {isSignUpPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    {translate("crm.signup.action.creating")}
                  </>
                ) : (
                  translate("crm.signup.action.create")
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

SignupPage.path = "/sign-up";
