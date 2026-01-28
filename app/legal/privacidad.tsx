
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
import { colors } from '@/styles/commonStyles';
import { scaleFontSize, getHeaderTitleSize, getHeaderIconSize } from '@/utils/androidScaling';

export default function PrivacidadScreen() {
  const router = useRouter();

  const headerIconSize = getHeaderIconSize();
  const headerTitleSize = getHeaderTitleSize();
  const bodyTextSize = scaleFontSize(15);
  const titleTextSize = scaleFontSize(18);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.headerGradientStart, colors.headerGradientEnd]}
        style={styles.header}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <IconSymbol
            ios_icon_name="chevron.left"
            android_material_icon_name="arrow_back"
            size={headerIconSize}
            color="#fff"
          />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { fontSize: headerTitleSize }]}>
          Política de Privacidad
        </Text>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.lastUpdated, { fontSize: bodyTextSize }]}>
          Última actualización: {new Date().toLocaleDateString('es-ES')}
        </Text>

        <Text style={[styles.sectionTitle, { fontSize: titleTextSize }]}>
          1. Información que Recopilamos
        </Text>
        <Text style={[styles.paragraph, { fontSize: bodyTextSize }]}>
          Recopilamos diferentes tipos de información para proporcionar y mejorar nuestro servicio:
        </Text>
        <Text style={[styles.bulletPoint, { fontSize: bodyTextSize }]}>
          • <Text style={styles.bold}>Información de cuenta:</Text> nombre, correo electrónico, nombre de usuario
        </Text>
        <Text style={[styles.bulletPoint, { fontSize: bodyTextSize }]}>
          • <Text style={styles.bold}>Información de perfil:</Text> foto de perfil, biografía, preferencias
        </Text>
        <Text style={[styles.bulletPoint, { fontSize: bodyTextSize }]}>
          • <Text style={styles.bold}>Contenido del usuario:</Text> publicaciones, comentarios, reseñas, fotos
        </Text>
        <Text style={[styles.bulletPoint, { fontSize: bodyTextSize }]}>
          • <Text style={styles.bold}>Información de uso:</Text> interacciones con la aplicación, locales visitados
        </Text>
        <Text style={[styles.bulletPoint, { fontSize: bodyTextSize }]}>
          • <Text style={styles.bold}>Información del dispositivo:</Text> tipo de dispositivo, sistema operativo, identificadores únicos
        </Text>
        <Text style={[styles.bulletPoint, { fontSize: bodyTextSize }]}>
          • <Text style={styles.bold}>Ubicación:</Text> ubicación aproximada para mostrar locales cercanos (solo con tu permiso)
        </Text>

        <Text style={[styles.sectionTitle, { fontSize: titleTextSize }]}>
          2. Cómo Utilizamos tu Información
        </Text>
        <Text style={[styles.paragraph, { fontSize: bodyTextSize }]}>
          Utilizamos la información recopilada para:
        </Text>
        <Text style={[styles.bulletPoint, { fontSize: bodyTextSize }]}>
          • Proporcionar y mantener nuestro servicio
        </Text>
        <Text style={[styles.bulletPoint, { fontSize: bodyTextSize }]}>
          • Personalizar tu experiencia
        </Text>
        <Text style={[styles.bulletPoint, { fontSize: bodyTextSize }]}>
          • Mejorar nuestros servicios
        </Text>
        <Text style={[styles.bulletPoint, { fontSize: bodyTextSize }]}>
          • Comunicarnos contigo sobre actualizaciones y novedades
        </Text>
        <Text style={[styles.bulletPoint, { fontSize: bodyTextSize }]}>
          • Detectar y prevenir fraudes y abusos
        </Text>
        <Text style={[styles.bulletPoint, { fontSize: bodyTextSize }]}>
          • Cumplir con obligaciones legales
        </Text>

        <Text style={[styles.sectionTitle, { fontSize: titleTextSize }]}>
          3. Cookies y Tecnologías Similares
        </Text>
        <Text style={[styles.paragraph, { fontSize: bodyTextSize }]}>
          Utilizamos cookies y tecnologías similares para:
        </Text>
        <Text style={[styles.bulletPoint, { fontSize: bodyTextSize }]}>
          • <Text style={styles.bold}>Cookies esenciales:</Text> necesarias para el funcionamiento básico de la aplicación (inicio de sesión, preferencias)
        </Text>
        <Text style={[styles.bulletPoint, { fontSize: bodyTextSize }]}>
          • <Text style={styles.bold}>Cookies de rendimiento:</Text> nos ayudan a entender cómo usas la aplicación
        </Text>
        <Text style={[styles.bulletPoint, { fontSize: bodyTextSize }]}>
          • <Text style={styles.bold}>Cookies de funcionalidad:</Text> recuerdan tus preferencias y configuraciones
        </Text>
        <Text style={[styles.paragraph, { fontSize: bodyTextSize }]}>
          Puedes gestionar las cookies desde Configuración → Borrar datos de navegación. Ten en cuenta que rechazar cookies puede afectar la funcionalidad de la aplicación, especialmente el inicio de sesión automático.
        </Text>

        <Text style={[styles.sectionTitle, { fontSize: titleTextSize }]}>
          4. Compartir Información
        </Text>
        <Text style={[styles.paragraph, { fontSize: bodyTextSize }]}>
          No vendemos tu información personal. Podemos compartir información en los siguientes casos:
        </Text>
        <Text style={[styles.bulletPoint, { fontSize: bodyTextSize }]}>
          • <Text style={styles.bold}>Con tu consentimiento:</Text> cuando nos autorizas explícitamente
        </Text>
        <Text style={[styles.bulletPoint, { fontSize: bodyTextSize }]}>
          • <Text style={styles.bold}>Proveedores de servicios:</Text> empresas que nos ayudan a operar la aplicación
        </Text>
        <Text style={[styles.bulletPoint, { fontSize: bodyTextSize }]}>
          • <Text style={styles.bold}>Cumplimiento legal:</Text> cuando sea requerido por ley
        </Text>
        <Text style={[styles.bulletPoint, { fontSize: bodyTextSize }]}>
          • <Text style={styles.bold}>Protección de derechos:</Text> para proteger nuestros derechos y los de nuestros usuarios
        </Text>

        <Text style={[styles.sectionTitle, { fontSize: titleTextSize }]}>
          5. Seguridad de los Datos
        </Text>
        <Text style={[styles.paragraph, { fontSize: bodyTextSize }]}>
          Implementamos medidas de seguridad técnicas y organizativas para proteger tu información:
        </Text>
        <Text style={[styles.bulletPoint, { fontSize: bodyTextSize }]}>
          • Cifrado de datos en tránsito y en reposo
        </Text>
        <Text style={[styles.bulletPoint, { fontSize: bodyTextSize }]}>
          • Controles de acceso estrictos
        </Text>
        <Text style={[styles.bulletPoint, { fontSize: bodyTextSize }]}>
          • Monitoreo continuo de seguridad
        </Text>
        <Text style={[styles.bulletPoint, { fontSize: bodyTextSize }]}>
          • Auditorías de seguridad regulares
        </Text>

        <Text style={[styles.sectionTitle, { fontSize: titleTextSize }]}>
          6. Tus Derechos
        </Text>
        <Text style={[styles.paragraph, { fontSize: bodyTextSize }]}>
          Tienes derecho a:
        </Text>
        <Text style={[styles.bulletPoint, { fontSize: bodyTextSize }]}>
          • <Text style={styles.bold}>Acceder</Text> a tu información personal
        </Text>
        <Text style={[styles.bulletPoint, { fontSize: bodyTextSize }]}>
          • <Text style={styles.bold}>Rectificar</Text> información incorrecta
        </Text>
        <Text style={[styles.bulletPoint, { fontSize: bodyTextSize }]}>
          • <Text style={styles.bold}>Eliminar</Text> tu cuenta y datos
        </Text>
        <Text style={[styles.bulletPoint, { fontSize: bodyTextSize }]}>
          • <Text style={styles.bold}>Exportar</Text> tus datos
        </Text>
        <Text style={[styles.bulletPoint, { fontSize: bodyTextSize }]}>
          • <Text style={styles.bold}>Oponerte</Text> al procesamiento de tus datos
        </Text>
        <Text style={[styles.bulletPoint, { fontSize: bodyTextSize }]}>
          • <Text style={styles.bold}>Limitar</Text> el procesamiento de tus datos
        </Text>

        <Text style={[styles.sectionTitle, { fontSize: titleTextSize }]}>
          7. Retención de Datos
        </Text>
        <Text style={[styles.paragraph, { fontSize: bodyTextSize }]}>
          Conservamos tu información personal mientras tu cuenta esté activa o según sea necesario para proporcionarte servicios. Puedes solicitar la eliminación de tu cuenta en cualquier momento desde la configuración de la aplicación.
        </Text>

        <Text style={[styles.sectionTitle, { fontSize: titleTextSize }]}>
          8. Menores de Edad
        </Text>
        <Text style={[styles.paragraph, { fontSize: bodyTextSize }]}>
          BarLive está destinado a usuarios mayores de 18 años. No recopilamos intencionalmente información de menores de edad. Si descubrimos que hemos recopilado información de un menor, la eliminaremos inmediatamente.
        </Text>

        <Text style={[styles.sectionTitle, { fontSize: titleTextSize }]}>
          9. Cambios en esta Política
        </Text>
        <Text style={[styles.paragraph, { fontSize: bodyTextSize }]}>
          Podemos actualizar esta Política de Privacidad periódicamente. Te notificaremos sobre cambios significativos publicando la nueva política en la aplicación y actualizando la fecha de "Última actualización".
        </Text>

        <Text style={[styles.sectionTitle, { fontSize: titleTextSize }]}>
          10. Contacto
        </Text>
        <Text style={[styles.paragraph, { fontSize: bodyTextSize }]}>
          Si tienes preguntas sobre esta Política de Privacidad o sobre cómo manejamos tus datos, puedes contactarnos a través de la sección de soporte en la aplicación.
        </Text>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { fontSize: bodyTextSize }]}>
            © {new Date().getFullYear()} BarLive. Todos los derechos reservados.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingTop: Platform.OS === 'android' ? 48 : 60,
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  backButton: {
    marginBottom: 12,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontWeight: 'bold',
    color: colors.headerText,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  lastUpdated: {
    color: colors.textSecondary,
    marginBottom: 24,
    fontStyle: 'italic',
  },
  sectionTitle: {
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 24,
    marginBottom: 12,
  },
  paragraph: {
    color: colors.text,
    lineHeight: 24,
    marginBottom: 12,
  },
  bulletPoint: {
    color: colors.text,
    lineHeight: 24,
    marginBottom: 8,
    paddingLeft: 8,
  },
  bold: {
    fontWeight: '600',
  },
  footer: {
    marginTop: 40,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
    alignItems: 'center',
  },
  footerText: {
    color: colors.textSecondary,
  },
});
