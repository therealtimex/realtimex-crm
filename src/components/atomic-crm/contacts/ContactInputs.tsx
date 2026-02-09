import { email, required, useRecordContext, useTranslate } from "ra-core";
import type { FocusEvent, ClipboardEventHandler } from "react";
import { useFormContext } from "react-hook-form";
import { Separator } from "@/components/ds/ui/separator";
import { useIsMobile } from "@/hooks/use-mobile";
import { BooleanInput } from "@/components/ds/admin/boolean-input";
import { ReferenceInput } from "@/components/ds/admin/reference-input";
import { TextInput } from "@/components/ds/admin/text-input";
import { RadioButtonGroupInput } from "@/components/ds/admin/radio-button-group-input";
import { SelectInput } from "@/components/ds/admin/select-input";
import { ArrayInput } from "@/components/ds/admin/array-input";
import { SimpleFormIterator } from "@/components/ds/admin/simple-form-iterator";

import { isLinkedinUrl } from "../misc/isLinkedInUrl";
import { useConfigurationContext } from "../root/ConfigurationContext";
import type { Contact, Sale } from "../types";
import ImageEditorField from "../misc/ImageEditorField";
import { AutocompleteCompanyInput } from "../companies/AutocompleteCompanyInput.tsx";
import { translateChoice } from "@/i18n/utils";

export const ContactInputs = () => {
  const isMobile = useIsMobile();
  const record = useRecordContext<Contact>();

  return (
    <div className="flex flex-col gap-2 p-1">
      <div className="flex">
        <ImageEditorField
          source="avatar"
          type="avatar"
          width={60}
          height={60}
          emptyText={`${record?.first_name?.charAt(0) || ""}${record?.last_name?.charAt(0) || ""}`}
          linkPosition="bottom"
        />
      </div>
      <div className={`flex gap-6 ${isMobile ? "flex-col" : "flex-row"}`}>
        <div className="flex flex-col gap-10 flex-1">
          <ContactIdentityInputs />
          <ContactPositionInputs />
        </div>
        <Separator
          orientation={isMobile ? "horizontal" : "vertical"}
          className="flex-shrink-0"
        />
        <div className="flex flex-col gap-10 flex-1">
          <ContactPersonalInformationInputs />
          <ContactMiscInputs />
        </div>
      </div>
    </div>
  );
};

const ContactIdentityInputs = () => {
  const { contactGender } = useConfigurationContext();
  const translate = useTranslate();
  const translatedGenders = contactGender.map((gender) => ({
    ...gender,
    label: translateChoice(
      translate,
      "crm.contact.gender",
      gender.value,
      gender.label,
    ),
  }));
  return (
    <div className="flex flex-col gap-4">
      <h6 className="text-lg font-semibold">
        {translate("crm.contact.section.identity")}
      </h6>
      <RadioButtonGroupInput
        label={false}
        row
        source="gender"
        choices={translatedGenders}
        helperText={false}
        optionText="label"
        optionValue="value"
        defaultValue={contactGender[0].value}
      />
      <TextInput
        source="first_name"
        label={translate("crm.contact.field.first_name")}
        validate={required()}
        helperText={false}
      />
      <TextInput
        source="last_name"
        label={translate("crm.contact.field.last_name")}
        helperText={false}
      />
    </div>
  );
};

const ContactPositionInputs = () => {
  const translate = useTranslate();
  return (
    <div className="flex flex-col gap-4">
      <h6 className="text-lg font-semibold">
        {translate("crm.contact.section.position")}
      </h6>
      <TextInput
        source="title"
        label={translate("crm.contact.field.title")}
        helperText={false}
      />
      <ReferenceInput source="company_id" reference="companies" perPage={10}>
        <AutocompleteCompanyInput
          label={translate("crm.contact.field.company")}
        />
      </ReferenceInput>
    </div>
  );
};

