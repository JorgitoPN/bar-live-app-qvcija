
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  FlatList,
  Dimensions,
  Image,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { LinearGradient } from 'expo-linear-gradient';
import { getEstadoLocal } from '@/utils/timeUtils';
import type { RealtimeChannel } from '@supabase/supabase-js';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Message {
  id: string;
  usuario_id: string;
  local_id: string;
  tipo: 'mensaje' | 'emoticon';
  contenido: string;
  created_at: string;
  usuario: {
    id: string;
    nombre: string;
    username?: string;
    avatar?: string;
  };
}

interface ActiveUser {
  id: string;
  nombre: string;
  username?: string;
  avatar?: string;
  checked_in_at: string;
}

interface Local {
  id: string;
  nombre: string;
  imagen_url?: string;
  horarios_completos?: Record<string, string[]>;
  google_business_status?: string;
  estado_actual?: string;
}

const EMOTICONS = ['❤️', '🔥', '😎', '😄', '👏', '🍹', '🎶', '😍', '🤝', '👋', '🎉'];

export default function SalaVirtualScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  
  const [local, setLocal] = useState<Local | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([]);
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);
  const [localClosed, setLocalClosed] = useState(false);
  const [activeTab, setActiveTab] = useState<'users' | 'chat'>('users');
  
  const flatListRef = useRef<FlatList>(null);
  const chatChannelRef = useRef<RealtimeChannel | null>(null);
  const presenceChannelRef = useRef<RealtimeChannel | null>(null);
  const localId = params.localId as string;
  const hasShownClosedAlert = useRef(false);

  // ✅ Load local data
  const loadLocalData = useCallback(async () => {
    if (!localId) {
      console.error('[SalaVirtual] No localId provided');
      setLoading(false);
      Alert.alert('Error', 'No se especificó el local', [
        { text: 'OK', onPress: () => router.back() }
      ]);
      return;
    }

    try {
      console.log('[SalaVirtual] Loading local:', localId);
      
      const { data, error } = await supabase
        .from('locales')
        .select('id, nombre, imagen_url, horarios_completos, google_business_status, estado_actual')
        .eq('id', localId)
        .single();

      if (error) {
        console.error('[SalaVirtual] Error loading local:', error);
        setLoading(false);
        Alert.alert('Error', 'No se pudo cargar la información del local', [
          { text: 'OK', onPress: () => router.back() }
        ]);
        return;
      }

      console.log('[SalaVirtual] Local loaded:', data);
      setLocal(data);
      
      const estadoLocal = getEstadoLocal(data);
      const isOpen = estadoLocal.estaAbierto === true;
      
      console.log('[SalaVirtual] Estado del local:', estadoLocal);
      
      if (!isOpen) {
        setLocalClosed(true);
        setLoading(false);
        
        if (!hasShownClosedAlert.current) {
          hasShownClosedAlert.current = true;
          Alert.alert(
            'Local Cerrado',
            `Este local está cerrado actualmente (${estadoLocal.badge}). No puedes acceder a la sala virtual.`,
            [{ text: 'OK', onPress: () => router.back() }]
          );
        }
      } else {
        setLocalClosed(false);
      }
    } catch (error) {
      console.error('[SalaVirtual] Error:', error);
      setLoading(false);
    }
  }, [localId, router]);

  // ✅ Check if user is checked in
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

  // ✅ REBUILT: Handle check-in with proper validation
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

      // Check if user is already checked in to another room
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
          `Estás en la sala de ${(existingCheckin as any).locales?.nombre}. ¿Quieres cambiar a ${local?.nombre}?`,
          [
            { text: 'Cancelar', style: 'cancel', onPress: () => setCheckingIn(false) },
            {
              text: 'Continuar',
              onPress: async () => {
                // Deactivate old checkin
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
      setCheckingIn(false);
    }
  };

  // ✅ REBUILT: Perform check-in with proper validation and error handling
  const performCheckIn = async () => {
    if (!user || !localId) {
      console.error('[SalaVirtual] Missing user or localId');
      setCheckingIn(false);
      return;
    }

    try {
      console.log('[SalaVirtual] Attempting checkin with:', {
        usuario_id: user.id,
        local_id: localId,
      });

      // Validate data before insert
      if (!user.id || !localId) {
        console.error('[SalaVirtual] Invalid data - usuario_id or local_id is null');
        Alert.alert('Error', 'Datos inválidos para entrar en la sala');
        setCheckingIn(false);
        return;
      }

      const insertData = {
        usuario_id: user.id,
        local_id: localId,
        activo: true,
        checked_in_at: new Date().toISOString(),
      };

      console.log('[SalaVirtual] Inserting checkin with validated data:', insertData);

      const { data, error } = await supabase
        .from('sala_virtual_checkins')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.error('[SalaVirtual] Error inserting checkin:', error);
        console.error('[SalaVirtual] Error details:', JSON.stringify(error, null, 2));
        
        // More specific error message
        if (error.code === '42501') {
          Alert.alert('Error', 'No tienes permisos para entrar en la sala. Por favor, inicia sesión nuevamente.');
        } else if (error.code === '23505') {
          // Duplicate entry - user is already checked in
          console.log('[SalaVirtual] User already checked in, updating status');
          const { error: updateError } = await supabase
            .from('sala_virtual_checkins')
            .update({ activo: true, checked_in_at: new Date().toISOString() })
            .eq('usuario_id', user.id)
            .eq('local_id', localId);
          
          if (updateError) {
            console.error('[SalaVirtual] Error updating checkin:', updateError);
            Alert.alert('Error', 'No se pudo entrar en la sala');
            setCheckingIn(false);
            return;
          }
          
          setIsCheckedIn(true);
          console.log('[SalaVirtual] Checked in successfully (updated existing)');
        } else {
          Alert.alert('Error', 'No se pudo entrar en la sala');
        }
        setCheckingIn(false);
        return;
      }

      setIsCheckedIn(true);
      console.log('[SalaVirtual] Checked in successfully:', data);
      
      // ✅ REBUILT: Broadcast user joined event using correct Realtime v2 broadcast syntax
      if (presenceChannelRef.current) {
        const broadcastResult = await presenceChannelRef.current.send({
          type: 'broadcast',
          event: 'user_joined',
          payload: {
            usuario_id: user.id,
            nombre: user.user_metadata?.nombre || user.email,
          },
        });
        console.log('[SalaVirtual] User joined broadcast result:', broadcastResult);
      }
      
      setCheckingIn(false);
    } catch (error) {
      console.error('[SalaVirtual] Unexpected error during checkin:', error);
      Alert.alert('Error', 'Ocurrió un error inesperado al entrar en la sala');
      setCheckingIn(false);
    }
  };

  // ✅ Handle check-out
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

              // ✅ REBUILT: Broadcast user left event using correct Realtime v2 broadcast syntax
              if (presenceChannelRef.current) {
                await presenceChannelRef.current.send({
                  type: 'broadcast',
                  event: 'user_left',
                  payload: {
                    usuario_id: user.id,
                  },
                });
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

  // ✅ Load messages
  const loadMessages = useCallback(async () => {
    if (!localId) return;

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
        .eq('tipo', 'mensaje')
        .is('recipient_id', null)
        .order('created_at', { ascending: true })
        .limit(100);

      if (error) {
        console.error('[SalaVirtual] Error loading messages:', error);
        setLoading(false);
        return;
      }

      console.log('[SalaVirtual] Messages loaded:', data?.length || 0);
      setMessages(data || []);
      setLoading(false);
      
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: false });
      }, 100);
    } catch (error) {
      console.error('[SalaVirtual] Error:', error);
      setLoading(false);
    }
  }, [localId]);

  // ✅ Update active users
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
          checked_in_at: item.checked_in_at,
        }));

      setActiveUsers(users);
      console.log('[SalaVirtual] Active users:', users.length);
    } catch (error) {
      console.error('[SalaVirtual] Error:', error);
    }
  }, [localId]);

  // ✅ REBUILT: Subscribe to real-time updates using correct Realtime v2 broadcast syntax
  const subscribeToUpdates = useCallback(() => {
    if (!localId || !user) return () => {};

    console.log('[SalaVirtual] Subscribing to real-time updates for local:', localId);

    // ✅ REBUILT: Chat channel with correct broadcast syntax
    const chatChannel = supabase
      .channel(`room:${localId}:chat`, {
        config: { 
          broadcast: { self: false },
        },
      })
      .on('broadcast', { event: 'message_created' }, async (payload) => {
        console.log('[SalaVirtual] New message received:', payload);
        
        const { data: userData } = await supabase
          .from('usuarios')
          .select('id, nombre, username, avatar')
          .eq('id', payload.payload.usuario_id)
          .single();

        const newMessage: Message = {
          ...payload.payload,
          usuario: userData || { id: payload.payload.usuario_id, nombre: 'Usuario' },
        };

        setMessages((prev) => [...prev, newMessage]);
        
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      })
      .subscribe((status) => {
        console.log('[SalaVirtual] Chat channel status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('[SalaVirtual] Chat channel subscribed successfully');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('[SalaVirtual] Chat channel error');
        }
      });

    // ✅ REBUILT: User presence channel with correct broadcast syntax
    const presenceChannel = supabase
      .channel(`room:${localId}:presence`, {
        config: { 
          broadcast: { self: false },
        },
      })
      .on('broadcast', { event: 'user_joined' }, () => {
        console.log('[SalaVirtual] User joined');
        updateActiveUsers();
      })
      .on('broadcast', { event: 'user_left' }, () => {
        console.log('[SalaVirtual] User left');
        updateActiveUsers();
      })
      .subscribe((status) => {
        console.log('[SalaVirtual] Presence channel status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('[SalaVirtual] Presence channel subscribed successfully');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('[SalaVirtual] Presence channel error');
        }
      });

    chatChannelRef.current = chatChannel;
    presenceChannelRef.current = presenceChannel;

    return () => {
      console.log('[SalaVirtual] Unsubscribing from real-time updates');
      supabase.removeChannel(chatChannel);
      supabase.removeChannel(presenceChannel);
    };
  }, [localId, user, updateActiveUsers]);

  // ✅ Initialize
  useEffect(() => {
    if (!localId) {
      setLoading(false);
      Alert.alert('Error', 'No se especificó el local', [
        { text: 'OK', onPress: () => router.back() }
      ]);
      return;
    }

    console.log('[SalaVirtual] Initializing with localId:', localId);
    
    const init = async () => {
      await loadLocalData();
      await checkUserCheckin();
      await loadMessages();
      const unsubscribe = subscribeToUpdates();
      await updateActiveUsers();

      const interval = setInterval(updateActiveUsers, 30000);

      return () => {
        clearInterval(interval);
        unsubscribe();
      };
    };

    const cleanup = init();

    return () => {
      cleanup.then(fn => fn && fn());
    };
  }, [localId, router]);

  // ✅ REBUILT: Send public message with correct Realtime v2 broadcast syntax
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

      // ✅ REBUILT: Broadcast to all users in the room using correct Realtime v2 broadcast syntax
      if (chatChannelRef.current) {
        const broadcastResult = await chatChannelRef.current.send({
          type: 'broadcast',
          event: 'message_created',
          payload: data,
        });
        
        console.log('[SalaVirtual] Broadcast result:', broadcastResult);
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

  // ✅ Send emoticon to user
  const sendEmoticon = async (recipientId: string, emoticon: string) => {
    if (!user || !localId) return;

    try {
      const { data, error } = await supabase
        .from('sala_virtual_interacciones')
        .insert({
          usuario_id: user.id,
          local_id: localId,
          tipo: 'emoticon',
          contenido: emoticon,
          recipient_id: recipientId,
        })
        .select()
        .single();

      if (error) {
        console.error('[SalaVirtual] Error sending emoticon:', error);
        Alert.alert('Error', 'No se pudo enviar el emoticono');
        return;
      }

      Alert.alert('Enviado', `Emoticono ${emoticon} enviado`);
    } catch (error) {
      console.error('[SalaVirtual] Error:', error);
    }
  };

  // ✅ Handle user selection
  const handleUserSelect = (selectedUser: ActiveUser) => {
    if (selectedUser.id === user?.id) return;
    
    Alert.alert(
      selectedUser.nombre,
      '¿Qué quieres hacer?',
      [
        {
          text: 'Enviar Emoticono',
          onPress: () => {
            Alert.alert(
              'Selecciona un emoticono',
              '',
              EMOTICONS.map(emoji => ({
                text: emoji,
                onPress: () => sendEmoticon(selectedUser.id, emoji),
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

  // ✅ Render message
  const renderMessage = ({ item }: { item: Message }) => {
    const isOwnMessage = user && item.usuario_id === user.id;

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
      </View>
    );
  };

  // ✅ Render user item
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
        activeOpacity={0.7}
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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Cargando sala virtual...</Text>
      </View>
    );
  }

  if (localClosed) {
    return (
      <View style={styles.container}>
        <Stack.Screen
          options={{
            title: local?.nombre || 'Sala Virtual',
          }}
        />
        <View style={styles.closedContainer}>
          <LinearGradient
            colors={['#EF4444', '#DC2626']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.closedCard}
          >
            <View style={styles.closedIconCircle}>
              <IconSymbol
                ios_icon_name="lock.fill"
                android_material_icon_name="lock"
                size={48}
                color="#fff"
              />
            </View>
            <Text style={styles.closedTitle}>Local Cerrado</Text>
            <Text style={styles.closedSubtitle}>
              {local?.nombre}
            </Text>
            <Text style={styles.closedDescription}>
              Este local está cerrado actualmente. Vuelve cuando esté abierto para acceder a la sala virtual.
            </Text>
            <TouchableOpacity
              style={styles.closedButton}
              onPress={() => router.back()}
              activeOpacity={0.8}
            >
              <View style={styles.closedButtonContent}>
                <IconSymbol
                  ios_icon_name="arrow.left"
                  android_material_icon_name="arrow_back"
                  size={24}
                  color="#fff"
                />
                <Text style={styles.closedButtonText}>Volver</Text>
              </View>
            </TouchableOpacity>
          </LinearGradient>
        </View>
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
            colors={['#8B5CF6', '#7C3AED']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.checkInCard}
          >
            <View style={styles.checkInIconCircle}>
              <IconSymbol
                ios_icon_name="cube.fill"
                android_material_icon_name="view_in_ar"
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
                activeOpacity={0.8}
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
              <View style={styles.activeUsersIndicator}>
                <View style={styles.activeUsersDot} />
                <Text style={styles.activeUsersText}>{activeUsers.length}</Text>
              </View>
            </View>
          ),
        }}
      />

      <View style={styles.content}>
        {/* Tab Bar */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'users' && styles.tabActive]}
            onPress={() => setActiveTab('users')}
            activeOpacity={0.7}
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
            activeOpacity={0.7}
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

            {/* Check Out Button */}
            <View style={styles.usersFooter}>
              <TouchableOpacity
                style={styles.checkOutButtonLarge}
                onPress={handleCheckOut}
                activeOpacity={0.8}
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
                activeOpacity={0.8}
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
  closedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  closedCard: {
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
  closedIconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  closedTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },
  closedSubtitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 16,
    opacity: 0.9,
  },
  closedDescription: {
    fontSize: 15,
    color: '#fff',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
    opacity: 0.9,
  },
  closedButton: {
    width: '100%',
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  closedButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 18,
    paddingHorizontal: 24,
  },
  closedButtonText: {
    fontSize: 17,
    fontWeight: '800',
    color: '#fff',
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
