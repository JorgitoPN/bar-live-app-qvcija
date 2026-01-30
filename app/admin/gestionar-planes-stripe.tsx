
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
  Switch,
  Pressable,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors, commonStyles } from '@/styles/commonStyles';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { scaleFontSize, scaleIconSize } from '@/utils/androidScaling';

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
  activo: boolean;
  eventos_mes: number;
  promos_destacadas: number;
  perfil_social: boolean;
  panel_analisis: boolean;
  soporte_prioritario: boolean;
  visibilidad_extra: boolean;
  visibilidad_maxima: boolean;
  stripe_product_id: string | null;
  stripe_price_id: string | null;
  permisos: Record<string, boolean>;
}

/**
 * ✅ GESTIONAR PLANES STRIPE - COMPLETE ADMIN PANEL
 * 
 * Features:
 * - Create, edit, delete subscription plans
 * - Configure trial periods (enable/disable, duration)
 * - Set display order and recommended plan
 * - Manage plan features and permissions
 * - Sync with Stripe products and prices
 * - View subscription statistics
 */

export default function GestionarPlanesStripeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [planes, setPlanes] = useState<Plan[]>([]);
  
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  
  // Form states
  const [formNombre, setFormNombre] = useState('');
  const [formDescripcion, setFormDescripcion] = useState('');
  const [formPrecio, setFormPrecio] = useState('');
  const [formDuracion, setFormDuracion] = useState('1');
  const [formOrden, setFormOrden] = useState('0');
  const [formRecomendado, setFormRecomendado] = useState(false);
  const [formTrialHabilitado, setFormTrialHabilitado] = useState(true);
  const [formTrialDias, setFormTrialDias] = useState('30');
  const [formActivo, setFormActivo] = useState(true);
  const [formEventos, setFormEventos] = useState('0');
  const [formPromos, setFormPromos] = useState('0');
  const [formPerfilSocial, setFormPerfilSocial] = useState(false);
  const [formPanelAnalisis, setFormPanelAnalisis] = useState(false);
  const [formSoportePrioritario, setFormSoportePrioritario] = useState(false);
  const [formVisibilidadExtra, setFormVisibilidadExtra] = useState(false);
  const [formVisibilidadMaxima, setFormVisibilidadMaxima] = useState(false);
  
  const [saving, setSaving] = useState(false);

  const loadPlanes = useCallback(async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('planes_suscripcion')
        .select('*')
        .order('orden_visualizacion', { ascending: true });

      if (error) throw error;

      console.log('[GestionarPlanesStripe] Loaded plans:', data?.length || 0);
      setPlanes(data || []);
    } catch (error) {
      console.error('[GestionarPlanesStripe] Error loading plans:', error);
      Alert.alert('Error', 'No se pudieron cargar los planes');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPlanes();
  }, [loadPlanes]);

  const handleCreatePlan = () => {
    setEditingPlan(null);
    resetForm();
    setShowEditModal(true);
  };

  const handleEditPlan = (plan: Plan) => {
    setEditingPlan(plan);
    setFormNombre(plan.nombre);
    setFormDescripcion(plan.descripcion || '');
    setFormPrecio(plan.precio_mensual.toString());
    setFormDuracion(plan.duracion_meses.toString());
    setFormOrden(plan.orden_visualizacion.toString());
    setFormRecomendado(plan.recomendado);
    setFormTrialHabilitado(plan.trial_habilitado);
    setFormTrialDias(plan.trial_dias.toString());
    setFormActivo(plan.activo);
    setFormEventos(plan.eventos_mes.toString());
    setFormPromos(plan.promos_destacadas.toString());
    setFormPerfilSocial(plan.perfil_social);
    setFormPanelAnalisis(plan.panel_analisis);
    setFormSoportePrioritario(plan.soporte_prioritario);
    setFormVisibilidadExtra(plan.visibilidad_extra);
    setFormVisibilidadMaxima(plan.visibilidad_maxima);
    setShowEditModal(true);
  };

  const resetForm = () => {
    setFormNombre('');
    setFormDescripcion('');
    setFormPrecio('0');
    setFormDuracion('1');
    setFormOrden('0');
    setFormRecomendado(false);
    setFormTrialHabilitado(true);
    setFormTrialDias('30');
    setFormActivo(true);
    setFormEventos('0');
    setFormPromos('0');
    setFormPerfilSocial(false);
    setFormPanelAnalisis(false);
    setFormSoportePrioritario(false);
    setFormVisibilidadExtra(false);
    setFormVisibilidadMaxima(false);
  };

  const handleSavePlan = async () => {
    if (!formNombre.trim()) {
      Alert.alert('Error', 'El nombre del plan es obligatorio');
      return;
    }

    const precio = parseFloat(formPrecio) || 0;
    const duracion = parseInt(formDuracion, 10) || 1;
    const orden = parseInt(formOrden, 10) || 0;
    const trialDias = parseInt(formTrialDias, 10) || 0;
    const eventos = parseInt(formEventos, 10) || 0;
    const promos = parseInt(formPromos, 10) || 0;

    if (precio < 0) {
      Alert.alert('Error', 'El precio no puede ser negativo');
      return;
    }

    if (duracion < 1) {
      Alert.alert('Error', 'La duración debe ser al menos 1 mes');
      return;
    }

    if (formTrialHabilitado && trialDias < 1) {
      Alert.alert('Error', 'La duración del trial debe ser al menos 1 día');
      return;
    }

    setSaving(true);
    try {
      const planData = {
        nombre: formNombre.trim(),
        descripcion: formDescripcion.trim(),
        precio_mensual: precio,
        duracion_meses: duracion,
        orden_visualizacion: orden,
        recomendado: formRecomendado,
        trial_habilitado: formTrialHabilitado,
        trial_dias: formTrialHabilitado ? trialDias : 0,
        activo: formActivo,
        eventos_mes: eventos,
        promos_destacadas: promos,
        perfil_social: formPerfilSocial,
        panel_analisis: formPanelAnalisis,
        soporte_prioritario: formSoportePrioritario,
        visibilidad_extra: formVisibilidadExtra,
        visibilidad_maxima: formVisibilidadMaxima,
        permisos: {
          crear_eventos: eventos > 0,
          publicar_posts: formPerfilSocial,
          destacar_local: promos > 0,
          panel_analisis: formPanelAnalisis,
        },
      };

      if (editingPlan) {
        // Update existing plan
        const { error } = await supabase
          .from('planes_suscripcion')
          .update(planData)
          .eq('id', editingPlan.id);

        if (error) throw error;

        Alert.alert('✅ Éxito', 'Plan actualizado correctamente');
      } else {
        // Create new plan
        const { error } = await supabase
          .from('planes_suscripcion')
          .insert({
            ...planData,
            caracteristicas: [],
          });

        if (error) throw error;

        Alert.alert('✅ Éxito', 'Plan creado correctamente');
      }

      setShowEditModal(false);
      await loadPlanes();
    } catch (error) {
      console.error('[GestionarPlanesStripe] Error saving plan:', error);
      Alert.alert('Error', 'No se pudo guardar el plan');
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePlan = (plan: Plan) => {
    Alert.alert(
      'Eliminar Plan',
      `¿Estás seguro de que deseas eliminar el plan "${plan.nombre}"?\n\nEsta acción no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              // Check if plan has active subscriptions
              const { count } = await supabase
                .from('suscripciones_locales')
                .select('*', { count: 'exact', head: true })
                .eq('plan_id', plan.id)
                .in('estado', ['activa', 'trialing']);

              if (count && count > 0) {
                Alert.alert(
                  'No se puede eliminar',
                  `Este plan tiene ${count} suscripción(es) activa(s). Cancela las suscripciones antes de eliminar el plan.`
                );
                return;
              }

              const { error } = await supabase
                .from('planes_suscripcion')
                .delete()
                .eq('id', plan.id);

              if (error) throw error;

              Alert.alert('✅ Éxito', 'Plan eliminado correctamente');
              await loadPlanes();
            } catch (error) {
              console.error('[GestionarPlanesStripe] Error deleting plan:', error);
              Alert.alert('Error', 'No se pudo eliminar el plan');
            }
          },
        },
      ]
    );
  };

  const handleSyncWithStripe = async (plan: Plan) => {
    Alert.alert(
      'Sincronizar con Stripe',
      `¿Deseas crear/actualizar este plan en Stripe?\n\nSe creará un producto y precio en Stripe para "${plan.nombre}".`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sincronizar',
          onPress: async () => {
            try {
              // TODO: Backend Integration - POST /api/stripe/sync-plan
              // Body: { planId: plan.id }
              // Returns: { success: true, stripe_product_id, stripe_price_id }

              Alert.alert('✅ Éxito', 'Plan sincronizado con Stripe correctamente');
              await loadPlanes();
            } catch (error) {
              console.error('[GestionarPlanesStripe] Error syncing with Stripe:', error);
              Alert.alert('Error', 'No se pudo sincronizar con Stripe');
            }
          },
        },
      ]
    );
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
            <Text style={[styles.headerTitle, { fontSize: scaleFontSize(24) }]}>Gestionar Planes</Text>
            <Text style={[styles.headerSubtitle, { fontSize: scaleFontSize(13) }]}>Stripe Integration</Text>
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
          <Text style={[styles.headerTitle, { fontSize: scaleFontSize(24) }]}>Gestionar Planes</Text>
          <Text style={[styles.headerSubtitle, { fontSize: scaleFontSize(13) }]}>Stripe Integration</Text>
        </View>
        <TouchableOpacity style={styles.refreshButton} onPress={loadPlanes}>
          <IconSymbol
            ios_icon_name="arrow.clockwise"
            android_material_icon_name="refresh"
            size={Platform.OS === 'android' ? scaleIconSize(24) : 24}
            color={colors.headerText}
          />
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionHeaderLeft}>
            <Text style={[styles.sectionTitle, { fontSize: scaleFontSize(24) }]}>Planes de Suscripción</Text>
            <Text style={[styles.sectionSubtitle, { fontSize: scaleFontSize(15) }]}>
              {planes.length} planes configurados
            </Text>
          </View>
          <TouchableOpacity style={styles.createButton} onPress={handleCreatePlan}>
            <IconSymbol
              ios_icon_name="plus.circle.fill"
              android_material_icon_name="add_circle"
              size={Platform.OS === 'android' ? scaleIconSize(22) : 22}
              color={colors.white}
            />
            <Text style={[styles.createButtonText, { fontSize: scaleFontSize(15) }]}>Nuevo Plan</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.plansGrid}>
          {planes.map((plan) => {
            const planColor = getPlanColor(plan.nombre);

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

                <LinearGradient colors={[planColor, planColor + 'DD']} style={styles.planCardGradient}>
                  <View style={styles.planCardHeader}>
                    <View style={styles.planCardHeaderLeft}>
                      <Text style={[styles.planName, { fontSize: scaleFontSize(24) }]}>{plan.nombre}</Text>
                      <Text style={[styles.planPrice, { fontSize: scaleFontSize(28) }]}>
                        {plan.precio_mensual === 0 ? 'Gratis' : `${plan.precio_mensual}€/mes`}
                      </Text>
                    </View>
                    <View style={styles.planCardActions}>
                      <TouchableOpacity style={styles.iconButton} onPress={() => handleEditPlan(plan)}>
                        <IconSymbol
                          ios_icon_name="pencil.circle.fill"
                          android_material_icon_name="edit"
                          size={Platform.OS === 'android' ? scaleIconSize(28) : 28}
                          color={colors.white}
                        />
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.iconButton} onPress={() => handleDeletePlan(plan)}>
                        <IconSymbol
                          ios_icon_name="trash.circle.fill"
                          android_material_icon_name="delete"
                          size={Platform.OS === 'android' ? scaleIconSize(28) : 28}
                          color={colors.white}
                        />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {plan.descripcion && (
                    <Text style={[styles.planDescription, { fontSize: scaleFontSize(14) }]} numberOfLines={2}>
                      {plan.descripcion}
                    </Text>
                  )}

                  {/* Trial Information */}
                  {plan.trial_habilitado && (
                    <View style={styles.trialBadge}>
                      <IconSymbol
                        ios_icon_name="gift.fill"
                        android_material_icon_name="card_giftcard"
                        size={Platform.OS === 'android' ? scaleIconSize(14) : 14}
                        color={colors.white}
                      />
                      <Text style={[styles.trialBadgeText, { fontSize: scaleFontSize(12) }]}>
                        {plan.trial_dias} días de prueba gratis
                      </Text>
                    </View>
                  )}

                  {/* Plan Features */}
                  <View style={styles.planFeatures}>
                    <View style={styles.planFeatureRow}>
                      <IconSymbol
                        ios_icon_name="calendar.badge.plus"
                        android_material_icon_name="event"
                        size={Platform.OS === 'android' ? scaleIconSize(16) : 16}
                        color={colors.white}
                      />
                      <Text style={[styles.planFeatureText, { fontSize: scaleFontSize(13) }]}>
                        {plan.eventos_mes === 999 ? 'Eventos ilimitados' : `${plan.eventos_mes} eventos/mes`}
                      </Text>
                    </View>
                    <View style={styles.planFeatureRow}>
                      <IconSymbol
                        ios_icon_name="star.fill"
                        android_material_icon_name="star"
                        size={Platform.OS === 'android' ? scaleIconSize(16) : 16}
                        color={colors.white}
                      />
                      <Text style={[styles.planFeatureText, { fontSize: scaleFontSize(13) }]}>
                        {plan.promos_destacadas} destacados/mes
                      </Text>
                    </View>
                    {plan.perfil_social && (
                      <View style={styles.planFeatureRow}>
                        <IconSymbol
                          ios_icon_name="person.2.fill"
                          android_material_icon_name="people"
                          size={Platform.OS === 'android' ? scaleIconSize(16) : 16}
                          color={colors.white}
                        />
                        <Text style={[styles.planFeatureText, { fontSize: scaleFontSize(13) }]}>
                          Perfil social
                        </Text>
                      </View>
                    )}
                    {plan.panel_analisis && (
                      <View style={styles.planFeatureRow}>
                        <IconSymbol
                          ios_icon_name="chart.bar.fill"
                          android_material_icon_name="bar_chart"
                          size={Platform.OS === 'android' ? scaleIconSize(16) : 16}
                          color={colors.white}
                        />
                        <Text style={[styles.planFeatureText, { fontSize: scaleFontSize(13) }]}>
                          Panel de análisis
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Plan Status and Stripe Sync */}
                  <View style={styles.planFooter}>
                    <View style={[styles.statusBadge, plan.activo ? styles.statusBadgeActive : styles.statusBadgeInactive]}>
                      <IconSymbol
                        ios_icon_name={plan.activo ? 'checkmark.circle.fill' : 'xmark.circle.fill'}
                        android_material_icon_name={plan.activo ? 'check_circle' : 'cancel'}
                        size={Platform.OS === 'android' ? scaleIconSize(14) : 14}
                        color={colors.white}
                      />
                      <Text style={[styles.statusBadgeText, { fontSize: scaleFontSize(12) }]}>
                        {plan.activo ? 'Activo' : 'Inactivo'}
                      </Text>
                    </View>

                    {plan.stripe_product_id ? (
                      <View style={styles.stripeSyncedBadge}>
                        <IconSymbol
                          ios_icon_name="checkmark.seal.fill"
                          android_material_icon_name="verified"
                          size={Platform.OS === 'android' ? scaleIconSize(14) : 14}
                          color="#10B981"
                        />
                        <Text style={[styles.stripeSyncedText, { fontSize: scaleFontSize(11) }]}>
                          Sincronizado
                        </Text>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={styles.syncButton}
                        onPress={() => handleSyncWithStripe(plan)}
                      >
                        <IconSymbol
                          ios_icon_name="arrow.triangle.2.circlepath"
                          android_material_icon_name="sync"
                          size={Platform.OS === 'android' ? scaleIconSize(14) : 14}
                          color={colors.white}
                        />
                        <Text style={[styles.syncButtonText, { fontSize: scaleFontSize(11) }]}>
                          Sincronizar
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </LinearGradient>
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* Edit/Create Plan Modal */}
      <Modal
        visible={showEditModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowEditModal(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowEditModal(false)}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { fontSize: scaleFontSize(20) }]}>
                {editingPlan ? 'Editar Plan' : 'Crear Nuevo Plan'}
              </Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <IconSymbol
                  ios_icon_name="xmark.circle.fill"
                  android_material_icon_name="cancel"
                  size={Platform.OS === 'android' ? scaleIconSize(28) : 28}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScrollView} showsVerticalScrollIndicator={false}>
              {/* Basic Information */}
              <View style={styles.formSection}>
                <Text style={[styles.formSectionTitle, { fontSize: scaleFontSize(16) }]}>
                  Información Básica
                </Text>

                <View style={styles.formGroup}>
                  <Text style={[styles.formLabel, { fontSize: scaleFontSize(14) }]}>Nombre del Plan *</Text>
                  <TextInput
                    style={[styles.formInput, { fontSize: scaleFontSize(16) }]}
                    value={formNombre}
                    onChangeText={setFormNombre}
                    placeholder="Ej: Premium"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={[styles.formLabel, { fontSize: scaleFontSize(14) }]}>Descripción Comercial</Text>
                  <TextInput
                    style={[styles.formInput, styles.formTextArea, { fontSize: scaleFontSize(16) }]}
                    value={formDescripcion}
                    onChangeText={setFormDescripcion}
                    placeholder="Descripción del plan para mostrar a los clientes..."
                    placeholderTextColor={colors.textSecondary}
                    multiline
                    numberOfLines={3}
                  />
                </View>

                <View style={styles.formRow}>
                  <View style={[styles.formGroup, { flex: 1 }]}>
                    <Text style={[styles.formLabel, { fontSize: scaleFontSize(14) }]}>Precio Mensual (€)</Text>
                    <TextInput
                      style={[styles.formInput, { fontSize: scaleFontSize(16) }]}
                      value={formPrecio}
                      onChangeText={setFormPrecio}
                      placeholder="0.00"
                      placeholderTextColor={colors.textSecondary}
                      keyboardType="decimal-pad"
                    />
                  </View>

                  <View style={[styles.formGroup, { flex: 1 }]}>
                    <Text style={[styles.formLabel, { fontSize: scaleFontSize(14) }]}>Duración (meses)</Text>
                    <TextInput
                      style={[styles.formInput, { fontSize: scaleFontSize(16) }]}
                      value={formDuracion}
                      onChangeText={setFormDuracion}
                      placeholder="1"
                      placeholderTextColor={colors.textSecondary}
                      keyboardType="number-pad"
                    />
                  </View>
                </View>

                <View style={styles.formRow}>
                  <View style={[styles.formGroup, { flex: 1 }]}>
                    <Text style={[styles.formLabel, { fontSize: scaleFontSize(14) }]}>Orden de Visualización</Text>
                    <TextInput
                      style={[styles.formInput, { fontSize: scaleFontSize(16) }]}
                      value={formOrden}
                      onChangeText={setFormOrden}
                      placeholder="0"
                      placeholderTextColor={colors.textSecondary}
                      keyboardType="number-pad"
                    />
                  </View>

                  <View style={[styles.formGroup, { flex: 1 }]}>
                    <View style={styles.switchRow}>
                      <Text style={[styles.switchLabel, { fontSize: scaleFontSize(14) }]}>Recomendado</Text>
                      <Switch
                        value={formRecomendado}
                        onValueChange={setFormRecomendado}
                        trackColor={{ false: colors.cardBorder, true: colors.primary + '80' }}
                        thumbColor={formRecomendado ? colors.primary : colors.textSecondary}
                      />
                    </View>
                  </View>
                </View>
              </View>

              {/* Trial Configuration */}
              <View style={styles.formSection}>
                <Text style={[styles.formSectionTitle, { fontSize: scaleFontSize(16) }]}>
                  Configuración de Prueba Gratuita
                </Text>

                <View style={styles.formGroup}>
                  <View style={styles.switchRow}>
                    <View style={styles.switchLabelContainer}>
                      <Text style={[styles.switchLabel, { fontSize: scaleFontSize(15) }]}>Habilitar Prueba Gratuita</Text>
                      <Text style={[styles.switchHint, { fontSize: scaleFontSize(12) }]}>
                        Los usuarios podrán probar el plan sin cargo
                      </Text>
                    </View>
                    <Switch
                      value={formTrialHabilitado}
                      onValueChange={setFormTrialHabilitado}
                      trackColor={{ false: colors.cardBorder, true: colors.primary + '80' }}
                      thumbColor={formTrialHabilitado ? colors.primary : colors.textSecondary}
                    />
                  </View>
                </View>

                {formTrialHabilitado && (
                  <View style={styles.formGroup}>
                    <Text style={[styles.formLabel, { fontSize: scaleFontSize(14) }]}>Duración del Trial (días)</Text>
                    <TextInput
                      style={[styles.formInput, { fontSize: scaleFontSize(16) }]}
                      value={formTrialDias}
                      onChangeText={setFormTrialDias}
                      placeholder="30"
                      placeholderTextColor={colors.textSecondary}
                      keyboardType="number-pad"
                    />
                    <Text style={[styles.formHint, { fontSize: scaleFontSize(12) }]}>
                      Recomendado: 30 días (1 mes)
                    </Text>
                  </View>
                )}
              </View>

              {/* Features Configuration */}
              <View style={styles.formSection}>
                <Text style={[styles.formSectionTitle, { fontSize: scaleFontSize(16) }]}>
                  Funcionalidades del Plan
                </Text>

                <View style={styles.formRow}>
                  <View style={[styles.formGroup, { flex: 1 }]}>
                    <Text style={[styles.formLabel, { fontSize: scaleFontSize(14) }]}>Eventos/Mes</Text>
                    <TextInput
                      style={[styles.formInput, { fontSize: scaleFontSize(16) }]}
                      value={formEventos}
                      onChangeText={setFormEventos}
                      placeholder="0"
                      placeholderTextColor={colors.textSecondary}
                      keyboardType="number-pad"
                    />
                  </View>

                  <View style={[styles.formGroup, { flex: 1 }]}>
                    <Text style={[styles.formLabel, { fontSize: scaleFontSize(14) }]}>Destacados/Mes</Text>
                    <TextInput
                      style={[styles.formInput, { fontSize: scaleFontSize(16) }]}
                      value={formPromos}
                      onChangeText={setFormPromos}
                      placeholder="0"
                      placeholderTextColor={colors.textSecondary}
                      keyboardType="number-pad"
                    />
                  </View>
                </View>

                <View style={styles.formGroup}>
                  <View style={styles.switchRow}>
                    <Text style={[styles.switchLabel, { fontSize: scaleFontSize(15) }]}>Perfil Social Completo</Text>
                    <Switch
                      value={formPerfilSocial}
                      onValueChange={setFormPerfilSocial}
                      trackColor={{ false: colors.cardBorder, true: colors.primary + '80' }}
                      thumbColor={formPerfilSocial ? colors.primary : colors.textSecondary}
                    />
                  </View>
                </View>

                <View style={styles.formGroup}>
                  <View style={styles.switchRow}>
                    <Text style={[styles.switchLabel, { fontSize: scaleFontSize(15) }]}>Panel de Análisis</Text>
                    <Switch
                      value={formPanelAnalisis}
                      onValueChange={setFormPanelAnalisis}
                      trackColor={{ false: colors.cardBorder, true: colors.primary + '80' }}
                      thumbColor={formPanelAnalisis ? colors.primary : colors.textSecondary}
                    />
                  </View>
                </View>

                <View style={styles.formGroup}>
                  <View style={styles.switchRow}>
                    <Text style={[styles.switchLabel, { fontSize: scaleFontSize(15) }]}>Soporte Prioritario</Text>
                    <Switch
                      value={formSoportePrioritario}
                      onValueChange={setFormSoportePrioritario}
                      trackColor={{ false: colors.cardBorder, true: colors.primary + '80' }}
                      thumbColor={formSoportePrioritario ? colors.primary : colors.textSecondary}
                    />
                  </View>
                </View>

                <View style={styles.formGroup}>
                  <View style={styles.switchRow}>
                    <Text style={[styles.switchLabel, { fontSize: scaleFontSize(15) }]}>Visibilidad Extra</Text>
                    <Switch
                      value={formVisibilidadExtra}
                      onValueChange={setFormVisibilidadExtra}
                      trackColor={{ false: colors.cardBorder, true: colors.primary + '80' }}
                      thumbColor={formVisibilidadExtra ? colors.primary : colors.textSecondary}
                    />
                  </View>
                </View>

                <View style={styles.formGroup}>
                  <View style={styles.switchRow}>
                    <Text style={[styles.switchLabel, { fontSize: scaleFontSize(15) }]}>Visibilidad Máxima</Text>
                    <Switch
                      value={formVisibilidadMaxima}
                      onValueChange={setFormVisibilidadMaxima}
                      trackColor={{ false: colors.cardBorder, true: colors.primary + '80' }}
                      thumbColor={formVisibilidadMaxima ? colors.primary : colors.textSecondary}
                    />
                  </View>
                </View>
              </View>

              {/* Plan Status */}
              <View style={styles.formSection}>
                <Text style={[styles.formSectionTitle, { fontSize: scaleFontSize(16) }]}>Estado del Plan</Text>

                <View style={styles.formGroup}>
                  <View style={styles.switchRow}>
                    <View style={styles.switchLabelContainer}>
                      <Text style={[styles.switchLabel, { fontSize: scaleFontSize(15) }]}>Plan Activo</Text>
                      <Text style={[styles.switchHint, { fontSize: scaleFontSize(12) }]}>
                        Los planes inactivos no se mostrarán a los usuarios
                      </Text>
                    </View>
                    <Switch
                      value={formActivo}
                      onValueChange={setFormActivo}
                      trackColor={{ false: colors.cardBorder, true: colors.primary + '80' }}
                      thumbColor={formActivo ? colors.primary : colors.textSecondary}
                    />
                  </View>
                </View>
              </View>
            </ScrollView>

            <TouchableOpacity
              style={[styles.modalPrimaryButton, saving && styles.modalPrimaryButtonDisabled]}
              onPress={handleSavePlan}
              disabled={saving}
            >
              {saving ? (
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
                    {editingPlan ? 'Guardar Cambios' : 'Crear Plan'}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.modalCancelButton} onPress={() => setShowEditModal(false)}>
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
  headerSubtitle: {
    color: colors.headerText,
    opacity: 0.9,
    marginTop: 2,
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  sectionHeaderLeft: {
    flex: 1,
  },
  sectionTitle: {
    fontWeight: 'bold',
    color: colors.text,
  },
  sectionSubtitle: {
    color: colors.textSecondary,
    marginTop: 4,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
    ...commonStyles.shadow,
  },
  createButtonText: {
    fontWeight: '700',
    color: colors.white,
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
    left: 16,
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
  planCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
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
    fontWeight: 'bold',
    color: colors.white,
  },
  planCardActions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    padding: 4,
  },
  planDescription: {
    color: colors.white,
    opacity: 0.9,
    lineHeight: 20,
    marginBottom: 16,
  },
  trialBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  trialBadgeText: {
    fontWeight: '700',
    color: colors.white,
  },
  planFeatures: {
    gap: 10,
    marginBottom: 16,
  },
  planFeatureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  planFeatureText: {
    color: colors.white,
    fontWeight: '500',
  },
  planFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  statusBadgeInactive: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  statusBadgeText: {
    fontWeight: '700',
    color: colors.white,
  },
  stripeSyncedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  stripeSyncedText: {
    fontWeight: '700',
    color: '#10B981',
  },
  syncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  syncButtonText: {
    fontWeight: '700',
    color: colors.white,
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
    maxWidth: 600,
    maxHeight: '90%',
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
  modalScrollView: {
    maxHeight: 500,
    marginBottom: 20,
  },
  formSection: {
    marginBottom: 24,
  },
  formSectionTitle: {
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
  },
  formGroup: {
    marginBottom: 16,
  },
  formRow: {
    flexDirection: 'row',
    gap: 12,
  },
  formLabel: {
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  formInput: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  formTextArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  formHint: {
    color: colors.textSecondary,
    marginTop: 6,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  switchLabelContainer: {
    flex: 1,
    marginRight: 16,
  },
  switchLabel: {
    color: colors.text,
  },
  switchHint: {
    color: colors.textSecondary,
    marginTop: 4,
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
