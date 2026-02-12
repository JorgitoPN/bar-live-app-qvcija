
import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { scaleFontSize } from '@/utils/androidScaling';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface ReceivedMessageAnimationProps {
  visible: boolean;
  emoji: string;
  themeColors: any;
  mode: 'day' | 'night';
  onComplete: () => void;
}

export function ReceivedMessageAnimation({
  visible,
  emoji,
  themeColors,
  mode,
  onComplete,
}: ReceivedMessageAnimationProps) {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const bubbles = useRef(
    Array.from({ length: 20 }, () => ({
      x: new Animated.Value(0),
      y: new Animated.Value(0),
      opacity: new Animated.Value(0),
      scale: new Animated.Value(0),
    }))
  ).current;

  useEffect(() => {
    if (visible) {
      // Main emoji animation
      Animated.parallel([
        Animated.sequence([
          Animated.spring(scaleAnim, {
            toValue: 1.5,
            friction: 5,
            tension: 40,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(opacityAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.delay(1500),
          Animated.timing(opacityAnim, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true,
          }),
        ]),
      ]).start(() => {
        onComplete();
      });

      // Bubble/sparkle animations
      bubbles.forEach((bubble, index) => {
        const angle = (index / bubbles.length) * Math.PI * 2;
        const distance = 100 + Math.random() * 100;
        const targetX = Math.cos(angle) * distance;
        const targetY = Math.sin(angle) * distance - 50;

        Animated.parallel([
          Animated.timing(bubble.x, {
            toValue: targetX,
            duration: 1500 + Math.random() * 500,
            useNativeDriver: true,
          }),
          Animated.timing(bubble.y, {
            toValue: targetY,
            duration: 1500 + Math.random() * 500,
            useNativeDriver: true,
          }),
          Animated.sequence([
            Animated.timing(bubble.opacity, {
              toValue: 0.8,
              duration: 200,
              useNativeDriver: true,
            }),
            Animated.delay(800),
            Animated.timing(bubble.opacity, {
              toValue: 0,
              duration: 500,
              useNativeDriver: true,
            }),
          ]),
          Animated.sequence([
            Animated.timing(bubble.scale, {
              toValue: 1,
              duration: 200,
              useNativeDriver: true,
            }),
            Animated.timing(bubble.scale, {
              toValue: 0,
              duration: 1300,
              useNativeDriver: true,
            }),
          ]),
        ]).start();
      });
    }
  }, [visible, bubbles, onComplete, opacityAnim, scaleAnim]);

  if (!visible) return null;

  const messageText = '¡Nuevo mensaje!';

  return (
    <Animated.View
      style={[
        styles.overlay,
        {
          opacity: opacityAnim,
        },
      ]}
      pointerEvents="none"
    >
      <View style={styles.center}>
        {bubbles.map((bubble, index) => (
          <Animated.View
            key={index}
            style={[
              styles.bubble,
              {
                transform: [
                  { translateX: bubble.x },
                  { translateY: bubble.y },
                  { scale: bubble.scale },
                ],
                opacity: bubble.opacity,
                backgroundColor: mode === 'night' ? themeColors.primary : themeColors.secondary,
              },
            ]}
          />
        ))}

        <Animated.View
          style={[
            styles.mainAnimation,
            {
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <Text style={styles.mainEmoji}>{emoji}</Text>
        </Animated.View>

        <Text style={[styles.messageText, { fontSize: scaleFontSize(24), color: themeColors.text }]}>
          {messageText}
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    zIndex: 1000,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bubble: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  mainAnimation: {
    marginBottom: 20,
  },
  mainEmoji: {
    fontSize: 120,
  },
  messageText: {
    fontWeight: '800',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
});
