
import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface GlobalDataContextType {
  prefetchNextPage: () => Promise<void>;
}

const GlobalDataContext = createContext<GlobalDataContextType | undefined>(undefined);

export function GlobalDataProvider({ children }: { children: ReactNode }) {
  const prefetchNextPage = useCallback(async () => {
    console.log('[GlobalDataContext] 📥 Prefetching next page...');
    // TODO: Implement prefetching logic
  }, []);

  return (
    <GlobalDataContext.Provider value={{ prefetchNextPage }}>
      {children}
    </GlobalDataContext.Provider>
  );
}

export function useGlobalData() {
  const context = useContext(GlobalDataContext);
  if (context === undefined) {
    throw new Error('useGlobalData must be used within a GlobalDataProvider');
  }
  return context;
}
