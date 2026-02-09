import { Link } from "react-router";
import { useTranslate } from "ra-core";

import { ReferenceField } from "@/components/ds/admin/reference-field";
import { Avatar } from "../contacts/Avatar";
import { RelativeDate } from "../misc/RelativeDate";
import { SaleName } from "../sales/SaleName";
import type { ActivityContactCreated } from "../types";
import { useActivityLogContext } from "./ActivityLogContext";

type ActivityLogContactCreatedProps = {
  activity: ActivityContactCreated;
};

export function ActivityLogContactCreated({
  activity,
}: ActivityLogContactCreatedProps) {
  const translate = useTranslate();
  const context = useActivityLogContext();
  const { contact } = activity;
  return (
    <div className="p-0">
      <div className="flex flex-row gap-2 items-center w-full">
        <Avatar width={20} height={20} record={contact} />
        <span className="text-muted-foreground text-sm inline-flex  flex-grow">
          <ReferenceField source="sales_id" reference="sales" record={activity}>
            <SaleName />
          </ReferenceField>
          &nbsp;{translate("crm.activity.added")}&nbsp;
          <Link to={`/contacts/${contact.id}/show`}>
            {contact.first_name}&nbsp;{contact.last_name}
          </Link>
          &nbsp;
          {context !== "company" && (
            <>
              {translate("crm.activity.to_company")} {activity.company_id}
            </>
          )}
        </span>
        {context === "company" && (
          <span className="text-muted-foreground text-sm">
            <RelativeDate date={activity.date} />
          </span>
        )}
      </div>
    </div>
  );
}
