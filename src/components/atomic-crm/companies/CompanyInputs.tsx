import { required, useRecordContext, useTranslate } from "ra-core";
import { ReferenceInput } from "@/components/admin/reference-input";
import { TextInput } from "@/components/admin/text-input";
import { SelectInput } from "@/components/admin/select-input";
import { ArrayInput } from "@/components/admin/array-input";
import { SimpleFormIterator } from "@/components/admin/simple-form-iterator";
import { Separator } from "@/components/ui/separator";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import { useState } from "react";

import { translateChoice } from "@/i18n/utils";
import ImageEditorField from "../misc/ImageEditorField";
import { isLinkedinUrl } from "../misc/isLinkedInUrl";
import { useConfigurationContext } from "../root/ConfigurationContext";
import type { Company, Sale } from "../types";
import { sizes } from "./sizes";

const isUrl = (url: string, translate: any) => {
  if (!url) return;
  const UrlRegex = new RegExp(
    /^(http:\/\/www\.|https:\/\/www\.|http:\/\/|https:\/\/)?[a-z0-9]+([-.]{1}[a-z0-9]+)*\.[a-z]{2,5}(:[0-9]{1,5})?(\/.*)?$/i,
  );
  if (!UrlRegex.test(url)) {
    return translate("crm.company.error.invalid_url");
  }
};

export const CompanyInputs = () => {
  const isMobile = useIsMobile();

  return (
    <div className="flex flex-col gap-4 p-1">
      <CompanyDisplayInputs />
      <div className={`flex gap-6 ${isMobile ? "flex-col" : "flex-row"}`}>
        <div className="flex flex-col gap-10 flex-1">
          <CompanyContactInputs />
          <CompanyContextInputs />
        </div>
        <Separator orientation={isMobile ? "horizontal" : "vertical"} />
        <div className="flex flex-col gap-8 flex-1">
          <CompanyAddressInputs />
          <CompanyAdditionalInformationInputs />
          <CompanyAccountManagerInput />
        </div>
      </div>
      <Separator className="my-4" />
      <CompanyAdvancedSettings />
    </div>
  );
};

const CompanyDisplayInputs = () => {
  const record = useRecordContext<Company>();
  const translate = useTranslate();
  return (
    <div className="flex gap-4 flex-1 flex-row">
      <ImageEditorField
        source="logo"
        type="avatar"
        width={60}
        height={60}
        emptyText={record?.name?.charAt(0) || "?"}
        linkPosition="bottom"
      />
      <TextInput
        source="name"
        className="w-full h-fit"
        label={translate("crm.company.field.name")}
        validate={required()}
        helperText={false}
        placeholder={translate("crm.company.placeholder.company_name")}
      />
    </div>
  );
};

const CompanyContactInputs = () => {
  const translate = useTranslate();
  return (
    <div className="flex flex-col gap-4">
      <h6 className="text-lg font-semibold">
        {translate("crm.company.section.contact")}
      </h6>
      <TextInput
        source="email"
        label={translate("ra.auth.email")}
        helperText={false}
        type="email"
      />
      <TextInput
        source="website"
        label={translate("crm.company.field.website")}
        helperText={false}
        validate={(value) => isUrl(value, translate)}
      />
      <TextInput
        source="phone_number"
        label={translate("crm.company.field.phone_number")}
        helperText={false}
      />

      <div className="mt-2">
        <p className="text-sm font-medium mb-2">
          {translate("crm.company.section.social_profiles")}
        </p>
        <div className="flex flex-col gap-3 ml-2">
          <TextInput
            source="linkedin_url"
            label={translate("crm.company.field.linkedin")}
            helperText={false}
            validate={isLinkedinUrl}
          />
          <TextInput
            source="social_profiles.x"
            label={translate("crm.company.field.twitter")}
            helperText={false}
            validate={(value) => isUrl(value, translate)}
          />
          <TextInput
            source="social_profiles.facebook"
            label={translate("crm.company.field.facebook")}
            helperText={false}
            validate={(value) => isUrl(value, translate)}
          />
          <TextInput
            source="social_profiles.github"
            label={translate("crm.company.field.github")}
            helperText={false}
            validate={(value) => isUrl(value, translate)}
          />
        </div>
      </div>

      <TextInput
        source="logo_url"
        label={translate("crm.company.field.logo_url")}
        helperText={false}
        validate={(value) => isUrl(value, translate)}
      />
    </div>
  );
};

