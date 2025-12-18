import { useEffect, useState } from "react";
import { checkDatabaseHealth, DatabaseHealthStatus } from "@/lib/database-health-check";
import { getSupabaseConfig } from "@/lib/supabase-config";
import { DatabaseSetupGuide } from "../setup/DatabaseSetupGuide";

interface DatabaseHealthCheckProps {
  children: React.ReactNode;
}

export function DatabaseHealthCheck({ children }: DatabaseHealthCheckProps) {
  const [healthStatus, setHealthStatus] = useState<DatabaseHealthStatus | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function checkHealth() {
      try {
        const status = await checkDatabaseHealth();
        if (!cancelled) {
          setHealthStatus(status);
          setIsChecking(false);
        }
      } catch (error) {
        console.error("Failed to check database health:", error);
        if (!cancelled) {
          setIsChecking(false);
        }
      }
    }

    checkHealth();

    return () => {
      cancelled = true;
    };
  }, []);

  // Show loading state
  if (isChecking) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Checking database connection...</p>
        </div>
      </div>
    );
  }

  // Show setup guide if database is not healthy
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

  // Database is healthy, render children
  return <>{children}</>;
}
