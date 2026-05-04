import * as React from "react";
import { createContext, useCallback, useContext } from "react";
import { Platform } from "react-native";

type WidgetContextType = {
  refreshWidget: () => void;
};

const WidgetContext = createContext<WidgetContextType | null>(null);

export function WidgetProvider({ children }: { children: React.ReactNode }) {
  React.useEffect(() => {
    if (Platform.OS !== "ios") return;
    // Dynamically import iOS-only module to avoid Android crash
    import("@bacons/apple-targets").then(({ ExtensionStorage }) => {
      ExtensionStorage.reloadWidget();
    }).catch(() => {});
  }, []);

  const refreshWidget = useCallback(() => {
    console.log("[WidgetContext] refreshWidget called");
    if (Platform.OS !== "ios") return;
    import("@bacons/apple-targets").then(({ ExtensionStorage }) => {
      ExtensionStorage.reloadWidget();
    }).catch(() => {});
  }, []);

  return (
    <WidgetContext.Provider value={{ refreshWidget }}>
      {children}
    </WidgetContext.Provider>
  );
}

export const useWidget = () => {
  const context = useContext(WidgetContext);
  if (!context) {
    throw new Error("useWidget must be used within a WidgetProvider");
  }
  return context;
};
