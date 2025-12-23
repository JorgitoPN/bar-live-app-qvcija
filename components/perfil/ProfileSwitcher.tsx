
import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
  Image,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { useMode } from '@/contexts/ModeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'expo-router';
import { supabase } from '@/utils/supabase';
import { isAdminUser } from '@/utils/adminAccess';

interface ProfileSwitcherProps {
  visible: boolean;
  onClose: () => void;
}

/**
 * ✅ PROFILE SWITCHER v3.0 - ADMIN MODE FIX
 * 
 * CRITICAL FIXES:
 * - ✅ Admin mode is ONLY shown to jorgepereznoyagh@gmail.com
 * - ✅ Uses isAdminUser() to check both role AND email
 * - ✅ Prevents unauthorized users from seeing admin mode option
 */

const ProfileSwitcher = memo(function ProfileSwitcher({ visible, onClose }: ProfileSwitcherProps) {
  const { user } = useAuth();
  const router = useRouter();
  const {
    activeProfileId,
    activeProfileType,
    currentMode,
    switchToClientProfile,
    switchToLocalProfile,
    setCurrentMode,
  } = useMode();
  const [switching, setSwitching] = useState(false);
  const [ownedLocals, setOwnedLocals] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // ✅ CRITICAL: Check if user is authorized admin
  const userIsAdmin = useMemo(() => {
    return isAdminUser(user);
  }, [user]);

  // ✅ CRITICAL FIX: Memoize loadOwnedLocals with STABLE dependencies
  const loadOwnedLocals = useCallback(async () => {
    if (!user?.id) {
      console.log('[ProfileSwitcher] ⚠️ No user ID, skipping load');
      return;
    }

    try {
      setLoading(true);
      console.log('[ProfileSwitcher] 🔄 Loading owned locals for user:', user.id);

      // Query propietarios_locales table to get ONLY active owned locals
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
        .eq('propietario_id', user.id)
        .eq('activo', true);

      if (propietariosError) {
        console.error('[ProfileSwitcher] ❌ Error loading owned locals:', propietariosError);
        return;
      }

      // Filter to only include active locals
      const activeOwnedLocals = (propietariosData || [])
        .filter(p => p.locales && p.locales.activo === true)
        .map(p => p.locales);

      console.log('[ProfileSwitcher] ✅ Loaded', activeOwnedLocals.length, 'active owned locals');
      setOwnedLocals(activeOwnedLocals);
    } catch (error) {
      console.error('[ProfileSwitcher] ❌ Error loading owned locals:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // ✅ CRITICAL FIX: Only load when modal becomes visible, not on every render
  useEffect(() => {
    if (visible && user?.id) {
      console.log('[ProfileSwitcher] 🔄 Modal opened, loading owned locals');
      loadOwnedLocals();
    }
  }, [visible, user?.id, loadOwnedLocals]);

  // ✅ OPTIMIZATION: Memoize handlers to prevent re-creation
  const handleSwitchToClient = useCallback(async () => {
    setSwitching(true);
    try {
      console.log('[ProfileSwitcher] 🔄 Switching to client profile');
      await switchToClientProfile();
      console.log('[ProfileSwitcher] ✅ Profile switched to client');
      
      onClose();
      
      setTimeout(() => {
        console.log('[ProfileSwitcher] ✅ Navigating to user profile');
        router.push('/(tabs)/perfil');
      }, 100);
    } catch (error) {
      console.error('[ProfileSwitcher] ❌ Error switching to client:', error);
    } finally {
      setSwitching(false);
    }
  }, [switchToClientProfile, onClose, router]);

  const handleSwitchToLocal = useCallback(async (localId: string) => {
    setSwitching(true);
    try {
      console.log('[ProfileSwitcher] 🔄 Switching to local profile:', localId);
      await switchToLocalProfile(localId);
      console.log('[ProfileSwitcher] ✅ Profile switched to local');
      
      onClose();
      
      setTimeout(() => {
        console.log('[ProfileSwitcher] ✅ Navigating to local profile');
        router.push(`/perfil/local?localId=${localId}`);
      }, 100);
    } catch (error) {
      console.error('[ProfileSwitcher] ❌ Error switching to local:', error);
    } finally {
      setSwitching(false);
    }
  }, [switchToLocalProfile, onClose, router]);

  // ✅ NEW: Handle switching to admin mode
  const handleSwitchToAdmin = useCallback(async () => {
    if (!userIsAdmin) {
      console.error('[ProfileSwitcher] ❌ User is not authorized admin');
      return;
    }

    setSwitching(true);
    try {
      console.log('[ProfileSwitcher] 🔄 Switching to admin mode');
      await setCurrentMode('admin');
      console.log('[ProfileSwitcher] ✅ Mode switched to admin');
      
      onClose();
      
      setTimeout(() => {
        console.log('[ProfileSwitcher] ✅ Navigating to admin panel');
        router.push('/(tabs)/admin');
      }, 100);
    } catch (error) {
      console.error('[ProfileSwitcher] ❌ Error switching to admin:', error);
    } finally {
      setSwitching(false);
    }
  }, [userIsAdmin, setCurrentMode, onClose, router]);

  // ✅ OPTIMIZATION: Memoize active profile check
  const isClientActive = useMemo(() => {
    return activeProfileType === 'cliente' && activeProfileId === user?.id;
  }, [activeProfileType, activeProfileId, user?.id]);

  const isAdminActive = useMemo(() => {
    return currentMode === 'admin';
  }, [currentMode]);

  if (!user) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.container} onPress={(e) => e.stopPropagation()}>
          <View style={styles.header}>
            <Text style={styles.title}>Cambiar Perfil</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <IconSymbol ios_icon_name="xmark" android_material_icon_name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loadingText}>Cargando locales...</Text>
            </View>
          ) : (
            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
              {/* ✅ CRITICAL: Only show admin mode to authorized users */}
              {userIsAdmin && (
                <>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Modo Administrador</Text>
                    <Text style={styles.sectionSubtitle}>
                      Acceso exclusivo para {user.email}
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={[styles.profileCard, isAdminActive && styles.profileCardActive]}
                    onPress={handleSwitchToAdmin}
                    disabled={switching || isAdminActive}
                    activeOpacity={0.7}
                  >
                    <View style={styles.profileInfo}>
                      <View style={[styles.profileAvatar, styles.adminAvatarBg]}>
                        <IconSymbol ios_icon_name="gear" android_material_icon_name="settings" size={24} color={colors.white} />
                      </View>
                      <View style={styles.profileText}>
                        <Text style={styles.profileName}>Panel de Administración</Text>
                        <Text style={styles.profileType}>Gestión del sistema</Text>
                      </View>
                    </View>
                    {isAdminActive && (
                      <View style={styles.activeIndicator}>
                        <IconSymbol ios_icon_name="checkmark.circle.fill" android_material_icon_name="check_circle" size={24} color={colors.primary} />
                      </View>
                    )}
                  </TouchableOpacity>
                </>
              )}

              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Perfil Personal</Text>
              </View>

              <TouchableOpacity
                style={[styles.profileCard, isClientActive && styles.profileCardActive]}
                onPress={handleSwitchToClient}
                disabled={switching || isClientActive}
                activeOpacity={0.7}
              >
                <View style={styles.profileInfo}>
                  {user.avatar ? (
                    <Image source={{ uri: user.avatar }} style={styles.profileAvatar} />
                  ) : (
                    <View style={[styles.profileAvatar, styles.profileAvatarPlaceholder]}>
                      <IconSymbol ios_icon_name="person.fill" android_material_icon_name="person" size={24} color={colors.textSecondary} />
                    </View>
                  )}
                  <View style={styles.profileText}>
                    <Text style={styles.profileName}>{user.nombre || 'Usuario'}</Text>
                    <Text style={styles.profileType}>Perfil Personal</Text>
                  </View>
                </View>
                {isClientActive && (
                  <View style={styles.activeIndicator}>
                    <IconSymbol ios_icon_name="checkmark.circle.fill" android_material_icon_name="check_circle" size={24} color={colors.primary} />
                  </View>
                )}
              </TouchableOpacity>

              {ownedLocals.length > 0 && (
                <>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Mis Locales</Text>
                    <Text style={styles.sectionSubtitle}>
                      {ownedLocals.length} {ownedLocals.length === 1 ? 'local' : 'locales'}
                    </Text>
                  </View>

                  {ownedLocals.map((local) => {
                    const isActive = activeProfileType === 'local' && activeProfileId === local.id;
                    
                    return (
                      <TouchableOpacity
                        key={local.id}
                        style={[styles.profileCard, isActive && styles.profileCardActive]}
                        onPress={() => handleSwitchToLocal(local.id)}
                        disabled={switching || isActive}
                        activeOpacity={0.7}
                      >
                        <View style={styles.profileInfo}>
                          {local.imagen_url ? (
                            <Image source={{ uri: local.imagen_url }} style={styles.profileAvatar} />
                          ) : (
                            <View style={[styles.profileAvatar, styles.profileAvatarPlaceholder]}>
                              <IconSymbol ios_icon_name="building.2" android_material_icon_name="store" size={24} color={colors.textSecondary} />
                            </View>
                          )}
                          <View style={styles.profileText}>
                            <Text style={styles.profileName}>{local.nombre}</Text>
                            <Text style={styles.profileType}>{local.tipo}</Text>
                          </View>
                        </View>
                        {isActive && (
                          <View style={styles.activeIndicator}>
                            <IconSymbol ios_icon_name="checkmark.circle.fill" android_material_icon_name="check_circle" size={24} color={colors.primary} />
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </>
              )}

              {ownedLocals.length === 0 && (
                <View style={styles.emptyState}>
                  <IconSymbol ios_icon_name="building.2" android_material_icon_name="store" size={48} color={colors.textSecondary} />
                  <Text style={styles.emptyText}>No tienes locales registrados</Text>
                  <Text style={styles.emptySubtext}>
                    Solicita el rol de propietario para gestionar locales
                  </Text>
                </View>
              )}
            </ScrollView>
          )}

          {switching && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loadingText}>Cambiando perfil...</Text>
            </View>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
});

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  closeButton: {
    padding: 4,
  },
  content: {
    padding: 20,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: colors.text,
    marginTop: 16,
  },
  sectionHeader: {
    marginTop: 24,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  profileCardActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  profileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  profileAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginRight: 16,
  },
  profileAvatarPlaceholder: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  adminAvatarBg: {
    backgroundColor: colors.badgeNuevo,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileText: {
    flex: 1,
  },
  profileName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  profileType: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  activeIndicator: {
    marginLeft: 12,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 32,
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
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
});

export default ProfileSwitcher;
