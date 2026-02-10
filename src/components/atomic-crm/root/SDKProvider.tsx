import React, { createContext, useContext, useEffect, useState } from "react";
import axios from "axios";

type SDKStatus = "connected" | "disconnected" | "connecting";

interface SDKContextType {
  sdkStatus: SDKStatus;
  isAvailable: boolean;
}

const SDKContext = createContext<SDKContextType | undefined>(undefined);

export const SDKProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [sdkStatus, setSdkStatus] = useState<SDKStatus>("connecting");
  const [isAvailable, setIsAvailable] = useState(false);

  useEffect(() => {
    let pollTimer: any = null;

    const checkStatus = async () => {
      try {
        const response = await axios.get("/api/sdk/status");
        const available = response.data.available;

        setIsAvailable(available);
        setSdkStatus(available ? "connected" : "disconnected");
      } catch (error) {
        setSdkStatus("disconnected");
        setIsAvailable(false);
      }

      // Poll every 10 seconds
      pollTimer = setTimeout(checkStatus, 10000);
    };

    checkStatus();

    return () => {
      if (pollTimer) clearTimeout(pollTimer);
    };
  }, []);

  return (
    <SDKContext.Provider value={{ sdkStatus, isAvailable }}>
      {children}
    </SDKContext.Provider>
  );
};

export const useSDK = () => {
  const context = useContext(SDKContext);
  if (context === undefined) {
    throw new Error("useSDK must be used within a SDKProvider");
  }
  return context;
};
