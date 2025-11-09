
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
  suscripcion_actual?: string;
}

export default function PlanesSuscripcionScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { localId } = useLocalSearchParams();
  
  const [loading, setLoading] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [planes, setPlanes] = useState<Plan[]>([]);
  const [local, setLocal] = useState<Local | null>(null);
  const [planActual, setPlanActual] = useState<string | null>(null);

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
      setLocal(localData);

      // Verificar si el local tiene una suscripción activa
      const { data: suscripcionData, error: suscripcionError } = await supabase
        .from('suscripciones_locales')
        .select('plan_id, planes_suscripcion(nombre)')
        .eq('local_id', localId)
        .eq('estado', 'activa')
        .maybeSingle();

      if (suscripcionError && suscripcionError.code !== 'PGRST116') {
        console.error('[PlanesSuscripcion] Error cargando suscripción:', suscripcionError);
      }

      if (suscripcionData) {
        console.log('[PlanesSuscripcion] Suscripción activa encontrada:', suscripcionData.plan_id);
        setPlanActual(suscripcionData.plan_id);
      } else {
        console.log('[PlanesSuscripcion] No hay suscripción activa');
      }

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
    if (plan.precio_mensual === 0) {
      // Plan básico gratuito
      procesarActivacion(plan);
    } else {
      // Plan de pago - mostrar confirmación
      Alert.alert(
        'Confirmar Suscripción',
        `¿Deseas activar el plan ${plan.nombre} por ${plan.precio_mensual}€/mes?`,
        [
          { text: 'Cancelar', style: 'cancel' },
          { 
            text: 'Activar', 
            onPress: () => procesarActivacion(plan)
          }
        ]
      );
    }
  };

  const procesarActivacion = async (plan: Plan) => {
    if (!user || !localId) {
      Alert.alert('Error', 'Debes iniciar sesión para activar un plan');
      return;
    }

    setProcesando(true);

    try {
      console.log('[PlanesSuscripcion] Activando plan:', plan.nombre);

      // Check if there's an existing subscription
      const { data: existingSub, error: checkError } = await supabase
        .from('suscripciones_locales')
        .select('id')
        .eq('local_id', localId)
        .maybeSingle();

      if (checkError && checkError.code !== 'PGRST116') {
        console.error('[PlanesSuscripcion] Error checking subscription:', checkError);
        throw checkError;
      }

      if (existingSub) {
        // Update existing subscription
        const { error: updateError } = await supabase
          .from('suscripciones_locales')
          .update({
            plan_id: plan.id,
            estado: 'activa',
            fecha_inicio: new Date().toISOString(),
            eventos_usados_mes: 0,
            promos_usadas_mes: 0,
            ultimo_reset_contador: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingSub.id);

        if (updateError) {
          console.error('[PlanesSuscripcion] Error updating subscription:', updateError);
          throw updateError;
        }
        
        console.log('[PlanesSuscripcion] Suscripción actualizada');
      } else {
        // Create new subscription
        const { error: insertError } = await supabase
          .from('suscripciones_locales')
          .insert({
            local_id: localId,
            propietario_id: user.id,
            plan_id: plan.id,
            estado: 'activa',
            fecha_inicio: new Date().toISOString(),
            eventos_usados_mes: 0,
            promos_usadas_mes: 0,
            ultimo_reset_contador: new Date().toISOString(),
          });

        if (insertError) {
          console.error('[PlanesSuscripcion] Error creating subscription:', insertError);
          throw insertError;
        }
        
        console.log('[PlanesSuscripcion] Suscripción creada');
      }

      Alert.alert(
        '¡Éxito!',
        `Plan ${plan.nombre} activado correctamente. Ahora puedes crear eventos y promociones para tu local.`,
        [
          { text: 'OK', onPress: () => router.back() }
        ]
      );
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
        return ['#10B981', '#059669']; // Green
      case 'estandar':
      case 'estándar':
        return ['#3B82F6', '#2563EB']; // Blue
      case 'premium':
        return ['#F59E0B', '#D97706']; // Amber
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

        {/* Benefits Banner */}
        <View style={styles.benefitsBanner}>
          <View style={styles.benefitItem}>
            <IconSymbol name="checkmark.circle.fill" size={20} color={colors.primary} />
            <Text style={styles.benefitText}>Sin permanencia</Text>
          </View>
          <View style={styles.benefitItem}>
            <IconSymbol name="checkmark.circle.fill" size={20} color={colors.primary} />
            <Text style={styles.benefitText}>Cancela cuando quieras</Text>
          </View>
          <View style={styles.benefitItem}>
            <IconSymbol name="checkmark.circle.fill" size={20} color={colors.primary} />
            <Text style={styles.benefitText}>Soporte prioritario</Text>
          </View>
        </View>

        {/* Plans */}
        <View style={styles.plansContainer}>
          {planes.map((plan, index) => {
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

        {/* Testimonials */}
        <View style={styles.testimonialsSection}>
          <Text style={styles.sectionTitle}>Lo Que Dicen Nuestros Clientes</Text>
          
          <View style={styles.testimonialCard}>
            <View style={styles.testimonialHeader}>
              <View style={styles.testimonialAvatar}>
                <Text style={styles.testimonialAvatarText}>JM</Text>
              </View>
              <View>
                <Text style={styles.testimonialName}>José María</Text>
                <Text style={styles.testimonialRole}>Propietario</Text>
              </View>
            </View>
            <Text style={styles.testimonialText}>
              "Desde que activé el plan Premium, mis reservas han crecido notablemente. ¡Totalmente recomendable!"
            </Text>
          </View>

          <View style={styles.testimonialCard}>
            <View style={styles.testimonialHeader}>
              <View style={styles.testimonialAvatar}>
                <Text style={styles.testimonialAvatarText}>AL</Text>
              </View>
              <View>
                <Text style={styles.testimonialName}>Ana López</Text>
                <Text style={styles.testimonialRole}>Propietaria</Text>
              </View>
            </View>
            <Text style={styles.testimonialText}>
              "El panel de análisis me ayuda a entender mejor qué promociones funcionan. Muy útil."
            </Text>
          </View>
        </View>

        {/* FAQ */}
        <View style={styles.faqSection}>
          <Text style={styles.sectionTitle}>Preguntas Frecuentes</Text>
          
          <View style={styles.faqItem}>
            <Text style={styles.faqQuestion}>¿Puedo cambiar de plan en cualquier momento?</Text>
            <Text style={styles.faqAnswer}>
              Sí, puedes cambiar de plan cuando quieras. Los cambios se aplicarán inmediatamente.
            </Text>
          </View>

          <View style={styles.faqItem}>
            <Text style={styles.faqQuestion}>¿Hay permanencia?</Text>
            <Text style={styles.faqAnswer}>
              No, no hay permanencia. Puedes cancelar tu suscripción en cualquier momento.
            </Text>
          </View>

          <View style={styles.faqItem}>
            <Text style={styles.faqQuestion}>¿Qué pasa si cancelo mi suscripción?</Text>
            <Text style={styles.faqAnswer}>
              Tu plan seguirá activo hasta el final del período de facturación actual. Después, volverás al plan básico gratuito.
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
    marginBottom: 32,
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
  benefitsBanner: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 32,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  benefitText: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '600',
  },
  plansContainer: {
    gap: 20,
    marginBottom: 40,
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
  testimonialsSection: {
    marginBottom: 40,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 20,
    textAlign: 'center',
  },
  testimonialCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  testimonialHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  testimonialAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  testimonialAvatarText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.white,
  },
  testimonialName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
  },
  testimonialRole: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  testimonialText: {
    fontSize: 15,
    color: colors.text,
    lineHeight: 22,
    fontStyle: 'italic',
  },
  faqSection: {
    marginBottom: 20,
  },
  faqItem: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  faqQuestion: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  faqAnswer: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
});
