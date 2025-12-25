import { formatDistance } from "date-fns";
import { Activity, HeartPulse } from "lucide-react";
import { useRecordContext } from "ra-core";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

import { AsideSection } from "../misc/AsideSection";
import type { Company } from "../types";

export const CompanyHealthCard = () => {
  const record = useRecordContext<Company>();
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
    <AsideSection title="Company Health">
      {/* Internal Heartbeat (Engagement) */}
      {hasInternalHealth && (
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-4 h-4 text-muted-foreground" />
            <span className="font-medium text-sm">Internal Engagement</span>
          </div>

          {record.internal_heartbeat_score !== undefined && (
            <div className="mb-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-muted-foreground">
                  Engagement Score
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
              Last activity:{" "}
              {record.days_since_last_activity === 0
                ? "Today"
                : record.days_since_last_activity === 1
                  ? "Yesterday"
                  : `${record.days_since_last_activity} days ago`}
            </div>
          )}

          {record.internal_heartbeat_updated_at && (
            <div className="text-xs text-muted-foreground mt-1">
              Updated{" "}
              {formatDistance(
                new Date(record.internal_heartbeat_updated_at),
                new Date(),
                { addSuffix: true },
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
            <span className="font-medium text-sm">External Health</span>
          </div>

          {record.external_heartbeat_status && (
            <div className="mb-2">
              <ExternalStatusBadge status={record.external_heartbeat_status} />
            </div>
          )}

          {record.external_heartbeat_checked_at && (
            <div className="text-xs text-muted-foreground">
              Last checked{" "}
              {formatDistance(
                new Date(record.external_heartbeat_checked_at),
                new Date(),
                { addSuffix: true },
              )}
            </div>
          )}
        </div>
      )}
    </AsideSection>
  );
};

const InternalStatusBadge = ({ status }: { status: string }) => {
  const statusConfig: Record<
    string,
    { variant: "default" | "secondary" | "outline" | "destructive"; label: string }
  > = {
    engaged: { variant: "default", label: "Engaged" },
    quiet: { variant: "secondary", label: "Quiet" },
    at_risk: { variant: "outline", label: "At Risk" },
    unresponsive: { variant: "destructive", label: "Unresponsive" },
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
  const statusConfig: Record<
    string,
    { variant: "default" | "secondary" | "outline" | "destructive"; label: string }
  > = {
    healthy: { variant: "default", label: "Healthy" },
    risky: { variant: "outline", label: "Risky" },
    dead: { variant: "destructive", label: "Dead" },
    unknown: { variant: "secondary", label: "Unknown" },
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