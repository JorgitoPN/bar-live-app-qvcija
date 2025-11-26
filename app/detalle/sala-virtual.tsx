
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
import { getEstadoLocal } from '@/utils/timeUtils';

// Import components
import { QuickMessagesBar } from '@/components/sala-virtual/QuickMessagesBar';
import { RankingModal } from '@/components/sala-virtual/RankingModal';
import { ChallengeModal } from '@/components/sala-virtual/ChallengeModal';
import { ReportUserModal } from '@/components/sala-virtual/ReportUserModal';
import { BadgeNotification } from '@/components/sala-virtual/BadgeNotification';
import { FloatingEmoticons } from '@/components/sala-virtual/FloatingEmoticons';

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

interface Badge {
  id: string;
  tipo_badge: string;
  fecha_obtencion: string;
  puntos: number;
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
  
  // Tab state
  const [activeTab, setActiveTab] = useState<'chat' | 'users'>('chat');
  
  // Modal states
  const [showRanking, setShowRanking] = useState(false);
  const [showChallenge, setShowChallenge] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [selectedUser, setSelectedUser] = useState<ActiveUser | null>(null);
  
  // Animation states
  const [userJoinedAnimation] = useState(new Animated.Value(0));
  const [floatingEmoticons, setFloatingEmoticons] = useState<{ emoji: string; id: string; timestamp: number }[]>([]);
  const [newBadge, setNewBadge] = useState<Badge | null>(null);
  
  const flatListRef = useRef<FlatList>(null);
  const channelRef = useRef<any>(null);
  const localId = params.localId as string;

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
    if (!localId) return () => {};

    console.log('[SalaVirtual] Subscribing to real-time updates for local:', localId);

