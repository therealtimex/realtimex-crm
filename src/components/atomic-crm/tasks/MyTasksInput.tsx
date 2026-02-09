import { useGetIdentity, useListFilterContext, useTranslate } from "ra-core";
import { Label } from "@/components/ds/ui/label";
import { Switch } from "@/components/ds/ui/switch";

export const MyTasksInput = ({
  source = "assigned_to",
  label,
}: {
  alwaysOn?: boolean;
  source?: string;
  label?: string;
}) => {
  const { filterValues, displayedFilters, setFilters } = useListFilterContext();
  const { identity } = useGetIdentity();
  const translate = useTranslate();
  const resolvedLabel = label ?? translate("crm.filter.my_tasks");

  const handleChange = () => {
    const newFilterValues = { ...filterValues };
    if (typeof filterValues[source] !== "undefined") {
      delete newFilterValues[source];
    } else {
      newFilterValues[source] = identity && identity?.id;
    }
    setFilters(newFilterValues, displayedFilters);
  };
  return (
    <div className="mt-auto pb-2.25">
      <div className="flex items-center space-x-2">
        <Switch
          id="my-tasks"
          checked={typeof filterValues[source] !== "undefined"}
          onCheckedChange={handleChange}
        />
        <Label htmlFor="my-tasks">{resolvedLabel}</Label>
      </div>
    </div>
  );
};
