
import React, { createContext, useContext, useState, ReactNode } from 'react';

interface GlobalDataContextType {
  // Add global data state here
  refreshData: () => void;
}

const GlobalDataContext = createContext<GlobalDataContextType | undefined>(undefined);

export function GlobalDataProvider({ children }: { children: ReactNode }) {
  const refreshData = () => {
    console.log('[GlobalDataContext] Refreshing data...');
  };

  return (
    <GlobalDataContext.Provider value={{ refreshData }}>
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
