
import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { colors } from '@/styles/commonStyles';
import { LinearGradient } from 'expo-linear-gradient';

interface LoadingStatesProps {
  type?: 'spinner' | 'skeleton' | 'fullscreen';
  message?: string;
}

export default function LoadingStates({ type = 'spinner', message }: LoadingStatesProps) {
  if (type === 'fullscreen') {
    return (
      <View style={styles.fullscreenContainer}>
        <LinearGradient
          colors={[colors.headerGradientStart, colors.headerGradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.logoContainer}
        >
          <Text style={styles.logoText}>B</Text>
        </LinearGradient>
        <ActivityIndicator size="large" color={colors.primary} style={styles.spinner} />
        {message && <Text style={styles.message}>{message}</Text>}
      </View>
    );
  }

  if (type === 'skeleton') {
    return (
      <View style={styles.skeletonContainer}>
        <View style={styles.skeletonHeader} />
        <View style={styles.skeletonLine} />
        <View style={styles.skeletonLineShort} />
        <View style={styles.skeletonImage} />
      </View>
    );
  }

  return (
    <View style={styles.spinnerContainer}>
      <ActivityIndicator size="large" color={colors.primary} />
      {message && <Text style={styles.message}>{message}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  fullscreenContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  logoText: {
    fontSize: 40,
    fontWeight: '900',
    color: colors.headerText,
  },
  spinner: {
    marginTop: 16,
  },
  spinnerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  message: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 16,
    textAlign: 'center',
  },
  skeletonContainer: {
    padding: 16,
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    marginBottom: 12,
  },
  skeletonHeader: {
    width: '60%',
    height: 20,
    backgroundColor: colors.cardBorder,
    borderRadius: 4,
    marginBottom: 12,
  },
  skeletonLine: {
    width: '100%',
    height: 16,
    backgroundColor: colors.cardBorder,
    borderRadius: 4,
    marginBottom: 8,
  },
  skeletonLineShort: {
    width: '80%',
    height: 16,
    backgroundColor: colors.cardBorder,
    borderRadius: 4,
    marginBottom: 12,
  },
  skeletonImage: {
    width: '100%',
    height: 200,
    backgroundColor: colors.cardBorder,
    borderRadius: 8,
  },
});
