
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { useRouter } from 'expo-router';

interface Props {
  creditosDestacados: number;
  creditosEventos: number;
  localId: string;
  fechaRenovacion?: string;
}

/**
 * ✅ SIMPLIFIED CREDITS CARD v44.0
 * 
 * FEATURES:
 * - ✅ Clear at-a-glance understanding
 * - ✅ Shows what credits are
 * - ✅ Shows how many are available
 * - ✅ Shows what they're used for
 * - ✅ Simple, clean design
 */

export default function SimplifiedCreditsCard({ 
  creditosDestacados, 
  creditosEventos, 
  localId,
  fechaRenovacion 
}: Props) {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <IconSymbol 
            ios_icon_name="gift.fill" 
            android_material_icon_name="card_giftcard"
            size={24} 
            color={colors.primary} 
          />
          <View>
            <Text style={styles.title}>Créditos Disponibles</Text>
            <Text style={styles.subtitle}>Úsalos para promocionar tu local</Text>
          </View>
        </View>
      </View>

      <View style={styles.creditsGrid}>
        {/* Destacados Credit */}
        <View style={styles.creditCard}>
          <View style={[styles.creditIconContainer, { backgroundColor: '#FEF3C7' }]}>
            <IconSymbol 
              ios_icon_name="star.fill" 
              android_material_icon_name="star"
              size={28} 
              color="#F59E0B" 
            />
          </View>
          <View style={styles.creditInfo}>
            <Text style={styles.creditNumber}>{creditosDestacados}</Text>
            <Text style={styles.creditLabel}>Destacados</Text>
            <Text style={styles.creditDescription}>
              Aparece primero en búsquedas durante 24h
            </Text>
          </View>
        </View>

        {/* Eventos Credit */}
        <View style={styles.creditCard}>
          <View style={[styles.creditIconContainer, { backgroundColor: '#E0E7FF' }]}>
            <IconSymbol 
              ios_icon_name="calendar.badge.plus" 
              android_material_icon_name="event"
              size={28} 
              color="#6366F1" 
            />
          </View>
          <View style={styles.creditInfo}>
            <Text style={styles.creditNumber}>{creditosEventos}</Text>
            <Text style={styles.creditLabel}>Eventos</Text>
            <Text style={styles.creditDescription}>
              Publica eventos para atraer clientes
            </Text>
          </View>
        </View>
      </View>

      {/* Renewal Info */}
      {fechaRenovacion && (
        <View style={styles.renewalBox}>
          <IconSymbol 
            ios_icon_name="arrow.clockwise.circle.fill" 
            android_material_icon_name="refresh"
            size={18} 
            color={colors.primary} 
          />
          <Text style={styles.renewalText}>
            Tus créditos se renuevan el{' '}
            <Text style={styles.renewalDate}>
              {new Date(fechaRenovacion).toLocaleDateString('es-ES', {
                day: 'numeric',
                month: 'long'
              })}
            </Text>
          </Text>
        </View>
      )}

      {/* Help Text */}
      <View style={styles.helpBox}>
        <IconSymbol 
          ios_icon_name="questionmark.circle.fill" 
          android_material_icon_name="help"
          size={16} 
          color={colors.textSecondary} 
        />
        <Text style={styles.helpText}>
          Los créditos se renuevan cada mes con tu plan. Úsalos para destacar tu local y publicar eventos.
        </Text>
      </View>

      {/* CTA Button */}
      {(creditosDestacados === 0 && creditosEventos === 0) && (
        <TouchableOpacity 
          style={styles.upgradeButton}
          onPress={() => router.push(`/gestion/planes-suscripcion?localId=${localId}`)}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#F59E0B', '#D97706']}
            style={styles.upgradeButtonGradient}
          >
            <IconSymbol 
              ios_icon_name="arrow.up.circle.fill" 
              android_material_icon_name="arrow_upward"
              size={20} 
              color="#FFFFFF" 
            />
            <Text style={styles.upgradeButtonText}>Mejorar Plan para Más Créditos</Text>
          </LinearGradient>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
  },
  subtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  creditsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  creditCard: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  creditIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  creditInfo: {
    alignItems: 'center',
  },
  creditNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  creditLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 6,
  },
  creditDescription: {
    fontSize: 11,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 15,
  },
  renewalBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.primary + '10',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  renewalText: {
    flex: 1,
    fontSize: 13,
    color: colors.text,
    fontWeight: '500',
  },
  renewalDate: {
    fontWeight: '700',
    color: colors.primary,
  },
  helpBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: colors.background,
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  helpText: {
    flex: 1,
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  upgradeButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  upgradeButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  upgradeButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});
