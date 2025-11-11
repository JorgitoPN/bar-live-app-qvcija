
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  RefreshControl,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
  Animated,
  Pressable,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { colors, commonStyles } from '@/styles/commonStyles';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useMode } from '@/contexts/ModeContext';
import { supabase } from '@/utils/supabase';
import LoginRequiredModal from '@/components/common/LoginRequiredModal';

const { width } = Dimensions.get('window');

interface OfertaTrabajo {
  id: string;
  titulo: string;
  descripcion: string;
  tipo: string;
  salario?: string;
  requisitos?: string[];
  provincia?: string;
  created_at: string;
  local?: {
    nombre: string;
  };
  propietario?: {
    nombre: string;
  };
}

interface PerfilProfesional {
  id: string;
  nombre_completo: string;
  puesto_deseado: string;
  experiencia: string;
  habilidades?: string;
  disponibilidad?: string;
  foto_url?: string;
  provincia?: string;
  created_at: string;
  usuario?: {
    nombre: string;
    avatar?: string;
    username?: string;
  };
}

export default function PerfilScreen() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { currentMode } = useMode();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showLoginModal, setShowLoginModal] = useState(false);
  
  // Profile data
  const [seguidores, setSeguidores] = useState(0);
  const [seguidos, setSeguidos] = useState(0);
  const [publicaciones, setPublicaciones] = useState(0);
  
  // Employment tab
  const [empleoTab, setEmpleoTab] = useState<'ofertas' | 'perfiles'>('ofertas');
  const [ofertas, setOfertas] = useState<OfertaTrabajo[]>([]);
  const [perfiles, setPerfiles] = useState<PerfilProfesional[]>([]);
  const [loadingEmpleo, setLoadingEmpleo] = useState(false);

  const userRole = user?.rol_app || 'cliente';
  const isPropietario = userRole === 'propietario' || (userRole === 'admin' && currentMode === 'propietario');

  useEffect(() => {
    if (!authLoading) {
      if (user) {
        cargarDatosPerfil();
      } else {
        setLoading(false);
      }
    }
  }, [user, authLoading]);

  const cargarDatosPerfil = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Load followers count
      const { count: seguidoresCount } = await supabase
        .from('seguidores')
        .select('*', { count: 'exact', head: true })
        .eq('seguido_id', user.id);

      // Load following count
      const { count: seguidosCount } = await supabase
        .from('seguidores')
        .select('*', { count: 'exact', head: true })
        .eq('seguidor_id', user.id);

      // Load posts count
      const { count: publicacionesCount } = await supabase
        .from('publicaciones')
        .select('*', { count: 'exact', head: true })
        .eq('autor_id', user.id);

      setSeguidores(seguidoresCount || 0);
      setSeguidos(seguidosCount || 0);
      setPublicaciones(publicacionesCount || 0);

      // Load employment data
      await cargarDatosEmpleo();
    } catch (error) {
      console.error('[Perfil] Error cargando datos:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const cargarDatosEmpleo = async () => {
    try {
      setLoadingEmpleo(true);

      // Load job offers
      const { data: ofertasData, error: ofertasError } = await supabase
        .from('ofertas_trabajo')
        .select(`
          *,
          locales:local_id (nombre),
          usuarios:propietario_id (nombre)
        `)
        .eq('activo', true)
        .order('created_at', { ascending: false })
        .limit(10);

      if (ofertasError) {
        console.error('[Perfil] Error cargando ofertas:', ofertasError);
      } else {
        setOfertas(ofertasData || []);
      }

      // Load professional profiles
      const { data: perfilesData, error: perfilesError } = await supabase
        .from('perfiles_profesionales')
        .select(`
          *,
          usuarios:usuario_id (nombre, avatar, username)
        `)
        .eq('activo', true)
        .order('created_at', { ascending: false })
        .limit(10);

      if (perfilesError) {
        console.error('[Perfil] Error cargando perfiles:', perfilesError);
      } else {
        setPerfiles(perfilesData || []);
      }
    } catch (error) {
      console.error('[Perfil] Error en cargarDatosEmpleo:', error);
    } finally {
      setLoadingEmpleo(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    cargarDatosPerfil();
  };

  const handleEditProfile = () => {
    if (!user) {
      setShowLoginModal(true);
      return;
    }
    router.push('/editar/perfil');
  };

  const handleSettings = () => {
    if (!user) {
      setShowLoginModal(true);
      return;
    }
    router.push('/(tabs)/perfil/configuracion');
  };

  const handleNotifications = () => {
    if (!user) {
      setShowLoginModal(true);
      return;
    }
    router.push('/(tabs)/perfil/notificaciones');
  };

  const handleChats = () => {
    if (!user) {
      setShowLoginModal(true);
      return;
    }
    router.push('/(tabs)/perfil/chats');
  };

  const handleSeguidores = () => {
    if (!user) {
      setShowLoginModal(true);
      return;
    }
    router.push(`/perfil/seguidores?userId=${user.id}`);
  };

  const handleSeguidos = () => {
    if (!user) {
      setShowLoginModal(true);
      return;
    }
    router.push(`/perfil/seguidos?userId=${user.id}`);
  };

  const handleCrearOferta = () => {
    if (!user) {
      setShowLoginModal(true);
      return;
    }
    router.push('/crear/oferta-trabajo');
  };

  const handleCrearPerfil = () => {
    if (!user) {
      setShowLoginModal(true);
      return;
    }
    router.push('/crear/perfil-profesional');
  };

  const calcularDiasPublicado = (fecha: string): string => {
    const ahora = new Date();
    const fechaPublicacion = new Date(fecha);
    const diffMs = ahora.getTime() - fechaPublicacion.getTime();
    const diffDias = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDias === 0) return 'Hoy';
    if (diffDias === 1) return 'Ayer';
    if (diffDias < 7) return `Hace ${diffDias} días`;
    if (diffDias < 30) return `Hace ${Math.floor(diffDias / 7)} semanas`;
    return `Hace ${Math.floor(diffDias / 30)} meses`;
  };

  const renderOferta = (oferta: OfertaTrabajo) => (
    <TouchableOpacity
      key={oferta.id}
      style={styles.empleoCard}
      activeOpacity={0.7}
    >
      <View style={styles.empleoHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.empleoTitulo} numberOfLines={1}>
            {oferta.titulo}
          </Text>
          <Text style={styles.empleoLocal} numberOfLines={1}>
            {oferta.local?.nombre || oferta.propietario?.nombre || 'Local'}
          </Text>
        </View>
        {oferta.salario && (
          <View style={styles.salarioContainer}>
            <Text style={styles.salarioTexto}>{oferta.salario}</Text>
          </View>
        )}
      </View>

      <Text style={styles.empleoDescripcion} numberOfLines={2}>
        {oferta.descripcion}
      </Text>

      <View style={styles.empleoFooter}>
        <View style={styles.empleoTag}>
          <Text style={styles.empleoTagText}>{oferta.tipo}</Text>
        </View>
        {oferta.provincia && (
          <View style={styles.empleoTag}>
            <IconSymbol name="mappin" size={12} color={colors.textSecondary} />
            <Text style={styles.empleoTagText}>{oferta.provincia}</Text>
          </View>
        )}
        <Text style={styles.empleoFecha}>
          {calcularDiasPublicado(oferta.created_at)}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderPerfil = (perfil: PerfilProfesional) => (
    <TouchableOpacity
      key={perfil.id}
      style={styles.perfilCard}
      activeOpacity={0.7}
    >
      <View style={styles.perfilHeader}>
        {perfil.usuario?.avatar ? (
          <Image
            source={{ uri: perfil.usuario.avatar }}
            style={styles.perfilAvatar}
          />
        ) : (
          <View style={[styles.perfilAvatar, styles.perfilAvatarPlaceholder]}>
            <IconSymbol name="person.fill" size={24} color={colors.textSecondary} />
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={styles.perfilNombre} numberOfLines={1}>
            {perfil.nombre_completo}
          </Text>
          <Text style={styles.perfilPuesto} numberOfLines={1}>
            {perfil.puesto_deseado}
          </Text>
        </View>
      </View>

      <Text style={styles.perfilExperiencia} numberOfLines={2}>
        {perfil.experiencia}
      </Text>

      {perfil.habilidades && (
        <View style={styles.habilidadesContainer}>
          {perfil.habilidades.split(',').slice(0, 3).map((habilidad, index) => (
            <View key={index} style={styles.habilidadTag}>
              <Text style={styles.habilidadText}>{habilidad.trim()}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={styles.perfilFooter}>
        {perfil.provincia && (
          <View style={styles.perfilTag}>
            <IconSymbol name="mappin" size={12} color={colors.textSecondary} />
            <Text style={styles.perfilTagText}>{perfil.provincia}</Text>
          </View>
        )}
        {perfil.disponibilidad && (
          <View style={styles.perfilTag}>
            <IconSymbol name="clock" size={12} color={colors.textSecondary} />
            <Text style={styles.perfilTagText}>{perfil.disponibilidad}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  if (authLoading || loading) {
    return (
      <View style={[commonStyles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ color: colors.text, marginTop: 16 }}>Cargando perfil...</Text>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={commonStyles.container}>
        <LinearGradient
          colors={[colors.headerGradientStart, colors.headerGradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={commonStyles.headerGradient}
        >
          <Text style={[commonStyles.headerTitle, { color: colors.white }]}>Mi Perfil</Text>
        </LinearGradient>

        <View style={styles.notLoggedInContainer}>
          <IconSymbol name="person.circle" size={80} color={colors.textSecondary} />
          <Text style={styles.notLoggedInTitle}>Inicia sesión</Text>
          <Text style={styles.notLoggedInText}>
            Inicia sesión para ver tu perfil y acceder a todas las funciones
          </Text>
          <TouchableOpacity
            style={styles.loginButton}
            onPress={() => setShowLoginModal(true)}
          >
            <LinearGradient
              colors={[colors.primary, colors.secondary]}
              style={styles.loginButtonGradient}
            >
              <Text style={styles.loginButtonText}>Iniciar Sesión</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <LoginRequiredModal
          visible={showLoginModal}
          onClose={() => setShowLoginModal(false)}
        />
      </View>
    );
  }

  return (
    <View style={commonStyles.container}>
      {/* Header */}
      <LinearGradient
        colors={[colors.headerGradientStart, colors.headerGradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={commonStyles.headerGradient}
      >
        <View style={styles.headerContent}>
          <Text style={[commonStyles.headerTitle, { color: colors.white }]}>Mi Perfil</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.headerButton} onPress={handleNotifications}>
              <IconSymbol name="bell.fill" size={24} color={colors.white} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerButton} onPress={handleSettings}>
              <IconSymbol name="gear" size={24} color={colors.white} />
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Profile Info */}
        <View style={styles.profileSection}>
          <View style={styles.profileHeader}>
            {user.avatar ? (
              <Image source={{ uri: user.avatar }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <IconSymbol name="person.fill" size={40} color={colors.textSecondary} />
              </View>
            )}
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{user.nombre || 'Usuario'}</Text>
              {user.username && (
                <Text style={styles.profileUsername}>@{user.username}</Text>
              )}
              {user.bio && (
                <Text style={styles.profileBio}>{user.bio}</Text>
              )}
            </View>
          </View>

          {/* Stats */}
          <View style={styles.statsContainer}>
            <TouchableOpacity style={styles.statItem} onPress={handleSeguidores}>
              <Text style={styles.statNumber}>{seguidores}</Text>
              <Text style={styles.statLabel}>Seguidores</Text>
            </TouchableOpacity>
            <View style={styles.statDivider} />
            <TouchableOpacity style={styles.statItem} onPress={handleSeguidos}>
              <Text style={styles.statNumber}>{seguidos}</Text>
              <Text style={styles.statLabel}>Seguidos</Text>
            </TouchableOpacity>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{publicaciones}</Text>
              <Text style={styles.statLabel}>Publicaciones</Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.actionButton} onPress={handleEditProfile}>
              <IconSymbol name="pencil" size={18} color={colors.text} />
              <Text style={styles.actionButtonText}>Editar Perfil</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton} onPress={handleChats}>
              <IconSymbol name="message.fill" size={18} color={colors.text} />
              <Text style={styles.actionButtonText}>Mensajes</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Employment Section */}
        <View style={styles.empleoSection}>
          <View style={styles.empleoHeader}>
            <Text style={styles.sectionTitle}>Empleo</Text>
            {isPropietario && (
              <TouchableOpacity onPress={handleCrearOferta}>
                <IconSymbol name="plus.circle.fill" size={24} color={colors.primary} />
              </TouchableOpacity>
            )}
            {!isPropietario && (
              <TouchableOpacity onPress={handleCrearPerfil}>
                <IconSymbol name="plus.circle.fill" size={24} color={colors.primary} />
              </TouchableOpacity>
            )}
          </View>

          {/* Employment Tabs */}
          <View style={styles.empleoTabs}>
            <TouchableOpacity
              style={[styles.empleoTab, empleoTab === 'ofertas' && styles.empleoTabActive]}
              onPress={() => setEmpleoTab('ofertas')}
            >
              <Text
                style={[
                  styles.empleoTabText,
                  empleoTab === 'ofertas' && styles.empleoTabTextActive,
                ]}
              >
                Ofertas
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.empleoTab, empleoTab === 'perfiles' && styles.empleoTabActive]}
              onPress={() => setEmpleoTab('perfiles')}
            >
              <Text
                style={[
                  styles.empleoTabText,
                  empleoTab === 'perfiles' && styles.empleoTabTextActive,
                ]}
              >
                Perfiles
              </Text>
            </TouchableOpacity>
          </View>

          {/* Employment Content */}
          {loadingEmpleo ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          ) : (
            <View style={styles.empleoContent}>
              {empleoTab === 'ofertas' ? (
                ofertas.length > 0 ? (
                  ofertas.map(renderOferta)
                ) : (
                  <View style={styles.emptyState}>
                    <IconSymbol name="briefcase" size={48} color={colors.textSecondary} />
                    <Text style={styles.emptyStateText}>No hay ofertas disponibles</Text>
                  </View>
                )
              ) : (
                perfiles.length > 0 ? (
                  perfiles.map(renderPerfil)
                ) : (
                  <View style={styles.emptyState}>
                    <IconSymbol name="person.2" size={48} color={colors.textSecondary} />
                    <Text style={styles.emptyStateText}>No hay perfiles disponibles</Text>
                  </View>
                )
              )}
            </View>
          )}
        </View>
      </ScrollView>

      <LoginRequiredModal
        visible={showLoginModal}
        onClose={() => setShowLoginModal(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  headerButton: {
    padding: 8,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 100,
  },
  notLoggedInContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  notLoggedInTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  notLoggedInText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  loginButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  loginButtonGradient: {
    paddingHorizontal: 32,
    paddingVertical: 14,
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
  },
  profileSection: {
    backgroundColor: colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
    padding: 20,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginRight: 16,
  },
  avatarPlaceholder: {
    backgroundColor: colors.background,
    borderWidth: 2,
    borderColor: colors.cardBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  profileUsername: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  profileBio: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.cardBorder,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 12,
    paddingVertical: 12,
    gap: 8,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  empleoSection: {
    padding: 20,
  },
  empleoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  empleoTabs: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  empleoTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  empleoTabActive: {
    backgroundColor: colors.cardBackground,
  },
  empleoTabText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  empleoTabTextActive: {
    color: colors.primary,
  },
  empleoContent: {
    gap: 12,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyState: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 12,
  },
  empleoCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  empleoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  empleoTitulo: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  empleoLocal: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  salarioContainer: {
    backgroundColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  salarioTexto: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.white,
  },
  empleoDescripcion: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
    marginBottom: 12,
  },
  empleoFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  empleoTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  empleoTagText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  empleoFecha: {
    fontSize: 12,
    color: colors.textSecondary,
    marginLeft: 'auto',
  },
  perfilCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  perfilHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  perfilAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  perfilAvatarPlaceholder: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  perfilNombre: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 2,
  },
  perfilPuesto: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  perfilExperiencia: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
    marginBottom: 12,
  },
  habilidadesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  habilidadTag: {
    backgroundColor: colors.primary + '20',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  habilidadText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
  },
  perfilFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  perfilTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  perfilTagText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
});
