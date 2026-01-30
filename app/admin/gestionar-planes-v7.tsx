
import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  Dimensions,
  Pressable,
  Image,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors, commonStyles } from '@/styles/commonStyles';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { scaleFontSize, scaleIconSize } from '@/utils/androidScaling';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface Plan {
  id: string;
  nombre: string;
  descripcion: string;
  precio_mensual: number;
  activo: boolean;
  caracteristicas: string[];
  eventos_mes: number;
  promos_destacadas: number;
  perfil_social: boolean;
  panel_analisis: boolean;
  soporte_prioritario: boolean;
  visibilidad_extra: boolean;
  visibilidad_maxima: boolean;
  permisos?: Record<string, boolean>;
}

interface LocalSubscription {
  id: string;
  local_id: string;
  plan_id: string;
  estado: 'activa' | 'cancelada' | 'expirada';
  fecha_inicio: string;
  locales: {
    nombre: string;
    imagen_url: string | null;
  };
  plan: {
    nombre: string;
  };
}

interface Local {
  id: string;
  nombre: string;
  imagen_url: string | null;
  provincia: string;
  tipo: string;
  direccion: string;
  propietario_id: string | null;
}

/**
 * ✅ GESTIONAR PLANES v243.0 - FIXED KEYBOARD FOCUS LOSS (FINAL FIX)
 * 
 * CRITICAL FIXES v243.0:
 * - ✅ FIXED: TextInput is DIRECTLY in return (no conditional rendering)
 * - ✅ FIXED: Controlled component with value={searchQuery}
 * - ✅ FIXED: Debounce with useEffect + cleanup (300ms)
 * - ✅ FIXED: Separate states: searchQuery (immediate) vs debouncedQuery (filtered)
 * - ✅ FIXED: ScrollView has keyboardShouldPersistTaps="handled"
 * - ✅ FIXED: TextInput has blurOnSubmit={false}
 * - ✅ FIXED: Applied same pattern as working Explorar screen
 */

