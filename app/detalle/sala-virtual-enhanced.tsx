
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Platform,
  ActivityIndicator,
  Dimensions,
  Image,
  Animated,
  ScrollView,
  Modal,
  Pressable,
  Keyboard,
  ImageBackground,
  Alert,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Stack, useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { LinearGradient } from 'expo-linear-gradient';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/utils/supabase';
import { useAuthStore } from '@/src/store/useAuthStore';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { getEstadoLocal } from '@/utils/timeUtils';
import LoginPrompt from '@/components/common/LoginPrompt';
import VirtualRoomLoginModal from '@/components/common/VirtualRoomLoginModal';
import KeyboardAvoidingWrapper from '@/components/common/KeyboardAvoidingWrapper';
import { scaleFontSize, scaleIconSize, getActionButtonPaddingVertical } from '@/utils/androidScaling';
import { calcularDistancia } from '@/utils/locationUtils';

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🚨 SALA VIRTUAL v10.3 - DUPLICATE KEY FIX
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * 🎉 v10.3 CHANGES (CRITICAL DUPLICATE KEY FIX):
 * - ✅ FIXED: Duplicate message IDs in FlatList causing React warnings
 * - ✅ DEDUPLICATION: Added comprehensive deduplication logic in syncMessages
 * - ✅ KEYEXTRACTOR: Enhanced keyExtractor to use unique combination of id + index
 * - ✅ VALIDATION: Added Set-based validation to prevent duplicate IDs
 * 
 * PROBLEMA IDENTIFICADO (CRITICAL):
 * - FlatList mostraba warning: "Encountered two children with the same key"
 * - Mensajes duplicados en el array causaban problemas de renderizado
 * - syncMessages no validaba IDs duplicados antes de agregar al estado
 * 
 * SOLUCIÓN v10.3 (DUPLICATE KEY FIX):
 * 1. DEDUPLICATION EN SYNCMESSAGES:
 *    - Filtrar mensajes existentes antes de agregar nuevos
 *    - Usar Set para validación rápida de IDs duplicados
 *    - Eliminar mensajes optimistas cuando llega el mensaje real
 * 
 * 2. KEYEXTRACTOR MEJORADO:
 *    - Usar combinación de item.id + index como fallback
 *    - Garantizar keys únicas incluso si hay IDs duplicados
 * 
 * 3. VALIDACIÓN DE ESTADO:
 *    - Verificar que no haya IDs duplicados antes de setMessages
 *    - Log de warnings cuando se detectan duplicados
 *    - Filtrado final para garantizar unicidad
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

console.log("✅ SALA VIRTUAL v10.3 - DUPLICATE KEY FIX IMPLEMENTED - Enhanced deduplication");

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

function resolveImageSource(source: string | number | undefined): { uri: string } | number {
  if (!source) return { uri: '' };
  if (typeof source === 'string') return { uri: source };
  return source as number;
}

function getDayNightMode(): 'day' | 'night' {
  const hour = new Date().getHours();
  return (hour >= 8 && hour < 20) ? 'day' : 'night';
}

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

const QUICK_PUBLIC_MESSAGES = [
  { id: 'q1', text: '¡Salud a todos! 🍻', emoji: '🍻' },
  { id: 'q2', text: '¡Vaya temazo! 🎶', emoji: '🎶' },
  { id: 'q3', text: '¡Qué ambientazo! 🔥', emoji: '🔥' },
  { id: 'q4', text: '¿Quién pide ronda? 🥂', emoji: '🥂' },
];

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

