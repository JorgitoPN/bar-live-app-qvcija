
import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import NotificationTester from '@/components/NotificationTester';
import { colors } from '@/styles/commonStyles';

/**
 * 🔔 PANTALLA DE PRUEBA DE NOTIFICACIONES
 * 
 * Esta pantalla te permite probar que las notificaciones push funcionen correctamente.
 * 
 * CÓMO USAR:
 * 1. Navega a esta pantalla desde tu app
 * 2. Presiona "Registrar para Notificaciones"
 * 3. Acepta los permisos cuando se soliciten
 * 4. Presiona "Enviar Notificación de Prueba"
 * 5. Deberías recibir una notificación en 2 segundos con sonido de brindis 🍻
 * 
 * REQUISITOS:
 * - APK generada con EAS Build (no Expo Go)
 * - Dispositivo físico (no emulador)
 * - Permisos de notificaciones aceptados
 * - Firebase Cloud Messaging configurado
 */
export default function TestNotificationsScreen() {
  return (
    <>
      <Stack.Screen
        options={{
          title: 'Probar Notificaciones',
          headerStyle: {
            backgroundColor: colors.card,
          },
          headerTintColor: colors.text,
        }}
      />
      <ScrollView style={styles.container}>
        <NotificationTester />
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
