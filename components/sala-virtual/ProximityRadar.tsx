
import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { IconSymbol } from '@/components/IconSymbol';
import { scaleFontSize, scaleIconSize } from '@/utils/androidScaling';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface ProximityRadarProps {
  nearbyCount: number;
  themeColors: any;
  mode: 'day' | 'night';
}

export function ProximityRadar({ nearbyCount, themeColors, mode }: ProximityRadarProps) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
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

    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 4000,
        useNativeDriver: true,
      })
    ).start();
  }, [pulseAnim, rotateAnim]);

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  if (nearbyCount === 0) return null;

  const countText = `${nearbyCount}`;
  const labelText = nearbyCount === 1 ? 'persona cerca' : 'personas cerca';

  return (
    <View style={[styles.container, { backgroundColor: themeColors.primary + '15', borderColor: themeColors.primary + '30' }]}>
      <Animated.View
        style={[
          styles.radarCircle,
          {
            transform: [{ scale: pulseAnim }, { rotate }],
            borderColor: themeColors.primary + '40',
          },
        ]}
      />
      <View style={[styles.iconContainer, { backgroundColor: themeColors.primary }]}>
        <IconSymbol
          ios_icon_name="location.fill"
          android_material_icon_name="location_on"
          size={Platform.OS === 'android' ? scaleIconSize(20) : 20}
          color="#FFFFFF"
        />
      </View>
      <View style={styles.textContainer}>
        <Text style={[styles.countText, { fontSize: scaleFontSize(18), color: themeColors.primary }]}>
          {countText}
        </Text>
        <Text style={[styles.labelText, { fontSize: scaleFontSize(12), color: themeColors.textSecondary }]}>
          {labelText}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 20,
    borderWidth: 1,
    gap: 12,
    marginHorizontal: 16,
    marginVertical: 12,
    position: 'relative',
    overflow: 'hidden',
  },
  radarCircle: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    left: -20,
    top: -20,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    flex: 1,
  },
  countText: {
    fontWeight: '800',
  },
  labelText: {
    fontWeight: '600',
    marginTop: 2,
  },
});
