import { useState, useEffect, useMemo } from "react";
import {
  I18nContextProvider,
  CoreAdminContext,
  localStorageStore,
} from "ra-core";
import { CRM } from "@/components/atomic-crm/root/CRM";
import { SetupWizard } from "@/components/atomic-crm/setup/SetupWizard";
import { isSupabaseConfigured } from "@/lib/supabase-config";
import {
  MigrationBanner,
  MigrationModal,
} from "@/components/atomic-crm/migration";
import {
  checkMigrationStatus,
  isMigrationReminderDismissed,
  type MigrationStatus,
} from "@/lib/migration-check";
import { supabase } from "@/components/atomic-crm/providers/supabase/supabase";
import { MigrationProvider } from "@/contexts/MigrationContext";
import { i18nProvider } from "@/components/atomic-crm/root/i18nProvider";
import { ThemeProvider } from "@/components/admin/theme-provider";
import { ThemeModeToggle } from "@/components/admin/theme-mode-toggle";
import { LocalesMenuButton } from "@/components/admin/locales-menu-button";
import {
  defaultDarkModeLogo,
  defaultLightModeLogo,
  defaultTitle,
} from "./components/atomic-crm/root/defaultConfiguration";

/**
 * Application entry point
 *
 * Customize RealTimeX CRM by passing props to the CRM component:
 *  - contactGender
 *  - companySectors
 *  - companyLifecycleStages (NEW)
 *  - companyTypes (NEW)
 *  - companyQualificationStatuses (NEW)
 *  - companyRevenueRanges (NEW)
 *  - externalHeartbeatStatuses (NEW)
 *  - internalHeartbeatStatuses (NEW)
 *  - darkTheme
 *  - dealCategories
 *  - dealPipelineStatuses
 *  - dealStages
 *  - lightTheme
 *  - logo
 *  - noteStatuses
 *  - taskTypes
 *  - title
 * ... as well as all the props accepted by shadcn-admin-kit's <Admin> component.
 *
 * @example
 * const App = () => (
 *    <CRM
 *       logo="./img/logo.png"
 *       title="Acme CRM"
 *    />
 * );
 */

// Company lifecycle stages configuration
const companyLifecycleStages = [
  { id: "prospect", name: "Prospect" },
  { id: "customer", name: "Customer" },
  { id: "churned", name: "Churned" },
  { id: "lost", name: "Lost" },
  { id: "archived", name: "Archived" },
];

// Company type configuration
const companyTypes = [
  { id: "customer", name: "Customer" },
  { id: "prospect", name: "Prospect" },
  { id: "partner", name: "Partner" },
  { id: "vendor", name: "Vendor" },
  { id: "competitor", name: "Competitor" },
  { id: "internal", name: "Internal" },
];

// Company qualification status configuration
const companyQualificationStatuses = [
  { id: "qualified", name: "Qualified" },
  { id: "unqualified", name: "Unqualified" },
  { id: "duplicate", name: "Duplicate" },
  { id: "spam", name: "Spam" },
  { id: "test", name: "Test" },
];

// Company revenue ranges configuration
const companyRevenueRanges = [
  { id: "0-1M", name: "Under $1M" },
  { id: "1M-10M", name: "$1M - $10M" },
  { id: "10M-50M", name: "$10M - $50M" },
  { id: "50M-100M", name: "$50M - $100M" },
  { id: "100M+", name: "Over $100M" },
  { id: "unknown", name: "Unknown" },
];

// External heartbeat status configuration
const externalHeartbeatStatuses = [
  { id: "healthy", name: "Healthy", color: "#10b981" },
  { id: "risky", name: "Risky", color: "#f59e0b" },
  { id: "dead", name: "Dead", color: "#ef4444" },
  { id: "unknown", name: "Not Checked", color: "#6b7280" },
];

// Internal heartbeat status configuration
const internalHeartbeatStatuses = [
  { id: "engaged", name: "Engaged", color: "#10b981" },
  { id: "quiet", name: "Quiet", color: "#3b82f6" },
  { id: "at_risk", name: "At Risk", color: "#f59e0b" },
  { id: "unresponsive", name: "Unresponsive", color: "#ef4444" },
  { id: "unknown", name: "Unknown", color: "#6b7280" },
];

