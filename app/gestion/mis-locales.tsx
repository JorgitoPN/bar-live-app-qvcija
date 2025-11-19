
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
          style={styles.compactHeader}
        >
          <View style={styles.headerRow}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <IconSymbol name="chevron.left" size={24} color={colors.headerText} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Mis Locales</Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => router.push('/crear/local')}
            >
              <IconSymbol name="plus" size={24} color={colors.headerText} />
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
        style={styles.compactHeader}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <IconSymbol name="chevron.left" size={24} color={colors.headerText} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Mis Locales</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => router.push('/crear/local')}
          >
            <IconSymbol name="plus" size={24} color={colors.headerText} />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        {locales.length === 0 ? (
          <View style={styles.emptyContainer}>
            <IconSymbol name="building.2" size={64} color={colors.textSecondary} />
            <Text style={styles.emptyTitle}>No tienes locales registrados</Text>
            <Text style={styles.emptyText}>
              Crea tu primer local para empezar a gestionar eventos y promociones
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
                <Text style={styles.createButtonText}>Crear Local</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Compact Local Selector */}
            {locales.length > 1 && (
              <View style={styles.compactSelectorContainer}>
                <Text style={styles.compactSelectorTitle}>Local Activo</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.selectorScroll}>
                  {locales.map((local) => (
                    <TouchableOpacity
                      key={local.id}
                      style={[
                        styles.compactSelectorCard,
                        selectedLocalId === local.id && styles.compactSelectorCardActive,
                      ]}
                      onPress={() => handleSelectLocal(local.id)}
                    >
                      {local.imagen_url ? (
                        <Image source={{ uri: local.imagen_url }} style={styles.compactSelectorImage} />
                      ) : (
                        <View style={[styles.compactSelectorImage, styles.compactSelectorImagePlaceholder]}>
                          <IconSymbol name="building.2" size={24} color={colors.textSecondary} />
                        </View>
                      )}
                      <Text style={styles.compactSelectorName} numberOfLines={1}>
                        {local.nombre}
                      </Text>
                      {selectedLocalId === local.id && (
                        <View style={styles.compactSelectorCheck}>
                          <IconSymbol name="checkmark.circle.fill" size={16} color={colors.primary} />
                        </View>
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Compact Local Cards */}
            <View style={styles.localesContainer}>
              {locales.map((local) => (
                <View key={local.id} style={styles.compactLocalCard}>
                  <View style={styles.localCardHeader}>
                    {local.imagen_url ? (
                      <Image source={{ uri: local.imagen_url }} style={styles.compactLocalImage} />
                    ) : (
                      <View style={[styles.compactLocalImage, styles.compactLocalImagePlaceholder]}>
                        <IconSymbol name="building.2" size={28} color={colors.textSecondary} />
                      </View>
                    )}
                    
                    <View style={styles.localCardInfo}>
                      <View style={styles.localCardTitleRow}>
                        <Text style={styles.compactLocalNombre} numberOfLines={1}>{local.nombre}</Text>
                        {selectedLocalId === local.id && (
                          <View style={styles.compactActiveBadge}>
                            <Text style={styles.compactActiveBadgeText}>ACTIVO</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.compactLocalTipo}>
                        {local.tipo.charAt(0).toUpperCase() + local.tipo.slice(1)}
                      </Text>
                      
                      <View style={styles.compactStatsRow}>
                        <View style={styles.compactStat}>
                          <IconSymbol name="person.2" size={14} color={colors.textSecondary} />
                          <Text style={styles.compactStatText}>{local.seguidores}</Text>
                        </View>
                        <View style={styles.compactPlanBadge}>
                          <Text style={styles.compactPlanText}>{local.plan_nombre.toUpperCase()}</Text>
                        </View>
                      </View>
                    </View>
                  </View>

                  {/* Destacado Section */}
                  <View style={styles.compactDestacadoSection}>
                    <View style={styles.compactDestacadoInfo}>
                      <IconSymbol name="star.fill" size={16} color={colors.badgeDestacado} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.compactDestacadoTitle}>Destacado</Text>
                        <Text style={styles.compactDestacadoSubtitle}>
                          {local.destacados_restantes > 0
                            ? `${local.destacados_restantes} disponibles`
                            : 'Sin créditos'}
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={[
                          styles.compactDestacadoButton,
                          local.destacado && styles.compactDestacadoButtonActive,
                          updatingDestacado === local.id && styles.compactDestacadoButtonDisabled,
                        ]}
                        onPress={() => handleToggleDestacado(local)}
                        disabled={updatingDestacado === local.id}
                      >
                        {updatingDestacado === local.id ? (
                          <ActivityIndicator size="small" color={colors.primary} />
                        ) : (
                          <IconSymbol
                            name={local.destacado ? 'star.fill' : 'star'}
                            size={18}
                            color={local.destacado ? colors.badgeDestacado : colors.textSecondary}
                          />
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Compact Actions */}
                  <View style={styles.compactActions}>
                    <TouchableOpacity
                      style={styles.compactActionButton}
                      onPress={() => router.push(`/editar/local?id=${local.id}`)}
                    >
                      <IconSymbol name="pencil" size={16} color={colors.primary} />
                      <Text style={styles.compactActionText}>Editar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.compactActionButton}
                      onPress={() => router.push(`/gestion/panel-analisis?localId=${local.id}`)}
                    >
                      <IconSymbol name="chart.bar.fill" size={16} color={colors.primary} />
                      <Text style={styles.compactActionText}>Análisis</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.compactActionButton}
                      onPress={() => router.push(`/gestion/planes-suscripcion?localId=${local.id}`)}
                    >
                      <IconSymbol name="creditcard" size={16} color={colors.primary} />
                      <Text style={styles.compactActionText}>Plan</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          </>
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
  compactHeader: {
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
    paddingBottom: 12,
    paddingHorizontal: 16,
  },
  headerRow: {
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
  scrollContent: {
    paddingBottom: 100,
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
    marginTop: 100,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 20,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
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
  compactSelectorContainer: {
    padding: 16,
    backgroundColor: colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  compactSelectorTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 10,
  },
  selectorScroll: {
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  compactSelectorCard: {
    width: 80,
    marginRight: 10,
    alignItems: 'center',
    padding: 8,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: colors.background,
  },
  compactSelectorCardActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  compactSelectorImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginBottom: 6,
  },
  compactSelectorImagePlaceholder: {
    backgroundColor: colors.cardBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  compactSelectorName: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  compactSelectorCheck: {
    position: 'absolute',
    top: 4,
    right: 4,
  },
  localesContainer: {
    padding: 16,
    gap: 12,
  },
  compactLocalCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  localCardHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  compactLocalImage: {
    width: 70,
    height: 70,
    borderRadius: 8,
  },
  compactLocalImagePlaceholder: {
    backgroundColor: colors.cardBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  localCardInfo: {
    flex: 1,
    marginLeft: 12,
  },
  localCardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  compactLocalNombre: {
    flex: 1,
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
  },
  compactActiveBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  compactActiveBadgeText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: colors.headerText,
  },
  compactLocalTipo: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  compactStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  compactStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  compactStatText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  compactPlanBadge: {
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  compactPlanText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#1E40AF',
  },
  compactDestacadoSection: {
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  compactDestacadoInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  compactDestacadoTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  compactDestacadoSubtitle: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  compactDestacadoButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.cardBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  compactDestacadoButtonActive: {
    backgroundColor: colors.badgeDestacado + '30',
  },
  compactDestacadoButtonDisabled: {
    opacity: 0.5,
  },
  compactActions: {
    flexDirection: 'row',
    gap: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
  },
  compactActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    backgroundColor: colors.background,
    borderRadius: 8,
  },
  compactActionText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
});
