
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { colors, commonStyles } from '@/styles/commonStyles';

export default function PrivacidadScreen() {
  const router = useRouter();

  return (
    <View style={commonStyles.container}>
      <LinearGradient
        colors={[colors.headerGradientStart, colors.headerGradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <IconSymbol name="chevron.left" size={24} color={colors.headerText} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Política de Privacidad</Text>
          <View style={styles.placeholder} />
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <Text style={styles.lastUpdated}>Última actualización: 1 de enero de 2025</Text>

        <Text style={styles.intro}>
          En BarLive, nos tomamos muy en serio la privacidad de nuestros usuarios. Esta Política 
          de Privacidad explica cómo recopilamos, usamos, compartimos y protegemos tu información personal.
        </Text>

        <Text style={styles.sectionTitle}>1. Información que Recopilamos</Text>
        
        <Text style={styles.subsectionTitle}>1.1 Información que nos proporcionas:</Text>
        <Text style={styles.paragraph}>
          - Nombre, correo electrónico y contraseña al registrarte{'\n'}
          - Foto de perfil y biografía{'\n'}
          - Publicaciones, comentarios y reseñas{'\n'}
          - Información de contacto adicional (teléfono, sitio web){'\n'}
          - Preferencias y configuraciones de la cuenta
        </Text>

        <Text style={styles.subsectionTitle}>1.2 Información recopilada automáticamente:</Text>
        <Text style={styles.paragraph}>
          - Ubicación geográfica (con tu permiso){'\n'}
          - Información del dispositivo (modelo, sistema operativo){'\n'}
          - Datos de uso de la aplicación{'\n'}
          - Dirección IP y datos de conexión{'\n'}
          - Cookies y tecnologías similares
        </Text>

        <Text style={styles.sectionTitle}>2. Cómo Usamos tu Información</Text>
        <Text style={styles.paragraph}>
          Utilizamos tu información para:{'\n\n'}
          - Proporcionar y mejorar nuestros servicios{'\n'}
          - Personalizar tu experiencia en la aplicación{'\n'}
          - Mostrarte locales cercanos a tu ubicación{'\n'}
          - Enviarte notificaciones y actualizaciones{'\n'}
          - Responder a tus consultas y solicitudes de soporte{'\n'}
          - Prevenir fraudes y garantizar la seguridad{'\n'}
          - Cumplir con obligaciones legales{'\n'}
          - Realizar análisis y estadísticas
        </Text>

        <Text style={styles.sectionTitle}>3. Compartir tu Información</Text>
        <Text style={styles.paragraph}>
          NO vendemos tu información personal. Podemos compartir tu información con:{'\n\n'}
          - Otros usuarios (según tu configuración de privacidad){'\n'}
          - Proveedores de servicios que nos ayudan a operar la plataforma{'\n'}
          - Autoridades legales cuando sea requerido por ley{'\n'}
          - Terceros en caso de fusión o adquisición (con previo aviso)
        </Text>

        <Text style={styles.sectionTitle}>4. Tus Derechos</Text>
        <Text style={styles.paragraph}>
          Tienes derecho a:{'\n\n'}
          - Acceder a tu información personal{'\n'}
          - Corregir información inexacta{'\n'}
          - Solicitar la eliminación de tu cuenta y datos{'\n'}
          - Oponerte al procesamiento de tus datos{'\n'}
          - Exportar tus datos en formato legible{'\n'}
          - Retirar tu consentimiento en cualquier momento{'\n'}
          - Presentar una queja ante la autoridad de protección de datos
        </Text>

        <Text style={styles.sectionTitle}>5. Seguridad de los Datos</Text>
        <Text style={styles.paragraph}>
          Implementamos medidas de seguridad técnicas y organizativas para proteger tu información:{'\n\n'}
          - Encriptación de datos en tránsito y en reposo{'\n'}
          - Autenticación segura de usuarios{'\n'}
          - Controles de acceso estrictos{'\n'}
          - Monitoreo continuo de seguridad{'\n'}
          - Auditorías de seguridad regulares
        </Text>

        <Text style={styles.sectionTitle}>6. Retención de Datos</Text>
        <Text style={styles.paragraph}>
          Conservamos tu información personal mientras tu cuenta esté activa o según sea necesario 
          para proporcionar nuestros servicios. Puedes solicitar la eliminación de tu cuenta en 
          cualquier momento desde la configuración de la aplicación.
        </Text>

        <Text style={styles.sectionTitle}>7. Privacidad de Menores</Text>
        <Text style={styles.paragraph}>
          BarLive no está dirigido a menores de 18 años. No recopilamos intencionalmente información 
          de menores. Si descubrimos que hemos recopilado información de un menor, la eliminaremos 
          inmediatamente.
        </Text>

        <Text style={styles.sectionTitle}>8. Cookies y Tecnologías Similares</Text>
        <Text style={styles.paragraph}>
          Utilizamos cookies y tecnologías similares para:{'\n\n'}
          - Mantener tu sesión activa{'\n'}
          - Recordar tus preferencias{'\n'}
          - Analizar el uso de la aplicación{'\n'}
          - Mejorar el rendimiento y la experiencia del usuario
        </Text>

        <Text style={styles.sectionTitle}>9. Transferencias Internacionales</Text>
        <Text style={styles.paragraph}>
          Tus datos pueden ser transferidos y procesados en servidores ubicados fuera de tu país. 
          Nos aseguramos de que estas transferencias cumplan con las leyes de protección de datos 
          aplicables.
        </Text>

        <Text style={styles.sectionTitle}>10. Cambios en esta Política</Text>
        <Text style={styles.paragraph}>
          Podemos actualizar esta Política de Privacidad ocasionalmente. Te notificaremos sobre 
          cambios significativos a través de la aplicación o por correo electrónico. Te recomendamos 
          revisar esta política periódicamente.
        </Text>

        <Text style={styles.sectionTitle}>11. Contacto</Text>
        <Text style={styles.paragraph}>
          Si tienes preguntas sobre esta Política de Privacidad o sobre cómo manejamos tus datos, 
          puedes contactarnos en:{'\n\n'}
          Email: privacidad@barlive.es{'\n'}
          Dirección: BarLive, Madrid, España{'\n'}
          Delegado de Protección de Datos: dpo@barlive.es
        </Text>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Tu privacidad es importante para nosotros. Nos comprometemos a proteger tu información 
            personal y a ser transparentes sobre cómo la usamos.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 50,
    paddingBottom: 20,
    paddingHorizontal: 16,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.headerText,
    flex: 1,
    textAlign: 'center',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  lastUpdated: {
    fontSize: 14,
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginBottom: 16,
  },
  intro: {
    fontSize: 15,
    color: colors.text,
    lineHeight: 24,
    marginBottom: 24,
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 20,
    marginBottom: 12,
  },
  subsectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginTop: 12,
    marginBottom: 8,
  },
  paragraph: {
    fontSize: 15,
    color: colors.text,
    lineHeight: 24,
    marginBottom: 16,
  },
  footer: {
    marginTop: 32,
    padding: 16,
    backgroundColor: colors.primary + '15',
    borderRadius: 12,
  },
  footerText: {
    fontSize: 14,
    color: colors.primary,
    textAlign: 'center',
    lineHeight: 20,
  },
});
