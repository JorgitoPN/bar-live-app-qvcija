
import * as React from "react";
import { createContext, useCallback, useContext, useMemo, useRef, useEffect } from "react";
import { ExtensionStorage } from "@bacons/apple-targets";

const storage = new ExtensionStorage("group.com.<user_name>.<app_name>");

type WidgetContextType = {
  refreshWidget: () => void;
};

const WidgetContext = createContext<WidgetContextType | null>(null);

/**
 * ✅ WIDGET CONTEXT v100.0 - MAXIMUM UPDATE DEPTH FIX
 * 
 * CRITICAL FIXES v100.0:
 * - ✅ Fixed "Maximum update depth exceeded" error by preventing concurrent refreshes
 * - ✅ Added debouncing to widget refresh calls (1 second)
 * - ✅ Memoized context value to prevent recreation on every render
 * - ✅ Added mounted check to prevent state updates after unmount
 * - ✅ Proper cleanup in useEffect
 */

export function WidgetProvider({ children }: { children: React.ReactNode }) {
  // 🔥 FIX: Prevent multiple refresh calls
  const isRefreshingRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    
    // Initial widget refresh
    if (!isRefreshingRef.current) {
      isRefreshingRef.current = true;
      ExtensionStorage.reloadWidget();
      setTimeout(() => {
        if (mountedRef.current) {
          isRefreshingRef.current = false;
        }
      }, 1000);
    }

    return () => {
      mountedRef.current = false;
    };
  }, []);

  const refreshWidget = useCallback(() => {
    if (isRefreshingRef.current || !mountedRef.current) {
      console.log('[WidgetContext v100.0] Refresh already in progress or unmounted, skipping...');
      return;
    }
    
    isRefreshingRef.current = true;
    ExtensionStorage.reloadWidget();
    
    // Debounce refresh calls
    setTimeout(() => {
      if (mountedRef.current) {
        isRefreshingRef.current = false;
      }
    }, 1000);
  }, []);

  // 🔥 FIX: Memoize context value
  const contextValue = useMemo(() => ({ refreshWidget }), [refreshWidget]);

  return (
    <WidgetContext.Provider value={contextValue}>
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
