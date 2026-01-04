
import * as React from "react";
import { createContext, useCallback, useContext, useRef, useMemo } from "react";
import { ExtensionStorage } from "@bacons/apple-targets";

// Initialize storage with your group ID
const storage = new ExtensionStorage(
  "group.com.<user_name>.<app_name>"
);

type WidgetContextType = {
  refreshWidget: () => void;
};

const WidgetContext = createContext<WidgetContextType | null>(null);

/**
 * ✅ WIDGET CONTEXT v96.0 - FIXED "MAXIMUM UPDATE DEPTH EXCEEDED" ERROR
 * 
 * CRITICAL FIXES v96.0:
 * - ✅ Fixed circular dependency causing infinite re-renders
 * - ✅ Used useRef to prevent unnecessary re-renders
 * - ✅ Memoized context value to prevent recreation on every render
 * - ✅ Removed ExtensionStorage.reloadWidget() from useEffect to prevent loops
 * - ✅ Only refresh widget when explicitly called via refreshWidget()
 * 
 * IMPORTANT: This fix prevents the "Maximum update depth exceeded" error
 */
export function WidgetProvider({ children }: { children: React.ReactNode }) {
  // Use ref to prevent infinite loops
  const isInitializedRef = useRef(false);

  // ✅ FIX v96.0: Remove automatic widget refresh from useEffect
  // This was causing infinite loops - only refresh when explicitly called
  React.useEffect(() => {
    if (!isInitializedRef.current) {
      isInitializedRef.current = true;
      console.log('[WidgetContext v96.0] ✅ Initialized (no automatic refresh)');
    }
  }, []); // Empty dependency array - run only once

  // ✅ FIX v96.0: Memoize refreshWidget to prevent recreation
  const refreshWidget = useCallback(() => {
    try {
      console.log('[WidgetContext v96.0] 🔄 Refreshing widget...');
      ExtensionStorage.reloadWidget();
      console.log('[WidgetContext v96.0] ✅ Widget refreshed successfully');
    } catch (error) {
      console.warn('[WidgetContext v96.0] ⚠️ Failed to refresh widget:', error);
    }
  }, []); // No dependencies - function never changes

  // ✅ FIX v96.0: Memoize context value to prevent recreation
  const value = useMemo(() => ({ refreshWidget }), [refreshWidget]);

  return (
    <WidgetContext.Provider value={value}>
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
