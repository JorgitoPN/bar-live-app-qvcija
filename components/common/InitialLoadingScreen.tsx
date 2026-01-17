
import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '@/styles/commonStyles';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    gap: 24,
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
  },
  loadingText: {
    fontSize: 14,
    color: colors.headerText,
    opacity: 0.7,
    marginTop: 16,
  },
});

export default function InitialLoadingScreen() {
  return (
    <LinearGradient
      colors={[colors.headerGradientStart, colors.headerGradientEnd]}
      style={styles.container}
    >
      <View style={styles.content}>
        <Text style={styles.logo}>🍺 BarLive</Text>
        <Text style={styles.subtitle}>Tu vida nocturna, en vivo</Text>
        <ActivityIndicator size="large" color={colors.headerText} />
        <Text style={styles.loadingText}>Cargando experiencia...</Text>
      </View>
    </LinearGradient>
  );
}
