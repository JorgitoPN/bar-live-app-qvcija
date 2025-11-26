
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  FlatList,
  Animated,
  Dimensions,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { LinearGradient } from 'expo-linear-gradient';
import { getEstadoLocal } from '@/utils/timeUtils';
import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

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
  reactions?: MessageReaction[];
}

interface MessageReaction {
  id: string;
  mensaje_id: string;
  usuario_id: string;
  emoticon: string;
  created_at: string;
}

interface Local {
  id: string;
  nombre: string;
  imagen_url?: string;
  descripcion?: string;
  abierto?: boolean;
  horarios_completos?: Record<string, string[]>;
  google_business_status?: string;
  estado_actual?: string;
}

interface ActiveUser {
  id: string;
  nombre: string;
  username?: string;
  avatar?: string;
  last_activity: string;
  checked_in_at?: string;
}

interface DirectMessage {
  id: string;
  sender_id: string;
  recipient_id: string;
  tipo: 'mensaje' | 'emoticon';
  contenido: string;
  created_at: string;
  sender: {
    id: string;
    nombre: string;
    username?: string;
    avatar?: string;
  };
}

const EMOTICONS = ['❤️', '🔥', '😎', '😄', '👏', '🍹', '🎶', '😍', '🤝'];

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
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);
  
  // Tab state - Users tab first as requested
  const [activeTab, setActiveTab] = useState<'users' | 'chat'>('users');
  
  // Direct messages state
  const [directMessages, setDirectMessages] = useState<DirectMessage[]>([]);
  const [selectedUser, setSelectedUser] = useState<ActiveUser | null>(null);
  const [showDirectMessageModal, setShowDirectMessageModal] = useState(false);
  const [directMessageText, setDirectMessageText] = useState('');
  
  // Sound control
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [notificationSound, setNotificationSound] = useState<Audio.Sound | null>(null);
  
  // Animation states
  const [floatingEmoticons, setFloatingEmoticons] = useState<{ emoji: string; id: string; x: number; y: number }[]>([]);
  const [notifications, setNotifications] = useState<{ id: string; message: string; type: 'dm' | 'emoticon' }[]>([]);
  
  const flatListRef = useRef<FlatList>(null);
  const channelRef = useRef<any>(null);
  const localId = params.localId as string;

  // Load sound settings
  useEffect(() => {
    loadSoundSettings();
    loadNotificationSound();
    
    return () => {
      if (notificationSound) {
        notificationSound.unloadAsync();
      }
    };
  }, []);

  const loadSoundSettings = async () => {
    try {
      const saved = await AsyncStorage.getItem('virtualRoomSoundEnabled');
      if (saved !== null) {
        setSoundEnabled(JSON.parse(saved));
      }
    } catch (error) {
      console.error('[SalaVirtual] Error loading sound settings:', error);
    }
  };

  const toggleSound = async () => {
    try {
      const newValue = !soundEnabled;
      setSoundEnabled(newValue);
      await AsyncStorage.setItem('virtualRoomSoundEnabled', JSON.stringify(newValue));
      Alert.alert(
        'Sonido',
        newValue ? 'Sonidos activados' : 'Sonidos desactivados'
      );
    } catch (error) {
      console.error('[SalaVirtual] Error toggling sound:', error);
    }
  };

  const loadNotificationSound = async () => {
    try {
      const { sound } = await Audio.Sound.createAsync(
        { uri: 'https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3' },
        { shouldPlay: false }
      );
      setNotificationSound(sound);
    } catch (error) {
      console.error('[SalaVirtual] Error loading notification sound:', error);
    }
  };

  const playNotificationSound = async () => {
    if (soundEnabled && notificationSound) {
      try {
        await notificationSound.replayAsync();
      } catch (error) {
        console.error('[SalaVirtual] Error playing sound:', error);
      }
    }
  };

  // Load local data
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
        .select('id, nombre, imagen_url, descripcion, abierto, horarios_completos, google_business_status, estado_actual')
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
      
      const estadoLocal = getEstadoLocal(data);
      const isOpen = estadoLocal.estaAbierto === true;
      
      console.log('[SalaVirtual] Estado del local:', estadoLocal);
      
      if (!isOpen) {
        Alert.alert(
          'Local Cerrado',
          `Este local está cerrado actualmente (${estadoLocal.badge}). No puedes acceder a la sala virtual.`,
          [{ text: 'OK', onPress: () => router.back() }]
        );
      }
    } catch (error) {
      console.error('[SalaVirtual] Error:', error);
    }
  }, [localId, router]);

  // Check if user is checked in
  const checkUserCheckin = useCallback(async () => {
    if (!user || !localId) {
      console.log('[SalaVirtual] No user or localId');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('sala_virtual_checkins')
        .select('*')
        .eq('usuario_id', user.id)
        .eq('local_id', localId)
        .eq('activo', true)
        .maybeSingle();

      if (error) {
        console.error('[SalaVirtual] Error checking checkin:', error);
        return;
      }

      setIsCheckedIn(!!data);
      console.log('[SalaVirtual] User checked in:', !!data);
    } catch (error) {
      console.error('[SalaVirtual] Error:', error);
    }
  }, [user, localId]);

  // Handle check-in
  const handleCheckIn = async () => {
    if (!user || !localId) {
      Alert.alert('Error', 'Debes iniciar sesión para entrar en la sala');
      return;
    }

    if (local) {
      const estadoLocal = getEstadoLocal(local);
      const isOpen = estadoLocal.estaAbierto === true;
      
      if (!isOpen) {
        Alert.alert(
          'Local Cerrado',
          `Este local está cerrado actualmente (${estadoLocal.badge}). No puedes entrar en la sala virtual.`,
          [{ text: 'OK' }]
        );
        return;
      }
    }

    try {
      setCheckingIn(true);

      const { data: existingCheckin } = await supabase
        .from('sala_virtual_checkins')
        .select('*, locales(nombre)')
        .eq('usuario_id', user.id)
        .eq('activo', true)
        .neq('local_id', localId)
        .maybeSingle();

      if (existingCheckin) {
        Alert.alert(
          'Cambiar de Sala',
          `Vas a salir de la sala actual para entrar en la sala de ${local?.nombre}. ¿Deseas continuar?`,
          [
            { text: 'Cancelar', style: 'cancel' },
            {
              text: 'Continuar',
              onPress: async () => {
                await supabase
                  .from('sala_virtual_checkins')
                  .update({
                    activo: false,
                    checked_out_at: new Date().toISOString(),
                  })
                  .eq('id', existingCheckin.id);

                await performCheckIn();
              },
            },
          ]
        );
      } else {
        await performCheckIn();
      }
    } catch (error) {
      console.error('[SalaVirtual] Error checking in:', error);
      Alert.alert('Error', 'No se pudo entrar en la sala');
    } finally {
      setCheckingIn(false);
    }
  };

  const performCheckIn = async () => {
    if (!user || !localId) return;

    const { error } = await supabase
      .from('sala_virtual_checkins')
      .insert({
        usuario_id: user.id,
        local_id: localId,
        activo: true,
      });

    if (error) {
      console.error('[SalaVirtual] Error inserting checkin:', error);
      Alert.alert('Error', 'No se pudo entrar en la sala');
      return;
    }

    setIsCheckedIn(true);
    console.log('[SalaVirtual] Checked in successfully');
  };

  // Handle check-out
  const handleCheckOut = async () => {
    if (!user || !localId) return;

    Alert.alert(
      'Salir de la Sala',
      '¿Estás seguro de que quieres salir de la sala virtual?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Salir',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('sala_virtual_checkins')
                .update({
                  activo: false,
                  checked_out_at: new Date().toISOString(),
                })
                .eq('usuario_id', user.id)
                .eq('local_id', localId)
                .eq('activo', true);

              if (error) {
                console.error('[SalaVirtual] Error checking out:', error);
                Alert.alert('Error', 'No se pudo salir de la sala');
                return;
              }

              setIsCheckedIn(false);
              console.log('[SalaVirtual] Checked out successfully');
            } catch (error) {
              console.error('[SalaVirtual] Error:', error);
            }
          },
        },
      ]
    );
  };

  // Load messages
  const loadMessages = useCallback(async () => {
    if (!localId) return;

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
        .is('recipient_id', null)
        .order('created_at', { ascending: true })
        .limit(100);

      if (error) {
        console.error('[SalaVirtual] Error loading messages:', error);
        return;
      }

      const messagesWithReactions = await Promise.all(
        (data || []).map(async (msg) => {
          const { data: reactions } = await supabase
            .from('sala_virtual_reacciones')
            .select('*')
            .eq('mensaje_id', msg.id);

          return {
            ...msg,
            reactions: reactions || [],
          };
        })
      );

      console.log('[SalaVirtual] Messages loaded:', messagesWithReactions.length);
      setMessages(messagesWithReactions);
      
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: false });
      }, 100);
    } catch (error) {
      console.error('[SalaVirtual] Error:', error);
    } finally {
      setLoading(false);
    }
  }, [localId]);

  // Load direct messages
  const loadDirectMessages = useCallback(async () => {
    if (!user || !localId) return;

    try {
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
        .or(`recipient_id.eq.${user.id},usuario_id.eq.${user.id}`)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('[SalaVirtual] Error loading direct messages:', error);
        return;
      }

      const dms: DirectMessage[] = (data || []).map(msg => ({
        id: msg.id,
        sender_id: msg.usuario_id,
        recipient_id: msg.recipient_id || '',
        tipo: msg.tipo as 'mensaje' | 'emoticon',
        contenido: msg.contenido,
        created_at: msg.created_at,
        sender: msg.usuario,
      }));

      setDirectMessages(dms);
    } catch (error) {
      console.error('[SalaVirtual] Error:', error);
    }
  }, [user, localId]);

  // Update active users
  const updateActiveUsers = useCallback(async () => {
    if (!localId) return;

    try {
      const { data, error } = await supabase
        .from('sala_virtual_checkins')
        .select(`
          usuario_id,
          checked_in_at,
          usuario:usuarios!sala_virtual_checkins_usuario_id_fkey(
            id,
            nombre,
            username,
            avatar
          )
        `)
        .eq('local_id', localId)
        .eq('activo', true)
        .order('checked_in_at', { ascending: false });

      if (error) {
        console.error('[SalaVirtual] Error loading active users:', error);
        return;
      }

      const users: ActiveUser[] = (data || [])
        .filter(item => item.usuario)
        .map(item => ({
          id: item.usuario.id,
          nombre: item.usuario.nombre,
          username: item.usuario.username,
          avatar: item.usuario.avatar,
          last_activity: item.checked_in_at,
          checked_in_at: item.checked_in_at,
        }));

      setActiveUsers(users);
      console.log('[SalaVirtual] Active users:', users.length);
    } catch (error) {
      console.error('[SalaVirtual] Error:', error);
    }
  }, [localId]);

  // Subscribe to real-time updates
  const subscribeToUpdates = useCallback(() => {
    if (!localId || !user) return () => {};

    console.log('[SalaVirtual] Subscribing to real-time updates for local:', localId);

    // Public chat channel
    const chatChannel = supabase
      .channel(`room:${localId}:chat`, {
        config: { broadcast: { self: false } },
      })
      .on('broadcast', { event: 'message_created' }, async (payload) => {
        console.log('[SalaVirtual] New message received:', payload);
        
        const { data: userData } = await supabase
          .from('usuarios')
          .select('id, nombre, username, avatar')
          .eq('id', payload.payload.usuario_id)
          .single();

        const newMessage: InteractionMessage = {
          ...payload.payload,
          usuario: userData || { id: payload.payload.usuario_id, nombre: 'Usuario' },
          reactions: [],
        };

        setMessages((prev) => [...prev, newMessage]);
        
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      })
      .subscribe();

    // Direct messages channel
    const dmChannel = supabase
      .channel(`user:${user.id}:dm`, {
        config: { broadcast: { self: false } },
      })
      .on('broadcast', { event: 'direct_message' }, async (payload) => {
        console.log('[SalaVirtual] Direct message received:', payload);
        
        const { data: senderData } = await supabase
          .from('usuarios')
          .select('id, nombre, username, avatar')
          .eq('id', payload.payload.sender_id)
          .single();

        const dm: DirectMessage = {
          id: payload.payload.id,
          sender_id: payload.payload.sender_id,
          recipient_id: payload.payload.recipient_id,
          tipo: payload.payload.tipo,
          contenido: payload.payload.contenido,
          created_at: payload.payload.created_at,
          sender: senderData || { id: payload.payload.sender_id, nombre: 'Usuario' },
        };

        setDirectMessages(prev => [dm, ...prev]);
        
        // Show notification
        const notifId = `notif-${Date.now()}`;
        setNotifications(prev => [
          ...prev,
          {
            id: notifId,
            message: payload.payload.tipo === 'emoticon' 
              ? `${senderData?.nombre || 'Alguien'} te envió ${payload.payload.contenido}`
              : `Mensaje de ${senderData?.nombre || 'Alguien'}`,
            type: payload.payload.tipo === 'emoticon' ? 'emoticon' : 'dm',
          }
        ]);

        // Play sound
        playNotificationSound();

        // Remove notification after 3 seconds
        setTimeout(() => {
          setNotifications(prev => prev.filter(n => n.id !== notifId));
        }, 3000);

        // Add floating emoticon if it's an emoticon
        if (payload.payload.tipo === 'emoticon') {
          const emojiId = `emoji-${Date.now()}`;
          setFloatingEmoticons(prev => [
            ...prev,
            {
              emoji: payload.payload.contenido,
              id: emojiId,
              x: Math.random() * (SCREEN_WIDTH - 60),
              y: SCREEN_HEIGHT * 0.3,
            }
          ]);

          setTimeout(() => {
            setFloatingEmoticons(prev => prev.filter(e => e.id !== emojiId));
          }, 3000);
        }
      })
      .subscribe();

    // User presence channel
    const presenceChannel = supabase
      .channel(`room:${localId}:presence`, {
        config: { broadcast: { self: false } },
      })
      .on('broadcast', { event: 'user_joined' }, () => {
        updateActiveUsers();
      })
      .on('broadcast', { event: 'user_left' }, () => {
        updateActiveUsers();
      })
      .subscribe();

    channelRef.current = { chatChannel, dmChannel, presenceChannel };

    return () => {
      console.log('[SalaVirtual] Unsubscribing from real-time updates');
      supabase.removeChannel(chatChannel);
      supabase.removeChannel(dmChannel);
      supabase.removeChannel(presenceChannel);
    };
  }, [localId, user, updateActiveUsers, playNotificationSound]);

  // Initialize
  useEffect(() => {
    if (!localId) {
      Alert.alert('Error', 'No se especificó el local');
      router.back();
      return;
    }

    console.log('[SalaVirtual] Initializing with localId:', localId);
    loadLocalData();
    checkUserCheckin();
    loadMessages();
    loadDirectMessages();
    const unsubscribe = subscribeToUpdates();
    updateActiveUsers();

    const interval = setInterval(updateActiveUsers, 30000);

    return () => {
      clearInterval(interval);
      unsubscribe();
    };
  }, [localId, loadLocalData, checkUserCheckin, loadMessages, loadDirectMessages, subscribeToUpdates, updateActiveUsers, router]);

  // Send public message
  const sendMessage = async () => {
    if (!user) {
      Alert.alert('Error', 'Debes iniciar sesión para enviar mensajes');
      return;
    }

    if (!isCheckedIn) {
      Alert.alert('Error', 'Debes entrar en la sala para enviar mensajes');
      return;
    }

    const content = newMessage.trim();
    if (!content) return;

    if (!localId) {
      Alert.alert('Error', 'No se especificó el local');
      return;
    }

    try {
      setSending(true);
      console.log('[SalaVirtual] Sending message:', content);

      const { data, error } = await supabase
        .from('sala_virtual_interacciones')
        .insert({
          usuario_id: user.id,
          local_id: localId,
          tipo: 'mensaje',
          contenido: content,
        })
        .select()
        .single();

      if (error) {
        console.error('[SalaVirtual] Error sending message:', error);
        Alert.alert('Error', 'No se pudo enviar el mensaje');
        return;
      }

      // Broadcast to all users in the room
      await supabase.channel(`room:${localId}:chat`).send({
        type: 'broadcast',
        event: 'message_created',
        payload: data,
      });

      console.log('[SalaVirtual] Message sent successfully');
      setNewMessage('');
    } catch (error) {
      console.error('[SalaVirtual] Error:', error);
      Alert.alert('Error', 'Ocurrió un error al enviar el mensaje');
    } finally {
      setSending(false);
    }
  };

  // Send direct message or emoticon
  const sendDirectMessage = async (recipientId: string, tipo: 'mensaje' | 'emoticon', contenido: string) => {
    if (!user || !localId) return;

    try {
      const { data, error } = await supabase
        .from('sala_virtual_interacciones')
        .insert({
          usuario_id: user.id,
          local_id: localId,
          tipo,
          contenido,
          recipient_id: recipientId,
        })
        .select()
        .single();

      if (error) {
        console.error('[SalaVirtual] Error sending direct message:', error);
        Alert.alert('Error', 'No se pudo enviar');
        return;
      }

      // Broadcast to recipient
      await supabase.channel(`user:${recipientId}:dm`).send({
        type: 'broadcast',
        event: 'direct_message',
        payload: {
          ...data,
          sender_id: user.id,
        },
      });

      Alert.alert('Enviado', tipo === 'emoticon' ? 'Emoticono enviado' : 'Mensaje enviado');
      setShowDirectMessageModal(false);
      setDirectMessageText('');
    } catch (error) {
      console.error('[SalaVirtual] Error:', error);
    }
  };

  // Handle user selection
  const handleUserSelect = (selectedUser: ActiveUser) => {
    if (selectedUser.id === user?.id) return;
    
    setSelectedUser(selectedUser);
    Alert.alert(
      selectedUser.nombre,
      '¿Qué quieres enviar?',
      [
        {
          text: 'Mensaje Directo',
          onPress: () => {
            setShowDirectMessageModal(true);
          },
        },
        {
          text: 'Emoticono',
          onPress: () => {
            Alert.alert(
              'Selecciona un emoticono',
              '',
              EMOTICONS.map(emoji => ({
                text: emoji,
                onPress: () => sendDirectMessage(selectedUser.id, 'emoticon', emoji),
              })).concat([{ text: 'Cancelar', style: 'cancel' }])
            );
          },
        },
        {
          text: 'Ver Perfil',
          onPress: () => {
            router.push({
              pathname: '/perfil/usuario',
              params: { userId: selectedUser.id },
            });
          },
        },
        { text: 'Cancelar', style: 'cancel' },
      ]
    );
  };

  // Render message
  const renderMessage = ({ item }: { item: InteractionMessage }) => {
    const isOwnMessage = user && item.usuario_id === user.id;

    return (
      <Animated.View
        style={[
          styles.messageContainer,
          isOwnMessage ? styles.ownMessage : styles.otherMessage,
        ]}
      >
        {!isOwnMessage && (
          <TouchableOpacity
            style={styles.messageAvatar}
            onPress={() => {
              const activeUser = activeUsers.find(u => u.id === item.usuario_id);
              if (activeUser) {
                handleUserSelect(activeUser);
              }
            }}
          >
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
          </TouchableOpacity>
        )}
        <View style={{ flex: 1 }}>
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
      </Animated.View>
    );
  };

  // Render user item
  const renderUserItem = ({ item }: { item: ActiveUser }) => {
    const isCurrentUser = user && item.id === user.id;

    return (
      <TouchableOpacity
        style={styles.userCard}
        onPress={() => {
          if (!isCurrentUser) {
            handleUserSelect(item);
          }
        }}
        disabled={isCurrentUser}
      >
        <LinearGradient
          colors={isCurrentUser ? [colors.primary + '20', colors.secondary + '20'] : ['transparent', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.userCardGradient}
        >
          <View style={styles.userCardContent}>
            {item.avatar ? (
              <Image
                source={{ uri: item.avatar }}
                style={styles.userCardAvatar}
              />
            ) : (
              <View style={styles.userCardAvatarPlaceholder}>
                <IconSymbol
                  ios_icon_name="person.fill"
                  android_material_icon_name="person"
                  size={24}
                  color={colors.textSecondary}
                />
              </View>
            )}
            <View style={styles.userCardOnlineDot} />
            
            <View style={styles.userCardInfo}>
              <Text style={styles.userCardName}>
                {item.nombre} {isCurrentUser && '(Tú)'}
              </Text>
              {item.username && (
                <Text style={styles.userCardUsername}>@{item.username}</Text>
              )}
            </View>
          </View>

          {!isCurrentUser && (
            <View style={styles.userCardActions}>
              <IconSymbol
                ios_icon_name="chevron.right"
                android_material_icon_name="chevron_right"
                size={20}
                color={colors.primary}
              />
            </View>
          )}
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  // Render direct message item
  const renderDirectMessageItem = ({ item }: { item: DirectMessage }) => {
    const isSent = item.sender_id === user?.id;
    const otherUser = isSent 
      ? activeUsers.find(u => u.id === item.recipient_id)
      : activeUsers.find(u => u.id === item.sender_id);

    return (
      <View style={styles.dmCard}>
        <View style={styles.dmHeader}>
          {otherUser?.avatar ? (
            <Image source={{ uri: otherUser.avatar }} style={styles.dmAvatar} />
          ) : (
            <View style={styles.dmAvatarPlaceholder}>
              <IconSymbol
                ios_icon_name="person.fill"
                android_material_icon_name="person"
                size={16}
                color={colors.textSecondary}
              />
            </View>
          )}
          <View style={styles.dmInfo}>
            <Text style={styles.dmName}>
              {isSent ? `Para: ${otherUser?.nombre || 'Usuario'}` : `De: ${item.sender.nombre}`}
            </Text>
            <Text style={styles.dmTime}>
              {new Date(item.created_at).toLocaleTimeString('es-ES', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </View>
          <View style={[styles.dmTypeBadge, item.tipo === 'emoticon' && styles.dmTypeEmoticon]}>
            <Text style={styles.dmTypeText}>
              {item.tipo === 'emoticon' ? '😊' : '💬'}
            </Text>
          </View>
        </View>
        <Text style={styles.dmContent}>{item.contenido}</Text>
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

  // If not checked in, show check-in screen
  if (!isCheckedIn) {
    const estadoLocal = local ? getEstadoLocal(local) : null;
    const isOpen = estadoLocal?.estaAbierto === true;

    return (
      <View style={styles.container}>
        <Stack.Screen
          options={{
            title: local?.nombre || 'Sala Virtual',
          }}
        />
        <View style={styles.checkInContainer}>
          <LinearGradient
            colors={['#8B5CF6', '#EC4899', '#F59E0B']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.checkInCard}
          >
            <View style={styles.checkInIconCircle}>
              <IconSymbol
                ios_icon_name="sparkles"
                android_material_icon_name="auto_awesome"
                size={48}
                color="#fff"
              />
            </View>
            <Text style={styles.checkInTitle}>Sala Virtual</Text>
            <Text style={styles.checkInSubtitle}>
              {local?.nombre}
            </Text>
            
            {estadoLocal && (
              <View style={[styles.statusBadge, !isOpen && styles.statusBadgeClosed]}>
                <View style={[styles.statusDot, isOpen ? styles.statusDotOpen : styles.statusDotClosed]} />
                <Text style={styles.statusBadgeText}>{estadoLocal.badge}</Text>
                {estadoLocal.tiempoRestante && (
                  <Text style={styles.statusBadgeSubtext}>• {estadoLocal.tiempoRestante}</Text>
                )}
              </View>
            )}
            
            <Text style={styles.checkInDescription}>
              {isOpen 
                ? 'Entra en la sala para chatear, conocer gente y divertirte con otros usuarios que están aquí ahora mismo.'
                : 'Este local está cerrado actualmente. Vuelve cuando esté abierto para acceder a la sala virtual.'}
            </Text>
            
            <View style={styles.checkInStats}>
              <View style={styles.checkInStat}>
                <IconSymbol
                  ios_icon_name="person.3.fill"
                  android_material_icon_name="group"
                  size={32}
                  color="#fff"
                />
                <Text style={styles.checkInStatNumber}>{activeUsers.length}</Text>
                <Text style={styles.checkInStatLabel}>Usuarios activos</Text>
              </View>
            </View>

            {isOpen && (
              <TouchableOpacity
                style={styles.checkInButton}
                onPress={handleCheckIn}
                disabled={checkingIn}
              >
                <View style={styles.checkInButtonContent}>
                  {checkingIn ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <React.Fragment>
                      <IconSymbol
                        ios_icon_name="arrow.right.circle.fill"
                        android_material_icon_name="login"
                        size={24}
                        color="#fff"
                      />
                      <Text style={styles.checkInButtonText}>Entrar en la Sala Virtual</Text>
                    </React.Fragment>
                  )}
                </View>
              </TouchableOpacity>
            )}
          </LinearGradient>
        </View>
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
              <TouchableOpacity
                style={styles.headerButton}
                onPress={toggleSound}
              >
                <IconSymbol
                  ios_icon_name={soundEnabled ? "speaker.wave.2.fill" : "speaker.slash.fill"}
                  android_material_icon_name={soundEnabled ? "volume_up" : "volume_off"}
                  size={24}
                  color={colors.primary}
                />
              </TouchableOpacity>
              <View style={styles.activeUsersIndicator}>
                <View style={styles.activeUsersDot} />
                <Text style={styles.activeUsersText}>{activeUsers.length}</Text>
              </View>
            </View>
          ),
        }}
      />

      {/* Floating Emoticons */}
      {floatingEmoticons.map((item) => (
        <Animated.View
          key={item.id}
          style={[
            styles.floatingEmoticon,
            {
              left: item.x,
              top: item.y,
            },
          ]}
        >
          <Text style={styles.floatingEmoticonText}>{item.emoji}</Text>
        </Animated.View>
      ))}

      {/* Notifications */}
      {notifications.map((notif) => (
        <Animated.View
          key={notif.id}
          style={styles.notification}
        >
          <LinearGradient
            colors={['#8B5CF6', '#EC4899']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.notificationGradient}
          >
            <IconSymbol
              ios_icon_name={notif.type === 'emoticon' ? "face.smiling" : "envelope.fill"}
              android_material_icon_name={notif.type === 'emoticon' ? "emoji_emotions" : "mail"}
              size={18}
              color="#fff"
            />
            <Text style={styles.notificationText}>{notif.message}</Text>
          </LinearGradient>
        </Animated.View>
      ))}

      <View style={styles.content}>
        {/* Tab Bar - Users first as requested */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'users' && styles.tabActive]}
            onPress={() => setActiveTab('users')}
          >
            <LinearGradient
              colors={activeTab === 'users' ? [colors.primary, colors.secondary] : ['transparent', 'transparent']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.tabGradient}
            >
              <IconSymbol
                ios_icon_name="person.3.fill"
                android_material_icon_name="group"
                size={20}
                color={activeTab === 'users' ? '#fff' : colors.textSecondary}
              />
              <Text style={[styles.tabText, activeTab === 'users' && styles.tabTextActive]}>
                Usuarios ({activeUsers.length})
              </Text>
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'chat' && styles.tabActive]}
            onPress={() => setActiveTab('chat')}
          >
            <LinearGradient
              colors={activeTab === 'chat' ? [colors.primary, colors.secondary] : ['transparent', 'transparent']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.tabGradient}
            >
              <IconSymbol
                ios_icon_name="bubble.left.and.bubble.right.fill"
                android_material_icon_name="chat"
                size={20}
                color={activeTab === 'chat' ? '#fff' : colors.textSecondary}
              />
              <Text style={[styles.tabText, activeTab === 'chat' && styles.tabTextActive]}>
                Chat Público
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Tab Content */}
        {activeTab === 'users' ? (
          <React.Fragment>
            {/* Users List */}
            <FlatList
              data={activeUsers}
              renderItem={renderUserItem}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.usersContent}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <LinearGradient
                    colors={[colors.primary + '20', colors.secondary + '20']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.emptyIconCircle}
                  >
                    <IconSymbol
                      ios_icon_name="person.3"
                      android_material_icon_name="group"
                      size={48}
                      color={colors.primary}
                    />
                  </LinearGradient>
                  <Text style={styles.emptyText}>No hay usuarios activos</Text>
                  <Text style={styles.emptySubtext}>Sé el primero en entrar</Text>
                </View>
              }
            />

            {/* Direct Messages Section */}
            {directMessages.length > 0 && (
              <View style={styles.dmSection}>
                <Text style={styles.dmSectionTitle}>Mensajes Directos</Text>
                <FlatList
                  data={directMessages.slice(0, 3)}
                  renderItem={renderDirectMessageItem}
                  keyExtractor={(item) => item.id}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.dmList}
                />
              </View>
            )}

            {/* Check Out Button */}
            <View style={styles.usersFooter}>
              <TouchableOpacity
                style={styles.checkOutButtonLarge}
                onPress={handleCheckOut}
              >
                <LinearGradient
                  colors={['#EF4444', '#DC2626']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.checkOutButtonGradient}
                >
                  <IconSymbol
                    ios_icon_name="rectangle.portrait.and.arrow.right"
                    android_material_icon_name="logout"
                    size={24}
                    color="#fff"
                  />
                  <Text style={styles.checkOutButtonText}>Salir de la Sala</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </React.Fragment>
        ) : (
          <React.Fragment>
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
          </React.Fragment>
        )}
      </View>

      {/* Direct Message Modal */}
      {showDirectMessageModal && selectedUser && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Mensaje para {selectedUser.nombre}</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Escribe tu mensaje..."
              placeholderTextColor={colors.textSecondary}
              value={directMessageText}
              onChangeText={setDirectMessageText}
              multiline
              maxLength={200}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalButtonCancel}
                onPress={() => {
                  setShowDirectMessageModal(false);
                  setDirectMessageText('');
                }}
              >
                <Text style={styles.modalButtonCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalButtonSend}
                onPress={() => {
                  if (directMessageText.trim()) {
                    sendDirectMessage(selectedUser.id, 'mensaje', directMessageText.trim());
                  }
                }}
                disabled={!directMessageText.trim()}
              >
                <LinearGradient
                  colors={[colors.primary, colors.secondary]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.modalButtonSendGradient}
                >
                  <Text style={styles.modalButtonSendText}>Enviar</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
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
  checkInContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  checkInCard: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 32,
    padding: 40,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  checkInIconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  checkInTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },
  checkInSubtitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 16,
    opacity: 0.9,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginBottom: 16,
    gap: 8,
  },
  statusBadgeClosed: {
    backgroundColor: 'rgba(239, 68, 68, 0.3)',
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#fff',
  },
  statusDotOpen: {
    backgroundColor: '#10B981',
  },
  statusDotClosed: {
    backgroundColor: '#EF4444',
  },
  statusBadgeText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  statusBadgeSubtext: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
    opacity: 0.8,
  },
  checkInDescription: {
    fontSize: 15,
    color: '#fff',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
    opacity: 0.9,
  },
  checkInStats: {
    flexDirection: 'row',
    gap: 24,
    marginBottom: 32,
  },
  checkInStat: {
    alignItems: 'center',
    gap: 8,
  },
  checkInStatNumber: {
    fontSize: 36,
    fontWeight: '800',
    color: '#fff',
  },
  checkInStatLabel: {
    fontSize: 13,
    color: '#fff',
    opacity: 0.8,
  },
  checkInButton: {
    width: '100%',
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  checkInButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 18,
    paddingHorizontal: 24,
  },
  checkInButtonText: {
    fontSize: 17,
    fontWeight: '800',
    color: '#fff',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
    gap: 8,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
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
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tab: {
    flex: 1,
  },
  tabActive: {
    borderBottomWidth: 3,
    borderBottomColor: colors.primary,
  },
  tabGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 8,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: '#fff',
  },
  messagesContent: {
    padding: 16,
    flexGrow: 1,
  },
  usersContent: {
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
    alignItems: 'flex-start',
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
  userCard: {
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  userCardGradient: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
  },
  userCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  userCardAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  userCardAvatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  userCardOnlineDot: {
    position: 'absolute',
    top: 0,
    left: 36,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: colors.card,
  },
  userCardInfo: {
    flex: 1,
  },
  userCardName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 2,
  },
  userCardUsername: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  userCardActions: {
    flexDirection: 'row',
    gap: 8,
  },
  dmSection: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.card,
  },
  dmSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  dmList: {
    gap: 12,
  },
  dmCard: {
    width: 250,
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dmHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  dmAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
  },
  dmAvatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  dmInfo: {
    flex: 1,
  },
  dmName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  dmTime: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  dmTypeBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dmTypeEmoticon: {
    backgroundColor: '#F59E0B' + '20',
  },
  dmTypeText: {
    fontSize: 14,
  },
  dmContent: {
    fontSize: 13,
    color: colors.text,
    lineHeight: 18,
  },
  usersFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.card,
  },
  checkOutButtonLarge: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  checkOutButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  checkOutButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  floatingEmoticon: {
    position: 'absolute',
    zIndex: 1000,
  },
  floatingEmoticonText: {
    fontSize: 48,
  },
  notification: {
    position: 'absolute',
    top: 100,
    left: 16,
    right: 16,
    zIndex: 1000,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  notificationGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  notificationText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2000,
  },
  modalContent: {
    width: '85%',
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 24,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
  },
  modalInput: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: colors.text,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButtonCancel: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: colors.background,
    alignItems: 'center',
  },
  modalButtonCancelText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  modalButtonSend: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  modalButtonSendGradient: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalButtonSendText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
});
