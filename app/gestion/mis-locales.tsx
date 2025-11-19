
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
          style={styles.header}
        >
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
        <Text style={styles.headerTitle}>Mis Locales</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push('/crear/local')}
        >
          <IconSymbol name="plus" size={24} color={colors.headerText} />
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView style={styles.content}>
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
            {locales.length > 1 && (
              <View style={styles.selectorContainer}>
                <Text style={styles.selectorTitle}>Local Activo</Text>
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
                          <IconSymbol name="building.2" size={32} color={colors.textSecondary} />
                        </View>
                      )}
                      <Text style={styles.selectorName} numberOfLines={1}>
                        {local.nombre}
                      </Text>
                      {selectedLocalId === local.id && (
                        <View style={styles.selectorBadge}>
                          <IconSymbol name="checkmark.circle.fill" size={20} color={colors.primary} />
                        </View>
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            <View style={styles.localesContainer}>
              {locales.map((local) => (
                <View
                  key={local.id}
                  style={[commonStyles.card, commonStyles.cardShadow, styles.localCard]}
                >
                  {local.imagen_url ? (
                    <Image source={{ uri: local.imagen_url }} style={styles.localImage} />
                  ) : (
                    <View style={[styles.localImage, styles.localImagePlaceholder]}>
                      <IconSymbol name="building.2" size={40} color={colors.textSecondary} />
                    </View>
                  )}
                  <View style={styles.localInfo}>
                    <View style={styles.localHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.localNombre}>{local.nombre}</Text>
                        <Text style={styles.localTipo}>
                          {local.tipo.charAt(0).toUpperCase() + local.tipo.slice(1)}
                        </Text>
                      </View>
                      {selectedLocalId === local.id && (
                        <View style={styles.activeBadge}>
                          <Text style={styles.activeBadgeText}>ACTIVO</Text>
                        </View>
                      )}
                    </View>

                    <View style={styles.planBadge}>
                      <Text style={styles.planBadgeText}>
                        Plan: {local.plan_nombre.toUpperCase()}
                      </Text>
                    </View>

                    <View style={styles.statsContainer}>
                      <View style={styles.stat}>
                        <IconSymbol name="person.2" size={16} color={colors.textSecondary} />
                        <Text style={styles.statText}>{local.seguidores}</Text>
                      </View>
                    </View>

                    <View style={styles.destacadoContainer}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.destacadoTitle}>Local Destacado</Text>
                        <Text style={styles.destacadoSubtitle}>
                          {local.destacados_restantes > 0
                            ? `${local.destacados_restantes} destacados disponibles`
                            : 'Sin destacados disponibles'}
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={[
                          styles.destacadoButton,
                          local.destacado && styles.destacadoButtonActive,
                          updatingDestacado === local.id && styles.destacadoButtonDisabled,
                        ]}
                        onPress={() => handleToggleDestacado(local)}
                        disabled={updatingDestacado === local.id}
                      >
                        {updatingDestacado === local.id ? (
                          <ActivityIndicator size="small" color={colors.headerText} />
                        ) : (
                          <IconSymbol
                            name={local.destacado ? 'star.fill' : 'star'}
                            size={20}
                            color={local.destacado ? colors.badgeDestacado : colors.textSecondary}
                          />
                        )}
                      </TouchableOpacity>
                    </View>

                    <View style={styles.actions}>
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => router.push(`/editar/local?id=${local.id}`)}
                      >
                        <IconSymbol name="pencil" size={18} color={colors.primary} />
                        <Text style={styles.actionText}>Editar</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => router.push(`/gestion/planes-suscripcion?localId=${local.id}`)}
                      >
                        <IconSymbol name="creditcard" size={18} color={colors.primary} />
                        <Text style={styles.actionText}>Plan</Text>
                      </TouchableOpacity>
                    </View>
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
  selectorContainer: {
    padding: 16,
    backgroundColor: colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  selectorTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  selectorDescription: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 12,
  },
  selectorScroll: {
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  selectorCard: {
    width: 100,
    marginRight: 12,
    alignItems: 'center',
    padding: 8,
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
    width: 60,
    height: 60,
    borderRadius: 30,
    marginBottom: 8,
  },
  selectorImagePlaceholder: {
    backgroundColor: colors.cardBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectorName: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  selectorBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
  },
  localesContainer: {
    padding: 16,
  },
  localCard: {
    flexDirection: 'row',
    marginBottom: 16,
    padding: 12,
  },
  localImage: {
    width: 100,
    height: 100,
    borderRadius: 8,
  },
  localImagePlaceholder: {
    backgroundColor: colors.cardBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  localInfo: {
    flex: 1,
    marginLeft: 12,
  },
  localHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  localNombre: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  localTipo: {
    fontSize: 14,
    color: colors.textSecondary,
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
  planBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 8,
  },
  planBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1E40AF',
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  destacadoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  destacadoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  destacadoSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  destacadoButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.cardBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  destacadoButtonActive: {
    backgroundColor: colors.badgeDestacado + '30',
  },
  destacadoButtonDisabled: {
    opacity: 0.5,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
});
