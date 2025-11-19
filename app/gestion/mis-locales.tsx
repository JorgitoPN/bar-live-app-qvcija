
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

    // Check if the local can be featured
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

      // Reload locales to reflect changes
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
              {/* Local Cards */}
              <View style={styles.localesGrid}>
                {locales.map((local, index) => (
                  <View key={index} style={[
                    styles.localCard,
                    selectedLocalId === local.id && styles.localCardActive
                  ]}>
                    {/* Header Section with Image and Basic Info */}
                    <View style={styles.cardHeader}>
                      {/* Image */}
                      <View style={styles.imageWrapper}>
                        {local.imagen_url ? (
                          <Image source={{ uri: local.imagen_url }} style={styles.localImage} />
                        ) : (
                          <View style={[styles.localImage, styles.localImagePlaceholder]}>
                            <IconSymbol ios_icon_name="building.2" android_material_icon_name="business" size={28} color={colors.textSecondary} />
                          </View>
                        )}
                        {/* Plan Badge on Image */}
                        <View style={styles.planBadgeOnImage}>
                          <LinearGradient
                            colors={getPlanColor(local.plan_nombre)}
                            style={styles.planBadgeGradient}
                          >
                            <IconSymbol 
                              ios_icon_name={local.plan_nombre === 'premium' ? 'star.fill' : local.plan_nombre === 'estandar' ? 'bolt.fill' : 'checkmark.circle.fill'} 
                              android_material_icon_name={local.plan_nombre === 'premium' ? 'star' : local.plan_nombre === 'estandar' ? 'bolt' : 'check_circle'} 
                              size={10} 
                              color="#FFFFFF" 
                            />
                            <Text style={styles.planBadgeText}>{local.plan_nombre.toUpperCase()}</Text>
                          </LinearGradient>
                        </View>
                      </View>
                      
                      {/* Info Column */}
                      <View style={styles.headerInfo}>
                        <Text style={styles.localNombre} numberOfLines={2}>{local.nombre}</Text>
                        <Text style={styles.localTipo} numberOfLines={1}>{local.tipo}</Text>
                        
                        {/* Active Badge */}
                        {selectedLocalId === local.id && (
                          <View style={styles.activeBadge}>
                            <IconSymbol ios_icon_name="checkmark.circle.fill" android_material_icon_name="check_circle" size={14} color={colors.primary} />
                            <Text style={styles.activeBadgeText}>Local Activo</Text>
                          </View>
                        )}
                      </View>
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

                    {/* Credits Progress Section */}
                    <View style={styles.creditsSection}>
                      <Text style={styles.sectionTitle}>Créditos Disponibles</Text>
                      
                      {/* Destacados Progress */}
                      <View style={styles.creditRow}>
                        <View style={styles.creditInfo}>
                          <View style={styles.creditHeader}>
                            <IconSymbol ios_icon_name="star.fill" android_material_icon_name="star" size={12} color={colors.badgeDestacado} />
                            <Text style={styles.creditLabel}>Destacados</Text>
                          </View>
                          <Text style={styles.creditValue}>
                            {local.destacados_restantes} / {local.destacados_restantes + (local.destacado_activo ? 1 : 0)}
                          </Text>
                        </View>
                        <View style={styles.progressBarContainer}>
                          <View style={styles.progressBarBg}>
                            <View style={[
                              styles.progressBarFill, 
                              { 
                                width: `${Math.min(100, (local.destacados_restantes / Math.max(1, local.destacados_restantes + (local.destacado_activo ? 1 : 0))) * 100)}%`, 
                                backgroundColor: colors.badgeDestacado 
                              }
                            ]} />
                          </View>
                        </View>
                      </View>

                      {/* Eventos Progress */}
                      <View style={styles.creditRow}>
                        <View style={styles.creditInfo}>
                          <View style={styles.creditHeader}>
                            <IconSymbol ios_icon_name="calendar" android_material_icon_name="event" size={12} color="#8B5CF6" />
                            <Text style={styles.creditLabel}>Eventos</Text>
                          </View>
                          <Text style={styles.creditValue}>
                            {local.creditos_eventos_restantes || 0} / {local.eventos_disponibles || 0}
                          </Text>
                        </View>
                        <View style={styles.progressBarContainer}>
                          <View style={styles.progressBarBg}>
                            <View style={[
                              styles.progressBarFill, 
                              { 
                                width: `${Math.min(100, ((local.creditos_eventos_restantes || 0) / Math.max(1, local.eventos_disponibles || 1)) * 100)}%`, 
                                backgroundColor: '#8B5CF6' 
                              }
                            ]} />
                          </View>
                        </View>
                      </View>

                      {/* Renewal Date */}
                      {local.fecha_renovacion && (
                        <View style={styles.renewalRow}>
                          <IconSymbol ios_icon_name="arrow.clockwise" android_material_icon_name="refresh" size={12} color={colors.textSecondary} />
                          <Text style={styles.renewalText}>
                            Renovación: {new Date(local.fecha_renovacion).toLocaleDateString('es-ES')}
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* Active Promotions */}
                    {local.destacado_activo && local.destacado_fecha_fin && (
                      <View style={styles.activePromoSection}>
                        <View style={styles.promoHeader}>
                          <IconSymbol ios_icon_name="star.fill" android_material_icon_name="star" size={14} color={colors.badgeDestacado} />
                          <Text style={styles.promoTitle}>Promoción Destacada Activa</Text>
                        </View>
                        <View style={styles.promoInfo}>
                          <Text style={styles.promoTime}>{calculateTimeRemaining(local.destacado_fecha_fin) || 'N/A'} restantes</Text>
                          <View style={styles.progressBarBg}>
                            <View style={[
                              styles.progressBarFill, 
                              { 
                                width: `${Math.max(0, Math.min(100, ((new Date(local.destacado_fecha_fin).getTime() - new Date().getTime()) / (30 * 24 * 60 * 60 * 1000)) * 100))}%`, 
                                backgroundColor: colors.badgeDestacado 
                              }
                            ]} />
                          </View>
                        </View>
                      </View>
                    )}

                    {/* Featured Toggle */}
                    <View style={styles.destacadoSection}>
                      <View style={styles.destacadoInfo}>
                        <Text style={styles.destacadoLabel}>Estado Destacado</Text>
                        <Text style={styles.destacadoStatus}>
                          {local.destacado && local.destacado_activo
                            ? `Activo • ${calculateTimeRemaining(local.destacado_fecha_fin) || 'N/A'}`
                            : local.destacados_restantes > 0
                            ? `${local.destacados_restantes} crédito${local.destacados_restantes > 1 ? 's' : ''} disponible${local.destacados_restantes > 1 ? 's' : ''}`
                            : 'Sin créditos disponibles'}
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={[
                          styles.destacadoBtn,
                          local.destacado && styles.destacadoBtnActive,
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
                              size={16}
                              color={local.destacado ? '#FFFFFF' : colors.primary}
                            />
                            <Text style={[
                              styles.destacadoBtnText,
                              local.destacado && styles.destacadoBtnTextActive
                            ]}>
                              {local.destacado ? 'Activo' : 'Activar'}
                            </Text>
                          </React.Fragment>
                        )}
                      </TouchableOpacity>
                    </View>

                    {/* Quick Actions */}
                    <View style={styles.actionsGrid}>
                      {selectedLocalId !== local.id && (
                        <TouchableOpacity
                          style={styles.actionBtnPrimary}
                          onPress={() => handleSelectLocal(local.id)}
                        >
                          <LinearGradient
                            colors={[colors.primary, colors.secondary]}
                            style={styles.actionBtnGradient}
                          >
                            <IconSymbol ios_icon_name="checkmark.circle.fill" android_material_icon_name="check_circle" size={18} color="#FFFFFF" />
                            <Text style={styles.actionBtnPrimaryText}>Activar Local</Text>
                          </LinearGradient>
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity
                        style={styles.actionBtn}
                        onPress={() => router.push(`/perfil/local?localId=${local.id}`)}
                      >
                        <IconSymbol ios_icon_name="person.2" android_material_icon_name="people" size={18} color={colors.primary} />
                        <Text style={styles.actionBtnText}>Perfil</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.actionBtn}
                        onPress={() => router.push(`/editar/local?id=${local.id}`)}
                      >
                        <IconSymbol ios_icon_name="pencil" android_material_icon_name="edit" size={18} color={colors.primary} />
                        <Text style={styles.actionBtnText}>Editar</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.actionBtn}
                        onPress={() => router.push(`/crear/evento?localId=${local.id}`)}
                      >
                        <IconSymbol ios_icon_name="calendar.badge.plus" android_material_icon_name="event" size={18} color={colors.primary} />
                        <Text style={styles.actionBtnText}>Evento</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.actionBtn}
                        onPress={() => router.push(`/gestion/panel-analisis?localId=${local.id}`)}
                      >
                        <IconSymbol ios_icon_name="chart.bar.fill" android_material_icon_name="bar_chart" size={18} color={colors.primary} />
                        <Text style={styles.actionBtnText}>Análisis</Text>
                      </TouchableOpacity>
                    </View>

                    {/* Plan Management */}
                    <View style={styles.planActions}>
                      <TouchableOpacity
                        style={styles.planBtn}
                        onPress={() => router.push(`/gestion/planes-suscripcion?localId=${local.id}`)}
                      >
                        <LinearGradient
                          colors={['#3B82F6', '#2563EB']}
                          style={styles.planBtnGradient}
                        >
                          <IconSymbol ios_icon_name="arrow.up.circle.fill" android_material_icon_name="upgrade" size={18} color="#FFFFFF" />
                          <Text style={styles.planBtnText}>Cambiar Plan</Text>
                        </LinearGradient>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.planBtn}
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
                        <LinearGradient
                          colors={['#EF4444', '#DC2626']}
                          style={styles.planBtnGradient}
                        >
                          <IconSymbol ios_icon_name="xmark.circle.fill" android_material_icon_name="cancel" size={18} color="#FFFFFF" />
                          <Text style={styles.planBtnText}>Cancelar Plan</Text>
                        </LinearGradient>
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
    gap: 16,
  },
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
    elevation: 4,
  },
  localCardActive: {
    borderColor: colors.primary,
    borderWidth: 2,
    shadowColor: colors.primary,
    shadowOpacity: 0.2,
    elevation: 6,
  },
  cardHeader: {
    flexDirection: 'row',
    padding: 16,
    gap: 14,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  imageWrapper: {
    position: 'relative',
  },
  localImage: {
    width: 90,
    height: 90,
    borderRadius: 14,
  },
  localImagePlaceholder: {
    backgroundColor: colors.cardBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  planBadgeOnImage: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    right: 6,
    borderRadius: 8,
    overflow: 'hidden',
  },
  planBadgeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  planBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  headerInfo: {
    flex: 1,
    justifyContent: 'center',
    gap: 6,
  },
  localNombre: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    lineHeight: 24,
  },
  localTipo: {
    fontSize: 14,
    color: colors.textSecondary,
    textTransform: 'capitalize',
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary + '15',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  activeBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  statsRow: {
    flexDirection: 'row',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  statDivider: {
    width: 1,
    backgroundColor: colors.cardBorder,
    marginHorizontal: 8,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  statLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  creditsSection: {
    padding: 16,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  creditRow: {
    marginBottom: 12,
  },
  creditInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  creditHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  creditLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  creditValue: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  progressBarContainer: {
    marginTop: 4,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: colors.cardBorder,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  renewalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
  },
  renewalText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  activePromoSection: {
    padding: 16,
    backgroundColor: colors.badgeDestacado + '10',
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  promoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  promoTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  promoInfo: {
    gap: 8,
  },
  promoTime: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.badgeDestacado,
  },
  destacadoSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  destacadoInfo: {
    flex: 1,
    gap: 4,
  },
  destacadoLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  destacadoStatus: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  destacadoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  destacadoBtnActive: {
    backgroundColor: colors.badgeDestacado,
    borderColor: colors.badgeDestacado,
  },
  destacadoBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  destacadoBtnTextActive: {
    color: '#FFFFFF',
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    padding: 16,
    backgroundColor: colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  actionBtnPrimary: {
    flex: 1,
    minWidth: '100%',
    borderRadius: 10,
    overflow: 'hidden',
  },
  actionBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  actionBtnPrimaryText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: colors.background,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    flex: 1,
    minWidth: '22%',
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  planActions: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    backgroundColor: colors.cardBackground,
  },
  planBtn: {
    flex: 1,
    borderRadius: 10,
    overflow: 'hidden',
  },
  planBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  planBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  addNewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
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
