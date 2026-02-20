
// ✅ LINT FIX: Move all imports to top of file
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
  Animated,
  Keyboard,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useMode } from '@/contexts/ModeContext';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { getEstadoLocal } from '@/utils/timeUtils';
import LoginPrompt from '@/components/common/LoginPrompt';
import { scaleFontSize, scaleIconSize, getActionButtonPaddingVertical } from '@/utils/androidScaling';

console.log('⚠️ CHAT ACTIVADO - VERSIÓN 2.0'); // DIAGNOSTIC LOG

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const ROOM_COLORS = {
  primary: colors.primary,
  secondary: colors.secondary,
  accent: '#F59E0B',
  success: '#10B981',
  danger: '#EF4444',
  warning: '#F97316',
  softRed: '#FCA5A5',
  purple: '#8B5CF6',
  pink: '#EC4899',
  dark: '#1F2937',
  light: '#F3F4F6',
  cardBg: colors.cardBackground,
  cardBgDark: '#111827',
};

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
  propietario_id?: string;
}

const EMOTICONS = ['❤️', '🔥', '😎', '😄', '👏', '🍹', '🎶', '😍', '🤝', '👋', '🎉', '💃', '🕺', '🎊', '🥳'];

const CLOSING_WARNING_THRESHOLD = 30;
const CLOSING_CRITICAL_THRESHOLD = 10;

