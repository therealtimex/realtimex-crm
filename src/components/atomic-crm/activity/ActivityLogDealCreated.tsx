import { Link } from "react-router";
import { useTranslate, type RaRecord } from "ra-core";

import { ReferenceField } from "@/components/ds/admin/reference-field";
import { SaleName } from "../sales/SaleName";
import { RelativeDate } from "../misc/RelativeDate";
import type { ActivityDealCreated } from "../types";
import { useActivityLogContext } from "./ActivityLogContext";

type ActivityLogDealCreatedProps = {
  activity: RaRecord & ActivityDealCreated;
};

export function ActivityLogDealCreated({
  activity,
}: ActivityLogDealCreatedProps) {
  const translate = useTranslate();
  const context = useActivityLogContext();
  const { deal } = activity;
  return (
    <div className="p-0">
      <div className="flex flex-row space-x-1 items-center w-full">
        <div className="w-5 h-5 bg-gray-300 rounded-full" />
        <div className="text-sm text-muted-foreground flex-grow">
          <span className="text-muted-foreground text-sm">
            <ReferenceField
              source="sales_id"
              reference="sales"
              record={activity}
              link={false}
            >
              <SaleName />
            </ReferenceField>
          </span>{" "}
          {translate("crm.activity.added_deal")}{" "}
          <Link to={`/deals/${deal.id}/show`}>{deal.name}</Link>{" "}
          {context !== "company" && (
            <>
              {translate("crm.activity.to_company")} {activity.company_id}{" "}
              <RelativeDate date={activity.date} />
            </>
          )}
        </div>
        {context === "company" && (
          <span className="text-muted-foreground text-sm">
            <RelativeDate date={activity.date} />
          </span>
        )}
      </div>
    </div>
  );
}
