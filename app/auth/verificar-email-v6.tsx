
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Animated,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { supabase } from '@/utils/supabase';

export default function VerificarEmailV6Screen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const email = params.email as string || '';
  const nombre = params.nombre as string || '';
  
  const [sendingToken, setSendingToken] = useState(false);
  
  const fadeAnim = useMemo(() => new Animated.Value(0), []);
  const pulseAnim = useMemo(() => new Animated.Value(1), []);

  const handleSendToken = useCallback(async () => {
    if (sendingToken) return;

    setSendingToken(true);

    try {
      console.log('[VerificarEmailV6] 📧 Enviando token de verificación...');
      
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://embntaqwlwmgazvrglaf.supabase.co';
      
      const response = await fetch(`${supabaseUrl}/functions/v1/request-verification-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });

      const result = await response.json();

      if (!response.ok || result.error) {
        console.error('[VerificarEmailV6] ❌ Error enviando token:', result);
        Alert.alert(
          'Error',
          'No se pudo enviar el código de verificación. Por favor, intenta nuevamente.',
          [
            {
              text: 'Reintentar',
              onPress: () => {
                setSendingToken(false);
                handleSendToken();
              },
            },
            {
              text: 'Cancelar',
              style: 'cancel',
              onPress: () => router.back(),
            },
          ]
        );
      } else {
        console.log('[VerificarEmailV6] ✅ Token enviado, redirigiendo...');
        
        // Redirect to token verification screen
        router.replace({
          pathname: '/auth/verificar-cuenta-token',
          params: { email: email.trim().toLowerCase(), nombre },
        });
      }
    } catch (error) {
      console.error('[VerificarEmailV6] ❌ Exception:', error);
      Alert.alert(
        'Error',
        'Ocurrió un error inesperado. Por favor, intenta nuevamente.',
        [
          {
            text: 'Reintentar',
            onPress: () => {
              setSendingToken(false);
              handleSendToken();
            },
          },
          {
            text: 'Cancelar',
            style: 'cancel',
            onPress: () => router.back(),
          },
        ]
      );
    }
  }, [sendingToken, email, nombre, router]);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Automatically redirect to token verification
    handleSendToken();
  }, [fadeAnim, pulseAnim, handleSendToken]);

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
            size={24}
            color="#fff"
          />
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={[styles.mainContainer, { opacity: fadeAnim }]}>
          <Animated.View style={[styles.iconContainer, { transform: [{ scale: pulseAnim }] }]}>
            <View style={styles.iconCircle}>
              <IconSymbol
                ios_icon_name="envelope.badge.fill"
                android_material_icon_name="mark_email_unread"
                size={64}
                color={colors.primary}
              />
            </View>
          </Animated.View>

          <Text style={styles.title}>Preparando verificación...</Text>
          <Text style={styles.subtitle}>
            Estamos enviando tu código de verificación
          </Text>

          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Enviando código a {email}</Text>
          </View>

          <View style={styles.infoBox}>
            <IconSymbol
              ios_icon_name="info.circle.fill"
              android_material_icon_name="info"
              size={24}
              color={colors.primary}
            />
            <Text style={styles.infoText}>
              En unos segundos serás redirigido a la pantalla de verificación donde podrás introducir el código de 6 dígitos que recibirás por correo.
            </Text>
          </View>
        </Animated.View>
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
    paddingBottom: 20,
    paddingHorizontal: 24,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 120,
  },
  mainContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    marginBottom: 32,
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: `${colors.primary}15`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 24,
  },
  loadingContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${colors.primary}15`,
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: colors.text,
    marginLeft: 12,
    lineHeight: 18,
  },
});