const App = () => {
  const [needsSetup, setNeedsSetup] = useState<boolean>(() => {
    // Check immediately on mount
    const configured = isSupabaseConfigured();
    return !configured;
  });

  // Migration state
  const [migrationStatus, setMigrationStatus] =
    useState<MigrationStatus | null>(null);
  const [showMigrationBanner, setShowMigrationBanner] = useState(false);
  const [showMigrationModal, setShowMigrationModal] = useState(false);
  const [suppressMigrationBanner, setSuppressMigrationBanner] = useState(false);

  // Memoize context value
  const migrationContextValue = useMemo(
    () => ({
      migrationStatus,
      showMigrationBanner,
      showMigrationModal,
      openMigrationModal: () => setShowMigrationModal(true),
      suppressMigrationBanner,
      setSuppressMigrationBanner,
    }),
    [
      migrationStatus,
      showMigrationBanner,
      showMigrationModal,
      suppressMigrationBanner,
    ],
  );

  const store = useMemo(() => localStorageStore(), []);

  // Check migration status after setup is complete
  useEffect(() => {
    if (needsSetup) return;

    const checkMigration = async () => {
      try {
        const status = await checkMigrationStatus(supabase);
        setMigrationStatus(status);

        // Show banner if migration is needed and not recently dismissed
        if (status.needsMigration && !isMigrationReminderDismissed()) {
          setShowMigrationBanner(true);
        }
      } catch (error) {
        console.error("Failed to check migration status:", error);
      }
    };

    checkMigration();
  }, [needsSetup]);

  // If Supabase is not configured, only show the setup wizard
  if (needsSetup) {
    return (
      <CoreAdminContext i18nProvider={i18nProvider} store={store}>
        <ThemeProvider>
          <div className="min-h-screen flex items-center justify-center bg-background relative">
            <div className="fixed top-4 left-4 flex items-center gap-2 z-[100]">
              <img
                className="[.light_&]:hidden h-6"
                src={defaultDarkModeLogo}
                alt={defaultTitle}
              />
              <img
                className="[.dark_&]:hidden h-6"
                src={defaultLightModeLogo}
                alt={defaultTitle}
              />
              <h1 className="text-xl font-semibold text-foreground">
                {defaultTitle}
              </h1>
            </div>
            <div className="fixed top-4 right-4 flex items-center gap-2 z-[100]">
              <LocalesMenuButton />
              <ThemeModeToggle />
            </div>
            <SetupWizard
              open={true}
              onComplete={() => {
                setNeedsSetup(false);
                // Will reload anyway, but update state for clarity
              }}
              canClose={false}
            />
          </div>
        </ThemeProvider>
      </CoreAdminContext>
    );
  }

  return (
    <I18nContextProvider value={i18nProvider}>
      <MigrationProvider value={migrationContextValue}>
        {/* Migration Notification (floating, top-right) */}
        {showMigrationBanner && !suppressMigrationBanner && migrationStatus && (
          <MigrationBanner
            status={migrationStatus}
            onDismiss={() => setShowMigrationBanner(false)}
            onLearnMore={() => setShowMigrationModal(true)}
          />
        )}

        {/* Migration Modal */}
        {migrationStatus && (
          <MigrationModal
            open={showMigrationModal}
            onOpenChange={setShowMigrationModal}
            status={migrationStatus}
          />
        )}

        {/* Main CRM App */}
        <CRM
          companyLifecycleStages={companyLifecycleStages}
          companyTypes={companyTypes}
          companyQualificationStatuses={companyQualificationStatuses}
          companyRevenueRanges={companyRevenueRanges}
          externalHeartbeatStatuses={externalHeartbeatStatuses}
          internalHeartbeatStatuses={internalHeartbeatStatuses}
        />
      </MigrationProvider>
    </I18nContextProvider>
  );
};

export default App;
