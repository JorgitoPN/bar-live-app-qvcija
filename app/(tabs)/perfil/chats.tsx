
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Image,
  Platform,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { colors, commonStyles } from '@/styles/commonStyles';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/contexts/AuthContext';
import LoginRequiredModal from '@/components/common/LoginRequiredModal';

interface Chat {
  id: string;
  usuario1_id: string;
  usuario2_id: string;
  ultimo_mensaje: string;
  ultimo_mensaje_fecha: string;
  updated_at: string;
  otro_usuario: {
    id: string;
    nombre: string;
    username?: string;
    avatar?: string;
    activo: boolean;
  };
  mensajes_no_leidos: number;
}

export default function ChatsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user } = useAuth();
  const [busqueda, setBusqueda] = useState('');
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);

  const loadChats = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      // Get all chats where user is participant
      const { data: chatsData, error: chatsError } = await supabase
        .from('chats')
        .select(`
          id,
          usuario1_id,
          usuario2_id,
          ultimo_mensaje,
          ultimo_mensaje_fecha,
          updated_at
        `)
        .or(`usuario1_id.eq.${user.id},usuario2_id.eq.${user.id}`)
        .order('updated_at', { ascending: false });

      if (chatsError) {
        console.error('[Chats] Error loading chats:', chatsError);
        return;
      }

      // Get other user info and unread count for each chat
      const chatsWithInfo = await Promise.all(
        (chatsData || []).map(async (chat) => {
          const otroUsuarioId = chat.usuario1_id === user.id ? chat.usuario2_id : chat.usuario1_id;

          // Get other user info
          const { data: userData } = await supabase
            .from('usuarios')
            .select('id, nombre, username, avatar, activo')
            .eq('id', otroUsuarioId)
            .single();

          // Count unread messages
          const { count } = await supabase
            .from('mensajes')
            .select('id', { count: 'exact', head: true })
            .eq('chat_id', chat.id)
            .eq('leido', false)
            .neq('remitente_id', user.id);

          return {
            ...chat,
            otro_usuario: userData || {
              id: otroUsuarioId,
              nombre: 'Usuario',
              username: '',
              avatar: '',
              activo: false,
            },
            mensajes_no_leidos: count || 0,
          };
        })
      );

      setChats(chatsWithInfo);
    } catch (error) {
      console.error('[Chats] Error:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadChats();
  }, [loadChats]);

  // Handle navigation from notification or other screens
  const handleOpenChat = useCallback(async (otroUsuarioId: string) => {
    if (!user) {
      setShowLoginModal(true);
      return;
    }

    // Find existing chat
    const existingChat = chats.find(
      (c) =>
        (c.usuario1_id === user.id && c.usuario2_id === otroUsuarioId) ||
        (c.usuario2_id === user.id && c.usuario1_id === otroUsuarioId)
    );

    if (existingChat) {
      router.push(`/chat/conversacion?chatId=${existingChat.id}`);
    } else {
      // Create new chat
      router.push(`/chat/conversacion?userId=${otroUsuarioId}`);
    }
  }, [user, chats, router]);

  useEffect(() => {
    if (params.userId && user) {
      // Navigate to chat with specific user
      handleOpenChat(params.userId as string);
    }
  }, [params.userId, user, handleOpenChat]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadChats();
    setRefreshing(false);
  };

  const handleNewChat = () => {
    if (!user) {
      setShowLoginModal(true);
      return;
    }
    router.push('/chat/nuevo-chat');
  };

  const formatHora = (fecha: string): string => {
    const now = new Date();
    const messageDate = new Date(fecha);
    const diffMs = now.getTime() - messageDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Ahora';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return messageDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  };

  const chatsFiltrados = chats.filter((chat) =>
    chat.otro_usuario.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    chat.otro_usuario.username?.toLowerCase().includes(busqueda.toLowerCase())
  );

  if (!user) {
    return (
      <View style={commonStyles.container}>
        <LinearGradient
          colors={[colors.headerGradientStart, colors.headerGradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.header}
        >
          <View style={styles.headerTop}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <IconSymbol name="chevron.left" size={24} color={colors.headerText} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Mensajes</Text>
            <View style={{ width: 40 }} />
          </View>
        </LinearGradient>
        <View style={styles.emptyState}>
          <IconSymbol name="bubble.left.and.bubble.right" size={64} color={colors.textSecondary} />
          <Text style={styles.emptyText}>Inicia sesión para ver tus mensajes</Text>
          <TouchableOpacity
            style={styles.loginButton}
            onPress={() => router.push('/auth/login-popup')}
          >
            <Text style={styles.loginButtonText}>Iniciar Sesión</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={commonStyles.container}>
        <LinearGradient
          colors={[colors.headerGradientStart, colors.headerGradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.header}
        >
          <View style={styles.headerTop}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <IconSymbol name="chevron.left" size={24} color={colors.headerText} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Mensajes</Text>
            <View style={{ width: 40 }} />
          </View>
        </LinearGradient>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={commonStyles.container}>
      <LinearGradient
        colors={[colors.headerGradientStart, colors.headerGradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <IconSymbol name="chevron.left" size={24} color={colors.headerText} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Mensajes</Text>
          <TouchableOpacity style={styles.newChatButton} onPress={handleNewChat}>
            <IconSymbol name="square.and.pencil" size={24} color={colors.headerText} />
          </TouchableOpacity>
        </View>

        <View style={styles.searchContainer}>
          <IconSymbol name="magnifyingglass" size={18} color={colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar conversaciones..."
            placeholderTextColor={colors.textSecondary}
            value={busqueda}
            onChangeText={setBusqueda}
          />
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {chatsFiltrados.map((chat) => (
          <TouchableOpacity
            key={chat.id}
            style={styles.chatCard}
            onPress={() => router.push(`/chat/conversacion?chatId=${chat.id}`)}
          >
            <View style={styles.avatarContainer}>
              {chat.otro_usuario.avatar ? (
                <Image source={{ uri: chat.otro_usuario.avatar }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarPlaceholder]}>
                  <Text style={styles.avatarText}>
                    {chat.otro_usuario.nombre.charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
              {chat.otro_usuario.activo && <View style={styles.onlineIndicator} />}
            </View>

            <View style={styles.chatContent}>
              <View style={styles.chatHeader}>
                <Text style={styles.chatNombre}>{chat.otro_usuario.nombre}</Text>
                <Text style={styles.chatHora}>{formatHora(chat.ultimo_mensaje_fecha)}</Text>
              </View>
              <View style={styles.chatFooter}>
                <Text
                  style={[
                    styles.chatUltimoMensaje,
                    chat.mensajes_no_leidos > 0 && styles.chatUltimoMensajeNoLeido,
                  ]}
                  numberOfLines={1}
                >
                  {chat.ultimo_mensaje || 'Nuevo chat'}
                </Text>
                {chat.mensajes_no_leidos > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{chat.mensajes_no_leidos}</Text>
                  </View>
                )}
              </View>
            </View>
          </TouchableOpacity>
        ))}

        {chatsFiltrados.length === 0 && (
          <View style={styles.emptyState}>
            <IconSymbol
              name="bubble.left.and.bubble.right"
              size={64}
              color={colors.textSecondary}
            />
            <Text style={styles.emptyText}>
              {busqueda ? 'No se encontraron conversaciones' : 'No tienes mensajes'}
            </Text>
            <Text style={styles.emptySubtext}>
              Inicia una conversación con otros usuarios
            </Text>
          </View>
        )}
      </ScrollView>

      <LoginRequiredModal
        visible={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        message="Inicia sesión para enviar mensajes privados"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 50,
    paddingBottom: 20,
    paddingHorizontal: 16,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.headerText,
    flex: 1,
    textAlign: 'center',
  },
  newChatButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  chatCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 12,
    marginBottom: 12,
    gap: 12,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.cardBorder,
  },
  avatarPlaceholder: {
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.headerText,
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#34C759',
    borderWidth: 2,
    borderColor: colors.cardBackground,
  },
  chatContent: {
    flex: 1,
    gap: 6,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chatNombre: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  chatHora: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  chatFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chatUltimoMensaje: {
    flex: 1,
    fontSize: 14,
    color: colors.textSecondary,
  },
  chatUltimoMensajeNoLeido: {
    fontWeight: '600',
    color: colors.text,
  },
  badge: {
    backgroundColor: colors.badgeNuevo,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    color: colors.badgeNuevoText,
    fontSize: 12,
    fontWeight: 'bold',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    gap: 16,
  },
  emptyText: {
    fontSize: 18,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 24,
    marginTop: 16,
  },
  loginButtonText: {
    color: colors.headerText,
    fontSize: 16,
    fontWeight: '600',
  },
});
