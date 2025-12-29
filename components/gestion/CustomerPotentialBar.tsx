
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { useRouter } from 'expo-router';

interface Props {
  percentage: number;
  hasActiveHighlight: boolean;
  hasActiveEvent: boolean;
  planName?: string;
  localId?: string;
}

/**
 * ✅ CUSTOMER POTENTIAL BAR v55.0 - UPDATED PLAN POTENTIALS
 * 
 * CRITICAL FIXES v55.0:
 * - ✅ Plan Gratuito: 30% de potencial (updated from 20%)
 * - ✅ Plan Estándar: 65% de potencial (updated from 35%)
 * - ✅ Plan Premium: 100% de potencial (updated from 50%)
 * - ✅ Destacado adds +35% to any plan
 * - ✅ Updated calculation explanation
 */

export default function CustomerPotentialBar({ 
  percentage, 
  hasActiveHighlight, 
  hasActiveEvent,
  planName = 'free',
  localId,
}: Props) {
  const router = useRouter();

  const getBarColor = (): string[] => {
    if (percentage >= 80) return ['#10B981', '#059669'];
    if (percentage >= 50) return ['#F59E0B', '#D97706'];
    return ['#EF4444', '#DC2626'];
  };

  const getStatusText = (): string => {
    if (percentage >= 80) return '¡Excelente alcance!';
    if (percentage >= 50) return 'Buen alcance';
    if (percentage >= 30) return 'Alcance moderado';
    return 'Alcance bajo';
  };

  const getStatusIcon = (): { ios: string; android: string } => {
    if (percentage >= 80) return { ios: 'checkmark.circle.fill', android: 'check_circle' };
    if (percentage >= 50) return { ios: 'exclamationmark.circle.fill', android: 'error' };
    return { ios: 'xmark.circle.fill', android: 'cancel' };
  };

  const getImprovementMessage = (): string => {
    const plan = planName.toLowerCase();
    
    if (plan === 'free' || plan === 'basico' || plan === 'básico' || plan === 'gratuito') {
      return '💡 Mejora tu alcance: Contrata un plan superior para destacar tu local y atraer más clientes. Los locales con Plan Estándar alcanzan un 65% de clientes potenciales.';
    }
    
    if (plan === 'estandar' || plan === 'estándar') {
      if (!hasActiveHighlight) {
        return '⭐ Activa un crédito de Destacado para alcanzar el máximo potencial (100%). Los locales destacados reciben un 35% más de visitas.';
      }
      return '🚀 ¿Quieres más? El Plan Premium te da 100% de potencial base y visibilidad máxima garantizada con estadísticas avanzadas.';
    }
    
    if (plan === 'premium') {
      if (!hasActiveHighlight) {
        return '⭐ Ya tienes el 100% de potencial base. ¡Mantén tu local destacado para dominar tu zona!';
      }
      return '🎉 ¡Estás en el nivel máximo! Mantén tu local destacado para seguir dominando tu zona.';
    }
    
    return '💡 Activa créditos de Destacado o mejora tu plan para aumentar tu alcance.';
  };

  const barColors = getBarColor();
  const statusIcon = getStatusIcon();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <IconSymbol 
            ios_icon_name="person.3.fill" 
            android_material_icon_name="groups"
            size={20} 
            color={colors.primary} 
          />
          <Text style={styles.title}>Potencial de clientes alcanzado</Text>
        </View>
        <View style={styles.statusBadge}>
          <IconSymbol 
            ios_icon_name={statusIcon.ios as any}
            android_material_icon_name={statusIcon.android}
            size={16} 
            color={barColors[0]} 
          />
          <Text style={[styles.statusText, { color: barColors[0] }]}>
            {getStatusText()}
          </Text>
        </View>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressBarContainer}>
        <View style={styles.progressBarBackground}>
          <LinearGradient
            colors={barColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.progressBarFill, { width: `${Math.min(percentage, 100)}%` }]}
          />
        </View>
        <Text style={styles.percentageText}>{percentage}%</Text>
      </View>

      {/* Active Features */}
      <View style={styles.featuresContainer}>
        {hasActiveHighlight && (
          <View style={styles.featureChip}>
            <IconSymbol 
              ios_icon_name="star.fill" 
              android_material_icon_name="star"
              size={14} 
              color="#F59E0B" 
            />
            <Text style={styles.featureChipText}>Destacado Activo (+35%)</Text>
          </View>
        )}
        {planName.toLowerCase() === 'estandar' || planName.toLowerCase() === 'estándar' ? (
          <View style={styles.featureChip}>
            <IconSymbol 
              ios_icon_name="bolt.fill" 
              android_material_icon_name="flash_on"
              size={14} 
              color="#3B82F6" 
            />
            <Text style={styles.featureChipText}>Plan Estándar (65% base)</Text>
          </View>
        ) : planName.toLowerCase() === 'premium' ? (
          <View style={styles.featureChip}>
            <IconSymbol 
              ios_icon_name="crown.fill" 
              android_material_icon_name="workspace_premium"
              size={14} 
              color="#F59E0B" 
            />
            <Text style={styles.featureChipText}>Plan Premium (100% base)</Text>
          </View>
        ) : (
          <View style={styles.featureChip}>
            <IconSymbol 
              ios_icon_name="checkmark.circle" 
              android_material_icon_name="check_circle"
              size={14} 
              color="#10B981" 
            />
            <Text style={styles.featureChipText}>Plan Gratuito (30% base)</Text>
          </View>
        )}
        {!hasActiveHighlight && (planName.toLowerCase() === 'free' || planName.toLowerCase() === 'basico' || planName.toLowerCase() === 'básico' || planName.toLowerCase() === 'gratuito') && (
          <View style={[styles.featureChip, styles.featureChipInactive]}>
            <IconSymbol 
              ios_icon_name="exclamationmark.triangle" 
              android_material_icon_name="warning"
              size={14} 
              color={colors.textSecondary} 
            />
            <Text style={[styles.featureChipText, styles.featureChipTextInactive]}>
              Sin promociones activas
            </Text>
          </View>
        )}
      </View>

      {/* ✅ Improvement Tip with CTA */}
      {percentage < 100 && (
        <TouchableOpacity 
          style={styles.tipBox}
          onPress={() => {
            if (localId) {
              router.push(`/gestion/planes-suscripcion?localId=${localId}`);
            }
          }}
          activeOpacity={0.8}
        >
          <IconSymbol 
            ios_icon_name="lightbulb.fill" 
            android_material_icon_name="lightbulb"
            size={18} 
            color="#F59E0B" 
          />
          <Text style={styles.tipText}>
            {getImprovementMessage()}
          </Text>
          <IconSymbol 
            ios_icon_name="chevron.right" 
            android_material_icon_name="chevron_right"
            size={16} 
            color="#F59E0B" 
          />
        </TouchableOpacity>
      )}

      {/* ✅ UPDATED v55.0: New calculation explanation */}
      <View style={styles.explanationBox}>
        <Text style={styles.explanationTitle}>¿Cómo se calcula?</Text>
        <View style={styles.explanationItems}>
          <View style={styles.explanationItem}>
            <Text style={styles.explanationBullet}>•</Text>
            <Text style={styles.explanationText}>Plan Gratuito: 30% base</Text>
          </View>
          <View style={styles.explanationItem}>
            <Text style={styles.explanationBullet}>•</Text>
            <Text style={styles.explanationText}>Plan Estándar: 65% base</Text>
          </View>
          <View style={styles.explanationItem}>
            <Text style={styles.explanationBullet}>•</Text>
            <Text style={styles.explanationText}>Plan Premium: 100% base</Text>
          </View>
          <View style={styles.explanationItem}>
            <Text style={styles.explanationBullet}>•</Text>
            <Text style={styles.explanationText}>Destacar local: +35%</Text>
          </View>
        </View>
      </View>
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
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.background,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  progressBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  progressBarBackground: {
    flex: 1,
    height: 12,
    backgroundColor: colors.cardBorder,
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 6,
  },
  percentageText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    minWidth: 45,
    textAlign: 'right',
  },
  featuresContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  featureChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  featureChipInactive: {
    backgroundColor: colors.background,
  },
  featureChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#92400E',
  },
  featureChipTextInactive: {
    color: colors.textSecondary,
  },
  tipBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF3C7',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  tipText: {
    flex: 1,
    fontSize: 12,
    color: '#92400E',
    fontWeight: '500',
    lineHeight: 16,
  },
  explanationBox: {
    backgroundColor: colors.background,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  explanationTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  explanationItems: {
    gap: 4,
  },
  explanationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  explanationBullet: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: 'bold',
  },
  explanationText: {
    fontSize: 11,
    color: colors.textSecondary,
    flex: 1,
    lineHeight: 16,
  },
});
