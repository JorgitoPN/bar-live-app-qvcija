
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
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { colors, commonStyles } from '@/styles/commonStyles';
import { useAuth } from '@/contexts/AuthContext';
import { useSelectedLocal } from '@/contexts/SelectedLocalContext';
import { supabase } from '@/utils/supabase';

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

  if (loading) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={[colors.headerGradientStart, colors.headerGradientEnd]}
          style={styles.header}
        >
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <IconSymbol name="chevron.left" size={24} color={colors.headerText} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Gestión de Locales</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => router.push('/crear/local')}
          >
            <IconSymbol name="plus" size={24} color={colors.headerText} />
          </TouchableOpacity>
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
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <IconSymbol name="chevron.left" size={24} color={colors.headerText} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Gestión de Locales</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push('/crear/local')}
        >
          <IconSymbol name="plus" size={24} color={colors.headerText} />
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {locales.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}>
              <IconSymbol name="building.2" size={64} color={colors.textSecondary} />
            </View>
            <Text style={styles.emptyTitle}>No tienes locales registrados</Text>
            <Text style={styles.emptyText}>
              Crea tu primer local para empezar a gestionar eventos, promociones y conectar con tu audiencia
            </Text>
            <TouchableOpacity
              style={styles.createButton}
              onPress={() => router.push('/crear/local')}
            >
              <LinearGradient
                colors={[colors.headerGradientStart, colors.headerGradientEnd]}
                style={styles.createGradient}
              >
                <IconSymbol name="plus" size={20} color={colors.headerText} />
                <Text style={styles.createButtonText}>Crear Mi Primer Local</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        ) : (
          <React.Fragment>
            {/* Active Local Selector */}
            {locales.length > 1 && (
              <View style={styles.selectorSection}>
                <View style={styles.selectorHeader}>
                  <View style={styles.selectorTitleContainer}>
                    <IconSymbol name="checkmark.circle.fill" size={20} color={colors.primary} />
                    <Text style={styles.selectorTitle}>Local Activo</Text>
                  </View>
                  <Text style={styles.selectorCount}>{locales.length} locales</Text>
                </View>
                <Text style={styles.selectorDescription}>
                  Selecciona el local con el que deseas interactuar
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.selectorScroll}>
                  {locales.map((local) => (
                    <TouchableOpacity
                      key={local.id}
                      style={[
                        styles.selectorCard,
                        selectedLocalId === local.id && styles.selectorCardActive,
                      ]}
                      onPress={() => handleSelectLocal(local.id)}
                    >
                      {local.imagen_url ? (
                        <Image source={{ uri: local.imagen_url }} style={styles.selectorImage} />
                      ) : (
                        <View style={[styles.selectorImage, styles.selectorImagePlaceholder]}>
                          <IconSymbol name="building.2" size={28} color={colors.textSecondary} />
                        </View>
                      )}
                      <Text style={styles.selectorName} numberOfLines={1}>
                        {local.nombre}
                      </Text>
                      {selectedLocalId === local.id && (
                        <View style={styles.selectorCheckmark}>
                          <IconSymbol name="checkmark.circle.fill" size={24} color={colors.primary} />
                        </View>
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Locales List */}
            <View style={styles.localesSection}>
              <View style={styles.localesSectionHeader}>
                <Text style={styles.localesSectionTitle}>Todos los Locales</Text>
                <Text style={styles.localesSectionSubtitle}>Gestiona tus locales y planes</Text>
              </View>
              
              {locales.map((local) => (
                <View key={local.id} style={styles.localCard}>
                  {/* Card Header with Image */}
                  <View style={styles.localCardHeader}>
                    {local.imagen_url ? (
                      <Image source={{ uri: local.imagen_url }} style={styles.localCardImage} />
                    ) : (
                      <View style={[styles.localCardImage, styles.localCardImagePlaceholder]}>
                        <IconSymbol name="building.2" size={40} color={colors.textSecondary} />
                      </View>
                    )}
                    <View style={styles.localCardHeaderInfo}>
                      <View style={styles.localCardTitleRow}>
                        <Text style={styles.localCardNombre} numberOfLines={1}>
                          {local.nombre}
                        </Text>
                        {selectedLocalId === local.id && (
                          <View style={styles.activeBadge}>
                            <Text style={styles.activeBadgeText}>ACTIVO</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.localCardTipo}>
                        {local.tipo.charAt(0).toUpperCase() + local.tipo.slice(1)}
                      </Text>
                      <View style={styles.planBadge}>
                        <IconSymbol name="star.fill" size={12} color="#1E40AF" />
                        <Text style={styles.planBadgeText}>
                          {local.plan_nombre.toUpperCase()}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Stats Row */}
                  <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                      <IconSymbol name="person.2.fill" size={18} color="#3B82F6" />
                      <Text style={styles.statValue}>{local.seguidores.toLocaleString()}</Text>
                      <Text style={styles.statLabel}>Seguidores</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                      <IconSymbol name="star.fill" size={18} color="#F59E0B" />
                      <Text style={styles.statValue}>{local.destacados_restantes}</Text>
                      <Text style={styles.statLabel}>Destacados</Text>
                    </View>
                  </View>

                  {/* Featured Toggle */}
                  <View style={styles.featuredSection}>
                    <View style={styles.featuredInfo}>
                      <View style={styles.featuredTitleRow}>
                        <IconSymbol name="star.fill" size={16} color={local.destacado ? colors.badgeDestacado : colors.textSecondary} />
                        <Text style={styles.featuredTitle}>Local Destacado</Text>
                      </View>
                      <Text style={styles.featuredSubtitle}>
                        {local.destacado 
                          ? 'Tu local aparece destacado en búsquedas'
                          : local.destacados_restantes > 0
                          ? `${local.destacados_restantes} destacados disponibles`
                          : 'Actualiza tu plan para destacar'}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={[
                        styles.featuredToggle,
                        local.destacado && styles.featuredToggleActive,
                        updatingDestacado === local.id && styles.featuredToggleDisabled,
                      ]}
                      onPress={() => handleToggleDestacado(local)}
                      disabled={updatingDestacado === local.id}
                    >
                      {updatingDestacado === local.id ? (
                        <ActivityIndicator size="small" color={colors.primary} />
                      ) : (
                        <View style={[
                          styles.featuredToggleKnob,
                          local.destacado && styles.featuredToggleKnobActive,
                        ]} />
                      )}
                    </TouchableOpacity>
                  </View>

                  {/* Action Buttons */}
                  <View style={styles.actionsRow}>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => router.push(`/editar/local?id=${local.id}`)}
                    >
                      <IconSymbol name="pencil" size={18} color={colors.primary} />
                      <Text style={styles.actionButtonText}>Editar</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => router.push(`/gestion/planes-suscripcion?localId=${local.id}`)}
                    >
                      <IconSymbol name="creditcard" size={18} color={colors.primary} />
                      <Text style={styles.actionButtonText}>Plan</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={[styles.actionButton, styles.actionButtonPrimary]}
                      onPress={() => router.push(`/gestion/panel-analisis?localId=${local.id}`)}
                    >
                      <IconSymbol name="chart.bar.fill" size={18} color={colors.white} />
                      <Text style={[styles.actionButtonText, styles.actionButtonTextPrimary]}>Analíticas</Text>
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
              <View style={styles.addNewButtonContent}>
                <IconSymbol name="plus.circle.fill" size={24} color={colors.primary} />
                <Text style={styles.addNewButtonText}>Añadir Nuevo Local</Text>
              </View>
            </TouchableOpacity>
          </React.Fragment>
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
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.headerText,
  },
  addButton: {
    padding: 8,
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    marginTop: 80,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.cardBackground,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 2,
    borderColor: colors.cardBorder,
    borderStyle: 'dashed',
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  createButton: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
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
    fontWeight: 'bold',
  },
  selectorSection: {
    backgroundColor: colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  selectorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  selectorTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selectorTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  selectorCount: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  selectorDescription: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 16,
  },
  selectorScroll: {
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  selectorCard: {
    width: 100,
    marginRight: 12,
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: colors.background,
  },
  selectorCardActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  selectorImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginBottom: 8,
  },
  selectorImagePlaceholder: {
    backgroundColor: colors.cardBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectorName: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  selectorCheckmark: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  localesSection: {
    padding: 16,
  },
  localesSectionHeader: {
    marginBottom: 16,
  },
  localesSectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  localesSectionSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  localCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  localCardHeader: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 12,
  },
  localCardImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
  },
  localCardImagePlaceholder: {
    backgroundColor: colors.cardBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  localCardHeaderInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  localCardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  localCardNombre: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  activeBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  activeBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: colors.headerText,
  },
  localCardTipo: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  planBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  planBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1E40AF',
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  statDivider: {
    width: 1,
    backgroundColor: colors.cardBorder,
    marginHorizontal: 16,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  featuredSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  featuredInfo: {
    flex: 1,
  },
  featuredTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  featuredTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  featuredSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  featuredToggle: {
    width: 52,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.cardBorder,
    padding: 2,
    justifyContent: 'center',
  },
  featuredToggleActive: {
    backgroundColor: colors.primary,
  },
  featuredToggleDisabled: {
    opacity: 0.5,
  },
  featuredToggleKnob: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  featuredToggleKnobActive: {
    alignSelf: 'flex-end',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  actionButtonPrimary: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  actionButtonTextPrimary: {
    color: colors.white,
  },
  addNewButton: {
    margin: 16,
    marginTop: 0,
    marginBottom: 100,
    borderRadius: 12,
    backgroundColor: colors.cardBackground,
    borderWidth: 2,
    borderColor: colors.primary,
    borderStyle: 'dashed',
  },
  addNewButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  addNewButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
});
