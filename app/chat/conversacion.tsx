
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Image,
  Platform,
  KeyboardAvoidingView,
  FlatList,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/contexts/AuthContext';
import MessageBubble from '@/components/chat/MessageBubble';
import { cleanupExpiredStoryImages } from '@/utils/storyMessageCleanup';

interface Message {
  id: string;
  chat_id: string;
  remitente_id: string;
  contenido: string;
  tipo_mensaje: 'texto' | 'post_compartido' | 'imagen' | 'historia';
  post_compartido_id?: string;
  historia_id?: string;
  historia_imagen?: string;
  post_imagen?: string;
  leido: boolean;
  created_at: string;
}

export default function ConversacionScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user } = useAuth();
  const flatListRef = useRef<FlatList>(null);

  const [loading, setLoading] = useState(true);
  const [chatId, setChatId] = useState<string | null>(null);
  const [otroUsuario, setOtroUsuario] = useState<any>(null);
  const [mensajes, setMensajes] = useState<Message[]>([]);
  const [mensaje, setMensaje] = useState('');
  const [enviando, setEnviando] = useState(false);

  // Real-time subscription ref
  const channelRef = useRef<any>(null);

  const loadMessages = useCallback(async (chatIdToLoad: string) => {
    try {
      // Clean up expired story images before loading
      await cleanupExpiredStoryImages();

      const { data, error } = await supabase
        .from('mensajes')
        .select('*')
        .eq('chat_id', chatIdToLoad)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('[Conversacion] Error loading messages:', error);
        return;
      }

      setMensajes(data || []);

      // Mark messages as read
      if (user) {
        await supabase
          .from('mensajes')
          .update({ leido: true })
          .eq('chat_id', chatIdToLoad)
          .neq('remitente_id', user.id)
          .eq('leido', false);
      }

      // Scroll to bottom
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      console.error('[Conversacion] Error:', error);
    }
  }, [user]);

  const loadOrCreateChat = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);

      if (params.chatId) {
        // Load existing chat
        const { data: chatData, error: chatError } = await supabase
          .from('chats')
          .select('*')
          .eq('id', params.chatId)
          .single();

        if (chatError) {
          console.error('[Conversacion] Error loading chat:', chatError);
          Alert.alert('Error', 'No se pudo cargar la conversación');
          router.back();
          return;
        }

        setChatId(chatData.id);

        // Get other user
        const otroUsuarioId =
          chatData.usuario1_id === user.id ? chatData.usuario2_id : chatData.usuario1_id;

        const { data: userData } = await supabase
          .from('usuarios')
          .select('id, nombre, username, avatar, activo')
          .eq('id', otroUsuarioId)
          .single();

        setOtroUsuario(userData);

        // Load messages
        await loadMessages(chatData.id);
      } else if (params.userId) {
        // Check if chat exists
        const { data: existingChat } = await supabase
          .from('chats')
          .select('*')
          .or(
            `and(usuario1_id.eq.${user.id},usuario2_id.eq.${params.userId}),and(usuario1_id.eq.${params.userId},usuario2_id.eq.${user.id})`
          )
          .single();

        if (existingChat) {
          setChatId(existingChat.id);
          await loadMessages(existingChat.id);
        } else {
          // Create new chat - IMPORTANT: Ensure usuario1_id < usuario2_id to satisfy constraint
          const userId1 = user.id < (params.userId as string) ? user.id : (params.userId as string);
          const userId2 = user.id < (params.userId as string) ? (params.userId as string) : user.id;

          console.log('[Conversacion] Creating new chat with ordered IDs:', { userId1, userId2 });

          const { data: newChat, error: createError } = await supabase
            .from('chats')
            .insert({
              usuario1_id: userId1,
              usuario2_id: userId2,
              ultimo_mensaje: '',
              ultimo_mensaje_fecha: new Date().toISOString(),
            })
            .select('*')
            .single();

          if (createError) {
            console.error('[Conversacion] Error creating chat:', createError);
            Alert.alert('Error', 'No se pudo crear la conversación');
            router.back();
            return;
          }

          setChatId(newChat.id);
        }

        // Get other user
        const { data: userData } = await supabase
          .from('usuarios')
          .select('id, nombre, username, avatar, activo')
          .eq('id', params.userId)
          .single();

        setOtroUsuario(userData);
      }
    } catch (error) {
      console.error('[Conversacion] Error:', error);
      Alert.alert('Error', 'Ocurrió un error al cargar la conversación');
    } finally {
      setLoading(false);
    }
  }, [user, params.chatId, params.userId, loadMessages, router]);

  useEffect(() => {
    loadOrCreateChat();
  }, [loadOrCreateChat]);

  // Subscribe to new messages with INSTANT updates
  useEffect(() => {
    if (!chatId || !user) return;

    console.log('[Conversacion] ⚡ Setting up real-time subscription for chat:', chatId);

    // Clean up previous subscription
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase
      .channel(`chat:${chatId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'mensajes',
          filter: `chat_id=eq.${chatId}`,
        },
        (payload) => {
          console.log('[Conversacion] ⚡ INSTANT new message received:', payload.new);
          
          const newMessage = payload.new as Message;
          
          // Add message INSTANTLY to UI
          setMensajes((prev) => {
            // Prevent duplicates
            if (prev.some(m => m.id === newMessage.id)) {
              return prev;
            }
            return [...prev, newMessage];
          });
          
          // Mark as read if not from current user
          if (newMessage.remitente_id !== user.id) {
            supabase
              .from('mensajes')
              .update({ leido: true })
              .eq('id', newMessage.id)
              .then(() => console.log('[Conversacion] Message marked as read'));
          }

          // Auto-scroll to bottom
          setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: true });
          }, 50);
        }
      )
      .subscribe((status) => {
        console.log('[Conversacion] Subscription status:', status);
      });

    channelRef.current = channel;

    return () => {
      console.log('[Conversacion] Cleaning up subscription');
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [chatId, user]);

  const enviarMensaje = async () => {
    if (!user || !chatId || !mensaje.trim() || enviando) return;

    const mensajeTexto = mensaje.trim();
    const tempId = `temp-${Date.now()}`;
    
    // OPTIMISTIC UI UPDATE - Show message INSTANTLY
    const optimisticMessage: Message = {
      id: tempId,
      chat_id: chatId,
      remitente_id: user.id,
      contenido: mensajeTexto,
      tipo_mensaje: 'texto',
      leido: false,
      created_at: new Date().toISOString(),
    };

    setMensajes((prev) => [...prev, optimisticMessage]);
    setMensaje('');
    setEnviando(true);

    // Scroll to bottom immediately
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 50);

    try {
      const { data: insertedMessage, error } = await supabase
        .from('mensajes')
        .insert({
          chat_id: chatId,
          remitente_id: user.id,
          contenido: mensajeTexto,
          tipo_mensaje: 'texto',
          leido: false,
        })
        .select()
        .single();

      if (error) {
        console.error('[Conversacion] Error sending message:', error);
        
        // Remove optimistic message on error
        setMensajes((prev) => prev.filter(m => m.id !== tempId));
        setMensaje(mensajeTexto); // Restore message text
        
        Alert.alert('Error', 'No se pudo enviar el mensaje');
        return;
      }

      // Replace optimistic message with real one
      setMensajes((prev) => 
        prev.map(m => m.id === tempId ? insertedMessage : m)
      );

      // Update chat
      await supabase
        .from('chats')
        .update({
          ultimo_mensaje: mensajeTexto,
          ultimo_mensaje_fecha: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', chatId);

      // Send notification
      if (otroUsuario) {
        await supabase.from('notificaciones').insert({
          usuario_id: otroUsuario.id,
          tipo: 'mensaje_privado',
          titulo: 'Nuevo mensaje',
          mensaje: `${user.nombre} te envió un mensaje`,
          usuario_origen_id: user.id,
        });
      }

      console.log('[Conversacion] ✅ Message sent successfully');
    } catch (error) {
      console.error('[Conversacion] Error:', error);
      
      // Remove optimistic message on error
      setMensajes((prev) => prev.filter(m => m.id !== tempId));
      setMensaje(mensajeTexto);
      
      Alert.alert('Error', 'Ocurrió un error al enviar el mensaje');
    } finally {
      setEnviando(false);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!user) return;

    const message = mensajes.find(m => m.id === messageId);
    if (!message || message.remitente_id !== user.id) {
      Alert.alert('Error', 'Solo puedes eliminar tus propios mensajes');
      return;
    }

    Alert.alert(
      'Eliminar mensaje',
      '¿Estás seguro de que quieres eliminar este mensaje?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              // Optimistic UI update
              setMensajes((prev) => prev.filter(m => m.id !== messageId));

              const { error } = await supabase
                .from('mensajes')
                .delete()
                .eq('id', messageId);

              if (error) {
                console.error('[Conversacion] Error deleting message:', error);
                // Reload messages on error
                if (chatId) loadMessages(chatId);
                Alert.alert('Error', 'No se pudo eliminar el mensaje');
              }
            } catch (error) {
              console.error('[Conversacion] Error:', error);
              if (chatId) loadMessages(chatId);
            }
          },
        },
      ]
    );
  };

  const handleDeleteConversation = async () => {
    if (!user || !chatId) return;

    Alert.alert(
      'Eliminar conversación',
      '¿Estás seguro de que quieres eliminar toda esta conversación? Esta acción no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              // Delete all messages first
              await supabase
                .from('mensajes')
                .delete()
                .eq('chat_id', chatId);

              // Delete chat
              await supabase
                .from('chats')
                .delete()
                .eq('id', chatId);

              Alert.alert('Éxito', 'Conversación eliminada', [
                { text: 'OK', onPress: () => router.back() }
              ]);
            } catch (error) {
              console.error('[Conversacion] Error deleting conversation:', error);
              Alert.alert('Error', 'No se pudo eliminar la conversación');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={[colors.headerGradientStart, colors.headerGradientEnd]}
          style={styles.header}
        >
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <IconSymbol name="chevron.left" size={24} color={colors.headerText} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Cargando...</Text>
          <View style={{ width: 40 }} />
        </LinearGradient>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.headerGradientStart, colors.headerGradientEnd]}
        style={styles.header}
      >
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <IconSymbol name="chevron.left" size={24} color={colors.headerText} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.headerCenter}
          onPress={() => {
            if (otroUsuario) {
              router.push(`/perfil/usuario?userId=${otroUsuario.id}`);
            }
          }}
        >
          {otroUsuario?.avatar ? (
            <Image source={{ uri: otroUsuario.avatar }} style={styles.headerAvatar} />
          ) : (
            <View style={[styles.headerAvatar, styles.avatarPlaceholder]}>
              <Text style={styles.avatarText}>
                {otroUsuario?.nombre?.charAt(0).toUpperCase() || 'U'}
              </Text>
            </View>
          )}
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle}>{otroUsuario?.nombre || 'Usuario'}</Text>
            {otroUsuario?.activo && <Text style={styles.headerStatus}>Activo ahora</Text>}
          </View>
        </TouchableOpacity>
        <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteConversation}>
          <IconSymbol name="trash" size={22} color={colors.headerText} />
        </TouchableOpacity>
      </LinearGradient>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <FlatList
          ref={flatListRef}
          data={mensajes}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messagesList}
          renderItem={({ item }) => (
            <MessageBubble
              message={item}
              isOwn={item.remitente_id === user?.id}
              otroUsuario={otroUsuario}
              onLongPress={() => handleDeleteMessage(item.id)}
            />
          )}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <IconSymbol name="bubble.left.and.bubble.right" size={64} color={colors.textSecondary} />
              <Text style={styles.emptyText}>No hay mensajes aún</Text>
              <Text style={styles.emptySubtext}>Envía un mensaje para iniciar la conversación</Text>
            </View>
          }
        />

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Escribe un mensaje..."
            placeholderTextColor={colors.textSecondary}
            value={mensaje}
            onChangeText={setMensaje}
            multiline
            maxLength={1000}
            editable={!enviando}
          />
          <TouchableOpacity
            style={[styles.sendButton, (!mensaje.trim() || enviando) && styles.sendButtonDisabled]}
            onPress={enviarMensaje}
            disabled={!mensaje.trim() || enviando}
          >
            {enviando ? (
              <ActivityIndicator size="small" color={colors.headerText} />
            ) : (
              <IconSymbol name="paperplane.fill" size={20} color={colors.headerText} />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
    paddingBottom: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 8,
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  avatarPlaceholder: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.headerText,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.headerText,
  },
  headerStatus: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  deleteButton: {
    padding: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messagesList: {
    padding: 16,
    paddingBottom: 8,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    gap: 12,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
    backgroundColor: colors.cardBackground,
    gap: 12,
  },
  input: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    color: colors.text,
    maxHeight: 100,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});
