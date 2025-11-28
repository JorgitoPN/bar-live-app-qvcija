
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
  Pressable,
  Switch,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, commonStyles } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { supabase } from '@/utils/supabase';
import { useRouter } from 'expo-router';

interface PlanCaracteristicas {
  eventos_mes?: number;
  promos_destacadas?: number;
  perfil_social?: boolean;
  panel_analisis?: boolean;
  soporte_prioritario?: boolean;
  visibilidad_extra?: boolean;
  visibilidad_maxima?: boolean;
}

interface Plan {
  id: string;
  nombre: string;
  precio_mensual: number;
  descripcion: string;
  activo: boolean;
  caracteristicas?: PlanCaracteristicas;
}

interface Suscripcion {
  id: string;
  local_id: string;
  usuario_id: string;
  plan_id: string;
  estado: string;
  fecha_inicio: string;
  fecha_fin?: string;
  eventos_usados_mes?: number;
  promos_usadas_mes?: number;
  locales?: {
    nombre: string;
    provincia: string;
  };
  usuarios?: {
    nombre: string;
    email: string;
  };
  planes_suscripcion?: {
    nombre: string;
    precio_mensual: number;
  };
}

interface Local {
  id: string;
  nombre: string;
  provincia: string;
  propietario_id?: string;
}

