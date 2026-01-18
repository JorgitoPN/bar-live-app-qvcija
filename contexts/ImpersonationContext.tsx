
import React, { createContext, useContext, useState, ReactNode } from 'react';

interface ImpersonationContextType {
  impersonatedUserId: string | null;
  setImpersonatedUserId: (userId: string | null) => void;
}

const ImpersonationContext = createContext<ImpersonationContextType | undefined>(undefined);

export function ImpersonationProvider({ children }: { children: ReactNode }) {
  const [impersonatedUserId, setImpersonatedUserId] = useState<string | null>(null);

  return (
    <ImpersonationContext.Provider value={{ impersonatedUserId, setImpersonatedUserId }}>
      {children}
    </ImpersonationContext.Provider>
  );
}

export function useImpersonation() {
  const context = useContext(ImpersonationContext);
  if (context === undefined) {
    throw new Error('useImpersonation must be used within an ImpersonationProvider');
  }
  return context;
}
