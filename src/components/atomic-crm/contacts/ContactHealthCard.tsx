import { formatDistance } from "date-fns";
import { Activity, HeartPulse, Mail, Linkedin } from "lucide-react";
import { useRecordContext, useTranslate, useLocale } from "ra-core";
import { Badge } from "@/components/ds/ui/badge";
import { Progress } from "@/components/ds/ui/progress";

import { AsideSection } from "../misc/AsideSection";
import type { Contact } from "../types";
import { getDateFnsLocale } from "@/i18n/date-fns";

const InternalStatusBadge = ({ status }: { status: string }) => {
  const translate = useTranslate();
  let variant:
    | "default"
    | "secondary"
    | "destructive"
    | "outline"
    | "success"
    | "warning"
    | "info"
    | "critical"
    | "neutral" = "outline";

  switch (status) {
    case "strong":
      variant = "default";
      break;
    case "active":
      variant = "success";
      break;
    case "cooling":
      variant = "warning";
      break;
    case "cold":
      variant = "warning";
      break;
    case "dormant":
      variant = "neutral";
      break;
  }

  return (
    <Badge variant={variant}>
      {translate(`crm.contact.filter.engagement_status.${status}`, {
        _: status,
      })}
    </Badge>
  );
};

const EmailStatusBadge = ({ status }: { status: string }) => {
  const translate = useTranslate();
  let variant:
    | "default"
    | "secondary"
    | "destructive"
    | "outline"
    | "success"
    | "warning"
    | "info"
    | "critical"
    | "neutral" = "outline";

  switch (status) {
    case "valid":
      variant = "success";
      break;
    case "risky":
      variant = "warning";
      break;
    case "invalid":
      variant = "critical";
      break;
  }

  return (
    <Badge variant={variant}>
      {translate(`crm.contact.health.status.${status}`, { _: status })}
    </Badge>
  );
};

const LinkedInStatusBadge = ({ status }: { status: string }) => {
  const translate = useTranslate();
  let variant:
    | "default"
    | "secondary"
    | "destructive"
    | "outline"
    | "success"
    | "warning"
    | "info"
    | "critical"
    | "neutral" = "outline";

  switch (status) {
    case "active":
      variant = "info";
      break;
    case "inactive":
      variant = "neutral";
      break;
    case "not_found":
      variant = "critical";
      break;
  }

  return (
    <Badge variant={variant}>
      {translate(`crm.contact.health.status.${status}`, {
        _: status
          .split("_")
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" "),
      })}
    </Badge>
  );
};

export const ContactHealthCard = () => {
  const record = useRecordContext<Contact>();
  const translate = useTranslate();
  const locale = useLocale();

  if (!record) return null;

  const daysSince =
    record.days_since_last_activity ??
    (record.last_seen
      ? Math.floor(
          (new Date().getTime() - new Date(record.last_seen).getTime()) /
            (1000 * 60 * 60 * 24),
        )
      : undefined);

  const hasInternalHealth =
    record.internal_heartbeat_score != null ||
    record.internal_heartbeat_status != null ||
    daysSince != null;

  const hasExternalHealth =
    record.external_heartbeat_status != null ||
    record.email_validation_status != null ||
    record.linkedin_profile_status != null;

  return (
    <AsideSection title={translate("crm.contact.health.title")}>
      {!hasInternalHealth && !hasExternalHealth && (
        <div className="text-xs text-muted-foreground italic">
          {translate("crm.contact.health.no_data")}
        </div>
      )}

      {/* Internal Heartbeat (Relationship Strength) */}
      {hasInternalHealth && (
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-4 h-4 text-muted-foreground" />
            <span className="font-medium text-sm">
              {translate("crm.contact.health.relationship_strength")}
            </span>
          </div>

          {record.internal_heartbeat_score != null && (
            <div className="mb-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-muted-foreground">
                  {translate("crm.contact.health.engagement_score")}
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
              {translate("crm.contact.health.last_activity")}
              {daysSince === 0
                ? translate("crm.contact.health.today")
                : daysSince === 1
                  ? translate("crm.contact.health.yesterday")
                  : translate("crm.contact.health.days_ago", {
                      days: daysSince,
                    })}
            </div>
          )}
        </div>
      )}

      {/* External Heartbeat (Contact Validation) */}
      {hasExternalHealth && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <HeartPulse className="w-4 h-4 text-muted-foreground" />
            <span className="font-medium text-sm">
              {translate("crm.contact.health.contact_validation")}
            </span>
          </div>

          {record.email_validation_status && (
            <div className="flex items-center gap-2 mb-2">
              <Mail className="w-3 h-3 text-muted-foreground" />
              <EmailStatusBadge status={record.email_validation_status} />
              {record.email_last_bounced_at && (
                <span className="text-xs text-destructive">
                  {translate("crm.contact.health.bounced")}
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
              {translate("crm.contact.health.validated")}{" "}
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
