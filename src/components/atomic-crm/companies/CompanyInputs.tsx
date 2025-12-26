import { required, useRecordContext } from "ra-core";
import { ReferenceInput } from "@/components/admin/reference-input";
import { TextInput } from "@/components/admin/text-input";
import { SelectInput } from "@/components/admin/select-input";
import { ArrayInput } from "@/components/admin/array-input";
import { SimpleFormIterator } from "@/components/admin/simple-form-iterator";
import { Separator } from "@/components/ui/separator";
import { useIsMobile } from "@/hooks/use-mobile";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import { useState } from "react";

import ImageEditorField from "../misc/ImageEditorField";
import { isLinkedinUrl } from "../misc/isLinkedInUrl";
import { useConfigurationContext } from "../root/ConfigurationContext";
import type { Company, Sale } from "../types";
import { sizes } from "./sizes";

const isUrl = (url: string) => {
  if (!url) return;
  const UrlRegex = new RegExp(
    /^(http:\/\/www\.|https:\/\/www\.|http:\/\/|https:\/\/)?[a-z0-9]+([-.]{1}[a-z0-9]+)*\.[a-z]{2,5}(:[0-9]{1,5})?(\/.*)?$/i,
  );
  if (!UrlRegex.test(url)) {
    return "Must be a valid URL";
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
  return (
    <div className="flex gap-4 flex-1 flex-row">
      <ImageEditorField
        source="logo"
        type="avatar"
        width={60}
        height={60}
        emptyText={record?.name.charAt(0)}
        linkPosition="bottom"
      />
      <TextInput
        source="name"
        className="w-full h-fit"
        validate={required()}
        helperText={false}
        placeholder="Company name"
      />
    </div>
  );
};

const CompanyContactInputs = () => {
  return (
    <div className="flex flex-col gap-4">
      <h6 className="text-lg font-semibold">Contact</h6>
      <TextInput source="email" helperText={false} type="email" />
      <TextInput source="website" helperText={false} validate={isUrl} />
      <TextInput source="phone_number" helperText={false} />

      <div className="mt-2">
        <p className="text-sm font-medium mb-2">Social Profiles</p>
        <div className="flex flex-col gap-3 ml-2">
          <TextInput
            source="linkedin_url"
            label="LinkedIn"
            helperText={false}
            validate={isLinkedinUrl}
          />
          <TextInput
            source="social_profiles.x"
            label="Twitter/X"
            helperText={false}
            validate={isUrl}
          />
          <TextInput
            source="social_profiles.facebook"
            label="Facebook"
            helperText={false}
            validate={isUrl}
          />
          <TextInput
            source="social_profiles.github"
            label="GitHub"
            helperText={false}
            validate={isUrl}
          />
        </div>
      </div>

      <TextInput source="logo_url" label="Logo URL" helperText={false} validate={isUrl} />
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

  return (
    <div className="flex flex-col gap-4">
      <h6 className="text-lg font-semibold">Context</h6>

      {/* Classification */}
      {companyLifecycleStages && (
        <SelectInput
          source="lifecycle_stage"
          label="Lifecycle Stage"
          choices={companyLifecycleStages}
          helperText={false}
        />
      )}
      {companyTypes && (
        <SelectInput
          source="company_type"
          label="Company Type"
          choices={companyTypes}
          helperText={false}
        />
      )}
      {companyQualificationStatuses && (
        <SelectInput
          source="qualification_status"
          label="Qualification Status"
          choices={companyQualificationStatuses}
          helperText={false}
        />
      )}

      {/* Industry & Sector */}
      <SelectInput
        source="sector"
        choices={companySectors.map((sector) => ({
          id: sector,
          name: sector,
        }))}
        helperText={false}
      />
      <TextInput source="industry" helperText={false} />

      {/* Size & Revenue */}
      <SelectInput source="size" choices={sizes} helperText={false} />
      <TextInput source="employee_count" label="Employee Count" helperText={false} type="number" />
      <TextInput source="revenue" helperText={false} />
      {companyRevenueRanges && (
        <SelectInput
          source="revenue_range"
          label="Revenue Range"
          choices={companyRevenueRanges}
          helperText={false}
        />
      )}

      {/* Additional */}
      <TextInput source="founded_year" label="Founded Year" helperText={false} type="number" />
      <TextInput source="tax_identifier" helperText={false} />
    </div>
  );
};

const CompanyAddressInputs = () => {
  return (
    <div className="flex flex-col gap-4">
      <h6 className="text-lg font-semibold">Address</h6>
      <TextInput source="address" helperText={false} />
      <TextInput source="city" helperText={false} />
      <TextInput source="zipcode" helperText={false} />
      <TextInput source="stateAbbr" helperText={false} />
      <TextInput source="country" helperText={false} />
    </div>
  );
};

const CompanyAdditionalInformationInputs = () => {
  return (
    <div className="flex flex-col gap-4">
      <h6 className="text-lg font-semibold">Additional information</h6>
      <TextInput source="description" multiline helperText={false} />
      <ArrayInput source="context_links" helperText={false}>
        <SimpleFormIterator disableReordering fullWidth getItemLabel={false}>
          <TextInput
            source=""
            label={false}
            helperText={false}
            validate={isUrl}
          />
        </SimpleFormIterator>
      </ArrayInput>
    </div>
  );
};

const CompanyAccountManagerInput = () => {
  return (
    <div className="flex flex-col gap-4">
      <h6 className="text-lg font-semibold">Account manager</h6>
      <ReferenceInput
        source="sales_id"
        reference="sales"
        filter={{
          "disabled@neq": true,
        }}
      >
        <SelectInput
          label="Account manager"
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

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
        Advanced Settings
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-4">
        <div className="flex flex-col gap-6 pl-6 border-l-2 border-muted">
          {/* External System Integration */}
          <div className="flex flex-col gap-4">
            <h6 className="text-sm font-semibold text-muted-foreground">External System Integration</h6>
            <TextInput
              source="external_id"
              label="External ID"
              helperText={false}
              placeholder="e.g., Salesforce Account ID"
            />
            <SelectInput
              source="external_system"
              label="External System"
              choices={[
                { id: 'salesforce', name: 'Salesforce' },
                { id: 'hubspot', name: 'HubSpot' },
                { id: 'clearbit', name: 'Clearbit' },
                { id: 'apollo', name: 'Apollo' },
                { id: 'zoominfo', name: 'ZoomInfo' },
              ]}
              helperText={false}
            />
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};
