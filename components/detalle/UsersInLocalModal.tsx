
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  FlatList,
  Image,
  Platform,
} from 'react-native';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';

interface CheckedInUser {
  id: string;
  nombre: string;
  username: string | null;
  avatar: string | null;
}

interface UsersInLocalModalProps {
  visible: boolean;
  onClose: () => void;
  users: CheckedInUser[];
  localName: string;
}

export default function UsersInLocalModal({
  visible,
  onClose,
  users,
  localName,
}: UsersInLocalModalProps) {
  const router = useRouter();
  const { user } = useAuth();

  const handleUserPress = (userId: string) => {
    onClose();
    
    if (user && userId === user.id) {
      router.push('/(tabs)/perfil');
    } else {
      router.push({
        pathname: '/perfil/usuario',
        params: { userId },
      });
    }
  };

  const renderUser = ({ item }: { item: CheckedInUser }) => (
    <TouchableOpacity
      style={styles.userItem}
      onPress={() => handleUserPress(item.id)}
      activeOpacity={0.7}
    >
      <View style={styles.userAvatar}>
        {item.avatar ? (
          <Image source={{ uri: item.avatar }} style={styles.avatarImage} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <IconSymbol 
              ios_icon_name="person.fill" 
              android_material_icon_name="person" 
              size={24} 
              color={colors.headerText} 
            />
          </View>
        )}
      </View>
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{item.nombre}</Text>
        {item.username && (
          <Text style={styles.userUsername}>@{item.username}</Text>
        )}
      </View>
      <IconSymbol 
        ios_icon_name="chevron.right" 
        android_material_icon_name="chevron_right" 
        size={20} 
        color={colors.textSecondary} 
      />
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="slide"
      presentationStyle={Platform.OS === 'android' ? 'fullScreen' : 'pageSheet'}
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <LinearGradient
          colors={[colors.headerGradientStart, colors.headerGradientEnd]}
          style={styles.header}
        >
          <View style={styles.headerTop}>
            <View style={{ width: 40 }} />
            <View style={styles.headerCenter}>
              <Text style={styles.headerTitle}>Usuarios en el local</Text>
              <Text style={styles.headerSubtitle}>{localName}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <IconSymbol 
                ios_icon_name="xmark" 
                android_material_icon_name="close" 
                size={24} 
                color={colors.headerText} 
              />
            </TouchableOpacity>
          </View>
        </LinearGradient>

        <View style={styles.countBanner}>
          <IconSymbol 
            ios_icon_name="person.2.fill" 
            android_material_icon_name="people" 
            size={20} 
            color={colors.primary} 
          />
          <Text style={styles.countText}>
            {users.length} {users.length === 1 ? 'persona' : 'personas'} en este local
          </Text>
        </View>

        <FlatList
          data={users}
          renderItem={renderUser}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 48,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.headerText,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    backgroundColor: colors.primary + '10',
    borderBottomWidth: 1,
    borderBottomColor: colors.primary + '20',
  },
  countText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  listContent: {
    paddingVertical: 8,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    backgroundColor: colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  userAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  avatarImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  avatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  userUsername: {
    fontSize: 14,
    color: colors.textSecondary,
  },
});
