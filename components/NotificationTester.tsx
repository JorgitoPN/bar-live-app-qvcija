
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import {
  registerForPushNotifications,
  scheduleTestNotification,
  getNotificationStatus,
  arePushNotificationsAvailable,
  clearAllNotifications,
  getBadgeCount,
  setBadgeCount,
} from '@/utils/notifications';

/**
 * 🔔 NOTIFICATION TESTER COMPONENT
 * 
 * Componente de prueba para verificar que las notificaciones push funcionen correctamente.
 * 
 * CARACTERÍSTICAS:
 * - ✅ Verificar disponibilidad de notificaciones
 * - ✅ Registrar para notificaciones push
 * - ✅ Enviar notificación de prueba con sonido de brindis
 * - ✅ Ver estado del sistema de notificaciones
 * - ✅ Limpiar notificaciones y badge
 * - ✅ Gestionar badge count
 * 
 * USO:
 * Agrega este componente a tu pantalla de configuración o perfil:
 * 
 * import NotificationTester from '@/components/NotificationTester';
 * 
 * <NotificationTester />
 */
export default function NotificationTester() {
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [badgeCount, setBadgeCountState] = useState(0);

  // Cargar estado inicial
  useEffect(() => {
    loadStatus();
    loadBadgeCount();
  }, []);

  const loadStatus = async () => {
    try {
      const notifStatus = await getNotificationStatus();
      setStatus(notifStatus);
      console.log('[NotificationTester] Estado:', notifStatus);
    } catch (error) {
      console.error('[NotificationTester] Error cargando estado:', error);
    }
  };

  const loadBadgeCount = async () => {
    try {
      const count = await getBadgeCount();
      setBadgeCountState(count);
    } catch (error) {
      console.error('[NotificationTester] Error cargando badge:', error);
    }
  };

  const handleRegister = async () => {
    try {
      setLoading(true);
      console.log('[NotificationTester] Registrando para notificaciones...');
      
      const token = await registerForPushNotifications();
      
      if (token) {
        Alert.alert(
          '✅ Registro Exitoso',
          'Tu dispositivo está registrado para recibir notificaciones push.\n\n' +
          'Token: ' + token.substring(0, 20) + '...',
          [{ text: 'OK' }]
        );
        await loadStatus();
      } else {
        Alert.alert(
          '❌ Registro Fallido',
          'No se pudo registrar el dispositivo para notificaciones.\n\n' +
          'Verifica que:\n' +
          '1. Estás usando una APK generada con EAS Build\n' +
          '2. Aceptaste los permisos de notificaciones\n' +
          '3. Estás en un dispositivo físico (no emulador)',
          [{ text: 'OK' }]
        );
      }
    } catch (error: any) {
      console.error('[NotificationTester] Error registrando:', error);
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTestNotification = async () => {
    try {
      if (!arePushNotificationsAvailable()) {
        Alert.alert(
          '⚠️ No Disponible',
          'Las notificaciones push no están disponibles.\n\n' +
          'Asegúrate de:\n' +
          '1. Usar una APK generada con EAS Build\n' +
          '2. Estar en un dispositivo físico\n' +
          '3. Haber aceptado los permisos',
          [{ text: 'OK' }]
        );
        return;
      }

      await scheduleTestNotification();
      console.log('[NotificationTester] Notificación de prueba programada');
    } catch (error: any) {
      console.error('[NotificationTester] Error enviando notificación:', error);
      Alert.alert('Error', error.message);
    }
  };

  const handleClearNotifications = async () => {
    try {
      await clearAllNotifications();
      await loadBadgeCount();
      Alert.alert('✅ Limpiado', 'Todas las notificaciones y el badge han sido limpiados');
    } catch (error: any) {
      console.error('[NotificationTester] Error limpiando:', error);
      Alert.alert('Error', error.message);
    }
  };

  const handleIncrementBadge = async () => {
    try {
      const newCount = badgeCount + 1;
      await setBadgeCount(newCount);
      setBadgeCountState(newCount);
    } catch (error: any) {
      console.error('[NotificationTester] Error incrementando badge:', error);
    }
  };

  const handleDecrementBadge = async () => {
    try {
      const newCount = Math.max(0, badgeCount - 1);
      await setBadgeCount(newCount);
      setBadgeCountState(newCount);
    } catch (error: any) {
      console.error('[NotificationTester] Error decrementando badge:', error);
    }
  };

  const getStatusIcon = (value: boolean) => {
    return value ? '✅' : '❌';
  };

  const getStatusColor = (value: boolean) => {
    return value ? colors.success : colors.error;
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <IconSymbol
          ios_icon_name="bell.fill"
          android_material_icon_name="notifications"
          size={48}
          color={colors.primary}
        />
        <Text style={styles.title}>🔔 Probador de Notificaciones</Text>
        <Text style={styles.subtitle}>
          Verifica que las notificaciones push funcionen correctamente
        </Text>
      </View>

      {/* Estado del Sistema */}
      {status && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📊 Estado del Sistema</Text>
          
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Disponible:</Text>
            <Text style={[styles.statusValue, { color: getStatusColor(status.available) }]}>
              {getStatusIcon(status.available)} {status.available ? 'Sí' : 'No'}
            </Text>
          </View>

          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Permisos:</Text>
            <Text style={[styles.statusValue, { color: getStatusColor(status.permissionsGranted) }]}>
              {getStatusIcon(status.permissionsGranted)} {status.permissionsGranted ? 'Otorgados' : 'Denegados'}
            </Text>
          </View>

          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Token Registrado:</Text>
            <Text style={[styles.statusValue, { color: getStatusColor(status.tokenRegistered) }]}>
              {getStatusIcon(status.tokenRegistered)} {status.tokenRegistered ? 'Sí' : 'No'}
            </Text>
          </View>

          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Plataforma:</Text>
            <Text style={styles.statusValue}>{status.platform}</Text>
          </View>

          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Expo Go:</Text>
            <Text style={[styles.statusValue, { color: status.isExpoGo ? colors.warning : colors.success }]}>
              {status.isExpoGo ? '⚠️ Sí (no soportado)' : '✅ No'}
            </Text>
          </View>

          {!status.available && status.isExpoGo && (
            <View style={styles.warningBox}>
              <Text style={styles.warningText}>
                ⚠️ Las notificaciones push no funcionan en Expo Go.{'\n\n'}
                Necesitas generar una APK con EAS Build:{'\n'}
                <Text style={styles.codeText}>eas build --profile development --platform android</Text>
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Acciones */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🎯 Acciones</Text>

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleRegister}
          disabled={loading}
        >
          <IconSymbol
            ios_icon_name="person.badge.plus"
            android_material_icon_name="person-add"
            size={24}
            color="#fff"
          />
          <Text style={styles.buttonText}>
            {loading ? 'Registrando...' : 'Registrar para Notificaciones'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.buttonSecondary]}
          onPress={handleTestNotification}
        >
          <IconSymbol
            ios_icon_name="bell.badge"
            android_material_icon_name="notifications-active"
            size={24}
            color="#fff"
          />
          <Text style={styles.buttonText}>Enviar Notificación de Prueba 🍻</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.buttonDanger]}
          onPress={handleClearNotifications}
        >
          <IconSymbol
            ios_icon_name="trash"
            android_material_icon_name="delete"
            size={24}
            color="#fff"
          />
          <Text style={styles.buttonText}>Limpiar Notificaciones</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.buttonInfo]}
          onPress={loadStatus}
        >
          <IconSymbol
            ios_icon_name="arrow.clockwise"
            android_material_icon_name="refresh"
            size={24}
            color="#fff"
          />
          <Text style={styles.buttonText}>Actualizar Estado</Text>
        </TouchableOpacity>
      </View>

      {/* Badge Counter */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🔢 Badge Counter</Text>
        
        <View style={styles.badgeContainer}>
          <TouchableOpacity
            style={styles.badgeButton}
            onPress={handleDecrementBadge}
          >
            <Text style={styles.badgeButtonText}>-</Text>
          </TouchableOpacity>

          <View style={styles.badgeDisplay}>
            <Text style={styles.badgeCount}>{badgeCount}</Text>
          </View>

          <TouchableOpacity
            style={styles.badgeButton}
            onPress={handleIncrementBadge}
          >
            <Text style={styles.badgeButtonText}>+</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Instrucciones */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📖 Instrucciones</Text>
        <Text style={styles.instructionsText}>
          1. Presiona "Registrar para Notificaciones" para obtener el token{'\n\n'}
          2. Acepta los permisos cuando se soliciten{'\n\n'}
          3. Presiona "Enviar Notificación de Prueba" para recibir una notificación con sonido de brindis 🍻{'\n\n'}
          4. La notificación debería aparecer en 2 segundos con:{'\n'}
             • Sonido de brindis{'\n'}
             • Vibración{'\n'}
             • Heads-up notification{'\n'}
             • Badge en el icono{'\n\n'}
          5. Si no funciona, verifica que estés usando una APK generada con EAS Build
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 12,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
  section: {
    padding: 16,
    backgroundColor: colors.card,
    marginTop: 12,
    marginHorizontal: 12,
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  statusLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  statusValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  warningBox: {
    backgroundColor: colors.warning + '20',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    borderWidth: 1,
    borderColor: colors.warning,
  },
  warningText: {
    fontSize: 13,
    color: colors.warning,
    lineHeight: 20,
  },
  codeText: {
    fontFamily: 'monospace',
    fontSize: 12,
    color: colors.warning,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    gap: 8,
  },
  buttonSecondary: {
    backgroundColor: colors.success,
  },
  buttonDanger: {
    backgroundColor: colors.error,
  },
  buttonInfo: {
    backgroundColor: colors.info,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
  },
  badgeButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeButtonText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  badgeDisplay: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.card,
    borderWidth: 3,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeCount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: colors.text,
  },
  instructionsText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 22,
  },
});
