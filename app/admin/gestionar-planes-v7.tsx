
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
  Dimensions,
  Pressable,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors, commonStyles } from '@/styles/commonStyles';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { scaleFontSize } from '@/utils/androidScaling';

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
 * ✅ GESTIONAR PLANES SCREEN v100.0 - ANDROID SCALING & INFINITE LOOP FIX
 * 
 * CRITICAL FIXES v100.0:
 * - ✅ All font sizes use scaleFontSize() for Android consistency
 * - ✅ All functions wrapped in useCallback to prevent infinite loops
 * - ✅ Stable dependencies in useEffect hooks
 * - ✅ No nested function definitions that cause re-renders
 */

export default function GestionarPlanesV7Screen() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'planes' | 'subscriptions' | 'assign'>('planes');
  const [planes, setPlanes] = useState<Plan[]>([]);
  const [subscriptions, setSubscriptions] = useState<LocalSubscription[]>([]);
  const [locales, setLocales] = useState<Local[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredLocales, setFilteredLocales] = useState<Local[]>([]);

  // Plan creation/edit modal
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [planNombre, setPlanNombre] = useState('');
  const [planDescripcion, setPlanDescripcion] = useState('');
  const [planPrecio, setPlanPrecio] = useState('');
  const [planEventosMes, setPlanEventosMes] = useState('');
  const [planPromosDestacadas, setPlanPromosDestacadas] = useState('');
  const [planPerfilSocial, setPlanPerfilSocial] = useState(false);
  const [planPanelAnalisis, setPlanPanelAnalisis] = useState(false);
  const [planSoportePrioritario, setPlanSoportePrioritario] = useState(false);
  const [planVisibilidadExtra, setPlanVisibilidadExtra] = useState(false);
  const [planVisibilidadMaxima, setPlanVisibilidadMaxima] = useState(false);
  const [planActivo, setPlanActivo] = useState(true);
  const [savingPlan, setSavingPlan] = useState(false);

  // Assign plan modal
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedLocal, setSelectedLocal] = useState<Local | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<string>('');
  const [assigning, setAssigning] = useState(false);

  // ✅ CRITICAL FIX v100.0: Wrap in useCallback with stable dependencies
  const cargarPlanes = useCallback(async () => {
    try {
      console.log('[GestionarPlanes v100.0] ✅ Cargando planes...');
      const { data, error } = await supabase
        .from('planes_suscripcion')
        .select('*')
        .order('precio_mensual', { ascending: true });

      if (error) throw error;

      console.log('[GestionarPlanes v100.0] ✅ Planes cargados:', data?.length || 0);
      setPlanes(data || []);
    } catch (error) {
      console.error('[GestionarPlanes v100.0] Error cargando planes:', error);
      Alert.alert('Error', 'No se pudieron cargar los planes');
    }
  }, []);

  // ✅ CRITICAL FIX v100.0: Wrap in useCallback with stable dependencies
  const cargarSuscripciones = useCallback(async () => {
    try {
      console.log('[GestionarPlanes v100.0] ✅ Cargando suscripciones...');
      const { data, error } = await supabase
        .from('suscripciones_locales')
        .select(`
          *,
          locales(nombre, imagen_url),
          plan:planes_suscripcion(nombre)
        `)
        .order('fecha_inicio', { ascending: false })
        .limit(100);

      if (error) throw error;

      console.log('[GestionarPlanes v100.0] ✅ Suscripciones cargadas:', data?.length || 0);
      setSubscriptions(data || []);
    } catch (error) {
      console.error('[GestionarPlanes v100.0] Error cargando suscripciones:', error);
      Alert.alert('Error', 'No se pudieron cargar las suscripciones');
    }
  }, []);

  // ✅ CRITICAL FIX v100.0: Wrap in useCallback with stable dependencies
  const cargarLocales = useCallback(async () => {
    try {
      console.log('[GestionarPlanes v100.0] ✅ Cargando locales...');
      const { data, error } = await supabase
        .from('locales')
        .select('id, nombre, imagen_url, provincia, tipo, direccion, propietario_id')
        .eq('activo', true)
        .order('nombre', { ascending: true });

      if (error) throw error;

      console.log('[GestionarPlanes v100.0] ✅ Locales cargados:', data?.length || 0);
      setLocales(data || []);
      setFilteredLocales(data || []);
    } catch (error) {
      console.error('[GestionarPlanes v100.0] Error cargando locales:', error);
      Alert.alert('Error', 'No se pudieron cargar los locales');
    }
  }, []);

  // ✅ CRITICAL FIX v100.0: Wrap in useCallback with stable dependencies
  const cargarDatos = useCallback(async () => {
    setLoading(true);
    await Promise.all([cargarPlanes(), cargarSuscripciones(), cargarLocales()]);
    setLoading(false);
  }, [cargarPlanes, cargarSuscripciones, cargarLocales]);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  // ✅ CRITICAL FIX v100.0: Wrap in useCallback with stable dependencies
  const buscarLocales = useCallback(async () => {
    if (!searchQuery.trim()) {
      setFilteredLocales(locales);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = locales.filter(local =>
      local.nombre.toLowerCase().includes(query) ||
      local.direccion?.toLowerCase().includes(query) ||
      local.provincia?.toLowerCase().includes(query)
    );

    setFilteredLocales(filtered);
  }, [searchQuery, locales]);

  useEffect(() => {
    buscarLocales();
  }, [searchQuery, buscarLocales]);

  // ✅ CRITICAL FIX v100.0: Wrap in useCallback to prevent re-renders
  const asignarPlan = useCallback(() => {
    if (!selectedLocal || !selectedPlan) {
      Alert.alert('Error', 'Selecciona un local y un plan');
      return;
    }

    Alert.alert(
      'Confirmar Asignación',
      `¿Asignar el plan a "${selectedLocal.nombre}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Asignar',
          onPress: crearNuevaSuscripcion,
        },
      ]
    );
  }, [selectedLocal, selectedPlan]);

  // ✅ CRITICAL FIX v100.0: Wrap in useCallback to prevent re-renders
  const crearNuevaSuscripcion = useCallback(async () => {
    if (!selectedLocal || !selectedPlan) return;

    setAssigning(true);
    try {
      const { data: existingSub, error: checkError } = await supabase
        .from('suscripciones_locales')
        .select('id')
        .eq('local_id', selectedLocal.id)
        .eq('estado', 'activa')
        .maybeSingle();

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }

      if (existingSub) {
        Alert.alert(
          'Suscripción Activa',
          'Este local ya tiene una suscripción activa. ¿Deseas cancelarla y crear una nueva?',
          [
            { text: 'Cancelar', style: 'cancel' },
            {
              text: 'Continuar',
              onPress: async () => {
                await supabase
                  .from('suscripciones_locales')
                  .update({ estado: 'cancelada' })
                  .eq('id', existingSub.id);

                await crearSuscripcion();
              },
            },
          ]
        );
        setAssigning(false);
        return;
      }

      await crearSuscripcion();
    } catch (error) {
      console.error('[GestionarPlanes v100.0] Error:', error);
      Alert.alert('Error', 'No se pudo crear la suscripción');
      setAssigning(false);
    }
  }, [selectedLocal, selectedPlan]);

  // ✅ CRITICAL FIX v100.0: Separate function to avoid nested definitions
  const crearSuscripcion = async () => {
    if (!selectedLocal || !selectedPlan) return;

    try {
      const { error } = await supabase
        .from('suscripciones_locales')
        .insert({
          local_id: selectedLocal.id,
          plan_id: selectedPlan,
          estado: 'activa',
          fecha_inicio: new Date().toISOString(),
        });

      if (error) throw error;

      const { error: updateError } = await supabase
        .from('locales')
        .update({ plan_activo: selectedPlan })
        .eq('id', selectedLocal.id);

      if (updateError) {
        console.error('[GestionarPlanes v100.0] Error actualizando local:', updateError);
      }

      Alert.alert('✅ Éxito', 'Suscripción creada correctamente');
      setShowAssignModal(false);
      setSelectedLocal(null);
      setSelectedPlan('');
      await cargarSuscripciones();
    } catch (error) {
      console.error('[GestionarPlanes v100.0] Error creando suscripción:', error);
      throw error;
    } finally {
      setAssigning(false);
    }
  };

  // ✅ CRITICAL FIX v100.0: Wrap in useCallback to prevent re-renders
  const cancelarSuscripcion = useCallback(async (subscriptionId: string, localName: string) => {
    Alert.alert(
      'Cancelar Suscripción',
      `¿Estás seguro de cancelar la suscripción de "${localName}"?`,
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Sí, Cancelar',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('suscripciones_locales')
                .update({ estado: 'cancelada' })
                .eq('id', subscriptionId);

              if (error) throw error;

              Alert.alert('✅ Éxito', 'Suscripción cancelada correctamente');
              await cargarSuscripciones();
            } catch (error) {
              console.error('[GestionarPlanes v100.0] Error cancelando suscripción:', error);
              Alert.alert('Error', 'No se pudo cancelar la suscripción');
            }
          },
        },
      ]
    );
  }, [cargarSuscripciones]);

  // ✅ CRITICAL FIX v100.0: Wrap in useCallback to prevent re-renders
  const handleEditPlan = useCallback((plan: Plan) => {
    setEditingPlan(plan);
    setPlanNombre(plan.nombre);
    setPlanDescripcion(plan.descripcion);
    setPlanPrecio(plan.precio_mensual.toString());
    setPlanEventosMes(plan.eventos_mes.toString());
    setPlanPromosDestacadas(plan.promos_destacadas.toString());
    setPlanPerfilSocial(plan.perfil_social);
    setPlanPanelAnalisis(plan.panel_analisis);
    setPlanSoportePrioritario(plan.soporte_prioritario);
    setPlanVisibilidadExtra(plan.visibilidad_extra);
    setPlanVisibilidadMaxima(plan.visibilidad_maxima);
    setPlanActivo(plan.activo);
    setShowPlanModal(true);
  }, []);

  // ✅ CRITICAL FIX v100.0: Wrap in useCallback to prevent re-renders
  const handleSavePlan = useCallback(async () => {
    if (!planNombre.trim() || !planDescripcion.trim() || !planPrecio) {
      Alert.alert('Error', 'Completa todos los campos obligatorios');
      return;
    }

    setSavingPlan(true);
    try {
      const planData = {
        nombre: planNombre.trim(),
        descripcion: planDescripcion.trim(),
        precio_mensual: parseFloat(planPrecio),
        eventos_mes: parseInt(planEventosMes) || 0,
        promos_destacadas: parseInt(planPromosDestacadas) || 0,
        perfil_social: planPerfilSocial,
        panel_analisis: planPanelAnalisis,
        soporte_prioritario: planSoportePrioritario,
        visibilidad_extra: planVisibilidadExtra,
        visibilidad_maxima: planVisibilidadMaxima,
        activo: planActivo,
      };

      if (editingPlan) {
        const { error } = await supabase
          .from('planes_suscripcion')
          .update(planData)
          .eq('id', editingPlan.id);

        if (error) throw error;
        Alert.alert('✅ Éxito', 'Plan actualizado correctamente');
      } else {
        const { error } = await supabase
          .from('planes_suscripcion')
          .insert(planData);

        if (error) throw error;
        Alert.alert('✅ Éxito', 'Plan creado correctamente');
      }

      setShowPlanModal(false);
      resetCreatePlanForm();
      await cargarPlanes();
    } catch (error) {
      console.error('[GestionarPlanes v100.0] Error guardando plan:', error);
      Alert.alert('Error', 'No se pudo guardar el plan');
    } finally {
      setSavingPlan(false);
    }
  }, [
    planNombre,
    planDescripcion,
    planPrecio,
    planEventosMes,
    planPromosDestacadas,
    planPerfilSocial,
    planPanelAnalisis,
    planSoportePrioritario,
    planVisibilidadExtra,
    planVisibilidadMaxima,
    planActivo,
    editingPlan,
    cargarPlanes,
  ]);

  // ✅ CRITICAL FIX v100.0: Wrap in useCallback to prevent re-renders
  const handleCreatePlan = useCallback(() => {
    resetCreatePlanForm();
    setEditingPlan(null);
    setShowPlanModal(true);
  }, []);

  // ✅ CRITICAL FIX v100.0: Wrap in useCallback to prevent re-renders
  const resetCreatePlanForm = useCallback(() => {
    setPlanNombre('');
    setPlanDescripcion('');
    setPlanPrecio('');
    setPlanEventosMes('0');
    setPlanPromosDestacadas('0');
    setPlanPerfilSocial(false);
    setPlanPanelAnalisis(false);
    setPlanSoportePrioritario(false);
    setPlanVisibilidadExtra(false);
    setPlanVisibilidadMaxima(false);
    setPlanActivo(true);
    setEditingPlan(null);
  }, []);

  // ✅ CRITICAL FIX v100.0: Wrap in useCallback to prevent re-renders
  const handleDeletePlan = useCallback(async (planId: string, planName: string) => {
    Alert.alert(
      'Eliminar Plan',
      `¿Estás seguro de eliminar el plan "${planName}"? Esta acción no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('planes_suscripcion')
                .delete()
                .eq('id', planId);

              if (error) throw error;

              Alert.alert('✅ Éxito', 'Plan eliminado correctamente');
              await cargarPlanes();
            } catch (error) {
              console.error('[GestionarPlanes v100.0] Error eliminando plan:', error);
              Alert.alert('Error', 'No se pudo eliminar el plan');
            }
          },
        },
      ]
    );
  }, [cargarPlanes]);

  // ✅ CRITICAL FIX v100.0: Wrap in useCallback to prevent re-renders
  const getEstadoBadge = useCallback((estado: string) => {
    const badges: Record<string, { color: string; text: string }> = {
      activa: { color: '#10B981', text: 'Activa' },
      cancelada: { color: '#EF4444', text: 'Cancelada' },
      expirada: { color: '#6B7280', text: 'Expirada' },
    };

    const badge = badges[estado] || badges.activa;

    return (
      <View style={[styles.statusBadge, { backgroundColor: badge.color + '20' }]}>
        <Text style={[styles.statusText, { color: badge.color, fontSize: scaleFontSize(12) }]}>{badge.text}</Text>
      </View>
    );
  }, []);

  // ✅ CRITICAL FIX v100.0: Wrap in useCallback to prevent re-renders
  const renderPlanesTab = useCallback(() => (
    <ScrollView style={styles.tabContent} contentContainerStyle={styles.tabContentContainer}>
      <View style={styles.sectionHeader}>
        <View>
          <Text style={[styles.sectionTitle, { fontSize: scaleFontSize(20) }]}>Planes de Suscripción</Text>
          <Text style={[styles.sectionSubtitle, { fontSize: scaleFontSize(14) }]}>Gestiona los planes disponibles</Text>
        </View>
        <TouchableOpacity
          style={styles.createButton}
          onPress={handleCreatePlan}
        >
          <IconSymbol ios_icon_name="plus.circle.fill" android_material_icon_name="add_circle" size={20} color={colors.white} />
          <Text style={[styles.createButtonText, { fontSize: scaleFontSize(14) }]}>Nuevo Plan</Text>
        </TouchableOpacity>
      </View>

      {planes.length === 0 ? (
        <View style={styles.emptyState}>
          <IconSymbol ios_icon_name="doc.text" android_material_icon_name="description" size={48} color={colors.textSecondary} />
          <Text style={[styles.emptyText, { fontSize: scaleFontSize(16) }]}>No hay planes creados</Text>
        </View>
      ) : (
        <React.Fragment>
          {planes.map((plan) => (
            <View key={plan.id} style={styles.planCard}>
              <View style={styles.planHeader}>
                <View style={styles.planHeaderLeft}>
                  <Text style={[styles.planNombre, { fontSize: scaleFontSize(18) }]}>{plan.nombre}</Text>
                  <Text style={[styles.planPrecio, { fontSize: scaleFontSize(24) }]}>
                    {plan.precio_mensual.toFixed(2)} €<Text style={[styles.planPrecioMes, { fontSize: scaleFontSize(14) }]}>/mes</Text>
                  </Text>
                </View>
                <View style={[styles.planActivoBadge, { backgroundColor: plan.activo ? '#10B98120' : '#EF444420' }]}>
                  <Text style={[styles.planActivoText, { color: plan.activo ? '#10B981' : '#EF4444', fontSize: scaleFontSize(12) }]}>
                    {plan.activo ? 'Activo' : 'Inactivo'}
                  </Text>
                </View>
              </View>

              <Text style={[styles.planDescripcion, { fontSize: scaleFontSize(14) }]}>{plan.descripcion}</Text>

              <View style={styles.planFeatures}>
                <View style={styles.featureRow}>
                  <IconSymbol ios_icon_name="calendar" android_material_icon_name="event" size={16} color={colors.primary} />
                  <Text style={[styles.featureText, { fontSize: scaleFontSize(14) }]}>
                    {plan.eventos_mes} eventos/mes
                  </Text>
                </View>
                <View style={styles.featureRow}>
                  <IconSymbol ios_icon_name="star.fill" android_material_icon_name="star" size={16} color={colors.primary} />
                  <Text style={[styles.featureText, { fontSize: scaleFontSize(14) }]}>
                    {plan.promos_destacadas} promos destacadas
                  </Text>
                </View>
                {plan.perfil_social && (
                  <View style={styles.featureRow}>
                    <IconSymbol ios_icon_name="person.2.fill" android_material_icon_name="people" size={16} color={colors.primary} />
                    <Text style={[styles.featureText, { fontSize: scaleFontSize(14) }]}>Perfil social</Text>
                  </View>
                )}
                {plan.panel_analisis && (
                  <View style={styles.featureRow}>
                    <IconSymbol ios_icon_name="chart.bar.fill" android_material_icon_name="analytics" size={16} color={colors.primary} />
                    <Text style={[styles.featureText, { fontSize: scaleFontSize(14) }]}>Panel de análisis</Text>
                  </View>
                )}
              </View>

              <View style={styles.planActions}>
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={() => handleEditPlan(plan)}
                >
                  <IconSymbol ios_icon_name="pencil" android_material_icon_name="edit" size={18} color={colors.primary} />
                  <Text style={[styles.editButtonText, { fontSize: scaleFontSize(14) }]}>Editar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleDeletePlan(plan.id, plan.nombre)}
                >
                  <IconSymbol ios_icon_name="trash" android_material_icon_name="delete" size={18} color="#EF4444" />
                  <Text style={[styles.deleteButtonText, { fontSize: scaleFontSize(14) }]}>Eliminar</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </React.Fragment>
      )}
    </ScrollView>
  ), [planes, handleCreatePlan, handleEditPlan, handleDeletePlan]);

  // ✅ CRITICAL FIX v100.0: Wrap in useCallback to prevent re-renders
  const renderSubscriptionsTab = useCallback(() => (
    <ScrollView style={styles.tabContent} contentContainerStyle={styles.tabContentContainer}>
      <View style={styles.sectionHeader}>
        <View>
          <Text style={[styles.sectionTitle, { fontSize: scaleFontSize(20) }]}>Suscripciones Activas</Text>
          <Text style={[styles.sectionSubtitle, { fontSize: scaleFontSize(14) }]}>Locales con planes asignados</Text>
        </View>
      </View>

      {subscriptions.length === 0 ? (
        <View style={styles.emptyState}>
          <IconSymbol ios_icon_name="doc.text.fill" android_material_icon_name="description" size={48} color={colors.textSecondary} />
          <Text style={[styles.emptyText, { fontSize: scaleFontSize(16) }]}>No hay suscripciones activas</Text>
        </View>
      ) : (
        <React.Fragment>
          {subscriptions.map((sub) => (
            <View key={sub.id} style={styles.subscriptionCard}>
              <View style={styles.subscriptionHeader}>
                {sub.locales.imagen_url && (
                  <Image 
                    source={{ uri: sub.locales.imagen_url }} 
                    style={styles.subscriptionImage}
                  />
                )}
                <View style={styles.subscriptionInfo}>
                  <Text style={[styles.subscriptionLocalName, { fontSize: scaleFontSize(16) }]}>
                    {sub.locales.nombre}
                  </Text>
                  <Text style={[styles.subscriptionPlanName, { fontSize: scaleFontSize(14) }]}>
                    Plan: {sub.plan.nombre}
                  </Text>
                  <Text style={[styles.subscriptionDate, { fontSize: scaleFontSize(12) }]}>
                    Desde: {new Date(sub.fecha_inicio).toLocaleDateString('es-ES')}
                  </Text>
                </View>
                {getEstadoBadge(sub.estado)}
              </View>

              {sub.estado === 'activa' && (
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => cancelarSuscripcion(sub.id, sub.locales.nombre)}
                >
                  <Text style={[styles.cancelButtonText, { fontSize: scaleFontSize(14) }]}>Cancelar Suscripción</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
        </React.Fragment>
      )}
    </ScrollView>
  ), [subscriptions, getEstadoBadge, cancelarSuscripcion]);

  // ✅ CRITICAL FIX v100.0: Wrap in useCallback to prevent re-renders
  const renderAssignTab = useCallback(() => (
    <ScrollView style={styles.tabContent} contentContainerStyle={styles.tabContentContainer}>
      <View style={styles.sectionHeader}>
        <View>
          <Text style={[styles.sectionTitle, { fontSize: scaleFontSize(20) }]}>Asignar Plan a Local</Text>
          <Text style={[styles.sectionSubtitle, { fontSize: scaleFontSize(14) }]}>Busca y asigna planes</Text>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <IconSymbol ios_icon_name="magnifyingglass" android_material_icon_name="search" size={20} color={colors.textSecondary} />
        <TextInput
          style={[styles.searchInput, { fontSize: scaleFontSize(16) }]}
          placeholder="Buscar local..."
          placeholderTextColor={colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {selectedLocal && (
        <View style={styles.selectedLocalCard}>
          <Text style={[styles.selectedLocalTitle, { fontSize: scaleFontSize(16) }]}>Local Seleccionado:</Text>
          <Text style={[styles.selectedLocalName, { fontSize: scaleFontSize(18) }]}>{selectedLocal.nombre}</Text>
          <Text style={[styles.selectedLocalAddress, { fontSize: scaleFontSize(14) }]}>{selectedLocal.direccion}</Text>

          <Text style={[styles.selectPlanTitle, { fontSize: scaleFontSize(16) }]}>Selecciona un Plan:</Text>
          {planes.filter(p => p.activo).map((plan) => (
            <TouchableOpacity
              key={plan.id}
              style={[
                styles.planOption,
                selectedPlan === plan.id && styles.planOptionActive,
              ]}
              onPress={() => setSelectedPlan(plan.id)}
            >
              <View style={styles.planOptionLeft}>
                <Text style={[styles.planOptionName, { fontSize: scaleFontSize(16) }]}>{plan.nombre}</Text>
                <Text style={[styles.planOptionPrice, { fontSize: scaleFontSize(14) }]}>
                  {plan.precio_mensual.toFixed(2)} €/mes
                </Text>
              </View>
              {selectedPlan === plan.id && (
                <IconSymbol ios_icon_name="checkmark.circle.fill" android_material_icon_name="check_circle" size={24} color={colors.primary} />
              )}
            </TouchableOpacity>
          ))}

          <TouchableOpacity
            style={[styles.assignButton, (!selectedPlan || assigning) && styles.assignButtonDisabled]}
            onPress={asignarPlan}
            disabled={!selectedPlan || assigning}
          >
            {assigning ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <>
                <IconSymbol ios_icon_name="checkmark.circle.fill" android_material_icon_name="check_circle" size={20} color={colors.white} />
                <Text style={[styles.assignButtonText, { fontSize: scaleFontSize(16) }]}>Asignar Plan</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelSelectionButton}
            onPress={() => {
              setSelectedLocal(null);
              setSelectedPlan('');
            }}
          >
            <Text style={[styles.cancelSelectionText, { fontSize: scaleFontSize(14) }]}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      )}

      {!selectedLocal && filteredLocales.length > 0 && (
        <View style={styles.localesList}>
          {filteredLocales.map((local) => (
            <TouchableOpacity
              key={local.id}
              style={styles.localCard}
              onPress={() => setSelectedLocal(local)}
            >
              {local.imagen_url && (
                <Image 
                  source={{ uri: local.imagen_url }} 
                  style={styles.localImage}
                />
              )}
              <View style={styles.localInfo}>
                <Text style={[styles.localName, { fontSize: scaleFontSize(16) }]}>{local.nombre}</Text>
                <Text style={[styles.localAddress, { fontSize: scaleFontSize(13) }]} numberOfLines={1}>
                  {local.direccion}
                </Text>
                <Text style={[styles.localProvincia, { fontSize: scaleFontSize(12) }]}>{local.provincia}</Text>
              </View>
              <IconSymbol ios_icon_name="chevron.right" android_material_icon_name="chevron_right" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          ))}
        </View>
      )}

      {!selectedLocal && filteredLocales.length === 0 && searchQuery && (
        <View style={styles.emptyState}>
          <IconSymbol ios_icon_name="magnifyingglass" android_material_icon_name="search" size={48} color={colors.textSecondary} />
          <Text style={[styles.emptyText, { fontSize: scaleFontSize(16) }]}>No se encontraron locales</Text>
        </View>
      )}
    </ScrollView>
  ), [filteredLocales, selectedLocal, selectedPlan, assigning, searchQuery, planes, asignarPlan, handleCreatePlan]);

  if (loading) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={[colors.headerGradientStart, colors.headerGradientEnd]} style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <IconSymbol ios_icon_name="chevron.left" android_material_icon_name="arrow_back" size={24} color={colors.headerText} />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={[styles.headerTitle, { fontSize: scaleFontSize(24) }]}>Gestionar Planes</Text>
          </View>
          <View style={{ width: 24 }} />
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
      <LinearGradient colors={[colors.headerGradientStart, colors.headerGradientEnd]} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <IconSymbol ios_icon_name="chevron.left" android_material_icon_name="arrow_back" size={24} color={colors.headerText} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={[styles.headerTitle, { fontSize: scaleFontSize(24) }]}>Gestionar Planes</Text>
          <Text style={[styles.headerSubtitle, { fontSize: scaleFontSize(14) }]}>Sistema de suscripciones</Text>
        </View>
        <TouchableOpacity onPress={cargarDatos}>
          <IconSymbol ios_icon_name="arrow.clockwise" android_material_icon_name="refresh" size={24} color={colors.headerText} />
        </TouchableOpacity>
      </LinearGradient>

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'planes' && styles.tabActive]}
          onPress={() => setActiveTab('planes')}
        >
          <IconSymbol
            ios_icon_name="doc.text.fill"
            android_material_icon_name="description"
            size={20}
            color={activeTab === 'planes' ? colors.primary : colors.textSecondary}
          />
          <Text style={[styles.tabText, { fontSize: scaleFontSize(14) }, activeTab === 'planes' && styles.tabTextActive]}>
            Planes
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'subscriptions' && styles.tabActive]}
          onPress={() => setActiveTab('subscriptions')}
        >
          <IconSymbol
            ios_icon_name="checkmark.seal.fill"
            android_material_icon_name="verified"
            size={20}
            color={activeTab === 'subscriptions' ? colors.primary : colors.textSecondary}
          />
          <Text style={[styles.tabText, { fontSize: scaleFontSize(14) }, activeTab === 'subscriptions' && styles.tabTextActive]}>
            Suscripciones
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'assign' && styles.tabActive]}
          onPress={() => setActiveTab('assign')}
        >
          <IconSymbol
            ios_icon_name="link.circle.fill"
            android_material_icon_name="link"
            size={20}
            color={activeTab === 'assign' ? colors.primary : colors.textSecondary}
          />
          <Text style={[styles.tabText, { fontSize: scaleFontSize(14) }, activeTab === 'assign' && styles.tabTextActive]}>
            Asignar
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'planes' && renderPlanesTab()}
      {activeTab === 'subscriptions' && renderSubscriptionsTab()}
      {activeTab === 'assign' && renderAssignTab()}

      {/* Plan Creation/Edit Modal */}
      <Modal
        visible={showPlanModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPlanModal(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowPlanModal(false)}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { fontSize: scaleFontSize(20) }]}>
                {editingPlan ? 'Editar Plan' : 'Nuevo Plan'}
              </Text>
              <TouchableOpacity onPress={() => setShowPlanModal(false)}>
                <IconSymbol ios_icon_name="xmark.circle.fill" android_material_icon_name="cancel" size={28} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScrollView} showsVerticalScrollIndicator={false}>
              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { fontSize: scaleFontSize(14) }]}>Nombre del Plan *</Text>
                <TextInput
                  style={[styles.formInput, { fontSize: scaleFontSize(16) }]}
                  value={planNombre}
                  onChangeText={setPlanNombre}
                  placeholder="Ej: Premium"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { fontSize: scaleFontSize(14) }]}>Descripción *</Text>
                <TextInput
                  style={[styles.textArea, { fontSize: scaleFontSize(14) }]}
                  value={planDescripcion}
                  onChangeText={setPlanDescripcion}
                  placeholder="Descripción del plan..."
                  placeholderTextColor={colors.textSecondary}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { fontSize: scaleFontSize(14) }]}>Precio Mensual (€) *</Text>
                <TextInput
                  style={[styles.formInput, { fontSize: scaleFontSize(16) }]}
                  value={planPrecio}
                  onChangeText={setPlanPrecio}
                  placeholder="0.00"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="decimal-pad"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { fontSize: scaleFontSize(14) }]}>Eventos por Mes</Text>
                <TextInput
                  style={[styles.formInput, { fontSize: scaleFontSize(16) }]}
                  value={planEventosMes}
                  onChangeText={setPlanEventosMes}
                  placeholder="0"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="number-pad"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { fontSize: scaleFontSize(14) }]}>Promos Destacadas</Text>
                <TextInput
                  style={[styles.formInput, { fontSize: scaleFontSize(16) }]}
                  value={planPromosDestacadas}
                  onChangeText={setPlanPromosDestacadas}
                  placeholder="0"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="number-pad"
                />
              </View>

              <View style={styles.switchGroup}>
                <View style={styles.switchRow}>
                  <Text style={[styles.switchLabel, { fontSize: scaleFontSize(16) }]}>Perfil Social</Text>
                  <Switch
                    value={planPerfilSocial}
                    onValueChange={setPlanPerfilSocial}
                    trackColor={{ false: colors.cardBorder, true: colors.primary + '80' }}
                    thumbColor={planPerfilSocial ? colors.primary : colors.textSecondary}
                  />
                </View>

                <View style={styles.switchRow}>
                  <Text style={[styles.switchLabel, { fontSize: scaleFontSize(16) }]}>Panel de Análisis</Text>
                  <Switch
                    value={planPanelAnalisis}
                    onValueChange={setPlanPanelAnalisis}
                    trackColor={{ false: colors.cardBorder, true: colors.primary + '80' }}
                    thumbColor={planPanelAnalisis ? colors.primary : colors.textSecondary}
                  />
                </View>

                <View style={styles.switchRow}>
                  <Text style={[styles.switchLabel, { fontSize: scaleFontSize(16) }]}>Soporte Prioritario</Text>
                  <Switch
                    value={planSoportePrioritario}
                    onValueChange={setPlanSoportePrioritario}
                    trackColor={{ false: colors.cardBorder, true: colors.primary + '80' }}
                    thumbColor={planSoportePrioritario ? colors.primary : colors.textSecondary}
                  />
                </View>

                <View style={styles.switchRow}>
                  <Text style={[styles.switchLabel, { fontSize: scaleFontSize(16) }]}>Visibilidad Extra</Text>
                  <Switch
                    value={planVisibilidadExtra}
                    onValueChange={setPlanVisibilidadExtra}
                    trackColor={{ false: colors.cardBorder, true: colors.primary + '80' }}
                    thumbColor={planVisibilidadExtra ? colors.primary : colors.textSecondary}
                  />
                </View>

                <View style={styles.switchRow}>
                  <Text style={[styles.switchLabel, { fontSize: scaleFontSize(16) }]}>Visibilidad Máxima</Text>
                  <Switch
                    value={planVisibilidadMaxima}
                    onValueChange={setPlanVisibilidadMaxima}
                    trackColor={{ false: colors.cardBorder, true: colors.primary + '80' }}
                    thumbColor={planVisibilidadMaxima ? colors.primary : colors.textSecondary}
                  />
                </View>

                <View style={styles.switchRow}>
                  <Text style={[styles.switchLabel, { fontSize: scaleFontSize(16) }]}>Plan Activo</Text>
                  <Switch
                    value={planActivo}
                    onValueChange={setPlanActivo}
                    trackColor={{ false: colors.cardBorder, true: colors.primary + '80' }}
                    thumbColor={planActivo ? colors.primary : colors.textSecondary}
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
                  <IconSymbol ios_icon_name="checkmark.circle.fill" android_material_icon_name="check_circle" size={20} color={colors.white} />
                  <Text style={[styles.modalPrimaryButtonText, { fontSize: scaleFontSize(16) }]}>
                    {editingPlan ? 'Actualizar Plan' : 'Crear Plan'}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.modalCancelButton} onPress={() => setShowPlanModal(false)}>
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
  headerContent: {
    flex: 1,
    marginLeft: 12,
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
  tabs: {
    flexDirection: 'row',
    backgroundColor: colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: colors.primary,
  },
  tabText: {
    fontWeight: '600',
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: colors.primary,
  },
  tabContent: {
    flex: 1,
  },
  tabContentContainer: {
    padding: 16,
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
    marginBottom: 20,
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
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  createButtonText: {
    fontWeight: '600',
    color: colors.white,
  },
  planCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    ...commonStyles.shadow,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  planHeaderLeft: {
    flex: 1,
  },
  planNombre: {
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  planPrecio: {
    fontWeight: 'bold',
    color: colors.primary,
  },
  planPrecioMes: {
    fontWeight: 'normal',
    color: colors.textSecondary,
  },
  planActivoBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  planActivoText: {
    fontWeight: '600',
  },
  planDescripcion: {
    color: colors.textSecondary,
    marginBottom: 16,
    lineHeight: 20,
  },
  planFeatures: {
    gap: 8,
    marginBottom: 16,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  featureText: {
    color: colors.text,
  },
  planActions: {
    flexDirection: 'row',
    gap: 8,
  },
  editButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary + '10',
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  editButtonText: {
    fontWeight: '600',
    color: colors.primary,
  },
  deleteButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#EF444420',
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#EF444430',
  },
  deleteButtonText: {
    fontWeight: '600',
    color: '#EF4444',
  },
  subscriptionCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    ...commonStyles.shadow,
  },
  subscriptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  subscriptionImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: colors.cardBorder,
  },
  subscriptionInfo: {
    flex: 1,
  },
  subscriptionLocalName: {
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  subscriptionPlanName: {
    color: colors.primary,
    fontWeight: '600',
    marginBottom: 2,
  },
  subscriptionDate: {
    color: colors.textSecondary,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: '#EF444420',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EF444430',
  },
  cancelButtonText: {
    fontWeight: '600',
    color: '#EF4444',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
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
  selectedLocalTitle: {
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  selectedLocalName: {
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  selectedLocalAddress: {
    color: colors.textSecondary,
    marginBottom: 16,
  },
  selectPlanTitle: {
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  planOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.cardBackground,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  planOptionActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  planOptionLeft: {
    flex: 1,
  },
  planOptionName: {
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  planOptionPrice: {
    color: colors.textSecondary,
  },
  assignButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 16,
  },
  assignButtonDisabled: {
    backgroundColor: colors.cardBorder,
    opacity: 0.5,
  },
  assignButtonText: {
    fontWeight: '700',
    color: colors.white,
  },
  cancelSelectionButton: {
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  cancelSelectionText: {
    fontWeight: '600',
    color: colors.textSecondary,
  },
  localesList: {
    gap: 12,
  },
  localCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  localImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: colors.cardBorder,
  },
  localInfo: {
    flex: 1,
  },
  localName: {
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  localAddress: {
    color: colors.textSecondary,
    marginBottom: 2,
  },
  localProvincia: {
    color: colors.textSecondary,
  },
  emptyState: {
    paddingVertical: 60,
    alignItems: 'center',
    gap: 12,
  },
  emptyText: {
    color: colors.textSecondary,
    textAlign: 'center',
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
  textArea: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    minHeight: 80,
  },
  switchGroup: {
    gap: 12,
    marginTop: 8,
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
