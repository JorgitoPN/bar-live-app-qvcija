
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { colors, commonStyles } from '@/styles/commonStyles';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'expo-router';
import { supabase } from '@/utils/supabase';
import { useSelectedLocal } from '@/contexts/SelectedLocalContext';
import LocalSubscriptionCard from '@/components/gestion/LocalSubscriptionCard';

interface LocalConSuscripcion {
  id: string;
  nombre: string;
  provincia: string;
  imagen_url?: string;
  destacado: boolean;
  suscripcion?: {
    id: string;
    plan_id: string;
    plan_nombre: string;
    plan_precio: number;
    estado: string;
    eventos_usados_mes: number;
    eventos_disponibles: number;
    creditos_destacados_restantes: number;
    creditos_eventos_restantes: number;
    fecha_renovacion_creditos?: string;
    fecha_proximo_pago?: string;
    destacado_activo: boolean;
    destacado_fecha_fin?: string;
    plan_pendiente_id?: string;
    plan_pendiente_nombre?: string;
    fecha_cambio_plan?: string;
    cancelar_al_final_periodo: boolean;
  };
  evento_activo?: {
    id: string;
    titulo: string;
    fecha: string;
    hora: string;
  };
}

export default function GestionScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const { selectedLocalId, setSelectedLocalId, refreshLocales } = useSelectedLocal();
  const [locales, setLocales] = useState<LocalConSuscripcion[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const cargarLocales = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      console.log('[GestionScreen] Loading locales for user:', user.id);
      
      // Get user's locals
      const { data: localesData, error: localesError } = await supabase
        .from('locales')
        .select('id, nombre, provincia, imagen_url, destacado')
        .eq('propietario_id', user.id)
        .eq('activo', true);

      if (localesError) {
        console.error('[GestionScreen] Error loading locales:', localesError);
        setLoading(false);
        return;
      }

      if (!localesData || localesData.length === 0) {
        console.log('[GestionScreen] No locales found for user');
        setLocales([]);
        setLoading(false);
        return;
      }

      console.log('[GestionScreen] Found', localesData.length, 'locales');

      // Get subscriptions and active events for each local
      const localesConSuscripcion: LocalConSuscripcion[] = await Promise.all(
        localesData.map(async (local) => {
          // Get subscription
          const { data: suscripcion } = await supabase
            .from('suscripciones_locales')
            .select(`
              id,
              plan_id,
              estado,
              eventos_usados_mes,
              fecha_proximo_pago,
              creditos_destacados_restantes,
              creditos_eventos_restantes,
              fecha_renovacion_creditos,
              destacado_activo,
              destacado_fecha_fin,
              plan_pendiente_id,
              fecha_cambio_plan,
              cancelar_al_final_periodo
            `)
            .eq('local_id', local.id)
            .eq('estado', 'activa')
            .single();

          let suscripcionData = undefined;

          if (suscripcion) {
            // Get plan details
            const { data: planData } = await supabase
              .from('planes_suscripcion')
              .select('nombre, precio_mensual, eventos_mes')
              .eq('id', suscripcion.plan_id)
              .single();

            // Get pending plan details if exists
            let planPendienteNombre = undefined;
            if (suscripcion.plan_pendiente_id) {
              const { data: planPendienteData } = await supabase
                .from('planes_suscripcion')
                .select('nombre')
                .eq('id', suscripcion.plan_pendiente_id)
                .single();
              
              planPendienteNombre = planPendienteData?.nombre;
            }

            suscripcionData = {
              id: suscripcion.id,
              plan_id: suscripcion.plan_id,
              plan_nombre: planData?.nombre || 'basico',
              plan_precio: planData?.precio_mensual || 0,
              estado: suscripcion.estado,
              eventos_usados_mes: suscripcion.eventos_usados_mes,
              eventos_disponibles: planData?.eventos_mes || 0,
              creditos_destacados_restantes: suscripcion.creditos_destacados_restantes || 0,
              creditos_eventos_restantes: suscripcion.creditos_eventos_restantes || 0,
              fecha_renovacion_creditos: suscripcion.fecha_renovacion_creditos,
              fecha_proximo_pago: suscripcion.fecha_proximo_pago,
              destacado_activo: suscripcion.destacado_activo || false,
              destacado_fecha_fin: suscripcion.destacado_fecha_fin,
              plan_pendiente_id: suscripcion.plan_pendiente_id,
              plan_pendiente_nombre: planPendienteNombre,
              fecha_cambio_plan: suscripcion.fecha_cambio_plan,
              cancelar_al_final_periodo: suscripcion.cancelar_al_final_periodo || false,
            };
          }

          // Get active event (next upcoming event)
          const { data: eventoActivo } = await supabase
            .from('eventos')
            .select('id, titulo, fecha, hora')
            .eq('local_id', local.id)
            .eq('activo', true)
            .gte('fecha', new Date().toISOString().split('T')[0])
            .order('fecha', { ascending: true })
            .order('hora', { ascending: true })
            .limit(1)
            .single();

          return {
            ...local,
            suscripcion: suscripcionData,
            evento_activo: eventoActivo || undefined,
          };
        })
      );

      setLocales(localesConSuscripcion);
      console.log('[GestionScreen] Locales loaded successfully');
    } catch (error) {
      console.error('[GestionScreen] Error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      cargarLocales();
    } else {
      setLoading(false);
    }
  }, [user, cargarLocales]);

  const onRefresh = () => {
    setRefreshing(true);
    cargarLocales();
  };

  const handleSelectLocal = async (localId: string) => {
    await setSelectedLocalId(localId);
    await refreshLocales();
    Alert.alert('Local Seleccionado', 'Ahora estás interactuando con este local');
  };

  if (loading) {
    return (
      <View style={commonStyles.container}>
        <LinearGradient
          colors={[colors.headerGradientStart, colors.headerGradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={commonStyles.headerGradient}
        >
          <Text style={commonStyles.headerTitle}>Gestión</Text>
        </LinearGradient>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={commonStyles.container}>
      <LinearGradient
        colors={[colors.headerGradientStart, colors.headerGradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={commonStyles.headerGradient}
      >
        <Text style={commonStyles.headerTitle}>Gestión de Locales</Text>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Header Section */}
        <View style={styles.headerSection}>
          <Text style={styles.sectionTitle}>Mis Locales</Text>
          <Text style={styles.sectionSubtitle}>
            Gestiona tus locales, planes y promociones
          </Text>
        </View>

        {/* Quick Actions - Now properly centered */}
        <View style={styles.quickActionsContainer}>
          <TouchableOpacity
            style={styles.quickActionButton}
            onPress={() => router.push('/gestion/mis-eventos')}
          >
            <LinearGradient
              colors={['#F59E0B', '#D97706']}
              style={styles.quickActionGradient}
            >
              <IconSymbol name="calendar" size={24} color="#FFFFFF" />
              <Text style={styles.quickActionText}>Mis Eventos</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionButton}
            onPress={() => {
              if (locales.length === 0) {
                Alert.alert(
                  'Sin Locales',
                  'Primero debes añadir un local para ver los planes disponibles.',
                  [{ text: 'OK' }]
                );
                return;
              }
              router.push(`/gestion/planes-suscripcion?localId=${locales[0].id}`);
            }}
          >
            <LinearGradient
              colors={['#8B5CF6', '#7C3AED']}
              style={styles.quickActionGradient}
            >
              <IconSymbol name="crown.fill" size={24} color="#FFFFFF" />
              <Text style={styles.quickActionText}>Ver Planes</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionButton}
            onPress={() => router.push('/crear/local')}
          >
            <LinearGradient
              colors={[colors.headerGradientStart, colors.headerGradientEnd]}
              style={styles.quickActionGradient}
            >
              <IconSymbol name="plus.circle.fill" size={24} color="#FFFFFF" />
              <Text style={styles.quickActionText}>Añadir Local</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Locales List */}
        {locales.length === 0 ? (
          <View style={styles.emptyState}>
            <IconSymbol name="building.2" size={64} color={colors.textSecondary} />
            <Text style={styles.emptyStateText}>No tienes locales registrados</Text>
            <Text style={styles.emptyStateSubtext}>
              Añade tu primer local para empezar a gestionar tu negocio
            </Text>
            <TouchableOpacity
              style={styles.emptyStateButtonContainer}
              onPress={() => router.push('/crear/local')}
            >
              <LinearGradient
                colors={[colors.headerGradientStart, colors.headerGradientEnd]}
                style={styles.emptyStateButtonGradient}
              >
                <Text style={styles.emptyStateButtonText}>Añadir Local</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.localesList}>
            {locales.map((local) => (
              <LocalSubscriptionCard
                key={local.id}
                local={local}
                onRefresh={cargarLocales}
                isSelected={selectedLocalId === local.id}
                onSelect={() => handleSelectLocal(local.id)}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerSection: {
    padding: 20,
    paddingBottom: 12,
    alignItems: 'center',
  },
  // ✅ ANDROID FIX v67.0: Text sizes reduced on Android (50% smaller)
  sectionTitle: {
    fontSize: Platform.OS === 'ios' ? 24 : 12,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
    textAlign: 'center',
  },
  sectionSubtitle: {
    fontSize: Platform.OS === 'ios' ? 14 : 7,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  quickActionsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    gap: Platform.OS === 'ios' ? 12 : 8,
    marginBottom: 20,
    flexWrap: 'wrap',
  },
  quickActionButton: {
    flex: 1,
    minWidth: Platform.OS === 'ios' ? 100 : 80,
    maxWidth: Platform.OS === 'ios' ? 120 : 100,
    borderRadius: 12,
    overflow: 'hidden',
  },
  quickActionGradient: {
    padding: Platform.OS === 'ios' ? 16 : 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Platform.OS === 'ios' ? 8 : 6,
    minHeight: Platform.OS === 'ios' ? 100 : 80,
  },
  quickActionText: {
    color: '#FFFFFF',
    fontSize: Platform.OS === 'ios' ? 12 : 6,
    fontWeight: '600',
    textAlign: 'center',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    marginTop: 60,
  },
  emptyStateText: {
    fontSize: Platform.OS === 'ios' ? 18 : 9,
    fontWeight: '600',
    color: colors.text,
    marginTop: 16,
    textAlign: 'center',
  },
  emptyStateSubtext: {
    fontSize: Platform.OS === 'ios' ? 14 : 7,
    color: colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
  emptyStateButtonContainer: {
    marginTop: 24,
    borderRadius: 12,
    overflow: 'hidden',
    alignSelf: 'center',
  },
  emptyStateButtonGradient: {
    paddingVertical: Platform.OS === 'ios' ? 14 : 9,
    paddingHorizontal: Platform.OS === 'ios' ? 32 : 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateButtonText: {
    color: '#FFFFFF',
    fontSize: Platform.OS === 'ios' ? 16 : 8,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  localesList: {
    padding: 20,
  },
});
