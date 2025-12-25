
import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Platform, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { arePushNotificationsAvailable } from '@/utils/notifications';
import Constants from 'expo-constants';

export default function NotificacionesInfo() {
  const router = useRouter();
  const pushAvailable = arePushNotificationsAvailable();
  const isExpoGo = Constants.appOwnership === 'expo';

  const openDocs = () => {
    Linking.openURL('https://docs.expo.dev/develop/development-builds/introduction/');
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: Platform.OS === 'android' ? 48 : 60,
        paddingBottom: 16,
        backgroundColor: colors.card,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
      }}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ marginRight: 16 }}
        >
          <IconSymbol
            ios_icon_name="chevron.left"
            android_material_icon_name="arrow_back"
            size={24}
            color={colors.text}
          />
        </TouchableOpacity>
        <Text style={{ fontSize: 20, fontWeight: '600', color: colors.text }}>
          Información de Notificaciones
        </Text>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
        {/* Status Card */}
        <View style={{
          backgroundColor: pushAvailable ? colors.success + '20' : colors.warning + '20',
          borderRadius: 12,
          padding: 16,
          marginBottom: 24,
          borderWidth: 1,
          borderColor: pushAvailable ? colors.success : colors.warning,
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <IconSymbol
              ios_icon_name={pushAvailable ? "checkmark.circle.fill" : "exclamationmark.triangle.fill"}
              android_material_icon_name={pushAvailable ? "check_circle" : "warning"}
              size={24}
              color={pushAvailable ? colors.success : colors.warning}
            />
            <Text style={{
              fontSize: 18,
              fontWeight: '600',
              color: colors.text,
              marginLeft: 12,
            }}>
              {pushAvailable ? 'Notificaciones Disponibles' : 'Notificaciones Limitadas'}
            </Text>
          </View>
          <Text style={{ fontSize: 14, color: colors.textSecondary, lineHeight: 20 }}>
            {pushAvailable
              ? 'Las notificaciones push están completamente funcionales en este dispositivo.'
              : 'Las notificaciones push no están disponibles en Expo Go para Android (SDK 53+).'}
          </Text>
        </View>

        {/* Expo Go Warning */}
        {!pushAvailable && Platform.OS === 'android' && isExpoGo && (
          <View style={{
            backgroundColor: colors.card,
            borderRadius: 12,
            padding: 16,
            marginBottom: 24,
          }}>
            <Text style={{
              fontSize: 16,
              fontWeight: '600',
              color: colors.text,
              marginBottom: 12,
            }}>
              📱 ¿Por qué no funcionan las notificaciones?
            </Text>
            <Text style={{ fontSize: 14, color: colors.textSecondary, lineHeight: 22, marginBottom: 16 }}>
              A partir de Expo SDK 53, las notificaciones push en Android requieren un "development build" 
              en lugar de Expo Go. Esto es una limitación de Expo, no de BarLive.
            </Text>

            <Text style={{
              fontSize: 16,
              fontWeight: '600',
              color: colors.text,
              marginBottom: 12,
            }}>
              ✅ ¿Qué funciona ahora?
            </Text>
            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 14, color: colors.textSecondary, lineHeight: 22 }}>
                • Todas las funciones de la app{'\n'}
                • Notificaciones locales{'\n'}
                • Notificaciones en la app{'\n'}
                • Todo excepto notificaciones push remotas
              </Text>
            </View>

            <Text style={{
              fontSize: 16,
              fontWeight: '600',
              color: colors.text,
              marginBottom: 12,
            }}>
              🔧 ¿Cómo habilitar notificaciones push?
            </Text>
            <Text style={{ fontSize: 14, color: colors.textSecondary, lineHeight: 22, marginBottom: 12 }}>
              Para desarrolladores, necesitas crear un development build:
            </Text>
            <View style={{
              backgroundColor: colors.background,
              borderRadius: 8,
              padding: 12,
              marginBottom: 16,
            }}>
              <Text style={{
                fontSize: 12,
                fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
                color: colors.primary,
              }}>
                npx eas build --profile development --platform android
              </Text>
            </View>

            <TouchableOpacity
              onPress={openDocs}
              style={{
                backgroundColor: colors.primary,
                borderRadius: 8,
                padding: 12,
                alignItems: 'center',
              }}
            >
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#FFFFFF' }}>
                Ver Documentación de Expo
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* What Works */}
        <View style={{
          backgroundColor: colors.card,
          borderRadius: 12,
          padding: 16,
          marginBottom: 24,
        }}>
          <Text style={{
            fontSize: 16,
            fontWeight: '600',
            color: colors.text,
            marginBottom: 12,
          }}>
            💡 Tipos de Notificaciones
          </Text>

          <View style={{ marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <IconSymbol
                ios_icon_name="bell.fill"
                android_material_icon_name="notifications"
                size={20}
                color={colors.primary}
              />
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text, marginLeft: 8 }}>
                Notificaciones Locales
              </Text>
            </View>
            <Text style={{ fontSize: 13, color: colors.textSecondary, lineHeight: 20 }}>
              Funcionan siempre. Se muestran cuando la app está abierta o en segundo plano.
            </Text>
          </View>

          <View style={{ marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <IconSymbol
                ios_icon_name="bell.badge.fill"
                android_material_icon_name="notifications_active"
                size={20}
                color={pushAvailable ? colors.success : colors.textSecondary}
              />
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text, marginLeft: 8 }}>
                Notificaciones Push
              </Text>
            </View>
            <Text style={{ fontSize: 13, color: colors.textSecondary, lineHeight: 20 }}>
              {pushAvailable
                ? 'Funcionan completamente. Recibirás notificaciones incluso cuando la app esté cerrada.'
                : 'No disponibles en Expo Go. Requieren un development build.'}
            </Text>
          </View>

          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <IconSymbol
                ios_icon_name="app.badge.fill"
                android_material_icon_name="circle_notifications"
                size={20}
                color={colors.primary}
              />
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text, marginLeft: 8 }}>
                Notificaciones en la App
              </Text>
            </View>
            <Text style={{ fontSize: 13, color: colors.textSecondary, lineHeight: 20 }}>
              Funcionan siempre. Verás actualizaciones en tiempo real dentro de la app.
            </Text>
          </View>
        </View>

        {/* Technical Info */}
        <View style={{
          backgroundColor: colors.card,
          borderRadius: 12,
          padding: 16,
        }}>
          <Text style={{
            fontSize: 16,
            fontWeight: '600',
            color: colors.text,
            marginBottom: 12,
          }}>
            🔍 Información Técnica
          </Text>
          <View style={{ gap: 8 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 13, color: colors.textSecondary }}>Plataforma:</Text>
              <Text style={{ fontSize: 13, color: colors.text, fontWeight: '500' }}>
                {Platform.OS === 'android' ? 'Android' : 'iOS'}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 13, color: colors.textSecondary }}>Entorno:</Text>
              <Text style={{ fontSize: 13, color: colors.text, fontWeight: '500' }}>
                {isExpoGo ? 'Expo Go' : 'Development Build'}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 13, color: colors.textSecondary }}>Push Disponible:</Text>
              <Text style={{
                fontSize: 13,
                color: pushAvailable ? colors.success : colors.error,
                fontWeight: '500',
              }}>
                {pushAvailable ? 'Sí' : 'No'}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
