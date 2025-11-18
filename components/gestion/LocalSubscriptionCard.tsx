
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

      // Update local destacado status
      const { error: localError } = await supabase
        .from('locales')
        .update({ destacado: true })
        .eq('id', local.id);

      if (localError) throw localError;

      // Update subscription credits and destacado status
      const fechaInicio = new Date();
      const fechaFin = new Date();
      fechaFin.setDate(fechaFin.getDate() + 30);

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
        'Tu local ahora está destacado y aparecerá en las primeras posiciones durante 30 días.\n\nCrédito consumido: 1'
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
    if (!local.suscripcion || local.suscripcion.plan_nombre === 'basico') {
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
      start.setMonth(start.getMonth() - 1); // Assume 1 month period
      
      const totalDuration = end.getTime() - start.getTime();
      const elapsed = now.getTime() - start.getTime();
      const progress = (elapsed / totalDuration) * 100;
      
      return Math.max(0, Math.min(100, 100 - progress)); // Invert so it shows remaining time
    } catch (error) {
      return 0;
    }
  };

  return (
    <View style={styles.card}>
      {/* Cover Image */}
      <TouchableOpacity onPress={() => router.push(`/detalle/local?id=${local.id}`)}>
        {local.imagen_url ? (
          <Image source={{ uri: local.imagen_url }} style={styles.coverImage} />
        ) : (
          <View style={[styles.coverImage, styles.coverImagePlaceholder]}>
            <IconSymbol name="building.2" size={48} color={colors.textSecondary} />
            <Text style={styles.coverImagePlaceholderText}>Sin imagen</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Selected Badge */}
      {isSelected && (
        <View style={styles.selectedBadge}>
          <IconSymbol name="checkmark.circle.fill" size={20} color={colors.primary} />
          <Text style={styles.selectedBadgeText}>ACTIVO</Text>
        </View>
      )}

      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.localInfo}>
            <Text style={styles.localNombre}>{local.nombre}</Text>
            <Text style={styles.localProvincia}>{local.provincia}</Text>
          </View>
          {local.suscripcion ? (
            <View
              style={[
                styles.planBadge,
                { backgroundColor: getPlanColor(local.suscripcion.plan_nombre) },
              ]}
            >
              <IconSymbol
                name={getPlanIcon(local.suscripcion.plan_nombre) as any}
                size={14}
                color="#FFFFFF"
              />
              <Text style={styles.planBadgeText}>
                {local.suscripcion.plan_nombre.toUpperCase()}
              </Text>
            </View>
          ) : (
            <View style={[styles.planBadge, { backgroundColor: '#6B7280' }]}>
              <IconSymbol name="exclamationmark.triangle" size={14} color="#FFFFFF" />
              <Text style={styles.planBadgeText}>SIN PLAN</Text>
            </View>
          )}
        </View>

        {/* Pending Plan Change Warning */}
        {local.suscripcion?.plan_pendiente_id && (
          <View style={styles.warningBanner}>
            <IconSymbol name="info.circle.fill" size={18} color="#F59E0B" />
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
            <IconSymbol name="exclamationmark.triangle.fill" size={18} color="#DC2626" />
            <Text style={[styles.warningText, { color: '#991B1B' }]}>
              Plan cancelado. Finaliza el{' '}
              {local.suscripcion.fecha_proximo_pago
                ? new Date(local.suscripcion.fecha_proximo_pago).toLocaleDateString('es-ES')
                : 'fecha pendiente'}
            </Text>
          </View>
        )}

        {local.suscripcion && (
          <>
            {/* Plan Renewal Time */}
            {local.suscripcion.plan_nombre !== 'basico' && (
              <View style={styles.timeSection}>
                <View style={styles.timeSectionHeader}>
                  <IconSymbol name="clock.fill" size={18} color={colors.primary} />
                  <Text style={styles.timeSectionTitle}>Renovación del Plan</Text>
                </View>
                {local.suscripcion.fecha_proximo_pago ? (
                  <>
                    <View style={styles.timeInfo}>
                      <Text style={styles.timeLabel}>Tiempo restante:</Text>
                      <Text style={styles.timeValue}>
                        {calculateTimeRemaining(local.suscripcion.fecha_proximo_pago)}
                      </Text>
                    </View>
                    <View style={styles.timeInfo}>
                      <Text style={styles.timeLabel}>Fecha de renovación:</Text>
                      <Text style={styles.timeValue}>
                        {new Date(local.suscripcion.fecha_proximo_pago).toLocaleDateString('es-ES')}
                      </Text>
                    </View>
                    <View style={styles.progressBarBackground}>
                      <View
                        style={[
                          styles.progressBarFill,
                          {
                            width: `${calculateRenewalProgress(local.suscripcion.fecha_proximo_pago)}%`,
                            backgroundColor: colors.primary,
                          },
                        ]}
                      />
                    </View>
                  </>
                ) : (
                  <View style={styles.warningBox}>
                    <IconSymbol name="exclamationmark.triangle" size={16} color="#F59E0B" />
                    <Text style={styles.warningBoxText}>
                      Fecha de renovación no configurada. Contacta con soporte.
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* Active Promotion Time */}
            {local.suscripcion.destacado_activo && local.suscripcion.destacado_fecha_fin && (
              <View style={styles.timeSection}>
                <View style={styles.timeSectionHeader}>
                  <IconSymbol name="star.fill" size={18} color={colors.badgeDestacado} />
                  <Text style={styles.timeSectionTitle}>Promoción Destacada</Text>
                </View>
                <View style={styles.timeInfo}>
                  <Text style={styles.timeLabel}>Tiempo restante:</Text>
                  <Text style={styles.timeValue}>
                    {calculateTimeRemaining(local.suscripcion.destacado_fecha_fin)}
                  </Text>
                </View>
                <View style={styles.progressBarBackground}>
                  <View
                    style={[
                      styles.progressBarFill,
                      {
                        width: `${Math.max(
                          0,
                          Math.min(
                            100,
                            ((new Date(local.suscripcion.destacado_fecha_fin).getTime() -
                              new Date().getTime()) /
                              (30 * 24 * 60 * 60 * 1000)) *
                              100
                          )
                        )}%`,
                        backgroundColor: colors.badgeDestacado,
                      },
                    ]}
                  />
                </View>
              </View>
            )}

            {/* Active Event Time */}
            {local.evento_activo && (
              <View style={styles.timeSection}>
                <View style={styles.timeSectionHeader}>
                  <IconSymbol name="calendar" size={18} color="#8B5CF6" />
                  <Text style={styles.timeSectionTitle}>Evento Activo</Text>
                </View>
                <Text style={styles.eventTitle}>{local.evento_activo.titulo}</Text>
                <View style={styles.timeInfo}>
                  <Text style={styles.timeLabel}>Fecha:</Text>
                  <Text style={styles.timeValue}>
                    {new Date(local.evento_activo.fecha).toLocaleDateString('es-ES')} a las{' '}
                    {local.evento_activo.hora}
                  </Text>
                </View>
              </View>
            )}

            {/* Credits Section */}
            <View style={styles.creditsSection}>
              <View style={styles.creditsSectionHeader}>
                <IconSymbol name="creditcard.fill" size={18} color={colors.primary} />
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
                  <IconSymbol name="arrow.clockwise" size={16} color={colors.textSecondary} />
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
                  <IconSymbol name="star.fill" size={18} color={colors.badgeDestacado} />
                  <Text style={styles.destacadoTitle}>Local Destacado</Text>
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
                  <>
                    <IconSymbol
                      name={local.destacado ? 'star.fill' : 'star'}
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
                  </>
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
                  <IconSymbol name="arrow.up.circle.fill" size={20} color="#FFFFFF" />
                  <Text style={styles.planActionText}>Cambiar Plan</Text>
                </LinearGradient>
              </TouchableOpacity>

              {local.suscripcion.plan_nombre !== 'basico' &&
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
                        <>
                          <IconSymbol name="xmark.circle.fill" size={20} color="#FFFFFF" />
                          <Text style={styles.planActionText}>Cancelar Plan</Text>
                        </>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                )}
            </View>
          </>
        )}

        {/* No Plan State */}
        {!local.suscripcion && (
          <View style={styles.noPlanContainer}>
            <Text style={styles.noPlanText}>
              Activa un plan para crear eventos y promociones
            </Text>
            <TouchableOpacity
              style={styles.activarPlanButton}
              onPress={() => router.push(`/gestion/planes-suscripcion?localId=${local.id}`)}
            >
              <Text style={styles.activarPlanButtonText}>Activar Plan</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Quick Actions */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push(`/perfil/local?localId=${local.id}`)}
          >
            <IconSymbol name="person.2.fill" size={18} color={colors.primary} />
            <Text style={styles.actionText}>Perfil</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push(`/editar/local?id=${local.id}`)}
          >
            <IconSymbol name="pencil" size={18} color={colors.primary} />
            <Text style={styles.actionText}>Editar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push(`/crear/evento?localId=${local.id}`)}
          >
            <IconSymbol name="calendar.badge.plus" size={18} color={colors.primary} />
            <Text style={styles.actionText}>Evento</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.actionButton,
              !hasPremiumAccess() && styles.actionButtonDisabled,
            ]}
            onPress={handleOpenAnalytics}
          >
            <IconSymbol 
              name="chart.bar.fill" 
              size={18} 
              color={hasPremiumAccess() ? colors.primary : colors.textSecondary} 
            />
            <Text style={[
              styles.actionText,
              !hasPremiumAccess() && styles.actionTextDisabled,
            ]}>
              Análisis
            </Text>
            {hasPremiumAccess() && (
              <View style={styles.premiumBadge}>
                <IconSymbol name="star.fill" size={10} color="#F59E0B" />
              </View>
            )}
          </TouchableOpacity>
          {!isSelected && (
            <TouchableOpacity style={styles.actionButton} onPress={onSelect}>
              <IconSymbol name="checkmark.circle" size={18} color={colors.primary} />
              <Text style={styles.actionText}>Seleccionar</Text>
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
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  coverImage: {
    width: '100%',
    height: 180,
    backgroundColor: colors.cardBorder,
  },
  coverImagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  coverImagePlaceholderText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  selectedBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    zIndex: 10,
  },
  selectedBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  content: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  localInfo: {
    flex: 1,
  },
  localNombre: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  localProvincia: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  planBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  planBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: '#92400E',
    fontWeight: '600',
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    padding: 10,
    marginTop: 8,
  },
  warningBoxText: {
    flex: 1,
    fontSize: 12,
    color: '#92400E',
  },
  timeSection: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  timeSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  timeSectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  eventTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  timeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  timeLabel: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  timeValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text,
  },
  creditsSection: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 12,
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
    fontWeight: '600',
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
    padding: 12,
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
    fontWeight: '600',
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
    paddingHorizontal: 12,
    borderRadius: 8,
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
    fontWeight: '600',
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
    paddingVertical: 12,
  },
  planActionText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  noPlanContainer: {
    padding: 16,
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    marginBottom: 16,
  },
  noPlanText: {
    fontSize: 14,
    color: '#92400E',
    marginBottom: 12,
    textAlign: 'center',
  },
  activarPlanButton: {
    backgroundColor: '#F59E0B',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  activarPlanButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
    paddingTop: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    minWidth: '22%',
    position: 'relative',
  },
  actionButtonDisabled: {
    opacity: 0.6,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  actionTextDisabled: {
    color: colors.textSecondary,
  },
  premiumBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#FEF3C7',
    borderRadius: 10,
    padding: 3,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
});
