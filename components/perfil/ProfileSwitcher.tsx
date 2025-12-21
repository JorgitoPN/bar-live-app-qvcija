
import React, { useState, useEffect } from 'react';
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
import { LinearGradient } from 'expo-linear-gradient';
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

export default function ProfileSwitcher({ visible, onClose }: ProfileSwitcherProps) {
  const { user } = useAuth();
  const router = useRouter();
  const {
    activeProfileId,
    activeProfileType,
    activeLocalData,
    switchToClientProfile,
    switchToLocalProfile,
  } = useMode();
  const [switching, setSwitching] = useState(false);
  const [ownedLocals, setOwnedLocals] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // ✅ FIXED: Load ONLY active owned locals from propietarios_locales table
  const loadOwnedLocals = async () => {
    if (!user) return;

    try {
      setLoading(true);
      console.log('[ProfileSwitcher] 🔄 Loading owned locals for user:', user.id);

      // ✅ FIXED: Query propietarios_locales table to get ONLY active owned locals
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

      // ✅ FIXED: Filter to only include active locals
      const activeOwnedLocals = (propietariosData || [])
        .filter(p => p.locales && p.locales.activo === true)
        .map(p => p.locales);

      console.log('[ProfileSwitcher] ✅ Loaded', activeOwnedLocals.length, 'active owned locals');
      console.log('[ProfileSwitcher] 📊 Owned locals:', activeOwnedLocals.map(l => ({ id: l.id, nombre: l.nombre })));

      setOwnedLocals(activeOwnedLocals);
    } catch (error) {
      console.error('[ProfileSwitcher] ❌ Error loading owned locals:', error);
    } finally {
      setLoading(false);
    }
  };

  // ✅ FIXED: Reload owned locals when modal opens
  useEffect(() => {
    if (visible && user) {
      console.log('[ProfileSwitcher] 🔄 Modal opened, reloading owned locals');
      loadOwnedLocals();
    }
  }, [visible, user, loadOwnedLocals]);

  // ✅ FIXED: Log current active profile when modal opens or when active profile changes
  useEffect(() => {
    if (visible) {
      console.log('[ProfileSwitcher] 📊 Current active profile:', {
        activeProfileType,
        activeProfileId,
        activeLocalName: activeLocalData?.nombre,
        userId: user?.id,
        ownedLocalsCount: ownedLocals.length,
      });
    }
  }, [visible, activeProfileType, activeProfileId, activeLocalData, user, ownedLocals]);

  const handleSwitchToClient = async () => {
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
  };

  const handleSwitchToLocal = async (localId: string) => {
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
  };

  if (!user) return null;

  // ✅ FIXED: Determine if client profile is active
  const isClientActive = activeProfileType === 'cliente' && activeProfileId === user.id;

  console.log('[ProfileSwitcher] 🔍 Render state:', {
    activeProfileType,
    activeProfileId,
    userId: user.id,
    isClientActive,
    ownedLocalsCount: ownedLocals.length,
  });

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
                    // ✅ FIXED: Check if this local is active
                    const isActive = activeProfileType === 'local' && activeProfileId === local.id;
                    
                    console.log('[ProfileSwitcher] 🔍 Local card:', {
                      localId: local.id,
                      localName: local.nombre,
                      activeProfileId,
                      activeProfileType,
                      isActive,
                    });
                    
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
}

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
