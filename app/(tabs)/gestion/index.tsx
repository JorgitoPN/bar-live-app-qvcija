
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
import { scaleFontSize, scaleIconSize } from '@/utils/androidScaling';
import ShoppingCart from '@/components/payment/ShoppingCart';
import { isAdminUser } from '@/utils/adminAccess';

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

/**
 * ✅ GESTION SCREEN v245.0 - TITLE REMOVED FROM HEADER
 * 
 * NEW CHANGES v245.0:
 * - ✅ REMOVED: Page title "Gestión de Locales" from header
 * - ✅ CLEAN: More compact header with just shopping cart
 * - ✅ CONSISTENT: Matches user request to remove all page titles
 * 
 * Previous features v244.0:
 * - ✅ Shopping cart icon in header (owner mode)
 * - ✅ Cart navigates to full-screen page (not modal)
 * - ✅ Admin can access "Ver Planes" without owning a local
 * - ✅ Verification mode banner for admins on plans page
 */

export default function GestionScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const { selectedLocalId, setSelectedLocalId, refreshLocales } = useSelectedLocal();
  const [locales, setLocales] = useState<LocalConSuscripcion[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const isAdmin = isAdminUser(user);

  const cargarLocales = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      console.log('[GestionScreen v245.0] Loading locales for user:', user.id);
      
      // Get user's locals
      const { data: localesData, error: localesError } = await supabase
        .from('locales')
        .select('id, nombre, provincia, imagen_url, destacado')
        .eq('propietario_id', user.id)
        .eq('activo', true);

      if (localesError) {
        console.error('[GestionScreen v245.0] Error loading locales:', localesError);
        setLoading(false);
        return;
      }

      if (!localesData || localesData.length === 0) {
        console.log('[GestionScreen v245.0] No locales found for user');
        setLocales([]);
        setLoading(false);
        return;
      }

      console.log('[GestionScreen v245.0] Found', localesData.length, 'locales');

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
      console.log('[GestionScreen v245.0] Locales loaded successfully');
    } catch (error) {
      console.error('[GestionScreen v245.0] Error:', error);
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

  const handleVerPlanes = () => {
    console.log('[GestionScreen v245.0] Ver Planes clicked - Admin:', isAdmin, 'Locales:', locales.length);
    
    // ✅ NEW v244.0: Admins can access plans even without locals
    if (isAdmin) {
      console.log('[GestionScreen v245.0] Admin accessing plans in verification mode');
      router.push('/gestion/planes-suscripcion?adminMode=true');
      return;
    }

    // Regular owners need at least one local
    if (locales.length === 0) {
      Alert.alert(
        'Sin Locales',
        'Primero debes añadir un local para ver los planes disponibles.',
        [{ text: 'OK' }]
      );
      return;
    }

    router.push(`/gestion/planes-suscripcion?localId=${locales[0].id}`);
  };

  if (loading) {
    return (
      <View style={commonStyles.container}>
        {/* ✅ NEW v245.0: Header WITHOUT title - just shopping cart */}
        <LinearGradient
          colors={[colors.headerGradientStart, colors.headerGradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.headerWithoutTitle}
        >
          <View style={styles.headerActions}>
            <ShoppingCart />
          </View>
        </LinearGradient>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={commonStyles.container}>
      {/* ✅ NEW v245.0: Header WITHOUT title - just shopping cart */}
      <LinearGradient
        colors={[colors.headerGradientStart, colors.headerGradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.headerWithoutTitle}
      >
        <View style={styles.headerActions}>
          <ShoppingCart />
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Header Section */}
        <View style={styles.headerSection}>
          <Text style={[styles.sectionTitle, { fontSize: scaleFontSize(24) }]}>Mis Locales</Text>
          <Text style={[styles.sectionSubtitle, { fontSize: scaleFontSize(14) }]}>
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
              <IconSymbol ios_icon_name="calendar" android_material_icon_name="event" size={scaleIconSize(24)} color="#FFFFFF" />
              <Text style={[styles.quickActionText, { fontSize: scaleFontSize(12) }]}>Mis Eventos</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionButton}
            onPress={handleVerPlanes}
          >
            <LinearGradient
              colors={['#8B5CF6', '#7C3AED']}
              style={styles.quickActionGradient}
            >
              <IconSymbol ios_icon_name="crown.fill" android_material_icon_name="workspace_premium" size={scaleIconSize(24)} color="#FFFFFF" />
              <Text style={[styles.quickActionText, { fontSize: scaleFontSize(12) }]}>Ver Planes</Text>
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
              <IconSymbol ios_icon_name="plus.circle.fill" android_material_icon_name="add_circle" size={scaleIconSize(24)} color="#FFFFFF" />
              <Text style={[styles.quickActionText, { fontSize: scaleFontSize(12) }]}>Añadir Local</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Locales List */}
        {locales.length === 0 ? (
          <View style={styles.emptyState}>
            <IconSymbol ios_icon_name="building.2" android_material_icon_name="store" size={scaleIconSize(64)} color={colors.textSecondary} />
            <Text style={[styles.emptyStateText, { fontSize: scaleFontSize(18) }]}>No tienes locales registrados</Text>
            <Text style={[styles.emptyStateSubtext, { fontSize: scaleFontSize(14) }]}>
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
                <Text style={[styles.emptyStateButtonText, { fontSize: scaleFontSize(16) }]}>Añadir Local</Text>
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
  // ✅ NEW v245.0: Compact header without title
  headerWithoutTitle: {
    paddingTop: Platform.OS === 'ios' ? 60 : 50,
    paddingBottom: 16,
    paddingHorizontal: 20,
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 16,
  },
  headerSection: {
    padding: 20,
    paddingBottom: 12,
    alignItems: 'center',
  },
  sectionTitle: {
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
    textAlign: 'center',
  },
  sectionSubtitle: {
    color: colors.textSecondary,
    textAlign: 'center',
  },
  quickActionsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 20,
    flexWrap: 'wrap',
  },
  quickActionButton: {
    flex: 1,
    minWidth: 100,
    maxWidth: 120,
    borderRadius: 12,
    overflow: 'hidden',
  },
  quickActionGradient: {
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 100,
  },
  quickActionText: {
    color: '#FFFFFF',
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
    fontWeight: '600',
    color: colors.text,
    marginTop: 16,
    textAlign: 'center',
  },
  emptyStateSubtext: {
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
    paddingVertical: 14,
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  localesList: {
    padding: 20,
  },
});
