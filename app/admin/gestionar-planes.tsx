
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
  Platform,
  KeyboardAvoidingView,
  Keyboard,
  Switch,
  Pressable,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors, commonStyles } from '@/styles/commonStyles';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/contexts/AuthContext';

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
  propietario_id?: string;
  propietario?: {
    nombre: string;
    email: string;
    username?: string;
  };
}

export default function GestionarPlanesScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [planes, setPlanes] = useState<Plan[]>([]);
  const [subscriptions, setSubscriptions] = useState<LocalSubscription[]>([]);
  const [activeTab, setActiveTab] = useState<'planes' | 'subscriptions' | 'assign'>('planes');
  
  // Assign plan modal state
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Local[]>([]);
  const [selectedLocal, setSelectedLocal] = useState<Local | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<string>('');
  const [assigning, setAssigning] = useState(false);
  const [searching, setSearching] = useState(false);

  // Plan detail modal state (v5.0)
  const [showPlanDetailModal, setShowPlanDetailModal] = useState(false);
  const [selectedPlanDetail, setSelectedPlanDetail] = useState<Plan | null>(null);

  // Edit plan modal state
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

  // Create plan modal state
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

  const cargarPlanes = useCallback(async () => {
    try {
      console.log('[GestionarPlanes] ✅ Cargando planes...');
      const { data, error } = await supabase
        .from('planes_suscripcion')
        .select('*')
        .order('precio_mensual', { ascending: true });

      if (error) {
        console.error('[GestionarPlanes] ❌ Error cargando planes:', error);
        throw error;
      }

      console.log('[GestionarPlanes] ✅ Planes cargados:', data?.length || 0);
      setPlanes(data || []);
    } catch (error) {
      console.error('[GestionarPlanes] Error cargando planes:', error);
      Alert.alert('Error', 'No se pudieron cargar los planes');
    }
  }, []);

  const cargarSuscripciones = useCallback(async () => {
    try {
      console.log('[GestionarPlanes] ✅ Cargando suscripciones...');
      
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

      if (error) {
        console.error('[GestionarPlanes] ❌ Error cargando suscripciones:', error);
        throw error;
      }

      console.log('[GestionarPlanes] ✅ Suscripciones cargadas:', data?.length || 0);
      setSubscriptions(data || []);
    } catch (error) {
      console.error('[GestionarPlanes] Error cargando suscripciones:', error);
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
      // ✅ IMPROVED: Include owner information in search results
      const { data, error } = await supabase
        .from('locales')
        .select(`
          id, 
          nombre, 
          imagen_url, 
          provincia, 
          tipo,
          propietario_id,
          propietario:usuarios!propietario_id(
            nombre,
            email,
            username
          )
        `)
        .ilike('nombre', `%${query}%`)
        .eq('activo', true)
        .limit(20);

      if (error) throw error;

      console.log('[GestionarPlanes] ✅ Locales encontrados:', data?.length || 0);
      setSearchResults(data || []);
    } catch (error) {
      console.error('[GestionarPlanes] Error buscando locales:', error);
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    if (searchQuery.trim().length >= 2) {
      const timeoutId = setTimeout(() => {
        buscarLocales(searchQuery);
      }, 300);

      return () => clearTimeout(timeoutId);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery, buscarLocales]);

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
            { text: 'Cancelar', style: 'cancel' },
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
        setAssigning(false);
        return;
      }

      await crearNuevaSuscripcion();
    } catch (error) {
      console.error('[GestionarPlanes] Error asignando plan:', error);
      Alert.alert('Error', 'No se pudo asignar el plan');
      setAssigning(false);
    }
  };

  const crearNuevaSuscripcion = async () => {
    if (!selectedLocal || !selectedPlan) return;

    try {
      const plan = planes.find(p => p.id === selectedPlan);
      if (!plan) throw new Error('Plan no encontrado');

      const fechaInicio = new Date();

      // ✅ CRITICAL FIX v52.0: Get plan details for credit initialization
      const selectedPlanData = planes.find(p => p.id === selectedPlan);
      if (!selectedPlanData) {
        throw new Error('Plan no encontrado');
      }

      const nextMonth = new Date(fechaInicio);
      nextMonth.setMonth(nextMonth.getMonth() + 1);

      // ✅ CRITICAL FIX v52.0: Initialize subscription with proper credits (NO "destacado" field)
      const { error: subscriptionError } = await supabase
        .from('suscripciones_locales')
        .insert({
          local_id: selectedLocal.id,
          plan_id: selectedPlan,
          usuario_id: user?.id,
          propietario_id: selectedLocal.propietario_id || user?.id,
          estado: 'activa',
          fecha_inicio: fechaInicio.toISOString(),
          fecha_proximo_pago: nextMonth.toISOString(),
          fecha_renovacion_creditos: nextMonth.toISOString(),
          creditos_destacados_restantes: selectedPlanData.promos_destacadas || 0,
          creditos_eventos_restantes: selectedPlanData.eventos_mes || 0,
          eventos_usados_mes: 0,
          promos_usadas_mes: 0,
          ultimo_reset_contador: fechaInicio.toISOString(),
        });

      if (subscriptionError) throw subscriptionError;

      const { error: localError } = await supabase
        .from('locales')
        .update({ activo: true })
        .eq('id', selectedLocal.id);

      if (localError) {
        console.error('[GestionarPlanes] Error habilitando local:', localError);
      }

      Alert.alert(
        'Éxito',
        `Plan "${plan.nombre}" asignado correctamente a "${selectedLocal.nombre}". El perfil del local ha sido habilitado automáticamente.`
      );

      setShowAssignModal(false);
      setSelectedLocal(null);
      setSelectedPlan('');
      setSearchQuery('');
      setSearchResults([]);
      await cargarDatos();
    } catch (error) {
      console.error('[GestionarPlanes] Error creando suscripción:', error);
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
              console.error('[GestionarPlanes] Error cancelando suscripción:', error);
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
    setEditPlanActivo(plan.activo);
    setEditPlanPerfilSocial(plan.perfil_social || false);
    setEditPlanPanelAnalisis(plan.panel_analisis || false);
    setEditPlanSoportePrioritario(plan.soporte_prioritario || false);
    setEditPlanVisibilidadExtra(plan.visibilidad_extra || false);
    setEditPlanVisibilidadMaxima(plan.visibilidad_maxima || false);
    setShowEditPlanModal(true);
  };

  const handleViewPlanDetail = (plan: Plan) => {
    setSelectedPlanDetail(plan);
    setShowPlanDetailModal(true);
  };

  const handleSavePlan = async () => {
    if (!editingPlan) return;

    if (!editPlanNombre.trim()) {
      Alert.alert('Error', 'El nombre del plan es obligatorio');
      return;
    }

    const precio = parseFloat(editPlanPrecio) || 0;
    const eventos = parseInt(editPlanEventos) || 0;
    const promos = parseInt(editPlanPromos) || 0;

    if (precio < 0) {
      Alert.alert('Error', 'El precio no puede ser negativo');
      return;
    }

    setSavingPlan(true);
    try {
      const { error } = await supabase
        .from('planes_suscripcion')
        .update({
          nombre: editPlanNombre.trim(),
          descripcion: editPlanDescripcion.trim(),
          precio_mensual: precio,
          eventos_mes: eventos,
          promos_destacadas: promos,
          activo: editPlanActivo,
          perfil_social: editPlanPerfilSocial,
          panel_analisis: editPlanPanelAnalisis,
          soporte_prioritario: editPlanSoportePrioritario,
          visibilidad_extra: editPlanVisibilidadExtra,
          visibilidad_maxima: editPlanVisibilidadMaxima,
        })
        .eq('id', editingPlan.id);

      if (error) throw error;

      Alert.alert('Éxito', 'Plan actualizado correctamente');
      setShowEditPlanModal(false);
      setEditingPlan(null);
      await cargarPlanes();
    } catch (error) {
      console.error('[GestionarPlanes] Error guardando plan:', error);
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
    const eventos = parseInt(createPlanEventos) || 0;
    const promos = parseInt(createPlanPromos) || 0;

    if (precio < 0) {
      Alert.alert('Error', 'El precio no puede ser negativo');
      return;
    }

    setCreatingPlan(true);
    try {
      const { error } = await supabase
        .from('planes_suscripcion')
        .insert({
          nombre: createPlanNombre.trim(),
          descripcion: createPlanDescripcion.trim(),
          precio_mensual: precio,
          eventos_mes: eventos,
          promos_destacadas: promos,
          activo: createPlanActivo,
          perfil_social: createPlanPerfilSocial,
          panel_analisis: createPlanPanelAnalisis,
          soporte_prioritario: createPlanSoportePrioritario,
          visibilidad_extra: createPlanVisibilidadExtra,
          visibilidad_maxima: createPlanVisibilidadMaxima,
          caracteristicas: [],
        });

      if (error) throw error;

      Alert.alert('Éxito', 'Plan creado correctamente');
      setShowCreatePlanModal(false);
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
      await cargarPlanes();
    } catch (error) {
      console.error('[GestionarPlanes] Error creando plan:', error);
      Alert.alert('Error', 'No se pudo crear el plan');
    } finally {
      setCreatingPlan(false);
    }
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

              Alert.alert('Éxito', 'Plan eliminado correctamente');
              await cargarPlanes();
            } catch (error) {
              console.error('[GestionarPlanes] Error eliminando plan:', error);
              Alert.alert('Error', 'No se pudo eliminar el plan');
            }
          },
        },
      ]
    );
  };

  const getEstadoBadge = (estado: string) => {
    const badges: Record<string, { color: string; text: string }> = {
      activa: { color: '#10B981', text: 'Activa' },
      cancelada: { color: '#EF4444', text: 'Cancelada' },
      expirada: { color: '#F59E0B', text: 'Expirada' },
    };

    const badge = badges[estado] || badges.activa;

    return (
      <View style={[styles.badge, { backgroundColor: badge.color + '20' }]}>
        <Text style={[styles.badgeText, { color: badge.color }]}>{badge.text}</Text>
      </View>
    );
  };

  const renderPlanesTab = () => (
    <ScrollView style={styles.tabContent} contentContainerStyle={styles.tabContentContainer}>
      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionTitle}>Planes Disponibles</Text>
          <Text style={styles.sectionSubtitle}>Gestiona los planes de suscripción</Text>
        </View>
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => setShowCreatePlanModal(true)}
        >
          <IconSymbol ios_icon_name="plus.circle.fill" android_material_icon_name="add_circle" size={20} color={colors.white} />
          <Text style={styles.createButtonText}>Crear</Text>
        </TouchableOpacity>
      </View>
      {planes.map((plan) => (
        <TouchableOpacity
          key={plan.id}
          style={styles.planCard}
          onPress={() => handleViewPlanDetail(plan)}
          activeOpacity={0.7}
        >
          <View style={styles.planHeader}>
            <View style={styles.planHeaderLeft}>
              <Text style={styles.planName}>{plan.nombre}</Text>
              <Text style={styles.planPrice}>
                {plan.precio_mensual === 0 ? 'Gratis' : `${plan.precio_mensual}€/mes`}
              </Text>
            </View>
            <View style={styles.planHeaderRight}>
              <View style={[styles.planStatusBadge, plan.activo ? styles.planStatusActive : styles.planStatusInactive]}>
                <Text style={[styles.planStatusText, plan.activo ? styles.planStatusTextActive : styles.planStatusTextInactive]}>
                  {plan.activo ? 'Activo' : 'Inactivo'}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.editPlanButton}
                onPress={(e) => {
                  e.stopPropagation();
                  handleEditPlan(plan);
                }}
                activeOpacity={0.7}
              >
                <IconSymbol ios_icon_name="pencil.circle.fill" android_material_icon_name="edit" size={24} color={colors.primary} />
              </TouchableOpacity>
            </View>
          </View>
          {plan.descripcion && (
            <Text style={styles.planDescription} numberOfLines={2}>{plan.descripcion}</Text>
          )}
          <View style={styles.planFeatures}>
            {plan.eventos_mes > 0 && (
              <View style={styles.planFeatureItem}>
                <IconSymbol ios_icon_name="calendar.badge.plus" android_material_icon_name="event" size={16} color={colors.primary} />
                <Text style={styles.planFeatureText}>{plan.eventos_mes} eventos/mes</Text>
              </View>
            )}
            {plan.promos_destacadas > 0 && (
              <View style={styles.planFeatureItem}>
                <IconSymbol ios_icon_name="star.fill" android_material_icon_name="star" size={16} color={colors.badgeDestacado} />
                <Text style={styles.planFeatureText}>{plan.promos_destacadas} promos destacadas</Text>
              </View>
            )}
            {plan.perfil_social && (
              <View style={styles.planFeatureItem}>
                <IconSymbol ios_icon_name="person.2.fill" android_material_icon_name="people" size={16} color="#10B981" />
                <Text style={styles.planFeatureText}>Perfil social</Text>
              </View>
            )}
            {plan.panel_analisis && (
              <View style={styles.planFeatureItem}>
                <IconSymbol ios_icon_name="chart.bar.fill" android_material_icon_name="bar_chart" size={16} color="#10B981" />
                <Text style={styles.planFeatureText}>Panel de análisis</Text>
              </View>
            )}
          </View>
          <TouchableOpacity
            style={styles.viewDetailsButton}
            onPress={(e) => {
              e.stopPropagation();
              handleViewPlanDetail(plan);
            }}
          >
            <Text style={styles.viewDetailsButtonText}>Ver Detalles Completos</Text>
            <IconSymbol ios_icon_name="chevron.right" android_material_icon_name="chevron_right" size={16} color={colors.primary} />
          </TouchableOpacity>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  const renderSubscriptionsTab = () => (
    <ScrollView style={styles.tabContent} contentContainerStyle={styles.tabContentContainer}>
      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionTitle}>Suscripciones Activas</Text>
          <Text style={styles.sectionSubtitle}>Gestiona las suscripciones de los locales</Text>
        </View>
      </View>
      {subscriptions.length === 0 ? (
        <View style={styles.emptyState}>
          <IconSymbol ios_icon_name="creditcard" android_material_icon_name="payment" size={48} color={colors.textSecondary} />
          <Text style={styles.emptyText}>No hay suscripciones registradas</Text>
        </View>
      ) : (
        <React.Fragment>
          {subscriptions.map((subscription) => (
            <View key={subscription.id} style={styles.subscriptionCard}>
              <View style={styles.subscriptionHeader}>
                <View style={styles.subscriptionHeaderLeft}>
                  <Text style={styles.subscriptionLocalName}>{subscription.locales.nombre}</Text>
                  <Text style={styles.subscriptionPlanName}>
                    Plan: {subscription.plan.nombre}
                  </Text>
                </View>
                {getEstadoBadge(subscription.estado)}
              </View>
              <View style={styles.subscriptionDates}>
                <View style={styles.subscriptionDateItem}>
                  <IconSymbol ios_icon_name="calendar" android_material_icon_name="event" size={16} color={colors.textSecondary} />
                  <Text style={styles.subscriptionDate}>
                    {new Date(subscription.fecha_inicio).toLocaleDateString('es-ES', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric'
                    })}
                  </Text>
                </View>
              </View>
              {subscription.estado === 'activa' && (
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => cancelarSuscripcion(subscription.id, subscription.locales.nombre)}
                >
                  <IconSymbol ios_icon_name="xmark.circle.fill" android_material_icon_name="cancel" size={18} color="#EF4444" />
                  <Text style={styles.cancelButtonText}>Cancelar Suscripción</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
        </React.Fragment>
      )}
    </ScrollView>
  );

  const renderAssignTab = () => (
    <View style={styles.tabContent}>
      <ScrollView contentContainerStyle={styles.tabContentContainer}>
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Asignar Plan a Local</Text>
            <Text style={styles.sectionSubtitle}>Busca un local y asígnale un plan</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.assignButton}
          onPress={() => setShowAssignModal(true)}
        >
          <IconSymbol ios_icon_name="plus.circle.fill" android_material_icon_name="add_circle" size={24} color={colors.white} />
          <Text style={styles.assignButtonText}>Asignar Nuevo Plan</Text>
        </TouchableOpacity>

        <View style={styles.infoBox}>
          <IconSymbol ios_icon_name="info.circle.fill" android_material_icon_name="info" size={20} color={colors.primary} />
          <Text style={styles.infoText}>
            Al asignar un plan a un local, su perfil se activará automáticamente en la red social.
          </Text>
        </View>
      </ScrollView>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={[colors.headerGradientStart, colors.headerGradientEnd]} style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <IconSymbol ios_icon_name="chevron.left" android_material_icon_name="arrow_back" size={24} color={colors.headerText} />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Gestionar Planes</Text>
          </View>
          <View style={{ width: 24 }} />
        </LinearGradient>

        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Cargando datos...</Text>
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
          <Text style={styles.headerTitle}>Gestionar Planes</Text>
          <Text style={styles.headerSubtitle}>Planes y suscripciones</Text>
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
            ios_icon_name="list.bullet.rectangle"
            android_material_icon_name="list"
            size={20}
            color={activeTab === 'planes' ? colors.primary : colors.textSecondary}
          />
          <Text style={[styles.tabText, activeTab === 'planes' && styles.tabTextActive]}>
            Planes
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'subscriptions' && styles.tabActive]}
          onPress={() => setActiveTab('subscriptions')}
        >
          <IconSymbol
            ios_icon_name="creditcard.fill"
            android_material_icon_name="payment"
            size={20}
            color={activeTab === 'subscriptions' ? colors.primary : colors.textSecondary}
          />
          <Text style={[styles.tabText, activeTab === 'subscriptions' && styles.tabTextActive]}>
            Suscripciones
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'assign' && styles.tabActive]}
          onPress={() => setActiveTab('assign')}
        >
          <IconSymbol
            ios_icon_name="plus.app.fill"
            android_material_icon_name="add_circle"
            size={20}
            color={activeTab === 'assign' ? colors.primary : colors.textSecondary}
          />
          <Text style={[styles.tabText, activeTab === 'assign' && styles.tabTextActive]}>
            Asignar
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'planes' && renderPlanesTab()}
      {activeTab === 'subscriptions' && renderSubscriptionsTab()}
      {activeTab === 'assign' && renderAssignTab()}

      {/* Plan Detail Modal v5.0 - NEW COMPREHENSIVE VERSION */}
      <Modal
        visible={showPlanDetailModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPlanDetailModal(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowPlanDetailModal(false)}>
          <Pressable style={styles.modalContentLarge} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <Text style={styles.modalTitle}>Detalles del Plan</Text>
                <Text style={styles.modalSubtitle}>Información completa y servicios</Text>
              </View>
              <TouchableOpacity onPress={() => setShowPlanDetailModal(false)}>
                <IconSymbol ios_icon_name="xmark.circle.fill" android_material_icon_name="cancel" size={28} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {selectedPlanDetail && (
              <ScrollView style={styles.modalScrollView} showsVerticalScrollIndicator={false}>
                {/* Plan Header */}
                <View style={styles.detailPlanHeader}>
                  <View style={styles.detailPlanHeaderTop}>
                    <Text style={styles.detailPlanName}>{selectedPlanDetail.nombre}</Text>
                    <View style={[styles.planStatusBadge, selectedPlanDetail.activo ? styles.planStatusActive : styles.planStatusInactive]}>
                      <Text style={[styles.planStatusText, selectedPlanDetail.activo ? styles.planStatusTextActive : styles.planStatusTextInactive]}>
                        {selectedPlanDetail.activo ? 'Activo' : 'Inactivo'}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.detailPlanPrice}>
                    {selectedPlanDetail.precio_mensual === 0 ? 'Plan Gratuito' : `${selectedPlanDetail.precio_mensual}€/mes`}
                  </Text>
                  {selectedPlanDetail.descripcion && (
                    <Text style={styles.detailPlanDescription}>{selectedPlanDetail.descripcion}</Text>
                  )}
                </View>

                {/* Services Section */}
                <View style={styles.detailSection}>
                  <View style={styles.detailSectionHeader}>
                    <IconSymbol ios_icon_name="star.fill" android_material_icon_name="star" size={20} color={colors.primary} />
                    <Text style={styles.detailSectionTitle}>Servicios Incluidos</Text>
                  </View>
                  
                  <View style={styles.servicesList}>
                    {selectedPlanDetail.eventos_mes > 0 && (
                      <View style={styles.serviceItem}>
                        <View style={styles.serviceIconContainer}>
                          <IconSymbol ios_icon_name="calendar.badge.plus" android_material_icon_name="event" size={24} color={colors.primary} />
                        </View>
                        <View style={styles.serviceInfo}>
                          <Text style={styles.serviceTitle}>Eventos Mensuales</Text>
                          <Text style={styles.serviceDescription}>
                            Publica hasta {selectedPlanDetail.eventos_mes} eventos cada mes para promocionar tu local
                          </Text>
                        </View>
                      </View>
                    )}

                    {selectedPlanDetail.promos_destacadas > 0 && (
                      <View style={styles.serviceItem}>
                        <View style={styles.serviceIconContainer}>
                          <IconSymbol ios_icon_name="megaphone.fill" android_material_icon_name="campaign" size={24} color={colors.badgeDestacado} />
                        </View>
                        <View style={styles.serviceInfo}>
                          <Text style={styles.serviceTitle}>Promociones Destacadas</Text>
                          <Text style={styles.serviceDescription}>
                            {selectedPlanDetail.promos_destacadas} publicaciones destacadas al mes con mayor visibilidad
                          </Text>
                        </View>
                      </View>
                    )}

                    {selectedPlanDetail.perfil_social && (
                      <View style={styles.serviceItem}>
                        <View style={styles.serviceIconContainer}>
                          <IconSymbol ios_icon_name="person.2.fill" android_material_icon_name="people" size={24} color="#10B981" />
                        </View>
                        <View style={styles.serviceInfo}>
                          <Text style={styles.serviceTitle}>Perfil Social Completo</Text>
                          <Text style={styles.serviceDescription}>
                            Acceso completo a la red social: publicaciones, historias, mensajes y más
                          </Text>
                        </View>
                      </View>
                    )}

                    {selectedPlanDetail.panel_analisis && (
                      <View style={styles.serviceItem}>
                        <View style={styles.serviceIconContainer}>
                          <IconSymbol ios_icon_name="chart.bar.fill" android_material_icon_name="bar_chart" size={24} color="#3B82F6" />
                        </View>
                        <View style={styles.serviceInfo}>
                          <Text style={styles.serviceTitle}>Panel de Análisis</Text>
                          <Text style={styles.serviceDescription}>
                            Estadísticas detalladas de visitas, interacciones y rendimiento de tu local
                          </Text>
                        </View>
                      </View>
                    )}

                    {selectedPlanDetail.soporte_prioritario && (
                      <View style={styles.serviceItem}>
                        <View style={styles.serviceIconContainer}>
                          <IconSymbol ios_icon_name="headphones" android_material_icon_name="support_agent" size={24} color="#8B5CF6" />
                        </View>
                        <View style={styles.serviceInfo}>
                          <Text style={styles.serviceTitle}>Soporte Prioritario</Text>
                          <Text style={styles.serviceDescription}>
                            Atención preferente y respuesta rápida a tus consultas
                          </Text>
                        </View>
                      </View>
                    )}

                    {selectedPlanDetail.visibilidad_extra && (
                      <View style={styles.serviceItem}>
                        <View style={styles.serviceIconContainer}>
                          <IconSymbol ios_icon_name="eye.fill" android_material_icon_name="visibility" size={24} color="#F59E0B" />
                        </View>
                        <View style={styles.serviceInfo}>
                          <Text style={styles.serviceTitle}>Visibilidad Extra</Text>
                          <Text style={styles.serviceDescription}>
                            Tu local aparece en posiciones destacadas en búsquedas y listados
                          </Text>
                        </View>
                      </View>
                    )}

                    {selectedPlanDetail.visibilidad_maxima && (
                      <View style={styles.serviceItem}>
                        <View style={styles.serviceIconContainer}>
                          <IconSymbol ios_icon_name="sparkles" android_material_icon_name="auto_awesome" size={24} color="#EC4899" />
                        </View>
                        <View style={styles.serviceInfo}>
                          <Text style={styles.serviceTitle}>Visibilidad Máxima</Text>
                          <Text style={styles.serviceDescription}>
                            Máxima exposición: aparece en la portada y en todas las secciones destacadas
                          </Text>
                        </View>
                      </View>
                    )}
                  </View>
                </View>

                {/* Additional Features */}
                <View style={styles.detailSection}>
                  <View style={styles.detailSectionHeader}>
                    <IconSymbol ios_icon_name="checkmark.seal.fill" android_material_icon_name="verified" size={20} color="#10B981" />
                    <Text style={styles.detailSectionTitle}>Características Adicionales</Text>
                  </View>
                  
                  <View style={styles.featuresList}>
                    <View style={styles.featureItem}>
                      <IconSymbol ios_icon_name="checkmark.circle.fill" android_material_icon_name="check_circle" size={20} color="#10B981" />
                      <Text style={styles.featureText}>Perfil verificado con insignia</Text>
                    </View>
                    <View style={styles.featureItem}>
                      <IconSymbol ios_icon_name="checkmark.circle.fill" android_material_icon_name="check_circle" size={20} color="#10B981" />
                      <Text style={styles.featureText}>Galería de fotos ilimitada</Text>
                    </View>
                    <View style={styles.featureItem}>
                      <IconSymbol ios_icon_name="checkmark.circle.fill" android_material_icon_name="check_circle" size={20} color="#10B981" />
                      <Text style={styles.featureText}>Horarios y ubicación destacados</Text>
                    </View>
                    <View style={styles.featureItem}>
                      <IconSymbol ios_icon_name="checkmark.circle.fill" android_material_icon_name="check_circle" size={20} color="#10B981" />
                      <Text style={styles.featureText}>Respuestas a reseñas</Text>
                    </View>
                    <View style={styles.featureItem}>
                      <IconSymbol ios_icon_name="checkmark.circle.fill" android_material_icon_name="check_circle" size={20} color="#10B981" />
                      <Text style={styles.featureText}>Notificaciones en tiempo real</Text>
                    </View>
                  </View>
                </View>

                {/* Pricing Summary */}
                <View style={styles.pricingSummary}>
                  <View style={styles.pricingRow}>
                    <Text style={styles.pricingLabel}>Precio Mensual:</Text>
                    <Text style={styles.pricingValue}>
                      {selectedPlanDetail.precio_mensual === 0 ? 'Gratis' : `${selectedPlanDetail.precio_mensual}€`}
                    </Text>
                  </View>
                  <View style={styles.pricingRow}>
                    <Text style={styles.pricingLabel}>IVA (21%):</Text>
                    <Text style={styles.pricingValue}>
                      {selectedPlanDetail.precio_mensual === 0 ? '0€' : `${(selectedPlanDetail.precio_mensual * 0.21).toFixed(2)}€`}
                    </Text>
                  </View>
                  <View style={[styles.pricingRow, styles.pricingTotal]}>
                    <Text style={styles.pricingTotalLabel}>Total:</Text>
                    <Text style={styles.pricingTotalValue}>
                      {selectedPlanDetail.precio_mensual === 0 ? 'Gratis' : `${(selectedPlanDetail.precio_mensual * 1.21).toFixed(2)}€/mes`}
                    </Text>
                  </View>
                </View>
              </ScrollView>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalEditButton}
                onPress={() => {
                  if (selectedPlanDetail) {
                    setShowPlanDetailModal(false);
                    handleEditPlan(selectedPlanDetail);
                  }
                }}
              >
                <IconSymbol ios_icon_name="pencil.circle.fill" android_material_icon_name="edit" size={20} color={colors.white} />
                <Text style={styles.modalEditButtonText}>Editar Plan</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowPlanDetailModal(false)}
              >
                <Text style={styles.modalCloseButtonText}>Cerrar</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Assign Plan Modal v5.0 - NEW COMPREHENSIVE VERSION */}
      <Modal
        visible={showAssignModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAssignModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <Pressable style={styles.modalOverlay} onPress={() => setShowAssignModal(false)}>
            <Pressable style={styles.modalContentLarge} onPress={(e) => e.stopPropagation()}>
              <View style={styles.modalHeader}>
                <View style={styles.modalHeaderLeft}>
                  <Text style={styles.modalTitle}>Asignar Plan a Local</Text>
                  <Text style={styles.modalSubtitle}>Selecciona un local y un plan</Text>
                </View>
                <TouchableOpacity onPress={() => setShowAssignModal(false)}>
                  <IconSymbol ios_icon_name="xmark.circle.fill" android_material_icon_name="cancel" size={28} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalScrollView} showsVerticalScrollIndicator={false}>
                {/* Step 1: Search Local */}
                <View style={styles.assignStep}>
                  <View style={styles.assignStepHeader}>
                    <View style={styles.assignStepNumber}>
                      <Text style={styles.assignStepNumberText}>1</Text>
                    </View>
                    <Text style={styles.assignStepTitle}>Buscar Local</Text>
                  </View>
                  
                  <View style={styles.searchInputContainer}>
                    <IconSymbol ios_icon_name="magnifyingglass" android_material_icon_name="search" size={20} color={colors.textSecondary} />
                    <TextInput
                      style={styles.searchInput}
                      placeholder="Buscar local por nombre..."
                      placeholderTextColor={colors.textSecondary}
                      value={searchQuery}
                      onChangeText={setSearchQuery}
                    />
                    {searching && <ActivityIndicator size="small" color={colors.primary} />}
                  </View>

                  {selectedLocal ? (
                    <View style={styles.selectedLocalCard}>
                      <View style={styles.selectedLocalHeader}>
                        <IconSymbol ios_icon_name="checkmark.circle.fill" android_material_icon_name="check_circle" size={24} color="#10B981" />
                        <Text style={styles.selectedLocalLabel}>Local Seleccionado</Text>
                      </View>
                      <Text style={styles.selectedLocalName}>{selectedLocal.nombre}</Text>
                      <Text style={styles.selectedLocalInfo}>
                        {selectedLocal.tipo} • {selectedLocal.provincia}
                      </Text>
                      <TouchableOpacity
                        style={styles.changeLocalButton}
                        onPress={() => {
                          setSelectedLocal(null);
                          setSearchQuery('');
                        }}
                      >
                        <Text style={styles.changeLocalButtonText}>Cambiar Local</Text>
                      </TouchableOpacity>
                    </View>
                  ) : searchResults.length > 0 ? (
                    <View style={styles.searchResultsContainer}>
                      <Text style={styles.searchResultsTitle}>Resultados ({searchResults.length})</Text>
                      {searchResults.map((local) => (
                        <TouchableOpacity
                          key={local.id}
                          style={styles.searchResultItem}
                          onPress={() => {
                            setSelectedLocal(local);
                            setSearchQuery('');
                            setSearchResults([]);
                          }}
                        >
                          {/* ✅ IMPROVED: Show local cover photo */}
                          {local.imagen_url ? (
                            <Image 
                              source={{ uri: local.imagen_url }} 
                              style={styles.searchResultImage}
                              resizeMode="cover"
                            />
                          ) : (
                            <View style={[styles.searchResultImage, styles.searchResultImagePlaceholder]}>
                              <IconSymbol ios_icon_name="building.2.fill" android_material_icon_name="store" size={24} color={colors.white} />
                            </View>
                          )}
                          <View style={styles.searchResultInfo}>
                            <Text style={styles.searchResultName}>{local.nombre}</Text>
                            <Text style={styles.searchResultDetails}>{local.tipo} • {local.provincia}</Text>
                            {/* ✅ NEW: Show owner information */}
                            {local.propietario ? (
                              <View style={styles.searchResultOwner}>
                                <IconSymbol ios_icon_name="person.fill" android_material_icon_name="person" size={12} color={colors.primary} />
                                <Text style={styles.searchResultOwnerText}>
                                  {local.propietario.username ? `@${local.propietario.username}` : local.propietario.nombre}
                                </Text>
                              </View>
                            ) : (
                              <View style={styles.searchResultOwner}>
                                <IconSymbol ios_icon_name="person.crop.circle.badge.xmark" android_material_icon_name="person_off" size={12} color={colors.textSecondary} />
                                <Text style={styles.searchResultOwnerTextUnassigned}>Sin asignar</Text>
                              </View>
                            )}
                          </View>
                          <IconSymbol ios_icon_name="chevron.right" android_material_icon_name="chevron_right" size={20} color={colors.textSecondary} />
                        </TouchableOpacity>
                      ))}
                    </View>
                  ) : searchQuery.length >= 2 && !searching ? (
                    <View style={styles.noResultsContainer}>
                      <IconSymbol ios_icon_name="magnifyingglass" android_material_icon_name="search_off" size={32} color={colors.textSecondary} />
                      <Text style={styles.noResultsText}>No se encontraron locales</Text>
                    </View>
                  ) : null}
                </View>

                {/* Step 2: Select Plan */}
                {selectedLocal && (
                  <View style={styles.assignStep}>
                    <View style={styles.assignStepHeader}>
                      <View style={styles.assignStepNumber}>
                        <Text style={styles.assignStepNumberText}>2</Text>
                      </View>
                      <Text style={styles.assignStepTitle}>Seleccionar Plan</Text>
                    </View>

                    <View style={styles.plansListContainer}>
                      {planes.filter(p => p.activo).map((plan) => (
                        <TouchableOpacity
                          key={plan.id}
                          style={[
                            styles.planSelectCard,
                            selectedPlan === plan.id && styles.planSelectCardActive
                          ]}
                          onPress={() => setSelectedPlan(plan.id)}
                        >
                          <View style={styles.planSelectHeader}>
                            <View style={styles.planSelectInfo}>
                              <Text style={styles.planSelectName}>{plan.nombre}</Text>
                              <Text style={styles.planSelectPrice}>
                                {plan.precio_mensual === 0 ? 'Gratis' : `${plan.precio_mensual}€/mes`}
                              </Text>
                            </View>
                            {selectedPlan === plan.id ? (
                              <View style={styles.planSelectCheckmark}>
                                <IconSymbol ios_icon_name="checkmark.circle.fill" android_material_icon_name="check_circle" size={28} color={colors.primary} />
                              </View>
                            ) : (
                              <View style={styles.planSelectCircle} />
                            )}
                          </View>
                          
                          {plan.descripcion && (
                            <Text style={styles.planSelectDescription}>{plan.descripcion}</Text>
                          )}

                          <View style={styles.planSelectFeatures}>
                            {plan.eventos_mes > 0 && (
                              <View style={styles.planSelectFeature}>
                                <IconSymbol ios_icon_name="checkmark" android_material_icon_name="check" size={14} color="#10B981" />
                                <Text style={styles.planSelectFeatureText}>{plan.eventos_mes} eventos/mes</Text>
                              </View>
                            )}
                            {plan.promos_destacadas > 0 && (
                              <View style={styles.planSelectFeature}>
                                <IconSymbol ios_icon_name="checkmark" android_material_icon_name="check" size={14} color="#10B981" />
                                <Text style={styles.planSelectFeatureText}>{plan.promos_destacadas} promos destacadas</Text>
                              </View>
                            )}
                            {plan.perfil_social && (
                              <View style={styles.planSelectFeature}>
                                <IconSymbol ios_icon_name="checkmark" android_material_icon_name="check" size={14} color="#10B981" />
                                <Text style={styles.planSelectFeatureText}>Perfil social</Text>
                              </View>
                            )}
                            {plan.panel_analisis && (
                              <View style={styles.planSelectFeature}>
                                <IconSymbol ios_icon_name="checkmark" android_material_icon_name="check" size={14} color="#10B981" />
                                <Text style={styles.planSelectFeatureText}>Panel de análisis</Text>
                              </View>
                            )}
                          </View>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}

                {/* Step 3: Confirmation */}
                {selectedLocal && selectedPlan && (
                  <View style={styles.assignStep}>
                    <View style={styles.assignStepHeader}>
                      <View style={styles.assignStepNumber}>
                        <Text style={styles.assignStepNumberText}>3</Text>
                      </View>
                      <Text style={styles.assignStepTitle}>Confirmar Asignación</Text>
                    </View>

                    <View style={styles.confirmationCard}>
                      <View style={styles.confirmationRow}>
                        <Text style={styles.confirmationLabel}>Local:</Text>
                        <Text style={styles.confirmationValue}>{selectedLocal.nombre}</Text>
                      </View>
                      <View style={styles.confirmationRow}>
                        <Text style={styles.confirmationLabel}>Plan:</Text>
                        <Text style={styles.confirmationValue}>
                          {planes.find(p => p.id === selectedPlan)?.nombre}
                        </Text>
                      </View>
                      <View style={styles.confirmationRow}>
                        <Text style={styles.confirmationLabel}>Precio:</Text>
                        <Text style={styles.confirmationValue}>
                          {planes.find(p => p.id === selectedPlan)?.precio_mensual === 0 
                            ? 'Gratis' 
                            : `${planes.find(p => p.id === selectedPlan)?.precio_mensual}€/mes`}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.confirmationNote}>
                      <IconSymbol ios_icon_name="info.circle.fill" android_material_icon_name="info" size={20} color={colors.primary} />
                      <Text style={styles.confirmationNoteText}>
                        El perfil del local se activará automáticamente al asignar el plan.
                      </Text>
                    </View>
                  </View>
                )}
              </ScrollView>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[
                    styles.modalPrimaryButton,
                    (!selectedLocal || !selectedPlan || assigning) && styles.modalPrimaryButtonDisabled
                  ]}
                  onPress={asignarPlan}
                  disabled={!selectedLocal || !selectedPlan || assigning}
                >
                  {assigning ? (
                    <ActivityIndicator size="small" color={colors.white} />
                  ) : (
                    <>
                      <IconSymbol ios_icon_name="checkmark.circle.fill" android_material_icon_name="check_circle" size={20} color={colors.white} />
                      <Text style={styles.modalPrimaryButtonText}>Asignar Plan</Text>
                    </>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalCancelButton}
                  onPress={() => setShowAssignModal(false)}
                >
                  <Text style={styles.modalCancelText}>Cancelar</Text>
                </TouchableOpacity>
              </View>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>

      {/* Edit Plan Modal */}
      <Modal
        visible={showEditPlanModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowEditPlanModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <Pressable style={styles.modalOverlay} onPress={() => setShowEditPlanModal(false)}>
            <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Editar Plan</Text>
                <TouchableOpacity onPress={() => setShowEditPlanModal(false)}>
                  <IconSymbol ios_icon_name="xmark.circle.fill" android_material_icon_name="cancel" size={28} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalScrollView} showsVerticalScrollIndicator={false}>
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Nombre del Plan *</Text>
                  <TextInput
                    style={styles.formInput}
                    value={editPlanNombre}
                    onChangeText={setEditPlanNombre}
                    placeholder="Ej: Básico, Premium..."
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Descripción</Text>
                  <TextInput
                    style={[styles.formInput, styles.formTextArea]}
                    value={editPlanDescripcion}
                    onChangeText={setEditPlanDescripcion}
                    placeholder="Descripción del plan..."
                    placeholderTextColor={colors.textSecondary}
                    multiline
                    numberOfLines={3}
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Precio Mensual (€)</Text>
                  <TextInput
                    style={styles.formInput}
                    value={editPlanPrecio}
                    onChangeText={setEditPlanPrecio}
                    placeholder="0"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="decimal-pad"
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Eventos por Mes</Text>
                  <TextInput
                    style={styles.formInput}
                    value={editPlanEventos}
                    onChangeText={setEditPlanEventos}
                    placeholder="0"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="number-pad"
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Promos Destacadas</Text>
                  <TextInput
                    style={styles.formInput}
                    value={editPlanPromos}
                    onChangeText={setEditPlanPromos}
                    placeholder="0"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="number-pad"
                  />
                </View>

                <View style={styles.formGroup}>
                  <View style={styles.switchRow}>
                    <Text style={styles.switchLabel}>Plan Activo</Text>
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
                    <Text style={styles.switchLabel}>Perfil Social</Text>
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
                    <Text style={styles.switchLabel}>Panel de Análisis</Text>
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
                    <Text style={styles.switchLabel}>Soporte Prioritario</Text>
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
                    <Text style={styles.switchLabel}>Visibilidad Extra</Text>
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
                    <Text style={styles.switchLabel}>Visibilidad Máxima</Text>
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
                    <IconSymbol ios_icon_name="checkmark.circle.fill" android_material_icon_name="check_circle" size={20} color={colors.white} />
                    <Text style={styles.modalPrimaryButtonText}>Guardar Cambios</Text>
                  </>
                )}
              </TouchableOpacity>

              {editingPlan && (
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleDeletePlan(editingPlan.id, editingPlan.nombre)}
                >
                  <IconSymbol ios_icon_name="trash.fill" android_material_icon_name="delete" size={20} color="#EF4444" />
                  <Text style={styles.deleteButtonText}>Eliminar Plan</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity style={styles.modalCancelButton} onPress={() => setShowEditPlanModal(false)}>
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>

      {/* Create Plan Modal */}
      <Modal
        visible={showCreatePlanModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCreatePlanModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <Pressable style={styles.modalOverlay} onPress={() => setShowCreatePlanModal(false)}>
            <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Crear Nuevo Plan</Text>
                <TouchableOpacity onPress={() => setShowCreatePlanModal(false)}>
                  <IconSymbol ios_icon_name="xmark.circle.fill" android_material_icon_name="cancel" size={28} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalScrollView} showsVerticalScrollIndicator={false}>
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Nombre del Plan *</Text>
                  <TextInput
                    style={styles.formInput}
                    value={createPlanNombre}
                    onChangeText={setCreatePlanNombre}
                    placeholder="Ej: Básico, Premium..."
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Descripción</Text>
                  <TextInput
                    style={[styles.formInput, styles.formTextArea]}
                    value={createPlanDescripcion}
                    onChangeText={setCreatePlanDescripcion}
                    placeholder="Descripción del plan..."
                    placeholderTextColor={colors.textSecondary}
                    multiline
                    numberOfLines={3}
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Precio Mensual (€)</Text>
                  <TextInput
                    style={styles.formInput}
                    value={createPlanPrecio}
                    onChangeText={setCreatePlanPrecio}
                    placeholder="0"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="decimal-pad"
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Eventos por Mes</Text>
                  <TextInput
                    style={styles.formInput}
                    value={createPlanEventos}
                    onChangeText={setCreatePlanEventos}
                    placeholder="0"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="number-pad"
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Promos Destacadas</Text>
                  <TextInput
                    style={styles.formInput}
                    value={createPlanPromos}
                    onChangeText={setCreatePlanPromos}
                    placeholder="0"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="number-pad"
                  />
                </View>

                <View style={styles.formGroup}>
                  <View style={styles.switchRow}>
                    <Text style={styles.switchLabel}>Plan Activo</Text>
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
                    <Text style={styles.switchLabel}>Perfil Social</Text>
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
                    <Text style={styles.switchLabel}>Panel de Análisis</Text>
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
                    <Text style={styles.switchLabel}>Soporte Prioritario</Text>
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
                    <Text style={styles.switchLabel}>Visibilidad Extra</Text>
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
                    <Text style={styles.switchLabel}>Visibilidad Máxima</Text>
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
                    <IconSymbol ios_icon_name="plus.circle.fill" android_material_icon_name="add_circle" size={20} color={colors.white} />
                    <Text style={styles.modalPrimaryButtonText}>Crear Plan</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity style={styles.modalCancelButton} onPress={() => setShowCreatePlanModal(false)}>
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
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
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.headerText,
  },
  headerSubtitle: {
    fontSize: 14,
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
    fontSize: 14,
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
    fontSize: 16,
    color: colors.textSecondary,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  sectionSubtitle: {
    fontSize: 14,
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
    fontSize: 14,
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
  planHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  planName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  planPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
  planStatusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  planStatusActive: {
    backgroundColor: '#D1FAE5',
  },
  planStatusInactive: {
    backgroundColor: '#FEE2E2',
  },
  planStatusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  planStatusTextActive: {
    color: '#10B981',
  },
  planStatusTextInactive: {
    color: '#EF4444',
  },
  editPlanButton: {
    padding: 4,
  },
  planDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 12,
    lineHeight: 20,
  },
  planFeatures: {
    gap: 8,
    marginBottom: 12,
  },
  planFeatureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  planFeatureText: {
    fontSize: 14,
    color: colors.text,
    flex: 1,
  },
  viewDetailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
    marginTop: 8,
  },
  viewDetailsButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
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
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  subscriptionHeaderLeft: {
    flex: 1,
  },
  subscriptionLocalName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  subscriptionPlanName: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  subscriptionDates: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  subscriptionDateItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  subscriptionDate: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FEE2E2',
    paddingVertical: 10,
    borderRadius: 8,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#EF4444',
  },
  assignButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  assignButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: colors.primary + '10',
    padding: 16,
    borderRadius: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  emptyState: {
    paddingVertical: 60,
    alignItems: 'center',
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
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
  modalContentLarge: {
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
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  modalHeaderLeft: {
    flex: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  modalSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  modalScrollView: {
    maxHeight: 500,
    marginBottom: 16,
  },
  // Plan Detail Modal v5.0 Styles
  detailPlanHeader: {
    backgroundColor: colors.primary + '10',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  detailPlanHeaderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailPlanName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    flex: 1,
  },
  detailPlanPrice: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 8,
  },
  detailPlanDescription: {
    fontSize: 15,
    color: colors.text,
    lineHeight: 22,
  },
  detailSection: {
    marginBottom: 24,
  },
  detailSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: colors.cardBorder,
  },
  detailSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  servicesList: {
    gap: 16,
  },
  serviceItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: colors.cardBackground,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  serviceIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  serviceInfo: {
    flex: 1,
  },
  serviceTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  serviceDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  featuresList: {
    gap: 12,
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
  pricingSummary: {
    backgroundColor: colors.cardBackground,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginTop: 8,
  },
  pricingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  pricingLabel: {
    fontSize: 15,
    color: colors.textSecondary,
  },
  pricingValue: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  pricingTotal: {
    borderTopWidth: 2,
    borderTopColor: colors.cardBorder,
    marginTop: 8,
    paddingTop: 16,
  },
  pricingTotalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  pricingTotalValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.primary,
  },
  // Assign Modal v5.0 Styles
  assignStep: {
    marginBottom: 24,
  },
  assignStepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  assignStepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  assignStepNumberText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.white,
  },
  assignStepTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
  },
  selectedLocalCard: {
    backgroundColor: '#D1FAE5',
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#10B981',
  },
  selectedLocalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  selectedLocalLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#059669',
    textTransform: 'uppercase',
  },
  selectedLocalName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#065F46',
    marginBottom: 4,
  },
  selectedLocalInfo: {
    fontSize: 14,
    color: '#059669',
    marginBottom: 12,
  },
  changeLocalButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.white,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#10B981',
  },
  changeLocalButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#059669',
  },
  searchResultsContainer: {
    marginTop: 16,
  },
  searchResultsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 12,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    backgroundColor: colors.cardBackground,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  // ✅ IMPROVED: Show cover photo instead of icon
  searchResultImage: {
    width: 60,
    height: 60,
    borderRadius: 10,
  },
  searchResultImagePlaceholder: {
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchResultIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchResultInfo: {
    flex: 1,
  },
  searchResultName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  searchResultDetails: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  // ✅ NEW: Owner information in search results
  searchResultOwner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  searchResultOwnerText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  searchResultOwnerTextUnassigned: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  noResultsContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    gap: 12,
  },
  noResultsText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  plansListContainer: {
    gap: 12,
  },
  planSelectCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: colors.cardBorder,
  },
  planSelectCardActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '08',
  },
  planSelectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  planSelectInfo: {
    flex: 1,
  },
  planSelectName: {
    fontSize: 17,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  planSelectPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
  planSelectCheckmark: {
    marginLeft: 12,
  },
  planSelectCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.cardBorder,
    marginLeft: 12,
  },
  planSelectDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 12,
    lineHeight: 20,
  },
  planSelectFeatures: {
    gap: 8,
  },
  planSelectFeature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  planSelectFeatureText: {
    fontSize: 13,
    color: colors.text,
  },
  confirmationCard: {
    backgroundColor: colors.cardBackground,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: 16,
  },
  confirmationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  confirmationLabel: {
    fontSize: 15,
    color: colors.textSecondary,
  },
  confirmationValue: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  confirmationNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: colors.primary + '10',
    padding: 12,
    borderRadius: 8,
  },
  confirmationNoteText: {
    flex: 1,
    fontSize: 13,
    color: colors.text,
    lineHeight: 18,
  },
  modalActions: {
    gap: 12,
  },
  modalPrimaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
  },
  modalPrimaryButtonDisabled: {
    backgroundColor: colors.cardBorder,
    opacity: 0.5,
  },
  modalPrimaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.white,
  },
  modalEditButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
  },
  modalEditButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.white,
  },
  modalCloseButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalCloseButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  modalCancelButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  formGroup: {
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  formInput: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
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
    fontSize: 16,
    color: colors.text,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FEE2E2',
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  deleteButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#EF4444',
  },
});
