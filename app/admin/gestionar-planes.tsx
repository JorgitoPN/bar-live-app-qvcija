
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
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '@/utils/supabase';
import React, { useState, useEffect, useCallback } from 'react';
import { IconSymbol } from '@/components/IconSymbol';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { colors, commonStyles } from '@/styles/commonStyles';
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
  propietario_id?: string;
  propietario?: {
    nombre: string;
    email: string;
    username?: string;
  };
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingTop: Platform.OS === 'android' ? 50 : 60,
    paddingBottom: Platform.OS === 'android' ? 16 : 20,
    paddingHorizontal: Platform.OS === 'android' ? 16 : 20,
  },
  headerTitle: {
    fontSize: scaleFontSize(28),
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: Platform.OS === 'android' ? 4 : 8,
  },
  headerSubtitle: {
    fontSize: scaleFontSize(14),
    color: 'rgba(255,255,255,0.8)',
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: Platform.OS === 'android' ? 16 : 20,
    marginBottom: Platform.OS === 'android' ? 12 : 16,
  },
  tab: {
    flex: 1,
    paddingVertical: Platform.OS === 'android' ? 10 : 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: colors.primary,
  },
  tabText: {
    fontSize: scaleFontSize(14),
    color: colors.textSecondary,
    fontWeight: '500',
  },
  activeTabText: {
    color: colors.primary,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: Platform.OS === 'android' ? 16 : 20,
  },
  planCard: {
    backgroundColor: colors.card,
    borderRadius: Platform.OS === 'android' ? 12 : 16,
    padding: Platform.OS === 'android' ? 14 : 16,
    marginBottom: Platform.OS === 'android' ? 12 : 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Platform.OS === 'android' ? 10 : 12,
  },
  planName: {
    fontSize: scaleFontSize(18),
    fontWeight: 'bold',
    color: colors.text,
    flex: 1,
  },
  planPrice: {
    fontSize: scaleFontSize(16),
    fontWeight: '600',
    color: colors.primary,
  },
  planDescription: {
    fontSize: scaleFontSize(13),
    color: colors.textSecondary,
    marginBottom: Platform.OS === 'android' ? 10 : 12,
  },
  badge: {
    paddingHorizontal: Platform.OS === 'android' ? 8 : 10,
    paddingVertical: Platform.OS === 'android' ? 4 : 5,
    borderRadius: Platform.OS === 'android' ? 10 : 12,
    alignSelf: 'flex-start',
    marginBottom: Platform.OS === 'android' ? 8 : 10,
  },
  badgeText: {
    fontSize: scaleFontSize(11),
    fontWeight: '600',
    color: '#fff',
  },
  actionButton: {
    backgroundColor: colors.primary,
    paddingVertical: Platform.OS === 'android' ? 10 : 12,
    paddingHorizontal: Platform.OS === 'android' ? 16 : 20,
    borderRadius: Platform.OS === 'android' ? 8 : 10,
    alignItems: 'center',
    marginTop: Platform.OS === 'android' ? 8 : 10,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: scaleFontSize(14),
    fontWeight: '600',
  },
  searchInput: {
    backgroundColor: colors.card,
    borderRadius: Platform.OS === 'android' ? 8 : 10,
    paddingHorizontal: Platform.OS === 'android' ? 12 : 16,
    paddingVertical: Platform.OS === 'android' ? 10 : 12,
    fontSize: scaleFontSize(14),
    color: colors.text,
    marginBottom: Platform.OS === 'android' ? 12 : 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  localCard: {
    backgroundColor: colors.card,
    borderRadius: Platform.OS === 'android' ? 10 : 12,
    padding: Platform.OS === 'android' ? 12 : 14,
    marginBottom: Platform.OS === 'android' ? 10 : 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  localImage: {
    width: Platform.OS === 'android' ? 50 : 60,
    height: Platform.OS === 'android' ? 50 : 60,
    borderRadius: Platform.OS === 'android' ? 8 : 10,
    marginRight: Platform.OS === 'android' ? 10 : 12,
  },
  localInfo: {
    flex: 1,
  },
  localName: {
    fontSize: scaleFontSize(15),
    fontWeight: '600',
    color: colors.text,
    marginBottom: Platform.OS === 'android' ? 3 : 4,
  },
  localDetail: {
    fontSize: scaleFontSize(12),
    color: colors.textSecondary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.card,
    borderRadius: Platform.OS === 'android' ? 16 : 20,
    padding: Platform.OS === 'android' ? 18 : 24,
    width: '90%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: scaleFontSize(20),
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: Platform.OS === 'android' ? 14 : 16,
  },
  input: {
    backgroundColor: colors.background,
    borderRadius: Platform.OS === 'android' ? 8 : 10,
    paddingHorizontal: Platform.OS === 'android' ? 12 : 16,
    paddingVertical: Platform.OS === 'android' ? 10 : 12,
    fontSize: scaleFontSize(14),
    color: colors.text,
    marginBottom: Platform.OS === 'android' ? 10 : 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Platform.OS === 'android' ? 16 : 20,
  },
  modalButton: {
    flex: 1,
    paddingVertical: Platform.OS === 'android' ? 10 : 12,
    borderRadius: Platform.OS === 'android' ? 8 : 10,
    alignItems: 'center',
    marginHorizontal: Platform.OS === 'android' ? 4 : 6,
  },
  modalButtonText: {
    fontSize: scaleFontSize(14),
    fontWeight: '600',
  },
});

