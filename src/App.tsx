import { useState, useEffect } from "react";
import { CRM } from "@/components/atomic-crm/root/CRM";
import { SupabaseSetupWizard } from "@/components/atomic-crm/setup/SupabaseSetupWizard";
import { isSupabaseConfigured } from "@/lib/supabase-config";

/**
 * Application entry point
 *
 * Customize Atomic CRM by passing props to the CRM component:
 *  - contactGender
 *  - companySectors
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
const App = () => {
  const [needsSetup, setNeedsSetup] = useState<boolean>(() => {
    // Check immediately on mount
    const configured = isSupabaseConfigured();
    console.log('[App] Supabase configured:', configured);
    return !configured;
  });

  // If Supabase is not configured, only show the setup wizard
  if (needsSetup) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <SupabaseSetupWizard
          open={true}
          onComplete={() => {
            setNeedsSetup(false);
            // Will reload anyway, but update state for clarity
          }}
          canClose={false}
        />
      </div>
    );
  }

  return <CRM />;
};

export default App;
