import { CreateButton } from "@/components/ds/admin/create-button";
import { useTranslate } from "ra-core";

import useAppBarHeight from "../misc/useAppBarHeight";
import { ContactImportButton } from "./ContactImportButton";

export const ContactEmpty = () => {
  const appbarHeight = useAppBarHeight();
  const translate = useTranslate();
  return (
    <div
      className="flex flex-col justify-center items-center gap-3"
      style={{
        height: `calc(100dvh - ${appbarHeight}px)`,
      }}
    >
      <img src="./img/empty.svg" alt={translate("crm.contact.empty.title")} />
      <div className="flex flex-col gap-0 items-center">
        <h6 className="text-lg font-bold">
          {translate("crm.contact.empty.title")}
        </h6>
        <p className="text-sm text-muted-foreground text-center mb-4">
          {translate("crm.contact.empty.description")}
        </p>
      </div>
      <div className="flex flex-row gap-2">
        <CreateButton label={translate("crm.contact.action.create")} />
        <ContactImportButton />
      </div>
    </div>
  );
};
