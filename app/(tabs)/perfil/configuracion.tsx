
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Linking,
  Platform,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { useAuth } from '@/contexts/AuthContext';
import {
  registerForPushNotifications,
  removePushToken,
  getNotificationStatus,
  arePushNotificationsAvailable,
} from '@/utils/notifications';

export default function ConfiguracionScreen() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [notificationStatus, setNotificationStatus] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadNotificationStatus();
  }, []);

  const loadNotificationStatus = async () => {
    try {
      const status = await getNotificationStatus();
      setNotificationStatus(status);
      setNotificationsEnabled(status.permissionsGranted && status.tokenRegistered);
    } catch (error) {
      console.error('[Configuracion] Error cargando estado de notificaciones:', error);
    }
  };

  const handleToggleNotifications = async (value: boolean) => {
    try {
      setLoading(true);

      if (value) {
        // Habilitar notificaciones
        if (!arePushNotificationsAvailable()) {
          Alert.alert(
            'No Disponible',
            'Las notificaciones push no están disponibles en este dispositivo.\n\n' +
            'Asegúrate de:\n' +
            '1. Usar una APK generada con EAS Build\n' +
            '2. Estar en un dispositivo físico\n' +
            '3. Tener Android 5.0 o superior',
            [{ text: 'OK' }]
          );
          setLoading(false);
          return;
        }

        const token = await registerForPushNotifications();
        if (token) {
          setNotificationsEnabled(true);
          Alert.alert(
            '✅ Notificaciones Habilitadas',
            'Ahora recibirás notificaciones push de BarLive',
            [{ text: 'OK' }]
          );
        } else {
          Alert.alert(
            'Error',
            'No se pudieron habilitar las notificaciones. Verifica los permisos en Configuración.',
            [
              { text: 'Cancelar', style: 'cancel' },
              { text: 'Abrir Configuración', onPress: () => Linking.openSettings() }
            ]
          );
        }
      } else {
        // Deshabilitar notificaciones
        if (user?.id) {
          await removePushToken(user.id);
        }
        setNotificationsEnabled(false);
        Alert.alert(
          '🔕 Notificaciones Deshabilitadas',
          'Ya no recibirás notificaciones push de BarLive',
          [{ text: 'OK' }]
        );
      }

      await loadNotificationStatus();
    } catch (error: any) {
      console.error('[Configuracion] Error toggling notifications:', error);
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTestNotifications = () => {
    router.push('/perfil/test-notifications');
  };

  const handleSignOut = async () => {
    try {
      Alert.alert(
        'Cerrar Sesión',
        '¿Estás seguro de que quieres cerrar sesión?',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Cerrar Sesión',
            style: 'destructive',
            onPress: async () => {
              await signOut();
              router.replace('/');
            },
          },
        ]
      );
    } catch (error: any) {
      console.error('[Configuracion] Error signing out:', error);
      Alert.alert('Error', error.message);
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Configuración',
          headerStyle: {
            backgroundColor: colors.card,
          },
          headerTintColor: colors.text,
        }}
      />
      <ScrollView style={styles.container}>
        {/* Notificaciones */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔔 Notificaciones</Text>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Notificaciones Push</Text>
              <Text style={styles.settingDescription}>
                Recibe notificaciones de mensajes, likes y eventos
              </Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={handleToggleNotifications}
              disabled={loading}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={notificationsEnabled ? colors.primary : colors.textSecondary}
            />
          </View>

          {notificationStatus && !notificationStatus.available && (
            <View style={styles.warningBox}>
              <IconSymbol
                ios_icon_name="exclamationmark.triangle"
                android_material_icon_name="warning"
                size={20}
                color={colors.warning}
              />
              <Text style={styles.warningText}>
                Las notificaciones push no están disponibles.{'\n'}
                {notificationStatus.isExpoGo
                  ? 'Necesitas una APK generada con EAS Build.'
                  : 'Verifica que estés en un dispositivo físico.'}
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={styles.testButton}
            onPress={handleTestNotifications}
          >
            <IconSymbol
              ios_icon_name="bell.badge"
              android_material_icon_name="notifications-active"
              size={20}
              color={colors.primary}
            />
            <Text style={styles.testButtonText}>Probar Notificaciones</Text>
          </TouchableOpacity>
        </View>

        {/* Cuenta */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>👤 Cuenta</Text>

          <TouchableOpacity style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Editar Perfil</Text>
              <Text style={styles.settingDescription}>
                Cambia tu nombre, foto y biografía
              </Text>
            </View>
            <IconSymbol
              ios_icon_name="chevron.right"
              android_material_icon_name="chevron-right"
              size={20}
              color={colors.textSecondary}
            />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Privacidad</Text>
              <Text style={styles.settingDescription}>
                Controla quién puede ver tu contenido
              </Text>
            </View>
            <IconSymbol
              ios_icon_name="chevron.right"
              android_material_icon_name="chevron-right"
              size={20}
              color={colors.textSecondary}
            />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Seguridad</Text>
              <Text style={styles.settingDescription}>
                Cambia tu contraseña y configura 2FA
              </Text>
            </View>
            <IconSymbol
              ios_icon_name="chevron.right"
              android_material_icon_name="chevron-right"
              size={20}
              color={colors.textSecondary}
            />
          </TouchableOpacity>
        </View>

        {/* Acerca de */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ℹ️ Acerca de</Text>

          <TouchableOpacity style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Términos y Condiciones</Text>
            </View>
            <IconSymbol
              ios_icon_name="chevron.right"
              android_material_icon_name="chevron-right"
              size={20}
              color={colors.textSecondary}
            />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Política de Privacidad</Text>
            </View>
            <IconSymbol
              ios_icon_name="chevron.right"
              android_material_icon_name="chevron-right"
              size={20}
              color={colors.textSecondary}
            />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Versión</Text>
              <Text style={styles.settingDescription}>1.0.0</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Cerrar Sesión */}
        <TouchableOpacity
          style={styles.signOutButton}
          onPress={handleSignOut}
        >
          <IconSymbol
            ios_icon_name="arrow.right.square"
            android_material_icon_name="logout"
            size={20}
            color={colors.error}
          />
          <Text style={styles.signOutText}>Cerrar Sesión</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  section: {
    backgroundColor: colors.card,
    marginTop: 12,
    marginHorizontal: 12,
    borderRadius: 12,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  settingInfo: {
    flex: 1,
    marginRight: 12,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.warning + '20',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    borderWidth: 1,
    borderColor: colors.warning,
    gap: 8,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: colors.warning,
    lineHeight: 18,
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary + '20',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    gap: 8,
  },
  testButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.error + '20',
    padding: 16,
    borderRadius: 12,
    marginTop: 24,
    marginHorizontal: 12,
    gap: 8,
  },
  signOutText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.error,
  },
});
