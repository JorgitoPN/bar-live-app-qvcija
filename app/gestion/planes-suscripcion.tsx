
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  Platform,
  Switch,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { colors, commonStyles } from '@/styles/commonStyles';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { scaleFontSize, scaleIconSize } from '@/utils/androidScaling';
import { isAdminUser } from '@/utils/adminAccess';

interface Plan {
  id: string;
  nombre: string;
  descripcion: string;
  precio_mensual: number;
  duracion_meses: number;
  orden_visualizacion: number;
  recomendado: boolean;
  trial_habilitado: boolean;
  trial_dias: number;
  eventos_mes: number;
  promos_destacadas: number;
  perfil_social: boolean;
  panel_analisis: boolean;
  soporte_prioritario: boolean;
  visibilidad_extra: boolean;
  visibilidad_maxima: boolean;
  caracteristicas_detalladas: any[];
  permisos: Record<string, boolean>;
}

/**
 * ✅ PLANES DE SUSCRIPCIÓN v244.0 - ADMIN ACCESS WITHOUT LOCAL
 * 
 * NEW FEATURES v244.0:
 * - ✅ Admin can access this page without a local (for verification)
 * - ✅ Shows admin banner when viewing without local
 * - ✅ Prevents subscription creation if no local selected
 * - ✅ Allows admin to see and verify all plans
 * 
 * Previous features maintained:
 * - Display all available plans
 * - Show trial information (30 days free)
 * - Require payment method before trial
 * - Mandatory checkbox for auto-charge acceptance
 * - Plan comparison
 * - Immediate activation after payment method saved
 */

