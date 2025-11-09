
import { useState, useEffect, useCallback } from 'react';
import { UserRole } from '@/types';

// Simple state management for user role
let globalUserRole: UserRole = 'cliente';
const listeners: Set<(role: UserRole) => void> = new Set();

const notifyListeners = (role: UserRole) => {
  listeners.forEach(listener => listener(role));
};

export function useUserRole() {
  const [userRole, setUserRoleState] = useState<UserRole>(globalUserRole);

  useEffect(() => {
    const listener = (role: UserRole) => {
      console.log('useUserRole listener triggered with role:', role);
      setUserRoleState(role);
    };
    
    listeners.add(listener);
    
    return () => {
      listeners.delete(listener);
    };
  }, []);

  const setUserRole = useCallback((newRole: UserRole) => {
    console.log('Setting user role to:', newRole);
    globalUserRole = newRole;
    setUserRoleState(newRole);
    notifyListeners(newRole);
  }, []);

  useEffect(() => {
    console.log('Current user role:', userRole);
  }, [userRole]);

  return {
    userRole,
    setUserRole,
    isCliente: userRole === 'cliente',
    isPropietario: userRole === 'propietario',
    isAdmin: userRole === 'admin',
  };
}
