import {
  useListFilterContext,
  useGetIdentity,
  useGetOne,
  useTranslate,
} from "ra-core";
import { X } from "lucide-react";
import { Badge } from "@/components/ds/ui/badge";
import { Button } from "@/components/ds/ui/button";
import { translateChoice } from "@/i18n/utils";
import { useConfigurationContext } from "../root/ConfigurationContext";

/**
 * ActiveFilterBar component
 * Displays active filters as removable chips/badges
 * Integrates with react-admin's filter system
 */
export const ActiveFilterBar = () => {
  const { filterValues, displayedFilters, setFilters } = useListFilterContext();
  const { identity } = useGetIdentity();
  const { taskStatuses, taskPriorities } = useConfigurationContext();
  const translate = useTranslate();

  // Default filter values that shouldn't show as active
  const defaultFilters = { archived: false };

  // Get contact, company, deal names for reference filters
  const { data: contact } = useGetOne(
    "contacts",
    { id: filterValues.contact_id },
    { enabled: !!filterValues.contact_id },
  );

  const { data: company } = useGetOne(
    "companies",
    { id: filterValues.company_id },
    { enabled: !!filterValues.company_id },
  );

  const { data: deal } = useGetOne(
    "deals",
    { id: filterValues.deal_id },
    { enabled: !!filterValues.deal_id },
  );

  // Remove a filter
  const handleRemoveFilter = (filterKey: string) => {
    const newFilters = { ...filterValues };
    delete newFilters[filterKey];

    // If removing archived filter, reset to default
    if (filterKey === "archived") {
      newFilters.archived = false;
    }

    setFilters(newFilters, displayedFilters);
  };

  // Get user-friendly label for a filter
  const getFilterLabel = (key: string, value: unknown): string => {
    switch (key) {
      case "q":
        return `${translate("crm.filter.search")}: "${value}"`;
      case "status": {
        const status = taskStatuses.find((s) => s.id === value);
        const statusLabel = status
          ? translateChoice(
              translate,
              "crm.task.status",
              status.id,
              status.name,
            )
          : `${value}`;
        return `${translate("crm.filter.status")}: ${statusLabel}`;
      }
      case "priority": {
        const priority = taskPriorities.find((p) => p.id === value);
        const priorityLabel = priority
          ? translateChoice(
              translate,
              "crm.task.priority",
              priority.id,
              priority.name,
            )
          : `${value}`;
        return `${translate("crm.filter.priority")}: ${priorityLabel}`;
      }
      case "assigned_to":
        if (identity && value === identity.id) {
          return translate("crm.filter.my_tasks");
        }
        return `${translate("crm.filter.assigned_to")}: ${value}`;
      case "contact_id":
        if (contact) {
          return `${translate("crm.filter.contact")}: ${contact.first_name} ${contact.last_name}`;
        }
        return `${translate("crm.filter.contact")}: ${translate("crm.filter.loading")}`;
      case "company_id":
        if (company) {
          return `${translate("crm.filter.company")}: ${company.name}`;
        }
        return `${translate("crm.filter.company")}: ${translate("crm.filter.loading")}`;
      case "deal_id":
        if (deal) {
          return `${translate("crm.filter.deal")}: ${deal.name}`;
        }
        return `${translate("crm.filter.deal")}: ${translate("crm.filter.loading")}`;
      case "archived":
        return value
          ? translate("crm.filter.archived")
          : translate("crm.filter.active");
      default:
        return `${key}: ${value}`;
    }
  };

  // Check if a filter is active (not default)
  const isActiveFilter = (key: string, value: unknown): boolean => {
    // Skip if it's a default filter with default value
    if (
      key in defaultFilters &&
      defaultFilters[key as keyof typeof defaultFilters] === value
    ) {
      return false;
    }
    // Skip if value is undefined, null, or empty string
    if (value === undefined || value === null || value === "") {
      return false;
    }
    return true;
  };

  // Get list of active filters
  const activeFilters = Object.entries(filterValues).filter(([key, value]) =>
    isActiveFilter(key, value),
  );

  // Don't render if no active filters
  if (activeFilters.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-2 p-4 bg-muted/30 border-b">
      <span className="text-sm font-medium text-muted-foreground">
        {translate("crm.filter.active_filters")}:
      </span>
      {activeFilters.map(([key, value]) => (
        <Badge
          key={key}
          variant="secondary"
          className="flex items-center gap-1.5 pl-3 pr-2 py-1"
        >
          <span className="text-sm">{getFilterLabel(key, value)}</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-4 w-4 p-0 hover:bg-transparent"
            onClick={() => handleRemoveFilter(key)}
            aria-label={translate("crm.filter.remove", { filter: key })}
          >
            <X className="h-3 w-3" />
          </Button>
        </Badge>
      ))}
    </div>
  );
};
