
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Dimensions,
} from 'react-native';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const MAX_MODAL_HEIGHT = SCREEN_HEIGHT * 0.7;

interface ViewerData {
  id: string;
  usuario_id: string;
  viewed_at: string;
  liked: boolean;
  usuario?: {
    nombre: string;
    avatar?: string;
    username?: string;
  };
}

interface StoryStatsModalProps {
  visible: boolean;
  onClose: () => void;
  onNavigateToProfile?: () => void;
  storyId: string;
  viewsCount: number;
  likesCount: number;
  views: {
    id: string;
    usuario_id: string;
    viewed_at: string;
    usuario?: {
      nombre: string;
      avatar?: string;
      username?: string;
    };
  }[];
  likes: {
    id: string;
    usuario_id: string;
    created_at: string;
    usuario?: {
      nombre: string;
      avatar?: string;
      username?: string;
    };
  }[];
  loading?: boolean;
}

export default function StoryStatsModal({
  visible,
  onClose,
  onNavigateToProfile,
  storyId,
  viewsCount,
  likesCount,
  views,
  likes,
  loading = false,
}: StoryStatsModalProps) {
  const router = useRouter();
  const { user } = useAuth();
  const slideAnim = React.useRef(new Animated.Value(MAX_MODAL_HEIGHT)).current;

  React.useEffect(() => {
    if (visible) {
      // Slide up animation
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start();
    } else {
      // Slide down animation
      Animated.timing(slideAnim, {
        toValue: MAX_MODAL_HEIGHT,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, slideAnim]);

  // ✅ CONSOLIDATED VIEW: Merge views and likes into a single list
  // ✅ FILTER OUT OWN VIEWS: Only show views from other users
  const consolidatedViewers = React.useMemo(() => {
    const viewersMap = new Map<string, ViewerData>();

    // Add all viewers (excluding own views)
    views.forEach((view) => {
      // ✅ Skip if this is the current user's own view
      if (user && view.usuario_id === user.id) {
        return;
      }
      
      viewersMap.set(view.usuario_id, {
        id: view.id,
        usuario_id: view.usuario_id,
        viewed_at: view.viewed_at,
        liked: false,
        usuario: view.usuario,
      });
    });

    // Mark viewers who also liked
    likes.forEach((like) => {
      // ✅ Skip if this is the current user's own like
      if (user && like.usuario_id === user.id) {
        return;
      }
      
      const existing = viewersMap.get(like.usuario_id);
      if (existing) {
        existing.liked = true;
      } else {
        // If someone liked without viewing (shouldn't happen, but handle it)
        viewersMap.set(like.usuario_id, {
          id: like.id,
          usuario_id: like.usuario_id,
          viewed_at: like.created_at,
          liked: true,
          usuario: like.usuario,
        });
      }
    });

    // Convert to array and sort: liked first, then by time
    return Array.from(viewersMap.values()).sort((a, b) => {
      if (a.liked && !b.liked) return -1;
      if (!a.liked && b.liked) return 1;
      return new Date(b.viewed_at).getTime() - new Date(a.viewed_at).getTime();
    });
  }, [views, likes, user]);

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Ahora';
    if (diffMins < 60) return `Hace ${diffMins}m`;
    if (diffHours < 24) return `Hace ${diffHours}h`;
    if (diffDays < 7) return `Hace ${diffDays}d`;
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  };

  const handleUserPress = (userId: string) => {
    console.log('[StoryStatsModal] 🔍 Navigating to profile for user ID:', userId);
    
    // ✅ CRITICAL FIX: Close the stats modal FIRST
    onClose();
    
    // ✅ CRITICAL FIX: Close the parent story viewer if callback provided
    if (onNavigateToProfile) {
      console.log('[StoryStatsModal] ✅ Calling onNavigateToProfile to close story viewer');
      onNavigateToProfile();
    }
    
    // Small delay to ensure modals close before navigation
    setTimeout(() => {
      // Check if this is the current user
      if (user && userId === user.id) {
        console.log('[StoryStatsModal] ✅ Navigating to own profile');
        router.push('/(tabs)/perfil');
        return;
      }

      // Navigate to user profile
      console.log('[StoryStatsModal] ✅ Navigating to user profile');
      router.push(`/perfil/usuario?userId=${userId}`);
    }, 100);
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="none"
      transparent={true}
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {/* Dimmed background - tapping closes the modal */}
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        {/* Bottom sheet - prevent close when tapping inside */}
        <Animated.View
          style={[
            styles.modalContent,
            {
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <Pressable onPress={(e) => e.stopPropagation()}>
            {/* Drag handle */}
            <View style={styles.dragHandleContainer}>
              <View style={styles.dragHandle} />
            </View>

            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Estadísticas</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <IconSymbol ios_icon_name="xmark" android_material_icon_name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            {/* Stats Summary - Unified display */}
            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <IconSymbol ios_icon_name="eye.fill" android_material_icon_name="visibility" size={20} color={colors.primary} />
                <Text style={styles.statValue}>{consolidatedViewers.length}</Text>
                <Text style={styles.statLabel}>Visitantes</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <IconSymbol ios_icon_name="heart.fill" android_material_icon_name="favorite" size={20} color="#EF4444" />
                <Text style={styles.statValue}>{consolidatedViewers.filter(v => v.liked).length}</Text>
                <Text style={styles.statLabel}>Me gusta</Text>
              </View>
            </View>

            {/* Content */}
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
              </View>
            ) : (
              <ScrollView style={styles.listContainer} showsVerticalScrollIndicator={false}>
                {consolidatedViewers.length > 0 ? (
                  consolidatedViewers.map((viewer) => {
                    // ✅ FIXED: Display username without @ symbol, prioritize username over full name
                    const displayName = (viewer.usuario?.username || viewer.usuario?.nombre || 'Usuario').replace(/^@/, '');
                    
                    return (
                      <TouchableOpacity 
                        key={viewer.id} 
                        style={styles.userItem}
                        onPress={() => handleUserPress(viewer.usuario_id)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.userAvatarContainer}>
                          {viewer.usuario?.avatar ? (
                            <Image
                              source={{ uri: viewer.usuario.avatar }}
                              style={styles.userAvatar}
                            />
                          ) : (
                            <View style={[styles.userAvatar, styles.avatarPlaceholder]}>
                              <Text style={styles.avatarText}>
                                {displayName.charAt(0).toUpperCase()}
                              </Text>
                            </View>
                          )}
                          {/* ✅ HEART INDICATOR: Show heart icon if user liked */}
                          {viewer.liked && (
                            <View style={styles.likeIndicator}>
                              <IconSymbol ios_icon_name="heart.fill" android_material_icon_name="favorite" size={16} color="#FFFFFF" />
                            </View>
                          )}
                        </View>
                        <View style={styles.userInfo}>
                          <View style={styles.userNameRow}>
                            <Text style={styles.userName}>
                              {displayName}
                            </Text>
                            {viewer.liked && (
                              <IconSymbol ios_icon_name="heart.fill" android_material_icon_name="favorite" size={14} color="#EF4444" />
                            )}
                          </View>
                        </View>
                        <Text style={styles.timeText}>{formatTime(viewer.viewed_at)}</Text>
                      </TouchableOpacity>
                    );
                  })
                ) : (
                  <View style={styles.emptyState}>
                    <IconSymbol ios_icon_name="eye" android_material_icon_name="visibility" size={48} color={colors.textSecondary} />
                    <Text style={styles.emptyText}>Aún no hay vistas</Text>
                  </View>
                )}
              </ScrollView>
            )}
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: MAX_MODAL_HEIGHT,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  dragHandleContainer: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: colors.cardBorder,
    borderRadius: 2,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  closeButton: {
    padding: 4,
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.cardBorder,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContainer: {
    maxHeight: MAX_MODAL_HEIGHT - 250,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.cardBorder,
  },
  userAvatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarPlaceholder: {
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.white,
  },
  likeIndicator: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.background,
  },
  userInfo: {
    flex: 1,
  },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  timeText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  emptyState: {
    padding: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 16,
    textAlign: 'center',
  },
});
