
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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';

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
  const [activeTab, setActiveTab] = React.useState<'views' | 'likes'>('views');

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

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Estadísticas de Historia</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <IconSymbol name="xmark" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

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

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : (
            <ScrollView style={styles.listContainer}>
              {activeTab === 'views' ? (
                views.length > 0 ? (
                  views.map((view) => (
                    <View key={view.id} style={styles.userItem}>
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
                    </View>
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
                    <View key={like.id} style={styles.userItem}>
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
                    </View>
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
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
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
    maxHeight: 500,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
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
