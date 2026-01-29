
import React, { createContext, useContext, useState, ReactNode } from 'react';

interface ImpersonationContextType {
  isImpersonating: boolean;
  impersonatedUserId: string | null;
  startImpersonation: (userId: string) => void;
  stopImpersonation: () => void;
}

const ImpersonationContext = createContext<ImpersonationContextType | undefined>(undefined);

export function ImpersonationProvider({ children }: { children: ReactNode }) {
  const [isImpersonating, setIsImpersonating] = useState(false);
  const [impersonatedUserId, setImpersonatedUserId] = useState<string | null>(null);

  const startImpersonation = (userId: string) => {
    console.log('[ImpersonationContext] 🎭 Starting impersonation for user:', userId);
    setIsImpersonating(true);
    setImpersonatedUserId(userId);
  };

  const stopImpersonation = () => {
    console.log('[ImpersonationContext] 🎭 Stopping impersonation');
    setIsImpersonating(false);
    setImpersonatedUserId(null);
  };

  return (
    <ImpersonationContext.Provider value={{ 
      isImpersonating, 
      impersonatedUserId, 
      startImpersonation, 
      stopImpersonation 
    }}>
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
