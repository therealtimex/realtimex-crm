import { endOfYesterday, startOfMonth, startOfWeek, subMonths } from "date-fns";
import {
  Activity,
  CheckSquare,
  Clock,
  HeartPulse,
  Tag,
  TrendingUp,
  Users,
} from "lucide-react";
import {
  FilterLiveForm,
  useGetIdentity,
  useGetList,
  useTranslate,
} from "ra-core";
import { ToggleFilterButton } from "@/components/ds/admin/toggle-filter-button";
import { SearchInput } from "@/components/ds/admin/search-input";
import { Badge } from "@/components/ds/ui/badge";
import { translateChoice } from "@/i18n/utils";

import { FilterCategory } from "../filters/FilterCategory";
import { Status } from "../misc/Status";
import { useConfigurationContext } from "../root/ConfigurationContext";

export const ContactListFilter = () => {
  const { noteStatuses } = useConfigurationContext();
  const { identity } = useGetIdentity();
  const translate = useTranslate();
  const { data } = useGetList("tags", {
    pagination: { page: 1, perPage: 10 },
    sort: { field: "name", order: "ASC" },
  });

  return (
    <div className="w-52 min-w-52 order-first pt-0.75 flex flex-col gap-4">
      <FilterLiveForm>
        <SearchInput
          source="q"
          placeholder={translate("crm.contact.filter.search_placeholder")}
        />
      </FilterLiveForm>

      <FilterCategory
        label={translate("crm.contact.filter.last_activity")}
        icon={<Clock />}
      >
        <ToggleFilterButton
          className="w-full justify-between"
          label={translate("crm.contact.filter.today")}
          value={{
            "last_seen@gte": endOfYesterday().toISOString(),
            "last_seen@lte": undefined,
          }}
        />
        <ToggleFilterButton
          className="w-full justify-between"
          label={translate("crm.contact.filter.this_week")}
          value={{
            "last_seen@gte": startOfWeek(new Date()).toISOString(),
            "last_seen@lte": undefined,
          }}
        />
        <ToggleFilterButton
          className="w-full justify-between"
          label={translate("crm.contact.filter.before_this_week")}
          value={{
            "last_seen@gte": undefined,
            "last_seen@lte": startOfWeek(new Date()).toISOString(),
          }}
        />
        <ToggleFilterButton
          className="w-full justify-between"
          label={translate("crm.contact.filter.before_this_month")}
          value={{
            "last_seen@gte": undefined,
            "last_seen@lte": startOfMonth(new Date()).toISOString(),
          }}
        />
        <ToggleFilterButton
          className="w-full justify-between"
          label={translate("crm.contact.filter.before_last_month")}
          value={{
            "last_seen@gte": undefined,
            "last_seen@lte": subMonths(
              startOfMonth(new Date()),
              1,
            ).toISOString(),
          }}
        />
      </FilterCategory>

      <FilterCategory
        label={translate("crm.contact.filter.engagement")}
        icon={<Activity />}
      >
        <ToggleFilterButton
          className="w-full justify-between"
          label={translate("crm.contact.filter.engagement_status.strong")}
          value={{ internal_heartbeat_status: "strong" }}
        />
        <ToggleFilterButton
          className="w-full justify-between"
          label={translate("crm.contact.filter.engagement_status.active")}
          value={{ internal_heartbeat_status: "active" }}
        />
        <ToggleFilterButton
          className="w-full justify-between"
          label={translate("crm.contact.filter.engagement_status.cooling")}
          value={{ internal_heartbeat_status: "cooling" }}
        />
        <ToggleFilterButton
          className="w-full justify-between"
          label={translate("crm.contact.filter.engagement_status.cold")}
          value={{ internal_heartbeat_status: "cold" }}
        />
        <ToggleFilterButton
          className="w-full justify-between"
          label={translate("crm.contact.filter.engagement_status.dormant")}
          value={{ internal_heartbeat_status: "dormant" }}
        />
      </FilterCategory>

      <FilterCategory
        label={translate("crm.contact.filter.validation")}
        icon={<HeartPulse />}
      >
        <ToggleFilterButton
          className="w-full justify-between"
          label={translate("crm.contact.filter.validation_status.valid")}
          value={{ email_validation_status: "valid" }}
        />
        <ToggleFilterButton
          className="w-full justify-between"
          label={translate("crm.contact.filter.validation_status.risky")}
          value={{ email_validation_status: "risky" }}
        />
        <ToggleFilterButton
          className="w-full justify-between"
          label={translate("crm.contact.filter.validation_status.invalid")}
          value={{ email_validation_status: "invalid" }}
        />
      </FilterCategory>

      <FilterCategory
        label={translate("crm.filter.status")}
        icon={<TrendingUp />}
      >
        {noteStatuses.map((status) => (
          <ToggleFilterButton
            key={status.value}
            className="w-full justify-between"
            label={
              <span>
                {translateChoice(
                  translate,
                  "crm.note.status",
                  status.value,
                  status.label,
                )}{" "}
                <Status status={status.value} />
              </span>
            }
            value={{ status: status.value }}
          />
        ))}
      </FilterCategory>

      <FilterCategory
        label={translate("crm.contact.filter.tags")}
        icon={<Tag />}
      >
        {data &&
          data.map((record) => (
            <ToggleFilterButton
              className="w-full justify-between"
              key={record.id}
              label={
                <Badge
                  variant="secondary"
                  className="text-black text-xs font-normal cursor-pointer"
                  style={{
                    backgroundColor: record?.color,
                  }}
                >
                  {record?.name}
                </Badge>
              }
              value={{ "tags@cs": `{${record.id}}` }}
            />
          ))}
      </FilterCategory>

      <FilterCategory
        icon={<CheckSquare />}
        label={translate("crm.contact.filter.tasks")}
      >
        <ToggleFilterButton
          className="w-full justify-between"
          label={translate("crm.contact.filter.with_pending_tasks")}
          value={{ "nb_tasks@gt": 0 }}
        />
      </FilterCategory>

      <FilterCategory
        icon={<Users />}
        label={translate("crm.contact.filter.account_manager")}
      >
        <ToggleFilterButton
          className="w-full justify-between"
          label={translate("crm.contact.filter.me")}
          value={{ sales_id: identity?.id }}
        />
      </FilterCategory>
    </div>
  );
};
