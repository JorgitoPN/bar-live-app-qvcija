
// ✅ LINT FIX: Move all imports to top of file
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { LinearGradient } from 'expo-linear-gradient';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { getEstadoLocal } from '@/utils/timeUtils';
import LoginPrompt from '@/components/common/LoginPrompt';
import VirtualRoomLoginModal from '@/components/common/VirtualRoomLoginModal';
import { scaleFontSize, scaleIconSize, getActionButtonPaddingVertical } from '@/utils/androidScaling';
import { calcularDistancia } from '@/utils/locationUtils';

// ✅ SALA VIRTUAL v6.4 - AUTHENTICATION INTERCEPTION + REDIRECT FLOW
console.log("✅ SALA VIRTUAL v6.4 - AUTHENTICATION INTERCEPTION + REDIRECT FLOW");

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
 * ✅ SALA VIRTUAL v6.4 - AUTHENTICATION INTERCEPTION + REDIRECT FLOW
 * 
 * NEW CHANGES v6.4:
 * - ✅ AUTHENTICATION INTERCEPTION: Shows modal when unauthenticated user tries to access
 * - ✅ INTELLIGENT REDIRECT: Saves intended destination and returns after login/register
 * - ✅ SEAMLESS UX: User is redirected back to virtual room after successful authentication
 * - ✅ CONSISTENT DESIGN: Modal respects text scaling (+2 points) and app styling
 * 
 * Previous changes v6.3:
 * - ✅ NAVIGATION OPTIMIZED: router.back() instead of router.replace()
 * - ✅ RESULT: Single tap closes virtual room, no double-close needed
 * 
 * Previous changes v6.2:
 * - ✅ REMOVED: handleCheckOut() call in useEffect cleanup
 * - ✅ NEW: isMounted ref to prevent state updates after unmount
 * - ✅ RESULT: Room no longer closes automatically on entry
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
  
  // ✅ v6.4: Check for redirect parameter from authentication flow
  const redirectParam = params.redirect as string | undefined;
  
  const returnTab = params.returnTab as string | undefined;
  const initialTab = (returnTab === 'chat' || returnTab === 'users' || returnTab === 'private') 
    ? returnTab as 'chat' | 'users' | 'private'
    : 'chat';
  
  console.log('[SalaVirtual v6.4] 🎯 INITIAL TAB from params:', initialTab);
  console.log('[SalaVirtual v6.4] 🔄 Redirect param:', redirectParam);
  
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
  // ✅ LINT FIX: Change Array<T> to T[]
  const [floatingParticles, setFloatingParticles] = useState<{
    id: string;
    emoji: string;
    x: Animated.Value;
    y: Animated.Value;
    opacity: Animated.Value;
    scale: Animated.Value;
  }[]>([]);
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

  // ✅ v6.4: Show login modal if user is not authenticated
  useEffect(() => {
    console.log('[SalaVirtual v6.4] 🔐 Checking authentication status...');
    console.log('[SalaVirtual v6.4] 👤 User:', user ? 'authenticated' : 'NOT authenticated');
    
    if (!user) {
      console.log('[SalaVirtual v6.4] 🚫 User not authenticated - showing login modal');
      setShowLoginModal(true);
      setLoading(false);
    } else {
      console.log('[SalaVirtual v6.4] ✅ User authenticated - proceeding to load room');
    }
  }, [user]);

  // ✅ v6.2: Set isMounted on mount and cleanup
  useEffect(() => {
    console.log('[SalaVirtual v6.4] 🎬 Component mounted');
    isMounted.current = true;
    
    return () => {
      console.log('[SalaVirtual v6.4] 🧹 Component unmounting');
      isMounted.current = false;
    };
  }, []);

  // ✅ v6.1: Keyboard listeners to track keyboard state
  useEffect(() => {
    console.log('[SalaVirtual v6.4] 🎹 Setting up keyboard listeners');
    
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      (e) => {
        console.log('[SalaVirtual v6.4] ⬆️ Keyboard opened, height:', e.endCoordinates.height);
        if (isMounted.current) {
          setKeyboardHeight(e.endCoordinates.height);
          setIsKeyboardVisible(true);
        }
      }
    );
    
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => {
        console.log('[SalaVirtual v6.4] ⬇️ Keyboard closed');
        if (isMounted.current) {
          setKeyboardHeight(0);
          setIsKeyboardVisible(false);
        }
      }
    );

    return () => {
      console.log('[SalaVirtual v6.4] 🧹 Removing keyboard listeners');
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
        console.log('[SalaVirtual v6.4] 🔵 Loaded read partners from storage:', readPartners);
        return new Set(readPartners);
      }
      
      console.log('[SalaVirtual v6.4] 🔵 No stored read partners found');
      return new Set();
    } catch (error) {
      console.error('[SalaVirtual v6.4] ❌ Error loading from storage:', error);
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
        console.log('[SalaVirtual v6.4] 🔵 Saved read status for partner:', partnerId);
      }
    } catch (error) {
      console.error('[SalaVirtual v6.4] ❌ Error saving to storage:', error);
    }
  }, [getReadMessagesKey]);

  const fetchUserProfile = useCallback(async (userId: string): Promise<UserProfile | null> => {
    try {
      console.log('[SalaVirtual v6.4] 🔍 Fetching user profile from database for userId:', userId);
      
      const { data, error } = await supabase
        .from('usuarios')
        .select('id, nombre, username, avatar, bio')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('[SalaVirtual v6.4] ❌ Error fetching user profile:', error);
        return null;
      }

      console.log('[SalaVirtual v6.4] ✅ User profile fetched successfully');
      console.log('[SalaVirtual v6.4] 👤 Name:', data.nombre);
      console.log('[SalaVirtual v6.4] 🖼️ Avatar:', data.avatar || 'NO AVATAR');
      console.log('[SalaVirtual v6.4] 📝 Username:', data.username || 'NO USERNAME');

      return {
        id: data.id,
        nombre: data.nombre,
        username: data.username,
        avatar: data.avatar,
        bio: data.bio,
      };
    } catch (error) {
      console.error('[SalaVirtual v6.4] ❌ Error in fetchUserProfile:', error);
      return null;
    }
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const newMode = getDayNightMode();
      console.log('[SalaVirtual v6.4] 🌓 Checking day/night mode:', newMode);
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
          console.log('[SalaVirtual v6.4] ✅ User location obtained');
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
      
      console.log('[SalaVirtual v6.4] ⏰ Time until closing:', totalMinutes, 'minutes');
      
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
      console.error('[SalaVirtual v6.4] ❌ No localId provided');
      if (isMounted.current) {
        setLoading(false);
      }
      return;
    }

    try {
      console.log('[SalaVirtual v6.4] 🏠 Loading local data for:', localId);
      
      const { data, error } = await supabase
        .from('locales')
        .select('id, nombre, imagen_url, horarios_completos, google_business_status, estado_actual, propietario_id')
        .eq('id', localId)
        .single();

      if (error) {
        console.error('[SalaVirtual v6.4] ❌ Error loading local:', error);
        if (isMounted.current) {
          setLoading(false);
        }
        return;
      }

      console.log('[SalaVirtual v6.4] ✅ Local loaded:', data.nombre);
      
      if (!isMounted.current) return;
      
      setLocal(data);
      
      const estadoLocal = getEstadoLocal(data);
      const isOpen = estadoLocal.estaAbierto === true;
      
      if (!isOpen) {
        console.log('[SalaVirtual v6.4] 🔒 Local is closed');
        setLocalClosed(true);
        setLoading(false);
      } else {
        console.log('[SalaVirtual v6.4] ✅ Local is open');
        setLocalClosed(false);
      }
    } catch (error) {
      console.error('[SalaVirtual v6.4] ❌ Error:', error);
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, [localId]);

  const checkUserCheckin = useCallback(async () => {
    if (!user || !localId) return false;

    try {
      console.log('[SalaVirtual v6.4] 🔍 Checking if user is checked in...');
      
      const { data, error } = await supabase
        .from('sala_virtual_checkins')
        .select('*')
        .eq('usuario_id', user.id)
        .eq('local_id', localId)
        .eq('activo', true)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('[SalaVirtual v6.4] ❌ Error checking checkin:', error);
        return false;
      }

      const checkedIn = !!data;
      console.log('[SalaVirtual v6.4] ✅ User checked in status:', checkedIn);
      
      if (isMounted.current) {
        setIsCheckedIn(checkedIn);
      }
      return checkedIn;
    } catch (error) {
      console.error('[SalaVirtual v6.4] ❌ Error:', error);
      return false;
    }
  }, [user, localId]);

  const handleCheckIn = useCallback(async () => {
    if (!user || !localId) return false;

    try {
      console.log('[SalaVirtual v6.4] 🚪 User checking in...');
      
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
        console.error('[SalaVirtual v6.4] ❌ Error inserting checkin:', error);
        if (isMounted.current) {
          setIsCheckedIn(false);
        }
        throw new Error('No se pudo entrar en la sala');
      }

      console.log('[SalaVirtual v6.4] ✅ User checked in successfully');
      
      if (isMounted.current) {
        setCheckingIn(false);
      }
      return true;
    } catch (error: any) {
      console.error('[SalaVirtual v6.4] ❌ Error during checkin:', error);
      if (isMounted.current) {
        setCheckingIn(false);
      }
      return false;
    }
  }, [user, localId]);

  /**
   * ✅ v6.3: CRITICAL FIX - NAVIGATION STACK OPTIMIZATION
   * 
   * Changed from router.replace() to router.back() to prevent double-close issue.
   */
  const handleCheckOut = useCallback(async () => {
    if (!user || !localId) return;

    try {
      console.log('[SalaVirtual v6.4] 🚪 BOTÓN CERRAR PULSADO - Manual checkout');
      console.log('[SalaVirtual v6.4] 🚪 User checking out...');
      console.log('[SalaVirtual v6.4] 🔧 FIX v6.3: Using router.back() instead of router.replace()');
      console.log('[SalaVirtual v6.4] 🔧 REASON: Prevents adding local details to stack again');
      console.log('[SalaVirtual v6.4] 🔧 RESULT: Single tap closes virtual room, no double-close needed');
      
      await supabase
        .from('sala_virtual_checkins')
        .update({
          activo: false,
          checked_out_at: new Date().toISOString(),
        })
        .eq('usuario_id', user.id)
        .eq('local_id', localId)
        .eq('activo', true);

      console.log('[SalaVirtual v6.4] ✅ User checked out successfully');

      // ✅ v6.3 FIX: Use router.back() instead of router.replace()
      // This prevents adding local details page to stack again
      router.back();
      
      console.log('[SalaVirtual v6.4] ✅ Navigation executed with back() - returns to previous screen');
      console.log('[SalaVirtual v6.4] ✅ No duplicate pages in stack - single close works correctly');
    } catch (error) {
      console.error('[SalaVirtual v6.4] ❌ Error checking out:', error);
    }
  }, [user, localId, router]);

  const loadMessages = useCallback(async () => {
    if (!localId) {
      console.error('[SalaVirtual v6.4] ❌ No localId for loadMessages');
      return;
    }
    
    try {
      console.log('[SalaVirtual v6.4] 🔥 LOADING INITIAL MESSAGES');
      console.log('[SalaVirtual v6.4] 📍 Local ID:', localId);
      
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

      console.log('[SalaVirtual v6.4] 📦 RAW DATA from Supabase:', JSON.stringify(data, null, 2));
      console.log('[SalaVirtual v6.4] ❌ RAW ERROR from Supabase:', JSON.stringify(error, null, 2));
      
      if (error) {
        console.error('[SalaVirtual v6.4] ❌ Error loading initial messages:', error);
        if (isMounted.current) {
          setLoading(false);
        }
        return;
      }

      if (!data) {
        console.log('[SalaVirtual v6.4] ⚠️ Data is null, setting empty array');
        if (isMounted.current) {
          setMessages([]);
          setLoading(false);
        }
        return;
      }

      if (data.length === 0) {
        console.log('[SalaVirtual v6.4] ⚠️ No messages found');
        if (isMounted.current) {
          setMessages([]);
          setLoading(false);
        }
        return;
      }

      console.log('[SalaVirtual v6.4] ✅ DATOS RECIBIDOS CORRECTAMENTE');
      console.log('[SalaVirtual v6.4] 📦 Número de mensajes:', data.length);

      const formattedMessages: Message[] = data
        .filter(msg => {
          if (!msg.usuario) {
            console.warn('[SalaVirtual v6.4] ⚠️ Message without user data:', msg.id);
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

      console.log('[SalaVirtual v6.4] ✅ Formatted', formattedMessages.length, 'public messages');

      messageIdsRef.current.clear();
      formattedMessages.forEach(msg => {
        messageIdsRef.current.add(msg.id);
      });

      console.log('[SalaVirtual v6.4] 🔑 Tracking', messageIdsRef.current.size, 'message IDs');

      if (!isMounted.current) return;
      
      setMessages(formattedMessages);
      
      if (formattedMessages.length > 0) {
        lastPublicMessageTimestampRef.current = formattedMessages[formattedMessages.length - 1].created_at;
        console.log('[SalaVirtual v6.4] 📅 Last public message timestamp:', lastPublicMessageTimestampRef.current);
      }
      
      setLoading(false);
      
      setTimeout(() => {
        console.log('[SalaVirtual v6.4] 📜 Scrolling to bottom');
        flatListRef.current?.scrollToEnd({ animated: false });
      }, 300);
    } catch (error) {
      console.error('[SalaVirtual v6.4] ❌ Error loading messages:', error);
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, [localId]);

  const triggerReceivedAnimation = useCallback((messageText: string, tipo: string) => {
    console.log('[SalaVirtual v6.4] 🎬 Triggering received animation for tipo:', tipo);
    
    if (tipo !== 'privado') {
      console.log('[SalaVirtual v6.4] ⏭️ Not a private message, skipping animation');
      return;
    }
    
    if (!isMounted.current) return;
    
    const emojiMatch = messageText.match(/[\u{1F300}-\u{1F9FF}]/u);
    const emoji = emojiMatch ? emojiMatch[0] : '✨';
    
    console.log('[SalaVirtual v6.4] 🎬 Showing received animation with emoji:', emoji);
    
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
      console.log('[SalaVirtual v6.4] 🔄 Syncing messages...');
      
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
        console.log('[SalaVirtual v6.4] 📅 Fetching messages after:', lastPublicMessageTimestampRef.current);
      } else {
        console.log('[SalaVirtual v6.4] 📅 Fetching all messages (no timestamp set)');
      }

      const { data: publicData, error: publicError } = await publicQuery;

      if (publicError) {
        console.error('[SalaVirtual v6.4] ❌ Error syncing public messages:', publicError);
      } else if (publicData && publicData.length > 0) {
        console.log('[SalaVirtual v6.4] 📨 Found', publicData.length, 'NEW public messages');
        
        const newMessages: Message[] = publicData
          .filter(msg => {
            if (!msg.usuario) {
              console.warn('[SalaVirtual v6.4] ⚠️ Message without user data:', msg.id);
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
            console.log('[SalaVirtual v6.4] ⏭️ Skipping duplicate message ID:', msg.id);
            return false;
          }
          return true;
        });

        if (uniqueNewMessages.length > 0 && isMounted.current) {
          console.log('[SalaVirtual v6.4] ✅ Adding', uniqueNewMessages.length, 'unique new messages to UI');
          
          uniqueNewMessages.forEach(msg => {
            messageIdsRef.current.add(msg.id);
            
            if (msg.usuario_id === user.id) {
              const pendingId = msg.contenido + msg.usuario_id;
              pendingMessageIds.current.delete(pendingId);
              console.log('[SalaVirtual v6.4] ✅ Removed pending message:', pendingId);
            }
            
            if (msg.usuario_id !== user.id && msg.tipo === 'privado') {
              console.log('[SalaVirtual v6.4] 🎬 Received private message from another user!');
              console.log('[SalaVirtual v6.4] 👤 From:', msg.usuario.nombre);
              console.log('[SalaVirtual v6.4] 💬 Content:', msg.contenido);
              triggerReceivedAnimation(msg.contenido, msg.tipo);
            }
          });
          
          console.log('[SalaVirtual v6.4] 🔑 Now tracking', messageIdsRef.current.size, 'message IDs');
          
          setMessages(prev => {
            const updated = [...prev, ...uniqueNewMessages].sort((a, b) => 
              new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            );
            
            console.log('[SalaVirtual v6.4] 📊 Total messages in UI after update:', updated.length);
            
            return updated;
          });
          
          const latestMessage = uniqueNewMessages[uniqueNewMessages.length - 1];
          lastPublicMessageTimestampRef.current = latestMessage.created_at;
          console.log('[SalaVirtual v6.4] 📅 Updated last timestamp to:', lastPublicMessageTimestampRef.current);
          
          setTimeout(() => {
            console.log('[SalaVirtual v6.4] 📜 Scrolling to new messages');
            flatListRef.current?.scrollToEnd({ animated: true });
          }, 100);
        } else {
          console.log('[SalaVirtual v6.4] ℹ️ No new unique messages to add');
        }
      } else {
        console.log('[SalaVirtual v6.4] ℹ️ No new public messages found');
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
        console.error('[SalaVirtual v6.4] ❌ Error syncing private messages:', privateError);
      } else if (privateData && privateData.length > 0) {
        console.log('[SalaVirtual v6.4] 📨 Found', privateData.length, 'new private messages');
        
        if (privateData.length > 0) {
          lastPrivateMessageTimestampRef.current = privateData[privateData.length - 1].created_at;
        }
        
        console.log('[SalaVirtual v6.4] 🔵 Reloading private chats to update unread counts');
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
                console.log('[SalaVirtual v6.4] ✅ Adding', uniqueNew.length, 'new private messages to UI');
                
                uniqueNew.forEach(msg => {
                  if (msg.usuario_id === user.id) {
                    const pendingId = msg.contenido + msg.usuario_id;
                    pendingMessageIds.current.delete(pendingId);
                  }
                  
                  if (msg.usuario_id !== user.id && msg.tipo === 'privado') {
                    console.log('[SalaVirtual v6.4] 🎬 Received private message!');
                    console.log('[SalaVirtual v6.4] 👤 From:', msg.usuario.nombre);
                    console.log('[SalaVirtual v6.4] 💬 Content:', msg.contenido);
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
      console.error('[SalaVirtual v6.4] ❌ Error syncing messages:', error);
    }
  }, [localId, user, selectedPrivateChat, triggerReceivedAnimation]);

  useEffect(() => {
    if (!localId || !user || !isCheckedIn) {
      console.log('[SalaVirtual v6.4] ⏸️ Polling not started - missing requirements');
      return;
    }

    console.log('[SalaVirtual v6.4] 🔥 STARTING MESSAGE POLLING (every 1.5 seconds)');
    
    syncMessages();
    
    messageSyncIntervalRef.current = setInterval(() => {
      syncMessages();
    }, MESSAGE_SYNC_INTERVAL);

    return () => {
      if (messageSyncIntervalRef.current) {
        console.log('[SalaVirtual v6.4] 🛑 Stopping message polling');
        clearInterval(messageSyncIntervalRef.current);
        messageSyncIntervalRef.current = null;
      }
    };
  }, [localId, user, isCheckedIn, syncMessages]);

  const uniqueActiveUsers = useMemo(() => {
    if (!activeUsers || activeUsers.length === 0) {
      return [];
    }

    console.log('[SalaVirtual v6.4] 🔍 Filtering duplicate users...');
    console.log('[SalaVirtual v6.4] 📊 Total users before filtering:', activeUsers.length);
    
    const seenUserIds = new Set<string>();
    const uniqueUsers = activeUsers.filter(user => {
      if (seenUserIds.has(user.id)) {
        console.log('[SalaVirtual v6.4] ⚠️ Duplicate user found and removed:', user.nombre, user.username);
        return false;
      }
      seenUserIds.add(user.id);
      return true;
    });

    console.log('[SalaVirtual v6.4] ✅ Unique users after filtering:', uniqueUsers.length);
    console.log('[SalaVirtual v6.4] 📋 User IDs:', uniqueUsers.map(u => u.username || u.nombre).join(', '));
    
    return uniqueUsers;
  }, [activeUsers]);

  const updateActiveUsers = useCallback(async () => {
    if (!localId) return;

    try {
      console.log('[SalaVirtual v6.4] 🔄 Updating active users list...');
      
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
        console.error('[SalaVirtual v6.4] ❌ Error loading active users:', error);
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

      console.log('[SalaVirtual v6.4] 👥 Found', users.length, 'active users (before deduplication)');

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
        console.log('[SalaVirtual v6.4] ✅ Current user moved to first position');
      }

      if (isMounted.current) {
        setActiveUsers(users);
      }
    } catch (error) {
      console.error('[SalaVirtual v6.4] ❌ Error:', error);
    }
  }, [localId, userLocation, user]);

  const markPrivateMessagesAsRead = useCallback(async (partnerId: string) => {
    if (!user || !localId) return;

    try {
      console.log('[SalaVirtual v6.4] 🔵 Marking private messages as read from:', partnerId);
      
      const { error } = await supabase
        .from('sala_virtual_interacciones')
        .update({ leido: true })
        .eq('local_id', localId)
        .eq('tipo', 'privado')
        .eq('recipient_id', user.id)
        .eq('usuario_id', partnerId)
        .eq('leido', false);

      if (error) {
        console.error('[SalaVirtual v6.4] ❌ Error marking messages as read:', error);
      } else {
        console.log('[SalaVirtual v6.4] ✅ Messages marked as read in database');
      }
      
      console.log('[SalaVirtual v6.4] 🔵 Saving read status to AsyncStorage for:', partnerId);
      await saveReadMessagesToStorage(localId, user.id, partnerId);
      
      console.log('[SalaVirtual v6.4] 🔵 Updating unread counter IMMEDIATELY in frontend state');
      
      if (!isMounted.current) return;
      
      setPrivateChats(prev => 
        prev.map(chat => {
          if (chat.userId === partnerId) {
            console.log('[SalaVirtual v6.4] 🔵 Setting unreadCount to 0 for user:', partnerId);
            return { ...chat, unreadCount: 0 };
          }
          return chat;
        })
      );
      console.log('[SalaVirtual v6.4] ✅ Unread counter set to 0 for user:', partnerId);
    } catch (error) {
      console.error('[SalaVirtual v6.4] ❌ Error:', error);
    }
  }, [user, localId, saveReadMessagesToStorage]);

  // ✅ LINT FIX: Added loadReadMessagesFromStorage to dependencies
  const loadPrivateChats = useCallback(async () => {
    if (!user || !localId) return;

    try {
      console.log('[SalaVirtual v6.4] 🔄 Loading private chats...');
      
      const readPartners = await loadReadMessagesFromStorage(localId, user.id);
      console.log('[SalaVirtual v6.4] 🔵 Read partners from storage:', Array.from(readPartners));
      
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
        console.error('[SalaVirtual v6.4] ❌ Error loading private chats:', error);
        return;
      }

      const chatMap = new Map<string, PrivateChat>();
      const unreadCountMap = new Map<string, number>();
      
      console.log('[SalaVirtual v6.4] 🔵 Counting ONLY unread messages WHERE leido = false AND recipient_id = user.id');
      
      (privateMessages || []).forEach(msg => {
        const partnerId = msg.usuario_id === user.id ? msg.recipient_id : msg.usuario_id;
        if (!partnerId) return;
        
        if (msg.recipient_id === user.id && msg.usuario_id !== user.id && msg.leido === false) {
          if (!readPartners.has(partnerId)) {
            const currentCount = unreadCountMap.get(partnerId) || 0;
            unreadCountMap.set(partnerId, currentCount + 1);
            console.log('[SalaVirtual v6.4] 🔵 Unread message from', partnerId, '- count:', currentCount + 1);
          } else {
            console.log('[SalaVirtual v6.4] 🔵 Skipping count for', partnerId, '- already marked as read in storage');
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
              nombre: partnerData.nombre || 'Usuario',
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
      
      console.log('[SalaVirtual v6.4] ✅ Private chats loaded:', chats.length);
      console.log('[SalaVirtual v6.4] 🔵 Total unread messages (respecting storage):', 
        chats.reduce((sum, chat) => sum + chat.unreadCount, 0)
      );
      
      if (isMounted.current) {
        setPrivateChats(chats);
      }
    } catch (error) {
      console.error('[SalaVirtual v6.4] ❌ Error loading private chats:', error);
    }
  }, [user, localId, activeUsers, loadReadMessagesFromStorage]);

  const handleTypingStart = useCallback(() => {
    if (!selectedPrivateChat || !user || !localId) return;

    console.log('[SalaVirtual v6.4] ⌨️ User started typing to:', selectedPrivateChat.userId);
    
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

    console.log('[SalaVirtual v6.4] ⌨️ User stopped typing to:', selectedPrivateChat.userId);
    
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

    console.log('[SalaVirtual v6.4] ⌨️ Setting up typing indicator subscription');

    const typingChannel = supabase
      .channel(`typing_events_${localId}_${user.id}_${Date.now()}`)
      .on('broadcast', { event: 'typing_start' }, (payload: any) => {
        console.log('[SalaVirtual v6.4] ⌨️ Received typing_start:', payload);
        
        if (payload.payload.recipientId === user.id && selectedPrivateChat?.userId === payload.payload.userId) {
          console.log('[SalaVirtual v6.4] ⌨️ Partner is typing...');
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
        console.log('[SalaVirtual v6.4] ⌨️ Received typing_stop:', payload);
        
        if (payload.payload.recipientId === user.id) {
          console.log('[SalaVirtual v6.4] ⌨️ Partner stopped typing');
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
        console.log('[SalaVirtual v6.4] ⌨️ Typing channel status:', status);
      });

    typingChannelRef.current = typingChannel;

    return () => {
      console.log('[SalaVirtual v6.4] 🔌 Unsubscribing from typing channel');
      supabase.removeChannel(typingChannel);
    };
  }, [localId, user, selectedPrivateChat]);

  const subscribeToUpdates = useCallback(() => {
    if (!localId || !user) return () => {};

    console.log('[SalaVirtual v6.4] 📡 Setting up real-time subscriptions...');

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
          console.log('[SalaVirtual v6.4] 📨 Real-time INSERT event received:', payload);
          
          const newRecord = payload.new as any;
          
          if (newRecord.usuario_id === user.id) {
            console.log('[SalaVirtual v6.4] ⏭️ Skipping own message (already in UI optimistically)');
            return;
          }

          console.log('[SalaVirtual v6.4] 🔄 Triggering immediate sync for new message from other user');
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
          console.log('[SalaVirtual v6.4] 🗑️ Message deleted from DB:', payload);
          
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
          console.log('[SalaVirtual v6.4] 🔄 Message updated in DB:', payload);
          
          const updatedRecord = payload.new as any;
          
          if (updatedRecord.tipo === 'privado' && updatedRecord.leido === true) {
            console.log('[SalaVirtual v6.4] 🔵 Message marked as read via real-time, reloading chats');
            setTimeout(() => {
              loadPrivateChats();
            }, 300);
          }
        }
      )
      .subscribe((status) => {
        console.log('[SalaVirtual v6.4] 📡 Chat channel status:', status);
        
        if (status === 'SUBSCRIBED') {
          console.log('[SalaVirtual v6.4] ✅ Real-time subscription active');
        } else if (status === 'CHANNEL_ERROR') {
          console.warn('[SalaVirtual v6.4] ⚠️ Real-time subscription error - polling will handle all sync');
        } else if (status === 'TIMED_OUT') {
          console.warn('[SalaVirtual v6.4] ⏱️ Real-time subscription timed out - polling will handle all sync');
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
          console.log('[SalaVirtual v6.4] 👤 Check-in event:', payload.eventType);
          updateActiveUsers();
        }
      )
      .subscribe((status) => {
        console.log('[SalaVirtual v6.4] 📡 Checkins channel status:', status);
      });

    chatChannelRef.current = chatChannel;
    checkinsChannelRef.current = checkinsChannel;

    return () => {
      console.log('[SalaVirtual v6.4] 🔌 Unsubscribing from channels');
      supabase.removeChannel(chatChannel);
      supabase.removeChannel(checkinsChannel);
    };
  }, [localId, user, updateActiveUsers, loadPrivateChats, syncMessages]);

  // ✅ v6.2: CRITICAL FIX - Removed automatic checkout on unmount
  // This was causing the room to close immediately after opening
  useEffect(() => {
    if (!localId || hasInitialized.current) return;
    hasInitialized.current = true;

    console.log('[SalaVirtual v6.4] 🚀 INITIALIZING VIRTUAL ROOM');

    const init = async () => {
      console.log('[SalaVirtual v6.4] 1️⃣ Loading local data...');
      await loadLocalData();
      
      console.log('[SalaVirtual v6.4] 2️⃣ Checking user check-in status...');
      const checkedIn = await checkUserCheckin();
      
      if (!checkedIn && !localClosed && user) {
        console.log('[SalaVirtual v6.4] 3️⃣ User not checked in, checking in now...');
        const success = await handleCheckIn();
        if (!success) {
          console.error('[SalaVirtual v6.4] ❌ Check-in failed, aborting initialization');
          return;
        }
      }
      
      await new Promise(resolve => setTimeout(resolve, 300));
      
      console.log('[SalaVirtual v6.4] 4️⃣ Loading initial messages...');
      await loadMessages();
      
      console.log('[SalaVirtual v6.4] 5️⃣ Setting up real-time subscriptions...');
      subscribeToUpdates();
      
      console.log('[SalaVirtual v6.4] 6️⃣ Setting up typing events...');
      subscribeToTypingEvents();
      
      console.log('[SalaVirtual v6.4] 7️⃣ Updating active users...');
      await updateActiveUsers();
      
      console.log('[SalaVirtual v6.4] 8️⃣ Loading private chats...');
      await loadPrivateChats();
      
      console.log('[SalaVirtual v6.4] ✅ INITIALIZATION COMPLETE');
    };

    init();

    // ✅ v6.2: CRITICAL FIX - DO NOT auto-checkout on unmount
    // This allows users to navigate away and return without being kicked out
    // Only manual close button should trigger checkout
    return () => {
      console.log('[SalaVirtual v6.4] 🧹 Cleanup: Cleaning up subscriptions only (NO auto-checkout)');
      // Channels will be cleaned up by their own useEffect cleanup
    };
  }, [localId, loadLocalData, checkUserCheckin, handleCheckIn, loadMessages, subscribeToUpdates, subscribeToTypingEvents, updateActiveUsers, loadPrivateChats, localClosed, user]);

  useEffect(() => {
    if (activeTab === 'private' && user && localId) {
      console.log('[SalaVirtual v6.4] 🔄 Private tab active, reloading chats');
      loadPrivateChats();
    }
  }, [activeTab, user, localId, loadPrivateChats]);

  useEffect(() => {
    if (selectedPrivateChat && user && localId) {
      console.log('[SalaVirtual v6.4] 🔄 selectedPrivateChat changed, syncing state...');
      console.log('[SalaVirtual v6.4] 🔄 Partner ID:', selectedPrivateChat.userId);
      
      const syncProfile = async () => {
        console.log('[SalaVirtual v6.4] 🔄 Fetching fresh profile for partner...');
        const profile = await fetchUserProfile(selectedPrivateChat.userId);
        
        if (profile && isMounted.current) {
          console.log('[SalaVirtual v6.4] ✅ Profile fetched and updated');
          console.log('[SalaVirtual v6.4] 🖼️ Avatar:', profile.avatar || 'NO AVATAR');
          setSelectedUserProfile(profile);
        }
      };
      
      syncProfile();
      
      console.log('[SalaVirtual v6.4] 🔄 Marking messages as read...');
      markPrivateMessagesAsRead(selectedPrivateChat.userId);
      
      const cleanup = subscribeToTypingEvents();
      return cleanup;
    }
  }, [selectedPrivateChat, user, localId, fetchUserProfile, markPrivateMessagesAsRead, subscribeToTypingEvents]);

  const sendPublicMessage = useCallback(async (content: string) => {
    if (!user || !localId || !content.trim()) {
      console.log('[SalaVirtual v6.4] ⚠️ Cannot send message - missing requirements');
      return;
    }

    try {
      console.log('[SalaVirtual v6.4] 📤 Sending public message:', content);
      setSending(true);

      const pendingId = content + user.id;
      pendingMessageIds.current.add(pendingId);

      const messageId = `pending-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const now = new Date().toISOString();

      console.log('[SalaVirtual v6.4] 🔥 Fetching user profile from database...');
      const userProfile = await fetchUserProfile(user.id);
      
      const currentUserProfile = userProfile || {
        id: user.id,
        nombre: user.user_metadata?.nome || user.email?.split('@')[0] || 'Usuario',
        username: user.user_metadata?.username,
        avatar: user.user_metadata?.avatar,
      };

      console.log('[SalaVirtual v6.4] 🔥 Using profile data from database');
      console.log('[SalaVirtual v6.4] 👤 User profile:', currentUserProfile.nombre);
      console.log('[SalaVirtual v6.4] 🖼️ Avatar URL:', currentUserProfile.avatar || 'NO AVATAR');

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

      console.log('[SalaVirtual v6.4] ✨ Adding message optimistically with avatar from database');
      console.log('[SalaVirtual v6.4] 👤 User:', optimisticMsg.usuario.nombre, '| Avatar:', !!optimisticMsg.usuario.avatar);
      
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

      console.log('[SalaVirtual v6.4] 💾 Saving message to database...');
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
        console.error('[SalaVirtual v6.4] ❌ Error saving message to DB:', error);
        
        messageIdsRef.current.delete(messageId);
        if (isMounted.current) {
          setMessages(prev => prev.filter(m => m.id !== messageId));
        }
        pendingMessageIds.current.delete(pendingId);
      } else {
        console.log('[SalaVirtual v6.4] ✅ Public message saved to DB with id:', insertedMessage.id);
        
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
              console.log('[SalaVirtual v6.4] ℹ️ Real message already in UI from polling');
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
      console.error('[SalaVirtual v6.4] ❌ Error:', error);
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

    console.log(`[SalaVirtual v6.4] 🎉 Floating reaction triggered: ${emoji}`);
  }, []);

  // ✅ LINT FIX: Removed unnecessary 'uniqueActiveUsers' dependency
  const sendPredefinedMessage = useCallback(async (recipientId: string, messageText: string) => {
    if (!user || !localId) return;

    try {
      console.log('[SalaVirtual v6.4] 📤 Sending predefined message:', messageText, 'to:', recipientId);
      
      const pendingId = messageText + user.id + recipientId;
      pendingMessageIds.current.add(pendingId);

      const messageId = `pending-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const now = new Date().toISOString();

      console.log('[SalaVirtual v6.4] 🔥 Fetching user profile from database for predefined message...');
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

      const recipient = activeUsers.find(u => u.id === recipientId);
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
          
          console.log('[SalaVirtual v6.4] ✨ Creating new private chat optimistically');
          setPrivateChats(prev => [newChat, ...prev]);
        } else {
          console.log('[SalaVirtual v6.4] ✨ Updating existing private chat optimistically');
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
      
      console.log('[SalaVirtual v6.4] 💾 Saving with tipo = "privado"');
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
        console.error('[SalaVirtual v6.4] ❌ Error saving private message to DB:', insertError);
      } else {
        console.log('[SalaVirtual v6.4] ✅ Private message saved to database with tipo = "privado"');
        
        setTimeout(() => {
          pendingMessageIds.current.delete(pendingId);
        }, 1000);
      }

      console.log(`[SalaVirtual v6.4] ✅ Message sent to ${recipientName}`);
      
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
      
      console.log('[SalaVirtual v6.4] 🔄 Switching to private conversations tab');
      if (isMounted.current) {
        setActiveTab('private');
      }
      
      setTimeout(() => {
        loadPrivateChats();
      }, 2000);
    } catch (error) {
      console.error('[SalaVirtual v6.4] ❌ Error sending predefined message:', error);
      
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
  }, [user, localId, activeUsers, loadPrivateChats, privateChats, animationScale, animationOpacity, mode, fetchUserProfile, triggerFloatingReaction]);

  // ✅ LINT FIX: Added closeBottomSheet to dependencies
  const closeBottomSheet = useCallback(() => {
    console.log('[SalaVirtual v6.4] 📋 Closing bottom sheet');
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

  // ✅ LINT FIX: Removed unnecessary 'user' dependency
  const sendPrivateMessage = useCallback(async (recipientId: string, content: string) => {
    if (!user || !localId || !content.trim()) return;

    try {
      console.log('[SalaVirtual v6.4] 📤 Sending private message to:', recipientId);
      
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

      console.log('[SalaVirtual v6.4] 🔥 Fetching user profile from database for private message...');
      const userProfile = await fetchUserProfile(user.id);
      
      const currentUserProfile = userProfile || {
        id: user.id,
        nombre: user.user_metadata?.nombre || user.email?.split('@')[0] || 'Usuario',
        username: user.user_metadata?.username,
        avatar: user.user_metadata?.avatar,
      };

      console.log('[SalaVirtual v6.4] 🔥 Using profile data from database for private message');

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

      console.log('[SalaVirtual v6.4] ✨ Adding private message optimistically to UI');
      
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
        console.error('[SalaVirtual v6.4] ❌ Error saving private message to DB:', insertError);
        if (isMounted.current) {
          setPrivateChatMessages(prev => prev.filter(m => m.id !== messageId));
        }
        pendingMessageIds.current.delete(pendingId);
      } else {
        console.log('[SalaVirtual v6.4] ✅ Private message saved to database with id:', insertedMessage.id);
        
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

      console.log('[SalaVirtual v6.4] ✅ Private message sent');
    } catch (error) {
      console.error('[SalaVirtual v6.4] ❌ Error sending private message:', error);
    }
  }, [user, localId, activeUsers, isTyping, handleTypingStop, fetchUserProfile]);

  const openPrivateChat = useCallback(async (chat: PrivateChat) => {
    if (!user || !localId) return;

    try {
      const displayName = chat.username 
        ? chat.username.replace('@', '')
        : chat.nombre;
      
      console.log('[SalaVirtual v6.4] 💬 Opening private chat with:', displayName);
      console.log('[SalaVirtual v6.4] 🔵 Unread count before:', chat.unreadCount);
      
      if (isMounted.current) {
        setSelectedPrivateChat(chat);
      }
      
      console.log('[SalaVirtual v6.4] 🔵 Marking messages as read in database...');
      await markPrivateMessagesAsRead(chat.userId);
      
      console.log('[SalaVirtual v6.4] 🔵 Unread count set to 0 in frontend');
      
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
        console.error('[SalaVirtual v6.4] ❌ Error loading private messages:', error);
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
      
      console.log('[SalaVirtual v6.4] ✅ Private messages loaded:', formattedMessages.length);
      
      setTimeout(() => {
        if (formattedMessages.length > 0) {
          privateChatListRef.current?.scrollToEnd({ animated: true });
        }
      }, 300);
    } catch (error) {
      console.error('[SalaVirtual v6.4] ❌ Error opening private chat:', error);
    }
  }, [user, localId, markPrivateMessagesAsRead]);

  const closePrivateChat = useCallback(() => {
    console.log('[SalaVirtual v6.4] 💬 Closing private chat');
    
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
      console.log('[SalaVirtual v6.4] ⚠️ Cannot delete message - not owner');
      return;
    }

    console.log('[SalaVirtual v6.4] 🗑️ Showing delete confirmation for message:', message.id);
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
      console.log('[SalaVirtual v6.4] 🗑️ Deleting message:', messageToDelete.id);

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
        console.error('[SalaVirtual v6.4] ❌ Error deleting message:', error);
        
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
        console.log('[SalaVirtual v6.4] ✅ Message deleted successfully');
        
        if (messageToDelete.is_private) {
          setTimeout(() => {
            loadPrivateChats();
          }, 500);
        }
      }
    } catch (error) {
      console.error('[SalaVirtual v6.4] ❌ Error deleting message:', error);
    } finally {
      if (isMounted.current) {
        setDeleting(false);
        setShowDeleteModal(false);
        setMessageToDelete(null);
      }
    }
  }, [messageToDelete, user, loadPrivateChats]);

  const cancelDeleteMessage = useCallback(() => {
    console.log('[SalaVirtual v6.4] ❌ Delete cancelled');
    if (isMounted.current) {
      setShowDeleteModal(false);
      setMessageToDelete(null);
    }
  }, []);

  const handleUserPress = async (selectedUser: ActiveUser) => {
    const displayName = selectedUser.username 
      ? selectedUser.username.replace('@', '')
      : selectedUser.nombre;
    
    console.log('[SalaVirtual v6.4] 👤 User pressed:', displayName);
    
    if (selectedUser.id === user?.id) {
      console.log('[SalaVirtual v6.4] ⚠️ Cannot interact with self');
      return;
    }
    
    console.log('[SalaVirtual v6.4] 🔥 Fetching user profile for bottom sheet cover...');
    const profile = await fetchUserProfile(selectedUser.id);
    
    if (!isMounted.current) return;
    
    if (profile) {
      console.log('[SalaVirtual v6.4] ✅ Profile fetched for bottom sheet');
      console.log('[SalaVirtual v6.4] 🖼️ Cover photo (avatar):', profile.avatar || 'NO AVATAR');
      setSelectedUserProfile(profile);
    } else {
      console.log('[SalaVirtual v6.4] ⚠️ Could not fetch profile, using cached data');
      setSelectedUserProfile({
        id: selectedUser.id,
        nombre: selectedUser.nombre,
        username: selectedUser.username,
        avatar: selectedUser.avatar,
      });
    }
    
    console.log('[SalaVirtual v6.4] 📋 Opening bottom sheet for user');
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
      console.log('[SalaVirtual v6.4] ⚠️ No selected user');
      return;
    }
    
    console.log('[SalaVirtual v6.4] 🚀 Starting profile navigation');
    console.log('[SalaVirtual v6.4] 👤 Target user ID:', selectedUser.id);
    console.log('[SalaVirtual v6.4] 🎯 Current active tab:', activeTab);
    console.log('[SalaVirtual v6.4] 🏠 Current local ID:', localId);
    
    console.log('[SalaVirtual v6.4] 📋 Step 1 - Closing bottom sheet...');
    closeBottomSheet();
    setSelectedPrivateChat(null);
    
    console.log('[SalaVirtual v6.4] ⏳ Waiting for bottom sheet animation (300ms)...');
    await new Promise(resolve => setTimeout(resolve, 300));
    console.log('[SalaVirtual v6.4] ✅ Bottom sheet closed');
    
    console.log('[SalaVirtual v6.4] 🎯 Step 2 - Navigating to profile...');
    
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
      console.log('[SalaVirtual v6.4] ✅ Navigation executed successfully');
    } catch (error) {
      console.error('[SalaVirtual v6.4] ❌ Error navigating:', error);
    }
  }, [selectedUser, localId, router, closeBottomSheet, activeTab]);

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
            console.log('[SalaVirtual v6.4] 🗑️ Long press on own message');
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
              console.log('[SalaVirtual v6.4] 👤 Avatar clicked');
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
              console.log('[SalaVirtual v6.4] 👤 Navigating to own profile');
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
          console.log('[SalaVirtual v6.4] 👤 Grid user card pressed:', displayName);
          if (isCurrentUser) {
            console.log('[SalaVirtual v6.4] 👤 Navigating to own profile');
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
    
    console.log('[SalaVirtual v6.4] 📏 Content padding calculation:');
    console.log('[SalaVirtual v6.4] 📏 - Base input height:', baseInputHeight);
    console.log('[SalaVirtual v6.4] 📏 - Quick messages height:', quickMessagesHeight);
    console.log('[SalaVirtual v6.4] 📏 - Dynamic padding:', dynamicPadding);
    console.log('[SalaVirtual v6.4] 📏 - Keyboard visible:', isKeyboardVisible);
    console.log('[SalaVirtual v6.4] 📏 - Insets bottom:', insets.bottom);
    console.log('[SalaVirtual v6.4] 📏 - TOTAL padding bottom:', totalPadding);
    
    return totalPadding;
  }, [showQuickMessages, activeTab, insets.bottom, isKeyboardVisible]);

  const headerBackgroundColor = mode === 'day' 
    ? 'rgba(255, 255, 255, 0.95)' 
    : 'rgba(30, 20, 50, 0.95)';
  
  const headerIconColor = mode === 'day' ? '#1E293B' : '#FFFFFF';

  /**
   * ✅ v6.4: AUTHENTICATION INTERCEPTION HANDLER
   * 
   * This callback is triggered when user successfully logs in or registers
   * from the VirtualRoomLoginModal. It reloads the room and checks the user in.
   */
  const handleLoginSuccess = useCallback(async () => {
    console.log('[SalaVirtual v6.4] ✅ Login successful - reloading room');
    if (isMounted.current) {
      setShowLoginModal(false);
    }
    
    console.log('[SalaVirtual v6.4] 🔄 Waiting for auth state to update...');
    await new Promise(resolve => setTimeout(resolve, 500));
    
    console.log('[SalaVirtual v6.4] 🔄 Reloading local data...');
    await loadLocalData();
    
    console.log('[SalaVirtual v6.4] 🚪 Checking in user...');
    const success = await handleCheckIn();
    
    if (success) {
      console.log('[SalaVirtual v6.4] ✅ User checked in, loading messages...');
      await loadMessages();
      subscribeToUpdates();
      subscribeToTypingEvents();
      await updateActiveUsers();
      await loadPrivateChats();
    }
  }, [loadLocalData, handleCheckIn, loadMessages, subscribeToUpdates, subscribeToTypingEvents, updateActiveUsers, loadPrivateChats]);

  /**
   * ✅ v6.4: AUTHENTICATION INTERCEPTION - SHOW LOGIN MODAL
   * 
   * When user is not authenticated, show the login modal instead of
   * the room content. The modal allows login/register without leaving
   * the virtual room context.
   */
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
              height: 60,Perfect! Now let me fix the remaining lint errors in the other files:

<write file="app/admin/gestionar-locales.tsx">
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  ActivityIndicator,
  Switch,
  Modal,
  Pressable,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { colors, commonStyles } from '@/styles/commonStyles';
import { supabase } from '@/utils/supabase';
import ShoppingCart from '@/components/payment/ShoppingCart';

interface Local {
  id: string;
  nombre: string;
  tipo: string;
  direccion: string;
  provincia: string;
  imagen_url?: string;
  galeria_urls?: string[];
  activo: boolean;
  destacado: boolean;
  enriquecido: boolean;
  source_type: string;
  fecha_creacion: string;
  propietario_id?: string;
  plan_activo?: string;
  google_place_id?: string;
  propietario?: {
    nombre: string;
    email: string;
  };
}

interface Usuario {
  id: string;
  nombre: string;
  email: string;
  rol_app: string;
}

const LOCALES_POR_PAGINA = 50;

/**
 * ✅ GESTIONAR LOCALES v244.0 - SHOPPING CART IN HEADER
 * 
 * NEW FEATURES v244.0:
 * - ✅ Shopping cart icon in header (admin mode)
 * - ✅ Cart navigates to full-screen page (not modal)
 */

export default function GestionarLocalesScreen() {
  const router = useRouter();
  const [locales, setLocales] = useState<Local[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  
  const [filtroPropietario, setFiltroPropietario] = useState<string>('todos');
  const [filtroTipo, setFiltroTipo] = useState<string>('todos');
  const [filtroEstado, setFiltroEstado] = useState<string>('todos');
  const [filtroEnriquecido, setFiltroEnriquecido] = useState<string>('todos');
  const [filtroDestacado, setFiltroDestacado] = useState<string>('todos');
  const [filtroFuente, setFiltroFuente] = useState<string>('todos');
  const [paginaActual, setPaginaActual] = useState(1);
  const [totalLocales, setTotalLocales] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const [showFiltersModal, setShowFiltersModal] = useState(false);
  const [showAssignUserModal, setShowAssignUserModal] = useState(false);
  const [selectedLocalForAssignment, setSelectedLocalForAssignment] = useState<Local | null>(null);

  const [modoSeleccion, setModoSeleccion] = useState(false);
  const [localesSeleccionados, setLocalesSeleccionados] = useState<Set<string>>(new Set());

  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [searchUsuarioQuery, setSearchUsuarioQuery] = useState('');
  const [debouncedUsuarioQuery, setDebouncedUsuarioQuery] = useState('');
  const [loadingUsuarios, setLoadingUsuarios] = useState(false);
  const [assigningUser, setAssigningUser] = useState(false);

  const [contadores, setContadores] = useState({
    total: 0,
    activos: 0,
    inactivos: 0,
    enriquecidos: 0,
    noEnriquecidos: 0,
    conPropietario: 0,
    sinPropietario: 0,
    osm: 0,
    google: 0,
    manual: 0,
  });

  useEffect(() => {
    console.log('[GestionarLocales v244.0] 📝 Main search query changed:', searchQuery);
    
    const timer = setTimeout(() => {
      console.log('[GestionarLocales v244.0] 🔍 Applying debounced search');
      setDebouncedQuery(searchQuery);
    }, 500);
    
    return () => {
      clearTimeout(timer);
    };
  }, [searchQuery]);

  useEffect(() => {
    console.log('[GestionarLocales v244.0] 📝 User search query changed:', searchUsuarioQuery);
    
    const timer = setTimeout(() => {
      console.log('[GestionarLocales v244.0] 🔍 Applying debounced user search');
      setDebouncedUsuarioQuery(searchUsuarioQuery);
    }, 300);
    
    return () => {
      clearTimeout(timer);
    };
  }, [searchUsuarioQuery]);

  const cargarContadores = useCallback(async () => {
    try {
      console.log('[GestionarLocales v244.0] Loading counters...');
      
      const { count: totalCount, error: countError } = await supabase
        .from('locales')
        .select('*', { count: 'exact', head: true })
        .or('source_type.eq.osm,enriquecido.eq.true');

      if (countError) {
        console.error('[GestionarLocales v244.0] Error loading total count:', countError);
        throw countError;
      }

      console.log('[GestionarLocales v244.0] Total valid locales:', totalCount);

      const { data, error } = await supabase
        .from('locales')
        .select('activo, enriquecido, propietario_id, source_type')
        .or('source_type.eq.osm,enriquecido.eq.true');

      if (error) {
        console.error('[GestionarLocales v244.0] Error loading stats:', error);
        throw error;
      }

      const stats = {
        total: totalCount || 0,
        activos: data?.filter(l => l.activo).length || 0,
        inactivos: data?.filter(l => !l.activo).length || 0,
        enriquecidos: data?.filter(l => l.enriquecido).length || 0,
        noEnriquecidos: data?.filter(l => !l.enriquecido).length || 0,
        conPropietario: data?.filter(l => l.propietario_id).length || 0,
        sinPropietario: data?.filter(l => !l.propietario_id).length || 0,
        osm: data?.filter(l => l.source_type === 'osm' && !l.enriquecido).length || 0,
        google: data?.filter(l => l.enriquecido).length || 0,
        manual: data?.filter(l => l.source_type === 'manual').length || 0,
      };

      console.log('[GestionarLocales v244.0] Stats:', stats);
      setContadores(stats);
    } catch (error) {
      console.error('[GestionarLocales v244.0] Error cargando contadores:', error);
    }
  }, []);

  const cargarLocales = useCallback(async (reset: boolean = false, currentPage: number = 1) => {
    try {
      console.log('[GestionarLocales v244.0] Loading locales, reset:', reset, 'page:', currentPage);
      
      if (reset) {
        setInitialLoading(true);
      } else {
        setLoadingMore(true);
      }

      const from = reset ? 0 : (currentPage - 1) * LOCALES_POR_PAGINA;
      const to = from + LOCALES_POR_PAGINA - 1;

      console.log('[GestionarLocales v244.0] Fetching range:', from, '-', to);

      let query = supabase
        .from('locales')
        .select(`
          *,
          propietario:usuarios!propietario_id(
            nombre,
            email
          )
        `, { count: 'exact' })
        .or('source_type.eq.osm,enriquecido.eq.true')
        .order('fecha_creacion', { ascending: false })
        .range(from, to);

      if (debouncedQuery) {
        query = query.or(`nombre.ilike.%${debouncedQuery}%,direccion.ilike.%${debouncedQuery}%`);
      }

      if (filtroPropietario === 'con-dueno') {
        query = query.not('propietario_id', 'is', null);
      } else if (filtroPropietario === 'sin-dueno') {
        query = query.is('propietario_id', null);
      }

      if (filtroTipo !== 'todos') {
        query = query.eq('tipo', filtroTipo);
      }

      if (filtroEstado === 'activos') {
        query = query.eq('activo', true);
      } else if (filtroEstado === 'inactivos') {
        query = query.eq('activo', false);
      }

      if (filtroEnriquecido === 'enriquecidos') {
        query = query.eq('enriquecido', true);
      } else if (filtroEnriquecido === 'no-enriquecidos') {
        query = query.eq('enriquecido', false);
      }

      if (filtroDestacado === 'destacados') {
        query = query.eq('destacado', true);
      } else if (filtroDestacado === 'no-destacados') {
        query = query.eq('destacado', false);
      }

      if (filtroFuente === 'osm') {
        query = query.eq('source_type', 'osm').eq('enriquecido', false);
      } else if (filtroFuente === 'google') {
        query = query.eq('enriquecido', true);
      } else if (filtroFuente === 'manual') {
        query = query.eq('source_type', 'manual');
      }

      const { data, error, count } = await query;

      if (error) {
        console.error('[GestionarLocales v244.0] Error cargando locales:', error);
        throw error;
      }

      console.log('[GestionarLocales v244.0] Locales loaded:', data?.length || 0, 'Total count:', count);
      
      if (reset) {
        setLocales(data || []);
        setPaginaActual(2);
      } else {
        setLocales(prev => [...prev, ...(data || [])]);
        setPaginaActual(currentPage + 1);
      }
      
      setTotalLocales(count || 0);
      setHasMore((data?.length || 0) === LOCALES_POR_PAGINA);
      
      console.log('[GestionarLocales v244.0] Has more:', (data?.length || 0) === LOCALES_POR_PAGINA);
    } catch (error) {
      console.error('[GestionarLocales v244.0] Error cargando locales:', error);
      Alert.alert('Error', 'No se pudieron cargar los locales');
    } finally {
      setInitialLoading(false);
      setLoadingMore(false);
    }
  }, [debouncedQuery, filtroPropietario, filtroTipo, filtroEstado, filtroEnriquecido, filtroDestacado, filtroFuente]);

  useEffect(() => {
    console.log('[GestionarLocales v244.0] Initial load');
    cargarContadores();
    cargarLocales(true, 1);
  }, [cargarContadores, cargarLocales]);

  useEffect(() => {
    if (!initialLoading) {
      console.log('[GestionarLocales v244.0] Filters changed, reloading...');
      cargarLocales(true, 1);
    }
  }, [debouncedQuery, filtroPropietario, filtroTipo, filtroEstado, filtroEnriquecido, filtroDestacado, filtroFuente, initialLoading, cargarLocales]);

  const searchUsuarios = useCallback(async (query: string) => {
    if (query.length < 2) {
      setUsuarios([]);
      return;
    }

    setLoadingUsuarios(true);
    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select('id, nombre, email, rol_app')
        .or(`nombre.ilike.%${query}%,email.ilike.%${query}%`)
        .limit(10);

      if (error) throw error;

      setUsuarios(data || []);
    } catch (error) {
      console.error('[GestionarLocales v244.0] Error searching users:', error);
    } finally {
      setLoadingUsuarios(false);
    }
  }, []);

  useEffect(() => {
    if (debouncedUsuarioQuery.trim().length >= 2) {
      searchUsuarios(debouncedUsuarioQuery);
    } else {
      setUsuarios([]);
    }
  }, [debouncedUsuarioQuery, searchUsuarios]);

  const assignLocalToUser = useCallback(async (userId: string, userName: string) => {
    if (!selectedLocalForAssignment) return;

    setAssigningUser(true);
    try {
      const { error: updateError } = await supabase
        .from('locales')
        .update({ 
          propietario_id: userId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedLocalForAssignment.id);

      if (updateError) throw updateError;

      const { error: junctionError } = await supabase
        .from('propietarios_locales')
        .insert({
          propietario_id: userId,
          local_id: selectedLocalForAssignment.id,
          rol: 'propietario',
          activo: true,
        });

      if (junctionError && junctionError.code !== '23505') {
        console.error('[GestionarLocales v244.0] Error creating junction entry:', junctionError);
      }

      Alert.alert(
        'Éxito',
        `Local "${selectedLocalForAssignment.nombre}" asignado a ${userName}`,
        [{ text: 'OK' }]
      );

      setShowAssignUserModal(false);
      setSelectedLocalForAssignment(null);
      setSearchUsuarioQuery('');
      setDebouncedUsuarioQuery('');
      setUsuarios([]);
      
      cargarLocales(true, 1);
      cargarContadores();
    } catch (error) {
      console.error('[GestionarLocales v244.0] Error assigning local:', error);
      Alert.alert('Error', 'No se pudo asignar el local al usuario');
    } finally {
      setAssigningUser(false);
    }
  }, [selectedLocalForAssignment, cargarLocales, cargarContadores]);

  const toggleEstadoLocal = useCallback(async (localId: string, activo: boolean) => {
    try {
      const { error } = await supabase
        .from('locales')
        .update({ activo: !activo })
        .eq('id', localId);

      if (error) throw error;

      setLocales(prevLocales =>
        prevLocales.map(local =>
          local.id === localId ? { ...local, activo: !activo } : local
        )
      );

      Alert.alert(
        'Éxito',
        `Local ${!activo ? 'activado' : 'desactivado'} correctamente`
      );
      cargarContadores();
    } catch (error) {
      console.error('[GestionarLocales v244.0] Error actualizando local:', error);
      Alert.alert('Error', 'No se pudo actualizar el local');
    }
  }, [cargarContadores]);

  const toggleDestacadoLocal = useCallback(async (localId: string, destacado: boolean) => {
    try {
      const { error } = await supabase
        .from('locales')
        .update({ destacado: !destacado })
        .eq('id', localId);

      if (error) throw error;

      setLocales(prevLocales =>
        prevLocales.map(local =>
          local.id === localId ? { ...local, destacado: !destacado } : local
        )
      );
    } catch (error) {
      console.error('[GestionarLocales v244.0] Error actualizando destacado:', error);
      Alert.alert('Error', 'No se pudo actualizar el estado destacado');
    }
  }, []);

  const eliminarLocal = useCallback(async (localId: string) => {
    try {
      const { error } = await supabase
        .from('locales')
        .delete()
        .eq('id', localId);

      if (error) throw error;

      setLocales(prevLocales => prevLocales.filter(local => local.id !== localId));
      setTotalLocales(prev => prev - 1);

      Alert.alert('Éxito', 'Local eliminado correctamente');
      cargarContadores();
    } catch (error) {
      console.error('[GestionarLocales v244.0] Error eliminando local:', error);
      Alert.alert('Error', 'No se pudo eliminar el local');
    }
  }, [cargarContadores]);

  const toggleSeleccionLocal = useCallback((localId: string) => {
    setLocalesSeleccionados(prev => {
      const newSet = new Set(prev);
      if (newSet.has(localId)) {
        newSet.delete(localId);
      } else {
        newSet.add(localId);
      }
      return newSet;
    });
  }, []);

  const seleccionarTodos = useCallback(() => {
    if (localesSeleccionados.size === locales.length) {
      setLocalesSeleccionados(new Set());
    } else {
      setLocalesSeleccionados(new Set(locales.map(l => l.id)));
    }
  }, [locales, localesSeleccionados.size]);

  const eliminarSeleccionados = useCallback(async () => {
    if (localesSeleccionados.size === 0) {
      Alert.alert('Aviso', 'No hay locales seleccionados');
      return;
    }

    Alert.alert(
      'Confirmar Eliminación',
      `¿Estás seguro de eliminar ${localesSeleccionados.size} locales? Esta acción no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              const idsArray = Array.from(localesSeleccionados);
              
              const batchSize = 100;
              for (let i = 0; i < idsArray.length; i += batchSize) {
                const batch = idsArray.slice(i, i + batchSize);
                const { error } = await supabase
                  .from('locales')
                  .delete()
                  .in('id', batch);

                if (error) throw error;
              }

              setLocales(prevLocales => 
                prevLocales.filter(local => !localesSeleccionados.has(local.id))
              );
              setTotalLocales(prev => prev - localesSeleccionados.size);

              Alert.alert('Éxito', `Se eliminaron ${localesSeleccionados.size} locales correctamente`);
              setLocalesSeleccionados(new Set());
              setModoSeleccion(false);
              cargarContadores();
            } catch (error) {
              console.error('[GestionarLocales v244.0] Error eliminando locales:', error);
              Alert.alert('Error', 'No se pudieron eliminar todos los locales');
            }
          },
        },
      ]
    );
  }, [localesSeleccionados, cargarContadores]);

  const limpiarFiltros = useCallback(() => {
    setFiltroPropietario('todos');
    setFiltroTipo('todos');
    setFiltroEstado('todos');
    setFiltroEnriquecido('todos');
    setFiltroDestacado('todos');
    setFiltroFuente('todos');
    setSearchQuery('');
    setDebouncedQuery('');
  }, []);

  const hayFiltrosActivos = useCallback(() => {
    return filtroPropietario !== 'todos' ||
           filtroTipo !== 'todos' ||
           filtroEstado !== 'todos' ||
           filtroEnriquecido !== 'todos' ||
           filtroDestacado !== 'todos' ||
           filtroFuente !== 'todos' ||
           debouncedQuery !== '';
  }, [filtroPropietario, filtroTipo, filtroEstado, filtroEnriquecido, filtroDestacado, filtroFuente, debouncedQuery]);

  const handleLoadMore = useCallback(() => {
    if (hasMore && !loadingMore && !initialLoading) {
      console.log('[GestionarLocales v244.0] Loading more, page:', paginaActual);
      cargarLocales(false, paginaActual);
    }
  }, [hasMore, loadingMore, initialLoading, paginaActual, cargarLocales]);

  const openAssignUserModal = useCallback((local: Local) => {
    setSelectedLocalForAssignment(local);
    setShowAssignUserModal(true);
    setSearchUsuarioQuery('');
    setDebouncedUsuarioQuery('');
    setUsuarios([]);
  }, []);

  const getSourceBadge = (local: Local) => {
    if (local.enriquecido) {
      return { text: 'Google', color: '#4285F4' };
    } else if (local.source_type === 'osm') {
      return { text: 'OSM', color: '#7EBC6F' };
    } else {
      return { text: 'Manual', color: '#8B5CF6' };
    }
  };

  const LocalCard = useCallback(({ local }: { local: Local }) => {
    const coverPhoto = local.imagen_url || (local.galeria_urls && local.galeria_urls.length > 0 ? local.galeria_urls[0] : null);
    const sourceBadge = getSourceBadge(local);
    
    return (
      <View style={styles.localCard}>
        <Pressable
          style={styles.localCardContent}
          onPress={() => {
            if (modoSeleccion) {
              toggleSeleccionLocal(local.id);
            } else {
              router.push(`/detalle/local?id=${local.id}`);
            }
          }}
          onLongPress={() => {
            if (!modoSeleccion) {
              setModoSeleccion(true);
              toggleSeleccionLocal(local.id);
            }
          }}
        >
          {modoSeleccion && (
            <View style={styles.checkboxContainer}>
              <View style={[
                styles.checkbox,
                localesSeleccionados.has(local.id) && styles.checkboxChecked
              ]}>
                {localesSeleccionados.has(local.id) && (
                  <IconSymbol ios_icon_name="checkmark" android_material_icon_name="check" size={16} color={colors.headerText} />
                )}
              </View>
            </View>
          )}

          {coverPhoto ? (
            <Image 
              source={{ uri: `${coverPhoto}?v=${Date.now()}` }} 
              style={styles.localImage}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.localImage, styles.imagePlaceholder]}>
              <IconSymbol ios_icon_name="photo" android_material_icon_name="image" size={32} color={colors.textSecondary} />
            </View>
          )}

          <View style={styles.localInfo}>
            <View style={styles.localHeader}>
              <View style={styles.localTitleContainer}>
                <Text style={styles.localNombre} numberOfLines={1}>
                  {local.nombre}
                </Text>
                {local.enriquecido && (
                  <IconSymbol ios_icon_name="checkmark.seal.fill" android_material_icon_name="verified" size={16} color={colors.primary} />
                )}
                {local.destacado && (
                  <IconSymbol ios_icon_name="star.fill" android_material_icon_name="star" size={16} color="#F59E0B" />
                )}
              </View>
            </View>

            <View style={styles.statusRow}>
              <View style={[
                styles.statusBadge,
                local.activo ? styles.statusActivo : styles.statusInactivo
              ]}>
                <Text style={styles.statusText}>
                  {local.activo ? 'Activo' : 'Inactivo'}
                </Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: sourceBadge.color + '20' }]}>
                <Text style={[styles.statusText, { color: sourceBadge.color }]}>{sourceBadge.text}</Text>
              </View>
            </View>

            <Text style={styles.localDireccion} numberOfLines={2}>
              {local.direccion}
            </Text>

            <View style={styles.ownerInfo}>
              {local.propietario ? (
                <React.Fragment>
                  <IconSymbol ios_icon_name="envelope.fill" android_material_icon_name="email" size={12} color={colors.textSecondary} />
                  <Text style={styles.ownerEmail} numberOfLines={1}>
                    {local.propietario.email}
                  </Text>
                </React.Fragment>
              ) : (
                <React.Fragment>
                  <IconSymbol ios_icon_name="person.crop.circle.badge.xmark" android_material_icon_name="person_off" size={12} color={colors.textSecondary} />
                  <Text style={styles.ownerEmail}>Sin propietario</Text>
                </React.Fragment>
              )}
            </View>

            <View style={styles.localMeta}>
              <View style={styles.tipoBadge}>
                <Text style={styles.tipoText}>{local.tipo}</Text>
              </View>
            </View>
          </View>
        </Pressable>

        {!modoSeleccion && (
          <View style={styles.localActionsContainer}>
            <View style={styles.toggleRow}>
              <View style={styles.toggleItem}>
                <Text style={styles.toggleLabel}>Activo:</Text>
                <Switch
                  value={local.activo}
                  onValueChange={() => {
                    Alert.alert(
                      local.activo ? 'Desactivar Local' : 'Activar Local',
                      `¿Estás seguro de ${local.activo ? 'desactivar' : 'activar'} ${local.nombre}?`,
                      [
                        { text: 'Cancelar', style: 'cancel' },
                        {
                          text: local.activo ? 'Desactivar' : 'Activar',
                          onPress: () => toggleEstadoLocal(local.id, local.activo),
                        },
                      ]
                    );
                  }}
                  trackColor={{ false: colors.cardBorder, true: colors.primary }}
                  thumbColor={colors.headerText}
                />
              </View>

              <View style={styles.toggleItem}>
                <Text style={styles.toggleLabel}>Destacado:</Text>
                <Switch
                  value={local.destacado}
                  onValueChange={() => toggleDestacadoLocal(local.id, local.destacado)}
                  trackColor={{ false: colors.cardBorder, true: colors.badgeDestacado }}
                  thumbColor={colors.headerText}
                />
              </View>
            </View>

            {local.plan_activo && (
              <View style={styles.planInfo}>
                <IconSymbol ios_icon_name="star.fill" android_material_icon_name="star" size={14} color={colors.badgeDestacado} />
                <Text style={styles.planInfoText}>Plan: {local.plan_activo}</Text>
              </View>
            )}

            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={styles.viewButton}
                onPress={() => router.push(`/detalle/local?id=${local.id}`)}
              >
                <IconSymbol ios_icon_name="eye.fill" android_material_icon_name="visibility" size={18} color={colors.primary} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.editButton}
                onPress={() => router.push(`/editar/local?id=${local.id}`)}
              >
                <IconSymbol ios_icon_name="pencil" android_material_icon_name="edit" size={18} color={colors.primary} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.planButton}
                onPress={() => router.push(`/gestion/planes-suscripcion?localId=${local.id}`)}
              >
                <IconSymbol ios_icon_name="creditcard.fill" android_material_icon_name="payment" size={18} color="#F59E0B" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.assignButton}
                onPress={() => openAssignUserModal(local)}
              >
                <IconSymbol ios_icon_name="person.badge.plus" android_material_icon_name="person_add" size={18} color="#8B5CF6" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() =>
                  Alert.alert(
                    'Eliminar Local',
                    `¿Estás seguro de eliminar ${local.nombre}? Esta acción no se puede deshacer.`,
                    [
                      { text: 'Cancelar', style: 'cancel' },
                      {
                        text: 'Eliminar',
                        onPress: () => eliminarLocal(local.id),
                        style: 'destructive',
                      },
                    ]
                  )
                }
              >
                <IconSymbol ios_icon_name="trash" android_material_icon_name="delete" size={18} color={colors.badgeNuevo} />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    );
  }, [modoSeleccion, localesSeleccionados, toggleSeleccionLocal, router, toggleEstadoLocal, toggleDestacadoLocal, eliminarLocal, openAssignUserModal]);

  const renderLocalCard = useCallback(({ item }: { item: Local }) => (
    <LocalCard local={item} />
  ), [LocalCard]);

  // ✅ LINT FIX: Removed unnecessary 'debouncedQuery' dependency from useMemo
  const renderHeader = useMemo(() => (
    <React.Fragment>
      <View style={styles.statsSection}>
        <Text style={styles.statsSectionTitle}>Estadísticas de Locales</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{contadores.total}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statNumber, { color: '#4285F4' }]}>{contadores.google}</Text>
            <Text style={styles.statLabel}>Google</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statNumber, { color: '#7EBC6F' }]}>{contadores.osm}</Text>
            <Text style={styles.statLabel}>OSM</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statNumber, { color: colors.primary }]}>{contadores.conPropietario}</Text>
            <Text style={styles.statLabel}>Con Dueño</Text>
          </View>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <IconSymbol ios_icon_name="magnifyingglass" android_material_icon_name="search" size={20} color={colors.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar por nombre o dirección..."
          placeholderTextColor={colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          blurOnSubmit={false}
          enablesReturnKeyAutomatically={false}
        />
        {searchQuery !== '' && (
          <TouchableOpacity onPress={() => {
            console.log('[GestionarLocales v244.0] 🧹 Clearing search');
            setSearchQuery('');
            setDebouncedQuery('');
          }}>
            <IconSymbol ios_icon_name="xmark.circle.fill" android_material_icon_name="cancel" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.filterButtonsRow}>
        <TouchableOpacity
          style={[styles.filterButton, hayFiltrosActivos() && styles.filterButtonActive]}
          onPress={() => setShowFiltersModal(true)}
        >
          <IconSymbol ios_icon_name="line.3.horizontal.decrease.circle" android_material_icon_name="filter_list" size={20} color={hayFiltrosActivos() ? colors.headerText : colors.text} />
          <Text style={[styles.filterButtonText, hayFiltrosActivos() && styles.filterButtonTextActive]}>
            Filtros {hayFiltrosActivos() && '•'}
          </Text>
        </TouchableOpacity>

        {hayFiltrosActivos() && (
          <TouchableOpacity
            style={styles.clearFiltersButton}
            onPress={limpiarFiltros}
          >
            <IconSymbol ios_icon_name="xmark.circle.fill" android_material_icon_name="cancel" size={16} color={colors.textSecondary} />
            <Text style={styles.clearFiltersText}>Limpiar</Text>
          </TouchableOpacity>
        )}

        <View style={{ flex: 1 }} />

        {modoSeleccion ? (
          <React.Fragment>
            <TouchableOpacity
              style={styles.selectAllButton}
              onPress={seleccionarTodos}
            >
              <Text style={styles.selectAllText}>
                {localesSeleccionados.size === locales.length ? 'Deseleccionar' : 'Seleccionar'} Todos
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.deleteSelectedButton}
              onPress={eliminarSeleccionados}
              disabled={localesSeleccionados.size === 0}
            >
              <IconSymbol ios_icon_name="trash.fill" android_material_icon_name="delete" size={16} color={colors.headerText} />
              <Text style={styles.deleteSelectedText}>
                {localesSeleccionados.size > 0 ? `(${localesSeleccionados.size})` : 'Eliminar'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cancelSelectionButton}
              onPress={() => {
                setModoSeleccion(false);
                setLocalesSeleccionados(new Set());
              }}
            >
              <Text style={styles.cancelSelectionText}>Cancelar</Text>
            </TouchableOpacity>
          </React.Fragment>
        ) : (
          <TouchableOpacity
            style={styles.selectionModeButton}
            onPress={() => setModoSeleccion(true)}
          >
            <IconSymbol ios_icon_name="checkmark.circle" android_material_icon_name="check_circle" size={20} color={colors.primary} />
            <Text style={styles.selectionModeText}>Seleccionar</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.resultsIndicator}>
        <Text style={styles.resultsText}>
          Mostrando {locales.length} de {totalLocales} locales válidos (OSM o enriquecidos)
        </Text>
      </View>
    </React.Fragment>
  ), [contadores, hayFiltrosActivos, modoSeleccion, localesSeleccionados, locales.length, totalLocales, seleccionarTodos, eliminarSeleccionados, limpiarFiltros, searchQuery]);

  const renderFooter = useCallback(() => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={colors.primary} />
        <Text style={styles.footerLoaderText}>Cargando más...</Text>
      </View>
    );
  }, [loadingMore]);

  const renderEmpty = useCallback(() => (
    <View style={styles.emptyState}>
      <IconSymbol ios_icon_name="building.2" android_material_icon_name="business" size={48} color={colors.textSecondary} />
      <Text style={styles.emptyText}>No se encontraron locales</Text>
      <Text style={styles.emptySubtext}>
        Intenta ajustar los filtros de búsqueda
      </Text>
    </View>
  ), []);

  if (initialLoading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Cargando locales...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.headerGradientStart, colors.headerGradientEnd]}
        style={styles.header}
      >
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <IconSymbol ios_icon_name="chevron.left" android_material_icon_name="arrow_back" size={24} color={colors.headerText} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Gestión de Locales</Text>
        {/* ✅ NEW v244.0: Shopping cart in header */}
        <View style={styles.headerActions}>
          <ShoppingCart />
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => router.push('/crear/local')}
          >
            <IconSymbol ios_icon_name="plus" android_material_icon_name="add" size={24} color={colors.headerText} />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <FlatList
        data={locales}
        renderItem={renderLocalCard}
        keyExtractor={item => item.id}
        ListHeaderComponent={renderHeader}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmpty}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        updateCellsBatchingPeriod={50}
        windowSize={10}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      />

      <Modal
        visible={showFiltersModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFiltersModal(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowFiltersModal(false)}
        >
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filtros</Text>
              <TouchableOpacity onPress={() => setShowFiltersModal(false)}>
                <IconSymbol ios_icon_name="xmark" android_material_icon_name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Fuente de Datos</Text>
                <View style={styles.filterOptions}>
                  {['todos', 'google', 'osm', 'manual'].map(option => (
                    <TouchableOpacity
                      key={option}
                      style={[
                        styles.filterOption,
                        filtroFuente === option && styles.filterOptionActive
                      ]}
                      onPress={() => setFiltroFuente(option)}
                    >
                      <Text style={[
                        styles.filterOptionText,
                        filtroFuente === option && styles.filterOptionTextActive
                      ]}>
                        {option === 'todos' ? 'Todos' : option === 'google' ? 'Google Places' : option === 'osm' ? 'OpenStreetMap' : 'Manual'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Enriquecimiento</Text>
                <View style={styles.filterOptions}>
                  {['todos', 'enriquecidos', 'no-enriquecidos'].map(option => (
                    <TouchableOpacity
                      key={option}
                      style={[
                        styles.filterOption,
                        filtroEnriquecido === option && styles.filterOptionActive
                      ]}
                      onPress={() => setFiltroEnriquecido(option)}
                    >
                      <Text style={[
                        styles.filterOptionText,
                        filtroEnriquecido === option && styles.filterOptionTextActive
                      ]}>
                        {option === 'todos' ? 'Todos' : option === 'enriquecidos' ? 'Enriquecidos' : 'Sin Enriquecer'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Estado</Text>
                <View style={styles.filterOptions}>
                  {['todos', 'activos', 'inactivos'].map(option => (
                    <TouchableOpacity
                      key={option}
                      style={[
                        styles.filterOption,
                        filtroEstado === option && styles.filterOptionActive
                      ]}
                      onPress={() => setFiltroEstado(option)}
                    >
                      <Text style={[
                        styles.filterOptionText,
                        filtroEstado === option && styles.filterOptionTextActive
                      ]}>
                        {option.charAt(0).toUpperCase() + option.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Propietario</Text>
                <View style={styles.filterOptions}>
                  {['todos', 'con-dueno', 'sin-dueno'].map(option => (
                    <TouchableOpacity
                      key={option}
                      style={[
                        styles.filterOption,
                        filtroPropietario === option && styles.filterOptionActive
                      ]}
                      onPress={() => setFiltroPropietario(option)}
                    >
                      <Text style={[
                        styles.filterOptionText,
                        filtroPropietario === option && styles.filterOptionTextActive
                      ]}>
                        {option === 'todos' ? 'Todos' : option === 'con-dueno' ? 'Con Dueño' : 'Sin Dueño'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Tipo</Text>
                <View style={styles.filterOptions}>
                  {['todos', 'bar', 'restaurante', 'cafe', 'pub', 'discoteca'].map(option => (
                    <TouchableOpacity
                      key={option}
                      style={[
                        styles.filterOption,
                        filtroTipo === option && styles.filterOptionActive
                      ]}
                      onPress={() => setFiltroTipo(option)}
                    >
                      <Text style={[
                        styles.filterOptionText,
                        filtroTipo === option && styles.filterOptionTextActive
                      ]}>
                        {option.charAt(0).toUpperCase() + option.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Destacado</Text>
                <View style={styles.filterOptions}>
                  {['todos', 'destacados', 'no-destacados'].map(option => (
                    <TouchableOpacity
                      key={option}
                      style={[
                        styles.filterOption,
                        filtroDestacado === option && styles.filterOptionActive
                      ]}
                      onPress={() => setFiltroDestacado(option)}
                    >
                      <Text style={[
                        styles.filterOptionText,
                        filtroDestacado === option && styles.filterOptionTextActive
                      ]}>
                        {option === 'todos' ? 'Todos' : option === 'destacados' ? 'Destacados' : 'No Destacados'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalButtonSecondary}
                onPress={limpiarFiltros}
              >
                <Text style={styles.modalButtonSecondaryText}>Limpiar Filtros</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalButtonPrimary}
                onPress={() => setShowFiltersModal(false)}
              >
                <Text style={styles.modalButtonPrimaryText}>Aplicar</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={showAssignUserModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAssignUserModal(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowAssignUserModal(false)}
        >
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Asignar Propietario</Text>
              <TouchableOpacity onPress={() => setShowAssignUserModal(false)}>
                <IconSymbol ios_icon_name="xmark" android_material_icon_name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.assignModalBody}>
              {selectedLocalForAssignment && (
                <View style={styles.selectedLocalInfo}>
                  <Text style={styles.selectedLocalName}>{selectedLocalForAssignment.nombre}</Text>
                  <Text style={styles.selectedLocalAddress}>{selectedLocalForAssignment.direccion}</Text>
                  {selectedLocalForAssignment.propietario && (
                    <View style={styles.currentOwnerInfo}>
                      <IconSymbol ios_icon_name="person.fill" android_material_icon_name="person" size={14} color={colors.textSecondary} />
                      <Text style={styles.currentOwnerText}>
                        Propietario actual: {selectedLocalForAssignment.propietario.nombre}
                      </Text>
                    </View>
                  )}
                </View>
              )}

              <View style={styles.searchContainer}>
                <IconSymbol ios_icon_name="magnifyingglass" android_material_icon_name="search" size={20} color={colors.textSecondary} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Buscar usuario por nombre o email..."
                  placeholderTextColor={colors.textSecondary}
                  value={searchUsuarioQuery}
                  onChangeText={setSearchUsuarioQuery}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="search"
                  blurOnSubmit={false}
                  enablesReturnKeyAutomatically={false}
                />
                {loadingUsuarios && (
                  <ActivityIndicator size="small" color={colors.primary} />
                )}
              </View>

              {usuarios.length > 0 && (
                <View style={styles.usuariosList}>
                  {usuarios.map((usuario) => (
                    <TouchableOpacity
                      key={usuario.id}
                      style={styles.usuarioItem}
                      onPress={() => {
                        Alert.alert(
                          'Confirmar Asignación',
                          `¿Asignar "${selectedLocalForAssignment?.nombre}" a ${usuario.nombre}?`,
                          [
                            { text: 'Cancelar', style: 'cancel' },
                            {
                              text: 'Asignar',
                              onPress: () => assignLocalToUser(usuario.id, usuario.nombre),
                            },
                          ]
                        );
                      }}
                      disabled={assigningUser}
                    >
                      <View style={styles.usuarioInfo}>
                        <Text style={styles.usuarioNombre}>{usuario.nombre}</Text>
                        <Text style={styles.usuarioEmail}>{usuario.email}</Text>
                        <View style={styles.usuarioRolBadge}>
                          <Text style={styles.usuarioRolText}>{usuario.rol_app}</Text>
                        </View>
                      </View>
                      {assigningUser ? (
                        <ActivityIndicator size="small" color={colors.primary} />
                      ) : (
                        <IconSymbol ios_icon_name="arrow.right.circle.fill" android_material_icon_name="arrow_forward" size={24} color={colors.primary} />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {debouncedUsuarioQuery.length >= 2 && usuarios.length === 0 && !loadingUsuarios && (
                <View style={styles.noResultsContainer}>
                  <IconSymbol ios_icon_name="person.crop.circle.badge.xmark" android_material_icon_name="person_off" size={48} color={colors.textSecondary} />
                  <Text style={styles.noResultsText}>No se encontraron usuarios</Text>
                </View>
              )}

              {debouncedUsuarioQuery.length < 2 && (
                <View style={styles.searchHintContainer}>
                  <IconSymbol ios_icon_name="info.circle.fill" android_material_icon_name="info" size={20} color={colors.primary} />
                  <Text style={styles.searchHintText}>
                    Escribe al menos 2 caracteres para buscar usuarios
                  </Text>
                </View>
              )}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: colors.text,
    marginTop: 16,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 50,
    paddingBottom: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 8,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  addButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.headerText,
    flex: 1,
    textAlign: 'center',
  },
  listContent: {
    paddingBottom: 20,
  },
  statsSection: {
    padding: 16,
    backgroundColor: colors.cardBackground,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  statsSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    ...commonStyles.cardShadow,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 15,
    color: colors.text,
  },
  filterButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
    gap: 8,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    gap: 6,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  filterButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  filterButtonTextActive: {
    color: colors.headerText,
  },
  clearFiltersButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 4,
  },
  clearFiltersText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  selectionModeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    gap: 6,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  selectionModeText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  selectAllButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  selectAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  deleteSelectedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.badgeNuevo,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    gap: 6,
  },
  deleteSelectedText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.headerText,
  },
  cancelSelectionButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  cancelSelectionText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  resultsIndicator: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  resultsText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  localCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 12,
    overflow: 'hidden',
    ...commonStyles.cardShadow,
  },
  localCardContent: {
    flexDirection: 'row',
  },
  checkboxContainer: {
    position: 'absolute',
    top: 12,
    left: 12,
    zIndex: 10,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.cardBorder,
    backgroundColor: colors.cardBackground,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  localImage: {
    width: 100,
    height: 140,
  },
  imagePlaceholder: {
    backgroundColor: colors.cardBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  localInfo: {
    flex: 1,
    padding: 12,
  },
  localHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  localTitleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  localNombre: {
    fontSize: 15,
    fontWeight: 'bold',
    color: colors.text,
    flex: 1,
  },
  statusRow: {
    flexDirection: 'row',
    marginBottom: 6,
    gap: 6,
  },
  statusBadge: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  statusActivo: {
    backgroundColor: '#10B98120',
  },
  statusInactivo: {
    backgroundColor: `${colors.textSecondary}20`,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.text,
  },
  localDireccion: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 6,
    lineHeight: 16,
  },
  ownerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  ownerEmail: {
    fontSize: 11,
    color: colors.textSecondary,
    flex: 1,
  },
  localMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tipoBadge: {
    backgroundColor: `${colors.primary}20`,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  tipoText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.primary,
  },
  localActionsContainer: {
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
    padding: 12,
  },
  toggleRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  toggleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  toggleLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.text,
  },
  planInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.badgeDestacado + '15',
    borderRadius: 8,
    marginBottom: 8,
  },
  planInfoText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
    textTransform: 'capitalize',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  viewButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  planButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#F59E0B' + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  assignButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#8B5CF6' + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: colors.badgeNuevo + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerLoader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  footerLoaderText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.cardBackground,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  modalBody: {
    padding: 20,
  },
  filterSection: {
    marginBottom: 20,
  },
  filterSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 10,
  },
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterOption: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  filterOptionActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterOptionText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  filterOptionTextActive: {
    color: colors.headerText,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
  },
  modalButtonSecondary: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.background,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  modalButtonSecondaryText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  modalButtonPrimary: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  modalButtonPrimaryText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.headerText,
  },
  assignModalBody: {
    padding: 20,
    maxHeight: 500,
  },
  selectedLocalInfo: {
    backgroundColor: colors.background,
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  selectedLocalName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  selectedLocalAddress: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  currentOwnerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
  },
  currentOwnerText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  usuariosList: {
    marginTop: 12,
    gap: 8,
  },
  usuarioItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  usuarioInfo: {
    flex: 1,
  },
  usuarioNombre: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  usuarioEmail: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 6,
  },
  usuarioRolBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primary + '20',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  usuarioRolText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primary,
    textTransform: 'capitalize',
  },
  noResultsContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  noResultsText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 12,
  },
  searchHintContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.primary + '10',
    padding: 16,
    borderRadius: 12,
    marginTop: 12,
  },
  searchHintText: {
    flex: 1,
    fontSize: 14,
    color: colors.primary,
    lineHeight: 20,
  },
});
