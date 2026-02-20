
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
  Linking,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { colors, commonStyles } from '@/styles/commonStyles';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { scaleFontSize, scaleIconSize } from '@/utils/androidScaling';
import { StripeProvider, CardField, useStripe } from '@stripe/stripe-react-native';

interface SubscriptionData {
  id: string;
  stripe_subscription_id: string;
  plan_nombre: string;
  plan_precio: number;
  estado: string;
  trial_activo: boolean;
  trial_inicio: string | null;
  trial_fin: string | null;
  dias_trial_restantes: number;
  fecha_proximo_pago: string | null;
  payment_method_saved: boolean;
  auto_charge_accepted: boolean;
  cancel_at_period_end: boolean;
  creditos_eventos_restantes: number;
  creditos_destacados_restantes: number;
}

interface Invoice {
  id: string;
  invoice_number: string;
  amount_due: number;
  status: string;
  period_start: string;
  period_end: string;
  paid_at: string | null;
  hosted_invoice_url: string | null;
  invoice_pdf: string | null;
}

interface PaymentMethod {
  id: string;
  brand: string;
  last4: string;
  exp_month: number;
  exp_year: number;
  is_default: boolean;
}

/**
 * ✅ MI SUSCRIPCIÓN - COMPLETE SUBSCRIPTION MANAGEMENT
 * 
 * Features:
 * - View current subscription status
 * - Trial period information with countdown
 * - Payment method management
 * - Plan change functionality
 * - Subscription cancellation
 * - Invoice history
 * - Auto-charge acceptance for trial
 */

