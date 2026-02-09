import { useCreate, useGetIdentity, useNotify, useTranslate } from "ra-core";
import { AutocompleteInput } from "@/components/ds/admin/autocomplete-input";
import type { InputProps } from "ra-core";

export const AutocompleteCompanyInput = ({
  validate,
  label,
}: Pick<InputProps, "validate" | "label">) => {
  const [create] = useCreate();
  const { identity } = useGetIdentity();
  const notify = useNotify();
  const translate = useTranslate();
  const handleCreateCompany = async (name?: string) => {
    if (!name) return;
    try {
      const newCompany = await create(
        "companies",
        {
          data: {
            name,
            sales_id: identity?.id,
            created_at: new Date().toISOString(),
          },
        },
        { returnPromise: true },
      );
      return newCompany;
    } catch {
      notify(translate("crm.company.notification.error_creating"), {
        type: "error",
      });
    }
  };

  return (
    <AutocompleteInput
      optionText="name"
      helperText={false}
      onCreate={handleCreateCompany}
      createItemLabel="Create %{item}"
      createLabel={translate("crm.company.placeholder.create_hint")}
      validate={validate}
      label={label}
    />
  );
};
