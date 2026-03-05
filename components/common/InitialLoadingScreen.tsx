
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Animated, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '@/styles/commonStyles';

/**
 * ✅ INITIAL LOADING SCREEN v3.2 - LOGO IMPRESIONANTE CON ANIMACIÓN
 * 
 * CHANGES v3.2:
 * - ✅ LOGO REAL: Usa el logo oficial de BarLive
 * - ✅ ESQUINAS REDONDEADAS: borderRadius para un look más profesional
 * - ✅ ANIMACIÓN SORPRENDENTE: Escala y fade-in suave
 * - ✅ SOMBRA ELEGANTE: Shadow para dar profundidad
 * - ✅ MENSAJE ACTUALIZADO: "La actividad de tus locales, en vivo"
 * - ✅ PROGRESS TRACKING: Shows actual loading progress
 */

interface InitialLoadingScreenProps {
  progress?: number; // 0 to 1
}

export default function InitialLoadingScreen({ progress = 0 }: InitialLoadingScreenProps) {
  const progressAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // ✅ Animate logo entrance
  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, [scaleAnim, fadeAnim]);

  // ✅ Animate progress bar smoothly
  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: progress,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [progress, progressAnim]);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const progressPercentage = Math.round(progress * 100);

  // ✅ Context-aware loading messages
  const getLoadingMessage = () => {
    if (progressPercentage < 30) return 'Iniciando sesión...';
    if (progressPercentage < 60) return 'Cargando datos...';
    if (progressPercentage < 90) return 'Preparando interfaz...';
    return '¡Casi listo!';
  };

  return (
    <LinearGradient
      colors={[colors.headerGradientStart, colors.headerGradientEnd]}
      style={styles.container}
    >
      <View style={styles.content}>
        {/* ✅ Logo real de BarLive con animación impresionante */}
        <Animated.View
          style={[
            styles.logoContainer,
            {
              transform: [{ scale: scaleAnim }],
              opacity: fadeAnim,
            },
          ]}
        >
          <Image
            source={require('@/assets/images/0bc5d522-34a4-4e44-ab69-2b6add00d6f7.jpeg')}
            style={styles.logo}
            resizeMode="cover"
          />
        </Animated.View>
        
        {/* ✅ Mensaje actualizado */}
        <Animated.Text style={[styles.subtitle, { opacity: fadeAnim }]}>
          La actividad de tus locales, en vivo
        </Animated.Text>
        
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.headerText} />
          
          {/* ✅ Progress bar */}
          <View style={styles.progressBarContainer}>
            <View style={styles.progressBarBackground}>
              <Animated.View
                style={[
                  styles.progressBarFill,
                  { width: progressWidth },
                ]}
              />
            </View>
            <Text style={styles.progressText}>{progressPercentage}%</Text>
          </View>
          
          <Text style={styles.loadingText}>{getLoadingMessage()}</Text>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    gap: 24,
    paddingHorizontal: 40,
    width: '100%',
    maxWidth: 400,
  },
  logoContainer: {
    width: 140,
    height: 140,
    borderRadius: 28,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.44,
    shadowRadius: 10.32,
    elevation: 16,
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  subtitle: {
    fontSize: 18,
    color: colors.headerText,
    opacity: 0.9,
    textAlign: 'center',
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  loadingContainer: {
    alignItems: 'center',
    gap: 20,
    width: '100%',
    marginTop: 16,
  },
  progressBarContainer: {
    width: '100%',
    alignItems: 'center',
    gap: 8,
  },
  progressBarBackground: {
    width: '100%',
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.headerText,
    borderRadius: 3,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.headerText,
    opacity: 0.9,
  },
  loadingText: {
    fontSize: 14,
    color: colors.headerText,
    opacity: 0.7,
    textAlign: 'center',
  },
});
