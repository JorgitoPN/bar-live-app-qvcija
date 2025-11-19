
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
            <Text style={styles.headerTitle}>Gestión de Locales</Text>
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
          <Text style={styles.headerTitle}>Gestión de Locales</Text>
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
              {/* Compact Local Cards */}
              <View style={styles.localesGrid}>
                {locales.map((local, index) => (
                  <View key={index} style={[
                    styles.localCard,
                    selectedLocalId === local.id && styles.localCardActive
                  ]}>
                    {/* Top Section: Image + Basic Info */}
                    <View style={styles.topSection}>
                      {/* Image */}
                      <View style={styles.imageContainer}>
                        {local.imagen_url ? (
                          <Image source={{ uri: local.imagen_url }} style={styles.localImage} />
                        ) : (
                          <View style={[styles.localImage, styles.localImagePlaceholder]}>
                            <IconSymbol ios_icon_name="building.2" android_material_icon_name="business" size={32} color={colors.textSecondary} />
                          </View>
                        )}
                        {/* Premium Badge on Image */}
                        {local.plan_nombre === 'premium' && (
                          <View style={styles.premiumBadgeOnImage}>
                            <IconSymbol ios_icon_name="star.fill" android_material_icon_name="star" size={10} color="#FFFFFF" />
                            <Text style={styles.premiumBadgeText}>PREMIUM</Text>
                          </View>
                        )}
                      </View>
                      
                      {/* Info Column */}
                      <View style={styles.infoColumn}>
                        {/* Title + Location */}
                        <View style={styles.titleSection}>
                          <Text style={styles.localNombre} numberOfLines={1}>{local.nombre}</Text>
                          <Text style={styles.localTipo} numberOfLines={1}>{local.tipo}</Text>
                        </View>

                        {/* Active Badge */}
                        {selectedLocalId === local.id && (
                          <View style={styles.activeBadgeCompact}>
                            <IconSymbol ios_icon_name="checkmark.circle.fill" android_material_icon_name="check_circle" size={12} color={colors.primary} />
                            <Text style={styles.activeBadgeTextCompact}>Activo</Text>
                          </View>
                        )}
                      </View>
                    </View>

                    {/* Middle Section: Compact Info Grid */}
                    <View style={styles.infoGrid}>
                      {/* Plan Renewal */}
                      {local.fecha_renovacion && (
                        <View style={styles.infoBox}>
                          <View style={styles.infoBoxHeader}>
                            <IconSymbol ios_icon_name="clock" android_material_icon_name="schedule" size={14} color={colors.primary} />
                            <Text style={styles.infoBoxLabel}>Renovación del Plan</Text>
                          </View>
                          <Text style={styles.infoBoxValue}>{calculateTimeRemaining(local.fecha_renovacion) || 'N/A'}</Text>
                          <Text style={styles.infoBoxSubtext}>{new Date(local.fecha_renovacion).toLocaleDateString('es-ES')}</Text>
                          <View style={styles.progressBar}>
                            <View style={[styles.progressFill, { width: '75%', backgroundColor: colors.primary }]} />
                          </View>
                        </View>
                      )}

                      {/* Featured Promotion */}
                      {local.destacado_activo && local.destacado_fecha_fin && (
                        <View style={styles.infoBox}>
                          <View style={styles.infoBoxHeader}>
                            <IconSymbol ios_icon_name="star.fill" android_material_icon_name="star" size={14} color={colors.badgeDestacado} />
                            <Text style={styles.infoBoxLabel}>Promoción Destacada</Text>
                          </View>
                          <Text style={styles.infoBoxValue}>{calculateTimeRemaining(local.destacado_fecha_fin) || 'N/A'}</Text>
                          <View style={styles.progressBar}>
                            <View style={[styles.progressFill, { width: '60%', backgroundColor: colors.badgeDestacado }]} />
                          </View>
                        </View>
                      )}

                      {/* Credits */}
                      <View style={styles.infoBox}>
                        <View style={styles.infoBoxHeader}>
                          <IconSymbol ios_icon_name="creditcard" android_material_icon_name="credit_card" size={14} color={colors.primary} />
                          <Text style={styles.infoBoxLabel}>Créditos Disponibles</Text>
                        </View>
                        <View style={styles.creditsRow}>
                          <View style={styles.creditItem}>
                            <Text style={styles.creditLabel}>Destacados</Text>
                            <Text style={styles.creditValue}>{local.destacados_restantes} / {local.destacados_restantes + (local.destacado_activo ? 1 : 0)}</Text>
                            <View style={styles.progressBar}>
                              <View style={[
                                styles.progressFill, 
                                { 
                                  width: `${Math.min(100, (local.destacados_restantes / Math.max(1, local.destacados_restantes + (local.destacado_activo ? 1 : 0))) * 100)}%`, 
                                  backgroundColor: colors.badgeDestacado 
                                }
                              ]} />
                            </View>
                          </View>
                          <View style={styles.creditItem}>
                            <Text style={styles.creditLabel}>Eventos</Text>
                            <Text style={styles.creditValue}>{local.creditos_eventos_restantes || 0} / {local.eventos_disponibles || 0}</Text>
                            <View style={styles.progressBar}>
                              <View style={[
                                styles.progressFill, 
                                { 
                                  width: `${Math.min(100, ((local.creditos_eventos_restantes || 0) / Math.max(1, local.eventos_disponibles || 1)) * 100)}%`, 
                                  backgroundColor: '#8B5CF6' 
                                }
                              ]} />
                            </View>
                          </View>
                        </View>
                        {local.fecha_renovacion && (
                          <Text style={styles.renewalDate}>
                            <IconSymbol ios_icon_name="arrow.clockwise" android_material_icon_name="refresh" size={10} color={colors.textSecondary} />
                            {' '}Renovación: {new Date(local.fecha_renovacion).toLocaleDateString('es-ES')}
                          </Text>
                        )}
                      </View>

                      {/* Featured Toggle */}
                      <View style={styles.infoBox}>
                        <View style={styles.infoBoxHeader}>
                          <IconSymbol ios_icon_name="star.fill" android_material_icon_name="star" size={14} color={colors.badgeDestacado} />
                          <Text style={styles.infoBoxLabel}>Local Destacado</Text>
                        </View>
                        <View style={styles.destacadoRow}>
                          <View style={styles.destacadoInfo}>
                            <Text style={styles.destacadoStatus}>
                              {local.destacado && local.destacado_activo
                                ? `Activo • ${calculateTimeRemaining(local.destacado_fecha_fin) || 'N/A'} restantes`
                                : local.destacados_restantes > 0
                                ? `${local.destacados_restantes} crédito${local.destacados_restantes > 1 ? 's' : ''} disponible${local.destacados_restantes > 1 ? 's' : ''}`
                                : 'Sin créditos disponibles'}
                            </Text>
                          </View>
                          <TouchableOpacity
                            style={[
                              styles.destacadoToggleBtn,
                              local.destacado && styles.destacadoToggleBtnActive,
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
                      </View>
                    </View>

                    {/* Bottom Section: Action Buttons */}
                    <View style={styles.actionsRow}>
                      {selectedLocalId !== local.id && (
                        <TouchableOpacity
                          style={styles.actionBtnPrimary}
                          onPress={() => handleSelectLocal(local.id)}
                        >
                          <IconSymbol ios_icon_name="checkmark.circle" android_material_icon_name="check_circle" size={16} color="#FFFFFF" />
                          <Text style={styles.actionTextPrimary}>Activar</Text>
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity
                        style={styles.actionBtn}
                        onPress={() => router.push(`/perfil/local?localId=${local.id}`)}
                      >
                        <IconSymbol ios_icon_name="person.2" android_material_icon_name="people" size={16} color={colors.primary} />
                        <Text style={styles.actionText}>Perfil</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.actionBtn}
                        onPress={() => router.push(`/editar/local?id=${local.id}`)}
                      >
                        <IconSymbol ios_icon_name="pencil" android_material_icon_name="edit" size={16} color={colors.primary} />
                        <Text style={styles.actionText}>Editar</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.actionBtn}
                        onPress={() => router.push(`/crear/evento?localId=${local.id}`)}
                      >
                        <IconSymbol ios_icon_name="calendar.badge.plus" android_material_icon_name="event" size={16} color={colors.primary} />
                        <Text style={styles.actionText}>Evento</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.actionBtn}
                        onPress={() => router.push(`/gestion/panel-analisis?localId=${local.id}`)}
                      >
                        <IconSymbol ios_icon_name="chart.bar.fill" android_material_icon_name="bar_chart" size={16} color={colors.primary} />
                        <Text style={styles.actionText}>Análisis</Text>
                      </TouchableOpacity>
                    </View>

                    {/* Plan Management Buttons */}
                    <View style={styles.planButtonsRow}>
                      <TouchableOpacity
                        style={styles.planBtn}
                        onPress={() => router.push(`/gestion/planes-suscripcion?localId=${local.id}`)}
                      >
                        <LinearGradient
                          colors={['#3B82F6', '#2563EB']}
                          style={styles.planBtnGradient}
                        >
                          <IconSymbol ios_icon_name="arrow.up.circle" android_material_icon_name="upgrade" size={16} color="#FFFFFF" />
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
                          <IconSymbol ios_icon_name="xmark.circle" android_material_icon_name="cancel" size={16} color="#FFFFFF" />
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
                <IconSymbol ios_icon_name="plus.circle" android_material_icon_name="add_circle" size={20} color={colors.primary} />
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
    paddingBottom: 14,
    paddingHorizontal: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 6,
  },
  headerTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: colors.headerText,
  },
  addButton: {
    padding: 6,
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
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  createButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  createGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  createButtonText: {
    color: colors.headerText,
    fontSize: 16,
    fontWeight: 'bold',
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
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  localCardActive: {
    borderColor: colors.primary,
    borderWidth: 2,
    shadowColor: colors.primary,
    shadowOpacity: 0.25,
    elevation: 6,
  },
  topSection: {
    flexDirection: 'row',
    padding: 14,
    gap: 12,
    backgroundColor: colors.background,
  },
  imageContainer: {
    position: 'relative',
  },
  localImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
  },
  localImagePlaceholder: {
    backgroundColor: colors.cardBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  premiumBadgeOnImage: {
    position: 'absolute',
    top: 4,
    right: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#EF4444',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  premiumBadgeText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  infoColumn: {
    flex: 1,
    justifyContent: 'space-between',
  },
  titleSection: {
    marginBottom: 8,
  },
  localNombre: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  localTipo: {
    fontSize: 13,
    color: colors.textSecondary,
    textTransform: 'capitalize',
  },
  activeBadgeCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.primary + '15',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  activeBadgeTextCompact: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  infoGrid: {
    padding: 14,
    gap: 12,
  },
  infoBox: {
    backgroundColor: colors.background,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  infoBoxHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  infoBoxLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  infoBoxValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  infoBoxSubtext: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  progressBar: {
    height: 6,
    backgroundColor: colors.cardBorder,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  creditsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  creditItem: {
    flex: 1,
  },
  creditLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  creditValue: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 6,
  },
  renewalDate: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 8,
    fontStyle: 'italic',
  },
  destacadoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  destacadoInfo: {
    flex: 1,
  },
  destacadoStatus: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  destacadoToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  destacadoToggleBtnActive: {
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
  actionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 14,
    paddingBottom: 14,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
    paddingTop: 14,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: colors.background,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    flex: 1,
    minWidth: '22%',
  },
  actionBtnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: colors.primary,
    borderRadius: 10,
    flex: 1,
    minWidth: '22%',
  },
  actionText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  actionTextPrimary: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  planButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 14,
    paddingBottom: 14,
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
    gap: 6,
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
    paddingVertical: 16,
    marginTop: 8,
    backgroundColor: colors.cardBackground,
    borderRadius: 14,
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
