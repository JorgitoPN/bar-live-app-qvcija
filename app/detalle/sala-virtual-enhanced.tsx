
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  FlatList,
  Dimensions,
  Image,
  Animated,
  ScrollView,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { LinearGradient } from 'expo-linear-gradient';
import { getEstadoLocal } from '@/utils/timeUtils';
import type { RealtimeChannel } from '@supabase/supabase-js';
import LoginPrompt from '@/components/common/LoginPrompt';
import { scaleFontSize, scaleIconSize, getActionButtonPaddingVertical } from '@/utils/androidScaling';
import * as Location from 'expo-location';
import { calcularDistancia } from '@/utils/locationUtils';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Helper to resolve image sources
function resolveImageSource(source: string | number | undefined): { uri: string } | number {
  if (!source) return { uri: '' };
  if (typeof source === 'string') return { uri: source };
  return source as number;
}

// Day/Night Mode Detection
function getDayNightMode(): 'day' | 'night' {
  const hour = new Date().getHours();
  return (hour >= 8 && hour < 20) ? 'day' : 'night';
}

// Day Mode Colors (Glassmorphism)
const DAY_COLORS = {
  background: ['#F0F9FF', '#FFF7ED'],
  cardBg: 'rgba(255, 255, 255, 0.85)',
  cardBorder: 'rgba(14, 165, 233, 0.2)',
  primary: '#0EA5E9',
  secondary: '#FB923C',
  text: '#1E293B',
  textSecondary: '#64748B',
  accent: '#F59E0B',
  success: '#10B981',
  danger: '#EF4444',
  shadow: 'rgba(0, 0, 0, 0.1)',
};

// Night Mode Colors (Neon-Night)
const NIGHT_COLORS = {
  background: ['#0F0A1F', '#1A0B2E'],
  cardBg: 'rgba(30, 20, 50, 0.9)',
  cardBorder: 'rgba(236, 72, 153, 0.3)',
  primary: '#EC4899',
  secondary: '#06B6D4',
  text: '#FFFFFF',
  textSecondary: '#D1D5DB',
  accent: '#84CC16',
  success: '#10B981',
  danger: '#EF4444',
  shadow: 'rgba(236, 72, 153, 0.3)',
  glow: 'rgba(236, 72, 153, 0.5)',
};

// Predefined Private Messages
const PREDEFINED_MESSAGES = {
  flirtatious: [
    { id: '1', text: '¿Me sacas a bailar? 💃', emoji: '💃' },
    { id: '2', text: '¿Te puedo sacar a bailar? 🕺✨', emoji: '🕺' },
    { id: '3', text: 'Te he visto y no he podido no saludarte... 👀', emoji: '👀' },
    { id: '4', text: 'Me gusta tu estilo. 😊', emoji: '😊' },
  ],
  invitation: [
    { id: '5', text: '¿Te invito a una copa? 🥂', emoji: '🥂' },
    { id: '6', text: '¿Me invitas a una copa? 😇', emoji: '😇' },
    { id: '7', text: 'Pago yo la siguiente ronda 🍸', emoji: '🍸' },
    { id: '8', text: '¿Qué estás tomando? 🍹', emoji: '🍹' },
  ],
  icebreaker: [
    { id: '9', text: 'S.O.S: Mis amigos son unos pesados, ¿me rescatas? 😂', emoji: '😂' },
    { id: '10', text: '¿Te apetece charlar un rato? 😊', emoji: '😊' },
    { id: '11', text: '¿Vienes mucho por aquí? ✨', emoji: '✨' },
  ],
};

// Quick Public Messages - EXPANDED
const QUICK_PUBLIC_MESSAGES = [
  { id: 'q1', text: '¡Salud a todos! 🍻', emoji: '🍻' },
  { id: 'q2', text: '¡Vaya temazo! 🎶', emoji: '🎶' },
  { id: 'q3', text: '¡Qué ambientazo! 🔥', emoji: '🔥' },
  { id: 'q4', text: '¿Quién pide ronda? 🥂', emoji: '🥂' },
];

const PROXIMITY_THRESHOLD = 5; // meters

interface Message {
  id: string;
  usuario_id: string;
  local_id: string;
  tipo: 'mensaje' | 'emoticon' | 'predefinido';
  contenido: string;
  created_at: string;
  is_private?: boolean;
  recipient_id?: string;
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
  latitude?: number;
  longitude?: number;
  distance?: number;
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

interface PendingInteraction {
  id: string;
  sender_id: string;
  recipient_id: string;
  message: string;
  created_at: string;
  responded: boolean;
}

export default function SalaVirtualEnhancedScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  
  const [mode, setMode] = useState<'day' | 'night'>(getDayNightMode());
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
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [selectedUser, setSelectedUser] = useState<ActiveUser | null>(null);
  const [showBubbleCarousel, setShowBubbleCarousel] = useState(false);
  const [showQuickMessages, setShowQuickMessages] = useState(false);
  const [pendingInteractions, setPendingInteractions] = useState<PendingInteraction[]>([]);
  const [showAnimation, setShowAnimation] = useState(false);
  const [animationEmoji, setAnimationEmoji] = useState('');
  const [floatingParticles, setFloatingParticles] = useState<Array<{
    id: string;
    emoji: string;
    x: Animated.Value;
    y: Animated.Value;
    opacity: Animated.Value;
    scale: Animated.Value;
  }>>([]);
  