const ContactPersonalInformationInputs = () => {
  const { getValues, setValue } = useFormContext();
  const translate = useTranslate();

  const translatedPersonalInfoTypes = personalInfoTypes.map((type) => ({
    id: type.id,
    name: translate(`crm.contact.type.${type.id.toLowerCase()}`),
  }));

  // set first and last name based on email
  const handleEmailChange = (email: string) => {
    const { first_name, last_name } = getValues();
    if (first_name || last_name || !email) return;
    const [first, last] = email.split("@")[0].split(".");
    setValue("first_name", first.charAt(0).toUpperCase() + first.slice(1));
    setValue(
      "last_name",
      last ? last.charAt(0).toUpperCase() + last.slice(1) : "",
    );
  };

  const handleEmailPaste: ClipboardEventHandler<
    HTMLTextAreaElement | HTMLInputElement
  > = (e) => {
    const email = e.clipboardData?.getData("text/plain");
    handleEmailChange(email);
  };

  const handleEmailBlur = (
    e: FocusEvent<HTMLTextAreaElement | HTMLInputElement>,
  ) => {
    const email = e.target.value;
    handleEmailChange(email);
  };

  return (
    <div className="flex flex-col gap-4">
      <h6 className="text-lg font-semibold">
        {translate("crm.contact.section.personal_info")}
      </h6>
      <ArrayInput
        source="email_jsonb"
        label={translate("crm.contact.field.email_addresses")}
        helperText={false}
      >
        <SimpleFormIterator
          inline
          disableReordering
          disableClear
          className="[&>ul>li]:border-b-0 [&>ul>li]:pb-0"
        >
          <TextInput
            source="email"
            className="w-full"
            helperText={false}
            label={false}
            placeholder={translate("crm.contact.field.email")}
            validate={email()}
            onPaste={handleEmailPaste}
            onBlur={handleEmailBlur}
          />
          <SelectInput
            source="type"
            helperText={false}
            label={false}
            optionText="name"
            choices={translatedPersonalInfoTypes}
            defaultValue="Work"
            className="w-24 min-w-24"
          />
        </SimpleFormIterator>
      </ArrayInput>
      <ArrayInput
        source="phone_jsonb"
        label={translate("crm.contact.field.phone_numbers")}
        helperText={false}
      >
        <SimpleFormIterator
          inline
          disableReordering
          disableClear
          className="[&>ul>li]:border-b-0 [&>ul>li]:pb-0"
        >
          <TextInput
            source="number"
            className="w-full"
            helperText={false}
            label={false}
            placeholder={translate("crm.contact.field.phone_number")}
          />
          <SelectInput
            source="type"
            helperText={false}
            label={false}
            optionText="name"
            choices={translatedPersonalInfoTypes}
            defaultValue="Work"
            className="w-24 min-w-24"
          />
        </SimpleFormIterator>
      </ArrayInput>
      <TextInput
        source="linkedin_url"
        label={translate("crm.contact.field.linkedin_url")}
        helperText={false}
        validate={isLinkedinUrl}
      />
    </div>
  );
};

const personalInfoTypes = [{ id: "Work" }, { id: "Home" }, { id: "Other" }];

const ContactMiscInputs = () => {
  const translate = useTranslate();
  return (
    <div className="flex flex-col gap-4">
      <h6 className="text-lg font-semibold">
        {translate("crm.contact.section.misc")}
      </h6>
      <TextInput
        source="background"
        label={translate("crm.contact.field.background")}
        multiline
        helperText={false}
      />
      <BooleanInput
        source="has_newsletter"
        label={translate("crm.contact.field.has_newsletter")}
        helperText={false}
      />
      <ReferenceInput
        reference="sales"
        source="sales_id"
        sort={{ field: "last_name", order: "ASC" }}
        filter={{
          "disabled@neq": true,
        }}
      >
        <SelectInput
          helperText={false}
          label={translate("crm.contact.field.account_manager")}
          optionText={saleOptionRenderer}
          validate={required()}
        />
      </ReferenceInput>
    </div>
  );
};

const saleOptionRenderer = (choice: Sale) =>
  `${choice.first_name} ${choice.last_name}`;
