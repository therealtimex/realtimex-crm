import { useGetIdentity, useListContext, useTranslate } from "ra-core";
import { CreateButton } from "@/components/ds/admin/create-button";
import { ExportButton } from "@/components/ds/admin/export-button";
import { List } from "@/components/ds/admin/list";
import { ListPagination } from "@/components/ds/admin/list-pagination";
import { SortButton } from "@/components/ds/admin/sort-button";
import { Skeleton } from "@/components/ds/ui/skeleton";
import { Card } from "@/components/ds/ui/card";

import { TopToolbar } from "../layout/TopToolbar";
import { CompanyEmpty } from "./CompanyEmpty";
import { CompanyListFilter } from "./CompanyListFilter";
import { ImageList } from "./GridList";

export const CompanyList = () => {
  return (
    <List
      title={false}
      perPage={25}
      sort={{ field: "name", order: "ASC" }}
      actions={<CompanyListActions />}
      pagination={<ListPagination rowsPerPageOptions={[10, 25, 50, 100]} />}
    >
      <CompanyListLayout />
    </List>
  );
};

const CompanyListLayout = () => {
  const { data, isPending, filterValues } = useListContext();
  const { identity } = useGetIdentity();
  const hasFilters = filterValues && Object.keys(filterValues).length > 0;

  // Show loading skeleton while identity or data is loading
  if (!identity || isPending) {
    return (
      <div className="w-full flex flex-row gap-8">
        <div className="w-64">
          <Skeleton className="h-96 w-full" />
        </div>
        <div className="flex flex-col flex-1 gap-4">
          <Card className="p-4">
            <div className="grid grid-cols-3 gap-4">
              <Skeleton className="h-48 w-full" />
              <Skeleton className="h-48 w-full" />
              <Skeleton className="h-48 w-full" />
              <Skeleton className="h-48 w-full" />
              <Skeleton className="h-48 w-full" />
              <Skeleton className="h-48 w-full" />
            </div>
          </Card>
        </div>
      </div>
    );
  }

  if (!data?.length && !hasFilters) return <CompanyEmpty />;

  return (
    <div className="w-full flex flex-row gap-8">
      <CompanyListFilter />
      <div className="flex flex-col flex-1 gap-4">
        <ImageList />
      </div>
    </div>
  );
};

const CompanyListActions = () => {
  const translate = useTranslate();
  return (
    <TopToolbar>
      <SortButton fields={["name", "created_at", "nb_contacts"]} />
      <ExportButton />
      <CreateButton label={translate("crm.company.action.create")} />
    </TopToolbar>
  );
};
