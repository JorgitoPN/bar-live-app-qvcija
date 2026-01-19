
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { colors, commonStyles } from '@/styles/commonStyles';

export default function AcercaDeScreen() {
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
          <Text style={styles.headerTitle}>Acerca de BarLive</Text>
          <View style={styles.placeholder} />
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <View style={styles.logoContainer}>
          <View style={styles.logoCircle}>
            <IconSymbol name="wineglass" size={48} color={colors.primary} />
          </View>
          <Text style={styles.appName}>BarLive</Text>
          <Text style={styles.version}>Versión 1.0.0</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Nuestra Misión</Text>
          <Text style={styles.paragraph}>
            BarLive es la plataforma social definitiva para descubrir y conectar con los mejores 
            locales de ocio en España. Nuestra misión es ayudarte a encontrar el lugar perfecto 
            para cada momento, ya sea un café tranquilo para trabajar, un bar animado para salir 
            con amigos, o un restaurante romántico para una cena especial.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>¿Qué Ofrecemos?</Text>
          <View style={styles.featureItem}>
            <IconSymbol name="map.fill" size={24} color={colors.primary} />
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>Descubre Locales</Text>
              <Text style={styles.featureDescription}>
                Explora miles de bares, restaurantes, cafés y discotecas en toda España
              </Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <IconSymbol name="star.fill" size={24} color={colors.primary} />
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>Reseñas Auténticas</Text>
              <Text style={styles.featureDescription}>
                Lee opiniones reales de otros usuarios y comparte tus experiencias
              </Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <IconSymbol name="person.3.fill" size={24} color={colors.primary} />
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>Red Social</Text>
              <Text style={styles.featureDescription}>
                Conecta con amigos, comparte momentos y descubre nuevos lugares juntos
              </Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <IconSymbol name="calendar.badge.clock" size={24} color={colors.primary} />
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>Eventos y Promociones</Text>
              <Text style={styles.featureDescription}>
                Mantente al día con los mejores eventos y ofertas especiales
              </Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <IconSymbol name="briefcase.fill" size={24} color={colors.primary} />
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>Oportunidades Laborales</Text>
              <Text style={styles.featureDescription}>
                Encuentra trabajo en el sector de la hostelería o contrata personal
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Nuestros Valores</Text>
          <Text style={styles.paragraph}>
            - <Text style={styles.bold}>Autenticidad:</Text> Promovemos reseñas y contenido genuino{'\n'}
            - <Text style={styles.bold}>Comunidad:</Text> Fomentamos conexiones reales entre personas{'\n'}
            - <Text style={styles.bold}>Innovación:</Text> Mejoramos constantemente nuestra plataforma{'\n'}
            - <Text style={styles.bold}>Privacidad:</Text> Protegemos tus datos personales{'\n'}
            - <Text style={styles.bold}>Inclusión:</Text> Todos son bienvenidos en BarLive
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tecnología</Text>
          <Text style={styles.paragraph}>
            BarLive está construido con las últimas tecnologías móviles para ofrecerte la mejor 
            experiencia posible. Utilizamos React Native, Expo y Supabase para crear una aplicación 
            rápida, segura y confiable.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contacto</Text>
          <TouchableOpacity 
            style={styles.contactItem}
            onPress={() => Linking.openURL('mailto:info@barlive.es')}
          >
            <IconSymbol name="envelope.fill" size={20} color={colors.primary} />
            <Text style={styles.contactText}>info@barlive.es</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.contactItem}
            onPress={() => Linking.openURL('https://www.barlive.es')}
          >
            <IconSymbol name="globe" size={20} color={colors.primary} />
            <Text style={styles.contactText}>www.barlive.es</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.contactItem}
            onPress={() => Linking.openURL('https://instagram.com/barlive')}
          >
            <IconSymbol name="camera.fill" size={20} color={colors.primary} />
            <Text style={styles.contactText}>@barlive</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            © 2025 BarLive. Todos los derechos reservados.
          </Text>
          <Text style={styles.footerSubtext}>
            Hecho con ❤️ en España
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
  logoContainer: {
    alignItems: 'center',
    marginVertical: 32,
  },
  logoCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  appName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  version: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 16,
  },
  paragraph: {
    fontSize: 15,
    color: colors.text,
    lineHeight: 24,
  },
  bold: {
    fontWeight: '600',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
    gap: 16,
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    marginBottom: 12,
  },
  contactText: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '500',
  },
  footer: {
    marginTop: 32,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  footerSubtext: {
    fontSize: 14,
    color: colors.textSecondary,
  },
});
