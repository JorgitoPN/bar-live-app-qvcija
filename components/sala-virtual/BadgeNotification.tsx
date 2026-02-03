
import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';

interface BadgeNotificationProps {
  show: boolean;
  color?: string;
  size?: number;
}

/**
 * Pulsing blue dot notification badge
 * Used to indicate activity in tabs without showing numbers
 */
export function BadgeNotification({ show, color = '#06B6D4', size = 10 }: BadgeNotificationProps) {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (show) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.4,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [show, pulseAnim]);

  if (!show) return null;

  return (
    <Animated.View
      style={[
        styles.dot,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          transform: [{ scale: pulseAnim }],
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  dot: {
    marginLeft: 4,
    shadowColor: '#06B6D4',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 4,
  },
});
