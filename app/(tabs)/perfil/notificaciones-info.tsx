
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

  const InfoSection = ({ icon, title, description, color }: {
    icon: string;
    title: string;
    description: string;
    color: string;
  }) => (
    <View style={{
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
      borderLeftWidth: 4,
      borderLeftColor: color,
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
        <Text style={{ fontSize: 24, marginRight: 12 }}>{icon}</Text>
        <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text, flex: 1 }}>
          {title}
        </Text>
      </View>
      <Text style={{ fontSize: 14, color: colors.textSecondary, lineHeight: 20 }}>
        {description}
      </Text>
    </View>
  );

  const StepItem = ({ number, title, description }: {
    number: number;
    title: string;
    description: string;
  }) => (
    <View style={{ flexDirection: 'row', marginBottom: 16 }}>
      <View style={{
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
      }}>
        <Text style={{ fontSize: 16, fontWeight: '600', color: '#FFFFFF' }}>
          {number}
        </Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text, marginBottom: 4 }}>
          {title}
        </Text>
        <Text style={{ fontSize: 13, color: colors.textSecondary, lineHeight: 18 }}>
          {description}
        </Text>
      </View>
    </View>
  );

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
        <Text style={{ fontSize: 20, fontWeight: '600', color: colors.text, flex: 1 }}>
          Información de Notificaciones
        </Text>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
        {/* Current Status */}
        {Platform.OS === 'android' && isExpoGo && !pushAvailable ? (
          <>
            <InfoSection
              icon="✅"
              title="Notificaciones en la App Activas"
              description="Las notificaciones dentro de la app están funcionando perfectamente. Verás todas tus actualizaciones cuando uses BarLive."
              color={colors.success}
            />

            <InfoSection
              icon="🔔"
              title="Sistema de Notificaciones Completo"
              description="Recibirás notificaciones de me gusta, comentarios, seguidores, menciones, eventos, mensajes y brindis directamente en la app."
              color={colors.primary}
            />

            <InfoSection
              icon="📱"
              title="Notificaciones Push Remotas"
              description="Para recibir notificaciones cuando la app esté cerrada, puedes crear un development build. Esto es opcional y la app funciona perfectamente sin ello."
              color={colors.info}
            />

            {/* How to Enable Push Notifications */}
            <View style={{
              backgroundColor: colors.card,
              borderRadius: 12,
              padding: 16,
              marginTop: 8,
              marginBottom: 16,
            }}>
              <Text style={{
                fontSize: 18,
                fontWeight: '600',
                color: colors.text,
                marginBottom: 16,
              }}>
                📱 Cómo Habilitar Notificaciones Push
              </Text>

              <Text style={{
                fontSize: 14,
                color: colors.textSecondary,
                marginBottom: 16,
                lineHeight: 20,
              }}>
                Para recibir notificaciones push en Android, necesitas crear un "development build" 
                en lugar de usar Expo Go:
              </Text>

              <StepItem
                number={1}
                title="Instala EAS CLI"
                description="Ejecuta: npm install -g eas-cli"
              />

              <StepItem
                number={2}
                title="Inicia sesión en Expo"
                description="Ejecuta: eas login"
              />

              <StepItem
                number={3}
                title="Crea el Development Build"
                description="Ejecuta: npx eas build --profile development --platform android"
              />

              <StepItem
                number={4}
                title="Instala el APK"
                description="Descarga e instala el APK generado en tu dispositivo Android"
              />

              <StepItem
                number={5}
                title="¡Listo!"
                description="Ahora podrás recibir notificaciones push normalmente"
              />

              <TouchableOpacity
                onPress={() => Linking.openURL('https://docs.expo.dev/develop/development-builds/introduction/')}
                style={{
                  backgroundColor: colors.primary,
                  borderRadius: 8,
                  padding: 12,
                  alignItems: 'center',
                  marginTop: 8,
                }}
              >
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#FFFFFF' }}>
                  📚 Ver Documentación Completa
                </Text>
              </TouchableOpacity>
            </View>

            {/* Why This Happens */}
            <View style={{
              backgroundColor: colors.card,
              borderRadius: 12,
              padding: 16,
              marginBottom: 16,
            }}>
              <Text style={{
                fontSize: 18,
                fontWeight: '600',
                color: colors.text,
                marginBottom: 12,
              }}>
                🤔 ¿Por Qué Sucede Esto?
              </Text>

              <Text style={{
                fontSize: 14,
                color: colors.textSecondary,
                lineHeight: 20,
                marginBottom: 12,
              }}>
                Expo Go es una app sandbox para desarrollo rápido, pero tiene limitaciones. 
                A partir de Expo SDK 53, las notificaciones push fueron removidas de Expo Go 
                en Android por razones técnicas y de seguridad.
              </Text>

              <Text style={{
                fontSize: 14,
                color: colors.textSecondary,
                lineHeight: 20,
              }}>
                Los development builds son versiones personalizadas de tu app que incluyen 
                todas las funcionalidades nativas, incluyendo notificaciones push.
              </Text>
            </View>
          </>
        ) : (
          <>
            <InfoSection
              icon="✅"
              title="Notificaciones Push Activas"
              description="Las notificaciones push están funcionando correctamente en tu dispositivo. Recibirás notificaciones incluso cuando la app esté cerrada."
              color={colors.success}
            />

            <InfoSection
              icon="🔔"
              title="Tipos de Notificaciones"
              description="Puedes recibir notificaciones de me gusta, comentarios, nuevos seguidores, menciones, eventos, mensajes y brindis. Configura tus preferencias en la pantalla anterior."
              color={colors.primary}
            />

            <InfoSection
              icon="⚙️"
              title="Configuración del Sistema"
              description="Asegúrate de que las notificaciones estén habilitadas en la configuración de tu dispositivo para recibir todas las actualizaciones."
              color={colors.info}
            />
          </>
        )}

        {/* Additional Info */}
        <View style={{
          backgroundColor: colors.card,
          borderRadius: 12,
          padding: 16,
          marginBottom: 16,
        }}>
          <Text style={{
            fontSize: 18,
            fontWeight: '600',
            color: colors.text,
            marginBottom: 12,
          }}>
            💡 Consejos
          </Text>

          <View style={{ marginBottom: 12 }}>
            <Text style={{ fontSize: 14, color: colors.text, marginBottom: 4 }}>
              • Mantén la app actualizada para recibir las últimas mejoras
            </Text>
          </View>

          <View style={{ marginBottom: 12 }}>
            <Text style={{ fontSize: 14, color: colors.text, marginBottom: 4 }}>
              • Revisa los permisos de notificaciones en la configuración del sistema
            </Text>
          </View>

          <View style={{ marginBottom: 12 }}>
            <Text style={{ fontSize: 14, color: colors.text, marginBottom: 4 }}>
              • Usa el botón "Probar Notificación" para verificar que todo funciona
            </Text>
          </View>

          <View>
            <Text style={{ fontSize: 14, color: colors.text, marginBottom: 4 }}>
              • Las notificaciones se pueden personalizar según tus preferencias
            </Text>
          </View>
        </View>

        {/* Support */}
        <View style={{
          backgroundColor: colors.card,
          borderRadius: 12,
          padding: 16,
          marginBottom: 32,
        }}>
          <Text style={{
            fontSize: 18,
            fontWeight: '600',
            color: colors.text,
            marginBottom: 12,
          }}>
            🆘 ¿Necesitas Ayuda?
          </Text>

          <Text style={{
            fontSize: 14,
            color: colors.textSecondary,
            lineHeight: 20,
            marginBottom: 12,
          }}>
            Si tienes problemas con las notificaciones o necesitas ayuda para crear 
            un development build, contacta con soporte.
          </Text>

          <TouchableOpacity
            onPress={() => router.push('/soporte/centro-ayuda')}
            style={{
              backgroundColor: colors.primary,
              borderRadius: 8,
              padding: 12,
              alignItems: 'center',
            }}
          >
            <Text style={{ fontSize: 14, fontWeight: '600', color: '#FFFFFF' }}>
              📞 Contactar Soporte
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}
