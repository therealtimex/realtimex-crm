import type { WizardState, WizardAction } from "./types";

const MAX_LOGS = 500; // Prevent memory issues with too many logs

export const initialState: WizardState = {
  step: "welcome",
  setupType: null,
  managed: {
    accessToken: "",
    organizations: [],
    selectedOrgId: null,
    projectName: "RealTimeX-CRM",
    region: "us-east-1",
    provisioningResult: null,
  },
  manual: {
    url: "",
    anonKey: "",
    projectId: "",
  },
  logs: [],
  error: null,
  fetchingOrgs: false,
  provisioning: false,
  validating: false,
  migrating: false,
  migrationComplete: false,
};

export function wizardReducer(
  state: WizardState,
  action: WizardAction,
): WizardState {
  switch (action.type) {
    case "SET_STEP":
      return {
        ...state,
        step: action.payload,
        error: null,
      };

    case "SET_SETUP_TYPE":
      return {
        ...state,
        setupType: action.payload,
      };

    case "SET_ACCESS_TOKEN":
      return {
        ...state,
        managed: {
          ...state.managed,
          accessToken: action.payload,
        },
      };

    case "SET_ORGANIZATIONS":
      return {
        ...state,
        managed: {
          ...state.managed,
          organizations: action.payload,
          selectedOrgId:
            action.payload.length > 0 ? action.payload[0].id : null,
        },
      };

    case "SET_SELECTED_ORG":
      return {
        ...state,
        managed: {
          ...state.managed,
          selectedOrgId: action.payload,
        },
      };

    case "SET_PROJECT_NAME":
      return {
        ...state,
        managed: {
          ...state.managed,
          projectName: action.payload,
        },
      };

    case "SET_REGION":
      return {
        ...state,
        managed: {
          ...state.managed,
          region: action.payload,
        },
      };

    case "SET_PROVISIONING_RESULT":
      return {
        ...state,
        managed: {
          ...state.managed,
          provisioningResult: action.payload,
        },
        manual: {
          ...state.manual,
          url: action.payload.url,
          anonKey: action.payload.anonKey,
          projectId: action.payload.projectId,
        },
      };

    case "SET_MANUAL_URL":
      return {
        ...state,
        manual: {
          ...state.manual,
          url: action.payload,
        },
      };

    case "SET_MANUAL_ANON_KEY":
      return {
        ...state,
        manual: {
          ...state.manual,
          anonKey: action.payload,
        },
      };

    case "SET_MANUAL_PROJECT_ID":
      return {
        ...state,
        manual: {
          ...state.manual,
          projectId: action.payload,
        },
      };

    case "ADD_LOG": {
      const logEntry =
        "timestamp" in action.payload
          ? action.payload
          : { ...action.payload, timestamp: Date.now() };
      return {
        ...state,
        logs: [...state.logs, logEntry].slice(-MAX_LOGS),
      };
    }

    case "CLEAR_LOGS":
      return {
        ...state,
        logs: [],
      };

    case "SET_ERROR":
      return {
        ...state,
        error: action.payload,
      };

    case "SET_FETCHING_ORGS":
      return {
        ...state,
        fetchingOrgs: action.payload,
      };

    case "SET_PROVISIONING":
      return {
        ...state,
        provisioning: action.payload,
      };

    case "SET_VALIDATING":
      return {
        ...state,
        validating: action.payload,
      };

    case "SET_MIGRATING":
      return {
        ...state,
        migrating: action.payload,
      };

    case "SET_MIGRATION_COMPLETE":
      return {
        ...state,
        migrationComplete: action.payload,
      };

    default:
      return state;
  }
}
