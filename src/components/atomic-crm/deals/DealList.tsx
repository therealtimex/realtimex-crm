import { useGetIdentity, useListContext, useTranslate } from "ra-core";
import { matchPath, useLocation } from "react-router";
import { AutocompleteInput } from "@/components/ds/admin/autocomplete-input";
import { CreateButton } from "@/components/ds/admin/create-button";
import { ExportButton } from "@/components/ds/admin/export-button";
import { List } from "@/components/ds/admin/list";
import { ReferenceInput } from "@/components/ds/admin/reference-input";
import { FilterButton } from "@/components/ds/admin/filter-form";
import { SearchInput } from "@/components/ds/admin/search-input";
import { SelectInput } from "@/components/ds/admin/select-input";
import { Skeleton } from "@/components/ds/ui/skeleton";
import { Card } from "@/components/ds/ui/card";
import { translateChoice } from "@/i18n/utils";

import { useConfigurationContext } from "../root/ConfigurationContext";
import { TopToolbar } from "../layout/TopToolbar";
import { DealArchivedList } from "./DealArchivedList";
import { DealCreate } from "./DealCreate";
import { DealEdit } from "./DealEdit";
import { DealEmpty } from "./DealEmpty";
import { DealListContent } from "./DealListContent";
import { OnlyMineInput } from "./OnlyMineInput";

const DealList = () => {
  const { dealCategories } = useConfigurationContext();
  const translate = useTranslate();

  const translatedDealCategories = dealCategories.map((category) => ({
    id: category,
    name: translateChoice(translate, "crm.deal.category", category, category),
  }));

  const dealFilters = [
    <SearchInput source="q" alwaysOn />,
    <ReferenceInput source="company_id" reference="companies">
      <AutocompleteInput
        label={false}
        placeholder={translate("crm.filter.company")}
      />
    </ReferenceInput>,
    <SelectInput
      source="category"
      emptyText={translate("crm.deal.field.category")}
      choices={translatedDealCategories}
    />,
    <OnlyMineInput source="sales_id" alwaysOn />,
  ];

  return (
    <List
      perPage={100}
      filter={{ "archived_at@is": null }}
      title={false}
      sort={{ field: "index", order: "DESC" }}
      filters={dealFilters}
      actions={<DealActions />}
      pagination={null}
    >
      <DealLayout />
    </List>
  );
};

const DealLayout = () => {
  const location = useLocation();
  const matchCreate = matchPath("/deals/create", location.pathname);
  const matchEdit = matchPath("/deals/:id", location.pathname);

  const { data, isPending, filterValues } = useListContext();
  const { identity } = useGetIdentity();
  const hasFilters = filterValues && Object.keys(filterValues).length > 0;

  // Show loading skeleton while identity or data is loading
  if (!identity || isPending) {
    return (
      <div className="w-full">
        <Card className="p-4">
          <div className="flex gap-4">
            <Skeleton className="h-96 w-1/4" />
            <Skeleton className="h-96 w-1/4" />
            <Skeleton className="h-96 w-1/4" />
            <Skeleton className="h-96 w-1/4" />
          </div>
        </Card>
      </div>
    );
  }

  if (!data?.length && !hasFilters) {
    return (
      <>
        <DealEmpty>
          <DealArchivedList />
        </DealEmpty>
      </>
    );
  }

  return (
    <div className="w-full">
      <DealListContent />
      <DealArchivedList />
      <DealCreate open={!!matchCreate} />
      <DealEdit open={!!matchEdit && !matchCreate} id={matchEdit?.params.id} />
    </div>
  );
};

const DealActions = () => {
  const translate = useTranslate();
  return (
    <TopToolbar>
      <FilterButton />
      <ExportButton />
      <CreateButton label={translate("crm.action.new_deal")} />
    </TopToolbar>
  );
};

export default DealList;
