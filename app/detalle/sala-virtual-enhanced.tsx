
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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

// Quick Public Messages - WITHOUT "S.O.S"
const QUICK_PUBLIC_MESSAGES = [
  { id: 'q1', text: '¡Salud a todos! 🍻', emoji: '🍻' },
  { id: 'q2', text: '¡Vaya temazo! 🎶', emoji: '🎶' },
  { id: 'q3', text: '¡Qué ambientazo! 🔥', emoji: '🔥' },
  { id: 'q4', text: '¿Quién pide ronda? 🥂', emoji: '🥂' },
];

// Predefined Messages - WITHOUT "S.O.S"
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
    { id: '9', text: 'Mis amigos son unos pesados, ¿me rescatas? 😂', emoji: '😂' },
    { id: '10', text: '¿Te apetece charlar un rato? 😊', emoji: '😊' },
    { id: '11', text: '¿Vienes mucho por aquí? ✨', emoji: '✨' },
  ],
};

const PROXIMITY_THRESHOLD = 5; // meters
const CLOSING_WARNING_THRESHOLD = 60; // 1 hour in minutes

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

interface PrivateChat {
  userId: string;
  username: string;
  nombre: string;
  avatar?: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
}

export default function SalaVirtualEnhancedScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  
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
  const [activeTab, setActiveTab] = useState<'chat' | 'users' | 'private'>('chat');
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [selectedUser, setSelectedUser] = useState<ActiveUser | null>(null);
  const [showBottomSheet, setShowBottomSheet] = useState(false);
  const [showQuickMessages, setShowQuickMessages] = useState(true);
  const [pendingInteractions, setPendingInteractions] = useState<PendingInteraction[]>([]);
  const [showAnimation, setShowAnimation] = useState(false);
  const [animationEmoji, setAnimationEmoji] = useState('');
  const [closingWarning, setClosingWarning] = useState<string | null>(null);
  const [privateChats, setPrivateChats] = useState<PrivateChat[]>([]);
  const [selectedPrivateChat, setSelectedPrivateChat] = useState<PrivateChat | null>(null);
  const [privateChatMessages, setPrivateChatMessages] = useState<Message[]>([]);
  const [floatingParticles, setFloatingParticles] = useState<Array<{
    id: string;
    emoji: string;
    x: Animated.Value;
    y: Animated.Value;
    opacity: Animated.Value;
    scale: Animated.Value;
  }>>([]);
  
  const flatListRef = useRef<FlatList>(null);
  const privateChatListRef = useRef<FlatList>(null);
  const chatChannelRef = useRef<RealtimeChannel | null>(null);
  const presenceChannelRef = useRef<RealtimeChannel | null>(null);
  const checkinsChannelRef = useRef<RealtimeChannel | null>(null);
  const localId = params.localId as string;
  const hasInitialized = useRef(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const bottomSheetAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const animationScale = useRef(new Animated.Value(0)).current;
  const animationOpacity = useRef(new Animated.Value(0)).current;
  const closingCheckInterval = useRef<NodeJS.Timeout | null>(null);

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

  // Check closing time and show warnings
  const checkClosingTime = useCallback(() => {
    if (!local || !local.horarios_completos) return;

    const estadoLocal = getEstadoLocal(local);
    
    if (estadoLocal.estaAbierto && estadoLocal.tiempoRestante) {
      // Parse time remaining to get minutes
      const timeStr = estadoLocal.tiempoRestante;
      let totalMinutes = 0;
      
      // Parse formats like "1 h 30 min", "45 min", "2 h"
      const hoursMatch = timeStr.match(/(\d+)\s*h/);
      const minutesMatch = timeStr.match(/(\d+)\s*min/);
      
      if (hoursMatch) {
        totalMinutes += parseInt(hoursMatch[1]) * 60;
      }
      if (minutesMatch) {
        totalMinutes += parseInt(minutesMatch[1]);
      }
      
      console.log('[SalaVirtual Enhanced] Time until closing:', totalMinutes, 'minutes');
      
      if (totalMinutes <= 15) {
        setClosingWarning('⚠️ El local cerrará en 15 minutos. La sala virtual se cerrará automáticamente.');
      } else if (totalMinutes <= 30) {
        setClosingWarning('⏰ El local cerrará en 30 minutos. La sala virtual se cerrará automáticamente.');
      } else if (totalMinutes <= 60) {
        setClosingWarning('🕐 El local cerrará en una hora. La sala virtual se cerrará automáticamente.');
      } else {
        setClosingWarning(null);
      }
    } else if (!estadoLocal.estaAbierto) {
      // Local is closed
      setLocalClosed(true);
      setClosingWarning(null);
    }
  }, [local]);

  // Check closing time every minute
  useEffect(() => {
    if (local && isCheckedIn) {
      checkClosingTime();
      
      closingCheckInterval.current = setInterval(() => {
        checkClosingTime();
      }, 60000); // Check every minute
      
      return () => {
        if (closingCheckInterval.current) {
          clearInterval(closingCheckInterval.current);
        }
      };
    }
  }, [local, isCheckedIn, checkClosingTime]);

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

      console.log('[SalaVirtual Enhanced] ✅ User checked in successfully');
      
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
      console.log('[SalaVirtual Enhanced] User checking out');
      
      await supabase
        .from('sala_virtual_checkins')
        .update({
          activo: false,
          checked_out_at: new Date().toISOString(),
        })
        .eq('usuario_id', user.id)
        .eq('local_id', localId)
        .eq('activo', true);

      // FIX: Check if we can go back before calling router.back()
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/');
      }
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
      console.log('[SalaVirtual Enhanced] 🔄 Updating active users list');
      
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

      // FIX: Sort users to show current user first
      if (user) {
        users.sort((a, b) => {
          if (a.id === user.id) return -1;
          if (b.id === user.id) return 1;
          return 0;
        });
        console.log('[SalaVirtual Enhanced] ✅ Current user moved to first position');
      }

      console.log('[SalaVirtual Enhanced] ✅ Active users updated:', users.length);
      setActiveUsers(users);
    } catch (error) {
      console.error('[SalaVirtual Enhanced] Error:', error);
    }
  }, [localId, userLocation, user]);

  const loadPrivateChats = useCallback(async () => {
    if (!user || !localId) return;

    try {
      console.log('[SalaVirtual Enhanced] 🔄 Loading private chats');
      
      // Get all private messages where user is sender or recipient
      const { data: privateMessages, error } = await supabase
        .from('sala_virtual_interacciones')
        .select(`
          id,
          usuario_id,
          recipient_id,
          contenido,
          created_at,
          usuario:usuarios!sala_virtual_interacciones_usuario_id_fkey(
            id,
            nombre,
            username,
            avatar
          )
        `)
        .eq('local_id', localId)
        .eq('tipo', 'privado')
        .or(`usuario_id.eq.${user.id},recipient_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[SalaVirtual Enhanced] Error loading private chats:', error);
        return;
      }

      // Group messages by conversation partner
      const chatMap = new Map<string, PrivateChat>();
      
      (privateMessages || []).forEach(msg => {
        const partnerId = msg.usuario_id === user.id ? msg.recipient_id : msg.usuario_id;
        if (!partnerId) return;
        
        if (!chatMap.has(partnerId)) {
          const partnerData = msg.usuario_id === user.id 
            ? activeUsers.find(u => u.id === partnerId)
            : msg.usuario;
          
          if (partnerData) {
            chatMap.set(partnerId, {
              userId: partnerId,
              username: partnerData.username || '',
              nombre: partnerData.nombre || '',
              avatar: partnerData.avatar,
              lastMessage: msg.contenido,
              lastMessageTime: msg.created_at,
              unreadCount: 0, // TODO: Implement unread count
            });
          }
        }
      });
      
      const chats = Array.from(chatMap.values());
      console.log('[SalaVirtual Enhanced] ✅ Private chats loaded:', chats.length);
      setPrivateChats(chats);
    } catch (error) {
      console.error('[SalaVirtual Enhanced] Error loading private chats:', error);
    }
  }, [user, localId, activeUsers]);

  const subscribeToUpdates = useCallback(() => {
    if (!localId || !user) return () => {};

    console.log('[SalaVirtual Enhanced] 📡 Subscribing to real-time updates');

    // ANDROID PERFORMANCE FIX: Reduce channel complexity and error handling
    // Only subscribe to essential channels with simplified configuration
    
    // Chat messages channel - SIMPLIFIED for Android performance
    const chatChannel = supabase
      .channel(`room:${localId}:chat`)
      .on('broadcast', { event: 'message_created' }, (payload) => {
        console.log('[SalaVirtual Enhanced] 📨 New message received via broadcast');
        
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
          
          // CRITICAL FIX: Update private chats list in real-time when receiving private message
          if (newMessage.is_private && newMessage.recipient_id === user.id) {
            console.log('[SalaVirtual Enhanced] 🔄 Private message received, updating chats optimistically');
            
            // Optimistically update the private chats list
            setPrivateChats(prev => {
              const existingChatIndex = prev.findIndex(chat => chat.userId === newMessage.usuario_id);
              
              if (existingChatIndex >= 0) {
                // Update existing chat and move to top
                const updatedChat = {
                  ...prev[existingChatIndex],
                  lastMessage: newMessage.contenido,
                  lastMessageTime: newMessage.created_at,
                  unreadCount: prev[existingChatIndex].unreadCount + 1,
                };
                
                const newChats = [...prev];
                newChats.splice(existingChatIndex, 1);
                return [updatedChat, ...newChats];
              } else {
                // Create new chat entry
                const newChat: PrivateChat = {
                  userId: newMessage.usuario_id,
                  username: newMessage.usuario.username || '',
                  nombre: newMessage.usuario.nombre || 'Usuario',
                  avatar: newMessage.usuario.avatar,
                  lastMessage: newMessage.contenido,
                  lastMessageTime: newMessage.created_at,
                  unreadCount: 1,
                };
                
                return [newChat, ...prev];
              }
            });
            
            // Reload in background to sync with server (increased delay for persistence)
            setTimeout(() => {
              loadPrivateChats();
            }, 2000);
          }
        }
      })
      .subscribe((status) => {
        console.log('[SalaVirtual Enhanced] Chat channel status:', status);
      });

    // Real-time checkins channel - CRITICAL FIX for real-time presence
    const checkinsChannel = supabase
      .channel(`sala_virtual_checkins:${localId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'sala_virtual_checkins',
          filter: `local_id=eq.${localId}`,
        },
        (payload) => {
          console.log('[SalaVirtual Enhanced] 👤 New user checked in:', payload);
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
        (payload) => {
          console.log('[SalaVirtual Enhanced] 👤 User check-in updated:', payload);
          updateActiveUsers();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'sala_virtual_checkins',
          filter: `local_id=eq.${localId}`,
        },
        (payload) => {
          console.log('[SalaVirtual Enhanced] 👤 User checked out:', payload);
          updateActiveUsers();
        }
      )
      .subscribe((status) => {
        console.log('[SalaVirtual Enhanced] Checkins channel status:', status);
      });

    // CRITICAL FIX: Subscribe to private messages database changes for persistence
    const privateMessagesChannel = supabase
      .channel(`private_messages:${localId}:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'sala_virtual_interacciones',
          filter: `local_id=eq.${localId}`,
        },
        (payload) => {
          console.log('[SalaVirtual Enhanced] 💾 Private message inserted in DB:', payload);
          
          const newRecord = payload.new as any;
          
          // Check if it's a private message involving current user
          if (
            newRecord.tipo === 'privado' &&
            (newRecord.usuario_id === user.id || newRecord.recipient_id === user.id)
          ) {
            console.log('[SalaVirtual Enhanced] 🔄 Reloading private chats due to DB insert');
            // Reload private chats to ensure persistence
            setTimeout(() => {
              loadPrivateChats();
            }, 500);
          }
        }
      )
      .subscribe((status) => {
        console.log('[SalaVirtual Enhanced] Private messages DB channel status:', status);
      });

    chatChannelRef.current = chatChannel;
    checkinsChannelRef.current = checkinsChannel;
    presenceChannelRef.current = privateMessagesChannel;

    return () => {
      console.log('[SalaVirtual Enhanced] 🔌 Unsubscribing from channels');
      supabase.removeChannel(chatChannel);
      supabase.removeChannel(checkinsChannel);
      supabase.removeChannel(privateMessagesChannel);
    };
  }, [localId, user, updateActiveUsers, loadPrivateChats]);

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
      await loadPrivateChats();
    };

    init();

    return () => {
      handleCheckOut();
    };
  }, [localId]);

  // FIX: Reload private chats when switching to private tab
  useEffect(() => {
    if (activeTab === 'private' && user && localId) {
      console.log('[SalaVirtual Enhanced] Private tab active, reloading chats for persistence');
      loadPrivateChats();
    }
  }, [activeTab, user, localId, loadPrivateChats]);

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
          nombre: user.user_metadata?.nombre || user.email?.split('@')[0] || 'Usuario',
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
      console.log('[SalaVirtual Enhanced] Sending predefined message:', messageText, 'to:', recipientId);
      
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
          nombre: user.user_metadata?.nombre || user.email?.split('@')[0] || 'Usuario',
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

      // Get recipient info for feedback
      const recipient = activeUsers.find(u => u.id === recipientId);
      const recipientName = recipient?.username 
        ? recipient.username.replace('@', '')
        : recipient?.nombre || 'Usuario';

      // CRITICAL FIX: Optimistically update private chats list IMMEDIATELY
      // This creates the conversation in the UI before the broadcast completes
      const existingChatIndex = privateChats.findIndex(chat => chat.userId === recipientId);
      
      if (existingChatIndex === -1) {
        // Create new chat entry immediately
        const newChat: PrivateChat = {
          userId: recipientId,
          username: recipient?.username || '',
          nombre: recipient?.nombre || 'Usuario',
          avatar: recipient?.avatar,
          lastMessage: messageText,
          lastMessageTime: now,
          unreadCount: 0,
        };
        
        console.log('[SalaVirtual Enhanced] ✨ Creating new private chat optimistically');
        setPrivateChats(prev => [newChat, ...prev]);
        
        // Save to database in background (non-blocking)
        // Note: We don't await this to keep UI responsive
        supabase
          .from('sala_virtual_interacciones')
          .insert({
            usuario_id: user.id,
            local_id: localId,
            tipo: 'privado',
            contenido: messageText,
            recipient_id: recipientId,
          })
          .then(({ error: insertError }) => {
            if (insertError) {
              console.error('[SalaVirtual Enhanced] Error saving private message to DB:', insertError);
            } else {
              console.log('[SalaVirtual Enhanced] ✅ Private message saved to database');
            }
          })
          .catch((dbError) => {
            console.error('[SalaVirtual Enhanced] Database error:', dbError);
          });
      } else {
        // Update existing chat and move to top
        console.log('[SalaVirtual Enhanced] ✨ Updating existing private chat optimistically');
        setPrivateChats(prev => {
          const updatedChat = {
            ...prev[existingChatIndex],
            lastMessage: messageText,
            lastMessageTime: now,
          };
          const newChats = [...prev];
          newChats.splice(existingChatIndex, 1);
          return [updatedChat, ...newChats];
        });
        
        // Save to database in background (non-blocking)
        supabase
          .from('sala_virtual_interacciones')
          .insert({
            usuario_id: user.id,
            local_id: localId,
            tipo: 'privado',
            contenido: messageText,
            recipient_id: recipientId,
          })
          .then(({ error: insertError }) => {
            if (insertError) {
              console.error('[SalaVirtual Enhanced] Error saving private message to DB:', insertError);
            } else {
              console.log('[SalaVirtual Enhanced] ✅ Private message saved to database');
            }
          })
          .catch((dbError) => {
            console.error('[SalaVirtual Enhanced] Database error:', dbError);
          });
      }

      // Broadcast to recipient
      if (chatChannelRef.current) {
        await chatChannelRef.current.send({
          type: 'broadcast',
          event: 'message_created',
          payload: newMsg,
        });
      }

      // Show success feedback with enhanced animation
      console.log(`[SalaVirtual Enhanced] ✅ Message sent to ${recipientName}`);
      
      // Trigger enhanced success animation with sparkles
      setAnimationEmoji('✅');
      setShowAnimation(true);
      
      // Create sparkle particles
      const newSparkles = Array.from({ length: 12 }, (_, index) => ({
        id: `sparkle-${Date.now()}-${index}`,
        emoji: mode === 'night' ? '✨' : '🥂',
        x: new Animated.Value(0),
        y: new Animated.Value(0),
        opacity: new Animated.Value(0),
        scale: new Animated.Value(0),
      }));
      
      setFloatingParticles(prev => [...prev, ...newSparkles]);
      
      // Animate sparkles in a circle
      newSparkles.forEach((sparkle, index) => {
        const angle = (index / newSparkles.length) * Math.PI * 2;
        const distance = 120;
        const targetX = Math.cos(angle) * distance;
        const targetY = Math.sin(angle) * distance;
        
        Animated.parallel([
          Animated.timing(sparkle.x, {
            toValue: targetX,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(sparkle.y, {
            toValue: targetY,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.sequence([
            Animated.timing(sparkle.opacity, {
              toValue: 1,
              duration: 200,
              useNativeDriver: true,
            }),
            Animated.delay(400),
            Animated.timing(sparkle.opacity, {
              toValue: 0,
              duration: 200,
              useNativeDriver: true,
            }),
          ]),
          Animated.sequence([
            Animated.timing(sparkle.scale, {
              toValue: 1,
              duration: 200,
              useNativeDriver: true,
            }),
            Animated.timing(sparkle.scale, {
              toValue: 0,
              duration: 600,
              useNativeDriver: true,
            }),
          ]),
        ]).start(() => {
          setFloatingParticles(current => current.filter(p => p.id !== sparkle.id));
        });
      });
      
      // Main animation
      Animated.parallel([
        Animated.sequence([
          Animated.spring(animationScale, {
            toValue: 1.3,
            friction: 4,
            tension: 40,
            useNativeDriver: true,
          }),
          Animated.spring(animationScale, {
            toValue: 1,
            friction: 6,
            tension: 40,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(animationOpacity, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.delay(1200),
          Animated.timing(animationOpacity, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }),
        ]),
      ]).start(() => {
        setShowAnimation(false);
        animationScale.setValue(0);
        animationOpacity.setValue(0);
      });

      closeBottomSheet();
      
      // Switch to private tab to show the conversation
      console.log('[SalaVirtual Enhanced] 🔄 Switching to private conversations tab');
      setActiveTab('private');
      
      // Reload private chats in background to sync with server (increased delay for persistence)
      setTimeout(() => {
        loadPrivateChats();
      }, 2000);
    } catch (error) {
      console.error('[SalaVirtual Enhanced] Error sending predefined message:', error);
      
      // Show error feedback
      setAnimationEmoji('❌');
      setShowAnimation(true);
      
      Animated.parallel([
        Animated.timing(animationScale, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.timing(animationOpacity, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.delay(1500),
          Animated.timing(animationOpacity, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ]),
      ]).start(() => {
        setShowAnimation(false);
        animationScale.setValue(0);
        animationOpacity.setValue(0);
      });
    }
  }, [user, localId, activeUsers, loadPrivateChats, privateChats, animationScale, animationOpacity, mode]);

  const sendPrivateMessage = useCallback(async (recipientId: string, content: string) => {
    if (!user || !localId || !content.trim()) return;

    try {
      console.log('[SalaVirtual Enhanced] Sending private message to:', recipientId);
      
      const messageId = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const now = new Date().toISOString();

      const newMsg: Message = {
        id: messageId,
        usuario_id: user.id,
        local_id: localId,
        tipo: 'mensaje',
        contenido: content,
        created_at: now,
        is_private: true,
        recipient_id: recipientId,
        usuario: {
          id: user.id,
          nombre: user.user_metadata?.nombre || user.email?.split('@')[0] || 'Usuario',
          username: user.user_metadata?.username,
          avatar: user.user_metadata?.avatar,
        },
      };

      // Add to private chat messages
      setPrivateChatMessages((prev) => [...prev, newMsg]);
      
      // CRITICAL FIX: Update private chats list optimistically
      setPrivateChats(prev => {
        const existingChatIndex = prev.findIndex(chat => chat.userId === recipientId);
        
        if (existingChatIndex >= 0) {
          // Update existing chat and move to top
          const updatedChat = {
            ...prev[existingChatIndex],
            lastMessage: content,
            lastMessageTime: now,
          };
          
          const newChats = [...prev];
          newChats.splice(existingChatIndex, 1);
          return [updatedChat, ...newChats];
        } else {
          // This shouldn't happen as we're in an existing chat, but handle it
          const recipient = activeUsers.find(u => u.id === recipientId);
          if (recipient) {
            const newChat: PrivateChat = {
              userId: recipientId,
              username: recipient.username || '',
              nombre: recipient.nombre || 'Usuario',
              avatar: recipient.avatar,
              lastMessage: content,
              lastMessageTime: now,
              unreadCount: 0,
            };
            return [newChat, ...prev];
          }
          return prev;
        }
      });
      
      // Save to database in background (non-blocking)
      supabase
        .from('sala_virtual_interacciones')
        .insert({
          usuario_id: user.id,
          local_id: localId,
          tipo: 'privado',
          contenido: content,
          recipient_id: recipientId,
        })
        .then(({ error: insertError }) => {
          if (insertError) {
            console.error('[SalaVirtual Enhanced] Error saving private message to DB:', insertError);
          } else {
            console.log('[SalaVirtual Enhanced] ✅ Private message saved to database');
          }
        })
        .catch((dbError) => {
          console.error('[SalaVirtual Enhanced] Database error:', dbError);
        });
      
      // Broadcast to recipient
      if (chatChannelRef.current) {
        await chatChannelRef.current.send({
          type: 'broadcast',
          event: 'message_created',
          payload: newMsg,
        });
      }

      console.log('[SalaVirtual Enhanced] ✅ Private message sent');
    } catch (error) {
      console.error('[SalaVirtual Enhanced] Error sending private message:', error);
    }
  }, [user, localId, activeUsers]);

  const openPrivateChat = useCallback(async (chat: PrivateChat) => {
    if (!user || !localId) return;

    try {
      const displayName = chat.username 
        ? chat.username.replace('@', '')
        : chat.nombre;
      
      console.log('[SalaVirtual Enhanced] Opening private chat with:', displayName);
      
      setSelectedPrivateChat(chat);
      
      // Load messages for this conversation
      const { data, error } = await supabase
        .from('sala_virtual_interacciones')
        .select(`
          id,
          usuario_id,
          recipient_id,
          contenido,
          tipo,
          created_at,
          usuario:usuarios!sala_virtual_interacciones_usuario_id_fkey(
            id,
            nombre,
            username,
            avatar
          )
        `)
        .eq('local_id', localId)
        .eq('tipo', 'privado')
        .or(`and(usuario_id.eq.${user.id},recipient_id.eq.${chat.userId}),and(usuario_id.eq.${chat.userId},recipient_id.eq.${user.id})`)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('[SalaVirtual Enhanced] Error loading private messages:', error);
        return;
      }

      const formattedMessages: Message[] = (data || []).map(msg => ({
        id: msg.id,
        usuario_id: msg.usuario_id,
        local_id: localId,
        tipo: msg.tipo as 'mensaje' | 'emoticon' | 'predefinido',
        contenido: msg.contenido,
        created_at: msg.created_at,
        is_private: true,
        recipient_id: msg.recipient_id,
        usuario: msg.usuario,
      }));

      setPrivateChatMessages(formattedMessages);
      console.log('[SalaVirtual Enhanced] ✅ Private messages loaded:', formattedMessages.length);
    } catch (error) {
      console.error('[SalaVirtual Enhanced] Error opening private chat:', error);
    }
  }, [user, localId, activeUsers]);

  const closePrivateChat = useCallback(() => {
    console.log('[SalaVirtual Enhanced] Closing private chat');
    setSelectedPrivateChat(null);
    setPrivateChatMessages([]);
  }, []);

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
    const displayName = selectedUser.username 
      ? selectedUser.username.replace('@', '')
      : selectedUser.nombre;
    
    console.log('[SalaVirtual Enhanced] User pressed:', displayName);
    
    if (selectedUser.id === user?.id) {
      console.log('[SalaVirtual Enhanced] Cannot interact with self');
      return;
    }
    
    console.log('[SalaVirtual Enhanced] Opening bottom sheet for user');
    setSelectedUser(selectedUser);
    setShowBottomSheet(true);

    // Animate bottom sheet up
    Animated.spring(bottomSheetAnim, {
      toValue: 0,
      friction: 8,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  const closeBottomSheet = () => {
    console.log('[SalaVirtual Enhanced] Closing bottom sheet');
    Animated.timing(bottomSheetAnim, {
      toValue: SCREEN_HEIGHT,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      setShowBottomSheet(false);
      setSelectedUser(null);
    });
  };

  const handleViewProfile = () => {
    if (!selectedUser) return;
    
    console.log('[SalaVirtual Enhanced] Navigating to profile:', selectedUser.id);
    closeBottomSheet();
    router.push(`/perfil/usuario?id=${selectedUser.id}`);
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isOwnMessage = user && item.usuario_id === user.id;
    const avatarSize = Platform.OS === 'android' ? scaleIconSize(36) : 36;

    // Don't render private messages not addressed to current user
    if (item.is_private && item.recipient_id !== user?.id && item.usuario_id !== user?.id) {
      return null;
    }

    const messageLabel = item.is_private ? '(Privado)' : '';
    
    // FIX: Display username without @ symbol, or nombre if no username
    const displayUsername = item.usuario.username 
      ? item.usuario.username.replace('@', '')
      : item.usuario.nombre;

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
                {displayUsername} {messageLabel}
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

  const renderUserItem = ({ item, index }: { item: ActiveUser; index: number }) => {
    const isCurrentUser = user && item.id === user.id;
    const isNearby = item.distance !== undefined && item.distance < PROXIMITY_THRESHOLD;
    const avatarSize = Platform.OS === 'android' ? scaleIconSize(70) : 70;
    
    // FIX: Display username without @ symbol, or nombre if no username
    const displayName = item.username 
      ? item.username.replace('@', '')
      : item.nombre;
    
    const distanceText = item.distance !== undefined ? `${item.distance.toFixed(0)}m` : '';

    return (
      <TouchableOpacity
        style={[
          styles.gridUserCard,
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
          console.log('[SalaVirtual Enhanced] Grid user card pressed:', displayName, 'isCurrentUser:', isCurrentUser);
          // FIX: Allow clicking on own avatar to view profile
          if (isCurrentUser) {
            console.log('[SalaVirtual Enhanced] Navigating to own profile');
            router.push('/perfil');
          } else {
            handleUserPress(item);
          }
        }}
        activeOpacity={0.7}
      >
        <View style={styles.gridUserAvatarContainer}>
          {item.avatar ? (
            <Image
              source={resolveImageSource(item.avatar)}
              style={[
                styles.gridUserAvatar,
                { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 },
                isNearby && { borderColor: themeColors.primary, borderWidth: 3 },
              ]}
            />
          ) : (
            <View style={[
              styles.gridUserAvatarPlaceholder,
              { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2, backgroundColor: themeColors.primary + '30' },
              isNearby && { borderColor: themeColors.primary, borderWidth: 3 },
            ]}>
              <IconSymbol
                ios_icon_name="person.fill"
                android_material_icon_name="person"
                size={Platform.OS === 'android' ? scaleIconSize(32) : 32}
                color={themeColors.text}
              />
            </View>
          )}
          {isNearby && (
            <Animated.View 
              style={[
                styles.gridProximityHalo,
                { 
                  transform: [{ scale: pulseAnim }],
                  backgroundColor: themeColors.primary + '40',
                }
              ]} 
            />
          )}
          <Animated.View 
            style={[
              styles.gridUserOnlineDot,
              { transform: [{ scale: pulseAnim }], backgroundColor: themeColors.success }
            ]} 
          />
        </View>
        
        <Text 
          style={[styles.gridUserName, { fontSize: scaleFontSize(13), color: themeColors.text }]}
          numberOfLines={2}
          ellipsizeMode="tail"
        >
          {displayName}
          {isCurrentUser && '\n(Tú)'}
        </Text>
        
        {isNearby && (
          <View style={[styles.gridProximityBadge, { backgroundColor: themeColors.primary + '20' }]}>
            <Text style={[styles.gridProximityText, { fontSize: scaleFontSize(10), color: themeColors.primary }]}>
              {distanceText}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderPrivateChatItem = ({ item }: { item: PrivateChat }) => {
    const avatarSize = Platform.OS === 'android' ? scaleIconSize(56) : 56;
    
    // FIX: Display username without @ symbol, or nombre if no username
    const displayName = item.username 
      ? item.username.replace('@', '')
      : item.nombre;
    
    const timeAgo = (() => {
      const now = new Date();
      const messageTime = new Date(item.lastMessageTime);
      const diffMs = now.getTime() - messageTime.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      
      if (diffMins < 1) return 'Ahora';
      if (diffMins < 60) return `${diffMins} min`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours} h`;
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays} d`;
    })();

    return (
      <TouchableOpacity
        style={[styles.privateChatItem, { backgroundColor: themeColors.cardBg, borderColor: themeColors.cardBorder }]}
        onPress={() => openPrivateChat(item)}
        activeOpacity={0.7}
      >
        <View style={styles.privateChatAvatar}>
          {item.avatar ? (
            <Image
              source={resolveImageSource(item.avatar)}
              style={[styles.privateChatAvatarImage, { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 }]}
            />
          ) : (
            <View style={[styles.privateChatAvatarPlaceholder, { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2, backgroundColor: themeColors.primary + '30' }]}>
              <IconSymbol
                ios_icon_name="person.fill"
                android_material_icon_name="person"
                size={Platform.OS === 'android' ? scaleIconSize(28) : 28}
                color={themeColors.text}
              />
            </View>
          )}
          <Animated.View 
            style={[
              styles.privateChatOnlineDot,
              { transform: [{ scale: pulseAnim }], backgroundColor: themeColors.success }
            ]} 
          />
        </View>
        
        <View style={styles.privateChatInfo}>
          <View style={styles.privateChatHeader}>
            <Text style={[styles.privateChatName, { fontSize: scaleFontSize(16), color: themeColors.text }]} numberOfLines={1}>
              {displayName}
            </Text>
            <Text style={[styles.privateChatTime, { fontSize: scaleFontSize(12), color: themeColors.textSecondary }]}>
              {timeAgo}
            </Text>
          </View>
          <Text style={[styles.privateChatLastMessage, { fontSize: scaleFontSize(14), color: themeColors.textSecondary }]} numberOfLines={1}>
            {item.lastMessage}
          </Text>
        </View>
        
        {item.unreadCount > 0 && (
          <View style={[styles.privateChatUnreadBadge, { backgroundColor: themeColors.primary }]}>
            <Text style={[styles.privateChatUnreadText, { fontSize: scaleFontSize(12) }]}>
              {item.unreadCount}
            </Text>
          </View>
        )}
      </TouchableOpacity>
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

  const renderBottomSheet = () => {
    if (!showBottomSheet || !selectedUser) return null;

    // FIX: Display username without @ symbol
    const recipientName = selectedUser.username 
      ? selectedUser.username.replace('@', '')
      : selectedUser.nombre;

    return (
      <React.Fragment>
        <TouchableOpacity
          style={styles.bottomSheetOverlay}
          activeOpacity={1}
          onPress={closeBottomSheet}
        />
        <Animated.View
          style={[
            styles.bottomSheet,
            {
              backgroundColor: themeColors.cardBg,
              borderTopColor: themeColors.cardBorder,
              transform: [{ translateY: bottomSheetAnim }],
            },
            mode === 'night' && {
              shadowColor: themeColors.glow,
              shadowOffset: { width: 0, height: -4 },
              shadowOpacity: 0.8,
              shadowRadius: 20,
              elevation: 20,
            },
          ]}
        >
          <View style={[styles.bottomSheetHandle, { backgroundColor: themeColors.textSecondary + '40' }]} />
          
          <ScrollView style={styles.bottomSheetScroll} contentContainerStyle={styles.bottomSheetContent}>
            <View style={[styles.bottomSheetHeader, { borderBottomColor: themeColors.cardBorder }]}>
              <Text style={[styles.bottomSheetTitle, { fontSize: scaleFontSize(20), color: themeColors.text }]}>
                Enviar mensaje a {recipientName}
              </Text>
              <TouchableOpacity onPress={closeBottomSheet}>
                <IconSymbol
                  ios_icon_name="xmark.circle.fill"
                  android_material_icon_name="cancel"
                  size={Platform.OS === 'android' ? scaleIconSize(28) : 28}
                  color={themeColors.textSecondary}
                />
              </TouchableOpacity>
            </View>

            {/* View Profile Button */}
            <View style={styles.profileSection}>
              <TouchableOpacity
                style={[
                  styles.profileButton,
                  { 
                    backgroundColor: themeColors.primary + '20',
                    borderColor: themeColors.primary + '40',
                  },
                ]}
                onPress={handleViewProfile}
                activeOpacity={0.7}
              >
                <IconSymbol
                  ios_icon_name="person.circle.fill"
                  android_material_icon_name="account_circle"
                  size={Platform.OS === 'android' ? scaleIconSize(24) : 24}
                  color={themeColors.primary}
                />
                <Text style={[styles.profileButtonText, { fontSize: scaleFontSize(15), color: themeColors.text }]}>
                  Ver Perfil de {recipientName}
                </Text>
                <IconSymbol
                  ios_icon_name="chevron.right"
                  android_material_icon_name="chevron_right"
                  size={Platform.OS === 'android' ? scaleIconSize(20) : 20}
                  color={themeColors.primary}
                />
              </TouchableOpacity>
            </View>

            <View style={[styles.divider, { backgroundColor: themeColors.cardBorder }]} />

            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { fontSize: scaleFontSize(14), color: themeColors.textSecondary }]}>
                💃 Ligar / Atrevido
              </Text>
              {PREDEFINED_MESSAGES.flirtatious.map((msg) => (
                <TouchableOpacity
                  key={msg.id}
                  style={[
                    styles.messageButton,
                    { backgroundColor: themeColors.primary + '15', borderColor: themeColors.primary + '30' },
                  ]}
                  onPress={() => sendPredefinedMessage(selectedUser.id, msg.text)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.messageEmoji}>{msg.emoji}</Text>
                  <Text style={[styles.messageText, { fontSize: scaleFontSize(14), color: themeColors.text }]}>
                    {msg.text}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { fontSize: scaleFontSize(14), color: themeColors.textSecondary }]}>
                🥂 Invitación
              </Text>
              {PREDEFINED_MESSAGES.invitation.map((msg) => (
                <TouchableOpacity
                  key={msg.id}
                  style={[
                    styles.messageButton,
                    { backgroundColor: themeColors.secondary + '15', borderColor: themeColors.secondary + '30' },
                  ]}
                  onPress={() => sendPredefinedMessage(selectedUser.id, msg.text)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.messageEmoji}>{msg.emoji}</Text>
                  <Text style={[styles.messageText, { fontSize: scaleFontSize(14), color: themeColors.text }]}>
                    {msg.text}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { fontSize: scaleFontSize(14), color: themeColors.textSecondary }]}>
                😊 Rompehielos
              </Text>
              {PREDEFINED_MESSAGES.icebreaker.map((msg) => (
                <TouchableOpacity
                  key={msg.id}
                  style={[
                    styles.messageButton,
                    { backgroundColor: themeColors.accent + '15', borderColor: themeColors.accent + '30' },
                  ]}
                  onPress={() => sendPredefinedMessage(selectedUser.id, msg.text)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.messageEmoji}>{msg.emoji}</Text>
                  <Text style={[styles.messageText, { fontSize: scaleFontSize(14), color: themeColors.text }]}>
                    {msg.text}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </Animated.View>
      </React.Fragment>
    );
  };

  if (!user) {
    return (
      <View style={[styles.container, { backgroundColor: themeColors.background[0] }]}>
        <Stack.Screen
          options={{
            title: 'Sala Virtual',
            headerLeft: () => (
              <TouchableOpacity onPress={() => {
                if (router.canGoBack()) {
                  router.back();
                } else {
                  router.replace('/');
                }
              }}>
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
              <TouchableOpacity onPress={() => {
                if (router.canGoBack()) {
                  router.back();
                } else {
                  router.replace('/');
                }
              }}>
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
              onPress={() => {
                if (router.canGoBack()) {
                  router.back();
                } else {
                  router.replace('/');
                }
              }}
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

  // Render private chat view
  if (selectedPrivateChat) {
    const displayName = selectedPrivateChat.username 
      ? selectedPrivateChat.username.replace('@', '')
      : selectedPrivateChat.nombre;
    
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
              title: displayName,
              headerLeft: () => (
                <TouchableOpacity onPress={closePrivateChat}>
                  <IconSymbol
                    ios_icon_name="chevron.left"
                    android_material_icon_name="arrow_back"
                    size={Platform.OS === 'android' ? scaleIconSize(24) : 24}
                    color={colors.text}
                  />
                </TouchableOpacity>
              ),
            }}
          />

          <FlatList
            ref={privateChatListRef}
            data={privateChatMessages}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id}
            contentContainerStyle={[styles.messagesContent, { paddingBottom: insets.bottom + 80 }]}
            onContentSizeChange={() => {
              privateChatListRef.current?.scrollToEnd({ animated: true });
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
                  Inicia la conversación
                </Text>
              </View>
            }
          />

          <View style={[
            styles.inputContainer, 
            { 
              backgroundColor: themeColors.cardBg, 
              borderTopColor: themeColors.cardBorder,
              paddingBottom: Platform.OS === 'android' ? insets.bottom + 12 : 12,
            }
          ]}>
            <TextInput
              style={[
                styles.inputPrivate,
                { 
                  fontSize: scaleFontSize(14),
                  backgroundColor: mode === 'day' ? '#FFFFFF' : 'rgba(255, 255, 255, 0.05)',
                  color: themeColors.text,
                  borderColor: themeColors.cardBorder,
                }
              ]}
              placeholder="Escribe un mensaje privado..."
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
              onPress={() => {
                sendPrivateMessage(selectedPrivateChat.userId, newMessage);
                setNewMessage('');
              }}
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
        </LinearGradient>
      </KeyboardAvoidingView>
    );
  }

  // FIX: Android status bar overlap - add top padding
  const androidTopPadding = Platform.OS === 'android' ? Math.max(insets.top, 24) : 0;

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
                {/* FIX: Android close button - visible exit button */}
                {Platform.OS === 'android' && (
                  <TouchableOpacity
                    onPress={handleCheckOut}
                    style={[styles.androidCloseButton, { backgroundColor: themeColors.danger + '20' }]}
                    activeOpacity={0.7}
                  >
                    <IconSymbol
                      ios_icon_name="xmark.circle.fill"
                      android_material_icon_name="cancel"
                      size={scaleIconSize(20)}
                      color={themeColors.danger}
                    />
                  </TouchableOpacity>
                )}
              </View>
            ),
          }}
        />

        {/* Closing Warning Banner */}
        {closingWarning && (
          <View style={[
            styles.warningBanner, 
            { 
              backgroundColor: themeColors.accent + '20', 
              borderBottomColor: themeColors.accent,
            }
          ]}>
            <IconSymbol
              ios_icon_name="exclamationmark.triangle.fill"
              android_material_icon_name="warning"
              size={Platform.OS === 'android' ? scaleIconSize(20) : 20}
              color={themeColors.accent}
            />
            <Text style={[styles.warningText, { fontSize: scaleFontSize(13), color: themeColors.text }]}>
              {closingWarning}
            </Text>
          </View>
        )}

        <View style={styles.content}>
          <View style={[
            styles.tabBarContainer, 
            { 
              backgroundColor: themeColors.cardBg, 
              borderBottomColor: themeColors.cardBorder,
              paddingTop: androidTopPadding,
            }
          ]}>
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
                    style={[
                      styles.tabGradient,
                      mode === 'night' && {
                        shadowColor: themeColors.primary,
                        shadowOffset: { width: 0, height: 0 },
                        shadowOpacity: 0.8,
                        shadowRadius: 12,
                        elevation: 8,
                      }
                    ]}
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
                  <View style={[
                    styles.tabContent,
                    { 
                      backgroundColor: mode === 'day' ? 'rgba(0, 0, 0, 0.03)' : 'rgba(255, 255, 255, 0.05)',
                      borderRadius: 12,
                    }
                  ]}>
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
                    style={[
                      styles.tabGradient,
                      mode === 'night' && {
                        shadowColor: themeColors.primary,
                        shadowOffset: { width: 0, height: 0 },
                        shadowOpacity: 0.8,
                        shadowRadius: 12,
                        elevation: 8,
                      }
                    ]}
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
                  <View style={[
                    styles.tabContent,
                    { 
                      backgroundColor: mode === 'day' ? 'rgba(0, 0, 0, 0.03)' : 'rgba(255, 255, 255, 0.05)',
                      borderRadius: 12,
                    }
                  ]}>
                    <IconSymbol
                      ios_icon_name="person.3.fill"
                      android_material_icon_name="group"
                      size={Platform.OS === 'android' ? scaleIconSize(22) : 22}
                      color={themeColors.textSecondary}
                    />
                    <Text style={[styles.tabText, { fontSize: scaleFontSize(15), color: themeColors.textSecondary }]}>
                      Usuarios
                    </Text>
                    <View style={[styles.tabBadge, { backgroundColor: themeColors.primary + '30' }]}>
                      <Text style={[styles.tabBadgeText, { fontSize: scaleFontSize(12), color: themeColors.primary }]}>
                        {activeUsers.length}
                      </Text>
                    </View>
                  </View>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.tab}
                onPress={() => {
                  console.log('[SalaVirtual Enhanced] Switching to private tab, reloading chats');
                  setActiveTab('private');
                  // Force reload to ensure persistence
                  loadPrivateChats();
                }}
                activeOpacity={0.7}
              >
                {activeTab === 'private' ? (
                  <LinearGradient
                    colors={[themeColors.primary, themeColors.secondary]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[
                      styles.tabGradient,
                      mode === 'night' && {
                        shadowColor: themeColors.primary,
                        shadowOffset: { width: 0, height: 0 },
                        shadowOpacity: 0.8,
                        shadowRadius: 12,
                        elevation: 8,
                      }
                    ]}
                  >
                    <IconSymbol
                      ios_icon_name="lock.fill"
                      android_material_icon_name="lock"
                      size={Platform.OS === 'android' ? scaleIconSize(22) : 22}
                      color="#FFFFFF"
                    />
                    <Text style={[styles.tabTextActive, { fontSize: scaleFontSize(15) }]}>Privados</Text>
                    {privateChats.length > 0 && (
                      <View style={styles.tabBadgeActive}>
                        <Text style={[styles.tabBadgeTextActive, { fontSize: scaleFontSize(12) }]}>
                          {privateChats.length}
                        </Text>
                      </View>
                    )}
                  </LinearGradient>
                ) : (
                  <View style={[
                    styles.tabContent,
                    { 
                      backgroundColor: mode === 'day' ? 'rgba(0, 0, 0, 0.03)' : 'rgba(255, 255, 255, 0.05)',
                      borderRadius: 12,
                    }
                  ]}>
                    <IconSymbol
                      ios_icon_name="lock.fill"
                      android_material_icon_name="lock"
                      size={Platform.OS === 'android' ? scaleIconSize(22) : 22}
                      color={themeColors.textSecondary}
                    />
                    <Text style={[styles.tabText, { fontSize: scaleFontSize(15), color: themeColors.textSecondary }]}>
                      Privados
                    </Text>
                    {privateChats.length > 0 && (
                      <View style={[styles.tabBadge, { backgroundColor: themeColors.primary + '30' }]}>
                        <Text style={[styles.tabBadgeText, { fontSize: scaleFontSize(12), color: themeColors.primary }]}>
                          {privateChats.length}
                        </Text>
                      </View>
                    )}
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
                contentContainerStyle={[styles.messagesContent, { paddingBottom: insets.bottom + 80 }]}
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

              {showQuickMessages && renderQuickMessagesBar()}

              <View style={[
                styles.inputContainer, 
                { 
                  backgroundColor: themeColors.cardBg, 
                  borderTopColor: themeColors.cardBorder,
                  paddingBottom: Platform.OS === 'android' ? insets.bottom + 12 : 12,
                }
              ]}>
                <TouchableOpacity
                  style={[
                    styles.quickMessageToggle,
                    { backgroundColor: showQuickMessages ? themeColors.primary : themeColors.primary + '20' }
                  ]}
                  onPress={() => {
                    console.log('[SalaVirtual Enhanced] Toggling quick messages:', !showQuickMessages);
                    setShowQuickMessages(!showQuickMessages);
                  }}
                  activeOpacity={0.7}
                >
                  <IconSymbol
                    ios_icon_name="bolt.fill"
                    android_material_icon_name="flash_on"
                    size={Platform.OS === 'android' ? scaleIconSize(20) : 20}
                    color={showQuickMessages ? '#FFFFFF' : themeColors.primary}
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
          ) : activeTab === 'users' ? (
            <React.Fragment>
              <FlatList
                key="users-grid"
                data={activeUsers}
                renderItem={renderUserItem}
                keyExtractor={(item) => item.id}
                numColumns={4}
                contentContainerStyle={[styles.usersGridContent, { paddingBottom: insets.bottom + 80 }]}
                columnWrapperStyle={styles.usersGridRow}
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

              <View style={[
                styles.usersFooter, 
                { 
                  backgroundColor: themeColors.cardBg, 
                  borderTopColor: themeColors.cardBorder,
                  paddingBottom: Platform.OS === 'android' ? insets.bottom + 12 : 12,
                }
              ]}>
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
          ) : (
            <React.Fragment>
              <FlatList
                data={privateChats}
                renderItem={renderPrivateChatItem}
                keyExtractor={(item) => item.userId}
                contentContainerStyle={[styles.privateChatsContent, { paddingBottom: insets.bottom + 80 }]}
                ListEmptyComponent={
                  <View style={styles.emptyContainer}>
                    <View style={[styles.emptyIconCircle, { backgroundColor: themeColors.primary + '20' }]}>
                      <IconSymbol
                        ios_icon_name="lock.fill"
                        android_material_icon_name="lock"
                        size={Platform.OS === 'android' ? scaleIconSize(48) : 48}
                        color={themeColors.primary}
                      />
                    </View>
                    <Text style={[styles.emptyText, { fontSize: scaleFontSize(18), color: themeColors.text }]}>
                      No hay conversaciones privadas
                    </Text>
                    <Text style={[styles.emptySubtext, { fontSize: scaleFontSize(14), color: themeColors.textSecondary }]}>
                      Envía un mensaje rápido a alguien desde la pestaña Usuarios
                    </Text>
                  </View>
                }
              />

              <View style={[
                styles.usersFooter, 
                { 
                  backgroundColor: themeColors.cardBg, 
                  borderTopColor: themeColors.cardBorder,
                  paddingBottom: Platform.OS === 'android' ? insets.bottom + 12 : 12,
                }
              ]}>
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

        {renderBottomSheet()}

        {showAnimation && (
          <Animated.View
            style={[
              styles.animationOverlay,
              {
                opacity: animationOpacity,
              },
            ]}
            pointerEvents="none"
          >
            <Animated.View
              style={[
                styles.animationContent,
                {
                  transform: [{ scale: animationScale }],
                },
              ]}
            >
              <View style={[
                styles.animationCircle,
                {
                  backgroundColor: animationEmoji === '✅' ? themeColors.success + '20' : themeColors.danger + '20',
                  borderColor: animationEmoji === '✅' ? themeColors.success : themeColors.danger,
                  borderWidth: 3,
                  shadowColor: animationEmoji === '✅' ? themeColors.success : themeColors.danger,
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: 0.8,
                  shadowRadius: 20,
                  elevation: 10,
                }
              ]}>
                <Text style={styles.animationEmoji}>{animationEmoji}</Text>
              </View>
              <Text style={[styles.animationText, { fontSize: scaleFontSize(22), color: '#FFFFFF', fontWeight: '800' }]}>
                {animationEmoji === '✅' ? '¡Mensaje enviado!' : animationEmoji === '❌' ? 'Error al enviar' : '¡Nuevo mensaje!'}
              </Text>
            </Animated.View>
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
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 2,
  },
  warningText: {
    flex: 1,
    fontWeight: '600',
    lineHeight: 18,
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
  androidCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  content: {
    flex: 1,
  },
  tabBarContainer: {
    borderBottomWidth: 2,
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    paddingVertical: 12,
    gap: 8,
  },
  tab: {
    flex: 1,
  },
  tabGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
  },
  tabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  tabText: {
    fontWeight: '600',
  },
  tabTextActive: {
    fontWeight: '800',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  tabBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    minWidth: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  tabBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    minWidth: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  tabBadgeText: {
    fontWeight: '700',
  },
  tabBadgeTextActive: {
    fontWeight: '900',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  messagesContent: {
    padding: 16,
    flexGrow: 1,
  },
  usersGridContent: {
    padding: 12,
    flexGrow: 1,
  },
  usersGridRow: {
    justifyContent: 'flex-start',
    gap: 8,
  },
  privateChatsContent: {
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
  inputPrivate: {
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
  gridUserCard: {
    width: (SCREEN_WIDTH - 64) / 4,
    alignItems: 'center',
    padding: 8,
    borderRadius: 12,
  },
  gridUserAvatarContainer: {
    position: 'relative',
    marginBottom: 8,
  },
  gridUserAvatar: {
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  gridUserAvatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  gridProximityHalo: {
    position: 'absolute',
    top: -8,
    left: -8,
    right: -8,
    bottom: -8,
    borderRadius: 100,
    zIndex: -1,
  },
  gridUserOnlineDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  gridUserName: {
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 16,
    minHeight: 32,
  },
  gridProximityBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: 4,
  },
  gridProximityText: {
    fontWeight: '700',
  },
  privateChatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    gap: 12,
    borderWidth: 1,
  },
  privateChatAvatar: {
    position: 'relative',
  },
  privateChatAvatarImage: {
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  privateChatAvatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  privateChatOnlineDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  privateChatInfo: {
    flex: 1,
  },
  privateChatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  privateChatName: {
    fontWeight: '700',
    flex: 1,
  },
  privateChatTime: {
    marginLeft: 8,
  },
  privateChatLastMessage: {
    lineHeight: 18,
  },
  privateChatUnreadBadge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  privateChatUnreadText: {
    fontWeight: '800',
    color: '#FFFFFF',
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
  },
  bottomSheetOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 999,
  },
  bottomSheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: SCREEN_HEIGHT * 0.85,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 2,
    zIndex: 1000,
  },
  bottomSheetHandle: {
    width: 40,
    height: 5,
    borderRadius: 3,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  bottomSheetScroll: {
    flex: 1,
  },
  bottomSheetContent: {
    padding: 20,
  },
  bottomSheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 16,
    borderBottomWidth: 1,
    marginBottom: 16,
  },
  bottomSheetTitle: {
    fontWeight: '700',
    flex: 1,
  },
  profileSection: {
    marginBottom: 16,
  },
  profileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    gap: 12,
    borderWidth: 2,
  },
  profileButtonText: {
    fontWeight: '700',
    flex: 1,
  },
  divider: {
    height: 1,
    marginVertical: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontWeight: '700',
    marginBottom: 12,
  },
  messageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginBottom: 10,
    gap: 12,
    borderWidth: 2,
  },
  messageEmoji: {
    fontSize: 24,
  },
  animationOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    zIndex: 1000,
  },
  animationContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  animationCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  animationEmoji: {
    fontSize: 80,
  },
  animationText: {
    fontWeight: '800',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
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
