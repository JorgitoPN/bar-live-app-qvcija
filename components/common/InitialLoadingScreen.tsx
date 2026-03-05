
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '@/styles/commonStyles';

/**
 * ✅ INITIAL LOADING SCREEN v3.0 - OPTIMIZED FOR PERFORMANCE
 * 
 * CHANGES v3.0:
 * - ✅ PROGRESS TRACKING: Shows actual loading progress
 * - ✅ SMART MESSAGES: Context-aware loading messages
 * - ✅ SMOOTH ANIMATIONS: Minimal CPU load
 * - ✅ INSTANT RENDER: No fade-in delay
 * - ✅ RESULT: Faster perceived load time, better UX
 */

interface InitialLoadingScreenProps {
  progress?: number; // 0 to 1
}

export default function InitialLoadingScreen({ progress = 0 }: InitialLoadingScreenProps) {
  const progressAnim = useRef(new Animated.Value(0)).current;

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
        <Text style={styles.logo}>🍺 BarLive</Text>
        <Text style={styles.subtitle}>Tu vida nocturna, en vivo</Text>
        
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
  logo: {
    fontSize: 48,
    fontWeight: 'bold',
    color: colors.headerText,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: colors.headerText,
    opacity: 0.9,
    textAlign: 'center',
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
