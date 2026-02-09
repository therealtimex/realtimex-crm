import { Card, CardContent, CardHeader, CardTitle } from "@/components/ds/ui/card";
import { useTranslate } from "ra-core";

export const Welcome = () => {
  const translate = useTranslate();
  return (
    <Card>
      <CardHeader className="px-4">
        <CardTitle>{translate("crm.dashboard.welcome.title")}</CardTitle>
      </CardHeader>
      <CardContent className="px-4">
        <p className="text-sm mb-4">
          <a
            href="https://github.com/therealtimex/realtimex-crm"
            className="underline hover:no-underline"
          >
            RealTimeX CRM
          </a>{" "}
          {translate("crm.dashboard.welcome.body_1")}
        </p>
        <p className="text-sm mb-4">
          {translate("crm.dashboard.welcome.body_2")}
        </p>
        <p className="text-sm">
          {translate("crm.dashboard.welcome.powered_by")}{" "}
          <a
            href="https://marmelab.com/shadcn-admin-kit"
            className="underline hover:no-underline"
          >
            shadcn-admin-kit
          </a>
          {translate("crm.dashboard.welcome.fork_of")}{" "}
          <a
            href="https://github.com/marmelab/atomic-crm"
            className="underline hover:no-underline"
          >
            Atomic CRM
          </a>{" "}
          {translate("crm.dashboard.welcome.by_marmelab")}
        </p>
      </CardContent>
    </Card>
  );
};
