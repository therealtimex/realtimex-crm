import { createContext, useContext, type ReactNode } from "react";

import type { ContactGender, DealStage, NoteStatus } from "../types";
import {
  defaultCompanySectors,
  defaultContactGender,
  defaultDarkModeLogo,
  defaultDealCategories,
  defaultDealPipelineStatuses,
  defaultDealStages,
  defaultLightModeLogo,
  defaultNoteStatuses,
  defaultTaskPriorities,
  defaultTaskStatuses,
  defaultTaskTypes,
  defaultTitle,
} from "./defaultConfiguration";

// Define types for the context value
export interface ConfigurationContextValue {
  companySectors: string[];
  companyLifecycleStages?: { id: string; name: string }[];
  companyTypes?: { id: string; name: string }[];
  companyQualificationStatuses?: { id: string; name: string }[];
  companyRevenueRanges?: { id: string; name: string }[];
  dealCategories: string[];
  dealPipelineStatuses: string[];
  dealStages: DealStage[];
  noteStatuses: NoteStatus[];
  taskTypes: string[];
  taskPriorities: { id: string; name: string }[];
  taskStatuses: { id: string; name: string }[];
  title: string;
  darkModeLogo: string;
  lightModeLogo: string;
  contactGender: ContactGender[];
  externalHeartbeatStatuses?: { id: string; name: string; color: string }[];
  internalHeartbeatStatuses?: { id: string; name: string; color: string }[];
}

export interface ConfigurationProviderProps extends ConfigurationContextValue {
  children: ReactNode;
}

// Create context with default value
export const ConfigurationContext = createContext<ConfigurationContextValue>({
  companySectors: defaultCompanySectors,
  dealCategories: defaultDealCategories,
  dealPipelineStatuses: defaultDealPipelineStatuses,
  dealStages: defaultDealStages,
  noteStatuses: defaultNoteStatuses,
  taskTypes: defaultTaskTypes,
  taskPriorities: defaultTaskPriorities,
  taskStatuses: defaultTaskStatuses,
  title: defaultTitle,
  darkModeLogo: defaultDarkModeLogo,
  lightModeLogo: defaultLightModeLogo,
  contactGender: defaultContactGender,
});

export const ConfigurationProvider = ({
  children,
  companySectors,
  companyLifecycleStages,
  companyTypes,
  companyQualificationStatuses,
  companyRevenueRanges,
  dealCategories,
  dealPipelineStatuses,
  dealStages,
  darkModeLogo,
  lightModeLogo,
  noteStatuses,
  taskTypes,
  taskPriorities,
  taskStatuses,
  title,
  contactGender,
  externalHeartbeatStatuses,
  internalHeartbeatStatuses,
}: ConfigurationProviderProps) => (
  <ConfigurationContext.Provider
    value={{
      companySectors,
      companyLifecycleStages,
      companyTypes,
      companyQualificationStatuses,
      companyRevenueRanges,
      dealCategories,
      dealPipelineStatuses,
      dealStages,
      darkModeLogo,
      lightModeLogo,
      noteStatuses,
      title,
      taskTypes,
      taskPriorities,
      taskStatuses,
      contactGender,
      externalHeartbeatStatuses,
      internalHeartbeatStatuses,
    }}
  >
    {children}
  </ConfigurationContext.Provider>
);

export const useConfigurationContext = () => useContext(ConfigurationContext);