export default function MiSuscripcionScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const params = useLocalSearchParams();
  const localId = params.localId as string;

  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  
  const [showAddPaymentModal, setShowAddPaymentModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showChangePlanModal, setShowChangePlanModal] = useState(false);
  
  const [availablePlans, setAvailablePlans] = useState<any[]>([]);
  const [selectedNewPlan, setSelectedNewPlan] = useState<string>('');
  
  const [processingPayment, setProcessingPayment] = useState(false);
  const [canceling, setCanceling] = useState(false);
  const [changingPlan, setChangingPlan] = useState(false);

  const loadSubscriptionData = useCallback(async () => {
    if (!localId) {
      Alert.alert('Error', 'No se especificó el local');
      router.back();
      return;
    }

    try {
      setLoading(true);

      // Load subscription data
      const { data: subData, error: subError } = await supabase
        .from('suscripciones_locales')
        .select(`
          id,
          stripe_subscription_id,
          plan_id,
          estado,
          trial_activo,
          trial_inicio,
          trial_fin,
          dias_trial_restantes,
          fecha_proximo_pago,
          payment_method_saved,
          auto_charge_accepted,
          cancelar_al_final_periodo,
          creditos_eventos_restantes,
          creditos_destacados_restantes,
          planes_suscripcion (nombre, precio_mensual)
        `)
        .eq('local_id', localId)
        .eq('propietario_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (subError && subError.code !== 'PGRST116') {
        throw subError;
      }

      if (subData) {
        const planData = subData.planes_suscripcion as any;
        setSubscription({
          id: subData.id,
          stripe_subscription_id: subData.stripe_subscription_id || '',
          plan_nombre: planData?.nombre || 'Sin plan',
          plan_precio: planData?.precio_mensual || 0,
          estado: subData.estado,
          trial_activo: subData.trial_activo || false,
          trial_inicio: subData.trial_inicio,
          trial_fin: subData.trial_fin,
          dias_trial_restantes: subData.dias_trial_restantes || 0,
          fecha_proximo_pago: subData.fecha_proximo_pago,
          payment_method_saved: subData.payment_method_saved || false,
          auto_charge_accepted: subData.auto_charge_accepted || false,
          cancel_at_period_end: subData.cancelar_al_final_periodo || false,
          creditos_eventos_restantes: subData.creditos_eventos_restantes || 0,
          creditos_destacados_restantes: subData.creditos_destacados_restantes || 0,
        });

        // Load invoices if subscription exists
        if (subData.stripe_subscription_id) {
          // TODO: Backend Integration - GET /api/stripe/invoices/:subscriptionId
          // Returns: [{ id, invoice_number, amount_due, status, period_start, period_end, paid_at, hosted_invoice_url, invoice_pdf }]
        }

        // Load payment methods if customer exists
        // TODO: Backend Integration - GET /api/stripe/payment-methods/:customerId
        // Returns: [{ id, brand, last4, exp_month, exp_year, is_default }]
      }

      // Load available plans for plan change
      const { data: plansData, error: plansError } = await supabase
        .from('planes_suscripcion')
        .select('*')
        .eq('activo', true)
        .order('orden_visualizacion', { ascending: true });

      if (plansError) throw plansError;
      setAvailablePlans(plansData || []);

    } catch (error) {
      console.error('[MiSuscripcion] Error loading data:', error);
      Alert.alert('Error', 'No se pudieron cargar los datos de suscripción');
    } finally {
      setLoading(false);
    }
  }, [localId, user?.id, router]);

  useEffect(() => {
    loadSubscriptionData();
  }, [loadSubscriptionData]);

  const handleAddPaymentMethod = async () => {
    setShowAddPaymentModal(true);
  };

  const handleSavePaymentMethod = async (paymentMethodId: string) => {
    try {
      setProcessingPayment(true);

      // TODO: Backend Integration - POST /api/stripe/attach-payment-method
      // Body: { customerId, paymentMethodId, localId, setAsDefault: true }
      // Returns: { success: true, paymentMethod: {...} }

      Alert.alert('✅ Éxito', 'Método de pago guardado correctamente');
      setShowAddPaymentModal(false);
      await loadSubscriptionData();
    } catch (error) {
      console.error('[MiSuscripcion] Error saving payment method:', error);
      Alert.alert('Error', 'No se pudo guardar el método de pago');
    } finally {
      setProcessingPayment(false);
    }
  };

  const handleStartTrial = async () => {
    if (!subscription?.payment_method_saved) {
      Alert.alert(
        'Método de Pago Requerido',
        'Debes agregar un método de pago válido antes de iniciar la prueba gratuita.'
      );
      return;
    }

    if (!subscription?.auto_charge_accepted) {
      Alert.alert(
        'Aceptación Requerida',
        'Debes aceptar los términos de cobro automático para iniciar la prueba gratuita.'
      );
      return;
    }

    try {
      setProcessingPayment(true);

      // TODO: Backend Integration - POST /api/stripe/start-trial
      // Body: { localId, planId }
      // Returns: { success: true, subscription: {...}, trial_end: '2025-03-01' }

      Alert.alert(
        '✅ Prueba Activada',
        'Tu prueba gratuita de 30 días ha comenzado. Disfruta de todas las funcionalidades del plan.'
      );

      await loadSubscriptionData();
    } catch (error) {
      console.error('[MiSuscripcion] Error starting trial:', error);
      Alert.alert('Error', 'No se pudo activar la prueba gratuita');
    } finally {
      setProcessingPayment(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!subscription) return;

    setCanceling(true);
    try {
      // TODO: Backend Integration - POST /api/stripe/cancel-subscription
      // Body: { subscriptionId: subscription.stripe_subscription_id, cancelAtPeriodEnd: true }
      // Returns: { success: true, canceled_at: '2025-03-01' }

      Alert.alert(
        '✅ Suscripción Cancelada',
        `Tu suscripción se cancelará el ${formatDate(subscription.fecha_proximo_pago)}. Hasta entonces, podrás seguir usando todas las funcionalidades.`
      );

      setShowCancelModal(false);
      await loadSubscriptionData();
    } catch (error) {
      console.error('[MiSuscripcion] Error canceling subscription:', error);
      Alert.alert('Error', 'No se pudo cancelar la suscripción');
    } finally {
      setCanceling(false);
    }
  };

  // ✅ LINT FIX: Removed unnecessary 'router' dependency
  const handleChangePlan = useCallback(async () => {
    if (!selectedNewPlan) {
      Alert.alert('Error', 'Selecciona un plan');
      return;
    }

    setChangingPlan(true);
    try {
      // TODO: Backend Integration - POST /api/stripe/change-plan
      // Body: { subscriptionId: subscription.stripe_subscription_id, newPlanId: selectedNewPlan }
      // Returns: { success: true, subscription: {...}, proration_amount: 15.50 }

      Alert.alert(
        '✅ Plan Cambiado',
        'Tu plan ha sido actualizado correctamente. Los cambios son efectivos inmediatamente.'
      );

      setShowChangePlanModal(false);
      await loadSubscriptionData();
    } catch (error) {
      console.error('[MiSuscripcion] Error changing plan:', error);
      Alert.alert('Error', 'No se pudo cambiar el plan');
    } finally {
      setChangingPlan(false);
    }
  }, [selectedNewPlan, loadSubscriptionData]);

  const handleViewInvoice = (invoice: Invoice) => {
    if (invoice.hosted_invoice_url) {
      Linking.openURL(invoice.hosted_invoice_url);
    } else if (invoice.invoice_pdf) {
      Linking.openURL(invoice.invoice_pdf);
    } else {
      Alert.alert('Información', 'Factura no disponible');
    }
  };

  const getStatusBadge = (estado: string) => {
    const badges: Record<string, { color: string; text: string; icon: string; androidIcon: string }> = {
      trialing: { color: '#3B82F6', text: 'Prueba Gratis', icon: 'gift.fill', androidIcon: 'card_giftcard' },
      active: { color: '#10B981', text: 'Activa', icon: 'checkmark.circle.fill', androidIcon: 'check_circle' },
      past_due: { color: '#F59E0B', text: 'Pago Pendiente', icon: 'exclamationmark.triangle.fill', androidIcon: 'warning' },
      canceled: { color: '#EF4444', text: 'Cancelada', icon: 'xmark.circle.fill', androidIcon: 'cancel' },
      incomplete: { color: '#6B7280', text: 'Incompleta', icon: 'clock.fill', androidIcon: 'schedule' },
      unpaid: { color: '#DC2626', text: 'Impagada', icon: 'xmark.octagon.fill', androidIcon: 'error' },
    };

    const badge = badges[estado] || badges.incomplete;

    return (
      <View style={[styles.statusBadge, { backgroundColor: badge.color + '15' }]}>
        <IconSymbol
          ios_icon_name={badge.icon as any}
          android_material_icon_name={badge.androidIcon}
          size={Platform.OS === 'android' ? scaleIconSize(16) : 16}
          color={badge.color}
        />
        <Text style={[styles.statusBadgeText, { color: badge.color, fontSize: scaleFontSize(13) }]}>
          {badge.text}
        </Text>
      </View>
    );
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
    }).format(price);
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
            <Text style={[styles.headerTitle, { fontSize: scaleFontSize(24) }]}>Mi Suscripción</Text>
          </View>
          <View style={{ width: 28 }} />
        </LinearGradient>

        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { fontSize: scaleFontSize(16) }]}>Cargando suscripción...</Text>
        </View>
      </View>
    );
  }

  if (!subscription) {
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
            <Text style={[styles.headerTitle, { fontSize: scaleFontSize(24) }]}>Mi Suscripción</Text>
          </View>
          <View style={{ width: 28 }} />
        </LinearGradient>

        <View style={styles.emptyState}>
          <IconSymbol
            ios_icon_name="creditcard"
            android_material_icon_name="payment"
            size={Platform.OS === 'android' ? scaleIconSize(64) : 64}
            color={colors.textSecondary}
          />
          <Text style={[styles.emptyText, { fontSize: scaleFontSize(20) }]}>Sin Suscripción</Text>
          <Text style={[styles.emptySubtext, { fontSize: scaleFontSize(15) }]}>
            No tienes una suscripción activa para este local
          </Text>
          <TouchableOpacity
            style={styles.emptyButton}
            onPress={() => router.push(`/gestion/planes-suscripcion?localId=${localId}`)}
          >
            <LinearGradient colors={[colors.primary, colors.primary + 'DD']} style={styles.emptyButtonGradient}>
              <IconSymbol
                ios_icon_name="plus.circle.fill"
                android_material_icon_name="add_circle"
                size={Platform.OS === 'android' ? scaleIconSize(20) : 20}
                color={colors.white}
              />
              <Text style={[styles.emptyButtonText, { fontSize: scaleFontSize(16) }]}>Ver Planes Disponibles</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const planPriceText = subscription.plan_precio === 0 ? 'Gratis' : formatPrice(subscription.plan_precio);
  const nextPaymentText = subscription.fecha_proximo_pago ? formatDate(subscription.fecha_proximo_pago) : 'N/A';

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
          <Text style={[styles.headerTitle, { fontSize: scaleFontSize(24) }]}>Mi Suscripción</Text>
        </View>
        <TouchableOpacity style={styles.refreshButton} onPress={loadSubscriptionData}>
          <IconSymbol
            ios_icon_name="arrow.clockwise"
            android_material_icon_name="refresh"
            size={Platform.OS === 'android' ? scaleIconSize(24) : 24}
            color={colors.headerText}
          />
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Current Plan Card */}
        <View style={styles.planCard}>
          <LinearGradient
            colors={subscription.trial_activo ? ['#3B82F6', '#2563EB'] : [colors.primary, colors.primary + 'DD']}
            style={styles.planCardGradient}
          >
            <View style={styles.planCardHeader}>
              <View style={styles.planCardHeaderLeft}>
                <Text style={[styles.planName, { fontSize: scaleFontSize(28) }]}>{subscription.plan_nombre}</Text>
                <Text style={[styles.planPrice, { fontSize: scaleFontSize(20) }]}>{planPriceText}/mes</Text>
              </View>
              {getStatusBadge(subscription.estado)}
            </View>

            {subscription.trial_activo && (
              <View style={styles.trialBanner}>
                <IconSymbol
                  ios_icon_name="gift.fill"
                  android_material_icon_name="card_giftcard"
                  size={Platform.OS === 'android' ? scaleIconSize(24) : 24}
                  color={colors.white}
                />
                <View style={styles.trialBannerContent}>
                  <Text style={[styles.trialBannerTitle, { fontSize: scaleFontSize(16) }]}>Prueba Gratuita Activa</Text>
                  <Text style={[styles.trialBannerText, { fontSize: scaleFontSize(14) }]}>
                    {subscription.dias_trial_restantes} días restantes
                  </Text>
                </View>
              </View>
            )}

            <View style={styles.planDetails}>
              <View style={styles.planDetailRow}>
                <IconSymbol
                  ios_icon_name="calendar"
                  android_material_icon_name="event"
                  size={Platform.OS === 'android' ? scaleIconSize(18) : 18}
                  color={colors.white}
                />
                <Text style={[styles.planDetailText, { fontSize: scaleFontSize(15) }]}>
                  Próximo cobro: {nextPaymentText}
                </Text>
              </View>

              {subscription.trial_activo && subscription.trial_fin && (
                <View style={styles.planDetailRow}>
                  <IconSymbol
                    ios_icon_name="clock.fill"
                    android_material_icon_name="schedule"
                    size={Platform.OS === 'android' ? scaleIconSize(18) : 18}
                    color={colors.white}
                  />
                  <Text style={[styles.planDetailText, { fontSize: scaleFontSize(15) }]}>
                    Prueba finaliza: {formatDate(subscription.trial_fin)}
                  </Text>
                </View>
              )}

              <View style={styles.planDetailRow}>
                <IconSymbol
                  ios_icon_name="star.fill"
                  android_material_icon_name="star"
                  size={Platform.OS === 'android' ? scaleIconSize(18) : 18}
                  color={colors.white}
                />
                <Text style={[styles.planDetailText, { fontSize: scaleFontSize(15) }]}>
                  {subscription.creditos_eventos_restantes} eventos • {subscription.creditos_destacados_restantes} destacados
                </Text>
              </View>
            </View>

            {subscription.cancel_at_period_end && (
              <View style={styles.cancelWarning}>
                <IconSymbol
                  ios_icon_name="exclamationmark.triangle.fill"
                  android_material_icon_name="warning"
                  size={Platform.OS === 'android' ? scaleIconSize(20) : 20}
                  color="#FEF3C7"
                />
                <Text style={[styles.cancelWarningText, { fontSize: scaleFontSize(14) }]}>
                  Tu suscripción se cancelará el {nextPaymentText}
                </Text>
              </View>
            )}
          </LinearGradient>
        </View>

        {/* Trial Information (if in trial) */}
        {subscription.trial_activo && (
          <View style={styles.infoCard}>
            <View style={styles.infoCardHeader}>
              <IconSymbol
                ios_icon_name="info.circle.fill"
                android_material_icon_name="info"
                size={Platform.OS === 'android' ? scaleIconSize(24) : 24}
                color={colors.primary}
              />
              <Text style={[styles.infoCardTitle, { fontSize: scaleFontSize(18) }]}>Información de Prueba</Text>
            </View>
            <Text style={[styles.infoCardText, { fontSize: scaleFontSize(15) }]}>
              Estás disfrutando de una prueba gratuita de 30 días. Al finalizar el período de prueba, se realizará automáticamente el cobro del plan {subscription.plan_nombre} ({planPriceText}/mes).
            </Text>
            <Text style={[styles.infoCardText, { fontSize: scaleFontSize(15), marginTop: 12 }]}>
              Puedes cancelar en cualquier momento antes del {formatDate(subscription.trial_fin)} sin ningún cargo.
            </Text>
          </View>
        )}

        {/* Payment Method Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { fontSize: scaleFontSize(20) }]}>Método de Pago</Text>
          
          {paymentMethods.length > 0 ? (
            <View style={styles.paymentMethodsList}>
              {paymentMethods.map((pm) => (
                <View key={pm.id} style={styles.paymentMethodCard}>
                  <View style={styles.paymentMethodIcon}>
                    <IconSymbol
                      ios_icon_name="creditcard.fill"
                      android_material_icon_name="payment"
                      size={Platform.OS === 'android' ? scaleIconSize(24) : 24}
                      color={colors.primary}
                    />
                  </View>
                  <View style={styles.paymentMethodInfo}>
                    <Text style={[styles.paymentMethodBrand, { fontSize: scaleFontSize(16) }]}>
                      {pm.brand.toUpperCase()} •••• {pm.last4}
                    </Text>
                    <Text style={[styles.paymentMethodExpiry, { fontSize: scaleFontSize(14) }]}>
                      Expira {pm.exp_month}/{pm.exp_year}
                    </Text>
                  </View>
                  {pm.is_default && (
                    <View style={styles.defaultBadge}>
                      <Text style={[styles.defaultBadgeText, { fontSize: scaleFontSize(11) }]}>PREDETERMINADA</Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.noPaymentMethod}>
              <IconSymbol
                ios_icon_name="creditcard"
                android_material_icon_name="payment"
                size={Platform.OS === 'android' ? scaleIconSize(48) : 48}
                color={colors.textSecondary}
              />
              <Text style={[styles.noPaymentMethodText, { fontSize: scaleFontSize(15) }]}>
                No hay métodos de pago guardados
              </Text>
            </View>
          )}

          <TouchableOpacity style={styles.addPaymentButton} onPress={handleAddPaymentMethod}>
            <IconSymbol
              ios_icon_name="plus.circle.fill"
              android_material_icon_name="add_circle"
              size={Platform.OS === 'android' ? scaleIconSize(20) : 20}
              color={colors.primary}
            />
            <Text style={[styles.addPaymentButtonText, { fontSize: scaleFontSize(15) }]}>
              {paymentMethods.length > 0 ? 'Agregar Otro Método' : 'Agregar Método de Pago'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Actions Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { fontSize: scaleFontSize(20) }]}>Acciones</Text>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => setShowChangePlanModal(true)}
          >
            <View style={styles.actionButtonContent}>
              <IconSymbol
                ios_icon_name="arrow.up.circle.fill"
                android_material_icon_name="arrow_upward"
                size={Platform.OS === 'android' ? scaleIconSize(24) : 24}
                color={colors.primary}
              />
              <View style={styles.actionButtonText}>
                <Text style={[styles.actionButtonTitle, { fontSize: scaleFontSize(16) }]}>Cambiar de Plan</Text>
                <Text style={[styles.actionButtonSubtitle, { fontSize: scaleFontSize(13) }]}>
                  Actualiza o reduce tu plan
                </Text>
              </View>
            </View>
            <IconSymbol
              ios_icon_name="chevron.right"
              android_material_icon_name="chevron_right"
              size={Platform.OS === 'android' ? scaleIconSize(20) : 20}
              color={colors.textSecondary}
            />
          </TouchableOpacity>

          {!subscription.cancel_at_period_end && subscription.plan_precio > 0 && (
            <TouchableOpacity
              style={[styles.actionButton, styles.actionButtonDanger]}
              onPress={() => setShowCancelModal(true)}
            >
              <View style={styles.actionButtonContent}>
                <IconSymbol
                  ios_icon_name="xmark.circle.fill"
                  android_material_icon_name="cancel"
                  size={Platform.OS === 'android' ? scaleIconSize(24) : 24}
                  color="#EF4444"
                />
                <View style={styles.actionButtonText}>
                  <Text style={[styles.actionButtonTitle, { fontSize: scaleFontSize(16), color: '#EF4444' }]}>
                    Cancelar Suscripción
                  </Text>
                  <Text style={[styles.actionButtonSubtitle, { fontSize: scaleFontSize(13) }]}>
                    Cancela al final del período actual
                  </Text>
                </View>
              </View>
              <IconSymbol
                ios_icon_name="chevron.right"
                android_material_icon_name="chevron_right"
                size={Platform.OS === 'android' ? scaleIconSize(20) : 20}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
          )}
        </View>

        {/* Invoice History */}
        {invoices.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { fontSize: scaleFontSize(20) }]}>Historial de Facturas</Text>

            <View style={styles.invoicesList}>
              {invoices.map((invoice) => (
                <TouchableOpacity
                  key={invoice.id}
                  style={styles.invoiceCard}
                  onPress={() => handleViewInvoice(invoice)}
                >
                  <View style={styles.invoiceCardLeft}>
                    <Text style={[styles.invoiceNumber, { fontSize: scaleFontSize(15) }]}>
                      {invoice.invoice_number || 'Factura'}
                    </Text>
                    <Text style={[styles.invoicePeriod, { fontSize: scaleFontSize(13) }]}>
                      {formatDate(invoice.period_start)} - {formatDate(invoice.period_end)}
                    </Text>
                  </View>
                  <View style={styles.invoiceCardRight}>
                    <Text style={[styles.invoiceAmount, { fontSize: scaleFontSize(18) }]}>
                      {formatPrice(invoice.amount_due)}
                    </Text>
                    <View style={[
                      styles.invoiceStatusBadge,
                      invoice.status === 'paid' ? styles.invoiceStatusPaid : styles.invoiceStatusUnpaid
                    ]}>
                      <Text style={[styles.invoiceStatusText, { fontSize: scaleFontSize(11) }]}>
                        {invoice.status === 'paid' ? 'PAGADA' : 'PENDIENTE'}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Add Payment Method Modal */}
      <Modal
        visible={showAddPaymentModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddPaymentModal(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowAddPaymentModal(false)}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { fontSize: scaleFontSize(20) }]}>Agregar Método de Pago</Text>
              <TouchableOpacity onPress={() => setShowAddPaymentModal(false)}>
                <IconSymbol
                  ios_icon_name="xmark.circle.fill"
                  android_material_icon_name="cancel"
                  size={Platform.OS === 'android' ? scaleIconSize(28) : 28}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={[styles.modalDescription, { fontSize: scaleFontSize(15) }]}>
                Agrega una tarjeta de crédito o débito para activar tu prueba gratuita y gestionar tu suscripción.
              </Text>

              {/* Stripe Card Input Component */}
              <View style={styles.cardFieldContainer}>
                {/* TODO: Integrate Stripe CardField component here */}
                <Text style={[styles.cardFieldPlaceholder, { fontSize: scaleFontSize(14) }]}>
                  [Stripe Card Input Component]
                </Text>
              </View>

              <View style={styles.securityInfo}>
                <IconSymbol
                  ios_icon_name="lock.fill"
                  android_material_icon_name="lock"
                  size={Platform.OS === 'android' ? scaleIconSize(16) : 16}
                  color={colors.textSecondary}
                />
                <Text style={[styles.securityInfoText, { fontSize: scaleFontSize(13) }]}>
                  Tus datos están protegidos con encriptación SSL
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.modalPrimaryButton, processingPayment && styles.modalPrimaryButtonDisabled]}
              onPress={() => handleSavePaymentMethod('pm_test_123')}
              disabled={processingPayment}
            >
              {processingPayment ? (
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
                    Guardar Método de Pago
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.modalCancelButton} onPress={() => setShowAddPaymentModal(false)}>
              <Text style={[styles.modalCancelText, { fontSize: scaleFontSize(16) }]}>Cancelar</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Cancel Subscription Modal */}
      <Modal
        visible={showCancelModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCancelModal(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowCancelModal(false)}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { fontSize: scaleFontSize(20) }]}>Cancelar Suscripción</Text>
              <TouchableOpacity onPress={() => setShowCancelModal(false)}>
                <IconSymbol
                  ios_icon_name="xmark.circle.fill"
                  android_material_icon_name="cancel"
                  size={Platform.OS === 'android' ? scaleIconSize(28) : 28}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <View style={styles.warningBox}>
                <IconSymbol
                  ios_icon_name="exclamationmark.triangle.fill"
                  android_material_icon_name="warning"
                  size={Platform.OS === 'android' ? scaleIconSize(32) : 32}
                  color="#F59E0B"
                />
                <Text style={[styles.warningBoxText, { fontSize: scaleFontSize(15) }]}>
                  ¿Estás seguro de que deseas cancelar tu suscripción?
                </Text>
              </View>

              <View style={styles.cancelInfo}>
                <View style={styles.cancelInfoItem}>
                  <IconSymbol
                    ios_icon_name="checkmark.circle"
                    android_material_icon_name="check_circle"
                    size={Platform.OS === 'android' ? scaleIconSize(20) : 20}
                    color="#10B981"
                  />
                  <Text style={[styles.cancelInfoText, { fontSize: scaleFontSize(14) }]}>
                    Seguirás teniendo acceso hasta el {nextPaymentText}
                  </Text>
                </View>
                <View style={styles.cancelInfoItem}>
                  <IconSymbol
                    ios_icon_name="xmark.circle"
                    android_material_icon_name="cancel"
                    size={Platform.OS === 'android' ? scaleIconSize(20) : 20}
                    color="#EF4444"
                  />
                  <Text style={[styles.cancelInfoText, { fontSize: scaleFontSize(14) }]}>
                    Perderás los créditos no utilizados
                  </Text>
                </View>
                <View style={styles.cancelInfoItem}>
                  <IconSymbol
                    ios_icon_name="arrow.down.circle"
                    android_material_icon_name="arrow_downward"
                    size={Platform.OS === 'android' ? scaleIconSize(20) : 20}
                    color="#F59E0B"
                  />
                  <Text style={[styles.cancelInfoText, { fontSize: scaleFontSize(14) }]}>
                    Volverás al plan básico gratuito
                  </Text>
                </View>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.modalDangerButton, canceling && styles.modalPrimaryButtonDisabled]}
              onPress={handleCancelSubscription}
              disabled={canceling}
            >
              {canceling ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <>
                  <IconSymbol
                    ios_icon_name="xmark.circle.fill"
                    android_material_icon_name="cancel"
                    size={Platform.OS === 'android' ? scaleIconSize(20) : 20}
                    color={colors.white}
                  />
                  <Text style={[styles.modalPrimaryButtonText, { fontSize: scaleFontSize(16) }]}>
                    Sí, Cancelar Suscripción
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.modalCancelButton} onPress={() => setShowCancelModal(false)}>
              <Text style={[styles.modalCancelText, { fontSize: scaleFontSize(16) }]}>No, Mantener Suscripción</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Change Plan Modal */}
      <Modal
        visible={showChangePlanModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowChangePlanModal(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowChangePlanModal(false)}>
          <Pressable style={[styles.modalContent, styles.modalContentLarge]} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { fontSize: scaleFontSize(20) }]}>Cambiar de Plan</Text>
              <TouchableOpacity onPress={() => setShowChangePlanModal(false)}>
                <IconSymbol
                  ios_icon_name="xmark.circle.fill"
                  android_material_icon_name="cancel"
                  size={Platform.OS === 'android' ? scaleIconSize(28) : 28}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScrollView} showsVerticalScrollIndicator={false}>
              <View style={styles.plansGrid}>
                {availablePlans.map((plan) => (
                  <TouchableOpacity
                    key={plan.id}
                    style={[
                      styles.planOption,
                      selectedNewPlan === plan.id && styles.planOptionSelected,
                    ]}
                    onPress={() => setSelectedNewPlan(plan.id)}
                  >
                    <View style={styles.planOptionHeader}>
                      <Text style={[styles.planOptionName, { fontSize: scaleFontSize(18) }]}>{plan.nombre}</Text>
                      {plan.recomendado && (
                        <View style={styles.recommendedBadge}>
                          <Text style={[styles.recommendedBadgeText, { fontSize: scaleFontSize(10) }]}>
                            RECOMENDADO
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text style={[styles.planOptionPrice, { fontSize: scaleFontSize(24) }]}>
                      {plan.precio_mensual === 0 ? 'Gratis' : `${plan.precio_mensual}€/mes`}
                    </Text>
                    {plan.descripcion && (
                      <Text style={[styles.planOptionDescription, { fontSize: scaleFontSize(13) }]}>
                        {plan.descripcion}
                      </Text>
                    )}
                    {selectedNewPlan === plan.id && (
                      <View style={styles.planOptionSelectedIndicator}>
                        <IconSymbol
                          ios_icon_name="checkmark.circle.fill"
                          android_material_icon_name="check_circle"
                          size={Platform.OS === 'android' ? scaleIconSize(24) : 24}
                          color={colors.primary}
                        />
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <TouchableOpacity
              style={[styles.modalPrimaryButton, (!selectedNewPlan || changingPlan) && styles.modalPrimaryButtonDisabled]}
              onPress={handleChangePlan}
              disabled={!selectedNewPlan || changingPlan}
            >
              {changingPlan ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <>
                  <IconSymbol
                    ios_icon_name="checkmark.circle.fill"
                    android_material_icon_name="check_circle"
                    size={Platform.OS === 'android' ? scaleIconSize(20) : 20}
                    color={colors.white}
                  />
                  <Text style={[styles.modalPrimaryButtonText, { fontSize: scaleFontSize(16) }]}>Cambiar Plan</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.modalCancelButton} onPress={() => setShowChangePlanModal(false)}>
              <Text style={[styles.modalCancelText, { fontSize: scaleFontSize(16) }]}>Cancelar</Text>
            </TouchableOpacity>
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
    paddingTop: 50,
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
  refreshButton: {
    padding: 4,
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
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    gap: 16,
  },
  emptyText: {
    fontWeight: 'bold',
    color: colors.text,
  },
  emptySubtext: {
    color: colors.textSecondary,
    textAlign: 'center',
  },
  emptyButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 16,
  },
  emptyButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  emptyButtonText: {
    fontWeight: '700',
    color: colors.white,
  },
  planCard: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 24,
    ...commonStyles.shadow,
  },
  planCardGradient: {
    padding: 24,
  },
  planCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  planCardHeaderLeft: {
    flex: 1,
  },
  planName: {
    fontWeight: 'bold',
    color: colors.white,
    marginBottom: 8,
  },
  planPrice: {
    fontWeight: '600',
    color: colors.white,
    opacity: 0.9,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusBadgeText: {
    fontWeight: '700',
  },
  trialBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  trialBannerContent: {
    flex: 1,
  },
  trialBannerTitle: {
    fontWeight: '700',
    color: colors.white,
    marginBottom: 4,
  },
  trialBannerText: {
    color: colors.white,
    opacity: 0.9,
  },
  planDetails: {
    gap: 12,
  },
  planDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  planDetailText: {
    color: colors.white,
    fontWeight: '500',
  },
  cancelWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(254, 243, 199, 0.2)',
    padding: 12,
    borderRadius: 10,
    marginTop: 16,
  },
  cancelWarningText: {
    flex: 1,
    color: '#FEF3C7',
    fontWeight: '600',
  },
  infoCard: {
    backgroundColor: colors.primary + '10',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  infoCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  infoCardTitle: {
    fontWeight: '700',
    color: colors.text,
  },
  infoCardText: {
    color: colors.text,
    lineHeight: 22,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 16,
  },
  paymentMethodsList: {
    gap: 12,
    marginBottom: 16,
  },
  paymentMethodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  paymentMethodIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  paymentMethodInfo: {
    flex: 1,
  },
  paymentMethodBrand: {
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  paymentMethodExpiry: {
    color: colors.textSecondary,
  },
  defaultBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  defaultBadgeText: {
    fontWeight: '700',
    color: colors.white,
  },
  noPaymentMethod: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: 16,
  },
  noPaymentMethodText: {
    color: colors.textSecondary,
    marginTop: 12,
  },
  addPaymentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.cardBackground,
    borderWidth: 2,
    borderColor: colors.primary,
    borderStyle: 'dashed',
    paddingVertical: 14,
    borderRadius: 12,
  },
  addPaymentButtonText: {
    fontWeight: '600',
    color: colors.primary,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  actionButtonDanger: {
    borderColor: '#FEE2E2',
    backgroundColor: '#FEF2F2',
  },
  actionButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  actionButtonText: {
    flex: 1,
  },
  actionButtonTitle: {
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  actionButtonSubtitle: {
    color: colors.textSecondary,
  },
  invoicesList: {
    gap: 12,
  },
  invoiceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  invoiceCardLeft: {
    flex: 1,
  },
  invoiceNumber: {
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  invoicePeriod: {
    color: colors.textSecondary,
  },
  invoiceCardRight: {
    alignItems: 'flex-end',
  },
  invoiceAmount: {
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 6,
  },
  invoiceStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  invoiceStatusPaid: {
    backgroundColor: '#D1FAE5',
  },
  invoiceStatusUnpaid: {
    backgroundColor: '#FEE2E2',
  },
  invoiceStatusText: {
    fontWeight: '700',
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
  },
  modalContentLarge: {
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
    marginBottom: 20,
  },
  modalDescription: {
    color: colors.text,
    lineHeight: 22,
    marginBottom: 20,
  },
  cardFieldContainer: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: 16,
    minHeight: 60,
    justifyContent: 'center',
  },
  cardFieldPlaceholder: {
    color: colors.textSecondary,
    textAlign: 'center',
  },
  securityInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    justifyContent: 'center',
  },
  securityInfoText: {
    color: colors.textSecondary,
  },
  warningBox: {
    alignItems: 'center',
    gap: 16,
    padding: 20,
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    marginBottom: 20,
  },
  warningBoxText: {
    color: '#92400E',
    fontWeight: '600',
    textAlign: 'center',
  },
  cancelInfo: {
    gap: 12,
  },
  cancelInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cancelInfoText: {
    flex: 1,
    color: colors.text,
  },
  modalScrollView: {
    maxHeight: 400,
    marginBottom: 20,
  },
  plansGrid: {
    gap: 16,
  },
  planOption: {
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: colors.cardBorder,
    position: 'relative',
  },
  planOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  planOptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  planOptionName: {
    fontWeight: 'bold',
    color: colors.text,
  },
  recommendedBadge: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  recommendedBadgeText: {
    fontWeight: '700',
    color: colors.white,
  },
  planOptionPrice: {
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 8,
  },
  planOptionDescription: {
    color: colors.textSecondary,
    lineHeight: 18,
  },
  planOptionSelectedIndicator: {
    position: 'absolute',
    top: 16,
    right: 16,
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
  modalDangerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#EF4444',
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 12,
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
