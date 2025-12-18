
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  Switch,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors, commonStyles } from '@/styles/commonStyles';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface Local {
  id: string;
  nombre: string;
  imagen_url: string | null;
  provincia: string;
  tipo: string;
  direccion: string;
  destacado: boolean;
  activo: boolean;
  rating: number;
  seguidores: number;
}

export default function GestionarLocalesDestacadosScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [localesDestacados, setLocalesDestacados] = useState<Local[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Local[]>([]);
  const [searching, setSearching] = useState(false);
  const [updating, setUpdating] = useState<string | null>(null);

  const cargarLocalesDestacados = useCallback(async () => {
    try {
      console.log('[GestionarLocalesDestacados] ✅ Cargando locales destacados...');
      const { data, error } = await supabase
        .from('locales')
        .select('id, nombre, imagen_url, provincia, tipo, direccion, destacado, activo, rating, seguidores')
        .eq('destacado', true)
        .eq('activo', true)
        .order('nombre', { ascending: true });

      if (error) throw error;

      console.log('[GestionarLocalesDestacados] ✅ Locales destacados cargados:', data?.length || 0);
      setLocalesDestacados(data || []);
    } catch (error) {
      console.error('[GestionarLocalesDestacados] Error cargando locales destacados:', error);
      Alert.alert('Error', 'No se pudieron cargar los locales destacados');
    }
  }, []);

  const cargarDatos = useCallback(async () => {
    setLoading(true);
    await cargarLocalesDestacados();
    setLoading(false);
  }, [cargarLocalesDestacados]);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  const buscarLocales = useCallback(async (query: string) => {
    if (query.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const { data, error } = await supabase
        .from('locales')
        .select('id, nombre, imagen_url, provincia, tipo, direccion, destacado, activo, rating, seguidores')
        .ilike('nombre', `%${query}%`)
        .eq('activo', true)
        .limit(20);

      if (error) throw error;

      setSearchResults(data || []);
    } catch (error) {
      console.error('[GestionarLocalesDestacados] Error buscando locales:', error);
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    if (searchQuery.trim().length >= 2) {
      const timeoutId = setTimeout(() => {
        buscarLocales(searchQuery);
      }, 300);

      return () => clearTimeout(timeoutId);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery, buscarLocales]);

  const toggleDestacado = async (localId: string, currentValue: boolean, localName: string) => {
    const action = currentValue ? 'quitar el destacado' : 'destacar';
    
    Alert.alert(
      currentValue ? 'Quitar Destacado' : 'Destacar Local',
      `¿Estás seguro de que quieres ${action} "${localName}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: currentValue ? 'Quitar' : 'Destacar',
          style: currentValue ? 'destructive' : 'default',
          onPress: async () => {
            setUpdating(localId);
            try {
              const { error } = await supabase
                .from('locales')
                .update({ destacado: !currentValue })
                .eq('id', localId);

              if (error) throw error;

              Alert.alert(
                '✅ Éxito',
                currentValue 
                  ? `"${localName}" ya no está destacado` 
                  : `"${localName}" ahora está destacado`
              );

              await cargarLocalesDestacados();
              if (searchQuery.trim().length >= 2) {
                await buscarLocales(searchQuery);
              }
            } catch (error) {
              console.error('[GestionarLocalesDestacados] Error actualizando destacado:', error);
              Alert.alert('Error', 'No se pudo actualizar el estado del local');
            } finally {
              setUpdating(null);
            }
          },
        },
      ]
    );
  };

  const renderLocalCard = (local: Local, showToggle: boolean = true) => (
    <View key={local.id} style={styles.localCard}>
      <View style={styles.localCardContent}>
        {local.imagen_url ? (
          <Image source={{ uri: local.imagen_url }} style={styles.localImage} />
        ) : (
          <View style={[styles.localImage, styles.localImagePlaceholder]}>
            <IconSymbol ios_icon_name="building.2.fill" android_material_icon_name="store" size={32} color={colors.textSecondary} />
          </View>
        )}

        <View style={styles.localInfo}>
          <Text style={styles.localName} numberOfLines={1}>{local.nombre}</Text>
          <Text style={styles.localType}>{local.tipo}</Text>
          <Text style={styles.localLocation} numberOfLines={1}>
            {local.direccion}, {local.provincia}
          </Text>
          
          <View style={styles.localStats}>
            <View style={styles.statItem}>
              <IconSymbol ios_icon_name="star.fill" android_material_icon_name="star" size={14} color="#F59E0B" />
              <Text style={styles.statText}>{local.rating?.toFixed(1) || '0.0'}</Text>
            </View>
            <View style={styles.statItem}>
              <IconSymbol ios_icon_name="person.2.fill" android_material_icon_name="people" size={14} color={colors.primary} />
              <Text style={styles.statText}>{local.seguidores || 0}</Text>
            </View>
          </View>
        </View>

        {showToggle && (
          <View style={styles.localActions}>
            {local.destacado && (
              <View style={styles.destacadoBadge}>
                <IconSymbol ios_icon_name="star.fill" android_material_icon_name="star" size={16} color="#F59E0B" />
                <Text style={styles.destacadoBadgeText}>Destacado</Text>
              </View>
            )}
            
            <TouchableOpacity
              style={[
                styles.toggleButton,
                local.destacado ? styles.toggleButtonActive : styles.toggleButtonInactive,
                updating === local.id && styles.toggleButtonDisabled
              ]}
              onPress={() => toggleDestacado(local.id, local.destacado, local.nombre)}
              disabled={updating === local.id}
            >
              {updating === local.id ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <>
                  <IconSymbol 
                    ios_icon_name={local.destacado ? 'star.slash.fill' : 'star.fill'} 
                    android_material_icon_name={local.destacado ? 'star_border' : 'star'} 
                    size={20} 
                    color={colors.white} 
                  />
                  <Text style={styles.toggleButtonText}>
                    {local.destacado ? 'Quitar' : 'Destacar'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={[colors.headerGradientStart, colors.headerGradientEnd]} style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <IconSymbol ios_icon_name="chevron.left" android_material_icon_name="arrow_back" size={28} color={colors.headerText} />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Locales Destacados</Text>
          </View>
          <View style={{ width: 28 }} />
        </LinearGradient>

        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Cargando datos...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={[colors.headerGradientStart, colors.headerGradientEnd]} style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <IconSymbol ios_icon_name="chevron.left" android_material_icon_name="arrow_back" size={28} color={colors.headerText} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Locales Destacados</Text>
          <Text style={styles.headerSubtitle}>Gestiona la visibilidad destacada</Text>
        </View>
        <TouchableOpacity style={styles.refreshButton} onPress={cargarDatos}>
          <IconSymbol ios_icon_name="arrow.clockwise" android_material_icon_name="refresh" size={28} color={colors.headerText} />
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Search Section */}
        <View style={styles.searchSection}>
          <Text style={styles.sectionTitle}>Buscar Locales</Text>
          <Text style={styles.sectionSubtitle}>Busca locales para destacar o quitar el destacado</Text>
          
          <View style={styles.searchContainer}>
            <IconSymbol ios_icon_name="magnifyingglass" android_material_icon_name="search" size={20} color={colors.textSecondary} />
            <TextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Buscar por nombre..."
              placeholderTextColor={colors.textSecondary}
            />
            {searching && <ActivityIndicator size="small" color={colors.primary} />}
          </View>

          {searchResults.length > 0 && (
            <View style={styles.searchResults}>
              {searchResults.map(local => renderLocalCard(local, true))}
            </View>
          )}

          {searchQuery.trim().length >= 2 && searchResults.length === 0 && !searching && (
            <View style={styles.emptyState}>
              <IconSymbol ios_icon_name="magnifyingglass" android_material_icon_name="search" size={48} color={colors.textSecondary} />
              <Text style={styles.emptyText}>No se encontraron locales</Text>
            </View>
          )}
        </View>

        {/* Featured Locals Section */}
        <View style={styles.featuredSection}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Locales Destacados Actualmente</Text>
              <Text style={styles.sectionSubtitle}>{localesDestacados.length} locales destacados</Text>
            </View>
          </View>

          {localesDestacados.length === 0 ? (
            <View style={styles.emptyState}>
              <IconSymbol ios_icon_name="star" android_material_icon_name="star_border" size={48} color={colors.textSecondary} />
              <Text style={styles.emptyText}>No hay locales destacados</Text>
              <Text style={styles.emptySubtext}>Busca locales arriba para destacarlos</Text>
            </View>
          ) : (
            <View style={styles.localesList}>
              {localesDestacados.map(local => renderLocalCard(local, true))}
            </View>
          )}
        </View>

        <View style={styles.infoCard}>
          <IconSymbol ios_icon_name="info.circle.fill" android_material_icon_name="info" size={24} color={colors.primary} />
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>Sobre los Locales Destacados</Text>
            <Text style={styles.infoText}>
              - Los locales destacados aparecen primero en los resultados de búsqueda{'\n'}
              - Tienen mayor visibilidad en el mapa y en la página de explorar{'\n'}
              - Puedes destacar o quitar el destacado en cualquier momento{'\n'}
              - Solo los locales activos pueden ser destacados
            </Text>
          </View>
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
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 4,
  },
  headerContent: {
    flex: 1,
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.headerText,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.headerText,
    opacity: 0.9,
    marginTop: 2,
  },
  refreshButton: {
    padding: 4,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.textSecondary,
  },
  searchSection: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 6,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
  },
  searchResults: {
    marginTop: 16,
    gap: 12,
  },
  featuredSection: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  localesList: {
    gap: 12,
  },
  localCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    ...commonStyles.shadow,
  },
  localCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  localImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  localImagePlaceholder: {
    backgroundColor: colors.cardBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  localInfo: {
    flex: 1,
  },
  localName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  localType: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '600',
    marginBottom: 4,
  },
  localLocation: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  localStats: {
    flexDirection: 'row',
    gap: 16,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 12,
    color: colors.text,
    fontWeight: '600',
  },
  localActions: {
    alignItems: 'flex-end',
    gap: 8,
  },
  destacadoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  destacadoBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#92400E',
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 100,
    justifyContent: 'center',
  },
  toggleButtonActive: {
    backgroundColor: '#EF4444',
  },
  toggleButtonInactive: {
    backgroundColor: '#F59E0B',
  },
  toggleButtonDisabled: {
    opacity: 0.5,
  },
  toggleButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.white,
  },
  emptyState: {
    paddingVertical: 60,
    alignItems: 'center',
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: colors.primary + '10',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 22,
  },
});
