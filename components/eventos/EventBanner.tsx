
/**
 * EventBanner Component
 * 
 * Displays an event banner with countdown timer and animations.
 * Automatically determines if event is LIVE or UPCOMING and shows appropriate styling.
 * 
 * Features:
 * - Live event detection (shows "EN VIVO" badge with red gradient)
 * - Upcoming event countdown (shows time until event starts)
 * - Active event countdown (shows time until event ends)
 * - Compact mode for use in cards
 * - Full mode for use in detail pages
 * - Pulsing animation to draw attention
 * 
 * Usage:
 * ```tsx
 * import EventBanner from '@/components/eventos/EventBanner';
 * import { useLocalEvent } from '@/hooks/useLocalEvent';
 * 
 * const { evento } = useLocalEvent(localId);
 * 
 * {evento && <EventBanner evento={evento} compact={true} />}
 * ```
 */

import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Platform, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { useRouter } from 'expo-router';

interface EventBannerProps {
  evento: {
    id: string;
    titulo: string;
    fecha: string;
    fecha_fin?: string | null;
    hora: string;
    hora_fin?: string | null;
    imagen_url?: string | null;
    precio?: number | null;
  };
  compact?: boolean;
}

export default function EventBanner({ evento, compact = false }: EventBannerProps) {
  const router = useRouter();
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const [isLive, setIsLive] = useState(false);
  const [isUpcoming, setIsUpcoming] = useState(false);

  // Animation values
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      
      // Parse event start date/time
      const eventStartDate = new Date(`${evento.fecha}T${evento.hora}`);
      
      // Parse event end date/time
      let eventEndDate: Date;
      if (evento.fecha_fin && evento.hora_fin) {
        eventEndDate = new Date(`${evento.fecha_fin}T${evento.hora_fin}`);
      } else {
        // If no end date, assume event ends 4 hours after start
        eventEndDate = new Date(eventStartDate.getTime() + 4 * 60 * 60 * 1000);
      }
      
      // Determine if event is live or upcoming
      if (now >= eventStartDate && now <= eventEndDate) {
        // Event is LIVE
        setIsLive(true);
        setIsUpcoming(false);
        
        // Calculate time until event ends
        const diff = eventEndDate.getTime() - now.getTime();
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        
        if (hours > 0) {
          setTimeRemaining(`Finaliza en ${hours}h ${minutes}m`);
        } else if (minutes > 0) {
          setTimeRemaining(`Finaliza en ${minutes}m`);
        } else {
          setTimeRemaining('Finalizando...');
        }
      } else if (now < eventStartDate) {
        // Event is UPCOMING
        setIsLive(false);
        setIsUpcoming(true);
        
        // Calculate time until event starts
        const diff = eventStartDate.getTime() - now.getTime();
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        
        if (days > 0) {
          setTimeRemaining(`Comienza en ${days}d ${hours}h`);
        } else if (hours > 0) {
          setTimeRemaining(`Comienza en ${hours}h ${minutes}m`);
        } else if (minutes > 0) {
          setTimeRemaining(`Comienza en ${minutes}m`);
        } else {
          setTimeRemaining('Comenzando...');
        }
      } else {
        // Event has ended
        setIsLive(false);
        setIsUpcoming(false);
        setTimeRemaining('Finalizado');
      }
    };
    
    updateCountdown();
    const interval = setInterval(updateCountdown, 60000); // Update every minute
    
    return () => clearInterval(interval);
  }, [evento]);

  // Pulsing animation for the banner
  useEffect(() => {
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.03,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    );

    pulseAnimation.start();

    return () => {
      pulseAnimation.stop();
    };
  }, [pulseAnim]);

  // Scale animation on press
  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 3,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  const handlePress = () => {
    router.push(`/detalle/evento?id=${evento.id}`);
  };

  const formatDate = (fecha: string): string => {
    try {
      const date = new Date(fecha);
      return date.toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'short',
      }).toUpperCase();
    } catch (error) {
      return fecha;
    }
  };

  const formatTime = (hora: string): string => {
    try {
      const parts = hora.split(':');
      return `${parts[0]}:${parts[1]}`;
    } catch (error) {
      return hora;
    }
  };

  if (compact) {
    return (
      <Animated.View
        style={[
          styles.compactBannerContainer,
          {
            transform: [{ scale: Animated.multiply(scaleAnim, pulseAnim) }],
          },
        ]}
      >
        <TouchableOpacity 
          style={styles.compactBanner} 
          onPress={handlePress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          activeOpacity={0.9}
        >
          <LinearGradient
            colors={isLive ? ['#EF4444', '#DC2626'] : [colors.primary, colors.secondary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.compactGradient}
          >
            {/* Restructured layout to prevent overlap */}
            <View style={styles.compactContent}>
              <View style={styles.compactLeft}>
                <IconSymbol name="calendar" size={16} color={colors.white} />
                <Text style={styles.compactTitle} numberOfLines={1}>
                  {evento.titulo}
                </Text>
              </View>
              
              <View style={styles.compactRightContainer}>
                {isLive && (
                  <View style={styles.liveBadgeCompact}>
                    <View style={styles.liveDot} />
                    <Text style={styles.liveText}>EN VIVO</Text>
                  </View>
                )}
                
                <View style={styles.compactRight}>
                  <IconSymbol name="clock.fill" size={14} color={colors.white} />
                  <Text style={styles.compactTime}>{timeRemaining}</Text>
                </View>
              </View>
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    );
  }

  return (
    <Animated.View
      style={[
        styles.bannerContainer,
        {
          transform: [{ scale: Animated.multiply(scaleAnim, pulseAnim) }],
        },
      ]}
    >
      <TouchableOpacity 
        style={styles.banner} 
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.9}
      >
        <View style={styles.bannerContent}>
          {evento.imagen_url ? (
            <Image 
              source={{ uri: evento.imagen_url }} 
              style={styles.bannerImage}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.bannerImage, styles.bannerImagePlaceholder]}>
              <LinearGradient
                colors={[colors.headerGradientStart, colors.headerGradientEnd]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <IconSymbol name="music.note" size={40} color="rgba(255,255,255,0.3)" />
            </View>
          )}
          
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.8)']}
            style={styles.bannerOverlay}
          />
          
          {isLive && (
            <View style={styles.liveBadgeLarge}>
              <View style={styles.liveDot} />
              <Text style={styles.liveTextLarge}>EN VIVO</Text>
            </View>
          )}
          
          <View style={styles.bannerInfo}>
            <Text style={styles.bannerTitle} numberOfLines={2}>
              {evento.titulo}
            </Text>
            
            <View style={styles.bannerMeta}>
              <View style={styles.bannerMetaItem}>
                <IconSymbol name="calendar" size={14} color={colors.white} />
                <Text style={styles.bannerMetaText}>
                  {formatDate(evento.fecha)}
                </Text>
              </View>
              
              <View style={styles.bannerMetaItem}>
                <IconSymbol name="clock.fill" size={14} color={colors.white} />
                <Text style={styles.bannerMetaText}>
                  {formatTime(evento.hora)}
                </Text>
              </View>
              
              {evento.precio !== null && evento.precio !== undefined && (
                <View style={styles.bannerMetaItem}>
                  <IconSymbol name="ticket" size={14} color={colors.white} />
                  <Text style={styles.bannerMetaText}>
                    {evento.precio === 0 ? 'Gratis' : `${evento.precio}€`}
                  </Text>
                </View>
              )}
            </View>
            
            <View style={styles.countdownContainer}>
              <LinearGradient
                colors={isLive ? ['#EF4444', '#DC2626'] : ['#FACC15', '#F59E0B']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.countdownGradient}
              >
                <IconSymbol 
                  name={isLive ? 'bolt.fill' : 'clock.fill'} 
                  size={16} 
                  color={colors.white} 
                />
                <Text style={styles.countdownText}>{timeRemaining}</Text>
              </LinearGradient>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bannerContainer: {
    marginBottom: 16,
  },
  banner: {
    borderRadius: 16,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  bannerContent: {
    height: 200,
    position: 'relative',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  bannerImagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '70%',
  },
  liveBadgeLarge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EF4444',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
    borderWidth: 2,
    borderColor: colors.white,
    zIndex: 10,
  },
  liveTextLarge: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.white,
    letterSpacing: 0.5,
  },
  bannerInfo: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
  },
  bannerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.white,
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  bannerMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 10,
  },
  bannerMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  bannerMetaText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.white,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  countdownContainer: {
    alignSelf: 'flex-start',
    borderRadius: 20,
    overflow: 'hidden',
  },
  countdownGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 6,
  },
  countdownText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.white,
    letterSpacing: 0.3,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.white,
  },
  liveText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: colors.white,
    letterSpacing: 0.5,
  },
  
  // Compact banner styles
  compactBannerContainer: {
    marginBottom: 12,
  },
  compactBanner: {
    borderRadius: 12,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  compactGradient: {
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  compactContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  compactLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    minWidth: 0, // Allow text to shrink
  },
  compactTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: colors.white,
    flex: 1,
  },
  compactRightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0, // Prevent shrinking
  },
  liveBadgeCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  compactRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  compactTime: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.white,
  },
});
