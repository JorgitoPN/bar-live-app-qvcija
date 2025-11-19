
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

// ⚡⚡⚡ ULTRA MEGA REVOLUTIONARY DESIGN - IMPOSSIBLE TO MISS ⚡⚡⚡
const ULTRA_VERSION = `ULTRA-MEGA-REVOLUTIONARY-${Date.now()}`;
const TIMESTAMP = new Date().toISOString();

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

// 🔥🔥🔥 ULTRA MODERN CARD WITH NEON GLOW 🔥🔥🔥
const UltraModernLocalCard = ({ 
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
  const [glowAnim] = useState(new Animated.Value(0));
  const [scaleAnim] = useState(new Animated.Value(1));

  useEffect(() => {
    if (isActive) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: false,
          }),
          Animated.timing(glowAnim, {
            toValue: 0,
            duration: 1500,
            useNativeDriver: false,
          }),
        ])
      ).start();
    } else {
      glowAnim.setValue(0);
    }
  }, [isActive]);

  const glowColor = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(16, 185, 129, 0.3)', 'rgba(16, 185, 129, 0.8)'],
  });

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.97,
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

  const getPlanColors = () => {
    switch (local.plan_nombre) {
      case 'premium':
        return {
          gradient: ['#FF6B6B', '#FFD93D', '#6BCF7F'],
          glow: '#FFD93D',
          icon: 'crown.fill',
          androidIcon: 'workspace_premium',
        };
      case 'profesional':
        return {
          gradient: ['#667eea', '#764ba2', '#f093fb'],
          glow: '#764ba2',
          icon: 'star.fill',
          androidIcon: 'star',
        };
      default:
        return {
          gradient: ['#14B8A6', '#06B6D4', '#3B82F6'],
          glow: '#14B8A6',
          icon: 'circle.fill',
          androidIcon: 'circle',
        };
    }
  };

  const planColors = getPlanColors();

  return (
    <Animated.View 
      style={[
        styles.ultraCard,
        { transform: [{ scale: scaleAnim }] },
        isActive && {
          shadowColor: glowColor,
          shadowOpacity: 1,
          shadowRadius: 20,
          elevation: 15,
        }
      ]}
    >
      <TouchableOpacity
        activeOpacity={0.9}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={isActive ? undefined : onSelect}
        disabled={isActive}
        style={styles.cardTouchable}
      >
        {/* 🌈 NEON BORDER EFFECT */}
        {isActive && (
          <Animated.View 
            style={[
              styles.neonBorder,
              { 
                borderColor: glowColor,
                shadowColor: glowColor,
              }
            ]} 
          />
        )}

        {/* 🎨 MAIN CARD CONTAINER */}
        <View style={[
          styles.cardContainer,
          isActive && styles.cardContainerActive
        ]}>
          {/* 🖼️ IMAGE SECTION WITH OVERLAY */}
          <View style={styles.imageContainer}>
            {local.imagen_url ? (
              <Image 
                source={{ uri: local.imagen_url }} 
                style={styles.cardImage}
                resizeMode="cover"
              />
            ) : (
              <LinearGradient
                colors={planColors.gradient}
                style={styles.cardImage}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <IconSymbol 
                  ios_icon_name="building.2.fill" 
                  android_material_icon_name="business"
                  size={60} 
                  color="rgba(255,255,255,0.4)" 
                />
              </LinearGradient>
            )}

            {/* 🌟 GRADIENT OVERLAY */}
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.7)']}
              style={styles.imageOverlay}
            />

            {/* 💎 FLOATING PLAN BADGE */}
            <View style={styles.floatingBadge}>
              <LinearGradient
                colors={planColors.gradient}
                style={styles.badgeGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <IconSymbol 
                  ios_icon_name={planColors.icon}
                  android_material_icon_name={planColors.androidIcon}
                  size={14} 
                  color="#FFFFFF" 
                />
                <Text style={styles.badgeText}>
                  {local.plan_nombre.toUpperCase()}
                </Text>
              </LinearGradient>
            </View>

            {/* ⚡ ACTIVE PULSE INDICATOR */}
            {isActive && (
              <View style={styles.activePulse}>
                <Animated.View style={[
                  styles.pulseRing,
                  { backgroundColor: glowColor }
                ]} />
                <View style={styles.pulseCore} />
              </View>
            )}

            {/* 📊 STATS OVERLAY */}
            <View style={styles.statsOverlay}>
              <View style={styles.statItem}>
                <IconSymbol 
                  ios_icon_name="person.2.fill" 
                  android_material_icon_name="people"
                  size={16} 
                  color="#FFFFFF" 
                />
                <Text style={styles.statText}>{local.seguidores}</Text>
              </View>
              {local.destacado && (
                <View style={styles.statItem}>
                  <IconSymbol 
                    ios_icon_name="star.fill"
                    android_material_icon_name="star"
                    size={16} 
                    color="#FFD700" 
                  />
                  <Text style={styles.statText}>DESTACADO</Text>
                </View>
              )}
            </View>
          </View>

          {/* 📝 INFO SECTION */}
          <View style={styles.infoContainer}>
            {/* TITLE & STATUS */}
            <View style={styles.titleSection}>
              <View style={styles.titleLeft}>
                <Text style={styles.localName} numberOfLines={1}>
                  {local.nombre}
                </Text>
                <Text style={styles.localType}>{local.tipo}</Text>
              </View>

              {/* STATUS INDICATOR */}
              <View style={[
                styles.statusIndicator,
                isActive ? styles.statusActive : styles.statusInactive
              ]}>
                <View style={[
                  styles.statusDot,
                  isActive ? styles.dotActive : styles.dotInactive
                ]} />
                <Text style={[
                  styles.statusLabel,
                  isActive ? styles.labelActive : styles.labelInactive
                ]}>
                  {isActive ? 'ACTIVO' : 'INACTIVO'}
                </Text>
              </View>
            </View>

            {/* 🎯 ACTION BUTTONS - ULTRA MODERN DESIGN */}
            <View style={styles.actionsContainer}>
              {!isActive && (
                <TouchableOpacity 
                  style={styles.primaryAction}
                  onPress={onSelect}
                >
                  <LinearGradient
                    colors={['#10B981', '#059669']}
                    style={styles.primaryActionGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <IconSymbol 
                      ios_icon_name="checkmark.circle.fill" 
                      android_material_icon_name="check_circle"
                      size={20} 
                      color="#FFFFFF" 
                    />
                    <Text style={styles.primaryActionText}>ACTIVAR</Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}

              <View style={styles.secondaryActions}>
                <TouchableOpacity 
                  style={styles.iconAction}
                  onPress={onEdit}
                >
                  <View style={styles.iconActionInner}>
                    <IconSymbol 
                      ios_icon_name="pencil" 
                      android_material_icon_name="edit"
                      size={20} 
                      color={colors.primary} 
                    />
                  </View>
                  <Text style={styles.iconActionLabel}>Editar</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.iconAction}
                  onPress={onAnalytics}
                >
                  <View style={styles.iconActionInner}>
                    <IconSymbol 
                      ios_icon_name="chart.bar.fill" 
                      android_material_icon_name="analytics"
                      size={20} 
                      color={colors.primary} 
                    />
                  </View>
                  <Text style={styles.iconActionLabel}>Análisis</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.iconAction}
                  onPress={onPlan}
                >
                  <View style={styles.iconActionInner}>
                    <IconSymbol 
                      ios_icon_name="creditcard.fill" 
                      android_material_icon_name="credit_card"
                      size={20} 
                      color={colors.primary} 
                    />
                  </View>
                  <Text style={styles.iconActionLabel}>Plan</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.iconAction}
                  onPress={onToggleDestacado}
                  disabled={isUpdating}
                >
                  {isUpdating ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <>
                      <View style={styles.iconActionInner}>
                        <IconSymbol 
                          ios_icon_name={local.destacado ? 'star.fill' : 'star'}
                          android_material_icon_name={local.destacado ? 'star' : 'star_border'}
                          size={20} 
                          color={local.destacado ? '#FFD700' : colors.textSecondary} 
                        />
                      </View>
                      <Text style={styles.iconActionLabel}>
                        {local.destacado ? 'ON' : local.destacados_restantes}
                      </Text>
                    </>
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
    console.log(`🚀🚀🚀 [ULTRA MEGA REVOLUTIONARY] VERSION: ${ULTRA_VERSION}`);
    console.log(`⏰⏰⏰ TIMESTAMP: ${TIMESTAMP}`);
    console.log('🔥🔥🔥 NEW DESIGN LOADED - IMPOSSIBLE TO MISS! 🔥🔥🔥');
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
      {/* 🎨 ULTRA MODERN HEADER */}
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
            <Text style={styles.headerTitle}>🔥 Gestión de Locales</Text>
            <Text style={styles.headerSubtitle}>
              {locales.length} {locales.length === 1 ? 'local' : 'locales'} • ULTRA DESIGN
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
                colors={['rgba(20, 184, 166, 0.2)', 'rgba(6, 182, 212, 0.2)']}
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
            {/* 🌟 VERSION BANNER - IMPOSSIBLE TO MISS */}
            <View style={styles.versionBanner}>
              <LinearGradient
                colors={['#FF6B6B', '#FFD93D', '#6BCF7F']}
                style={styles.versionGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Text style={styles.versionText}>
                  ⚡ ULTRA MEGA REVOLUTIONARY DESIGN ⚡
                </Text>
                <Text style={styles.versionTimestamp}>
                  {TIMESTAMP}
                </Text>
              </LinearGradient>
            </View>

            {locales.map((local) => (
              <UltraModernLocalCard
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

            {/* 🎯 ADD NEW CARD */}
            <TouchableOpacity
              style={styles.addNewCard}
              onPress={() => router.push('/crear/local')}
            >
              <LinearGradient
                colors={['rgba(20, 184, 166, 0.1)', 'rgba(6, 182, 212, 0.1)']}
                style={styles.addNewGradient}
              >
                <View style={styles.addNewIcon}>
                  <IconSymbol 
                    ios_icon_name="plus.circle.fill" 
                    android_material_icon_name="add_circle"
                    size={56} 
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
    backgroundColor: '#F0F4F8',
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 50 : 48,
    paddingBottom: 20,
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
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.headerText,
  },
  headerSubtitle: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 2,
    fontWeight: '600',
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

  // 🌟 VERSION BANNER
  versionBanner: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 8,
    shadowColor: '#FFD93D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
  versionGradient: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  versionText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: 1,
  },
  versionTimestamp: {
    fontSize: 10,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 4,
  },
  
  // 🔥 ULTRA MODERN CARD STYLES
  ultraCard: {
    width: '100%',
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  cardTouchable: {
    width: '100%',
  },
  neonBorder: {
    position: 'absolute',
    top: -3,
    left: -3,
    right: -3,
    bottom: -3,
    borderRadius: 27,
    borderWidth: 3,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 15,
    zIndex: -1,
  },
  cardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    overflow: 'hidden',
  },
  cardContainerActive: {
    borderWidth: 2,
    borderColor: '#10B981',
  },
  
  // 🖼️ IMAGE SECTION
  imageContainer: {
    height: 180,
    position: 'relative',
  },
  cardImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 100,
  },
  floatingBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  badgeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.8,
  },
  activePulse: {
    position: 'absolute',
    top: 12,
    right: 12,
  },
  pulseRing: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 8,
  },
  pulseCore: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#FFFFFF',
    top: 7,
    left: 7,
  },
  statsOverlay: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 12,
    flexDirection: 'row',
    gap: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  statText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  
  // 📝 INFO SECTION
  infoContainer: {
    padding: 16,
  },
  titleSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  titleLeft: {
    flex: 1,
    marginRight: 12,
  },
  localName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  localType: {
    fontSize: 14,
    color: colors.textSecondary,
    textTransform: 'capitalize',
    fontWeight: '600',
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  statusInactive: {
    backgroundColor: 'rgba(107, 114, 128, 0.15)',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    backgroundColor: '#10B981',
  },
  dotInactive: {
    backgroundColor: '#6B7280',
  },
  statusLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  labelActive: {
    color: '#10B981',
  },
  labelInactive: {
    color: '#6B7280',
  },
  
  // 🎯 ACTIONS
  actionsContainer: {
    gap: 12,
  },
  primaryAction: {
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  primaryActionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  primaryActionText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  secondaryActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  iconAction: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  iconActionInner: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  iconActionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  
  // 🎯 ADD NEW CARD
  addNewCard: {
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: colors.primary,
    borderStyle: 'dashed',
    marginTop: 8,
  },
  addNewGradient: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  addNewIcon: {
    marginBottom: 16,
  },
  addNewTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 6,
  },
  addNewSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '600',
  },
});
