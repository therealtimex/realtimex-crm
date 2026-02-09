import {
  CreateBase,
  Form,
  useGetIdentity,
  useListContext,
  useNotify,
  useRecordContext,
  useResourceContext,
  useUpdate,
  useTranslate,
  type Identifier,
  type RaRecord,
} from "ra-core";
import { useFormContext } from "react-hook-form";
import { SaveButton } from "@/components/ds/admin/form";
import { cn } from "@/lib/utils";

import { NoteInputs } from "./NoteInputs";
import { getCurrentDate } from "./utils";

const foreignKeyMapping = {
  contacts: "contact_id",
  deals: "deal_id",
  companies: "company_id",
  tasks: "task_id",
  invoices: "invoice_id",
};

export const NoteCreate = ({
  reference,
  showStatus,
  className,
}: {
  reference: "contacts" | "deals" | "companies" | "tasks" | "invoices";
  showStatus?: boolean;
  className?: string;
}) => {
  const resource = useResourceContext();
  const record = useRecordContext();
  const { identity } = useGetIdentity();

  if (!record || !identity) return null;

  return (
    <CreateBase resource={resource} redirect={false}>
      <Form>
        <div className={cn("space-y-3", className)}>
          <NoteInputs showStatus={showStatus} />
          <NoteCreateButton reference={reference} record={record} />
        </div>
      </Form>
    </CreateBase>
  );
};

const NoteCreateButton = ({
  reference,
  record,
}: {
  reference: "contacts" | "deals" | "companies" | "tasks" | "invoices";
  record: RaRecord<Identifier>;
}) => {
  const [update] = useUpdate();
  const notify = useNotify();
  const { identity } = useGetIdentity();
  const { reset } = useFormContext();
  const { refetch } = useListContext();
  const translate = useTranslate();

  if (!record || !identity) return null;

  const resetValues: {
    date: string;
    text: null;
    attachments: null;
    status?: string;
  } = {
    date: getCurrentDate(),
    text: null,
    attachments: null,
  };

  if (reference === "contacts") {
    resetValues.status = "warm";
  }

  const handleSuccess = (data: any) => {
    reset(resetValues, { keepValues: false });
    refetch();

    // Only update last_seen for resources that have this column (contacts, companies)
    const updateData: any = {};
    if (reference === "contacts" || reference === "companies") {
      updateData.last_seen = new Date().toISOString();
    }
    if (reference === "contacts") {
      updateData.status = data.status;
    }

    // Only perform update if there's data to update
    if (Object.keys(updateData).length > 0) {
      update(reference, {
        id: (record && record.id) as unknown as Identifier,
        data: updateData,
        previousData: record,
      });
    }
    notify(translate("crm.note.added"));
  };

  return (
    <div className="flex justify-end">
      <SaveButton
        type="button"
        label={translate("crm.note.action.add")}
        transform={(data) => ({
          ...data,
          [foreignKeyMapping[reference]]: record.id,
          sales_id: identity.id,
          date: data.date || getCurrentDate(),
        })}
        mutationOptions={{
          onSuccess: handleSuccess,
        }}
      >
        {translate("crm.note.action.add")}
      </SaveButton>
    </div>
  );
};
