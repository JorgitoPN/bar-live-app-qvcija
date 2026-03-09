
/**
 * ✅ CONFIGURACION SCREEN v2.0 - IMPROVED LAYOUT & DESIGN
 * 
 * FIXES v2.0:
 * - ✅ Improved spacing and padding for better readability
 * - ✅ Better visual hierarchy with consistent sizing
 * - ✅ Fixed overflow issues on both iOS and Android
 * - ✅ Cleaner, more professional design
 * - ✅ Better touch targets for accessibility
 * - ✅ Consistent border radius and shadows
 */

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
import { scaleFontSize, scaleIconSize } from '@/utils/androidScaling';
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
      <ScrollView 
        style={styles.container}
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
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
              thumbColor={notificationsEnabled ? '#FFFFFF' : '#F3F4F6'}
              ios_backgroundColor={colors.border}
            />
          </View>

          {notificationStatus && !notificationStatus.available && (
            <View style={styles.warningBox}>
              <IconSymbol
                ios_icon_name="exclamationmark.triangle"
                android_material_icon_name="warning"
                size={scaleIconSize(20)}
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
            activeOpacity={0.7}
          >
            <IconSymbol
              ios_icon_name="bell.badge"
              android_material_icon_name="notifications_active"
              size={scaleIconSize(20)}
              color={colors.primary}
            />
            <Text style={styles.testButtonText}>Probar Notificaciones</Text>
          </TouchableOpacity>
        </View>

        {/* Cuenta */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>👤 Cuenta</Text>

          <TouchableOpacity 
            style={styles.settingRow}
            activeOpacity={0.7}
          >
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Editar Perfil</Text>
              <Text style={styles.settingDescription}>
                Cambia tu nombre, foto y biografía
              </Text>
            </View>
            <IconSymbol
              ios_icon_name="chevron.right"
              android_material_icon_name="chevron_right"
              size={scaleIconSize(20)}
              color={colors.textSecondary}
            />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.settingRow}
            activeOpacity={0.7}
          >
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Privacidad</Text>
              <Text style={styles.settingDescription}>
                Controla quién puede ver tu contenido
              </Text>
            </View>
            <IconSymbol
              ios_icon_name="chevron.right"
              android_material_icon_name="chevron_right"
              size={scaleIconSize(20)}
              color={colors.textSecondary}
            />
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.settingRow, { borderBottomWidth: 0 }]}
            activeOpacity={0.7}
          >
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Seguridad</Text>
              <Text style={styles.settingDescription}>
                Cambia tu contraseña y configura 2FA
              </Text>
            </View>
            <IconSymbol
              ios_icon_name="chevron.right"
              android_material_icon_name="chevron_right"
              size={scaleIconSize(20)}
              color={colors.textSecondary}
            />
          </TouchableOpacity>
        </View>

        {/* Acerca de */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ℹ️ Acerca de</Text>

          <TouchableOpacity 
            style={styles.settingRow}
            activeOpacity={0.7}
          >
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Términos y Condiciones</Text>
            </View>
            <IconSymbol
              ios_icon_name="chevron.right"
              android_material_icon_name="chevron_right"
              size={scaleIconSize(20)}
              color={colors.textSecondary}
            />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.settingRow}
            activeOpacity={0.7}
          >
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Política de Privacidad</Text>
            </View>
            <IconSymbol
              ios_icon_name="chevron.right"
              android_material_icon_name="chevron_right"
              size={scaleIconSize(20)}
              color={colors.textSecondary}
            />
          </TouchableOpacity>

          <View style={[styles.settingRow, { borderBottomWidth: 0 }]}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Versión</Text>
              <Text style={styles.settingDescription}>1.0.0</Text>
            </View>
          </View>
        </View>

        {/* Cerrar Sesión */}
        <TouchableOpacity
          style={styles.signOutButton}
          onPress={handleSignOut}
          activeOpacity={0.7}
        >
          <IconSymbol
            ios_icon_name="arrow.right.square"
            android_material_icon_name="logout"
            size={scaleIconSize(22)}
            color={colors.error}
          />
          <Text style={styles.signOutText}>Cerrar Sesión</Text>
        </TouchableOpacity>
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
    marginTop: 16,
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  sectionTitle: {
    fontSize: scaleFontSize(20),
    fontWeight: '700',
    color: colors.text,
    marginBottom: 20,
    letterSpacing: 0.3,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border + '40',
    minHeight: 60,
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
    paddingRight: 8,
  },
  settingLabel: {
    fontSize: scaleFontSize(16),
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
    letterSpacing: 0.2,
  },
  settingDescription: {
    fontSize: scaleFontSize(14),
    color: colors.textSecondary,
    lineHeight: 20,
    flexWrap: 'wrap',
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.warning + '15',
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
    borderWidth: 1,
    borderColor: colors.warning + '40',
    gap: 12,
  },
  warningText: {
    flex: 1,
    fontSize: scaleFontSize(14),
    color: colors.warning,
    lineHeight: 20,
    flexWrap: 'wrap',
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary + '15',
    padding: 14,
    borderRadius: 12,
    marginTop: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  testButtonText: {
    fontSize: scaleFontSize(15),
    fontWeight: '600',
    color: colors.primary,
    letterSpacing: 0.2,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.error + '15',
    padding: 18,
    borderRadius: 16,
    marginTop: 32,
    marginHorizontal: 16,
    marginBottom: 32,
    gap: 10,
    borderWidth: 1,
    borderColor: colors.error + '30',
  },
  signOutText: {
    fontSize: scaleFontSize(16),
    fontWeight: '700',
    color: colors.error,
    letterSpacing: 0.3,
  },
});