// ✅ CRITICAL FIX: Error Boundary Component for Fault Isolation
class SalaVirtualErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    console.error('[SalaVirtual v10.3] 🛡️ Error Boundary caught error:', error);
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[SalaVirtual v10.3] 🛡️ Error Boundary - Error details:', error);
    console.error('[SalaVirtual v10.3] 🛡️ Error Boundary - Component stack:', errorInfo.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={[styles.container, { backgroundColor: '#F0F9FF' }]}>
          <View style={styles.errorContainer}>
            <IconSymbol
              ios_icon_name="exclamationmark.triangle.fill"
              android_material_icon_name="warning"
              size={64}
              color="#EF4444"
            />
            <Text style={styles.errorTitle}>Algo salió mal</Text>
            <Text style={styles.errorText}>
              Ha ocurrido un error en la sala virtual. Por favor, intenta recargar la página.
            </Text>
            <TouchableOpacity
              style={styles.errorButton}
              onPress={() => {
                this.setState({ hasError: false, error: null });
                const router = require('expo-router').useRouter();
                router.back();
              }}
            >
              <Text style={styles.errorButtonText}>Volver</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

function SalaVirtualEnhancedScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const user = useAuthStore(state => state.user);
  const insets = useSafeAreaInsets();
  
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  
  const isMounted = useRef(true);
  
  const redirectParam = params.redirect as string | undefined;
  
  const returnTab = params.returnTab as string | undefined;
  const initialTab = (returnTab === 'chat' || returnTab === 'users' || returnTab === 'private') 
    ? returnTab as 'chat' | 'users' | 'private'
    : 'chat';
  
  console.log('[SalaVirtual v10.3] 🎯 INITIAL TAB from params:', initialTab);
  console.log('[SalaVirtual v10.3] 🔄 Redirect param:', redirectParam);
  
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
  
  const flashListRef = useRef<any>(null);
  const privateChatFlashListRef = useRef<any>(null);
  
  const flatListRef = flashListRef;
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

  useEffect(() => {
    console.log('[SalaVirtual v10.3] 🔐 Checking authentication status...');
    console.log('[SalaVirtual v10.3] 👤 User:', user ? 'authenticated' : 'NOT authenticated');
    
    if (!user) {
      console.log('[SalaVirtual v10.3] 🚫 User not authenticated - showing login modal');
      setShowLoginModal(true);
      setLoading(false);
    } else {
      console.log('[SalaVirtual v10.3] ✅ User authenticated - proceeding to load room');
    }
  }, [user]);

  useEffect(() => {
    console.log('[SalaVirtual v10.3] 🎬 Component mounted');
    isMounted.current = true;
    
    return () => {
      console.log('[SalaVirtual v10.3] 🧹 Component unmounting');
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    console.log('[SalaVirtual v10.3] 🎹 Setting up keyboard listeners');
    
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      (e) => {
        console.log('[SalaVirtual v10.3] ⬆️ Keyboard opened, height:', e.endCoordinates.height);
        
        try {
          if (isMounted.current) {
            setKeyboardHeight(e.endCoordinates.height);
            setIsKeyboardVisible(true);
            
            setTimeout(() => {
              try {
                if (activeTab === 'chat' && flashListRef.current) {
                  flashListRef.current?.scrollToEnd({ animated: true });
                } else if (activeTab === 'private' && selectedPrivateChat && privateChatFlashListRef.current) {
                  privateChatFlashListRef.current?.scrollToEnd({ animated: true });
                }
              } catch (scrollError) {
                console.error('[SalaVirtual v10.3] ❌ Error scrolling to end:', scrollError);
              }
            }, 100);
          }
        } catch (error) {
          console.error('[SalaVirtual v10.3] ❌ Error handling keyboard show:', error);
        }
      }
    );
    
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => {
        console.log('[SalaVirtual v10.3] ⬇️ Keyboard closed');
        
        try {
          if (isMounted.current) {
            setKeyboardHeight(0);
            setIsKeyboardVisible(false);
          }
        } catch (error) {
          console.error('[SalaVirtual v10.3] ❌ Error handling keyboard hide:', error);
        }
      }
    );

    return () => {
      console.log('[SalaVirtual v10.3] 🧹 Removing keyboard listeners');
      try {
        keyboardDidShowListener.remove();
        keyboardDidHideListener.remove();
      } catch (error) {
        console.error('[SalaVirtual v10.3] ❌ Error removing keyboard listeners:', error);
      }
    };
  }, [activeTab, selectedPrivateChat, insets.bottom]);

  const getReadMessagesKey = useCallback((localId: string, userId: string) => {
    return `read_messages_${localId}_${userId}`;
  }, []);

  const loadReadMessagesFromStorage = useCallback(async (localId: string, userId: string): Promise<Set<string>> => {
    try {
      const key = getReadMessagesKey(localId, userId);
      const stored = await AsyncStorage.getItem(key);
      
      if (stored) {
        const readPartners = JSON.parse(stored) as string[];
        console.log('[SalaVirtual v10.3] 🔵 Loaded read partners from storage:', readPartners);
        return new Set(readPartners);
      }
      
      console.log('[SalaVirtual v10.3] 🔵 No stored read partners found');
      return new Set();
    } catch (error) {
      console.error('[SalaVirtual v10.3] ❌ Error loading from storage:', error);
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
        console.log('[SalaVirtual v10.3] 🔵 Saved read status for partner:', partnerId);
      }
    } catch (error) {
      console.error('[SalaVirtual v10.3] ❌ Error saving to storage:', error);
    }
  }, [getReadMessagesKey]);

  const fetchUserProfile = useCallback(async (userId: string): Promise<UserProfile | null> => {
    try {
      console.log('[SalaVirtual v10.3] 🔍 Fetching user profile from database for userId:', userId);
      
      const { data, error } = await supabase
        .from('usuarios')
        .select('id, nombre, username, avatar, bio')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('[SalaVirtual v10.3] ❌ Error fetching user profile:', error);
        return null;
      }

      console.log('[SalaVirtual v10.3] ✅ User profile fetched successfully');

      return {
        id: data.id,
        nombre: data.nombre,
        username: data.username,
        avatar: data.avatar,
        bio: data.bio,
      };
    } catch (error) {
      console.error('[SalaVirtual v10.3] ❌ Error in fetchUserProfile:', error);
      return null;
    }
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const newMode = getDayNightMode();
      console.log('[SalaVirtual v10.3] 🌓 Checking day/night mode:', newMode);
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
          console.log('[SalaVirtual v10.3] ✅ User location obtained');
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
      
      console.log('[SalaVirtual v10.3] ⏰ Time until closing:', totalMinutes, 'minutes');
      
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
      console.error('[SalaVirtual v10.3] ❌ No localId provided');
      if (isMounted.current) {
        setLoading(false);
      }
      return;
    }

    try {
      console.log('[SalaVirtual v10.3] 🏠 Loading local data for:', localId);
      
      const { data, error } = await supabase
        .from('locales')
        .select('id, nombre, imagen_url, horarios_completos, google_business_status, estado_actual, propietario_id')
        .eq('id', localId)
        .single();

      if (error) {
        console.error('[SalaVirtual v10.3] ❌ Error loading local:', error);
        if (isMounted.current) {
          setLoading(false);
        }
        return;
      }

      console.log('[SalaVirtual v10.3] ✅ Local loaded:', data.nombre);
      
      if (!isMounted.current) return;
      
      setLocal(data);
      
      const estadoLocal = getEstadoLocal(data);
      const isOpen = estadoLocal.estaAbierto === true;
      
      if (!isOpen) {
        console.log('[SalaVirtual v10.3] 🔒 Local is closed');
        setLocalClosed(true);
        setLoading(false);
      } else {
        console.log('[SalaVirtual v10.3] ✅ Local is open');
        setLocalClosed(false);
      }
    } catch (error) {
      console.error('[SalaVirtual v10.3] ❌ Error:', error);
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, [localId]);

  const checkUserCheckin = useCallback(async () => {
    if (!user || !localId) return false;

    try {
      console.log('[SalaVirtual v10.3] 🔍 Checking if user is checked in...');
      
      const { data, error } = await supabase
        .from('sala_virtual_checkins')
        .select('*')
        .eq('usuario_id', user.id)
        .eq('local_id', localId)
        .eq('activo', true)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('[SalaVirtual v10.3] ❌ Error checking checkin:', error);
        return false;
      }

      const checkedIn = !!data;
      console.log('[SalaVirtual v10.3] ✅ User checked in status:', checkedIn);
      
      if (isMounted.current) {
        setIsCheckedIn(checkedIn);
      }
      return checkedIn;
    } catch (error) {
      console.error('[SalaVirtual v10.3] ❌ Error:', error);
      return false;
    }
  }, [user, localId]);

  const handleCheckIn = useCallback(async () => {
    if (!user || !localId) return false;

    try {
      console.log('[SalaVirtual v10.3] 🚪 User checking in...');
      
      console.log('[SalaVirtual v10.3] 🔐 Verifying session validity...');
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        console.error('[SalaVirtual v10.3] ❌ Session invalid or expired:', sessionError);
        Alert.alert(
          'Sesión Expirada',
          'Tu sesión ha expirado. Por favor, inicia sesión de nuevo.',
          [
            {
              text: 'OK',
              onPress: () => {
                router.push('/auth/login');
              }
            }
          ]
        );
        return false;
      }
      
      console.log('[SalaVirtual v10.3] ✅ Session is valid');
      
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
        console.error('[SalaVirtual v10.3] ❌ Error inserting checkin:', error);
        if (isMounted.current) {
          setIsCheckedIn(false);
        }
        
        if (error.code === 'PGRST301' || error.message?.includes('JWT')) {
          Alert.alert(
            'Error de Autenticación',
            'Tu sesión ha expirado. Por favor, inicia sesión de nuevo.',
            [
              {
                text: 'OK',
                onPress: () => {
                  router.push('/auth/login');
                }
              }
            ]
          );
        } else {
          throw new Error('No se pudo entrar en la sala');
        }
        return false;
      }

      console.log('[SalaVirtual v10.3] ✅ User checked in successfully');
      
      if (isMounted.current) {
        setCheckingIn(false);
      }
      return true;
    } catch (error: any) {
      console.error('[SalaVirtual v10.3] ❌ Error during checkin:', error);
      if (isMounted.current) {
        setCheckingIn(false);
      }
      return false;
    }
  }, [user, localId, router]);

  const handleCheckOut = useCallback(async () => {
    if (!user || !localId) return;

    try {
      console.log('[SalaVirtual v10.3] 🚪 BOTÓN CERRAR PULSADO - Manual checkout');
      console.log('[SalaVirtual v10.3] 🚪 User checking out...');
      
      await supabase
        .from('sala_virtual_checkins')
        .update({
          activo: false,
          checked_out_at: new Date().toISOString(),
        })
        .eq('usuario_id', user.id)
        .eq('local_id', localId)
        .eq('activo', true);

      console.log('[SalaVirtual v10.3] ✅ User checked out successfully');

      router.back();
      
      console.log('[SalaVirtual v10.3] ✅ Navigation executed with back()');
    } catch (error) {
      console.error('[SalaVirtual v10.3] ❌ Error checking out:', error);
    }
  }, [user, localId, router]);

  const loadMessages = useCallback(async () => {
    if (!localId) {
      console.error('[SalaVirtual v10.3] ❌ No localId for loadMessages');
      return;
    }
    
    try {
      console.log('[SalaVirtual v10.3] 🔥 EPHEMERAL CHAT - NOT LOADING OLD MESSAGES');
      console.log('[SalaVirtual v10.3] ✅ Starting with empty message list (session-only messages)');
      
      messageIdsRef.current.clear();
      
      if (!isMounted.current) return;
      
      setMessages([]);
      lastPublicMessageTimestampRef.current = new Date().toISOString();
      setLoading(false);
      
      console.log('[SalaVirtual v10.3] ✅ Room initialized with empty chat (ephemeral mode)');
    } catch (error) {
      console.error('[SalaVirtual v10.3] ❌ Error initializing messages:', error);
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, [localId]);

  const triggerReceivedAnimation = useCallback((messageText: string, tipo: string) => {
    console.log('[SalaVirtual v10.3] 🎬 Triggering received animation for tipo:', tipo);
    
    if (tipo !== 'privado') {
      console.log('[SalaVirtual v10.3] ⏭️ Not a private message, skipping animation');
      return;
    }
    
    if (!isMounted.current) return;
    
    const emojiMatch = messageText.match(/[\u{1F300}-\u{1F9FF}]/u);
    const emoji = emojiMatch ? emojiMatch[0] : '✨';
    
    console.log('[SalaVirtual v10.3] 🎬 Showing received animation with emoji:', emoji);
    
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
      console.log('[SalaVirtual v10.3] ⚠️ Sync skipped - missing localId or user');
      return;
    }

    try {
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
      }

      const { data: publicData, error: publicError } = await publicQuery;

      if (publicError) {
        console.error('[SalaVirtual v10.3] ❌ Error syncing public messages:', publicError);
      } else if (publicData && publicData.length > 0) {
        const newMessages: Message[] = publicData
          .filter(msg => {
            if (!msg.usuario) {
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
            return false;
          }
          return true;
        });

        if (uniqueNewMessages.length > 0 && isMounted.current) {
          uniqueNewMessages.forEach(msg => {
            messageIdsRef.current.add(msg.id);
            
            if (msg.usuario_id === user.id) {
              const pendingId = msg.contenido + msg.usuario_id;
              pendingMessageIds.current.delete(pendingId);
            }
            
            if (msg.usuario_id !== user.id && msg.tipo === 'privado') {
              triggerReceivedAnimation(msg.contenido, msg.tipo);
            }
          });
          
          setMessages(prev => {
            // ✅ CRITICAL FIX v10.3: Enhanced deduplication
            // Step 1: Remove any existing messages with the same IDs
            const existingIds = new Set(uniqueNewMessages.map(m => m.id));
            const filteredPrev = prev.filter(m => !existingIds.has(m.id));
            
            // Step 2: Combine and sort
            const updated = [...filteredPrev, ...uniqueNewMessages].sort((a, b) => 
              new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            );
            
            // ✅ CRITICAL FIX v10.3: Final deduplication pass
            const seenIds = new Set<string>();
            const deduplicated = updated.filter(msg => {
              if (seenIds.has(msg.id)) {
                console.warn('[SalaVirtual v10.3] ⚠️ Duplicate message ID detected and removed:', msg.id);
                return false;
              }
              seenIds.add(msg.id);
              return true;
            });
            
            console.log('[SalaVirtual v10.3] ✅ Messages after deduplication:', deduplicated.length);
            return deduplicated;
          });
          
          const latestMessage = uniqueNewMessages[uniqueNewMessages.length - 1];
          lastPublicMessageTimestampRef.current = latestMessage.created_at;
          
          setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: true });
          }, 100);
        }
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
        console.error('[SalaVirtual v10.3] ❌ Error syncing private messages:', privateError);
      } else if (privateData && privateData.length > 0) {
        if (privateData.length > 0) {
          lastPrivateMessageTimestampRef.current = privateData[privateData.length - 1].created_at;
        }
        
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
              // ✅ CRITICAL FIX v10.3: Enhanced deduplication for private messages
              const existingIds = new Set(prev.map(m => m.id));
              const uniqueNew = newPrivateMessages.filter(m => !existingIds.has(m.id));
              
              if (uniqueNew.length > 0) {
                uniqueNew.forEach(msg => {
                  if (msg.usuario_id === user.id) {
                    const pendingId = msg.contenido + msg.usuario_id;
                    pendingMessageIds.current.delete(pendingId);
                  }
                  
                  if (msg.usuario_id !== user.id && msg.tipo === 'privado') {
                    triggerReceivedAnimation(msg.contenido, msg.tipo);
                  }
                });
                
                const updated = [...prev, ...uniqueNew].sort((a, b) => 
                  new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
                );
                
                // ✅ CRITICAL FIX v10.3: Final deduplication pass for private messages
                const seenIds = new Set<string>();
                const deduplicated = updated.filter(msg => {
                  if (seenIds.has(msg.id)) {
                    console.warn('[SalaVirtual v10.3] ⚠️ Duplicate private message ID detected and removed:', msg.id);
                    return false;
                  }
                  seenIds.add(msg.id);
                  return true;
                });
                
                console.log('[SalaVirtual v10.3] ✅ Private messages after deduplication:', deduplicated.length);
                return deduplicated;
              }
              
              return prev;
            });

            setTimeout(() => {
              privateChatFlashListRef.current?.scrollToEnd({ animated: true });
            }, 100);
          }
        }
      }
    } catch (error) {
      console.error('[SalaVirtual v10.3] ❌ Error syncing messages:', error);
    }
  }, [localId, user, selectedPrivateChat, triggerReceivedAnimation]);

  useEffect(() => {
    if (!localId || !user || !isCheckedIn) {
      return;
    }

    syncMessages();
    
    messageSyncIntervalRef.current = setInterval(() => {
      syncMessages();
    }, MESSAGE_SYNC_INTERVAL);

    return () => {
      if (messageSyncIntervalRef.current) {
        clearInterval(messageSyncIntervalRef.current);
        messageSyncIntervalRef.current = null;
      }
    };
  }, [localId, user, isCheckedIn, syncMessages]);

  const uniqueActiveUsers = useMemo(() => {
    if (!activeUsers || activeUsers.length === 0) {
      return [];
    }
    
    const seenUserIds = new Set<string>();
    const uniqueUsers = activeUsers.filter(user => {
      if (seenUserIds.has(user.id)) {
        return false;
      }
      seenUserIds.add(user.id);
      return true;
    });
    
    return uniqueUsers;
  }, [activeUsers]);

  const updateActiveUsers = useCallback(async () => {
    if (!localId) {
      console.log('[SalaVirtual v10.3] ⚠️ Update users skipped - missing localId');
      return;
    }

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
        console.error('[SalaVirtual v10.3] ❌ Error loading active users:', error);
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
      }

      if (isMounted.current) {
        setActiveUsers(users);
      }
    } catch (error) {
      console.error('[SalaVirtual v10.3] ❌ Error updating active users:', error);
    }
  }, [localId, userLocation, user]);

  const markPrivateMessagesAsRead = useCallback(async (partnerId: string) => {
    if (!user || !localId) return;

    try {
      console.log('[SalaVirtual v10.3] 🔵 Marking private messages as read from:', partnerId);
      
      const { error } = await supabase
        .from('sala_virtual_interacciones')
        .update({ leido: true })
        .eq('local_id', localId)
        .eq('tipo', 'privado')
        .eq('recipient_id', user.id)
        .eq('usuario_id', partnerId)
        .eq('leido', false);

      if (error) {
        console.error('[SalaVirtual v10.3] ❌ Error marking messages as read:', error);
      }
      
      await saveReadMessagesToStorage(localId, user.id, partnerId);
      
      if (!isMounted.current) return;
      
      setPrivateChats(prev => 
        prev.map(chat => {
          if (chat.userId === partnerId) {
            return { ...chat, unreadCount: 0 };
          }
          return chat;
        })
      );
    } catch (error) {
      console.error('[SalaVirtual v10.3] ❌ Error:', error);
    }
  }, [user, localId, saveReadMessagesToStorage]);

  const loadPrivateChats = useCallback(async () => {
    if (!user || !localId) return;

    try {
      const readPartners = await loadReadMessagesFromStorage(localId, user.id);
      
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
        console.error('[SalaVirtual v10.3] ❌ Error loading private chats:', error);
        return;
      }

      const chatMap = new Map<string, PrivateChat>();
      const unreadCountMap = new Map<string, number>();
      
      (privateMessages || []).forEach(msg => {
        const partnerId = msg.usuario_id === user.id ? msg.recipient_id : msg.usuario_id;
        if (!partnerId) return;
        
        if (msg.recipient_id === user.id && msg.usuario_id !== user.id && msg.leido === false) {
          if (!readPartners.has(partnerId)) {
            const currentCount = unreadCountMap.get(partnerId) || 0;
            unreadCountMap.set(partnerId, currentCount + 1);
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
      
      if (isMounted.current) {
        setPrivateChats(chats);
      }
    } catch (error) {
      console.error('[SalaVirtual v10.3] ❌ Error loading private chats:', error);
    }
  }, [user, localId, activeUsers, loadReadMessagesFromStorage]);

  const handleTypingStart = useCallback(() => {
    if (!selectedPrivateChat || !user || !localId) return;
    
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

    const typingChannel = supabase
      .channel(`typing_events_${localId}_${user.id}_${Date.now()}`)
      .on('broadcast', { event: 'typing_start' }, (payload: any) => {
        if (payload.payload.recipientId === user.id && selectedPrivateChat?.userId === payload.payload.userId) {
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
        if (payload.payload.recipientId === user.id) {
          if (isMounted.current) {
            setTypingUsers(prev => {
              const newSet = new Set(prev);
              newSet.delete(payload.payload.userId);
              return newSet;
            });
          }
        }
      })
      .subscribe();

    typingChannelRef.current = typingChannel;

    return () => {
      supabase.removeChannel(typingChannel);
    };
  }, [localId, user, selectedPrivateChat]);

  const debouncedSyncMessages = useRef<NodeJS.Timeout | null>(null);
  const debouncedUpdateUsers = useRef<NodeJS.Timeout | null>(null);
  const lastSyncTime = useRef<number>(0);
  const syncCount = useRef<number>(0);
  
  const subscribeToUpdates = useCallback(() => {
    if (!localId || !user) {
      console.log('[SalaVirtual v10.3] ⚠️ Subscriptions skipped - missing localId or user');
      return () => {};
    }

    console.log('[SalaVirtual v10.3] 🔌 Centralizando suscripciones Realtime con debounce');
    
    try {
    
    const sessionKey = Date.now();
    
    const debouncedSync = () => {
      try {
        if (debouncedSyncMessages.current) {
          clearTimeout(debouncedSyncMessages.current);
        }
        
        debouncedSyncMessages.current = setTimeout(() => {
          try {
            const now = Date.now();
            const timeSinceLastSync = now - lastSyncTime.current;
            
            if (timeSinceLastSync < 5000 && syncCount.current >= 10) {
              console.log('[SalaVirtual v10.3] ⚠️ Rate limit reached - skipping sync');
              return;
            }
            
            syncCount.current++;
            lastSyncTime.current = now;
            
            if (timeSinceLastSync > 5000) {
              syncCount.current = 0;
            }
            
            syncMessages();
          } catch (syncError) {
            console.error('[SalaVirtual v10.3] ❌ Error in debounced sync:', syncError);
          }
        }, 500);
      } catch (error) {
        console.error('[SalaVirtual v10.3] ❌ Error setting up debounced sync:', error);
      }
    };
    
    const debouncedUserUpdate = () => {
      try {
        if (debouncedUpdateUsers.current) {
          clearTimeout(debouncedUpdateUsers.current);
        }
        
        debouncedUpdateUsers.current = setTimeout(() => {
          try {
            updateActiveUsers();
          } catch (updateError) {
            console.error('[SalaVirtual v10.3] ❌ Error in debounced user update:', updateError);
          }
        }, 500);
      } catch (error) {
        console.error('[SalaVirtual v10.3] ❌ Error setting up debounced user update:', error);
      }
    };
    
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
          try {
            const newRecord = payload.new as any;
            
            if (newRecord.usuario_id === user.id) {
              return;
            }

            debouncedSync();
          } catch (error) {
            console.error('[SalaVirtual v10.3] ❌ Error in INSERT handler:', error);
          }
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
          try {
            const deletedRecord = payload.old as any;
            
            messageIdsRef.current.delete(deletedRecord.id);
            
            if (isMounted.current) {
              setMessages(prev => prev.filter(m => m.id !== deletedRecord.id));
              setPrivateChatMessages(prev => prev.filter(m => m.id !== deletedRecord.id));
              
              if (deletedRecord.tipo === 'privado') {
                setTimeout(() => {
                  try {
                    loadPrivateChats();
                  } catch (loadError) {
                    console.error('[SalaVirtual v10.3] ❌ Error loading private chats:', loadError);
                  }
                }, 500);
              }
            }
          } catch (error) {
            console.error('[SalaVirtual v10.3] ❌ Error in DELETE handler:', error);
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
          try {
            const updatedRecord = payload.new as any;
            
            if (updatedRecord.tipo === 'privado' && updatedRecord.leido === true) {
              setTimeout(() => {
                try {
                  loadPrivateChats();
                } catch (loadError) {
                  console.error('[SalaVirtual v10.3] ❌ Error loading private chats:', loadError);
                }
              }, 300);
            }
          } catch (error) {
            console.error('[SalaVirtual v10.3] ❌ Error in UPDATE handler:', error);
          }
        }
      )
      .subscribe();

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
          try {
            debouncedUserUpdate();
          } catch (error) {
            console.error('[SalaVirtual v10.3] ❌ Error in check-ins handler:', error);
          }
        }
      )
      .subscribe();

    chatChannelRef.current = chatChannel;
    checkinsChannelRef.current = checkinsChannel;
    
    console.log('[SalaVirtual v10.3] ✅ Suscripciones centralizadas con debounce de 500ms');

    return () => {
      console.log('[SalaVirtual v10.3] 🧹 Limpiando suscripciones centralizadas');
      
      try {
        if (debouncedSyncMessages.current) {
          clearTimeout(debouncedSyncMessages.current);
        }
        if (debouncedUpdateUsers.current) {
          clearTimeout(debouncedUpdateUsers.current);
        }
        
        supabase.removeChannel(chatChannel);
        supabase.removeChannel(checkinsChannel);
      } catch (error) {
        console.error('[SalaVirtual v10.3] ❌ Error cleaning up subscriptions:', error);
      }
    };
    
    } catch (error) {
      console.error('[SalaVirtual v10.3] ❌ Error setting up subscriptions:', error);
      return () => {};
    }
  }, [localId, user, updateActiveUsers, syncMessages]);

  useEffect(() => {
    if (!localId || hasInitialized.current) return;
    hasInitialized.current = true;

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
      
      subscribeToUpdates();
      
      subscribeToTypingEvents();
      
      await updateActiveUsers();
      
      await loadPrivateChats();
    };

    init();

    return () => {
      console.log('[SalaVirtual v10.3] 🧹 Cleanup: Cleaning up subscriptions only');
    };
  }, [localId, loadLocalData, checkUserCheckin, handleCheckIn, loadMessages, subscribeToUpdates, subscribeToTypingEvents, updateActiveUsers, localClosed, user]);

  useEffect(() => {
    if (activeTab === 'private' && user && localId) {
      loadPrivateChats();
    }
  }, [activeTab, user, localId]);

  useEffect(() => {
    if (selectedPrivateChat && user && localId) {
      const syncProfile = async () => {
        const profile = await fetchUserProfile(selectedPrivateChat.userId);
        
        if (profile && isMounted.current) {
          setSelectedUserProfile(profile);
        }
      };
      
      syncProfile();
      
      markPrivateMessagesAsRead(selectedPrivateChat.userId);
      
      const cleanup = subscribeToTypingEvents();
      return cleanup;
    }
  }, [selectedPrivateChat, user, localId, fetchUserProfile, markPrivateMessagesAsRead, subscribeToTypingEvents]);

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
  }, []);

  const sendPublicMessage = useCallback(async (content: string) => {
    if (!user || !localId || !content.trim()) {
      console.log('[SalaVirtual v10.3] ⚠️ Send message skipped - missing user, localId, or content');
      return;
    }

    try {
      console.log('[SalaVirtual v10.3] 🔐 Verifying session before sending message...');
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        console.error('[SalaVirtual v10.3] ❌ Session invalid:', sessionError);
        Alert.alert(
          'Sesión Expirada',
          'Tu sesión ha expirado. Por favor, inicia sesión de nuevo.',
          [
            {
              text: 'OK',
              onPress: () => {
                router.push('/auth/login');
              }
            }
          ]
        );
        return;
      }
      
      setSending(true);

      const pendingId = content + user.id;
      pendingMessageIds.current.add(pendingId);

      const messageId = `pending-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const now = new Date().toISOString();

      const userProfile = await fetchUserProfile(user.id);
      
      const currentUserProfile = userProfile || {
        id: user.id,
        nombre: user.user_metadata?.nome || user.email?.split('@')[0] || 'Usuario',
        username: user.user_metadata?.username,
        avatar: user.user_metadata?.avatar,
      };

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
        console.error('[SalaVirtual v10.3] ❌ Error saving message to DB:', error);
        
        if (error.code === 'PGRST301' || error.message?.includes('JWT')) {
          Alert.alert(
            'Error de Autenticación',
            'Tu sesión ha expirado. Por favor, inicia sesión de nuevo.',
            [
              {
                text: 'OK',
                onPress: () => {
                  router.push('/auth/login');
                }
              }
            ]
          );
        }
        
        messageIdsRef.current.delete(messageId);
        if (isMounted.current) {
          setMessages(prev => prev.filter(m => m.id !== messageId));
        }
        pendingMessageIds.current.delete(pendingId);
      } else {
        if (isMounted.current) {
          setMessages(prev => {
            // ✅ CRITICAL FIX v10.3: Remove optimistic message
            const withoutOptimistic = prev.filter(m => m.id !== messageId);
            
            messageIdsRef.current.delete(messageId);
            messageIdsRef.current.add(insertedMessage.id);
            
            const realMessage: Message = {
              ...insertedMessage,
              tipo: insertedMessage.tipo as 'mensaje' | 'emoticon' | 'predefinido' | 'privado' | 'publico',
              is_private: false,
              usuario: currentUserProfile,
            };
            
            // ✅ CRITICAL FIX v10.3: Check if real message already exists
            if (withoutOptimistic.some(m => m.id === realMessage.id)) {
              return withoutOptimistic;
            }
            
            const updated = [...withoutOptimistic, realMessage].sort((a, b) => 
              new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            );
            
            // ✅ CRITICAL FIX v10.3: Final deduplication pass
            const seenIds = new Set<string>();
            const deduplicated = updated.filter(msg => {
              if (seenIds.has(msg.id)) {
                console.warn('[SalaVirtual v10.3] ⚠️ Duplicate message ID in sendPublicMessage:', msg.id);
                return false;
              }
              seenIds.add(msg.id);
              return true;
            });
            
            return deduplicated;
          });
        }
        
        lastPublicMessageTimestampRef.current = insertedMessage.created_at;
        
        setTimeout(() => {
          pendingMessageIds.current.delete(pendingId);
        }, 1000);
      }
    } catch (error) {
      console.error('[SalaVirtual v10.3] ❌ Error sending public message:', error);
    } finally {
      try {
        if (isMounted.current) {
          setSending(false);
        }
      } catch (finallyError) {
        console.error('[SalaVirtual v10.3] ❌ Error in finally block:', finallyError);
      }
    }
  }, [user, localId, fetchUserProfile, triggerFloatingReaction]);

  const sendPredefinedMessage = useCallback(async (recipientId: string, messageText: string) => {
    if (!user || !localId) return;

    try {
      const pendingId = messageText + user.id + recipientId;
      pendingMessageIds.current.add(pendingId);

      const messageId = `pending-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const now = new Date().toISOString();

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
          
          setPrivateChats(prev => [newChat, ...prev]);
        } else {
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
        console.error('[SalaVirtual v10.3] ❌ Error saving private message to DB:', insertError);
      } else {
        setTimeout(() => {
          pendingMessageIds.current.delete(pendingId);
        }, 1000);
      }
      
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
      ]).start(() => {
        if (isMounted.current) {
          setShowAnimation(false);
          animationScale.setValue(0);
          animationOpacity.setValue(0);
        }
      });

      closeBottomSheet();
      
      if (isMounted.current) {
        setActiveTab('private');
      }
      
      setTimeout(() => {
        loadPrivateChats();
      }, 2000);
    } catch (error) {
      console.error('[SalaVirtual v10.3] ❌ Error sending predefined message:', error);
      
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
  }, [user, localId, activeUsers, privateChats, animationScale, animationOpacity, mode, fetchUserProfile, triggerFloatingReaction]);

  const closeBottomSheet = useCallback(() => {
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
    if (!user || !localId || !content.trim()) {
      console.log('[SalaVirtual v10.3] ⚠️ Send private message skipped - missing user, localId, or content');
      return;
    }

    try {
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
        contenido: content,
        created_at: now,
        is_private: true,
        recipient_id: recipientId,
        usuario: currentUserProfile,
      };
      
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
        console.error('[SalaVirtual v10.3] ❌ Error saving private message to DB:', insertError);
        if (isMounted.current) {
          setPrivateChatMessages(prev => prev.filter(m => m.id !== messageId));
        }
        pendingMessageIds.current.delete(pendingId);
      } else {
        if (isMounted.current) {
          setPrivateChatMessages(prev => {
            // ✅ CRITICAL FIX v10.3: Remove optimistic message
            const withoutOptimistic = prev.filter(m => m.id !== messageId);
            
            const realMessage: Message = {
              ...insertedMessage,
              tipo: insertedMessage.tipo as 'mensaje' | 'emoticon' | 'predefinido' | 'privado' | 'publico',
              is_private: true,
              usuario: currentUserProfile,
            };
            
            // ✅ CRITICAL FIX v10.3: Check if real message already exists
            if (withoutOptimistic.some(m => m.id === realMessage.id)) {
              return withoutOptimistic;
            }
            
            const updated = [...withoutOptimistic, realMessage].sort((a, b) => 
              new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            );
            
            // ✅ CRITICAL FIX v10.3: Final deduplication pass for private messages
            const seenIds = new Set<string>();
            const deduplicated = updated.filter(msg => {
              if (seenIds.has(msg.id)) {
                console.warn('[SalaVirtual v10.3] ⚠️ Duplicate private message ID in sendPrivateMessage:', msg.id);
                return false;
              }
              seenIds.add(msg.id);
              return true;
            });
            
            return deduplicated;
          });
        }
        
        lastPrivateMessageTimestampRef.current = insertedMessage.created_at;
        
        setTimeout(() => {
          pendingMessageIds.current.delete(pendingId);
        }, 1000);
      }
    } catch (error) {
      console.error('[SalaVirtual v10.3] ❌ Error sending private message:', error);
    }
  }, [user, localId, activeUsers, isTyping, handleTypingStop, fetchUserProfile]);

  const openPrivateChat = useCallback(async (chat: PrivateChat) => {
    if (!user || !localId) return;

    try {
      const displayName = chat.username 
        ? chat.username.replace('@', '')
        : chat.nombre;
      
      console.log('[SalaVirtual v10.3] 💬 Opening private chat with:', displayName);
      console.log('[SalaVirtual v10.3] 📥 LOADING PRIVATE MESSAGES - Messages persist during session');
      
      if (isMounted.current) {
        setSelectedPrivateChat(chat);
      }
      
      await markPrivateMessagesAsRead(chat.userId);
      
      const { data: privateMessages, error } = await supabase
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
        .or(`and(usuario_id.eq.${user.id},recipient_id.eq.${chat.userId}),and(usuario_id.eq.${chat.userId},recipient_id.eq.${user.id})`)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('[SalaVirtual v10.3] ❌ Error loading private messages:', error);
        if (isMounted.current) {
          setPrivateChatMessages([]);
        }
      } else {
        const messages: Message[] = (privateMessages || [])
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

        if (isMounted.current) {
          setPrivateChatMessages(messages);
        }
        
        if (messages.length > 0) {
          lastPrivateMessageTimestampRef.current = messages[messages.length - 1].created_at;
        } else {
          lastPrivateMessageTimestampRef.current = new Date().toISOString();
        }
        
        console.log('[SalaVirtual v10.3] ✅ Loaded', messages.length, 'private messages');
      }
    } catch (error) {
      console.error('[SalaVirtual v10.3] ❌ Error opening private chat:', error);
    }
  }, [user, localId, markPrivateMessagesAsRead]);

  const closePrivateChat = useCallback(() => {
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
      return;
    }

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
        console.error('[SalaVirtual v10.3] ❌ Error deleting message:', error);
        
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
        if (messageToDelete.is_private) {
          setTimeout(() => {
            loadPrivateChats();
          }, 500);
        }
      }
    } catch (error) {
      console.error('[SalaVirtual v10.3] ❌ Error deleting message:', error);
    } finally {
      if (isMounted.current) {
        setDeleting(false);
        setShowDeleteModal(false);
        setMessageToDelete(null);
      }
    }
  }, [messageToDelete, user, loadPrivateChats]);

  const cancelDeleteMessage = useCallback(() => {
    if (isMounted.current) {
      setShowDeleteModal(false);
      setMessageToDelete(null);
    }
  }, []);

  const handleUserPress = async (selectedUser: ActiveUser) => {
    const displayName = selectedUser.username 
      ? selectedUser.username.replace('@', '')
      : selectedUser.nombre;
    
    console.log('[SalaVirtual v10.3] 👤 User pressed:', displayName);
    
    if (selectedUser.id === user?.id) {
      console.log('[SalaVirtual v10.3] ⚠️ Cannot interact with self');
      return;
    }
    
    const profile = await fetchUserProfile(selectedUser.id);
    
    if (!isMounted.current) return;
    
    if (profile) {
      setSelectedUserProfile(profile);
    } else {
      setSelectedUserProfile({
        id: selectedUser.id,
        nombre: selectedUser.nombre,
        username: selectedUser.username,
        avatar: selectedUser.avatar,
      });
    }
    
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
      return;
    }
    
    console.log('[SalaVirtual v10.3] 🚀 Starting profile navigation');
    console.log('[SalaVirtual v10.3] 👤 Target user ID:', selectedUser.id);
    
    closeBottomSheet();
    setSelectedPrivateChat(null);
    
    await new Promise(resolve => setTimeout(resolve, 300));
    
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
      console.log('[SalaVirtual v10.3] ✅ Navigation executed successfully');
    } catch (error) {
      console.error('[SalaVirtual v10.3] ❌ Error navigating:', error);
    }
  }, [selectedUser, localId, router, closeBottomSheet, activeTab]);

  const handlePrivateChatUserPress = useCallback(async () => {
    if (!selectedPrivateChat) {
      console.log('[SalaVirtual v10.3] ⚠️ No selected private chat');
      return;
    }
    
    console.log('[SalaVirtual v10.3] 🚀 Navigating to profile from private chat header');
    console.log('[SalaVirtual v10.3] 👤 Target user ID:', selectedPrivateChat.userId);
    
    closePrivateChat();
    
    await new Promise(resolve => setTimeout(resolve, 300));
    
    try {
      router.push({
        pathname: '/perfil/usuario',
        params: {
          userId: selectedPrivateChat.userId,
          from: 'sala-virtual',
          returnTab: 'private',
          localId: localId,
        },
      });
      console.log('[SalaVirtual v10.3] ✅ Navigation executed successfully from private chat');
    } catch (error) {
      console.error('[SalaVirtual v10.3] ❌ Error navigating:', error);
    }
  }, [selectedPrivateChat, localId, router, closePrivateChat]);

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
        style={styles.gridUserItem}
        onPress={() => {
          if (isCurrentUser) {
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

            <View style={styles.predefinedMessagesSection}>
              <Text style={[styles.sectionTitle, { fontSize: scaleFontSize(16), color: themeColors.text }]}>
                Mensajes Predefinidos
              </Text>
              
              <View style={styles.predefinedMessagesCategory}>
                <Text style={[styles.categoryTitle, { fontSize: scaleFontSize(14), color: themeColors.textSecondary }]}>
                  💃 Coqueteo
                </Text>
                {PREDEFINED_MESSAGES.flirtatious.map((msg) => (
                  <TouchableOpacity
                    key={msg.id}
                    style={[
                      styles.predefinedMessageButton,
                      { 
                        backgroundColor: themeColors.primary + '15',
                        borderColor: themeColors.primary + '30',
                      },
                    ]}
                    onPress={() => sendPredefinedMessage(selectedUser.id, msg.text)}
                  >
                    <Text style={styles.predefinedMessageEmoji}>{msg.emoji}</Text>
                    <Text style={[styles.predefinedMessageText, { fontSize: scaleFontSize(14), color: themeColors.text }]}>
                      {msg.text}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.predefinedMessagesCategory}>
                <Text style={[styles.categoryTitle, { fontSize: scaleFontSize(14), color: themeColors.textSecondary }]}>
                  🥂 Invitación
                </Text>
                {PREDEFINED_MESSAGES.invitation.map((msg) => (
                  <TouchableOpacity
                    key={msg.id}
                    style={[
                      styles.predefinedMessageButton,
                      { 
                        backgroundColor: themeColors.primary + '15',
                        borderColor: themeColors.primary + '30',
                      },
                    ]}
                    onPress={() => sendPredefinedMessage(selectedUser.id, msg.text)}
                  >
                    <Text style={styles.predefinedMessageEmoji}>{msg.emoji}</Text>
                    <Text style={[styles.predefinedMessageText, { fontSize: scaleFontSize(14), color: themeColors.text }]}>
                      {msg.text}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.predefinedMessagesCategory}>
                <Text style={[styles.categoryTitle, { fontSize: scaleFontSize(14), color: themeColors.textSecondary }]}>
                  😊 Rompehielos
                </Text>
                {PREDEFINED_MESSAGES.icebreaker.map((msg) => (
                  <TouchableOpacity
                    key={msg.id}
                    style={[
                      styles.predefinedMessageButton,
                      { 
                        backgroundColor: themeColors.primary + '15',
                        borderColor: themeColors.primary + '30',
                      },
                    ]}
                    onPress={() => sendPredefinedMessage(selectedUser.id, msg.text)}
                  >
                    <Text style={styles.predefinedMessageEmoji}>{msg.emoji}</Text>
                    <Text style={[styles.predefinedMessageText, { fontSize: scaleFontSize(14), color: themeColors.text }]}>
                      {msg.text}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>
        </Animated.View>
      </React.Fragment>
    );
  };

  if (showLoginModal) {
    return (
      <VirtualRoomLoginModal
        visible={showLoginModal}
        onClose={() => {
          setShowLoginModal(false);
          router.back();
        }}
        onLoginSuccess={() => {
          setShowLoginModal(false);
        }}
      />
    );
  }

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: themeColors.background[0] }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={themeColors.primary} />
          <Text style={[styles.loadingText, { fontSize: scaleFontSize(16), color: themeColors.text }]}>
            Cargando sala virtual...
          </Text>
        </View>
      </View>
    );
  }

  if (localClosed) {
    return (
      <View style={[styles.container, { backgroundColor: themeColors.background[0] }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.closedContainer}>
          <IconSymbol
            ios_icon_name="moon.zzz.fill"
            android_material_icon_name="nightlight"
            size={Platform.OS === 'android' ? scaleIconSize(80) : 80}
            color={themeColors.textSecondary}
          />
          <Text style={[styles.closedTitle, { fontSize: scaleFontSize(24), color: themeColors.text }]}>
            Local Cerrado
          </Text>
          <Text style={[styles.closedText, { fontSize: scaleFontSize(16), color: themeColors.textSecondary }]}>
            La sala virtual está cerrada porque el local no está abierto en este momento.
          </Text>
          <TouchableOpacity
            style={[styles.closedButton, { backgroundColor: themeColors.primary }]}
            onPress={() => router.back()}
          >
            <Text style={[styles.closedButtonText, { fontSize: scaleFontSize(16) }]}>
              Volver
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <SalaVirtualErrorBoundary>
      <LinearGradient
        colors={themeColors.background}
        style={styles.container}
      >
        <Stack.Screen
          options={{
            headerShown: true,
            title: local?.nombre || 'Sala Virtual',
            headerStyle: {
              backgroundColor: themeColors.cardBg,
            },
            headerTintColor: themeColors.text,
            headerRight: () => (
              <TouchableOpacity
                onPress={handleCheckOut}
                style={[styles.closeButton, { paddingVertical: getActionButtonPaddingVertical() }]}
              >
                <IconSymbol
                  ios_icon_name="xmark.circle.fill"
                  android_material_icon_name="cancel"
                  size={Platform.OS === 'android' ? scaleIconSize(28) : 28}
                  color={themeColors.text}
                />
              </TouchableOpacity>
            ),
          }}
        />

        {closingWarning && (
          <View style={[styles.warningBanner, { backgroundColor: themeColors.danger + '20', borderBottomColor: themeColors.danger }]}>
            <Text style={[styles.warningText, { fontSize: scaleFontSize(13), color: themeColors.danger }]}>
              {closingWarning}
            </Text>
          </View>
        )}

        <View style={[styles.tabBar, { backgroundColor: themeColors.cardBg, borderBottomColor: themeColors.cardBorder }]}>
          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === 'chat' && { borderBottomColor: themeColors.primary, borderBottomWidth: 2 },
            ]}
            onPress={() => setActiveTab('chat')}
          >
            <IconSymbol
              ios_icon_name="bubble.left.and.bubble.right.fill"
              android_material_icon_name="chat"
              size={Platform.OS === 'android' ? scaleIconSize(24) : 24}
              color={activeTab === 'chat' ? themeColors.primary : themeColors.textSecondary}
            />
            <Text
              style={[
                styles.tabText,
                { fontSize: scaleFontSize(14) },
                activeTab === 'chat' ? { color: themeColors.primary } : { color: themeColors.textSecondary },
              ]}
            >
              Chat
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === 'users' && { borderBottomColor: themeColors.primary, borderBottomWidth: 2 },
            ]}
            onPress={() => setActiveTab('users')}
          >
            <IconSymbol
              ios_icon_name="person.3.fill"
              android_material_icon_name="group"
              size={Platform.OS === 'android' ? scaleIconSize(24) : 24}
              color={activeTab === 'users' ? themeColors.primary : themeColors.textSecondary}
            />
            <Text
              style={[
                styles.tabText,
                { fontSize: scaleFontSize(14) },
                activeTab === 'users' ? { color: themeColors.primary } : { color: themeColors.textSecondary },
              ]}
            >
              Usuarios ({uniqueActiveUsers.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === 'private' && { borderBottomColor: themeColors.primary, borderBottomWidth: 2 },
            ]}
            onPress={() => setActiveTab('private')}
          >
            <IconSymbol
              ios_icon_name="lock.fill"
              android_material_icon_name="lock"
              size={Platform.OS === 'android' ? scaleIconSize(24) : 24}
              color={activeTab === 'private' ? themeColors.primary : themeColors.textSecondary}
            />
            <Text
              style={[
                styles.tabText,
                { fontSize: scaleFontSize(14) },
                activeTab === 'private' ? { color: themeColors.primary } : { color: themeColors.textSecondary },
              ]}
            >
              Privados
            </Text>
            {privateChats.some(chat => chat.unreadCount > 0) && (
              <Animated.View 
                style={[
                  styles.tabBadge, 
                  { 
                    backgroundColor: '#06B6D4',
                    transform: [{ scale: pulseAnim }],
                  }
                ]}
              >
                <View style={styles.tabBadgeDot} />
              </Animated.View>
            )}
          </TouchableOpacity>
        </View>

        {activeTab === 'chat' && (
          <KeyboardAvoidingWrapper>
            <View style={styles.chatContainer}>
              {messages.length === 0 ? (
                <View style={styles.emptyState}>
                  <IconSymbol
                    ios_icon_name="bubble.left.and.bubble.right"
                    android_material_icon_name="chat_bubble_outline"
                    size={Platform.OS === 'android' ? scaleIconSize(64) : 64}
                    color={themeColors.textSecondary}
                  />
                  <Text style={[styles.emptyStateText, { fontSize: scaleFontSize(16), color: themeColors.textSecondary }]}>
                    No hay mensajes aún.{'\n'}¡Sé el primero en escribir!
                  </Text>
                </View>
              ) : (
                <FlashList
                  ref={flashListRef}
                  data={messages}
                  renderItem={renderMessage}
                  keyExtractor={(item, index) => `${item.id}-${index}`}
                  estimatedItemSize={80}
                  contentContainerStyle={[
                    styles.messagesList,
                    { paddingBottom: keyboardHeight > 0 ? keyboardHeight + 120 : 120 }
                  ]}
                  onContentSizeChange={() => {
                    setTimeout(() => {
                      flashListRef.current?.scrollToEnd({ animated: true });
                    }, 100);
                  }}
                />
              )}

              {showQuickMessages && renderQuickMessagesBar()}

              <View 
                style={[
                  styles.inputContainer, 
                  { 
                    backgroundColor: themeColors.cardBg, 
                    borderTopColor: themeColors.cardBorder,
                    bottom: keyboardHeight > 0 ? keyboardHeight : 0,
                  }
                ]}
              >
                <TextInput
                  style={[
                    styles.input,
                    { 
                      fontSize: scaleFontSize(15), 
                      color: themeColors.text, 
                      backgroundColor: themeColors.background[0] + '80',
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
                    { backgroundColor: themeColors.primary },
                    (!newMessage.trim() || sending) && { opacity: 0.5 },
                  ]}
                  onPress={() => {
                    if (newMessage.trim() && !sending) {
                      sendPublicMessage(newMessage.trim());
                    }
                  }}
                  disabled={!newMessage.trim() || sending}
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
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingWrapper>
        )}

        {activeTab === 'users' && (
          <View style={styles.usersContainer}>
            {uniqueActiveUsers.length === 0 ? (
              <View style={styles.emptyState}>
                <IconSymbol
                  ios_icon_name="person.3"
                  android_material_icon_name="group"
                  size={Platform.OS === 'android' ? scaleIconSize(64) : 64}
                  color={themeColors.textSecondary}
                />
                <Text style={[styles.emptyStateText, { fontSize: scaleFontSize(16), color: themeColors.textSecondary }]}>
                  No hay usuarios en la sala.
                </Text>
              </View>
            ) : (
              <FlashList
                data={uniqueActiveUsers}
                renderItem={renderUserItem}
                keyExtractor={(item, index) => `${item.id}-${index}`}
                numColumns={3}
                estimatedItemSize={120}
                contentContainerStyle={styles.gridUsersList}
              />
            )}
          </View>
        )}

        {activeTab === 'private' && !selectedPrivateChat && (
          <View style={styles.privateChatsContainer}>
            {privateChats.length === 0 ? (
              <View style={styles.emptyState}>
                <IconSymbol
                  ios_icon_name="lock.fill"
                  android_material_icon_name="lock"
                  size={Platform.OS === 'android' ? scaleIconSize(64) : 64}
                  color={themeColors.textSecondary}
                />
                <Text style={[styles.emptyStateText, { fontSize: scaleFontSize(16), color: themeColors.textSecondary }]}>
                  No tienes conversaciones privadas.{'\n'}¡Envía un mensaje a alguien!
                </Text>
              </View>
            ) : (
              <FlashList
                data={privateChats}
                renderItem={renderPrivateChatItem}
                keyExtractor={(item, index) => `${item.userId}-${index}`}
                estimatedItemSize={80}
                contentContainerStyle={styles.privateChatsListContent}
              />
            )}
          </View>
        )}

        {activeTab === 'private' && selectedPrivateChat && (
          <KeyboardAvoidingWrapper>
            <View style={styles.privateChatScreen}>
              <View style={[styles.privateChatHeader, { backgroundColor: themeColors.cardBg, borderBottomColor: themeColors.cardBorder }]}>
                <TouchableOpacity
                  onPress={closePrivateChat}
                  style={styles.privateChatBackButton}
                >
                  <IconSymbol
                    ios_icon_name="chevron.left"
                    android_material_icon_name="arrow_back"
                    size={Platform.OS === 'android' ? scaleIconSize(24) : 24}
                    color={themeColors.text}
                  />
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.privateChatHeaderInfo}
                  onPress={handlePrivateChatUserPress}
                  activeOpacity={0.7}
                >
                  <View style={styles.privateChatHeaderAvatar}>
                    {selectedPrivateChat.avatar ? (
                      <Image
                        source={resolveImageSource(selectedPrivateChat.avatar)}
                        style={styles.privateChatHeaderAvatarImage}
                      />
                    ) : (
                      <View style={[styles.privateChatHeaderAvatarPlaceholder, { backgroundColor: themeColors.primary + '30' }]}>
                        <IconSymbol
                          ios_icon_name="person.fill"
                          android_material_icon_name="person"
                          size={Platform.OS === 'android' ? scaleIconSize(20) : 20}
                          color={themeColors.text}
                        />
                      </View>
                    )}
                  </View>
                  <View style={styles.privateChatHeaderTextContainer}>
                    <Text style={[styles.privateChatHeaderName, { fontSize: scaleFontSize(16), color: themeColors.text }]}>
                      {selectedPrivateChat.username 
                        ? selectedPrivateChat.username.replace('@', '')
                        : selectedPrivateChat.nombre
                      }
                    </Text>
                    {typingUsers.has(selectedPrivateChat.userId) && (
                      <Text style={[styles.privateChatHeaderTyping, { fontSize: scaleFontSize(12), color: themeColors.primary }]}>
                        escribiendo...
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              </View>

              {privateChatMessages.length === 0 ? (
                <View style={styles.emptyState}>
                  <IconSymbol
                    ios_icon_name="lock.fill"
                    android_material_icon_name="lock"
                    size={Platform.OS === 'android' ? scaleIconSize(64) : 64}
                    color={themeColors.textSecondary}
                  />
                  <Text style={[styles.emptyStateText, { fontSize: scaleFontSize(16), color: themeColors.textSecondary }]}>
                    Inicia la conversación
                  </Text>
                </View>
              ) : (
                <FlashList
                  ref={privateChatFlashListRef}
                  data={privateChatMessages}
                  renderItem={renderMessage}
                  keyExtractor={(item, index) => `${item.id}-${index}`}
                  estimatedItemSize={80}
                  contentContainerStyle={[
                    styles.messagesList,
                    { paddingBottom: keyboardHeight > 0 ? keyboardHeight + 80 : 80 }
                  ]}
                  onContentSizeChange={() => {
                    setTimeout(() => {
                      privateChatFlashListRef.current?.scrollToEnd({ animated: true });
                    }, 100);
                  }}
                />
              )}

              <View 
                style={[
                  styles.inputContainer, 
                  { 
                    backgroundColor: themeColors.cardBg, 
                    borderTopColor: themeColors.cardBorder,
                    bottom: keyboardHeight > 0 ? keyboardHeight : 0,
                  }
                ]}
              >
                <TextInput
                  style={[
                    styles.input,
                    { 
                      fontSize: scaleFontSize(15), 
                      color: themeColors.text, 
                      backgroundColor: themeColors.background[0] + '80',
                    }
                  ]}
                  placeholder="Escribe un mensaje privado..."
                  placeholderTextColor={themeColors.textSecondary}
                  value={newMessage}
                  onChangeText={handlePrivateMessageChange}
                  multiline
                  maxLength={500}
                />
                <TouchableOpacity
                  style={[
                    styles.sendButton,
                    { backgroundColor: themeColors.primary },
                    (!newMessage.trim() || sending) && { opacity: 0.5 },
                  ]}
                  onPress={() => {
                    if (newMessage.trim() && !sending && selectedPrivateChat) {
                      sendPrivateMessage(selectedPrivateChat.userId, newMessage.trim());
                      setNewMessage('');
                    }
                  }}
                  disabled={!newMessage.trim() || sending}
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
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingWrapper>
        )}

        {renderBottomSheet()}

        {showAnimation && (
          <View style={styles.animationOverlay} pointerEvents="none">
            <Animated.View
              style={[
                styles.animationContainer,
                {
                  transform: [{ scale: animationScale }],
                  opacity: animationOpacity,
                },
              ]}
            >
              <Text style={styles.animationEmoji}>{animationEmoji}</Text>
            </Animated.View>
          </View>
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

        <Modal
          visible={showDeleteModal}
          transparent
          animationType="fade"
          onRequestClose={cancelDeleteMessage}
        >
          <Pressable style={styles.deleteModalOverlay} onPress={cancelDeleteMessage}>
            <Pressable style={[styles.deleteModalContent, { backgroundColor: themeColors.cardBg }]}>
              <Text style={[styles.deleteModalTitle, { fontSize: scaleFontSize(18), color: themeColors.text }]}>
                Eliminar Mensaje
              </Text>
              <Text style={[styles.deleteModalText, { fontSize: scaleFontSize(14), color: themeColors.textSecondary }]}>
                ¿Estás seguro de que quieres eliminar este mensaje?
              </Text>
              <View style={styles.deleteModalButtons}>
                <TouchableOpacity
                  style={[styles.deleteModalButton, { backgroundColor: themeColors.textSecondary + '20' }]}
                  onPress={cancelDeleteMessage}
                  disabled={deleting}
                >
                  <Text style={[styles.deleteModalButtonText, { fontSize: scaleFontSize(15), color: themeColors.text }]}>
                    Cancelar
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.deleteModalButton, { backgroundColor: themeColors.danger }]}
                  onPress={confirmDeleteMessage}
                  disabled={deleting}
                >
                  {deleting ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={[styles.deleteModalButtonText, { fontSize: scaleFontSize(15), color: '#FFFFFF' }]}>
                      Eliminar
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      </LinearGradient>
    </SalaVirtualErrorBoundary>
  );
}

export default function SalaVirtualEnhancedScreenWrapper() {
  return (
    <SalaVirtualErrorBoundary>
      <SalaVirtualEnhancedScreen />
    </SalaVirtualErrorBoundary>
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
    marginTop: 16,
    fontWeight: '500',
  },
  closedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  closedTitle: {
    fontWeight: 'bold',
    marginTop: 24,
    marginBottom: 12,
  },
  closedText: {
    textAlign: 'center',
    marginBottom: 32,
  },
  closedButton: {
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 12,
  },
  closedButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  closeButton: {
    marginRight: 8,
  },
  warningBanner: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  warningText: {
    textAlign: 'center',
    fontWeight: '600',
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
  },
  tabText: {
    fontWeight: '600',
  },
  tabBadge: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 4,
  },
  tabBadgeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  chatContainer: {
    flex: 1,
  },
  messagesList: {
    paddingHorizontal: 12,
    paddingTop: 12,
  },
  messageWrapper: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-end',
  },
  messageWrapperOwn: {
    justifyContent: 'flex-end',
  },
  messageWrapperOther: {
    justifyContent: 'flex-start',
  },
  messageAvatar: {
    marginHorizontal: 8,
  },
  messageAvatarImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  messageAvatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageContentContainer: {
    maxWidth: '70%',
  },
  messageBubble: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  messageSender: {
    fontWeight: '600',
    marginBottom: 2,
  },
  messageText: {
    lineHeight: 20,
  },
  messageTime: {
    marginTop: 4,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyStateText: {
    textAlign: 'center',
    marginTop: 16,
  },
  quickMessagesBar: {
    borderTopWidth: 1,
    paddingVertical: 8,
  },
  quickMessagesContent: {
    paddingHorizontal: 12,
    gap: 8,
  },
  quickMessageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  quickMessageEmoji: {
    fontSize: 18,
  },
  quickMessageText: {
    fontWeight: '500',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    gap: 8,
  },
  input: {
    flex: 1,
    maxHeight: 100,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  usersContainer: {
    flex: 1,
  },
  gridUsersList: {
    padding: 12,
  },
  gridUserItem: {
    flex: 1,
    alignItems: 'center',
    padding: 8,
    margin: 4,
  },
  gridUserAvatarContainer: {
    position: 'relative',
    marginBottom: 8,
  },
  gridUserAvatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
  },
  gridUserAvatarPlaceholder: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridProximityHalo: {
    position: 'absolute',
    top: -8,
    left: -8,
    right: -8,
    bottom: -8,
    borderRadius: 43,
    zIndex: -1,
  },
  gridUserOnlineDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  gridUserName: {
    textAlign: 'center',
    fontWeight: '500',
  },
  gridProximityBadge: {
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  gridProximityText: {
    fontWeight: '600',
  },
  privateChatsContainer: {
    flex: 1,
  },
  privateChatsListContent: {
    padding: 12,
  },
  privateChatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  privateChatAvatar: {
    position: 'relative',
    marginRight: 12,
  },
  privateChatAvatarImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  privateChatAvatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  privateChatOnlineDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
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
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  privateChatName: {
    fontWeight: '600',
    flex: 1,
  },
  privateChatTime: {
    marginLeft: 8,
  },
  privateChatLastMessage: {
    marginTop: 2,
  },
  privateChatUnreadBadge: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginLeft: 12,
  },
  privateChatUnreadDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
  },
  privateChatScreen: {
    flex: 1,
  },
  privateChatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  privateChatBackButton: {
    padding: 8,
    marginRight: 8,
  },
  privateChatHeaderInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  privateChatHeaderAvatar: {
    marginRight: 12,
  },
  privateChatHeaderAvatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  privateChatHeaderAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  privateChatHeaderTextContainer: {
    flex: 1,
  },
  privateChatHeaderName: {
    fontWeight: '600',
  },
  privateChatHeaderTyping: {
    fontStyle: 'italic',
    marginTop: 2,
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
    borderTopWidth: 1,
    zIndex: 1000,
  },
  bottomSheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  bottomSheetScroll: {
    flex: 1,
  },
  bottomSheetContent: {
    paddingBottom: 32,
  },
  coverContainer: {
    width: '100%',
    height: 200,
    overflow: 'hidden',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  coverGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '100%',
  },
  coverGlowEffect: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  coverGlowCircle: {
    width: 200,
    height: 200,
    borderRadius: 100,
  },
  coverTextOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: 20,
  },
  coverUserName: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  coverUserBio: {
    lineHeight: 20,
  },
  bottomSheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  bottomSheetTitle: {
    fontWeight: 'bold',
    flex: 1,
  },
  profileSection: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  profileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  profileButtonText: {
    flex: 1,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    marginHorizontal: 20,
  },
  predefinedMessagesSection: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginBottom: 16,
  },
  predefinedMessagesCategory: {
    marginBottom: 20,
  },
  categoryTitle: {
    fontWeight: '600',
    marginBottom: 12,
  },
  predefinedMessageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
    gap: 12,
  },
  predefinedMessageEmoji: {
    fontSize: 20,
  },
  predefinedMessageText: {
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
    zIndex: 9999,
  },
  animationContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  animationEmoji: {
    fontSize: 80,
  },
  floatingParticle: {
    position: 'absolute',
    zIndex: 9998,
  },
  floatingParticleEmoji: {
    fontSize: 32,
  },
  deleteModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteModalContent: {
    width: '80%',
    maxWidth: 400,
    borderRadius: 16,
    padding: 24,
  },
  deleteModalTitle: {
    fontWeight: 'bold',
    marginBottom: 12,
  },
  deleteModalText: {
    marginBottom: 24,
    lineHeight: 20,
  },
  deleteModalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  deleteModalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  deleteModalButtonText: {
    fontWeight: '600',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1E293B',
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 24,
  },
  errorButton: {
    backgroundColor: '#0EA5E9',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  errorButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

<write file="components/social/CommentPreview.tsx">
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { colors } from '@/styles/commonStyles';
import { scaleFontSize } from '@/utils/androidScaling';
import { useRouter } from 'expo-router';

interface CommentPreviewProps {
  postId: string;
}

interface CommentPreviewData {
  firstCommenterName: string;
  totalComments: number;
}

/**
 * ✅ COMMENT PREVIEW COMPONENT v1.1 - FIXED
 * 
 * FIXES:
 * - ✅ Fixed foreign key relationship: Changed from usuario_id to autor_id
 * - ✅ Fixed PostgREST error: Using correct column name for foreign key join
 * 
 * Displays comment preview information for a post, showing ONLY comments
 * from users that the current user follows.
 * 
 * Business Rule: Comment information should only appear when a user follows
 * the commenter, as it doesn't make sense to show information about comments
 * from users the current user doesn't follow.
 * 
 * Display Format:
 * - Single comment: "Jorge ha escrito un comentario."
 * - Multiple comments: "Jorge y otras 2 personas han comentado esta publicación."
 */
export default function CommentPreview({ postId }: CommentPreviewProps) {
  const { user } = useAuth();
  const router = useRouter();
  const [previewData, setPreviewData] = useState<CommentPreviewData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadCommentPreview = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      console.log('[CommentPreview v1.1] 🔄 Loading comment preview for post:', postId);

      // Step 1: Get all users that the current user follows
      const { data: followingData, error: followingError } = await supabase
        .from('seguidores')
        .select('seguido_id')
        .eq('seguidor_id', user.id);

      if (followingError) {
        console.error('[CommentPreview v1.1] ❌ Error fetching following list:', followingError);
        setLoading(false);
        return;
      }

      const followedUserIds = followingData?.map(f => f.seguido_id) || [];

      if (followedUserIds.length === 0) {
        console.log('[CommentPreview v1.1] ℹ️ User is not following anyone, no preview to show');
        setPreviewData(null);
        setLoading(false);
        return;
      }

      console.log('[CommentPreview v1.1] ✅ User follows', followedUserIds.length, 'users');

      // Step 2: Get comments from followed users only
      // ✅ CRITICAL FIX: Changed from usuario_id to autor_id (correct foreign key column)
      const { data: commentsData, error: commentsError } = await supabase
        .from('comentarios')
        .select(`
          id,
          autor_id,
          created_at,
          usuarios!comentarios_autor_id_fkey(nombre)
        `)
        .eq('post_id', postId)
        .in('autor_id', followedUserIds)
        .order('created_at', { ascending: true });

      if (commentsError) {
        console.error('[CommentPreview v1.1] ❌ Error fetching comments:', commentsError);
        setLoading(false);
        return;
      }

      if (!commentsData || commentsData.length === 0) {
        console.log('[CommentPreview v1.1] ℹ️ No comments from followed users');
        setPreviewData(null);
        setLoading(false);
        return;
      }

      // Step 3: Get the first commenter's name and total count
      const firstCommenter = commentsData[0];
      const firstCommenterName = firstCommenter.usuarios?.nombre || 'Usuario';
      const totalComments = commentsData.length;

      console.log('[CommentPreview v1.1] ✅ Found', totalComments, 'comments from followed users');
      console.log('[CommentPreview v1.1] ✅ First commenter:', firstCommenterName);

      setPreviewData({
        firstCommenterName,
        totalComments,
      });
      setLoading(false);
    } catch (error) {
      console.error('[CommentPreview v1.1] ❌ Error loading comment preview:', error);
      setLoading(false);
    }
  }, [postId, user]);

  useEffect(() => {
    loadCommentPreview();
  }, [loadCommentPreview]);

  // Don't render anything if no data or still loading
  if (loading || !previewData || !user) {
    return null;
  }

  const { firstCommenterName, totalComments } = previewData;

  const handlePress = () => {
    console.log('[CommentPreview v1.1] 💬 Opening comments for post:', postId);
    router.push({
      pathname: '/social/comentarios',
      params: { postId },
    });
  };

  return (
    <TouchableOpacity 
      style={styles.container}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <Text style={[styles.text, { fontSize: scaleFontSize(13) }]}>
        <Text style={styles.name}>{firstCommenterName}</Text>
        {totalComments === 1 
          ? ' ha escrito un comentario.'
          : ` y otras ${totalComments - 1} personas han comentado esta publicación.`
        }
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  text: {
    color: colors.textSecondary,
    lineHeight: 18,
  },
  name: {
    fontWeight: '600',
    color: colors.text,
  },
});
