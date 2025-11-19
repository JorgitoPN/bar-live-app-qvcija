
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
              <View style={styles.localesGrid}>
                {locales.map((local, index) => (
                  <View key={index} style={[
                    styles.localCard,
                    selectedLocalId === local.id && styles.localCardActive
                  ]}>
                    {/* Compact Image Header */}
                    <View style={styles.compactImageSection}>
                      {local.imagen_url ? (
                        <Image source={{ uri: local.imagen_url }} style={styles.compactImage} />
                      ) : (
                        <View style={[styles.compactImage, styles.compactImagePlaceholder]}>
                          <IconSymbol ios_icon_name="building.2" android_material_icon_name="business" size={32} color={colors.textSecondary} />
                        </View>
                      )}
                      
                      {/* Plan Badge */}
                      <View style={styles.planBadgeCompact}>
                        <LinearGradient
                          colors={getPlanColor(local.plan_nombre)}
                          style={styles.planBadgeGradientCompact}
                        >
                          <Text style={styles.planBadgeTextCompact}>{local.plan_nombre.toUpperCase()}</Text>
                        </LinearGradient>
                      </View>

                      {/* Active Badge */}
                      {selectedLocalId === local.id && (
                        <View style={styles.activeBadgeCompact}>
                          <IconSymbol ios_icon_name="checkmark.circle.fill" android_material_icon_name="check_circle" size={16} color="#FFFFFF" />
                        </View>
                      )}
                    </View>

                    {/* Content Section */}
                    <View style={styles.compactContent}>
                      {/* Title */}
                      <View style={styles.titleRow}>
                        <View style={styles.titleColumn}>
                          <Text style={styles.localNameCompact} numberOfLines={1}>{local.nombre}</Text>
                          <Text style={styles.localTypeCompact} numberOfLines={1}>{local.tipo}</Text>
                        </View>
                      </View>

                      {/* Stats Row - Compact */}
                      <View style={styles.statsRowCompact}>
                        <View style={styles.statItemCompact}>
                          <IconSymbol ios_icon_name="person.2.fill" android_material_icon_name="people" size={14} color={colors.primary} />
                          <Text style={styles.statValueCompact}>{local.seguidores}</Text>
                        </View>
                        <View style={styles.statDividerCompact} />
                        <View style={styles.statItemCompact}>
                          <IconSymbol ios_icon_name="star.fill" android_material_icon_name="star" size={14} color={colors.badgeDestacado} />
                          <Text style={styles.statValueCompact}>{local.destacados_restantes}</Text>
                        </View>
                        <View style={styles.statDividerCompact} />
                        <View style={styles.statItemCompact}>
                          <IconSymbol ios_icon_name="calendar" android_material_icon_name="event" size={14} color="#8B5CF6" />
                          <Text style={styles.statValueCompact}>{local.creditos_eventos_restantes || 0}</Text>
                        </View>
                      </View>

                      {/* Destacado Toggle - Compact */}
                      {local.destacado_activo && local.destacado_fecha_fin && (
                        <View style={styles.destacadoActiveBar}>
                          <IconSymbol ios_icon_name="star.fill" android_material_icon_name="star" size={12} color="#FFFFFF" />
                          <Text style={styles.destacadoActiveText}>
                            Destacado • {calculateTimeRemaining(local.destacado_fecha_fin) || 'N/A'}
                          </Text>
                        </View>
                      )}

                      {/* Action Buttons - Single Row */}
                      <View style={styles.actionsRowCompact}>
                        <TouchableOpacity
                          style={styles.actionButtonCompact}
                          onPress={() => router.push(`/perfil/local?localId=${local.id}`)}
                        >
                          <IconSymbol ios_icon_name="person.2" android_material_icon_name="people" size={18} color="#3B82F6" />
                        </TouchableOpacity>
                        
                        <TouchableOpacity
                          style={styles.actionButtonCompact}
                          onPress={() => router.push(`/editar/local?id=${local.id}`)}
                        >
                          <IconSymbol ios_icon_name="pencil" android_material_icon_name="edit" size={18} color="#10B981" />
                        </TouchableOpacity>
                        
                        <TouchableOpacity
                          style={styles.actionButtonCompact}
                          onPress={() => router.push(`/crear/evento?localId=${local.id}`)}
                        >
                          <IconSymbol ios_icon_name="calendar.badge.plus" android_material_icon_name="event" size={18} color="#F59E0B" />
                        </TouchableOpacity>
                        
                        <TouchableOpacity
                          style={styles.actionButtonCompact}
                          onPress={() => router.push(`/gestion/panel-analisis?localId=${local.id}`)}
                        >
                          <IconSymbol ios_icon_name="chart.bar.fill" android_material_icon_name="bar_chart" size={18} color="#8B5CF6" />
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[
                            styles.actionButtonCompact,
                            local.destacado && styles.destacadoButtonActive,
                          ]}
                          onPress={() => handleToggleDestacado(local)}
                          disabled={updatingDestacado === local.id}
                        >
                          {updatingDestacado === local.id ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                          ) : (
                            <IconSymbol
                              ios_icon_name={local.destacado ? 'star.fill' : 'star'}
                              android_material_icon_name={local.destacado ? 'star' : 'star_border'}
                              size={18}
                              color={local.destacado ? '#FFFFFF' : colors.badgeDestacado}
                            />
                          )}
                        </TouchableOpacity>
                      </View>

                      {/* Activate Button */}
                      {selectedLocalId !== local.id && (
                        <TouchableOpacity
                          style={styles.activateButtonCompact}
                          onPress={() => handleSelectLocal(local.id)}
                        >
                          <LinearGradient
                            colors={[colors.primary, colors.secondary]}
                            style={styles.activateGradientCompact}
                          >
                            <IconSymbol ios_icon_name="checkmark.circle.fill" android_material_icon_name="check_circle" size={16} color="#FFFFFF" />
                            <Text style={styles.activateButtonTextCompact}>Activar</Text>
                          </LinearGradient>
                        </TouchableOpacity>
                      )}

                      {/* Footer Actions */}
                      <View style={styles.footerActionsCompact}>
                        <TouchableOpacity
                          style={styles.footerButtonCompact}
                          onPress={() => router.push(`/gestion/planes-suscripcion?localId=${local.id}`)}
                        >
                          <IconSymbol ios_icon_name="arrow.up.circle" android_material_icon_name="upgrade" size={14} color={colors.primary} />
                          <Text style={styles.footerButtonTextCompact}>Cambiar Plan</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                ))}
              </View>

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
    flex: 1,
    textAlign: 'center',
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
    borderWidth: 2,
    borderColor: colors.cardBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  localCardActive: {
    borderColor: colors.primary,
    borderWidth: 3,
    shadowColor: colors.primary,
    shadowOpacity: 0.3,
    elevation: 6,
  },
  compactImageSection: {
    position: 'relative',
    width: '100%',
    height: 120,
  },
  compactImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  compactImagePlaceholder: {
    backgroundColor: colors.cardBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  planBadgeCompact: {
    position: 'absolute',
    top: 8,
    left: 8,
    borderRadius: 6,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
  },
  planBadgeGradientCompact: {
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  planBadgeTextCompact: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  activeBadgeCompact: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: colors.primary,
    borderRadius: 16,
    padding: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
  },
  compactContent: {
    padding: 12,
    gap: 10,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleColumn: {
    flex: 1,
  },
  localNameCompact: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
  },
  localTypeCompact: {
    fontSize: 13,
    color: colors.textSecondary,
    textTransform: 'capitalize',
    marginTop: 2,
  },
  statsRowCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 8,
  },
  statItemCompact: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  statValueCompact: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  statDividerCompact: {
    width: 1,
    height: 20,
    backgroundColor: colors.cardBorder,
  },
  destacadoActiveBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.badgeDestacado,
    paddingVertical: 6,
    borderRadius: 6,
  },
  destacadoActiveText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  actionsRowCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionButtonCompact: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    backgroundColor: colors.background,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
  },
  destacadoButtonActive: {
    backgroundColor: colors.badgeDestacado,
    borderColor: colors.badgeDestacado,
  },
  activateButtonCompact: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  activateGradientCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
  },
  activateButtonTextCompact: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  footerActionsCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
    paddingTop: 10,
  },
  footerButtonCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
  },
  footerButtonTextCompact: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
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