    const channel = supabase
      .channel(`room:${localId}:interactions`, {
        config: { private: true },
      })
      .on('broadcast', { event: 'INSERT' }, async (payload) => {
        console.log('[SalaVirtual] New interaction received:', payload);
        
        if (payload.new.tipo === 'mensaje') {
          const { data: userData } = await supabase
            .from('usuarios')
            .select('id, nombre, username, avatar')
            .eq('id', payload.new.usuario_id)
            .single();

          const newInteraction: InteractionMessage = {
            ...payload.new,
            usuario: userData || { id: payload.new.usuario_id, nombre: 'Usuario' },
            reactions: [],
          };

          setMessages((prev) => [...prev, newInteraction]);
          
          setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: true });
          }, 100);
        } else if (payload.new.tipo === 'emoticon') {
          const emojiId = `${payload.new.usuario_id}-${Date.now()}`;
          setFloatingEmoticons(prev => [
            ...prev,
            {
              emoji: payload.new.contenido,
              id: emojiId,
              timestamp: Date.now(),
            }
          ]);

          setTimeout(() => {
            setFloatingEmoticons(prev => prev.filter(e => e.id !== emojiId));
          }, 3000);
        }

        if (payload.new.usuario_id !== user?.id) {
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
      })
      .subscribe();

    const checkinChannel = supabase
      .channel(`room:${localId}:checkins`, {
        config: { private: true },
      })
      .on('broadcast', { event: 'INSERT' }, () => {
        updateActiveUsers();
      })
      .on('broadcast', { event: 'UPDATE' }, () => {
        updateActiveUsers();
      })
      .subscribe();

    const badgeChannel = supabase
      .channel(`room:${localId}:badges`, {
        config: { private: true },
      })
      .on('broadcast', { event: 'INSERT' }, (payload) => {
        if (payload.new.usuario_id === user?.id) {
          setNewBadge(payload.new);
          setTimeout(() => setNewBadge(null), 5000);
        }
      })
      .subscribe();

    channelRef.current = { channel, checkinChannel, badgeChannel };

    return () => {
      console.log('[SalaVirtual] Unsubscribing from real-time updates');
      supabase.removeChannel(channel);
      supabase.removeChannel(checkinChannel);
      supabase.removeChannel(badgeChannel);
    };
  }, [localId, user, userJoinedAnimation, updateActiveUsers]);

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
    const unsubscribe = subscribeToUpdates();
    updateActiveUsers();

    const interval = setInterval(updateActiveUsers, 30000);

    return () => {
      clearInterval(interval);
      unsubscribe();
    };
  }, [localId, loadLocalData, checkUserCheckin, loadMessages, subscribeToUpdates, updateActiveUsers, router]);

  // Send message
  const sendMessage = async (messageText?: string) => {
    if (!user) {
      Alert.alert('Error', 'Debes iniciar sesión para enviar mensajes');
      return;
    }

    if (!isCheckedIn) {
      Alert.alert('Error', 'Debes entrar en la sala para enviar mensajes');
      return;
    }

    const content = messageText || newMessage.trim();
    if (!content) return;

    if (!localId) {
      Alert.alert('Error', 'No se especificó el local');
      return;
    }

    try {
      setSending(true);
      console.log('[SalaVirtual] Sending message:', content);

      const { error } = await supabase
        .from('sala_virtual_interacciones')
        .insert({
          usuario_id: user.id,
          local_id: localId,
          tipo: 'mensaje',
          contenido: content,
        });

      if (error) {
        console.error('[SalaVirtual] Error sending message:', error);
        Alert.alert('Error', 'No se pudo enviar el mensaje');
        return;
      }

      console.log('[SalaVirtual] Message sent successfully');
      if (!messageText) {
        setNewMessage('');
      }
    } catch (error) {
      console.error('[SalaVirtual] Error:', error);
      Alert.alert('Error', 'Ocurrió un error al enviar el mensaje');
    } finally {
      setSending(false);
    }
  };

  // Send emoticon
  const sendEmoticon = async (emoticon: string) => {
    if (!user) {
      Alert.alert('Error', 'Debes iniciar sesión para enviar reacciones');
      return;
    }

    if (!isCheckedIn) {
      Alert.alert('Error', 'Debes entrar en la sala para enviar reacciones');
      return;
    }

    if (!localId) return;

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

  // Add reaction to message
  const addReaction = async (messageId: string, emoticon: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('sala_virtual_reacciones')
        .insert({
          mensaje_id: messageId,
          usuario_id: user.id,
          emoticon,
        });

      if (error) {
        console.error('[SalaVirtual] Error adding reaction:', error);
        return;
      }

      setMessages(prev => prev.map(msg => {
        if (msg.id === messageId) {
          return {
            ...msg,
            reactions: [
              ...(msg.reactions || []),
              {
                id: `temp-${Date.now()}`,
                mensaje_id: messageId,
                usuario_id: user.id,
                emoticon,
                created_at: new Date().toISOString(),
              },
            ],
          };
        }
        return msg;
      }));
    } catch (error) {
      console.error('[SalaVirtual] Error:', error);
    }
  };

  // Send private message to user
  const sendPrivateMessage = async (userId: string) => {
    if (!user) return;

    Alert.alert(
      'Mensaje Privado',
      '¿Qué quieres enviar?',
      [
        {
          text: 'Enviar mensaje',
          onPress: () => {
            router.push({
              pathname: '/chat/nuevo-chat',
              params: { userId },
            });
          },
        },
        {
          text: 'Invitar a un brindis',
          onPress: async () => {
            await sendMessage(`🍹 ¡Brindemos juntos!`);
          },
        },
        { text: 'Cancelar', style: 'cancel' },
      ]
    );
  };

  // Render message
  const renderMessage = ({ item }: { item: InteractionMessage }) => {
    const isOwnMessage = user && item.usuario_id === user.id;

    const reactionGroups = (item.reactions || []).reduce((acc, reaction) => {
      if (!acc[reaction.emoticon]) {
        acc[reaction.emoticon] = [];
      }
      acc[reaction.emoticon].push(reaction);
      return acc;
    }, {} as Record<string, MessageReaction[]>);

    return (
      <View
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
                setSelectedUser(activeUser);
                setActiveTab('users');
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
          
          {Object.keys(reactionGroups).length > 0 && (
            <View style={styles.reactionsRow}>
              {Object.entries(reactionGroups).map(([emoticon, reactions]) => (
                <TouchableOpacity
                  key={emoticon}
                  style={styles.reactionBadge}
                  onPress={() => addReaction(item.id, emoticon)}
                >
                  <Text style={styles.reactionEmoji}>{emoticon}</Text>
                  <Text style={styles.reactionCount}>{reactions.length}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={styles.addReactionButton}
                onPress={() => {
                  Alert.alert(
                    'Añadir Reacción',
                    'Selecciona un emoticono',
                    EMOTICONS.map(emoji => ({
                      text: emoji,
                      onPress: () => addReaction(item.id, emoji),
                    }))
                  );
                }}
              >
                <IconSymbol
                  ios_icon_name="plus.circle"
                  android_material_icon_name="add_circle"
                  size={16}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
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
            setSelectedUser(item);
          }
        }}
        disabled={isCurrentUser}
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
            <TouchableOpacity
              style={styles.userActionButton}
              onPress={() => sendPrivateMessage(item.id)}
            >
              <IconSymbol
                ios_icon_name="message.fill"
                android_material_icon_name="message"
                size={20}
                color={colors.primary}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.userActionButton}
              onPress={() => {
                setSelectedUser(item);
                setShowReport(true);
              }}
            >
              <IconSymbol
                ios_icon_name="exclamationmark.triangle.fill"
                android_material_icon_name="report"
                size={20}
                color={colors.error}
              />
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>
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
            colors={[colors.primary + '20', colors.secondary + '20']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.checkInCard}
          >
            <View style={styles.checkInIconCircle}>
              <IconSymbol
                ios_icon_name="door.left.hand.open"
                android_material_icon_name="meeting_room"
                size={48}
                color={colors.primary}
              />
            </View>
            <Text style={styles.checkInTitle}>Bienvenido a la Sala Virtual</Text>
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
                  size={24}
                  color={colors.primary}
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
                <LinearGradient
                  colors={[colors.primary, colors.secondary]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.checkInButtonGradient}
                >
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
                </LinearGradient>
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
                onPress={() => setShowRanking(true)}
              >
                <IconSymbol
                  ios_icon_name="chart.bar.fill"
                  android_material_icon_name="leaderboard"
                  size={24}
                  color={colors.primary}
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.headerButton}
                onPress={() => setShowChallenge(true)}
              >
                <IconSymbol
                  ios_icon_name="gamecontroller.fill"
                  android_material_icon_name="sports_esports"
                  size={24}
                  color={colors.primary}
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.activeUsersIndicator}
                onPress={() => setActiveTab('users')}
              >
                <View style={styles.activeUsersDot} />
                <Text style={styles.activeUsersText}>{activeUsers.length}</Text>
              </TouchableOpacity>
            </View>
          ),
        }}
      />

      <View style={styles.content}>
        {/* Tab Bar */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'chat' && styles.tabActive]}
            onPress={() => setActiveTab('chat')}
          >
            <IconSymbol
              ios_icon_name="bubble.left.and.bubble.right.fill"
              android_material_icon_name="chat"
              size={20}
              color={activeTab === 'chat' ? colors.primary : colors.textSecondary}
            />
            <Text style={[styles.tabText, activeTab === 'chat' && styles.tabTextActive]}>
              Chat Público
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'users' && styles.tabActive]}
            onPress={() => setActiveTab('users')}
          >
            <IconSymbol
              ios_icon_name="person.3.fill"
              android_material_icon_name="group"
              size={20}
              color={activeTab === 'users' ? colors.primary : colors.textSecondary}
            />
            <Text style={[styles.tabText, activeTab === 'users' && styles.tabTextActive]}>
              Usuarios ({activeUsers.length})
            </Text>
          </TouchableOpacity>
        </View>

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
        <FloatingEmoticons emoticons={floatingEmoticons} />

        {/* Badge Notification */}
        {newBadge && <BadgeNotification badge={newBadge} />}

        {/* Tab Content */}
        {activeTab === 'chat' ? (
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

            {/* Quick Messages Bar */}
            <QuickMessagesBar onSelectMessage={sendMessage} />

            {/* Reactions Bar */}
            <View style={styles.reactionsContainer}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.reactionsContent}
              >
                {EMOTICONS.map((emoji) => (
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
                onPress={() => sendMessage()}
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
              <TouchableOpacity
                style={styles.checkOutButton}
                onPress={handleCheckOut}
              >
                <IconSymbol
                  ios_icon_name="rectangle.portrait.and.arrow.right"
                  android_material_icon_name="logout"
                  size={20}
                  color={colors.error}
                />
              </TouchableOpacity>
            </View>
          </React.Fragment>
        ) : (
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

            {/* Check Out Button */}
            <View style={styles.usersFooter}>
              <TouchableOpacity
                style={styles.checkOutButtonLarge}
                onPress={handleCheckOut}
              >
                <LinearGradient
                  colors={[colors.error, colors.error + 'CC']}
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
        )}
      </View>

      {/* Modals */}
      <RankingModal
        visible={showRanking}
        onClose={() => setShowRanking(false)}
        localId={localId}
      />

      <ChallengeModal
        visible={showChallenge}
        onClose={() => setShowChallenge(false)}
        localId={localId}
      />

      <ReportUserModal
        visible={showReport}
        onClose={() => {
          setShowReport(false);
          setSelectedUser(null);
        }}
        reportedUser={selectedUser}
        localId={localId}
      />
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
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
  },
  checkInIconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  checkInTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  checkInSubtitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.primary,
    textAlign: 'center',
    marginBottom: 16,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981' + '20',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginBottom: 16,
    gap: 8,
  },
  statusBadgeClosed: {
    backgroundColor: '#EF4444' + '20',
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
    color: colors.text,
  },
  statusBadgeSubtext: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  checkInDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
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
    fontSize: 32,
    fontWeight: '700',
    color: colors.text,
  },
  checkInStatLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  checkInButton: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
  },
  checkInButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  checkInButtonText: {
    fontSize: 16,
    fontWeight: '700',
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: colors.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: colors.primary,
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
  reactionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 4,
  },
  reactionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  reactionEmoji: {
    fontSize: 14,
  },
  reactionCount: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },
  addReactionButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
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
  checkOutButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.error + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  userActionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
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
});
