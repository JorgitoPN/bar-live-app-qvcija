
import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Animated,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { scaleFontSize, scaleIconSize, getHeaderTitleSize, getContentBottomPadding } from '@/utils/androidScaling';

/**
 * ✅ ACCOUNT REQUIRED SCREEN
 * 
 * Página intermedia que explica al usuario que necesita una cuenta
 * en Barlive para reclamar o crear un local.
 * 
 * FLUJO:
 * 1. Usuario hace clic en "¿Tienes un local?" en Explorar
 * 2. Si NO está autenticado → viene aquí primero
 * 3. Usuario lee la explicación
 * 4. Usuario hace clic en "Continuar" → va a login
 */

export default function AccountRequiredScreen() {
  const router = useRouter();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    console.log('[AccountRequired] 📄 Pantalla de cuenta requerida mostrada');
    
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const handleContinueToLogin = () => {
    console.log('[AccountRequired] ✅ Usuario continúa al login');
    router.push('/auth/login-v6');
  };

  const handleGoBack = () => {
    console.log('[AccountRequired] ⬅️ Usuario vuelve atrás');
    router.back();
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.headerGradientStart, colors.headerGradientEnd]}
        style={styles.header}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleGoBack}
        >
          <IconSymbol
            ios_icon_name="chevron.left"
            android_material_icon_name="arrow_back"
            size={scaleIconSize(24)}
            color="#fff"
          />
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: getContentBottomPadding(120) }
        ]}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <Animated.View
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={styles.iconContainer}>
            <View style={styles.iconCircle}>
              <IconSymbol
                ios_icon_name="building.2.fill"
                android_material_icon_name="store"
                size={scaleIconSize(64)}
                color={colors.primary}
              />
            </View>
          </View>

          <Text style={[styles.title, { fontSize: getHeaderTitleSize() }]}>
            Cuenta Requerida
          </Text>

          <Text style={[styles.subtitle, { fontSize: scaleFontSize(16) }]}>
            Para reclamar o crear un local en Barlive, necesitas tener una cuenta
          </Text>

          <View style={styles.benefitsContainer}>
            <View style={styles.benefitItem}>
              <View style={styles.benefitIconContainer}>
                <IconSymbol
                  ios_icon_name="checkmark.shield.fill"
                  android_material_icon_name="verified_user"
                  size={scaleIconSize(28)}
                  color={colors.primary}
                />
              </View>
              <View style={styles.benefitTextContainer}>
                <Text style={[styles.benefitTitle, { fontSize: scaleFontSize(16) }]}>
                  Gestiona tu local
                </Text>
                <Text style={[styles.benefitDescription, { fontSize: scaleFontSize(14) }]}>
                  Accede a herramientas para administrar tu negocio
                </Text>
              </View>
            </View>

            <View style={styles.benefitItem}>
              <View style={styles.benefitIconContainer}>
                <IconSymbol
                  ios_icon_name="chart.bar.fill"
                  android_material_icon_name="bar_chart"
                  size={scaleIconSize(28)}
                  color={colors.primary}
                />
              </View>
              <View style={styles.benefitTextContainer}>
                <Text style={[styles.benefitTitle, { fontSize: scaleFontSize(16) }]}>
                  Análisis y estadísticas
                </Text>
                <Text style={[styles.benefitDescription, { fontSize: scaleFontSize(14) }]}>
                  Conoce mejor a tus clientes y mejora tu negocio
                </Text>
              </View>
            </View>

            <View style={styles.benefitItem}>
              <View style={styles.benefitIconContainer}>
                <IconSymbol
                  ios_icon_name="megaphone.fill"
                  android_material_icon_name="campaign"
                  size={scaleIconSize(28)}
                  color={colors.primary}
                />
              </View>
              <View style={styles.benefitTextContainer}>
                <Text style={[styles.benefitTitle, { fontSize: scaleFontSize(16) }]}>
                  Promociona eventos
                </Text>
                <Text style={[styles.benefitDescription, { fontSize: scaleFontSize(14) }]}>
                  Crea y comparte eventos para atraer más clientes
                </Text>
              </View>
            </View>

            <View style={styles.benefitItem}>
              <View style={styles.benefitIconContainer}>
                <IconSymbol
                  ios_icon_name="person.2.fill"
                  android_material_icon_name="people"
                  size={scaleIconSize(28)}
                  color={colors.primary}
                />
              </View>
              <View style={styles.benefitTextContainer}>
                <Text style={[styles.benefitTitle, { fontSize: scaleFontSize(16) }]}>
                  Perfil social
                </Text>
                <Text style={[styles.benefitDescription, { fontSize: scaleFontSize(14) }]}>
                  Conecta con tu comunidad y construye tu marca
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.infoBox}>
            <IconSymbol
              ios_icon_name="info.circle.fill"
              android_material_icon_name="info"
              size={scaleIconSize(20)}
              color={colors.primary}
            />
            <Text style={[styles.infoText, { fontSize: scaleFontSize(13) }]}>
              Crear una cuenta es rápido, gratis y te permite acceder a todas las funcionalidades de Barlive
            </Text>
          </View>
        </Animated.View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={handleGoBack}
          activeOpacity={0.7}
        >
          <Text style={[styles.secondaryButtonText, { fontSize: scaleFontSize(16) }]}>
            Volver
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={handleContinueToLogin}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={[colors.primary, colors.secondary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.primaryGradient}
          >
            <Text style={[styles.primaryButtonText, { fontSize: scaleFontSize(16) }]}>
              Continuar
            </Text>
            <IconSymbol
              ios_icon_name="arrow.right"
              android_material_icon_name="arrow_forward"
              size={scaleIconSize(20)}
              color="#fff"
            />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingTop: Platform.OS === 'android' ? 50 : 60,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    padding: 24,
    paddingTop: 40,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.primary + '30',
  },
  title: {
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 40,
    paddingHorizontal: 16,
  },
  benefitsContainer: {
    gap: 20,
    marginBottom: 32,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
    backgroundColor: colors.cardBackground,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  benefitIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  benefitTextContainer: {
    flex: 1,
    gap: 4,
  },
  benefitTitle: {
    fontWeight: '700',
    color: colors.text,
  },
  benefitDescription: {
    color: colors.textSecondary,
    lineHeight: 20,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: colors.primary + '10',
    borderWidth: 1,
    borderColor: colors.primary + '30',
    borderRadius: 12,
    padding: 16,
  },
  infoText: {
    flex: 1,
    color: colors.text,
    lineHeight: 19,
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    backgroundColor: colors.cardBackground,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: colors.background,
    borderWidth: 2,
    borderColor: colors.cardBorder,
    borderRadius: 12,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: colors.text,
    fontWeight: '600',
  },
  primaryButton: {
    flex: 1,
    height: 56,
    borderRadius: 12,
    overflow: 'hidden',
  },
  primaryGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    gap: 8,
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
});
