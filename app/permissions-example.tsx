
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Stack } from 'expo-router';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import {
  requestAppPermission,
  checkAppPermission,
  requestMultiplePermissions,
  PermissionType,
} from '@/utils/permissions';

/**
 * Pantalla de ejemplo que muestra cómo solicitar permisos de forma segura.
 * Esta pantalla demuestra las 3 formas de solicitar permisos:
 * 1. Individual (un permiso a la vez)
 * 2. Múltiple (todos los permisos juntos)
 * 3. Verificación (comprobar sin solicitar)
 */
export default function PermissionsExampleScreen() {
  const [permissionsStatus, setPermissionsStatus] = useState<Record<PermissionType, boolean>>({
    location: false,
    camera: false,
    notifications: false,
  });
  const [loading, setLoading] = useState<PermissionType | null>(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    checkAllPermissions();
  }, []);

  const checkAllPermissions = async () => {
    console.log('[PermissionsExample] Verificando todos los permisos...');
    setChecking(true);

    try {
      const location = await checkAppPermission('location');
      const camera = await checkAppPermission('camera');
      const notifications = await checkAppPermission('notifications');

      setPermissionsStatus({
        location,
        camera,
        notifications,
      });

      console.log('[PermissionsExample] Estado de permisos:', { location, camera, notifications });
    } catch (error) {
      console.error('[PermissionsExample] Error verificando permisos:', error);
    } finally {
      setChecking(false);
    }
  };

  const handleRequestSinglePermission = async (type: PermissionType, description: string) => {
    console.log(`[PermissionsExample] Solicitando permiso individual: ${type}`);
    setLoading(type);

    try {
      const granted = await requestAppPermission(type, description);
      
      setPermissionsStatus(prev => ({
        ...prev,
        [type]: granted,
      }));

      console.log(`[PermissionsExample] Permiso ${type} ${granted ? 'concedido' : 'denegado'}`);
    } catch (error) {
      console.error(`[PermissionsExample] Error solicitando permiso ${type}:`, error);
    } finally {
      setLoading(null);
    }
  };

  const handleRequestAllPermissions = async () => {
    console.log('[PermissionsExample] Solicitando todos los permisos...');
    setLoading('location'); // Usar como indicador de carga general

    try {
      const results = await requestMultiplePermissions([
        {
          type: 'location',
          description: 'mostrar locales cercanos y eventos relevantes en tu zona',
        },
        {
          type: 'camera',
          description: 'tomar fotos y videos para tus publicaciones',
        },
        {
          type: 'notifications',
          description: 'enviarte actualizaciones importantes y mensajes',
        },
      ]);

      setPermissionsStatus(results);
      console.log('[PermissionsExample] Resultados de todos los permisos:', results);
    } catch (error) {
      console.error('[PermissionsExample] Error solicitando todos los permisos:', error);
    } finally {
      setLoading(null);
    }
  };

  const getPermissionIcon = (type: PermissionType): string => {
    switch (type) {
      case 'location':
        return 'location-on';
      case 'camera':
        return 'camera';
      case 'notifications':
        return 'notifications';
      default:
        return 'help';
    }
  };

  const getPermissionLabel = (type: PermissionType): string => {
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
  };

  const getPermissionDescription = (type: PermissionType): string => {
    switch (type) {
      case 'location':
        return 'mostrar locales cercanos y eventos relevantes';
      case 'camera':
        return 'tomar fotos y videos para tus publicaciones';
      case 'notifications':
        return 'enviarte actualizaciones importantes';
      default:
        return '';
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Ejemplo de Permisos',
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
        }}
      />
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <IconSymbol
            ios_icon_name="lock.shield"
            android_material_icon_name="security"
            size={48}
            color={colors.primary}
          />
          <Text style={styles.title}>Gestión de Permisos</Text>
          <Text style={styles.subtitle}>
            Ejemplo de cómo solicitar permisos de forma segura en iOS y Android
          </Text>
        </View>

        {checking ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Verificando permisos...</Text>
          </View>
        ) : (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Estado Actual de Permisos</Text>
              {(['location', 'camera', 'notifications'] as PermissionType[]).map((type) => (
                <View key={type} style={styles.permissionCard}>
                  <View style={styles.permissionHeader}>
                    <IconSymbol
                      ios_icon_name={type === 'location' ? 'location.fill' : type === 'camera' ? 'camera.fill' : 'bell.fill'}
                      android_material_icon_name={getPermissionIcon(type)}
                      size={32}
                      color={permissionsStatus[type] ? colors.success : colors.textSecondary}
                    />
                    <View style={styles.permissionInfo}>
                      <Text style={styles.permissionName}>{getPermissionLabel(type)}</Text>
                      <Text style={styles.permissionStatus}>
                        {permissionsStatus[type] ? '✅ Concedido' : '❌ No concedido'}
                      </Text>
                    </View>
                  </View>
                  
                  {!permissionsStatus[type] && (
                    <TouchableOpacity
                      style={styles.requestButton}
                      onPress={() => handleRequestSinglePermission(type, getPermissionDescription(type))}
                      disabled={loading === type}
                    >
                      {loading === type ? (
                        <ActivityIndicator color="#fff" size="small" />
                      ) : (
                        <Text style={styles.requestButtonText}>Solicitar Permiso</Text>
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Acciones Rápidas</Text>
              
              <TouchableOpacity
                style={[styles.actionButton, styles.primaryButton]}
                onPress={handleRequestAllPermissions}
                disabled={loading !== null}
              >
                {loading !== null ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <IconSymbol
                      ios_icon_name="checkmark.shield"
                      android_material_icon_name="check-circle"
                      size={24}
                      color="#fff"
                    />
                    <Text style={styles.actionButtonText}>Solicitar Todos los Permisos</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, styles.secondaryButton]}
                onPress={checkAllPermissions}
                disabled={checking}
              >
                {checking ? (
                  <ActivityIndicator color={colors.primary} />
                ) : (
                  <>
                    <IconSymbol
                      ios_icon_name="arrow.clockwise"
                      android_material_icon_name="refresh"
                      size={24}
                      color={colors.primary}
                    />
                    <Text style={[styles.actionButtonText, { color: colors.primary }]}>
                      Verificar Estado
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.infoSection}>
              <Text style={styles.infoTitle}>ℹ️ Información Importante</Text>
              <Text style={styles.infoText}>
                • Los permisos se solicitan de forma segura con try/catch
              </Text>
              <Text style={styles.infoText}>
                • Si el usuario deniega un permiso, se muestra una alerta amigable
              </Text>
              <Text style={styles.infoText}>
                • Los permisos se pueden verificar sin solicitarlos
              </Text>
              <Text style={styles.infoText}>
                • En iOS, las descripciones aparecen en el diálogo del sistema
              </Text>
              <Text style={styles.infoText}>
                • En Android, los permisos se solicitan automáticamente
              </Text>
            </View>
          </>
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 10,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 5,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    fontSize: 16,
    color: colors.text,
    marginTop: 10,
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 15,
  },
  permissionCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  permissionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  permissionInfo: {
    flex: 1,
    marginLeft: 15,
  },
  permissionName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  permissionStatus: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
  },
  requestButton: {
    backgroundColor: colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 10,
    alignItems: 'center',
  },
  requestButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 10,
  },
  primaryButton: {
    backgroundColor: colors.primary,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: colors.primary,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 10,
  },
  infoSection: {
    padding: 20,
    backgroundColor: colors.card,
    margin: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 10,
  },
  infoText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 5,
    lineHeight: 20,
  },
});
