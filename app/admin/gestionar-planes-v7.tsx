
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
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors, commonStyles } from '@/styles/commonStyles';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/contexts/AuthContext';

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
}

export default function GestionarPlanesV7Screen() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [planes, setPlanes] = useState<Plan[]>([]);
  const [subscriptions, setSubscriptions] = useState<LocalSubscription[]>([]);
  const [activeTab, setActiveTab] = useState<'planes' | 'subscriptions' | 'assign'>('planes');
  
  // Assign plan modal state - COMPLETELY REDESIGNED
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Local[]>([]);
  const [selectedLocal, setSelectedLocal] = useState<Local | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<string>('');
  const [assigning, setAssigning] = useState(false);
  const [searching, setSearching] = useState(false);

  // Edit plan modal state - COMPLETELY REDESIGNED
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
      const { data, error } = await supabase
        .from('planes_suscripcion')
        .select('*')
        .order('precio_mensual', { ascending: true });

      if (error) throw error;

      setPlanes(data || []);
    } catch (error) {
      console.error('[GestionarPlanesV7] Error cargando planes:', error);
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

      setSubscriptions(data || []);
    } catch (error) {
      console.error('[GestionarPlanesV7] Error cargando suscripciones:', error);
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
        .select('id, nombre, imagen_url, provincia, tipo, direccion')
        .ilike('nombre', `%${query}%`)
        .eq('activo', true)
        .limit(20);

      if (error) throw error;

      setSearchResults(data || []);
    } catch (error) {
      console.error('[GestionarPlanesV7] Error buscando locales:', error);
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
      console.error('[GestionarPlanesV7] Error asignando plan:', error);
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
        console.error('[GestionarPlanesV7] Error habilitando local:', localError);
      }

      Alert.alert(
        '✅ Plan Asignado',
        `El plan "${plan.nombre}" ha sido asignado correctamente a "${selectedLocal.nombre}".\n\nEl perfil del local se ha activado automáticamente.`
      );

      setShowAssignModal(false);
      setSelectedLocal(null);
      setSelectedPlan('');
      setSearchQuery('');
      setSearchResults([]);
      await cargarDatos();
    } catch (error) {
      console.error('[GestionarPlanesV7] Error creando suscripción:', error);
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
              console.error('[GestionarPlanesV7] Error cancelando suscripción:', error);
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

      Alert.alert('✅ Éxito', 'Plan actualizado correctamente');
      setShowEditPlanModal(false);
      setEditingPlan(null);
      await cargarPlanes();
    } catch (error) {
      console.error('[GestionarPlanesV7] Error guardando plan:', error);
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

      Alert.alert('✅ Éxito', 'Plan creado correctamente');
      setShowCreatePlanModal(false);
      resetCreatePlanForm();
      await cargarPlanes();
    } catch (error) {
      console.error('[GestionarPlanesV7] Error creando plan:', error);
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
              console.error('[GestionarPlanesV7] Error eliminando plan:', error);
              Alert.alert('Error', 'No se pudo eliminar el plan');
            }
          },
        },
      ]
    );
  };

  const getEstadoBadge = (estado: string) => {
    const badges: Record<string, { color: string; text: string; icon: string }> = {
      activa: { color: '#10B981', text: 'Activa', icon: 'checkmark.circle.fill' },
      cancelada: { color: '#EF4444', text: 'Cancelada', icon: 'xmark.circle.fill' },
      expirada: { color: '#F59E0B', text: 'Expirada', icon: 'clock.fill' },
    };

    const badge = badges[estado] || badges.activa;

    return (
      <View style={[styles.estadoBadgeV7, { backgroundColor: badge.color + '15' }]}>
        <IconSymbol ios_icon_name={badge.icon} android_material_icon_name="circle" size={14} color={badge.color} />
        <Text style={[styles.estadoBadgeTextV7, { color: badge.color }]}>{badge.text}</Text>
      </View>
    );
  };

  const renderPlanesTab = () => (
    <ScrollView style={styles.tabContent} contentContainerStyle={styles.tabContentContainer}>
      <View style={styles.sectionHeaderV7}>
        <View style={styles.sectionHeaderLeft}>
          <Text style={styles.sectionTitleV7}>Planes Disponibles</Text>
          <Text style={styles.sectionSubtitleV7}>{planes.length} planes configurados</Text>
        </View>
        <TouchableOpacity
          style={styles.createButtonV7}
          onPress={() => setShowCreatePlanModal(true)}
        >
          <IconSymbol ios_icon_name="plus.circle.fill" android_material_icon_name="add_circle" size={22} color={colors.white} />
          <Text style={styles.createButtonTextV7}>Nuevo Plan</Text>
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
                  <Text style={styles.planNameV7}>{plan.nombre}</Text>
                  <Text style={styles.planPriceV7}>
                    {plan.precio_mensual === 0 ? 'Gratis' : `${plan.precio_mensual}€/mes`}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.editIconButtonV7}
                  onPress={() => handleEditPlan(plan)}
                >
                  <IconSymbol ios_icon_name="pencil.circle.fill" android_material_icon_name="edit" size={28} color={colors.white} />
                </TouchableOpacity>
              </View>

              {plan.descripcion && (
                <Text style={styles.planDescriptionV7} numberOfLines={2}>
                  {plan.descripcion}
                </Text>
              )}

              <View style={styles.planFeaturesV7}>
                {plan.eventos_mes > 0 && (
                  <View style={styles.planFeatureItemV7}>
                    <View style={styles.planFeatureIconV7}>
                      <IconSymbol ios_icon_name="calendar.badge.plus" android_material_icon_name="event" size={18} color={colors.white} />
                    </View>
                    <Text style={styles.planFeatureTextV7}>{plan.eventos_mes} eventos/mes</Text>
                  </View>
                )}
                {plan.promos_destacadas > 0 && (
                  <View style={styles.planFeatureItemV7}>
                    <View style={styles.planFeatureIconV7}>
                      <IconSymbol ios_icon_name="star.fill" android_material_icon_name="star" size={18} color={colors.white} />
                    </View>
                    <Text style={styles.planFeatureTextV7}>{plan.promos_destacadas} promos destacadas</Text>
                  </View>
                )}
                {plan.perfil_social && (
                  <View style={styles.planFeatureItemV7}>
                    <View style={styles.planFeatureIconV7}>
                      <IconSymbol ios_icon_name="person.2.fill" android_material_icon_name="people" size={18} color={colors.white} />
                    </View>
                    <Text style={styles.planFeatureTextV7}>Perfil social completo</Text>
                  </View>
                )}
                {plan.panel_analisis && (
                  <View style={styles.planFeatureItemV7}>
                    <View style={styles.planFeatureIconV7}>
                      <IconSymbol ios_icon_name="chart.bar.fill" android_material_icon_name="bar_chart" size={18} color={colors.white} />
                    </View>
                    <Text style={styles.planFeatureTextV7}>Panel de análisis</Text>
                  </View>
                )}
                {plan.soporte_prioritario && (
                  <View style={styles.planFeatureItemV7}>
                    <View style={styles.planFeatureIconV7}>
                      <IconSymbol ios_icon_name="headphones" android_material_icon_name="support_agent" size={18} color={colors.white} />
                    </View>
                    <Text style={styles.planFeatureTextV7}>Soporte prioritario</Text>
                  </View>
                )}
                {plan.visibilidad_maxima && (
                  <View style={styles.planFeatureItemV7}>
                    <View style={styles.planFeatureIconV7}>
                      <IconSymbol ios_icon_name="sparkles" android_material_icon_name="auto_awesome" size={18} color={colors.white} />
                    </View>
                    <Text style={styles.planFeatureTextV7}>Visibilidad máxima</Text>
                  </View>
                )}
              </View>

              <View style={styles.planCardFooter}>
                <View style={[styles.planStatusBadgeV7, plan.activo ? styles.planStatusActiveV7 : styles.planStatusInactiveV7]}>
                  <IconSymbol 
                    ios_icon_name={plan.activo ? 'checkmark.circle.fill' : 'xmark.circle.fill'} 
                    android_material_icon_name={plan.activo ? 'check_circle' : 'cancel'} 
                    size={14} 
                    color={colors.white} 
                  />
                  <Text style={styles.planStatusTextV7}>
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
    <ScrollView style={styles.tabContent} contentContainerStyle={styles.tabContentContainer}>
      <View style={styles.sectionHeaderV7}>
        <View style={styles.sectionHeaderLeft}>
          <Text style={styles.sectionTitleV7}>Suscripciones</Text>
          <Text style={styles.sectionSubtitleV7}>{subscriptions.length} suscripciones registradas</Text>
        </View>
      </View>

      {subscriptions.length === 0 ? (
        <View style={styles.emptyStateV7}>
          <IconSymbol ios_icon_name="creditcard" android_material_icon_name="payment" size={64} color={colors.textSecondary} />
          <Text style={styles.emptyTextV7}>No hay suscripciones</Text>
          <Text style={styles.emptySubtextV7}>Las suscripciones aparecerán aquí cuando asignes planes a locales</Text>
        </View>
      ) : (
        <View style={styles.subscriptionsListV7}>
          {subscriptions.map((subscription) => (
            <View key={subscription.id} style={styles.subscriptionCardV7}>
              <View style={styles.subscriptionCardHeader}>
                <View style={styles.subscriptionCardHeaderLeft}>
                  <Text style={styles.subscriptionLocalNameV7}>{subscription.locales.nombre}</Text>
                  <Text style={styles.subscriptionPlanNameV7}>
                    {subscription.plan.nombre}
                  </Text>
                </View>
                {getEstadoBadge(subscription.estado)}
              </View>

              <View style={styles.subscriptionCardBody}>
                <View style={styles.subscriptionInfoRow}>
                  <IconSymbol ios_icon_name="calendar" android_material_icon_name="event" size={18} color={colors.textSecondary} />
                  <Text style={styles.subscriptionInfoText}>
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
                  <IconSymbol ios_icon_name="xmark.circle.fill" android_material_icon_name="cancel" size={20} color="#EF4444" />
                  <Text style={styles.cancelSubscriptionTextV7}>Cancelar Suscripción</Text>
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
      <ScrollView contentContainerStyle={styles.tabContentContainer}>
        <View style={styles.sectionHeaderV7}>
          <View style={styles.sectionHeaderLeft}>
            <Text style={styles.sectionTitleV7}>Asignar Plan</Text>
            <Text style={styles.sectionSubtitleV7}>Conecta locales con planes de suscripción</Text>
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
            <IconSymbol ios_icon_name="plus.circle.fill" android_material_icon_name="add_circle" size={32} color={colors.white} />
            <Text style={styles.assignButtonTextV7}>Asignar Nuevo Plan a Local</Text>
          </LinearGradient>
        </TouchableOpacity>

        <View style={styles.infoBoxV7}>
          <View style={styles.infoBoxIcon}>
            <IconSymbol ios_icon_name="info.circle.fill" android_material_icon_name="info" size={24} color={colors.primary} />
          </View>
          <View style={styles.infoBoxContent}>
            <Text style={styles.infoBoxTitle}>Activación Automática</Text>
            <Text style={styles.infoBoxText}>
              Al asignar un plan a un local, su perfil se activará automáticamente en la plataforma BarLive y en la red social.
            </Text>
          </View>
        </View>

        <View style={styles.quickStatsV7}>
          <View style={styles.quickStatCard}>
            <Text style={styles.quickStatNumber}>{planes.filter(p => p.activo).length}</Text>
            <Text style={styles.quickStatLabel}>Planes Activos</Text>
          </View>
          <View style={styles.quickStatCard}>
            <Text style={styles.quickStatNumber}>{subscriptions.filter(s => s.estado === 'activa').length}</Text>
            <Text style={styles.quickStatLabel}>Suscripciones Activas</Text>
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
            <IconSymbol ios_icon_name="chevron.left" android_material_icon_name="arrow_back" size={28} color={colors.headerText} />
          </TouchableOpacity>
          <View style={styles.headerContentV7}>
            <Text style={styles.headerTitleV7}>Gestionar Planes</Text>
            <Text style={styles.headerSubtitleV7}>Versión 7.0</Text>
          </View>
          <View style={{ width: 28 }} />
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
      <LinearGradient colors={[colors.headerGradientStart, colors.headerGradientEnd]} style={styles.headerV7}>
        <TouchableOpacity style={styles.backButtonV7} onPress={() => router.back()}>
          <IconSymbol ios_icon_name="chevron.left" android_material_icon_name="arrow_back" size={28} color={colors.headerText} />
        </TouchableOpacity>
        <View style={styles.headerContentV7}>
          <Text style={styles.headerTitleV7}>Gestionar Planes</Text>
          <Text style={styles.headerSubtitleV7}>Versión 7.0 • Rediseño Completo</Text>
        </View>
        <TouchableOpacity style={styles.refreshButtonV7} onPress={cargarDatos}>
          <IconSymbol ios_icon_name="arrow.clockwise" android_material_icon_name="refresh" size={28} color={colors.headerText} />
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
            size={22}
            color={activeTab === 'planes' ? colors.primary : colors.textSecondary}
          />
          <Text style={[styles.tabTextV7, activeTab === 'planes' && styles.tabTextActiveV7]}>
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
            size={22}
            color={activeTab === 'subscriptions' ? colors.primary : colors.textSecondary}
          />
          <Text style={[styles.tabTextV7, activeTab === 'subscriptions' && styles.tabTextActiveV7]}>
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
            size={22}
            color={activeTab === 'assign' ? colors.primary : colors.textSecondary}
          />
          <Text style={[styles.tabTextV7, activeTab === 'assign' && styles.tabTextActiveV7]}>
            Asignar
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'planes' && renderPlanesTab()}
      {activeTab === 'subscriptions' && renderSubscriptionsTab()}
      {activeTab === 'assign' && renderAssignTab()}

      {/* COMPLETELY REDESIGNED ASSIGN PLAN MODAL - FULL WIDTH, MODERN DESIGN */}
      <Modal
        visible={showAssignModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAssignModal(false)}
      >
        <View style={styles.fullScreenModal}>
          <LinearGradient
            colors={[colors.headerGradientStart, colors.headerGradientEnd]}
            style={styles.fullScreenModalHeader}
          >
            <TouchableOpacity
              style={styles.fullScreenModalClose}
              onPress={() => setShowAssignModal(false)}
            >
              <IconSymbol ios_icon_name="xmark.circle.fill" android_material_icon_name="close" size={32} color={colors.headerText} />
            </TouchableOpacity>
            <View style={styles.fullScreenModalHeaderContent}>
              <Text style={styles.fullScreenModalTitle}>Asignar Plan a Local</Text>
              <Text style={styles.fullScreenModalSubtitle}>Selecciona un local y asígnale un plan de suscripción</Text>
            </View>
          </LinearGradient>

          <ScrollView style={styles.fullScreenModalContent} contentContainerStyle={styles.fullScreenModalContentContainer}>
            {/* Step 1: Search and Select Local */}
            <View style={styles.assignStepV7}>
              <View style={styles.assignStepHeaderV7}>
                <View style={styles.assignStepNumberV7}>
                  <Text style={styles.assignStepNumberTextV7}>1</Text>
                </View>
                <View style={styles.assignStepHeaderText}>
                  <Text style={styles.assignStepTitleV7}>Buscar Local</Text>
                  <Text style={styles.assignStepSubtitleV7}>Encuentra el local al que quieres asignar un plan</Text>
                </View>
              </View>

              <View style={styles.searchContainerV7}>
                <IconSymbol ios_icon_name="magnifyingglass" android_material_icon_name="search" size={24} color={colors.textSecondary} />
                <TextInput
                  style={styles.searchInputV7}
                  placeholder="Escribe el nombre del local..."
                  placeholderTextColor={colors.textSecondary}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
                {searching && <ActivityIndicator size="small" color={colors.primary} />}
              </View>

              {selectedLocal ? (
                <View style={styles.selectedLocalCardV7}>
                  <LinearGradient
                    colors={['#10B981', '#059669']}
                    style={styles.selectedLocalGradient}
                  >
                    <View style={styles.selectedLocalHeader}>
                      <IconSymbol ios_icon_name="checkmark.seal.fill" android_material_icon_name="verified" size={32} color={colors.white} />
                      <Text style={styles.selectedLocalLabel}>Local Seleccionado</Text>
                    </View>
                    <Text style={styles.selectedLocalName}>{selectedLocal.nombre}</Text>
                    <Text style={styles.selectedLocalInfo}>
                      {selectedLocal.tipo} • {selectedLocal.provincia}
                    </Text>
                    <Text style={styles.selectedLocalAddress} numberOfLines={2}>
                      {selectedLocal.direccion}
                    </Text>
                    <TouchableOpacity
                      style={styles.changeLocalButtonV7}
                      onPress={() => {
                        setSelectedLocal(null);
                        setSearchQuery('');
                        setSelectedPlan('');
                      }}
                    >
                      <IconSymbol ios_icon_name="arrow.triangle.2.circlepath" android_material_icon_name="sync" size={18} color="#059669" />
                      <Text style={styles.changeLocalButtonTextV7}>Cambiar Local</Text>
                    </TouchableOpacity>
                  </LinearGradient>
                </View>
              ) : searchResults.length > 0 ? (
                <View style={styles.searchResultsContainerV7}>
                  <Text style={styles.searchResultsTitleV7}>
                    {searchResults.length} {searchResults.length === 1 ? 'resultado encontrado' : 'resultados encontrados'}
                  </Text>
                  {searchResults.map((local) => (
                    <TouchableOpacity
                      key={local.id}
                      style={styles.searchResultItemV7}
                      onPress={() => {
                        setSelectedLocal(local);
                        setSearchQuery('');
                        setSearchResults([]);
                      }}
                    >
                      <View style={styles.searchResultIconV7}>
                        <IconSymbol ios_icon_name="building.2.fill" android_material_icon_name="store" size={28} color={colors.primary} />
                      </View>
                      <View style={styles.searchResultInfoV7}>
                        <Text style={styles.searchResultNameV7}>{local.nombre}</Text>
                        <Text style={styles.searchResultDetailsV7}>
                          {local.tipo} • {local.provincia}
                        </Text>
                        <Text style={styles.searchResultAddressV7} numberOfLines={1}>
                          {local.direccion}
                        </Text>
                      </View>
                      <IconSymbol ios_icon_name="chevron.right.circle.fill" android_material_icon_name="arrow_forward" size={28} color={colors.primary} />
                    </TouchableOpacity>
                  ))}
                </View>
              ) : searchQuery.length >= 2 && !searching ? (
                <View style={styles.noResultsContainerV7}>
                  <IconSymbol ios_icon_name="magnifyingglass" android_material_icon_name="search_off" size={48} color={colors.textSecondary} />
                  <Text style={styles.noResultsTextV7}>No se encontraron locales</Text>
                  <Text style={styles.noResultsSubtextV7}>Intenta con otro término de búsqueda</Text>
                </View>
              ) : null}
            </View>

            {/* Step 2: Select Plan */}
            {selectedLocal && (
              <View style={styles.assignStepV7}>
                <View style={styles.assignStepHeaderV7}>
                  <View style={styles.assignStepNumberV7}>
                    <Text style={styles.assignStepNumberTextV7}>2</Text>
                  </View>
                  <View style={styles.assignStepHeaderText}>
                    <Text style={styles.assignStepTitleV7}>Seleccionar Plan</Text>
                    <Text style={styles.assignStepSubtitleV7}>Elige el plan de suscripción para este local</Text>
                  </View>
                </View>

                <View style={styles.plansSelectionGridV7}>
                  {planes.filter(p => p.activo).map((plan) => (
                    <TouchableOpacity
                      key={plan.id}
                      style={[
                        styles.planSelectionCardV7,
                        selectedPlan === plan.id && styles.planSelectionCardActiveV7
                      ]}
                      onPress={() => setSelectedPlan(plan.id)}
                    >
                      <View style={styles.planSelectionHeader}>
                        <View style={styles.planSelectionHeaderLeft}>
                          <Text style={styles.planSelectionName}>{plan.nombre}</Text>
                          <Text style={styles.planSelectionPrice}>
                            {plan.precio_mensual === 0 ? 'Gratis' : `${plan.precio_mensual}€/mes`}
                          </Text>
                        </View>
                        {selectedPlan === plan.id ? (
                          <View style={styles.planSelectionCheckmarkV7}>
                            <IconSymbol ios_icon_name="checkmark.circle.fill" android_material_icon_name="check_circle" size={36} color={colors.primary} />
                          </View>
                        ) : (
                          <View style={styles.planSelectionCircleV7} />
                        )}
                      </View>

                      {plan.descripcion && (
                        <Text style={styles.planSelectionDescription} numberOfLines={2}>
                          {plan.descripcion}
                        </Text>
                      )}

                      <View style={styles.planSelectionFeatures}>
                        {plan.eventos_mes > 0 && (
                          <View style={styles.planSelectionFeature}>
                            <IconSymbol ios_icon_name="checkmark" android_material_icon_name="check" size={16} color="#10B981" />
                            <Text style={styles.planSelectionFeatureText}>{plan.eventos_mes} eventos/mes</Text>
                          </View>
                        )}
                        {plan.promos_destacadas > 0 && (
                          <View style={styles.planSelectionFeature}>
                            <IconSymbol ios_icon_name="checkmark" android_material_icon_name="check" size={16} color="#10B981" />
                            <Text style={styles.planSelectionFeatureText}>{plan.promos_destacadas} promos destacadas</Text>
                          </View>
                        )}
                        {plan.perfil_social && (
                          <View style={styles.planSelectionFeature}>
                            <IconSymbol ios_icon_name="checkmark" android_material_icon_name="check" size={16} color="#10B981" />
                            <Text style={styles.planSelectionFeatureText}>Perfil social</Text>
                          </View>
                        )}
                        {plan.panel_analisis && (
                          <View style={styles.planSelectionFeature}>
                            <IconSymbol ios_icon_name="checkmark" android_material_icon_name="check" size={16} color="#10B981" />
                            <Text style={styles.planSelectionFeatureText}>Panel de análisis</Text>
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
              <View style={styles.assignStepV7}>
                <View style={styles.assignStepHeaderV7}>
                  <View style={styles.assignStepNumberV7}>
                    <Text style={styles.assignStepNumberTextV7}>3</Text>
                  </View>
                  <View style={styles.assignStepHeaderText}>
                    <Text style={styles.assignStepTitleV7}>Confirmar Asignación</Text>
                    <Text style={styles.assignStepSubtitleV7}>Revisa los detalles antes de confirmar</Text>
                  </View>
                </View>

                <View style={styles.confirmationCardV7}>
                  <LinearGradient
                    colors={[colors.primary + '15', colors.primary + '08']}
                    style={styles.confirmationGradient}
                  >
                    <View style={styles.confirmationRow}>
                      <View style={styles.confirmationIconContainer}>
                        <IconSymbol ios_icon_name="building.2.fill" android_material_icon_name="store" size={24} color={colors.primary} />
                      </View>
                      <View style={styles.confirmationInfo}>
                        <Text style={styles.confirmationLabel}>Local</Text>
                        <Text style={styles.confirmationValue}>{selectedLocal.nombre}</Text>
                      </View>
                    </View>

                    <View style={styles.confirmationDivider} />

                    <View style={styles.confirmationRow}>
                      <View style={styles.confirmationIconContainer}>
                        <IconSymbol ios_icon_name="star.fill" android_material_icon_name="star" size={24} color={colors.primary} />
                      </View>
                      <View style={styles.confirmationInfo}>
                        <Text style={styles.confirmationLabel}>Plan</Text>
                        <Text style={styles.confirmationValue}>
                          {planes.find(p => p.id === selectedPlan)?.nombre}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.confirmationDivider} />

                    <View style={styles.confirmationRow}>
                      <View style={styles.confirmationIconContainer}>
                        <IconSymbol ios_icon_name="eurosign.circle.fill" android_material_icon_name="euro" size={24} color={colors.primary} />
                      </View>
                      <View style={styles.confirmationInfo}>
                        <Text style={styles.confirmationLabel}>Precio Mensual</Text>
                        <Text style={styles.confirmationValue}>
                          {planes.find(p => p.id === selectedPlan)?.precio_mensual === 0 
                            ? 'Gratis' 
                            : `${planes.find(p => p.id === selectedPlan)?.precio_mensual}€/mes`}
                        </Text>
                      </View>
                    </View>
                  </LinearGradient>
                </View>

                <View style={styles.confirmationNoteV7}>
                  <IconSymbol ios_icon_name="info.circle.fill" android_material_icon_name="info" size={24} color={colors.primary} />
                  <Text style={styles.confirmationNoteTextV7}>
                    El perfil del local se activará automáticamente y estará visible en BarLive y la red social.
                  </Text>
                </View>
              </View>
            )}
          </ScrollView>

          <View style={styles.fullScreenModalFooter}>
            <TouchableOpacity
              style={[
                styles.fullScreenModalButton,
                (!selectedLocal || !selectedPlan || assigning) && styles.fullScreenModalButtonDisabled
              ]}
              onPress={asignarPlan}
              disabled={!selectedLocal || !selectedPlan || assigning}
            >
              <LinearGradient
                colors={(!selectedLocal || !selectedPlan || assigning) 
                  ? [colors.cardBorder, colors.cardBorder] 
                  : [colors.primary, colors.primary + 'DD']}
                style={styles.fullScreenModalButtonGradient}
              >
                {assigning ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <React.Fragment>
                    <IconSymbol ios_icon_name="checkmark.circle.fill" android_material_icon_name="check_circle" size={24} color={colors.white} />
                    <Text style={styles.fullScreenModalButtonText}>Asignar Plan al Local</Text>
                  </React.Fragment>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* COMPLETELY REDESIGNED EDIT PLAN MODAL - FULL WIDTH, MODERN DESIGN */}
      <Modal
        visible={showEditPlanModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowEditPlanModal(false)}
      >
        <View style={styles.fullScreenModal}>
          <LinearGradient
            colors={[colors.headerGradientStart, colors.headerGradientEnd]}
            style={styles.fullScreenModalHeader}
          >
            <TouchableOpacity
              style={styles.fullScreenModalClose}
              onPress={() => setShowEditPlanModal(false)}
            >
              <IconSymbol ios_icon_name="xmark.circle.fill" android_material_icon_name="close" size={32} color={colors.headerText} />
            </TouchableOpacity>
            <View style={styles.fullScreenModalHeaderContent}>
              <Text style={styles.fullScreenModalTitle}>Editar Plan</Text>
              <Text style={styles.fullScreenModalSubtitle}>Modifica los detalles y características del plan</Text>
            </View>
          </LinearGradient>

          <ScrollView style={styles.fullScreenModalContent} contentContainerStyle={styles.fullScreenModalContentContainer}>
            {/* Basic Information Section */}
            <View style={styles.editSectionV7}>
              <View style={styles.editSectionHeaderV7}>
                <IconSymbol ios_icon_name="info.circle.fill" android_material_icon_name="info" size={24} color={colors.primary} />
                <Text style={styles.editSectionTitleV7}>Información Básica</Text>
              </View>

              <View style={styles.formGroupV7}>
                <Text style={styles.formLabelV7}>Nombre del Plan *</Text>
                <TextInput
                  style={styles.formInputV7}
                  value={editPlanNombre}
                  onChangeText={setEditPlanNombre}
                  placeholder="Ej: Básico, Premium, Enterprise..."
                  placeholderTextColor={colors.textSecondary}
                />
              </View>

              <View style={styles.formGroupV7}>
                <Text style={styles.formLabelV7}>Descripción</Text>
                <TextInput
                  style={[styles.formInputV7, styles.formTextAreaV7]}
                  value={editPlanDescripcion}
                  onChangeText={setEditPlanDescripcion}
                  placeholder="Describe las ventajas y beneficios de este plan..."
                  placeholderTextColor={colors.textSecondary}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>

              <View style={styles.formGroupV7}>
                <Text style={styles.formLabelV7}>Precio Mensual (€)</Text>
                <View style={styles.priceInputContainerV7}>
                  <IconSymbol ios_icon_name="eurosign.circle.fill" android_material_icon_name="euro" size={24} color={colors.primary} />
                  <TextInput
                    style={styles.priceInputV7}
                    value={editPlanPrecio}
                    onChangeText={setEditPlanPrecio}
                    placeholder="0.00"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="decimal-pad"
                  />
                  <Text style={styles.priceInputSuffix}>€/mes</Text>
                </View>
              </View>
            </View>

            {/* Limits Section */}
            <View style={styles.editSectionV7}>
              <View style={styles.editSectionHeaderV7}>
                <IconSymbol ios_icon_name="chart.bar.fill" android_material_icon_name="bar_chart" size={24} color="#F59E0B" />
                <Text style={styles.editSectionTitleV7}>Límites y Cuotas</Text>
              </View>

              <View style={styles.formRowV7}>
                <View style={[styles.formGroupV7, { flex: 1 }]}>
                  <Text style={styles.formLabelV7}>Eventos por Mes</Text>
                  <View style={styles.numberInputContainerV7}>
                    <IconSymbol ios_icon_name="calendar.badge.plus" android_material_icon_name="event" size={20} color={colors.primary} />
                    <TextInput
                      style={styles.numberInputV7}
                      value={editPlanEventos}
                      onChangeText={setEditPlanEventos}
                      placeholder="0"
                      placeholderTextColor={colors.textSecondary}
                      keyboardType="number-pad"
                    />
                  </View>
                </View>

                <View style={[styles.formGroupV7, { flex: 1 }]}>
                  <Text style={styles.formLabelV7}>Promos Destacadas</Text>
                  <View style={styles.numberInputContainerV7}>
                    <IconSymbol ios_icon_name="star.fill" android_material_icon_name="star" size={20} color={colors.badgeDestacado} />
                    <TextInput
                      style={styles.numberInputV7}
                      value={editPlanPromos}
                      onChangeText={setEditPlanPromos}
                      placeholder="0"
                      placeholderTextColor={colors.textSecondary}
                      keyboardType="number-pad"
                    />
                  </View>
                </View>
              </View>
            </View>

            {/* Features Section */}
            <View style={styles.editSectionV7}>
              <View style={styles.editSectionHeaderV7}>
                <IconSymbol ios_icon_name="sparkles" android_material_icon_name="auto_awesome" size={24} color="#8B5CF6" />
                <Text style={styles.editSectionTitleV7}>Características y Permisos</Text>
              </View>

              <View style={styles.featureTogglesList}>
                <View style={styles.featureToggleCardV7}>
                  <View style={styles.featureToggleInfo}>
                    <View style={styles.featureToggleIconContainer}>
                      <IconSymbol ios_icon_name="checkmark.circle.fill" android_material_icon_name="check_circle" size={28} color={editPlanActivo ? '#10B981' : colors.textSecondary} />
                    </View>
                    <View style={styles.featureToggleText}>
                      <Text style={styles.featureToggleTitle}>Plan Activo</Text>
                      <Text style={styles.featureToggleDescription}>
                        Los usuarios podrán suscribirse a este plan
                      </Text>
                    </View>
                  </View>
                  <Switch
                    value={editPlanActivo}
                    onValueChange={setEditPlanActivo}
                    trackColor={{ false: colors.cardBorder, true: '#10B981' + '80' }}
                    thumbColor={editPlanActivo ? '#10B981' : colors.textSecondary}
                  />
                </View>

                <View style={styles.featureToggleCardV7}>
                  <View style={styles.featureToggleInfo}>
                    <View style={styles.featureToggleIconContainer}>
                      <IconSymbol ios_icon_name="person.2.fill" android_material_icon_name="people" size={28} color={editPlanPerfilSocial ? colors.primary : colors.textSecondary} />
                    </View>
                    <View style={styles.featureToggleText}>
                      <Text style={styles.featureToggleTitle}>Perfil Social</Text>
                      <Text style={styles.featureToggleDescription}>
                        Acceso completo a la red social: posts, historias, mensajes
                      </Text>
                    </View>
                  </View>
                  <Switch
                    value={editPlanPerfilSocial}
                    onValueChange={setEditPlanPerfilSocial}
                    trackColor={{ false: colors.cardBorder, true: colors.primary + '80' }}
                    thumbColor={editPlanPerfilSocial ? colors.primary : colors.textSecondary}
                  />
                </View>

                <View style={styles.featureToggleCardV7}>
                  <View style={styles.featureToggleInfo}>
                    <View style={styles.featureToggleIconContainer}>
                      <IconSymbol ios_icon_name="chart.bar.fill" android_material_icon_name="bar_chart" size={28} color={editPlanPanelAnalisis ? '#3B82F6' : colors.textSecondary} />
                    </View>
                    <View style={styles.featureToggleText}>
                      <Text style={styles.featureToggleTitle}>Panel de Análisis</Text>
                      <Text style={styles.featureToggleDescription}>
                        Estadísticas detalladas de visitas y rendimiento
                      </Text>
                    </View>
                  </View>
                  <Switch
                    value={editPlanPanelAnalisis}
                    onValueChange={setEditPlanPanelAnalisis}
                    trackColor={{ false: colors.cardBorder, true: '#3B82F6' + '80' }}
                    thumbColor={editPlanPanelAnalisis ? '#3B82F6' : colors.textSecondary}
                  />
                </View>

                <View style={styles.featureToggleCardV7}>
                  <View style={styles.featureToggleInfo}>
                    <View style={styles.featureToggleIconContainer}>
                      <IconSymbol ios_icon_name="headphones" android_material_icon_name="support_agent" size={28} color={editPlanSoportePrioritario ? '#8B5CF6' : colors.textSecondary} />
                    </View>
                    <View style={styles.featureToggleText}>
                      <Text style={styles.featureToggleTitle}>Soporte Prioritario</Text>
                      <Text style={styles.featureToggleDescription}>
                        Atención preferente y respuesta rápida
                      </Text>
                    </View>
                  </View>
                  <Switch
                    value={editPlanSoportePrioritario}
                    onValueChange={setEditPlanSoportePrioritario}
                    trackColor={{ false: colors.cardBorder, true: '#8B5CF6' + '80' }}
                    thumbColor={editPlanSoportePrioritario ? '#8B5CF6' : colors.textSecondary}
                  />
                </View>

                <View style={styles.featureToggleCardV7}>
                  <View style={styles.featureToggleInfo}>
                    <View style={styles.featureToggleIconContainer}>
                      <IconSymbol ios_icon_name="eye.fill" android_material_icon_name="visibility" size={28} color={editPlanVisibilidadExtra ? '#F59E0B' : colors.textSecondary} />
                    </View>
                    <View style={styles.featureToggleText}>
                      <Text style={styles.featureToggleTitle}>Visibilidad Extra</Text>
                      <Text style={styles.featureToggleDescription}>
                        Posiciones destacadas en búsquedas y listados
                      </Text>
                    </View>
                  </View>
                  <Switch
                    value={editPlanVisibilidadExtra}
                    onValueChange={setEditPlanVisibilidadExtra}
                    trackColor={{ false: colors.cardBorder, true: '#F59E0B' + '80' }}
                    thumbColor={editPlanVisibilidadExtra ? '#F59E0B' : colors.textSecondary}
                  />
                </View>

                <View style={styles.featureToggleCardV7}>
                  <View style={styles.featureToggleInfo}>
                    <View style={styles.featureToggleIconContainer}>
                      <IconSymbol ios_icon_name="sparkles" android_material_icon_name="auto_awesome" size={28} color={editPlanVisibilidadMaxima ? '#EC4899' : colors.textSecondary} />
                    </View>
                    <View style={styles.featureToggleText}>
                      <Text style={styles.featureToggleTitle}>Visibilidad Máxima</Text>
                      <Text style={styles.featureToggleDescription}>
                        Máxima exposición en portada y secciones destacadas
                      </Text>
                    </View>
                  </View>
                  <Switch
                    value={editPlanVisibilidadMaxima}
                    onValueChange={setEditPlanVisibilidadMaxima}
                    trackColor={{ false: colors.cardBorder, true: '#EC4899' + '80' }}
                    thumbColor={editPlanVisibilidadMaxima ? '#EC4899' : colors.textSecondary}
                  />
                </View>
              </View>
            </View>
          </ScrollView>

          <View style={styles.fullScreenModalFooter}>
            <TouchableOpacity
              style={[styles.fullScreenModalButton, savingPlan && styles.fullScreenModalButtonDisabled]}
              onPress={handleSavePlan}
              disabled={savingPlan}
            >
              <LinearGradient
                colors={savingPlan ? [colors.cardBorder, colors.cardBorder] : [colors.primary, colors.primary + 'DD']}
                style={styles.fullScreenModalButtonGradient}
              >
                {savingPlan ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <React.Fragment>
                    <IconSymbol ios_icon_name="checkmark.circle.fill" android_material_icon_name="check_circle" size={24} color={colors.white} />
                    <Text style={styles.fullScreenModalButtonText}>Guardar Cambios</Text>
                  </React.Fragment>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {editingPlan && (
              <TouchableOpacity
                style={styles.deleteButtonV7}
                onPress={() => handleDeletePlan(editingPlan.id, editingPlan.nombre)}
              >
                <IconSymbol ios_icon_name="trash.fill" android_material_icon_name="delete" size={22} color="#EF4444" />
                <Text style={styles.deleteButtonTextV7}>Eliminar Plan</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>

      {/* Create Plan Modal */}
      <Modal
        visible={showCreatePlanModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCreatePlanModal(false)}
      >
        <View style={styles.fullScreenModal}>
          <LinearGradient
            colors={[colors.headerGradientStart, colors.headerGradientEnd]}
            style={styles.fullScreenModalHeader}
          >
            <TouchableOpacity
              style={styles.fullScreenModalClose}
              onPress={() => setShowCreatePlanModal(false)}
            >
              <IconSymbol ios_icon_name="xmark.circle.fill" android_material_icon_name="close" size={32} color={colors.headerText} />
            </TouchableOpacity>
            <View style={styles.fullScreenModalHeaderContent}>
              <Text style={styles.fullScreenModalTitle}>Crear Nuevo Plan</Text>
              <Text style={styles.fullScreenModalSubtitle}>Define un nuevo plan de suscripción</Text>
            </View>
          </LinearGradient>

          <ScrollView style={styles.fullScreenModalContent} contentContainerStyle={styles.fullScreenModalContentContainer}>
            {/* Basic Information Section */}
            <View style={styles.editSectionV7}>
              <View style={styles.editSectionHeaderV7}>
                <IconSymbol ios_icon_name="info.circle.fill" android_material_icon_name="info" size={24} color={colors.primary} />
                <Text style={styles.editSectionTitleV7}>Información Básica</Text>
              </View>

              <View style={styles.formGroupV7}>
                <Text style={styles.formLabelV7}>Nombre del Plan *</Text>
                <TextInput
                  style={styles.formInputV7}
                  value={createPlanNombre}
                  onChangeText={setCreatePlanNombre}
                  placeholder="Ej: Básico, Premium, Enterprise..."
                  placeholderTextColor={colors.textSecondary}
                />
              </View>

              <View style={styles.formGroupV7}>
                <Text style={styles.formLabelV7}>Descripción</Text>
                <TextInput
                  style={[styles.formInputV7, styles.formTextAreaV7]}
                  value={createPlanDescripcion}
                  onChangeText={setCreatePlanDescripcion}
                  placeholder="Describe las ventajas y beneficios de este plan..."
                  placeholderTextColor={colors.textSecondary}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>

              <View style={styles.formGroupV7}>
                <Text style={styles.formLabelV7}>Precio Mensual (€)</Text>
                <View style={styles.priceInputContainerV7}>
                  <IconSymbol ios_icon_name="eurosign.circle.fill" android_material_icon_name="euro" size={24} color={colors.primary} />
                  <TextInput
                    style={styles.priceInputV7}
                    value={createPlanPrecio}
                    onChangeText={setCreatePlanPrecio}
                    placeholder="0.00"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="decimal-pad"
                  />
                  <Text style={styles.priceInputSuffix}>€/mes</Text>
                </View>
              </View>
            </View>

            {/* Limits Section */}
            <View style={styles.editSectionV7}>
              <View style={styles.editSectionHeaderV7}>
                <IconSymbol ios_icon_name="chart.bar.fill" android_material_icon_name="bar_chart" size={24} color="#F59E0B" />
                <Text style={styles.editSectionTitleV7}>Límites y Cuotas</Text>
              </View>

              <View style={styles.formRowV7}>
                <View style={[styles.formGroupV7, { flex: 1 }]}>
                  <Text style={styles.formLabelV7}>Eventos por Mes</Text>
                  <View style={styles.numberInputContainerV7}>
                    <IconSymbol ios_icon_name="calendar.badge.plus" android_material_icon_name="event" size={20} color={colors.primary} />
                    <TextInput
                      style={styles.numberInputV7}
                      value={createPlanEventos}
                      onChangeText={setCreatePlanEventos}
                      placeholder="0"
                      placeholderTextColor={colors.textSecondary}
                      keyboardType="number-pad"
                    />
                  </View>
                </View>

                <View style={[styles.formGroupV7, { flex: 1 }]}>
                  <Text style={styles.formLabelV7}>Promos Destacadas</Text>
                  <View style={styles.numberInputContainerV7}>
                    <IconSymbol ios_icon_name="star.fill" android_material_icon_name="star" size={20} color={colors.badgeDestacado} />
                    <TextInput
                      style={styles.numberInputV7}
                      value={createPlanPromos}
                      onChangeText={setCreatePlanPromos}
                      placeholder="0"
                      placeholderTextColor={colors.textSecondary}
                      keyboardType="number-pad"
                    />
                  </View>
                </View>
              </View>
            </View>

            {/* Features Section */}
            <View style={styles.editSectionV7}>
              <View style={styles.editSectionHeaderV7}>
                <IconSymbol ios_icon_name="sparkles" android_material_icon_name="auto_awesome" size={24} color="#8B5CF6" />
                <Text style={styles.editSectionTitleV7}>Características y Permisos</Text>
              </View>

              <View style={styles.featureTogglesList}>
                <View style={styles.featureToggleCardV7}>
                  <View style={styles.featureToggleInfo}>
                    <View style={styles.featureToggleIconContainer}>
                      <IconSymbol ios_icon_name="checkmark.circle.fill" android_material_icon_name="check_circle" size={28} color={createPlanActivo ? '#10B981' : colors.textSecondary} />
                    </View>
                    <View style={styles.featureToggleText}>
                      <Text style={styles.featureToggleTitle}>Plan Activo</Text>
                      <Text style={styles.featureToggleDescription}>
                        Los usuarios podrán suscribirse a este plan
                      </Text>
                    </View>
                  </View>
                  <Switch
                    value={createPlanActivo}
                    onValueChange={setCreatePlanActivo}
                    trackColor={{ false: colors.cardBorder, true: '#10B981' + '80' }}
                    thumbColor={createPlanActivo ? '#10B981' : colors.textSecondary}
                  />
                </View>

                <View style={styles.featureToggleCardV7}>
                  <View style={styles.featureToggleInfo}>
                    <View style={styles.featureToggleIconContainer}>
                      <IconSymbol ios_icon_name="person.2.fill" android_material_icon_name="people" size={28} color={createPlanPerfilSocial ? colors.primary : colors.textSecondary} />
                    </View>
                    <View style={styles.featureToggleText}>
                      <Text style={styles.featureToggleTitle}>Perfil Social</Text>
                      <Text style={styles.featureToggleDescription}>
                        Acceso completo a la red social: posts, historias, mensajes
                      </Text>
                    </View>
                  </View>
                  <Switch
                    value={createPlanPerfilSocial}
                    onValueChange={setCreatePlanPerfilSocial}
                    trackColor={{ false: colors.cardBorder, true: colors.primary + '80' }}
                    thumbColor={createPlanPerfilSocial ? colors.primary : colors.textSecondary}
                  />
                </View>

                <View style={styles.featureToggleCardV7}>
                  <View style={styles.featureToggleInfo}>
                    <View style={styles.featureToggleIconContainer}>
                      <IconSymbol ios_icon_name="chart.bar.fill" android_material_icon_name="bar_chart" size={28} color={createPlanPanelAnalisis ? '#3B82F6' : colors.textSecondary} />
                    </View>
                    <View style={styles.featureToggleText}>
                      <Text style={styles.featureToggleTitle}>Panel de Análisis</Text>
                      <Text style={styles.featureToggleDescription}>
                        Estadísticas detalladas de visitas y rendimiento
                      </Text>
                    </View>
                  </View>
                  <Switch
                    value={createPlanPanelAnalisis}
                    onValueChange={setCreatePlanPanelAnalisis}
                    trackColor={{ false: colors.cardBorder, true: '#3B82F6' + '80' }}
                    thumbColor={createPlanPanelAnalisis ? '#3B82F6' : colors.textSecondary}
                  />
                </View>

                <View style={styles.featureToggleCardV7}>
                  <View style={styles.featureToggleInfo}>
                    <View style={styles.featureToggleIconContainer}>
                      <IconSymbol ios_icon_name="headphones" android_material_icon_name="support_agent" size={28} color={createPlanSoportePrioritario ? '#8B5CF6' : colors.textSecondary} />
                    </View>
                    <View style={styles.featureToggleText}>
                      <Text style={styles.featureToggleTitle}>Soporte Prioritario</Text>
                      <Text style={styles.featureToggleDescription}>
                        Atención preferente y respuesta rápida
                      </Text>
                    </View>
                  </View>
                  <Switch
                    value={createPlanSoportePrioritario}
                    onValueChange={setCreatePlanSoportePrioritario}
                    trackColor={{ false: colors.cardBorder, true: '#8B5CF6' + '80' }}
                    thumbColor={createPlanSoportePrioritario ? '#8B5CF6' : colors.textSecondary}
                  />
                </View>

                <View style={styles.featureToggleCardV7}>
                  <View style={styles.featureToggleInfo}>
                    <View style={styles.featureToggleIconContainer}>
                      <IconSymbol ios_icon_name="eye.fill" android_material_icon_name="visibility" size={28} color={createPlanVisibilidadExtra ? '#F59E0B' : colors.textSecondary} />
                    </View>
                    <View style={styles.featureToggleText}>
                      <Text style={styles.featureToggleTitle}>Visibilidad Extra</Text>
                      <Text style={styles.featureToggleDescription}>
                        Posiciones destacadas en búsquedas y listados
                      </Text>
                    </View>
                  </View>
                  <Switch
                    value={createPlanVisibilidadExtra}
                    onValueChange={setCreatePlanVisibilidadExtra}
                    trackColor={{ false: colors.cardBorder, true: '#F59E0B' + '80' }}
                    thumbColor={createPlanVisibilidadExtra ? '#F59E0B' : colors.textSecondary}
                  />
                </View>

                <View style={styles.featureToggleCardV7}>
                  <View style={styles.featureToggleInfo}>
                    <View style={styles.featureToggleIconContainer}>
                      <IconSymbol ios_icon_name="sparkles" android_material_icon_name="auto_awesome" size={28} color={createPlanVisibilidadMaxima ? '#EC4899' : colors.textSecondary} />
                    </View>
                    <View style={styles.featureToggleText}>
                      <Text style={styles.featureToggleTitle}>Visibilidad Máxima</Text>
                      <Text style={styles.featureToggleDescription}>
                        Máxima exposición en portada y secciones destacadas
                      </Text>
                    </View>
                  </View>
                  <Switch
                    value={createPlanVisibilidadMaxima}
                    onValueChange={setCreatePlanVisibilidadMaxima}
                    trackColor={{ false: colors.cardBorder, true: '#EC4899' + '80' }}
                    thumbColor={createPlanVisibilidadMaxima ? '#EC4899' : colors.textSecondary}
                  />
                </View>
              </View>
            </View>
          </ScrollView>

          <View style={styles.fullScreenModalFooter}>
            <TouchableOpacity
              style={[styles.fullScreenModalButton, creatingPlan && styles.fullScreenModalButtonDisabled]}
              onPress={handleCreatePlan}
              disabled={creatingPlan}
            >
              <LinearGradient
                colors={creatingPlan ? [colors.cardBorder, colors.cardBorder] : [colors.primary, colors.primary + 'DD']}
                style={styles.fullScreenModalButtonGradient}
              >
                {creatingPlan ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <React.Fragment>
                    <IconSymbol ios_icon_name="plus.circle.fill" android_material_icon_name="add_circle" size={24} color={colors.white} />
                    <Text style={styles.fullScreenModalButtonText}>Crear Plan</Text>
                  </React.Fragment>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
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
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.headerText,
  },
  headerSubtitleV7: {
    fontSize: 13,
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
    fontSize: 15,
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
    fontSize: 16,
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
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
  },
  sectionSubtitleV7: {
    fontSize: 15,
    color: colors.textSecondary,
    marginTop: 4,
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
    fontSize: 15,
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
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.white,
    marginBottom: 6,
  },
  planPriceV7: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.white,
  },
  editIconButtonV7: {
    padding: 4,
  },
  planDescriptionV7: {
    fontSize: 15,
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
    fontSize: 15,
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
    fontSize: 13,
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
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 6,
  },
  subscriptionPlanNameV7: {
    fontSize: 15,
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
    fontSize: 13,
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
    fontSize: 14,
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
    fontSize: 15,
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
    fontSize: 18,
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
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 6,
  },
  infoBoxText: {
    fontSize: 14,
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
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 6,
  },
  quickStatLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  emptyStateV7: {
    paddingVertical: 80,
    alignItems: 'center',
    gap: 16,
  },
  emptyTextV7: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
  },
  emptySubtextV7: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  // FULL SCREEN MODAL STYLES - COMPLETELY NEW DESIGN
  fullScreenModal: {
    flex: 1,
    backgroundColor: colors.background,
  },
  fullScreenModalHeader: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  fullScreenModalClose: {
    padding: 4,
    marginRight: 12,
  },
  fullScreenModalHeaderContent: {
    flex: 1,
  },
  fullScreenModalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.headerText,
  },
  fullScreenModalSubtitle: {
    fontSize: 14,
    color: colors.headerText,
    opacity: 0.9,
    marginTop: 4,
  },
  fullScreenModalContent: {
    flex: 1,
  },
  fullScreenModalContentContainer: {
    padding: 20,
    paddingBottom: 120,
  },
  fullScreenModalFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.cardBackground,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
    ...commonStyles.shadow,
  },
  fullScreenModalButton: {
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 12,
  },
  fullScreenModalButtonDisabled: {
    opacity: 0.5,
  },
  fullScreenModalButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 18,
  },
  fullScreenModalButtonText: {
    fontSize: 17,
    fontWeight: 'bold',
    color: colors.white,
  },
  // ASSIGN MODAL SPECIFIC STYLES
  assignStepV7: {
    marginBottom: 32,
  },
  assignStepHeaderV7: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
    marginBottom: 20,
  },
  assignStepNumberV7: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...commonStyles.shadow,
  },
  assignStepNumberTextV7: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.white,
  },
  assignStepHeaderText: {
    flex: 1,
  },
  assignStepTitleV7: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  assignStepSubtitleV7: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  searchContainerV7: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    ...commonStyles.shadow,
  },
  searchInputV7: {
    flex: 1,
    fontSize: 17,
    color: colors.text,
  },
  selectedLocalCardV7: {
    marginTop: 20,
    borderRadius: 16,
    overflow: 'hidden',
    ...commonStyles.shadow,
  },
  selectedLocalGradient: {
    padding: 24,
  },
  selectedLocalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  selectedLocalLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.white,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  selectedLocalName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.white,
    marginBottom: 8,
  },
  selectedLocalInfo: {
    fontSize: 16,
    color: colors.white,
    opacity: 0.9,
    marginBottom: 6,
  },
  selectedLocalAddress: {
    fontSize: 14,
    color: colors.white,
    opacity: 0.8,
    marginBottom: 16,
    lineHeight: 20,
  },
  changeLocalButtonV7: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.white,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  changeLocalButtonTextV7: {
    fontSize: 15,
    fontWeight: '700',
    color: '#059669',
  },
  searchResultsContainerV7: {
    marginTop: 20,
  },
  searchResultsTitleV7: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 16,
  },
  searchResultItemV7: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 16,
    backgroundColor: colors.cardBackground,
    borderRadius: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    ...commonStyles.shadow,
  },
  searchResultIconV7: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchResultInfoV7: {
    flex: 1,
  },
  searchResultNameV7: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  searchResultDetailsV7: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  searchResultAddressV7: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  noResultsContainerV7: {
    paddingVertical: 60,
    alignItems: 'center',
    gap: 12,
  },
  noResultsTextV7: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  noResultsSubtextV7: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  plansSelectionGridV7: {
    gap: 16,
  },
  planSelectionCardV7: {
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: colors.cardBorder,
  },
  planSelectionCardActiveV7: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '08',
  },
  planSelectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  planSelectionHeaderLeft: {
    flex: 1,
  },
  planSelectionName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 6,
  },
  planSelectionPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
  },
  planSelectionCheckmarkV7: {
    marginLeft: 16,
  },
  planSelectionCircleV7: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: colors.cardBorder,
    marginLeft: 16,
  },
  planSelectionDescription: {
    fontSize: 15,
    color: colors.textSecondary,
    marginBottom: 16,
    lineHeight: 22,
  },
  planSelectionFeatures: {
    gap: 10,
  },
  planSelectionFeature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  planSelectionFeatureText: {
    fontSize: 14,
    color: colors.text,
  },
  confirmationCardV7: {
    borderRadius: 16,
    overflow: 'hidden',
    ...commonStyles.shadow,
  },
  confirmationGradient: {
    padding: 20,
  },
  confirmationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 12,
  },
  confirmationIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmationInfo: {
    flex: 1,
  },
  confirmationLabel: {
    fontSize: 13,
    color: colors.text,
    opacity: 0.7,
    marginBottom: 4,
  },
  confirmationValue: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
  },
  confirmationDivider: {
    height: 1,
    backgroundColor: colors.cardBorder,
    marginVertical: 8,
  },
  confirmationNoteV7: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    backgroundColor: colors.primary + '10',
    padding: 18,
    borderRadius: 14,
    marginTop: 20,
  },
  confirmationNoteTextV7: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  // EDIT MODAL SPECIFIC STYLES
  editSectionV7: {
    marginBottom: 32,
  },
  editSectionHeaderV7: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: colors.cardBorder,
  },
  editSectionTitleV7: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  formGroupV7: {
    marginBottom: 20,
  },
  formLabelV7: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 10,
  },
  formInputV7: {
    backgroundColor: colors.cardBackground,
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 16,
    fontSize: 16,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  formTextAreaV7: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  priceInputContainerV7: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  priceInputV7: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  priceInputSuffix: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  formRowV7: {
    flexDirection: 'row',
    gap: 16,
  },
  numberInputContainerV7: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  numberInputV7: {
    flex: 1,
    fontSize: 17,
    fontWeight: '600',
    color: colors.text,
  },
  featureTogglesList: {
    gap: 16,
  },
  featureToggleCardV7: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.cardBackground,
    padding: 18,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  featureToggleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  featureToggleIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureToggleText: {
    flex: 1,
  },
  featureToggleTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  featureToggleDescription: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  deleteButtonV7: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#FEE2E2',
    paddingVertical: 16,
    borderRadius: 14,
  },
  deleteButtonTextV7: {
    fontSize: 16,
    fontWeight: '700',
    color: '#EF4444',
  },
});