export default function GestionarPlanesScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'planes' | 'suscripciones'>('planes');
  const [loading, setLoading] = useState(true);
  const [planes, setPlanes] = useState<Plan[]>([]);
  const [suscripciones, setSuscripciones] = useState<Suscripcion[]>([]);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [locales, setLocales] = useState<Local[]>([]);
  const [localSearch, setLocalSearch] = useState('');
  const [selectedLocal, setSelectedLocal] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [loadingLocales, setLoadingLocales] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [saving, setSaving] = useState(false);

  // Edit form state
  const [editNombre, setEditNombre] = useState('');
  const [editDescripcion, setEditDescripcion] = useState('');
  const [editPrecio, setEditPrecio] = useState('');
  const [editEventos, setEditEventos] = useState('');
  const [editPromos, setEditPromos] = useState('');
  const [editPerfilSocial, setEditPerfilSocial] = useState(false);
  const [editPanelAnalisis, setEditPanelAnalisis] = useState(false);
  const [editSoportePrioritario, setEditSoportePrioritario] = useState(false);
  const [editVisibilidadExtra, setEditVisibilidadExtra] = useState(false);
  const [editVisibilidadMaxima, setEditVisibilidadMaxima] = useState(false);

  const cargarPlanes = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('planes_suscripcion')
        .select('*')
        .order('precio_mensual', { ascending: true });

      if (error) throw error;

      // ✅ FIXED: Parse caracteristicas properly
      const planesFormateados = (data || []).map((plan: any) => {
        let caracteristicas: PlanCaracteristicas = {};
        
        // Handle both array and object formats
        if (plan.caracteristicas) {
          if (typeof plan.caracteristicas === 'object' && !Array.isArray(plan.caracteristicas)) {
            caracteristicas = plan.caracteristicas;
          }
        }
        
        return {
          ...plan,
          caracteristicas,
        };
      });

      setPlanes(planesFormateados);
      console.log('[GestionarPlanes] ✅ Loaded', planesFormateados.length, 'plans');
    } catch (error) {
      console.error('[GestionarPlanes] Error loading plans:', error);
      Alert.alert('Error', 'No se pudieron cargar los planes');
    }
  }, []);

  const cargarSuscripciones = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('suscripciones_locales')
        .select(`
          *,
          locales (nombre, provincia),
          usuarios (nombre, email),
          planes_suscripcion (nombre, precio_mensual)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setSuscripciones(data || []);
      console.log('[GestionarPlanes] ✅ Loaded', (data || []).length, 'subscriptions');
    } catch (error) {
      console.error('[GestionarPlanes] Error loading subscriptions:', error);
      Alert.alert('Error', 'No se pudieron cargar las suscripciones');
    }
  }, []);

  const cargarLocales = useCallback(async () => {
    try {
      setLoadingLocales(true);
      const { data, error } = await supabase
        .from('locales')
        .select('id, nombre, provincia, propietario_id')
        .eq('activo', true)
        .not('propietario_id', 'is', null)
        .order('nombre');

      if (error) throw error;

      setLocales(data || []);
    } catch (error) {
      console.error('[GestionarPlanes] Error loading locales:', error);
      Alert.alert('Error', 'No se pudieron cargar los locales');
    } finally {
      setLoadingLocales(false);
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([cargarPlanes(), cargarSuscripciones()]);
      setLoading(false);
    };
    loadData();
  }, [cargarPlanes, cargarSuscripciones]);

  const togglePlanActivo = async (planId: string, activo: boolean) => {
    try {
      const { error } = await supabase
        .from('planes_suscripcion')
        .update({ activo: !activo })
        .eq('id', planId);

      if (error) throw error;

      Alert.alert('Éxito', `Plan ${!activo ? 'activado' : 'desactivado'} correctamente`);
      cargarPlanes();
    } catch (error) {
      console.error('[GestionarPlanes] Error toggling plan:', error);
      Alert.alert('Error', 'No se pudo actualizar el plan');
    }
  };

  // ✅ NEW: Delete plan function
  const eliminarPlan = async (planId: string, planNombre: string) => {
    Alert.alert(
      'Eliminar Plan',
      `¿Estás seguro de que quieres eliminar el plan "${planNombre}"? Esta acción no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              // Check if plan has active subscriptions
              const { data: activeSubs, error: checkError } = await supabase
                .from('suscripciones_locales')
                .select('id')
                .eq('plan_id', planId)
                .eq('estado', 'activa');

              if (checkError) throw checkError;

              if (activeSubs && activeSubs.length > 0) {
                Alert.alert(
                  'No se puede eliminar',
                  `Este plan tiene ${activeSubs.length} suscripciones activas. Cancela las suscripciones primero.`
                );
                return;
              }

              const { error } = await supabase
                .from('planes_suscripcion')
                .delete()
                .eq('id', planId);

              if (error) throw error;

              Alert.alert('Éxito', 'Plan eliminado correctamente');
              cargarPlanes();
            } catch (error) {
              console.error('[GestionarPlanes] Error deleting plan:', error);
              Alert.alert('Error', 'No se pudo eliminar el plan');
            }
          },
        },
      ]
    );
  };

  const abrirModalAsignar = async () => {
    setSelectedLocal(null);
    setSelectedPlan(null);
    setLocalSearch('');
    await cargarLocales();
    setShowAssignModal(true);
  };

  const abrirModalEditar = (plan: Plan) => {
    setEditingPlan(plan);
    setEditNombre(plan.nombre);
    setEditDescripcion(plan.descripcion);
    setEditPrecio(plan.precio_mensual?.toString() || '0');
    
    const caract = plan.caracteristicas || {};
    setEditEventos(caract.eventos_mes?.toString() || '0');
    setEditPromos(caract.promos_destacadas?.toString() || '0');
    setEditPerfilSocial(caract.perfil_social || false);
    setEditPanelAnalisis(caract.panel_analisis || false);
    setEditSoportePrioritario(caract.soporte_prioritario || false);
    setEditVisibilidadExtra(caract.visibilidad_extra || false);
    setEditVisibilidadMaxima(caract.visibilidad_maxima || false);
    setShowEditModal(true);
  };

  const guardarPlan = async () => {
    if (!editingPlan) return;

    if (!editNombre.trim() || !editDescripcion.trim()) {
      Alert.alert('Error', 'El nombre y la descripción son obligatorios');
      return;
    }

    const precio = parseFloat(editPrecio);
    const eventos = parseInt(editEventos);
    const promos = parseInt(editPromos);

    if (isNaN(precio) || precio < 0) {
      Alert.alert('Error', 'El precio debe ser un número válido');
      return;
    }

    if (isNaN(eventos) || eventos < 0) {
      Alert.alert('Error', 'Los eventos deben ser un número válido');
      return;
    }

    if (isNaN(promos) || promos < 0) {
      Alert.alert('Error', 'Las promos deben ser un número válido');
      return;
    }

    try {
      setSaving(true);

      const { error } = await supabase
        .from('planes_suscripcion')
        .update({
          nombre: editNombre.trim(),
          descripcion: editDescripcion.trim(),
          precio_mensual: precio,
          caracteristicas: {
            eventos_mes: eventos,
            promos_destacadas: promos,
            perfil_social: editPerfilSocial,
            panel_analisis: editPanelAnalisis,
            soporte_prioritario: editSoportePrioritario,
            visibilidad_extra: editVisibilidadExtra,
            visibilidad_maxima: editVisibilidadMaxima,
          },
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingPlan.id);

      if (error) throw error;

      Alert.alert('Éxito', 'Plan actualizado correctamente');
      setShowEditModal(false);
      setEditingPlan(null);
      cargarPlanes();
    } catch (error) {
      console.error('[GestionarPlanes] Error saving plan:', error);
      Alert.alert('Error', 'No se pudo guardar el plan');
    } finally {
      setSaving(false);
    }
  };

  const asignarPlanManual = async () => {
    if (!selectedLocal || !selectedPlan) {
      Alert.alert('Error', 'Debes seleccionar un local y un plan');
      return;
    }

    try {
      setAssigning(true);

      const local = locales.find(l => l.id === selectedLocal);
      if (!local || !local.propietario_id) {
        Alert.alert('Error', 'El local seleccionado no tiene propietario asignado');
        setAssigning(false);
        return;
      }

      const { data: existingSub, error: checkError } = await supabase
        .from('suscripciones_locales')
        .select('id')
        .eq('local_id', selectedLocal)
        .maybeSingle();

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }

      if (existingSub) {
        const { error: updateError } = await supabase
          .from('suscripciones_locales')
          .update({
            plan_id: selectedPlan,
            estado: 'activa',
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingSub.id);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('suscripciones_locales')
          .insert({
            local_id: selectedLocal,
            usuario_id: local.propietario_id,
            plan_id: selectedPlan,
            estado: 'activa',
          });

        if (insertError) throw insertError;
      }

      Alert.alert('Éxito', 'Plan asignado correctamente al local');
      setShowAssignModal(false);
      cargarSuscripciones();
    } catch (error) {
      console.error('[GestionarPlanes] Error assigning plan:', error);
      Alert.alert('Error', 'No se pudo asignar el plan');
    } finally {
      setAssigning(false);
    }
  };

  const cancelarSuscripcion = async (suscripcionId: string) => {
    Alert.alert(
      'Cancelar Suscripción',
      '¿Estás seguro de que quieres cancelar esta suscripción?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('suscripciones_locales')
                .update({
                  estado: 'cancelada',
                  fecha_fin: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                })
                .eq('id', suscripcionId);

              if (error) throw error;

              Alert.alert('Éxito', 'Suscripción cancelada correctamente');
              cargarSuscripciones();
            } catch (error) {
              console.error('[GestionarPlanes] Error canceling subscription:', error);
              Alert.alert('Error', 'No se pudo cancelar la suscripción');
            }
          },
        },
      ]
    );
  };

  const localesFiltrados = locales.filter(local => {
    if (!localSearch) return true;
    return local.nombre.toLowerCase().includes(localSearch.toLowerCase()) ||
           local.provincia.toLowerCase().includes(localSearch.toLowerCase());
  });

  if (loading) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={[colors.headerGradientStart, colors.headerGradientEnd]}
          style={styles.header}
        >
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <IconSymbol ios_icon_name="chevron.left" android_material_icon_name="arrow_back" size={24} color={colors.headerText} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Gestionar Planes</Text>
        </LinearGradient>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.headerGradientStart, colors.headerGradientEnd]}
        style={styles.header}
      >
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <IconSymbol ios_icon_name="chevron.left" android_material_icon_name="arrow_back" size={24} color={colors.headerText} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Gestionar Planes</Text>
      </LinearGradient>

      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'planes' && styles.tabActive]}
          onPress={() => setActiveTab('planes')}
        >
          <Text style={[styles.tabText, activeTab === 'planes' && styles.tabTextActive]}>
            Planes ({planes.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'suscripciones' && styles.tabActive]}
          onPress={() => setActiveTab('suscripciones')}
        >
          <Text style={[styles.tabText, activeTab === 'suscripciones' && styles.tabTextActive]}>
            Suscripciones ({suscripciones.length})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {activeTab === 'planes' ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Planes Disponibles</Text>
            {planes.map((plan) => {
              const caracteristicas = plan.caracteristicas || {};
              return (
                <View key={plan.id} style={styles.planCard}>
                  <View style={styles.planHeader}>
                    <Text style={styles.planName}>{plan.nombre}</Text>
                    <Text style={styles.planPrice}>
                      {plan.precio_mensual === 0 ? 'Gratis' : `${plan.precio_mensual}€/mes`}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 14, color: colors.textSecondary, marginBottom: 12 }}>
                    {plan.descripcion}
                  </Text>
                  <View style={styles.planFeatures}>
                    <View style={styles.featureRow}>
                      <IconSymbol
                        ios_icon_name={(caracteristicas.eventos_mes || 0) > 0 ? 'checkmark.circle.fill' : 'xmark.circle.fill'}
                        android_material_icon_name={(caracteristicas.eventos_mes || 0) > 0 ? 'check_circle' : 'cancel'}
                        size={18}
                        color={(caracteristicas.eventos_mes || 0) > 0 ? colors.primary : colors.textSecondary}
                      />
                      <Text style={styles.featureText}>
                        {(caracteristicas.eventos_mes || 0) > 0 ? `${caracteristicas.eventos_mes} eventos/mes` : 'Sin eventos'}
                      </Text>
                    </View>
                    <View style={styles.featureRow}>
                      <IconSymbol
                        ios_icon_name={caracteristicas.perfil_social ? 'checkmark.circle.fill' : 'xmark.circle.fill'}
                        android_material_icon_name={caracteristicas.perfil_social ? 'check_circle' : 'cancel'}
                        size={18}
                        color={caracteristicas.perfil_social ? colors.primary : colors.textSecondary}
                      />
                      <Text style={styles.featureText}>Perfil social</Text>
                    </View>
                    <View style={styles.featureRow}>
                      <IconSymbol
                        ios_icon_name={caracteristicas.panel_analisis ? 'checkmark.circle.fill' : 'xmark.circle.fill'}
                        android_material_icon_name={caracteristicas.panel_analisis ? 'check_circle' : 'cancel'}
                        size={18}
                        color={caracteristicas.panel_analisis ? colors.primary : colors.textSecondary}
                      />
                      <Text style={styles.featureText}>Panel de análisis</Text>
                    </View>
                  </View>
                  <View style={styles.planActions}>
                    <TouchableOpacity
                      style={[styles.actionButton, { backgroundColor: colors.primary }]}
                      onPress={() => abrirModalEditar(plan)}
                    >
                      <Text style={styles.actionButtonText}>Editar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionButton, { backgroundColor: plan.activo ? '#EF4444' : '#10B981' }]}
                      onPress={() => togglePlanActivo(plan.id, plan.activo)}
                    >
                      <Text style={styles.actionButtonText}>
                        {plan.activo ? 'Desactivar' : 'Activar'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionButton, { backgroundColor: '#DC2626', flex: 0, paddingHorizontal: 12 }]}
                      onPress={() => eliminarPlan(plan.id, plan.nombre)}
                    >
                      <IconSymbol ios_icon_name="trash.fill" android_material_icon_name="delete" size={16} color={colors.headerText} />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        ) : (
          <View style={styles.section}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={styles.sectionTitle}>Suscripciones Activas</Text>
              <TouchableOpacity
                style={[styles.actionButton, { flex: 0, paddingHorizontal: 20 }]}
                onPress={abrirModalAsignar}
              >
                <Text style={styles.actionButtonText}>Asignar Plan</Text>
              </TouchableOpacity>
            </View>
            {suscripciones.length === 0 ? (
              <View style={styles.emptyState}>
                <IconSymbol ios_icon_name="doc.text" android_material_icon_name="description" size={64} color={colors.textSecondary} />
                <Text style={styles.emptyText}>No hay suscripciones activas</Text>
              </View>
            ) : (
              suscripciones.map((sub) => (
                <View key={sub.id} style={styles.suscripcionCard}>
                  <View style={styles.suscripcionHeader}>
                    <View style={styles.suscripcionInfo}>
                      <Text style={styles.localName}>{sub.locales?.nombre || 'Local desconocido'}</Text>
                      <Text style={styles.propietarioName}>
                        {sub.usuarios?.nombre || 'Propietario desconocido'}
                      </Text>
                      <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                        {sub.locales?.provincia || ''}
                      </Text>
                    </View>
                    <View style={styles.planBadge}>
                      <Text style={styles.planBadgeText}>
                        {sub.planes_suscripcion?.nombre?.toUpperCase() || 'PLAN'}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.suscripcionStats}>
                    <View style={styles.statItem}>
                      <Text style={styles.statLabel}>Eventos usados</Text>
                      <Text style={styles.statValue}>{sub.eventos_usados_mes || 0}</Text>
                    </View>
                    <View style={styles.statItem}>
                      <Text style={styles.statLabel}>Estado</Text>
                      <Text style={[styles.statValue, { color: sub.estado === 'activa' ? '#10B981' : '#EF4444' }]}>
                        {sub.estado}
                      </Text>
                    </View>
                    <View style={styles.statItem}>
                      <Text style={styles.statLabel}>Precio</Text>
                      <Text style={styles.statValue}>{sub.planes_suscripcion?.precio_mensual || 0}€/mes</Text>
                    </View>
                  </View>
                  {sub.estado === 'activa' && (
                    <View style={styles.planActions}>
                      <TouchableOpacity
                        style={[styles.actionButton, { backgroundColor: '#EF4444' }]}
                        onPress={() => cancelarSuscripcion(sub.id)}
                      >
                        <Text style={styles.actionButtonText}>Cancelar Suscripción</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>

      {/* Edit Plan Modal */}
      <Modal
        visible={showEditModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowEditModal(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowEditModal(false)}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>Editar Plan</Text>

            <ScrollView style={styles.modalScrollView}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Nombre del Plan</Text>
                <TextInput
                  style={styles.input}
                  value={editNombre}
                  onChangeText={setEditNombre}
                  placeholder="Ej: Básico, Estándar, Premium"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Descripción</Text>
                <TextInput
                  style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
                  value={editDescripcion}
                  onChangeText={setEditDescripcion}
                  placeholder="Descripción del plan"
                  placeholderTextColor={colors.textSecondary}
                  multiline
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Precio Mensual (€)</Text>
                <TextInput
                  style={styles.input}
                  value={editPrecio}
                  onChangeText={setEditPrecio}
                  placeholder="0"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Eventos por Mes</Text>
                <TextInput
                  style={styles.input}
                  value={editEventos}
                  onChangeText={setEditEventos}
                  placeholder="0"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Promos Destacadas</Text>
                <TextInput
                  style={styles.input}
                  value={editPromos}
                  onChangeText={setEditPromos}
                  placeholder="0"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Características</Text>
                <View style={styles.switchRow}>
                  <Text style={styles.switchLabel}>Perfil Social</Text>
                  <Switch
                    value={editPerfilSocial}
                    onValueChange={setEditPerfilSocial}
                    trackColor={{ false: colors.cardBorder, true: colors.primary }}
                  />
                </View>
                <View style={styles.switchRow}>
                  <Text style={styles.switchLabel}>Panel de Análisis</Text>
                  <Switch
                    value={editPanelAnalisis}
                    onValueChange={setEditPanelAnalisis}
                    trackColor={{ false: colors.cardBorder, true: colors.primary }}
                  />
                </View>
                <View style={styles.switchRow}>
                  <Text style={styles.switchLabel}>Soporte Prioritario</Text>
                  <Switch
                    value={editSoportePrioritario}
                    onValueChange={setEditSoportePrioritario}
                    trackColor={{ false: colors.cardBorder, true: colors.primary }}
                  />
                </View>
                <View style={styles.switchRow}>
                  <Text style={styles.switchLabel}>Visibilidad Extra</Text>
                  <Switch
                    value={editVisibilidadExtra}
                    onValueChange={setEditVisibilidadExtra}
                    trackColor={{ false: colors.cardBorder, true: colors.primary }}
                  />
                </View>
                <View style={styles.switchRow}>
                  <Text style={styles.switchLabel}>Visibilidad Máxima</Text>
                  <Switch
                    value={editVisibilidadMaxima}
                    onValueChange={setEditVisibilidadMaxima}
                    trackColor={{ false: colors.cardBorder, true: colors.primary }}
                  />
                </View>
              </View>
            </ScrollView>

            <TouchableOpacity
              style={[
                styles.assignButton,
                saving && styles.assignButtonDisabled,
              ]}
              onPress={guardarPlan}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color={colors.headerText} />
              ) : (
                <Text style={styles.assignButtonText}>Guardar Cambios</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.modalCancel} onPress={() => setShowEditModal(false)}>
              <Text style={styles.modalCancelText}>Cancelar</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Assign Plan Modal */}
      <Modal
        visible={showAssignModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAssignModal(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowAssignModal(false)}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>Asignar Plan a Local</Text>

            <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 8 }}>
              Seleccionar Local
            </Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar local..."
              placeholderTextColor={colors.textSecondary}
              value={localSearch}
              onChangeText={setLocalSearch}
            />

            {loadingLocales ? (
              <View style={{ padding: 20, alignItems: 'center' }}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            ) : (
              <ScrollView style={styles.modalScrollView}>
                {localesFiltrados.map((local) => (
                  <TouchableOpacity
                    key={local.id}
                    style={[
                      styles.localItem,
                      selectedLocal === local.id && styles.localItemSelected,
                    ]}
                    onPress={() => setSelectedLocal(local.id)}
                  >
                    <Text style={styles.localNombre}>{local.nombre}</Text>
                    <Text style={styles.localProvincia}>{local.provincia}</Text>
                  </TouchableOpacity>
                ))}
                {localesFiltrados.length === 0 && (
                  <Text style={styles.emptyText}>No se encontraron locales</Text>
                )}
              </ScrollView>
            )}

            <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text, marginTop: 16, marginBottom: 8 }}>
              Seleccionar Plan
            </Text>
            <View style={styles.planSelector}>
              {planes.filter(p => p.activo).map((plan) => (
                <TouchableOpacity
                  key={plan.id}
                  style={[
                    styles.planOption,
                    selectedPlan === plan.id && styles.planOptionSelected,
                  ]}
                  onPress={() => setSelectedPlan(plan.id)}
                >
                  <Text style={styles.planOptionName}>{plan.nombre}</Text>
                  <Text style={styles.planOptionPrice}>
                    {plan.precio_mensual === 0 ? 'Gratis' : `${plan.precio_mensual}€/mes`}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[
                styles.assignButton,
                (!selectedLocal || !selectedPlan || assigning) && styles.assignButtonDisabled,
              ]}
              onPress={asignarPlanManual}
              disabled={!selectedLocal || !selectedPlan || assigning}
            >
              {assigning ? (
                <ActivityIndicator color={colors.headerText} />
              ) : (
                <Text style={styles.assignButtonText}>Asignar Plan</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.modalCancel} onPress={() => setShowAssignModal(false)}>
              <Text style={styles.modalCancelText}>Cancelar</Text>
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
    paddingBottom: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.headerText,
    flex: 1,
    marginLeft: 12,
  },
  content: {
    flex: 1,
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: colors.cardBackground,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: colors.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  tabTextActive: {
    color: colors.headerText,
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 12,
  },
  planCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  planName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  planPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
  planFeatures: {
    gap: 8,
    marginBottom: 12,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  featureText: {
    fontSize: 14,
    color: colors.text,
  },
  planActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.headerText,
  },
  suscripcionCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  suscripcionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  suscripcionInfo: {
    flex: 1,
  },
  localName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  propietarioName: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  planBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: colors.primary,
  },
  planBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.headerText,
  },
  suscripcionStats: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 8,
  },
  statItem: {
    flex: 1,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.background,
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 500,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 20,
  },
  modalScrollView: {
    maxHeight: 400,
  },
  searchInput: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: 16,
  },
  localItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  localItemSelected: {
    backgroundColor: colors.primary + '20',
  },
  localNombre: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  localProvincia: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  planSelector: {
    marginBottom: 16,
  },
  planOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.cardBorder,
    marginBottom: 8,
  },
  planOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  planOptionName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  planOptionPrice: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  assignButton: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  assignButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.headerText,
  },
  assignButtonDisabled: {
    backgroundColor: colors.cardBorder,
  },
  modalCancel: {
    marginTop: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 16,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    marginBottom: 8,
  },
  switchLabel: {
    fontSize: 15,
    color: colors.text,
    fontWeight: '500',
  },
});
