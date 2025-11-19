
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
              <IconSymbol name="chevron.left" size={24} color={colors.headerText} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Gestión de Locales</Text>
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
      {/* Centered Header */}
      <LinearGradient
        colors={[colors.headerGradientStart, colors.headerGradientEnd]}
        style={styles.header}
      >
        <View style={styles.headerRow}>
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
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        <View style={styles.centeredContainer}>
          {locales.length === 0 ? (
            <View style={styles.emptyContainer}>
              <IconSymbol name="building.2" size={80} color={colors.textSecondary} />
              <Text style={styles.emptyTitle}>No tienes locales registrados</Text>
              <Text style={styles.emptyText}>
                Crea tu primer local para empezar a gestionar eventos, promociones y analíticas
              </Text>
              <TouchableOpacity
                style={styles.createButton}
                onPress={() => router.push('/crear/local')}
              >
                <LinearGradient
                  colors={[colors.headerGradientStart, colors.headerGradientEnd]}
                  style={styles.createGradient}
                >
                  <IconSymbol name="plus" size={22} color={colors.headerText} />
                  <Text style={styles.createButtonText}>Crear Mi Primer Local</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {/* Active Local Indicator */}
              {locales.length > 1 && (
                <View style={styles.activeLocalBanner}>
                  <IconSymbol name="checkmark.circle.fill" size={20} color={colors.primary} />
                  <Text style={styles.activeLocalText}>
                    Local activo: <Text style={styles.activeLocalName}>
                      {locales.find(l => l.id === selectedLocalId)?.nombre || 'Ninguno'}
                    </Text>
                  </Text>
                </View>
              )}

              {/* Compact Local Cards */}
              <View style={styles.localesGrid}>
                {locales.map((local) => (
                  <View key={local.id} style={styles.localCard}>
                    {/* Card Header with Image and Info */}
                    <View style={styles.cardHeader}>
                      {local.imagen_url ? (
                        <Image source={{ uri: local.imagen_url }} style={styles.localImage} />
                      ) : (
                        <View style={[styles.localImage, styles.localImagePlaceholder]}>
                          <IconSymbol name="building.2" size={32} color={colors.textSecondary} />
                        </View>
                      )}
                      
                      <View style={styles.cardInfo}>
                        <View style={styles.cardTitleRow}>
                          <Text style={styles.localNombre} numberOfLines={1}>{local.nombre}</Text>
                          {selectedLocalId === local.id && (
                            <View style={styles.activeBadge}>
                              <IconSymbol name="checkmark.circle.fill" size={14} color="#FFFFFF" />
                            </View>
                          )}
                        </View>
                        <Text style={styles.localTipo}>
                          {local.tipo.charAt(0).toUpperCase() + local.tipo.slice(1)}
                        </Text>
                        
                        <View style={styles.statsRow}>
                          <View style={styles.stat}>
                            <IconSymbol name="person.2" size={14} color={colors.textSecondary} />
                            <Text style={styles.statText}>{local.seguidores}</Text>
                          </View>
                          <View style={[styles.planBadge, { backgroundColor: local.plan_nombre === 'premium' ? '#DBEAFE' : '#F3F4F6' }]}>
                            <Text style={[styles.planText, { color: local.plan_nombre === 'premium' ? '#1E40AF' : '#6B7280' }]}>
                              {local.plan_nombre.toUpperCase()}
                            </Text>
                          </View>
                        </View>
                      </View>
                    </View>

                    {/* Destacado Toggle */}
                    <View style={styles.destacadoSection}>
                      <View style={styles.destacadoInfo}>
                        <IconSymbol name="star.fill" size={18} color={local.destacado ? colors.badgeDestacado : colors.textSecondary} />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.destacadoTitle}>
                            {local.destacado ? 'Destacado Activo' : 'Destacar Local'}
                          </Text>
                          <Text style={styles.destacadoSubtitle}>
                            {local.destacados_restantes > 0
                              ? `${local.destacados_restantes} crédito${local.destacados_restantes > 1 ? 's' : ''} disponible${local.destacados_restantes > 1 ? 's' : ''}`
                              : 'Sin créditos disponibles'}
                          </Text>
                        </View>
                        <TouchableOpacity
                          style={[
                            styles.destacadoToggle,
                            local.destacado && styles.destacadoToggleActive,
                            updatingDestacado === local.id && styles.destacadoToggleDisabled,
                          ]}
                          onPress={() => handleToggleDestacado(local)}
                          disabled={updatingDestacado === local.id}
                        >
                          {updatingDestacado === local.id ? (
                            <ActivityIndicator size="small" color={colors.primary} />
                          ) : (
                            <IconSymbol
                              name={local.destacado ? 'star.fill' : 'star'}
                              size={20}
                              color={local.destacado ? colors.badgeDestacado : colors.textSecondary}
                            />
                          )}
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Action Buttons */}
                    <View style={styles.actions}>
                      {selectedLocalId !== local.id && (
                        <TouchableOpacity
                          style={[styles.actionButton, styles.actionButtonPrimary]}
                          onPress={() => handleSelectLocal(local.id)}
                        >
                          <IconSymbol name="checkmark.circle" size={18} color="#FFFFFF" />
                          <Text style={styles.actionTextPrimary}>Activar</Text>
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => router.push(`/editar/local?id=${local.id}`)}
                      >
                        <IconSymbol name="pencil" size={18} color={colors.primary} />
                        <Text style={styles.actionText}>Editar</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => router.push(`/gestion/panel-analisis?localId=${local.id}`)}
                      >
                        <IconSymbol name="chart.bar.fill" size={18} color={colors.primary} />
                        <Text style={styles.actionText}>Análisis</Text>
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
                ))}
              </View>

              {/* Add New Local Button */}
              <TouchableOpacity
                style={styles.addNewButton}
                onPress={() => router.push('/crear/local')}
              >
                <IconSymbol name="plus.circle.fill" size={24} color={colors.primary} />
                <Text style={styles.addNewText}>Añadir Nuevo Local</Text>
              </TouchableOpacity>
            </>
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
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
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
  centeredContainer: {
    maxWidth: CONTENT_MAX_WIDTH,
    width: '100%',
    alignSelf: 'center',
    padding: 16,
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
  emptyTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 24,
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  createButton: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  createGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 16,
    paddingHorizontal: 32,
  },
  createButtonText: {
    color: colors.headerText,
    fontSize: 17,
    fontWeight: 'bold',
  },
  activeLocalBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.primary + '15',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  activeLocalText: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
  },
  activeLocalName: {
    fontWeight: 'bold',
    color: colors.primary,
  },
  localesGrid: {
    gap: 16,
  },
  localCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  cardHeader: {
    flexDirection: 'row',
    marginBottom: 16,
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
  cardInfo: {
    flex: 1,
    marginLeft: 14,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  localNombre: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  activeBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  localTipo: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 10,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  planBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  planText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  destacadoSection: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  destacadoInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  destacadoTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  destacadoSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  destacadoToggle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.cardBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  destacadoToggleActive: {
    backgroundColor: colors.badgeDestacado + '30',
  },
  destacadoToggleDisabled: {
    opacity: 0.5,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    backgroundColor: colors.background,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  actionButtonPrimary: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  actionTextPrimary: {
    fontSize: 14,
    fontWeight: '600',
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
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
});
