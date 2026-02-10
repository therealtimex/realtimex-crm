export interface SetupWizardProps {
  onComplete: () => void;
  open?: boolean;
  canClose?: boolean;
}

export type WizardStep =
  | "welcome"
  | "type"
  | "managed-token"
  | "managed-org"
  | "provisioning"
  | "credentials"
  | "validating"
  | "migration"
  | "success";

export interface Organization {
  id: string;
  name: string;
}

export interface SSEEvent {
  type:
    | "info"
    | "error"
    | "success"
    | "project_id"
    | "done"
    | "stdout"
    | "stderr";
  data: any;
}

export interface ProvisioningResult {
  url: string;
  anonKey: string;
  projectId: string;
  dbPass: string;
}

export interface LogEntry {
  type: "info" | "error" | "success" | "stdout" | "stderr";
  message: string;
  timestamp: number;
}

export interface WizardState {
  step: WizardStep;
  setupType: "managed" | "manual" | null;
  managed: {
    accessToken: string;
    organizations: Organization[];
    selectedOrgId: string | null;
    projectName: string;
    region: string;
    provisioningResult: ProvisioningResult | null;
  };
  manual: {
    url: string;
    anonKey: string;
    projectId: string;
  };
  logs: LogEntry[];
  error: string | null;
  fetchingOrgs: boolean;
  provisioning: boolean;
  validating: boolean;
  migrating: boolean;
  migrationComplete: boolean;
}

export type WizardAction =
  | { type: "SET_STEP"; payload: WizardStep }
  | { type: "SET_SETUP_TYPE"; payload: "managed" | "manual" }
  | { type: "SET_ACCESS_TOKEN"; payload: string }
  | { type: "SET_ORGANIZATIONS"; payload: Organization[] }
  | { type: "SET_SELECTED_ORG"; payload: string }
  | { type: "SET_PROJECT_NAME"; payload: string }
  | { type: "SET_REGION"; payload: string }
  | { type: "SET_PROVISIONING_RESULT"; payload: ProvisioningResult }
  | { type: "SET_MANUAL_URL"; payload: string }
  | { type: "SET_MANUAL_ANON_KEY"; payload: string }
  | { type: "SET_MANUAL_PROJECT_ID"; payload: string }
  | {
      type: "ADD_LOG";
      payload: LogEntry | { type: LogEntry["type"]; message: string };
    }
  | { type: "CLEAR_LOGS" }
  | { type: "SET_ERROR"; payload: string | null }
  | { type: "SET_FETCHING_ORGS"; payload: boolean }
  | { type: "SET_PROVISIONING"; payload: boolean }
  | { type: "SET_VALIDATING"; payload: boolean }
  | { type: "SET_MIGRATING"; payload: boolean }
  | { type: "SET_MIGRATION_COMPLETE"; payload: boolean };
