
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

export default function TerminosScreen() {
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
          <Text style={styles.headerTitle}>Términos y Condiciones</Text>
          <View style={styles.placeholder} />
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <Text style={styles.lastUpdated}>Última actualización: 1 de enero de 2025</Text>

        <Text style={styles.sectionTitle}>1. Aceptación de los Términos</Text>
        <Text style={styles.paragraph}>
          Al acceder y utilizar BarLive, aceptas estar sujeto a estos Términos y Condiciones. 
          Si no estás de acuerdo con alguna parte de estos términos, no debes utilizar nuestra aplicación.
        </Text>

        <Text style={styles.sectionTitle}>2. Descripción del Servicio</Text>
        <Text style={styles.paragraph}>
          BarLive es una plataforma social que permite a los usuarios descubrir, explorar y conectar 
          con locales de ocio en España. Ofrecemos información sobre bares, restaurantes, cafés, 
          discotecas y otros establecimientos de entretenimiento.
        </Text>

        <Text style={styles.sectionTitle}>3. Registro y Cuenta de Usuario</Text>
        <Text style={styles.paragraph}>
          - Debes proporcionar información precisa y actualizada al registrarte{'\n'}
          - Eres responsable de mantener la confidencialidad de tu cuenta{'\n'}
          - Debes notificarnos inmediatamente cualquier uso no autorizado de tu cuenta{'\n'}
          - Debes tener al menos 18 años para crear una cuenta
        </Text>

        <Text style={styles.sectionTitle}>4. Uso Aceptable</Text>
        <Text style={styles.paragraph}>
          Te comprometes a NO:{'\n\n'}
          - Publicar contenido ofensivo, difamatorio o ilegal{'\n'}
          - Acosar, intimidar o amenazar a otros usuarios{'\n'}
          - Suplantar la identidad de otra persona o entidad{'\n'}
          - Utilizar la plataforma para actividades comerciales no autorizadas{'\n'}
          - Intentar acceder a cuentas de otros usuarios{'\n'}
          - Interferir con el funcionamiento de la aplicación
        </Text>

        <Text style={styles.sectionTitle}>5. Contenido del Usuario</Text>
        <Text style={styles.paragraph}>
          - Eres responsable del contenido que publicas en BarLive{'\n'}
          - Nos otorgas una licencia para usar, modificar y distribuir tu contenido{'\n'}
          - Nos reservamos el derecho de eliminar contenido que viole estos términos{'\n'}
          - No reclamamos propiedad sobre tu contenido
        </Text>

        <Text style={styles.sectionTitle}>6. Propiedad Intelectual</Text>
        <Text style={styles.paragraph}>
          Todo el contenido de BarLive, incluyendo diseño, logotipos, texto, gráficos y software, 
          está protegido por derechos de autor y otras leyes de propiedad intelectual. No puedes 
          copiar, modificar o distribuir nuestro contenido sin autorización expresa.
        </Text>

        <Text style={styles.sectionTitle}>7. Información de Locales</Text>
        <Text style={styles.paragraph}>
          - La información sobre locales se proporciona &quot;tal cual&quot;{'\n'}
          - No garantizamos la exactitud o actualidad de toda la información{'\n'}
          - Los horarios, precios y servicios pueden cambiar sin previo aviso{'\n'}
          - Recomendamos verificar la información directamente con el local
        </Text>

        <Text style={styles.sectionTitle}>8. Limitación de Responsabilidad</Text>
        <Text style={styles.paragraph}>
          BarLive no será responsable de:{'\n\n'}
          - Daños directos, indirectos o consecuentes derivados del uso de la aplicación{'\n'}
          - Pérdida de datos o interrupciones del servicio{'\n'}
          - Contenido publicado por otros usuarios{'\n'}
          - Experiencias en los locales listados en la plataforma
        </Text>

        <Text style={styles.sectionTitle}>9. Modificaciones del Servicio</Text>
        <Text style={styles.paragraph}>
          Nos reservamos el derecho de modificar, suspender o discontinuar cualquier aspecto de 
          BarLive en cualquier momento, con o sin previo aviso.
        </Text>

        <Text style={styles.sectionTitle}>10. Terminación</Text>
        <Text style={styles.paragraph}>
          Podemos suspender o terminar tu cuenta si:{'\n\n'}
          - Violas estos Términos y Condiciones{'\n'}
          - Realizas actividades fraudulentas o ilegales{'\n'}
          - Tu comportamiento perjudica a otros usuarios o a la plataforma
        </Text>

        <Text style={styles.sectionTitle}>11. Ley Aplicable</Text>
        <Text style={styles.paragraph}>
          Estos términos se rigen por las leyes de España. Cualquier disputa se resolverá en los 
          tribunales competentes de España.
        </Text>

        <Text style={styles.sectionTitle}>12. Contacto</Text>
        <Text style={styles.paragraph}>
          Si tienes preguntas sobre estos Términos y Condiciones, puedes contactarnos en:{'\n\n'}
          Email: legal@barlive.es{'\n'}
          Dirección: BarLive, Madrid, España
        </Text>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Al continuar usando BarLive, aceptas estos Términos y Condiciones.
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
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 20,
    marginBottom: 12,
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
    fontWeight: '600',
  },
});
