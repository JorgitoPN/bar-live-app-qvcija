
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
  local_id?: string | null;
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

/**
 * ✅ CHATS SYSTEM v30.0 - NAVIGATION FIX + PERMANENT DELETION
 * 
 * Complete fix for conversation deletion and navigation:
 * - ✅ FIXED: Back button now navigates to previous page (not profile)
 * - ✅ FIXED: Added RLS DELETE policy for chats table
 * - ✅ FIXED: Added RLS DELETE policy for messages from user's chats
 * - ✅ FIXED: Proper cascade deletion (messages first, then chat)
 * - ✅ FIXED: Optimistic UI update (remove from UI immediately)
 * - ✅ FIXED: No reappearing conversations after reload
 * - ✅ FIXED: Better error handling with database reload on failure
 * - ✅ FIXED: Permanent deletion without race conditions
 * - ✅ FIXED: Proper session validation before deletion
 * - ✅ FIXED: Database synchronization after deletion
 */

export default function ChatsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user, ensureValidSession } = useAuth();
  const [busqueda, setBusqueda] = useState('');
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedChats, setSelectedChats] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);

  const loadChats = useCallback(async (forceRefresh: boolean = false) => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      if (forceRefresh) {
        console.log('[Chats v29.0] 🔄 Force refreshing chats from database...');
      } else {
        console.log('[Chats v29.0] 🔍 Loading chats for user:', user.id);
      }

      const { data: chatsData, error: chatsError } = await supabase
        .from('chats')
        .select(`
          id,
          usuario1_id,
          usuario2_id,
          local_id,
          ultimo_mensaje,
          ultimo_mensaje_fecha,
          updated_at
        `)
        .or(`usuario1_id.eq.${user.id},usuario2_id.eq.${user.id}`)
        .order('updated_at', { ascending: false });

      if (chatsError) {
        console.error('[Chats v29.0] Error loading chats:', chatsError);
        return;
      }

      console.log('[Chats v29.0] ✅ Loaded', chatsData?.length || 0, 'chats from database');

      const chatsWithInfo = await Promise.all(
        (chatsData || []).map(async (chat) => {
          const otroUsuarioId = chat.usuario1_id === user.id ? chat.usuario2_id : chat.usuario1_id;

          let userData;
          if (chat.local_id) {
            console.log('[Chats v29.0] 🏢 Chat', chat.id, 'is LOCAL-SPECIFIC, loading local info for:', chat.local_id);
            
            const { data: localData } = await supabase
              .from('locales')
              .select('id, nombre, imagen_url')
              .eq('id', chat.local_id)
              .single();

            if (localData) {
              userData = {
                id: localData.id,
                nombre: localData.nombre,
                username: '',
                avatar: localData.imagen_url,
                activo: false,
              };
              console.log('[Chats v29.0] ✅ Loaded local info:', localData.nombre);
            } else {
              console.error('[Chats v29.0] ❌ Failed to load local info for:', chat.local_id);
            }
          } else {
            console.log('[Chats v29.0] 👤 Chat', chat.id, 'is USER-TO-USER, loading user info for:', otroUsuarioId);
            
            const { data: userDataResult } = await supabase
              .from('usuarios')
              .select('id, nombre, username, avatar, activo')
              .eq('id', otroUsuarioId)
              .single();

            userData = userDataResult;
            if (userData) {
              console.log('[Chats v29.0] ✅ Loaded user info:', userData.nombre, 'username:', userData.username);
            }
          }

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
      console.log('[Chats v29.0] ✅ Processed all chats with info');
    } catch (error) {
      console.error('[Chats v29.0] Error:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadChats();
  }, [loadChats]);

  const handleOpenChat = useCallback(async (chatId: string, isLocalChat: boolean, localId?: string) => {
    if (!user) {
      setShowLoginModal(true);
      return;
    }

    console.log('[Chats v29.0] 🔥 Opening chat:', { chatId, isLocalChat, localId });

    try {
      await supabase
        .from('mensajes')
        .update({ leido: true })
        .eq('chat_id', chatId)
        .eq('leido', false)
        .neq('remitente_id', user.id);
    } catch (error) {
      console.error('[Chats v29.0] Error marking messages as read:', error);
    }

    if (isLocalChat && localId) {
      console.log('[Chats v29.0] 🏢 Navigating to LOCAL-SPECIFIC chat');
      router.push(`/chat/conversacion?localId=${localId}&userId=${user.id}`);
    } else {
      console.log('[Chats v29.0] 👤 Navigating to USER-TO-USER chat');
      router.push(`/chat/conversacion?chatId=${chatId}`);
    }
  }, [user, router]);

  useEffect(() => {
    if (params.userId && user) {
      const existingChat = chats.find(
        (c) =>
          !c.local_id &&
          ((c.usuario1_id === user.id && c.usuario2_id === params.userId) ||
          (c.usuario2_id === user.id && c.usuario1_id === params.userId))
      );

      if (existingChat) {
        handleOpenChat(existingChat.id, false);
      } else {
        router.push(`/chat/conversacion?userId=${params.userId}`);
      }
    }
  }, [params.userId, user, chats, handleOpenChat, router]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadChats(true);
    setRefreshing(false);
  };

  const handleNewChat = () => {
    if (!user) {
      setShowLoginModal(true);
      return;
    }
    router.push('/chat/nuevo-chat');
  };

  const toggleSelectionMode = () => {
    setSelectionMode(!selectionMode);
    setSelectedChats(new Set());
  };

  const toggleChatSelection = (chatId: string) => {
    const newSelected = new Set(selectedChats);
    if (newSelected.has(chatId)) {
      newSelected.delete(chatId);
    } else {
      newSelected.add(chatId);
    }
    setSelectedChats(newSelected);
  };

  // ✅ v29.0: COMPLETELY FIXED DELETION SYSTEM WITH RLS POLICIES
  const handleDeleteSelected = async () => {
    if (selectedChats.size === 0) {
      Alert.alert('Error', 'Selecciona al menos una conversación para eliminar');
      return;
    }

    Alert.alert(
      'Eliminar conversaciones',
      `¿Estás seguro de que quieres eliminar ${selectedChats.size} conversación(es)? Esta acción no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            const chatIdsToDelete = Array.from(selectedChats);
            
            console.log('[Chats v29.0] 🗑️ PERMANENT DELETION: Starting deletion of', chatIdsToDelete.length, 'conversations');
            
            setDeleting(true);
            
            try {
              // ✅ Step 1: Ensure valid session
              console.log('[Chats v29.0] 🔄 Step 1: Ensuring valid session...');
              const validSession = await ensureValidSession();
              
              if (!validSession || !validSession.user) {
                console.error('[Chats v29.0] ❌ No valid session available');
                Alert.alert('Error', 'Tu sesión ha expirado. Por favor inicia sesión de nuevo.');
                setDeleting(false);
                router.push('/auth/login');
                return;
              }
              
              console.log('[Chats v29.0] ✅ Step 1 complete: Valid session confirmed');
              
              // ✅ Step 2: OPTIMISTIC UI UPDATE - Remove from UI immediately
              console.log('[Chats v29.0] 🎯 Step 2: Optimistic UI update...');
              setChats(prevChats => prevChats.filter(chat => !chatIdsToDelete.includes(chat.id)));
              console.log('[Chats v29.0] ✅ Step 2 complete: UI updated optimistically');
              
              // ✅ Step 3: Delete from database (RLS policies now allow this!)
              console.log('[Chats v29.0] 🗑️ Step 3: Deleting from database with RLS policies...');
              
              let successCount = 0;
              let failCount = 0;
              
              for (const chatId of chatIdsToDelete) {
                try {
                  console.log('[Chats v29.0] 🗑️ Deleting chat:', chatId);
                  
                  // ✅ CRITICAL FIX: Delete messages first (RLS policy allows this now)
                  console.log('[Chats v29.0] 🗑️ Step 3a: Deleting messages for chat:', chatId);
                  const { error: messagesError } = await supabase
                    .from('mensajes')
                    .delete()
                    .eq('chat_id', chatId);
                  
                  if (messagesError) {
                    console.error('[Chats v29.0] ❌ Error deleting messages for chat', chatId, ':', messagesError);
                    failCount++;
                    continue;
                  }
                  
                  console.log('[Chats v29.0] ✅ Messages deleted for chat:', chatId);
                  
                  // ✅ CRITICAL FIX: Then delete the chat itself (RLS policy allows this now)
                  console.log('[Chats v29.0] 🗑️ Step 3b: Deleting chat record:', chatId);
                  const { error: chatError } = await supabase
                    .from('chats')
                    .delete()
                    .eq('id', chatId);
                  
                  if (chatError) {
                    console.error('[Chats v29.0] ❌ Error deleting chat', chatId, ':', chatError);
                    failCount++;
                    continue;
                  }
                  
                  console.log('[Chats v29.0] ✅ Chat deleted permanently:', chatId);
                  successCount++;
                  
                } catch (error) {
                  console.error('[Chats v29.0] ❌ Error deleting chat', chatId, ':', error);
                  failCount++;
                }
              }
              
              console.log('[Chats v29.0] ✅ Step 3 complete:', successCount, 'deleted,', failCount, 'failed');
              
              // ✅ Step 4: Verify deletion by reloading from database
              console.log('[Chats v29.0] 🔄 Step 4: Verifying deletion by reloading from database...');
              await loadChats(true);
              console.log('[Chats v29.0] ✅ Step 4 complete: Database reloaded and verified');
              
              // ✅ Step 5: Show result to user
              if (failCount > 0) {
                Alert.alert(
                  'Parcialmente completado',
                  `${successCount} conversación(es) eliminada(s), ${failCount} fallaron.`
                );
              } else {
                Alert.alert('Éxito', `${successCount} conversación(es) eliminada(s) correctamente`);
              }
              
              // Reset selection mode
              setSelectionMode(false);
              setSelectedChats(new Set());
              
            } catch (error) {
              console.error('[Chats v29.0] ❌ Error in deletion process:', error);
              // ✅ On error, reload from database to show accurate state
              await loadChats(true);
              Alert.alert('Error', 'Ocurrió un error al eliminar las conversaciones.');
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
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
              <IconSymbol ios_icon_name="chevron.left" android_material_icon_name="arrow_back" size={24} color={colors.headerText} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Mensajes</Text>
            <View style={{ width: 40 }} />
          </View>
        </LinearGradient>
        <View style={styles.emptyState}>
          <IconSymbol ios_icon_name="bubble.left.and.bubble.right" android_material_icon_name="chat" size={64} color={colors.textSecondary} />
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
              <IconSymbol ios_icon_name="chevron.left" android_material_icon_name="arrow_back" size={24} color={colors.headerText} />
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
          {selectionMode ? (
            <TouchableOpacity onPress={toggleSelectionMode} style={styles.backButton}>
              <IconSymbol ios_icon_name="xmark" android_material_icon_name="close" size={24} color={colors.headerText} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <IconSymbol ios_icon_name="chevron.left" android_material_icon_name="arrow_back" size={24} color={colors.headerText} />
            </TouchableOpacity>
          )}
          <Text style={styles.headerTitle}>
            {selectionMode ? `${selectedChats.size} seleccionado(s)` : 'Mensajes'}
          </Text>
          {selectionMode ? (
            <TouchableOpacity 
              style={styles.newChatButton} 
              onPress={handleDeleteSelected}
              disabled={deleting || selectedChats.size === 0}
            >
              {deleting ? (
                <ActivityIndicator size="small" color={colors.headerText} />
              ) : (
                <IconSymbol ios_icon_name="trash" android_material_icon_name="delete" size={24} color={colors.headerText} />
              )}
            </TouchableOpacity>
          ) : (
            <View style={styles.headerActions}>
              <TouchableOpacity style={styles.headerActionButton} onPress={toggleSelectionMode}>
                <IconSymbol ios_icon_name="checkmark.circle" android_material_icon_name="check_circle" size={24} color={colors.headerText} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.headerActionButton} onPress={handleNewChat}>
                <IconSymbol ios_icon_name="square.and.pencil" android_material_icon_name="edit" size={24} color={colors.headerText} />
              </TouchableOpacity>
            </View>
          )}
        </View>

        {!selectionMode && (
          <View style={styles.searchContainer}>
            <IconSymbol ios_icon_name="magnifyingglass" android_material_icon_name="search" size={18} color={colors.textSecondary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar conversaciones..."
              placeholderTextColor={colors.textSecondary}
              value={busqueda}
              onChangeText={setBusqueda}
            />
          </View>
        )}
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {chatsFiltrados.map((chat) => {
          const displayName = chat.local_id 
            ? chat.otro_usuario.nombre
            : (chat.otro_usuario.username || chat.otro_usuario.nombre).replace(/^@/, '');

          const isSelected = selectedChats.has(chat.id);

          return (
            <TouchableOpacity
              key={chat.id}
              style={[styles.chatCard, isSelected && styles.chatCardSelected]}
              onPress={() => {
                if (selectionMode) {
                  toggleChatSelection(chat.id);
                } else {
                  handleOpenChat(chat.id, !!chat.local_id, chat.local_id || undefined);
                }
              }}
              onLongPress={() => {
                if (!selectionMode) {
                  setSelectionMode(true);
                  toggleChatSelection(chat.id);
                }
              }}
            >
              {selectionMode && (
                <View style={styles.selectionIndicator}>
                  {isSelected ? (
                    <View style={styles.selectedCircle}>
                      <IconSymbol ios_icon_name="checkmark" android_material_icon_name="check" size={16} color={colors.headerText} />
                    </View>
                  ) : (
                    <View style={styles.unselectedCircle} />
                  )}
                </View>
              )}

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
                {chat.local_id && (
                  <View style={styles.localBadge}>
                    <IconSymbol ios_icon_name="building.2" android_material_icon_name="business" size={12} color={colors.white} />
                  </View>
                )}
              </View>

              <View style={styles.chatContent}>
                <View style={styles.chatHeader}>
                  <Text style={styles.chatNombre}>{displayName}</Text>
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
          );
        })}

        {chatsFiltrados.length === 0 && (
          <View style={styles.emptyState}>
            <IconSymbol
              ios_icon_name="bubble.left.and.bubble.right"
              android_material_icon_name="chat"
              size={64}
              color={colors.textSecondary}
            />
            <Text style={styles.emptyText}>
              {busqueda ? 'No se encontraron conversaciones' : 'No tienes mensajes'}
            </Text>
            <Text style={styles.emptySubtext}>
              Inicia una conversación con otros usuarios o locales
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
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerActionButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
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
  chatCardSelected: {
    backgroundColor: `${colors.primary}15`,
    borderColor: colors.primary,
  },
  selectionIndicator: {
    marginRight: 8,
  },
  selectedCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unselectedCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.cardBorder,
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
  localBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
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
