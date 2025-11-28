
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  FlatList,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/utils/supabase';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import FoodPlateAvatar from '@/components/common/FoodPlateAvatar';
import { router } from 'expo-router';

interface User {
  id: string;
  nombre: string;
  username?: string;
  avatar?: string;
}

interface Local {
  id: string;
  nombre: string;
  imagen_url?: string;
}

interface SharePostModalProps {
  visible: boolean;
  postId: string;
  postContent?: string;
  onClose: () => void;
}

export default function SharePostModal({
  visible,
  postId,
  postContent,
  onClose,
}: SharePostModalProps) {
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [locals, setLocals] = useState<Local[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sending, setSending] = useState(false);
  const [selectedRecipients, setSelectedRecipients] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (visible) {
      loadRecipients();
    }
  }, [visible]);

  const loadRecipients = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Load users (followers and following)
      const [followersResult, followingResult] = await Promise.all([
        supabase
          .from('seguidores')
          .select('seguidor_id, seguidor:usuarios!seguidores_seguidor_id_fkey(id, nombre, username, avatar)')
          .eq('seguido_id', user.id),
        supabase
          .from('seguidores')
          .select('seguido_id, seguido:usuarios!seguidores_seguido_id_fkey(id, nombre, username, avatar)')
          .eq('seguidor_id', user.id),
      ]);

      const followersUsers = followersResult.data?.map(f => f.seguidor).filter(Boolean) || [];
      const followingUsers = followingResult.data?.map(f => f.seguido).filter(Boolean) || [];
      
      // Combine and deduplicate
      const allUsers = [...followersUsers, ...followingUsers];
      const uniqueUsers = Array.from(
        new Map(allUsers.map(u => [u.id, u])).values()
      );

      setUsers(uniqueUsers as User[]);

      // Load favorite locals
      const { data: favoritesData } = await supabase
        .from('favoritos')
        .select('local_id, local:locales(id, nombre, imagen_url)')
        .eq('usuario_id', user.id);

      const favoriteLocals = favoritesData?.map(f => f.local).filter(Boolean) || [];
      setLocals(favoriteLocals as Local[]);
    } catch (error) {
      console.error('[SharePostModal] Error loading recipients:', error);
      Alert.alert('Error', 'No se pudieron cargar los destinatarios');
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    if (!user || selectedRecipients.size === 0 || sending) {
      return;
    }

    setSending(true);

    try {
      const shareMessage = `📤 Publicación compartida: ${postContent || 'Ver publicación'}`;

      for (const recipientId of selectedRecipients) {
        // Determine if recipient is a user or local
        const isLocal = locals.some(l => l.id === recipientId);
        
        // Create or get chat
        let chatId: string;
        
        if (isLocal) {
          // Chat with local
          const userId1 = user.id < recipientId ? user.id : recipientId;
          const userId2 = user.id < recipientId ? recipientId : user.id;

          const { data: existingChat } = await supabase
            .from('chats')
            .select('id')
            .eq('usuario1_id', userId1)
            .eq('usuario2_id', userId2)
            .eq('local_id', recipientId)
            .maybeSingle();

          if (existingChat) {
            chatId = existingChat.id;
          } else {
            const { data: newChat, error } = await supabase
              .from('chats')
              .insert({
                usuario1_id: userId1,
                usuario2_id: userId2,
                local_id: recipientId,
                ultimo_mensaje: shareMessage,
                ultimo_mensaje_fecha: new Date().toISOString(),
              })
              .select()
              .single();

            if (error) throw error;
            chatId = newChat.id;
          }
        } else {
          // Chat with user
          const userId1 = user.id < recipientId ? user.id : recipientId;
          const userId2 = user.id < recipientId ? recipientId : user.id;

          const { data: existingChat } = await supabase
            .from('chats')
            .select('id')
            .eq('usuario1_id', userId1)
            .eq('usuario2_id', userId2)
            .is('local_id', null)
            .maybeSingle();

          if (existingChat) {
            chatId = existingChat.id;
          } else {
            const { data: newChat, error } = await supabase
              .from('chats')
              .insert({
                usuario1_id: userId1,
                usuario2_id: userId2,
                local_id: null,
                ultimo_mensaje: shareMessage,
                ultimo_mensaje_fecha: new Date().toISOString(),
              })
              .select()
              .single();

            if (error) throw error;
            chatId = newChat.id;
          }
        }

        // Send message with post reference
        await supabase.from('mensajes').insert({
          chat_id: chatId,
          remitente_id: user.id,
          contenido: shareMessage,
          post_id: postId,
          tipo_mensaje: 'post_share',
        });

        // Update chat last message
        await supabase
          .from('chats')
          .update({
            ultimo_mensaje: shareMessage,
            ultimo_mensaje_fecha: new Date().toISOString(),
          })
          .eq('id', chatId);
      }

      Alert.alert('Éxito', 'Publicación compartida correctamente');
      onClose();
    } catch (error) {
      console.error('[SharePostModal] Error sharing post:', error);
      Alert.alert('Error', 'No se pudo compartir la publicación');
    } finally {
      setSending(false);
    }
  };

  const toggleRecipient = (id: string) => {
    setSelectedRecipients(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const filteredUsers = users.filter(u =>
    u.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.username?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredLocals = locals.filter(l =>
    l.nombre.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderUser = ({ item }: { item: User }) => {
    const isSelected = selectedRecipients.has(item.id);

    return (
      <TouchableOpacity
        style={styles.recipientItem}
        onPress={() => toggleRecipient(item.id)}
        activeOpacity={0.7}
      >
        <FoodPlateAvatar
          imageUrl={item.avatar}
          size={48}
          nombre={item.nombre}
        />
        <View style={styles.recipientInfo}>
          <Text style={styles.recipientName}>{item.nombre}</Text>
          {item.username && (
            <Text style={styles.recipientUsername}>@{item.username}</Text>
          )}
        </View>
        <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
          {isSelected && (
            <IconSymbol
              ios_icon_name="checkmark"
              android_material_icon_name="check"
              size={16}
              color="#fff"
            />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderLocal = ({ item }: { item: Local }) => {
    const isSelected = selectedRecipients.has(item.id);

    return (
      <TouchableOpacity
        style={styles.recipientItem}
        onPress={() => toggleRecipient(item.id)}
        activeOpacity={0.7}
      >
        <FoodPlateAvatar
          imageUrl={item.imagen_url}
          size={48}
          nombre={item.nombre}
        />
        <View style={styles.recipientInfo}>
          <Text style={styles.recipientName}>{item.nombre}</Text>
          <Text style={styles.recipientUsername}>Local</Text>
        </View>
        <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
          {isSelected && (
            <IconSymbol
              ios_icon_name="checkmark"
              android_material_icon_name="check"
              size={16}
              color="#fff"
            />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <BlurView intensity={80} tint="light" style={styles.header}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            activeOpacity={0.7}
          >
            <IconSymbol
              ios_icon_name="xmark"
              android_material_icon_name="close"
              size={24}
              color={colors.text}
            />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Compartir publicación</Text>
          <TouchableOpacity
            style={[styles.sendButton, selectedRecipients.size === 0 && styles.sendButtonDisabled]}
            onPress={handleShare}
            activeOpacity={0.7}
            disabled={selectedRecipients.size === 0 || sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Text style={[styles.sendButtonText, selectedRecipients.size === 0 && styles.sendButtonTextDisabled]}>
                Enviar
              </Text>
            )}
          </TouchableOpacity>
        </BlurView>

        {/* Search */}
        <View style={styles.searchContainer}>
          <IconSymbol
            ios_icon_name="magnifyingglass"
            android_material_icon_name="search"
            size={20}
            color={colors.textSecondary}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar usuarios o locales..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Recipients List */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <FlatList
            data={[...filteredUsers, ...filteredLocals]}
            renderItem={({ item }) => {
              if ('username' in item) {
                return renderUser({ item: item as User });
              } else {
                return renderLocal({ item: item as Local });
              }
            }}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <IconSymbol
                  ios_icon_name="person.2.slash"
                  android_material_icon_name="people_outline"
                  size={64}
                  color={colors.textSecondary}
                />
                <Text style={styles.emptyText}>No se encontraron destinatarios</Text>
              </View>
            }
          />
        )}
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : 48,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    overflow: 'hidden',
  },
  closeButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
    textAlign: 'center',
  },
  sendButton: {
    padding: 8,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
  sendButtonTextDisabled: {
    color: colors.textSecondary,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.cardBackground,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    flexGrow: 1,
    paddingVertical: 16,
  },
  recipientItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  recipientInfo: {
    flex: 1,
  },
  recipientName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  recipientUsername: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 16,
  },
});
