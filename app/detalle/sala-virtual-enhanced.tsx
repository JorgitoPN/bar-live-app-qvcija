
// ✅ SALA VIRTUAL v6.2 - AUTO-CLOSE BUG FIX
console.log("✅ SALA VIRTUAL v6.2 - AUTO-CLOSE BUG FIX");

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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
  Modal,
  Pressable,
  Keyboard,
  ImageBackground,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { LinearGradient } from 'expo-linear-gradient';
import { getEstadoLocal } from '@/utils/timeUtils';
import type { RealtimeChannel } from '@supabase/supabase-js';
import LoginPrompt from '@/components/common/LoginPrompt';
import VirtualRoomLoginModal from '@/components/common/VirtualRoomLoginModal';
import { scaleFontSize, scaleIconSize, getActionButtonPaddingVertical } from '@/utils/androidScaling';
import * as Location from 'expo-location';
import { calcularDistancia } from '@/utils/locationUtils';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

// Quick Public Messages
const QUICK_PUBLIC_MESSAGES = [
  { id: 'q1', text: '¡Salud a todos! 🍻', emoji: '🍻' },
  { id: 'q2', text: '¡Vaya temazo! 🎶', emoji: '🎶' },
  { id: 'q3', text: '¡Qué ambientazo! 🔥', emoji: '🔥' },
  { id: 'q4', text: '¿Quién pide ronda? 🥂', emoji: '🥂' },
];

// Predefined Messages
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

const PROXIMITY_THRESHOLD = 5;
const CLOSING_WARNING_THRESHOLD = 60;
const MESSAGE_SYNC_INTERVAL = 1500;
const TYPING_TIMEOUT = 3000;

interface Message {
  id: string;
  usuario_id: string;
  local_id: string;
  tipo: 'mensaje' | 'emoticon' | 'predefinido' | 'privado' | 'publico';
  contenido: string;
  created_at: string;
  is_private?: boolean;
  recipient_id?: string;
  leido?: boolean;
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

interface UserProfile {
  id: string;
  nombre: string;
  username?: string;
  avatar?: string;
  bio?: string;
}

/**
 * ✅ SALA VIRTUAL v6.2 - AUTO-CLOSE BUG FIX
 * 
 * CAMBIOS v6.2:
 * 
 * 1. ELIMINACIÓN DE CLEANUP AUTOMÁTICO:
 *    - ✅ REMOVED: handleCheckOut() call in useEffect cleanup
 *    - ✅ REASON: This was causing auto-checkout when component mounted
 *    - ✅ RESULT: Room no longer closes automatically on entry
 * 
 * 2. PREVENCIÓN DE RACE CONDITIONS:
 *    - ✅ NEW: isMounted ref to track component lifecycle
 *    - ✅ NEW: Checks before state updates to prevent updates on unmounted component
 *    - ✅ RESULT: No more state updates after unmount
 * 
 * 3. NAVEGACIÓN MEJORADA:
 *    - ✅ KEPT: router.replace() on manual close (removes from stack)
 *    - ✅ REMOVED: Automatic checkout on unmount (user stays checked in)
 *    - ✅ RESULT: User can navigate away and return without auto-checkout
 * 
 * Previous changes v6.1:
 * - ✅ Dynamic keyboard offset based on keyboard state
 * - ✅ Proper padding calculation for input container
 */

export default function SalaVirtualEnhancedScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  
  // ✅ v6.2: Track if component is mounted to prevent state updates after unmount
  const isMounted = useRef(true);
  
  const returnTab = params.returnTab as string | undefined;
  const initialTab = (returnTab === 'chat' || returnTab === 'users' || returnTab === 'private') 
    ? returnTab as 'chat' | 'users' | 'private'
    : 'chat';
  
  console.log('[SalaVirtual v6.2] 🎯 INITIAL TAB from params:', initialTab);
  
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
  const [activeTab, setActiveTab] = useState<'chat' | 'users' | 'private'>(initialTab);
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
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState<Message | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [selectedUserProfile, setSelectedUserProfile] = useState<UserProfile | null>(null);
  
