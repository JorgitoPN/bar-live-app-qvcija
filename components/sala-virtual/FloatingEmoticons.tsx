
import React from 'react';
import { View, StyleSheet, Animated } from 'react-native';

interface FloatingEmoticon {
  emoji: string;
  id: string;
  timestamp: number;
}

interface FloatingEmoticonsProps {
  emoticons: FloatingEmoticon[];
}

export function FloatingEmoticons({ emoticons }: FloatingEmoticonsProps) {
  return (
    <View style={styles.container} pointerEvents="none">
      {emoticons.map((item, index) => {
        const fadeAnim = new Animated.Value(1);
        const translateYAnim = new Animated.Value(0);

        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 3000,
            useNativeDriver: true,
          }),
          Animated.timing(translateYAnim, {
            toValue: -200,
            duration: 3000,
            useNativeDriver: true,
          }),
        ]).start();

        return (
          <Animated.Text
            key={item.id}
            style={[
              styles.emoticon,
              {
                right: 20 + (index * 30) % 100,
                opacity: fadeAnim,
                transform: [{ translateY: translateYAnim }],
              },
            ]}
          >
            {item.emoji}
          </Animated.Text>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 100,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 99,
  },
  emoticon: {
    position: 'absolute',
    top: 0,
    fontSize: 32,
  },
});
