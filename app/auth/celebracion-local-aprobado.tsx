
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { supabase } from '@/utils/supabase';

const { width, height } = Dimensions.get('window');

/**
 * ✅ CELEBRATION SCREEN v1.0 - LOCAL CLAIM SUCCESS
 * 
 * FEATURES:
 * - ✅ Celebration animation when local is approved
 * - ✅ Gift 1 Event Credit and 1 Highlight Credit
 * - ✅ Explain the benefits of the credits
 * - ✅ Encourage immediate usage
 * - ✅ Frame as "investment in customers" not "buying a plan"
 */

export default function CelebracionLocalAprobadoScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const localId = params.localId as string;
  const localNombre = params.localNombre as string || 'Tu Local';
  
  const [fadeAnim] = useState(new Animated.Value(0));
  const [scaleAnim] = useState(new Animated.Value(0.5));
  const [confettiAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    // Celebration animation sequence
    Animated.sequence([
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 4,
          tension: 40,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(confettiAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, scaleAnim, confettiAnim]);

  const handleContinue = () => {
    router.replace({
      pathname: '/(tabs)/gestion',
      params: { showCreditsInfo: 'true' }
    });
  };

  const handleActivateHighlight = () => {
    router.replace({
      pathname: '/(tabs)/gestion',
      params: { 
        showCreditsInfo: 'true',
        autoActivateHighlight: 'true',
        localId: localId
      }
    });
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#10B981', '#059669', '#047857']}
        style={styles.gradient}
      >
        {/* Confetti Effect */}
        <Animated.View 
          style={[
            styles.confettiContainer,
            {
              opacity: confettiAnim,
            }
          ]}
        >
          {[...Array(20)].map((_, index) => (
            <Animated.View
              key={index}
              style={[
                styles.confetti,
                {
                  left: `${(index * 5) % 100}%`,
                  backgroundColor: ['#F59E0B', '#3B82F6', '#EF4444', '#8B5CF6', '#10B981'][index % 5],
                  transform: [
                    {
                      translateY: confettiAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [-50, height],
                      }),
                    },
                  ],
                },
              ]}
            />
          ))}
        </Animated.View>

        {/* Main Content */}
        <Animated.View
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {/* Success Icon */}
          <View style={styles.iconContainer}>
            <View style={styles.iconCircle}>
              <IconSymbol 
                ios_icon_name="checkmark.circle.fill" 
                android_material_icon_name="check_circle"
                size={80} 
                color="#FFFFFF" 
              />
            </View>
          </View>

          {/* Title */}
          <Text style={styles.title}>¡Felicidades!</Text>
          <Text style={styles.subtitle}>Tu negocio ya es oficial</Text>
          <Text style={styles.localName}>{localNombre}</Text>

          {/* Gift Box */}
          <View style={styles.giftBox}>
            <View style={styles.giftHeader}>
              <IconSymbol 
                ios_icon_name="gift.fill" 
                android_material_icon_name="card_giftcard"
                size={32} 
                color="#F59E0B" 
              />
              <Text style={styles.giftTitle}>Te hemos regalado</Text>
            </View>

            <View style={styles.giftItems}>
              <View style={styles.giftItem}>
                <View style={styles.giftIconCircle}>
                  <IconSymbol 
                    ios_icon_name="calendar.badge.plus" 
                    android_material_icon_name="event"
                    size={24} 
                    color="#FFFFFF" 
                  />
                </View>
                <View style={styles.giftItemText}>
                  <Text style={styles.giftItemTitle}>1 Crédito de Evento</Text>
                  <Text style={styles.giftItemSubtitle}>Crea tu primer evento gratis</Text>
                </View>
              </View>

              <View style={styles.giftItem}>
                <View style={styles.giftIconCircle}>
                  <IconSymbol 
                    ios_icon_name="star.fill" 
                    android_material_icon_name="star"
                    size={24} 
                    color="#FFFFFF" 
                  />
                </View>
                <View style={styles.giftItemText}>
                  <Text style={styles.giftItemTitle}>1 Crédito de Destacado</Text>
                  <Text style={styles.giftItemSubtitle}>Aparece primero durante 30 días</Text>
                </View>
              </View>
            </View>

            <View style={styles.giftBenefit}>
              <IconSymbol 
                ios_icon_name="chart.line.uptrend.xyaxis" 
                android_material_icon_name="trending_up"
                size={20} 
                color="#10B981" 
              />
              <Text style={styles.giftBenefitText}>
                Verás cómo suben tus visitas en tiempo real
              </Text>
            </View>
          </View>

          {/* CTA Buttons */}
          <View style={styles.buttonsContainer}>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleActivateHighlight}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={['#F59E0B', '#D97706']}
                style={styles.buttonGradient}
              >
                <IconSymbol 
                  ios_icon_name="star.fill" 
                  android_material_icon_name="star"
                  size={20} 
                  color="#FFFFFF" 
                />
                <Text style={styles.primaryButtonText}>Activar Destacado Ahora</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={handleContinue}
              activeOpacity={0.9}
            >
              <Text style={styles.secondaryButtonText}>Explorar mi Panel</Text>
            </TouchableOpacity>
          </View>

          {/* Urgency Message */}
          <View style={styles.urgencyBox}>
            <IconSymbol 
              ios_icon_name="clock.fill" 
              android_material_icon_name="schedule"
              size={16} 
              color="#F59E0B" 
            />
            <Text style={styles.urgencyText}>
              Usa tu crédito de Destacado hoy y empieza a recibir clientes
            </Text>
          </View>
        </Animated.View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  confettiContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  confetti: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  content: {
    alignItems: 'center',
    zIndex: 2,
    width: '100%',
    maxWidth: 400,
  },
  iconContainer: {
    marginBottom: 24,
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 20,
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
    opacity: 0.95,
  },
  localName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 32,
    textAlign: 'center',
  },
  giftBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  giftHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
    justifyContent: 'center',
  },
  giftTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  giftItems: {
    gap: 16,
    marginBottom: 20,
  },
  giftItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 12,
  },
  giftIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  giftItemText: {
    flex: 1,
  },
  giftItemTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 2,
  },
  giftItemSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  giftBenefit: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#D1FAE5',
    borderRadius: 10,
    padding: 12,
  },
  giftBenefitText: {
    flex: 1,
    fontSize: 13,
    color: '#065F46',
    fontWeight: '600',
  },
  buttonsContainer: {
    width: '100%',
    gap: 12,
    marginBottom: 16,
  },
  primaryButton: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  secondaryButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  urgencyBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  urgencyText: {
    flex: 1,
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
