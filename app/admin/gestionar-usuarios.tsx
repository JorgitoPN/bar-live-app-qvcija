
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
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, commonStyles } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { supabase } from '@/utils/supabase';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');
const isTablet = width >= 768;

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

interface ImpersonationSession {
  id: string;
  admin_id: string;
  impersonated_user_id: string;
  impersonated_user_name: string;
  started_at: string;
  is_active: boolean;
}

const USUARIOS_POR_PAGINA = 20;
const IMPERSONATION_KEY = '@barlive_impersonation_session';

export default function GestionarUsuariosScreen() {
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [filtroRol, setFiltroRol] = useState<string | null>(null);
  const [filtroEstado, setFiltroEstado] = useState<string | null>(null);
  const [selectedUsuarios, setSelectedUsuarios] = useState<Set<string>>(new Set());
  const [showRolModal, setShowRolModal] = useState(false);
  const [showLocalModal, setShowLocalModal] = useState(false);
  const [showImpersonateModal, setShowImpersonateModal] = useState(false);
  const [showMessageAccessModal, setShowMessageAccessModal] = useState(false);
  const [selectedUsuarioForRol, setSelectedUsuarioForRol] = useState<string | null>(null);
  const [selectedUsuarioForLocal, setSelectedUsuarioForLocal] = useState<string | null>(null);
  const [selectedUsuarioForImpersonate, setSelectedUsuarioForImpersonate] = useState<Usuario | null>(null);
  const [selectedUsuarioForMessageAccess, setSelectedUsuarioForMessageAccess] = useState<Usuario | null>(null);
  const [messageAccessReason, setMessageAccessReason] = useState('');
  const [requestingMessageAccess, setRequestingMessageAccess] = useState(false);
  const [locales, setLocales] = useState<Local[]>([]);
  const [localSearch, setLocalSearch] = useState('');
  const [selectedLocal, setSelectedLocal] = useState<string | null>(null);
  const [loadingLocales, setLoadingLocales] = useState(false);
  const [activeImpersonation, setActiveImpersonation] = useState<ImpersonationSession | null>(null);
  const [contadores, setContadores] = useState({
    total: 0,
    clientes: 0,
    propietarios: 0,
    admins: 0,
    activos: 0,
    inactivos: 0,
  });

  // Check for active impersonation session on mount
  useEffect(() => {
    checkActiveImpersonation();
  }, []);

  const checkActiveImpersonation = async () => {
    try {
      // Check AsyncStorage first
      const storedSession = await AsyncStorage.getItem(IMPERSONATION_KEY);
      if (storedSession) {
        const session = JSON.parse(storedSession);
        setActiveImpersonation(session);
      }

      // Also check database for active sessions
      if (currentUser) {
        const { data, error } = await supabase
          .from('admin_impersonation_sessions')
          .select('*')
          .eq('admin_id', currentUser.id)
          .eq('is_active', true)
          .order('started_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          setActiveImpersonation(data);
          await AsyncStorage.setItem(IMPERSONATION_KEY, JSON.stringify(data));
        }
      }
    } catch (error) {
      console.error('[GestionarUsuarios] Error checking impersonation:', error);
    }
  };

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
      console.log('[GestionarUsuarios] Cambiando rol del usuario:', usuarioId, 'a:', nuevoRol);
      
      const { error: updateError } = await supabase
        .from('usuarios')
        .update({ rol_app: nuevoRol })
        .eq('id', usuarioId);

      if (updateError) {
        console.error('[GestionarUsuarios] Error actualizando rol:', updateError);
        throw updateError;
      }

      const { data: verifyData, error: verifyError } = await supabase
        .from('usuarios')
        .select('rol_app')
        .eq('id', usuarioId)
        .single();

      if (verifyError) {
        console.error('[GestionarUsuarios] Error verificando rol:', verifyError);
        throw verifyError;
      }

      console.log('[GestionarUsuarios] Rol verificado:', verifyData.rol_app);

      if (verifyData.rol_app !== nuevoRol) {
        throw new Error('La verificación del rol falló');
      }

      Alert.alert('Éxito', 'Rol actualizado correctamente');
      setShowRolModal(false);
      setSelectedUsuarioForRol(null);
      await cargarUsuarios();
      await cargarContadores();
    } catch (error) {
      console.error('[GestionarUsuarios] Error cambiando rol:', error);
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
      console.log('[GestionarUsuarios] Asignando local:', selectedLocal, 'al usuario:', selectedUsuarioForLocal);

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

  const abrirModalImpersonar = (usuario: Usuario) => {
    setSelectedUsuarioForImpersonate(usuario);
    setShowImpersonateModal(true);
  };

  const impersonarUsuario = async () => {
    if (!selectedUsuarioForImpersonate || !currentUser) return;

    try {
      // Create impersonation session in database
      const { data: sessionData, error: sessionError } = await supabase
        .from('admin_impersonation_sessions')
        .insert({
          admin_id: currentUser.id,
          impersonated_user_id: selectedUsuarioForImpersonate.id,
          admin_email: currentUser.email || '',
          impersonated_user_email: selectedUsuarioForImpersonate.email,
          impersonated_user_name: selectedUsuarioForImpersonate.nombre,
          is_active: true,
          reason: 'Admin impersonation for support/debugging',
        })
        .select()
        .single();

      if (sessionError) throw sessionError;

      // Store in AsyncStorage for persistence
      await AsyncStorage.setItem(IMPERSONATION_KEY, JSON.stringify(sessionData));
      setActiveImpersonation(sessionData);

      Alert.alert(
        'Impersonación Activada',
        `Ahora estás viendo la aplicación como ${selectedUsuarioForImpersonate.nombre}.\n\n` +
        'IMPORTANTE:\n' +
        '- Toda la aplicación (BarLive y red social) se mostrará como este usuario\n' +
        '- La impersonación permanecerá activa hasta que la finalices\n' +
        '- Todas las acciones quedarán registradas\n' +
        '- Para salir, usa el botón "Finalizar Impersonación" en el panel de administración',
        [
          {
            text: 'Entendido',
            onPress: () => {
              console.log('[Impersonation] Started:', sessionData);
              setShowImpersonateModal(false);
              // Navigate to user's profile to start viewing as them
              router.push(`/perfil/usuario?id=${selectedUsuarioForImpersonate.id}` as any);
            },
          },
        ]
      );
    } catch (error) {
      console.error('[GestionarUsuarios] Error impersonando usuario:', error);
      Alert.alert('Error', 'No se pudo iniciar la impersonación');
    }
  };

  const finalizarImpersonacion = async () => {
    if (!activeImpersonation) return;

    Alert.alert(
      'Finalizar Impersonación',
      '¿Estás seguro de que quieres finalizar la impersonación y volver a tu cuenta de administrador?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Finalizar',
          style: 'destructive',
          onPress: async () => {
            try {
              // Update session in database
              const { error } = await supabase
                .from('admin_impersonation_sessions')
                .update({
                  is_active: false,
                  ended_at: new Date().toISOString(),
                })
                .eq('id', activeImpersonation.id);

              if (error) throw error;

              // Clear AsyncStorage
              await AsyncStorage.removeItem(IMPERSONATION_KEY);
              setActiveImpersonation(null);

              Alert.alert('Éxito', 'Impersonación finalizada. Has vuelto a tu cuenta de administrador.');
              
              // Refresh the page to reset the view
              router.replace('/admin/gestionar-usuarios' as any);
            } catch (error) {
              console.error('[GestionarUsuarios] Error finalizando impersonación:', error);
              Alert.alert('Error', 'No se pudo finalizar la impersonación');
            }
          },
        },
      ]
    );
  };

  const abrirModalAccesoMensajes = (usuario: Usuario) => {
    setSelectedUsuarioForMessageAccess(usuario);
    setMessageAccessReason('');
    setShowMessageAccessModal(true);
  };

  const solicitarAccesoMensajes = async () => {
    if (!selectedUsuarioForMessageAccess || !currentUser) {
      Alert.alert('Error', 'Información de usuario no disponible');
      return;
    }

    if (!messageAccessReason.trim()) {
      Alert.alert('Error', 'Debes proporcionar una razón para solicitar acceso');
      return;
    }

    setRequestingMessageAccess(true);

    try {
      const { data: existingRequest, error: checkError } = await supabase
        .from('admin_message_access_requests')
        .select('*')
        .eq('admin_id', currentUser.id)
        .eq('user_id', selectedUsuarioForMessageAccess.id)
        .in('status', ['pending', 'approved'])
        .maybeSingle();

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }

      if (existingRequest) {
        if (existingRequest.status === 'approved') {
          Alert.alert(
            'Acceso Ya Concedido',
            'Ya tienes acceso aprobado a los mensajes de este usuario.'
          );
        } else {
          Alert.alert(
            'Solicitud Pendiente',
            'Ya existe una solicitud pendiente para este usuario. Espera su respuesta.'
          );
        }
        setShowMessageAccessModal(false);
        return;
      }

      const { error: insertError } = await supabase
        .from('admin_message_access_requests')
        .insert({
          admin_id: currentUser.id,
          user_id: selectedUsuarioForMessageAccess.id,
          reason: messageAccessReason.trim(),
          status: 'pending',
        });

      if (insertError) throw insertError;

      Alert.alert(
        'Solicitud Enviada',
        `Se ha enviado una solicitud de acceso a ${selectedUsuarioForMessageAccess.nombre}. El usuario recibirá una notificación y podrá aprobar o denegar tu solicitud.`
      );

      setShowMessageAccessModal(false);
      setSelectedUsuarioForMessageAccess(null);
      setMessageAccessReason('');
    } catch (error) {
      console.error('[GestionarUsuarios] Error solicitando acceso:', error);
      Alert.alert('Error', 'No se pudo enviar la solicitud de acceso');
    } finally {
      setRequestingMessageAccess(false);
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
    <View style={[styles.usuarioCard, isTablet && styles.usuarioCardTablet]}>
      <TouchableOpacity
        style={styles.checkboxContainer}
        onPress={() => toggleSeleccionUsuario(item.id)}
        activeOpacity={0.7}
      >
        <View style={[
          styles.checkbox,
          selectedUsuarios.has(item.id) && styles.checkboxSelected
        ]}>
          {selectedUsuarios.has(item.id) && (
            <IconSymbol ios_icon_name="checkmark" android_material_icon_name="check" size={16} color={colors.white} />
          )}
        </View>
      </TouchableOpacity>

      <View style={styles.usuarioMainContent}>
        <View style={styles.usuarioHeader}>
          {item.avatar ? (
            <Image source={{ uri: item.avatar }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder, { backgroundColor: getRolColor(item.rol_app) }]}>
              <Text style={styles.avatarText}>
                {item.nombre.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}

          <View style={styles.usuarioInfo}>
            <Text style={styles.usuarioNombre} numberOfLines={1}>{item.nombre}</Text>
            <Text style={styles.usuarioEmail} numberOfLines={1}>{item.email}</Text>
            <View style={styles.usuarioMeta}>
              <View style={[styles.rolBadge, { backgroundColor: getRolColor(item.rol_app) }]}>
                <Text style={styles.rolBadgeText}>{getRolLabel(item.rol_app)}</Text>
              </View>
              <View
                style={[
                  styles.estadoBadge,
                  { backgroundColor: item.activo ? '#10B981' : '#EF4444' },
                ]}
              >
                <Text style={styles.estadoBadgeText}>
                  {item.activo ? 'Activo' : 'Inactivo'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.usuarioActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => abrirModalImpersonar(item)}
          >
            <IconSymbol ios_icon_name="person.crop.circle.badge.checkmark" android_material_icon_name="supervised_user_circle" size={20} color={colors.primary} />
            <Text style={styles.actionButtonText}>Ver como</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => abrirModalAccesoMensajes(item)}
          >
            <IconSymbol ios_icon_name="envelope.badge.shield.half.filled" android_material_icon_name="mark_email_read" size={20} color="#F59E0B" />
            <Text style={styles.actionButtonText}>Mensajes</Text>
          </TouchableOpacity>
          {item.rol_app === 'propietario' && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => abrirModalAsignarLocal(item.id)}
            >
              <IconSymbol ios_icon_name="building.2" android_material_icon_name="store" size={20} color="#10B981" />
              <Text style={styles.actionButtonText}>Local</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => {
              setSelectedUsuarioForRol(item.id);
              setShowRolModal(true);
            }}
          >
            <IconSymbol ios_icon_name="person.badge.key" android_material_icon_name="admin_panel_settings" size={20} color="#8B5CF6" />
            <Text style={styles.actionButtonText}>Rol</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => toggleEstadoUsuario(item.id, item.activo)}
          >
            <IconSymbol
              ios_icon_name={item.activo ? 'pause.circle' : 'play.circle'}
              android_material_icon_name={item.activo ? 'pause_circle' : 'play_circle'}
              size={20}
              color={item.activo ? '#F59E0B' : '#10B981'}
            />
            <Text style={styles.actionButtonText}>{item.activo ? 'Pausar' : 'Activar'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => eliminarUsuario(item.id)}
          >
            <IconSymbol ios_icon_name="trash" android_material_icon_name="delete" size={20} color="#EF4444" />
            <Text style={styles.actionButtonText}>Eliminar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const renderHeader = () => (
    <>
      {/* Active Impersonation Banner */}
      {activeImpersonation && (
        <View style={styles.impersonationBanner}>
          <View style={styles.impersonationBannerContent}>
            <IconSymbol ios_icon_name="person.crop.circle.badge.checkmark" android_material_icon_name="supervised_user_circle" size={24} color={colors.white} />
            <View style={styles.impersonationBannerText}>
              <Text style={styles.impersonationBannerTitle}>
                Impersonando a {activeImpersonation.impersonated_user_name}
              </Text>
              <Text style={styles.impersonationBannerSubtitle}>
                Toda la app se muestra como este usuario
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.impersonationBannerButton}
            onPress={finalizarImpersonacion}
          >
            <Text style={styles.impersonationBannerButtonText}>Finalizar</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <IconSymbol ios_icon_name="magnifyingglass" android_material_icon_name="search" size={20} color={colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por nombre o email..."
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
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filtersContainer}
        contentContainerStyle={styles.filtersContent}
      >
        <TouchableOpacity
          style={[
            styles.filterChip,
            filtroRol === 'cliente' && styles.filterChipActive,
          ]}
          onPress={() => setFiltroRol(filtroRol === 'cliente' ? null : 'cliente')}
        >
          <IconSymbol
            ios_icon_name="person.fill"
            android_material_icon_name="person"
            size={16}
            color={filtroRol === 'cliente' ? colors.white : colors.primary}
          />
          <Text
            style={[
              styles.filterChipText,
              filtroRol === 'cliente' && styles.filterChipTextActive,
            ]}
          >
            Clientes ({contadores.clientes})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterChip,
            filtroRol === 'propietario' && styles.filterChipActive,
          ]}
          onPress={() => setFiltroRol(filtroRol === 'propietario' ? null : 'propietario')}
        >
          <IconSymbol
            ios_icon_name="building.2.fill"
            android_material_icon_name="store"
            size={16}
            color={filtroRol === 'propietario' ? colors.white : '#F59E0B'}
          />
          <Text
            style={[
              styles.filterChipText,
              filtroRol === 'propietario' && styles.filterChipTextActive,
            ]}
          >
            Propietarios ({contadores.propietarios})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterChip,
            filtroRol === 'admin' && styles.filterChipActive,
          ]}
          onPress={() => setFiltroRol(filtroRol === 'admin' ? null : 'admin')}
        >
          <IconSymbol
            ios_icon_name="shield.fill"
            android_material_icon_name="shield"
            size={16}
            color={filtroRol === 'admin' ? colors.white : '#EF4444'}
          />
          <Text
            style={[
              styles.filterChipText,
              filtroRol === 'admin' && styles.filterChipTextActive,
            ]}
          >
            Admins ({contadores.admins})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterChip,
            filtroEstado === 'activo' && styles.filterChipActive,
          ]}
          onPress={() => setFiltroEstado(filtroEstado === 'activo' ? null : 'activo')}
        >
          <IconSymbol
            ios_icon_name="checkmark.circle.fill"
            android_material_icon_name="check_circle"
            size={16}
            color={filtroEstado === 'activo' ? colors.white : '#10B981'}
          />
          <Text
            style={[
              styles.filterChipText,
              filtroEstado === 'activo' && styles.filterChipTextActive,
            ]}
          >
            Activos ({contadores.activos})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterChip,
            filtroEstado === 'inactivo' && styles.filterChipActive,
          ]}
          onPress={() => setFiltroEstado(filtroEstado === 'inactivo' ? null : 'inactivo')}
        >
          <IconSymbol
            ios_icon_name="xmark.circle.fill"
            android_material_icon_name="cancel"
            size={16}
            color={filtroEstado === 'inactivo' ? colors.white : '#EF4444'}
          />
          <Text
            style={[
              styles.filterChipText,
              filtroEstado === 'inactivo' && styles.filterChipTextActive,
            ]}
          >
            Inactivos ({contadores.inactivos})
          </Text>
        </TouchableOpacity>

        {hayFiltrosActivos() && (
          <TouchableOpacity style={styles.filterChipClear} onPress={limpiarFiltros}>
            <IconSymbol ios_icon_name="arrow.counterclockwise" android_material_icon_name="refresh" size={16} color={colors.primary} />
            <Text style={styles.filterChipClearText}>Limpiar</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      <View style={[styles.statsContainer, isTablet && styles.statsContainerTablet]}>
        <View style={styles.statCard}>
          <IconSymbol ios_icon_name="person.3.fill" android_material_icon_name="people" size={24} color={colors.primary} />
          <Text style={styles.statValue}>{contadores.total}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statCard}>
          <IconSymbol ios_icon_name="checkmark.seal.fill" android_material_icon_name="verified" size={24} color="#10B981" />
          <Text style={styles.statValue}>{contadores.activos}</Text>
          <Text style={styles.statLabel}>Activos</Text>
        </View>
        <View style={styles.statCard}>
          <IconSymbol ios_icon_name="checkmark.circle.fill" android_material_icon_name="check_circle" size={24} color={colors.primary} />
          <Text style={styles.statValue}>{selectedUsuarios.size}</Text>
          <Text style={styles.statLabel}>Seleccionados</Text>
        </View>
      </View>

      {selectedUsuarios.size > 0 && (
        <View style={styles.bulkActionsContainer}>
          <TouchableOpacity style={styles.bulkActionButton} onPress={seleccionarTodos}>
            <IconSymbol
              ios_icon_name={selectedUsuarios.size === usuarios.length ? "checkmark.square.fill" : "square"}
              android_material_icon_name={selectedUsuarios.size === usuarios.length ? "check_box" : "check_box_outline_blank"}
              size={20}
              color={colors.primary}
            />
            <Text style={styles.bulkActionText}>
              {selectedUsuarios.size === usuarios.length ? 'Deseleccionar todos' : 'Seleccionar todos'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.bulkActionButton, styles.bulkActionButtonDanger]}
            onPress={eliminarSeleccionados}
          >
            <IconSymbol ios_icon_name="trash.fill" android_material_icon_name="delete" size={20} color={colors.white} />
            <Text style={[styles.bulkActionText, { color: colors.white }]}>
              Eliminar ({selectedUsuarios.size})
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
          <Text style={styles.loadingText}>Cargando usuarios...</Text>
        </View>
      );
    }
    return null;
  };

  const renderEmpty = () => {
    if (loading) return null;
    return (
      <View style={styles.emptyContainer}>
        <IconSymbol ios_icon_name="person.2.slash" android_material_icon_name="people_outline" size={64} color={colors.textSecondary} />
        <Text style={styles.emptyText}>
          {hayFiltrosActivos()
            ? 'No se encontraron usuarios con los filtros aplicados'
            : 'No hay usuarios registrados'}
        </Text>
        {hayFiltrosActivos() && (
          <TouchableOpacity style={styles.emptyButton} onPress={limpiarFiltros}>
            <Text style={styles.emptyButtonText}>Limpiar filtros</Text>
          </TouchableOpacity>
        )}
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
          <IconSymbol ios_icon_name="chevron.left" android_material_icon_name="arrow_back" size={24} color={colors.headerText} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Gestionar Usuarios</Text>
          <Text style={styles.headerSubtitle}>Administra roles, permisos y accesos</Text>
        </View>
        <TouchableOpacity style={styles.refreshButton} onPress={() => { cargarUsuarios(); cargarContadores(); }}>
          <IconSymbol ios_icon_name="arrow.clockwise" android_material_icon_name="refresh" size={24} color={colors.headerText} />
        </TouchableOpacity>
      </LinearGradient>

      <FlatList
        data={usuarios}
        renderItem={renderUsuarioCard}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      {/* Role Change Modal */}
      <Modal
        visible={showRolModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowRolModal(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowRolModal(false)}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Cambiar Rol de Usuario</Text>
              <TouchableOpacity onPress={() => setShowRolModal(false)}>
                <IconSymbol ios_icon_name="xmark.circle.fill" android_material_icon_name="cancel" size={28} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalDescription}>Selecciona el nuevo rol para este usuario</Text>
            
            <TouchableOpacity
              style={styles.modalOption}
              onPress={() => selectedUsuarioForRol && cambiarRolUsuario(selectedUsuarioForRol, 'cliente')}
            >
              <View style={[styles.modalOptionIcon, { backgroundColor: colors.primary + '20' }]}>
                <IconSymbol ios_icon_name="person.fill" android_material_icon_name="person" size={24} color={colors.primary} />
              </View>
              <View style={styles.modalOptionContent}>
                <Text style={styles.modalOptionTitle}>Cliente</Text>
                <Text style={styles.modalOptionDescription}>Usuario estándar con acceso básico</Text>
              </View>
              <IconSymbol ios_icon_name="chevron.right" android_material_icon_name="chevron_right" size={20} color={colors.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalOption}
              onPress={() => selectedUsuarioForRol && cambiarRolUsuario(selectedUsuarioForRol, 'propietario')}
            >
              <View style={[styles.modalOptionIcon, { backgroundColor: '#F59E0B20' }]}>
                <IconSymbol ios_icon_name="building.2.fill" android_material_icon_name="store" size={24} color="#F59E0B" />
              </View>
              <View style={styles.modalOptionContent}>
                <Text style={styles.modalOptionTitle}>Propietario</Text>
                <Text style={styles.modalOptionDescription}>Puede gestionar locales y eventos</Text>
              </View>
              <IconSymbol ios_icon_name="chevron.right" android_material_icon_name="chevron_right" size={20} color={colors.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalOption}
              onPress={() => selectedUsuarioForRol && cambiarRolUsuario(selectedUsuarioForRol, 'admin')}
            >
              <View style={[styles.modalOptionIcon, { backgroundColor: '#EF444420' }]}>
                <IconSymbol ios_icon_name="shield.fill" android_material_icon_name="shield" size={24} color="#EF4444" />
              </View>
              <View style={styles.modalOptionContent}>
                <Text style={styles.modalOptionTitle}>Administrador</Text>
                <Text style={styles.modalOptionDescription}>Acceso completo al panel de administración</Text>
              </View>
              <IconSymbol ios_icon_name="chevron.right" android_material_icon_name="chevron_right" size={20} color={colors.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.modalCancelButton} onPress={() => setShowRolModal(false)}>
              <Text style={styles.modalCancelText}>Cancelar</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Assign Local Modal */}
      <Modal
        visible={showLocalModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLocalModal(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowLocalModal(false)}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Asignar Local</Text>
              <TouchableOpacity onPress={() => setShowLocalModal(false)}>
                <IconSymbol ios_icon_name="xmark.circle.fill" android_material_icon_name="cancel" size={28} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.searchInputContainer}>
              <IconSymbol ios_icon_name="magnifyingglass" android_material_icon_name="search" size={20} color={colors.textSecondary} />
              <TextInput
                style={styles.searchInput}
                placeholder="Buscar local..."
                placeholderTextColor={colors.textSecondary}
                value={localSearch}
                onChangeText={setLocalSearch}
              />
            </View>

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
                    <View style={styles.localItemContent}>
                      <Text style={styles.localNombre}>{local.nombre}</Text>
                      <Text style={styles.localDireccion}>
                        {local.direccion} - {local.provincia}
                      </Text>
                      {local.propietario_id && (
                        <Text style={styles.localPropietarioInfo}>
                          ⚠️ Ya tiene propietario asignado
                        </Text>
                      )}
                    </View>
                    {selectedLocal === local.id && (
                      <IconSymbol ios_icon_name="checkmark.circle.fill" android_material_icon_name="check_circle" size={24} color={colors.primary} />
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
                styles.modalPrimaryButton,
                !selectedLocal && styles.modalPrimaryButtonDisabled,
              ]}
              onPress={asignarLocalAUsuario}
              disabled={!selectedLocal}
            >
              <IconSymbol ios_icon_name="checkmark.circle.fill" android_material_icon_name="check_circle" size={20} color={colors.white} />
              <Text style={styles.modalPrimaryButtonText}>Asignar Local</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.modalCancelButton} onPress={() => setShowLocalModal(false)}>
              <Text style={styles.modalCancelText}>Cancelar</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Impersonate User Modal */}
      <Modal
        visible={showImpersonateModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowImpersonateModal(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowImpersonateModal(false)}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Ver como Usuario</Text>
              <TouchableOpacity onPress={() => setShowImpersonateModal(false)}>
                <IconSymbol ios_icon_name="xmark.circle.fill" android_material_icon_name="cancel" size={28} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            {selectedUsuarioForImpersonate && (
              <>
                <Text style={styles.modalDescription}>
                  Podrás ver toda la aplicación (BarLive y red social) desde la perspectiva de {selectedUsuarioForImpersonate.nombre}.
                </Text>
                <View style={styles.modalWarning}>
                  <IconSymbol ios_icon_name="exclamationmark.triangle.fill" android_material_icon_name="warning" size={24} color="#F59E0B" />
                  <Text style={styles.modalWarningText}>
                    La impersonación permanecerá activa hasta que la finalices manualmente. No podrás acceder a sus mensajes privados sin su consentimiento explícito. Todas las acciones quedarán registradas.
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.modalPrimaryButton}
                  onPress={impersonarUsuario}
                >
                  <IconSymbol ios_icon_name="person.crop.circle.badge.checkmark" android_material_icon_name="supervised_user_circle" size={20} color={colors.white} />
                  <Text style={styles.modalPrimaryButtonText}>Iniciar Impersonación</Text>
                </TouchableOpacity>
              </>
            )}
            <TouchableOpacity style={styles.modalCancelButton} onPress={() => setShowImpersonateModal(false)}>
              <Text style={styles.modalCancelText}>Cancelar</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Message Access Request Modal */}
      <Modal
        visible={showMessageAccessModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMessageAccessModal(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowMessageAccessModal(false)}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Solicitar Acceso a Mensajes</Text>
              <TouchableOpacity onPress={() => setShowMessageAccessModal(false)}>
                <IconSymbol ios_icon_name="xmark.circle.fill" android_material_icon_name="cancel" size={28} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            {selectedUsuarioForMessageAccess && (
              <>
                <Text style={styles.modalDescription}>
                  Solicita acceso a los mensajes privados de {selectedUsuarioForMessageAccess.nombre}.
                </Text>
                <View style={styles.modalWarning}>
                  <IconSymbol ios_icon_name="lock.shield.fill" android_material_icon_name="security" size={24} color={colors.primary} />
                  <Text style={styles.modalWarningText}>
                    El usuario recibirá una notificación y deberá aprobar tu solicitud. Esto garantiza la protección de datos y privacidad.
                  </Text>
                </View>
                <TextInput
                  style={styles.reasonInput}
                  placeholder="Razón de la solicitud (obligatorio)..."
                  placeholderTextColor={colors.textSecondary}
                  value={messageAccessReason}
                  onChangeText={setMessageAccessReason}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
                <TouchableOpacity
                  style={[
                    styles.modalPrimaryButton,
                    (!messageAccessReason.trim() || requestingMessageAccess) && styles.modalPrimaryButtonDisabled,
                  ]}
                  onPress={solicitarAccesoMensajes}
                  disabled={!messageAccessReason.trim() || requestingMessageAccess}
                >
                  {requestingMessageAccess ? (
                    <ActivityIndicator size="small" color={colors.white} />
                  ) : (
                    <>
                      <IconSymbol ios_icon_name="paperplane.fill" android_material_icon_name="send" size={20} color={colors.white} />
                      <Text style={styles.modalPrimaryButtonText}>Enviar Solicitud</Text>
                    </>
                  )}
                </TouchableOpacity>
              </>
            )}
            <TouchableOpacity style={styles.modalCancelButton} onPress={() => setShowMessageAccessModal(false)}>
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
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerContent: {
    flex: 1,
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
    padding: 8,
    marginLeft: 8,
  },
  listContent: {
    flexGrow: 1,
    paddingBottom: 100,
  },
  impersonationBanner: {
    backgroundColor: '#8B5CF6',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...commonStyles.shadow,
  },
  impersonationBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  impersonationBannerText: {
    flex: 1,
  },
  impersonationBannerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.white,
    marginBottom: 2,
  },
  impersonationBannerSubtitle: {
    fontSize: 13,
    color: colors.white,
    opacity: 0.9,
  },
  impersonationBannerButton: {
    backgroundColor: colors.white,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  impersonationBannerButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8B5CF6',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
  },
  filtersContainer: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  filtersContent: {
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  filterChipTextActive: {
    color: colors.white,
  },
  filterChipClear: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: colors.primary + '15',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  filterChipClearText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  statsContainerTablet: {
    paddingHorizontal: 32,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.cardBackground,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  bulkActionsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  bulkActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  bulkActionButtonDanger: {
    backgroundColor: '#EF4444',
    borderColor: '#EF4444',
  },
  bulkActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
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
    ...commonStyles.shadow,
  },
  usuarioCardTablet: {
    marginHorizontal: 32,
  },
  checkboxContainer: {
    marginRight: 12,
    justifyContent: 'flex-start',
    paddingTop: 4,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  usuarioMainContent: {
    flex: 1,
  },
  usuarioHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginRight: 12,
  },
  avatarPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.white,
  },
  usuarioInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  usuarioNombre: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  usuarioEmail: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 6,
  },
  usuarioMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rolBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  rolBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.white,
  },
  estadoBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  estadoBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.white,
  },
  usuarioActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 12,
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
    lineHeight: 24,
  },
  emptyButton: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: colors.primary,
  },
  emptyButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.white,
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
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    flex: 1,
  },
  modalDescription: {
    fontSize: 15,
    color: colors.textSecondary,
    marginBottom: 20,
    lineHeight: 22,
  },
  modalWarning: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: '#FEF3C7',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  modalWarningText: {
    flex: 1,
    fontSize: 14,
    color: '#92400E',
    lineHeight: 20,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    backgroundColor: colors.cardBackground,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  modalOptionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  modalOptionContent: {
    flex: 1,
  },
  modalOptionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 2,
  },
  modalOptionDescription: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  modalScrollView: {
    maxHeight: 300,
    marginBottom: 20,
  },
  localItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    backgroundColor: colors.cardBackground,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  localItemSelected: {
    borderColor: colors.primary,
    borderWidth: 2,
    backgroundColor: colors.primary + '10',
  },
  localItemContent: {
    flex: 1,
  },
  localNombre: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  localDireccion: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  localPropietarioInfo: {
    fontSize: 12,
    color: '#F59E0B',
    marginTop: 4,
  },
  reasonInput: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: 20,
    minHeight: 100,
    textAlignVertical: 'top',
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
  modalPrimaryButtonDisabled: {
    backgroundColor: colors.cardBorder,
    opacity: 0.5,
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
