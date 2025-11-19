
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

// 🚨🚨🚨 COMPLETELY NEW REVOLUTIONARY DESIGN - HORIZONTAL CARDS 🚨🚨🚨
const DESIGN_VERSION = `HORIZONTAL-MINIMALIST-${Date.now()}`;
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

// 🎨 REVOLUTIONARY HORIZONTAL CARD DESIGN
const HorizontalLocalCard = ({ 
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
  const getPlanColor = () => {
    switch (local.plan_nombre) {
      case 'premium':
        return '#FFD700';
      case 'profesional':
        return '#9333EA';
      default:
        return '#14B8A6';
    }
  };

  const planColor = getPlanColor();

  return (
    <View style={[
      styles.horizontalCard,
      isActive && { borderColor: '#10B981', borderWidth: 3 }
    ]}>
      {/* LEFT: IMAGE SECTION */}
      <View style={styles.imageSection}>
        {local.imagen_url ? (
          <Image 
            source={{ uri: local.imagen_url }} 
            style={styles.horizontalImage}
            resizeMode="cover"
          />
        ) : (
          <LinearGradient
            colors={['#14B8A6', '#06B6D4']}
            style={styles.horizontalImage}
          >
            <IconSymbol 
              ios_icon_name="building.2.fill" 
              android_material_icon_name="business"
              size={40} 
              color="rgba(255,255,255,0.5)" 
            />
          </LinearGradient>
        )}
        
        {/* PLAN BADGE */}
        <View style={[styles.planBadge, { backgroundColor: planColor }]}>
          <Text style={styles.planBadgeText}>
            {local.plan_nombre.substring(0, 3).toUpperCase()}
          </Text>
        </View>

        {/* ACTIVE INDICATOR */}
        {isActive && (
          <View style={styles.activeIndicator}>
            <View style={styles.activePulse} />
          </View>
        )}
      </View>

      {/* RIGHT: INFO & ACTIONS */}
      <View style={styles.infoSection}>
        {/* TOP: TITLE & STATUS */}
        <View style={styles.topRow}>
          <View style={styles.titleContainer}>
            <Text style={styles.cardTitle} numberOfLines={1}>
              {local.nombre}
            </Text>
            <View style={styles.metaRow}>
              <Text style={styles.cardType}>{local.tipo}</Text>
              <View style={styles.dot} />
              <IconSymbol 
                ios_icon_name="person.2.fill" 
                android_material_icon_name="people"
                size={12} 
                color={colors.textSecondary} 
              />
              <Text style={styles.followers}>{local.seguidores}</Text>
            </View>
          </View>

          {/* STATUS CHIP */}
          <View style={[
            styles.statusChip,
            isActive ? styles.statusActive : styles.statusInactive
          ]}>
            <View style={[
              styles.statusDot,
              isActive ? styles.dotActive : styles.dotInactive
            ]} />
            <Text style={[
              styles.statusText,
              isActive ? styles.textActive : styles.textInactive
            ]}>
              {isActive ? 'ACTIVO' : 'INACTIVO'}
            </Text>
          </View>
        </View>

        {/* BOTTOM: ACTIONS IN SINGLE ROW */}
        <View style={styles.actionsRow}>
          {!isActive && (
            <TouchableOpacity 
              style={styles.activateButton}
              onPress={onSelect}
            >
              <LinearGradient
                colors={['#10B981', '#059669']}
                style={styles.activateGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <IconSymbol 
                  ios_icon_name="checkmark.circle.fill" 
                  android_material_icon_name="check_circle"
                  size={16} 
                  color="#FFFFFF" 
                />
                <Text style={styles.activateText}>ACTIVAR</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.actionBtn} onPress={onEdit}>
            <IconSymbol 
              ios_icon_name="pencil" 
              android_material_icon_name="edit"
              size={18} 
              color={colors.primary} 
            />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtn} onPress={onAnalytics}>
            <IconSymbol 
              ios_icon_name="chart.bar.fill" 
              android_material_icon_name="analytics"
              size={18} 
              color={colors.primary} 
            />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtn} onPress={onPlan}>
            <IconSymbol 
              ios_icon_name="creditcard.fill" 
              android_material_icon_name="credit_card"
              size={18} 
              color={colors.primary} 
            />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionBtn} 
            onPress={onToggleDestacado}
            disabled={isUpdating}
          >
            {isUpdating ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <IconSymbol 
                ios_icon_name={local.destacado ? 'star.fill' : 'star'}
                android_material_icon_name={local.destacado ? 'star' : 'star_border'}
                size={18} 
                color={local.destacado ? '#FFD700' : colors.textSecondary} 
              />
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
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
    console.log(`🚨🚨🚨 [HORIZONTAL DESIGN] VERSION: ${DESIGN_VERSION}`);
    console.log(`⏰ BUILD TIME: ${BUILD_TIME}`);
    console.log('🎨 COMPLETELY NEW HORIZONTAL CARD DESIGN LOADED!');
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
      {/* HEADER */}
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
              {locales.length} {locales.length === 1 ? 'local' : 'locales'}
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
            {/* 🚨 IMPOSSIBLE TO MISS BANNER */}
            <View style={styles.designBanner}>
              <LinearGradient
                colors={['#FF0080', '#7928CA', '#FF0080']}
                style={styles.bannerGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={styles.bannerText}>
                  🚨 NUEVO DISEÑO HORIZONTAL REVOLUCIONARIO 🚨
                </Text>
                <Text style={styles.bannerTime}>{BUILD_TIME}</Text>
              </LinearGradient>
            </View>

            {locales.map((local) => (
              <HorizontalLocalCard
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

            {/* ADD NEW CARD */}
            <TouchableOpacity
              style={styles.addNewCard}
              onPress={() => router.push('/crear/local')}
            >
              <View style={styles.addNewContent}>
                <IconSymbol 
                  ios_icon_name="plus.circle.fill" 
                  android_material_icon_name="add_circle"
                  size={48} 
                  color={colors.primary} 
                />
                <View style={styles.addNewTextContainer}>
                  <Text style={styles.addNewTitle}>Añadir Nuevo Local</Text>
                  <Text style={styles.addNewSubtitle}>Expande tu presencia digital</Text>
                </View>
              </View>
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
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.headerText,
  },
  headerSubtitle: {
    fontSize: 12,
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
    gap: 16,
  },

  // 🚨 DESIGN BANNER
  designBanner: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 8,
    shadowColor: '#FF0080',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 12,
  },
  bannerGradient: {
    paddingVertical: 20,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  bannerText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: 1.5,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  bannerTime: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.95)',
    marginTop: 6,
  },
  
  // 🎨 HORIZONTAL CARD STYLES
  horizontalCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    height: 120,
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
  planBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  planBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  activeIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  activePulse: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#10B981',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 8,
  },
  
  // RIGHT: INFO SECTION
  infoSection: {
    flex: 1,
    padding: 12,
    justifyContent: 'space-between',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  titleContainer: {
    flex: 1,
    marginRight: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardType: {
    fontSize: 12,
    color: colors.textSecondary,
    textTransform: 'capitalize',
    fontWeight: '600',
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: colors.textSecondary,
  },
  followers: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  statusInactive: {
    backgroundColor: 'rgba(107, 114, 128, 0.15)',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dotActive: {
    backgroundColor: '#10B981',
  },
  dotInactive: {
    backgroundColor: '#6B7280',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  textActive: {
    color: '#10B981',
  },
  textInactive: {
    color: '#6B7280',
  },
  
  // ACTIONS ROW
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  activateButton: {
    flex: 1,
    borderRadius: 10,
    overflow: 'hidden',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  activateGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  activateText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  actionBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },
  
  // ADD NEW CARD
  addNewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 3,
    borderColor: colors.primary,
    borderStyle: 'dashed',
    padding: 20,
    marginTop: 8,
  },
  addNewContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  addNewTextContainer: {
    flex: 1,
  },
  addNewTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  addNewSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '600',
  },
});
