
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { supabase } from '@/utils/supabase';
import { useRouter } from 'expo-router';
import CustomerPotentialBar from './CustomerPotentialBar';
import HighlightActiveCounter from './HighlightActiveCounter';

interface LocalSubscriptionData {
  id: string;
  nombre: string;
  provincia: string;
  imagen_url?: string;
  destacado: boolean;
  suscripcion?: {
    id: string;
    plan_id: string;
    plan_nombre: string;
    plan_precio: number;
    estado: string;
    eventos_usados_mes: number;
    eventos_disponibles: number;
    creditos_destacados_restantes: number;
    creditos_eventos_restantes: number;
    fecha_renovacion_creditos?: string;
    fecha_proximo_pago?: string;
    destacado_activo: boolean;
    destacado_fecha_fin?: string;
    plan_pendiente_id?: string;
    plan_pendiente_nombre?: string;
    fecha_cambio_plan?: string;
    cancelar_al_final_periodo: boolean;
  };
  evento_activo?: {
    id: string;
    titulo: string;
    fecha: string;
    hora: string;
  };
}

interface Props {
  local: LocalSubscriptionData;
  onRefresh: () => void;
  isSelected: boolean;
  onSelect: () => void;
}

/**
 * ✅ LOCAL SUBSCRIPTION CARD v3.0 - FIXED POTENTIAL CALCULATION
 * 
 * NEW FEATURES:
 * - ✅ Customer potential progress bar
 * - ✅ Real-time highlight counter when active
 * - ✅ FIXED: Potential calculation excludes event publications
 * - ✅ FIXED: Potential calculation includes plan level and highlight status
 * - ✅ Psychological incentive to maintain high percentage
 */

