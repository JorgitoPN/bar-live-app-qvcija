
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
      console.log('[GestionarPlanes] ✅ Loading plans...');
      const { data, error } = await supabase
        .from('planes_suscripcion')
        .select('*')
        .order('precio_mensual', { ascending: true });

      if (error) {
        console.error('[GestionarPlanes] ❌ Error loading plans:', error);
        throw error;
      }

      console.log('[GestionarPlanes] ✅ Loaded plans:', data?.length || 0);
      setPlanes(data || []);
    } catch (error) {
      console.error('[GestionarPlanes] Error loading plans:', error);
      Alert.alert('Error', 'No se pudieron cargar los planes');
    }
  }, []);

  const cargarSuscripciones = useCallback(async () => {
    try {
      console.log('[GestionarPlanes] ✅ Loading subscriptions...');
      
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
        console.error('[GestionarPlanes] ❌ Error loading subscriptions:', error);
        throw error;
      }

      console.log('[GestionarPlanes] ✅ Loaded subscriptions:', data?.length || 0);
      setSubscriptions(data || []);
    } catch (error) {
      console.error('[GestionarPlanes] Error loading subscriptions:', error);
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

      console.log('[GestionarPlanes] ✅ Found locales:', data?.length || 0);
      setSearchResults(data || []);
    } catch (error) {
      console.error('[GestionarPlanes] Error searching locales:', error);
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
      console.error('[GestionarPlanes] Error assigning plan:', error);
      Alert.alert('Error', 'No se pudo asignar el plan');
      setAssigning(false);
    }
  };

  const crearNuevaSuscripcion = async () => {
    if (!selectedLocal || !selectedPlan) return;

    try {
      const plan = planes.find(p => p.id === selectedPlan);
      if (!plan) throw new Error('Plan not found');

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
        console.error('[GestionarPlanes] Error enabling local:', localError);
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
      console.error('[GestionarPlanes] Error creating subscription:', error);
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
              console.error('[GestionarPlanes] Error canceling subscription:', error);
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
      console.error('[GestionarPlanes] Error saving plan:', error);
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
      console.error('[GestionarPlanes] Error creating plan:', error);
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
              console.error('[GestionarPlanes] Error deleting plan:', error);
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
        <Text style={styles.sectionTitle}>Planes Disponibles</Text>
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => setShowCreatePlanModal(true)}
        >
          <IconSymbol ios_icon_name="plus.circle.fill" android_material_icon_name="add_circle" size={20} color={colors.white} />
          <Text style={styles.createButtonText}>Crear Plan</Text>
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
                <IconSymbol ios_icon_name="pencil" android_material_icon_name="edit" size={18} color={colors.primary} />
              </TouchableOpacity>
            </View>
          </View>
          {plan.descripcion && (
            <Text style={styles.planDescription} numberOfLines={2}>{plan.descripcion}</Text>
          )}
          <View style={styles.planFeatures}>
            {plan.eventos_mes > 0 && (
              <View style={styles.planFeatureItem}>
                <IconSymbol ios_icon_name="calendar" android_material_icon_name="event" size={16} color={colors.primary} />
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
      <Text style={styles.sectionTitle}>Suscripciones Activas</Text>
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
                <Text style={styles.subscriptionDate}>
                  Inicio: {new Date(subscription.fecha_inicio).toLocaleDateString()}
                </Text>
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
        <Text style={styles.sectionTitle}>Asignar Plan a Local</Text>
        <Text style={styles.sectionDescription}>
          Busca un local y asígnale un plan de pago. El perfil del local se habilitará automáticamente.
        </Text>

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
        <LinearGradient colors={[colors.primary, colors.secondary]} style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <IconSymbol ios_icon_name="chevron.left" android_material_icon_name="arrow_back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Gestionar Planes de Pago</Text>
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
      <LinearGradient colors={[colors.primary, colors.secondary]} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <IconSymbol ios_icon_name="chevron.left" android_material_icon_name="arrow_back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Gestionar Planes de Pago</Text>
        <TouchableOpacity onPress={cargarDatos}>
          <IconSymbol ios_icon_name="arrow.clockwise" android_material_icon_name="refresh" size={24} color="white" />
        </TouchableOpacity>
      </LinearGradient>

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'planes' && styles.tabActive]}
          onPress={() => setActiveTab('planes')}
        >
          <IconSymbol
            ios_icon_name="list.bullet"
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
            ios_icon_name="plus.circle.fill"
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
          keyboardVerticalOffset={0}
        >
          <TouchableOpacity
            style={styles.modalOverlayTouchable}
            activeOpacity={1}
            onPress={() => {
              Keyboard.dismiss();
            }}
          >
            <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Asignar Plan a Local</Text>
                <TouchableOpacity onPress={() => setShowAssignModal(false)}>
                  <IconSymbol ios_icon_name="xmark" android_material_icon_name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>

              <ScrollView
                style={styles.modalBody}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.modalBodyContent}
              >
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Buscar Local</Text>
                  <View style={styles.searchContainer}>
                    <IconSymbol ios_icon_name="magnifyingglass" android_material_icon_name="search" size={20} color={colors.textSecondary} />
                    <TextInput
                      style={styles.searchInput}
                      placeholder="Nombre del local..."
                      placeholderTextColor={colors.textSecondary}
                      value={searchQuery}
                      onChangeText={setSearchQuery}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </View>
                </View>

                {searching && (
                  <View style={styles.searchingContainer}>
                    <ActivityIndicator size="small" color={colors.primary} />
                    <Text style={styles.searchingText}>Buscando...</Text>
                  </View>
                )}

                {searchResults.length > 0 && !selectedLocal && (
                  <View style={styles.searchResults}>
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
                        <View style={styles.searchResultInfo}>
                          <Text style={styles.searchResultName}>{local.nombre}</Text>
                          <Text style={styles.searchResultDetails}>
                            {local.tipo} • {local.provincia}
                          </Text>
                        </View>
                        <IconSymbol ios_icon_name="chevron.right" android_material_icon_name="chevron_right" size={20} color={colors.textSecondary} />
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {selectedLocal && (
                  <View style={styles.selectedLocalCard}>
                    <View style={styles.selectedLocalHeader}>
                      <Text style={styles.selectedLocalName}>{selectedLocal.nombre}</Text>
                      <TouchableOpacity onPress={() => setSelectedLocal(null)}>
                        <IconSymbol ios_icon_name="xmark.circle.fill" android_material_icon_name="cancel" size={24} color={colors.textSecondary} />
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.selectedLocalDetails}>
                      {selectedLocal.tipo} • {selectedLocal.provincia}
                    </Text>
                  </View>
                )}

                {selectedLocal && (
                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Seleccionar Plan</Text>
                    {planes.filter(p => p.activo).map((plan) => (
                      <TouchableOpacity
                        key={plan.id}
                        style={[
                          styles.planOption,
                          selectedPlan === plan.id && styles.planOptionSelected
                        ]}
                        onPress={() => setSelectedPlan(plan.id)}
                      >
                        <View style={styles.planOptionInfo}>
                          <Text style={styles.planOptionName}>{plan.nombre}</Text>
                          <Text style={styles.planOptionPrice}>
                            {plan.precio_mensual === 0 ? 'Gratis' : `${plan.precio_mensual}€/mes`}
                          </Text>
                        </View>
                        {selectedPlan === plan.id && (
                          <IconSymbol ios_icon_name="checkmark.circle.fill" android_material_icon_name="check_circle" size={24} color={colors.primary} />
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {selectedLocal && selectedPlan && (
                  <TouchableOpacity
                    style={styles.confirmButton}
                    onPress={asignarPlan}
                    disabled={assigning}
                  >
                    {assigning ? (
                      <ActivityIndicator size="small" color="white" />
                    ) : (
                      <React.Fragment>
                        <IconSymbol ios_icon_name="checkmark.circle.fill" android_material_icon_name="check_circle" size={20} color="white" />
                        <Text style={styles.confirmButtonText}>Asignar Plan</Text>
                      </React.Fragment>
                    )}
                  </TouchableOpacity>
                )}
              </ScrollView>
            </View>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>

      {/* Plan Detail Modal */}
      <Modal
        visible={showPlanDetailModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPlanDetailModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Detalle del Plan</Text>
              <TouchableOpacity onPress={() => setShowPlanDetailModal(false)}>
                <IconSymbol ios_icon_name="xmark" android_material_icon_name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} contentContainerStyle={styles.modalBodyContent}>
              {selectedPlanDetail && (
                <React.Fragment>
                  <View style={styles.planDetailHeader}>
                    <View>
                      <Text style={styles.planDetailName}>{selectedPlanDetail.nombre}</Text>
                      <Text style={styles.planDetailPrice}>
                        {selectedPlanDetail.precio_mensual === 0 ? 'Gratis' : `${selectedPlanDetail.precio_mensual}€/mes`}
                      </Text>
                    </View>
                    <View style={[
                      styles.planStatusBadge,
                      selectedPlanDetail.activo ? styles.planStatusActive : styles.planStatusInactive
                    ]}>
                      <Text style={[
                        styles.planStatusText,
                        selectedPlanDetail.activo ? styles.planStatusTextActive : styles.planStatusTextInactive
                      ]}>
                        {selectedPlanDetail.activo ? 'Activo' : 'Inactivo'}
                      </Text>
                    </View>
                  </View>

                  {selectedPlanDetail.descripcion && (
                    <View style={styles.planDetailSection}>
                      <Text style={styles.planDetailSectionTitle}>Descripción</Text>
                      <Text style={styles.planDetailText}>{selectedPlanDetail.descripcion}</Text>
                    </View>
                  )}

                  <View style={styles.planDetailSection}>
                    <Text style={styles.planDetailSectionTitle}>Características</Text>
                    <View style={styles.planDetailFeature}>
                      <IconSymbol 
                        ios_icon_name={selectedPlanDetail.eventos_mes > 0 ? "checkmark.circle.fill" : "xmark.circle.fill"} 
                        android_material_icon_name={selectedPlanDetail.eventos_mes > 0 ? "check_circle" : "cancel"} 
                        size={20} 
                        color={selectedPlanDetail.eventos_mes > 0 ? "#10B981" : "#EF4444"} 
                      />
                      <Text style={styles.planDetailFeatureText}>
                        {selectedPlanDetail.eventos_mes > 0 ? `${selectedPlanDetail.eventos_mes} eventos/mes` : 'Sin eventos'}
                      </Text>
                    </View>
                    <View style={styles.planDetailFeature}>
                      <IconSymbol 
                        ios_icon_name={selectedPlanDetail.promos_destacadas > 0 ? "checkmark.circle.fill" : "xmark.circle.fill"} 
                        android_material_icon_name={selectedPlanDetail.promos_destacadas > 0 ? "check_circle" : "cancel"} 
                        size={20} 
                        color={selectedPlanDetail.promos_destacadas > 0 ? "#10B981" : "#EF4444"} 
                      />
                      <Text style={styles.planDetailFeatureText}>
                        {selectedPlanDetail.promos_destacadas > 0 ? `${selectedPlanDetail.promos_destacadas} promos destacadas` : 'Sin promos'}
                      </Text>
                    </View>
                    <View style={styles.planDetailFeature}>
                      <IconSymbol 
                        ios_icon_name={selectedPlanDetail.perfil_social ? "checkmark.circle.fill" : "xmark.circle.fill"} 
                        android_material_icon_name={selectedPlanDetail.perfil_social ? "check_circle" : "cancel"} 
                        size={20} 
                        color={selectedPlanDetail.perfil_social ? "#10B981" : "#EF4444"} 
                      />
                      <Text style={styles.planDetailFeatureText}>Perfil social</Text>
                    </View>
                    <View style={styles.planDetailFeature}>
                      <IconSymbol 
                        ios_icon_name={selectedPlanDetail.panel_analisis ? "checkmark.circle.fill" : "xmark.circle.fill"} 
                        android_material_icon_name={selectedPlanDetail.panel_analisis ? "check_circle" : "cancel"} 
                        size={20} 
                        color={selectedPlanDetail.panel_analisis ? "#10B981" : "#EF4444"} 
                      />
                      <Text style={styles.planDetailFeatureText}>Panel de análisis</Text>
                    </View>
                    <View style={styles.planDetailFeature}>
                      <IconSymbol 
                        ios_icon_name={selectedPlanDetail.soporte_prioritario ? "checkmark.circle.fill" : "xmark.circle.fill"} 
                        android_material_icon_name={selectedPlanDetail.soporte_prioritario ? "check_circle" : "cancel"} 
                        size={20} 
                        color={selectedPlanDetail.soporte_prioritario ? "#10B981" : "#EF4444"} 
                      />
                      <Text style={styles.planDetailFeatureText}>Soporte prioritario</Text>
                    </View>
                    {selectedPlanDetail.visibilidad_maxima && (
                      <View style={styles.planDetailFeature}>
                        <IconSymbol ios_icon_name="star.fill" android_material_icon_name="star" size={20} color={colors.badgeDestacado} />
                        <Text style={[styles.planDetailFeatureText, { fontWeight: '700' }]}>
                          Visibilidad máxima
                        </Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.planDetailActions}>
                    <TouchableOpacity
                      style={styles.editPlanButtonLarge}
                      onPress={() => {
                        setShowPlanDetailModal(false);
                        handleEditPlan(selectedPlanDetail);
                      }}
                    >
                      <IconSymbol ios_icon_name="pencil" android_material_icon_name="edit" size={20} color={colors.white} />
                      <Text style={styles.editPlanButtonText}>Editar Plan</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.deletePlanButton}
                      onPress={() => {
                        setShowPlanDetailModal(false);
                        handleDeletePlan(selectedPlanDetail.id, selectedPlanDetail.nombre);
                      }}
                    >
                      <IconSymbol ios_icon_name="trash.fill" android_material_icon_name="delete" size={20} color="#EF4444" />
                      <Text style={styles.deletePlanButtonText}>Eliminar Plan</Text>
                    </TouchableOpacity>
                  </View>
                </React.Fragment>
              )}
            </ScrollView>
          </View>
        </View>
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
          keyboardVerticalOffset={0}
        >
          <TouchableOpacity
            style={styles.modalOverlayTouchable}
            activeOpacity={1}
            onPress={() => Keyboard.dismiss()}
          >
            <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Editar Plan</Text>
                <TouchableOpacity onPress={() => setShowEditPlanModal(false)}>
                  <IconSymbol ios_icon_name="xmark" android_material_icon_name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>

              <ScrollView
                style={styles.modalBody}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.modalBodyContent}
              >
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Nombre del Plan *</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Ej: Premium"
                    placeholderTextColor={colors.textSecondary}
                    value={editPlanNombre}
                    onChangeText={setEditPlanNombre}
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Descripción</Text>
                  <TextInput
                    style={[styles.textInput, styles.textInputMultiline]}
                    placeholder="Descripción del plan..."
                    placeholderTextColor={colors.textSecondary}
                    value={editPlanDescripcion}
                    onChangeText={setEditPlanDescripcion}
                    multiline
                    numberOfLines={4}
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Precio Mensual (€) *</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="0"
                    placeholderTextColor={colors.textSecondary}
                    value={editPlanPrecio}
                    onChangeText={setEditPlanPrecio}
                    keyboardType="decimal-pad"
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Eventos por Mes</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="0"
                    placeholderTextColor={colors.textSecondary}
                    value={editPlanEventos}
                    onChangeText={setEditPlanEventos}
                    keyboardType="number-pad"
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Promos Destacadas</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="0"
                    placeholderTextColor={colors.textSecondary}
                    value={editPlanPromos}
                    onChangeText={setEditPlanPromos}
                    keyboardType="number-pad"
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Características</Text>
                  <TouchableOpacity
                    style={styles.featureToggle}
                    onPress={() => setEditPlanPerfilSocial(!editPlanPerfilSocial)}
                  >
                    <Text style={styles.featureToggleLabel}>Perfil Social</Text>
                    <View style={[styles.switch, editPlanPerfilSocial && styles.switchActive]}>
                      <View style={[styles.switchThumb, editPlanPerfilSocial && styles.switchThumbActive]} />
                    </View>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.featureToggle}
                    onPress={() => setEditPlanPanelAnalisis(!editPlanPanelAnalisis)}
                  >
                    <Text style={styles.featureToggleLabel}>Panel de Análisis</Text>
                    <View style={[styles.switch, editPlanPanelAnalisis && styles.switchActive]}>
                      <View style={[styles.switchThumb, editPlanPanelAnalisis && styles.switchThumbActive]} />
                    </View>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.featureToggle}
                    onPress={() => setEditPlanSoportePrioritario(!editPlanSoportePrioritario)}
                  >
                    <Text style={styles.featureToggleLabel}>Soporte Prioritario</Text>
                    <View style={[styles.switch, editPlanSoportePrioritario && styles.switchActive]}>
                      <View style={[styles.switchThumb, editPlanSoportePrioritario && styles.switchThumbActive]} />
                    </View>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.featureToggle}
                    onPress={() => setEditPlanVisibilidadExtra(!editPlanVisibilidadExtra)}
                  >
                    <Text style={styles.featureToggleLabel}>Visibilidad Extra</Text>
                    <View style={[styles.switch, editPlanVisibilidadExtra && styles.switchActive]}>
                      <View style={[styles.switchThumb, editPlanVisibilidadExtra && styles.switchThumbActive]} />
                    </View>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.featureToggle}
                    onPress={() => setEditPlanVisibilidadMaxima(!editPlanVisibilidadMaxima)}
                  >
                    <Text style={styles.featureToggleLabel}>Visibilidad Máxima</Text>
                    <View style={[styles.switch, editPlanVisibilidadMaxima && styles.switchActive]}>
                      <View style={[styles.switchThumb, editPlanVisibilidadMaxima && styles.switchThumbActive]} />
                    </View>
                  </TouchableOpacity>
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Estado</Text>
                  <TouchableOpacity
                    style={styles.switchContainer}
                    onPress={() => setEditPlanActivo(!editPlanActivo)}
                  >
                    <Text style={styles.switchLabel}>
                      {editPlanActivo ? 'Activo' : 'Inactivo'}
                    </Text>
                    <View style={[styles.switch, editPlanActivo && styles.switchActive]}>
                      <View style={[styles.switchThumb, editPlanActivo && styles.switchThumbActive]} />
                    </View>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={styles.confirmButton}
                  onPress={handleSavePlan}
                  disabled={savingPlan}
                >
                  {savingPlan ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <React.Fragment>
                      <IconSymbol ios_icon_name="checkmark.circle.fill" android_material_icon_name="check_circle" size={20} color="white" />
                      <Text style={styles.confirmButtonText}>Guardar Cambios</Text>
                    </React.Fragment>
                  )}
                </TouchableOpacity>
              </ScrollView>
            </View>
          </TouchableOpacity>
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
          keyboardVerticalOffset={0}
        >
          <TouchableOpacity
            style={styles.modalOverlayTouchable}
            activeOpacity={1}
            onPress={() => Keyboard.dismiss()}
          >
            <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Crear Nuevo Plan</Text>
                <TouchableOpacity onPress={() => setShowCreatePlanModal(false)}>
                  <IconSymbol ios_icon_name="xmark" android_material_icon_name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>

              <ScrollView
                style={styles.modalBody}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.modalBodyContent}
              >
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Nombre del Plan *</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Ej: Premium"
                    placeholderTextColor={colors.textSecondary}
                    value={createPlanNombre}
                    onChangeText={setCreatePlanNombre}
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Descripción</Text>
                  <TextInput
                    style={[styles.textInput, styles.textInputMultiline]}
                    placeholder="Descripción del plan..."
                    placeholderTextColor={colors.textSecondary}
                    value={createPlanDescripcion}
                    onChangeText={setCreatePlanDescripcion}
                    multiline
                    numberOfLines={4}
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Precio Mensual (€) *</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="0"
                    placeholderTextColor={colors.textSecondary}
                    value={createPlanPrecio}
                    onChangeText={setCreatePlanPrecio}
                    keyboardType="decimal-pad"
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Eventos por Mes</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="0"
                    placeholderTextColor={colors.textSecondary}
                    value={createPlanEventos}
                    onChangeText={setCreatePlanEventos}
                    keyboardType="number-pad"
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Promos Destacadas</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="0"
                    placeholderTextColor={colors.textSecondary}
                    value={createPlanPromos}
                    onChangeText={setCreatePlanPromos}
                    keyboardType="number-pad"
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Características</Text>
                  <TouchableOpacity
                    style={styles.featureToggle}
                    onPress={() => setCreatePlanPerfilSocial(!createPlanPerfilSocial)}
                  >
                    <Text style={styles.featureToggleLabel}>Perfil Social</Text>
                    <View style={[styles.switch, createPlanPerfilSocial && styles.switchActive]}>
                      <View style={[styles.switchThumb, createPlanPerfilSocial && styles.switchThumbActive]} />
                    </View>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.featureToggle}
                    onPress={() => setCreatePlanPanelAnalisis(!createPlanPanelAnalisis)}
                  >
                    <Text style={styles.featureToggleLabel}>Panel de Análisis</Text>
                    <View style={[styles.switch, createPlanPanelAnalisis && styles.switchActive]}>
                      <View style={[styles.switchThumb, createPlanPanelAnalisis && styles.switchThumbActive]} />
                    </View>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.featureToggle}
                    onPress={() => setCreatePlanSoportePrioritario(!createPlanSoportePrioritario)}
                  >
                    <Text style={styles.featureToggleLabel}>Soporte Prioritario</Text>
                    <View style={[styles.switch, createPlanSoportePrioritario && styles.switchActive]}>
                      <View style={[styles.switchThumb, createPlanSoportePrioritario && styles.switchThumbActive]} />
                    </View>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.featureToggle}
                    onPress={() => setCreatePlanVisibilidadExtra(!createPlanVisibilidadExtra)}
                  >
                    <Text style={styles.featureToggleLabel}>Visibilidad Extra</Text>
                    <View style={[styles.switch, createPlanVisibilidadExtra && styles.switchActive]}>
                      <View style={[styles.switchThumb, createPlanVisibilidadExtra && styles.switchThumbActive]} />
                    </View>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.featureToggle}
                    onPress={() => setCreatePlanVisibilidadMaxima(!createPlanVisibilidadMaxima)}
                  >
                    <Text style={styles.featureToggleLabel}>Visibilidad Máxima</Text>
                    <View style={[styles.switch, createPlanVisibilidadMaxima && styles.switchActive]}>
                      <View style={[styles.switchThumb, createPlanVisibilidadMaxima && styles.switchThumbActive]} />
                    </View>
                  </TouchableOpacity>
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Estado</Text>
                  <TouchableOpacity
                    style={styles.switchContainer}
                    onPress={() => setCreatePlanActivo(!createPlanActivo)}
                  >
                    <Text style={styles.switchLabel}>
                      {createPlanActivo ? 'Activo' : 'Inactivo'}
                    </Text>
                    <View style={[styles.switch, createPlanActivo && styles.switchActive]}>
                      <View style={[styles.switchThumb, createPlanActivo && styles.switchThumbActive]} />
                    </View>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={styles.confirmButton}
                  onPress={handleCreatePlan}
                  disabled={creatingPlan}
                >
                  {creatingPlan ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <React.Fragment>
                      <IconSymbol ios_icon_name="checkmark.circle.fill" android_material_icon_name="check_circle" size={20} color="white" />
                      <Text style={styles.confirmButtonText}>Crear Plan</Text>
                    </React.Fragment>
                  )}
                </TouchableOpacity>
              </ScrollView>
            </View>
          </TouchableOpacity>
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
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    flex: 1,
    textAlign: 'center',
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
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
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  sectionDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 20,
    lineHeight: 20,
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
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
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
    padding: 8,
    backgroundColor: colors.primary + '15',
    borderRadius: 8,
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
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
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
    justifyContent: 'space-between',
    marginBottom: 12,
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalOverlayTouchable: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  modalBody: {
    maxHeight: '80%',
  },
  modalBodyContent: {
    padding: 20,
    paddingBottom: 40,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
  },
  textInput: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.text,
  },
  textInputMultiline: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  switchLabel: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '600',
  },
  switch: {
    width: 50,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.border,
    padding: 2,
    justifyContent: 'center',
  },
  switchActive: {
    backgroundColor: colors.primary,
  },
  switchThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'white',
  },
  switchThumbActive: {
    alignSelf: 'flex-end',
  },
  featureToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
  },
  featureToggleLabel: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '600',
  },
  searchingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 20,
  },
  searchingText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  searchResults: {
    backgroundColor: colors.background,
    borderRadius: 8,
    marginBottom: 20,
    overflow: 'hidden',
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  searchResultInfo: {
    flex: 1,
  },
  searchResultName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  searchResultDetails: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  selectedLocalCard: {
    backgroundColor: colors.primary + '10',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  selectedLocalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  selectedLocalName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    flex: 1,
  },
  selectedLocalDetails: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  planOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  planOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  planOptionInfo: {
    flex: 1,
  },
  planOptionName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  planOptionPrice: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
  },
  confirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 20,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
  },
  planDetailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  planDetailName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  planDetailPrice: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.primary,
  },
  planDetailSection: {
    marginBottom: 24,
  },
  planDetailSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 12,
  },
  planDetailText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  planDetailFeature: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  planDetailFeatureText: {
    fontSize: 14,
    color: colors.text,
    flex: 1,
    lineHeight: 20,
  },
  planDetailActions: {
    gap: 12,
  },
  editPlanButtonLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
  },
  editPlanButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
  },
  deletePlanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: '#FEE2E2',
    paddingVertical: 16,
    borderRadius: 12,
  },
  deletePlanButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#EF4444',
  },
});