  const flatListRef = useRef<FlatList>(null);
  const chatChannelRef = useRef<RealtimeChannel | null>(null);
  const presenceChannelRef = useRef<RealtimeChannel | null>(null);
  const localId = params.localId as string;
  const hasInitialized = useRef(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const bubbleScale = useRef(new Animated.Value(0)).current;
  const animationScale = useRef(new Animated.Value(0)).current;
  const animationOpacity = useRef(new Animated.Value(0)).current;

  const themeColors = mode === 'day' ? DAY_COLORS : NIGHT_COLORS;

  // Update mode every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setMode(getDayNightMode());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // Pulse and glow animations
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
  }, []);

  // Request location permission
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({});
        setUserLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
        console.log('[SalaVirtual Enhanced] User location obtained');
      }
    })();
  }, []);

  const loadLocalData = useCallback(async () => {
    if (!localId) {
      console.error('[SalaVirtual Enhanced] No localId provided');
      setLoading(false);
      return;
    }

    try {
      console.log('[SalaVirtual Enhanced] Loading local:', localId);
      
      const { data, error } = await supabase
        .from('locales')
        .select('id, nombre, imagen_url, horarios_completos, google_business_status, estado_actual, propietario_id')
        .eq('id', localId)
        .single();

      if (error) {
        console.error('[SalaVirtual Enhanced] Error loading local:', error);
        setLoading(false);
        return;
      }

      setLocal(data);
      
      const estadoLocal = getEstadoLocal(data);
      const isOpen = estadoLocal.estaAbierto === true;
      
      if (!isOpen) {
        setLocalClosed(true);
        setLoading(false);
      } else {
        setLocalClosed(false);
      }
    } catch (error) {
      console.error('[SalaVirtual Enhanced] Error:', error);
      setLoading(false);
    }
  }, [localId]);

  const checkUserCheckin = useCallback(async () => {
    if (!user || !localId) return false;

    try {
      const { data, error } = await supabase
        .from('sala_virtual_checkins')
        .select('*')
        .eq('usuario_id', user.id)
        .eq('local_id', localId)
        .eq('activo', true)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('[SalaVirtual Enhanced] Error checking checkin:', error);
        return false;
      }

      const checkedIn = !!data;
      setIsCheckedIn(checkedIn);
      return checkedIn;
    } catch (error) {
      console.error('[SalaVirtual Enhanced] Error:', error);
      return false;
    }
  }, [user, localId]);

  const handleCheckIn = useCallback(async () => {
    if (!user || !localId) return false;

    try {
      setCheckingIn(true);
      setIsCheckedIn(true);

      // Close previous check-ins
      await supabase
        .from('sala_virtual_checkins')
        .update({
          activo: false,
          checked_out_at: new Date().toISOString(),
        })
        .eq('usuario_id', user.id)
        .eq('activo', true);

      await new Promise(resolve => setTimeout(resolve, 200));

      // Create new check-in with location if available
      const checkInData: any = {
        usuario_id: user.id,
        local_id: localId,
        activo: true,
        checked_in_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('sala_virtual_checkins')
        .insert(checkInData)
        .select()
        .single();

      if (error) {
        console.error('[SalaVirtual Enhanced] Error inserting checkin:', error);
        setIsCheckedIn(false);
        throw new Error('No se pudo entrar en la sala');
      }

      if (presenceChannelRef.current) {
        await presenceChannelRef.current.send({
          type: 'broadcast',
          event: 'user_joined',
          payload: {
            usuario_id: user.id,
            nombre: user.user_metadata?.nombre || user.email,
          },
        });
      }
      
      setCheckingIn(false);
      return true;
    } catch (error: any) {
      console.error('[SalaVirtual Enhanced] Error during checkin:', error);
      setCheckingIn(false);
      return false;
    }
  }, [user, localId]);

  const handleCheckOut = useCallback(async () => {
    if (!user || !localId) return;

    try {
      await supabase
        .from('sala_virtual_checkins')
        .update({
          activo: false,
          checked_out_at: new Date().toISOString(),
        })
        .eq('usuario_id', user.id)
        .eq('local_id', localId)
        .eq('activo', true);

      if (presenceChannelRef.current) {
        await presenceChannelRef.current.send({
          type: 'broadcast',
          event: 'user_left',
          payload: { usuario_id: user.id },
        });
      }

      router.back();
    } catch (error) {
      console.error('[SalaVirtual Enhanced] Error checking out:', error);
    }
  }, [user, localId, router]);

  const loadMessages = useCallback(async () => {
    if (!localId) return;
    console.log('[SalaVirtual Enhanced] Starting with empty message array (volatile chat)');
    setMessages([]);
    setLoading(false);
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
        console.error('[SalaVirtual Enhanced] Error loading active users:', error);
        return;
      }

      let users: ActiveUser[] = (data || [])
        .filter(item => item.usuario)
        .map(item => ({
          id: item.usuario.id,
          nombre: item.usuario.nombre,
          username: item.usuario.username,
          avatar: item.usuario.avatar,
          checked_in_at: item.checked_in_at,
        }));

      // Calculate distances if user location is available
      if (userLocation) {
        users = users.map(u => {
          // In real implementation, you'd fetch user locations from database
          // For now, we'll simulate proximity
          const distance = Math.random() * 20; // Simulated distance
          return { ...u, distance };
        });
      }

      setActiveUsers(users);
    } catch (error) {
      console.error('[SalaVirtual Enhanced] Error:', error);
    }
  }, [localId, userLocation]);

  const subscribeToUpdates = useCallback(() => {
    if (!localId || !user) return () => {};

    console.log('[SalaVirtual Enhanced] Subscribing to real-time updates');

    const chatChannel = supabase
      .channel(`room:${localId}:chat`, {
        config: { 
          broadcast: { self: false },
          presence: { key: user.id },
        },
      })
      .on('broadcast', { event: 'message_created' }, (payload) => {
        if (payload.payload.usuario_id === user.id) return;

        const newMessage: Message = {
          id: payload.payload.id,
          usuario_id: payload.payload.usuario_id,
          local_id: payload.payload.local_id,
          tipo: payload.payload.tipo,
          contenido: payload.payload.contenido,
          created_at: payload.payload.created_at,
          is_private: payload.payload.is_private,
          recipient_id: payload.payload.recipient_id,
          usuario: payload.payload.usuario,
        };

        // Only show message if it's public or addressed to current user
        if (!newMessage.is_private || newMessage.recipient_id === user.id) {
          setMessages((prev) => {
            if (prev.some(m => m.id === newMessage.id)) return prev;
            return [...prev, newMessage];
          });
          
          setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: true });
          }, 100);

          // Show animation if it's a predefined message to current user
          if (newMessage.is_private && newMessage.recipient_id === user.id && newMessage.tipo === 'predefinido') {
            triggerReceivedAnimation(newMessage.contenido);
          }

          // Trigger floating reaction for quick public messages from others
          if (!newMessage.is_private) {
            const quickMsg = QUICK_PUBLIC_MESSAGES.find(m => m.text === newMessage.contenido);
            if (quickMsg) {
              triggerFloatingReaction(quickMsg.emoji);
            }
          }
        }
      })
      .on('broadcast', { event: 'user_joined' }, () => {
        updateActiveUsers();
      })
      .on('broadcast', { event: 'user_left' }, () => {
        updateActiveUsers();
      })
      .subscribe();

    const presenceChannel = supabase
      .channel(`room:${localId}:presence`, {
        config: { broadcast: { self: false } },
      })
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'sala_virtual_checkins',
          filter: `local_id=eq.${localId}`,
        },
        () => updateActiveUsers()
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'sala_virtual_checkins',
          filter: `local_id=eq.${localId}`,
        },
        () => updateActiveUsers()
      )
      .subscribe();

    chatChannelRef.current = chatChannel;
    presenceChannelRef.current = presenceChannel;

    return () => {
      supabase.removeChannel(chatChannel);
      supabase.removeChannel(presenceChannel);
    };
  }, [localId, user, updateActiveUsers]);

  useEffect(() => {
    if (!localId || hasInitialized.current) return;
    hasInitialized.current = true;

    const init = async () => {
      await loadLocalData();
      const checkedIn = await checkUserCheckin();
      
      if (!checkedIn && !localClosed && user) {
        const success = await handleCheckIn();
        if (!success) return;
      }
      
      await new Promise(resolve => setTimeout(resolve, 300));
      await loadMessages();
      subscribeToUpdates();
      await updateActiveUsers();
    };

    init();

    return () => {
      handleCheckOut();
    };
  }, [localId]);

  const sendPublicMessage = useCallback(async (content: string) => {
    if (!user || !localId) return;

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
        is_private: false,
        usuario: {
          id: user.id,
          nombre: user.user_metadata?.nombre || user.email || 'Usuario',
          username: user.user_metadata?.username,
          avatar: user.user_metadata?.avatar,
        },
      };

      setMessages((prev) => [...prev, newMsg]);
      setNewMessage('');
      
      // Trigger floating reaction animation for quick messages
      const quickMsg = QUICK_PUBLIC_MESSAGES.find(m => m.text === content);
      if (quickMsg) {
        triggerFloatingReaction(quickMsg.emoji);
      }
      
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
      console.error('[SalaVirtual Enhanced] Error:', error);
    } finally {
      setSending(false);
    }
  }, [user, localId]);

  const sendPredefinedMessage = useCallback(async (recipientId: string, messageText: string) => {
    if (!user || !localId) return;

    try {
      const messageId = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const now = new Date().toISOString();

      const newMsg: Message = {
        id: messageId,
        usuario_id: user.id,
        local_id: localId,
        tipo: 'predefinido',
        contenido: messageText,
        created_at: now,
        is_private: true,
        recipient_id: recipientId,
        usuario: {
          id: user.id,
          nombre: user.user_metadata?.nombre || user.email || 'Usuario',
          username: user.user_metadata?.username,
          avatar: user.user_metadata?.avatar,
        },
      };

      // Store pending interaction
      const interaction: PendingInteraction = {
        id: messageId,
        sender_id: user.id,
        recipient_id: recipientId,
        message: messageText,
        created_at: now,
        responded: false,
      };
      setPendingInteractions(prev => [...prev, interaction]);

      // Broadcast to recipient
      if (chatChannelRef.current) {
        await chatChannelRef.current.send({
          type: 'broadcast',
          event: 'message_created',
          payload: newMsg,
        });
      }

      setShowBubbleCarousel(false);
      setSelectedUser(null);

      // Show success feedback
      const recipient = activeUsers.find(u => u.id === recipientId);
      const recipientName = recipient?.username || recipient?.nombre || 'Usuario';
      
      console.log(`[SalaVirtual Enhanced] Predefined message sent to ${recipientName}`);
    } catch (error) {
      console.error('[SalaVirtual Enhanced] Error sending predefined message:', error);
    }
  }, [user, localId, activeUsers]);

  const triggerReceivedAnimation = (messageText: string) => {
    // Extract emoji from message
    const emojiMatch = messageText.match(/[\u{1F300}-\u{1F9FF}]/u);
    const emoji = emojiMatch ? emojiMatch[0] : '✨';
    
    setAnimationEmoji(emoji);
    setShowAnimation(true);

    // Animate
    Animated.parallel([
      Animated.sequence([
        Animated.timing(animationScale, {
          toValue: 1.5,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(animationScale, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]),
      Animated.sequence([
        Animated.timing(animationOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.delay(1500),
        Animated.timing(animationOpacity, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ]),
    ]).start(() => {
      setShowAnimation(false);
      animationScale.setValue(0);
      animationOpacity.setValue(0);
    });
  };

  const triggerFloatingReaction = useCallback((emoji: string) => {
    // Create floating particles animation
    const newParticles = Array.from({ length: 15 }, (_, index) => ({
      id: `particle-${Date.now()}-${index}`,
      emoji,
      x: new Animated.Value(SCREEN_WIDTH / 2 + (Math.random() - 0.5) * 100),
      y: new Animated.Value(SCREEN_HEIGHT),
      opacity: new Animated.Value(1),
      scale: new Animated.Value(0.5 + Math.random() * 0.5),
    }));

    setFloatingParticles(prev => [...prev, ...newParticles]);

    newParticles.forEach((particle, index) => {
      const delay = index * 80;
      const duration = 2500 + Math.random() * 1000;
      const targetY = SCREEN_HEIGHT * 0.1 + Math.random() * 150;
      const targetX = particle.x._value + (Math.random() - 0.5) * 80;

      Animated.parallel([
        Animated.timing(particle.x, {
          toValue: targetX,
          duration,
          delay,
          useNativeDriver: true,
        }),
        Animated.timing(particle.y, {
          toValue: targetY,
          duration,
          delay,
          useNativeDriver: true,
        }),
        Animated.timing(particle.opacity, {
          toValue: 0,
          duration: duration * 0.7,
          delay: delay + duration * 0.3,
          useNativeDriver: true,
        }),
        Animated.timing(particle.scale, {
          toValue: 1.2,
          duration: duration * 0.5,
          delay,
          useNativeDriver: true,
        }),
      ]).start(() => {
        // Remove particle after animation
        setFloatingParticles(current => current.filter(p => p.id !== particle.id));
      });
    });

    console.log(`[SalaVirtual Enhanced] Floating reaction triggered: ${emoji}`);
  }, []);

  const handleUserPress = (selectedUser: ActiveUser) => {
    if (selectedUser.id === user?.id) return;
    
    setSelectedUser(selectedUser);
    setShowBubbleCarousel(true);

    // Animate bubble carousel
    Animated.spring(bubbleScale, {
      toValue: 1,
      friction: 8,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  const closeBubbleCarousel = () => {
    Animated.timing(bubbleScale, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setShowBubbleCarousel(false);
      setSelectedUser(null);
    });
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isOwnMessage = user && item.usuario_id === user.id;
    const avatarSize = Platform.OS === 'android' ? scaleIconSize(36) : 36;

    // Don't render private messages not addressed to current user
    if (item.is_private && item.recipient_id !== user?.id && item.usuario_id !== user?.id) {
      return null;
    }

    const messageLabel = item.is_private ? '(Privado)' : '';

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
              if (activeUser) handleUserPress(activeUser);
            }}
          >
            {item.usuario.avatar ? (
              <Image
                source={resolveImageSource(item.usuario.avatar)}
                style={[styles.messageAvatarImage, { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 }]}
              />
            ) : (
              <View style={[styles.messageAvatarPlaceholder, { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2, backgroundColor: themeColors.primary + '30' }]}>
                <IconSymbol
                  ios_icon_name="person.fill"
                  android_material_icon_name="person"
                  size={Platform.OS === 'android' ? scaleIconSize(18) : 18}
                  color={themeColors.text}
                />
              </View>
            )}
          </TouchableOpacity>
        )}

        <View style={{ flex: 1 }}>
          <View
            style={[
              styles.messageBubble,
              isOwnMessage ? { backgroundColor: themeColors.primary } : { backgroundColor: themeColors.cardBg },
              mode === 'night' && !isOwnMessage && {
                borderWidth: 1,
                borderColor: themeColors.cardBorder,
                shadowColor: themeColors.glow,
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.5,
                shadowRadius: 8,
              },
            ]}
          >
            {!isOwnMessage && (
              <Text style={[styles.messageSender, { fontSize: scaleFontSize(12), color: themeColors.primary }]}>
                {item.usuario.username || item.usuario.nombre} {messageLabel}
              </Text>
            )}
            
            <Text
              style={[
                styles.messageText,
                { fontSize: scaleFontSize(15) },
                isOwnMessage ? { color: '#FFFFFF' } : { color: themeColors.text },
              ]}
            >
              {item.contenido}
            </Text>
            
            <Text
              style={[
                styles.messageTime,
                { fontSize: scaleFontSize(10) },
                isOwnMessage ? { color: 'rgba(255, 255, 255, 0.7)' } : { color: themeColors.textSecondary },
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

  const renderUserItem = ({ item }: { item: ActiveUser }) => {
    const isCurrentUser = user && item.id === user.id;
    const isNearby = item.distance !== undefined && item.distance < PROXIMITY_THRESHOLD;
    const avatarSize = Platform.OS === 'android' ? scaleIconSize(52) : 52;
    const displayName = item.username || item.nombre;
    const distanceText = item.distance !== undefined ? `${item.distance.toFixed(0)}m` : '';

    return (
      <TouchableOpacity
        key={item.id}
        style={[
          styles.userCard,
          { backgroundColor: themeColors.cardBg, borderColor: themeColors.cardBorder },
          isNearby && mode === 'night' && {
            borderColor: themeColors.primary,
            borderWidth: 2,
            shadowColor: themeColors.glow,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 1,
            shadowRadius: 12,
          },
        ]}
        onPress={() => {
          if (!isCurrentUser) handleUserPress(item);
        }}
        disabled={isCurrentUser}
        activeOpacity={0.7}
      >
        <View style={styles.userCardContent}>
          <View style={styles.userAvatarContainer}>
            {item.avatar ? (
              <Image
                source={resolveImageSource(item.avatar)}
                style={[
                  styles.userCardAvatar,
                  { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 },
                  isNearby && { borderColor: themeColors.primary, borderWidth: 3 },
                ]}
              />
            ) : (
              <View style={[
                styles.userCardAvatarPlaceholder,
                { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2, backgroundColor: themeColors.primary + '30' },
                isNearby && { borderColor: themeColors.primary, borderWidth: 3 },
              ]}>
                <IconSymbol
                  ios_icon_name="person.fill"
                  android_material_icon_name="person"
                  size={Platform.OS === 'android' ? scaleIconSize(24) : 24}
                  color={themeColors.text}
                />
              </View>
            )}
            {isNearby && (
              <Animated.View 
                style={[
                  styles.proximityHalo,
                  { 
                    transform: [{ scale: pulseAnim }],
                    backgroundColor: themeColors.primary + '40',
                  }
                ]} 
              />
            )}
            <Animated.View 
              style={[
                styles.userCardOnlineDot,
                { transform: [{ scale: pulseAnim }], backgroundColor: themeColors.success }
              ]} 
            />
          </View>
          
          <View style={styles.userCardInfo}>
            <Text style={[styles.userCardName, { fontSize: scaleFontSize(16), color: themeColors.text }]}>
              {displayName} {isCurrentUser && '(Tú)'}
            </Text>
            {isNearby && (
              <View style={[styles.proximityBadge, { backgroundColor: themeColors.primary + '20' }]}>
                <IconSymbol
                  ios_icon_name="location.fill"
                  android_material_icon_name="location_on"
                  size={Platform.OS === 'android' ? scaleIconSize(12) : 12}
                  color={themeColors.primary}
                />
                <Text style={[styles.proximityText, { fontSize: scaleFontSize(11), color: themeColors.primary }]}>
                  {distanceText} cerca
                </Text>
              </View>
            )}
          </View>
        </View>

        {!isCurrentUser && (
          <IconSymbol
            ios_icon_name="chevron.right"
            android_material_icon_name="chevron_right"
            size={Platform.OS === 'android' ? scaleIconSize(20) : 20}
            color={themeColors.primary}
          />
        )}
      </TouchableOpacity>
    );
  };

  const renderBubbleCarousel = () => {
    if (!selectedUser) return null;

    const allMessages = [
      ...PREDEFINED_MESSAGES.flirtatious,
      ...PREDEFINED_MESSAGES.invitation,
      ...PREDEFINED_MESSAGES.icebreaker,
    ];

    const recipientName = selectedUser.username || selectedUser.nombre;

    return (
      <Modal
        visible={showBubbleCarousel}
        transparent
        animationType="fade"
        onRequestClose={closeBubbleCarousel}
      >
        <TouchableOpacity
          style={styles.bubbleModalOverlay}
          activeOpacity={1}
          onPress={closeBubbleCarousel}
        >
          <View style={[styles.bubbleModalContent, { backgroundColor: themeColors.cardBg, borderColor: themeColors.cardBorder }]}>
            <View style={styles.bubbleHeader}>
              <Text style={[styles.bubbleTitle, { fontSize: scaleFontSize(20), color: themeColors.text }]}>
                Enviar mensaje a {recipientName}
              </Text>
              <TouchableOpacity onPress={closeBubbleCarousel}>
                <IconSymbol
                  ios_icon_name="xmark.circle.fill"
                  android_material_icon_name="cancel"
                  size={Platform.OS === 'android' ? scaleIconSize(28) : 28}
                  color={themeColors.textSecondary}
                />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.bubbleScroll} contentContainerStyle={styles.bubbleScrollContent}>
              <View style={styles.bubbleSection}>
                <Text style={[styles.bubbleSectionTitle, { fontSize: scaleFontSize(14), color: themeColors.textSecondary }]}>
                  💃 Ligar / Atrevido
                </Text>
                {PREDEFINED_MESSAGES.flirtatious.map((msg) => (
                  <TouchableOpacity
                    key={msg.id}
                    style={[styles.bubbleButton, { backgroundColor: themeColors.primary + '15', borderColor: themeColors.primary + '30' }]}
                    onPress={() => sendPredefinedMessage(selectedUser.id, msg.text)}
                  >
                    <Text style={styles.bubbleEmoji}>{msg.emoji}</Text>
                    <Text style={[styles.bubbleText, { fontSize: scaleFontSize(14), color: themeColors.text }]}>
                      {msg.text}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.bubbleSection}>
                <Text style={[styles.bubbleSectionTitle, { fontSize: scaleFontSize(14), color: themeColors.textSecondary }]}>
                  🥂 Invitación
                </Text>
                {PREDEFINED_MESSAGES.invitation.map((msg) => (
                  <TouchableOpacity
                    key={msg.id}
                    style={[styles.bubbleButton, { backgroundColor: themeColors.secondary + '15', borderColor: themeColors.secondary + '30' }]}
                    onPress={() => sendPredefinedMessage(selectedUser.id, msg.text)}
                  >
                    <Text style={styles.bubbleEmoji}>{msg.emoji}</Text>
                    <Text style={[styles.bubbleText, { fontSize: scaleFontSize(14), color: themeColors.text }]}>
                      {msg.text}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.bubbleSection}>
                <Text style={[styles.bubbleSectionTitle, { fontSize: scaleFontSize(14), color: themeColors.textSecondary }]}>
                  😊 Rompehielos
                </Text>
                {PREDEFINED_MESSAGES.icebreaker.map((msg) => (
                  <TouchableOpacity
                    key={msg.id}
                    style={[styles.bubbleButton, { backgroundColor: themeColors.accent + '15', borderColor: themeColors.accent + '30' }]}
                    onPress={() => sendPredefinedMessage(selectedUser.id, msg.text)}
                  >
                    <Text style={styles.bubbleEmoji}>{msg.emoji}</Text>
                    <Text style={[styles.bubbleText, { fontSize: scaleFontSize(14), color: themeColors.text }]}>
                      {msg.text}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    );
  };

  const renderQuickMessagesBar = () => {
    return (
      <View style={[styles.quickMessagesBar, { backgroundColor: themeColors.cardBg, borderTopColor: themeColors.cardBorder }]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.quickMessagesContent}
        >
          {QUICK_PUBLIC_MESSAGES.map((msg) => (
            <TouchableOpacity
              key={msg.id}
              style={[styles.quickMessageButton, { backgroundColor: themeColors.primary + '20', borderColor: themeColors.primary + '40' }]}
              onPress={() => sendPublicMessage(msg.text)}
            >
              <Text style={styles.quickMessageEmoji}>{msg.emoji}</Text>
              <Text style={[styles.quickMessageText, { fontSize: scaleFontSize(13), color: themeColors.text }]}>
                {msg.text}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  if (!user) {
    return (
      <View style={[styles.container, { backgroundColor: themeColors.background[0] }]}>
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
      <LinearGradient
        colors={themeColors.background}
        style={styles.loadingContainer}
      >
        <ActivityIndicator size="large" color={themeColors.primary} />
        <Text style={[styles.loadingText, { fontSize: scaleFontSize(16), color: themeColors.textSecondary }]}>
          Cargando sala virtual...
        </Text>
      </LinearGradient>
    );
  }

  if (localClosed) {
    return (
      <LinearGradient
        colors={themeColors.background}
        style={styles.container}
      >
        <Stack.Screen
          options={{
            title: local?.nombre || 'Sala Virtual',
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
        <View style={styles.closedContainer}>
          <View style={[styles.closedCard, { backgroundColor: themeColors.cardBg }]}>
            <View style={[styles.closedIconCircle, { backgroundColor: themeColors.danger + '20' }]}>
              <IconSymbol
                ios_icon_name="lock.fill"
                android_material_icon_name="lock"
                size={Platform.OS === 'android' ? scaleIconSize(48) : 48}
                color={themeColors.danger}
              />
            </View>
            <Text style={[styles.closedTitle, { fontSize: scaleFontSize(32), color: themeColors.text }]}>
              Local Cerrado
            </Text>
            <Text style={[styles.closedSubtitle, { fontSize: scaleFontSize(20), color: themeColors.textSecondary }]}>
              {local?.nombre}
            </Text>
            <Text style={[styles.closedDescription, { fontSize: scaleFontSize(15), color: themeColors.textSecondary }]}>
              Este local está cerrado actualmente. Vuelve cuando esté abierto para acceder a la sala virtual.
            </Text>
            <TouchableOpacity
              style={[styles.closedButton, { backgroundColor: themeColors.primary }]}
              onPress={() => router.back()}
              activeOpacity={0.8}
            >
              <IconSymbol
                ios_icon_name="arrow.left"
                android_material_icon_name="arrow_back"
                size={Platform.OS === 'android' ? scaleIconSize(24) : 24}
                color="#FFFFFF"
              />
              <Text style={[styles.closedButtonText, { fontSize: scaleFontSize(17) }]}>Volver</Text>
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <LinearGradient
        colors={themeColors.background}
        style={styles.container}
      >
        <Stack.Screen
          options={{
            title: local?.nombre || 'Sala Virtual',
            headerLeft: () => (
              <TouchableOpacity onPress={handleCheckOut}>
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
                <View style={[styles.modeIndicator, { backgroundColor: themeColors.primary + '20' }]}>
                  <IconSymbol
                    ios_icon_name={mode === 'day' ? 'sun.max.fill' : 'moon.stars.fill'}
                    android_material_icon_name={mode === 'day' ? 'wb_sunny' : 'nightlight'}
                    size={Platform.OS === 'android' ? scaleIconSize(16) : 16}
                    color={themeColors.primary}
                  />
                </View>
                <View style={[styles.activeUsersIndicator, { backgroundColor: themeColors.primary + '20' }]}>
                  <Animated.View 
                    style={[
                      styles.activeUsersDot,
                      { transform: [{ scale: pulseAnim }], backgroundColor: themeColors.success }
                    ]} 
                  />
                  <Text style={[styles.activeUsersText, { fontSize: scaleFontSize(14), color: themeColors.primary }]}>
                    {activeUsers.length}
                  </Text>
                </View>
              </View>
            ),
          }}
        />

        <View style={styles.content}>
          <View style={[styles.tabBarContainer, { backgroundColor: themeColors.cardBg, borderBottomColor: themeColors.cardBorder }]}>
            <View style={styles.tabBar}>
              <TouchableOpacity
                style={styles.tab}
                onPress={() => setActiveTab('chat')}
                activeOpacity={0.7}
              >
                {activeTab === 'chat' ? (
                  <LinearGradient
                    colors={[themeColors.primary, themeColors.secondary]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.tabGradient}
                  >
                    <IconSymbol
                      ios_icon_name="bubble.left.and.bubble.right.fill"
                      android_material_icon_name="chat"
                      size={Platform.OS === 'android' ? scaleIconSize(22) : 22}
                      color="#FFFFFF"
                    />
                    <Text style={[styles.tabTextActive, { fontSize: scaleFontSize(15) }]}>Chat</Text>
                  </LinearGradient>
                ) : (
                  <View style={styles.tabContent}>
                    <IconSymbol
                      ios_icon_name="bubble.left.and.bubble.right.fill"
                      android_material_icon_name="chat"
                      size={Platform.OS === 'android' ? scaleIconSize(22) : 22}
                      color={themeColors.textSecondary}
                    />
                    <Text style={[styles.tabText, { fontSize: scaleFontSize(15), color: themeColors.textSecondary }]}>
                      Chat
                    </Text>
                  </View>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.tab}
                onPress={() => setActiveTab('users')}
                activeOpacity={0.7}
              >
                {activeTab === 'users' ? (
                  <LinearGradient
                    colors={[themeColors.primary, themeColors.secondary]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.tabGradient}
                  >
                    <IconSymbol
                      ios_icon_name="person.3.fill"
                      android_material_icon_name="group"
                      size={Platform.OS === 'android' ? scaleIconSize(22) : 22}
                      color="#FFFFFF"
                    />
                    <Text style={[styles.tabTextActive, { fontSize: scaleFontSize(15) }]}>Usuarios</Text>
                    <View style={styles.tabBadgeActive}>
                      <Text style={[styles.tabBadgeTextActive, { fontSize: scaleFontSize(12) }]}>
                        {activeUsers.length}
                      </Text>
                    </View>
                  </LinearGradient>
                ) : (
                  <View style={styles.tabContent}>
                    <IconSymbol
                      ios_icon_name="person.3.fill"
                      android_material_icon_name="group"
                      size={Platform.OS === 'android' ? scaleIconSize(22) : 22}
                      color={themeColors.textSecondary}
                    />
                    <Text style={[styles.tabText, { fontSize: scaleFontSize(15), color: themeColors.textSecondary }]}>
                      Usuarios
                    </Text>
                    <View style={[styles.tabBadge, { backgroundColor: themeColors.textSecondary + '30' }]}>
                      <Text style={[styles.tabBadgeText, { fontSize: scaleFontSize(12), color: themeColors.textSecondary }]}>
                        {activeUsers.length}
                      </Text>
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
                    <View style={[styles.emptyIconCircle, { backgroundColor: themeColors.primary + '20' }]}>
                      <IconSymbol
                        ios_icon_name="bubble.left.and.bubble.right"
                        android_material_icon_name="chat"
                        size={Platform.OS === 'android' ? scaleIconSize(48) : 48}
                        color={themeColors.primary}
                      />
                    </View>
                    <Text style={[styles.emptyText, { fontSize: scaleFontSize(18), color: themeColors.text }]}>
                      No hay mensajes todavía
                    </Text>
                    <Text style={[styles.emptySubtext, { fontSize: scaleFontSize(14), color: themeColors.textSecondary }]}>
                      Sé el primero en enviar un mensaje
                    </Text>
                  </View>
                }
              />

              {renderQuickMessagesBar()}

              <View style={[styles.inputContainer, { backgroundColor: themeColors.cardBg, borderTopColor: themeColors.cardBorder }]}>
                <TouchableOpacity
                  style={[styles.quickMessageToggle, { backgroundColor: themeColors.primary + '20' }]}
                  onPress={() => setShowQuickMessages(!showQuickMessages)}
                >
                  <IconSymbol
                    ios_icon_name="bolt.fill"
                    android_material_icon_name="flash_on"
                    size={Platform.OS === 'android' ? scaleIconSize(20) : 20}
                    color={themeColors.primary}
                  />
                </TouchableOpacity>

                <TextInput
                  style={[
                    styles.input,
                    { 
                      fontSize: scaleFontSize(14),
                      backgroundColor: mode === 'day' ? '#FFFFFF' : 'rgba(255, 255, 255, 0.05)',
                      color: themeColors.text,
                      borderColor: themeColors.cardBorder,
                    }
                  ]}
                  placeholder="Escribe un mensaje..."
                  placeholderTextColor={themeColors.textSecondary}
                  value={newMessage}
                  onChangeText={setNewMessage}
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
                  onPress={() => sendPublicMessage(newMessage)}
                  disabled={!newMessage.trim() || sending}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={
                      !newMessage.trim() || sending
                        ? [themeColors.textSecondary, themeColors.textSecondary]
                        : [themeColors.primary, themeColors.secondary]
                    }
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.sendButtonGradient}
                  >
                    {sending ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <IconSymbol
                        ios_icon_name="paperplane.fill"
                        android_material_icon_name="send"
                        size={Platform.OS === 'android' ? scaleIconSize(20) : 20}
                        color="#FFFFFF"
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
                    <View style={[styles.emptyIconCircle, { backgroundColor: themeColors.primary + '20' }]}>
                      <IconSymbol
                        ios_icon_name="person.3"
                        android_material_icon_name="group"
                        size={Platform.OS === 'android' ? scaleIconSize(48) : 48}
                        color={themeColors.primary}
                      />
                    </View>
                    <Text style={[styles.emptyText, { fontSize: scaleFontSize(18), color: themeColors.text }]}>
                      No hay usuarios activos
                    </Text>
                    <Text style={[styles.emptySubtext, { fontSize: scaleFontSize(14), color: themeColors.textSecondary }]}>
                      Sé el primero en entrar
                    </Text>
                  </View>
                }
              />

              <View style={[styles.usersFooter, { backgroundColor: themeColors.cardBg, borderTopColor: themeColors.cardBorder }]}>
                <TouchableOpacity
                  style={[styles.checkOutButtonLarge, { backgroundColor: themeColors.danger + '15', borderColor: themeColors.danger + '30' }]}
                  onPress={handleCheckOut}
                  activeOpacity={0.8}
                >
                  <IconSymbol
                    ios_icon_name="rectangle.portrait.and.arrow.right"
                    android_material_icon_name="logout"
                    size={Platform.OS === 'android' ? scaleIconSize(24) : 24}
                    color={themeColors.danger}
                  />
                  <Text style={[styles.checkOutButtonText, { fontSize: scaleFontSize(16), color: themeColors.danger }]}>
                    Salir de la Sala
                  </Text>
                </TouchableOpacity>
              </View>
            </React.Fragment>
          )}
        </View>

        {renderBubbleCarousel()}

        {showAnimation && (
          <Animated.View
            style={[
              styles.animationOverlay,
              {
                opacity: animationOpacity,
                transform: [{ scale: animationScale }],
              },
            ]}
            pointerEvents="none"
          >
            <Text style={styles.animationEmoji}>{animationEmoji}</Text>
            <Text style={[styles.animationText, { fontSize: scaleFontSize(20), color: themeColors.text }]}>
              ¡Nuevo mensaje!
            </Text>
          </Animated.View>
        )}

        {/* Floating Particles for Reactions */}
        {floatingParticles.map((particle) => (
          <Animated.View
            key={particle.id}
            style={[
              styles.floatingParticle,
              {
                transform: [
                  { translateX: particle.x },
                  { translateY: particle.y },
                  { scale: particle.scale },
                ],
                opacity: particle.opacity,
              },
            ]}
            pointerEvents="none"
          >
            <Text style={styles.floatingParticleEmoji}>{particle.emoji}</Text>
          </Animated.View>
        ))}
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
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
  },
  closedIconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  closedTitle: {
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  closedSubtitle: {
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 16,
  },
  closedDescription: {
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  closedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 20,
  },
  closedButtonText: {
    fontWeight: '800',
    color: '#FFFFFF',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
    gap: 8,
  },
  modeIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeUsersIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  activeUsersDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  activeUsersText: {
    fontWeight: '700',
  },
  content: {
    flex: 1,
  },
  tabBarContainer: {
    borderBottomWidth: 1,
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
  tabGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 12,
  },
  tabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  tabText: {
    fontWeight: '700',
  },
  tabTextActive: {
    fontWeight: '700',
    color: '#FFFFFF',
  },
  tabBadge: {
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
  },
  tabBadgeTextActive: {
    fontWeight: '800',
    color: '#FFFFFF',
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
    marginTop: 8,
  },
  emptySubtext: {
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
    // Dynamic size
  },
  messageAvatarImage: {
    borderWidth: 2,
  },
  messageAvatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  messageBubble: {
    maxWidth: '70%',
    padding: 12,
    borderRadius: 16,
  },
  messageSender: {
    fontWeight: '700',
    marginBottom: 4,
  },
  messageText: {
    lineHeight: 20,
  },
  messageTime: {
    marginTop: 4,
  },
  quickMessagesBar: {
    borderTopWidth: 1,
    paddingVertical: 12,
  },
  quickMessagesContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  quickMessageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 6,
    borderWidth: 2,
    shadowColor: '#EC4899',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 8,
  },
  quickMessageEmoji: {
    fontSize: 18,
  },
  quickMessageText: {
    fontWeight: '600',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    borderTopWidth: 1,
    gap: 8,
  },
  quickMessageToggle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
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
    borderWidth: 1,
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
    borderWidth: 3,
  },
  userCardAvatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
  },
  proximityHalo: {
    position: 'absolute',
    top: -8,
    left: -8,
    right: -8,
    bottom: -8,
    borderRadius: 100,
    zIndex: -1,
  },
  userCardOnlineDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  userCardInfo: {
    flex: 1,
  },
  userCardName: {
    fontWeight: '700',
    marginBottom: 4,
  },
  proximityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  proximityText: {
    fontWeight: '600',
  },
  usersFooter: {
    padding: 16,
    borderTopWidth: 1,
  },
  checkOutButtonLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    opacity: 0.8,
  },
  checkOutButtonText: {
    fontWeight: '600',
    fontSize: scaleFontSize(14),
  },
  bubbleModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  bubbleModalContent: {
    width: '100%',
    maxWidth: 500,
    maxHeight: SCREEN_HEIGHT * 0.8,
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
  },
  bubbleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  bubbleTitle: {
    fontWeight: '700',
    flex: 1,
  },
  bubbleScroll: {
    flex: 1,
  },
  bubbleScrollContent: {
    padding: 20,
  },
  bubbleSection: {
    marginBottom: 24,
  },
  bubbleSectionTitle: {
    fontWeight: '700',
    marginBottom: 12,
  },
  bubbleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginBottom: 10,
    gap: 12,
    borderWidth: 2,
    shadowColor: '#EC4899',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 6,
  },
  bubbleEmoji: {
    fontSize: 24,
  },
  bubbleText: {
    fontWeight: '600',
    flex: 1,
  },
  animationOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    zIndex: 1000,
  },
  animationEmoji: {
    fontSize: 120,
    marginBottom: 20,
  },
  animationText: {
    fontWeight: '800',
    textAlign: 'center',
  },
  floatingParticle: {
    position: 'absolute',
    zIndex: 999,
  },
  floatingParticleEmoji: {
    fontSize: 32,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
});
