
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
              )
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
      {/* Compact Header */}
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
              {/* Active Local Indicator - More Compact */}
              {locales.length > 1 && selectedLocalId && (
                <View style={styles.activeLocalBanner}>
                  <IconSymbol ios_icon_name="checkmark.circle.fill" android_material_icon_name="check_circle" size={16} color={colors.primary} />
                  <Text style={styles.activeLocalText}>
                    Activo: <Text style={styles.activeLocalName}>
                      {locales.find(l => l.id === selectedLocalId)?.nombre || 'Ninguno'}
                    </Text>
                  </Text>
                </View>
              )}

              {/* Compact Local Cards */}
              <View style={styles.localesGrid}>
                {locales.map((local, index) => (
                  <View key={index} style={[
                    styles.localCard,
                    selectedLocalId === local.id && styles.localCardActive
                  ]}>
                    {/* Compact Header with Image and Info */}
                    <View style={styles.cardHeader}>
                      {/* Image */}
                      {local.imagen_url ? (
                        <Image source={{ uri: local.imagen_url }} style={styles.localImage} />
                      ) : (
                        <View style={[styles.localImage, styles.localImagePlaceholder]}>
                          <IconSymbol ios_icon_name="building.2" android_material_icon_name="business" size={28} color={colors.textSecondary} />
                        </View>
                      )}
                      
                      {/* Info - Compact Layout */}
                      <View style={styles.cardInfo}>
                        {/* Title Row with Active Indicator */}
                        <View style={styles.titleRow}>
                          <Text style={styles.localNombre} numberOfLines={1}>{local.nombre}</Text>
                          {selectedLocalId === local.id && (
                            <View style={styles.activeBadge}>
                              <Text style={styles.activeBadgeText}>ACTIVO</Text>
                            </View>
                          )}
                        </View>
                        
                        {/* Meta Info - Single Line */}
                        <View style={styles.metaRow}>
                          <Text style={styles.localTipo}>{local.tipo}</Text>
                          <View style={styles.dot} />
                          <IconSymbol ios_icon_name="person.2" android_material_icon_name="people" size={12} color={colors.textSecondary} />
                          <Text style={styles.followersText}>{local.seguidores}</Text>
                          <View style={styles.dot} />
                          <View style={[
                            styles.planBadge,
                            local.plan_nombre === 'premium' && styles.planBadgePremium
                          ]}>
                            <Text style={[
                              styles.planText,
                              local.plan_nombre === 'premium' && styles.planTextPremium
                            ]}>
                              {local.plan_nombre.toUpperCase()}
                            </Text>
                          </View>
                        </View>

                        {/* Destacado Status - Inline */}
                        <View style={styles.statusRow}>
                          <TouchableOpacity
                            style={styles.destacadoToggle}
                            onPress={() => handleToggleDestacado(local)}
                            disabled={updatingDestacado === local.id}
                          >
                            {updatingDestacado === local.id ? (
                              <ActivityIndicator size="small" color={colors.primary} />
                            ) : (
                              <React.Fragment>
                                <IconSymbol
                                  ios_icon_name={local.destacado ? 'star.fill' : 'star'}
                                  android_material_icon_name={local.destacado ? 'star' : 'star_border'}
                                  size={14}
                                  color={local.destacado ? colors.badgeDestacado : colors.textSecondary}
                                />
                                <Text style={[
                                  styles.destacadoText,
                                  local.destacado && styles.destacadoTextActive
                                ]}>
                                  {local.destacado ? 'Destacado' : 'Destacar'}
                                </Text>
                              </React.Fragment>
                            )}
                          </TouchableOpacity>
                          {local.destacados_restantes > 0 && !local.destacado && (
                            <Text style={styles.creditosText}>
                              {local.destacados_restantes} crédito{local.destacados_restantes > 1 ? 's' : ''}
                            </Text>
                          )}
                        </View>
                      </View>
                    </View>

                    {/* Compact Action Buttons - Single Row */}
                    <View style={styles.actions}>
                      {selectedLocalId !== local.id && (
                        <TouchableOpacity
                          style={styles.actionButtonPrimary}
                          onPress={() => handleSelectLocal(local.id)}
                        >
                          <IconSymbol ios_icon_name="checkmark.circle" android_material_icon_name="check_circle" size={14} color="#FFFFFF" />
                          <Text style={styles.actionTextPrimary}>Activar</Text>
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => router.push(`/editar/local?id=${local.id}`)}
                      >
                        <IconSymbol ios_icon_name="pencil" android_material_icon_name="edit" size={14} color={colors.primary} />
                        <Text style={styles.actionText}>Editar</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => router.push(`/gestion/panel-analisis?localId=${local.id}`)}
                      >
                        <IconSymbol ios_icon_name="chart.bar.fill" android_material_icon_name="bar_chart" size={14} color={colors.primary} />
                        <Text style={styles.actionText}>Análisis</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => router.push(`/gestion/planes-suscripcion?localId=${local.id}`)}
                      >
                        <IconSymbol ios_icon_name="creditcard" android_material_icon_name="credit_card" size={14} color={colors.primary} />
                        <Text style={styles.actionText}>Plan</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>

              {/* Add New Local Button - Compact */}
              <TouchableOpacity
                style={styles.addNewButton}
                onPress={() => router.push('/crear/local')}
              >
                <IconSymbol ios_icon_name="plus.circle" android_material_icon_name="add_circle" size={18} color={colors.primary} />
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
  activeLocalBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.primary + '15',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  activeLocalText: {
    flex: 1,
    fontSize: 13,
    color: colors.text,
    fontWeight: '500',
  },
  activeLocalName: {
    fontWeight: '700',
    color: colors.primary,
  },
  localesGrid: {
    gap: 12,
  },
  localCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    padding: 16,
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
    backgroundColor: colors.primary + '05',
  },
  cardHeader: {
    flexDirection: 'row',
    marginBottom: 14,
  },
  localImage: {
    width: 70,
    height: 70,
    borderRadius: 12,
  },
  localImagePlaceholder: {
    backgroundColor: colors.cardBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardInfo: {
    flex: 1,
    marginLeft: 14,
    justifyContent: 'space-between',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  localNombre: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
  },
  activeBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  activeBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.white,
    letterSpacing: 0.5,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  localTipo: {
    fontSize: 13,
    color: colors.textSecondary,
    textTransform: 'capitalize',
    fontWeight: '500',
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: colors.textSecondary,
    marginHorizontal: 7,
  },
  followersText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    marginLeft: 3,
  },
  planBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: '#E5E7EB',
  },
  planBadgePremium: {
    backgroundColor: '#DBEAFE',
  },
  planText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#6B7280',
    letterSpacing: 0.3,
  },
  planTextPremium: {
    color: '#1E40AF',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  destacadoToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  destacadoText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  destacadoTextActive: {
    color: colors.badgeDestacado,
    fontWeight: '700',
  },
  creditosText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 10,
    backgroundColor: colors.background,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  actionButtonPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 10,
    backgroundColor: colors.primary,
    borderRadius: 10,
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
  addNewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    marginTop: 12,
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