export default function GestionarPlanesV7Screen() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [planes, setPlanes] = useState<Plan[]>([]);
  const [subscriptions, setSubscriptions] = useState<LocalSubscription[]>([]);
  const [activeTab, setActiveTab] = useState<'planes' | 'subscriptions' | 'assign'>('planes');
  
  const [showAssignModal, setShowAssignModal] = useState(false);
  
  // ✅ CRITICAL v243.0: Controlled input state (STABLE)
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  
  const [searchResults, setSearchResults] = useState<Local[]>([]);
  const [selectedLocal, setSelectedLocal] = useState<Local | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<string>('');
  const [assigning, setAssigning] = useState(false);
  const [searching, setSearching] = useState(false);

  const [showEditPlanModal, setShowEditPlanModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [editPlanNombre, setEditPlanNombre] = useState('');
  const [editPlanDescripcion, setEditPlanDescripcion] = useState('');
  const [editPlanPrecio, setEditPlanPrecio] = useState('');
  const [editPlanEventos, setEditPlanEventos] = useState('');
  const [editPlanPromos, setEditPlanPromos] = useState('');
  const [editPlanActivo, setEditPlanActivo] = useState(true);
  const [editPlanPerfilSocial, setEditPlanPerfilSocial] = useState(false);
  const [editPlanPanelAnalisis, setEditPlanPanelAnalisis] = useState(false);
  const [editPlanSoportePrioritario, setEditPlanSoportePrioritario] = useState(false);
  const [editPlanVisibilidadExtra, setEditPlanVisibilidadExtra] = useState(false);
  const [editPlanVisibilidadMaxima, setEditPlanVisibilidadMaxima] = useState(false);
  const [savingPlan, setSavingPlan] = useState(false);

  const [showCreatePlanModal, setShowCreatePlanModal] = useState(false);
  const [createPlanNombre, setCreatePlanNombre] = useState('');
  const [createPlanDescripcion, setCreatePlanDescripcion] = useState('');
  const [createPlanPrecio, setCreatePlanPrecio] = useState('');
  const [createPlanEventos, setCreatePlanEventos] = useState('');
  const [createPlanPromos, setCreatePlanPromos] = useState('');
  const [createPlanActivo, setCreatePlanActivo] = useState(true);
  const [createPlanPerfilSocial, setCreatePlanPerfilSocial] = useState(false);
  const [createPlanPanelAnalisis, setCreatePlanPanelAnalisis] = useState(false);
  const [createPlanSoportePrioritario, setCreatePlanSoportePrioritario] = useState(false);
  const [createPlanVisibilidadExtra, setCreatePlanVisibilidadExtra] = useState(false);
  const [createPlanVisibilidadMaxima, setCreatePlanVisibilidadMaxima] = useState(false);
  const [creatingPlan, setCreatingPlan] = useState(false);

  // ✅ CRITICAL FIX v243.0: Debounce with cleanup (300ms)
  useEffect(() => {
    console.log('[GestionarPlanesV7 v243.0] 📝 Search query changed:', searchQuery);
    
    const timer = setTimeout(() => {
      console.log('[GestionarPlanesV7 v243.0] 🔍 Applying debounced search');
      setDebouncedQuery(searchQuery);
    }, 300);
    
    // Cleanup function - CRITICAL for preventing focus loss
    return () => {
      clearTimeout(timer);
    };
  }, [searchQuery]);

  const cargarPlanes = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('planes_suscripcion')
        .select('*')
        .order('precio_mensual', { ascending: true });

      if (error) throw error;

      console.log('[GestionarPlanesV7 v243.0] ✅ Loaded planes:', data?.length || 0);
      setPlanes(data || []);
    } catch (error) {
      console.error('[GestionarPlanesV7 v243.0] Error cargando planes:', error);
      Alert.alert('Error', 'No se pudieron cargar los planes');
    }
  }, []);

  const cargarSuscripciones = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('suscripciones_locales')
        .select(`
          id,
          local_id,
          plan_id,
          estado,
          fecha_inicio,
          locales (nombre, imagen_url),
          plan:planes_suscripcion!suscripciones_locales_plan_id_fkey (nombre)
        `)
        .order('fecha_inicio', { ascending: false })
        .limit(50);

      if (error) throw error;

      console.log('[GestionarPlanesV7 v243.0] ✅ Loaded subscriptions:', data?.length || 0);
      setSubscriptions(data || []);
    } catch (error) {
      console.error('[GestionarPlanesV7 v243.0] Error cargando suscripciones:', error);
      Alert.alert('Error', 'No se pudieron cargar las suscripciones');
    }
  }, []);

  const cargarDatos = useCallback(async () => {
    setLoading(true);
    await Promise.all([cargarPlanes(), cargarSuscripciones()]);
    setLoading(false);
  }, [cargarPlanes, cargarSuscripciones]);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  const buscarLocales = useCallback(async (query: string) => {
    if (query.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const { data, error } = await supabase
        .from('locales')
        .select('id, nombre, imagen_url, provincia, tipo, direccion, propietario_id')
        .ilike('nombre', `%${query}%`)
        .eq('activo', true)
        .limit(20);

      if (error) throw error;

      setSearchResults(data || []);
    } catch (error) {
      console.error('[GestionarPlanesV7 v243.0] Error buscando locales:', error);
    } finally {
      setSearching(false);
    }
  }, []);

  // ✅ CRITICAL v243.0: Search when debounced query changes
  useEffect(() => {
    if (debouncedQuery.trim().length >= 2) {
      buscarLocales(debouncedQuery);
    } else {
      setSearchResults([]);
    }
  }, [debouncedQuery, buscarLocales]);

  const asignarPlan = async () => {
    if (!selectedLocal || !selectedPlan) {
      Alert.alert('Error', 'Debes seleccionar un local y un plan');
      return;
    }

    setAssigning(true);
    try {
      const { data: existingSubscription } = await supabase
        .from('suscripciones_locales')
        .select('id, estado')
        .eq('local_id', selectedLocal.id)
        .eq('estado', 'activa')
        .single();

      if (existingSubscription) {
        Alert.alert(
          'Suscripción Existente',
          'Este local ya tiene una suscripción activa. ¿Deseas cancelarla y crear una nueva?',
          [
            { text: 'Cancelar', style: 'cancel', onPress: () => setAssigning(false) },
            {
              text: 'Continuar',
              onPress: async () => {
                await supabase
                  .from('suscripciones_locales')
                  .update({ estado: 'cancelada' })
                  .eq('id', existingSubscription.id);

                await crearNuevaSuscripcion();
              },
            },
          ]
        );
        return;
      }

      await crearNuevaSuscripcion();
    } catch (error) {
      console.error('[GestionarPlanesV7 v243.0] Error asignando plan:', error);
      Alert.alert('Error', 'No se pudo asignar el plan');
      setAssigning(false);
    }
  };

  const crearNuevaSuscripcion = async () => {
    if (!selectedLocal || !selectedPlan || !user) return;

    try {
      const plan = planes.find(p => p.id === selectedPlan);
      if (!plan) throw new Error('Plan no encontrado');

      const fechaInicio = new Date();
      const nextMonth = new Date(fechaInicio);
      nextMonth.setMonth(nextMonth.getMonth() + 1);

      const propietarioId = selectedLocal.propietario_id || user.id;

      console.log('[GestionarPlanesV7 v243.0] ✅ Creating subscription:', {
        usuario_id: propietarioId,
        propietario_id: propietarioId,
        local_id: selectedLocal.id,
        plan_id: selectedPlan,
        estado: 'activa',
        fecha_inicio: fechaInicio.toISOString(),
      });

      const { data: existingActive, error: checkError } = await supabase
        .from('suscripciones_locales')
        .select('id, estado')
        .eq('usuario_id', propietarioId)
        .eq('local_id', selectedLocal.id)
        .maybeSingle();

      if (checkError && checkError.code !== 'PGRST116') {
        console.error('[GestionarPlanesV7 v243.0] Error checking existing subscription:', checkError);
        throw checkError;
      }

      if (existingActive) {
        console.log('[GestionarPlanesV7 v243.0] Updating existing subscription:', existingActive.id);
        
        const { error: updateError } = await supabase
          .from('suscripciones_locales')
          .update({
            plan_id: selectedPlan,
            estado: 'activa',
            fecha_inicio: fechaInicio.toISOString(),
            fecha_proximo_pago: nextMonth.toISOString(),
            fecha_renovacion_creditos: nextMonth.toISOString(),
            eventos_usados_mes: 0,
            promos_usadas_mes: 0,
            creditos_destacados_restantes: plan.promos_destacadas || 0,
            creditos_eventos_restantes: plan.eventos_mes || 0,
            ultimo_reset_contador: fechaInicio.toISOString(),
            updated_at: fechaInicio.toISOString(),
          })
          .eq('id', existingActive.id);

        if (updateError) {
          console.error('[GestionarPlanesV7 v243.0] Update error:', updateError);
          throw updateError;
        }
      } else {
        const { error: subscriptionError } = await supabase
          .from('suscripciones_locales')
          .insert({
            usuario_id: propietarioId,
            propietario_id: propietarioId,
            local_id: selectedLocal.id,
            plan_id: selectedPlan,
            estado: 'activa',
            fecha_inicio: fechaInicio.toISOString(),
            fecha_proximo_pago: nextMonth.toISOString(),
            fecha_renovacion_creditos: nextMonth.toISOString(),
            eventos_usados_mes: 0,
            promos_usadas_mes: 0,
            creditos_destacados_restantes: plan.promos_destacadas || 0,
            creditos_eventos_restantes: plan.eventos_mes || 0,
            ultimo_reset_contador: fechaInicio.toISOString(),
          });

        if (subscriptionError) {
          console.error('[GestionarPlanesV7 v243.0] Subscription error:', subscriptionError);
          throw subscriptionError;
        }
      }

      const { error: localError } = await supabase
        .from('locales')
        .update({ activo: true })
        .eq('id', selectedLocal.id);

      if (localError) {
        console.error('[GestionarPlanesV7 v243.0] Error habilitando local:', localError);
      }

      Alert.alert(
        '✅ Plan Asignado',
        `El plan "${plan.nombre}" ha sido asignado correctamente a "${selectedLocal.nombre}".\n\nEl perfil del local se ha activado automáticamente.`
      );

      setShowAssignModal(false);
      setSelectedLocal(null);
      setSelectedPlan('');
      setSearchQuery('');
      setDebouncedQuery('');
      setSearchResults([]);
      await cargarDatos();
    } catch (error) {
      console.error('[GestionarPlanesV7 v243.0] Error creando suscripción:', error);
      Alert.alert('Error', 'No se pudo crear la suscripción');
    } finally {
      setAssigning(false);
    }
  };

  const cancelarSuscripcion = async (subscriptionId: string, localName: string) => {
    Alert.alert(
      'Cancelar Suscripción',
      `¿Estás seguro de que quieres cancelar la suscripción de "${localName}"?`,
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Sí, cancelar',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('suscripciones_locales')
                .update({ estado: 'cancelada' })
                .eq('id', subscriptionId);

              if (error) throw error;

              Alert.alert('Éxito', 'Suscripción cancelada correctamente');
              await cargarSuscripciones();
            } catch (error) {
              console.error('[GestionarPlanesV7 v243.0] Error cancelando suscripción:', error);
              Alert.alert('Error', 'No se pudo cancelar la suscripción');
            }
          },
        },
      ]
    );
  };

  const handleEditPlan = (plan: Plan) => {
    setEditingPlan(plan);
    setEditPlanNombre(plan.nombre);
    setEditPlanDescripcion(plan.descripcion || '');
    setEditPlanPrecio(plan.precio_mensual?.toString() || '0');
    setEditPlanEventos(plan.eventos_mes?.toString() || '0');
    setEditPlanPromos(plan.promos_destacadas?.toString() || '0');
    setEditPlanActivo(Boolean(plan.activo));
    setEditPlanPerfilSocial(Boolean(plan.perfil_social));
    setEditPlanPanelAnalisis(Boolean(plan.panel_analisis));
    setEditPlanSoportePrioritario(Boolean(plan.soporte_prioritario));
    setEditPlanVisibilidadExtra(Boolean(plan.visibilidad_extra));
    setEditPlanVisibilidadMaxima(Boolean(plan.visibilidad_maxima));
    setShowEditPlanModal(true);
  };

  const handleSavePlan = async () => {
    if (!editingPlan) return;

    if (!editPlanNombre.trim()) {
      Alert.alert('Error', 'El nombre del plan es obligatorio');
      return;
    }

    const precio = parseFloat(editPlanPrecio) || 0;
    const eventos = parseInt(editPlanEventos, 10) || 0;
    const promos = parseInt(editPlanPromos, 10) || 0;

    if (precio < 0) {
      Alert.alert('Error', 'El precio no puede ser negativo');
      return;
    }

    setSavingPlan(true);
    try {
      const updateData = {
        nombre: editPlanNombre.trim(),
        descripcion: editPlanDescripcion.trim(),
        precio_mensual: precio,
        eventos_mes: eventos,
        promos_destacadas: promos,
        activo: Boolean(editPlanActivo),
        perfil_social: Boolean(editPlanPerfilSocial),
        panel_analisis: Boolean(editPlanPanelAnalisis),
        soporte_prioritario: Boolean(editPlanSoportePrioritario),
        visibilidad_extra: Boolean(editPlanVisibilidadExtra),
        visibilidad_maxima: Boolean(editPlanVisibilidadMaxima),
      };

      console.log('[GestionarPlanesV7 v243.0] ✅ Updating plan with data:', updateData);

      const { error } = await supabase
        .from('planes_suscripcion')
        .update(updateData)
        .eq('id', editingPlan.id);

      if (error) {
        console.error('[GestionarPlanesV7 v243.0] Error updating plan:', error);
        throw error;
      }

      Alert.alert('✅ Éxito', 'Plan actualizado correctamente');
      setShowEditPlanModal(false);
      setEditingPlan(null);
      await cargarPlanes();
    } catch (error) {
      console.error('[GestionarPlanesV7 v243.0] Error guardando plan:', error);
      Alert.alert('Error', 'No se pudo guardar el plan');
    } finally {
      setSavingPlan(false);
    }
  };

  const handleCreatePlan = async () => {
    if (!createPlanNombre.trim()) {
      Alert.alert('Error', 'El nombre del plan es obligatorio');
      return;
    }

    const precio = parseFloat(createPlanPrecio) || 0;
    const eventos = parseInt(createPlanEventos, 10) || 0;
    const promos = parseInt(createPlanPromos, 10) || 0;

    if (precio < 0) {
      Alert.alert('Error', 'El precio no puede ser negativo');
      return;
    }

    setCreatingPlan(true);
    try {
      const insertData = {
        nombre: createPlanNombre.trim(),
        descripcion: createPlanDescripcion.trim(),
        precio_mensual: precio,
        eventos_mes: eventos,
        promos_destacadas: promos,
        activo: Boolean(createPlanActivo),
        perfil_social: Boolean(createPlanPerfilSocial),
        panel_analisis: Boolean(createPlanPanelAnalisis),
        soporte_prioritario: Boolean(createPlanSoportePrioritario),
        visibilidad_extra: Boolean(createPlanVisibilidadExtra),
        visibilidad_maxima: Boolean(createPlanVisibilidadMaxima),
        caracteristicas: [],
      };

      console.log('[GestionarPlanesV7 v243.0] ✅ Creating plan with data:', insertData);

      const { error } = await supabase
        .from('planes_suscripcion')
        .insert(insertData);

      if (error) {
        console.error('[GestionarPlanesV7 v243.0] Error creating plan:', error);
        throw error;
      }

      Alert.alert('✅ Éxito', 'Plan creado correctamente');
      setShowCreatePlanModal(false);
      resetCreatePlanForm();
      await cargarPlanes();
    } catch (error) {
      console.error('[GestionarPlanesV7 v243.0] Error creando plan:', error);
      Alert.alert('Error', 'No se pudo crear el plan');
    } finally {
      setCreatingPlan(false);
    }
  };

  const resetCreatePlanForm = () => {
    setCreatePlanNombre('');
    setCreatePlanDescripcion('');
    setCreatePlanPrecio('');
    setCreatePlanEventos('');
    setCreatePlanPromos('');
    setCreatePlanActivo(true);
    setCreatePlanPerfilSocial(false);
    setCreatePlanPanelAnalisis(false);
    setCreatePlanSoportePrioritario(false);
    setCreatePlanVisibilidadExtra(false);
    setCreatePlanVisibilidadMaxima(false);
  };

  const handleDeletePlan = async (planId: string, planName: string) => {
    Alert.alert(
      'Eliminar Plan',
      `¿Estás seguro de que quieres eliminar el plan "${planName}"? Esta acción no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              const { count } = await supabase
                .from('suscripciones_locales')
                .select('*', { count: 'exact', head: true })
                .eq('plan_id', planId)
                .eq('estado', 'activa');

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
                .eq('id', planId);

              if (error) throw error;

              Alert.alert('✅ Éxito', 'Plan eliminado correctamente');
              await cargarPlanes();
            } catch (error) {
              console.error('[GestionarPlanesV7 v243.0] Error eliminando plan:', error);
              Alert.alert('Error', 'No se pudo eliminar el plan');
            }
          },
        },
      ]
    );
  };

  const getEstadoBadge = (estado: string) => {
    const badges: Record<string, { color: string; text: string; icon: string; androidIcon: string }> = {
      activa: { color: '#10B981', text: 'Activa', icon: 'checkmark.circle.fill', androidIcon: 'check_circle' },
      cancelada: { color: '#EF4444', text: 'Cancelada', icon: 'xmark.circle.fill', androidIcon: 'cancel' },
      expirada: { color: '#F59E0B', text: 'Expirada', icon: 'clock.fill', androidIcon: 'schedule' },
    };

    const badge = badges[estado] || badges.activa;

    return (
      <View style={[styles.estadoBadgeV7, { backgroundColor: badge.color + '15' }]}>
        <IconSymbol 
          ios_icon_name={badge.icon} 
          android_material_icon_name={badge.androidIcon} 
          size={Platform.OS === 'android' ? scaleIconSize(14) : 14} 
          color={badge.color} 
        />
        <Text style={[styles.estadoBadgeTextV7, { color: badge.color, fontSize: scaleFontSize(13) }]}>{badge.text}</Text>
      </View>
    );
  };

  const renderPlanesTab = () => (
    <ScrollView 
      style={styles.tabContent} 
      contentContainerStyle={styles.tabContentContainer}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.sectionHeaderV7}>
        <View style={styles.sectionHeaderLeft}>
          <Text style={[styles.sectionTitleV7, { fontSize: scaleFontSize(24) }]}>Planes Disponibles</Text>
          <Text style={[styles.sectionSubtitleV7, { fontSize: scaleFontSize(15) }]}>{planes.length} planes configurados</Text>
        </View>
        <TouchableOpacity
          style={styles.createButtonV7}
          onPress={() => setShowCreatePlanModal(true)}
        >
          <IconSymbol 
            ios_icon_name="plus.circle.fill" 
            android_material_icon_name="add_circle" 
            size={Platform.OS === 'android' ? scaleIconSize(22) : 22} 
            color={colors.white} 
          />
          <Text style={[styles.createButtonTextV7, { fontSize: scaleFontSize(15) }]}>Nuevo Plan</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.planesGridV7}>
        {planes.map((plan) => (
          <View key={plan.id} style={styles.planCardV7}>
            <LinearGradient
              colors={plan.activo ? [colors.primary, colors.primary + 'DD'] : ['#6B7280', '#4B5563']}
              style={styles.planCardGradient}
            >
              <View style={styles.planCardHeader}>
                <View style={styles.planCardHeaderLeft}>
                  <Text style={[styles.planNameV7, { fontSize: scaleFontSize(22) }]}>{plan.nombre}</Text>
                  <Text style={[styles.planPriceV7, { fontSize: scaleFontSize(28) }]}>
                    {plan.precio_mensual === 0 ? 'Gratis' : `${plan.precio_mensual}€/mes`}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.editIconButtonV7}
                  onPress={() => handleEditPlan(plan)}
                >
                  <IconSymbol 
                    ios_icon_name="pencil.circle.fill" 
                    android_material_icon_name="edit" 
                    size={Platform.OS === 'android' ? scaleIconSize(28) : 28} 
                    color={colors.white} 
                  />
                </TouchableOpacity>
              </View>

              {plan.descripcion && (
                <Text style={[styles.planDescriptionV7, { fontSize: scaleFontSize(15) }]} numberOfLines={2}>
                  {plan.descripcion}
                </Text>
              )}

              <View style={styles.planFeaturesV7}>
                {plan.eventos_mes > 0 && (
                  <View style={styles.planFeatureItemV7}>
                    <View style={styles.planFeatureIconV7}>
                      <IconSymbol 
                        ios_icon_name="calendar.badge.plus" 
                        android_material_icon_name="event" 
                        size={Platform.OS === 'android' ? scaleIconSize(18) : 18} 
                        color={colors.white} 
                      />
                    </View>
                    <Text style={[styles.planFeatureTextV7, { fontSize: scaleFontSize(15) }]}>{plan.eventos_mes} eventos/mes</Text>
                  </View>
                )}
                {plan.promos_destacadas > 0 && (
                  <View style={styles.planFeatureItemV7}>
                    <View style={styles.planFeatureIconV7}>
                      <IconSymbol 
                        ios_icon_name="star.fill" 
                        android_material_icon_name="star" 
                        size={Platform.OS === 'android' ? scaleIconSize(18) : 18} 
                        color={colors.white} 
                      />
                    </View>
                    <Text style={[styles.planFeatureTextV7, { fontSize: scaleFontSize(15) }]}>{plan.promos_destacadas} promos destacadas</Text>
                  </View>
                )}
                {plan.perfil_social && (
                  <View style={styles.planFeatureItemV7}>
                    <View style={styles.planFeatureIconV7}>
                      <IconSymbol 
                        ios_icon_name="person.2.fill" 
                        android_material_icon_name="people" 
                        size={Platform.OS === 'android' ? scaleIconSize(18) : 18} 
                        color={colors.white} 
                      />
                    </View>
                    <Text style={[styles.planFeatureTextV7, { fontSize: scaleFontSize(15) }]}>Perfil social completo</Text>
                  </View>
                )}
                {plan.panel_analisis && (
                  <View style={styles.planFeatureItemV7}>
                    <View style={styles.planFeatureIconV7}>
                      <IconSymbol 
                        ios_icon_name="chart.bar.fill" 
                        android_material_icon_name="bar_chart" 
                        size={Platform.OS === 'android' ? scaleIconSize(18) : 18} 
                        color={colors.white} 
                      />
                    </View>
                    <Text style={[styles.planFeatureTextV7, { fontSize: scaleFontSize(15) }]}>Panel de análisis</Text>
                  </View>
                )}
                {plan.soporte_prioritario && (
                  <View style={styles.planFeatureItemV7}>
                    <View style={styles.planFeatureIconV7}>
                      <IconSymbol 
                        ios_icon_name="headphones" 
                        android_material_icon_name="support_agent" 
                        size={Platform.OS === 'android' ? scaleIconSize(18) : 18} 
                        color={colors.white} 
                      />
                    </View>
                    <Text style={[styles.planFeatureTextV7, { fontSize: scaleFontSize(15) }]}>Soporte prioritario</Text>
                  </View>
                )}
                {plan.visibilidad_maxima && (
                  <View style={styles.planFeatureItemV7}>
                    <View style={styles.planFeatureIconV7}>
                      <IconSymbol 
                        ios_icon_name="sparkles" 
                        android_material_icon_name="auto_awesome" 
                        size={Platform.OS === 'android' ? scaleIconSize(18) : 18} 
                        color={colors.white} 
                      />
                    </View>
                    <Text style={[styles.planFeatureTextV7, { fontSize: scaleFontSize(15) }]}>Visibilidad máxima</Text>
                  </View>
                )}
              </View>

              <View style={styles.planCardFooter}>
                <View style={[styles.planStatusBadgeV7, plan.activo ? styles.planStatusActiveV7 : styles.planStatusInactiveV7]}>
                  <IconSymbol 
                    ios_icon_name={plan.activo ? 'checkmark.circle.fill' : 'xmark.circle.fill'} 
                    android_material_icon_name={plan.activo ? 'check_circle' : 'cancel'} 
                    size={Platform.OS === 'android' ? scaleIconSize(14) : 14} 
                    color={colors.white} 
                  />
                  <Text style={[styles.planStatusTextV7, { fontSize: scaleFontSize(13) }]}>
                    {plan.activo ? 'Activo' : 'Inactivo'}
                  </Text>
                </View>
              </View>
            </LinearGradient>
          </View>
        ))}
      </View>
    </ScrollView>
  );

  const renderSubscriptionsTab = () => (
    <ScrollView 
      style={styles.tabContent} 
      contentContainerStyle={styles.tabContentContainer}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.sectionHeaderV7}>
        <View style={styles.sectionHeaderLeft}>
          <Text style={[styles.sectionTitleV7, { fontSize: scaleFontSize(24) }]}>Suscripciones</Text>
          <Text style={[styles.sectionSubtitleV7, { fontSize: scaleFontSize(15) }]}>{subscriptions.length} suscripciones registradas</Text>
        </View>
      </View>

      {subscriptions.length === 0 ? (
        <View style={styles.emptyStateV7}>
          <IconSymbol 
            ios_icon_name="creditcard" 
            android_material_icon_name="payment" 
            size={Platform.OS === 'android' ? scaleIconSize(64) : 64} 
            color={colors.textSecondary} 
          />
          <Text style={[styles.emptyTextV7, { fontSize: scaleFontSize(20) }]}>No hay suscripciones</Text>
          <Text style={[styles.emptySubtextV7, { fontSize: scaleFontSize(15) }]}>Las suscripciones aparecerán aquí cuando asignes planes a locales</Text>
        </View>
      ) : (
        <View style={styles.subscriptionsListV7}>
          {subscriptions.map((subscription) => (
            <View key={subscription.id} style={styles.subscriptionCardV7}>
              <View style={styles.subscriptionCardHeader}>
                <View style={styles.subscriptionCardHeaderLeft}>
                  <Text style={[styles.subscriptionLocalNameV7, { fontSize: scaleFontSize(18) }]}>{subscription.locales.nombre}</Text>
                  <Text style={[styles.subscriptionPlanNameV7, { fontSize: scaleFontSize(15) }]}>
                    {subscription.plan.nombre}
                  </Text>
                </View>
                {getEstadoBadge(subscription.estado)}
              </View>

              <View style={styles.subscriptionCardBody}>
                <View style={styles.subscriptionInfoRow}>
                  <IconSymbol 
                    ios_icon_name="calendar" 
                    android_material_icon_name="event" 
                    size={Platform.OS === 'android' ? scaleIconSize(18) : 18} 
                    color={colors.textSecondary} 
                  />
                  <Text style={[styles.subscriptionInfoText, { fontSize: scaleFontSize(14) }]}>
                    Inicio: {new Date(subscription.fecha_inicio).toLocaleDateString('es-ES', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </Text>
                </View>
              </View>

              {subscription.estado === 'activa' && (
                <TouchableOpacity
                  style={styles.cancelSubscriptionButtonV7}
                  onPress={() => cancelarSuscripcion(subscription.id, subscription.locales.nombre)}
                >
                  <IconSymbol 
                    ios_icon_name="xmark.circle.fill" 
                    android_material_icon_name="cancel" 
                    size={Platform.OS === 'android' ? scaleIconSize(20) : 20} 
                    color="#EF4444" 
                  />
                  <Text style={[styles.cancelSubscriptionTextV7, { fontSize: scaleFontSize(15) }]}>Cancelar Suscripción</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );

  const renderAssignTab = () => (
    <View style={styles.tabContent}>
      <ScrollView 
        contentContainerStyle={styles.tabContentContainer}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.sectionHeaderV7}>
          <View style={styles.sectionHeaderLeft}>
            <Text style={[styles.sectionTitleV7, { fontSize: scaleFontSize(24) }]}>Asignar Plan</Text>
            <Text style={[styles.sectionSubtitleV7, { fontSize: scaleFontSize(15) }]}>Conecta locales con planes de suscripción</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.assignButtonV7}
          onPress={() => setShowAssignModal(true)}
        >
          <LinearGradient
            colors={[colors.primary, colors.primary + 'DD']}
            style={styles.assignButtonGradient}
          >
            <IconSymbol 
              ios_icon_name="plus.circle.fill" 
              android_material_icon_name="add_circle" 
              size={Platform.OS === 'android' ? scaleIconSize(32) : 32} 
              color={colors.white} 
            />
            <Text style={[styles.assignButtonTextV7, { fontSize: scaleFontSize(18) }]}>Asignar Nuevo Plan a Local</Text>
          </LinearGradient>
        </TouchableOpacity>

        <View style={styles.infoBoxV7}>
          <View style={styles.infoBoxIcon}>
            <IconSymbol 
              ios_icon_name="info.circle.fill" 
              android_material_icon_name="info" 
              size={Platform.OS === 'android' ? scaleIconSize(24) : 24} 
              color={colors.primary} 
            />
          </View>
          <View style={styles.infoBoxContent}>
            <Text style={[styles.infoBoxTitle, { fontSize: scaleFontSize(16) }]}>Activación Automática</Text>
            <Text style={[styles.infoBoxText, { fontSize: scaleFontSize(14) }]}>
              Al asignar un plan a un local, su perfil se activará automáticamente en la plataforma BarLive y en la red social.
            </Text>
          </View>
        </View>

        <View style={styles.quickStatsV7}>
          <View style={styles.quickStatCard}>
            <Text style={[styles.quickStatNumber, { fontSize: scaleFontSize(32) }]}>{planes.filter(p => p.activo).length}</Text>
            <Text style={[styles.quickStatLabel, { fontSize: scaleFontSize(13) }]}>Planes Activos</Text>
          </View>
          <View style={styles.quickStatCard}>
            <Text style={[styles.quickStatNumber, { fontSize: scaleFontSize(32) }]}>{subscriptions.filter(s => s.estado === 'activa').length}</Text>
            <Text style={[styles.quickStatLabel, { fontSize: scaleFontSize(13) }]}>Suscripciones Activas</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={[colors.headerGradientStart, colors.headerGradientEnd]} style={styles.headerV7}>
          <TouchableOpacity style={styles.backButtonV7} onPress={() => router.back()}>
            <IconSymbol 
              ios_icon_name="chevron.left" 
              android_material_icon_name="arrow_back" 
              size={Platform.OS === 'android' ? scaleIconSize(28) : 28} 
              color={colors.headerText} 
            />
          </TouchableOpacity>
          <View style={styles.headerContentV7}>
            <Text style={[styles.headerTitleV7, { fontSize: scaleFontSize(24) }]}>Gestionar Planes</Text>
            <Text style={[styles.headerSubtitleV7, { fontSize: scaleFontSize(13) }]}>Versión 7.4</Text>
          </View>
          <View style={{ width: 28 }} />
        </LinearGradient>

        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { fontSize: scaleFontSize(16) }]}>Cargando datos...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={[colors.headerGradientStart, colors.headerGradientEnd]} style={styles.headerV7}>
        <TouchableOpacity style={styles.backButtonV7} onPress={() => router.back()}>
          <IconSymbol 
            ios_icon_name="chevron.left" 
            android_material_icon_name="arrow_back" 
            size={Platform.OS === 'android' ? scaleIconSize(28) : 28} 
            color={colors.headerText} 
          />
        </TouchableOpacity>
        <View style={styles.headerContentV7}>
          <Text style={[styles.headerTitleV7, { fontSize: scaleFontSize(24) }]}>Gestionar Planes</Text>
          <Text style={[styles.headerSubtitleV7, { fontSize: scaleFontSize(13) }]}>v243 • Search Fix</Text>
        </View>
        <TouchableOpacity style={styles.refreshButtonV7} onPress={cargarDatos}>
          <IconSymbol 
            ios_icon_name="arrow.clockwise" 
            android_material_icon_name="refresh" 
            size={Platform.OS === 'android' ? scaleIconSize(28) : 28} 
            color={colors.headerText} 
          />
        </TouchableOpacity>
      </LinearGradient>

      <View style={styles.tabsV7}>
        <TouchableOpacity
          style={[styles.tabV7, activeTab === 'planes' && styles.tabActiveV7]}
          onPress={() => setActiveTab('planes')}
        >
          <IconSymbol
            ios_icon_name="list.bullet.rectangle.fill"
            android_material_icon_name="list"
            size={Platform.OS === 'android' ? scaleIconSize(22) : 22}
            color={activeTab === 'planes' ? colors.primary : colors.textSecondary}
          />
          <Text style={[styles.tabTextV7, { fontSize: scaleFontSize(15) }, activeTab === 'planes' && styles.tabTextActiveV7]}>
            Planes
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabV7, activeTab === 'subscriptions' && styles.tabActiveV7]}
          onPress={() => setActiveTab('subscriptions')}
        >
          <IconSymbol
            ios_icon_name="creditcard.fill"
            android_material_icon_name="payment"
            size={Platform.OS === 'android' ? scaleIconSize(22) : 22}
            color={activeTab === 'subscriptions' ? colors.primary : colors.textSecondary}
          />
          <Text style={[styles.tabTextV7, { fontSize: scaleFontSize(15) }, activeTab === 'subscriptions' && styles.tabTextActiveV7]}>
            Suscripciones
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabV7, activeTab === 'assign' && styles.tabActiveV7]}
          onPress={() => setActiveTab('assign')}
        >
          <IconSymbol
            ios_icon_name="plus.app.fill"
            android_material_icon_name="add_circle"
            size={Platform.OS === 'android' ? scaleIconSize(22) : 22}
            color={activeTab === 'assign' ? colors.primary : colors.textSecondary}
          />
          <Text style={[styles.tabTextV7, { fontSize: scaleFontSize(15) }, activeTab === 'assign' && styles.tabTextActiveV7]}>
            Asignar
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'planes' && renderPlanesTab()}
      {activeTab === 'subscriptions' && renderSubscriptionsTab()}
      {activeTab === 'assign' && renderAssignTab()}

      <Modal
        visible={showAssignModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAssignModal(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowAssignModal(false)}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { fontSize: scaleFontSize(20) }]}>Asignar Plan a Local</Text>
              <TouchableOpacity onPress={() => setShowAssignModal(false)}>
                <IconSymbol 
                  ios_icon_name="xmark.circle.fill" 
                  android_material_icon_name="cancel" 
                  size={Platform.OS === 'android' ? scaleIconSize(28) : 28} 
                  color={colors.textSecondary} 
                />
              </TouchableOpacity>
            </View>

            <ScrollView 
              style={styles.modalScrollView} 
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { fontSize: scaleFontSize(14) }]}>Buscar Local</Text>
                {/* ✅ CRITICAL v243.0: Search bar - TextInput is DIRECTLY in return */}
                <View style={styles.searchContainer}>
                  <IconSymbol 
                    ios_icon_name="magnifyingglass" 
                    android_material_icon_name="search" 
                    size={Platform.OS === 'android' ? scaleIconSize(20) : 20} 
                    color={colors.textSecondary} 
                  />
                  <TextInput
                    style={[styles.searchInput, { fontSize: scaleFontSize(16) }]}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholder="Buscar por nombre..."
                    placeholderTextColor={colors.textSecondary}
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="search"
                    blurOnSubmit={false}
                    enablesReturnKeyAutomatically={false}
                  />
                  {searching && <ActivityIndicator size="small" color={colors.primary} />}
                </View>
              </View>

              {selectedLocal && (
                <View style={styles.selectedLocalCard}>
                  <View style={styles.selectedLocalHeader}>
                    <Text style={[styles.selectedLocalLabel, { fontSize: scaleFontSize(12) }]}>Local Seleccionado:</Text>
                    <TouchableOpacity onPress={() => setSelectedLocal(null)}>
                      <IconSymbol 
                        ios_icon_name="xmark.circle.fill" 
                        android_material_icon_name="cancel" 
                        size={Platform.OS === 'android' ? scaleIconSize(20) : 20} 
                        color={colors.textSecondary} 
                      />
                    </TouchableOpacity>
                  </View>
                  <Text style={[styles.selectedLocalName, { fontSize: scaleFontSize(18) }]}>{selectedLocal.nombre}</Text>
                  <Text style={[styles.selectedLocalInfo, { fontSize: scaleFontSize(14) }]}>{selectedLocal.tipo} • {selectedLocal.provincia}</Text>
                </View>
              )}

              {searchResults.length > 0 && !selectedLocal && (
                <View style={styles.searchResultsContainer}>
                  {searchResults.map((local) => (
                    <TouchableOpacity
                      key={local.id}
                      style={styles.searchResultItem}
                      onPress={() => {
                        setSelectedLocal(local);
                        setSearchQuery('');
                        setDebouncedQuery('');
                        setSearchResults([]);
                      }}
                    >
                      {local.imagen_url ? (
                        <Image source={{ uri: local.imagen_url }} style={styles.searchResultImage} />
                      ) : (
                        <View style={[styles.searchResultImage, styles.searchResultImagePlaceholder]}>
                          <IconSymbol 
                            ios_icon_name="building.2.fill" 
                            android_material_icon_name="store" 
                            size={Platform.OS === 'android' ? scaleIconSize(24) : 24} 
                            color={colors.textSecondary} 
                          />
                        </View>
                      )}
                      <View style={styles.searchResultInfo}>
                        <Text style={[styles.searchResultName, { fontSize: scaleFontSize(15) }]}>{local.nombre}</Text>
                        <Text style={[styles.searchResultDetails, { fontSize: scaleFontSize(13) }]}>{local.tipo} • {local.provincia}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { fontSize: scaleFontSize(14) }]}>Seleccionar Plan</Text>
                <View style={styles.planSelector}>
                  {planes.filter(p => p.activo).map((plan) => (
                    <TouchableOpacity
                      key={plan.id}
                      style={[
                        styles.planSelectorItem,
                        selectedPlan === plan.id && styles.planSelectorItemActive
                      ]}
                      onPress={() => setSelectedPlan(plan.id)}
                    >
                      <View style={styles.planSelectorItemContent}>
                        <Text style={[
                          styles.planSelectorItemName,
                          { fontSize: scaleFontSize(16) },
                          selectedPlan === plan.id && styles.planSelectorItemNameActive
                        ]}>
                          {plan.nombre}
                        </Text>
                        <Text style={[
                          styles.planSelectorItemPrice,
                          { fontSize: scaleFontSize(14) },
                          selectedPlan === plan.id && styles.planSelectorItemPriceActive
                        ]}>
                          {plan.precio_mensual === 0 ? 'Gratis' : `${plan.precio_mensual}€/mes`}
                        </Text>
                      </View>
                      {selectedPlan === plan.id && (
                        <IconSymbol 
                          ios_icon_name="checkmark.circle.fill" 
                          android_material_icon_name="check_circle" 
                          size={Platform.OS === 'android' ? scaleIconSize(24) : 24} 
                          color={colors.primary} 
                        />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </ScrollView>

            <TouchableOpacity
              style={[styles.modalPrimaryButton, (!selectedLocal || !selectedPlan || assigning) && styles.modalPrimaryButtonDisabled]}
              onPress={asignarPlan}
              disabled={!selectedLocal || !selectedPlan || assigning}
            >
              {assigning ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <>
                  <IconSymbol 
                    ios_icon_name="checkmark.circle.fill" 
                    android_material_icon_name="check_circle" 
                    size={Platform.OS === 'android' ? scaleIconSize(20) : 20} 
                    color={colors.white} 
                  />
                  <Text style={[styles.modalPrimaryButtonText, { fontSize: scaleFontSize(16) }]}>Asignar Plan</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.modalCancelButton} onPress={() => setShowAssignModal(false)}>
              <Text style={[styles.modalCancelText, { fontSize: scaleFontSize(16) }]}>Cancelar</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={showEditPlanModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowEditPlanModal(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowEditPlanModal(false)}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { fontSize: scaleFontSize(20) }]}>Editar Plan</Text>
              <TouchableOpacity onPress={() => setShowEditPlanModal(false)}>
                <IconSymbol 
                  ios_icon_name="xmark.circle.fill" 
                  android_material_icon_name="cancel" 
                  size={Platform.OS === 'android' ? scaleIconSize(28) : 28} 
                  color={colors.textSecondary} 
                />
              </TouchableOpacity>
            </View>

            <ScrollView 
              style={styles.modalScrollView} 
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { fontSize: scaleFontSize(14) }]}>Nombre del Plan *</Text>
                <TextInput
                  style={[styles.formInput, { fontSize: scaleFontSize(16) }]}
                  value={editPlanNombre}
                  onChangeText={setEditPlanNombre}
                  placeholder="Ej: Premium"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { fontSize: scaleFontSize(14) }]}>Descripción</Text>
                <TextInput
                  style={[styles.formInput, styles.formTextArea, { fontSize: scaleFontSize(16) }]}
                  value={editPlanDescripcion}
                  onChangeText={setEditPlanDescripcion}
                  placeholder="Descripción del plan..."
                  placeholderTextColor={colors.textSecondary}
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { fontSize: scaleFontSize(14) }]}>Precio Mensual (€)</Text>
                <TextInput
                  style={[styles.formInput, { fontSize: scaleFontSize(16) }]}
                  value={editPlanPrecio}
                  onChangeText={setEditPlanPrecio}
                  placeholder="0.00"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="decimal-pad"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { fontSize: scaleFontSize(14) }]}>Eventos por Mes</Text>
                <TextInput
                  style={[styles.formInput, { fontSize: scaleFontSize(16) }]}
                  value={editPlanEventos}
                  onChangeText={setEditPlanEventos}
                  placeholder="0"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="number-pad"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { fontSize: scaleFontSize(14) }]}>Promos Destacadas por Mes</Text>
                <TextInput
                  style={[styles.formInput, { fontSize: scaleFontSize(16) }]}
                  value={editPlanPromos}
                  onChangeText={setEditPlanPromos}
                  placeholder="0"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="number-pad"
                />
              </View>

              <View style={styles.formGroup}>
                <View style={styles.switchRow}>
                  <Text style={[styles.switchLabel, { fontSize: scaleFontSize(16) }]}>Plan Activo</Text>
                  <Switch
                    value={editPlanActivo}
                    onValueChange={setEditPlanActivo}
                    trackColor={{ false: colors.cardBorder, true: colors.primary + '80' }}
                    thumbColor={editPlanActivo ? colors.primary : colors.textSecondary}
                  />
                </View>
              </View>

              <View style={styles.formGroup}>
                <View style={styles.switchRow}>
                  <Text style={[styles.switchLabel, { fontSize: scaleFontSize(16) }]}>Perfil Social Completo</Text>
                  <Switch
                    value={editPlanPerfilSocial}
                    onValueChange={setEditPlanPerfilSocial}
                    trackColor={{ false: colors.cardBorder, true: colors.primary + '80' }}
                    thumbColor={editPlanPerfilSocial ? colors.primary : colors.textSecondary}
                  />
                </View>
              </View>

              <View style={styles.formGroup}>
                <View style={styles.switchRow}>
                  <Text style={[styles.switchLabel, { fontSize: scaleFontSize(16) }]}>Panel de Análisis</Text>
                  <Switch
                    value={editPlanPanelAnalisis}
                    onValueChange={setEditPlanPanelAnalisis}
                    trackColor={{ false: colors.cardBorder, true: colors.primary + '80' }}
                    thumbColor={editPlanPanelAnalisis ? colors.primary : colors.textSecondary}
                  />
                </View>
              </View>

              <View style={styles.formGroup}>
                <View style={styles.switchRow}>
                  <Text style={[styles.switchLabel, { fontSize: scaleFontSize(16) }]}>Soporte Prioritario</Text>
                  <Switch
                    value={editPlanSoportePrioritario}
                    onValueChange={setEditPlanSoportePrioritario}
                    trackColor={{ false: colors.cardBorder, true: colors.primary + '80' }}
                    thumbColor={editPlanSoportePrioritario ? colors.primary : colors.textSecondary}
                  />
                </View>
              </View>

              <View style={styles.formGroup}>
                <View style={styles.switchRow}>
                  <Text style={[styles.switchLabel, { fontSize: scaleFontSize(16) }]}>Visibilidad Extra</Text>
                  <Switch
                    value={editPlanVisibilidadExtra}
                    onValueChange={setEditPlanVisibilidadExtra}
                    trackColor={{ false: colors.cardBorder, true: colors.primary + '80' }}
                    thumbColor={editPlanVisibilidadExtra ? colors.primary : colors.textSecondary}
                  />
                </View>
              </View>

              <View style={styles.formGroup}>
                <View style={styles.switchRow}>
                  <Text style={[styles.switchLabel, { fontSize: scaleFontSize(16) }]}>Visibilidad Máxima</Text>
                  <Switch
                    value={editPlanVisibilidadMaxima}
                    onValueChange={setEditPlanVisibilidadMaxima}
                    trackColor={{ false: colors.cardBorder, true: colors.primary + '80' }}
                    thumbColor={editPlanVisibilidadMaxima ? colors.primary : colors.textSecondary}
                  />
                </View>
              </View>
            </ScrollView>

            <TouchableOpacity
              style={[styles.modalPrimaryButton, savingPlan && styles.modalPrimaryButtonDisabled]}
              onPress={handleSavePlan}
              disabled={savingPlan}
            >
              {savingPlan ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <>
                  <IconSymbol 
                    ios_icon_name="checkmark.circle.fill" 
                    android_material_icon_name="check_circle" 
                    size={Platform.OS === 'android' ? scaleIconSize(20) : 20} 
                    color={colors.white} 
                  />
                  <Text style={[styles.modalPrimaryButtonText, { fontSize: scaleFontSize(16) }]}>Guardar Cambios</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.modalCancelButton} onPress={() => setShowEditPlanModal(false)}>
              <Text style={[styles.modalCancelText, { fontSize: scaleFontSize(16) }]}>Cancelar</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={showCreatePlanModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCreatePlanModal(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowCreatePlanModal(false)}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { fontSize: scaleFontSize(20) }]}>Crear Nuevo Plan</Text>
              <TouchableOpacity onPress={() => setShowCreatePlanModal(false)}>
                <IconSymbol 
                  ios_icon_name="xmark.circle.fill" 
                  android_material_icon_name="cancel" 
                  size={Platform.OS === 'android' ? scaleIconSize(28) : 28} 
                  color={colors.textSecondary} 
                />
              </TouchableOpacity>
            </View>

            <ScrollView 
              style={styles.modalScrollView} 
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { fontSize: scaleFontSize(14) }]}>Nombre del Plan *</Text>
                <TextInput
                  style={[styles.formInput, { fontSize: scaleFontSize(16) }]}
                  value={createPlanNombre}
                  onChangeText={setCreatePlanNombre}
                  placeholder="Ej: Premium"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { fontSize: scaleFontSize(14) }]}>Descripción</Text>
                <TextInput
                  style={[styles.formInput, styles.formTextArea, { fontSize: scaleFontSize(16) }]}
                  value={createPlanDescripcion}
                  onChangeText={setCreatePlanDescripcion}
                  placeholder="Descripción del plan..."
                  placeholderTextColor={colors.textSecondary}
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { fontSize: scaleFontSize(14) }]}>Precio Mensual (€)</Text>
                <TextInput
                  style={[styles.formInput, { fontSize: scaleFontSize(16) }]}
                  value={createPlanPrecio}
                  onChangeText={setCreatePlanPrecio}
                  placeholder="0.00"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="decimal-pad"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { fontSize: scaleFontSize(14) }]}>Eventos por Mes</Text>
                <TextInput
                  style={[styles.formInput, { fontSize: scaleFontSize(16) }]}
                  value={createPlanEventos}
                  onChangeText={setCreatePlanEventos}
                  placeholder="0"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="number-pad"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { fontSize: scaleFontSize(14) }]}>Promos Destacadas por Mes</Text>
                <TextInput
                  style={[styles.formInput, { fontSize: scaleFontSize(16) }]}
                  value={createPlanPromos}
                  onChangeText={setCreatePlanPromos}
                  placeholder="0"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="number-pad"
                />
              </View>

              <View style={styles.formGroup}>
                <View style={styles.switchRow}>
                  <Text style={[styles.switchLabel, { fontSize: scaleFontSize(16) }]}>Plan Activo</Text>
                  <Switch
                    value={createPlanActivo}
                    onValueChange={setCreatePlanActivo}
                    trackColor={{ false: colors.cardBorder, true: colors.primary + '80' }}
                    thumbColor={createPlanActivo ? colors.primary : colors.textSecondary}
                  />
                </View>
              </View>

              <View style={styles.formGroup}>
                <View style={styles.switchRow}>
                  <Text style={[styles.switchLabel, { fontSize: scaleFontSize(16) }]}>Perfil Social Completo</Text>
                  <Switch
                    value={createPlanPerfilSocial}
                    onValueChange={setCreatePlanPerfilSocial}
                    trackColor={{ false: colors.cardBorder, true: colors.primary + '80' }}
                    thumbColor={createPlanPerfilSocial ? colors.primary : colors.textSecondary}
                  />
                </View>
              </View>

              <View style={styles.formGroup}>
                <View style={styles.switchRow}>
                  <Text style={[styles.switchLabel, { fontSize: scaleFontSize(16) }]}>Panel de Análisis</Text>
                  <Switch
                    value={createPlanPanelAnalisis}
                    onValueChange={setCreatePlanPanelAnalisis}
                    trackColor={{ false: colors.cardBorder, true: colors.primary + '80' }}
                    thumbColor={createPlanPanelAnalisis ? colors.primary : colors.textSecondary}
                  />
                </View>
              </View>

              <View style={styles.formGroup}>
                <View style={styles.switchRow}>
                  <Text style={[styles.switchLabel, { fontSize: scaleFontSize(16) }]}>Soporte Prioritario</Text>
                  <Switch
                    value={createPlanSoportePrioritario}
                    onValueChange={setCreatePlanSoportePrioritario}
                    trackColor={{ false: colors.cardBorder, true: colors.primary + '80' }}
                    thumbColor={createPlanSoportePrioritario ? colors.primary : colors.textSecondary}
                  />
                </View>
              </View>

              <View style={styles.formGroup}>
                <View style={styles.switchRow}>
                  <Text style={[styles.switchLabel, { fontSize: scaleFontSize(16) }]}>Visibilidad Extra</Text>
                  <Switch
                    value={createPlanVisibilidadExtra}
                    onValueChange={setCreatePlanVisibilidadExtra}
                    trackColor={{ false: colors.cardBorder, true: colors.primary + '80' }}
                    thumbColor={createPlanVisibilidadExtra ? colors.primary : colors.textSecondary}
                  />
                </View>
              </View>

              <View style={styles.formGroup}>
                <View style={styles.switchRow}>
                  <Text style={[styles.switchLabel, { fontSize: scaleFontSize(16) }]}>Visibilidad Máxima</Text>
                  <Switch
                    value={createPlanVisibilidadMaxima}
                    onValueChange={setCreatePlanVisibilidadMaxima}
                    trackColor={{ false: colors.cardBorder, true: colors.primary + '80' }}
                    thumbColor={createPlanVisibilidadMaxima ? colors.primary : colors.textSecondary}
                  />
                </View>
              </View>
            </ScrollView>

            <TouchableOpacity
              style={[styles.modalPrimaryButton, creatingPlan && styles.modalPrimaryButtonDisabled]}
              onPress={handleCreatePlan}
              disabled={creatingPlan}
            >
              {creatingPlan ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <>
                  <IconSymbol 
                    ios_icon_name="plus.circle.fill" 
                    android_material_icon_name="add_circle" 
                    size={Platform.OS === 'android' ? scaleIconSize(20) : 20} 
                    color={colors.white} 
                  />
                  <Text style={[styles.modalPrimaryButtonText, { fontSize: scaleFontSize(16) }]}>Crear Plan</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.modalCancelButton} onPress={() => setShowCreatePlanModal(false)}>
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
  headerV7: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButtonV7: {
    padding: 4,
  },
  headerContentV7: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitleV7: {
    fontWeight: 'bold',
    color: colors.headerText,
  },
  headerSubtitleV7: {
    color: colors.headerText,
    opacity: 0.9,
    marginTop: 2,
  },
  refreshButtonV7: {
    padding: 4,
  },
  tabsV7: {
    flexDirection: 'row',
    backgroundColor: colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  tabV7: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 10,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  tabActiveV7: {
    borderBottomColor: colors.primary,
  },
  tabTextV7: {
    fontWeight: '600',
    color: colors.textSecondary,
  },
  tabTextActiveV7: {
    color: colors.primary,
  },
  tabContent: {
    flex: 1,
  },
  tabContentContainer: {
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
  sectionHeaderV7: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  sectionHeaderLeft: {
    flex: 1,
  },
  sectionTitleV7: {
    fontWeight: 'bold',
    color: colors.text,
  },
  sectionSubtitleV7: {
    color: colors.textSecondary,
  },
  createButtonV7: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
    ...commonStyles.shadow,
  },
  createButtonTextV7: {
    fontWeight: '700',
    color: colors.white,
  },
  planesGridV7: {
    gap: 16,
  },
  planCardV7: {
    borderRadius: 16,
    overflow: 'hidden',
    ...commonStyles.shadow,
  },
  planCardGradient: {
    padding: 20,
  },
  planCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  planCardHeaderLeft: {
    flex: 1,
  },
  planNameV7: {
    fontWeight: 'bold',
    color: colors.white,
    marginBottom: 6,
  },
  planPriceV7: {
    fontWeight: 'bold',
    color: colors.white,
  },
  editIconButtonV7: {
    padding: 4,
  },
  planDescriptionV7: {
    color: colors.white,
    opacity: 0.9,
    marginBottom: 16,
    lineHeight: 22,
  },
  planFeaturesV7: {
    gap: 12,
    marginBottom: 16,
  },
  planFeatureItemV7: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  planFeatureIconV7: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  planFeatureTextV7: {
    color: colors.white,
    fontWeight: '500',
    flex: 1,
  },
  planCardFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  planStatusBadgeV7: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  planStatusActiveV7: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  planStatusInactiveV7: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  planStatusTextV7: {
    fontWeight: '700',
    color: colors.white,
  },
  subscriptionsListV7: {
    gap: 16,
  },
  subscriptionCardV7: {
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    ...commonStyles.shadow,
  },
  subscriptionCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  subscriptionCardHeaderLeft: {
    flex: 1,
  },
  subscriptionLocalNameV7: {
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 6,
  },
  subscriptionPlanNameV7: {
    color: colors.textSecondary,
  },
  estadoBadgeV7: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  estadoBadgeTextV7: {
    fontWeight: '700',
  },
  subscriptionCardBody: {
    marginBottom: 16,
  },
  subscriptionInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  subscriptionInfoText: {
    color: colors.text,
  },
  cancelSubscriptionButtonV7: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#FEE2E2',
    paddingVertical: 14,
    borderRadius: 12,
  },
  cancelSubscriptionTextV7: {
    fontWeight: '700',
    color: '#EF4444',
  },
  assignButtonV7: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 24,
    ...commonStyles.shadow,
  },
  assignButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 20,
  },
  assignButtonTextV7: {
    fontWeight: 'bold',
    color: colors.white,
  },
  infoBoxV7: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
    backgroundColor: colors.primary + '10',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.primary + '30',
    marginBottom: 24,
  },
  infoBoxIcon: {
    marginTop: 2,
  },
  infoBoxContent: {
    flex: 1,
  },
  infoBoxTitle: {
    fontWeight: '700',
    color: colors.text,
    marginBottom: 6,
  },
  infoBoxText: {
    color: colors.text,
    lineHeight: 20,
  },
  quickStatsV7: {
    flexDirection: 'row',
    gap: 16,
  },
  quickStatCard: {
    flex: 1,
    backgroundColor: colors.cardBackground,
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  quickStatNumber: {
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 6,
  },
  quickStatLabel: {
    color: colors.textSecondary,
    textAlign: 'center',
  },
  emptyStateV7: {
    paddingVertical: 80,
    alignItems: 'center',
    gap: 16,
  },
  emptyTextV7: {
    fontWeight: '600',
    color: colors.text,
  },
  emptySubtextV7: {
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 40,
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
    maxHeight: SCREEN_HEIGHT * 0.85,
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
    maxHeight: SCREEN_HEIGHT * 0.55,
    marginBottom: 16,
  },
  formGroup: {
    marginBottom: 16,
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
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  switchLabel: {
    color: colors.text,
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    color: colors.text,
  },
  selectedLocalCard: {
    backgroundColor: colors.primary + '10',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  selectedLocalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  selectedLocalLabel: {
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  selectedLocalName: {
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  selectedLocalInfo: {
    color: colors.textSecondary,
  },
  searchResultsContainer: {
    maxHeight: 300,
    marginBottom: 16,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.cardBackground,
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  searchResultImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
  },
  searchResultImagePlaceholder: {
    backgroundColor: colors.cardBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchResultInfo: {
    flex: 1,
  },
  searchResultName: {
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  searchResultDetails: {
    color: colors.textSecondary,
  },
  planSelector: {
    gap: 12,
  },
  planSelectorItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.cardBackground,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.cardBorder,
  },
  planSelectorItemActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  planSelectorItemContent: {
    flex: 1,
  },
  planSelectorItemName: {
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  planSelectorItemNameActive: {
    color: colors.primary,
  },
  planSelectorItemPrice: {
    color: colors.textSecondary,
  },
  planSelectorItemPriceActive: {
    color: colors.primary,
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
