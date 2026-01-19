
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Alert,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { colors } from '@/styles/commonStyles';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 40;

interface Plan {
  id: string;
  nombre: string;
  precio_mensual: number;
  eventos_mes: number;
  promos_destacadas: number;
  perfil_social: boolean;
  panel_analisis: boolean;
  soporte_prioritario: boolean;
  visibilidad_extra: boolean;
  visibilidad_maxima: boolean;
  descripcion: string;
}

interface Local {
  id: string;
  nombre: string;
  suscripcion_actual?: {
    id: string;
    plan_id: string;
    plan_nombre: string;
    plan_precio: number;
    creditos_destacados_restantes: number;
    creditos_eventos_restantes: number;
    fecha_proximo_pago?: string;
    cancelar_al_final_periodo?: boolean;
  };
}

/**
 * ✅ PLAN SELECTION PAGE v52.0 - FIXED CANCEL BUTTON FOR FREE PLANS
 * 
 * CRITICAL FIXES v52.0:
 * - ✅ Cancel button HIDDEN for free plans (precio_mensual === 0)
 * - ✅ Cancel button ONLY visible for paid plans (precio_mensual > 0)
 * - ✅ Cancel button has LESS PROMINENT color (#6B7280 gray instead of red)
 * - ✅ Fixed all subscription errors
 */

