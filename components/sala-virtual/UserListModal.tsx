
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  FlatList,
  Image,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { LinearGradient } from 'expo-linear-gradient';

interface ActiveUser {
  id: string;
  nombre: string;
  username?: string;
  avatar?: string;
  last_activity: string;
  checked_in_at?: string;
}

interface UserListModalProps {
  visible: boolean;
  onClose: () => void;
  users: ActiveUser[];
  selectedUser: ActiveUser | null;
  localId: string;
  onReport: (userId: string) => void;
}

export function UserListModal({
  visible,
  onClose,
  users,
  selectedUser,
  localId,
  onReport,
}: UserListModalProps) {
  const router = useRouter();

  const handleUserPress = (user: ActiveUser) => {
    onClose();
    router.push(`/perfil/usuario?id=${user.id}`);
  };

  const handleSendMessage = (user: ActiveUser) => {
    onClose();
    router.push(`/chat/nuevo-chat?userId=${user.id}`);
  };

  const handleFollow = async (user: ActiveUser) => {
    Alert.alert('Seguir Usuario', `¿Quieres seguir a ${user.nombre}?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Seguir',
        onPress: () => {
          // Implement follow logic
          Alert.alert('Éxito', `Ahora sigues a ${user.nombre}`);
        },
      },
    ]);
  };

  const renderUser = ({ item }: { item: ActiveUser }) => {
    const isSelected = selectedUser?.id === item.id;

    return (
      <TouchableOpacity
        style={[styles.userItem, isSelected && styles.userItemSelected]}
        onPress={() => handleUserPress(item)}
      >
        <View style={styles.userInfo}>
          {item.avatar ? (
            <Image source={{ uri: item.avatar }} style={styles.userAvatar} />
          ) : (
            <View style={styles.userAvatarPlaceholder}>
              <IconSymbol
                ios_icon_name="person.fill"
                android_material_icon_name="person"
                size={24}
                color={colors.textSecondary}
              />
            </View>
          )}
          <View style={styles.userDetails}>
            <Text style={styles.userName}>{item.nombre}</Text>
            {item.username && (
              <Text style={styles.userUsername}>@{item.username}</Text>
            )}
          </View>
          <View style={styles.onlineBadge}>
            <View style={styles.onlineDot} />
          </View>
        </View>

        {isSelected && (
          <View style={styles.userActions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleSendMessage(item)}
            >
              <IconSymbol
                ios_icon_name="message.fill"
                android_material_icon_name="message"
                size={20}
                color={colors.primary}
              />
              <Text style={styles.actionButtonText}>Mensaje Privado</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleFollow(item)}
            >
              <IconSymbol
                ios_icon_name="person.badge.plus"
                android_material_icon_name="person_add"
                size={20}
                color={colors.primary}
              />
              <Text style={styles.actionButtonText}>Seguir</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.actionButtonDanger]}
              onPress={() => {
                onClose();
                onReport(item.id);
              }}
            >
              <IconSymbol
                ios_icon_name="exclamationmark.triangle"
                android_material_icon_name="report"
                size={20}
                color={colors.error}
              />
              <Text style={[styles.actionButtonText, styles.actionButtonTextDanger]}>
                Reportar
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Usuarios en la Sala</Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <IconSymbol
                ios_icon_name="xmark.circle.fill"
                android_material_icon_name="close"
                size={28}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <IconSymbol
                ios_icon_name="person.3.fill"
                android_material_icon_name="group"
                size={24}
                color={colors.primary}
              />
              <Text style={styles.statNumber}>{users.length}</Text>
              <Text style={styles.statLabel}>Activos</Text>
            </View>
          </View>

          <FlatList
            data={users}
            renderItem={renderUser}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.userList}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No hay usuarios activos</Text>
              </View>
            }
          />
        </View>
      </View>
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
    paddingTop: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  closeButton: {
    padding: 4,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  statItem: {
    alignItems: 'center',
    gap: 4,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  userList: {
    padding: 16,
  },
  userItem: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  userItemSelected: {
    borderWidth: 2,
    borderColor: colors.primary,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  userAvatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userDetails: {
    flex: 1,
    marginLeft: 12,
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
  onlineBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  onlineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10B981',
  },
  userActions: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary + '10',
    borderRadius: 8,
    padding: 12,
    gap: 8,
  },
  actionButtonDanger: {
    backgroundColor: colors.error + '10',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  actionButtonTextDanger: {
    color: colors.error,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
});
