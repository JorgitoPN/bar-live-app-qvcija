
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

interface AnimationOverlayProps {
  visible: boolean;
  emoji: string;
  message: string;
  themeColors: any;
  mode: 'day' | 'night';
  onComplete: () => void;
}

export function AnimationOverlay({
  visible,
  emoji,
  message,
  themeColors,
  mode,
  onComplete,
}: AnimationOverlayProps) {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const sparkles = useRef(
    Array.from({ length: 12 }, () => ({
      x: new Animated.Value(0),
      y: new Animated.Value(0),
      opacity: new Animated.Value(0),
      scale: new Animated.Value(0),
    }))
  ).current;

  // ✅ LINT FIX: Added all animation dependencies
  useEffect(() => {
    if (visible) {
      // Main animation
      Animated.parallel([
        Animated.sequence([
          Animated.timing(scaleAnim, {
            toValue: 1.5,
            duration: 300,
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

      // Sparkle animations
      sparkles.forEach((sparkle, index) => {
        const angle = (index / sparkles.length) * Math.PI * 2;
        const distance = 150;
        const targetX = Math.cos(angle) * distance;
        const targetY = Math.sin(angle) * distance;

        Animated.parallel([
          Animated.timing(sparkle.x, {
            toValue: targetX,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(sparkle.y, {
            toValue: targetY,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.sequence([
            Animated.timing(sparkle.opacity, {
              toValue: 1,
              duration: 200,
              useNativeDriver: true,
            }),
            Animated.delay(600),
            Animated.timing(sparkle.opacity, {
              toValue: 0,
              duration: 200,
              useNativeDriver: true,
            }),
          ]),
          Animated.sequence([
            Animated.timing(sparkle.scale, {
              toValue: 1,
              duration: 200,
              useNativeDriver: true,
            }),
            Animated.timing(sparkle.scale, {
              toValue: 0,
              duration: 800,
              useNativeDriver: true,
            }),
          ]),
        ]).start();
      });
    }
  }, [visible, onComplete, scaleAnim, opacityAnim, sparkles]);

  if (!visible) return null;

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
        {sparkles.map((sparkle, index) => (
          <Animated.View
            key={index}
            style={[
              styles.sparkle,
              {
                transform: [
                  { translateX: sparkle.x },
                  { translateY: sparkle.y },
                  { scale: sparkle.scale },
                ],
                opacity: sparkle.opacity,
              },
            ]}
          >
            <Text style={styles.sparkleEmoji}>
              {mode === 'night' ? '✨' : '🥂'}
            </Text>
          </Animated.View>
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

        <Text style={[styles.messageText, { fontSize: scaleFontSize(20), color: themeColors.text }]}>
          {message}
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 1000,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sparkle: {
    position: 'absolute',
  },
  sparkleEmoji: {
    fontSize: 24,
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
    paddingHorizontal: 40,
  },
});
