import { formatDistance } from "date-fns";
import { Activity, HeartPulse } from "lucide-react";
import { useRecordContext, useTranslate, useLocale } from "ra-core";
import { Badge } from "@/components/ds/ui/badge";
import { Progress } from "@/components/ds/ui/progress";

import { AsideSection } from "../misc/AsideSection";
import type { Company } from "../types";
import { getDateFnsLocale } from "@/i18n/date-fns";

export const CompanyHealthCard = () => {
  const record = useRecordContext<Company>();
  const translate = useTranslate();
  const locale = useLocale();
  if (!record) return null;

  const hasInternalHealth =
    record.internal_heartbeat_score !== undefined ||
    record.internal_heartbeat_status ||
    record.days_since_last_activity !== undefined;

  const hasExternalHealth =
    record.external_heartbeat_status || record.external_heartbeat_checked_at;

  if (!hasInternalHealth && !hasExternalHealth) {
    return null;
  }

  return (
    <AsideSection title={translate("crm.company.health.title")}>
      {/* Internal Heartbeat (Engagement) */}
      {hasInternalHealth && (
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-4 h-4 text-muted-foreground" />
            <span className="font-medium text-sm">
              {translate("crm.company.health.internal_engagement")}
            </span>
          </div>

          {record.internal_heartbeat_score !== undefined && (
            <div className="mb-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-muted-foreground">
                  {translate("crm.company.health.engagement_score")}
                </span>
                <span className="text-xs font-medium">
                  {record.internal_heartbeat_score}/100
                </span>
              </div>
              <Progress
                value={record.internal_heartbeat_score}
                className="h-2"
              />
            </div>
          )}

          {record.internal_heartbeat_status && (
            <div className="mb-2">
              <InternalStatusBadge status={record.internal_heartbeat_status} />
            </div>
          )}

          {record.days_since_last_activity !== undefined && (
            <div className="text-xs text-muted-foreground">
              {translate("crm.company.health.last_activity")}{" "}
              {record.days_since_last_activity === 0
                ? translate("crm.company.health.today")
                : record.days_since_last_activity === 1
                  ? translate("crm.company.health.yesterday")
                  : translate("crm.company.health.days_ago", {
                      days: record.days_since_last_activity,
                    })}
            </div>
          )}

          {record.internal_heartbeat_updated_at && (
            <div className="text-xs text-muted-foreground mt-1">
              {translate("crm.company.health.updated")}{" "}
              {formatDistance(
                new Date(record.internal_heartbeat_updated_at),
                new Date(),
                {
                  addSuffix: true,
                  locale: getDateFnsLocale(locale),
                },
              )}
            </div>
          )}
        </div>
      )}

      {/* External Heartbeat (Entity Health) */}
      {hasExternalHealth && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <HeartPulse className="w-4 h-4 text-muted-foreground" />
            <span className="font-medium text-sm">
              {translate("crm.company.health.external_health")}
            </span>
          </div>

          {record.external_heartbeat_status && (
            <div className="mb-2">
              <ExternalStatusBadge status={record.external_heartbeat_status} />
            </div>
          )}

          {record.external_heartbeat_checked_at && (
            <div className="text-xs text-muted-foreground">
              {translate("crm.company.health.last_checked")}{" "}
              {formatDistance(
                new Date(record.external_heartbeat_checked_at),
                new Date(),
                {
                  addSuffix: true,
                  locale: getDateFnsLocale(locale),
                },
              )}
            </div>
          )}
        </div>
      )}
    </AsideSection>
  );
};

const InternalStatusBadge = ({ status }: { status: string }) => {
  const translate = useTranslate();
  const statusConfig: Record<
    string,
    {
      variant: "default" | "secondary" | "outline" | "destructive";
      label: string;
    }
  > = {
    engaged: {
      variant: "default",
      label: translate("crm.company.health.status.engaged"),
    },
    quiet: {
      variant: "secondary",
      label: translate("crm.company.health.status.quiet"),
    },
    at_risk: {
      variant: "outline",
      label: translate("crm.company.health.status.at_risk"),
    },
    unresponsive: {
      variant: "destructive",
      label: translate("crm.company.health.status.unresponsive"),
    },
  };

  const config = statusConfig[status] || {
    variant: "outline" as const,
    label: status,
  };

  return (
    <Badge variant={config.variant} className="text-xs">
      {config.label}
    </Badge>
  );
};

const ExternalStatusBadge = ({ status }: { status: string }) => {
  const translate = useTranslate();
  const statusConfig: Record<
    string,
    {
      variant: "default" | "secondary" | "outline" | "destructive";
      label: string;
    }
  > = {
    healthy: {
      variant: "default",
      label: translate("crm.company.health.status.healthy"),
    },
    risky: {
      variant: "outline",
      label: translate("crm.company.health.status.risky"),
    },
    dead: {
      variant: "destructive",
      label: translate("crm.company.health.status.dead"),
    },
    unknown: {
      variant: "secondary",
      label: translate("crm.company.health.status.unknown"),
    },
  };

  const config = statusConfig[status] || {
    variant: "outline" as const,
    label: status,
  };

  return (
    <Badge variant={config.variant} className="text-xs">
      {config.label}
    </Badge>
  );
};
