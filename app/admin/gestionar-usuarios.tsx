
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  ActivityIndicator,
  Switch,
  Modal,
  Pressable,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { colors, commonStyles } from '@/styles/commonStyles';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface Usuario {
  id: string;
  nombre: string;
  email: string;
  username?: string;
  avatar?: string;
  rol_app: string;
  activo: boolean;
  provider?: string;
  fecha_registro: string;
  seguidores: number;
  seguidos: number;
  posts: number;
}

const USUARIOS_POR_PAGINA = 20;

/**
 * ✅ USER MANAGEMENT v1.0 - ADMIN PANEL
 * 
 * Features:
 * - ✅ List all users with pagination
 * - ✅ Search by name, email, or username
 * - ✅ Filter by role (admin, propietario, cliente)
 * - ✅ Filter by status (active/inactive)
 * - ✅ Filter by provider (barlive, google)
 * - ✅ Toggle user active status
 * - ✅ View user details
 * - ✅ Statistics dashboard
 */

export default function GestionarUsuariosScreen() {
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [filtroRol, setFiltroRol] = useState<string>('todos');
  const [filtroEstado, setFiltroEstado] = useState<string>('todos');
  const [filtroProvider, setFiltroProvider] = useState<string>('todos');
  const [paginaActual, setPaginaActual] = useState(1);
  const [totalUsuarios, setTotalUsuarios] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const [showFiltersModal, setShowFiltersModal] = useState(false);

  const [contadores, setContadores] = useState({
    total: 0,
    admins: 0,
    propietarios: 0,
    clientes: 0,
    activos: 0,
    inactivos: 0,
    barlive: 0,
    google: 0,
  });

  const cargarContadores = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select('rol_app, activo, provider');

      if (error) throw error;

      const stats = {
        total: data?.length || 0,
        admins: data?.filter(u => u.rol_app === 'admin').length || 0,
        propietarios: data?.filter(u => u.rol_app === 'propietario').length || 0,
        clientes: data?.filter(u => u.rol_app === 'cliente').length || 0,
        activos: data?.filter(u => u.activo).length || 0,
        inactivos: data?.filter(u => !u.activo).length || 0,
        barlive: data?.filter(u => u.provider === 'barlive').length || 0,
        google: data?.filter(u => u.provider === 'google').length || 0,
      };

      setContadores(stats);
    } catch (error) {
      console.error('[GestionarUsuarios] Error cargando contadores:', error);
    }
  }, []);

  const cargarUsuarios = useCallback(async (reset: boolean = false, currentPage: number = 1) => {
    try {
      if (reset) {
        setInitialLoading(true);
      } else {
        setLoadingMore(true);
      }

      const from = reset ? 0 : (currentPage - 1) * USUARIOS_POR_PAGINA;
      const to = from + USUARIOS_POR_PAGINA - 1;

      let query = supabase
        .from('usuarios')
        .select('*', { count: 'exact' })
        .order('fecha_registro', { ascending: false })
        .range(from, to);

      if (busqueda) {
        query = query.or(`nombre.ilike.%${busqueda}%,email.ilike.%${busqueda}%,username.ilike.%${busqueda}%`);
      }

      if (filtroRol !== 'todos') {
        query = query.eq('rol_app', filtroRol);
      }

      if (filtroEstado === 'activos') {
        query = query.eq('activo', true);
      } else if (filtroEstado === 'inactivos') {
        query = query.eq('activo', false);
      }

      if (filtroProvider !== 'todos') {
        query = query.eq('provider', filtroProvider);
      }

      const { data, error, count } = await query;

      if (error) {
        console.error('[GestionarUsuarios] Error cargando usuarios:', error);
        throw error;
      }

      console.log('[GestionarUsuarios] Usuarios cargados:', data?.length || 0);
      
      if (reset) {
        setUsuarios(data || []);
        setPaginaActual(2);
      } else {
        setUsuarios(prev => [...prev, ...(data || [])]);
        setPaginaActual(currentPage + 1);
      }
      
      setTotalUsuarios(count || 0);
      setHasMore((data?.length || 0) === USUARIOS_POR_PAGINA);
    } catch (error) {
      console.error('[GestionarUsuarios] Error cargando usuarios:', error);
      Alert.alert('Error', 'No se pudieron cargar los usuarios');
    } finally {
      setInitialLoading(false);
      setLoadingMore(false);
    }
  }, [busqueda, filtroRol, filtroEstado, filtroProvider]);

  useEffect(() => {
    console.log('[GestionarUsuarios] Initial load');
    cargarContadores();
    cargarUsuarios(true, 1);
  }, [cargarContadores, cargarUsuarios]);

  useEffect(() => {
    if (!initialLoading) {
      console.log('[GestionarUsuarios] Filters changed, reloading...');
      const timer = setTimeout(() => {
        cargarUsuarios(true, 1);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [busqueda, filtroRol, filtroEstado, filtroProvider, initialLoading, cargarUsuarios]);

  const toggleEstadoUsuario = useCallback(async (usuarioId: string, activo: boolean) => {
    try {
      const { error } = await supabase
        .from('usuarios')
        .update({ activo: !activo })
        .eq('id', usuarioId);

      if (error) throw error;

      setUsuarios(prevUsuarios =>
        prevUsuarios.map(usuario =>
          usuario.id === usuarioId ? { ...usuario, activo: !activo } : usuario
        )
      );

      Alert.alert(
        'Éxito',
        `Usuario ${!activo ? 'activado' : 'desactivado'} correctamente`
      );
      cargarContadores();
    } catch (error) {
      console.error('[GestionarUsuarios] Error actualizando usuario:', error);
      Alert.alert('Error', 'No se pudo actualizar el usuario');
    }
  }, [cargarContadores]);

  const limpiarFiltros = useCallback(() => {
    setFiltroRol('todos');
    setFiltroEstado('todos');
    setFiltroProvider('todos');
    setBusqueda('');
  }, []);

  const hayFiltrosActivos = useCallback(() => {
    return filtroRol !== 'todos' ||
           filtroEstado !== 'todos' ||
           filtroProvider !== 'todos' ||
           busqueda !== '';
  }, [filtroRol, filtroEstado, filtroProvider, busqueda]);

  const handleLoadMore = useCallback(() => {
    if (hasMore && !loadingMore && !initialLoading) {
      console.log('[GestionarUsuarios] Loading more, page:', paginaActual);
      cargarUsuarios(false, paginaActual);
    }
  }, [hasMore, loadingMore, initialLoading, paginaActual, cargarUsuarios]);

  const UsuarioCard = ({ usuario }: { usuario: Usuario }) => {
    return (
      <View style={styles.usuarioCard}>
        <TouchableOpacity
          style={styles.usuarioCardContent}
          onPress={() => router.push(`/perfil/usuario?userId=${usuario.id}`)}
        >
          {usuario.avatar ? (
            <Image source={{ uri: usuario.avatar }} style={styles.usuarioAvatar} />
          ) : (
            <View style={[styles.usuarioAvatar, styles.avatarPlaceholder]}>
              <IconSymbol ios_icon_name="person.fill" android_material_icon_name="person" size={32} color="#FFFFFF" />
            </View>
          )}

          <View style={styles.usuarioInfo}>
            <View style={styles.usuarioHeader}>
              <Text style={styles.usuarioNombre} numberOfLines={1}>
                {usuario.nombre}
              </Text>
              {usuario.rol_app === 'admin' && (
                <View style={styles.adminBadge}>
                  <IconSymbol ios_icon_name="shield.fill" android_material_icon_name="shield" size={12} color="#EF4444" />
                  <Text style={styles.adminBadgeText}>ADMIN</Text>
                </View>
              )}
              {usuario.rol_app === 'propietario' && (
                <View style={styles.propietarioBadge}>
                  <IconSymbol ios_icon_name="building.2.fill" android_material_icon_name="business" size={12} color="#F59E0B" />
                  <Text style={styles.propietarioBadgeText}>PROPIETARIO</Text>
                </View>
              )}
            </View>

            {usuario.username && (
              <Text style={styles.usuarioUsername}>@{usuario.username}</Text>
            )}

            <Text style={styles.usuarioEmail} numberOfLines={1}>
              {usuario.email}
            </Text>

            <View style={styles.usuarioMeta}>
              <View style={styles.metaItem}>
                <IconSymbol ios_icon_name="person.2.fill" android_material_icon_name="people" size={12} color={colors.textSecondary} />
                <Text style={styles.metaText}>{usuario.seguidores} seguidores</Text>
              </View>
              <View style={styles.metaItem}>
                <IconSymbol ios_icon_name="square.grid.3x3" android_material_icon_name="grid_on" size={12} color={colors.textSecondary} />
                <Text style={styles.metaText}>{usuario.posts} posts</Text>
              </View>
              {usuario.provider && (
                <View style={styles.providerBadge}>
                  <Text style={styles.providerText}>{usuario.provider}</Text>
                </View>
              )}
            </View>
          </View>
        </TouchableOpacity>

        <View style={styles.usuarioActions}>
          <View style={styles.toggleRow}>
            <View style={styles.toggleItem}>
              <Text style={styles.toggleLabel}>Activo:</Text>
              <Switch
                value={usuario.activo}
                onValueChange={() => {
                  Alert.alert(
                    usuario.activo ? 'Desactivar Usuario' : 'Activar Usuario',
                    `¿Estás seguro de ${usuario.activo ? 'desactivar' : 'activar'} a ${usuario.nombre}?`,
                    [
                      { text: 'Cancelar', style: 'cancel' },
                      {
                        text: usuario.activo ? 'Desactivar' : 'Activar',
                        onPress: () => toggleEstadoUsuario(usuario.id, usuario.activo),
                      },
                    ]
                  );
                }}
                trackColor={{ false: colors.cardBorder, true: colors.primary }}
                thumbColor={colors.headerText}
              />
            </View>
          </View>

          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.viewButton}
              onPress={() => router.push(`/perfil/usuario?userId=${usuario.id}`)}
            >
              <IconSymbol ios_icon_name="eye.fill" android_material_icon_name="visibility" size={18} color={colors.primary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.editButton}
              onPress={() => router.push(`/editar/usuario?id=${usuario.id}`)}
            >
              <IconSymbol ios_icon_name="pencil" android_material_icon_name="edit" size={18} color={colors.primary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => {
                Alert.alert(
                  'Eliminar Usuario',
                  `¿Estás seguro de eliminar a ${usuario.nombre}? Esta acción no se puede deshacer.`,
                  [
                    { text: 'Cancelar', style: 'cancel' },
                    {
                      text: 'Eliminar',
                      style: 'destructive',
                      onPress: async () => {
                        try {
                          const { error } = await supabase
                            .from('usuarios')
                            .delete()
                            .eq('id', usuario.id);

                          if (error) throw error;

                          setUsuarios(prevUsuarios => prevUsuarios.filter(u => u.id !== usuario.id));
                          setTotalUsuarios(prev => prev - 1);
                          Alert.alert('Éxito', 'Usuario eliminado correctamente');
                          cargarContadores();
                        } catch (error) {
                          console.error('[GestionarUsuarios] Error eliminando usuario:', error);
                          Alert.alert('Error', 'No se pudo eliminar el usuario');
                        }
                      },
                    },
                  ]
                );
              }}
            >
              <IconSymbol ios_icon_name="trash" android_material_icon_name="delete" size={18} color={colors.badgeNuevo} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  const renderUsuarioCard = ({ item }: { item: Usuario }) => (
    <UsuarioCard usuario={item} />
  );

  const renderHeader = () => (
    <React.Fragment>
      <View style={styles.statsSection}>
        <Text style={styles.statsSectionTitle}>Estadísticas de Usuarios</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{contadores.total}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statNumber, { color: '#EF4444' }]}>{contadores.admins}</Text>
            <Text style={styles.statLabel}>Admins</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statNumber, { color: '#F59E0B' }]}>{contadores.propietarios}</Text>
            <Text style={styles.statLabel}>Propietarios</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statNumber, { color: colors.primary }]}>{contadores.clientes}</Text>
            <Text style={styles.statLabel}>Clientes</Text>
          </View>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <IconSymbol ios_icon_name="magnifyingglass" android_material_icon_name="search" size={20} color={colors.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar por nombre, email o username..."
          placeholderTextColor={colors.textSecondary}
          value={busqueda}
          onChangeText={setBusqueda}
        />
        {busqueda !== '' && (
          <TouchableOpacity onPress={() => setBusqueda('')}>
            <IconSymbol ios_icon_name="xmark.circle.fill" android_material_icon_name="cancel" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.filterButtonsRow}>
        <TouchableOpacity
          style={[styles.filterButton, hayFiltrosActivos() && styles.filterButtonActive]}
          onPress={() => setShowFiltersModal(true)}
        >
          <IconSymbol ios_icon_name="line.3.horizontal.decrease.circle" android_material_icon_name="filter_list" size={20} color={hayFiltrosActivos() ? colors.headerText : colors.text} />
          <Text style={[styles.filterButtonText, hayFiltrosActivos() && styles.filterButtonTextActive]}>
            Filtros {hayFiltrosActivos() && '•'}
          </Text>
        </TouchableOpacity>

        {hayFiltrosActivos() && (
          <TouchableOpacity
            style={styles.clearFiltersButton}
            onPress={limpiarFiltros}
          >
            <IconSymbol ios_icon_name="xmark.circle.fill" android_material_icon_name="cancel" size={16} color={colors.textSecondary} />
            <Text style={styles.clearFiltersText}>Limpiar</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.resultsIndicator}>
        <Text style={styles.resultsText}>
          Mostrando {usuarios.length} de {totalUsuarios} usuarios
        </Text>
      </View>
    </React.Fragment>
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
      <IconSymbol ios_icon_name="person.2" android_material_icon_name="people_outline" size={48} color={colors.textSecondary} />
      <Text style={styles.emptyText}>No se encontraron usuarios</Text>
      <Text style={styles.emptySubtext}>
        Intenta ajustar los filtros de búsqueda
      </Text>
    </View>
  ), []);

  if (initialLoading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Cargando usuarios...</Text>
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
          <IconSymbol ios_icon_name="chevron.left" android_material_icon_name="arrow_back" size={24} color={colors.headerText} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Gestionar Usuarios</Text>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <FlatList
        data={usuarios}
        renderItem={renderUsuarioCard}
        keyExtractor={item => item.id}
        ListHeaderComponent={renderHeader}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmpty}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        updateCellsBatchingPeriod={50}
        windowSize={10}
      />

      <Modal
        visible={showFiltersModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFiltersModal(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowFiltersModal(false)}
        >
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filtros</Text>
              <TouchableOpacity onPress={() => setShowFiltersModal(false)}>
                <IconSymbol ios_icon_name="xmark" android_material_icon_name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Rol</Text>
                <View style={styles.filterOptions}>
                  {['todos', 'admin', 'propietario', 'cliente'].map(option => (
                    <TouchableOpacity
                      key={option}
                      style={[
                        styles.filterOption,
                        filtroRol === option && styles.filterOptionActive
                      ]}
                      onPress={() => setFiltroRol(option)}
                    >
                      <Text style={[
                        styles.filterOptionText,
                        filtroRol === option && styles.filterOptionTextActive
                      ]}>
                        {option.charAt(0).toUpperCase() + option.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Estado</Text>
                <View style={styles.filterOptions}>
                  {['todos', 'activos', 'inactivos'].map(option => (
                    <TouchableOpacity
                      key={option}
                      style={[
                        styles.filterOption,
                        filtroEstado === option && styles.filterOptionActive
                      ]}
                      onPress={() => setFiltroEstado(option)}
                    >
                      <Text style={[
                        styles.filterOptionText,
                        filtroEstado === option && styles.filterOptionTextActive
                      ]}>
                        {option.charAt(0).toUpperCase() + option.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Proveedor</Text>
                <View style={styles.filterOptions}>
                  {['todos', 'barlive', 'google'].map(option => (
                    <TouchableOpacity
                      key={option}
                      style={[
                        styles.filterOption,
                        filtroProvider === option && styles.filterOptionActive
                      ]}
                      onPress={() => setFiltroProvider(option)}
                    >
                      <Text style={[
                        styles.filterOptionText,
                        filtroProvider === option && styles.filterOptionTextActive
                      ]}>
                        {option.charAt(0).toUpperCase() + option.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalButtonSecondary}
                onPress={limpiarFiltros}
              >
                <Text style={styles.modalButtonSecondaryText}>Limpiar Filtros</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalButtonPrimary}
                onPress={() => setShowFiltersModal(false)}
              >
                <Text style={styles.modalButtonPrimaryText}>Aplicar</Text>
              </TouchableOpacity>
            </View>
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
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: colors.text,
    marginTop: 16,
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
    fontWeight: '800',
    color: colors.headerText,
    flex: 1,
    textAlign: 'center',
  },
  listContent: {
    paddingBottom: 20,
  },
  statsSection: {
    padding: 16,
    backgroundColor: colors.cardBackground,
    marginBottom: 12,
  },
  statsSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.primary,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    ...commonStyles.cardShadow,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 15,
    color: colors.text,
  },
  filterButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
    gap: 8,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    gap: 6,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  filterButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  filterButtonTextActive: {
    color: colors.headerText,
  },
  clearFiltersButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 4,
  },
  clearFiltersText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  resultsIndicator: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  resultsText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  usuarioCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.cardBorder,
    ...commonStyles.cardShadow,
  },
  usuarioCardContent: {
    flexDirection: 'row',
    padding: 12,
  },
  usuarioAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 12,
  },
  avatarPlaceholder: {
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  usuarioInfo: {
    flex: 1,
  },
  usuarioHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  usuarioNombre: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
  },
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EF4444' + '20',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  adminBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#EF4444',
  },
  propietarioBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F59E0B' + '20',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  propietarioBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#F59E0B',
  },
  usuarioUsername: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '600',
    marginBottom: 4,
  },
  usuarioEmail: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  usuarioMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  providerBadge: {
    backgroundColor: colors.primary + '15',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  providerText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.primary,
    textTransform: 'uppercase',
  },
  usuarioActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  toggleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  toggleLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.text,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  viewButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: colors.badgeNuevo + '20',
    justifyContent: 'center',
    alignItems: 'center',
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
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.cardBackground,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
  },
  modalBody: {
    padding: 20,
  },
  filterSection: {
    marginBottom: 20,
  },
  filterSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 10,
  },
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterOption: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  filterOptionActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterOptionText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  filterOptionTextActive: {
    color: colors.headerText,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
  },
  modalButtonSecondary: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.background,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  modalButtonSecondaryText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  modalButtonPrimary: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  modalButtonPrimaryText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.headerText,
  },
});
