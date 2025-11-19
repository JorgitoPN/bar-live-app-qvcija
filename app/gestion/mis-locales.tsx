
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

// REVOLUTIONARY DESIGN VERSION - TIMESTAMP FOR CACHE BUSTING
const DESIGN_VERSION = `REVOLUTIONARY-${Date.now()}`;
const BUILD_TIME = new Date().toLocaleString();

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

// Revolutionary Horizontal Card with Neumorphic Design
const RevolutionaryLocalCard = ({ 
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
  const [rotateAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    if (isActive) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(rotateAnim, {
            toValue: 1,
            duration: 3000,
            useNativeDriver: true,
          }),
          Animated.timing(rotateAnim, {
            toValue: 0,
            duration: 3000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [isActive, rotateAnim]);

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.98,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 3,
      useNativeDriver: true,
    }).start();
  };

  const getPlanGradient = () => {
    switch (local.plan_nombre) {
      case 'premium':
        return ['#FFD700', '#FFA500', '#FF6B6B'];
      case 'profesional':
        return ['#667eea', '#764ba2', '#f093fb'];
      default:
        return ['#667eea', '#764ba2'];
    }
  };

  return (
    <Animated.View 
      style={[
        styles.revolutionaryCard,
        { transform: [{ scale: scaleAnim }] }
      ]}
    >
      <TouchableOpacity
        activeOpacity={0.95}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={isActive ? undefined : onSelect}
        disabled={isActive}
        style={styles.cardTouchable}
      >
        {/* Neumorphic Container */}
        <View style={[
          styles.neumorphicCard,
          isActive && styles.neumorphicCardActive
        ]}>
          {/* Animated Border Gradient */}
          {isActive && (
            <Animated.View style={[
              styles.activeBorderGradient,
              { transform: [{ rotate }] }
            ]}>
              <LinearGradient
                colors={['#10B981', '#3B82F6', '#8B5CF6', '#10B981']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.borderGradientInner}
              />
            </Animated.View>
          )}

          {/* Card Content - Horizontal Layout */}
          <View style={styles.horizontalContent}>
            {/* Left: Image Section */}
            <View style={styles.imageSection}>
              {local.imagen_url ? (
                <Image 
                  source={{ uri: local.imagen_url }} 
                  style={styles.horizontalImage}
                  resizeMode="cover"
                />
              ) : (
                <LinearGradient
                  colors={getPlanGradient()}
                  style={styles.horizontalImage}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <IconSymbol 
                    ios_icon_name="building.2.fill" 
                    android_material_icon_name="business"
                    size={40} 
                    color="rgba(255,255,255,0.5)" 
                  />
                </LinearGradient>
              )}

              {/* Floating Plan Badge */}
              <View style={styles.floatingPlanBadge}>
                <LinearGradient
                  colors={getPlanGradient()}
                  style={styles.planBadgeGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <IconSymbol 
                    ios_icon_name={local.plan_nombre === 'premium' ? 'crown.fill' : 'star.fill'}
                    android_material_icon_name={local.plan_nombre === 'premium' ? 'workspace_premium' : 'star'}
                    size={10} 
                    color="#FFFFFF" 
                  />
                  <Text style={styles.planBadgeTextSmall}>
                    {local.plan_nombre.toUpperCase()}
                  </Text>
                </LinearGradient>
              </View>

              {/* Active Pulse Indicator */}
              {isActive && (
                <View style={styles.activePulseCorner}>
                  <View style={styles.pulseOuter}>
                    <View style={styles.pulseInner} />
                  </View>
                </View>
              )}
            </View>

            {/* Right: Info Section */}
            <View style={styles.infoSection}>
              {/* Title Row */}
              <View style={styles.titleRow}>
                <View style={styles.titleContainer}>
                  <Text style={styles.localNameHorizontal} numberOfLines={1}>
                    {local.nombre}
                  </Text>
                  <Text style={styles.localTypeHorizontal}>{local.tipo}</Text>
                </View>

                {/* Status Badge */}
                <View style={[
                  styles.statusBadge,
                  isActive ? styles.statusBadgeActive : styles.statusBadgeInactive
                ]}>
                  <View style={[
                    styles.statusDot,
                    isActive ? styles.statusDotActive : styles.statusDotInactive
                  ]} />
                  <Text style={[
                    styles.statusText,
                    isActive ? styles.statusTextActive : styles.statusTextInactive
                  ]}>
                    {isActive ? 'ACTIVO' : 'INACTIVO'}
                  </Text>
                </View>
              </View>

              {/* Compact Stats Row */}
              <View style={styles.compactStatsRow}>
                {/* Followers */}
                <View style={styles.compactStat}>
                  <IconSymbol 
                    ios_icon_name="person.2.fill" 
                    android_material_icon_name="people"
                    size={14} 
                    color={colors.primary} 
                  />
                  <Text style={styles.compactStatValue}>{local.seguidores}</Text>
                </View>

                <View style={styles.compactStatDivider} />

                {/* Destacado */}
                <View style={styles.compactStat}>
                  <IconSymbol 
                    ios_icon_name={local.destacado ? 'star.fill' : 'star'}
                    android_material_icon_name={local.destacado ? 'star' : 'star_border'}
                    size={14} 
                    color={local.destacado ? '#FFD700' : colors.textSecondary} 
                  />
                  <Text style={styles.compactStatValue}>
                    {local.destacado ? 'ON' : local.destacados_restantes}
                  </Text>
                </View>

                <View style={styles.compactStatDivider} />

                {/* Plan */}
                <View style={styles.compactStat}>
                  <IconSymbol 
                    ios_icon_name="creditcard.fill" 
                    android_material_icon_name="credit_card"
                    size={14} 
                    color={colors.primary} 
                  />
                  <Text style={styles.compactStatValue}>
                    {local.plan_nombre.substring(0, 4).toUpperCase()}
                  </Text>
                </View>
              </View>

              {/* Circular Action Buttons - Single Row */}
              <View style={styles.circularActionsRow}>
                {!isActive && (
                  <TouchableOpacity 
                    style={[styles.circularBtn, styles.circularBtnPrimary]}
                    onPress={onSelect}
                  >
                    <LinearGradient
                      colors={[colors.headerGradientStart, colors.headerGradientEnd]}
                      style={styles.circularBtnGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <IconSymbol 
                        ios_icon_name="checkmark.circle.fill" 
                        android_material_icon_name="check_circle"
                        size={18} 
                        color="#FFFFFF" 
                      />
                    </LinearGradient>
                  </TouchableOpacity>
                )}

                <TouchableOpacity 
                  style={styles.circularBtn}
                  onPress={onEdit}
                >
                  <View style={styles.circularBtnContent}>
                    <IconSymbol 
                      ios_icon_name="pencil" 
                      android_material_icon_name="edit"
                      size={18} 
                      color={colors.primary} 
                    />
                  </View>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.circularBtn}
                  onPress={onAnalytics}
                >
                  <View style={styles.circularBtnContent}>
                    <IconSymbol 
                      ios_icon_name="chart.bar.fill" 
                      android_material_icon_name="analytics"
                      size={18} 
                      color={colors.primary} 
                    />
                  </View>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.circularBtn}
                  onPress={onPlan}
                >
                  <View style={styles.circularBtnContent}>
                    <IconSymbol 
                      ios_icon_name="creditcard.fill" 
                      android_material_icon_name="credit_card"
                      size={18} 
                      color={colors.primary} 
                    />
                  </View>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.circularBtn}
                  onPress={onToggleDestacado}
                  disabled={isUpdating}
                >
                  {isUpdating ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <View style={styles.circularBtnContent}>
                      <IconSymbol 
                        ios_icon_name={local.destacado ? 'star.fill' : 'star'}
                        android_material_icon_name={local.destacado ? 'star' : 'star_border'}
                        size={18} 
                        color={local.destacado ? '#FFD700' : colors.textSecondary} 
                      />
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
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

  useEffect(() => {
    console.log(`🚀 [MisLocales] REVOLUTIONARY DESIGN LOADED - ${DESIGN_VERSION}`);
    console.log(`⏰ Build Time: ${BUILD_TIME}`);
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
              <IconSymbol 
                ios_icon_name="chevron.left" 
                android_material_icon_name="arrow_back"
                size={24} 
                color={colors.headerText} 
              />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Mis Locales</Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => router.push('/crear/local')}
            >
              <IconSymbol 
                ios_icon_name="plus" 
                android_material_icon_name="add"
                size={24} 
                color={colors.headerText} 
              />
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
      {/* Header with Version Info */}
      <LinearGradient
        colors={[colors.headerGradientStart, colors.headerGradientEnd]}
        style={styles.header}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <IconSymbol 
              ios_icon_name="chevron.left" 
              android_material_icon_name="arrow_back"
              size={24} 
              color={colors.headerText} 
            />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Gestión de Locales</Text>
            <Text style={styles.headerSubtitle}>
              {locales.length} {locales.length === 1 ? 'local' : 'locales'} • {BUILD_TIME}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => router.push('/crear/local')}
          >
            <IconSymbol 
              ios_icon_name="plus.circle.fill" 
              android_material_icon_name="add_circle"
              size={28} 
              color={colors.headerText} 
            />
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
                <IconSymbol 
                  ios_icon_name="building.2" 
                  android_material_icon_name="business"
                  size={80} 
                  color={colors.primary} 
                />
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
                <IconSymbol 
                  ios_icon_name="plus.circle.fill" 
                  android_material_icon_name="add_circle"
                  size={24} 
                  color={colors.headerText} 
                />
                <Text style={styles.createButtonText}>Crear Mi Primer Local</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.cardsContainer}>
            {locales.map((local) => (
              <RevolutionaryLocalCard
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
                  <IconSymbol 
                    ios_icon_name="plus.circle.fill" 
                    android_material_icon_name="add_circle"
                    size={48} 
                    color={colors.primary} 
                  />
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
    fontSize: 11,
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
    gap: 16,
  },
  
  // REVOLUTIONARY CARD STYLES - HORIZONTAL LAYOUT
  revolutionaryCard: {
    width: '100%',
  },
  cardTouchable: {
    width: '100%',
  },
  neumorphicCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 20,
    overflow: 'hidden',
    // Neumorphic shadow effect
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  neumorphicCardActive: {
    shadowColor: colors.primary,
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
    borderColor: colors.primary,
    borderWidth: 2,
  },
  activeBorderGradient: {
    position: 'absolute',
    top: -2,
    left: -2,
    right: -2,
    bottom: -2,
    zIndex: -1,
  },
  borderGradientInner: {
    flex: 1,
    borderRadius: 22,
  },
  
  // HORIZONTAL LAYOUT
  horizontalContent: {
    flexDirection: 'row',
    height: 140,
  },
  
  // LEFT: IMAGE SECTION
  imageSection: {
    width: 120,
    position: 'relative',
  },
  horizontalImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  floatingPlanBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    borderRadius: 8,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  planBadgeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  planBadgeTextSmall: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  activePulseCorner: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  pulseOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 4,
  },
  pulseInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FFFFFF',
  },
  
  // RIGHT: INFO SECTION
  infoSection: {
    flex: 1,
    padding: 12,
    justifyContent: 'space-between',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  titleContainer: {
    flex: 1,
    marginRight: 8,
  },
  localNameHorizontal: {
    fontSize: 17,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 2,
  },
  localTypeHorizontal: {
    fontSize: 12,
    color: colors.textSecondary,
    textTransform: 'capitalize',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusBadgeActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  statusBadgeInactive: {
    backgroundColor: 'rgba(107, 114, 128, 0.15)',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusDotActive: {
    backgroundColor: '#10B981',
  },
  statusDotInactive: {
    backgroundColor: '#6B7280',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  statusTextActive: {
    color: '#10B981',
  },
  statusTextInactive: {
    color: '#6B7280',
  },
  
  // COMPACT STATS
  compactStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.03)',
    borderRadius: 10,
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
  compactStatValue: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
  },
  compactStatDivider: {
    width: 1,
    height: 16,
    backgroundColor: colors.cardBorder,
  },
  
  // CIRCULAR ACTION BUTTONS
  circularActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  circularBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  circularBtnPrimary: {
    shadowColor: colors.primary,
    shadowOpacity: 0.3,
  },
  circularBtnGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  circularBtnContent: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  
  // ADD NEW CARD
  addNewCard: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: colors.primary,
    borderStyle: 'dashed',
    marginTop: 8,
  },
  addNewCardGradient: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  addNewIconContainer: {
    marginBottom: 12,
  },
  addNewTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  addNewSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
  },
});
