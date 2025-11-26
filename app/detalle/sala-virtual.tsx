
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  FlatList,
  Animated,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { LinearGradient } from 'expo-linear-gradient';

interface InteractionMessage {
  id: string;
  usuario_id: string;
  local_id: string;
  tipo: 'mensaje' | 'emoticon' | 'chat';
  contenido: string;
  recipient_id?: string;
  created_at: string;
  usuario: {
    id: string;
    nombre: string;
    username?: string;
    avatar?: string;
  };
}

interface Local {
  id: string;
  nombre: string;
  imagen_url?: string;
  descripcion?: string;
}

interface ActiveUser {
  id: string;
  nombre: string;
  username?: string;
  avatar?: string;
  last_activity: string;
}

export default function SalaVirtualScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  
  const [local, setLocal] = useState<Local | null>(null);
  const [messages, setMessages] = useState<InteractionMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([]);
  const [userJoinedAnimation] = useState(new Animated.Value(0));
  const [recentEmoticons, setRecentEmoticons] = useState<{ emoji: string; userId: string; timestamp: number }[]>([]);
  
  const flatListRef = useRef<FlatList>(null);
  const channelRef = useRef<any>(null);
  const localId = params.localId as string;

  const loadLocalData = useCallback(async () => {
    if (!localId) {
      console.error('[SalaVirtual] No localId provided');
      Alert.alert('Error', 'No se especificó el local');
      router.back();
      return;
    }

    try {
      const { data, error } = await supabase
        .from('locales')
        .select('id, nombre, imagen_url, descripcion')
        .eq('id', localId)
        .single();

      if (error) {
        console.error('[SalaVirtual] Error loading local:', error);
        Alert.alert('Error', 'No se pudo cargar la información del local');
        router.back();
        return;
      }

      console.log('[SalaVirtual] Local loaded:', data);
      setLocal(data);
    } catch (error) {
      console.error('[SalaVirtual] Error:', error);
    }
  }, [localId, router]);

  const loadMessages = useCallback(async () => {
    if (!localId) {
      console.error('[SalaVirtual] No localId provided for loading messages');
      return;
    }

    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('sala_virtual_interacciones')
        .select(`
          *,
          usuario:usuarios!sala_virtual_interacciones_usuario_id_fkey(
            id,
            nombre,
            username,
            avatar
          )
        `)
        .eq('local_id', localId)
        .eq('tipo', 'mensaje')
        .order('created_at', { ascending: true })
        .limit(100);

      if (error) {
        console.error('[SalaVirtual] Error loading messages:', error);
        return;
      }

      console.log('[SalaVirtual] Messages loaded:', data?.length || 0);
      setMessages(data || []);
      
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: false });
      }, 100);
    } catch (error) {
      console.error('[SalaVirtual] Error:', error);
    } finally {
      setLoading(false);
    }
  }, [localId]);

  const updateActiveUsers = useCallback(async () => {
    if (!localId) {
      console.error('[SalaVirtual] No localId provided for active users count');
      return;
    }

    try {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      
      const { data, error } = await supabase
        .from('sala_virtual_interacciones')
        .select(`
          usuario_id,
          created_at,
          usuario:usuarios!sala_virtual_interacciones_usuario_id_fkey(
            id,
            nombre,
            username,
            avatar
          )
        `)
        .eq('local_id', localId)
        .gte('created_at', fiveMinutesAgo)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[SalaVirtual] Error counting active users:', error);
        return;
      }

      const uniqueUsersMap = new Map<string, ActiveUser>();
      data?.forEach(item => {
        if (item.usuario && !uniqueUsersMap.has(item.usuario_id)) {
          uniqueUsersMap.set(item.usuario_id, {
            id: item.usuario.id,
            nombre: item.usuario.nombre,
            username: item.usuario.username,
            avatar: item.usuario.avatar,
            last_activity: item.created_at,
          });
        }
      });

      const activeUsersList = Array.from(uniqueUsersMap.values());
      setActiveUsers(activeUsersList);
      console.log('[SalaVirtual] Active users:', activeUsersList.length);
    } catch (error) {
      console.error('[SalaVirtual] Error:', error);
    }
  }, [localId]);

  const subscribeToMessages = useCallback(() => {
    if (!localId) {
      console.error('[SalaVirtual] No localId provided for subscription');
      return () => {};
    }

    console.log('[SalaVirtual] Subscribing to messages for local:', localId);

    const channel = supabase
      .channel(`sala_virtual:${localId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'sala_virtual_interacciones',
          filter: `local_id=eq.${localId}`,
        },
        async (payload) => {
          console.log('[SalaVirtual] New interaction received:', payload);
          
          const { data: userData } = await supabase
            .from('usuarios')
            .select('id, nombre, username, avatar')
            .eq('id', payload.new.usuario_id)
            .single();

          const newInteraction: InteractionMessage = {
            ...payload.new as any,
            usuario: userData || {
              id: payload.new.usuario_id,
              nombre: 'Usuario',
            },
          };

          if (newInteraction.tipo === 'mensaje') {
            setMessages((prev) => [...prev, newInteraction]);
            
            setTimeout(() => {
              flatListRef.current?.scrollToEnd({ animated: true });
            }, 100);
          } else if (newInteraction.tipo === 'emoticon') {
            setRecentEmoticons(prev => [
              ...prev,
              {
                emoji: newInteraction.contenido,
                userId: newInteraction.usuario_id,
                timestamp: Date.now(),
              }
            ]);

            setTimeout(() => {
              setRecentEmoticons(prev => 
                prev.filter(e => Date.now() - e.timestamp < 3000)
              );
            }, 3000);
          }

          if (newInteraction.usuario_id !== user?.id) {
            Animated.sequence([
              Animated.timing(userJoinedAnimation, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
              }),
              Animated.timing(userJoinedAnimation, {
                toValue: 0,
                duration: 300,
                delay: 2000,
                useNativeDriver: true,
              }),
            ]).start();
          }

          updateActiveUsers();
        }
      )
      .subscribe((status) => {
        console.log('[SalaVirtual] Subscription status:', status);
      });

    channelRef.current = channel;

    return () => {
      console.log('[SalaVirtual] Unsubscribing from messages');
      supabase.removeChannel(channel);
    };
  }, [localId, user, userJoinedAnimation, updateActiveUsers]);

  useEffect(() => {
    if (!localId) {
      Alert.alert('Error', 'No se especificó el local');
      router.back();
      return;
    }

    console.log('[SalaVirtual] Initializing with localId:', localId);
    loadLocalData();
    loadMessages();
    const unsubscribe = subscribeToMessages();
    updateActiveUsers();

    const interval = setInterval(updateActiveUsers, 30000);

    return () => {
      clearInterval(interval);
      unsubscribe();
    };
  }, [localId, loadLocalData, loadMessages, subscribeToMessages, updateActiveUsers, router]);

  const sendMessage = async () => {
    if (!user) {
      Alert.alert('Error', 'Debes iniciar sesión para enviar mensajes');
      return;
    }

    if (!newMessage.trim()) {
      return;
    }

    if (!localId) {
      Alert.alert('Error', 'No se especificó el local');
      return;
    }

    try {
      setSending(true);
      console.log('[SalaVirtual] Sending message:', newMessage.trim());

      const { error } = await supabase
        .from('sala_virtual_interacciones')
        .insert({
          usuario_id: user.id,
          local_id: localId,
          tipo: 'mensaje',
          contenido: newMessage.trim(),
        });

      if (error) {
        console.error('[SalaVirtual] Error sending message:', error);
        Alert.alert('Error', 'No se pudo enviar el mensaje');
        return;
      }

      console.log('[SalaVirtual] Message sent successfully');
      setNewMessage('');
    } catch (error) {
      console.error('[SalaVirtual] Error:', error);
      Alert.alert('Error', 'Ocurrió un error al enviar el mensaje');
    } finally {
      setSending(false);
    }
  };

  const sendEmoticon = async (emoticon: string) => {
    if (!user) {
      Alert.alert('Error', 'Debes iniciar sesión para enviar reacciones');
      return;
    }

    if (!localId) {
      Alert.alert('Error', 'No se especificó el local');
      return;
    }

    try {
      console.log('[SalaVirtual] Sending emoticon:', emoticon);

      const { error } = await supabase
        .from('sala_virtual_interacciones')
        .insert({
          usuario_id: user.id,
          local_id: localId,
          tipo: 'emoticon',
          contenido: emoticon,
        });

      if (error) {
        console.error('[SalaVirtual] Error sending emoticon:', error);
        return;
      }

      console.log('[SalaVirtual] Emoticon sent successfully');
    } catch (error) {
      console.error('[SalaVirtual] Error:', error);
    }
  };

  const renderMessage = ({ item }: { item: InteractionMessage }) => {
    const isOwnMessage = user && item.usuario_id === user.id;

    return (
      <View
        style={[
          styles.messageContainer,
          isOwnMessage ? styles.ownMessage : styles.otherMessage,
        ]}
      >
        {!isOwnMessage && (
          <View style={styles.messageAvatar}>
            {item.usuario.avatar ? (
              <Image
                source={{ uri: item.usuario.avatar }}
                style={styles.messageAvatarImage}
              />
            ) : (
              <View style={styles.messageAvatarPlaceholder}>
                <IconSymbol
                  ios_icon_name="person.fill"
                  android_material_icon_name="person"
                  size={18}
                  color={colors.textSecondary}
                />
              </View>
            )}
          </View>
        )}
        <View
          style={[
            styles.messageBubble,
            isOwnMessage ? styles.ownMessageBubble : styles.otherMessageBubble,
          ]}
        >
          {!isOwnMessage && (
            <Text style={styles.messageSender}>
              {item.usuario.username ? `@${item.usuario.username}` : item.usuario.nombre}
            </Text>
          )}
          <Text
            style={[
              styles.messageText,
              isOwnMessage ? styles.ownMessageText : styles.otherMessageText,
            ]}
          >
            {item.contenido}
          </Text>
          <Text
            style={[
              styles.messageTime,
              isOwnMessage ? styles.ownMessageTime : styles.otherMessageTime,
            ]}
          >
            {new Date(item.created_at).toLocaleTimeString('es-ES', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Cargando sala virtual...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <Stack.Screen
        options={{
          title: local?.nombre || 'Sala Virtual',
          headerRight: () => (
            <View style={styles.headerRight}>
              <View style={styles.activeUsersIndicator}>
                <View style={styles.activeUsersDot} />
                <Text style={styles.activeUsersText}>{activeUsers.length}</Text>
              </View>
            </View>
          ),
        }}
      />

      <View style={styles.content}>
        {/* Active Users Bar */}
        {activeUsers.length > 0 && (
          <View style={styles.activeUsersBar}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.activeUsersScroll}
            >
              {activeUsers.map((activeUser) => (
                <View key={activeUser.id} style={styles.activeUserItem}>
                  {activeUser.avatar ? (
                    <Image
                      source={{ uri: activeUser.avatar }}
                      style={styles.activeUserAvatar}
                    />
                  ) : (
                    <View style={styles.activeUserAvatarPlaceholder}>
                      <IconSymbol
                        ios_icon_name="person.fill"
                        android_material_icon_name="person"
                        size={16}
                        color={colors.textSecondary}
                      />
                    </View>
                  )}
                  <View style={styles.activeUserOnlineDot} />
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* User Joined Animation */}
        <Animated.View
          style={[
            styles.userJoinedBanner,
            {
              opacity: userJoinedAnimation,
              transform: [
                {
                  translateY: userJoinedAnimation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-50, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <LinearGradient
            colors={[colors.primary, colors.secondary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.userJoinedGradient}
          >
            <IconSymbol
              ios_icon_name="person.badge.plus"
              android_material_icon_name="person_add"
              size={18}
              color="#fff"
            />
            <Text style={styles.userJoinedText}>Nuevo usuario en la sala</Text>
          </LinearGradient>
        </Animated.View>

        {/* Floating Emoticons */}
        {recentEmoticons.map((item, index) => (
          <Animated.Text
            key={`${item.userId}-${item.timestamp}`}
            style={[
              styles.floatingEmoticon,
              {
                right: 20 + (index * 30) % 100,
                opacity: userJoinedAnimation,
              },
            ]}
          >
            {item.emoji}
          </Animated.Text>
        ))}

        {/* Messages List */}
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messagesContent}
          onContentSizeChange={() => {
            flatListRef.current?.scrollToEnd({ animated: true });
          }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <LinearGradient
                colors={[colors.primary + '20', colors.secondary + '20']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.emptyIconCircle}
              >
                <IconSymbol
                  ios_icon_name="bubble.left.and.bubble.right"
                  android_material_icon_name="chat"
                  size={48}
                  color={colors.primary}
                />
              </LinearGradient>
              <Text style={styles.emptyText}>No hay mensajes todavía</Text>
              <Text style={styles.emptySubtext}>Sé el primero en enviar un mensaje</Text>
            </View>
          }
        />

        {/* Reactions Bar */}
        <View style={styles.reactionsContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.reactionsContent}
          >
            {['👋', '🎉', '❤️', '🔥', '👏', '😂', '🍻', '🎵', '💃', '🕺'].map((emoji) => (
              <TouchableOpacity
                key={emoji}
                style={styles.reactionButton}
                onPress={() => sendEmoticon(emoji)}
              >
                <Text style={styles.reactionEmoji}>{emoji}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Input Container */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Escribe un mensaje..."
            placeholderTextColor={colors.textSecondary}
            value={newMessage}
            onChangeText={setNewMessage}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!newMessage.trim() || sending) && styles.sendButtonDisabled,
            ]}
            onPress={sendMessage}
            disabled={!newMessage.trim() || sending}
          >
            <LinearGradient
              colors={
                !newMessage.trim() || sending
                  ? [colors.textSecondary, colors.textSecondary]
                  : [colors.primary, colors.secondary]
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.sendButtonGradient}
            >
              {sending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <IconSymbol
                  ios_icon_name="paperplane.fill"
                  android_material_icon_name="send"
                  size={20}
                  color="#fff"
                />
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: colors.textSecondary,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  activeUsersIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary + '20',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  activeUsersDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  activeUsersText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  content: {
    flex: 1,
  },
  activeUsersBar: {
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: 8,
  },
  activeUsersScroll: {
    paddingHorizontal: 12,
    gap: 8,
  },
  activeUserItem: {
    position: 'relative',
  },
  activeUserAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  activeUserAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.primary,
  },
  activeUserOnlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: colors.card,
  },
  userJoinedBanner: {
    position: 'absolute',
    top: 0,
    left: 16,
    right: 16,
    zIndex: 100,
    borderRadius: 12,
    overflow: 'hidden',
  },
  userJoinedGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  userJoinedText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  floatingEmoticon: {
    position: 'absolute',
    top: 100,
    fontSize: 32,
    zIndex: 99,
  },
  messagesContent: {
    padding: 16,
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginTop: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 6,
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-end',
  },
  ownMessage: {
    justifyContent: 'flex-end',
  },
  otherMessage: {
    justifyContent: 'flex-start',
  },
  messageAvatar: {
    marginRight: 8,
  },
  messageAvatarImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  messageAvatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageBubble: {
    maxWidth: '70%',
    padding: 12,
    borderRadius: 16,
  },
  ownMessageBubble: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: 4,
  },
  otherMessageBubble: {
    backgroundColor: colors.card,
    borderBottomLeftRadius: 4,
  },
  messageSender: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 4,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  ownMessageText: {
    color: '#fff',
  },
  otherMessageText: {
    color: colors.text,
  },
  messageTime: {
    fontSize: 10,
    marginTop: 4,
  },
  ownMessageTime: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  otherMessageTime: {
    color: colors.textSecondary,
  },
  reactionsContainer: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.card,
  },
  reactionsContent: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  reactionButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 4,
    borderRadius: 22,
    backgroundColor: colors.background,
  },
  reactionEmoji: {
    fontSize: 24,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.card,
    gap: 8,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    backgroundColor: colors.background,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.text,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendButtonGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
