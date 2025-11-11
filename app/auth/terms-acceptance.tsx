
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/contexts/AuthContext';

export default function TermsAcceptanceScreen() {
  const router = useRouter();
  const { refreshUser } = useAuth();
  const params = useLocalSearchParams();
  const userId = params.userId as string;
  
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
  const [acceptedCookies, setAcceptedCookies] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleAccept = async () => {
    if (!acceptedTerms || !acceptedPrivacy || !acceptedCookies) {
      Alert.alert(
        'Aceptación requerida',
        'Debes aceptar todos los términos para continuar usando BarLive'
      );
      return;
    }

    setLoading(true);
    try {
      // Record terms acceptance
      const { error: termsError } = await supabase
        .from('terms_acceptance')
        .insert({
          usuario_id: userId,
          terms_version: '1.0',
          privacy_version: '1.0',
          cookies_consent: true,
        });

      if (termsError) {
        console.error('Error recording terms acceptance:', termsError);
        throw termsError;
      }

      // Update user profile
      const { error: updateError } = await supabase
        .from('usuarios')
        .update({
          ha_aceptado_terminos: true,
          fecha_aceptacion_terminos: new Date().toISOString(),
        })
        .eq('id', userId);

      if (updateError) {
        console.error('Error updating user:', updateError);
        throw updateError;
      }

      // Refresh user data
      await refreshUser();

      // Check if user needs to complete profile
      const { data: userData } = await supabase
        .from('usuarios')
        .select('perfil_completado, nombre, username')
        .eq('id', userId)
        .single();

      if (!userData?.perfil_completado || !userData?.nombre || !userData?.username) {
        // New user - go to complete profile
        router.replace({
          pathname: '/auth/completar-perfil',
          params: { userId }
        });
      } else {
        // Existing user - go to main app
        router.replace('/(tabs)/explorar');
      }
    } catch (error: any) {
      console.error('Error accepting terms:', error);
      Alert.alert('Error', 'No se pudo registrar la aceptación. Por favor, intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const openTerms = () => {
    router.push('/legal/terminos');
  };

  const openPrivacy = () => {
    router.push('/legal/privacidad');
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.headerGradientStart, colors.headerGradientEnd]}
        style={styles.header}
      >
        <IconSymbol name="doc.text.fill" size={64} color="#FFFFFF" />
        <Text style={styles.headerTitle}>Términos y Condiciones</Text>
        <Text style={styles.headerSubtitle}>
          Por favor, revisa y acepta nuestros términos para continuar
        </Text>
      </LinearGradient>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Bienvenido a BarLive</Text>
          <Text style={styles.sectionText}>
            Para usar BarLive, necesitamos que aceptes nuestros términos y condiciones,
            política de privacidad y el uso de cookies.
          </Text>
        </View>

        <View style={styles.checkboxContainer}>
          <TouchableOpacity
            style={styles.checkbox}
            onPress={() => setAcceptedTerms(!acceptedTerms)}
          >
            <View style={[styles.checkboxBox, acceptedTerms && styles.checkboxBoxChecked]}>
              {acceptedTerms && (
                <IconSymbol name="checkmark" size={16} color="#FFFFFF" />
              )}
            </View>
            <View style={styles.checkboxTextContainer}>
              <Text style={styles.checkboxText}>
                He leído y acepto los{' '}
                <Text style={styles.link} onPress={openTerms}>
                  Términos y Condiciones
                </Text>
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.checkbox}
            onPress={() => setAcceptedPrivacy(!acceptedPrivacy)}
          >
            <View style={[styles.checkboxBox, acceptedPrivacy && styles.checkboxBoxChecked]}>
              {acceptedPrivacy && (
                <IconSymbol name="checkmark" size={16} color="#FFFFFF" />
              )}
            </View>
            <View style={styles.checkboxTextContainer}>
              <Text style={styles.checkboxText}>
                He leído y acepto la{' '}
                <Text style={styles.link} onPress={openPrivacy}>
                  Política de Privacidad
                </Text>
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.checkbox}
            onPress={() => setAcceptedCookies(!acceptedCookies)}
          >
            <View style={[styles.checkboxBox, acceptedCookies && styles.checkboxBoxChecked]}>
              {acceptedCookies && (
                <IconSymbol name="checkmark" size={16} color="#FFFFFF" />
              )}
            </View>
            <View style={styles.checkboxTextContainer}>
              <Text style={styles.checkboxText}>
                Acepto el uso de cookies para mejorar mi experiencia
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.infoBox}>
          <IconSymbol name="info.circle.fill" size={24} color={colors.primary} />
          <Text style={styles.infoText}>
            Tus datos están protegidos y solo se usarán según nuestra política de privacidad.
            Puedes revocar tu consentimiento en cualquier momento desde la configuración.
          </Text>
        </View>

        <TouchableOpacity
          style={[
            styles.button,
            (!acceptedTerms || !acceptedPrivacy || !acceptedCookies) && styles.buttonDisabled
          ]}
          onPress={handleAccept}
          disabled={loading || !acceptedTerms || !acceptedPrivacy || !acceptedCookies}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>Aceptar y Continuar</Text>
          )}
        </TouchableOpacity>
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
    paddingTop: 60,
    paddingBottom: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 16,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#FFFFFF',
    marginTop: 8,
    textAlign: 'center',
    opacity: 0.9,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 12,
  },
  sectionText: {
    fontSize: 16,
    color: colors.textSecondary,
    lineHeight: 24,
  },
  checkboxContainer: {
    marginBottom: 24,
    gap: 16,
  },
  checkbox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  checkboxBox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.cardBackground,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxBoxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkboxTextContainer: {
    flex: 1,
  },
  checkboxText: {
    fontSize: 16,
    color: colors.text,
    lineHeight: 24,
  },
  link: {
    color: colors.primary,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: colors.primary + '10',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});
