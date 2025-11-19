
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  Platform,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { useAuth } from '@/contexts/AuthContext';
import { useSelectedLocal } from '@/contexts/SelectedLocalContext';
import { supabase } from '@/utils/supabase';

const { width } = Dimensions.get('window');
const CONTENT_MAX_WIDTH = 600;

interface LocalWithPlan {
  id: string;
  nombre: string;
  tipo: string;
  imagen_url: string | null;
  seguidores: number;
  destacado: boolean;
  plan_nombre: string;
  destacados_restantes: number;
  destacado_activo?: boolean;
  destacado_fecha_fin?: string;
  creditos_eventos_restantes?: number;
  eventos_disponibles?: number;
  fecha_renovacion?: string;
}

export default function MisLocalesScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { selectedLocalId, setSelectedLocalId, refreshLocales } = useSelectedLocal();
  const [locales, setLocales] = useState<LocalWithPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingDestacado, setUpdatingDestacado] = useState<string | null>(null);

  const loadLocales = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);

      const { data: localesData, error: localesError } = await supabase
        .from('locales')
        .select('id, nombre, tipo, imagen_url, seguidores, destacado')
        .eq('propietario_id', user.id)
        .eq('activo', true)
        .order('nombre');

      if (localesError) {
        console.error('[MisLocales] Error loading locales:', localesError);
        return;
      }

      if (!localesData || localesData.length === 0) {
        setLocales([]);
        return;
      }

      const localesWithPlan = await Promise.all(
        localesData.map(async (local) => {
          const { data: suscripcion } = await supabase
            .from('suscripciones_locales')
            .select(`
              planes_suscripcion (
                nombre,
                promos_destacadas
              ),
              destacado_activo,
              destacado_fecha_fin,
              creditos_eventos_restantes,
              eventos_disponibles,
              fecha_proximo_pago
            `)
            .eq('local_id', local.id)
            .eq('estado', 'activa')
            .single();

          const planNombre = (suscripcion?.planes_suscripcion as any)?.nombre || 'basico';
          const promosDestacadas = (suscripcion?.planes_suscripcion as any)?.promos_destacadas || 0;

          return {
            ...local,
            plan_nombre: planNombre,
            destacados_restantes: promosDestacadas,
            destacado_activo: suscripcion?.destacado_activo || false,
            destacado_fecha_fin: suscripcion?.destacado_fecha_fin,
            creditos_eventos_restantes: suscripcion?.creditos_eventos_restantes || 0,
            eventos_disponibles: suscripcion?.eventos_disponibles || 0,
            fecha_renovacion: suscripcion?.fecha_proximo_pago,
          };
        })
      );

      setLocales(localesWithPlan);
    } catch (error) {
      console.error('[MisLocales] Error:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadLocales();
  }, [loadLocales]);

  const handleSelectLocal = async (localId: string) => {
    await setSelectedLocalId(localId);
    await refreshLocales();
  };

  const handleToggleDestacado = async (local: LocalWithPlan) => {
    if (updatingDestacado) return;

    if (!local.destacado && local.destacados_restantes <= 0) {
      Alert.alert(
        'Sin Destacados Disponibles',
        `El plan ${local.plan_nombre.toUpperCase()} no incluye destacados. Actualiza a un plan superior para destacar tu local.`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Ver Planes',
            onPress: () => router.push(`/gestion/planes-suscripcion?localId=${local.id}`),
          },
        ]
      );
      return;
    }

    try {
      setUpdatingDestacado(local.id);

      const newDestacadoValue = !local.destacado;

      const { error } = await supabase
        .from('locales')
        .update({ destacado: newDestacadoValue })
        .eq('id', local.id);

      if (error) {
        console.error('[MisLocales] Error updating destacado:', error);
        Alert.alert('Error', 'No se pudo actualizar el estado destacado del local.');
        return;
      }

      await loadLocales();
      await refreshLocales();

      Alert.alert(
        'Éxito',
        newDestacadoValue
          ? 'Local destacado activado correctamente.'
          : 'Local destacado desactivado correctamente.'
      );
    } catch (error) {
      console.error('[MisLocales] Error:', error);
      Alert.alert('Error', 'Ocurrió un error al actualizar el local.');
    } finally {
      setUpdatingDestacado(null);
    }
  };

  const calculateTimeRemaining = (endDate: string | null | undefined) => {
    if (!endDate) return null;
    
    try {
      const now = new Date();
      const end = new Date(endDate);
      const diff = end.getTime() - now.getTime();

      if (diff <= 0) return 'Finalizado';

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

      if (days > 0) return `${days}d ${hours}h`;
      return `${hours}h`;
    } catch (error) {
      console.error('[MisLocales] Error calculating time:', error);
      return null;
    }
  };

  const getPlanColor = (planNombre: string) => {
    switch (planNombre?.toLowerCase()) {
      case 'premium':
        return ['#EF4444', '#DC2626'];
      case 'estandar':
      case 'estándar':
        return ['#3B82F6', '#2563EB'];
      default:
        return ['#10B981', '#059669'];
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={[colors.headerGradientStart, colors.headerGradientEnd]}
          style={styles.header}
        >
          <View style={styles.headerRow}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <IconSymbol ios_icon_name="chevron.left" android_material_icon_name="arrow_back" size={24} color={colors.headerText} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Mis Locales</Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => router.push('/crear/local')}
            >
              <IconSymbol ios_icon_name="plus" android_material_icon_name="add" size={24} color={colors.headerText} />
            </TouchableOpacity>
          </View>
        </LinearGradient>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Cargando locales...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={[colors.headerGradientStart, colors.headerGradientEnd]}
        style={styles.header}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <IconSymbol ios_icon_name="chevron.left" android_material_icon_name="arrow_back" size={24} color={colors.headerText} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Mis Locales</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => router.push('/crear/local')}
          >
            <IconSymbol ios_icon_name="plus" android_material_icon_name="add" size={24} color={colors.headerText} />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        <View style={styles.centeredContainer}>
          {locales.length === 0 ? (
            <View style={styles.emptyContainer}>
              <IconSymbol ios_icon_name="building.2" android_material_icon_name="business" size={64} color={colors.textSecondary} />
              <Text style={styles.emptyTitle}>No tienes locales</Text>
              <Text style={styles.emptyText}>
                Crea tu primer local para gestionar eventos y promociones
              </Text>
              <TouchableOpacity
                style={styles.createButton}
                onPress={() => router.push('/crear/local')}
              >
                <LinearGradient
                  colors={[colors.headerGradientStart, colors.headerGradientEnd]}
                  style={styles.createGradient}
                >
                  <IconSymbol ios_icon_name="plus" android_material_icon_name="add" size={20} color={colors.headerText} />
                  <Text style={styles.createButtonText}>Crear Local</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          ) : (
            <React.Fragment>
              {/* REDESIGNED LOCAL CARDS */}
              <View style={styles.localesGrid}>
                {locales.map((local, index) => (
                  <View key={index} style={[
                    styles.localCard,
                    selectedLocalId === local.id && styles.localCardActive
                  ]}>
                    {/* HERO IMAGE SECTION */}
                    <View style={styles.imageSection}>
                      {local.imagen_url ? (
                        <Image source={{ uri: local.imagen_url }} style={styles.heroImage} />
                      ) : (
                        <View style={[styles.heroImage, styles.heroImagePlaceholder]}>
                          <IconSymbol ios_icon_name="building.2" android_material_icon_name="business" size={48} color={colors.textSecondary} />
                        </View>
                      )}
                      
                      {/* OVERLAY BADGES */}
                      <View style={styles.imageOverlay}>
                        {/* Plan Badge */}
                        <View style={styles.planBadgeWrapper}>
                          <LinearGradient
                            colors={getPlanColor(local.plan_nombre)}
                            style={styles.planBadgeGradient}
                          >
                            <Text style={styles.planBadgeText}>{local.plan_nombre.toUpperCase()}</Text>
                          </LinearGradient>
                        </View>
                        
                        {/* Active Indicator */}
                        {selectedLocalId === local.id && (
                          <View style={styles.activeIndicatorBadge}>
                            <IconSymbol ios_icon_name="checkmark.circle.fill" android_material_icon_name="check_circle" size={20} color="#FFFFFF" />
                            <Text style={styles.activeIndicatorText}>ACTIVO</Text>
                          </View>
                        )}
                      </View>

                      {/* Destacado Banner */}
                      {local.destacado_activo && local.destacado_fecha_fin && (
                        <View style={styles.destacadoBanner}>
                          <IconSymbol ios_icon_name="star.fill" android_material_icon_name="star" size={16} color="#FFFFFF" />
                          <Text style={styles.destacadoBannerText}>
                            Destacado • {calculateTimeRemaining(local.destacado_fecha_fin) || 'N/A'}
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* CONTENT SECTION */}
                    <View style={styles.contentSection}>
                      {/* Title & Type */}
                      <View style={styles.titleSection}>
                        <Text style={styles.localName} numberOfLines={1}>{local.nombre}</Text>
                        <Text style={styles.localType} numberOfLines={1}>{local.tipo}</Text>
                      </View>

                      {/* Stats Row */}
                      <View style={styles.statsRow}>
                        <View style={styles.statItem}>
                          <IconSymbol ios_icon_name="person.2.fill" android_material_icon_name="people" size={16} color={colors.primary} />
                          <Text style={styles.statValue}>{local.seguidores}</Text>
                          <Text style={styles.statLabel}>Seguidores</Text>
                        </View>
                        
                        <View style={styles.statDivider} />
                        
                        <View style={styles.statItem}>
                          <IconSymbol ios_icon_name="star.fill" android_material_icon_name="star" size={16} color={colors.badgeDestacado} />
                          <Text style={styles.statValue}>{local.destacados_restantes}</Text>
                          <Text style={styles.statLabel}>Destacados</Text>
                        </View>
                        
                        <View style={styles.statDivider} />
                        
                        <View style={styles.statItem}>
                          <IconSymbol ios_icon_name="calendar" android_material_icon_name="event" size={16} color="#8B5CF6" />
                          <Text style={styles.statValue}>{local.creditos_eventos_restantes || 0}</Text>
                          <Text style={styles.statLabel}>Eventos</Text>
                        </View>
                      </View>

                      {/* Destacado Toggle */}
                      <View style={styles.destacadoSection}>
                        <View style={styles.destacadoInfo}>
                          <Text style={styles.destacadoTitle}>Destacar Local</Text>
                          <Text style={styles.destacadoSubtitle}>
                            {local.destacado && local.destacado_activo
                              ? '✓ Activo ahora'
                              : local.destacados_restantes > 0
                              ? `${local.destacados_restantes} disponible${local.destacados_restantes > 1 ? 's' : ''}`
                              : 'Sin créditos disponibles'}
                          </Text>
                        </View>
                        <TouchableOpacity
                          style={[
                            styles.destacadoButton,
                            local.destacado && styles.destacadoButtonActive,
                          ]}
                          onPress={() => handleToggleDestacado(local)}
                          disabled={updatingDestacado === local.id}
                        >
                          {updatingDestacado === local.id ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                          ) : (
                            <React.Fragment>
                              <IconSymbol
                                ios_icon_name={local.destacado ? 'star.fill' : 'star'}
                                android_material_icon_name={local.destacado ? 'star' : 'star_border'}
                                size={16}
                                color="#FFFFFF"
                              />
                              <Text style={styles.destacadoButtonText}>
                                {local.destacado ? 'Activo' : 'Activar'}
                              </Text>
                            </React.Fragment>
                          )}
                        </TouchableOpacity>
                      </View>

                      {/* ALL 4 ACTION BUTTONS IN ONE ROW */}
                      <View style={styles.actionsRow}>
                        <TouchableOpacity
                          style={styles.actionButton}
                          onPress={() => router.push(`/perfil/local?localId=${local.id}`)}
                        >
                          <View style={styles.actionIconWrapper}>
                            <IconSymbol ios_icon_name="person.2" android_material_icon_name="people" size={20} color={colors.primary} />
                          </View>
                          <Text style={styles.actionButtonText}>Perfil</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity
                          style={styles.actionButton}
                          onPress={() => router.push(`/editar/local?id=${local.id}`)}
                        >
                          <View style={styles.actionIconWrapper}>
                            <IconSymbol ios_icon_name="pencil" android_material_icon_name="edit" size={20} color={colors.primary} />
                          </View>
                          <Text style={styles.actionButtonText}>Editar</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity
                          style={styles.actionButton}
                          onPress={() => router.push(`/crear/evento?localId=${local.id}`)}
                        >
                          <View style={styles.actionIconWrapper}>
                            <IconSymbol ios_icon_name="calendar.badge.plus" android_material_icon_name="event" size={20} color={colors.primary} />
                          </View>
                          <Text style={styles.actionButtonText}>Evento</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity
                          style={styles.actionButton}
                          onPress={() => router.push(`/gestion/panel-analisis?localId=${local.id}`)}
                        >
                          <View style={styles.actionIconWrapper}>
                            <IconSymbol ios_icon_name="chart.bar.fill" android_material_icon_name="bar_chart" size={20} color={colors.primary} />
                          </View>
                          <Text style={styles.actionButtonText}>Análisis</Text>
                        </TouchableOpacity>
                      </View>

                      {/* Activate Button (if not selected) */}
                      {selectedLocalId !== local.id && (
                        <TouchableOpacity
                          style={styles.activateButton}
                          onPress={() => handleSelectLocal(local.id)}
                        >
                          <LinearGradient
                            colors={[colors.primary, colors.secondary]}
                            style={styles.activateGradient}
                          >
                            <IconSymbol ios_icon_name="checkmark.circle.fill" android_material_icon_name="check_circle" size={20} color="#FFFFFF" />
                            <Text style={styles.activateButtonText}>Activar Local</Text>
                          </LinearGradient>
                        </TouchableOpacity>
                      )}

                      {/* Plan Management Footer */}
                      <View style={styles.planFooter}>
                        <TouchableOpacity
                          style={styles.planFooterButton}
                          onPress={() => router.push(`/gestion/planes-suscripcion?localId=${local.id}`)}
                        >
                          <IconSymbol ios_icon_name="arrow.up.circle" android_material_icon_name="upgrade" size={16} color={colors.primary} />
                          <Text style={styles.planFooterButtonText}>Cambiar Plan</Text>
                        </TouchableOpacity>
                        
                        <View style={styles.planFooterDivider} />
                        
                        <TouchableOpacity
                          style={styles.planFooterButton}
                          onPress={() => {
                            Alert.alert(
                              'Cancelar Plan',
                              '¿Estás seguro de que deseas cancelar tu plan?',
                              [
                                { text: 'No', style: 'cancel' },
                                { text: 'Sí, Cancelar', style: 'destructive', onPress: () => console.log('Plan cancelled') },
                              ]
                            );
                          }}
                        >
                          <IconSymbol ios_icon_name="xmark.circle" android_material_icon_name="cancel" size={16} color="#EF4444" />
                          <Text style={[styles.planFooterButtonText, { color: '#EF4444' }]}>Cancelar</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                ))}
              </View>

              {/* Add New Local Button */}
              <TouchableOpacity
                style={styles.addNewButton}
                onPress={() => router.push('/crear/local')}
              >
                <IconSymbol ios_icon_name="plus.circle.fill" android_material_icon_name="add_circle" size={28} color={colors.primary} />
                <Text style={styles.addNewText}>Añadir Nuevo Local</Text>
              </TouchableOpacity>
            </React.Fragment>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.headerText,
  },
  addButton: {
    padding: 8,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  centeredContainer: {
    maxWidth: CONTENT_MAX_WIDTH,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 15,
    color: colors.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    marginTop: 60,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  createButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  createGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 28,
  },
  createButtonText: {
    color: colors.headerText,
    fontSize: 16,
    fontWeight: '700',
  },
  localesGrid: {
    gap: 20,
  },
  
  // REDESIGNED CARD STYLES
  localCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.cardBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  localCardActive: {
    borderColor: colors.primary,
    borderWidth: 2,
    shadowColor: colors.primary,
    shadowOpacity: 0.2,
    elevation: 6,
  },

  // IMAGE SECTION
  imageSection: {
    position: 'relative',
    width: '100%',
    height: 180,
  },
  heroImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  heroImagePlaceholder: {
    backgroundColor: colors.cardBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageOverlay: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  planBadgeWrapper: {
    borderRadius: 8,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  planBadgeGradient: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  planBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  activeIndicatorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  activeIndicatorText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  destacadoBanner: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.badgeDestacado,
    paddingVertical: 8,
  },
  destacadoBannerText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // CONTENT SECTION
  contentSection: {
    padding: 16,
    gap: 16,
  },
  titleSection: {
    gap: 4,
  },
  localName: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  localType: {
    fontSize: 14,
    color: colors.textSecondary,
    textTransform: 'capitalize',
  },

  // STATS ROW
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 12,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.cardBorder,
  },

  // DESTACADO SECTION
  destacadoSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 12,
  },
  destacadoInfo: {
    flex: 1,
    gap: 4,
  },
  destacadoTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  destacadoSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  destacadoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: colors.primary,
    minWidth: 90,
    justifyContent: 'center',
  },
  destacadoButtonActive: {
    backgroundColor: colors.badgeDestacado,
  },
  destacadoButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // ALL 4 ACTION BUTTONS IN ONE ROW
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 8,
    backgroundColor: colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  actionIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },

  // ACTIVATE BUTTON
  activateButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  activateGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  activateButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // PLAN FOOTER
  planFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
    paddingTop: 12,
    marginTop: 4,
  },
  planFooterButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  planFooterDivider: {
    width: 1,
    height: 24,
    backgroundColor: colors.cardBorder,
  },
  planFooterButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },

  // ADD NEW BUTTON
  addNewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 18,
    marginTop: 8,
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.primary,
    borderStyle: 'dashed',
  },
  addNewText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
  },
});