  const flatListRef = useRef<FlatList>(null);
  const privateChatListRef = useRef<FlatList>(null);
  const chatChannelRef = useRef<RealtimeChannel | null>(null);
  const presenceChannelRef = useRef<RealtimeChannel | null>(null);
  const checkinsChannelRef = useRef<RealtimeChannel | null>(null);
  const typingChannelRef = useRef<RealtimeChannel | null>(null);
  const messageSyncIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastPublicMessageTimestampRef = useRef<string | null>(null);
  const lastPrivateMessageTimestampRef = useRef<string | null>(null);
  const messageIdsRef = useRef<Set<string>>(new Set());
  const localId = params.localId as string;
  const hasInitialized = useRef(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const bottomSheetAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const animationScale = useRef(new Animated.Value(0)).current;
  const animationOpacity = useRef(new Animated.Value(0)).current;
  const closingCheckInterval = useRef<NodeJS.Timeout | null>(null);
  const pendingMessageIds = useRef<Set<string>>(new Set());
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const bottomSheetRef = useRef<any>(null);
  const chatScrollViewRef = useRef<ScrollView>(null);

  const themeColors = mode === 'day' ? DAY_COLORS : NIGHT_COLORS;

  // ✅ v6.2: Set isMounted on mount and cleanup
  useEffect(() => {
    console.log('[SalaVirtual v6.2] 🎬 Component mounted');
    isMounted.current = true;
    
    return () => {
      console.log('[SalaVirtual v6.2] 🧹 Component unmounting');
      isMounted.current = false;
    };
  }, []);

  // ✅ v6.1: Keyboard listeners to track keyboard state
  useEffect(() => {
    console.log('[SalaVirtual v6.2] 🎹 Setting up keyboard listeners');
    
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      (e) => {
        console.log('[SalaVirtual v6.2] ⬆️ Keyboard opened, height:', e.endCoordinates.height);
        if (isMounted.current) {
          setKeyboardHeight(e.endCoordinates.height);
          setIsKeyboardVisible(true);
        }
      }
    );
    
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => {
        console.log('[SalaVirtual v6.2] ⬇️ Keyboard closed');
        if (isMounted.current) {
          setKeyboardHeight(0);
          setIsKeyboardVisible(false);
        }
      }
    );

    return () => {
      console.log('[SalaVirtual v6.2] 🧹 Removing keyboard listeners');
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  const getReadMessagesKey = useCallback((localId: string, userId: string) => {
    return `read_messages_${localId}_${userId}`;
  }, []);

  const loadReadMessagesFromStorage = useCallback(async (localId: string, userId: string): Promise<Set<string>> => {
    try {
      const key = getReadMessagesKey(localId, userId);
      const stored = await AsyncStorage.getItem(key);
      
      if (stored) {
        const readPartners = JSON.parse(stored) as string[];
        console.log('[SalaVirtual v6.2] 🔵 Loaded read partners from storage:', readPartners);
        return new Set(readPartners);
      }
      
      console.log('[SalaVirtual v6.2] 🔵 No stored read partners found');
      return new Set();
    } catch (error) {
      console.error('[SalaVirtual v6.2] ❌ Error loading from storage:', error);
      return new Set();
    }
  }, [getReadMessagesKey]);

  const saveReadMessagesToStorage = useCallback(async (localId: string, userId: string, partnerId: string) => {
    try {
      const key = getReadMessagesKey(localId, userId);
      const stored = await AsyncStorage.getItem(key);
      
      let readPartners: string[] = [];
      if (stored) {
        readPartners = JSON.parse(stored);
      }
      
      if (!readPartners.includes(partnerId)) {
        readPartners.push(partnerId);
        await AsyncStorage.setItem(key, JSON.stringify(readPartners));
        console.log('[SalaVirtual v6.2] 🔵 Saved read status for partner:', partnerId);
      }
    } catch (error) {
      console.error('[SalaVirtual v6.2] ❌ Error saving to storage:', error);
    }
  }, [getReadMessagesKey]);

  const fetchUserProfile = useCallback(async (userId: string): Promise<UserProfile | null> => {
    try {
      console.log('[SalaVirtual v6.2] 🔍 Fetching user profile from database for userId:', userId);
      
      const { data, error } = await supabase
        .from('usuarios')
        .select('id, nombre, username, avatar, bio')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('[SalaVirtual v6.2] ❌ Error fetching user profile:', error);
        return null;
      }

      console.log('[SalaVirtual v6.2] ✅ User profile fetched successfully');
      console.log('[SalaVirtual v6.2] 👤 Name:', data.nombre);
      console.log('[SalaVirtual v6.2] 🖼️ Avatar:', data.avatar || 'NO AVATAR');
      console.log('[SalaVirtual v6.2] 📝 Username:', data.username || 'NO USERNAME');

      return {
        id: data.id,
        nombre: data.nombre,
        username: data.username,
        avatar: data.avatar,
        bio: data.bio,
      };
    } catch (error) {
      console.error('[SalaVirtual v6.2] ❌ Error in fetchUserProfile:', error);
      return null;
    }
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const newMode = getDayNightMode();
      console.log('[SalaVirtual v6.2] 🌓 Checking day/night mode:', newMode);
      if (isMounted.current) {
        setMode(newMode);
      }
    }, 60000);
    return () => clearInterval(interval);
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
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({});
        if (isMounted.current) {
          setUserLocation({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          });
          console.log('[SalaVirtual v6.2] ✅ User location obtained');
        }
      }
    })();
  }, []);

  const checkClosingTime = useCallback(() => {
    if (!local || !local.horarios_completos) return;

    const estadoLocal = getEstadoLocal(local);
    
    if (estadoLocal.estaAbierto && estadoLocal.tiempoRestante) {
      const timeStr = estadoLocal.tiempoRestante;
      let totalMinutes = 0;
      
      const hoursMatch = timeStr.match(/(\d+)\s*h/);
      const minutesMatch = timeStr.match(/(\d+)\s*min/);
      
      if (hoursMatch) {
        totalMinutes += parseInt(hoursMatch[1]) * 60;
      }
      if (minutesMatch) {
        totalMinutes += parseInt(minutesMatch[1]);
      }
      
      console.log('[SalaVirtual v6.2] ⏰ Time until closing:', totalMinutes, 'minutes');
      
      if (!isMounted.current) return;
      
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
      if (isMounted.current) {
        setLocalClosed(true);
        setClosingWarning(null);
      }
    }
  }, [local]);

  useEffect(() => {
    if (local && isCheckedIn) {
      checkClosingTime();
      
      closingCheckInterval.current = setInterval(() => {
        checkClosingTime();
      }, 60000);
      
      return () => {
        if (closingCheckInterval.current) {
          clearInterval(closingCheckInterval.current);
        }
      };
    }
  }, [local, isCheckedIn, checkClosingTime]);

  const loadLocalData = useCallback(async () => {
    if (!localId) {
      console.error('[SalaVirtual v6.2] ❌ No localId provided');
      if (isMounted.current) {
        setLoading(false);
      }
      return;
    }

    try {
      console.log('[SalaVirtual v6.2] 🏠 Loading local data for:', localId);
      
      const { data, error } = await supabase
        .from('locales')
        .select('id, nombre, imagen_url, horarios_completos, google_business_status, estado_actual, propietario_id')
        .eq('id', localId)
        .single();

      if (error) {
        console.error('[SalaVirtual v6.2] ❌ Error loading local:', error);
        if (isMounted.current) {
          setLoading(false);
        }
        return;
      }

      console.log('[SalaVirtual v6.2] ✅ Local loaded:', data.nombre);
      
      if (!isMounted.current) return;
      
      setLocal(data);
      
      const estadoLocal = getEstadoLocal(data);
      const isOpen = estadoLocal.estaAbierto === true;
      
      if (!isOpen) {
        console.log('[SalaVirtual v6.2] 🔒 Local is closed');
        setLocalClosed(true);
        setLoading(false);
      } else {
        console.log('[SalaVirtual v6.2] ✅ Local is open');
        setLocalClosed(false);
      }
    } catch (error) {
      console.error('[SalaVirtual v6.2] ❌ Error:', error);
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, [localId]);

  const checkUserCheckin = useCallback(async () => {
    if (!user || !localId) return false;

    try {
      console.log('[SalaVirtual v6.2] 🔍 Checking if user is checked in...');
      
      const { data, error } = await supabase
        .from('sala_virtual_checkins')
        .select('*')
        .eq('usuario_id', user.id)
        .eq('local_id', localId)
        .eq('activo', true)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('[SalaVirtual v6.2] ❌ Error checking checkin:', error);
        return false;
      }

      const checkedIn = !!data;
      console.log('[SalaVirtual v6.2] ✅ User checked in status:', checkedIn);
      
      if (isMounted.current) {
        setIsCheckedIn(checkedIn);
      }
      return checkedIn;
    } catch (error) {
      console.error('[SalaVirtual v6.2] ❌ Error:', error);
      return false;
    }
  }, [user, localId]);

  const handleCheckIn = useCallback(async () => {
    if (!user || !localId) return false;

    try {
      console.log('[SalaVirtual v6.2] 🚪 User checking in...');
      
      if (!isMounted.current) return false;
      
      setCheckingIn(true);
      setIsCheckedIn(true);

      await supabase
        .from('sala_virtual_checkins')
        .update({
          activo: false,
          checked_out_at: new Date().toISOString(),
        })
        .eq('usuario_id', user.id)
        .eq('activo', true);

      await new Promise(resolve => setTimeout(resolve, 200));

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
        console.error('[SalaVirtual v6.2] ❌ Error inserting checkin:', error);
        if (isMounted.current) {
          setIsCheckedIn(false);
        }
        throw new Error('No se pudo entrar en la sala');
      }

      console.log('[SalaVirtual v6.2] ✅ User checked in successfully');
      
      if (isMounted.current) {
        setCheckingIn(false);
      }
      return true;
    } catch (error: any) {
      console.error('[SalaVirtual v6.2] ❌ Error during checkin:', error);
      if (isMounted.current) {
        setCheckingIn(false);
      }
      return false;
    }
  }, [user, localId]);

  const handleCheckOut = useCallback(async () => {
    if (!user || !localId) return;

    try {
      console.log('[SalaVirtual v6.2] 🚪 BOTÓN CERRAR PULSADO - Manual checkout');
      console.log('[SalaVirtual v6.2] 🚪 User checking out, navigating to local details...');
      console.log('[SalaVirtual v6.2] 🔧 FIX v5.6: Using router.replace() to remove virtual room from stack');
      
      await supabase
        .from('sala_virtual_checkins')
        .update({
          activo: false,
          checked_out_at: new Date().toISOString(),
        })
        .eq('usuario_id', user.id)
        .eq('local_id', localId)
        .eq('activo', true);

      console.log('[SalaVirtual v6.2] ✅ User checked out successfully');

      router.replace({
        pathname: '/detalle/local',
        params: { id: localId }
      });
      
      console.log('[SalaVirtual v6.2] ✅ Navigation executed with replace() - virtual room removed from stack');
    } catch (error) {
      console.error('[SalaVirtual v6.2] ❌ Error checking out:', error);
    }
  }, [user, localId, router]);

  const loadMessages = useCallback(async () => {
    if (!localId) {
      console.error('[SalaVirtual v6.2] ❌ No localId for loadMessages');
      return;
    }
    
    try {
      console.log('[SalaVirtual v6.2] 🔥 LOADING INITIAL MESSAGES');
      console.log('[SalaVirtual v6.2] 📍 Local ID:', localId);
      
      const { data, error } = await supabase
        .from('sala_virtual_interacciones')
        .select(`
          id,
          usuario_id,
          local_id,
          tipo,
          contenido,
          created_at,
          recipient_id,
          leido,
          usuario:usuarios!sala_virtual_interacciones_usuario_id_fkey(
            id,
            nombre,
            username,
            avatar
          )
        `)
        .eq('local_id', localId)
        .is('recipient_id', null)
        .order('created_at', { ascending: false })
        .limit(50);

      console.log('[SalaVirtual v6.2] 📦 RAW DATA from Supabase:', JSON.stringify(data, null, 2));
      console.log('[SalaVirtual v6.2] ❌ RAW ERROR from Supabase:', JSON.stringify(error, null, 2));
      
      if (error) {
        console.error('[SalaVirtual v6.2] ❌ Error loading initial messages:', error);
        if (isMounted.current) {
          setLoading(false);
        }
        return;
      }

      if (!data) {
        console.log('[SalaVirtual v6.2] ⚠️ Data is null, setting empty array');
        if (isMounted.current) {
          setMessages([]);
          setLoading(false);
        }
        return;
      }

      if (data.length === 0) {
        console.log('[SalaVirtual v6.2] ⚠️ No messages found');
        if (isMounted.current) {
          setMessages([]);
          setLoading(false);
        }
        return;
      }

      console.log('[SalaVirtual v6.2] ✅ DATOS RECIBIDOS CORRECTAMENTE');
      console.log('[SalaVirtual v6.2] 📦 Número de mensajes:', data.length);

      const formattedMessages: Message[] = data
        .filter(msg => {
          if (!msg.usuario) {
            console.warn('[SalaVirtual v6.2] ⚠️ Message without user data:', msg.id);
            return false;
          }
          return true;
        })
        .map(msg => ({
          id: msg.id,
          usuario_id: msg.usuario_id,
          local_id: msg.local_id,
          tipo: msg.tipo as 'mensaje' | 'emoticon' | 'predefinido' | 'privado' | 'publico',
          contenido: msg.contenido,
          created_at: msg.created_at,
          is_private: false,
          leido: msg.leido,
          usuario: {
            id: msg.usuario.id,
            nombre: msg.usuario.nombre,
            username: msg.usuario.username,
            avatar: msg.usuario.avatar,
          },
        }))
        .reverse();

      console.log('[SalaVirtual v6.2] ✅ Formatted', formattedMessages.length, 'public messages');

      messageIdsRef.current.clear();
      formattedMessages.forEach(msg => {
        messageIdsRef.current.add(msg.id);
      });

      console.log('[SalaVirtual v6.2] 🔑 Tracking', messageIdsRef.current.size, 'message IDs');

      if (!isMounted.current) return;
      
      setMessages(formattedMessages);
      
      if (formattedMessages.length > 0) {
        lastPublicMessageTimestampRef.current = formattedMessages[formattedMessages.length - 1].created_at;
        console.log('[SalaVirtual v6.2] 📅 Last public message timestamp:', lastPublicMessageTimestampRef.current);
      }
      
      setLoading(false);
      
      setTimeout(() => {
        console.log('[SalaVirtual v6.2] 📜 Scrolling to bottom');
        flatListRef.current?.scrollToEnd({ animated: false });
      }, 300);
    } catch (error) {
      console.error('[SalaVirtual v6.2] ❌ Error loading messages:', error);
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, [localId]);

  const triggerReceivedAnimation = useCallback((messageText: string, tipo: string) => {
    console.log('[SalaVirtual v6.2] 🎬 Triggering received animation for tipo:', tipo);
    
    if (tipo !== 'privado') {
      console.log('[SalaVirtual v6.2] ⏭️ Not a private message, skipping animation');
      return;
    }
    
    if (!isMounted.current) return;
    
    const emojiMatch = messageText.match(/[\u{1F300}-\u{1F9FF}]/u);
    const emoji = emojiMatch ? emojiMatch[0] : '✨';
    
    console.log('[SalaVirtual v6.2] 🎬 Showing received animation with emoji:', emoji);
    
    setAnimationEmoji(emoji);
    setShowAnimation(true);

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
      if (isMounted.current) {
        setShowAnimation(false);
        animationScale.setValue(0);
        animationOpacity.setValue(0);
      }
    });
  }, [animationScale, animationOpacity]);

  const syncMessages = useCallback(async () => {
    if (!localId || !user) {
      return;
    }

    try {
      console.log('[SalaVirtual v6.2] 🔄 Syncing messages...');
      
      let publicQuery = supabase
        .from('sala_virtual_interacciones')
        .select(`
          id,
          usuario_id,
          local_id,
          tipo,
          contenido,
          created_at,
          recipient_id,
          leido,
          usuario:usuarios!sala_virtual_interacciones_usuario_id_fkey(
            id,
            nombre,
            username,
            avatar
          )
        `)
        .eq('local_id', localId)
        .is('recipient_id', null)
        .order('created_at', { ascending: true });

      if (lastPublicMessageTimestampRef.current) {
        publicQuery = publicQuery.gt('created_at', lastPublicMessageTimestampRef.current);
        console.log('[SalaVirtual v6.2] 📅 Fetching messages after:', lastPublicMessageTimestampRef.current);
      } else {
        console.log('[SalaVirtual v6.2] 📅 Fetching all messages (no timestamp set)');
      }

      const { data: publicData, error: publicError } = await publicQuery;

      if (publicError) {
        console.error('[SalaVirtual v6.2] ❌ Error syncing public messages:', publicError);
      } else if (publicData && publicData.length > 0) {
        console.log('[SalaVirtual v6.2] 📨 Found', publicData.length, 'NEW public messages');
        
        const newMessages: Message[] = publicData
          .filter(msg => {
            if (!msg.usuario) {
              console.warn('[SalaVirtual v6.2] ⚠️ Message without user data:', msg.id);
              return false;
            }
            return true;
          })
          .map(msg => ({
            id: msg.id,
            usuario_id: msg.usuario_id,
            local_id: msg.local_id,
            tipo: msg.tipo as 'mensaje' | 'emoticon' | 'predefinido' | 'privado' | 'publico',
            contenido: msg.contenido,
            created_at: msg.created_at,
            is_private: false,
            leido: msg.leido,
            usuario: {
              id: msg.usuario.id,
              nombre: msg.usuario.nombre,
              username: msg.usuario.username,
              avatar: msg.usuario.avatar,
            },
          }));

        const uniqueNewMessages = newMessages.filter(msg => {
          if (messageIdsRef.current.has(msg.id)) {
            console.log('[SalaVirtual v6.2] ⏭️ Skipping duplicate message ID:', msg.id);
            return false;
          }
          return true;
        });

        if (uniqueNewMessages.length > 0 && isMounted.current) {
          console.log('[SalaVirtual v6.2] ✅ Adding', uniqueNewMessages.length, 'unique new messages to UI');
          
          uniqueNewMessages.forEach(msg => {
            messageIdsRef.current.add(msg.id);
            
            if (msg.usuario_id === user.id) {
              const pendingId = msg.contenido + msg.usuario_id;
              pendingMessageIds.current.delete(pendingId);
              console.log('[SalaVirtual v6.2] ✅ Removed pending message:', pendingId);
            }
            
            if (msg.usuario_id !== user.id && msg.tipo === 'privado') {
              console.log('[SalaVirtual v6.2] 🎬 Received private message from another user!');
              console.log('[SalaVirtual v6.2] 👤 From:', msg.usuario.nombre);
              console.log('[SalaVirtual v6.2] 💬 Content:', msg.contenido);
              triggerReceivedAnimation(msg.contenido, msg.tipo);
            }
          });
          
          console.log('[SalaVirtual v6.2] 🔑 Now tracking', messageIdsRef.current.size, 'message IDs');
          
          setMessages(prev => {
            const updated = [...prev, ...uniqueNewMessages].sort((a, b) => 
              new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            );
            
            console.log('[SalaVirtual v6.2] 📊 Total messages in UI after update:', updated.length);
            
            return updated;
          });
          
          const latestMessage = uniqueNewMessages[uniqueNewMessages.length - 1];
          lastPublicMessageTimestampRef.current = latestMessage.created_at;
          console.log('[SalaVirtual v6.2] 📅 Updated last timestamp to:', lastPublicMessageTimestampRef.current);
          
          setTimeout(() => {
            console.log('[SalaVirtual v6.2] 📜 Scrolling to new messages');
            flatListRef.current?.scrollToEnd({ animated: true });
          }, 100);
        } else {
          console.log('[SalaVirtual v6.2] ℹ️ No new unique messages to add');
        }
      } else {
        console.log('[SalaVirtual v6.2] ℹ️ No new public messages found');
      }

      let privateQuery = supabase
        .from('sala_virtual_interacciones')
        .select(`
          id,
          usuario_id,
          local_id,
          tipo,
          contenido,
          created_at,
          recipient_id,
          leido,
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
        .order('created_at', { ascending: true });

      if (lastPrivateMessageTimestampRef.current) {
        privateQuery = privateQuery.gt('created_at', lastPrivateMessageTimestampRef.current);
      }

      const { data: privateData, error: privateError } = await privateQuery;

      if (privateError) {
        console.error('[SalaVirtual v6.2] ❌ Error syncing private messages:', privateError);
      } else if (privateData && privateData.length > 0) {
        console.log('[SalaVirtual v6.2] 📨 Found', privateData.length, 'new private messages');
        
        if (privateData.length > 0) {
          lastPrivateMessageTimestampRef.current = privateData[privateData.length - 1].created_at;
        }
        
        console.log('[SalaVirtual v6.2] 🔵 Reloading private chats to update unread counts');
        loadPrivateChats();
        
        if (selectedPrivateChat) {
          const relevantMessages = privateData.filter(msg => 
            (msg.usuario_id === user.id && msg.recipient_id === selectedPrivateChat.userId) ||
            (msg.usuario_id === selectedPrivateChat.userId && msg.recipient_id === user.id)
          );
          
          if (relevantMessages.length > 0 && isMounted.current) {
            const newPrivateMessages: Message[] = relevantMessages
              .filter(msg => msg.usuario)
              .map(msg => ({
                id: msg.id,
                usuario_id: msg.usuario_id,
                local_id: msg.local_id,
                tipo: msg.tipo as 'mensaje' | 'emoticon' | 'predefinido' | 'privado' | 'publico',
                contenido: msg.contenido,
                created_at: msg.created_at,
                is_private: true,
                recipient_id: msg.recipient_id,
                leido: msg.leido,
                usuario: {
                  id: msg.usuario.id,
                  nombre: msg.usuario.nombre,
                  username: msg.usuario.username,
                  avatar: msg.usuario.avatar,
                },
              }));

            setPrivateChatMessages(prev => {
              const existingIds = new Set(prev.map(m => m.id));
              const uniqueNew = newPrivateMessages.filter(m => !existingIds.has(m.id));
              
              if (uniqueNew.length > 0) {
                console.log('[SalaVirtual v6.2] ✅ Adding', uniqueNew.length, 'new private messages to UI');
                
                uniqueNew.forEach(msg => {
                  if (msg.usuario_id === user.id) {
                    const pendingId = msg.contenido + msg.usuario_id;
                    pendingMessageIds.current.delete(pendingId);
                  }
                  
                  if (msg.usuario_id !== user.id && msg.tipo === 'privado') {
                    console.log('[SalaVirtual v6.2] 🎬 Received private message!');
                    console.log('[SalaVirtual v6.2] 👤 From:', msg.usuario.nombre);
                    console.log('[SalaVirtual v6.2] 💬 Content:', msg.contenido);
                    triggerReceivedAnimation(msg.contenido, msg.tipo);
                  }
                });
                
                return [...prev, ...uniqueNew].sort((a, b) => 
                  new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
                );
              }
              
              return prev;
            });

            setTimeout(() => {
              privateChatListRef.current?.scrollToEnd({ animated: true });
            }, 100);
          }
        }
      }
    } catch (error) {
      console.error('[SalaVirtual v6.2] ❌ Error syncing messages:', error);
    }
  }, [localId, user, selectedPrivateChat, triggerReceivedAnimation]);

  useEffect(() => {
    if (!localId || !user || !isCheckedIn) {
      console.log('[SalaVirtual v6.2] ⏸️ Polling not started - missing requirements');
      return;
    }

    console.log('[SalaVirtual v6.2] 🔥 STARTING MESSAGE POLLING (every 1.5 seconds)');
    
    syncMessages();
    
    messageSyncIntervalRef.current = setInterval(() => {
      syncMessages();
    }, MESSAGE_SYNC_INTERVAL);

    return () => {
      if (messageSyncIntervalRef.current) {
        console.log('[SalaVirtual v6.2] 🛑 Stopping message polling');
        clearInterval(messageSyncIntervalRef.current);
        messageSyncIntervalRef.current = null;
      }
    };
  }, [localId, user, isCheckedIn, syncMessages]);

  const uniqueActiveUsers = useMemo(() => {
    if (!activeUsers || activeUsers.length === 0) {
      return [];
    }

    console.log('[SalaVirtual v6.2] 🔍 Filtering duplicate users...');
    console.log('[SalaVirtual v6.2] 📊 Total users before filtering:', activeUsers.length);
    
    const seenUserIds = new Set<string>();
    const uniqueUsers = activeUsers.filter(user => {
      if (seenUserIds.has(user.id)) {
        console.log('[SalaVirtual v6.2] ⚠️ Duplicate user found and removed:', user.nombre, user.username);
        return false;
      }
      seenUserIds.add(user.id);
      return true;
    });

    console.log('[SalaVirtual v6.2] ✅ Unique users after filtering:', uniqueUsers.length);
    console.log('[SalaVirtual v6.2] 📋 User IDs:', uniqueUsers.map(u => u.username || u.nombre).join(', '));
    
    return uniqueUsers;
  }, [activeUsers]);

  const updateActiveUsers = useCallback(async () => {
    if (!localId) return;

    try {
      console.log('[SalaVirtual v6.2] 🔄 Updating active users list...');
      
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
        console.error('[SalaVirtual v6.2] ❌ Error loading active users:', error);
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

      console.log('[SalaVirtual v6.2] 👥 Found', users.length, 'active users (before deduplication)');

      if (userLocation) {
        users = users.map(u => {
          const distance = Math.random() * 20;
          return { ...u, distance };
        });
      }

      if (user) {
        users.sort((a, b) => {
          if (a.id === user.id) return -1;
          if (b.id === user.id) return 1;
          return 0;
        });
        console.log('[SalaVirtual v6.2] ✅ Current user moved to first position');
      }

      if (isMounted.current) {
        setActiveUsers(users);
      }
    } catch (error) {
      console.error('[SalaVirtual v6.2] ❌ Error:', error);
    }
  }, [localId, userLocation, user]);

  const markPrivateMessagesAsRead = useCallback(async (partnerId: string) => {
    if (!user || !localId) return;

    try {
      console.log('[SalaVirtual v6.2] 🔵 Marking private messages as read from:', partnerId);
      
      const { error } = await supabase
        .from('sala_virtual_interacciones')
        .update({ leido: true })
        .eq('local_id', localId)
        .eq('tipo', 'privado')
        .eq('recipient_id', user.id)
        .eq('usuario_id', partnerId)
        .eq('leido', false);

      if (error) {
        console.error('[SalaVirtual v6.2] ❌ Error marking messages as read:', error);
      } else {
        console.log('[SalaVirtual v6.2] ✅ Messages marked as read in database');
      }
      
      console.log('[SalaVirtual v6.2] 🔵 Saving read status to AsyncStorage for:', partnerId);
      await saveReadMessagesToStorage(localId, user.id, partnerId);
      
      console.log('[SalaVirtual v6.2] 🔵 Updating unread counter IMMEDIATELY in frontend state');
      
      if (!isMounted.current) return;
      
      setPrivateChats(prev => 
        prev.map(chat => {
          if (chat.userId === partnerId) {
            console.log('[SalaVirtual v6.2] 🔵 Setting unreadCount to 0 for user:', partnerId);
            return { ...chat, unreadCount: 0 };
          }
          return chat;
        })
      );
      console.log('[SalaVirtual v6.2] ✅ Unread counter set to 0 for user:', partnerId);
    } catch (error) {
      console.error('[SalaVirtual v6.2] ❌ Error:', error);
    }
  }, [user, localId, saveReadMessagesToStorage]);

  const loadPrivateChats = useCallback(async () => {
    if (!user || !localId) return;

    try {
      console.log('[SalaVirtual v6.2] 🔄 Loading private chats...');
      
      const readPartners = await loadReadMessagesFromStorage(localId, user.id);
      console.log('[SalaVirtual v6.2] 🔵 Read partners from storage:', Array.from(readPartners));
      
      const { data: privateMessages, error } = await supabase
        .from('sala_virtual_interacciones')
        .select(`
          id,
          usuario_id,
          recipient_id,
          contenido,
          created_at,
          leido,
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
        console.error('[SalaVirtual v6.2] ❌ Error loading private chats:', error);
        return;
      }

      const chatMap = new Map<string, PrivateChat>();
      const unreadCountMap = new Map<string, number>();
      
      console.log('[SalaVirtual v6.2] 🔵 Counting ONLY unread messages WHERE leido = false AND recipient_id = user.id');
      
      (privateMessages || []).forEach(msg => {
        const partnerId = msg.usuario_id === user.id ? msg.recipient_id : msg.usuario_id;
        if (!partnerId) return;
        
        if (msg.recipient_id === user.id && msg.usuario_id !== user.id && msg.leido === false) {
          if (!readPartners.has(partnerId)) {
            const currentCount = unreadCountMap.get(partnerId) || 0;
            unreadCountMap.set(partnerId, currentCount + 1);
            console.log('[SalaVirtual v6.2] 🔵 Unread message from', partnerId, '- count:', currentCount + 1);
          } else {
            console.log('[SalaVirtual v6.2] 🔵 Skipping count for', partnerId, '- already marked as read in storage');
          }
        }
        
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
              unreadCount: 0,
            });
          }
        }
      });
      
      const chats = Array.from(chatMap.values()).map(chat => ({
        ...chat,
        unreadCount: unreadCountMap.get(chat.userId) || 0,
      }));
      
      console.log('[SalaVirtual v6.2] ✅ Private chats loaded:', chats.length);
      console.log('[SalaVirtual v6.2] 🔵 Total unread messages (respecting storage):', 
        chats.reduce((sum, chat) => sum + chat.unreadCount, 0)
      );
      
      if (isMounted.current) {
        setPrivateChats(chats);
      }
    } catch (error) {
      console.error('[SalaVirtual v6.2] ❌ Error loading private chats:', error);
    }
  }, [user, localId, activeUsers, loadReadMessagesFromStorage]);

  const handleTypingStart = useCallback(() => {
    if (!selectedPrivateChat || !user || !localId) return;

    console.log('[SalaVirtual v6.2] ⌨️ User started typing to:', selectedPrivateChat.userId);
    
    if (typingChannelRef.current) {
      typingChannelRef.current.send({
        type: 'broadcast',
        event: 'typing_start',
        payload: {
          userId: user.id,
          recipientId: selectedPrivateChat.userId,
          localId: localId,
        },
      });
    }
  }, [selectedPrivateChat, user, localId]);

  const handleTypingStop = useCallback(() => {
    if (!selectedPrivateChat || !user || !localId) return;

    console.log('[SalaVirtual v6.2] ⌨️ User stopped typing to:', selectedPrivateChat.userId);
    
    if (typingChannelRef.current) {
      typingChannelRef.current.send({
        type: 'broadcast',
        event: 'typing_stop',
        payload: {
          userId: user.id,
          recipientId: selectedPrivateChat.userId,
          localId: localId,
        },
      });
    }
  }, [selectedPrivateChat, user, localId]);

  const handlePrivateMessageChange = useCallback((text: string) => {
    setNewMessage(text);
    
    if (!selectedPrivateChat) return;
    
    if (text.length > 0 && !isTyping) {
      setIsTyping(true);
      handleTypingStart();
    }
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    if (text.length > 0) {
      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false);
        handleTypingStop();
      }, TYPING_TIMEOUT);
    } else {
      setIsTyping(false);
      handleTypingStop();
    }
  }, [selectedPrivateChat, isTyping, handleTypingStart, handleTypingStop]);

  const subscribeToTypingEvents = useCallback(() => {
    if (!localId || !user) return () => {};

    console.log('[SalaVirtual v6.2] ⌨️ Setting up typing indicator subscription');

    const typingChannel = supabase
      .channel(`typing_events_${localId}_${user.id}_${Date.now()}`)
      .on('broadcast', { event: 'typing_start' }, (payload: any) => {
        console.log('[SalaVirtual v6.2] ⌨️ Received typing_start:', payload);
        
        if (payload.payload.recipientId === user.id && selectedPrivateChat?.userId === payload.payload.userId) {
          console.log('[SalaVirtual v6.2] ⌨️ Partner is typing...');
          if (isMounted.current) {
            setTypingUsers(prev => {
              const newSet = new Set(prev);
              newSet.add(payload.payload.userId);
              return newSet;
            });
          }
        }
      })
      .on('broadcast', { event: 'typing_stop' }, (payload: any) => {
        console.log('[SalaVirtual v6.2] ⌨️ Received typing_stop:', payload);
        
        if (payload.payload.recipientId === user.id) {
          console.log('[SalaVirtual v6.2] ⌨️ Partner stopped typing');
          if (isMounted.current) {
            setTypingUsers(prev => {
              const newSet = new Set(prev);
              newSet.delete(payload.payload.userId);
              return newSet;
            });
          }
        }
      })
      .subscribe((status) => {
        console.log('[SalaVirtual v6.2] ⌨️ Typing channel status:', status);
      });

    typingChannelRef.current = typingChannel;

    return () => {
      console.log('[SalaVirtual v6.2] 🔌 Unsubscribing from typing channel');
      supabase.removeChannel(typingChannel);
    };
  }, [localId, user, selectedPrivateChat]);

  const subscribeToUpdates = useCallback(() => {
    if (!localId || !user) return () => {};

    console.log('[SalaVirtual v6.2] 📡 Setting up real-time subscriptions...');

    const sessionKey = Date.now();
    
    const chatChannel = supabase
      .channel(`room_messages_${localId}_${sessionKey}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'sala_virtual_interacciones',
          filter: `local_id=eq.${localId}`,
        },
        async (payload) => {
          console.log('[SalaVirtual v6.2] 📨 Real-time INSERT event received:', payload);
          
          const newRecord = payload.new as any;
          
          if (newRecord.usuario_id === user.id) {
            console.log('[SalaVirtual v6.2] ⏭️ Skipping own message (already in UI optimistically)');
            return;
          }

          console.log('[SalaVirtual v6.2] 🔄 Triggering immediate sync for new message from other user');
          syncMessages();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'sala_virtual_interacciones',
          filter: `local_id=eq.${localId}`,
        },
        (payload) => {
          console.log('[SalaVirtual v6.2] 🗑️ Message deleted from DB:', payload);
          
          const deletedRecord = payload.old as any;
          
          messageIdsRef.current.delete(deletedRecord.id);
          
          if (isMounted.current) {
            setMessages(prev => prev.filter(m => m.id !== deletedRecord.id));
            setPrivateChatMessages(prev => prev.filter(m => m.id !== deletedRecord.id));
            
            if (deletedRecord.tipo === 'privado') {
              setTimeout(() => {
                loadPrivateChats();
              }, 500);
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'sala_virtual_interacciones',
          filter: `local_id=eq.${localId}`,
        },
        (payload) => {
          console.log('[SalaVirtual v6.2] 🔄 Message updated in DB:', payload);
          
          const updatedRecord = payload.new as any;
          
          if (updatedRecord.tipo === 'privado' && updatedRecord.leido === true) {
            console.log('[SalaVirtual v6.2] 🔵 Message marked as read via real-time, reloading chats');
            setTimeout(() => {
              loadPrivateChats();
            }, 300);
          }
        }
      )
      .subscribe((status) => {
        console.log('[SalaVirtual v6.2] 📡 Chat channel status:', status);
        
        if (status === 'SUBSCRIBED') {
          console.log('[SalaVirtual v6.2] ✅ Real-time subscription active');
        } else if (status === 'CHANNEL_ERROR') {
          console.warn('[SalaVirtual v6.2] ⚠️ Real-time subscription error - polling will handle all sync');
        } else if (status === 'TIMED_OUT') {
          console.warn('[SalaVirtual v6.2] ⏱️ Real-time subscription timed out - polling will handle all sync');
        }
      });

    const checkinsChannel = supabase
      .channel(`sala_virtual_checkins:${localId}_${sessionKey}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sala_virtual_checkins',
          filter: `local_id=eq.${localId}`,
        },
        (payload) => {
          console.log('[SalaVirtual v6.2] 👤 Check-in event:', payload.eventType);
          updateActiveUsers();
        }
      )
      .subscribe((status) => {
        console.log('[SalaVirtual v6.2] 📡 Checkins channel status:', status);
      });

    chatChannelRef.current = chatChannel;
    checkinsChannelRef.current = checkinsChannel;

    return () => {
      console.log('[SalaVirtual v6.2] 🔌 Unsubscribing from channels');
      supabase.removeChannel(chatChannel);
      supabase.removeChannel(checkinsChannel);
    };
  }, [localId, user, updateActiveUsers, loadPrivateChats, syncMessages]);

  // ✅ v6.2: CRITICAL FIX - Removed automatic checkout on unmount
  // This was causing the room to close immediately after opening
  useEffect(() => {
    if (!localId || hasInitialized.current) return;
    hasInitialized.current = true;

    console.log('[SalaVirtual v6.2] 🚀 INITIALIZING VIRTUAL ROOM');

    const init = async () => {
      console.log('[SalaVirtual v6.2] 1️⃣ Loading local data...');
      await loadLocalData();
      
      console.log('[SalaVirtual v6.2] 2️⃣ Checking user check-in status...');
      const checkedIn = await checkUserCheckin();
      
      if (!checkedIn && !localClosed && user) {
        console.log('[SalaVirtual v6.2] 3️⃣ User not checked in, checking in now...');
        const success = await handleCheckIn();
        if (!success) {
          console.error('[SalaVirtual v6.2] ❌ Check-in failed, aborting initialization');
          return;
        }
      }
      
      await new Promise(resolve => setTimeout(resolve, 300));
      
      console.log('[SalaVirtual v6.2] 4️⃣ Loading initial messages...');
      await loadMessages();
      
      console.log('[SalaVirtual v6.2] 5️⃣ Setting up real-time subscriptions...');
      subscribeToUpdates();
      
      console.log('[SalaVirtual v6.2] 6️⃣ Setting up typing events...');
      subscribeToTypingEvents();
      
      console.log('[SalaVirtual v6.2] 7️⃣ Updating active users...');
      await updateActiveUsers();
      
      console.log('[SalaVirtual v6.2] 8️⃣ Loading private chats...');
      await loadPrivateChats();
      
      console.log('[SalaVirtual v6.2] ✅ INITIALIZATION COMPLETE');
    };

    init();

    // ✅ v6.2: CRITICAL FIX - DO NOT auto-checkout on unmount
    // This allows users to navigate away and return without being kicked out
    // Only manual close button should trigger checkout
    return () => {
      console.log('[SalaVirtual v6.2] 🧹 Cleanup: Cleaning up subscriptions only (NO auto-checkout)');
      // Channels will be cleaned up by their own useEffect cleanup
    };
  }, [localId, loadLocalData, checkUserCheckin, handleCheckIn, loadMessages, subscribeToUpdates, subscribeToTypingEvents, updateActiveUsers, loadPrivateChats, localClosed, user]);

  useEffect(() => {
    if (activeTab === 'private' && user && localId) {
      console.log('[SalaVirtual v6.2] 🔄 Private tab active, reloading chats');
      loadPrivateChats();
    }
  }, [activeTab, user, localId, loadPrivateChats]);

  useEffect(() => {
    if (selectedPrivateChat && user && localId) {
      console.log('[SalaVirtual v6.2] 🔄 selectedPrivateChat changed, syncing state...');
      console.log('[SalaVirtual v6.2] 🔄 Partner ID:', selectedPrivateChat.userId);
      
      const syncProfile = async () => {
        console.log('[SalaVirtual v6.2] 🔄 Fetching fresh profile for partner...');
        const profile = await fetchUserProfile(selectedPrivateChat.userId);
        
        if (profile && isMounted.current) {
          console.log('[SalaVirtual v6.2] ✅ Profile fetched and updated');
          console.log('[SalaVirtual v6.2] 🖼️ Avatar:', profile.avatar || 'NO AVATAR');
          setSelectedUserProfile(profile);
        }
      };
      
      syncProfile();
      
      console.log('[SalaVirtual v6.2] 🔄 Marking messages as read...');
      markPrivateMessagesAsRead(selectedPrivateChat.userId);
      
      const cleanup = subscribeToTypingEvents();
      return cleanup;
    }
  }, [selectedPrivateChat, user, localId, fetchUserProfile, markPrivateMessagesAsRead, subscribeToTypingEvents]);

  const sendPublicMessage = useCallback(async (content: string) => {
    if (!user || !localId || !content.trim()) {
      console.log('[SalaVirtual v6.2] ⚠️ Cannot send message - missing requirements');
      return;
    }

    try {
      console.log('[SalaVirtual v6.2] 📤 Sending public message:', content);
      setSending(true);

      const pendingId = content + user.id;
      pendingMessageIds.current.add(pendingId);

      const messageId = `pending-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const now = new Date().toISOString();

      console.log('[SalaVirtual v6.2] 🔥 Fetching user profile from database...');
      const userProfile = await fetchUserProfile(user.id);
      
      const currentUserProfile = userProfile || {
        id: user.id,
        nombre: user.user_metadata?.nome || user.email?.split('@')[0] || 'Usuario',
        username: user.user_metadata?.username,
        avatar: user.user_metadata?.avatar,
      };

      console.log('[SalaVirtual v6.2] 🔥 Using profile data from database');
      console.log('[SalaVirtual v6.2] 👤 User profile:', currentUserProfile.nombre);
      console.log('[SalaVirtual v6.2] 🖼️ Avatar URL:', currentUserProfile.avatar || 'NO AVATAR');

      const optimisticMsg: Message = {
        id: messageId,
        usuario_id: user.id,
        local_id: localId,
        tipo: 'mensaje',
        contenido: content,
        created_at: now,
        is_private: false,
        usuario: currentUserProfile,
      };

      console.log('[SalaVirtual v6.2] ✨ Adding message optimistically with avatar from database');
      console.log('[SalaVirtual v6.2] 👤 User:', optimisticMsg.usuario.nombre, '| Avatar:', !!optimisticMsg.usuario.avatar);
      
      messageIdsRef.current.add(messageId);
      
      if (isMounted.current) {
        setMessages((prev) => {
          const newArray = [...prev, optimisticMsg];
          return newArray;
        });
        setNewMessage('');
      }
      
      const quickMsg = QUICK_PUBLIC_MESSAGES.find(m => m.text === content);
      if (quickMsg) {
        triggerFloatingReaction(quickMsg.emoji);
      }
      
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);

      console.log('[SalaVirtual v6.2] 💾 Saving message to database...');
      const { data: insertedMessage, error } = await supabase
        .from('sala_virtual_interacciones')
        .insert({
          usuario_id: user.id,
          local_id: localId,
          tipo: 'mensaje',
          contenido: content,
          recipient_id: null,
        })
        .select(`
          id,
          usuario_id,
          local_id,
          tipo,
          contenido,
          created_at,
          recipient_id,
          leido
        `)
        .single();

      if (error) {
        console.error('[SalaVirtual v6.2] ❌ Error saving message to DB:', error);
        
        messageIdsRef.current.delete(messageId);
        if (isMounted.current) {
          setMessages(prev => prev.filter(m => m.id !== messageId));
        }
        pendingMessageIds.current.delete(pendingId);
      } else {
        console.log('[SalaVirtual v6.2] ✅ Public message saved to DB with id:', insertedMessage.id);
        
        if (isMounted.current) {
          setMessages(prev => {
            const withoutOptimistic = prev.filter(m => m.id !== messageId);
            
            messageIdsRef.current.delete(messageId);
            messageIdsRef.current.add(insertedMessage.id);
            
            const realMessage: Message = {
              ...insertedMessage,
              tipo: insertedMessage.tipo as 'mensaje' | 'emoticon' | 'predefinido' | 'privado' | 'publico',
              is_private: false,
              usuario: currentUserProfile,
            };
            
            if (withoutOptimistic.some(m => m.id === realMessage.id)) {
              console.log('[SalaVirtual v6.2] ℹ️ Real message already in UI from polling');
              return withoutOptimistic;
            }
            
            return [...withoutOptimistic, realMessage].sort((a, b) => 
              new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            );
          });
        }
        
        lastPublicMessageTimestampRef.current = insertedMessage.created_at;
        
        setTimeout(() => {
          pendingMessageIds.current.delete(pendingId);
        }, 1000);
      }
    } catch (error) {
      console.error('[SalaVirtual v6.2] ❌ Error:', error);
    } finally {
      if (isMounted.current) {
        setSending(false);
      }
    }
  }, [user, localId, fetchUserProfile, triggerFloatingReaction]);

  const triggerFloatingReaction = useCallback((emoji: string) => {
    if (!isMounted.current) return;
    
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
        if (isMounted.current) {
          setFloatingParticles(current => current.filter(p => p.id !== particle.id));
        }
      });
    });

    console.log(`[SalaVirtual v6.2] 🎉 Floating reaction triggered: ${emoji}`);
  }, []);

  const sendPredefinedMessage = useCallback(async (recipientId: string, messageText: string) => {
    if (!user || !localId) return;

    try {
      console.log('[SalaVirtual v6.2] 📤 Sending predefined message:', messageText, 'to:', recipientId);
      
      const pendingId = messageText + user.id + recipientId;
      pendingMessageIds.current.add(pendingId);

      const messageId = `pending-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const now = new Date().toISOString();

      console.log('[SalaVirtual v6.2] 🔥 Fetching user profile from database for predefined message...');
      const userProfile = await fetchUserProfile(user.id);
      
      const currentUserProfile = userProfile || {
        id: user.id,
        nombre: user.user_metadata?.nombre || user.email?.split('@')[0] || 'Usuario',
        username: user.user_metadata?.username,
        avatar: user.user_metadata?.avatar,
      };

      const newMsg: Message = {
        id: messageId,
        usuario_id: user.id,
        local_id: localId,
        tipo: 'privado',
        contenido: messageText,
        created_at: now,
        is_private: true,
        recipient_id: recipientId,
        usuario: currentUserProfile,
      };

      const interaction: PendingInteraction = {
        id: messageId,
        sender_id: user.id,
        recipient_id: recipientId,
        message: messageText,
        created_at: now,
        responded: false,
      };
      
      if (isMounted.current) {
        setPendingInteractions(prev => [...prev, interaction]);
      }

      const recipient = uniqueActiveUsers.find(u => u.id === recipientId);
      const recipientName = recipient?.username 
        ? recipient.username.replace('@', '')
        : recipient?.nombre || 'Usuario';

      const existingChatIndex = privateChats.findIndex(chat => chat.userId === recipientId);
      
      if (isMounted.current) {
        if (existingChatIndex === -1) {
          const newChat: PrivateChat = {
            userId: recipientId,
            username: recipient?.username || '',
            nombre: recipient?.nombre || 'Usuario',
            avatar: recipient?.avatar,
            lastMessage: messageText,
            lastMessageTime: now,
            unreadCount: 0,
          };
          
          console.log('[SalaVirtual v6.2] ✨ Creating new private chat optimistically');
          setPrivateChats(prev => [newChat, ...prev]);
        } else {
          console.log('[SalaVirtual v6.2] ✨ Updating existing private chat optimistically');
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
        }
      }
      
      console.log('[SalaVirtual v6.2] 💾 Saving with tipo = "privado"');
      const { error: insertError } = await supabase
        .from('sala_virtual_interacciones')
        .insert({
          usuario_id: user.id,
          local_id: localId,
          tipo: 'privado',
          contenido: messageText,
          recipient_id: recipientId,
          leido: false,
        });

      if (insertError) {
        console.error('[SalaVirtual v6.2] ❌ Error saving private message to DB:', insertError);
      } else {
        console.log('[SalaVirtual v6.2] ✅ Private message saved to database with tipo = "privado"');
        
        setTimeout(() => {
          pendingMessageIds.current.delete(pendingId);
        }, 1000);
      }

      console.log(`[SalaVirtual v6.2] ✅ Message sent to ${recipientName}`);
      
      if (!isMounted.current) return;
      
      setAnimationEmoji('✅');
      setShowAnimation(true);
      
      const newSparkles = Array.from({ length: 12 }, (_, index) => ({
        id: `sparkle-${Date.now()}-${index}`,
        emoji: mode === 'night' ? '✨' : '🥂',
        x: new Animated.Value(0),
        y: new Animated.Value(0),
        opacity: new Animated.Value(0),
        scale: new Animated.Value(0),
      }));
      
      setFloatingParticles(prev => [...prev, ...newSparkles]);
      
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
          if (isMounted.current) {
            setFloatingParticles(current => current.filter(p => p.id !== sparkle.id));
          }
        });
      });
      
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
        if (isMounted.current) {
          setShowAnimation(false);
          animationScale.setValue(0);
          animationOpacity.setValue(0);
        }
      });

      closeBottomSheet();
      
      console.log('[SalaVirtual v6.2] 🔄 Switching to private conversations tab');
      if (isMounted.current) {
        setActiveTab('private');
      }
      
      setTimeout(() => {
        loadPrivateChats();
      }, 2000);
    } catch (error) {
      console.error('[SalaVirtual v6.2] ❌ Error sending predefined message:', error);
      
      if (!isMounted.current) return;
      
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
        if (isMounted.current) {
          setShowAnimation(false);
          animationScale.setValue(0);
          animationOpacity.setValue(0);
        }
      });
    }
  }, [user, localId, uniqueActiveUsers, loadPrivateChats, privateChats, animationScale, animationOpacity, mode, fetchUserProfile, triggerFloatingReaction]);

  const closeBottomSheet = useCallback(() => {
    console.log('[SalaVirtual v6.2] 📋 Closing bottom sheet');
    Animated.timing(bottomSheetAnim, {
      toValue: SCREEN_HEIGHT,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      if (isMounted.current) {
        setShowBottomSheet(false);
        setSelectedUser(null);
        setSelectedUserProfile(null);
      }
    });
  }, [bottomSheetAnim]);

  const sendPrivateMessage = useCallback(async (recipientId: string, content: string) => {
    if (!user || !localId || !content.trim()) return;

    try {
      console.log('[SalaVirtual v6.2] 📤 Sending private message to:', recipientId);
      
      if (isTyping) {
        setIsTyping(false);
        handleTypingStop();
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }
      }
      
      const pendingId = content + user.id + recipientId;
      pendingMessageIds.current.add(pendingId);

      const messageId = `pending-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const now = new Date().toISOString();

      console.log('[SalaVirtual v6.2] 🔥 Fetching user profile from database for private message...');
      const userProfile = await fetchUserProfile(user.id);
      
      const currentUserProfile = userProfile || {
        id: user.id,
        nombre: user.user_metadata?.nombre || user.email?.split('@')[0] || 'Usuario',
        username: user.user_metadata?.username,
        avatar: user.user_metadata?.avatar,
      };

      console.log('[SalaVirtual v6.2] 🔥 Using profile data from database for private message');

      const newMsg: Message = {
        id: messageId,
        usuario_id: user.id,
        local_id: localId,
        tipo: 'privado',
        contenido: content,
        created_at: now,
        is_private: true,
        recipient_id: recipientId,
        usuario: currentUserProfile,
      };

      console.log('[SalaVirtual v6.2] ✨ Adding private message optimistically to UI');
      
      if (isMounted.current) {
        setPrivateChatMessages((prev) => {
          const newArray = [...prev, newMsg];
          return newArray;
        });
        
        setPrivateChats(prev => {
          const existingChatIndex = prev.findIndex(chat => chat.userId === recipientId);
          
          if (existingChatIndex >= 0) {
            const updatedChat = {
              ...prev[existingChatIndex],
              lastMessage: content,
              lastMessageTime: now,
            };
            
            const newChats = [...prev];
            newChats.splice(existingChatIndex, 1);
            return [updatedChat, ...newChats];
          } else {
            const recipient = uniqueActiveUsers.find(u => u.id === recipientId);
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
      }
      
      const { data: insertedMessage, error: insertError } = await supabase
        .from('sala_virtual_interacciones')
        .insert({
          usuario_id: user.id,
          local_id: localId,
          tipo: 'privado',
          contenido: content,
          recipient_id: recipientId,
          leido: false,
        })
        .select(`
          id,
          usuario_id,
          local_id,
          tipo,
          contenido,
          created_at,
          recipient_id,
          leido
        `)
        .single();

      if (insertError) {
        console.error('[SalaVirtual v6.2] ❌ Error saving private message to DB:', insertError);
        if (isMounted.current) {
          setPrivateChatMessages(prev => prev.filter(m => m.id !== messageId));
        }
        pendingMessageIds.current.delete(pendingId);
      } else {
        console.log('[SalaVirtual v6.2] ✅ Private message saved to database with id:', insertedMessage.id);
        
        if (isMounted.current) {
          setPrivateChatMessages(prev => {
            const withoutOptimistic = prev.filter(m => m.id !== messageId);
            
            const realMessage: Message = {
              ...insertedMessage,
              tipo: insertedMessage.tipo as 'mensaje' | 'emoticon' | 'predefinido' | 'privado' | 'publico',
              is_private: true,
              usuario: currentUserProfile,
            };
            
            if (withoutOptimistic.some(m => m.id === realMessage.id)) {
              return withoutOptimistic;
            }
            
            return [...withoutOptimistic, realMessage].sort((a, b) => 
              new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            );
          });
        }
        
        lastPrivateMessageTimestampRef.current = insertedMessage.created_at;
        
        setTimeout(() => {
          pendingMessageIds.current.delete(pendingId);
        }, 1000);
      }

      console.log('[SalaVirtual v6.2] ✅ Private message sent');
    } catch (error) {
      console.error('[SalaVirtual v6.2] ❌ Error sending private message:', error);
    }
  }, [user, localId, uniqueActiveUsers, isTyping, handleTypingStop, fetchUserProfile]);

  const openPrivateChat = useCallback(async (chat: PrivateChat) => {
    if (!user || !localId) return;

    try {
      const displayName = chat.username 
        ? chat.username.replace('@', '')
        : chat.nombre;
      
      console.log('[SalaVirtual v6.2] 💬 Opening private chat with:', displayName);
      console.log('[SalaVirtual v6.2] 🔵 Unread count before:', chat.unreadCount);
      
      if (isMounted.current) {
        setSelectedPrivateChat(chat);
      }
      
      console.log('[SalaVirtual v6.2] 🔵 Marking messages as read in database...');
      await markPrivateMessagesAsRead(chat.userId);
      
      console.log('[SalaVirtual v6.2] 🔵 Unread count set to 0 in frontend');
      
      const { data, error } = await supabase
        .from('sala_virtual_interacciones')
        .select(`
          id,
          usuario_id,
          recipient_id,
          contenido,
          tipo,
          created_at,
          leido,
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
        console.error('[SalaVirtual v6.2] ❌ Error loading private messages:', error);
        return;
      }

      const formattedMessages: Message[] = (data || []).map(msg => ({
        id: msg.id,
        usuario_id: msg.usuario_id,
        local_id: localId,
        tipo: msg.tipo as 'mensaje' | 'emoticon' | 'predefinido' | 'privado' | 'publico',
        contenido: msg.contenido,
        created_at: msg.created_at,
        is_private: true,
        recipient_id: msg.recipient_id,
        leido: msg.leido,
        usuario: msg.usuario,
      }));

      if (isMounted.current) {
        setPrivateChatMessages(formattedMessages);
      }
      
      if (formattedMessages.length > 0) {
        lastPrivateMessageTimestampRef.current = formattedMessages[formattedMessages.length - 1].created_at;
      }
      
      console.log('[SalaVirtual v6.2] ✅ Private messages loaded:', formattedMessages.length);
      
      setTimeout(() => {
        if (formattedMessages.length > 0) {
          privateChatListRef.current?.scrollToEnd({ animated: true });
        }
      }, 300);
    } catch (error) {
      console.error('[SalaVirtual v6.2] ❌ Error opening private chat:', error);
    }
  }, [user, localId, uniqueActiveUsers, markPrivateMessagesAsRead]);

  const closePrivateChat = useCallback(() => {
    console.log('[SalaVirtual v6.2] 💬 Closing private chat');
    
    if (isTyping) {
      setIsTyping(false);
      handleTypingStop();
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    }
    
    if (isMounted.current) {
      setSelectedPrivateChat(null);
      setPrivateChatMessages([]);
      setTypingUsers(new Set());
    }
  }, [isTyping, handleTypingStop]);

  const handleDeleteMessage = useCallback(async (message: Message) => {
    if (!user || message.usuario_id !== user.id) {
      console.log('[SalaVirtual v6.2] ⚠️ Cannot delete message - not owner');
      return;
    }

    console.log('[SalaVirtual v6.2] 🗑️ Showing delete confirmation for message:', message.id);
    if (isMounted.current) {
      setMessageToDelete(message);
      setShowDeleteModal(true);
    }
  }, [user]);

  const confirmDeleteMessage = useCallback(async () => {
    if (!messageToDelete || !user) return;

    try {
      if (isMounted.current) {
        setDeleting(true);
      }
      console.log('[SalaVirtual v6.2] 🗑️ Deleting message:', messageToDelete.id);

      messageIdsRef.current.delete(messageToDelete.id);
      
      if (isMounted.current) {
        setMessages(prev => prev.filter(m => m.id !== messageToDelete.id));
        setPrivateChatMessages(prev => prev.filter(m => m.id !== messageToDelete.id));
      }

      const { error } = await supabase
        .from('sala_virtual_interacciones')
        .delete()
        .eq('id', messageToDelete.id)
        .eq('usuario_id', user.id);

      if (error) {
        console.error('[SalaVirtual v6.2] ❌ Error deleting message:', error);
        
        messageIdsRef.current.add(messageToDelete.id);
        
        if (isMounted.current) {
          if (messageToDelete.is_private) {
            setPrivateChatMessages(prev => [...prev, messageToDelete].sort((a, b) => 
              new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            ));
          } else {
            setMessages(prev => [...prev, messageToDelete].sort((a, b) => 
              new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            ));
          }
        }
      } else {
        console.log('[SalaVirtual v6.2] ✅ Message deleted successfully');
        
        if (messageToDelete.is_private) {
          setTimeout(() => {
            loadPrivateChats();
          }, 500);
        }
      }
    } catch (error) {
      console.error('[SalaVirtual v6.2] ❌ Error deleting message:', error);
    } finally {
      if (isMounted.current) {
        setDeleting(false);
        setShowDeleteModal(false);
        setMessageToDelete(null);
      }
    }
  }, [messageToDelete, user, loadPrivateChats]);

  const cancelDeleteMessage = useCallback(() => {
    console.log('[SalaVirtual v6.2] ❌ Delete cancelled');
    if (isMounted.current) {
      setShowDeleteModal(false);
      setMessageToDelete(null);
    }
  }, []);

  const handleUserPress = async (selectedUser: ActiveUser) => {
    const displayName = selectedUser.username 
      ? selectedUser.username.replace('@', '')
      : selectedUser.nombre;
    
    console.log('[SalaVirtual v6.2] 👤 User pressed:', displayName);
    
    if (selectedUser.id === user?.id) {
      console.log('[SalaVirtual v6.2] ⚠️ Cannot interact with self');
      return;
    }
    
    console.log('[SalaVirtual v6.2] 🔥 Fetching user profile for bottom sheet cover...');
    const profile = await fetchUserProfile(selectedUser.id);
    
    if (!isMounted.current) return;
    
    if (profile) {
      console.log('[SalaVirtual v6.2] ✅ Profile fetched for bottom sheet');
      console.log('[SalaVirtual v6.2] 🖼️ Cover photo (avatar):', profile.avatar || 'NO AVATAR');
      setSelectedUserProfile(profile);
    } else {
      console.log('[SalaVirtual v6.2] ⚠️ Could not fetch profile, using cached data');
      setSelectedUserProfile({
        id: selectedUser.id,
        nombre: selectedUser.nombre,
        username: selectedUser.username,
        avatar: selectedUser.avatar,
      });
    }
    
    console.log('[SalaVirtual v6.2] 📋 Opening bottom sheet for user');
    setSelectedUser(selectedUser);
    setShowBottomSheet(true);

    Animated.spring(bottomSheetAnim, {
      toValue: 0,
      friction: 8,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  const handleViewProfile = useCallback(async () => {
    if (!selectedUser) {
      console.log('[SalaVirtual v6.2] ⚠️ No selected user');
      return;
    }
    
    console.log('[SalaVirtual v6.2] 🚀 Starting profile navigation');
    console.log('[SalaVirtual v6.2] 👤 Target user ID:', selectedUser.id);
    console.log('[SalaVirtual v6.2] 🎯 Current active tab:', activeTab);
    console.log('[SalaVirtual v6.2] 🏠 Current local ID:', localId);
    
    console.log('[SalaVirtual v6.2] 📋 Step 1 - Closing bottom sheet...');
    closeBottomSheet();
    setSelectedPrivateChat(null);
    
    console.log('[SalaVirtual v6.2] ⏳ Waiting for bottom sheet animation (300ms)...');
    await new Promise(resolve => setTimeout(resolve, 300));
    console.log('[SalaVirtual v6.2] ✅ Bottom sheet closed');
    
    console.log('[SalaVirtual v6.2] 🎯 Step 2 - Navigating to profile...');
    
    try {
      router.push({
        pathname: '/perfil/usuario',
        params: {
          userId: selectedUser.id,
          from: 'sala-virtual',
          returnTab: activeTab,
          localId: localId,
        },
      });
      console.log('[SalaVirtual v6.2] ✅ Navigation executed successfully');
    } catch (error) {
      console.error('[SalaVirtual v6.2] ❌ Error navigating:', error);
    }
  }, [selectedUser, user, localId, router, closeBottomSheet, activeTab]);

  const renderMessage = ({ item }: { item: Message }) => {
    const isOwnMessage = user && item.usuario_id === user.id;
    const avatarSize = Platform.OS === 'android' ? scaleIconSize(36) : 36;

    if (item.is_private && item.recipient_id !== user?.id && item.usuario_id !== user?.id) {
      return null;
    }

    const messageLabel = item.is_private ? '(Privado)' : '';
    
    const displayUsername = item.usuario.username 
      ? item.usuario.username.replace('@', '')
      : item.usuario.nombre;

    return (
      <TouchableOpacity
        style={[
          styles.messageWrapper,
          isOwnMessage ? styles.messageWrapperOwn : styles.messageWrapperOther,
        ]}
        onLongPress={() => {
          if (isOwnMessage) {
            console.log('[SalaVirtual v6.2] 🗑️ Long press on own message');
            handleDeleteMessage(item);
          }
        }}
        delayLongPress={500}
        activeOpacity={0.9}
      >
        {!isOwnMessage && (
          <TouchableOpacity
            style={[styles.messageAvatar, { width: avatarSize, height: avatarSize }]}
            onPress={() => {
              console.log('[SalaVirtual v6.2] 👤 Avatar clicked');
              const activeUser = uniqueActiveUsers.find(u => u.id === item.usuario_id);
              if (activeUser) {
                handleUserPress(activeUser);
              }
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

        <View style={styles.messageContentContainer}>
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

        {isOwnMessage && (
          <TouchableOpacity
            style={[styles.messageAvatar, { width: avatarSize, height: avatarSize }]}
            onPress={() => {
              console.log('[SalaVirtual v6.2] 👤 Navigating to own profile');
              router.push('/perfil');
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
      </TouchableOpacity>
    );
  };

  const renderUserItem = ({ item, index }: { item: ActiveUser; index: number }) => {
    const isCurrentUser = user && item.id === user.id;
    const isNearby = item.distance !== undefined && item.distance < PROXIMITY_THRESHOLD;
    const avatarSize = Platform.OS === 'android' ? scaleIconSize(70) : 70;
    
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
          console.log('[SalaVirtual v6.2] 👤 Grid user card pressed:', displayName);
          if (isCurrentUser) {
            console.log('[SalaVirtual v6.2] 👤 Navigating to own profile');
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
          <Animated.View 
            style={[
              styles.privateChatUnreadBadge, 
              { 
                backgroundColor: '#06B6D4',
                transform: [{ scale: pulseAnim }],
              }
            ]}
          >
            <View style={styles.privateChatUnreadDot} />
          </Animated.View>
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
              style={[
                styles.quickMessageButton, 
                { 
                  backgroundColor: themeColors.primary + '20', 
                  borderColor: themeColors.primary + '40',
                },
                Platform.OS === 'android' && { paddingVertical: 5 },
              ]}
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

    const recipientName = selectedUser.username 
      ? selectedUser.username.replace('@', '')
      : selectedUser.nombre;

    const profileAvatar = selectedUserProfile?.avatar || selectedUser.avatar;
    const profileBio = selectedUserProfile?.bio;

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
              zIndex: 1000,
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
            <View style={styles.coverContainer}>
              {profileAvatar ? (
                <ImageBackground
                  source={resolveImageSource(profileAvatar)}
                  style={styles.coverImage}
                  resizeMode="cover"
                >
                  <LinearGradient
                    colors={
                      mode === 'night' 
                        ? ['transparent', 'rgba(15, 10, 31, 0.3)', 'rgba(15, 10, 31, 0.85)']
                        : ['transparent', 'rgba(240, 249, 255, 0.3)', 'rgba(240, 249, 255, 0.85)']
                    }
                    style={styles.coverGradient}
                    locations={[0, 0.5, 1]}
                  />
                  
                  {mode === 'night' && (
                    <View style={styles.coverGlowEffect}>
                      <Animated.View 
                        style={[
                          styles.coverGlowCircle,
                          {
                            opacity: glowAnim.interpolate({
                              inputRange: [0, 1],
                              outputRange: [0.3, 0.7],
                            }),
                            backgroundColor: themeColors.primary,
                          }
                        ]}
                      />
                    </View>
                  )}
                  
                  <View style={styles.coverTextOverlay}>
                    <Text style={[
                      styles.coverUserName,
                      { 
                        fontSize: scaleFontSize(32), 
                        color: '#FFFFFF',
                      },
                      mode === 'night' && {
                        textShadowColor: themeColors.primary,
                        textShadowOffset: { width: 0, height: 0 },
                        textShadowRadius: 20,
                      }
                    ]}>
                      {recipientName}
                    </Text>
                    
                    {profileBio && (
                      <Text style={[
                        styles.coverUserBio,
                        { 
                          fontSize: scaleFontSize(15), 
                          color: 'rgba(255, 255, 255, 0.9)',
                        }
                      ]} numberOfLines={2}>
                        {profileBio}
                      </Text>
                    )}
                  </View>
                </ImageBackground>
              ) : (
                <LinearGradient
                  colors={['#2c3e50', '#000000']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.coverImage}
                >
                  <View style={styles.coverTextOverlay}>
                    <Text style={[
                      styles.coverUserName,
                      { 
                        fontSize: scaleFontSize(32), 
                        color: '#FFFFFF',
                      },
                      mode === 'night' && {
                        textShadowColor: themeColors.primary,
                        textShadowOffset: { width: 0, height: 0 },
                        textShadowRadius: 20,
                      }
                    ]}>
                      {recipientName}
                    </Text>
                    
                    {profileBio && (
                      <Text style={[
                        styles.coverUserBio,
                        { 
                          fontSize: scaleFontSize(15), 
                          color: 'rgba(255, 255, 255, 0.9)',
                        }
                      ]} numberOfLines={2}>
                        {profileBio}
                      </Text>
                    )}
                  </View>
                </LinearGradient>
              )}
            </View>
            
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
                  <Text style={[styles.messageButtonText, { fontSize: scaleFontSize(14), color: themeColors.text }]}>
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
                  <Text style={[styles.messageButtonText, { fontSize: scaleFontSize(14), color: themeColors.text }]}>
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
                  <Text style={[styles.messageButtonText, { fontSize: scaleFontSize(14), color: themeColors.text }]}>
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

  const renderTypingIndicator = () => {
    if (!selectedPrivateChat || typingUsers.size === 0) return null;
    
    const isPartnerTyping = typingUsers.has(selectedPrivateChat.userId);
    if (!isPartnerTyping) return null;

    const partnerName = selectedPrivateChat.username 
      ? selectedPrivateChat.username.replace('@', '')
      : selectedPrivateChat.nombre;

    return (
      <View style={[styles.typingIndicator, { backgroundColor: themeColors.cardBg }]}>
        <View style={styles.typingDots}>
          <Animated.View style={[styles.typingDot, { backgroundColor: themeColors.primary, transform: [{ scale: pulseAnim }] }]} />
          <Animated.View style={[styles.typingDot, { backgroundColor: themeColors.primary, transform: [{ scale: pulseAnim }] }]} />
          <Animated.View style={[styles.typingDot, { backgroundColor: themeColors.primary, transform: [{ scale: pulseAnim }] }]} />
        </View>
        <Text style={[styles.typingText, { fontSize: scaleFontSize(12), color: themeColors.textSecondary }]}>
          {partnerName} está escribiendo...
        </Text>
      </View>
    );
  };

  const totalUnreadMessages = privateChats.reduce((sum, chat) => sum + chat.unreadCount, 0);
  const hasUsersActivity = uniqueActiveUsers.length > 1;
  const hasPrivateActivity = totalUnreadMessages > 0;

  const headerTitleSize = Platform.OS === 'android' ? scaleFontSize(16) : 17;

  // ✅ v6.1: Dynamic padding calculation based on keyboard state
  const contentPaddingBottom = useMemo(() => {
    const baseInputHeight = 68;
    const quickMessagesHeight = showQuickMessages && activeTab === 'chat' ? 60 : 0;
    
    // ✅ CRITICAL: Dynamic padding based on keyboard visibility
    // When keyboard is OPEN: paddingBottom = 8 (minimal, let keyboard push)
    // When keyboard is CLOSED: paddingBottom = Math.max(insets.bottom, 8) (respect system buttons)
    const dynamicPadding = isKeyboardVisible ? 8 : Math.max(insets.bottom, 8);
    
    const totalPadding = baseInputHeight + quickMessagesHeight + dynamicPadding;
    
    console.log('[SalaVirtual v6.2] 📏 Content padding calculation:');
    console.log('[SalaVirtual v6.2] 📏 - Base input height:', baseInputHeight);
    console.log('[SalaVirtual v6.2] 📏 - Quick messages height:', quickMessagesHeight);
    console.log('[SalaVirtual v6.2] 📏 - Dynamic padding:', dynamicPadding);
    console.log('[SalaVirtual v6.2] 📏 - Keyboard visible:', isKeyboardVisible);
    console.log('[SalaVirtual v6.2] 📏 - Insets bottom:', insets.bottom);
    console.log('[SalaVirtual v6.2] 📏 - TOTAL padding bottom:', totalPadding);
    
    return totalPadding;
  }, [showQuickMessages, activeTab, insets.bottom, isKeyboardVisible]);

  const headerBackgroundColor = mode === 'day' 
    ? 'rgba(255, 255, 255, 0.95)' 
    : 'rgba(30, 20, 50, 0.95)';
  
  const headerIconColor = mode === 'day' ? '#1E293B' : '#FFFFFF';

  const handleLoginSuccess = useCallback(async () => {
    console.log('[SalaVirtual v6.2] ✅ Login successful - reloading room');
    if (isMounted.current) {
      setShowLoginModal(false);
    }
    
    console.log('[SalaVirtual v6.2] 🔄 Waiting for auth state to update...');
    await new Promise(resolve => setTimeout(resolve, 500));
    
    console.log('[SalaVirtual v6.2] 🔄 Reloading local data...');
    await loadLocalData();
    
    console.log('[SalaVirtual v6.2] 🚪 Checking in user...');
    const success = await handleCheckIn();
    
    if (success) {
      console.log('[SalaVirtual v6.2] ✅ User checked in, loading messages...');
      await loadMessages();
      subscribeToUpdates();
      subscribeToTypingEvents();
      await updateActiveUsers();
      await loadPrivateChats();
    }
  }, [loadLocalData, handleCheckIn, loadMessages, subscribeToUpdates, subscribeToTypingEvents, updateActiveUsers, loadPrivateChats]);

  if (!user) {
    return (
      <View style={[styles.container, { backgroundColor: themeColors.background[0] }]}>
        <Stack.Screen
          options={{
            title: 'Sala Virtual',
            headerShown: true,
            headerTitleStyle: {
              fontSize: headerTitleSize,
              color: headerIconColor,
            },
            headerStyle: {
              backgroundColor: headerBackgroundColor,
              height: 60 + insets.top,
            },
            headerTitleAlign: 'center',
            headerLeft: () => (
              <TouchableOpacity 
                onPress={() => {
                  if (router.canGoBack()) {
                    router.back();
                  } else {
                    router.replace('/');
                  }
                }}
                activeOpacity={0.7}
                style={{ 
                  width: 40, 
                  height: 40, 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  backgroundColor: 'transparent', 
                  shadowColor: 'transparent', 
                  shadowOpacity: 0, 
                  elevation: 0, 
                  borderWidth: 0 
                }}
              >
                <IconSymbol
                  ios_icon_name="arrow_back"
                  android_material_icon_name="arrow_back"
                  size={Platform.OS === 'android' ? scaleIconSize(24) : 24}
                  color={headerIconColor}
                />
              </TouchableOpacity>
            ),
          }}
        />
        
        <View style={styles.unauthContainer}>
          <LinearGradient
            colors={[colors.headerGradientStart, colors.headerGradientEnd]}
            style={styles.unauthIconContainer}
          >
            <IconSymbol 
              ios_icon_name="cube.fill" 
              android_material_icon_name="view_in_ar" 
              size={64} 
              color={colors.headerText} 
            />
          </LinearGradient>
          
          <Text style={[styles.unauthTitle, { fontSize: scaleFontSize(24) }]}>
            Sala Virtual
          </Text>
          
          <Text style={[styles.unauthMessage, { fontSize: scaleFontSize(16) }]}>
            Para acceder a la Sala Virtual necesitas iniciar sesión en BarLive
          </Text>
          
          <TouchableOpacity
            style={styles.unauthLoginButton}
            onPress={() => setShowLoginModal(true)}
          >
            <LinearGradient
              colors={[colors.headerGradientStart, colors.headerGradientEnd]}
              style={styles.unauthLoginButtonGradient}
            >
              <IconSymbol 
                ios_icon_name="person.fill" 
                android_material_icon_name="person" 
                size={20} 
                color={colors.headerText} 
              />
              <Text style={[styles.unauthLoginButtonText, { fontSize: scaleFontSize(16) }]}>
                Iniciar Sesión
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
        
        <VirtualRoomLoginModal
          visible={showLoginModal}
          onClose={() => setShowLoginModal(false)}
          onLoginSuccess={handleLoginSuccess}
          localName={local?.nombre || 'este local'}
        />
      </View>
    );
  }

  if (loading) {
    console.log('[SalaVirtual v6.2] ⏳ Showing loading state');
    return (
      <LinearGradient
        colors={themeColors.background}
        style={styles.loadingContainer}
      >
        <Stack.Screen
          options={{
            title: 'Sala Virtual',
            headerShown: true,
            headerTitleStyle: {
              fontSize: headerTitleSize,
              color: headerIconColor,
            },
            headerStyle: {
              backgroundColor: headerBackgroundColor,
              height: 60 + insets.top,
            },
            headerTitleAlign: 'center',
            headerLeft: () => (
              <TouchableOpacity 
                onPress={handleCheckOut}
                activeOpacity={0.7}
                style={{ 
                  width: 40, 
                  height: 40, 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  backgroundColor: 'transparent', 
                  shadowColor: 'transparent', 
                  shadowOpacity: 0, 
                  elevation: 0, 
                  borderWidth: 0 
                }}
              >
                <IconSymbol
                  ios_icon_name="arrow_back"
                  android_material_icon_name="arrow_back"
                  size={Platform.OS === 'android' ? scaleIconSize(24) : 24}
                  color={headerIconColor}
                />
              </TouchableOpacity>
            ),
          }}
        />
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
            headerShown: true,
            headerTitleStyle: {
              fontSize: headerTitleSize,
              color: headerIconColor,
            },
            headerStyle: {
              backgroundColor: headerBackgroundColor,
              height: 60 + insets.top,
            },
            headerTitleAlign: 'center',
            headerLeft: () => (
              <TouchableOpacity 
                onPress={() => {
                  router.push({
                    pathname: '/detalle/local',
                    params: { id: localId }
                  });
                }}
                activeOpacity={0.7}
                style={{ 
                  width: 40, 
                  height: 40, 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  backgroundColor: 'transparent', 
                  shadowColor: 'transparent', 
                  shadowOpacity: 0, 
                  elevation: 0, 
                  borderWidth: 0 
                }}
              >
                <IconSymbol
                  ios_icon_name="arrow_back"
                  android_material_icon_name="arrow_back"
                  size={Platform.OS === 'android' ? scaleIconSize(24) : 24}
                  color={headerIconColor}
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
                router.push({
                  pathname: '/detalle/local',
                  params: { id: localId }
                });
              }}
              activeOpacity={0.8}
            >
              <IconSymbol
                ios_icon_name="arrow_back"
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
    <LinearGradient
      colors={themeColors.background}
      style={styles.container}
    >
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={35}
      >
        <Stack.Screen
          options={{
            title: local?.nombre || 'Sala Virtual',
            headerShown: true,
            headerTitleStyle: {
              fontSize: headerTitleSize,
              color: headerIconColor,
            },
            headerStyle: {
              backgroundColor: headerBackgroundColor,
              height: 60 + insets.top,
              paddingTop: insets.top,
            },
            headerTitleAlign: 'center',
            headerLeft: () => (
              <TouchableOpacity 
                onPress={handleCheckOut}
                activeOpacity={0.7}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={{ 
                  width: 40, 
                  height: 40, 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  backgroundColor: 'transparent', 
                  shadowColor: 'transparent', 
                  shadowOpacity: 0, 
                  elevation: 0, 
                  borderWidth: 0 
                }}
              >
                <IconSymbol
                  ios_icon_name="xmark"
                  android_material_icon_name="close"
                  size={Platform.OS === 'ios' ? 24 : scaleIconSize(24)}
                  color={headerIconColor}
                />
              </TouchableOpacity>
            ),
            headerRight: () => (
              <React.Fragment>
                <TouchableOpacity 
                  activeOpacity={0.7}
                  disabled
                  style={{ 
                    marginRight: 12, 
                    width: 32, 
                    height: 32, 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    backgroundColor: 'transparent', 
                    shadowColor: 'transparent', 
                    shadowOpacity: 0, 
                    elevation: 0, 
                    borderWidth: 0 
                  }}
                >
                  <IconSymbol
                    ios_icon_name={mode === 'day' ? 'sun.max.fill' : 'moon.stars.fill'}
                    android_material_icon_name={mode === 'day' ? 'wb_sunny' : 'nightlight'}
                    size={Platform.OS === 'ios' ? 20 : scaleIconSize(20)}
                    color={headerIconColor}
                  />
                </TouchableOpacity>
                
                <TouchableOpacity 
                  activeOpacity={0.7}
                  disabled
                  style={{ 
                    marginRight: 8, 
                    backgroundColor: 'transparent', 
                    shadowColor: 'transparent', 
                    shadowOpacity: 0, 
                    elevation: 0, 
                    borderWidth: 0,
                    overflow: 'visible',
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 8, overflow: 'visible' }}>
                    <Animated.View 
                      style={[
                        styles.activeUsersDotHeader,
                        { transform: [{ scale: pulseAnim }], backgroundColor: themeColors.success }
                      ]} 
                    />
                    <Text style={[styles.activeUsersTextHeader, { fontSize: scaleFontSize(14), color: headerIconColor }]}>
                      {uniqueActiveUsers.length}
                    </Text>
                  </View>
                </TouchableOpacity>
              </React.Fragment>
            ),
          }}
        />

        {closingWarning && (
          <View style={[
            styles.warningBanner, 
            { 
              backgroundColor: themeColors.accent + '20', 
              borderBottomColor: themeColors.accent,
              paddingTop: 12,
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
            }
          ]}>
            <View style={styles.tabBar}>
              <TouchableOpacity
                style={styles.tab}
                onPress={() => {
                  console.log('[SalaVirtual v6.2] 🔄 Switching to Chat tab');
                  setActiveTab('chat');
                  if (selectedPrivateChat) {
                    closePrivateChat();
                  }
                }}
                activeOpacity={0.7}
              >
                {activeTab === 'chat' ? (
                  <LinearGradient
                    colors={[themeColors.primary, themeColors.secondary]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[
                      styles.tabGradient,
                      Platform.OS === 'android' && { paddingVertical: 7 },
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
                    },
                    Platform.OS === 'android' && { paddingVertical: 7 },
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
                onPress={() => {
                  console.log('[SalaVirtual v6.2] 🔄 Switching to Users tab');
                  setActiveTab('users');
                  if (selectedPrivateChat) {
                    closePrivateChat();
                  }
                }}
                activeOpacity={0.7}
              >
                {activeTab === 'users' ? (
                  <LinearGradient
                    colors={[themeColors.primary, themeColors.secondary]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[
                      styles.tabGradient,
                      Platform.OS === 'android' && { paddingVertical: 7 },
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
                    {hasUsersActivity && (
                      <Animated.View 
                        style={[
                          styles.activityDot,
                          { 
                            transform: [{ scale: pulseAnim }],
                            backgroundColor: '#06B6D4',
                          }
                        ]} 
                      />
                    )}
                  </LinearGradient>
                ) : (
                  <View style={[
                    styles.tabContent,
                    { 
                      backgroundColor: mode === 'day' ? 'rgba(0, 0, 0, 0.03)' : 'rgba(255, 255, 255, 0.05)',
                      borderRadius: 12,
                    },
                    Platform.OS === 'android' && { paddingVertical: 7 },
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
                    {hasUsersActivity && (
                      <Animated.View 
                        style={[
                          styles.activityDot,
                          { 
                            transform: [{ scale: pulseAnim }],
                            backgroundColor: '#06B6D4',
                          }
                        ]} 
                      />
                    )}
                  </View>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.tab}
                onPress={() => {
                  console.log('[SalaVirtual v6.2] 🔄 Switching to private tab');
                  setActiveTab('private');
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
                      Platform.OS === 'android' && { paddingVertical: 7 },
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
                    {hasPrivateActivity && (
                      <Animated.View 
                        style={[
                          styles.activityDot,
                          { 
                            transform: [{ scale: pulseAnim }],
                            backgroundColor: '#06B6D4',
                          }
                        ]} 
                      />
                    )}
                  </LinearGradient>
                ) : (
                  <View style={[
                    styles.tabContent,
                    { 
                      backgroundColor: mode === 'day' ? 'rgba(0, 0, 0, 0.03)' : 'rgba(255, 255, 255, 0.05)',
                      borderRadius: 12,
                    },
                    Platform.OS === 'android' && { paddingVertical: 7 },
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
                    {hasPrivateActivity && (
                      <Animated.View 
                        style={[
                          styles.activityDot,
                          { 
                            transform: [{ scale: pulseAnim }],
                            backgroundColor: '#06B6D4',
                          }
                        ]} 
                      />
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
                contentContainerStyle={[
                  styles.messagesContent, 
                  { 
                    flexGrow: 1,
                    paddingBottom: contentPaddingBottom
                  }
                ]}
                onContentSizeChange={() => {
                  console.log('[SalaVirtual v6.2] 📜 Content size changed, scrolling to bottom');
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
                  // ✅ v6.1: Dynamic paddingBottom based on keyboard state
                  paddingBottom: isKeyboardVisible ? 8 : Math.max(insets.bottom, 8),
                }
              ]}>
                <TouchableOpacity
                  style={[
                    styles.quickMessageToggle,
                    { backgroundColor: showQuickMessages ? themeColors.primary : themeColors.primary + '20' }
                  ]}
                  onPress={() => {
                    console.log('[SalaVirtual v6.2] ⚡ Toggling quick messages:', !showQuickMessages);
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
                  onFocus={() => {
                    console.log('[SalaVirtual v6.2] 🎹 Input focused - keyboard will appear');
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
                data={uniqueActiveUsers}
                renderItem={renderUserItem}
                keyExtractor={(item) => item.id}
                numColumns={4}
                contentContainerStyle={[
                  styles.usersGridContent, 
                  { 
                    paddingBottom: Platform.OS === 'android' 
                      ? Math.max(insets.bottom + 80, 100) 
                      : insets.bottom + 80 
                  }
                ]}
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
                  paddingBottom: Math.max(insets.bottom, 12),
                }
              ]}>
                <TouchableOpacity
                  style={[
                    styles.checkOutButtonLarge, 
                    { 
                      backgroundColor: themeColors.danger + '15', 
                      borderColor: themeColors.danger + '30',
                    },
                    Platform.OS === 'android' && { paddingVertical: 7 },
                  ]}
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
              {selectedPrivateChat ? (
                <React.Fragment>
                  <View style={[
                    styles.privateChatHeader,
                    { 
                      backgroundColor: themeColors.cardBg, 
                      borderBottomColor: themeColors.cardBorder,
                    }
                  ]}>
                    <TouchableOpacity
                      onPress={closePrivateChat}
                      style={styles.privateChatBackButton}
                      activeOpacity={0.7}
                    >
                      <IconSymbol
                        ios_icon_name="chevron.left"
                        android_material_icon_name="arrow_back"
                        size={Platform.OS === 'android' ? scaleIconSize(24) : 24}
                        color={themeColors.primary}
                      />
                    </TouchableOpacity>
                    
                    <View style={styles.privateChatHeaderInfo}>
                      {selectedPrivateChat.avatar ? (
                        <Image
                          source={resolveImageSource(selectedPrivateChat.avatar)}
                          style={[
                            styles.privateChatHeaderAvatar,
                            { 
                              width: Platform.OS === 'android' ? scaleIconSize(40) : 40,
                              height: Platform.OS === 'android' ? scaleIconSize(40) : 40,
                              borderRadius: Platform.OS === 'android' ? scaleIconSize(20) : 20,
                            }
                          ]}
                        />
                      ) : (
                        <View style={[
                          styles.privateChatHeaderAvatarPlaceholder,
                          { 
                            width: Platform.OS === 'android' ? scaleIconSize(40) : 40,
                            height: Platform.OS === 'android' ? scaleIconSize(40) : 40,
                            borderRadius: Platform.OS === 'android' ? scaleIconSize(20) : 20,
                            backgroundColor: themeColors.primary + '30',
                          }
                        ]}>
                          <IconSymbol
                            ios_icon_name="person.fill"
                            android_material_icon_name="person"
                            size={Platform.OS === 'android' ? scaleIconSize(20) : 20}
                            color={themeColors.text}
                          />
                        </View>
                      )}
                      
                      <Text style={[
                        styles.privateChatHeaderName,
                        { fontSize: scaleFontSize(17), color: themeColors.text }
                      ]}>
                        {selectedPrivateChat.username 
                          ? selectedPrivateChat.username.replace('@', '')
                          : selectedPrivateChat.nombre}
                      </Text>
                    </View>
                    
                    <TouchableOpacity
                      onPress={async () => {
                        console.log('[SalaVirtual v6.2] 🚀 Profile button pressed in private chat header');
                        
                        const targetUserId = selectedPrivateChat.userId;
                        
                        console.log('[SalaVirtual v6.2] 💬 Closing private chat...');
                        closePrivateChat();
                        
                        await new Promise(resolve => setTimeout(resolve, 300));
                        
                        console.log('[SalaVirtual v6.2] 🎯 Executing router.push() to profile');
                        try {
                          router.push({
                            pathname: '/perfil/usuario',
                            params: {
                              userId: targetUserId,
                              from: 'sala-virtual',
                              returnTab: activeTab,
                              localId: localId,
                            },
                          });
                          console.log('[SalaVirtual v6.2] ✅ Navigation complete');
                        } catch (error) {
                          console.error('[SalaVirtual v6.2] ❌ Error navigating:', error);
                        }
                      }}
                      style={[styles.privateChatProfileButton, { backgroundColor: themeColors.primary + '20' }]}
                      activeOpacity={0.7}
                    >
                      <IconSymbol
                        ios_icon_name="person.circle.fill"
                        android_material_icon_name="account_circle"
                        size={Platform.OS === 'android' ? scaleIconSize(24) : 24}
                        color={themeColors.primary}
                      />
                    </TouchableOpacity>
                  </View>

                  <FlatList
                    ref={privateChatListRef}
                    data={privateChatMessages}
                    renderItem={renderMessage}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={[
                      styles.messagesContent, 
                      { 
                        flexGrow: 1,
                        paddingBottom: contentPaddingBottom
                      }
                    ]}
                    onContentSizeChange={() => {
                      console.log('[SalaVirtual v6.2] 📜 Private chat content size changed, scrolling to bottom');
                      privateChatListRef.current?.scrollToEnd({ animated: true });
                    }}
                    onLayout={() => {
                      if (privateChatMessages.length > 0) {
                        setTimeout(() => {
                          privateChatListRef.current?.scrollToEnd({ animated: false });
                        }, 100);
                      }
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

                  {renderTypingIndicator()}

                  <View style={[
                    styles.inputContainer, 
                    { 
                      backgroundColor: themeColors.cardBg, 
                      borderTopColor: themeColors.cardBorder,
                      // ✅ v6.1: Dynamic paddingBottom based on keyboard state
                      paddingBottom: isKeyboardVisible ? 8 : Math.max(insets.bottom, 8),
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
                      onChangeText={handlePrivateMessageChange}
                      onFocus={() => {
                        console.log('[SalaVirtual v6.2] 🎹 Private input focused - keyboard will appear');
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
                </React.Fragment>
              ) : (
                <React.Fragment>
                  <FlatList
                    data={privateChats}
                    renderItem={renderPrivateChatItem}
                    keyExtractor={(item) => item.userId}
                    contentContainerStyle={[
                      styles.privateChatsContent, 
                      { 
                        paddingBottom: Platform.OS === 'android' 
                          ? Math.max(insets.bottom + 80, 100) 
                          : insets.bottom + 80 
                      }
                    ]}
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
                      paddingBottom: Math.max(insets.bottom, 12),
                    }
                  ]}>
                    <TouchableOpacity
                      style={[
                        styles.checkOutButtonLarge, 
                        { 
                          backgroundColor: themeColors.danger + '15', 
                          borderColor: themeColors.danger + '30',
                        },
                        Platform.OS === 'android' && { paddingVertical: 7 },
                      ]}
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
            </React.Fragment>
          )}
        </View>

        {renderBottomSheet()}

        <Modal
          visible={showDeleteModal}
          transparent
          animationType="fade"
          onRequestClose={cancelDeleteMessage}
        >
          <Pressable style={styles.deleteModalOverlay} onPress={cancelDeleteMessage}>
            <Pressable style={[styles.deleteModalContent, { backgroundColor: themeColors.cardBg }]}>
              <View style={[styles.deleteModalIconCircle, { backgroundColor: themeColors.danger + '20' }]}>
                <IconSymbol
                  ios_icon_name="trash.fill"
                  android_material_icon_name="delete"
                  size={Platform.OS === 'android' ? scaleIconSize(32) : 32}
                  color={themeColors.danger}
                />
              </View>
              
              <Text style={[styles.deleteModalTitle, { fontSize: scaleFontSize(20), color: themeColors.text }]}>
                ¿Eliminar mensaje?
              </Text>
              
              <Text style={[styles.deleteModalMessage, { fontSize: scaleFontSize(14), color: themeColors.textSecondary }]}>
                Este mensaje se eliminará permanentemente y no podrás recuperarlo.
              </Text>
              
              <View style={styles.deleteModalButtons}>
                <TouchableOpacity
                  style={[styles.deleteModalButton, styles.deleteModalButtonCancel, { backgroundColor: themeColors.textSecondary + '20' }]}
                  onPress={cancelDeleteMessage}
                  activeOpacity={0.7}
                  disabled={deleting}
                >
                  <Text style={[styles.deleteModalButtonText, { fontSize: scaleFontSize(16), color: themeColors.text }]}>
                    Cancelar
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.deleteModalButton, styles.deleteModalButtonDelete, { backgroundColor: themeColors.danger }]}
                  onPress={confirmDeleteMessage}
                  activeOpacity={0.7}
                  disabled={deleting}
                >
                  {deleting ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={[styles.deleteModalButtonText, { fontSize: scaleFontSize(16), color: '#FFFFFF' }]}>
                      Eliminar
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </Pressable>
          </Pressable>
        </Modal>

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
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  keyboardAvoidingContainer: {
    flex: 1,
  },
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
  unauthContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  unauthIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  unauthTitle: {
    fontWeight: '800',
    color: colors.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  unauthMessage: {
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  unauthLoginButton: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
  },
  unauthLoginButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  unauthLoginButtonText: {
    fontWeight: 'bold',
    color: colors.headerText,
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
    paddingBottom: 12,
    gap: 12,
    borderBottomWidth: 2,
  },
  warningText: {
    flex: 1,
    fontWeight: '600',
    lineHeight: 18,
  },
  activeUsersDotHeader: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  activeUsersTextHeader: {
    fontWeight: '700',
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
  activityDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginLeft: 4,
  },
  messagesContent: {
    padding: 16,
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
  privateChatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    gap: 8,
  },
  privateChatBackButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  privateChatHeaderInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  privateChatHeaderAvatar: {
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  privateChatHeaderAvatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  privateChatHeaderName: {
    fontWeight: '700',
    flex: 1,
  },
  privateChatProfileButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
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
  messageWrapper: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'flex-start',
    gap: 8,
  },
  messageWrapperOwn: {
    justifyContent: 'flex-end',
  },
  messageWrapperOther: {
    justifyContent: 'flex-start',
  },
  messageAvatar: {
    // Dynamic size
  },
  messageAvatarImage: {
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  messageAvatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  messageContentContainer: {
    maxWidth: '70%',
  },
  messageBubble: {
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
  },
  quickMessageEmoji: {
    fontSize: 18,
  },
  quickMessageText: {
    fontWeight: '600',
  },
  // ✅ v6.1: REMOVED fixed paddingBottom - now uses dynamic inline style
  // paddingBottom is calculated in render based on isKeyboardVisible state
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    borderTopWidth: 1,
    gap: 8,
    // ✅ paddingBottom is now applied inline dynamically
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
    width: 12,
    height: 12,
    borderRadius: 6,
    shadowColor: '#06B6D4',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 4,
  },
  privateChatUnreadDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
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
    paddingBottom: 20,
  },
  coverContainer: {
    width: '100%',
    height: 300,
    position: 'relative',
    marginBottom: 0,
    overflow: 'hidden',
    zIndex: 10,
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  coverGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 150,
  },
  coverGlowEffect: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  coverGlowCircle: {
    width: 400,
    height: 400,
    borderRadius: 200,
    shadowColor: '#EC4899',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 80,
    elevation: 20,
  },
  coverTextOverlay: {
    position: 'absolute',
    bottom: 24,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  coverUserName: {
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  coverUserBio: {
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 20,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  bottomSheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
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
    paddingHorizontal: 20,
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
    marginHorizontal: 20,
  },
  section: {
    marginBottom: 24,
    paddingHorizontal: 20,
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
  messageButtonText: {
    flex: 1,
  },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  typingDots: {
    flexDirection: 'row',
    gap: 4,
  },
  typingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  typingText: {
    fontStyle: 'italic',
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
  deleteModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  deleteModalContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },
  deleteModalIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  deleteModalTitle: {
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 12,
  },
  deleteModalMessage: {
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 28,
  },
  deleteModalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  deleteModalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteModalButtonCancel: {
    // Styles applied inline
  },
  deleteModalButtonDelete: {
    // Styles applied inline
  },
  deleteModalButtonText: {
    fontWeight: '700',
  },
});
