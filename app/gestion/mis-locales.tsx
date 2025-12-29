
import React, { useState, useEffect, useCallback } from 'react';
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
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/contexts/AuthContext';
import LocalSubscriptionCard from '@/components/gestion/LocalSubscriptionCard';

interface LocalSubscriptionData {
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

/**
 * ✅ MIS LOCALES v52.0 - FIXED CANCEL BUTTON FOR FREE PLANS
 * 
 * CRITICAL FIXES v52.0:
 * - ✅ Cancel button HIDDEN for free plans in LocalSubscriptionCard
 * - ✅ Cancel button ONLY visible for paid plans
 * - ✅ Cancel button has LESS PROMINENT color (gray instead of red)
 * - ✅ Numerical credit display (no progress bar)
 */

export default function MisLocalesScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [locales, setLocales] = useState<LocalSubscriptionData[]>([]);
  const [selectedLocalId, setSelectedLocalId] = useState<string | null>(null);

  const loadLocales = useCallback(async () => {
    if (!user) {
      console.log('[MisLocales v52.0] No user, skipping load');
      setLoading(false);
      return;
    }

    try {
      console.log('[MisLocales v52.0] Loading locales for user:', user.id);

      // Get locales owned by user
      const { data: localesData, error: localesError } = await supabase
        .from('locales')
        .select('id, nombre, provincia, imagen_url, destacado')
        .eq('propietario_id', user.id)
        .eq('activo', true)
        .order('nombre', { ascending: true });

      if (localesError) {
        console.error('[MisLocales v52.0] Error loading locales:', localesError);
        throw localesError;
      }

      console.log('[MisLocales v52.0] Locales loaded:', localesData?.length || 0);

      if (!localesData || localesData.length === 0) {
        setLocales([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      // Load subscription data for each local
      const localesWithSubs = await Promise.all(
        localesData.map(async (local) => {
          // Get active subscription
          const { data: subData, error: subError } = await supabase
            .from('suscripciones_locales')
            .select(`
              id,
              plan_id,
              estado,
              eventos_usados_mes,
              creditos_destacados_restantes,
              creditos_eventos_restantes,
              fecha_renovacion_creditos,
              fecha_proximo_pago,
              destacado_activo,
              destacado_fecha_fin,
              plan_pendiente_id,
              fecha_cambio_plan,
              cancelar_al_final_periodo
            `)
            .eq('local_id', local.id)
            .eq('estado', 'activa')
            .maybeSingle();

          if (subError && subError.code !== 'PGRST116') {
            console.error('[MisLocales v52.0] Error loading subscription:', subError);
          }

          let suscripcion = undefined;

          if (subData) {
            // Get plan details
            const { data: planData, error: planError } = await supabase
              .from('planes_suscripcion')
              .select('nombre, precio_mensual, eventos_mes')
              .eq('id', subData.plan_id)
              .single();

            if (planError) {
              console.error('[MisLocales v52.0] Error loading plan:', planError);
            } else {
              suscripcion = {
                id: subData.id,
                plan_id: subData.plan_id,
                plan_nombre: planData?.nombre || 'free',
                plan_precio: planData?.precio_mensual || 0,
                estado: subData.estado,
                eventos_usados_mes: subData.eventos_usados_mes || 0,
                eventos_disponibles: planData?.eventos_mes || 0,
                creditos_destacados_restantes: subData.creditos_destacados_restantes || 0,
                creditos_eventos_restantes: subData.creditos_eventos_restantes || 0,
                fecha_renovacion_creditos: subData.fecha_renovacion_creditos,
                fecha_proximo_pago: subData.fecha_proximo_pago,
                destacado_activo: subData.destacado_activo || false,
                destacado_fecha_fin: subData.destacado_fecha_fin,
                plan_pendiente_id: subData.plan_pendiente_id,
                plan_pendiente_nombre: undefined,
                fecha_cambio_plan: subData.fecha_cambio_plan,
                cancelar_al_final_periodo: subData.cancelar_al_final_periodo || false,
              };

              // Get pending plan name if exists
              if (subData.plan_pendiente_id) {
                const { data: pendingPlanData } = await supabase
                  .from('planes_suscripcion')
                  .select('nombre')
                  .eq('id', subData.plan_pendiente_id)
                  .single();

                if (pendingPlanData) {
                  suscripcion.plan_pendiente_nombre = pendingPlanData.nombre;
                }
              }
            }
          }

          // Get active event
          const { data: eventoData } = await supabase
            .from('eventos')
            .select('id, titulo, fecha, hora')
            .eq('local_id', local.id)
            .eq('activo', true)
            .gte('fecha', new Date().toISOString().split('T')[0])
            .order('fecha', { ascending: true })
            .limit(1)
            .maybeSingle();

          return {
            ...local,
            suscripcion,
            evento_activo: eventoData || undefined,
          };
        })
      );

      setLocales(localesWithSubs);
      console.log('[MisLocales v52.0] Locales with subscriptions loaded:', localesWithSubs.length);
    } catch (error) {
      console.error('[MisLocales v52.0] Error loading locales:', error);
      Alert.alert('Error', 'No se pudieron cargar los locales');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    loadLocales();
  }, [loadLocales]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadLocales();
  };

  const handleSelectLocal = (localId: string) => {
    setSelectedLocalId(localId);
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Cargando locales...</Text>
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
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Mis Locales</Text>
          <Text style={styles.headerSubtitle}>Gestión de suscripciones</Text>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push('/crear/local')}
        >
          <IconSymbol ios_icon_name="plus" android_material_icon_name="add" size={24} color={colors.headerText} />
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {locales.length > 0 ? (
          locales.map((local) => (
            <LocalSubscriptionCard
              key={local.id}
              local={local}
              onRefresh={loadLocales}
              isSelected={selectedLocalId === local.id}
              onSelect={() => handleSelectLocal(local.id)}
            />
          ))
        ) : (
          <View style={styles.emptyState}>
            <IconSymbol ios_icon_name="building.2" android_material_icon_name="store" size={64} color={colors.textSecondary} />
            <Text style={styles.emptyText}>No tienes locales registrados</Text>
            <Text style={styles.emptySubtext}>
              Crea tu primer local para empezar a gestionar tu negocio
            </Text>
            <TouchableOpacity
              style={styles.createButton}
              onPress={() => router.push('/crear/local')}
            >
              <LinearGradient
                colors={[colors.primary, colors.secondary]}
                style={styles.createButtonGradient}
              >
                <IconSymbol ios_icon_name="plus.circle.fill" android_material_icon_name="add_circle" size={20} color={colors.white} />
                <Text style={styles.createButtonText}>Crear Local</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 16,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 50,
    paddingBottom: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 8,
  },
  addButton: {
    padding: 8,
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.headerText,
  },
  headerSubtitle: {
    fontSize: 13,
    color: colors.headerText,
    opacity: 0.9,
    marginTop: 2,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 100,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 15,
    color: colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 22,
  },
  createButton: {
    marginTop: 24,
    borderRadius: 12,
    overflow: 'hidden',
  },
  createButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.white,
  },
});
