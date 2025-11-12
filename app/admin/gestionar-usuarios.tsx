
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
  Modal,
  Pressable,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, commonStyles } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { supabase } from '@/utils/supabase';
import { useRouter } from 'expo-router';

interface Usuario {
  id: string;
  nombre: string;
  email: string;
  rol_app: 'cliente' | 'propietario' | 'admin';
  avatar?: string;
  fecha_registro: string;
  activo: boolean;
}

interface Local {
  id: string;
  nombre: string;
  direccion: string;
  provincia: string;
  propietario_id?: string;
  imagen_url?: string;
}

const USUARIOS_POR_PAGINA = 20;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingTop: 50,
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
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.headerText,
    flex: 1,
    marginLeft: 12,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.background,
  },
  searchInput: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  filtersContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  filterButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterButtonText: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: colors.headerText,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.cardBackground,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  listContainer: {
    flex: 1,
  },
  usuarioCard: {
    backgroundColor: colors.cardBackground,
    marginHorizontal: 16,
    marginVertical: 6,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    flexDirection: 'row',
    alignItems: 'center',
  },
  usuarioCardSelected: {
    borderColor: colors.primary,
    borderWidth: 2,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.cardBorder,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  avatarPlaceholder: {
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.headerText,
  },
  usuarioInfo: {
    flex: 1,
  },
  usuarioNombre: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  usuarioEmail: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  usuarioMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  rolBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  rolBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.headerText,
  },
  estadoBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  estadoBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  usuarioActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: colors.cardBorder,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.background,
    borderRadius: 16,
    padding: 24,
    width: '85%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 16,
  },
  modalOption: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  modalOptionText: {
    fontSize: 16,
    color: colors.text,
  },
  modalCancel: {
    marginTop: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 16,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  localSearchInput: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: 16,
  },
  localItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  localItemSelected: {
    backgroundColor: colors.primary + '20',
  },
  localNombre: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  localDireccion: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  localPropietarioInfo: {
    fontSize: 12,
    color: colors.primary,
    marginTop: 2,
  },
  modalScrollView: {
    maxHeight: 400,
  },
  assignButton: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  assignButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.headerText,
  },
  assignButtonDisabled: {
    backgroundColor: colors.cardBorder,
  },
});

