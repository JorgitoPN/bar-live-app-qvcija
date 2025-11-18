
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
import { supabase } from '@/utils/supabase';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const MAX_MODAL_HEIGHT = SCREEN_HEIGHT * 0.7;

interface StoryStatsModalProps {
  visible: boolean;
  onClose: () => void;
  storyId: string;
  viewsCount: number;
  likesCount: number;
  views: Array<{
    id: string;
    usuario_id: string;
    viewed_at: string;
    usuario?: {
      nombre: string;
      avatar?: string;
      username?: string;
    };
  }>;
  likes: Array<{
    id: string;
    usuario_id: string;
    created_at: string;
    usuario?: {
      nombre: string;
      avatar?: string;
      username?: string;
    };
  }>;
  loading?: boolean;
}

export default function StoryStatsModal({
  visible,
  onClose,
  storyId,
  viewsCount,
  likesCount,
  views,
  likes,
  loading = false,
}: StoryStatsModalProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = React.useState<'views' | 'likes'>('views');
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

  const handleUserPress = async (userId: string) => {
    try {
      // Check if it's a user or a local
      const { data: userData, error: userError } = await supabase
        .from('usuarios')
        .select('id, rol_app')
        .eq('id', userId)
        .single();

      if (userData) {
        // It's a user - navigate to user profile
        if (user && userId === user.id) {
          // Navigate to own profile
          router.push('/(tabs)/perfil');
        } else {
          // Navigate to other user's profile
          router.push(`/perfil/usuario?userId=${userId}`);
        }
      } else {
        // Check if it's a local
        const { data: localData, error: localError } = await supabase
          .from('locales')
          .select('id')
          .eq('propietario_id', userId)
          .single();

        if (localData) {
          // Navigate to local profile
          router.push(`/perfil/local?localId=${localData.id}`);
        }
      }
      
      // Close the modal after navigation
      onClose();
    } catch (error) {
      console.error('[StoryStatsModal] Error navigating to profile:', error);
    }
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
                <IconSymbol name="xmark" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            {/* Tabs */}
            <View style={styles.tabsContainer}>
              <TouchableOpacity
                style={[styles.tab, activeTab === 'views' && styles.tabActive]}
                onPress={() => setActiveTab('views')}
              >
                <IconSymbol
                  name="eye"
                  size={20}
                  color={activeTab === 'views' ? colors.primary : colors.textSecondary}
                />
                <Text style={[styles.tabText, activeTab === 'views' && styles.tabTextActive]}>
                  Vistas ({viewsCount})
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, activeTab === 'likes' && styles.tabActive]}
                onPress={() => setActiveTab('likes')}
              >
                <IconSymbol
                  name="heart"
                  size={20}
                  color={activeTab === 'likes' ? colors.primary : colors.textSecondary}
                />
                <Text style={[styles.tabText, activeTab === 'likes' && styles.tabTextActive]}>
                  Me gusta ({likesCount})
                </Text>
              </TouchableOpacity>
            </View>

            {/* Content */}
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
              </View>
            ) : (
              <ScrollView style={styles.listContainer} showsVerticalScrollIndicator={false}>
                {activeTab === 'views' ? (
                  views.length > 0 ? (
                    views.map((view) => (
                      <TouchableOpacity 
                        key={view.id} 
                        style={styles.userItem}
                        onPress={() => handleUserPress(view.usuario_id)}
                        activeOpacity={0.7}
                      >
                        {view.usuario?.avatar ? (
                          <Image
                            source={{ uri: view.usuario.avatar }}
                            style={styles.userAvatar}
                          />
                        ) : (
                          <View style={[styles.userAvatar, styles.avatarPlaceholder]}>
                            <Text style={styles.avatarText}>
                              {view.usuario?.nombre?.charAt(0).toUpperCase() || 'U'}
                            </Text>
                          </View>
                        )}
                        <View style={styles.userInfo}>
                          <Text style={styles.userName}>
                            {view.usuario?.nombre || 'Usuario'}
                          </Text>
                          {view.usuario?.username && (
                            <Text style={styles.userUsername}>
                              @{view.usuario.username}
                            </Text>
                          )}
                        </View>
                        <Text style={styles.timeText}>{formatTime(view.viewed_at)}</Text>
                      </TouchableOpacity>
                    ))
                  ) : (
                    <View style={styles.emptyState}>
                      <IconSymbol name="eye" size={48} color={colors.textSecondary} />
                      <Text style={styles.emptyText}>Aún no hay vistas</Text>
                    </View>
                  )
                ) : (
                  likes.length > 0 ? (
                    likes.map((like) => (
                      <TouchableOpacity 
                        key={like.id} 
                        style={styles.userItem}
                        onPress={() => handleUserPress(like.usuario_id)}
                        activeOpacity={0.7}
                      >
                        {like.usuario?.avatar ? (
                          <Image
                            source={{ uri: like.usuario.avatar }}
                            style={styles.userAvatar}
                          />
                        ) : (
                          <View style={[styles.userAvatar, styles.avatarPlaceholder]}>
                            <Text style={styles.avatarText}>
                              {like.usuario?.nombre?.charAt(0).toUpperCase() || 'U'}
                            </Text>
                          </View>
                        )}
                        <View style={styles.userInfo}>
                          <Text style={styles.userName}>
                            {like.usuario?.nombre || 'Usuario'}
                          </Text>
                          {like.usuario?.username && (
                            <Text style={styles.userUsername}>
                              @{like.usuario.username}
                            </Text>
                          )}
                        </View>
                        <Text style={styles.timeText}>{formatTime(like.created_at)}</Text>
                      </TouchableOpacity>
                    ))
                  ) : (
                    <View style={styles.emptyState}>
                      <IconSymbol name="heart" size={48} color={colors.textSecondary} />
                      <Text style={styles.emptyText}>Aún no hay me gusta</Text>
                    </View>
                  )
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
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: colors.cardBackground,
  },
  tabActive: {
    backgroundColor: colors.primary + '20',
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: colors.primary,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContainer: {
    maxHeight: MAX_MODAL_HEIGHT - 200,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.cardBorder,
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
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
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  userUsername: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
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
