import { useState } from "react";
import { Form, required, useNotify, useTranslate } from "ra-core";
import { Layout } from "@/components/supabase/layout";
import type { FieldValues, SubmitHandler } from "react-hook-form";
import { TextInput } from "@/components/admin/text-input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/components/atomic-crm/providers/supabase/supabase";
import { useNavigate, Link } from "react-router";

interface FormData {
  password: string;
  confirm: string;
}

export const ChangePasswordPage = () => {
  const [loading, setLoading] = useState(false);

  const notify = useNotify();
  const translate = useTranslate();
  const navigate = useNavigate();

  const validate = (values: FormData) => {
    const errors: Record<string, string> = {};

    if (!values.password) {
      errors.password = translate("ra.validation.required");
    } else if (values.password.length < 6) {
      errors.password = "Password must be at least 6 characters";
    }

    if (!values.confirm) {
      errors.confirm = translate("ra.validation.required");
    } else if (values.password !== values.confirm) {
      errors.confirm = "Passwords do not match";
    }

    return errors;
  };

  const submit = async (values: FormData) => {
    try {
      setLoading(true);

      const { error } = await supabase.auth.updateUser({
        password: values.password,
      });

      if (error) {
        throw error;
      }

      notify("Password updated successfully", { type: "success" });
      navigate("/");
    } catch (error: any) {
      notify(
        typeof error === "string"
          ? error
          : typeof error === "undefined" || !error.message
            ? "Failed to update password"
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

  return (
    <Layout>
      <div className="flex flex-col space-y-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          Set new password
        </h1>
        <p className="text-sm text-muted-foreground">
          Choose a secure password for your account
        </p>
      </div>
      <Form<FormData>
        className="space-y-6"
        onSubmit={submit as SubmitHandler<FieldValues>}
        validate={validate}
      >
        <TextInput
          source="password"
          type="password"
          label={translate("ra.auth.password", {
            _: "New password",
          })}
          autoComplete="new-password"
          validate={required()}
        />
        <TextInput
          source="confirm"
          type="password"
          label={translate("ra.auth.confirm_password", {
            _: "Confirm password",
          })}
          autoComplete="new-password"
          validate={required()}
        />
        <Button type="submit" className="cursor-pointer w-full" disabled={loading}>
          {loading ? "Updating..." : "Update password"}
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
    </Layout>
  );
};

ChangePasswordPage.path = "change-password";
