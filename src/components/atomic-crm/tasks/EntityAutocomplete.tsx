import { useWatch } from "react-hook-form";
import { ReferenceInput } from "@/components/ds/admin/reference-input";
import { AutocompleteInput } from "@/components/ds/admin/autocomplete-input";
import { useTranslate } from "ra-core";
import { contactOptionText } from "../misc/ContactOption";

interface EntityAutocompleteProps {
  helperText?: boolean;
  validate?: any;
}

export const EntityAutocomplete = ({
  helperText = false,
  validate,
}: EntityAutocompleteProps) => {
  const translate = useTranslate();
  const entityType = useWatch({ name: "entity_type" });

  if (entityType === "contact") {
    return (
      <ReferenceInput source="contact_id" reference="contacts_summary">
        <AutocompleteInput
          label={translate("crm.task.entity_type.contact")}
          optionText={contactOptionText}
          helperText={helperText}
          validate={validate}
        />
      </ReferenceInput>
    );
  }

  if (entityType === "company") {
    return (
      <ReferenceInput source="company_id" reference="companies">
        <AutocompleteInput
          label={translate("crm.task.entity_type.company")}
          optionText="name"
          helperText={helperText}
          validate={validate}
        />
      </ReferenceInput>
    );
  }

  if (entityType === "deal") {
    return (
      <ReferenceInput source="deal_id" reference="deals">
        <AutocompleteInput
          label={translate("crm.task.entity_type.deal")}
          optionText="name"
          helperText={helperText}
          validate={validate}
        />
      </ReferenceInput>
    );
  }

  return null;
};
