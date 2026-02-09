import { useMutation } from "@tanstack/react-query";
import {
  useDataProvider,
  useEditController,
  useNotify,
  useRecordContext,
  useRedirect,
  useTranslate,
} from "ra-core";
import { useEffect } from "react";
import type { SubmitHandler } from "react-hook-form";
import { SimpleForm } from "@/components/ds/admin/simple-form";
import { CancelButton } from "@/components/ds/admin/cancel-button";
import { SaveButton } from "@/components/ds/admin/form";
import { Card, CardContent } from "@/components/ds/ui/card";

import type { CrmDataProvider } from "../providers/types";
import type { Sale, SalesFormData } from "../types";
import { SalesInputs } from "./SalesInputs";

function EditToolbar() {
  return (
    <div className="flex justify-end gap-4">
      <CancelButton />
      <SaveButton />
    </div>
  );
}

export function SalesEdit() {
  const { record, error } = useEditController();

  const dataProvider = useDataProvider<CrmDataProvider>();
  const notify = useNotify();
  const redirect = useRedirect();
  const translate = useTranslate();

  // Handle error (user not found)
  useEffect(() => {
    if (error) {
      notify("User not found or has been deleted", { type: "error" });
      redirect("/sales");
    }
  }, [error, notify, redirect]);

  const { mutate } = useMutation({
    mutationKey: ["signup"],
    mutationFn: async (data: SalesFormData) => {
      if (!record) {
        throw new Error("Record not found");
      }
      return dataProvider.salesUpdate(record.id, data);
    },
    onSuccess: () => {
      redirect("/sales");
      notify(translate("crm.user.notification.updated"));
    },
    onError: () => {
      notify(translate("crm.user.notification.error"));
    },
  });

  const onSubmit: SubmitHandler<SalesFormData> = async (data) => {
    mutate(data);
  };

  return (
    <div className="max-w-lg w-full mx-auto mt-8">
      <Card>
        <CardContent>
          <SimpleForm
            toolbar={<EditToolbar />}
            onSubmit={onSubmit as SubmitHandler<any>}
            record={record}
          >
            <SaleEditTitle />
            <SalesInputs />
          </SimpleForm>
        </CardContent>
      </Card>
    </div>
  );
}

const SaleEditTitle = () => {
  const record = useRecordContext<Sale>();
  const translate = useTranslate();

  if (!record) return null;

  const name = record.first_name && record.last_name
    ? `${record.first_name} ${record.last_name}`
    : record.email || "User";

  return (
    <h2 className="text-lg font-semibold mb-4">
      {translate("crm.user.action.edit", { name })}
    </h2>
  );
};
