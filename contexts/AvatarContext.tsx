
import React, { createContext, useContext, useState, ReactNode } from 'react';

interface AvatarContextType {
  avatarUrl: string | null;
  setAvatarUrl: (url: string | null) => void;
}

const AvatarContext = createContext<AvatarContextType | undefined>(undefined);

export function AvatarProvider({ children }: { children: ReactNode }) {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  return (
    <AvatarContext.Provider value={{ avatarUrl, setAvatarUrl }}>
      {children}
    </AvatarContext.Provider>
  );
}

export function useAvatar() {
  const context = useContext(AvatarContext);
  if (context === undefined) {
    throw new Error('useAvatar must be used within an AvatarProvider');
  }
  return context;
}
