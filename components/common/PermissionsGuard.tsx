
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { requestAppPermission, checkAppPermission, PermissionType } from '@/utils/permissions';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';

interface PermissionsGuardProps {
  children: React.ReactNode;
  requiredPermissions: Array<{
    type: PermissionType;
    description: string;
  }>;
  onPermissionsGranted?: () => void;
}

/**
 * Componente que protege una pantalla o funcionalidad hasta que se concedan los permisos necesarios.
 * Muestra una UI amigable para solicitar permisos antes de renderizar el contenido.
 */
export default function PermissionsGuard({
  children,
  requiredPermissions,
  onPermissionsGranted,
}: PermissionsGuardProps) {
  const [permissionsGranted, setPermissionsGranted] = useState(false);
  const [checking, setChecking] = useState(true);
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    checkPermissions();
  }, []);

  const checkPermissions = async () => {
    console.log('[PermissionsGuard] Verificando permisos...');
    setChecking(true);

    try {
      const checks = await Promise.all(
        requiredPermissions.map(p => checkAppPermission(p.type))
      );

      const allGranted = checks.every(granted => granted);
      console.log('[PermissionsGuard] Todos los permisos concedidos:', allGranted);
      
      setPermissionsGranted(allGranted);
      
      if (allGranted && onPermissionsGranted) {
        onPermissionsGranted();
      }
    } catch (error) {
      console.error('[PermissionsGuard] Error verificando permisos:', error);
    } finally {
      setChecking(false);
    }
  };

  const handleRequestPermissions = async () => {
    console.log('[PermissionsGuard] Usuario solicitó permisos manualmente');
    setRequesting(true);

    try {
      const results = await Promise.all(
        requiredPermissions.map(p => 
          requestAppPermission(p.type, p.description)
        )
      );

      const allGranted = results.every(granted => granted);
      console.log('[PermissionsGuard] Resultado de solicitud:', allGranted);
      
      setPermissionsGranted(allGranted);
      
      if (allGranted && onPermissionsGranted) {
        onPermissionsGranted();
      }
    } catch (error) {
      console.error('[PermissionsGuard] Error solicitando permisos:', error);
    } finally {
      setRequesting(false);
    }
  };

  if (checking) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.text}>Verificando permisos...</Text>
      </View>
    );
  }

  if (!permissionsGranted) {
    return (
      <View style={styles.container}>
        <IconSymbol
          ios_icon_name="lock.shield"
          android_material_icon_name="security"
          size={64}
          color={colors.primary}
        />
        <Text style={styles.title}>Permisos Necesarios</Text>
        <Text style={styles.description}>
          Esta funcionalidad requiere los siguientes permisos:
        </Text>
        
        <View style={styles.permissionsList}>
          {requiredPermissions.map((permission, index) => (
            <View key={index} style={styles.permissionItem}>
              <IconSymbol
                ios_icon_name={getPermissionIcon(permission.type)}
                android_material_icon_name={getPermissionIconAndroid(permission.type)}
                size={24}
                color={colors.text}
              />
              <Text style={styles.permissionText}>
                {getPermissionLabel(permission.type)}: {permission.description}
              </Text>
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={styles.button}
          onPress={handleRequestPermissions}
          disabled={requesting}
        >
          {requesting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Conceder Permisos</Text>
          )}
        </TouchableOpacity>
      </View>
    );
  }

  return <>{children}</>;
}

function getPermissionIcon(type: PermissionType): string {
  switch (type) {
    case 'location':
      return 'location.fill';
    case 'camera':
      return 'camera.fill';
    case 'notifications':
      return 'bell.fill';
    default:
      return 'checkmark.shield';
  }
}

function getPermissionIconAndroid(type: PermissionType): string {
  switch (type) {
    case 'location':
      return 'location-on';
    case 'camera':
      return 'camera';
    case 'notifications':
      return 'notifications';
    default:
      return 'check-circle';
  }
}

function getPermissionLabel(type: PermissionType): string {
  switch (type) {
    case 'location':
      return 'Ubicación';
    case 'camera':
      return 'Cámara';
    case 'notifications':
      return 'Notificaciones';
    default:
      return type;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: colors.background,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 20,
    marginBottom: 10,
  },
  description: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
  },
  text: {
    fontSize: 16,
    color: colors.text,
    marginTop: 10,
  },
  permissionsList: {
    width: '100%',
    marginBottom: 30,
  },
  permissionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: colors.card,
    borderRadius: 10,
    marginBottom: 10,
  },
  permissionText: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    marginLeft: 15,
  },
  button: {
    backgroundColor: colors.primary,
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 10,
    minWidth: 200,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
