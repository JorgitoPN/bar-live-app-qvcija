
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

// ✅ UPDATED: Softer red tones for general actions, strong red only for warnings
const ROOM_COLORS = {
  primary: colors.primary,        // Teal
  secondary: colors.secondary,    // Cyan
  accent: '#F59E0B',             // Amber
  success: '#10B981',            // Green
  danger: '#EF4444',             // Strong Red (only for warnings/deletions)
  warning: '#F97316',            // Orange (for "closing soon" warnings)
  softRed: '#FCA5A5',            // Soft Red (for general actions)
  purple: '#8B5CF6',             // Purple
  pink: '#EC4899',               // Pink
  dark: '#1F2937',               // Dark gray
  light: '#F3F4F6',              // Light gray
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
}

const EMOTICONS = ['❤️', '🔥', '😎', '😄', '👏', '🍹', '🎶', '😍', '🤝', '👋', '🎉', '💃', '🕺', '🎊', '🥳'];

// ✅ NEW: Closing warning thresholds (in minutes)
const CLOSING_WARNING_THRESHOLD = 30; // Warn when 30 minutes or less until closing
const CLOSING_CRITICAL_THRESHOLD = 10; // Critical warning when 10 minutes or less

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
  const [activeTab, setActiveTab] = useState<'chat' | 'users'>('chat');
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  
  // ✅ NEW: Closing warning state
  const [closingWarningShown, setClosingWarningShown] = useState(false);
  const [minutesUntilClosing, setMinutesUntilClosing] = useState<number | null>(null);
  
  const flatListRef = useRef<FlatList>(null);
  const chatChannelRef = useRef<RealtimeChannel | null>(null);
  const presenceChannelRef = useRef<RealtimeChannel | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const closingCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const localId = params.localId as string;
  const hasShownClosedAlert = useRef(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  // ✅ SPECTACULAR: Pulse animation for online indicators
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

    // ✅ SPECTACULAR: Glow animation for current user
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
  }, [glowAnim, pulseAnim]);

  // ✅ NEW: Check closing time and show warnings
  const checkClosingTime = useCallback(() => {
    if (!local) return;

    const estadoLocal = getEstadoLocal(local);
    
    // If local is open and has time remaining
    if (estadoLocal.estaAbierto && estadoLocal.tiempoRestante) {
      // Parse time remaining to get minutes
      const timeStr = estadoLocal.tiempoRestante;
      let totalMinutes = 0;
      
      // Parse formats like "30 min", "1 h 15 min", "2 días 3 h"
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
      
      console.log(`[SalaVirtual] ⏰ Tiempo hasta cierre: ${totalMinutes} minutos`);
      
      // Show warning if closing soon
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
        
        // Broadcast warning to all users in the room
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
      // Local is closed, kick everyone out
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

  // ✅ NEW: Set up interval to check closing time every minute
  useEffect(() => {
    if (isCheckedIn && local) {
      // Check immediately
      checkClosingTime();
      
      // Then check every minute
      closingCheckIntervalRef.current = setInterval(checkClosingTime, 60000);
      
      return () => {
        if (closingCheckIntervalRef.current) {
          clearInterval(closingCheckIntervalRef.current);
        }
      };
    }
  }, [isCheckedIn, local, checkClosingTime]);

  // Load local data
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

      if (error && error.code !== 'PGRST116') {
        console.error('[SalaVirtual] Error checking checkin:', error);
        return;
      }

      setIsCheckedIn(!!data);
      console.log('[SalaVirtual] User checked in:', !!data);
    } catch (error) {
      console.error('[SalaVirtual] Error:', error);
    }
  }, [user, localId]);

  // ✅ FIXED: Handle check-in with proper duplicate handling and auto check-in
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

      // ✅ FIXED: First, close ALL active check-ins for this user (any local)
      console.log('[SalaVirtual] 🔄 Closing all active check-ins for user:', user.id);
      const { error: closeError } = await supabase
        .from('sala_virtual_checkins')
        .update({
          activo: false,
          checked_out_at: new Date().toISOString(),
        })
        .eq('usuario_id', user.id)
        .eq('activo', true);

      if (closeError) {
        console.error('[SalaVirtual] ❌ Error closing previous check-ins:', closeError);
        Alert.alert('Error', 'No se pudo cerrar la sesión anterior');
        setCheckingIn(false);
        return;
      }

      console.log('[SalaVirtual] ✅ All previous check-ins closed');

      // Now insert a new check-in
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
        console.error('[SalaVirtual] ❌ Error inserting checkin:', error);
        Alert.alert('Error', 'No se pudo entrar en la sala');
        setCheckingIn(false);
        return;
      }

      setIsCheckedIn(true);
      console.log('[SalaVirtual] ✅ Checked in successfully');
      
      // Broadcast user joined
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
    } catch (error) {
      console.error('[SalaVirtual] ❌ Unexpected error during checkin:', error);
      Alert.alert('Error', 'Ocurrió un error inesperado al entrar en la sala');
      setCheckingIn(false);
    }
  };

  // ✅ FIXED: Handle check-out with proper UPDATE instead of INSERT
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
              console.log('[SalaVirtual] 🔄 Checking out user:', user.id, 'from local:', localId);

              // ✅ FIXED: Simply UPDATE the active check-in to inactive
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
                console.error('[SalaVirtual] ❌ Error checking out:', error);
                Alert.alert('Error', 'No se pudo salir de la sala');
                return;
              }

              // Broadcast user left
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

              setIsCheckedIn(false);
              console.log('[SalaVirtual] ✅ Checked out successfully');
              router.back();
            } catch (error) {
              console.error('[SalaVirtual] ❌ Error:', error);
              Alert.alert('Error', 'Ocurrió un error al salir de la sala');
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

    console.log('[SalaVirtual] Subscribing to real-time updates');

    const chatChannel = supabase
      .channel(`room:${localId}:chat`, {
        config: { 
          broadcast: { self: true },
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
        console.log('[SalaVirtual] Message deleted:', payload.payload.message_id);
        setMessages((prev) => prev.filter(m => m.id !== payload.payload.message_id));
      })
      .on('broadcast', { event: 'user_typing' }, (payload) => {
        console.log('[SalaVirtual] User typing:', payload.payload.usuario_id);
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
        console.log('[SalaVirtual] Room closing soon');
        Alert.alert(
          'Sala Virtual Cerrando',
          `El local cerrará en ${payload.payload.minutes} minutos. La sala virtual se cerrará automáticamente.`,
          [{ text: 'Entendido' }]
        );
      })
      .on('broadcast', { event: 'room_closed' }, () => {
        console.log('[SalaVirtual] Room closed');
        Alert.alert(
          'Sala Virtual Cerrada',
          'El local ha cerrado. Has sido expulsado de la sala virtual.',
          [{ text: 'OK', onPress: () => router.back() }]
        );
      })
      .subscribe((status) => {
        console.log('[SalaVirtual] Chat channel status:', status);
      });

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
      });

    chatChannelRef.current = chatChannel;
    presenceChannelRef.current = presenceChannel;

    return () => {
      console.log('[SalaVirtual] Unsubscribing from real-time updates');
      supabase.removeChannel(chatChannel);
      supabase.removeChannel(presenceChannel);
    };
  }, [localId, user, updateActiveUsers, router]);

  // ✅ FIXED: Auto check-in when entering the room
  useEffect(() => {
    if (!localId) {
      setLoading(false);
      Alert.alert('Error', 'No se especificó el local', [
        { text: 'OK', onPress: () => router.back() }
      ]);
      return;
    }

    const init = async () => {
      await loadLocalData();
      await checkUserCheckin();
      
      // ✅ NEW: Auto check-in if not already checked in and local is open
      if (!isCheckedIn && !localClosed && user) {
        await handleCheckIn();
      }
      
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

  // Handle typing indicator
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

  // ✅ FIXED: Send public message with correct tipo value
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
      console.log('[SalaVirtual] Sending message');

      const { data, error } = await supabase
        .from('sala_virtual_interacciones')
        .insert({
          usuario_id: user.id,
          local_id: localId,
          tipo: 'mensaje', // ✅ FIXED: Use 'mensaje' instead of 'message_created'
          contenido: content,
        })
        .select()
        .single();

      if (error) {
        console.error('[SalaVirtual] Error sending message:', error);
        Alert.alert('Error', 'No se pudo enviar el mensaje');
        return;
      }

      if (chatChannelRef.current) {
        try {
          await chatChannelRef.current.send({
            type: 'broadcast',
            event: 'message_created',
            payload: data,
          });
        } catch (broadcastError) {
          console.error('[SalaVirtual] Error broadcasting message:', broadcastError);
        }
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

  // Delete message
  const deleteMessage = async (messageId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('sala_virtual_interacciones')
        .delete()
        .eq('id', messageId)
        .eq('usuario_id', user.id);

      if (error) {
        console.error('[SalaVirtual] Error deleting message:', error);
        Alert.alert('Error', 'No se pudo eliminar el mensaje');
        return;
      }

      if (chatChannelRef.current) {
        try {
          await chatChannelRef.current.send({
            type: 'broadcast',
            event: 'message_deleted',
            payload: { message_id: messageId },
          });
        } catch (broadcastError) {
          console.error('[SalaVirtual] Error broadcasting deletion:', broadcastError);
        }
      }

      console.log('[SalaVirtual] Message deleted successfully');
    } catch (error) {
      console.error('[SalaVirtual] Error:', error);
    }
  };

  // ✅ FIXED: Send emoticon to user with correct tipo value
  const sendEmoticon = async (recipientId: string, emoticon: string) => {
    if (!user || !localId) return;

    try {
      const { data, error } = await supabase
        .from('sala_virtual_interacciones')
        .insert({
          usuario_id: user.id,
          local_id: localId,
          tipo: 'emoticon', // ✅ FIXED: Use 'emoticon' instead of other values
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

  // Handle user selection
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

  // ✅ REDESIGNED: Render message with design from attached image
  const renderMessage = ({ item }: { item: Message }) => {
    const isOwnMessage = user && item.usuario_id === user.id;

    return (
      <View
        style={[
          styles.messageContainer,
          isOwnMessage ? styles.ownMessage : styles.otherMessage,
        ]}
      >
        {/* Avatar on left for others */}
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
                  color={ROOM_COLORS.light}
                />
              </View>
            )}
          </TouchableOpacity>
        )}

        {/* Message bubble */}
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
            {/* Username - only for other users */}
            {!isOwnMessage && (
              <Text style={styles.messageSender}>
                {item.usuario.username || item.usuario.nombre}
              </Text>
            )}
            
            {/* Message content */}
            <Text
              style={[
                styles.messageText,
                isOwnMessage ? styles.ownMessageText : styles.otherMessageText,
              ]}
            >
              {item.contenido}
            </Text>
            
            {/* Timestamp */}
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
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // ✅ FIXED: Render user item - Display username without @ instead of full name
  const renderUserItem = ({ item }: { item: ActiveUser }) => {
    const isCurrentUser = user && item.id === user.id;
    const glowColor = glowAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [`${ROOM_COLORS.primary}33`, `${ROOM_COLORS.secondary}66`],
    });

    // ✅ FIXED: Display username without @ if available, otherwise display nombre
    const displayName = item.username || item.nombre;

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
              <Animated.View 
                style={[
                  styles.userCardOnlineDot,
                  { transform: [{ scale: pulseAnim }] }
                ]} 
              />
            </View>
            
            <View style={styles.userCardInfo}>
              <Text style={styles.userCardName}>
                {displayName} {isCurrentUser && '(Tú)'}
              </Text>
            </View>
          </View>

          {!isCurrentUser && (
            <View style={styles.userCardActions}>
              <IconSymbol
                ios_icon_name="chevron.right"
                android_material_icon_name="chevron_right"
                size={20}
                color={ROOM_COLORS.primary}
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
        <ActivityIndicator size="large" color={ROOM_COLORS.primary} />
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
            colors={[ROOM_COLORS.danger, '#DC2626']}
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

  // ✅ REMOVED: Welcome screen - users now enter directly into the chat

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
              {/* ✅ NEW: Show closing warning indicator */}
              {minutesUntilClosing !== null && minutesUntilClosing <= CLOSING_WARNING_THRESHOLD && (
                <View style={[
                  styles.closingWarningIndicator,
                  minutesUntilClosing <= CLOSING_CRITICAL_THRESHOLD && styles.closingCriticalIndicator
                ]}>
                  <IconSymbol
                    ios_icon_name="clock.fill"
                    android_material_icon_name="schedule"
                    size={14}
                    color="#fff"
                  />
                  <Text style={styles.closingWarningText}>{minutesUntilClosing} min</Text>
                </View>
              )}
              <View style={styles.activeUsersIndicator}>
                <Animated.View 
                  style={[
                    styles.activeUsersDot,
                    { transform: [{ scale: pulseAnim }] }
                  ]} 
                />
                <Text style={styles.activeUsersText}>{activeUsers.length}</Text>
              </View>
            </View>
          ),
        }}
      />

      <View style={styles.content}>
        {/* ✅ FIXED: Tab bar with Chat Público first, then Usuarios */}
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
                  style={styles.tabGradient}
                >
                  <View style={styles.tabIconContainer}>
                    <IconSymbol
                      ios_icon_name="bubble.left.and.bubble.right.fill"
                      android_material_icon_name="chat"
                      size={22}
                      color="#fff"
                    />
                  </View>
                  <Text style={styles.tabTextActive}>Chat Público</Text>
                </LinearGradient>
              ) : (
                <View style={styles.tabContent}>
                  <View style={styles.tabIconContainer}>
                    <IconSymbol
                      ios_icon_name="bubble.left.and.bubble.right.fill"
                      android_material_icon_name="chat"
                      size={22}
                      color={colors.textSecondary}
                    />
                  </View>
                  <Text style={styles.tabText}>Chat Público</Text>
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
                  style={styles.tabGradient}
                >
                  <View style={styles.tabIconContainer}>
                    <IconSymbol
                      ios_icon_name="person.3.fill"
                      android_material_icon_name="group"
                      size={22}
                      color="#fff"
                    />
                  </View>
                  <View style={styles.tabTextContainer}>
                    <Text style={styles.tabTextActive}>Usuarios</Text>
                    <View style={styles.tabBadgeActive}>
                      <Text style={styles.tabBadgeTextActive}>{activeUsers.length}</Text>
                    </View>
                  </View>
                </LinearGradient>
              ) : (
                <View style={styles.tabContent}>
                  <View style={styles.tabIconContainer}>
                    <IconSymbol
                      ios_icon_name="person.3.fill"
                      android_material_icon_name="group"
                      size={22}
                      color={colors.textSecondary}
                    />
                  </View>
                  <View style={styles.tabTextContainer}>
                    <Text style={styles.tabText}>Usuarios</Text>
                    <View style={styles.tabBadge}>
                      <Text style={styles.tabBadgeText}>{activeUsers.length}</Text>
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
                      size={48}
                      color={ROOM_COLORS.primary}
                    />
                  </LinearGradient>
                  <Text style={styles.emptyText}>No hay mensajes todavía</Text>
                  <Text style={styles.emptySubtext}>Sé el primero en enviar un mensaje</Text>
                </View>
              }
            />

            {typingUsers.size > 0 && (
              <View style={styles.typingIndicator}>
                <Text style={styles.typingText}>
                  {typingUsers.size === 1 ? 'Alguien está escribiendo...' : `${typingUsers.size} personas están escribiendo...`}
                </Text>
              </View>
            )}

            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
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
                      size={20}
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
                      size={48}
                      color={ROOM_COLORS.primary}
                    />
                  </LinearGradient>
                  <Text style={styles.emptyText}>No hay usuarios activos</Text>
                  <Text style={styles.emptySubtext}>Sé el primero en entrar</Text>
                </View>
              }
            />

            {/* ✅ UPDATED: Exit button with less prominent color (gray instead of red) */}
            <View style={styles.usersFooter}>
              <TouchableOpacity
                style={styles.checkOutButtonLarge}
                onPress={handleCheckOut}
                activeOpacity={0.8}
              >
                <View style={styles.checkOutButtonContent}>
                  <IconSymbol
                    ios_icon_name="rectangle.portrait.and.arrow.right"
                    android_material_icon_name="logout"
                    size={24}
                    color={colors.textSecondary}
                  />
                  <Text style={styles.checkOutButtonText}>Salir de la Sala</Text>
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
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
    gap: 8,
  },
  // ✅ NEW: Closing warning indicator styles
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
    fontSize: 12,
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
    fontSize: 14,
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
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  tabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 12,
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
    fontSize: 15,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  tabTextActive: {
    fontSize: 15,
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
    fontSize: 12,
    fontWeight: '800',
    color: colors.textSecondary,
  },
  tabBadgeTextActive: {
    fontSize: 12,
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
    width: 36,
    height: 36,
  },
  messageAvatarImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: `${ROOM_COLORS.primary}40`,
  },
  messageAvatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
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
    fontSize: 12,
    fontWeight: '700',
    color: ROOM_COLORS.primary,
    marginBottom: 4,
  },
  messageText: {
    fontSize: 15,
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
    fontSize: 12,
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
    fontSize: 14,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.cardBorder,
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
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 3,
    borderColor: `${ROOM_COLORS.primary}40`,
  },
  userCardAvatarPlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 26,
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
    fontSize: 16,
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
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  checkOutButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textSecondary,
  },
});
