
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { getContentBottomPadding, getHeaderTitleSize, getHeaderIconSize, scaleFontSize, scaleIconSize } from '@/utils/androidScaling';

/**
 * ✅ RECUPERAR PASSWORD SCREEN v144.0 - ANDROID SCROLL & SCALING FIX
 * 
 * CRITICAL FIXES v144.0 (ANDROID ONLY):
 * - ✅ Enabled proper keyboard-aware scrolling (INCLUDES HEADER)
 * - ✅ Added bottom padding for Android navigation buttons
 * - ✅ Consistent header title and icon sizes
 * - ✅ ALL text uses scaleFontSize() for consistency
 * - ✅ ALL icons use scaleIconSize() for consistency
 * - ✅ Content no longer hidden by keyboard or nav buttons
 * - ✅ iOS design remains unchanged
 */

export default function RecuperarPasswordV7Screen() {
  const router = useRouter();
  
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSendToken = () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Por favor, ingresa tu correo electrónico');
      return;
    }

    if (!validateEmail(email.trim())) {
      Alert.alert('Error', 'Por favor, ingresa un correo electrónico válido');
      return;
    }

    router.push('/auth/recuperar-password-token');
  };

  const headerIconSize = getHeaderIconSize();

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scrollContainer,
          { paddingBottom: getContentBottomPadding(120) }
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
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
          <Text style={[styles.headerTitle, { fontSize: getHeaderTitleSize() }]}>Recuperar contraseña</Text>
          <Text style={[styles.headerSubtitle, { fontSize: scaleFontSize(16) }]}>Te ayudaremos a recuperar tu cuenta</Text>
        </LinearGradient>

        <View style={styles.content}>
          <View style={styles.formContainer}>
            <View style={styles.infoBox}>
              <IconSymbol
                ios_icon_name="envelope.badge.shield.half.filled"
                android_material_icon_name="mark_email_unread"
                size={scaleIconSize(80)}
                color={colors.primary}
              />
              <Text style={[styles.infoTitle, { fontSize: scaleFontSize(26) }]}>Recupera tu cuenta</Text>
              <Text style={[styles.infoText, { fontSize: scaleFontSize(15) }]}>
                Ingresa tu correo electrónico y te enviaremos un código de 6 dígitos para restablecer tu contraseña.
              </Text>
            </View>

            <View style={styles.inputContainer}>
              <Text style={[styles.label, { fontSize: scaleFontSize(15) }]}>Correo electrónico</Text>
              <View style={styles.inputWrapper}>
                <IconSymbol
                  ios_icon_name="envelope.fill"
                  android_material_icon_name="email"
                  size={scaleIconSize(20)}
                  color={colors.textSecondary}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={[styles.input, { fontSize: scaleFontSize(16) }]}
                  placeholder="correo@ejemplo.com"
                  placeholderTextColor={colors.textSecondary}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading}
                />
              </View>
            </View>

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleSendToken}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <React.Fragment>
                  <IconSymbol
                    ios_icon_name="paperplane.fill"
                    android_material_icon_name="send"
                    size={scaleIconSize(20)}
                    color="#fff"
                    style={styles.buttonIcon}
                  />
                  <Text style={[styles.buttonText, { fontSize: scaleFontSize(16) }]}>Continuar</Text>
                </React.Fragment>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.backToLoginButton}
              onPress={() => router.replace('/auth/login-v6')}
            >
              <IconSymbol
                ios_icon_name="arrow.left"
                android_material_icon_name="arrow_back"
                size={scaleIconSize(16)}
                color={colors.primary}
                style={styles.backToLoginIcon}
              />
              <Text style={[styles.backToLoginText, { fontSize: scaleFontSize(15) }]}>
                Volver a <Text style={styles.backToLoginTextBold}>Iniciar sesión</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContainer: {
    flexGrow: 1,
    // paddingBottom set dynamically via getContentBottomPadding()
  },
  header: {
    paddingTop: Platform.OS === 'android' ? 60 : 60,
    paddingBottom: 32,
    paddingHorizontal: 24,
  },
  backButton: {
    marginBottom: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    // fontSize set dynamically via getHeaderTitleSize()
    fontWeight: 'bold',
    color: colors.headerText,
    marginBottom: 8,
  },
  headerSubtitle: {
    // fontSize set dynamically via scaleFontSize()
    color: 'rgba(255, 255, 255, 0.9)',
  },
  content: {
    flex: 1,
    padding: 24,
  },
  formContainer: {
    flex: 1,
  },
  infoBox: {
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    padding: 32,
    marginBottom: 32,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  infoTitle: {
    // fontSize set dynamically via scaleFontSize()
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 20,
    marginBottom: 12,
  },
  infoText: {
    // fontSize set dynamically via scaleFontSize()
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  inputContainer: {
    marginBottom: 24,
  },
  label: {
    // fontSize set dynamically via scaleFontSize()
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    padding: 16,
    // fontSize set dynamically via scaleFontSize()
    color: colors.text,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    ...Platform.select({
      ios: {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonIcon: {
    marginRight: 8,
  },
  buttonText: {
    color: '#fff',
    // fontSize set dynamically via scaleFontSize()
    fontWeight: '600',
  },
  backToLoginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  backToLoginIcon: {
    marginRight: 8,
  },
  backToLoginText: {
    // fontSize set dynamically via scaleFontSize()
    color: colors.textSecondary,
  },
  backToLoginTextBold: {
    fontWeight: '600',
    color: colors.primary,
  },
});
