import { useMutation } from "@tanstack/react-query";
import { useDataProvider, useNotify, useRedirect, useTranslate } from "ra-core";
import type { SubmitHandler } from "react-hook-form";
import { SimpleForm } from "@/components/ds/admin/simple-form";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ds/ui/card";

import type { CrmDataProvider } from "../providers/types";
import type { SalesFormData } from "../types";
import { SalesInputs } from "./SalesInputs";

export function SalesCreate() {
  const dataProvider = useDataProvider<CrmDataProvider>();
  const notify = useNotify();
  const redirect = useRedirect();
  const translate = useTranslate();

  const { mutateAsync } = useMutation({
    mutationKey: ["signup"],
    mutationFn: async (data: SalesFormData) => {
      return dataProvider.salesCreate(data);
    },
    onSuccess: () => {
      notify(translate("crm.user.notification.created_invite_sent"));
      redirect("/sales");
    },
    onError: () => {
      notify(translate("crm.user.notification.create_error"), {
        type: "error",
      });
    },
  });
  const onSubmit: SubmitHandler<SalesFormData> = async (data) => {
    await mutateAsync(data);
  };

  return (
    <div className="max-w-lg w-full mx-auto mt-8">
      <Card>
        <CardHeader>
          <CardTitle>{translate("crm.user.section.create_title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <SimpleForm onSubmit={onSubmit as SubmitHandler<any>}>
            <SalesInputs />
          </SimpleForm>
        </CardContent>
      </Card>
    </div>
  );
}