export default function SalaVirtualScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const { currentMode, activeProfileType } = useMode();
  
  const [local, setLocal] = useState<Local | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([]);
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);
  const [localClosed, setLocalClosed] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'users'>('chat');
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [closingWarningShown, setClosingWarningShown] = useState(false);
  const [minutesUntilClosing, setMinutesUntilClosing] = useState<number | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  
  const flatListRef = useRef<FlatList>(null);
  const chatChannelRef = useRef<RealtimeChannel | null>(null);
  const presenceChannelRef = useRef<RealtimeChannel | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const closingCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const localId = params.localId as string;
  const hasShownClosedAlert = useRef(false);
  const hasInitialized = useRef(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  const buttonPaddingVertical = getActionButtonPaddingVertical();

  // PASO 2 - FIX 3: Android Keyboard Fix
  useEffect(() => {
    if (Platform.OS === 'android') {
      const showSubscription = Keyboard.addListener('keyboardDidShow', (e) => {
        setKeyboardHeight(e.endCoordinates.height);
        console.log('PASO 2 - FIX 3: Keyboard shown, height:', e.endCoordinates.height);
      });
      const hideSubscription = Keyboard.addListener('keyboardDidHide', () => {
        setKeyboardHeight(0);
        console.log('PASO 2 - FIX 3: Keyboard hidden');
      });
      return () => {
        showSubscription.remove();
        hideSubscription.remove();
      };
    }
  }, []);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.3,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: false,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: false,
        }),
      ])
    ).start();
  }, [pulseAnim, glowAnim]);

  useEffect(() => {
    const checkOwnership = async () => {
      if (!user || !localId) return;

      try {
        const { data: localData } = await supabase
          .from('locales')
          .select('propietario_id')
          .eq('id', localId)
          .single();

        if (localData && localData.propietario_id === user.id) {
          setIsOwner(true);
          console.log('[SalaVirtual] ✅ User IS OWNER of this local');
        } else {
          setIsOwner(false);
          console.log('[SalaVirtual] ✅ User is NOT owner of this local');
        }
      } catch (error) {
        console.error('[SalaVirtual] Error checking ownership:', error);
        setIsOwner(false);
      }
    };

    checkOwnership();
  }, [user, localId]);

  const checkClosingTime = useCallback(() => {
    if (!local) return;

    const estadoLocal = getEstadoLocal(local);
    
    if (estadoLocal.estaAbierto && estadoLocal.tiempoRestante) {
      const timeStr = estadoLocal.tiempoRestante;
      let totalMinutes = 0;
      
      const daysMatch = timeStr.match(/(\d+)\s*día/);
      const hoursMatch = timeStr.match(/(\d+)\s*h(?!\s*min)/);
      const minutesMatch = timeStr.match(/(\d+)\s*min/);
      
      if (daysMatch) {
        totalMinutes += parseInt(daysMatch[1]) * 24 * 60;
      }
      if (hoursMatch) {
        totalMinutes += parseInt(hoursMatch[1]) * 60;
      }
      if (minutesMatch) {
        totalMinutes += parseInt(minutesMatch[1]);
      }
      
      setMinutesUntilClosing(totalMinutes);
      
      if (totalMinutes <= CLOSING_WARNING_THRESHOLD && !closingWarningShown) {
        setClosingWarningShown(true);
        
        const warningMessage = totalMinutes <= CLOSING_CRITICAL_THRESHOLD
          ? `⚠️ El local cerrará en ${totalMinutes} minutos. La sala virtual se cerrará automáticamente.`
          : `El local cerrará en ${totalMinutes} minutos. La sala virtual se cerrará cuando cierre el local.`;
        
        Alert.alert(
          'Sala Virtual Cerrando Pronto',
          warningMessage,
          [{ text: 'Entendido' }]
        );
        
        if (chatChannelRef.current) {
          chatChannelRef.current.send({
            type: 'broadcast',
            event: 'room_closing_soon',
            payload: {
              minutes: totalMinutes,
            },
          });
        }
      }
    } else if (!estadoLocal.estaAbierto) {
      console.log('[SalaVirtual] ❌ Local cerrado, expulsando usuarios');
      setLocalClosed(true);
      
      if (chatChannelRef.current) {
        chatChannelRef.current.send({
          type: 'broadcast',
          event: 'room_closed',
          payload: {},
        });
      }
      
      Alert.alert(
        'Sala Virtual Cerrada',
        'El local ha cerrado. Has sido expulsado de la sala virtual.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    }
  }, [local, closingWarningShown, router]);

  useEffect(() => {
    if (isCheckedIn && local) {
      checkClosingTime();
      
      closingCheckIntervalRef.current = setInterval(checkClosingTime, 60000);
      
      return () => {
        if (closingCheckIntervalRef.current) {
          clearInterval(closingCheckIntervalRef.current);
        }
      };
    }
  }, [isCheckedIn, local, checkClosingTime]);

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
        .select('id, nombre, imagen_url, horarios_completos, google_business_status, estado_actual, propietario_id')
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

      setLocal(data);
      
      const estadoLocal = getEstadoLocal(data);
      const isOpen = estadoLocal.estaAbierto === true;
      
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

  const checkUserCheckin = useCallback(async () => {
    if (!user || !localId) {
      return false;
    }

    try {
      const { data, error } = await supabase
        .from('sala_virtual_checkins')
        .select('*')
        .eq('usuario_id', user.id)
        .eq('local_id', localId)
        .eq('activo', true)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('[SalaVirtual] Error checking checkin:', error);
        return false;
      }

      const checkedIn = !!data;
      setIsCheckedIn(checkedIn);
      
      return checkedIn;
    } catch (error) {
      console.error('[SalaVirtual] Error:', error);
      return false;
    }
  }, [user, localId]);

  const handleCheckIn = useCallback(async () => {
    if (!user || !localId) {
      Alert.alert('Error', 'Debes iniciar sesión para entrar en la sala');
      return false;
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
        return false;
      }
    }

    try {
      setCheckingIn(true);
      setIsCheckedIn(true);

      const { error: closeError } = await supabase
        .from('sala_virtual_checkins')
        .update({
          activo: false,
          checked_out_at: new Date().toISOString(),
        })
        .eq('usuario_id', user.id)
        .eq('activo', true);

      if (closeError) {
        console.error('[SalaVirtual] Error closing previous check-ins:', closeError);
        setIsCheckedIn(false);
        throw new Error('No se pudo cerrar la sesión anterior');
      }

      await new Promise(resolve => setTimeout(resolve, 200));

      const { data, error } = await supabase
        .from('sala_virtual_checkins')
        .insert({
          usuario_id: user.id,
          local_id: localId,
          activo: true,
          checked_in_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        console.error('[SalaVirtual] Error inserting checkin:', error);
        setIsCheckedIn(false);
        throw new Error('No se pudo entrar en la sala');
      }

      if (presenceChannelRef.current) {
        try {
          await presenceChannelRef.current.send({
            type: 'broadcast',
            event: 'user_joined',
            payload: {
              usuario_id: user.id,
              nombre: user.user_metadata?.nombre || user.email,
            },
          });
        } catch (broadcastError) {
          console.error('[SalaVirtual] Error broadcasting user joined:', broadcastError);
        }
      }
      
      setCheckingIn(false);
      return true;
    } catch (error: any) {
      console.error('[SalaVirtual] Error during checkin:', error);
      Alert.alert('Error', error.message || 'Ocurrió un error inesperado al entrar en la sala');
      setCheckingIn(false);
      return false;
    }
  }, [user, localId, local]);

  const handleAutoCheckOut = useCallback(async () => {
    if (!user || !localId || !isCheckedIn) return;

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
        console.error('[SalaVirtual] Error auto checking out:', error);
        return;
      }

      if (presenceChannelRef.current) {
        try {
          await presenceChannelRef.current.send({
            type: 'broadcast',
            event: 'user_left',
            payload: {
              usuario_id: user.id,
            },
          });
        } catch (broadcastError) {
          console.error('[SalaVirtual] Error broadcasting user left:', broadcastError);
        }
      }
    } catch (error) {
      console.error('[SalaVirtual] Error in auto checkout:', error);
    }
  }, [user, localId, isCheckedIn]);

  const handleModalClose = useCallback(async () => {
    await handleAutoCheckOut();
    router.back();
  }, [handleAutoCheckOut, router]);

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
            await handleAutoCheckOut();
            router.back();
          },
        },
      ]
    );
  };

  const loadMessages = useCallback(async () => {
    if (!localId) return;

    try {
      console.log('[SalaVirtual] ✅ Volatile chat: Starting with empty message array');
      setMessages([]);
      setLoading(false);
    } catch (error) {
      console.error('[SalaVirtual] Error:', error);
      setLoading(false);
    }
  }, [localId]);

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
    } catch (error) {
      console.error('[SalaVirtual] Error:', error);
    }
  }, [localId]);

  const subscribeToUpdates = useCallback(() => {
    if (!localId || !user) return () => {};

    console.log('[SalaVirtual] 📡 Subscribing to real-time updates');

    const chatChannel = supabase
      .channel(`room:${localId}:chat`, {
        config: { 
          broadcast: { self: false },
          presence: { key: user.id },
        },
      })
      .on('broadcast', { event: 'message_created' }, (payload) => {
        if (payload.payload.usuario_id === user.id) {
          return;
        }

        const newMessage: Message = {
          id: payload.payload.id,
          usuario_id: payload.payload.usuario_id,
          local_id: payload.payload.local_id,
          tipo: payload.payload.tipo,
          contenido: payload.payload.contenido,
          created_at: payload.payload.created_at,
          usuario: payload.payload.usuario,
        };

        setMessages((prev) => {
          if (prev.some(m => m.id === newMessage.id)) {
            return prev;
          }
          return [...prev, newMessage];
        });
        
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      })
      .on('broadcast', { event: 'message_deleted' }, (payload) => {
        setMessages((prev) => prev.filter(m => m.id !== payload.payload.id));
      })
      .on('broadcast', { event: 'user_typing' }, (payload) => {
        setTypingUsers((prev) => new Set(prev).add(payload.payload.usuario_id));
        
        setTimeout(() => {
          setTypingUsers((prev) => {
            const newSet = new Set(prev);
            newSet.delete(payload.payload.usuario_id);
            return newSet;
          });
        }, 3000);
      })
      .on('broadcast', { event: 'room_closing_soon' }, (payload) => {
        Alert.alert(
          'Sala Virtual Cerrando',
          `El local cerrará en ${payload.payload.minutes} minutos. La sala virtual se cerrará automáticamente.`,
          [{ text: 'Entendido' }]
        );
      })
      .on('broadcast', { event: 'room_closed' }, () => {
        Alert.alert(
          'Sala Virtual Cerrada',
          'El local ha cerrado. Has sido expulsado de la sala virtual.',
          [{ text: 'OK', onPress: () => router.back() }]
        );
      })
      .subscribe();

    const presenceChannel = supabase
      .channel(`room:${localId}:presence`, {
        config: { 
          broadcast: { self: false },
        },
      })
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'sala_virtual_checkins',
          filter: `local_id=eq.${localId}`,
        },
        () => {
          updateActiveUsers();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'sala_virtual_checkins',
          filter: `local_id=eq.${localId}`,
        },
        () => {
          updateActiveUsers();
        }
      )
      .on('broadcast', { event: 'user_joined' }, () => {
        updateActiveUsers();
      })
      .on('broadcast', { event: 'user_left' }, () => {
        updateActiveUsers();
      })
      .subscribe();

    chatChannelRef.current = chatChannel;
    presenceChannelRef.current = presenceChannel;

    return () => {
      supabase.removeChannel(chatChannel);
      supabase.removeChannel(presenceChannel);
    };
  }, [localId, user, updateActiveUsers, router]);

  useEffect(() => {
    if (!localId || hasInitialized.current) {
      return;
    }

    hasInitialized.current = true;

    let intervalId: NodeJS.Timeout | null = null;
    let unsubscribeFn: (() => void) | null = null;

    const init = async () => {
      await loadLocalData();
      
      const checkedIn = await checkUserCheckin();
      
      if (!checkedIn && !localClosed && user) {
        const success = await handleCheckIn();
        if (!success) {
          return;
        }
      }
      
      await new Promise(resolve => setTimeout(resolve, 300));
      
      await loadMessages();
      
      unsubscribeFn = subscribeToUpdates();
      
      await updateActiveUsers();

      intervalId = setInterval(updateActiveUsers, 30000);
    };

    init();

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
      if (unsubscribeFn) {
        unsubscribeFn();
      }
      handleAutoCheckOut();
    };
  }, [localId, loadLocalData, checkUserCheckin, handleCheckIn, loadMessages, subscribeToUpdates, updateActiveUsers, localClosed, user, handleAutoCheckOut]);

  const handleTyping = () => {
    if (!user || !chatChannelRef.current) return;

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    chatChannelRef.current.send({
      type: 'broadcast',
      event: 'user_typing',
      payload: {
        usuario_id: user.id,
      },
    });

    typingTimeoutRef.current = setTimeout(() => {
      typingTimeoutRef.current = null;
    }, 3000);
  };

  const sendMessage = useCallback(async () => {
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

      const messageId = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const now = new Date().toISOString();

      const newMsg: Message = {
        id: messageId,
        usuario_id: user.id,
        local_id: localId,
        tipo: 'mensaje',
        contenido: content,
        created_at: now,
        usuario: {
          id: user.id,
          nombre: user.user_metadata?.nombre || user.email || 'Usuario',
          username: user.user_metadata?.username,
          avatar: user.user_metadata?.avatar,
        },
      };

      setMessages((prev) => [...prev, newMsg]);
      setNewMessage('');
      
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);

      if (chatChannelRef.current) {
        await chatChannelRef.current.send({
          type: 'broadcast',
          event: 'message_created',
          payload: newMsg,
        });
      }
    } catch (error) {
      console.error('[SalaVirtual] Error:', error);
      Alert.alert('Error', 'Ocurrió un error al enviar el mensaje');
    } finally {
      setSending(false);
    }
  }, [user, isCheckedIn, newMessage, localId]);

  const deleteMessage = useCallback(async (messageId: string) => {
    if (!user) return;

    try {
      setMessages(prev => prev.filter(m => m.id !== messageId));

      if (chatChannelRef.current) {
        await chatChannelRef.current.send({
          type: 'broadcast',
          event: 'message_deleted',
          payload: { id: messageId },
        });
      }
    } catch (error) {
      console.error('[SalaVirtual] Error:', error);
    }
  }, [user]);

  const sendEmoticon = useCallback(async (recipientId: string, emoticon: string) => {
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
  }, [user, localId]);

  const handleUserSelect = (selectedUser: ActiveUser) => {
    if (selectedUser.id === user?.id) return;
    
    Alert.alert(
      selectedUser.username || selectedUser.nombre,
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

  const renderMessage = ({ item }: { item: Message }) => {
    const isOwnMessage = user && item.usuario_id === user.id;
    const avatarSize = Platform.OS === 'android' ? scaleIconSize(36) : 36;

    return (
      <View
        style={[
          styles.messageContainer,
          isOwnMessage ? styles.ownMessage : styles.otherMessage,
        ]}
      >
        {!isOwnMessage && (
          <TouchableOpacity
            style={[styles.messageAvatar, { width: avatarSize, height: avatarSize }]}
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
                style={[styles.messageAvatarImage, { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 }]}
              />
            ) : (
              <View style={[styles.messageAvatarPlaceholder, { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 }]}>
                <IconSymbol
                  ios_icon_name="person.fill"
                  android_material_icon_name="person"
                  size={Platform.OS === 'android' ? scaleIconSize(18) : 18}
                  color={ROOM_COLORS.light}
                />
              </View>
            )}
          </TouchableOpacity>
        )}

        <View style={{ flex: 1 }}>
          <TouchableOpacity
            style={[
              styles.messageBubble,
              isOwnMessage ? styles.ownMessageBubble : styles.otherMessageBubble,
            ]}
            onLongPress={() => {
              if (isOwnMessage) {
                Alert.alert(
                  'Eliminar Mensaje',
                  '¿Estás seguro de que quieres eliminar este mensaje?',
                  [
                    { text: 'Cancelar', style: 'cancel' },
                    {
                      text: 'Eliminar',
                      style: 'destructive',
                      onPress: () => deleteMessage(item.id),
                    },
                  ]
                );
              }
            }}
            activeOpacity={isOwnMessage ? 0.7 : 1}
          >
            {!isOwnMessage && (
              <Text style={[styles.messageSender, { fontSize: scaleFontSize(12) }]}>
                {item.usuario.username || item.usuario.nombre}
              </Text>
            )}
            
            <Text
              style={[
                styles.messageText,
                { fontSize: scaleFontSize(15) },
                isOwnMessage ? styles.ownMessageText : styles.otherMessageText,
              ]}
            >
              {item.contenido}
            </Text>
            
            <Text
              style={[
                styles.messageTime,
                { fontSize: scaleFontSize(10) },
                isOwnMessage ? styles.ownMessageTime : styles.otherMessageTime,
              ]}
            >
              {new Date(item.created_at).toLocaleTimeString('es-ES', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderUserItem = ({ item }: { item: ActiveUser }) => {
    const isCurrentUser = user && item.id === user.id;
    const glowColor = glowAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [`${ROOM_COLORS.primary}33`, `${ROOM_COLORS.secondary}66`],
    });

    const displayName = item.username || item.nombre;
    const avatarSize = Platform.OS === 'android' ? scaleIconSize(52) : 52;

    return (
      <TouchableOpacity
        key={item.id}
        style={styles.userCard}
        onPress={() => {
          if (!isCurrentUser) {
            handleUserSelect(item);
          }
        }}
        disabled={isCurrentUser}
        activeOpacity={0.7}
      >
        <Animated.View style={[styles.userCardGlow, isCurrentUser && { backgroundColor: glowColor }]} />
        <LinearGradient
          colors={isCurrentUser 
            ? [`${ROOM_COLORS.primary}30`, `${ROOM_COLORS.secondary}30`] 
            : [ROOM_COLORS.cardBg, ROOM_COLORS.cardBg]
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.userCardGradient}
        >
          <View style={styles.userCardContent}>
            <View style={styles.userAvatarContainer}>
              {item.avatar ? (
                <Image
                  source={{ uri: item.avatar }}
                  style={[styles.userCardAvatar, { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 }]}
                />
              ) : (
                <View style={[styles.userCardAvatarPlaceholder, { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 }]}>
                  <IconSymbol
                    ios_icon_name="person.fill"
                    android_material_icon_name="person"
                    size={Platform.OS === 'android' ? scaleIconSize(24) : 24}
                    color={colors.textSecondary}
                  />
                </View>
              )}
              <Animated.View 
                style={[
                  styles.userCardOnlineDot,
                  { transform: [{ scale: pulseAnim }] }
                ]} 
              />
            </View>
            
            <View style={styles.userCardInfo}>
              <Text style={[styles.userCardName, { fontSize: scaleFontSize(16) }]}>
                {displayName} {isCurrentUser && '(Tú)'}
              </Text>
            </View>
          </View>

          {!isCurrentUser && (
            <View style={styles.userCardActions}>
              <IconSymbol
                ios_icon_name="chevron.right"
                android_material_icon_name="chevron_forward"
                size={Platform.OS === 'android' ? scaleIconSize(20) : 20}
                color={ROOM_COLORS.primary}
              />
            </View>
          )}
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  if (!user) {
    return (
      <View style={styles.container}>
        <Stack.Screen
          options={{
            title: 'Sala Virtual',
            headerLeft: () => (
              <TouchableOpacity onPress={() => router.back()}>
                <IconSymbol
                  ios_icon_name="xmark"
                  android_material_icon_name="close"
                  size={Platform.OS === 'android' ? scaleIconSize(24) : 24}
                  color={colors.text}
                />
              </TouchableOpacity>
            ),
          }}
        />
        <LoginPrompt
          title="Inicia sesión para acceder"
          message="Para acceder a la Sala Virtual necesitas iniciar sesión en BarLive."
          icon="person.2.fill"
          androidIcon="people"
        />
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={ROOM_COLORS.primary} />
        <Text style={[styles.loadingText, { fontSize: scaleFontSize(16) }]}>Cargando sala virtual...</Text>
      </View>
    );
  }

  if (localClosed) {
    return (
      <View style={styles.container}>
        <Stack.Screen
          options={{
            title: local?.nombre || 'Sala Virtual',
            headerLeft: () => (
              <TouchableOpacity onPress={handleModalClose}>
                <IconSymbol
                  ios_icon_name="xmark"
                  android_material_icon_name="close"
                  size={Platform.OS === 'android' ? scaleIconSize(24) : 24}
                  color={colors.text}
                />
              </TouchableOpacity>
            ),
          }}
        />
        <View style={styles.closedContainer}>
          <LinearGradient
            colors={[ROOM_COLORS.danger, '#DC2626']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.closedCard}
          >
            <View style={styles.closedIconCircle}>
              <IconSymbol
                ios_icon_name="lock.fill"
                android_material_icon_name="lock"
                size={Platform.OS === 'android' ? scaleIconSize(48) : 48}
                color="#fff"
              />
            </View>
            <Text style={[styles.closedTitle, { fontSize: scaleFontSize(32) }]}>Local Cerrado</Text>
            <Text style={[styles.closedSubtitle, { fontSize: scaleFontSize(20) }]}>
              {local?.nombre}
            </Text>
            <Text style={[styles.closedDescription, { fontSize: scaleFontSize(15) }]}>
              Este local está cerrado actualmente. Vuelve cuando esté abierto para acceder a la sala virtual.
            </Text>
            <TouchableOpacity
              style={styles.closedButton}
              onPress={handleModalClose}
              activeOpacity={0.8}
            >
              <View style={[styles.closedButtonContent, { paddingVertical: buttonPaddingVertical + 4 }]}>
                <IconSymbol
                  ios_icon_name="arrow.left"
                  android_material_icon_name="arrow_back"
                  size={Platform.OS === 'android' ? scaleIconSize(24) : 24}
                  color="#fff"
                />
                <Text style={[styles.closedButtonText, { fontSize: scaleFontSize(17) }]}>Volver</Text>
              </View>
            </TouchableOpacity>
          </LinearGradient>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'android' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <Stack.Screen
        options={{
          title: local?.nombre || 'Sala Virtual',
          headerLeft: () => (
            <TouchableOpacity onPress={handleModalClose}>
              <IconSymbol
                ios_icon_name="xmark"
                android_material_icon_name="close"
                size={Platform.OS === 'android' ? scaleIconSize(24) : 24}
                color={colors.text}
              />
            </TouchableOpacity>
          ),
          headerRight: () => (
            <View style={styles.headerRight}>
              {minutesUntilClosing !== null && minutesUntilClosing <= CLOSING_WARNING_THRESHOLD && (
                <View style={[
                  styles.closingWarningIndicator,
                  minutesUntilClosing <= CLOSING_CRITICAL_THRESHOLD && styles.closingCriticalIndicator
                ]}>
                  <IconSymbol
                    ios_icon_name="clock.fill"
                    android_material_icon_name="schedule"
                    size={Platform.OS === 'android' ? scaleIconSize(14) : 14}
                    color="#fff"
                  />
                  <Text style={[styles.closingWarningText, { fontSize: scaleFontSize(12) }]}>{minutesUntilClosing} min</Text>
                </View>
              )}
              <View style={styles.activeUsersIndicator}>
                <Animated.View 
                  style={[
                    styles.activeUsersDot,
                    { transform: [{ scale: pulseAnim }] }
                  ]} 
                />
                <Text style={[styles.activeUsersText, { fontSize: scaleFontSize(14) }]}>{activeUsers.length}</Text>
              </View>
            </View>
          ),
        }}
      />

      {/* PASO 3: RED BORDER TEST - If you don't see this red border, the file is not being loaded */}
      <View style={[styles.content, { borderWidth: 10, borderColor: 'red', paddingBottom: keyboardHeight }]}>
        <View style={styles.tabBarContainer}>
          <View style={styles.tabBar}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'chat' && styles.tabActive]}
              onPress={() => setActiveTab('chat')}
              activeOpacity={0.7}
            >
              {activeTab === 'chat' ? (
                <LinearGradient
                  colors={[ROOM_COLORS.primary, ROOM_COLORS.secondary]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[styles.tabGradient, { paddingVertical: buttonPaddingVertical - 1 }]}
                >
                  <View style={styles.tabIconContainer}>
                    <IconSymbol
                      ios_icon_name="bubble.left.and.bubble.right.fill"
                      android_material_icon_name="chat"
                      size={Platform.OS === 'android' ? scaleIconSize(22) : 22}
                      color="#fff"
                    />
                  </View>
                  <Text style={[styles.tabTextActive, { fontSize: scaleFontSize(15) }]}>Chat Público</Text>
                </LinearGradient>
              ) : (
                <View style={[styles.tabContent, { paddingVertical: buttonPaddingVertical - 1 }]}>
                  <View style={styles.tabIconContainer}>
                    <IconSymbol
                      ios_icon_name="bubble.left.and.bubble.right.fill"
                      android_material_icon_name="chat"
                      size={Platform.OS === 'android' ? scaleIconSize(22) : 22}
                      color={colors.textSecondary}
                    />
                  </View>
                  <Text style={[styles.tabText, { fontSize: scaleFontSize(15) }]}>Chat Público</Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'users' && styles.tabActive]}
              onPress={() => setActiveTab('users')}
              activeOpacity={0.7}
            >
              {activeTab === 'users' ? (
                <LinearGradient
                  colors={[ROOM_COLORS.primary, ROOM_COLORS.secondary]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[styles.tabGradient, { paddingVertical: buttonPaddingVertical - 1 }]}
                >
                  <View style={styles.tabIconContainer}>
                    <IconSymbol
                      ios_icon_name="person.3.fill"
                      android_material_icon_name="group"
                      size={Platform.OS === 'android' ? scaleIconSize(22) : 22}
                      color="#fff"
                    />
                  </View>
                  <View style={styles.tabTextContainer}>
                    <Text style={[styles.tabTextActive, { fontSize: scaleFontSize(15) }]}>Usuarios</Text>
                    <View style={styles.tabBadgeActive}>
                      <Text style={[styles.tabBadgeTextActive, { fontSize: scaleFontSize(12) }]}>{activeUsers.length}</Text>
                    </View>
                  </View>
                </LinearGradient>
              ) : (
                <View style={[styles.tabContent, { paddingVertical: buttonPaddingVertical - 1 }]}>
                  <View style={styles.tabIconContainer}>
                    <IconSymbol
                      ios_icon_name="person.3.fill"
                      android_material_icon_name="group"
                      size={Platform.OS === 'android' ? scaleIconSize(22) : 22}
                      color={colors.textSecondary}
                    />
                  </View>
                  <View style={styles.tabTextContainer}>
                    <Text style={[styles.tabText, { fontSize: scaleFontSize(15) }]}>Usuarios</Text>
                    <View style={styles.tabBadge}>
                      <Text style={[styles.tabBadgeText, { fontSize: scaleFontSize(12) }]}>{activeUsers.length}</Text>
                    </View>
                  </View>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {activeTab === 'chat' ? (
          <React.Fragment>
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
                    colors={[`${ROOM_COLORS.primary}20`, `${ROOM_COLORS.secondary}20`]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.emptyIconCircle}
                  >
                    <IconSymbol
                      ios_icon_name="bubble.left.and.bubble.right"
                      android_material_icon_name="chat"
                      size={Platform.OS === 'android' ? scaleIconSize(48) : 48}
                      color={ROOM_COLORS.primary}
                    />
                  </LinearGradient>
                  <Text style={[styles.emptyText, { fontSize: scaleFontSize(18) }]}>No hay mensajes todavía</Text>
                  <Text style={[styles.emptySubtext, { fontSize: scaleFontSize(14) }]}>Sé el primero en enviar un mensaje</Text>
                </View>
              }
            />

            {typingUsers.size > 0 && (
              <View style={styles.typingIndicator}>
                <Text style={[styles.typingText, { fontSize: scaleFontSize(12) }]}>
                  {typingUsers.size === 1 ? 'Alguien está escribiendo...' : `${typingUsers.size} personas están escribiendo...`}
                </Text>
              </View>
            )}

            <View style={styles.inputContainer}>
              <TextInput
                style={[styles.input, { fontSize: scaleFontSize(14) }]}
                placeholder="Escribe un mensaje..."
                placeholderTextColor={colors.textSecondary}
                value={newMessage}
                onChangeText={(text) => {
                  setNewMessage(text);
                  handleTyping();
                }}
                multiline
                maxLength={500}
              />
              <TouchableOpacity
                style={[
                  styles.sendButton,
                  {
                    width: Platform.OS === 'android' ? scaleIconSize(40) : 40,
                    height: Platform.OS === 'android' ? scaleIconSize(40) : 40,
                    borderRadius: Platform.OS === 'android' ? scaleIconSize(20) : 20,
                  },
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
                      : [ROOM_COLORS.primary, ROOM_COLORS.secondary]
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
                      size={Platform.OS === 'android' ? scaleIconSize(20) : 20}
                      color="#fff"
                    />
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </React.Fragment>
        ) : (
          <React.Fragment>
            <FlatList
              data={activeUsers}
              renderItem={renderUserItem}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.usersContent}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <LinearGradient
                    colors={[`${ROOM_COLORS.primary}20`, `${ROOM_COLORS.secondary}20`]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.emptyIconCircle}
                  >
                    <IconSymbol
                      ios_icon_name="person.3"
                      android_material_icon_name="group"
                      size={Platform.OS === 'android' ? scaleIconSize(48) : 48}
                      color={ROOM_COLORS.primary}
                    />
                  </LinearGradient>
                  <Text style={[styles.emptyText, { fontSize: scaleFontSize(18) }]}>No hay usuarios activos</Text>
                  <Text style={[styles.emptySubtext, { fontSize: scaleFontSize(14) }]}>Sé el primero en entrar</Text>
                </View>
              }
            />

            <View style={styles.usersFooter}>
              <TouchableOpacity
                style={styles.checkOutButtonLarge}
                onPress={handleCheckOut}
                activeOpacity={0.8}
              >
                <View style={[styles.checkOutButtonContent, { paddingVertical: buttonPaddingVertical + 2 }]}>
                  <IconSymbol
                    ios_icon_name="rectangle.portrait.and.arrow.right"
                    android_material_icon_name="logout"
                    size={Platform.OS === 'android' ? scaleIconSize(24) : 24}
                    color={colors.textSecondary}
                  />
                  <Text style={[styles.checkOutButtonText, { fontSize: scaleFontSize(16) }]}>Salir de la Sala</Text>
                </View>
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
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },
  closedSubtitle: {
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 16,
    opacity: 0.9,
  },
  closedDescription: {
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
    paddingHorizontal: 24,
  },
  closedButtonText: {
    fontWeight: '800',
    color: '#fff',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
    gap: 8,
  },
  closingWarningIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: ROOM_COLORS.warning,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  closingCriticalIndicator: {
    backgroundColor: ROOM_COLORS.danger,
  },
  closingWarningText: {
    fontWeight: '700',
    color: '#fff',
  },
  activeUsersIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${ROOM_COLORS.primary}20`,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  activeUsersDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: ROOM_COLORS.success,
  },
  activeUsersText: {
    fontWeight: '700',
    color: ROOM_COLORS.primary,
  },
  content: {
    flex: 1,
  },
  tabBarContainer: {
    backgroundColor: ROOM_COLORS.cardBg,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  tab: {
    flex: 1,
    marginHorizontal: 4,
  },
  tabActive: {
    borderBottomWidth: 0,
  },
  tabGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  tabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 12,
  },
  tabIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tabText: {
    fontWeight: '700',
    color: colors.textSecondary,
  },
  tabTextActive: {
    fontWeight: '700',
    color: '#fff',
  },
  tabBadge: {
    backgroundColor: colors.textSecondary + '30',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 24,
    alignItems: 'center',
  },
  tabBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 24,
    alignItems: 'center',
  },
  tabBadgeText: {
    fontWeight: '800',
    color: colors.textSecondary,
  },
  tabBadgeTextActive: {
    fontWeight: '800',
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
    fontWeight: '700',
    color: colors.text,
    marginTop: 8,
  },
  emptySubtext: {
    color: colors.textSecondary,
    marginTop: 6,
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'flex-start',
    gap: 8,
  },
  ownMessage: {
    justifyContent: 'flex-end',
  },
  otherMessage: {
    justifyContent: 'flex-start',
  },
  messageAvatar: {
    // width and height set dynamically
  },
  messageAvatarImage: {
    // width, height, borderRadius set dynamically
    borderWidth: 2,
    borderColor: `${ROOM_COLORS.primary}40`,
  },
  messageAvatarPlaceholder: {
    // width, height, borderRadius set dynamically
    backgroundColor: `${ROOM_COLORS.primary}30`,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: `${ROOM_COLORS.primary}40`,
  },
  messageBubble: {
    maxWidth: '70%',
    padding: 12,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  ownMessageBubble: {
    backgroundColor: ROOM_COLORS.primary,
    borderBottomRightRadius: 4,
    alignSelf: 'flex-end',
  },
  otherMessageBubble: {
    backgroundColor: ROOM_COLORS.cardBg,
    borderBottomLeftRadius: 4,
  },
  messageSender: {
    fontWeight: '700',
    color: ROOM_COLORS.primary,
    marginBottom: 4,
  },
  messageText: {
    lineHeight: 20,
  },
  ownMessageText: {
    color: '#fff',
  },
  otherMessageText: {
    color: colors.text,
  },
  messageTime: {
    marginTop: 4,
  },
  ownMessageTime: {
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'right',
  },
  otherMessageTime: {
    color: colors.textSecondary,
  },
  typingIndicator: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: ROOM_COLORS.cardBg,
  },
  typingText: {
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
    backgroundColor: ROOM_COLORS.cardBg,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    backgroundColor: colors.background,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  sendButton: {
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
    position: 'relative',
  },
  userCardGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 16,
  },
  userCardGradient: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  userCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  userAvatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  userCardAvatar: {
    // width, height, borderRadius set dynamically
    borderWidth: 3,
    borderColor: `${ROOM_COLORS.primary}40`,
  },
  userCardAvatarPlaceholder: {
    // width, height, borderRadius set dynamically
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: `${ROOM_COLORS.primary}40`,
  },
  userCardOnlineDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: ROOM_COLORS.success,
    borderWidth: 3,
    borderColor: ROOM_COLORS.cardBg,
  },
  userCardInfo: {
    flex: 1,
  },
  userCardName: {
    fontWeight: '700',
    color: colors.text,
    marginBottom: 2,
  },
  userCardActions: {
    flexDirection: 'row',
    gap: 8,
  },
  usersFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
    backgroundColor: ROOM_COLORS.cardBg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  checkOutButtonLarge: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  checkOutButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 24,
  },
  checkOutButtonText: {
    fontWeight: '700',
    color: colors.textSecondary,
  },
});
