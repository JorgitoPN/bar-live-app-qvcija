
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { 
  scaleFontSize, 
  scaleIconSize, 
  getHeaderTitleSize,
  getHeaderIconSize,
  getContentBottomPadding,
  getLetterSpacing,
  scaleBorderRadius,
  getButtonHeight,
  getButtonPaddingVertical,
} from '@/utils/androidScaling';

/**
 * ✅ ACCOUNT REQUIRED SCREEN v280.0 - COMPREHENSIVE ANDROID SCALING
 * 
 * NEW FIXES v280.0:
 * - ✅ ALL text sizes use scaleFontSize() with letter spacing
 * - ✅ ALL buttons use scaled heights and paddings
 * - ✅ ALL dimensions properly scaled
 * - ✅ Border radius scaled
 * - ✅ Consistent with iOS design proportions
 */
export default function AccountRequiredScreen() {
  const router = useRouter();

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
            size={getHeaderIconSize()}
            color="#fff"
          />
        </TouchableOpacity>
        
        <View style={styles.logoContainer}>
          <View style={styles.logoCircle}>
            <IconSymbol
              ios_icon_name="person.badge.key.fill"
              android_material_icon_name="vpn_key"
              size={scaleIconSize(56)}
              color="#fff"
            />
          </View>
        </View>
        
        <Text style={styles.headerTitle}>Cuenta requerida</Text>
        <Text style={styles.headerSubtitle}>
          Necesitas una cuenta para acceder a esta función
        </Text>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        contentContainerStyle={{
          padding: Platform.OS === 'android' ? 20 : 24,
          paddingBottom: getContentBottomPadding(40),
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.featuresContainer}>
          <View style={styles.featureItem}>
            <View style={[styles.featureIcon, { backgroundColor: colors.primary + '20' }]}>
              <IconSymbol
                ios_icon_name="heart.fill"
                android_material_icon_name="favorite"
                size={scaleIconSize(24)}
                color={colors.primary}
              />
            </View>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>Guarda tus favoritos</Text>
              <Text style={styles.featureDescription}>
                Marca tus locales favoritos y accede a ellos desde cualquier dispositivo
              </Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <View style={[styles.featureIcon, { backgroundColor: colors.secondary + '20' }]}>
              <IconSymbol
                ios_icon_name="person.2.fill"
                android_material_icon_name="people"
                size={scaleIconSize(24)}
                color={colors.secondary}
              />
            </View>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>Conecta con amigos</Text>
              <Text style={styles.featureDescription}>
                Descubre dónde están tus amigos y comparte tus experiencias
              </Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <View style={[styles.featureIcon, { backgroundColor: '#10B981' + '20' }]}>
              <IconSymbol
                ios_icon_name="star.fill"
                android_material_icon_name="star"
                size={scaleIconSize(24)}
                color="#10B981"
              />
            </View>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>Deja reseñas</Text>
              <Text style={styles.featureDescription}>
                Comparte tu opinión y ayuda a otros a descubrir los mejores lugares
              </Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.button, {
            borderRadius: scaleBorderRadius(12),
            minHeight: getButtonHeight(),
          }]}
          onPress={() => router.push('/auth/registro-v6')}
        >
          <LinearGradient
            colors={[colors.primary, colors.secondary]}
            style={[styles.buttonGradient, {
              borderRadius: scaleBorderRadius(12),
              paddingVertical: getButtonPaddingVertical(),
            }]}
          >
            <IconSymbol
              ios_icon_name="person.badge.plus.fill"
              android_material_icon_name="person_add"
              size={scaleIconSize(20)}
              color="#fff"
            />
            <Text style={styles.buttonText}>Crear cuenta gratis</Text>
          </LinearGradient>
        </TouchableOpacity>

        <View style={styles.loginContainer}>
          <Text style={styles.loginText}>¿Ya tienes cuenta? </Text>
          <TouchableOpacity onPress={() => router.push('/auth/login-v6')}>
            <Text style={styles.loginLink}>Inicia sesión</Text>
          </TouchableOpacity>
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
    paddingTop: Platform.OS === 'android' ? 60 : 80,
    paddingBottom: 40,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  backButton: {
    position: 'absolute',
    top: Platform.OS === 'android' ? 60 : 80,
    left: 24,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    marginBottom: 24,
  },
  logoCircle: {
    width: Platform.OS === 'android' ? 90 : 100,
    height: Platform.OS === 'android' ? 90 : 100,
    borderRadius: Platform.OS === 'android' ? 45 : 50,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: getHeaderTitleSize(),
    fontWeight: 'bold',
    color: colors.headerText,
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: getLetterSpacing(getHeaderTitleSize()),
  },
  headerSubtitle: {
    fontSize: scaleFontSize(15),
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    letterSpacing: getLetterSpacing(scaleFontSize(15)),
  },
  content: {
    flex: 1,
  },
  featuresContainer: {
    gap: Platform.OS === 'android' ? 18 : 20,
    marginBottom: 32,
  },
  featureItem: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'flex-start',
  },
  featureIcon: {
    width: Platform.OS === 'android' ? 52 : 56,
    height: Platform.OS === 'android' ? 52 : 56,
    borderRadius: Platform.OS === 'android' ? 26 : 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontSize: scaleFontSize(16),
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
    letterSpacing: getLetterSpacing(scaleFontSize(16)),
  },
  featureDescription: {
    fontSize: scaleFontSize(14),
    color: colors.textSecondary,
    lineHeight: scaleFontSize(14) * 1.5,
    letterSpacing: getLetterSpacing(scaleFontSize(14)),
  },
  button: {
    overflow: 'hidden',
    marginBottom: 20,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 24,
  },
  buttonText: {
    fontSize: scaleFontSize(16),
    fontWeight: '600',
    color: '#fff',
    letterSpacing: getLetterSpacing(scaleFontSize(16)),
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginText: {
    fontSize: scaleFontSize(14),
    color: colors.textSecondary,
    letterSpacing: getLetterSpacing(scaleFontSize(14)),
  },
  loginLink: {
    fontSize: scaleFontSize(14),
    fontWeight: '600',
    color: colors.primary,
    letterSpacing: getLetterSpacing(scaleFontSize(14)),
  },
});
