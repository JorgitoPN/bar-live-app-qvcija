
import React from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import type { PermissionCheck } from '@/hooks/useRolePermissions';

interface PermissionGuardProps {
  permission: PermissionCheck;
  onAllowed: () => void;
  children: React.ReactElement;
}

export default function PermissionGuard({ 
  permission, 
  onAllowed, 
  children 
}: PermissionGuardProps) {
  const router = useRouter();

  const handlePress = () => {
    if (permission.allowed) {
      onAllowed();
    } else {
      const buttons: any[] = [
        { text: 'Entendido', style: 'cancel' },
      ];

      if (permission.requiresUpgrade) {
        buttons.push({
          text: 'Ver planes',
          onPress: () => router.push('/gestion/planes-suscripcion'),
        });
      }

      Alert.alert(
        'Acción no permitida',
        permission.reason,
        buttons
      );
    }
  };

  return React.cloneElement(children, {
    onPress: handlePress,
  });
}
