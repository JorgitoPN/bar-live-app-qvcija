
import * as React from "react";
import { createContext, useCallback, useContext, useRef } from "react";
import { ExtensionStorage } from "@bacons/apple-targets";

// Initialize storage with your group ID
const storage = new ExtensionStorage(
  "group.com.<user_name>.<app_name>"
);

type WidgetContextType = {
  refreshWidget: () => void;
};

const WidgetContext = createContext<WidgetContextType | null>(null);

export function WidgetProvider({ children }: { children: React.ReactNode }) {
  // ✅ FIX: Use ref to prevent infinite loops
  const hasInitialized = useRef(false);

  // Update widget state whenever what we want to show changes
  React.useEffect(() => {
    // ✅ FIX: Only run once on mount
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    // set widget_state to null if we want to reset the widget
    // storage.set("widget_state", null);

    // Refresh widget
    try {
      ExtensionStorage.reloadWidget();
    } catch (error) {
      console.log('[WidgetContext] Widget reload skipped (iOS only feature)');
    }
  }, []); // ✅ FIX: Empty dependency array

  const refreshWidget = useCallback(() => {
    try {
      ExtensionStorage.reloadWidget();
    } catch (error) {
      console.log('[WidgetContext] Widget reload skipped (iOS only feature)');
    }
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
