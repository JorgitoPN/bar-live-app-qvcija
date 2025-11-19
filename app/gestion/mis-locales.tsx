
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
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { useAuth } from '@/contexts/AuthContext';
import { useSelectedLocal } from '@/contexts/SelectedLocalContext';
import { supabase } from '@/utils/supabase';

const { width } = Dimensions.get('window');
const CARD_WIDTH = Math.min(width - 32, 500);

// VERSION MARKER - Updated Design v3.0
const VERSION = 'v3.0-REVOLUTIONARY-DESIGN';

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

// Animated Card Component with Revolutionary Design
const LocalCard = ({ 
  local, 
  isActive, 
  onSelect, 
  onEdit, 
  onAnalytics, 
  onPlan, 
  onToggleDestacado,
  isUpdating 
}: {
  local: LocalWithPlan;
  isActive: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onAnalytics: () => void;
  onPlan: () => void;
  onToggleDestacado: () => void;
  isUpdating: boolean;
}) => {
  const [scaleAnim] = useState(new Animated.Value(1));
  const [pulseAnim] = useState(new Animated.Value(1));

  useEffect(() => {
    if (isActive) {
      // Pulsing animation for active card
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [isActive, pulseAnim]);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View 
      style={[
        styles.cardContainer,
        { transform: [{ scale: scaleAnim }] }
      ]}
    >
      <TouchableOpacity
        activeOpacity={0.9}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={isActive ? undefined : onSelect}
        disabled={isActive}
      >
        <View style={[
          styles.card,
          isActive && styles.cardActive
        ]}>
          {/* Background Image with Gradient Overlay */}
          <View style={styles.imageContainer}>
            {local.imagen_url ? (
              <Image 
                source={{ uri: local.imagen_url }} 
                style={styles.backgroundImage}
                resizeMode="cover"
              />
            ) : (
              <LinearGradient
                colors={['#667eea', '#764ba2']}
                style={styles.backgroundImage}
              >
                <IconSymbol name="building.2" size={80} color="rgba(255,255,255,0.3)" />
              </LinearGradient>
            )}
            
            {/* Dark Gradient Overlay */}
            <LinearGradient
              colors={['rgba(0,0,0,0.7)', 'rgba(0,0,0,0.3)', 'transparent']}
              style={styles.gradientOverlay}
            />

            {/* Active Pulse Indicator */}
            {isActive && (
              <Animated.View 
                style={[
                  styles.activePulse,
                  { transform: [{ scale: pulseAnim }] }
                ]}
              >
                <View style={styles.activePulseInner} />
              </Animated.View>
            )}

            {/* Top Badges Row */}
            <View style={styles.topBadges}>
              {/* Plan Badge */}
              <BlurView intensity={80} tint="dark" style={styles.planBadgeBlur}>
                <LinearGradient
                  colors={
                    local.plan_nombre === 'premium' 
                      ? ['#FFD700', '#FFA500']
                      : local.plan_nombre === 'profesional'
                      ? ['#4F46E5', '#7C3AED']
                      : ['#6B7280', '#9CA3AF']
                  }
                  style={styles.planBadgeGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <IconSymbol 
                    name={
                      local.plan_nombre === 'premium' ? 'star.fill' :
                      local.plan_nombre === 'profesional' ? 'star.fill' :
                      'circle'
                    }
                    size={12} 
                    color="#FFFFFF" 
                  />
                  <Text style={styles.planBadgeText}>
                    {local.plan_nombre.toUpperCase()}
                  </Text>
                </LinearGradient>
              </BlurView>

              {/* Destacado Badge */}
              {local.destacado && (
                <BlurView intensity={80} tint="dark" style={styles.destacadoBadgeBlur}>
                  <View style={styles.destacadoBadge}>
                    <IconSymbol name="star.fill" size={12} color="#FFD700" />
                    <Text style={styles.destacadoBadgeText}>DESTACADO</Text>
                  </View>
                </BlurView>
              )}
            </View>

            {/* Active Status Banner */}
            {isActive && (
              <View style={styles.activeStatusBanner}>
                <BlurView intensity={90} tint="dark" style={styles.activeStatusBlur}>
                  <LinearGradient
                    colors={['rgba(16, 185, 129, 0.9)', 'rgba(5, 150, 105, 0.9)']}
                    style={styles.activeStatusGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <View style={styles.activeStatusDot} />
                    <Text style={styles.activeStatusText}>LOCAL ACTIVO</Text>
                    <IconSymbol name="checkmark.circle.fill" size={16} color="#FFFFFF" />
                  </LinearGradient>
                </BlurView>
              </View>
            )}
          </View>

          {/* Content Section with Glass Effect */}
          <BlurView intensity={95} tint="light" style={styles.contentBlur}>
            <View style={styles.content}>
              {/* Title and Type */}
              <View style={styles.titleSection}>
                <Text style={styles.localName} numberOfLines={1}>
                  {local.nombre}
                </Text>
                <Text style={styles.localType}>{local.tipo}</Text>
              </View>

              {/* Stats Dashboard */}
              <View style={styles.statsRow}>
                {/* Followers */}
                <View style={styles.statItem}>
                  <View style={styles.statIconContainer}>
                    <IconSymbol name="person.2.fill" size={16} color={colors.primary} />
                  </View>
                  <View>
                    <Text style={styles.statValue}>{local.seguidores}</Text>
                    <Text style={styles.statLabel}>Seguidores</Text>
                  </View>
                </View>

                {/* Divider */}
                <View style={styles.statDivider} />

                {/* Destacados */}
                <View style={styles.statItem}>
                  <View style={styles.statIconContainer}>
                    <IconSymbol 
                      name={local.destacado ? "star.fill" : "star"} 
                      size={16} 
                      color={local.destacado ? "#FFD700" : colors.textSecondary} 
                    />
                  </View>
                  <View>
                    <Text style={styles.statValue}>
                      {local.destacado ? '1' : local.destacados_restantes}
                    </Text>
                    <Text style={styles.statLabel}>
                      {local.destacado ? 'Activo' : 'Créditos'}
                    </Text>
                  </View>
                </View>

                {/* Divider */}
                <View style={styles.statDivider} />

                {/* Status */}
                <View style={styles.statItem}>
                  <View style={[
                    styles.statIconContainer,
                    { backgroundColor: isActive ? '#10B98120' : '#6B728020' }
                  ]}>
                    <IconSymbol 
                      name={isActive ? "checkmark.circle.fill" : "circle"} 
                      size={16} 
                      color={isActive ? '#10B981' : colors.textSecondary} 
                    />
                  </View>
                  <View>
                    <Text style={styles.statValue}>
                      {isActive ? 'ON' : 'OFF'}
                    </Text>
                    <Text style={styles.statLabel}>Estado</Text>
                  </View>
                </View>
              </View>

              {/* Floating Action Buttons - SINGLE ROW */}
              <View style={styles.actionButtons}>
                {!isActive && (
                  <TouchableOpacity 
                    style={[styles.actionBtn, styles.actionBtnPrimary]}
                    onPress={onSelect}
                  >
                    <LinearGradient
                      colors={[colors.headerGradientStart, colors.headerGradientEnd]}
                      style={styles.actionBtnGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <IconSymbol name="checkmark.circle.fill" size={16} color="#FFFFFF" />
                      <Text style={styles.actionBtnTextPrimary}>Perfil</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                )}

                <TouchableOpacity 
                  style={styles.actionBtn}
                  onPress={onEdit}
                >
                  <View style={styles.actionBtnContent}>
                    <IconSymbol name="pencil" size={16} color={colors.primary} />
                    <Text style={styles.actionBtnText}>Editar</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.actionBtn}
                  onPress={onAnalytics}
                >
                  <View style={styles.actionBtnContent}>
                    <IconSymbol name="sparkles" size={16} color={colors.primary} />
                    <Text style={styles.actionBtnText}>Análisis</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.actionBtn}
                  onPress={onPlan}
                >
                  <View style={styles.actionBtnContent}>
                    <IconSymbol name="creditcard.fill" size={16} color={colors.primary} />
                    <Text style={styles.actionBtnText}>Plan</Text>
                  </View>
                </TouchableOpacity>
              </View>

              {/* Destacado Toggle */}
              <TouchableOpacity
                style={styles.destacadoToggle}
                onPress={onToggleDestacado}
                disabled={isUpdating}
              >
                {isUpdating ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <View style={styles.destacadoToggleContent}>
                    <IconSymbol
                      name={local.destacado ? 'star.fill' : 'star'}
                      size={18}
                      color={local.destacado ? '#FFD700' : colors.textSecondary}
                    />
                    <Text style={[
                      styles.destacadoToggleText,
                      local.destacado && styles.destacadoToggleTextActive
                    ]}>
                      {local.destacado ? 'Quitar Destacado' : 'Destacar Local'}
                    </Text>
                    {!local.destacado && local.destacados_restantes > 0 && (
                      <View style={styles.creditBadge}>
                        <Text style={styles.creditBadgeText}>
                          {local.destacados_restantes}
                        </Text>
                      </View>
                    )}
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </BlurView>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

export default function MisLocalesScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { selectedLocalId, setSelectedLocalId, refreshLocales } = useSelectedLocal();
  const [locales, setLocales] = useState<LocalWithPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingDestacado, setUpdatingDestacado] = useState<string | null>(null);

  // Log version on mount
  useEffect(() => {
    console.log(`🎨 [MisLocales] Loaded ${VERSION}`);
  }, []);

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
      {/* Header */}
      <LinearGradient
        colors={[colors.headerGradientStart, colors.headerGradientEnd]}
        style={styles.header}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <IconSymbol name="chevron.left" size={24} color={colors.headerText} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Mis Locales {VERSION}</Text>
            <Text style={styles.headerSubtitle}>
              {locales.length} {locales.length === 1 ? 'local' : 'locales'}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => router.push('/crear/local')}
          >
            <IconSymbol name="plus.circle.fill" size={28} color={colors.headerText} />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {locales.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}>
              <LinearGradient
                colors={['rgba(20, 184, 166, 0.1)', 'rgba(6, 182, 212, 0.1)']}
                style={styles.emptyIconGradient}
              >
                <IconSymbol name="building.2" size={80} color={colors.primary} />
              </LinearGradient>
            </View>
            <Text style={styles.emptyTitle}>No tienes locales</Text>
            <Text style={styles.emptyText}>
              Crea tu primer local para gestionar eventos, promociones y conectar con tu audiencia
            </Text>
            <TouchableOpacity
              style={styles.createButton}
              onPress={() => router.push('/crear/local')}
            >
              <LinearGradient
                colors={[colors.headerGradientStart, colors.headerGradientEnd]}
                style={styles.createGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <IconSymbol name="plus.circle.fill" size={24} color={colors.headerText} />
                <Text style={styles.createButtonText}>Crear Mi Primer Local</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.cardsContainer}>
            {locales.map((local) => (
              <LocalCard
                key={local.id}
                local={local}
                isActive={selectedLocalId === local.id}
                onSelect={() => handleSelectLocal(local.id)}
                onEdit={() => router.push(`/editar/local?id=${local.id}`)}
                onAnalytics={() => router.push(`/gestion/panel-analisis?localId=${local.id}`)}
                onPlan={() => router.push(`/gestion/planes-suscripcion?localId=${local.id}`)}
                onToggleDestacado={() => handleToggleDestacado(local)}
                isUpdating={updatingDestacado === local.id}
              />
            ))}

            {/* Add New Card */}
            <TouchableOpacity
              style={styles.addNewCard}
              onPress={() => router.push('/crear/local')}
            >
              <LinearGradient
                colors={['rgba(20, 184, 166, 0.05)', 'rgba(6, 182, 212, 0.05)']}
                style={styles.addNewCardGradient}
              >
                <View style={styles.addNewIconContainer}>
                  <IconSymbol name="plus.circle.fill" size={48} color={colors.primary} />
                </View>
                <Text style={styles.addNewTitle}>Añadir Nuevo Local</Text>
                <Text style={styles.addNewSubtitle}>
                  Expande tu presencia digital
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
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
    paddingTop: Platform.OS === 'ios' ? 50 : 48,
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
    width: 40,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.headerText,
  },
  headerSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
  addButton: {
    padding: 4,
    width: 40,
    alignItems: 'flex-end',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
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
    paddingHorizontal: 32,
    paddingTop: 80,
  },
  emptyIconContainer: {
    marginBottom: 24,
  },
  emptyIconGradient: {
    width: 160,
    height: 160,
    borderRadius: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  createButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  createGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
  },
  createButtonText: {
    color: colors.headerText,
    fontSize: 17,
    fontWeight: 'bold',
  },
  cardsContainer: {
    gap: 20,
  },
  cardContainer: {
    width: '100%',
  },
  card: {
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: colors.cardBackground,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  cardActive: {
    shadowColor: colors.primary,
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 12,
  },
  imageContainer: {
    height: 200,
    position: 'relative',
  },
  backgroundImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  gradientOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 120,
  },
  activePulse: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
  },
  activePulseInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  topBadges: {
    position: 'absolute',
    top: 16,
    left: 16,
    flexDirection: 'row',
    gap: 8,
  },
  planBadgeBlur: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  planBadgeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  planBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  destacadoBadgeBlur: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  destacadoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  destacadoBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  activeStatusBanner: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  activeStatusBlur: {
    overflow: 'hidden',
  },
  activeStatusGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
  },
  activeStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  activeStatusText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  contentBlur: {
    overflow: 'hidden',
  },
  content: {
    padding: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
  },
  titleSection: {
    marginBottom: 16,
  },
  localName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  localType: {
    fontSize: 14,
    color: colors.textSecondary,
    textTransform: 'capitalize',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderRadius: 16,
    padding: 16,
  },
  statItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
  },
  statLabel: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.cardBorder,
    marginHorizontal: 4,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  actionBtn: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  actionBtnPrimary: {
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  actionBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
  },
  actionBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 12,
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  actionBtnTextPrimary: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  destacadoToggle: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  destacadoToggleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  destacadoToggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  destacadoToggleTextActive: {
    color: '#FFD700',
  },
  creditBadge: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  creditBadgeText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  addNewCard: {
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: colors.primary,
    borderStyle: 'dashed',
  },
  addNewCardGradient: {
    paddingVertical: 48,
    alignItems: 'center',
  },
  addNewIconContainer: {
    marginBottom: 16,
  },
  addNewTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  addNewSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
});