export default function PlanesSuscripcionScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const params = useLocalSearchParams();
  
  const localId = params.localId as string | undefined;
  
  const [loading, setLoading] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [planes, setPlanes] = useState<Plan[]>([]);
  const [local, setLocal] = useState<Local | null>(null);

  const cargarDatos = useCallback(async () => {
    if (!localId) {
      console.error('[PlanesSuscripcion v52.0] ❌ No localId provided');
      Alert.alert(
        'Error',
        'No se especificó el local. Por favor, selecciona un local desde la página de gestión.',
        [{ text: 'OK', onPress: () => router.replace('/(tabs)/gestion') }]
      );
      setLoading(false);
      return;
    }

    try {
      console.log('[PlanesSuscripcion v52.0] Cargando datos para local:', localId);
      
      const { data: planesData, error: planesError } = await supabase
        .from('planes_suscripcion')
        .select('*')
        .eq('activo', true)
        .order('precio_mensual', { ascending: true });

      if (planesError) {
        console.error('[PlanesSuscripcion v52.0] Error cargando planes:', planesError);
        throw planesError;
      }
      
      console.log('[PlanesSuscripcion v52.0] Planes cargados:', planesData?.length || 0);
      setPlanes(planesData || []);

      const { data: localData, error: localError } = await supabase
        .from('locales')
        .select('id, nombre')
        .eq('id', localId)
        .single();

      if (localError) {
        console.error('[PlanesSuscripcion v52.0] Error cargando local:', localError);
        throw localError;
      }
      
      console.log('[PlanesSuscripcion v52.0] Local cargado:', localData?.nombre);

      const { data: suscripcionData, error: suscripcionError } = await supabase
        .from('suscripciones_locales')
        .select('id, plan_id, creditos_destacados_restantes, creditos_eventos_restantes, fecha_proximo_pago, cancelar_al_final_periodo')
        .eq('local_id', localId)
        .eq('estado', 'activa')
        .maybeSingle();

      if (suscripcionError && suscripcionError.code !== 'PGRST116') {
        console.error('[PlanesSuscripcion v52.0] Error cargando suscripción:', suscripcionError);
      }

      let suscripcionActual = undefined;

      if (suscripcionData) {
        const { data: planData, error: planError } = await supabase
          .from('planes_suscripcion')
          .select('nombre, precio_mensual')
          .eq('id', suscripcionData.plan_id)
          .single();

        if (planError) {
          console.error('[PlanesSuscripcion v52.0] Error cargando plan:', planError);
        } else {
          suscripcionActual = {
            id: suscripcionData.id,
            plan_id: suscripcionData.plan_id,
            plan_nombre: planData?.nombre || 'free',
            plan_precio: planData?.precio_mensual || 0,
            creditos_destacados_restantes: suscripcionData.creditos_destacados_restantes || 0,
            creditos_eventos_restantes: suscripcionData.creditos_eventos_restantes || 0,
            fecha_proximo_pago: suscripcionData.fecha_proximo_pago,
            cancelar_al_final_periodo: suscripcionData.cancelar_al_final_periodo || false,
          };
        }
      }

      setLocal({
        ...localData,
        suscripcion_actual: suscripcionActual,
      });

      console.log('[PlanesSuscripcion v52.0] Datos cargados exitosamente');
    } catch (error: any) {
      console.error('[PlanesSuscripcion v52.0] Error cargando datos:', error);
      Alert.alert(
        'Error', 
        error.message || 'No se pudieron cargar los planes de suscripción',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } finally {
      setLoading(false);
    }
  }, [localId, router]);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  const activarPlan = (plan: Plan) => {
    if (!local?.suscripcion_actual) {
      if (plan.precio_mensual === 0) {
        procesarActivacion(plan, 'new');
      } else {
        Alert.alert(
          'Confirmar Suscripción',
          `¿Deseas activar el plan ${plan.nombre.toUpperCase()} por ${plan.precio_mensual}€/mes?`,
          [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Activar', onPress: () => procesarActivacion(plan, 'new') }
          ]
        );
      }
      return;
    }

    const currentPrice = local.suscripcion_actual.plan_precio;
    const newPrice = plan.precio_mensual;

    if (newPrice > currentPrice) {
      Alert.alert(
        'Mejorar Plan',
        `¿Deseas mejorar a ${plan.nombre.toUpperCase()} por ${newPrice}€/mes?\n\n` +
          `• El nuevo plan se activará inmediatamente\n` +
          `• Se cobrará ${newPrice}€ ahora\n` +
          `• Tus créditos se reiniciarán`,
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Mejorar Ahora', onPress: () => procesarActivacion(plan, 'upgrade') }
        ]
      );
    } else if (newPrice < currentPrice) {
      const hasCredits =
        local.suscripcion_actual.creditos_destacados_restantes > 0 ||
        local.suscripcion_actual.creditos_eventos_restantes > 0;

      if (hasCredits) {
        Alert.alert(
          'Cambiar a Plan Inferior',
          `¿Deseas cambiar a ${plan.nombre.toUpperCase()}?\n\n` +
            `• El cambio se aplicará el ${new Date(local.suscripcion_actual.fecha_proximo_pago || '').toLocaleDateString('es-ES')}\n` +
            `• Podrás usar tus créditos actuales hasta entonces\n` +
            `• No se realizará ningún cobro hasta que se active el nuevo plan`,
          [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Programar Cambio', onPress: () => procesarActivacion(plan, 'downgrade_scheduled') }
          ]
        );
      } else {
        Alert.alert(
          'Cambiar a Plan Inferior',
          `¿Deseas cambiar a ${plan.nombre.toUpperCase()}?\n\n` +
            `• No tienes créditos pendientes, el cambio será inmediato\n` +
            `• El nuevo plan costará ${newPrice}€/mes`,
          [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Cambiar Ahora', onPress: () => procesarActivacion(plan, 'downgrade_immediate') }
          ]
        );
      }
    } else {
      Alert.alert('Información', 'Ya tienes este plan activo.');
    }
  };

  const procesarActivacion = async (plan: Plan, tipo: 'new' | 'upgrade' | 'downgrade_scheduled' | 'downgrade_immediate') => {
    if (!user) {
      Alert.alert('Error', 'Debes iniciar sesión para activar un plan');
      return;
    }

    if (!localId) {
      console.error('[PlanesSuscripcion v52.0] ❌ No localId provided');
      Alert.alert('Error', 'No se especificó el local');
      return;
    }

    if (!local) {
      Alert.alert('Error', 'No se pudo cargar la información del local');
      return;
    }

    setProcesando(true);

    try {
      console.log('[PlanesSuscripcion v52.0] Activando plan:', plan.nombre, 'tipo:', tipo);

      const now = new Date();
      const nextMonth = new Date(now);
      nextMonth.setMonth(nextMonth.getMonth() + 1);

      if (tipo === 'new') {
        const { error: insertError } = await supabase
          .from('suscripciones_locales')
          .insert({
            local_id: localId,
            usuario_id: user.id,
            propietario_id: user.id,
            plan_id: plan.id,
            estado: 'activa',
            fecha_inicio: now.toISOString(),
            fecha_proximo_pago: nextMonth.toISOString(),
            fecha_renovacion_creditos: nextMonth.toISOString(),
            eventos_usados_mes: 0,
            promos_usadas_mes: 0,
            creditos_destacados_restantes: plan.promos_destacadas,
            creditos_eventos_restantes: plan.eventos_mes,
            ultimo_reset_contador: now.toISOString(),
          });

        if (insertError) {
          console.error('[PlanesSuscripcion v52.0] ❌ Error creating subscription:', insertError);
          throw insertError;
        }

        Alert.alert(
          '¡Éxito!',
          `Plan ${plan.nombre.toUpperCase()} activado correctamente.`,
          [{ text: 'OK', onPress: () => router.back() }]
        );
      } else if (tipo === 'upgrade') {
        const { error: updateError } = await supabase
          .from('suscripciones_locales')
          .update({
            plan_id: plan.id,
            fecha_inicio: now.toISOString(),
            fecha_proximo_pago: nextMonth.toISOString(),
            fecha_renovacion_creditos: nextMonth.toISOString(),
            eventos_usados_mes: 0,
            promos_usadas_mes: 0,
            creditos_destacados_restantes: plan.promos_destacadas,
            creditos_eventos_restantes: plan.eventos_mes,
            ultimo_reset_contador: now.toISOString(),
            plan_pendiente_id: null,
            fecha_cambio_plan: null,
            updated_at: now.toISOString(),
          })
          .eq('id', local.suscripcion_actual!.id);

        if (updateError) {
          console.error('[PlanesSuscripcion v52.0] ❌ Error upgrading subscription:', updateError);
          throw updateError;
        }

        Alert.alert(
          '¡Plan Mejorado!',
          `Tu plan ${plan.nombre.toUpperCase()} está activo. Disfruta de todos los beneficios.`,
          [{ text: 'OK', onPress: () => router.back() }]
        );
      } else if (tipo === 'downgrade_scheduled') {
        const { error: updateError } = await supabase
          .from('suscripciones_locales')
          .update({
            plan_pendiente_id: plan.id,
            fecha_cambio_plan: local.suscripcion_actual!.fecha_proximo_pago,
            updated_at: now.toISOString(),
          })
          .eq('id', local.suscripcion_actual!.id);

        if (updateError) {
          console.error('[PlanesSuscripcion v52.0] ❌ Error scheduling downgrade:', updateError);
          throw updateError;
        }

        Alert.alert(
          'Cambio Programado',
          `El plan ${plan.nombre.toUpperCase()} se activará el ${new Date(local.suscripcion_actual!.fecha_proximo_pago || '').toLocaleDateString('es-ES')}. Hasta entonces, podrás usar tu plan actual.`,
          [{ text: 'OK', onPress: () => router.back() }]
        );
      } else if (tipo === 'downgrade_immediate') {
        const { error: updateError } = await supabase
          .from('suscripciones_locales')
          .update({
            plan_id: plan.id,
            fecha_inicio: now.toISOString(),
            fecha_proximo_pago: nextMonth.toISOString(),
            fecha_renovacion_creditos: nextMonth.toISOString(),
            eventos_usados_mes: 0,
            promos_usadas_mes: 0,
            creditos_destacados_restantes: plan.promos_destacadas,
            creditos_eventos_restantes: plan.eventos_mes,
            ultimo_reset_contador: now.toISOString(),
            plan_pendiente_id: null,
            fecha_cambio_plan: null,
            updated_at: now.toISOString(),
          })
          .eq('id', local.suscripcion_actual!.id);

        if (updateError) {
          console.error('[PlanesSuscripcion v52.0] ❌ Error downgrading subscription:', updateError);
          throw updateError;
        }

        Alert.alert(
          'Plan Cambiado',
          `Tu plan ${plan.nombre.toUpperCase()} está activo.`,
          [{ text: 'OK', onPress: () => router.back() }]
        );
      }
    } catch (error: any) {
      console.error('[PlanesSuscripcion v52.0] Error activando plan:', error);
      Alert.alert('Error', error.message || 'No se pudo activar el plan. Intenta de nuevo.');
    } finally {
      setProcesando(false);
    }
  };

  const handleCancelPlan = () => {
    if (!local?.suscripcion_actual) {
      Alert.alert('Error', 'No tienes un plan activo');
      return;
    }

    // ✅ CRITICAL FIX v52.0: Cannot cancel free plan (precio_mensual === 0)
    if (local.suscripcion_actual.plan_precio === 0) {
      Alert.alert(
        'Plan Gratuito',
        'El plan gratuito es el plan predeterminado y no puede cancelarse. Si deseas cambiar de plan, selecciona otro plan de la lista.',
        [{ text: 'OK' }]
      );
      return;
    }

    const fechaPago = local.suscripcion_actual.fecha_proximo_pago 
      ? new Date(local.suscripcion_actual.fecha_proximo_pago).toLocaleDateString('es-ES')
      : 'fecha desconocida';

    Alert.alert(
      'Cancelar Plan',
      `¿Estás seguro de que deseas cancelar tu plan ${local.suscripcion_actual.plan_nombre.toUpperCase()}?\n\n` +
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
              setProcesando(true);

              const { error } = await supabase
                .from('suscripciones_locales')
                .update({
                  cancelar_al_final_periodo: true,
                  updated_at: new Date().toISOString(),
                })
                .eq('id', local.suscripcion_actual!.id);

              if (error) throw error;

              Alert.alert(
                'Plan Cancelado',
                `Tu plan se cancelará el ${fechaPago}. Hasta entonces, podrás seguir usando todos los beneficios.`,
                [{ text: 'OK', onPress: () => router.back() }]
              );
            } catch (error: any) {
              console.error('[PlanesSuscripcion v52.0] Error canceling plan:', error);
              Alert.alert('Error', 'No se pudo cancelar el plan. Intenta de nuevo.');
            } finally {
              setProcesando(false);
            }
          },
        },
      ]
    );
  };

  const getPlanColor = (nombre: string): string[] => {
    switch (nombre.toLowerCase()) {
      case 'free':
      case 'basico':
      case 'básico':
        return ['#9CA3AF', '#6B7280'];
      case 'estandar':
      case 'estándar':
        return ['#3B82F6', '#2563EB'];
      case 'premium':
        return ['#F59E0B', '#D97706'];
      default:
        return [colors.primary, colors.secondary];
    }
  };

  const getPlanIcon = (nombre: string): { ios: string; android: string } => {
    switch (nombre.toLowerCase()) {
      case 'free':
      case 'basico':
      case 'básico':
        return { ios: 'checkmark.circle', android: 'check_circle' };
      case 'estandar':
      case 'estándar':
        return { ios: 'star.circle.fill', android: 'star' };
      case 'premium':
        return { ios: 'crown.fill', android: 'workspace_premium' };
      default:
        return { ios: 'circle', android: 'circle' };
    }
  };

  const getBenefitText = (feature: string, plan: Plan): string => {
    switch (feature) {
      case 'eventos':
        if (plan.eventos_mes === 0) return 'Sin eventos';
        return `Crea ${plan.eventos_mes} eventos al mes`;
      case 'destacados':
        if (plan.promos_destacadas === 0) return 'Sin destacados';
        return `Supera a tu competencia ${plan.promos_destacadas} veces/mes`;
      case 'perfil_social':
        return plan.perfil_social ? 'Perfil social activo' : 'Sin perfil social';
      case 'panel_analisis':
        return plan.panel_analisis ? 'Descubre quién te visita' : 'Sin estadísticas';
      case 'soporte':
        return plan.soporte_prioritario ? 'Soporte prioritario 24/7' : 'Soporte estándar';
      case 'visibilidad':
        if (plan.visibilidad_maxima) return 'Visibilidad máxima garantizada';
        if (plan.visibilidad_extra) return 'Visibilidad mejorada';
        return 'Visibilidad básica';
      default:
        return '';
    }
  };

  const getButtonText = (nombre: string, isActive: boolean): string => {
    if (isActive) return 'Plan Actual';
    
    switch (nombre.toLowerCase()) {
      case 'free':
      case 'basico':
      case 'básico':
        return 'Continuar con lo básico';
      case 'estandar':
      case 'estándar':
        return 'Empezar a Crecer';
      case 'premium':
        return 'Dominar mi Zona';
      default:
        return 'Seleccionar Plan';
    }
  };

  const getButtonColors = (nombre: string, isActive: boolean): string[] => {
    if (isActive) return ['#6B7280', '#4B5563'];
    
    switch (nombre.toLowerCase()) {
      case 'free':
      case 'basico':
      case 'básico':
        return ['#9CA3AF', '#6B7280'];
      case 'estandar':
      case 'estándar':
        return ['#3B82F6', '#2563EB'];
      case 'premium':
        return ['#F59E0B', '#D97706'];
      default:
        return [colors.primary, colors.secondary];
    }
  };

  const isStandardPlan = (nombre: string): boolean => {
    return nombre.toLowerCase() === 'estandar' || nombre.toLowerCase() === 'estándar';
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Cargando planes...</Text>
      </View>
    );
  }

  if (!local || planes.length === 0) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', padding: 20 }]}>
        <IconSymbol ios_icon_name="exclamationmark.triangle" android_material_icon_name="warning" size={64} color={colors.textSecondary} />
        <Text style={[styles.loadingText, { marginTop: 16, textAlign: 'center' }]}>
          {!local ? 'Local no encontrado' : 'No hay planes disponibles'}
        </Text>
        <TouchableOpacity 
          style={[styles.planButton, { marginTop: 20, width: 200 }]}
          onPress={() => router.back()}
        >
          <LinearGradient
            colors={[colors.primary, colors.secondary]}
            style={styles.planButtonGradient}
          >
            <Text style={styles.planButtonText}>Volver</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    );
  }

  const planActual = local.suscripcion_actual?.plan_id;
  const currentPlanPrice = local.suscripcion_actual?.plan_precio || 0;
  const isCancelPending = local.suscripcion_actual?.cancelar_al_final_periodo || false;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.headerGradientStart, colors.headerGradientEnd]}
        style={styles.header}
      >
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <IconSymbol ios_icon_name="chevron.left" android_material_icon_name="arrow_back" size={24} color={colors.headerText} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Invierte en Clientes</Text>
          {local && <Text style={styles.headerSubtitle}>{local.nombre}</Text>}
        </View>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroSection}>
          <IconSymbol ios_icon_name="chart.line.uptrend.xyaxis" android_material_icon_name="trending_up" size={48} color={colors.primary} />
          <Text style={styles.heroTitle}>Haz Crecer Tu Negocio</Text>
          <Text style={styles.heroSubtitle}>
            No estás comprando un plan, estás invirtiendo en más clientes
          </Text>
        </View>

        {local.suscripcion_actual && (
          <View style={styles.currentPlanBanner}>
            <IconSymbol ios_icon_name="info.circle.fill" android_material_icon_name="info" size={20} color={colors.primary} />
            <Text style={styles.currentPlanText}>
              Plan actual: <Text style={styles.currentPlanName}>{local.suscripcion_actual.plan_nombre.toUpperCase()}</Text>
            </Text>
          </View>
        )}

        {isCancelPending && local.suscripcion_actual && (
          <View style={styles.cancellationWarning}>
            <IconSymbol ios_icon_name="exclamationmark.triangle.fill" android_material_icon_name="warning" size={20} color="#DC2626" />
            <Text style={styles.cancellationWarningText}>
              Plan cancelado. Finaliza el{' '}
              {local.suscripcion_actual.fecha_proximo_pago
                ? new Date(local.suscripcion_actual.fecha_proximo_pago).toLocaleDateString('es-ES')
                : 'fecha pendiente'}
            </Text>
          </View>
        )}

        <View style={styles.plansContainer}>
          {planes.map((plan) => {
            const isActive = planActual === plan.id;
            const isStandard = isStandardPlan(plan.nombre);
            const planColors = getPlanColor(plan.nombre);
            const planIcon = getPlanIcon(plan.nombre);

            return (
              <View 
                key={plan.id} 
                style={[
                  styles.planCard,
                  isStandard && styles.planCardStandard,
                  isActive && styles.planCardActive,
                ]}
              >
                {isStandard && (
                  <View style={styles.popularBadge}>
                    <IconSymbol ios_icon_name="star.fill" android_material_icon_name="star" size={14} color="#FFFFFF" />
                    <Text style={styles.popularBadgeText}>MÁS POPULAR</Text>
                  </View>
                )}

                {isActive && (
                  <View style={styles.activeBadge}>
                    <IconSymbol ios_icon_name="checkmark.circle.fill" android_material_icon_name="check_circle" size={16} color={colors.white} />
                    <Text style={styles.activeBadgeText}>Plan Actual</Text>
                  </View>
                )}

                <LinearGradient
                  colors={planColors}
                  style={styles.planHeader}
                >
                  <IconSymbol 
                    ios_icon_name={planIcon.ios as any}
                    android_material_icon_name={planIcon.android}
                    size={40} 
                    color={colors.white} 
                  />
                  <Text style={styles.planNombre}>{plan.nombre.toUpperCase()}</Text>
                  <View style={styles.planPrecio}>
                    <Text style={styles.planPrecioNumero}>
                      {plan.precio_mensual === 0 ? 'Gratis' : `${plan.precio_mensual}€`}
                    </Text>
                    {plan.precio_mensual > 0 && (
                      <Text style={styles.planPrecioTexto}>/mes</Text>
                    )}
                  </View>
                  {plan.precio_mensual > 0 && (
                    <Text style={styles.planPrecioCafe}>
                      Menos de lo que cuesta un café al día
                    </Text>
                  )}
                </LinearGradient>

                <View style={styles.planBody}>
                  <View style={styles.planFeatures}>
                    <View style={styles.featureItem}>
                      <IconSymbol 
                        ios_icon_name={plan.eventos_mes > 0 ? 'checkmark.circle.fill' : 'xmark.circle.fill'}
                        android_material_icon_name={plan.eventos_mes > 0 ? 'check_circle' : 'cancel'}
                        size={20} 
                        color={plan.eventos_mes > 0 ? '#10B981' : colors.textSecondary} 
                      />
                      <Text style={[styles.featureText, plan.eventos_mes === 0 && styles.featureTextDisabled]}>
                        {getBenefitText('eventos', plan)}
                      </Text>
                    </View>

                    <View style={styles.featureItem}>
                      <IconSymbol 
                        ios_icon_name={plan.promos_destacadas > 0 ? 'checkmark.circle.fill' : 'xmark.circle.fill'}
                        android_material_icon_name={plan.promos_destacadas > 0 ? 'check_circle' : 'cancel'}
                        size={20} 
                        color={plan.promos_destacadas > 0 ? '#10B981' : colors.textSecondary} 
                      />
                      <Text style={[styles.featureText, plan.promos_destacadas === 0 && styles.featureTextDisabled]}>
                        {getBenefitText('destacados', plan)}
                      </Text>
                    </View>

                    <View style={styles.featureItem}>
                      <IconSymbol 
                        ios_icon_name={plan.perfil_social ? 'checkmark.circle.fill' : 'xmark.circle.fill'}
                        android_material_icon_name={plan.perfil_social ? 'check_circle' : 'cancel'}
                        size={20} 
                        color={plan.perfil_social ? '#10B981' : colors.textSecondary} 
                      />
                      <Text style={[styles.featureText, !plan.perfil_social && styles.featureTextDisabled]}>
                        {getBenefitText('perfil_social', plan)}
                      </Text>
                    </View>

                    <View style={styles.featureItem}>
                      <IconSymbol 
                        ios_icon_name={plan.panel_analisis ? 'checkmark.circle.fill' : 'xmark.circle.fill'}
                        android_material_icon_name={plan.panel_analisis ? 'check_circle' : 'cancel'}
                        size={20} 
                        color={plan.panel_analisis ? '#10B981' : colors.textSecondary} 
                      />
                      <Text style={[styles.featureText, !plan.panel_analisis && styles.featureTextDisabled]}>
                        {getBenefitText('panel_analisis', plan)}
                      </Text>
                    </View>

                    <View style={styles.featureItem}>
                      <IconSymbol 
                        ios_icon_name={plan.soporte_prioritario ? 'checkmark.circle.fill' : 'xmark.circle.fill'}
                        android_material_icon_name={plan.soporte_prioritario ? 'check_circle' : 'cancel'}
                        size={20} 
                        color={plan.soporte_prioritario ? '#10B981' : colors.textSecondary} 
                      />
                      <Text style={[styles.featureText, !plan.soporte_prioritario && styles.featureTextDisabled]}>
                        {getBenefitText('soporte', plan)}
                      </Text>
                    </View>

                    <View style={styles.featureItem}>
                      <IconSymbol 
                        ios_icon_name="eye.fill"
                        android_material_icon_name="visibility"
                        size={20} 
                        color={plan.visibilidad_maxima || plan.visibilidad_extra ? '#10B981' : colors.textSecondary} 
                      />
                      <Text style={[styles.featureText, !plan.visibilidad_maxima && !plan.visibilidad_extra && styles.featureTextDisabled]}>
                        {getBenefitText('visibilidad', plan)}
                      </Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.planButton,
                      isActive && styles.planButtonActive,
                    ]}
                    onPress={() => !isActive && activarPlan(plan)}
                    disabled={isActive || procesando}
                  >
                    <LinearGradient
                      colors={getButtonColors(plan.nombre, isActive)}
                      style={styles.planButtonGradient}
                    >
                      {procesando ? (
                        <ActivityIndicator color={colors.white} />
                      ) : (
                        <Text style={styles.planButtonText}>
                          {getButtonText(plan.nombre, isActive)}
                        </Text>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>

                  {/* ✅ CRITICAL FIX v52.0: Cancel button ONLY for paid plans (precio_mensual > 0) */}
                  {isActive && currentPlanPrice > 0 && !isCancelPending && (
                    <TouchableOpacity
                      style={styles.cancelPlanButton}
                      onPress={handleCancelPlan}
                      disabled={procesando}
                    >
                      {procesando ? (
                        <ActivityIndicator size="small" color="#6B7280" />
                      ) : (
                        <>
                          <IconSymbol
                            ios_icon_name="xmark.circle"
                            android_material_icon_name="cancel"
                            size={18}
                            color="#6B7280"
                          />
                          <Text style={styles.cancelPlanButtonText}>Cancelar plan</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })}
        </View>

        <View style={styles.socialProofSection}>
          <View style={styles.socialProofCard}>
            <IconSymbol ios_icon_name="chart.bar.fill" android_material_icon_name="bar_chart" size={32} color="#10B981" />
            <Text style={styles.socialProofTitle}>+40% de clics</Text>
            <Text style={styles.socialProofText}>
              Los locales destacados reciben un 40% más de visitas
            </Text>
          </View>

          <View style={styles.socialProofCard}>
            <IconSymbol ios_icon_name="person.3.fill" android_material_icon_name="groups" size={32} color="#3B82F6" />
            <Text style={styles.socialProofTitle}>+200 clientes</Text>
            <Text style={styles.socialProofText}>
              Promedio de nuevos clientes al mes con Plan Estándar
            </Text>
          </View>
        </View>

        <View style={styles.guaranteeSection}>
          <IconSymbol ios_icon_name="checkmark.shield.fill" android_material_icon_name="verified_user" size={40} color={colors.primary} />
          <Text style={styles.guaranteeTitle}>Garantía de Satisfacción</Text>
          <Text style={styles.guaranteeText}>
            Cancela cuando quieras. Sin permanencia. Sin letra pequeña.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 50,
    paddingBottom: 20,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 8,
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.headerText,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.headerText,
    opacity: 0.9,
    marginTop: 2,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.textSecondary,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 16,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 24,
  },
  currentPlanBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.primary + '15',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  currentPlanText: {
    fontSize: 15,
    color: colors.text,
  },
  currentPlanName: {
    fontWeight: 'bold',
    color: colors.primary,
  },
  cancellationWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FEE2E2',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  cancellationWarningText: {
    flex: 1,
    fontSize: 14,
    color: '#991B1B',
    fontWeight: '600',
  },
  plansContainer: {
    gap: 24,
    marginBottom: 32,
    alignItems: 'center',
  },
  planCard: {
    width: CARD_WIDTH,
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.cardBorder,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 8,
  },
  planCardStandard: {
    borderColor: '#3B82F6',
    borderWidth: 3,
    shadowColor: '#3B82F6',
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
    transform: [{ scale: 1.05 }],
    marginVertical: 12,
  },
  planCardActive: {
    borderColor: colors.primary,
  },
  popularBadge: {
    backgroundColor: '#3B82F6',
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  popularBadgeText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  activeBadge: {
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
  activeBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.white,
  },
  planHeader: {
    padding: 24,
    alignItems: 'center',
  },
  planNombre: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.white,
    marginTop: 12,
  },
  planPrecio: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 8,
  },
  planPrecioNumero: {
    fontSize: 36,
    fontWeight: 'bold',
    color: colors.white,
  },
  planPrecioTexto: {
    fontSize: 18,
    color: colors.white,
    opacity: 0.9,
    marginLeft: 4,
  },
  planPrecioCafe: {
    fontSize: 12,
    color: colors.white,
    opacity: 0.8,
    marginTop: 4,
    fontStyle: 'italic',
  },
  planBody: {
    padding: 24,
  },
  planFeatures: {
    gap: 16,
    marginBottom: 24,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureText: {
    fontSize: 15,
    color: colors.text,
    flex: 1,
    fontWeight: '500',
  },
  featureTextDisabled: {
    color: colors.textSecondary,
    textDecorationLine: 'line-through',
  },
  planButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  planButtonActive: {
    opacity: 0.7,
  },
  planButtonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  planButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.white,
  },
  // ✅ CRITICAL FIX v52.0: Less prominent cancel button (gray #6B7280 instead of red)
  cancelPlanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 12,
  },
  cancelPlanButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  socialProofSection: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  socialProofCard: {
    flex: 1,
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  socialProofTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 8,
  },
  socialProofText: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 16,
  },
  guaranteeSection: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: 20,
  },
  guaranteeTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 12,
  },
  guaranteeText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
});
