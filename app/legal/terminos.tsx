
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

export default function TerminosScreen() {
  const router = useRouter();

  const headerIconSize = getHeaderIconSize();
  const headerTitleSize = getHeaderTitleSize();
  const bodyTextSize = scaleFontSize(15);
  const titleTextSize = scaleFontSize(18);
  const subtitleTextSize = scaleFontSize(16);

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
          Términos de Servicio
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
          1. Aceptación de los Términos
        </Text>
        <Text style={[styles.paragraph, { fontSize: bodyTextSize }]}>
          Al acceder y utilizar BarLive, aceptas estar sujeto a estos Términos de Servicio y a todas las leyes y regulaciones aplicables. Si no estás de acuerdo con alguno de estos términos, no debes utilizar esta aplicación.
        </Text>

        <Text style={[styles.sectionTitle, { fontSize: titleTextSize }]}>
          2. Uso de la Aplicación
        </Text>
        <Text style={[styles.paragraph, { fontSize: bodyTextSize }]}>
          BarLive es una plataforma para descubrir y compartir información sobre locales de ocio nocturno. Te comprometes a:
        </Text>
        <Text style={[styles.bulletPoint, { fontSize: bodyTextSize }]}>
          • Proporcionar información veraz y actualizada
        </Text>
        <Text style={[styles.bulletPoint, { fontSize: bodyTextSize }]}>
          • No publicar contenido ofensivo, ilegal o inapropiado
        </Text>
        <Text style={[styles.bulletPoint, { fontSize: bodyTextSize }]}>
          • Respetar los derechos de propiedad intelectual
        </Text>
        <Text style={[styles.bulletPoint, { fontSize: bodyTextSize }]}>
          • No utilizar la aplicación para fines comerciales no autorizados
        </Text>

        <Text style={[styles.sectionTitle, { fontSize: titleTextSize }]}>
          3. Cuenta de Usuario
        </Text>
        <Text style={[styles.paragraph, { fontSize: bodyTextSize }]}>
          Para acceder a ciertas funciones, debes crear una cuenta. Eres responsable de mantener la confidencialidad de tu contraseña y de todas las actividades que ocurran bajo tu cuenta.
        </Text>

        <Text style={[styles.sectionTitle, { fontSize: titleTextSize }]}>
          4. Contenido del Usuario
        </Text>
        <Text style={[styles.paragraph, { fontSize: bodyTextSize }]}>
          Al publicar contenido en BarLive, otorgas a la aplicación una licencia no exclusiva, mundial y libre de regalías para usar, reproducir y distribuir dicho contenido. Mantienes todos los derechos sobre tu contenido.
        </Text>

        <Text style={[styles.sectionTitle, { fontSize: titleTextSize }]}>
          5. Cookies y Datos
        </Text>
        <Text style={[styles.paragraph, { fontSize: bodyTextSize }]}>
          Utilizamos cookies y tecnologías similares para:
        </Text>
        <Text style={[styles.bulletPoint, { fontSize: bodyTextSize }]}>
          • Recordar tu inicio de sesión
        </Text>
        <Text style={[styles.bulletPoint, { fontSize: bodyTextSize }]}>
          • Guardar tus preferencias
        </Text>
        <Text style={[styles.bulletPoint, { fontSize: bodyTextSize }]}>
          • Mejorar tu experiencia de usuario
        </Text>
        <Text style={[styles.paragraph, { fontSize: bodyTextSize }]}>
          Puedes gestionar las cookies desde la configuración de la aplicación. El rechazo de cookies puede afectar la funcionalidad de la aplicación.
        </Text>

        <Text style={[styles.sectionTitle, { fontSize: titleTextSize }]}>
          6. Propiedad Intelectual
        </Text>
        <Text style={[styles.paragraph, { fontSize: bodyTextSize }]}>
          Todos los derechos de propiedad intelectual sobre la aplicación, incluyendo el diseño, código, logotipos y contenido, pertenecen a BarLive o sus licenciantes.
        </Text>

        <Text style={[styles.sectionTitle, { fontSize: titleTextSize }]}>
          7. Limitación de Responsabilidad
        </Text>
        <Text style={[styles.paragraph, { fontSize: bodyTextSize }]}>
          BarLive se proporciona "tal cual" sin garantías de ningún tipo. No nos hacemos responsables de:
        </Text>
        <Text style={[styles.bulletPoint, { fontSize: bodyTextSize }]}>
          • La exactitud de la información de los locales
        </Text>
        <Text style={[styles.bulletPoint, { fontSize: bodyTextSize }]}>
          • Daños derivados del uso de la aplicación
        </Text>
        <Text style={[styles.bulletPoint, { fontSize: bodyTextSize }]}>
          • Interrupciones del servicio
        </Text>

        <Text style={[styles.sectionTitle, { fontSize: titleTextSize }]}>
          8. Modificaciones
        </Text>
        <Text style={[styles.paragraph, { fontSize: bodyTextSize }]}>
          Nos reservamos el derecho de modificar estos términos en cualquier momento. Los cambios entrarán en vigor inmediatamente después de su publicación en la aplicación.
        </Text>

        <Text style={[styles.sectionTitle, { fontSize: titleTextSize }]}>
          9. Terminación
        </Text>
        <Text style={[styles.paragraph, { fontSize: bodyTextSize }]}>
          Podemos suspender o terminar tu acceso a la aplicación en cualquier momento, sin previo aviso, por violación de estos términos o por cualquier otra razón.
        </Text>

        <Text style={[styles.sectionTitle, { fontSize: titleTextSize }]}>
          10. Contacto
        </Text>
        <Text style={[styles.paragraph, { fontSize: bodyTextSize }]}>
          Si tienes preguntas sobre estos Términos de Servicio, puedes contactarnos a través de la sección de soporte en la aplicación.
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