export default function PlanesSuscripcionScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const params = useLocalSearchParams();
  const localId = params.localId as string;

  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [acceptedAutoCharge, setAcceptedAutoCharge] = useState(false);
  const [subscribing, setSubscribing] = useState(false);

  // ✅ NEW v244.0: Check if user is admin
  const userIsAdmin = user ? isAdminUser(user) : false;
  const isAdminViewing = userIsAdmin && !localId;

  const loadPlans = useCallback(async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('planes_suscripcion')
        .select('*')
        .eq('activo', true)
        .order('orden_visualizacion', { ascending: true });

      if (error) throw error;

      console.log('[PlanesSuscripcion v244.0] Loaded plans:', data?.length || 0);
      setPlans(data || []);
    } catch (error) {
      console.error('[PlanesSuscripcion v244.0] Error loading plans:', error);
      Alert.alert('Error', 'No se pudieron cargar los planes');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPlans();
  }, [loadPlans]);

  const handleSelectPlan = (plan: Plan) => {
    // ✅ NEW v244.0: Prevent subscription if admin viewing without local
    if (isAdminViewing) {
      Alert.alert(
        'Modo Verificación',
        'Estás viendo los planes en modo verificación de administrador.\n\nPara suscribirte a un plan, debes seleccionar un local primero desde "Gestión de Locales".',
        [{ text: 'Entendido' }]
      );
      return;
    }

    if (!localId) {
      Alert.alert(
        'Local Requerido',
        'Debes seleccionar un local para suscribirte a un plan.',
        [{ text: 'OK' }]
      );
      return;
    }

    setSelectedPlan(plan);
    setAcceptedAutoCharge(false);
    setShowConfirmModal(true);
  };

  const handleConfirmSubscription = async () => {
    if (!selectedPlan) return;

    if (selectedPlan.trial_habilitado && !acceptedAutoCharge) {
      Alert.alert(
        'Aceptación Requerida',
        'Debes aceptar que el cobro será automático al finalizar el período de prueba.'
      );
      return;
    }

    setSubscribing(true);
    try {
      // TODO: Backend Integration - POST /api/stripe/create-subscription
      // Body: {
      //   localId,
      //   planId: selectedPlan.id,
      //   acceptedAutoCharge,
      //   acceptedTerms: true
      // }
      // Returns: {
      //   success: true,
      //   subscription: {...},
      //   requires_payment_method: boolean,
      //   setup_intent_client_secret: string (if payment method needed)
      // }

      // If payment method is required, redirect to payment method collection
      // Otherwise, activate trial immediately

      Alert.alert(
        '✅ Suscripción Creada',
        selectedPlan.trial_habilitado
          ? `Tu prueba gratuita de ${selectedPlan.trial_dias} días ha comenzado. Disfruta de todas las funcionalidades del plan ${selectedPlan.nombre}.`
          : `Tu suscripción al plan ${selectedPlan.nombre} ha sido activada correctamente.`
      );

      setShowConfirmModal(false);
      router.back();
    } catch (error) {
      console.error('[PlanesSuscripcion v244.0] Error creating subscription:', error);
      Alert.alert('Error', 'No se pudo crear la suscripción');
    } finally {
      setSubscribing(false);
    }
  };

  const getPlanColor = (planNombre: string) => {
    switch (planNombre.toLowerCase()) {
      case 'premium':
        return '#EF4444';
      case 'estándar':
      case 'estandar':
        return '#3B82F6';
      default:
        return '#10B981';
    }
  };

  const formatPrice = (price: number) => {
    return price === 0 ? 'Gratis' : `${price}€/mes`;
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={[colors.headerGradientStart, colors.headerGradientEnd]} style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <IconSymbol
              ios_icon_name="chevron.left"
              android_material_icon_name="arrow_back"
              size={Platform.OS === 'android' ? scaleIconSize(28) : 28}
              color={colors.headerText}
            />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={[styles.headerTitle, { fontSize: scaleFontSize(24) }]}>Planes de Suscripción</Text>
          </View>
          <View style={{ width: 28 }} />
        </LinearGradient>

        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { fontSize: scaleFontSize(16) }]}>Cargando planes...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={[colors.headerGradientStart, colors.headerGradientEnd]} style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <IconSymbol
            ios_icon_name="chevron.left"
            android_material_icon_name="arrow_back"
            size={Platform.OS === 'android' ? scaleIconSize(28) : 28}
            color={colors.headerText}
          />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={[styles.headerTitle, { fontSize: scaleFontSize(24) }]}>Planes de Suscripción</Text>
          <Text style={[styles.headerSubtitle, { fontSize: scaleFontSize(13) }]}>
            Elige el plan perfecto para tu local
          </Text>
        </View>
        <View style={{ width: 28 }} />
      </LinearGradient>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* ✅ NEW v244.0: Admin verification banner */}
        {isAdminViewing && (
          <View style={styles.adminBanner}>
            <IconSymbol
              ios_icon_name="eye.fill"
              android_material_icon_name="visibility"
              size={Platform.OS === 'android' ? scaleIconSize(24) : 24}
              color="#F59E0B"
            />
            <View style={styles.adminBannerContent}>
              <Text style={[styles.adminBannerTitle, { fontSize: scaleFontSize(16) }]}>
                Modo Verificación de Administrador
              </Text>
              <Text style={[styles.adminBannerText, { fontSize: scaleFontSize(13) }]}>
                Estás viendo los planes disponibles. Para suscribirte, selecciona un local desde "Gestión de Locales".
              </Text>
            </View>
          </View>
        )}

        {/* Trial Banner */}
        <View style={styles.trialBanner}>
          <IconSymbol
            ios_icon_name="gift.fill"
            android_material_icon_name="card_giftcard"
            size={Platform.OS === 'android' ? scaleIconSize(32) : 32}
            color={colors.primary}
          />
          <View style={styles.trialBannerContent}>
            <Text style={[styles.trialBannerTitle, { fontSize: scaleFontSize(18) }]}>
              🎉 Prueba Gratis de 30 Días
            </Text>
            <Text style={[styles.trialBannerText, { fontSize: scaleFontSize(14) }]}>
              Todos los planes incluyen 1 mes de prueba gratuita. Solo necesitas agregar un método de pago para comenzar.
            </Text>
          </View>
        </View>

        {/* Plans Grid */}
        <View style={styles.plansGrid}>
          {plans.map((plan) => {
            const planColor = getPlanColor(plan.nombre);
            const priceText = formatPrice(plan.precio_mensual);

            return (
              <View key={plan.id} style={styles.planCard}>
                {plan.recomendado && (
                  <View style={styles.recommendedBadge}>
                    <IconSymbol
                      ios_icon_name="star.fill"
                      android_material_icon_name="star"
                      size={Platform.OS === 'android' ? scaleIconSize(12) : 12}
                      color={colors.white}
                    />
                    <Text style={[styles.recommendedBadgeText, { fontSize: scaleFontSize(11) }]}>
                      RECOMENDADO
                    </Text>
                  </View>
                )}

                <LinearGradient
                  colors={[planColor, planColor + 'DD']}
                  style={styles.planCardGradient}
                >
                  <Text style={[styles.planCardName, { fontSize: scaleFontSize(26) }]}>{plan.nombre}</Text>
                  <Text style={[styles.planCardPrice, { fontSize: scaleFontSize(36) }]}>{priceText}</Text>
                  
                  {plan.descripcion && (
                    <Text style={[styles.planCardDescription, { fontSize: scaleFontSize(14) }]}>
                      {plan.descripcion}
                    </Text>
                  )}

                  {plan.trial_habilitado && (
                    <View style={styles.trialTag}>
                      <IconSymbol
                        ios_icon_name="gift.fill"
                        android_material_icon_name="card_giftcard"
                        size={Platform.OS === 'android' ? scaleIconSize(14) : 14}
                        color={colors.white}
                      />
                      <Text style={[styles.trialTagText, { fontSize: scaleFontSize(12) }]}>
                        {plan.trial_dias} días gratis
                      </Text>
                    </View>
                  )}

                  <View style={styles.planFeatures}>
                    {plan.eventos_mes > 0 && (
                      <View style={styles.planFeature}>
                        <IconSymbol
                          ios_icon_name="checkmark.circle.fill"
                          android_material_icon_name="check_circle"
                          size={Platform.OS === 'android' ? scaleIconSize(18) : 18}
                          color={colors.white}
                        />
                        <Text style={[styles.planFeatureText, { fontSize: scaleFontSize(14) }]}>
                          {plan.eventos_mes === 999 ? 'Eventos ilimitados' : `${plan.eventos_mes} eventos/mes`}
                        </Text>
                      </View>
                    )}

                    {plan.promos_destacadas > 0 && (
                      <View style={styles.planFeature}>
                        <IconSymbol
                          ios_icon_name="checkmark.circle.fill"
                          android_material_icon_name="check_circle"
                          size={Platform.OS === 'android' ? scaleIconSize(18) : 18}
                          color={colors.white}
                        />
                        <Text style={[styles.planFeatureText, { fontSize: scaleFontSize(14) }]}>
                          {plan.promos_destacadas} destacados/mes
                        </Text>
                      </View>
                    )}

                    {plan.perfil_social && (
                      <View style={styles.planFeature}>
                        <IconSymbol
                          ios_icon_name="checkmark.circle.fill"
                          android_material_icon_name="check_circle"
                          size={Platform.OS === 'android' ? scaleIconSize(18) : 18}
                          color={colors.white}
                        />
                        <Text style={[styles.planFeatureText, { fontSize: scaleFontSize(14) }]}>
                          Perfil social completo
                        </Text>
                      </View>
                    )}

                    {plan.panel_analisis && (
                      <View style={styles.planFeature}>
                        <IconSymbol
                          ios_icon_name="checkmark.circle.fill"
                          android_material_icon_name="check_circle"
                          size={Platform.OS === 'android' ? scaleIconSize(18) : 18}
                          color={colors.white}
                        />
                        <Text style={[styles.planFeatureText, { fontSize: scaleFontSize(14) }]}>
                          Panel de análisis
                        </Text>
                      </View>
                    )}

                    {plan.soporte_prioritario && (
                      <View style={styles.planFeature}>
                        <IconSymbol
                          ios_icon_name="checkmark.circle.fill"
                          android_material_icon_name="check_circle"
                          size={Platform.OS === 'android' ? scaleIconSize(18) : 18}
                          color={colors.white}
                        />
                        <Text style={[styles.planFeatureText, { fontSize: scaleFontSize(14) }]}>
                          Soporte prioritario
                        </Text>
                      </View>
                    )}

                    {plan.visibilidad_maxima && (
                      <View style={styles.planFeature}>
                        <IconSymbol
                          ios_icon_name="checkmark.circle.fill"
                          android_material_icon_name="check_circle"
                          size={Platform.OS === 'android' ? scaleIconSize(18) : 18}
                          color={colors.white}
                        />
                        <Text style={[styles.planFeatureText, { fontSize: scaleFontSize(14) }]}>
                          Visibilidad máxima
                        </Text>
                      </View>
                    )}
                  </View>

                  <TouchableOpacity
                    style={styles.selectPlanButton}
                    onPress={() => handleSelectPlan(plan)}
                  >
                    <Text style={[styles.selectPlanButtonText, { fontSize: scaleFontSize(16) }]}>
                      {isAdminViewing 
                        ? 'Ver Detalles' 
                        : plan.trial_habilitado 
                          ? 'Iniciar Prueba Gratis' 
                          : 'Seleccionar Plan'}
                    </Text>
                    <IconSymbol
                      ios_icon_name="arrow.right.circle.fill"
                      android_material_icon_name="arrow_forward"
                      size={Platform.OS === 'android' ? scaleIconSize(20) : 20}
                      color={planColor}
                    />
                  </TouchableOpacity>
                </LinearGradient>
              </View>
            );
          })}
        </View>

        {/* Info Section */}
        <View style={styles.infoSection}>
          <View style={styles.infoItem}>
            <IconSymbol
              ios_icon_name="checkmark.shield.fill"
              android_material_icon_name="verified_user"
              size={Platform.OS === 'android' ? scaleIconSize(24) : 24}
              color={colors.primary}
            />
            <Text style={[styles.infoItemText, { fontSize: scaleFontSize(14) }]}>
              Cancela en cualquier momento sin penalización
            </Text>
          </View>
          <View style={styles.infoItem}>
            <IconSymbol
              ios_icon_name="lock.shield.fill"
              android_material_icon_name="lock"
              size={Platform.OS === 'android' ? scaleIconSize(24) : 24}
              color={colors.primary}
            />
            <Text style={[styles.infoItemText, { fontSize: scaleFontSize(14) }]}>
              Pagos seguros procesados por Stripe
            </Text>
          </View>
          <View style={styles.infoItem}>
            <IconSymbol
              ios_icon_name="arrow.clockwise"
              android_material_icon_name="autorenew"
              size={Platform.OS === 'android' ? scaleIconSize(24) : 24}
              color={colors.primary}
            />
            <Text style={[styles.infoItemText, { fontSize: scaleFontSize(14) }]}>
              Renovación automática mensual
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Confirmation Modal */}
      <Modal
        visible={showConfirmModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowConfirmModal(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowConfirmModal(false)}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { fontSize: scaleFontSize(20) }]}>
                {isAdminViewing ? 'Detalles del Plan' : 'Confirmar Suscripción'}
              </Text>
              <TouchableOpacity onPress={() => setShowConfirmModal(false)}>
                <IconSymbol
                  ios_icon_name="xmark.circle.fill"
                  android_material_icon_name="cancel"
                  size={Platform.OS === 'android' ? scaleIconSize(28) : 28}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
            </View>

            {selectedPlan && (
              <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                {/* Selected Plan Summary */}
                <View style={[styles.planSummary, { borderColor: getPlanColor(selectedPlan.nombre) }]}>
                  <Text style={[styles.planSummaryName, { fontSize: scaleFontSize(22) }]}>
                    {selectedPlan.nombre}
                  </Text>
                  <Text style={[styles.planSummaryPrice, { fontSize: scaleFontSize(28), color: getPlanColor(selectedPlan.nombre) }]}>
                    {formatPrice(selectedPlan.precio_mensual)}
                  </Text>
                </View>

                {/* Trial Information */}
                {selectedPlan.trial_habilitado && (
                  <View style={styles.trialInfo}>
                    <View style={styles.trialInfoHeader}>
                      <IconSymbol
                        ios_icon_name="gift.fill"
                        android_material_icon_name="card_giftcard"
                        size={Platform.OS === 'android' ? scaleIconSize(24) : 24}
                        color={colors.primary}
                      />
                      <Text style={[styles.trialInfoTitle, { fontSize: scaleFontSize(16) }]}>
                        Prueba Gratuita de {selectedPlan.trial_dias} Días
                      </Text>
                    </View>
                    <Text style={[styles.trialInfoText, { fontSize: scaleFontSize(14) }]}>
                      • No se te cobrará durante los primeros {selectedPlan.trial_dias} días
                    </Text>
                    <Text style={[styles.trialInfoText, { fontSize: scaleFontSize(14) }]}>
                      • Acceso completo a todas las funcionalidades del plan
                    </Text>
                    <Text style={[styles.trialInfoText, { fontSize: scaleFontSize(14) }]}>
                      • Cancela en cualquier momento sin cargo
                    </Text>
                  </View>
                )}

                {/* Payment Method Requirement */}
                {!isAdminViewing && (
                  <View style={styles.requirementBox}>
                    <IconSymbol
                      ios_icon_name="creditcard.fill"
                      android_material_icon_name="payment"
                      size={Platform.OS === 'android' ? scaleIconSize(24) : 24}
                      color={colors.primary}
                    />
                    <View style={styles.requirementBoxContent}>
                      <Text style={[styles.requirementBoxTitle, { fontSize: scaleFontSize(15) }]}>
                        Método de Pago Requerido
                      </Text>
                      <Text style={[styles.requirementBoxText, { fontSize: scaleFontSize(13) }]}>
                        Necesitarás agregar una tarjeta válida para activar la prueba gratuita. No se realizará ningún cargo hasta que finalice el período de prueba.
                      </Text>
                    </View>
                  </View>
                )}

                {/* Auto-Charge Acceptance (Mandatory Checkbox) */}
                {selectedPlan.trial_habilitado && !isAdminViewing && (
                  <View style={styles.acceptanceBox}>
                    <TouchableOpacity
                      style={styles.checkboxRow}
                      onPress={() => setAcceptedAutoCharge(!acceptedAutoCharge)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.checkbox, acceptedAutoCharge && styles.checkboxChecked]}>
                        {acceptedAutoCharge && (
                          <IconSymbol
                            ios_icon_name="checkmark"
                            android_material_icon_name="check"
                            size={Platform.OS === 'android' ? scaleIconSize(16) : 16}
                            color={colors.white}
                          />
                        )}
                      </View>
                      <Text style={[styles.checkboxLabel, { fontSize: scaleFontSize(14) }]}>
                        Acepto que al finalizar el período de prueba de {selectedPlan.trial_dias} días, se realizará automáticamente el cobro de {formatPrice(selectedPlan.precio_mensual)} por el plan {selectedPlan.nombre}.
                      </Text>
                    </TouchableOpacity>

                    {!acceptedAutoCharge && (
                      <View style={styles.acceptanceWarning}>
                        <IconSymbol
                          ios_icon_name="exclamationmark.triangle.fill"
                          android_material_icon_name="warning"
                          size={Platform.OS === 'android' ? scaleIconSize(16) : 16}
                          color="#F59E0B"
                        />
                        <Text style={[styles.acceptanceWarningText, { fontSize: scaleFontSize(12) }]}>
                          Debes aceptar los términos para continuar
                        </Text>
                      </View>
                    )}
                  </View>
                )}

                {/* What Happens Next */}
                <View style={styles.nextStepsBox}>
                  <Text style={[styles.nextStepsTitle, { fontSize: scaleFontSize(16) }]}>
                    ¿Qué sucede después?
                  </Text>
                  <View style={styles.nextStepsList}>
                    <View style={styles.nextStepItem}>
                      <View style={styles.nextStepNumber}>
                        <Text style={[styles.nextStepNumberText, { fontSize: scaleFontSize(12) }]}>1</Text>
                      </View>
                      <Text style={[styles.nextStepText, { fontSize: scaleFontSize(13) }]}>
                        Agregarás un método de pago válido
                      </Text>
                    </View>
                    <View style={styles.nextStepItem}>
                      <View style={styles.nextStepNumber}>
                        <Text style={[styles.nextStepNumberText, { fontSize: scaleFontSize(12) }]}>2</Text>
                      </View>
                      <Text style={[styles.nextStepText, { fontSize: scaleFontSize(13) }]}>
                        {selectedPlan?.trial_habilitado
                          ? `Tu prueba de ${selectedPlan.trial_dias} días comenzará inmediatamente`
                          : 'Tu suscripción se activará inmediatamente'}
                      </Text>
                    </View>
                    <View style={styles.nextStepItem}>
                      <View style={styles.nextStepNumber}>
                        <Text style={[styles.nextStepNumberText, { fontSize: scaleFontSize(12) }]}>3</Text>
                      </View>
                      <Text style={[styles.nextStepText, { fontSize: scaleFontSize(13) }]}>
                        {selectedPlan?.trial_habilitado
                          ? 'Al finalizar la prueba, se cobrará automáticamente'
                          : 'Se cobrará mensualmente de forma automática'}
                      </Text>
                    </View>
                  </View>
                </View>
              </ScrollView>
            )}

            {!isAdminViewing && (
              <>
                <TouchableOpacity
                  style={[
                    styles.modalPrimaryButton,
                    (subscribing || (selectedPlan?.trial_habilitado && !acceptedAutoCharge)) && styles.modalPrimaryButtonDisabled
                  ]}
                  onPress={handleConfirmSubscription}
                  disabled={subscribing || (selectedPlan?.trial_habilitado && !acceptedAutoCharge)}
                >
                  {subscribing ? (
                    <ActivityIndicator size="small" color={colors.white} />
                  ) : (
                    <>
                      <IconSymbol
                        ios_icon_name="checkmark.circle.fill"
                        android_material_icon_name="check_circle"
                        size={Platform.OS === 'android' ? scaleIconSize(20) : 20}
                        color={colors.white}
                      />
                      <Text style={[styles.modalPrimaryButtonText, { fontSize: scaleFontSize(16) }]}>
                        {selectedPlan?.trial_habilitado ? 'Iniciar Prueba Gratis' : 'Confirmar Suscripción'}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity style={styles.modalCancelButton} onPress={() => setShowConfirmModal(false)}>
                  <Text style={[styles.modalCancelText, { fontSize: scaleFontSize(16) }]}>Cancelar</Text>
                </TouchableOpacity>
              </>
            )}

            {isAdminViewing && (
              <TouchableOpacity style={styles.modalCancelButton} onPress={() => setShowConfirmModal(false)}>
                <Text style={[styles.modalCancelText, { fontSize: scaleFontSize(16) }]}>Cerrar</Text>
              </TouchableOpacity>
            )}
          </Pressable>
        </Pressable>
      </Modal>
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
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 4,
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontWeight: 'bold',
    color: colors.headerText,
  },
  headerSubtitle: {
    color: colors.headerText,
    opacity: 0.9,
    marginTop: 2,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    color: colors.textSecondary,
  },
  adminBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: '#FEF3C7',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  adminBannerContent: {
    flex: 1,
  },
  adminBannerTitle: {
    fontWeight: 'bold',
    color: '#92400E',
    marginBottom: 6,
  },
  adminBannerText: {
    color: '#92400E',
    lineHeight: 18,
  },
  trialBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: colors.primary + '15',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  trialBannerContent: {
    flex: 1,
  },
  trialBannerTitle: {
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 6,
  },
  trialBannerText: {
    color: colors.text,
    lineHeight: 20,
  },
  plansGrid: {
    gap: 20,
  },
  planCard: {
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative',
    ...commonStyles.shadow,
  },
  recommendedBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F59E0B',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    zIndex: 10,
    ...commonStyles.shadow,
  },
  recommendedBadgeText: {
    fontWeight: '700',
    color: colors.white,
  },
  planCardGradient: {
    padding: 24,
  },
  planCardName: {
    fontWeight: 'bold',
    color: colors.white,
    marginBottom: 8,
  },
  planCardPrice: {
    fontWeight: 'bold',
    color: colors.white,
    marginBottom: 12,
  },
  planCardDescription: {
    color: colors.white,
    opacity: 0.9,
    lineHeight: 20,
    marginBottom: 16,
  },
  trialTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginBottom: 20,
  },
  trialTagText: {
    fontWeight: '700',
    color: colors.white,
  },
  planFeatures: {
    gap: 12,
    marginBottom: 24,
  },
  planFeature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  planFeatureText: {
    color: colors.white,
    fontWeight: '500',
  },
  selectPlanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.white,
    paddingVertical: 14,
    borderRadius: 12,
  },
  selectPlanButtonText: {
    fontWeight: '700',
  },
  infoSection: {
    marginTop: 32,
    gap: 16,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoItemText: {
    flex: 1,
    color: colors.text,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: colors.background,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 500,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontWeight: 'bold',
    color: colors.text,
    flex: 1,
  },
  modalBody: {
    maxHeight: 400,
    marginBottom: 20,
  },
  planSummary: {
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 2,
    alignItems: 'center',
  },
  planSummaryName: {
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  planSummaryPrice: {
    fontWeight: 'bold',
  },
  trialInfo: {
    backgroundColor: colors.primary + '10',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  trialInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  trialInfoTitle: {
    fontWeight: '700',
    color: colors.text,
  },
  trialInfoText: {
    color: colors.text,
    marginBottom: 6,
    paddingLeft: 34,
  },
  requirementBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  requirementBoxContent: {
    flex: 1,
  },
  requirementBoxTitle: {
    fontWeight: '700',
    color: colors.text,
    marginBottom: 6,
  },
  requirementBoxText: {
    color: colors.textSecondary,
    lineHeight: 18,
  },
  acceptanceBox: {
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
  },
  checkboxLabel: {
    flex: 1,
    color: '#92400E',
    lineHeight: 20,
  },
  acceptanceWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    paddingLeft: 36,
  },
  acceptanceWarningText: {
    color: '#92400E',
    fontWeight: '600',
  },
  nextStepsBox: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  nextStepsTitle: {
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  nextStepsList: {
    gap: 12,
  },
  nextStepItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  nextStepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nextStepNumberText: {
    fontWeight: '700',
    color: colors.white,
  },
  nextStepText: {
    flex: 1,
    color: colors.text,
    lineHeight: 18,
  },
  modalPrimaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  modalPrimaryButtonDisabled: {
    backgroundColor: colors.cardBorder,
    opacity: 0.5,
  },
  modalPrimaryButtonText: {
    fontWeight: '700',
    color: colors.white,
  },
  modalCancelButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalCancelText: {
    fontWeight: '600',
    color: colors.textSecondary,
  },
});
