
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

interface ProfileSwitcherProps {
  visible: boolean;
  onClose: () => void;
}

/**
 * ✅ PROFILE SWITCHER v4.0 - RESTORED ORIGINAL FUNCTIONALITY
 * 
 * PURPOSE:
 * - Switch between user profile and owned local profiles
 * - Select which local to interact with
 * - Navigate to the selected profile
 * 
 * NOTE: This is NOT the mode selector from the Explorar page header
 */

const ProfileSwitcher = memo(function ProfileSwitcher({ visible, onClose }: ProfileSwitcherProps) {
  const { user } = useAuth();
  const router = useRouter();
  const {
    activeProfileId,
    activeProfileType,
    switchToClientProfile,
    switchToLocalProfile,
  } = useMode();
  const [switching, setSwitching] = useState(false);
  const [ownedLocals, setOwnedLocals] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const loadOwnedLocals = useCallback(async () => {
    if (!user?.id) {
      console.log('[ProfileSwitcher] ⚠️ No user ID, skipping load');
      return;
    }

    try {
      setLoading(true);
      console.log('[ProfileSwitcher] 🔄 Loading owned locals for user:', user.id);

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

  useEffect(() => {
    if (visible && user?.id) {
      console.log('[ProfileSwitcher] 🔄 Modal opened, loading owned locals');
      loadOwnedLocals();
    }
  }, [visible, user?.id, loadOwnedLocals]);

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

  const isClientActive = useMemo(() => {
    return activeProfileType === 'cliente' && activeProfileId === user?.id;
  }, [activeProfileType, activeProfileId, user?.id]);

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
            <Text style={styles.title}>Seleccionar perfil</Text>
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
              <Text style={styles.sectionSubtitle}>Elige con qué perfil quieres interactuar</Text>

              <TouchableOpacity
                style={[styles.profileCard, isClientActive && styles.profileCardActive]}
                onPress={handleSwitchToClient}
                disabled={switching || isClientActive}
                activeOpacity={0.7}
              >
                <View style={styles.profileInfo}>
                  <View style={[styles.profileAvatar, styles.clientAvatarBg]}>
                    {user.avatar ? (
                      <Image source={{ uri: user.avatar }} style={styles.avatarImage} />
                    ) : (
                      <IconSymbol ios_icon_name="person.fill" android_material_icon_name="person" size={24} color={colors.white} />
                    )}
                  </View>
                  <View style={styles.profileText}>
                    <Text style={styles.profileName}>{user.nombre || 'Mi Perfil'}</Text>
                    <Text style={styles.profileType}>Perfil de usuario</Text>
                  </View>
                </View>
                {isClientActive && (
                  <View style={styles.activeIndicator}>
                    <IconSymbol ios_icon_name="checkmark.circle.fill" android_material_icon_name="check_circle" size={24} color={colors.primary} />
                  </View>
                )}
              </TouchableOpacity>

              {ownedLocals.length > 0 && (
                <React.Fragment>
                  <Text style={styles.sectionTitle}>Mis Locales</Text>
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
                          <View style={[styles.profileAvatar, styles.localAvatarBg]}>
                            {local.imagen_url ? (
                              <Image source={{ uri: local.imagen_url }} style={styles.avatarImage} />
                            ) : (
                              <IconSymbol ios_icon_name="building.2.fill" android_material_icon_name="store" size={24} color={colors.white} />
                            )}
                          </View>
                          <View style={styles.profileText}>
                            <Text style={styles.profileName}>{local.nombre}</Text>
                            <Text style={styles.profileType}>{local.tipo || 'Local'}</Text>
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
                </React.Fragment>
              )}

              {ownedLocals.length === 0 && (
                <View style={styles.emptyState}>
                  <IconSymbol ios_icon_name="building.2" android_material_icon_name="store" size={48} color={colors.textSecondary} />
                  <Text style={styles.emptyStateText}>No tienes locales registrados</Text>
                  <Text style={styles.emptyStateSubtext}>
                    Reclama o crea un local para poder gestionarlo
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
  sectionSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginTop: 16,
    marginBottom: 12,
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
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  clientAvatarBg: {
    backgroundColor: colors.primary,
  },
  localAvatarBg: {
    backgroundColor: colors.secondary,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
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
    gap: 12,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 20,
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
