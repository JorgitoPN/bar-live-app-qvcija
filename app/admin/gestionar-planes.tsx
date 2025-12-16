
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

  // Plan detail modal state
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
      const { data, error } = await supabase
        .from('locales')
        .select('id, nombre, imagen_url, provincia, tipo')
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

      const { error: subscriptionError } = await supabase
        .from('suscripciones_locales')
        .insert({
          local_id: selectedLocal.id,
          plan_id: selectedPlan,
          estado: 'activa',
          fecha_inicio: fechaInicio.toISOString(),
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

  const handleViewPlanDetail = (plan: Plan) => {
    setSelectedPlanDetail(plan);
    setShowPlanDetailModal(true);
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
          onPress={() => handleEditPlan(plan)}
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

      {/* Assign Plan Modal */}
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
            <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Asignar Plan a Local</Text>
                <TouchableOpacity onPress={() => setShowAssignModal(false)}>
                  <IconSymbol ios_icon_name="xmark.circle.fill" android_material_icon_name="cancel" size={28} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <View style={styles.searchInputContainer}>
                <IconSymbol ios_icon_name="magnifyingglass" android_material_icon_name="search" size={20} color={colors.textSecondary} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Buscar local..."
                  placeholderTextColor={colors.textSecondary}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
                {searching && <ActivityIndicator size="small" color={colors.primary} />}
              </View>

              {selectedLocal && (
                <View style={styles.selectedLocalCard}>
                  <Text style={styles.selectedLocalLabel}>Local seleccionado:</Text>
                  <Text style={styles.selectedLocalName}>{selectedLocal.nombre}</Text>
                  <Text style={styles.selectedLocalInfo}>{selectedLocal.provincia} - {selectedLocal.tipo}</Text>
                </View>
              )}

              {searchResults.length > 0 && !selectedLocal && (
                <ScrollView style={styles.searchResultsContainer}>
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
                      <Text style={styles.searchResultName}>{local.nombre}</Text>
                      <Text style={styles.searchResultInfo}>{local.provincia} - {local.tipo}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}

              {selectedLocal && (
                <>
                  <Text style={styles.selectPlanLabel}>Selecciona un plan:</Text>
                  <ScrollView style={styles.plansListContainer}>
                    {planes.filter(p => p.activo).map((plan) => (
                      <TouchableOpacity
                        key={plan.id}
                        style={[
                          styles.planSelectItem,
                          selectedPlan === plan.id && styles.planSelectItemActive
                        ]}
                        onPress={() => setSelectedPlan(plan.id)}
                      >
                        <View style={styles.planSelectInfo}>
                          <Text style={styles.planSelectName}>{plan.nombre}</Text>
                          <Text style={styles.planSelectPrice}>
                            {plan.precio_mensual === 0 ? 'Gratis' : `${plan.precio_mensual}€/mes`}
                          </Text>
                        </View>
                        {selectedPlan === plan.id && (
                          <IconSymbol ios_icon_name="checkmark.circle.fill" android_material_icon_name="check_circle" size={24} color={colors.primary} />
                        )}
                      </TouchableOpacity>
                    ))}
                  </ScrollView>

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
                </>
              )}

              <TouchableOpacity style={styles.modalCancelButton} onPress={() => setShowAssignModal(false)}>
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>
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
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    flex: 1,
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
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
  },
  selectedLocalCard: {
    backgroundColor: colors.primary + '10',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  selectedLocalLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  selectedLocalName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  selectedLocalInfo: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  searchResultsContainer: {
    maxHeight: 200,
    marginBottom: 16,
  },
  searchResultItem: {
    padding: 12,
    backgroundColor: colors.cardBackground,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  searchResultName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  searchResultInfo: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  selectPlanLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  plansListContainer: {
    maxHeight: 200,
    marginBottom: 16,
  },
  planSelectItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: colors.cardBackground,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: colors.cardBorder,
  },
  planSelectItemActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  planSelectInfo: {
    flex: 1,
  },
  planSelectName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  planSelectPrice: {
    fontSize: 14,
    color: colors.textSecondary,
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
    fontSize: 16,
    fontWeight: '700',
    color: colors.white,
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
  modalScrollView: {
    maxHeight: 400,
    marginBottom: 16,
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
