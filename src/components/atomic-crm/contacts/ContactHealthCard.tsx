import { formatDistance } from "date-fns";
import { Activity, HeartPulse, Mail, Linkedin } from "lucide-react";
import { useRecordContext } from "ra-core";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

import { AsideSection } from "../misc/AsideSection";
import type { Contact } from "../types";

const InternalStatusBadge = ({ status }: { status: string }) => {
  let variant: "default" | "secondary" | "destructive" | "outline" = "outline";
  let className = "";

  switch (status) {
    case "strong":
      variant = "default";
      break;
    case "active":
      variant = "secondary"; 
      className = "bg-green-100 text-green-800 hover:bg-green-100";
      break;
    case "cooling":
      variant = "secondary";
      className = "bg-yellow-100 text-yellow-800 hover:bg-yellow-100";
      break;
    case "cold":
      variant = "secondary";
      className = "bg-orange-100 text-orange-800 hover:bg-orange-100";
      break;
    case "dormant":
      variant = "secondary";
      break;
  }

  return (
    <Badge variant={variant} className={className}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
};

const EmailStatusBadge = ({ status }: { status: string }) => {
  let variant: "default" | "secondary" | "destructive" | "outline" = "outline";
  let className = "";

  switch (status) {
    case "valid":
      variant = "secondary";
      className = "bg-green-100 text-green-800 hover:bg-green-100";
      break;
    case "risky":
      variant = "secondary";
      className = "bg-yellow-100 text-yellow-800 hover:bg-yellow-100";
      break;
    case "invalid":
      variant = "destructive";
      break;
  }

  return (
    <Badge variant={variant} className={className}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
};

const LinkedInStatusBadge = ({ status }: { status: string }) => {
  let variant: "default" | "secondary" | "destructive" | "outline" = "outline";
  let className = "";

  switch (status) {
    case "active":
      variant = "default";
      className = "bg-[#0077b5] hover:bg-[#0077b5]"; // LinkedIn Blue
      break;
    case "inactive":
      variant = "secondary";
      break;
    case "not_found":
      variant = "destructive";
      break;
  }

  return (
    <Badge variant={variant} className={className}>
      {status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
    </Badge>
  );
};

export const ContactHealthCard = () => {
  const record = useRecordContext<Contact>();
  if (!record) return null;

  const daysSince = record.days_since_last_activity ?? 
    (record.last_seen ? Math.floor((new Date().getTime() - new Date(record.last_seen).getTime()) / (1000 * 60 * 60 * 24)) : undefined);

  const hasInternalHealth =
    record.internal_heartbeat_score != null ||
    record.internal_heartbeat_status != null ||
    daysSince != null;

  const hasExternalHealth =
    record.external_heartbeat_status != null ||
    record.email_validation_status != null ||
    record.linkedin_profile_status != null;

  return (
    <AsideSection title="Contact Health">
      {!hasInternalHealth && !hasExternalHealth && (
        <div className="text-xs text-muted-foreground italic">
          No health data calculated yet.
        </div>
      )}

      {/* Internal Heartbeat (Relationship Strength) */}
      {hasInternalHealth && (
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-4 h-4 text-muted-foreground" />
            <span className="font-medium text-sm">Relationship Strength</span>
          </div>

          {record.internal_heartbeat_score != null && (
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

          {daysSince != null && (
            <div className="text-xs text-muted-foreground">
              Last activity:{" "}
              {daysSince === 0
                ? "Today"
                : daysSince === 1
                  ? "Yesterday"
                  : `${daysSince} days ago`}
            </div>
          )}
        </div>
      )}

      {/* External Heartbeat (Contact Validation) */}
      {hasExternalHealth && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <HeartPulse className="w-4 h-4 text-muted-foreground" />
            <span className="font-medium text-sm">Contact Validation</span>
          </div>

          {record.email_validation_status && (
            <div className="flex items-center gap-2 mb-2">
              <Mail className="w-3 h-3 text-muted-foreground" />
              <EmailStatusBadge status={record.email_validation_status} />
              {record.email_last_bounced_at && (
                <span className="text-xs text-destructive">
                  (bounced)
                </span>
              )}
            </div>
          )}

          {record.linkedin_profile_status && (
            <div className="flex items-center gap-2 mb-2">
              <Linkedin className="w-3 h-3 text-muted-foreground" />
              <LinkedInStatusBadge status={record.linkedin_profile_status} />
            </div>
          )}

          {record.external_heartbeat_checked_at && (
            <div className="text-xs text-muted-foreground">
              Validated{" "}
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
