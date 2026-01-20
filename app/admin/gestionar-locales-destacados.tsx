
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  Image,
  Modal,
  Pressable,
  ScrollView,
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
  destacado_manual: boolean;
  destacado_horas: number;
  destacado_inicio: string | null;
  destacado_fin: string | null;
  activo: boolean;
  rating: number;
  seguidores: number;
}

const LOCALES_POR_PAGINA = 20;

export default function GestionarLocalesDestacadosScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [localesDestacados, setLocalesDestacados] = useState<Local[]>([]);
  const [paginaActual, setPaginaActual] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Local[]>([]);
  const [searching, setSearching] = useState(false);
  const [updating, setUpdating] = useState<string | null>(null);
  const [showHourSelector, setShowHourSelector] = useState(false);
  const [selectedLocal, setSelectedLocal] = useState<Local | null>(null);
  const [selectedHours, setSelectedHours] = useState(24);

  const cargarLocalesDestacados = useCallback(async (reset: boolean = false, currentPage: number = 1) => {
    try {
      if (reset) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      const from = reset ? 0 : (currentPage - 1) * LOCALES_POR_PAGINA;
      const to = from + LOCALES_POR_PAGINA - 1;

      console.log('[GestionarLocalesDestacados] ✅ Cargando locales destacados...');
      const { data, error } = await supabase
        .from('locales')
        .select('id, nombre, imagen_url, provincia, tipo, direccion, destacado, destacado_manual, destacado_horas, destacado_inicio, destacado_fin, activo, rating, seguidores')
        .eq('destacado', true)
        .eq('activo', true)
        .order('destacado_inicio', { ascending: false, nullsFirst: false })
        .range(from, to);

      if (error) throw error;

      console.log('[GestionarLocalesDestacados] ✅ Locales destacados cargados:', data?.length || 0);
      
      if (reset) {
        setLocalesDestacados(data || []);
        setPaginaActual(2);
      } else {
        setLocalesDestacados(prev => [...prev, ...(data || [])]);
        setPaginaActual(currentPage + 1);
      }
      
      setHasMore((data?.length || 0) === LOCALES_POR_PAGINA);
    } catch (error) {
      console.error('[GestionarLocalesDestacados] Error cargando locales destacados:', error);
      Alert.alert('Error', 'No se pudieron cargar los locales destacados');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    cargarLocalesDestacados(true, 1);
  }, [cargarLocalesDestacados]);

  const buscarLocales = useCallback(async (query: string) => {
    if (query.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const { data, error } = await supabase
        .from('locales')
        .select('id, nombre, imagen_url, provincia, tipo, direccion, destacado, destacado_manual, destacado_horas, destacado_inicio, destacado_fin, activo, rating, seguidores')
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

  const handleDestacarLocal = (local: Local) => {
    setSelectedLocal(local);
    setSelectedHours(24);
    setShowHourSelector(true);
  };

  const confirmarDestacado = async () => {
    if (!selectedLocal) return;

    setShowHourSelector(false);
    setUpdating(selectedLocal.id);

    try {
      const now = new Date();
      const endDate = new Date(now.getTime() + selectedHours * 60 * 60 * 1000);

      console.log('[GestionarLocalesDestacados] 🌟 Highlighting local manually:', selectedLocal.nombre);
      console.log('[GestionarLocalesDestacados] ⏰ Hours:', selectedHours);
      console.log('[GestionarLocalesDestacados] 📅 Start:', now.toISOString());
      console.log('[GestionarLocalesDestacados] 📅 End:', endDate.toISOString());

      const { error } = await supabase
        .from('locales')
        .update({
          destacado: true,
          destacado_manual: true,
          destacado_horas: selectedHours,
          destacado_inicio: now.toISOString(),
          destacado_fin: endDate.toISOString(),
        })
        .eq('id', selectedLocal.id);

      if (error) throw error;

      Alert.alert(
        '✅ Local Destacado',
        `"${selectedLocal.nombre}" estará destacado durante ${selectedHours} horas.\n\nNo se descontarán créditos al propietario (destacado manual por admin).`,
        [{ text: 'OK' }]
      );

      await cargarLocalesDestacados(true, 1);
      if (searchQuery.trim().length >= 2) {
        await buscarLocales(searchQuery);
      }
    } catch (error) {
      console.error('[GestionarLocalesDestacados] Error destacando local:', error);
      Alert.alert('Error', 'No se pudo destacar el local');
    } finally {
      setUpdating(null);
      setSelectedLocal(null);
    }
  };

  const quitarDestacado = async (local: Local) => {
    Alert.alert(
      'Quitar Destacado',
      `¿Estás seguro de que quieres quitar el destacado de "${local.nombre}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Quitar',
          style: 'destructive',
          onPress: async () => {
            setUpdating(local.id);
            try {
              const { error } = await supabase
                .from('locales')
                .update({
                  destacado: false,
                  destacado_manual: false,
                  destacado_horas: 24,
                  destacado_inicio: null,
                  destacado_fin: null,
                })
                .eq('id', local.id);

              if (error) throw error;

              Alert.alert('✅ Éxito', `"${local.nombre}" ya no está destacado`);

              await cargarLocalesDestacados(true, 1);
              if (searchQuery.trim().length >= 2) {
                await buscarLocales(searchQuery);
              }
            } catch (error) {
              console.error('[GestionarLocalesDestacados] Error quitando destacado:', error);
              Alert.alert('Error', 'No se pudo quitar el destacado');
            } finally {
              setUpdating(null);
            }
          },
        },
      ]
    );
  };

  const handleLoadMore = useCallback(() => {
    if (hasMore && !loadingMore && !loading) {
      console.log('[GestionarLocalesDestacados] Loading more, page:', paginaActual);
      cargarLocalesDestacados(false, paginaActual);
    }
  }, [hasMore, loadingMore, loading, paginaActual, cargarLocalesDestacados]);

  const [loadingMore, setLoadingMore] = useState(false);

  const renderLocalCard = ({ item }: { item: Local }) => {
    const timeRemaining = item.destacado_fin 
      ? Math.max(0, Math.floor((new Date(item.destacado_fin).getTime() - Date.now()) / (1000 * 60 * 60)))
      : null;

    return (
      <View style={styles.localCard}>
        <View style={styles.localCardContent}>
          {item.imagen_url ? (
            <Image source={{ uri: item.imagen_url }} style={styles.localImage} />
          ) : (
            <View style={[styles.localImage, styles.localImagePlaceholder]}>
              <IconSymbol ios_icon_name="building.2.fill" android_material_icon_name="store" size={32} color={colors.textSecondary} />
            </View>
          )}

          <View style={styles.localInfo}>
            <Text style={styles.localName} numberOfLines={1}>{item.nombre}</Text>
            <Text style={styles.localType}>{item.tipo}</Text>
            <Text style={styles.localLocation} numberOfLines={1}>
              {item.direccion}, {item.provincia}
            </Text>
            
            <View style={styles.localStats}>
              <View style={styles.statItem}>
                <IconSymbol ios_icon_name="star.fill" android_material_icon_name="star" size={14} color="#F59E0B" />
                <Text style={styles.statText}>{item.rating?.toFixed(1) || '0.0'}</Text>
              </View>
              <View style={styles.statItem}>
                <IconSymbol ios_icon_name="person.2.fill" android_material_icon_name="people" size={14} color={colors.primary} />
                <Text style={styles.statText}>{item.seguidores || 0}</Text>
              </View>
            </View>

            {item.destacado_manual && (
              <View style={styles.manualBadge}>
                <IconSymbol ios_icon_name="hand.raised.fill" android_material_icon_name="back_hand" size={12} color="#8B5CF6" />
                <Text style={styles.manualBadgeText}>Destacado Manual (Admin)</Text>
              </View>
            )}

            {timeRemaining !== null && (
              <View style={styles.timeRemainingBadge}>
                <IconSymbol ios_icon_name="clock.fill" android_material_icon_name="schedule" size={12} color={colors.primary} />
                <Text style={styles.timeRemainingText}>
                  {timeRemaining > 0 ? `${timeRemaining}h restantes` : 'Expirando...'}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.localActions}>
            {item.destacado && (
              <View style={styles.destacadoBadge}>
                <IconSymbol ios_icon_name="star.fill" android_material_icon_name="star" size={16} color="#F59E0B" />
                <Text style={styles.destacadoBadgeText}>Destacado</Text>
              </View>
            )}
            
            <TouchableOpacity
              style={[styles.toggleButton, styles.toggleButtonActive, updating === item.id && styles.toggleButtonDisabled]}
              onPress={() => quitarDestacado(item)}
              disabled={updating === item.id}
            >
              {updating === item.id ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <>
                  <IconSymbol ios_icon_name="star.slash.fill" android_material_icon_name="star_border" size={20} color={colors.white} />
                  <Text style={styles.toggleButtonText}>Quitar</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  const renderSearchLocalCard = ({ item }: { item: Local }) => (
    <View style={styles.localCard}>
      <View style={styles.localCardContent}>
        {item.imagen_url ? (
          <Image source={{ uri: item.imagen_url }} style={styles.localImage} />
        ) : (
          <View style={[styles.localImage, styles.localImagePlaceholder]}>
            <IconSymbol ios_icon_name="building.2.fill" android_material_icon_name="store" size={32} color={colors.textSecondary} />
          </View>
        )}

        <View style={styles.localInfo}>
          <Text style={styles.localName} numberOfLines={1}>{item.nombre}</Text>
          <Text style={styles.localType}>{item.tipo}</Text>
          <Text style={styles.localLocation} numberOfLines={1}>
            {item.direccion}, {item.provincia}
          </Text>
          
          <View style={styles.localStats}>
            <View style={styles.statItem}>
              <IconSymbol ios_icon_name="star.fill" android_material_icon_name="star" size={14} color="#F59E0B" />
              <Text style={styles.statText}>{item.rating?.toFixed(1) || '0.0'}</Text>
            </View>
            <View style={styles.statItem}>
              <IconSymbol ios_icon_name="person.2.fill" android_material_icon_name="people" size={14} color={colors.primary} />
              <Text style={styles.statText}>{item.seguidores || 0}</Text>
            </View>
          </View>
        </View>

        <View style={styles.localActions}>
          {item.destacado && (
            <View style={styles.destacadoBadge}>
              <IconSymbol ios_icon_name="star.fill" android_material_icon_name="star" size={16} color="#F59E0B" />
              <Text style={styles.destacadoBadgeText}>Destacado</Text>
            </View>
          )}
          
          <TouchableOpacity
            style={[
              styles.toggleButton,
              item.destacado ? styles.toggleButtonActive : styles.toggleButtonInactive,
              updating === item.id && styles.toggleButtonDisabled
            ]}
            onPress={() => {
              if (item.destacado) {
                quitarDestacado(item);
              } else {
                handleDestacarLocal(item);
              }
            }}
            disabled={updating === item.id}
          >
            {updating === item.id ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <>
                <IconSymbol 
                  ios_icon_name={item.destacado ? 'star.slash.fill' : 'star.fill'} 
                  android_material_icon_name={item.destacado ? 'star_border' : 'star'} 
                  size={20} 
                  color={colors.white} 
                />
                <Text style={styles.toggleButtonText}>
                  {item.destacado ? 'Quitar' : 'Destacar'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const renderFooter = useCallback(() => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={colors.primary} />
        <Text style={styles.footerLoaderText}>Cargando más...</Text>
      </View>
    );
  }, [loadingMore]);

  const renderEmpty = useCallback(() => (
    <View style={styles.emptyState}>
      <IconSymbol ios_icon_name="star" android_material_icon_name="star_border" size={48} color={colors.textSecondary} />
      <Text style={styles.emptyText}>No hay locales destacados</Text>
      <Text style={styles.emptySubtext}>Busca locales arriba para destacarlos</Text>
    </View>
  ), []);

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
        <TouchableOpacity style={styles.refreshButton} onPress={() => cargarLocalesDestacados(true, 1)}>
          <IconSymbol ios_icon_name="arrow.clockwise" android_material_icon_name="refresh" size={28} color={colors.headerText} />
        </TouchableOpacity>
      </LinearGradient>

      <View style={styles.content}>
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
            <ScrollView style={styles.searchResults} contentContainerStyle={styles.searchResultsContent}>
              {searchResults.map(local => (
                <React.Fragment key={local.id}>
                  {renderSearchLocalCard({ item: local })}
                </React.Fragment>
              ))}
            </ScrollView>
          )}

          {searchQuery.trim().length >= 2 && searchResults.length === 0 && !searching && (
            <View style={styles.emptyState}>
              <IconSymbol ios_icon_name="magnifyingglass" android_material_icon_name="search" size={48} color={colors.textSecondary} />
              <Text style={styles.emptyText}>No se encontraron locales</Text>
            </View>
          )}
        </View>

        <View style={styles.featuredSection}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Locales Destacados Actualmente</Text>
              <Text style={styles.sectionSubtitle}>{localesDestacados.length} locales destacados</Text>
            </View>
          </View>

          <FlatList
            data={localesDestacados}
            renderItem={renderLocalCard}
            keyExtractor={item => item.id}
            ListFooterComponent={renderFooter}
            ListEmptyComponent={renderEmpty}
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.5}
            contentContainerStyle={styles.localesList}
            showsVerticalScrollIndicator={false}
            removeClippedSubviews={true}
            maxToRenderPerBatch={10}
            updateCellsBatchingPeriod={50}
            windowSize={10}
          />
        </View>
      </View>

      <Modal
        visible={showHourSelector}
        transparent
        animationType="slide"
        onRequestClose={() => setShowHourSelector(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowHourSelector(false)}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Destacar Local</Text>
              <TouchableOpacity onPress={() => setShowHourSelector(false)}>
                <IconSymbol ios_icon_name="xmark.circle.fill" android_material_icon_name="cancel" size={28} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {selectedLocal && (
              <View style={styles.modalBody}>
                <View style={styles.selectedLocalInfo}>
                  {selectedLocal.imagen_url ? (
                    <Image source={{ uri: selectedLocal.imagen_url }} style={styles.selectedLocalImage} />
                  ) : (
                    <View style={[styles.selectedLocalImage, styles.localImagePlaceholder]}>
                      <IconSymbol ios_icon_name="building.2.fill" android_material_icon_name="store" size={24} color={colors.textSecondary} />
                    </View>
                  )}
                  <View style={styles.selectedLocalDetails}>
                    <Text style={styles.selectedLocalName}>{selectedLocal.nombre}</Text>
                    <Text style={styles.selectedLocalType}>{selectedLocal.tipo}</Text>
                  </View>
                </View>

                <View style={styles.hourSelectorSection}>
                  <Text style={styles.hourSelectorLabel}>Duración del Destacado</Text>
                  <Text style={styles.hourSelectorSubtitle}>Selecciona cuántas horas estará destacado el local</Text>

                  <View style={styles.hourOptions}>
                    {[12, 24, 48, 72, 168].map(hours => (
                      <TouchableOpacity
                        key={hours}
                        style={[
                          styles.hourOption,
                          selectedHours === hours && styles.hourOptionActive
                        ]}
                        onPress={() => setSelectedHours(hours)}
                      >
                        <Text style={[
                          styles.hourOptionText,
                          selectedHours === hours && styles.hourOptionTextActive
                        ]}>
                          {hours < 24 ? `${hours}h` : hours === 24 ? '1 día' : hours === 48 ? '2 días' : hours === 72 ? '3 días' : '1 semana'}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <View style={styles.customHourInput}>
                    <Text style={styles.customHourLabel}>O ingresa horas personalizadas:</Text>
                    <TextInput
                      style={styles.customHourTextInput}
                      value={selectedHours.toString()}
                      onChangeText={(text) => {
                        const num = parseInt(text);
                        if (!isNaN(num) && num > 0 && num <= 720) {
                          setSelectedHours(num);
                        }
                      }}
                      keyboardType="number-pad"
                      placeholder="24"
                      placeholderTextColor={colors.textSecondary}
                    />
                    <Text style={styles.customHourUnit}>horas</Text>
                  </View>
                </View>

                <View style={styles.warningBox}>
                  <IconSymbol ios_icon_name="info.circle.fill" android_material_icon_name="info" size={20} color={colors.primary} />
                  <Text style={styles.warningText}>
                    Al destacar manualmente, NO se descontarán créditos al propietario del local.
                  </Text>
                </View>

                <View style={styles.summaryBox}>
                  <Text style={styles.summaryText}>
                    El local &quot;{selectedLocal.nombre}&quot; estará destacado durante <Text style={styles.summaryHighlight}>{selectedHours} horas</Text>.
                  </Text>
                  <Text style={styles.summarySubtext}>
                    Desde: {new Date().toLocaleString('es-ES')}{'\n'}
                    Hasta: {new Date(Date.now() + selectedHours * 60 * 60 * 1000).toLocaleString('es-ES')}
                  </Text>
                </View>
              </View>
            )}

            <TouchableOpacity
              style={styles.modalPrimaryButton}
              onPress={confirmarDestacado}
            >
              <IconSymbol ios_icon_name="star.fill" android_material_icon_name="star" size={20} color={colors.white} />
              <Text style={styles.modalPrimaryButtonText}>Confirmar Destacado</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.modalCancelButton} onPress={() => setShowHourSelector(false)}>
              <Text style={styles.modalCancelText}>Cancelar</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
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
    padding: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
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
    maxHeight: 300,
  },
  searchResultsContent: {
    gap: 12,
  },
  featuredSection: {
    flex: 1,
    padding: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  localesList: {
    paddingBottom: 100,
  },
  localCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
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
    marginBottom: 6,
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
  manualBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#8B5CF6' + '20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  manualBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#8B5CF6',
  },
  timeRemainingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary + '15',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  timeRemainingText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
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
  footerLoader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  footerLoaderText: {
    fontSize: 14,
    color: colors.textSecondary,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: colors.background,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 500,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    flex: 1,
  },
  modalBody: {
    marginBottom: 20,
  },
  selectedLocalInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  selectedLocalImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  selectedLocalDetails: {
    flex: 1,
  },
  selectedLocalName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  selectedLocalType: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '600',
  },
  hourSelectorSection: {
    marginBottom: 20,
  },
  hourSelectorLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  hourSelectorSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 16,
  },
  hourOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  hourOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: colors.cardBackground,
    borderWidth: 2,
    borderColor: colors.cardBorder,
  },
  hourOptionActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  hourOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  hourOptionTextActive: {
    color: colors.white,
  },
  customHourInput: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  customHourLabel: {
    fontSize: 13,
    color: colors.text,
    flex: 1,
  },
  customHourTextInput: {
    backgroundColor: colors.cardBackground,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    width: 80,
    textAlign: 'center',
  },
  customHourUnit: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: colors.primary + '10',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: colors.text,
    lineHeight: 18,
  },
  summaryBox: {
    backgroundColor: colors.cardBackground,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  summaryText: {
    fontSize: 14,
    color: colors.text,
    marginBottom: 8,
    lineHeight: 20,
  },
  summaryHighlight: {
    fontWeight: 'bold',
    color: colors.primary,
  },
  summarySubtext: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  modalPrimaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  modalPrimaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.white,
  },
  modalCancelButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
  },
});
