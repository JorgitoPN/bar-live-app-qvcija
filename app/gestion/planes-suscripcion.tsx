
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
  };
}

export default function PlanesSuscripcionScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { localId } = useLocalSearchParams();
  
  const [loading, setLoading] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [planes, setPlanes] = useState<Plan[]>([]);
  const [local, setLocal] = useState<Local | null>(null);

  const cargarDatos = useCallback(async () => {
    if (!localId) {
      console.error('[PlanesSuscripcion] No localId provided');
      Alert.alert('Error', 'No se especificó el local');
      setLoading(false);
      return;
    }

    try {
      console.log('[PlanesSuscripcion] Cargando datos para local:', localId);
      
      // Cargar planes disponibles
      const { data: planesData, error: planesError } = await supabase
        .from('planes_suscripcion')
        .select('*')
        .eq('activo', true)
        .order('precio_mensual', { ascending: true });

      if (planesError) {
        console.error('[PlanesSuscripcion] Error cargando planes:', planesError);
        throw planesError;
      }
      
      console.log('[PlanesSuscripcion] Planes cargados:', planesData?.length || 0);
      setPlanes(planesData || []);

      // Cargar información del local
      const { data: localData, error: localError } = await supabase
        .from('locales')
        .select('id, nombre')
        .eq('id', localId)
        .single();

      if (localError) {
        console.error('[PlanesSuscripcion] Error cargando local:', localError);
        throw localError;
      }
      
      console.log('[PlanesSuscripcion] Local cargado:', localData?.nombre);

      // Verificar si el local tiene una suscripción activa
      const { data: suscripcionData, error: suscripcionError } = await supabase
        .from('suscripciones_locales')
        .select('id, plan_id, creditos_destacados_restantes, creditos_eventos_restantes, fecha_proximo_pago')
        .eq('local_id', localId)
        .eq('estado', 'activa')
        .maybeSingle();

      if (suscripcionError && suscripcionError.code !== 'PGRST116') {
        console.error('[PlanesSuscripcion] Error cargando suscripción:', suscripcionError);
      }

      let suscripcionActual = undefined;

      if (suscripcionData) {
        // Get plan details separately
        const { data: planData, error: planError } = await supabase
          .from('planes_suscripcion')
          .select('nombre, precio_mensual')
          .eq('id', suscripcionData.plan_id)
          .single();

        if (planError) {
          console.error('[PlanesSuscripcion] Error cargando plan:', planError);
        } else {
          suscripcionActual = {
            id: suscripcionData.id,
            plan_id: suscripcionData.plan_id,
            plan_nombre: planData?.nombre || 'basico',
            plan_precio: planData?.precio_mensual || 0,
            creditos_destacados_restantes: suscripcionData.creditos_destacados_restantes || 0,
            creditos_eventos_restantes: suscripcionData.creditos_eventos_restantes || 0,
            fecha_proximo_pago: suscripcionData.fecha_proximo_pago,
          };
        }
      }

      setLocal({
        ...localData,
        suscripcion_actual: suscripcionActual,
      });

      console.log('[PlanesSuscripcion] Datos cargados exitosamente');
    } catch (error: any) {
      console.error('[PlanesSuscripcion] Error cargando datos:', error);
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
      // No current plan - activate directly
      if (plan.precio_mensual === 0) {
        procesarActivacion(plan, 'new');
      } else {
        Alert.alert(
          'Confirmar Suscripción',
          `¿Deseas activar el plan ${plan.nombre} por ${plan.precio_mensual}€/mes?`,
          [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Activar', onPress: () => procesarActivacion(plan, 'new') }
          ]
        );
      }
      return;
    }

    // Has current plan - check if upgrade or downgrade
    const currentPrice = local.suscripcion_actual.plan_precio;
    const newPrice = plan.precio_mensual;

    if (newPrice > currentPrice) {
      // UPGRADE - Immediate activation
      Alert.alert(
        'Mejorar Plan',
        `¿Deseas mejorar a ${plan.nombre} por ${newPrice}€/mes?\n\n` +
          `• El nuevo plan se activará inmediatamente\n` +
          `• Se cobrará ${newPrice}€ ahora\n` +
          `• Tus créditos se reiniciarán`,
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Mejorar Ahora', onPress: () => procesarActivacion(plan, 'upgrade') }
        ]
      );
    } else if (newPrice < currentPrice) {
      // DOWNGRADE - Check if has credits
      const hasCredits =
        local.suscripcion_actual.creditos_destacados_restantes > 0 ||
        local.suscripcion_actual.creditos_eventos_restantes > 0;

      if (hasCredits) {
        // Has credits - schedule for end of period
        Alert.alert(
          'Cambiar a Plan Inferior',
          `¿Deseas cambiar a ${plan.nombre}?\n\n` +
            `• El cambio se aplicará el ${new Date(local.suscripcion_actual.fecha_proximo_pago || '').toLocaleDateString('es-ES')}\n` +
            `• Podrás usar tus créditos actuales hasta entonces\n` +
            `• No se realizará ningún cobro hasta que se active el nuevo plan`,
          [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Programar Cambio', onPress: () => procesarActivacion(plan, 'downgrade_scheduled') }
          ]
        );
      } else {
        // No credits - activate immediately
        Alert.alert(
          'Cambiar a Plan Inferior',
          `¿Deseas cambiar a ${plan.nombre}?\n\n` +
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
    if (!user || !localId || !local) {
      Alert.alert('Error', 'Debes iniciar sesión para activar un plan');
      return;
    }

    setProcesando(true);

    try {
      console.log('[PlanesSuscripcion] Activando plan:', plan.nombre, 'tipo:', tipo);

      const now = new Date();
      const nextMonth = new Date(now);
      nextMonth.setMonth(nextMonth.getMonth() + 1);

      if (tipo === 'new') {
        // New subscription
        const { error: insertError } = await supabase
          .from('suscripciones_locales')
          .insert({
            local_id: localId,
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

        if (insertError) throw insertError;

        Alert.alert(
          '¡Éxito!',
          `Plan ${plan.nombre} activado correctamente.`,
          [{ text: 'OK', onPress: () => router.back() }]
        );
      } else if (tipo === 'upgrade') {
        // Upgrade - immediate activation with credit reset
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

        if (updateError) throw updateError;

        Alert.alert(
          '¡Plan Mejorado!',
          `Tu plan ${plan.nombre} está activo. Disfruta de todos los beneficios.`,
          [{ text: 'OK', onPress: () => router.back() }]
        );
      } else if (tipo === 'downgrade_scheduled') {
        // Downgrade scheduled for end of period
        const { error: updateError } = await supabase
          .from('suscripciones_locales')
          .update({
            plan_pendiente_id: plan.id,
            fecha_cambio_plan: local.suscripcion_actual!.fecha_proximo_pago,
            updated_at: now.toISOString(),
          })
          .eq('id', local.suscripcion_actual!.id);

        if (updateError) throw updateError;

        Alert.alert(
          'Cambio Programado',
          `El plan ${plan.nombre} se activará el ${new Date(local.suscripcion_actual!.fecha_proximo_pago || '').toLocaleDateString('es-ES')}. Hasta entonces, podrás usar tu plan actual.`,
          [{ text: 'OK', onPress: () => router.back() }]
        );
      } else if (tipo === 'downgrade_immediate') {
        // Downgrade immediate (no credits remaining)
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

        if (updateError) throw updateError;

        Alert.alert(
          'Plan Cambiado',
          `Tu plan ${plan.nombre} está activo.`,
          [{ text: 'OK', onPress: () => router.back() }]
        );
      }
    } catch (error: any) {
      console.error('[PlanesSuscripcion] Error activando plan:', error);
      Alert.alert('Error', error.message || 'No se pudo activar el plan. Intenta de nuevo.');
    } finally {
      setProcesando(false);
    }
  };

  const getPlanColor = (nombre: string): string[] => {
    switch (nombre.toLowerCase()) {
      case 'basico':
      case 'básico':
        return ['#10B981', '#059669'];
      case 'estandar':
      case 'estándar':
        return ['#3B82F6', '#2563EB'];
      case 'premium':
        return ['#F59E0B', '#D97706'];
      default:
        return [colors.primary, colors.secondary];
    }
  };

  const getPlanIcon = (nombre: string): string => {
    switch (nombre.toLowerCase()) {
      case 'basico':
      case 'básico':
        return 'checkmark.circle';
      case 'estandar':
      case 'estándar':
        return 'star.circle';
      case 'premium':
        return 'crown';
      default:
        return 'circle';
    }
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
        <IconSymbol name="exclamationmark.triangle" size={64} color={colors.textSecondary} />
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

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={[colors.headerGradientStart, colors.headerGradientEnd]}
        style={styles.header}
      >
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <IconSymbol name="chevron.left" size={24} color={colors.headerText} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Planes de Suscripción</Text>
          {local && <Text style={styles.headerSubtitle}>{local.nombre}</Text>}
        </View>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <IconSymbol name="sparkles" size={48} color={colors.primary} />
          <Text style={styles.heroTitle}>Haz Crecer Tu Negocio</Text>
          <Text style={styles.heroSubtitle}>
            Elige el plan perfecto para impulsar tu local y atraer más clientes
          </Text>
        </View>

        {/* Current Plan Info */}
        {local.suscripcion_actual && (
          <View style={styles.currentPlanBanner}>
            <IconSymbol name="info.circle.fill" size={20} color={colors.primary} />
            <Text style={styles.currentPlanText}>
              Plan actual: <Text style={styles.currentPlanName}>{local.suscripcion_actual.plan_nombre.toUpperCase()}</Text>
            </Text>
          </View>
        )}

        {/* Plans */}
        <View style={styles.plansContainer}>
          {planes.map((plan) => {
            const isActive = planActual === plan.id;
            const isPremium = plan.nombre.toLowerCase() === 'premium';
            const planColors = getPlanColor(plan.nombre);

            return (
              <View 
                key={plan.id} 
                style={[
                  styles.planCard,
                  isPremium && styles.planCardPremium,
                  isActive && styles.planCardActive,
                ]}
              >
                {isPremium && (
                  <View style={styles.popularBadge}>
                    <Text style={styles.popularBadgeText}>MÁS POPULAR</Text>
                  </View>
                )}

                {isActive && (
                  <View style={styles.activeBadge}>
                    <IconSymbol name="checkmark.circle.fill" size={16} color={colors.white} />
                    <Text style={styles.activeBadgeText}>Plan Actual</Text>
                  </View>
                )}

                <LinearGradient
                  colors={planColors}
                  style={styles.planHeader}
                >
                  <IconSymbol 
                    name={getPlanIcon(plan.nombre) as any} 
                    size={40} 
                    color={colors.white} 
                  />
                  <Text style={styles.planNombre}>{plan.nombre}</Text>
                  <View style={styles.planPrecio}>
                    <Text style={styles.planPrecioNumero}>
                      {plan.precio_mensual === 0 ? 'Gratis' : `${plan.precio_mensual}€`}
                    </Text>
                    {plan.precio_mensual > 0 && (
                      <Text style={styles.planPrecioTexto}>/mes</Text>
                    )}
                  </View>
                </LinearGradient>

                <View style={styles.planBody}>
                  <Text style={styles.planDescripcion}>{plan.descripcion}</Text>

                  <View style={styles.planFeatures}>
                    <View style={styles.featureItem}>
                      <IconSymbol 
                        name={plan.eventos_mes > 0 ? 'checkmark.circle.fill' : 'xmark.circle.fill'} 
                        size={20} 
                        color={plan.eventos_mes > 0 ? colors.primary : colors.textSecondary} 
                      />
                      <Text style={styles.featureText}>
                        {plan.eventos_mes > 0 ? `${plan.eventos_mes} eventos/mes` : 'Sin eventos'}
                      </Text>
                    </View>

                    <View style={styles.featureItem}>
                      <IconSymbol 
                        name={plan.promos_destacadas > 0 ? 'checkmark.circle.fill' : 'xmark.circle.fill'} 
                        size={20} 
                        color={plan.promos_destacadas > 0 ? colors.primary : colors.textSecondary} 
                      />
                      <Text style={styles.featureText}>
                        {plan.promos_destacadas > 0 ? `${plan.promos_destacadas} promos destacadas` : 'Sin promos'}
                      </Text>
                    </View>

                    <View style={styles.featureItem}>
                      <IconSymbol 
                        name={plan.perfil_social ? 'checkmark.circle.fill' : 'xmark.circle.fill'} 
                        size={20} 
                        color={plan.perfil_social ? colors.primary : colors.textSecondary} 
                      />
                      <Text style={styles.featureText}>Perfil social</Text>
                    </View>

                    <View style={styles.featureItem}>
                      <IconSymbol 
                        name={plan.panel_analisis ? 'checkmark.circle.fill' : 'xmark.circle.fill'} 
                        size={20} 
                        color={plan.panel_analisis ? colors.primary : colors.textSecondary} 
                      />
                      <Text style={styles.featureText}>Panel de análisis</Text>
                    </View>

                    <View style={styles.featureItem}>
                      <IconSymbol 
                        name={plan.soporte_prioritario ? 'checkmark.circle.fill' : 'xmark.circle.fill'} 
                        size={20} 
                        color={plan.soporte_prioritario ? colors.primary : colors.textSecondary} 
                      />
                      <Text style={styles.featureText}>Soporte prioritario</Text>
                    </View>

                    {plan.visibilidad_maxima && (
                      <View style={styles.featureItem}>
                        <IconSymbol name="star.fill" size={20} color={colors.badgeDestacado} />
                        <Text style={[styles.featureText, { fontWeight: '700' }]}>
                          Visibilidad máxima
                        </Text>
                      </View>
                    )}
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
                      colors={isActive ? ['#6B7280', '#4B5563'] : planColors}
                      style={styles.planButtonGradient}
                    >
                      {procesando ? (
                        <ActivityIndicator color={colors.white} />
                      ) : (
                        <Text style={styles.planButtonText}>
                          {isActive ? 'Plan Actual' : 'Seleccionar Plan'}
                        </Text>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </View>

        {/* Plan Change Rules */}
        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>Reglas de Cambio de Plan</Text>
          
          <View style={styles.infoCard}>
            <View style={styles.infoHeader}>
              <IconSymbol name="arrow.up.circle.fill" size={24} color="#10B981" />
              <Text style={styles.infoCardTitle}>Mejora de Plan</Text>
            </View>
            <Text style={styles.infoText}>
              - El nuevo plan se activa inmediatamente{'\n'}
              - Se cobra en ese momento{'\n'}
              - Los créditos se reinician para acceso completo
            </Text>
          </View>

          <View style={styles.infoCard}>
            <View style={styles.infoHeader}>
              <IconSymbol name="arrow.down.circle.fill" size={24} color="#F59E0B" />
              <Text style={styles.infoCardTitle}>Cambio a Plan Inferior</Text>
            </View>
            <Text style={styles.infoText}>
              - Se activa al finalizar el periodo actual{'\n'}
              - Excepción: si no quedan créditos, se activa inmediatamente{'\n'}
              - No se cobra hasta que el plan nuevo se active
            </Text>
          </View>
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
  plansContainer: {
    gap: 20,
    marginBottom: 32,
  },
  planCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.cardBorder,
    overflow: 'hidden',
  },
  planCardPremium: {
    borderColor: colors.badgeDestacado,
    borderWidth: 3,
  },
  planCardActive: {
    borderColor: colors.primary,
  },
  popularBadge: {
    backgroundColor: colors.badgeDestacado,
    paddingVertical: 8,
    alignItems: 'center',
  },
  popularBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.badgeDestacadoText,
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
    textTransform: 'capitalize',
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
  planBody: {
    padding: 24,
  },
  planDescripcion: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
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
  infoSection: {
    marginBottom: 20,
  },
  infoTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 16,
  },
  infoCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  infoCardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
  },
  infoText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 22,
  },
});