const CompanyContextInputs = () => {
  const {
    companySectors,
    companyLifecycleStages,
    companyTypes,
    companyRevenueRanges,
    companyQualificationStatuses,
  } = useConfigurationContext();
  const translate = useTranslate();

  const translatedCompanySectors = companySectors.map((sector) => ({
    id: sector,
    name: translateChoice(translate, "crm.company.sector", sector, sector),
  }));

  const translatedSizes = sizes.map((size) => ({
    ...size,
    name: translate(`crm.company.size.${size.id}`, { _: size.name }),
  }));

  return (
    <div className="flex flex-col gap-4">
      <h6 className="text-lg font-semibold">
        {translate("crm.company.section.context")}
      </h6>

      {/* Classification */}
      {companyLifecycleStages && (
        <SelectInput
          source="lifecycle_stage"
          label={translate("crm.company.field.lifecycle_stage")}
          choices={companyLifecycleStages}
          helperText={false}
        />
      )}
      {companyTypes && (
        <SelectInput
          source="company_type"
          label={translate("crm.company.field.company_type")}
          choices={companyTypes}
          helperText={false}
        />
      )}
      {companyQualificationStatuses && (
        <SelectInput
          source="qualification_status"
          label={translate("crm.company.field.qualification_status")}
          choices={companyQualificationStatuses}
          helperText={false}
        />
      )}

      {/* Industry & Sector */}
      <SelectInput
        source="sector"
        label={translate("crm.company.field.sector")}
        choices={translatedCompanySectors}
        helperText={false}
      />
      <TextInput
        source="industry"
        label={translate("crm.company.field.sector")}
        helperText={false}
      />

      {/* Size & Revenue */}
      <SelectInput
        source="size"
        label={translate("crm.company.field.size")}
        choices={translatedSizes}
        helperText={false}
      />
      <TextInput
        source="employee_count"
        label={translate("crm.company.field.employee_count")}
        helperText={false}
        type="number"
      />
      <TextInput
        source="revenue"
        label={translate("crm.company.field.revenue")}
        helperText={false}
      />
      {companyRevenueRanges && (
        <SelectInput
          source="revenue_range"
          label={translate("crm.company.field.revenue_range")}
          choices={companyRevenueRanges}
          helperText={false}
        />
      )}

      {/* Additional */}
      <TextInput
        source="founded_year"
        label={translate("crm.company.field.founded_year")}
        helperText={false}
        type="number"
      />
      <TextInput
        source="tax_identifier"
        label={translate("crm.company.field.tax_identifier")}
        helperText={false}
      />
    </div>
  );
};

const CompanyAddressInputs = () => {
  const translate = useTranslate();
  return (
    <div className="flex flex-col gap-4">
      <h6 className="text-lg font-semibold">
        {translate("crm.company.section.address")}
      </h6>
      <TextInput
        source="address"
        label={translate("crm.company.field.address")}
        helperText={false}
      />
      <TextInput
        source="city"
        label={translate("crm.company.field.city")}
        helperText={false}
      />
      <TextInput
        source="zipcode"
        label={translate("crm.company.field.zipcode")}
        helperText={false}
      />
      <TextInput
        source="stateAbbr"
        label={translate("crm.company.field.state")}
        helperText={false}
      />
      <TextInput
        source="country"
        label={translate("crm.company.field.country")}
        helperText={false}
      />
    </div>
  );
};

const CompanyAdditionalInformationInputs = () => {
  const translate = useTranslate();
  return (
    <div className="flex flex-col gap-4">
      <h6 className="text-lg font-semibold">
        {translate("crm.company.section.additional_info")}
      </h6>
      <TextInput
        source="description"
        label={translate("crm.company.field.description")}
        multiline
        helperText={false}
      />
      <ArrayInput
        source="context_links"
        label={translate("crm.company.field.context_links")}
        helperText={false}
      >
        <SimpleFormIterator disableReordering fullWidth getItemLabel={false}>
          <TextInput
            source=""
            label={false}
            helperText={false}
            validate={(value) => isUrl(value, translate)}
          />
        </SimpleFormIterator>
      </ArrayInput>
    </div>
  );
};

const CompanyAccountManagerInput = () => {
  const translate = useTranslate();
  return (
    <div className="flex flex-col gap-4">
      <h6 className="text-lg font-semibold">
        {translate("crm.company.field.account_manager")}
      </h6>
      <ReferenceInput
        source="sales_id"
        reference="sales"
        filter={{
          "disabled@neq": true,
        }}
      >
        <SelectInput
          label={translate("crm.company.field.account_manager")}
          helperText={false}
          optionText={saleOptionRenderer}
        />
      </ReferenceInput>
    </div>
  );
};

const saleOptionRenderer = (choice: Sale) =>
  `${choice.first_name} ${choice.last_name}`;

const CompanyAdvancedSettings = () => {
  const [isOpen, setIsOpen] = useState(false);
  const translate = useTranslate();

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
        <ChevronDown
          className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
        {translate("crm.company.section.advanced_settings")}
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-4">
        <div className="flex flex-col gap-6 pl-6 border-l-2 border-muted">
          {/* External System Integration */}
          <div className="flex flex-col gap-4">
            <h6 className="text-sm font-semibold text-muted-foreground">
              {translate("crm.company.section.external_system_integration")}
            </h6>
            <TextInput
              source="external_id"
              label={translate("crm.company.field.external_id")}
              helperText={false}
              placeholder={translate("crm.company.placeholder.external_id")}
            />
            <SelectInput
              source="external_system"
              label={translate("crm.company.field.external_system")}
              choices={[
                { id: "salesforce", name: "Salesforce" },
                { id: "hubspot", name: "HubSpot" },
                { id: "clearbit", name: "Clearbit" },
                { id: "apollo", name: "Apollo" },
                { id: "zoominfo", name: "ZoomInfo" },
              ]}
              helperText={false}
            />
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};