export default function GestionarPlanesScreen() {
  const [activeTab, setActiveTab] = useState<'planes' | 'subscriptions' | 'assign'>('planes');
  const [planes, setPlanes] = useState<Plan[]>([]);
  const [subscriptions, setSubscriptions] = useState<LocalSubscription[]>([]);
  const [locales, setLocales] = useState<Local[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLocal, setSelectedLocal] = useState<Local | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  
  const { user } = useAuth();
  const router = useRouter();

  const cargarDatos = useCallback(async () => {
    try {
      setLoading(true);
      
      const [planesRes, subsRes] = await Promise.all([
        supabase.from('planes').select('*').order('precio_mensual'),
        supabase.from('local_subscriptions').select(`
          *,
          locales(nombre, imagen_url),
          plan:planes(nombre)
        `).order('created_at', { ascending: false })
      ]);

      if (planesRes.data) setPlanes(planesRes.data);
      if (subsRes.data) setSubscriptions(subsRes.data as any);
    } catch (error) {
      console.error('Error cargando datos:', error);
      Alert.alert('Error', 'No se pudieron cargar los datos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  const buscarLocales = useCallback(async () => {
    if (searchQuery.length < 2) {
      setLocales([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('locales')
        .select('*')
        .ilike('nombre', `%${searchQuery}%`)
        .limit(10);

      if (error) throw error;
      setLocales(data || []);
    } catch (error) {
      console.error('Error buscando locales:', error);
    }
  }, [searchQuery]);

  useEffect(() => {
    const timer = setTimeout(buscarLocales, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, buscarLocales]);

  const asignarPlan = useCallback(async () => {
    if (!selectedLocal || !selectedPlan) return;

    try {
      await crearNuevaSuscripcion();
      setShowAssignModal(false);
      setSelectedLocal(null);
      setSelectedPlan(null);
      setSearchQuery('');
      Alert.alert('Éxito', 'Plan asignado correctamente');
      cargarDatos();
    } catch (error) {
      console.error('Error asignando plan:', error);
      Alert.alert('Error', 'No se pudo asignar el plan');
    }
  }, [selectedLocal, selectedPlan, cargarDatos]);

  const crearNuevaSuscripcion = async () => {
    const { error } = await supabase.from('local_subscriptions').insert({
      local_id: selectedLocal!.id,
      plan_id: selectedPlan!.id,
      estado: 'activa',
      fecha_inicio: new Date().toISOString(),
    });

    if (error) throw error;
  };

  const cancelarSuscripcion = useCallback(async (subscriptionId: string, localName: string) => {
    Alert.alert(
      'Cancelar Suscripción',
      `¿Estás seguro de cancelar la suscripción de ${localName}?`,
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Sí, cancelar',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('local_subscriptions')
                .update({ estado: 'cancelada' })
                .eq('id', subscriptionId);

              if (error) throw error;
              Alert.alert('Éxito', 'Suscripción cancelada');
              cargarDatos();
            } catch (error) {
              console.error('Error:', error);
              Alert.alert('Error', 'No se pudo cancelar la suscripción');
            }
          },
        },
      ]
    );
  }, [cargarDatos]);

  const handleEditPlan = (plan: Plan) => {
    // Implementar edición
  };

  const handleViewPlanDetail = (plan: Plan) => {
    // Implementar vista detalle
  };

  const handleSavePlan = () => {
    // Implementar guardado
  };

  const handleCreatePlan = () => {
    // Implementar creación
  };

  const handleDeletePlan = (planId: string, planName: string) => {
    // Implementar eliminación
  };

  const getEstadoBadge = (estado: string) => {
    const colors = {
      activa: '#10b981',
      cancelada: '#ef4444',
      expirada: '#f59e0b',
    };
    return colors[estado as keyof typeof colors] || '#6b7280';
  };

  const renderPlanesTab = () => (
    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
      {planes.map((plan) => (
        <View key={plan.id} style={styles.planCard}>
          <View style={styles.planHeader}>
            <Text style={styles.planName}>{plan.nombre}</Text>
            <Text style={styles.planPrice}>€{plan.precio_mensual}/mes</Text>
          </View>
          <Text style={styles.planDescription}>{plan.descripcion}</Text>
          <View style={[styles.badge, { backgroundColor: plan.activo ? colors.success : colors.error }]}>
            <Text style={styles.badgeText}>{plan.activo ? 'Activo' : 'Inactivo'}</Text>
          </View>
          <TouchableOpacity style={styles.actionButton} onPress={() => handleEditPlan(plan)}>
            <Text style={styles.actionButtonText}>Editar Plan</Text>
          </TouchableOpacity>
        </View>
      ))}
    </ScrollView>
  );

  const renderSubscriptionsTab = () => (
    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
      {subscriptions.map((sub) => (
        <View key={sub.id} style={styles.planCard}>
          <View style={styles.planHeader}>
            <Text style={styles.planName}>{sub.locales.nombre}</Text>
            <View style={[styles.badge, { backgroundColor: getEstadoBadge(sub.estado) }]}>
              <Text style={styles.badgeText}>{sub.estado}</Text>
            </View>
          </View>
          <Text style={styles.planDescription}>Plan: {sub.plan.nombre}</Text>
          <Text style={styles.localDetail}>Inicio: {new Date(sub.fecha_inicio).toLocaleDateString()}</Text>
          {sub.estado === 'activa' && (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.error }]}
              onPress={() => cancelarSuscripcion(sub.id, sub.locales.nombre)}
            >
              <Text style={styles.actionButtonText}>Cancelar Suscripción</Text>
            </TouchableOpacity>
          )}
        </View>
      ))}
    </ScrollView>
  );

  const renderAssignTab = () => (
    <View style={styles.content}>
      <TextInput
        style={styles.searchInput}
        placeholder="Buscar local..."
        placeholderTextColor={colors.textSecondary}
        value={searchQuery}
        onChangeText={setSearchQuery}
      />
      <ScrollView showsVerticalScrollIndicator={false}>
        {locales.map((local) => (
          <TouchableOpacity
            key={local.id}
            style={styles.localCard}
            onPress={() => {
              setSelectedLocal(local);
              setShowAssignModal(true);
            }}
          >
            {local.imagen_url && (
              <Image source={{ uri: local.imagen_url }} style={styles.localImage} />
            )}
            <View style={styles.localInfo}>
              <Text style={styles.localName}>{local.nombre}</Text>
              <Text style={styles.localDetail}>{local.provincia} • {local.tipo}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Modal visible={showAssignModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Asignar Plan</Text>
            <Text style={styles.localName}>{selectedLocal?.nombre}</Text>
            <ScrollView style={{ maxHeight: 300, marginVertical: 16 }}>
              {planes.filter(p => p.activo).map((plan) => (
                <TouchableOpacity
                  key={plan.id}
                  style={[
                    styles.planCard,
                    selectedPlan?.id === plan.id && { borderColor: colors.primary, borderWidth: 2 }
                  ]}
                  onPress={() => setSelectedPlan(plan)}
                >
                  <Text style={styles.planName}>{plan.nombre}</Text>
                  <Text style={styles.planPrice}>€{plan.precio_mensual}/mes</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.border }]}
                onPress={() => {
                  setShowAssignModal(false);
                  setSelectedLocal(null);
                  setSelectedPlan(null);
                }}
              >
                <Text style={[styles.modalButtonText, { color: colors.text }]}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.primary }]}
                onPress={asignarPlan}
                disabled={!selectedPlan}
              >
                <Text style={[styles.modalButtonText, { color: '#fff' }]}>Asignar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={[colors.primary, colors.primaryDark]} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginBottom: 12 }}>
          <IconSymbol name="chevron.left" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Gestionar Planes</Text>
        <Text style={styles.headerSubtitle}>Administra planes y suscripciones</Text>
      </LinearGradient>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'planes' && styles.activeTab]}
          onPress={() => setActiveTab('planes')}
        >
          <Text style={[styles.tabText, activeTab === 'planes' && styles.activeTabText]}>Planes</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'subscriptions' && styles.activeTab]}
          onPress={() => setActiveTab('subscriptions')}
        >
          <Text style={[styles.tabText, activeTab === 'subscriptions' && styles.activeTabText]}>Suscripciones</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'assign' && styles.activeTab]}
          onPress={() => setActiveTab('assign')}
        >
          <Text style={[styles.tabText, activeTab === 'assign' && styles.activeTabText]}>Asignar</Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'planes' && renderPlanesTab()}
      {activeTab === 'subscriptions' && renderSubscriptionsTab()}
      {activeTab === 'assign' && renderAssignTab()}
    </View>
  );
}
