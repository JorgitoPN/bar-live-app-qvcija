
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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { colors, commonStyles } from '@/styles/commonStyles';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'expo-router';
import { supabase } from '@/utils/supabase';

interface LocalConSuscripcion {
  id: string;
  nombre: string;
  provincia: string;
  imagen_url?: string;
  suscripcion?: {
    id: string;
    plan_nombre: string;
    estado: string;
    eventos_usados_mes: number;
    eventos_disponibles: number;
    fecha_proximo_pago?: string;
  };
}

export default function GestionScreen() {
  const { user } = useAuth();
  const router = useRouter();
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
        .select('id, nombre, provincia, imagen_url')
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

      // Get subscriptions for each local
      const localesConSuscripcion: LocalConSuscripcion[] = await Promise.all(
        localesData.map(async (local) => {
          const { data: suscripcion } = await supabase
            .from('suscripciones_locales')
            .select(`
              id,
              estado,
              eventos_usados_mes,
              fecha_proximo_pago,
              planes_suscripcion (
                nombre,
                eventos_mes
              )
            `)
            .eq('local_id', local.id)
            .eq('estado', 'activa')
            .single();

          return {
            ...local,
            suscripcion: suscripcion
              ? {
                  id: suscripcion.id,
                  plan_nombre: (suscripcion.planes_suscripcion as any)?.nombre || 'basico',
                  estado: suscripcion.estado,
                  eventos_usados_mes: suscripcion.eventos_usados_mes,
                  eventos_disponibles: (suscripcion.planes_suscripcion as any)?.eventos_mes || 0,
                  fecha_proximo_pago: suscripcion.fecha_proximo_pago,
                }
              : undefined,
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

  const handleVerLocal = (localId: string) => {
    router.push(`/detalle/local?id=${localId}`);
  };

  const getPlanColor = (planNombre: string) => {
    switch (planNombre) {
      case 'premium':
        return '#EF4444';
      case 'estandar':
        return '#3B82F6';
      default:
        return '#10B981';
    }
  };

  const getPlanIcon = (planNombre: string) => {
    switch (planNombre) {
      case 'premium':
        return 'star.fill';
      case 'estandar':
        return 'bolt.fill';
      default:
        return 'checkmark.circle.fill';
    }
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
            Gestiona tus locales y sus planes de suscripción
          </Text>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
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
              style={styles.emptyStateButton}
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
              <TouchableOpacity
                key={local.id}
                style={[commonStyles.card, commonStyles.cardShadow, styles.localCard]}
                onPress={() => handleVerLocal(local.id)}
              >
                <View style={styles.localHeader}>
                  <View style={styles.localInfo}>
                    <Text style={styles.localNombre}>{local.nombre}</Text>
                    <Text style={styles.localProvincia}>{local.provincia}</Text>
                  </View>
                  {local.suscripcion ? (
                    <View
                      style={[
                        styles.planBadge,
                        { backgroundColor: getPlanColor(local.suscripcion.plan_nombre) },
                      ]}
                    >
                      <IconSymbol
                        name={getPlanIcon(local.suscripcion.plan_nombre) as any}
                        size={14}
                        color="#FFFFFF"
                      />
                      <Text style={styles.planBadgeText}>
                        {local.suscripcion.plan_nombre.toUpperCase()}
                      </Text>
                    </View>
                  ) : (
                    <View style={[styles.planBadge, { backgroundColor: '#6B7280' }]}>
                      <IconSymbol name="exclamationmark.triangle" size={14} color="#FFFFFF" />
                      <Text style={styles.planBadgeText}>SIN PLAN</Text>
                    </View>
                  )}
                </View>

                {local.suscripcion ? (
                  <View style={styles.suscripcionInfo}>
                    <View style={styles.suscripcionStat}>
                      <Text style={styles.suscripcionStatLabel}>Eventos este mes</Text>
                      <Text style={styles.suscripcionStatValue}>
                        {local.suscripcion.eventos_usados_mes} /{' '}
                        {local.suscripcion.eventos_disponibles === 0
                          ? '∞'
                          : local.suscripcion.eventos_disponibles}
                      </Text>
                    </View>
                    {local.suscripcion.plan_nombre !== 'basico' && (
                      <View style={styles.suscripcionStat}>
                        <Text style={styles.suscripcionStatLabel}>Próximo pago</Text>
                        <Text style={styles.suscripcionStatValue}>
                          {local.suscripcion.fecha_proximo_pago
                            ? new Date(local.suscripcion.fecha_proximo_pago).toLocaleDateString(
                                'es-ES'
                              )
                            : 'N/A'}
                        </Text>
                      </View>
                    )}
                  </View>
                ) : (
                  <View style={styles.noPlanContainer}>
                    <Text style={styles.noPlanText}>
                      Activa un plan para crear eventos y promociones
                    </Text>
                    <TouchableOpacity
                      style={styles.activarPlanButton}
                      onPress={() =>
                        router.push(`/gestion/planes-suscripcion?localId=${local.id}`)
                      }
                    >
                      <Text style={styles.activarPlanButtonText}>Activar Plan</Text>
                    </TouchableOpacity>
                  </View>
                )}

                <View style={styles.localActions}>
                  <TouchableOpacity
                    style={styles.localActionButton}
                    onPress={() => router.push(`/crear/evento?localId=${local.id}`)}
                  >
                    <IconSymbol name="calendar.badge.plus" size={18} color={colors.primary} />
                    <Text style={styles.localActionText}>Crear Evento</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.localActionButton}
                    onPress={() =>
                      router.push(`/gestion/planes-suscripcion?localId=${local.id}`)
                    }
                  >
                    <IconSymbol name="arrow.up.circle" size={18} color={colors.primary} />
                    <Text style={styles.localActionText}>Mejorar Plan</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
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
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 20,
  },
  quickActionButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  quickActionGradient: {
    padding: 16,
    alignItems: 'center',
    gap: 8,
  },
  quickActionText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    marginTop: 60,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginTop: 16,
    textAlign: 'center',
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
  emptyStateButton: {
    marginTop: 24,
    borderRadius: 12,
    overflow: 'hidden',
  },
  emptyStateButtonGradient: {
    paddingVertical: 14,
    paddingHorizontal: 32,
  },
  emptyStateButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  localesList: {
    padding: 20,
    gap: 16,
  },
  localCard: {
    padding: 16,
  },
  localHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  localInfo: {
    flex: 1,
  },
  localNombre: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  localProvincia: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  planBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  planBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  suscripcionInfo: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: colors.background,
    borderRadius: 8,
  },
  suscripcionStat: {
    flex: 1,
  },
  suscripcionStatLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  suscripcionStatValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
  },
  noPlanContainer: {
    padding: 16,
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    marginBottom: 16,
  },
  noPlanText: {
    fontSize: 14,
    color: '#92400E',
    marginBottom: 12,
    textAlign: 'center',
  },
  activarPlanButton: {
    backgroundColor: '#F59E0B',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  activarPlanButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  localActions: {
    flexDirection: 'row',
    gap: 16,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
    paddingTop: 16,
  },
  localActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
  },
  localActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
});
