
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
              {/* Local Cards - COMPACT VERSION */}
              <View style={styles.localesGrid}>
                {locales.map((local, index) => (
                  <View key={index} style={[
                    styles.localCard,
                    selectedLocalId === local.id && styles.localCardActive
                  ]}>
                    {/* COMPACT HEADER: Image + Info + Plan Badge */}
                    <View style={styles.compactHeader}>
                      {/* Image */}
                      <View style={styles.imageContainer}>
                        {local.imagen_url ? (
                          <Image source={{ uri: local.imagen_url }} style={styles.localImage} />
                        ) : (
                          <View style={[styles.localImage, styles.localImagePlaceholder]}>
                            <IconSymbol ios_icon_name="building.2" android_material_icon_name="business" size={24} color={colors.textSecondary} />
                          </View>
                        )}
                      </View>
                      
                      {/* Info Column */}
                      <View style={styles.infoColumn}>
                        <View style={styles.titleRow}>
                          <Text style={styles.localNombre} numberOfLines={1}>{local.nombre}</Text>
                          {selectedLocalId === local.id && (
                            <View style={styles.activeIndicator}>
                              <IconSymbol ios_icon_name="checkmark.circle.fill" android_material_icon_name="check_circle" size={16} color={colors.primary} />
                            </View>
                          )}
                        </View>
                        <Text style={styles.localTipo} numberOfLines={1}>{local.tipo}</Text>
                        
                        {/* Inline Stats */}
                        <View style={styles.inlineStats}>
                          <View style={styles.miniStat}>
                            <IconSymbol ios_icon_name="person.2.fill" android_material_icon_name="people" size={12} color={colors.textSecondary} />
                            <Text style={styles.miniStatText}>{local.seguidores}</Text>
                          </View>
                          <View style={styles.statSeparator} />
                          <View style={styles.miniStat}>
                            <IconSymbol ios_icon_name="star.fill" android_material_icon_name="star" size={12} color={colors.badgeDestacado} />
                            <Text style={styles.miniStatText}>{local.destacados_restantes}</Text>
                          </View>
                          <View style={styles.statSeparator} />
                          <View style={styles.miniStat}>
                            <IconSymbol ios_icon_name="calendar" android_material_icon_name="event" size={12} color="#8B5CF6" />
                            <Text style={styles.miniStatText}>{local.creditos_eventos_restantes || 0}</Text>
                          </View>
                        </View>
                      </View>

                      {/* Plan Badge */}
                      <View style={styles.planBadgeContainer}>
                        <LinearGradient
                          colors={getPlanColor(local.plan_nombre)}
                          style={styles.planBadge}
                        >
                          <Text style={styles.planBadgeText}>{local.plan_nombre.toUpperCase()}</Text>
                        </LinearGradient>
                      </View>
                    </View>

                    {/* ACTIVE PROMO ALERT (if active) */}
                    {local.destacado_activo && local.destacado_fecha_fin && (
                      <View style={styles.promoAlert}>
                        <IconSymbol ios_icon_name="star.fill" android_material_icon_name="star" size={14} color={colors.badgeDestacado} />
                        <Text style={styles.promoAlertText}>
                          Destacado activo • {calculateTimeRemaining(local.destacado_fecha_fin) || 'N/A'} restantes
                        </Text>
                      </View>
                    )}

                    {/* COMPACT CREDITS SECTION */}
                    <View style={styles.creditsCompact}>
                      {/* Destacados */}
                      <View style={styles.creditItem}>
                        <View style={styles.creditLabelRow}>
                          <IconSymbol ios_icon_name="star.fill" android_material_icon_name="star" size={10} color={colors.badgeDestacado} />
                          <Text style={styles.creditLabel}>Destacados</Text>
                          <Text style={styles.creditValue}>{local.destacados_restantes}</Text>
                        </View>
                        <View style={styles.miniProgressBar}>
                          <View style={[
                            styles.miniProgressFill, 
                            { 
                              width: `${Math.min(100, (local.destacados_restantes / Math.max(1, local.destacados_restantes + (local.destacado_activo ? 1 : 0))) * 100)}%`, 
                              backgroundColor: colors.badgeDestacado 
                            }
                          ]} />
                        </View>
                      </View>

                      {/* Eventos */}
                      <View style={styles.creditItem}>
                        <View style={styles.creditLabelRow}>
                          <IconSymbol ios_icon_name="calendar" android_material_icon_name="event" size={10} color="#8B5CF6" />
                          <Text style={styles.creditLabel}>Eventos</Text>
                          <Text style={styles.creditValue}>{local.creditos_eventos_restantes || 0}</Text>
                        </View>
                        <View style={styles.miniProgressBar}>
                          <View style={[
                            styles.miniProgressFill, 
                            { 
                              width: `${Math.min(100, ((local.creditos_eventos_restantes || 0) / Math.max(1, local.eventos_disponibles || 1)) * 100)}%`, 
                              backgroundColor: '#8B5CF6' 
                            }
                          ]} />
                        </View>
                      </View>
                    </View>

                    {/* DESTACADO TOGGLE */}
                    <View style={styles.destacadoRow}>
                      <View style={styles.destacadoInfo}>
                        <Text style={styles.destacadoLabel}>Destacar Local</Text>
                        <Text style={styles.destacadoStatus}>
                          {local.destacado && local.destacado_activo
                            ? 'Activo'
                            : local.destacados_restantes > 0
                            ? `${local.destacados_restantes} disponible${local.destacados_restantes > 1 ? 's' : ''}`
                            : 'Sin créditos'}
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={[
                          styles.destacadoToggle,
                          local.destacado && styles.destacadoToggleActive,
                        ]}
                        onPress={() => handleToggleDestacado(local)}
                        disabled={updatingDestacado === local.id}
                      >
                        {updatingDestacado === local.id ? (
                          <ActivityIndicator size="small" color={colors.headerText} />
                        ) : (
                          <React.Fragment>
                            <IconSymbol
                              ios_icon_name={local.destacado ? 'star.fill' : 'star'}
                              android_material_icon_name={local.destacado ? 'star' : 'star_border'}
                              size={14}
                              color={local.destacado ? '#FFFFFF' : colors.primary}
                            />
                            <Text style={[
                              styles.destacadoToggleText,
                              local.destacado && styles.destacadoToggleTextActive
                            ]}>
                              {local.destacado ? 'Activo' : 'Activar'}
                            </Text>
                          </React.Fragment>
                        )}
                      </TouchableOpacity>
                    </View>

                    {/* COMPACT ACTIONS */}
                    <View style={styles.actionsCompact}>
                      {selectedLocalId !== local.id && (
                        <TouchableOpacity
                          style={styles.actionPrimary}
                          onPress={() => handleSelectLocal(local.id)}
                        >
                          <LinearGradient
                            colors={[colors.primary, colors.secondary]}
                            style={styles.actionPrimaryGradient}
                          >
                            <IconSymbol ios_icon_name="checkmark.circle.fill" android_material_icon_name="check_circle" size={16} color="#FFFFFF" />
                            <Text style={styles.actionPrimaryText}>Activar</Text>
                          </LinearGradient>
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity
                        style={styles.actionSecondary}
                        onPress={() => router.push(`/perfil/local?localId=${local.id}`)}
                      >
                        <IconSymbol ios_icon_name="person.2" android_material_icon_name="people" size={16} color={colors.primary} />
                        <Text style={styles.actionSecondaryText}>Perfil</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.actionSecondary}
                        onPress={() => router.push(`/editar/local?id=${local.id}`)}
                      >
                        <IconSymbol ios_icon_name="pencil" android_material_icon_name="edit" size={16} color={colors.primary} />
                        <Text style={styles.actionSecondaryText}>Editar</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.actionSecondary}
                        onPress={() => router.push(`/crear/evento?localId=${local.id}`)}
                      >
                        <IconSymbol ios_icon_name="calendar.badge.plus" android_material_icon_name="event" size={16} color={colors.primary} />
                        <Text style={styles.actionSecondaryText}>Evento</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.actionSecondary}
                        onPress={() => router.push(`/gestion/panel-analisis?localId=${local.id}`)}
                      >
                        <IconSymbol ios_icon_name="chart.bar.fill" android_material_icon_name="bar_chart" size={16} color={colors.primary} />
                        <Text style={styles.actionSecondaryText}>Análisis</Text>
                      </TouchableOpacity>
                    </View>

                    {/* PLAN MANAGEMENT */}
                    <View style={styles.planManagement}>
                      <TouchableOpacity
                        style={styles.planButton}
                        onPress={() => router.push(`/gestion/planes-suscripcion?localId=${local.id}`)}
                      >
                        <IconSymbol ios_icon_name="arrow.up.circle" android_material_icon_name="upgrade" size={14} color={colors.primary} />
                        <Text style={styles.planButtonText}>Cambiar Plan</Text>
                      </TouchableOpacity>
                      <View style={styles.planDivider} />
                      <TouchableOpacity
                        style={styles.planButton}
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
                        <IconSymbol ios_icon_name="xmark.circle" android_material_icon_name="cancel" size={14} color="#EF4444" />
                        <Text style={[styles.planButtonText, { color: '#EF4444' }]}>Cancelar</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>

              {/* Add New Local Button */}
              <TouchableOpacity
                style={styles.addNewButton}
                onPress={() => router.push('/crear/local')}
              >
                <IconSymbol ios_icon_name="plus.circle.fill" android_material_icon_name="add_circle" size={24} color={colors.primary} />
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
    gap: 12,
  },
  localCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.cardBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  localCardActive: {
    borderColor: colors.primary,
    borderWidth: 2,
    shadowColor: colors.primary,
    shadowOpacity: 0.15,
    elevation: 4,
  },
  
  // COMPACT HEADER
  compactHeader: {
    flexDirection: 'row',
    padding: 12,
    gap: 12,
    alignItems: 'flex-start',
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  imageContainer: {
    width: 70,
    height: 70,
  },
  localImage: {
    width: 70,
    height: 70,
    borderRadius: 10,
  },
  localImagePlaceholder: {
    backgroundColor: colors.cardBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoColumn: {
    flex: 1,
    gap: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  localNombre: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
  },
  activeIndicator: {
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  localTipo: {
    fontSize: 13,
    color: colors.textSecondary,
    textTransform: 'capitalize',
  },
  inlineStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  miniStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  miniStatText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },
  statSeparator: {
    width: 1,
    height: 12,
    backgroundColor: colors.cardBorder,
  },
  planBadgeContainer: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  planBadge: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },

  // PROMO ALERT
  promoAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: colors.badgeDestacado + '15',
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  promoAlertText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
  },

  // COMPACT CREDITS
  creditsCompact: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 8,
    backgroundColor: colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  creditItem: {
    gap: 4,
  },
  creditLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  creditLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
  },
  creditValue: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.text,
  },
  miniProgressBar: {
    height: 4,
    backgroundColor: colors.cardBorder,
    borderRadius: 2,
    overflow: 'hidden',
  },
  miniProgressFill: {
    height: '100%',
    borderRadius: 2,
  },

  // DESTACADO TOGGLE
  destacadoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  destacadoInfo: {
    flex: 1,
    gap: 2,
  },
  destacadoLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },
  destacadoStatus: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  destacadoToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  destacadoToggleActive: {
    backgroundColor: colors.badgeDestacado,
    borderColor: colors.badgeDestacado,
  },
  destacadoToggleText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  destacadoToggleTextActive: {
    color: '#FFFFFF',
  },

  // COMPACT ACTIONS
  actionsCompact: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    padding: 12,
    backgroundColor: colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  actionPrimary: {
    flex: 1,
    minWidth: '100%',
    borderRadius: 8,
    overflow: 'hidden',
  },
  actionPrimaryGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
  },
  actionPrimaryText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  actionSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    flex: 1,
    minWidth: '22%',
  },
  actionSecondaryText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },

  // PLAN MANAGEMENT
  planManagement: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: colors.cardBackground,
  },
  planButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  planDivider: {
    width: 1,
    height: 20,
    backgroundColor: colors.cardBorder,
  },
  planButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },

  // ADD NEW BUTTON
  addNewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    marginTop: 8,
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.primary,
    borderStyle: 'dashed',
  },
  addNewText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.primary,
  },
});