export default function GestionarUsuariosScreen() {
  const router = useRouter();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [filtroRol, setFiltroRol] = useState<string | null>(null);
  const [filtroEstado, setFiltroEstado] = useState<string | null>(null);
  const [selectedUsuarios, setSelectedUsuarios] = useState<Set<string>>(new Set());
  const [showRolModal, setShowRolModal] = useState(false);
  const [showLocalModal, setShowLocalModal] = useState(false);
  const [selectedUsuarioForRol, setSelectedUsuarioForRol] = useState<string | null>(null);
  const [selectedUsuarioForLocal, setSelectedUsuarioForLocal] = useState<string | null>(null);
  const [locales, setLocales] = useState<Local[]>([]);
  const [localSearch, setLocalSearch] = useState('');
  const [selectedLocal, setSelectedLocal] = useState<string | null>(null);
  const [loadingLocales, setLoadingLocales] = useState(false);
  const [contadores, setContadores] = useState({
    total: 0,
    clientes: 0,
    propietarios: 0,
    admins: 0,
    activos: 0,
    inactivos: 0,
  });

  const cargarContadores = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select('rol_app, activo');

      if (error) throw error;

      const stats = {
        total: data.length,
        clientes: data.filter(u => u.rol_app === 'cliente').length,
        propietarios: data.filter(u => u.rol_app === 'propietario').length,
        admins: data.filter(u => u.rol_app === 'admin').length,
        activos: data.filter(u => u.activo).length,
        inactivos: data.filter(u => !u.activo).length,
      };

      setContadores(stats);
    } catch (error) {
      console.error('[GestionarUsuarios] Error cargando contadores:', error);
    }
  }, []);

  const cargarUsuarios = useCallback(async () => {
    try {
      setLoading(true);

      let query = supabase
        .from('usuarios')
        .select('*')
        .order('fecha_registro', { ascending: false });

      if (busqueda) {
        query = query.or(`nombre.ilike.%${busqueda}%,email.ilike.%${busqueda}%`);
      }

      if (filtroRol) {
        query = query.eq('rol_app', filtroRol);
      }

      if (filtroEstado === 'activo') {
        query = query.eq('activo', true);
      } else if (filtroEstado === 'inactivo') {
        query = query.eq('activo', false);
      }

      const { data, error } = await query;

      if (error) throw error;

      setUsuarios(data || []);
    } catch (error) {
      console.error('[GestionarUsuarios] Error cargando usuarios:', error);
      Alert.alert('Error', 'No se pudieron cargar los usuarios');
    } finally {
      setLoading(false);
    }
  }, [busqueda, filtroRol, filtroEstado]);

  const cargarLocales = useCallback(async () => {
    try {
      setLoadingLocales(true);
      const { data, error } = await supabase
        .from('locales')
        .select('id, nombre, direccion, provincia, propietario_id, imagen_url')
        .eq('activo', true)
        .order('nombre');

      if (error) throw error;

      setLocales(data || []);
    } catch (error) {
      console.error('[GestionarUsuarios] Error cargando locales:', error);
      Alert.alert('Error', 'No se pudieron cargar los locales');
    } finally {
      setLoadingLocales(false);
    }
  }, []);

  useEffect(() => {
    cargarContadores();
    cargarUsuarios();
  }, [cargarContadores, cargarUsuarios]);

  const toggleEstadoUsuario = async (usuarioId: string, activo: boolean) => {
    try {
      const { error } = await supabase
        .from('usuarios')
        .update({ activo: !activo })
        .eq('id', usuarioId);

      if (error) throw error;

      Alert.alert('Éxito', `Usuario ${!activo ? 'activado' : 'desactivado'} correctamente`);
      cargarUsuarios();
      cargarContadores();
    } catch (error) {
      console.error('[GestionarUsuarios] Error actualizando estado:', error);
      Alert.alert('Error', 'No se pudo actualizar el estado del usuario');
    }
  };

  const cambiarRolUsuario = async (usuarioId: string, nuevoRol: string) => {
    try {
      console.log('[GestionarUsuarios] Changing role for user:', usuarioId, 'to:', nuevoRol);
      
      const { error: updateError } = await supabase
        .from('usuarios')
        .update({ rol_app: nuevoRol })
        .eq('id', usuarioId);

      if (updateError) {
        console.error('[GestionarUsuarios] Error updating role:', updateError);
        throw updateError;
      }

      const { data: verifyData, error: verifyError } = await supabase
        .from('usuarios')
        .select('rol_app')
        .eq('id', usuarioId)
        .single();

      if (verifyError) {
        console.error('[GestionarUsuarios] Error verifying role:', verifyError);
        throw verifyError;
      }

      console.log('[GestionarUsuarios] Role verified:', verifyData.rol_app);

      if (verifyData.rol_app !== nuevoRol) {
        throw new Error('Role update verification failed');
      }

      Alert.alert('Éxito', 'Rol actualizado correctamente');
      setShowRolModal(false);
      setSelectedUsuarioForRol(null);
      await cargarUsuarios();
      await cargarContadores();
    } catch (error) {
      console.error('[GestionarUsuarios] Error changing role:', error);
      Alert.alert('Error', 'No se pudo cambiar el rol del usuario. Verifica los permisos de la base de datos.');
    }
  };

  const abrirModalAsignarLocal = async (usuarioId: string) => {
    const usuario = usuarios.find(u => u.id === usuarioId);
    
    if (!usuario) return;

    if (usuario.rol_app !== 'propietario') {
      Alert.alert(
        'Rol Incorrecto',
        'Solo puedes asignar locales a usuarios con rol de propietario.',
        [{ text: 'OK' }]
      );
      return;
    }

    setSelectedUsuarioForLocal(usuarioId);
    setSelectedLocal(null);
    setLocalSearch('');
    await cargarLocales();
    setShowLocalModal(true);
  };

  const asignarLocalAUsuario = async () => {
    if (!selectedUsuarioForLocal || !selectedLocal) {
      Alert.alert('Error', 'Debes seleccionar un local');
      return;
    }

    try {
      console.log('[GestionarUsuarios] Assigning locale:', selectedLocal, 'to user:', selectedUsuarioForLocal);

      const { error } = await supabase
        .from('locales')
        .update({ propietario_id: selectedUsuarioForLocal })
        .eq('id', selectedLocal);

      if (error) throw error;

      Alert.alert('Éxito', 'Local asignado correctamente al propietario');
      setShowLocalModal(false);
      setSelectedUsuarioForLocal(null);
      setSelectedLocal(null);
      cargarLocales();
    } catch (error) {
      console.error('[GestionarUsuarios] Error asignando local:', error);
      Alert.alert('Error', 'No se pudo asignar el local al usuario');
    }
  };

  const eliminarUsuario = async (usuarioId: string) => {
    Alert.alert(
      'Confirmar eliminación',
      '¿Estás seguro de que quieres eliminar este usuario? Esta acción no se puede deshacer.',
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
                .eq('id', usuarioId);

              if (error) throw error;

              Alert.alert('Éxito', 'Usuario eliminado correctamente');
              cargarUsuarios();
              cargarContadores();
            } catch (error) {
              console.error('[GestionarUsuarios] Error eliminando usuario:', error);
              Alert.alert('Error', 'No se pudo eliminar el usuario');
            }
          },
        },
      ]
    );
  };

  const toggleSeleccionUsuario = (usuarioId: string) => {
    const newSelected = new Set(selectedUsuarios);
    if (newSelected.has(usuarioId)) {
      newSelected.delete(usuarioId);
    } else {
      newSelected.add(usuarioId);
    }
    setSelectedUsuarios(newSelected);
  };

  const seleccionarTodos = () => {
    if (selectedUsuarios.size === usuarios.length) {
      setSelectedUsuarios(new Set());
    } else {
      setSelectedUsuarios(new Set(usuarios.map(u => u.id)));
    }
  };

  const eliminarSeleccionados = () => {
    if (selectedUsuarios.size === 0) return;

    Alert.alert(
      'Confirmar eliminación',
      `¿Estás seguro de que quieres eliminar ${selectedUsuarios.size} usuarios? Esta acción no se puede deshacer.`,
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
                .in('id', Array.from(selectedUsuarios));

              if (error) throw error;

              Alert.alert('Éxito', 'Usuarios eliminados correctamente');
              setSelectedUsuarios(new Set());
              cargarUsuarios();
              cargarContadores();
            } catch (error) {
              console.error('[GestionarUsuarios] Error eliminando usuarios:', error);
              Alert.alert('Error', 'No se pudieron eliminar los usuarios');
            }
          },
        },
      ]
    );
  };

  const limpiarFiltros = () => {
    setBusqueda('');
    setFiltroRol(null);
    setFiltroEstado(null);
  };

  const hayFiltrosActivos = () => {
    return busqueda !== '' || filtroRol !== null || filtroEstado !== null;
  };

  const getRolColor = (rol: string) => {
    switch (rol) {
      case 'admin':
        return '#EF4444';
      case 'propietario':
        return '#F59E0B';
      case 'cliente':
        return colors.primary;
      default:
        return colors.textSecondary;
    }
  };

  const getRolLabel = (rol: string) => {
    switch (rol) {
      case 'admin':
        return 'Admin';
      case 'propietario':
        return 'Propietario';
      case 'cliente':
        return 'Cliente';
      default:
        return rol;
    }
  };

  const localesFiltrados = locales.filter(local => {
    if (!localSearch) return true;
    return local.nombre.toLowerCase().includes(localSearch.toLowerCase()) ||
           local.direccion.toLowerCase().includes(localSearch.toLowerCase());
  });

  const renderUsuarioCard = ({ item }: { item: Usuario }) => (
    <TouchableOpacity
      style={[
        styles.usuarioCard,
        selectedUsuarios.has(item.id) && styles.usuarioCardSelected,
      ]}
      onPress={() => toggleSeleccionUsuario(item.id)}
      activeOpacity={0.7}
    >
      <View style={styles.checkbox}>
        {selectedUsuarios.has(item.id) && (
          <View style={styles.checkboxSelected}>
            <IconSymbol name="checkmark" size={16} color={colors.headerText} />
          </View>
        )}
      </View>

      {item.avatar ? (
        <Image source={{ uri: item.avatar }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatar, styles.avatarPlaceholder]}>
          <Text style={styles.avatarText}>
            {item.nombre.charAt(0).toUpperCase()}
          </Text>
        </View>
      )}

      <View style={styles.usuarioInfo}>
        <Text style={styles.usuarioNombre}>{item.nombre}</Text>
        <Text style={styles.usuarioEmail}>{item.email}</Text>
        <View style={styles.usuarioMeta}>
          <View style={[styles.rolBadge, { backgroundColor: getRolColor(item.rol_app) }]}>
            <Text style={styles.rolBadgeText}>{getRolLabel(item.rol_app)}</Text>
          </View>
          <View
            style={[
              styles.estadoBadge,
              { backgroundColor: item.activo ? '#22C55E' : '#EF4444' },
            ]}
          >
            <Text style={[styles.estadoBadgeText, { color: colors.headerText }]}>
              {item.activo ? 'Activo' : 'Inactivo'}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.usuarioActions}>
        {item.rol_app === 'propietario' && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => abrirModalAsignarLocal(item.id)}
          >
            <IconSymbol name="building.2" size={20} color={colors.text} />
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => {
            setSelectedUsuarioForRol(item.id);
            setShowRolModal(true);
          }}
        >
          <IconSymbol name="person.badge.key" size={20} color={colors.text} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => toggleEstadoUsuario(item.id, item.activo)}
        >
          <IconSymbol
            name={item.activo ? 'pause.circle' : 'play.circle'}
            size={20}
            color={colors.text}
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => eliminarUsuario(item.id)}
        >
          <IconSymbol name="trash" size={20} color="#EF4444" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const renderHeader = () => (
    <>
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar por nombre o email..."
          placeholderTextColor={colors.textSecondary}
          value={busqueda}
          onChangeText={setBusqueda}
        />
      </View>

      <View style={styles.filtersContainer}>
        <TouchableOpacity
          style={[
            styles.filterButton,
            filtroRol === 'cliente' && styles.filterButtonActive,
          ]}
          onPress={() => setFiltroRol(filtroRol === 'cliente' ? null : 'cliente')}
        >
          <Text
            style={[
              styles.filterButtonText,
              filtroRol === 'cliente' && styles.filterButtonTextActive,
            ]}
          >
            Clientes ({contadores.clientes})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterButton,
            filtroRol === 'propietario' && styles.filterButtonActive,
          ]}
          onPress={() => setFiltroRol(filtroRol === 'propietario' ? null : 'propietario')}
        >
          <Text
            style={[
              styles.filterButtonText,
              filtroRol === 'propietario' && styles.filterButtonTextActive,
            ]}
          >
            Propietarios ({contadores.propietarios})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterButton,
            filtroRol === 'admin' && styles.filterButtonActive,
          ]}
          onPress={() => setFiltroRol(filtroRol === 'admin' ? null : 'admin')}
        >
          <Text
            style={[
              styles.filterButtonText,
              filtroRol === 'admin' && styles.filterButtonTextActive,
            ]}
          >
            Admins ({contadores.admins})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterButton,
            filtroEstado === 'activo' && styles.filterButtonActive,
          ]}
          onPress={() => setFiltroEstado(filtroEstado === 'activo' ? null : 'activo')}
        >
          <Text
            style={[
              styles.filterButtonText,
              filtroEstado === 'activo' && styles.filterButtonTextActive,
            ]}
          >
            Activos ({contadores.activos})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterButton,
            filtroEstado === 'inactivo' && styles.filterButtonActive,
          ]}
          onPress={() => setFiltroEstado(filtroEstado === 'inactivo' ? null : 'inactivo')}
        >
          <Text
            style={[
              styles.filterButtonText,
              filtroEstado === 'inactivo' && styles.filterButtonTextActive,
            ]}
          >
            Inactivos ({contadores.inactivos})
          </Text>
        </TouchableOpacity>

        {hayFiltrosActivos() && (
          <TouchableOpacity style={styles.filterButton} onPress={limpiarFiltros}>
            <Text style={styles.filterButtonText}>Limpiar filtros</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{contadores.total}</Text>
          <Text style={styles.statLabel}>Total usuarios</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{selectedUsuarios.size}</Text>
          <Text style={styles.statLabel}>Seleccionados</Text>
        </View>
      </View>

      {selectedUsuarios.size > 0 && (
        <View style={styles.filtersContainer}>
          <TouchableOpacity style={styles.filterButton} onPress={seleccionarTodos}>
            <Text style={styles.filterButtonText}>
              {selectedUsuarios.size === usuarios.length ? 'Deseleccionar todos' : 'Seleccionar todos'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, { backgroundColor: '#EF4444', borderColor: '#EF4444' }]}
            onPress={eliminarSeleccionados}
          >
            <Text style={[styles.filterButtonText, { color: colors.headerText }]}>
              Eliminar seleccionados
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </>
  );

  const renderFooter = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      );
    }
    return null;
  };

  const renderEmpty = () => {
    if (loading) return null;
    return (
      <View style={styles.emptyContainer}>
        <IconSymbol name="person.2" size={64} color={colors.textSecondary} />
        <Text style={styles.emptyText}>
          {hayFiltrosActivos()
            ? 'No se encontraron usuarios con los filtros aplicados'
            : 'No hay usuarios registrados'}
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.headerGradientStart, colors.headerGradientEnd]}
        style={styles.header}
      >
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <IconSymbol name="chevron.left" size={24} color={colors.headerText} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Gestionar Usuarios</Text>
      </LinearGradient>

      <FlatList
        data={usuarios}
        renderItem={renderUsuarioCard}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={{ flexGrow: 1 }}
      />

      <Modal
        visible={showRolModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowRolModal(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowRolModal(false)}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>Cambiar rol de usuario</Text>
            <TouchableOpacity
              style={styles.modalOption}
              onPress={() => selectedUsuarioForRol && cambiarRolUsuario(selectedUsuarioForRol, 'cliente')}
            >
              <Text style={styles.modalOptionText}>Cliente</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalOption}
              onPress={() => selectedUsuarioForRol && cambiarRolUsuario(selectedUsuarioForRol, 'propietario')}
            >
              <Text style={styles.modalOptionText}>Propietario</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalOption}
              onPress={() => selectedUsuarioForRol && cambiarRolUsuario(selectedUsuarioForRol, 'admin')}
            >
              <Text style={styles.modalOptionText}>Admin</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalCancel} onPress={() => setShowRolModal(false)}>
              <Text style={styles.modalCancelText}>Cancelar</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={showLocalModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLocalModal(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowLocalModal(false)}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>Asignar Local a Propietario</Text>
            
            <TextInput
              style={styles.localSearchInput}
              placeholder="Buscar local..."
              placeholderTextColor={colors.textSecondary}
              value={localSearch}
              onChangeText={setLocalSearch}
            />

            {loadingLocales ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            ) : (
              <ScrollView style={styles.modalScrollView}>
                {localesFiltrados.map((local) => (
                  <TouchableOpacity
                    key={local.id}
                    style={[
                      styles.localItem,
                      selectedLocal === local.id && styles.localItemSelected,
                    ]}
                    onPress={() => setSelectedLocal(local.id)}
                  >
                    <Text style={styles.localNombre}>{local.nombre}</Text>
                    <Text style={styles.localDireccion}>
                      {local.direccion} - {local.provincia}
                    </Text>
                    {local.propietario_id && (
                      <Text style={styles.localPropietarioInfo}>
                        ⚠️ Ya tiene propietario asignado
                      </Text>
                    )}
                  </TouchableOpacity>
                ))}
                {localesFiltrados.length === 0 && (
                  <Text style={styles.emptyText}>No se encontraron locales</Text>
                )}
              </ScrollView>
            )}

            <TouchableOpacity
              style={[
                styles.assignButton,
                !selectedLocal && styles.assignButtonDisabled,
              ]}
              onPress={asignarLocalAUsuario}
              disabled={!selectedLocal}
            >
              <Text style={styles.assignButtonText}>Asignar Local</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.modalCancel} onPress={() => setShowLocalModal(false)}>
              <Text style={styles.modalCancelText}>Cancelar</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
