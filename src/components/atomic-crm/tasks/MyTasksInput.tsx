import { useGetIdentity, useListFilterContext } from "ra-core";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export const MyTasksInput = ({ source = "assigned_to", label = "My Tasks" }: { alwaysOn?: boolean; source?: string, label?: string }) => {
  const { filterValues, displayedFilters, setFilters } = useListFilterContext();
  const { identity } = useGetIdentity();

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
        <Label htmlFor="my-tasks">{label}</Label>
      </div>
    </div>
  );
};
