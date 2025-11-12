
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

interface Plan {
  id: string;
  nombre: string;
  precio_mensual: number;
  eventos_mes: number;
  promos_destacadas: number;
  perfil_social: boolean;
  panel_analisis: boolean;
  soporte_prioritario: boolean;
  visibilidad_extra: boolean;
  visibilidad_maxima: boolean;
  descripcion: string;
  activo: boolean;
}

interface Suscripcion {
  id: string;
  local_id: string;
  propietario_id: string;
  plan_id: string;
  estado: string;
  fecha_inicio: string;
  fecha_fin?: string;
  eventos_usados_mes: number;
  promos_usadas_mes: number;
  local?: {
    nombre: string;
    provincia: string;
  };
  propietario?: {
    nombre: string;
    email: string;
  };
  plan?: {
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
});

export default function GestionarPlanesScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'planes' | 'suscripciones'>('planes');
  const [loading, setLoading] = useState(true);
  const [planes, setPlanes] = useState<Plan[]>([]);
  const [suscripciones, setSuscripciones] = useState<Suscripcion[]>([]);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [locales, setLocales] = useState<Local[]>([]);
  const [localSearch, setLocalSearch] = useState('');
  const [selectedLocal, setSelectedLocal] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [loadingLocales, setLoadingLocales] = useState(false);
  const [assigning, setAssigning] = useState(false);

  const cargarPlanes = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('planes_suscripcion')
        .select('*')
        .order('precio_mensual', { ascending: true });

      if (error) throw error;

      setPlanes(data || []);
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
        .order('fecha_inicio', { ascending: false });

      if (error) throw error;

      const formattedData = (data || []).map((sub: any) => ({
        ...sub,
        local: sub.locales,
        propietario: sub.usuarios,
        plan: sub.planes_suscripcion,
      }));

      setSuscripciones(formattedData);
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

  const abrirModalAsignar = async () => {
    setSelectedLocal(null);
    setSelectedPlan(null);
    setLocalSearch('');
    await cargarLocales();
    setShowAssignModal(true);
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
        return;
      }

      // Check if subscription exists
      const { data: existingSub, error: checkError } = await supabase
        .from('suscripciones_locales')
        .select('id')
        .eq('local_id', selectedLocal)
        .maybeSingle();

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }

      if (existingSub) {
        // Update existing subscription
        const { error: updateError } = await supabase
          .from('suscripciones_locales')
          .update({
            plan_id: selectedPlan,
            estado: 'activa',
            fecha_inicio: new Date().toISOString(),
            eventos_usados_mes: 0,
            promos_usadas_mes: 0,
            ultimo_reset_contador: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingSub.id);

        if (updateError) throw updateError;
      } else {
        // Create new subscription
        const { error: insertError } = await supabase
          .from('suscripciones_locales')
          .insert({
            local_id: selectedLocal,
            propietario_id: local.propietario_id,
            plan_id: selectedPlan,
            estado: 'activa',
            fecha_inicio: new Date().toISOString(),
            eventos_usados_mes: 0,
            promos_usadas_mes: 0,
            ultimo_reset_contador: new Date().toISOString(),
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
            <IconSymbol name="chevron.left" size={24} color={colors.headerText} />
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
          <IconSymbol name="chevron.left" size={24} color={colors.headerText} />
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
            {planes.map((plan) => (
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
                      name={plan.eventos_mes > 0 ? 'checkmark.circle.fill' : 'xmark.circle.fill'}
                      size={18}
                      color={plan.eventos_mes > 0 ? colors.primary : colors.textSecondary}
                    />
                    <Text style={styles.featureText}>
                      {plan.eventos_mes > 0 ? `${plan.eventos_mes} eventos/mes` : 'Sin eventos'}
                    </Text>
                  </View>
                  <View style={styles.featureRow}>
                    <IconSymbol
                      name={plan.perfil_social ? 'checkmark.circle.fill' : 'xmark.circle.fill'}
                      size={18}
                      color={plan.perfil_social ? colors.primary : colors.textSecondary}
                    />
                    <Text style={styles.featureText}>Perfil social</Text>
                  </View>
                  <View style={styles.featureRow}>
                    <IconSymbol
                      name={plan.panel_analisis ? 'checkmark.circle.fill' : 'xmark.circle.fill'}
                      size={18}
                      color={plan.panel_analisis ? colors.primary : colors.textSecondary}
                    />
                    <Text style={styles.featureText}>Panel de análisis</Text>
                  </View>
                </View>
                <View style={styles.planActions}>
                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: plan.activo ? '#EF4444' : '#10B981' }]}
                    onPress={() => togglePlanActivo(plan.id, plan.activo)}
                  >
                    <Text style={styles.actionButtonText}>
                      {plan.activo ? 'Desactivar' : 'Activar'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
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
                <IconSymbol name="doc.text" size={64} color={colors.textSecondary} />
                <Text style={styles.emptyText}>No hay suscripciones activas</Text>
              </View>
            ) : (
              suscripciones.map((sub) => (
                <View key={sub.id} style={styles.suscripcionCard}>
                  <View style={styles.suscripcionHeader}>
                    <View style={styles.suscripcionInfo}>
                      <Text style={styles.localName}>{sub.local?.nombre || 'Local desconocido'}</Text>
                      <Text style={styles.propietarioName}>
                        {sub.propietario?.nombre || 'Propietario desconocido'}
                      </Text>
                      <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                        {sub.local?.provincia || ''}
                      </Text>
                    </View>
                    <View style={styles.planBadge}>
                      <Text style={styles.planBadgeText}>
                        {sub.plan?.nombre?.toUpperCase() || 'PLAN'}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.suscripcionStats}>
                    <View style={styles.statItem}>
                      <Text style={styles.statLabel}>Eventos usados</Text>
                      <Text style={styles.statValue}>{sub.eventos_usados_mes}</Text>
                    </View>
                    <View style={styles.statItem}>
                      <Text style={styles.statLabel}>Estado</Text>
                      <Text style={[styles.statValue, { color: sub.estado === 'activa' ? '#10B981' : '#EF4444' }]}>
                        {sub.estado}
                      </Text>
                    </View>
                    <View style={styles.statItem}>
                      <Text style={styles.statLabel}>Precio</Text>
                      <Text style={styles.statValue}>{sub.plan?.precio_mensual || 0}€/mes</Text>
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
