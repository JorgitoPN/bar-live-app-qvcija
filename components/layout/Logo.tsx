
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '@/styles/commonStyles';
import { LinearGradient } from 'expo-linear-gradient';

interface LogoProps {
  size?: 'small' | 'medium' | 'large';
  showText?: boolean;
}

export default function Logo({ size = 'medium', showText = true }: LogoProps) {
  const sizes = {
    small: { container: 40, text: 16, subtitle: 8 },
    medium: { container: 60, text: 24, subtitle: 12 },
    large: { container: 80, text: 32, subtitle: 14 },
  };

  const currentSize = sizes[size];

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.headerGradientStart, colors.headerGradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.logoContainer, { width: currentSize.container, height: currentSize.container }]}
      >
        <Text style={[styles.logoText, { fontSize: currentSize.text }]}>B</Text>
      </LinearGradient>
      {showText && (
        <View style={styles.textContainer}>
          <Text style={styles.brandText}>BarLive</Text>
          <Text style={styles.subtitleText}>Vive la noche</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoContainer: {
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  logoText: {
    fontWeight: '900',
    color: colors.headerText,
  },
  textContainer: {
    justifyContent: 'center',
  },
  brandText: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
  },
  subtitleText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: -2,
  },
});
