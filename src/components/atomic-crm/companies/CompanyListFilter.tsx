import { Building, Truck, Users } from "lucide-react";
import { FilterLiveForm, useGetIdentity, useTranslate } from "ra-core";
import { ToggleFilterButton } from "@/components/ds/admin/toggle-filter-button";
import { SearchInput } from "@/components/ds/admin/search-input";

import { FilterCategory } from "../filters/FilterCategory";
import { useConfigurationContext } from "../root/ConfigurationContext";
import { sizes } from "./sizes";
import { translateChoice } from "@/i18n/utils";

export const CompanyListFilter = () => {
  const { identity } = useGetIdentity();
  const translate = useTranslate();
  const { companySectors } = useConfigurationContext();
  const sectors = companySectors.map((sector) => ({
    id: sector,
    name: translateChoice(translate, "crm.company.sector", sector, sector),
  }));
  return (
    <div className="w-52 min-w-52 flex flex-col gap-8">
      <FilterLiveForm>
        <SearchInput source="q" />
      </FilterLiveForm>

      <FilterCategory
        icon={<Building className="h-4 w-4" />}
        label={translate("crm.company.field.size")}
      >
        {sizes.map((size) => (
          <ToggleFilterButton
            key={size.id}
            className="w-full justify-between"
            label={translate(`crm.company.size.${size.id}`, { _: size.name })}
            value={{ size: size.id }}
          />
        ))}
      </FilterCategory>

      <FilterCategory
        icon={<Truck className="h-4 w-4" />}
        label={translate("crm.company.field.sector")}
      >
        {sectors.map((sector) => (
          <ToggleFilterButton
            key={sector.id}
            className="w-full justify-between"
            label={sector.name}
            value={{ sector: sector.id }}
          />
        ))}
      </FilterCategory>

      <FilterCategory
        icon={<Users className="h-4 w-4" />}
        label={translate("crm.company.field.account_manager")}
      >
        <ToggleFilterButton
          className="w-full justify-between"
          label={translate("crm.company.filter.me")}
          value={{ sales_id: identity?.id }}
        />
      </FilterCategory>
    </div>
  );
};
