
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';

interface Props {
  percentage: number;
  hasActiveHighlight: boolean;
  hasActiveEvent: boolean;
}

/**
 * ✅ CUSTOMER POTENTIAL BAR v1.0
 * 
 * FEATURES:
 * - ✅ Shows "Potential customers reached" percentage
 * - ✅ Increases when credits are used (highlight/event)
 * - ✅ Creates psychological need to maintain high percentage
 * - ✅ Encourages plan upgrades
 */

export default function CustomerPotentialBar({ percentage, hasActiveHighlight, hasActiveEvent }: Props) {
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
            style={[styles.progressBarFill, { width: `${percentage}%` }]}
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
            <Text style={styles.featureChipText}>Destacado Activo</Text>
          </View>
        )}
        {hasActiveEvent && (
          <View style={styles.featureChip}>
            <IconSymbol 
              ios_icon_name="calendar.badge.clock" 
              android_material_icon_name="event"
              size={14} 
              color="#8B5CF6" 
            />
            <Text style={styles.featureChipText}>Evento Activo</Text>
          </View>
        )}
        {!hasActiveHighlight && !hasActiveEvent && (
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

      {/* Improvement Tip */}
      {percentage < 80 && (
        <View style={styles.tipBox}>
          <IconSymbol 
            ios_icon_name="lightbulb.fill" 
            android_material_icon_name="lightbulb"
            size={18} 
            color="#F59E0B" 
          />
          <Text style={styles.tipText}>
            {percentage < 30 
              ? 'Activa un crédito de Destacado para alcanzar más clientes'
              : 'Mantén tu local destacado para maximizar tu alcance'}
          </Text>
        </View>
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
    padding: 10,
  },
  tipText: {
    flex: 1,
    fontSize: 12,
    color: '#92400E',
    fontWeight: '500',
    lineHeight: 16,
  },
});
