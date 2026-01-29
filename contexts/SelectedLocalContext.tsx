
import React, { createContext, useContext, useState, ReactNode } from 'react';

interface SelectedLocalContextType {
  selectedLocalId: string | null;
  setSelectedLocalId: (id: string | null) => void;
}

const SelectedLocalContext = createContext<SelectedLocalContextType | undefined>(undefined);

export function SelectedLocalProvider({ children }: { children: ReactNode }) {
  const [selectedLocalId, setSelectedLocalId] = useState<string | null>(null);

  return (
    <SelectedLocalContext.Provider value={{ selectedLocalId, setSelectedLocalId }}>
      {children}
    </SelectedLocalContext.Provider>
  );
}

export function useSelectedLocal() {
  const context = useContext(SelectedLocalContext);
  if (context === undefined) {
    throw new Error('useSelectedLocal must be used within a SelectedLocalProvider');
  }
  return context;
}
