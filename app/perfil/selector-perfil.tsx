
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
  Platform,
} from 'react-native';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { useMode } from '@/contexts/ModeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useImpersonation } from '@/contexts/ImpersonationContext';
import { useRouter } from 'expo-router';
import { supabase } from '@/utils/supabase';
import { isAdminUser } from '@/utils/adminAccess';
import { LinearGradient } from 'expo-linear-gradient';
import { scaleFontSize, scaleIconSize } from '@/utils/androidScaling';

/**
 * ✅ PROFILE SELECTOR FULL SCREEN PAGE v1.0 (ANDROID)
 * 
 * REQUERIMIENTO 2: Modal de selector de perfil transformado en pantalla completa para Android
 * 
 * CAMBIOS:
 * - ✅ Pantalla completa en lugar de modal para Android
 * - ✅ Mejor usabilidad y coherencia con patrones de navegación Android
 * - ✅ Navegación con botón de retroceso nativo
 * - ✅ Diseño limpio y espacioso
 * - ✅ Mismo contenido que ProfileSwitcher pero en formato de página completa
 */
export default function SelectorPerfilScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const {
    activeProfileId,
    activeProfileType,
    switchToClientProfile,
    switchToLocalProfile,
    setCurrentMode,
  } = useMode();
  const {
    isImpersonating,
    impersonatedUser,
    endImpersonation,
  } = useImpersonation();
  
  const [switching, setSwitching] = useState(false);
  const [ownedLocals, setOwnedLocals] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const loadOwnedLocals = useCallback(async () => {
    const effectiveId = isImpersonating && impersonatedUser ? impersonatedUser.id : user?.id;
    
    if (!effectiveId) {
      console.log('[SelectorPerfil Android] ⚠️ No effective user ID, skipping load');
      return;
    }

    try {
      setLoading(true);
      console.log('[SelectorPerfil Android] 🔄 Loading owned locals for user:', effectiveId, isImpersonating ? '(impersonated)' : '(actual)');

      const { data: propietariosData, error: propietariosError } = await supabase
        .from('propietarios_locales')
        .select(`
          local_id,
          activo,
          locales!propietarios_locales_local_id_fkey(
            id,
            nombre,
            imagen_url,
            tipo,
            activo
          )
        `)
        .eq('propietario_id', effectiveId)
        .eq('activo', true);

      if (propietariosError) {
        console.error('[SelectorPerfil Android] ❌ Error loading owned locals:', propietariosError);
        return;
      }

      const activeOwnedLocals = (propietariosData || [])
        .filter(p => p.locales && p.locales.activo === true)
        .map(p => p.locales);

      console.log('[SelectorPerfil Android] ✅ Loaded', activeOwnedLocals.length, 'active owned locals');
      setOwnedLocals(activeOwnedLocals);
    } catch (error) {
      console.error('[SelectorPerfil Android] ❌ Error loading owned locals:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id, isImpersonating, impersonatedUser]);

  useEffect(() => {
    if (user?.id) {
      console.log('[SelectorPerfil Android] 🔄 Page opened, loading owned locals');
      loadOwnedLocals();
    }
  }, [user?.id, loadOwnedLocals]);

  const handleSwitchToClient = useCallback(async () => {
    setSwitching(true);
    try {
      console.log('[SelectorPerfil Android] 🔄 Switching to client profile');
      
      await setCurrentMode('cliente');
      await switchToClientProfile();
      
      console.log('[SelectorPerfil Android] ✅ Profile switched to client, mode set to cliente');
      
      router.back();
      
      setTimeout(() => {
        console.log('[SelectorPerfil Android] ✅ Navigating to user profile');
        router.push('/(tabs)/perfil');
      }, 100);
    } catch (error) {
      console.error('[SelectorPerfil Android] ❌ Error switching to client:', error);
    } finally {
      setSwitching(false);
    }
  }, [switchToClientProfile, setCurrentMode, router]);

  const handleSwitchToLocal = useCallback(async (localId: string) => {
    setSwitching(true);
    try {
      console.log('[SelectorPerfil Android] 🔄 Switching to local profile:', localId);
      
      await setCurrentMode('propietario');
      await switchToLocalProfile(localId);
      
      console.log('[SelectorPerfil Android] ✅ Profile switched to local, mode set to propietario');
      
      router.back();
      
      setTimeout(() => {
        console.log('[SelectorPerfil Android] ✅ Navigating to local profile');
        router.push(`/perfil/local?localId=${localId}`);
      }, 100);
    } catch (error) {
      console.error('[SelectorPerfil Android] ❌ Error switching to local:', error);
    } finally {
      setSwitching(false);
    }
  }, [switchToLocalProfile, setCurrentMode, router]);

  const handleSwitchToOwnerMode = useCallback(async () => {
    setSwitching(true);
    try {
      console.log('[SelectorPerfil Android] 👑 Admin switching to owner mode for verification');
      
      await setCurrentMode('propietario');
      
      console.log('[SelectorPerfil Android] ✅ Mode set to propietario (admin verification mode)');
      
      router.back();
      
      Alert.alert(
        '✅ Modo Propietario Activado',
        'Ahora puedes ver y verificar la interfaz de propietario. Podrás acceder a todas las funcionalidades de gestión de locales.',
        [
          {
            text: 'Entendido',
            onPress: () => {
              router.push('/(tabs)/perfil');
            },
          },
        ]
      );
    } catch (error) {
      console.error('[SelectorPerfil Android] ❌ Error switching to owner mode:', error);
      Alert.alert('Error', 'No se pudo cambiar al modo propietario');
    } finally {
      setSwitching(false);
    }
  }, [setCurrentMode, router]);

  const handleEndImpersonation = useCallback(async () => {
    Alert.alert(
      'Finalizar Suplantación',
      '¿Estás seguro de que quieres volver a tu cuenta de administrador?',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Finalizar',
          style: 'default',
          onPress: async () => {
            try {
              setSwitching(true);
              await endImpersonation();
              router.back();
              Alert.alert(
                '✅ Suplantación Finalizada',
                'Has vuelto a tu cuenta de administrador',
                [
                  {
                    text: 'OK',
                    onPress: () => {
                      router.push('/');
                    },
                  },
                ]
              );
            } catch (error) {
              console.error('[SelectorPerfil Android] Error ending impersonation:', error);
              Alert.alert('Error', 'No se pudo finalizar la suplantación');
            } finally {
              setSwitching(false);
            }
          },
        },
      ]
    );
  }, [endImpersonation, router]);

  const isClientActive = useMemo(() => {
    return activeProfileType === 'cliente' && activeProfileId === user?.id;
  }, [activeProfileType, activeProfileId, user?.id]);

  const isAdmin = useMemo(() => {
    if (!user) return false;
    return isAdminUser(user);
  }, [user]);

  if (!user) return null;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.headerGradientStart, colors.headerGradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <IconSymbol 
            ios_icon_name="chevron.left" 
            android_material_icon_name="arrow_back" 
            size={scaleIconSize(24)} 
            color={colors.headerText} 
          />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { fontSize: scaleFontSize(20) }]}>Seleccionar Perfil</Text>
        <View style={{ width: 40 }} />
      </LinearGradient>

      {isImpersonating && impersonatedUser && (
        <View style={styles.impersonationBanner}>
          <View style={styles.impersonationHeader}>
            <IconSymbol 
              ios_icon_name="person.crop.circle.badge.checkmark" 
              android_material_icon_name="supervised_user_circle" 
              size={24} 
              color="#8B5CF6" 
            />
            <Text style={[styles.impersonationTitle, { fontSize: scaleFontSize(16) }]}>Modo Suplantación Activo</Text>
          </View>
          <Text style={[styles.impersonationText, { fontSize: scaleFontSize(14) }]}>
            Estás navegando como: <Text style={styles.impersonationUserName}>{impersonatedUser.nombre}</Text>
          </Text>
          <TouchableOpacity
            style={styles.endImpersonationButton}
            onPress={handleEndImpersonation}
            disabled={switching}
          >
            <IconSymbol 
              ios_icon_name="arrow.uturn.backward.circle.fill" 
              android_material_icon_name="exit_to_app" 
              size={18} 
              color="#fff" 
            />
            <Text style={[styles.endImpersonationText, { fontSize: scaleFontSize(14) }]}>Volver a mi cuenta</Text>
          </TouchableOpacity>
        </View>
      )}

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { fontSize: scaleFontSize(16) }]}>Cargando locales...</Text>
        </View>
      ) : (
        <ScrollView 
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          <Text style={[styles.subtitle, { fontSize: scaleFontSize(15) }]}>
            Elige con qué perfil quieres interactuar
          </Text>

          <View style={styles.profilesContainer}>
            <TouchableOpacity
              style={[
                styles.profileCard,
                isClientActive && styles.profileCardActive
              ]}
              onPress={handleSwitchToClient}
              disabled={switching || isClientActive}
              activeOpacity={0.7}
            >
              <View style={styles.profileCardContent}>
                <View style={[styles.profileAvatar, styles.clientAvatarBg]}>
                  {(isImpersonating && impersonatedUser?.avatar) || user.avatar ? (
                    <Image 
                      source={{ uri: isImpersonating && impersonatedUser?.avatar ? impersonatedUser.avatar : user.avatar }} 
                      style={styles.avatarImage} 
                    />
                  ) : (
                    <IconSymbol ios_icon_name="person.fill" android_material_icon_name="person" size={scaleIconSize(32)} color={colors.white} />
                  )}
                </View>
                <View style={styles.profileText}>
                  <Text style={[styles.profileName, { fontSize: scaleFontSize(18) }]}>
                    {isImpersonating && impersonatedUser ? impersonatedUser.nombre : (user.nombre || 'Mi Perfil')}
                  </Text>
                  <Text style={[styles.profileType, { fontSize: scaleFontSize(14) }]}>Perfil de usuario • Modo Cliente</Text>
                </View>
              </View>
              {isClientActive && (
                <View style={styles.checkmarkContainer}>
                  <IconSymbol ios_icon_name="checkmark.circle.fill" android_material_icon_name="check_circle" size={scaleIconSize(28)} color={colors.primary} />
                </View>
              )}
            </TouchableOpacity>

            {isAdmin && (
              <React.Fragment>
                <Text style={[styles.sectionTitle, { fontSize: scaleFontSize(16) }]}>Modo Administrador</Text>
                <Text style={[styles.sectionNote, { fontSize: scaleFontSize(13) }]}>Accede al modo propietario para verificar funcionalidades</Text>
                
                <TouchableOpacity
                  style={[styles.profileCard, styles.adminCard]}
                  onPress={handleSwitchToOwnerMode}
                  disabled={switching}
                  activeOpacity={0.7}
                >
                  <View style={styles.profileCardContent}>
                    <View style={[styles.profileAvatar, styles.adminAvatarBg]}>
                      <IconSymbol ios_icon_name="crown.fill" android_material_icon_name="verified" size={scaleIconSize(32)} color={colors.white} />
                    </View>
                    <View style={styles.profileText}>
                      <Text style={[styles.profileName, { fontSize: scaleFontSize(18) }]}>Modo Propietario (Verificación)</Text>
                      <Text style={[styles.profileType, { fontSize: scaleFontSize(14) }]}>Acceso de administrador • Ver interfaz de propietario</Text>
                    </View>
                  </View>
                  <View style={styles.adminBadge}>
                    <IconSymbol ios_icon_name="eye.fill" android_material_icon_name="visibility" size={18} color="#8B5CF6" />
                  </View>
                </TouchableOpacity>
              </React.Fragment>
            )}

            {ownedLocals.length > 0 && (
              <React.Fragment>
                <Text style={[styles.sectionTitle, { fontSize: scaleFontSize(16) }]}>Mis Locales</Text>
                <Text style={[styles.sectionNote, { fontSize: scaleFontSize(13) }]}>Al seleccionar un local, cambiarás a modo Propietario</Text>
                {ownedLocals.map((local) => {
                  const isActive = activeProfileType === 'local' && activeProfileId === local.id;
                  
                  return (
                    <TouchableOpacity
                      key={local.id}
                      style={[
                        styles.profileCard,
                        isActive && styles.profileCardActive
                      ]}
                      onPress={() => handleSwitchToLocal(local.id)}
                      disabled={switching || isActive}
                      activeOpacity={0.7}
                    >
                      <View style={styles.profileCardContent}>
                        <View style={[styles.profileAvatar, styles.localAvatarBg]}>
                          {local.imagen_url ? (
                            <Image source={{ uri: local.imagen_url }} style={styles.avatarImage} />
                          ) : (
                            <IconSymbol ios_icon_name="building.2.fill" android_material_icon_name="store" size={scaleIconSize(32)} color={colors.white} />
                          )}
                        </View>
                        <View style={styles.profileText}>
                          <Text style={[styles.profileName, { fontSize: scaleFontSize(18) }]}>{local.nombre}</Text>
                          <Text style={[styles.profileType, { fontSize: scaleFontSize(14) }]}>{local.tipo || 'Local'} • Modo Propietario</Text>
                        </View>
                      </View>
                      {isActive && (
                        <View style={styles.checkmarkContainer}>
                          <IconSymbol ios_icon_name="checkmark.circle.fill" android_material_icon_name="check_circle" size={scaleIconSize(28)} color={colors.primary} />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </React.Fragment>
            )}

            {ownedLocals.length === 0 && !isImpersonating && (
              <View style={styles.emptyState}>
                <IconSymbol ios_icon_name="building.2" android_material_icon_name="store" size={scaleIconSize(48)} color={colors.textSecondary} />
                <Text style={[styles.emptyStateText, { fontSize: scaleFontSize(16) }]}>No tienes locales registrados</Text>
                <Text style={[styles.emptyStateSubtext, { fontSize: scaleFontSize(14) }]}>
                  Reclama o crea un local para poder gestionarlo
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      )}

      {switching && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { fontSize: scaleFontSize(16) }]}>Cambiando perfil...</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontWeight: '700',
    color: colors.headerText,
    flex: 1,
    textAlign: 'center',
  },
  impersonationBanner: {
    backgroundColor: '#8B5CF6' + '15',
    borderBottomWidth: 1,
    borderBottomColor: '#8B5CF6' + '30',
    padding: 16,
  },
  impersonationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  impersonationTitle: {
    fontWeight: '700',
    color: '#8B5CF6',
  },
  impersonationText: {
    color: colors.text,
    marginBottom: 12,
  },
  impersonationUserName: {
    fontWeight: '700',
    color: colors.primary,
  },
  endImpersonationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#8B5CF6',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  endImpersonationText: {
    fontWeight: '700',
    color: '#fff',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    color: colors.text,
    marginTop: 16,
  },
  subtitle: {
    color: colors.textSecondary,
    marginBottom: 24,
    lineHeight: 22,
  },
  profilesContainer: {
    gap: 16,
  },
  sectionTitle: {
    fontWeight: '600',
    color: colors.text,
    marginTop: 8,
    marginBottom: 8,
  },
  sectionNote: {
    color: colors.textSecondary,
    marginBottom: 12,
    fontStyle: 'italic',
    lineHeight: 20,
  },
  profileCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: colors.cardBorder,
    ...Platform.select({
      android: {
        elevation: 0,
      },
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
    }),
  },
  profileCardActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '08',
  },
  adminCard: {
    borderWidth: 2,
    borderColor: '#8B5CF6' + '40',
    backgroundColor: '#8B5CF6' + '08',
  },
  profileCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  profileAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: colors.cardBorder,
  },
  clientAvatarBg: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  localAvatarBg: {
    backgroundColor: colors.secondary,
    borderColor: colors.secondary,
  },
  adminAvatarBg: {
    backgroundColor: '#8B5CF6',
    borderColor: '#8B5CF6',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  adminBadge: {
    marginLeft: 12,
    backgroundColor: '#8B5CF6' + '15',
    padding: 8,
    borderRadius: 12,
  },
  profileText: {
    flex: 1,
  },
  profileName: {
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  profileType: {
    color: colors.textSecondary,
    lineHeight: 20,
  },
  checkmarkContainer: {
    marginLeft: 8,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  emptyStateText: {
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  emptyStateSubtext: {
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 20,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
