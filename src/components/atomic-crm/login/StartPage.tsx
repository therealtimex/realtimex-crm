import { useQuery } from "@tanstack/react-query";
import { useDataProvider } from "ra-core";
import { Navigate } from "react-router-dom";
import { LoginPage } from "@/components/admin/login-page";
import { checkDatabaseHealth } from "@/lib/database-health-check";
import { getSupabaseConfig } from "@/lib/supabase-config";
import { DatabaseSetupGuide } from "../setup/DatabaseSetupGuide";

import type { CrmDataProvider } from "../providers/types";
import { LoginSkeleton } from "./LoginSkeleton";

export const StartPage = () => {
  const dataProvider = useDataProvider<CrmDataProvider>();

  // First check database health
  const {
    data: healthStatus,
    error: healthError,
    isPending: isCheckingHealth,
  } = useQuery({
    queryKey: ["database-health"],
    queryFn: checkDatabaseHealth,
  });

  // Then check if initialized (only if database is healthy)
  const {
    data: isInitialized,
    error: initError,
    isPending: isCheckingInit,
  } = useQuery({
    queryKey: ["init"],
    queryFn: async () => {
      return dataProvider.isInitialized();
    },
    enabled: healthStatus?.isHealthy === true,
  });

  // Show loading state
  if (isCheckingHealth || isCheckingInit) return <LoginSkeleton />;

  // Show database setup guide if schema is missing
  if (healthStatus && !healthStatus.isHealthy) {
    const config = getSupabaseConfig();
    if (config) {
      return (
        <DatabaseSetupGuide
          missingTables={healthStatus.missingTables}
          supabaseUrl={config.url}
        />
      );
    }
  }

  // Show login page if there's an error or already initialized
  if (healthError || initError || isInitialized) return <LoginPage />;

  // Not initialized yet, go to signup
  return <Navigate to="/sign-up" />;
};
