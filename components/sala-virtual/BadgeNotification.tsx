
import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { LinearGradient } from 'expo-linear-gradient';

interface Badge {
  id: string;
  tipo_badge: string;
  fecha_obtencion: string;
  puntos: number;
}

interface BadgeNotificationProps {
  badge: Badge;
}

const BADGE_INFO: Record<string, { title: string; icon: string; androidIcon: string }> = {
  alma_social: {
    title: 'Alma Social',
    icon: 'person.3.fill',
    androidIcon: 'group',
  },
  rey_baile: {
    title: 'Rey del Baile',
    icon: 'crown.fill',
    androidIcon: 'emoji_events',
  },
  reina_baile: {
    title: 'Reina del Baile',
    icon: 'crown.fill',
    androidIcon: 'emoji_events',
  },
  conversador: {
    title: 'Conversador',
    icon: 'bubble.left.and.bubble.right.fill',
    androidIcon: 'chat',
  },
  animador: {
    title: 'Animador',
    icon: 'sparkles',
    androidIcon: 'celebration',
  },
  popular: {
    title: 'Popular',
    icon: 'star.fill',
    androidIcon: 'star',
  },
};

export function BadgeNotification({ badge }: BadgeNotificationProps) {
  const fadeAnim = new Animated.Value(0);
  const slideAnim = new Animated.Value(-100);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const badgeInfo = BADGE_INFO[badge.tipo_badge] || {
    title: 'Badge',
    icon: 'star.fill',
    androidIcon: 'star',
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <LinearGradient
        colors={[colors.primary, colors.secondary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <View style={styles.iconCircle}>
          <IconSymbol
            ios_icon_name={badgeInfo.icon}
            android_material_icon_name={badgeInfo.androidIcon}
            size={32}
            color={colors.primary}
          />
        </View>
        <View style={styles.content}>
          <Text style={styles.title}>¡Insignia Desbloqueada!</Text>
          <Text style={styles.badgeName}>{badgeInfo.title}</Text>
          <Text style={styles.points}>{badge.puntos} puntos</Text>
        </View>
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 80,
    left: 16,
    right: 16,
    zIndex: 1000,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  gradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 16,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 4,
  },
  badgeName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 2,
  },
  points: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
  },
});