export default function LocalSubscriptionCard({ local, onRefresh, isSelected, onSelect }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [updatingDestacado, setUpdatingDestacado] = useState(false);

  const getPlanColor = (planNombre: string) => {
    switch (planNombre?.toLowerCase()) {
      case 'premium':
        return '#EF4444';
      case 'estandar':
      case 'estándar':
        return '#3B82F6';
      default:
        return '#10B981';
    }
  };

  const getPlanIcon = (planNombre: string) => {
    switch (planNombre?.toLowerCase()) {
      case 'premium':
        return 'star.fill';
      case 'estandar':
      case 'estándar':
        return 'bolt.fill';
      default:
        return 'checkmark.circle.fill';
    }
  };

  const hasPremiumAccess = () => {
    return local.suscripcion?.plan_nombre?.toLowerCase() === 'premium';
  };

  const calculateTimeRemaining = (endDate: string | null | undefined) => {
    if (!endDate) return 'No disponible';
    
    try {
      const now = new Date();
      const end = new Date(endDate);
      const diff = end.getTime() - now.getTime();

      if (diff <= 0) return 'Finalizado';

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

      if (days > 0) return `${days}d ${hours}h`;
      return `${hours}h`;
    } catch (error) {
      console.error('[LocalSubscriptionCard] Error calculating time:', error);
      return 'Error';
    }
  };

  const calculateProgress = (used: number, total: number) => {
    if (total === 0) return 0;
    return Math.min((used / total) * 100, 100);
  };

  // ✅ FIXED: Calculate customer potential percentage (EXCLUDES event publications)
  const calculateCustomerPotential = (): number => {
    if (!local.suscripcion) return 20; // Base 20% without plan

    let percentage = 20; // Base

    // Add 30% if highlight is active
    if (local.suscripcion.destacado_activo) {
      percentage += 30;
    }

    // ✅ CRITICAL FIX: DO NOT add percentage for active events
    // Events are NOT counted in potential calculation

    // Add 15% for Standard plan
    if (local.suscripcion.plan_nombre.toLowerCase() === 'estandar' || local.suscripcion.plan_nombre.toLowerCase() === 'estándar') {
      percentage += 15;
    }

    // Add 30% for Premium plan
    if (local.suscripcion.plan_nombre.toLowerCase() === 'premium') {
      percentage += 30;
    }

    return Math.min(percentage, 100);
  };

  const handleToggleDestacado = async () => {
    if (updatingDestacado) return;

    const { suscripcion } = local;

    // Check if subscription exists
    if (!suscripcion) {
      Alert.alert(
        'Sin Plan Activo',
        'Necesitas un plan de suscripción para destacar tu local.',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Ver Planes',
            onPress: () => router.push(`/gestion/planes-suscripcion?localId=${local.id}`),
          },
        ]
      );
      return;
    }

    // If already active, show confirmation to deactivate
    if (local.destacado && suscripcion.destacado_activo) {
      Alert.alert(
        '⚠️ Desactivar Destacado',
        'Si desactivas el destacado ahora, perderás el crédito utilizado y el tiempo restante de promoción.\n\n¿Estás seguro de que deseas continuar?',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Sí, Desactivar',
            style: 'destructive',
            onPress: () => processDeactivateDestacado(),
          },
        ]
      );
      return;
    }

    // Check if can activate destacado
    if (!local.destacado && suscripcion.creditos_destacados_restantes <= 0) {
      Alert.alert(
        'Sin Créditos Disponibles',
        `Tu plan ${suscripcion.plan_nombre.toUpperCase()} no tiene créditos de destacados disponibles.\n\n` +
          `Créditos restantes: ${suscripcion.creditos_destacados_restantes}\n\n` +
          `Actualiza a un plan superior o espera a la renovación mensual.`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Ver Planes',
            onPress: () => router.push(`/gestion/planes-suscripcion?localId=${local.id}`),
          },
        ]
      );
      return;
    }

    // Activate destacado
    processActivateDestacado();
  };

  const processActivateDestacado = async () => {
    const { suscripcion } = local;
    if (!suscripcion) return;

    try {
      setUpdatingDestacado(true);

      // ✅ CRITICAL FIX: Set destacado duration to exactly 24 hours
      const fechaInicio = new Date();
      const fechaFin = new Date();
      fechaFin.setHours(fechaFin.getHours() + 24); // Exactly 24 hours

      // Update local destacado status
      const { error: localError } = await supabase
        .from('locales')
        .update({ 
          destacado: true,
          destacado_inicio: fechaInicio.toISOString(),
          destacado_fin: fechaFin.toISOString(),
          destacado_horas: 24,
        })
        .eq('id', local.id);

      if (localError) throw localError;

      // Update subscription credits and destacado status
      const { error: subError } = await supabase
        .from('suscripciones_locales')
        .update({
          destacado_activo: true,
          creditos_destacados_restantes: Math.max(0, suscripcion.creditos_destacados_restantes - 1),
          destacado_fecha_inicio: fechaInicio.toISOString(),
          destacado_fecha_fin: fechaFin.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', suscripcion.id);

      if (subError) throw subError;

      Alert.alert(
        '✅ Destacado Activado',
        'Tu local ahora está destacado y aparecerá en las primeras posiciones durante 24 horas.\n\nCrédito consumido: 1'
      );

      onRefresh();
    } catch (error: any) {
      console.error('[LocalSubscriptionCard] Error activating destacado:', error);
      Alert.alert('Error', 'No se pudo activar el estado destacado del local.');
    } finally {
      setUpdatingDestacado(false);
    }
  };

  const processDeactivateDestacado = async () => {
    const { suscripcion } = local;
    if (!suscripcion) return;

    try {
      setUpdatingDestacado(true);

      // Update local destacado status
      const { error: localError } = await supabase
        .from('locales')
        .update({ destacado: false })
        .eq('id', local.id);

      if (localError) throw localError;

      // Update subscription destacado status
      const { error: subError } = await supabase
        .from('suscripciones_locales')
        .update({
          destacado_activo: false,
          destacado_fecha_fin: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', suscripcion.id);

      if (subError) throw subError;

      Alert.alert(
        'Destacado Desactivado',
        'El estado destacado ha sido desactivado. El crédito utilizado no se recupera.'
      );

      onRefresh();
    } catch (error: any) {
      console.error('[LocalSubscriptionCard] Error deactivating destacado:', error);
      Alert.alert('Error', 'No se pudo desactivar el estado destacado del local.');
    } finally {
      setUpdatingDestacado(false);
    }
  };

  const handleCancelPlan = () => {
    if (!local.suscripcion || local.suscripcion.plan_nombre === 'free') {
      Alert.alert('Información', 'No tienes un plan de pago activo para cancelar.');
      return;
    }

    const fechaPago = local.suscripcion.fecha_proximo_pago 
      ? new Date(local.suscripcion.fecha_proximo_pago).toLocaleDateString('es-ES')
      : 'fecha desconocida';

    Alert.alert(
      'Cancelar Plan',
      `¿Estás seguro de que deseas cancelar tu plan ${local.suscripcion.plan_nombre.toUpperCase()}?\n\n` +
        `• El plan seguirá activo hasta ${fechaPago}\n` +
        `• Perderás los créditos no utilizados\n` +
        `• Después volverás al plan básico gratuito`,
      [
        { text: 'No Cancelar', style: 'cancel' },
        {
          text: 'Sí, Cancelar',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);

              const { error } = await supabase
                .from('suscripciones_locales')
                .update({
                  cancelar_al_final_periodo: true,
                  updated_at: new Date().toISOString(),
                })
                .eq('id', local.suscripcion!.id);

              if (error) throw error;

              Alert.alert(
                'Plan Cancelado',
                `Tu plan se cancelará el ${fechaPago}. Hasta entonces, podrás seguir usando todos los beneficios.`
              );

              onRefresh();
            } catch (error: any) {
              console.error('[LocalSubscriptionCard] Error canceling plan:', error);
              Alert.alert('Error', 'No se pudo cancelar el plan. Intenta de nuevo.');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleChangePlan = () => {
    router.push(`/gestion/planes-suscripcion?localId=${local.id}`);
  };

  const handleOpenAnalytics = () => {
    if (!hasPremiumAccess()) {
      Alert.alert(
        'Plan Premium Requerido',
        'El panel de análisis solo está disponible para usuarios con plan Premium.\n\nActualiza tu plan para acceder a estadísticas detalladas de tu local.',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Ver Planes',
            onPress: () => router.push(`/gestion/planes-suscripcion?localId=${local.id}`),
          },
        ]
      );
      return;
    }

    router.push(`/gestion/panel-analisis?localId=${local.id}`);
  };

  const renderProgressBar = (remaining: number, total: number, color: string, label: string) => {
    const progress = total === 0 ? 0 : Math.min((remaining / total) * 100, 100);

    return (
      <View style={styles.progressContainer}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressLabel}>{label}</Text>
          <Text style={styles.progressValue}>
            {remaining} / {total === 0 ? '∞' : total}
          </Text>
        </View>
        <View style={styles.progressBarBackground}>
          <View style={[styles.progressBarFill, { width: `${progress}%`, backgroundColor: color }]} />
        </View>
      </View>
    );
  };

  const calculateRenewalProgress = (fechaProximoPago: string | null | undefined) => {
    if (!fechaProximoPago) return 0;
    
    try {
      const now = new Date();
      const end = new Date(fechaProximoPago);
      const start = new Date(end);
      start.setMonth(start.getMonth() - 1);
      
      const totalDuration = end.getTime() - start.getTime();
      const elapsed = now.getTime() - start.getTime();
      const progress = (elapsed / totalDuration) * 100;
      
      return Math.max(0, Math.min(100, 100 - progress));
    } catch (error) {
      return 0;
    }
  };

  return (
    <View style={styles.card}>
      {/* ✅ Cover Image with Gradient Overlay */}
      <TouchableOpacity 
        style={styles.coverImageContainer}
        onPress={() => router.push(`/detalle/local?id=${local.id}`)}
        activeOpacity={0.9}
      >
        {local.imagen_url ? (
          <React.Fragment>
            <Image source={{ uri: local.imagen_url }} style={styles.coverImage} resizeMode="cover" />
            <LinearGradient
              colors={['transparent', 'rgba(0, 0, 0, 0.7)']}
              style={styles.coverImageGradient}
            />
          </React.Fragment>
        ) : (
          <View style={[styles.coverImage, styles.coverImagePlaceholder]}>
            <IconSymbol ios_icon_name="building.2.fill" android_material_icon_name="store" size={48} color="rgba(255, 255, 255, 0.5)" />
            <Text style={styles.coverImagePlaceholderText}>Sin imagen de portada</Text>
          </View>
        )}

        {/* Local Name Overlay on Image */}
        <View style={styles.coverImageOverlay}>
          <Text style={styles.coverImageLocalName} numberOfLines={1}>{local.nombre}</Text>
          <View style={styles.coverImageMeta}>
            <IconSymbol ios_icon_name="mappin" android_material_icon_name="location_on" size={12} color="rgba(255, 255, 255, 0.9)" />
            <Text style={styles.coverImageProvincia}>{local.provincia}</Text>
          </View>
        </View>

        {/* Plan Badge on Image */}
        {local.suscripcion ? (
          <View
            style={[
              styles.planBadgeOnImage,
              { backgroundColor: getPlanColor(local.suscripcion.plan_nombre) },
            ]}
          >
            <IconSymbol
              ios_icon_name={getPlanIcon(local.suscripcion.plan_nombre) as any}
              android_material_icon_name="star"
              size={12}
              color="#FFFFFF"
            />
            <Text style={styles.planBadgeOnImageText}>
              {local.suscripcion.plan_nombre.toUpperCase()}
            </Text>
          </View>
        ) : (
          <View style={[styles.planBadgeOnImage, { backgroundColor: '#6B7280' }]}>
            <IconSymbol ios_icon_name="exclamationmark.triangle" android_material_icon_name="warning" size={12} color="#FFFFFF" />
            <Text style={styles.planBadgeOnImageText}>SIN PLAN</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Selected Badge */}
      {isSelected && (
        <View style={styles.selectedBadge}>
          <IconSymbol ios_icon_name="checkmark.circle.fill" android_material_icon_name="check_circle" size={18} color="#FFFFFF" />
          <Text style={styles.selectedBadgeText}>ACTIVO</Text>
        </View>
      )}

      <View style={styles.content}>
        {/* ✅ FIXED: Customer Potential Bar with corrected calculation */}
        <CustomerPotentialBar
          percentage={calculateCustomerPotential()}
          hasActiveHighlight={local.suscripcion?.destacado_activo || false}
          hasActiveEvent={!!local.evento_activo}
          planName={local.suscripcion?.plan_nombre || 'free'}
          localId={local.id}
        />

        {/* ✅ NEW: Highlight Active Counter */}
        {local.suscripcion?.destacado_activo && local.suscripcion.destacado_fecha_fin && (
          <HighlightActiveCounter
            localNombre={local.nombre}
            endDate={local.suscripcion.destacado_fecha_fin}
          />
        )}

        {/* Pending Plan Change Warning */}
        {local.suscripcion?.plan_pendiente_id && (
          <View style={styles.warningBanner}>
            <IconSymbol ios_icon_name="info.circle.fill" android_material_icon_name="info" size={18} color="#F59E0B" />
            <Text style={styles.warningText}>
              Cambio a {local.suscripcion.plan_pendiente_nombre?.toUpperCase()} programado para{' '}
              {local.suscripcion.fecha_cambio_plan 
                ? new Date(local.suscripcion.fecha_cambio_plan).toLocaleDateString('es-ES')
                : 'fecha pendiente'}
            </Text>
          </View>
        )}

        {/* Cancellation Warning */}
        {local.suscripcion?.cancelar_al_final_periodo && (
          <View style={[styles.warningBanner, { backgroundColor: '#FEE2E2' }]}>
            <IconSymbol ios_icon_name="exclamationmark.triangle.fill" android_material_icon_name="warning" size={18} color="#DC2626" />
            <Text style={[styles.warningText, { color: '#991B1B' }]}>
              Plan cancelado. Finaliza el{' '}
              {local.suscripcion.fecha_proximo_pago
                ? new Date(local.suscripcion.fecha_proximo_pago).toLocaleDateString('es-ES')
                : 'fecha pendiente'}
            </Text>
          </View>
        )}

        {local.suscripcion && (
          <React.Fragment>
            {/* Credits Section */}
            <View style={styles.creditsSection}>
              <View style={styles.creditsSectionHeader}>
                <IconSymbol ios_icon_name="creditcard.fill" android_material_icon_name="credit_card" size={18} color={colors.primary} />
                <Text style={styles.creditsSectionTitle}>Créditos Disponibles</Text>
              </View>

              {/* Featured Credits */}
              {renderProgressBar(
                local.suscripcion.creditos_destacados_restantes,
                local.suscripcion.creditos_destacados_restantes + (local.suscripcion.destacado_activo ? 1 : 0),
                colors.badgeDestacado,
                'Destacados'
              )}

              {/* Event Credits */}
              {renderProgressBar(
                local.suscripcion.creditos_eventos_restantes,
                local.suscripcion.eventos_disponibles,
                '#8B5CF6',
                'Eventos'
              )}

              {/* Renewal Date */}
              {local.suscripcion.fecha_renovacion_creditos && (
                <View style={styles.renewalInfo}>
                  <IconSymbol ios_icon_name="arrow.clockwise" android_material_icon_name="refresh" size={16} color={colors.textSecondary} />
                  <Text style={styles.renewalText}>
                    Renovación de créditos:{' '}
                    {new Date(local.suscripcion.fecha_renovacion_creditos).toLocaleDateString(
                      'es-ES'
                    )}
                  </Text>
                </View>
              )}
            </View>

            {/* Featured Toggle */}
            <View style={styles.destacadoSection}>
              <View style={styles.destacadoInfo}>
                <View style={styles.destacadoHeader}>
                  <IconSymbol ios_icon_name="star.fill" android_material_icon_name="star" size={18} color={colors.badgeDestacado} />
                  <Text style={styles.destacadoTitle}>Local Destacado (24h)</Text>
                </View>
                <Text style={styles.destacadoSubtitle}>
                  {local.destacado && local.suscripcion.destacado_activo
                    ? `Activo • ${calculateTimeRemaining(local.suscripcion.destacado_fecha_fin)} restantes`
                    : local.suscripcion.creditos_destacados_restantes > 0
                    ? `${local.suscripcion.creditos_destacados_restantes} créditos disponibles`
                    : 'Sin créditos disponibles'}
                </Text>
              </View>
              <TouchableOpacity
                style={[
                  styles.destacadoButton,
                  local.destacado && styles.destacadoButtonActive,
                  updatingDestacado && styles.destacadoButtonDisabled,
                ]}
                onPress={handleToggleDestacado}
                disabled={updatingDestacado || (local.destacado && local.suscripcion.destacado_activo)}
              >
                {updatingDestacado ? (
                  <ActivityIndicator size="small" color={colors.headerText} />
                ) : (
                  <React.Fragment>
                    <IconSymbol
                      ios_icon_name={local.destacado ? 'star.fill' : 'star'}
                      android_material_icon_name={local.destacado ? 'star' : 'star_border'}
                      size={20}
                      color={local.destacado ? '#FFFFFF' : colors.textSecondary}
                    />
                    <Text
                      style={[
                        styles.destacadoButtonText,
                        local.destacado && styles.destacadoButtonTextActive,
                      ]}
                    >
                      {local.destacado ? 'Activo' : 'Activar'}
                    </Text>
                  </React.Fragment>
                )}
              </TouchableOpacity>
            </View>

            {/* Plan Management Buttons */}
            <View style={styles.planActions}>
              <TouchableOpacity
                style={styles.planActionButton}
                onPress={handleChangePlan}
                disabled={loading}
              >
                <LinearGradient
                  colors={['#3B82F6', '#2563EB']}
                  style={styles.planActionGradient}
                >
                  <IconSymbol ios_icon_name="arrow.up.circle.fill" android_material_icon_name="arrow_upward" size={20} color="#FFFFFF" />
                  <Text style={styles.planActionText}>Cambiar Plan</Text>
                </LinearGradient>
              </TouchableOpacity>

              {local.suscripcion.plan_nombre !== 'free' &&
                !local.suscripcion.cancelar_al_final_periodo && (
                  <TouchableOpacity
                    style={styles.planActionButton}
                    onPress={handleCancelPlan}
                    disabled={loading}
                  >
                    <LinearGradient
                      colors={['#EF4444', '#DC2626']}
                      style={styles.planActionGradient}
                    >
                      {loading ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <React.Fragment>
                          <IconSymbol ios_icon_name="xmark.circle.fill" android_material_icon_name="cancel" size={20} color="#FFFFFF" />
                          <Text style={styles.planActionText}>Cancelar Plan</Text>
                        </React.Fragment>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                )}
            </View>
          </React.Fragment>
        )}

        {/* No Plan State */}
        {!local.suscripcion && (
          <View style={styles.noPlanContainer}>
            <IconSymbol ios_icon_name="exclamationmark.triangle.fill" android_material_icon_name="warning" size={32} color="#F59E0B" />
            <Text style={styles.noPlanText}>
              Activa un plan para crear eventos y promociones
            </Text>
            <TouchableOpacity
              style={styles.activarPlanButtonContainer}
              onPress={() => router.push(`/gestion/planes-suscripcion?localId=${local.id}`)}
            >
              <LinearGradient
                colors={['#F59E0B', '#D97706']}
                style={styles.activarPlanButtonGradient}
              >
                <IconSymbol ios_icon_name="crown.fill" android_material_icon_name="workspace_premium" size={18} color="#FFFFFF" />
                <Text style={styles.activarPlanButtonText}>Activar Plan</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        {/* Quick Actions - 3 buttons in a single row with soft design */}
        <View style={styles.actionsContainer}>
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => router.push(`/editar/local?id=${local.id}`)}
            >
              <View style={styles.actionButtonContent}>
                <View style={[styles.iconCircle, { backgroundColor: '#E0F2FE' }]}>
                  <IconSymbol ios_icon_name="pencil" android_material_icon_name="edit" size={16} color="#0EA5E9" />
                </View>
                <Text style={styles.actionButtonText}>Editar</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => router.push(`/crear/evento?localId=${local.id}`)}
            >
              <View style={styles.actionButtonContent}>
                <View style={[styles.iconCircle, { backgroundColor: '#FEF3C7' }]}>
                  <IconSymbol ios_icon_name="calendar.badge.plus" android_material_icon_name="event" size={16} color="#F59E0B" />
                </View>
                <Text style={styles.actionButtonText}>Evento</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.actionButton,
                !hasPremiumAccess() && styles.actionButtonDisabled,
              ]}
              onPress={handleOpenAnalytics}
            >
              <View style={styles.actionButtonContent}>
                <View style={[
                  styles.iconCircle, 
                  { backgroundColor: hasPremiumAccess() ? '#D1FAE5' : '#F3F4F6' }
                ]}>
                  <IconSymbol 
                    ios_icon_name="chart.bar.fill" 
                    android_material_icon_name="bar_chart"
                    size={16} 
                    color={hasPremiumAccess() ? '#10B981' : '#9CA3AF'}
                  />
                </View>
                <Text style={[
                  styles.actionButtonText,
                  !hasPremiumAccess() && styles.actionButtonTextDisabled
                ]}>
                  Análisis
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Select Button - Full Width Below */}
          {!isSelected && (
            <TouchableOpacity 
              style={styles.selectButton} 
              onPress={onSelect}
            >
              <LinearGradient
                colors={[colors.headerGradientStart, colors.headerGradientEnd]}
                style={styles.selectButtonGradient}
              >
                <IconSymbol ios_icon_name="checkmark.circle.fill" android_material_icon_name="check_circle" size={20} color="#FFFFFF" />
                <Text style={styles.selectButtonText}>Seleccionar Local</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.cardBackground,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
  coverImageContainer: {
    width: '100%',
    height: 160,
    position: 'relative',
  },
  coverImage: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.cardBorder,
  },
  coverImagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#1F2937',
  },
  coverImagePlaceholderText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.6)',
    fontWeight: '500',
  },
  coverImageGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '60%',
  },
  coverImageOverlay: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 12,
  },
  coverImageLocalName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  coverImageMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  coverImageProvincia: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  planBadgeOnImage: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  planBadgeOnImageText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  selectedBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#10B981',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  selectedBadgeText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  content: {
    padding: 16,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF3C7',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: '#92400E',
    fontWeight: '600',
  },
  creditsSection: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  creditsSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  creditsSectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  progressContainer: {
    marginBottom: 12,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  progressLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  progressValue: {
    fontSize: 13,
    fontWeight: 'bold',
    color: colors.text,
  },
  progressBarBackground: {
    height: 8,
    backgroundColor: colors.cardBorder,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  renewalInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  renewalText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  destacadoSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  destacadoInfo: {
    flex: 1,
  },
  destacadoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  destacadoTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  destacadoSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  destacadoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: colors.cardBorder,
  },
  destacadoButtonActive: {
    backgroundColor: colors.badgeDestacado,
  },
  destacadoButtonDisabled: {
    opacity: 0.5,
  },
  destacadoButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  destacadoButtonTextActive: {
    color: '#FFFFFF',
  },
  planActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  planActionButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  planActionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  planActionText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  noPlanContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    marginBottom: 16,
    gap: 12,
  },
  noPlanText: {
    fontSize: 14,
    color: '#92400E',
    textAlign: 'center',
    fontWeight: '600',
  },
  activarPlanButtonContainer: {
    borderRadius: 10,
    overflow: 'hidden',
    width: '100%',
  },
  activarPlanButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  activarPlanButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
  actionsContainer: {
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
    paddingTop: 16,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 12,
  },
  actionButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 6,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  actionButtonDisabled: {
    opacity: 0.6,
  },
  actionButtonContent: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    position: 'relative',
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  actionButtonTextDisabled: {
    color: colors.textSecondary,
  },
  selectButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  selectButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  selectButtonText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});
