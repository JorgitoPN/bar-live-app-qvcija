
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
            <IconSymbol name="chevron.left" size={22} color={colors.headerText} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Mis Locales</Text>
          <TouchableOpacity style={styles.addButton} onPress={() => router.push('/crear/local')}>
            <IconSymbol name="plus" size={22} color={colors.headerText} />
          </TouchableOpacity>
        </LinearGradient>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Cargando...</Text>
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
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <IconSymbol name="chevron.left" size={22} color={colors.headerText} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mis Locales</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => router.push('/crear/local')}>
          <IconSymbol name="plus" size={22} color={colors.headerText} />
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {locales.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}>
              <IconSymbol name="building.2" size={48} color={colors.textSecondary} />
            </View>
            <Text style={styles.emptyTitle}>Sin Locales</Text>
            <Text style={styles.emptyText}>
              Crea tu primer local para gestionar eventos y conectar con tu audiencia
            </Text>
            <TouchableOpacity style={styles.createButton} onPress={() => router.push('/crear/local')}>
              <LinearGradient
                colors={[colors.headerGradientStart, colors.headerGradientEnd]}
                style={styles.createGradient}
              >
                <IconSymbol name="plus" size={18} color={colors.headerText} />
                <Text style={styles.createButtonText}>Crear Local</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        ) : (
          <React.Fragment>
            {/* Active Local Selector - Compact Horizontal */}
            {locales.length > 1 && (
              <View style={styles.selectorSection}>
                <View style={styles.selectorHeader}>
                  <IconSymbol name="checkmark.circle.fill" size={16} color={colors.primary} />
                  <Text style={styles.selectorTitle}>Local Activo</Text>
                  <View style={styles.selectorBadge}>
                    <Text style={styles.selectorBadgeText}>{locales.length}</Text>
                  </View>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.selectorScroll}>
                  {locales.map((local) => (
                    <TouchableOpacity
                      key={local.id}
                      style={[styles.selectorCard, selectedLocalId === local.id && styles.selectorCardActive]}
                      onPress={() => handleSelectLocal(local.id)}
                    >
                      {local.imagen_url ? (
                        <Image source={{ uri: local.imagen_url }} style={styles.selectorImage} />
                      ) : (
                        <View style={[styles.selectorImage, styles.selectorImagePlaceholder]}>
                          <IconSymbol name="building.2" size={20} color={colors.textSecondary} />
                        </View>
                      )}
                      <Text style={styles.selectorName} numberOfLines={1}>{local.nombre}</Text>
                      {selectedLocalId === local.id && (
                        <View style={styles.selectorCheck}>
                          <IconSymbol name="checkmark" size={12} color={colors.primary} />
                        </View>
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Locales Grid - Compact Cards */}
            <View style={styles.localesGrid}>
              {locales.map((local) => (
                <View key={local.id} style={styles.localCard}>
                  {/* Card Image Header */}
                  <View style={styles.cardImageContainer}>
                    {local.imagen_url ? (
                      <Image source={{ uri: local.imagen_url }} style={styles.cardImage} />
                    ) : (
                      <View style={[styles.cardImage, styles.cardImagePlaceholder]}>
                        <IconSymbol name="building.2" size={32} color={colors.textSecondary} />
                      </View>
                    )}
                    {selectedLocalId === local.id && (
                      <View style={styles.activeBadge}>
                        <Text style={styles.activeBadgeText}>ACTIVO</Text>
                      </View>
                    )}
                    <View style={[styles.planBadge, { backgroundColor: local.plan_nombre === 'premium' ? '#F59E0B' : '#3B82F6' }]}>
                      <IconSymbol name="star.fill" size={10} color="#FFFFFF" />
                      <Text style={styles.planBadgeText}>{local.plan_nombre.toUpperCase()}</Text>
                    </View>
                  </View>

                  {/* Card Content */}
                  <View style={styles.cardContent}>
                    <Text style={styles.cardNombre} numberOfLines={1}>{local.nombre}</Text>
                    <Text style={styles.cardTipo}>{local.tipo.charAt(0).toUpperCase() + local.tipo.slice(1)}</Text>

                    {/* Compact Stats Row */}
                    <View style={styles.compactStats}>
                      <View style={styles.compactStat}>
                        <IconSymbol name="person.2.fill" size={14} color="#3B82F6" />
                        <Text style={styles.compactStatText}>{local.seguidores.toLocaleString()}</Text>
                      </View>
                      <View style={styles.statDivider} />
                      <View style={styles.compactStat}>
                        <IconSymbol name="star.fill" size={14} color="#F59E0B" />
                        <Text style={styles.compactStatText}>{local.destacados_restantes}</Text>
                      </View>
                    </View>

                    {/* Featured Toggle - Inline */}
                    <View style={styles.featuredRow}>
                      <View style={styles.featuredInfo}>
                        <IconSymbol name="star.fill" size={12} color={local.destacado ? colors.badgeDestacado : colors.textSecondary} />
                        <Text style={styles.featuredText}>Destacado</Text>
                      </View>
                      <TouchableOpacity
                        style={[styles.miniToggle, local.destacado && styles.miniToggleActive]}
                        onPress={() => handleToggleDestacado(local)}
                        disabled={updatingDestacado === local.id}
                      >
                        {updatingDestacado === local.id ? (
                          <ActivityIndicator size="small" color={colors.primary} />
                        ) : (
                          <View style={[styles.miniToggleKnob, local.destacado && styles.miniToggleKnobActive]} />
                        )}
                      </TouchableOpacity>
                    </View>

                    {/* Action Buttons - Compact */}
                    <View style={styles.actionsRow}>
                      <TouchableOpacity
                        style={styles.actionBtn}
                        onPress={() => router.push(`/editar/local?id=${local.id}`)}
                      >
                        <IconSymbol name="pencil" size={16} color={colors.primary} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.actionBtn}
                        onPress={() => router.push(`/gestion/planes-suscripcion?localId=${local.id}`)}
                      >
                        <IconSymbol name="creditcard" size={16} color={colors.primary} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionBtn, styles.actionBtnPrimary]}
                        onPress={() => router.push(`/gestion/panel-analisis?localId=${local.id}`)}
                      >
                        <IconSymbol name="chart.bar.fill" size={16} color={colors.white} />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ))}

              {/* Add New Card */}
              <TouchableOpacity style={styles.addCard} onPress={() => router.push('/crear/local')}>
                <IconSymbol name="plus.circle.fill" size={40} color={colors.primary} />
                <Text style={styles.addCardText}>Añadir Local</Text>
              </TouchableOpacity>
            </View>
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
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
    paddingBottom: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.headerText,
  },
  addButton: {
    padding: 4,
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    marginTop: 60,
  },
  emptyIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.cardBackground,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: colors.cardBorder,
    borderStyle: 'dashed',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  createButton: {
    borderRadius: 10,
    overflow: 'hidden',
  },
  createGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  createButtonText: {
    color: colors.headerText,
    fontSize: 14,
    fontWeight: 'bold',
  },
  selectorSection: {
    backgroundColor: colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  selectorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  selectorTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text,
  },
  selectorBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  selectorBadgeText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: colors.white,
  },
  selectorScroll: {
    marginHorizontal: -12,
    paddingHorizontal: 12,
  },
  selectorCard: {
    width: 80,
    marginRight: 10,
    alignItems: 'center',
    padding: 8,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: colors.background,
  },
  selectorCardActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  selectorImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginBottom: 6,
  },
  selectorImagePlaceholder: {
    backgroundColor: colors.cardBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectorName: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  selectorCheck: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.primary,
  },
  localesGrid: {
    padding: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  localCard: {
    width: '48%',
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  cardImageContainer: {
    position: 'relative',
  },
  cardImage: {
    width: '100%',
    height: 120,
  },
  cardImagePlaceholder: {
    backgroundColor: colors.cardBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  activeBadgeText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: colors.white,
  },
  planBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  planBadgeText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  cardContent: {
    padding: 10,
  },
  cardNombre: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 2,
  },
  cardTipo: {
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  compactStats: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 8,
    marginBottom: 8,
  },
  compactStat: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  statDivider: {
    width: 1,
    height: 16,
    backgroundColor: colors.cardBorder,
  },
  compactStatText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },
  featuredRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 8,
    marginBottom: 8,
  },
  featuredInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  featuredText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.text,
  },
  miniToggle: {
    width: 40,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.cardBorder,
    padding: 2,
    justifyContent: 'center',
  },
  miniToggleActive: {
    backgroundColor: colors.primary,
  },
  miniToggleKnob: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.white,
  },
  miniToggleKnobActive: {
    alignSelf: 'flex-end',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  actionBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  actionBtnPrimary: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  addCard: {
    width: '48%',
    height: 240,
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.primary,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  addCardText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
});
