
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Image,
  Platform,
  KeyboardAvoidingView,
  FlatList,
  ActivityIndicator,
  Alert,
  Keyboard,
  Dimensions,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/contexts/AuthContext';
import MessageBubble from '@/components/chat/MessageBubble';
import MomentoMessageBubble from '@/components/chat/MomentoMessageBubble';
import ImageMessageBubble from '@/components/chat/ImageMessageBubble';
import ImageShareModal from '@/components/chat/ImageShareModal';
import ImageViewerModal from '@/components/chat/ImageViewerModal';
import { scaleFontSize, scaleIconSize, getContentBottomPadding } from '@/utils/androidScaling';
import * as SystemUI from 'expo-system-ui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';

interface Message {
  id: string;
  chat_id: string;
  remitente_id: string;
  contenido: string;
  tipo_mensaje: 'texto' | 'post_compartido' | 'imagen' | 'momento';
  post_compartido_id?: string;
  post_imagen?: string;
  momento_id?: string;
  momento_screenshot_url?: string;
  imagen_url?: string;
  share_mode?: 'view_once' | 'allow_replay' | 'normal';
  viewed?: boolean;
  viewed_at?: string;
  leido: boolean;
  created_at: string;
}

/**
 * ✅ KEYBOARD & SYSTEM NAV BAR FIXES v308.0 - PREDICTIVE TEXT BAR FIX
 * 
 * ANDROID-SPECIFIC FIXES:
 * 1️⃣ CONVERSACIÓN - Input field behavior (PREDICTIVE TEXT BAR FIX):
 *    - ✅ Absolute positioning with bottom: 0 (extends to physical screen bottom)
 *    - ✅ Input rises smoothly when keyboard opens via dynamic bottom positioning
 *    - ✅ PREDICTIVE TEXT DETECTION: Adds extra offset for predictive text bar
 *    - ✅ Uses screen height change to detect actual keyboard + predictive text height
 *    - ✅ Input returns to bottom automatically when keyboard closes
 *    - ✅ NO stuck-in-middle issue
 *    - ✅ PERFECT POSITIONING - input sits exactly at keyboard edge (including predictive text)
 *    - ✅ White background extends BEHIND system navigation bar
 *    - ✅ Visible content respects safe area insets
 *    - ✅ Enhanced logging for debugging keyboard behavior
 * 
 * 2️⃣ SEND BUTTON:
 *    - ✅ Sends message immediately on first press
 *    - ✅ Keyboard stays open (blurOnSubmit={false})
 *    - ✅ No need to press twice
 *    - ✅ User can continue typing after sending
 * 
 * 3️⃣ SYSTEM NAVIGATION BAR:
 *    - ✅ FlatList paddingBottom correctly accounts for insets.bottom + input height
 *    - ✅ Content NEVER scrolls underneath the system navigation bar
 *    - ✅ inputContainer extends to bottom: 0 (physical screen edge)
 *    - ✅ paddingBottom: insets.bottom creates white space behind nav bar
 *    - ✅ Solid white background (#FFFFFF) prevents transparency
 *    - ✅ Professional behavior matching standard Android apps
 * 
 * 4️⃣ EXPIRED MOMENTOS CLEANUP (CRITICAL FIX):
 *    - ✅ Expired momentos are deleted BEFORE loading messages (prevents flash)
 *    - ✅ Periodic cleanup every 30 seconds while conversation is open
 *    - ✅ Backend scheduled job runs every hour to clean up expired momentos
 *    - ✅ Database trigger automatically deletes messages when momento is deleted
 *    - ✅ No temporary display of expired content
 *    - ✅ Prevents database accumulation of expired data
 * 
 * TECHNICAL IMPLEMENTATION:
 * - position: 'absolute' with dynamic bottom (keyboardHeight when open, 0 when closed)
 * - PREDICTIVE TEXT DETECTION: Uses Dimensions to detect screen height changes
 * - Calculates actual keyboard height including predictive text bar
 * - paddingBottom: insets.bottom (creates white space behind system nav bar)
 * - Keyboard listeners for height tracking (keyboardDidShow/keyboardDidHide)
 * - No KeyboardAvoidingView (causes issues on Android)
 * - inputContainer (absolute) + inputRow (flex layout) pattern
 * - WHITE BACKGROUND (#FFFFFF) extends behind system navigation bar
 * - FlatList paddingBottom: keyboardHeight (when open) OR inputContainerHeight + insets.bottom (when closed)
 * - Input content respects safe area via paddingBottom
 * - PRECISE MEASUREMENT - uses screen height change to detect full keyboard height
 * - Enhanced console logging for debugging
 * - MOMENTO EXPIRATION: Check and delete expired momentos before loading messages
 * - PERIODIC CLEANUP: 30-second interval to remove expired momentos while viewing
 * - BACKEND CLEANUP: Hourly scheduled job (pg_cron) to delete expired momentos
 * - DATABASE TRIGGER: Automatically delete messages when momento is deleted
 */
export default function ConversacionScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user } = useAuth();
  const flatListRef = useRef<FlatList>(null);
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [chatId, setChatId] = useState<string | null>(null);
  const [otroUsuario, setOtroUsuario] = useState<any>(null);
  const [localInfo, setLocalInfo] = useState<any>(null);
  const [mensajes, setMensajes] = useState<Message[]>([]);
  const [mensaje, setMensaje] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);
  const [inputContainerHeight, setInputContainerHeight] = useState(0);
  const [screenHeight, setScreenHeight] = useState(Dimensions.get('window').height);
  
  // ✅ Image sharing states
  const [showImageShareModal, setShowImageShareModal] = useState(false);
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [viewingImage, setViewingImage] = useState<{ url: string; mode: 'view_once' | 'allow_replay' | 'normal' } | null>(null);

  const channelRef = useRef<any>(null);

  const isLocalChat = !!params.localId;
  const localId = params.localId as string | undefined;

  // ✅ ANDROID FIX v286.0: Set system navigation bar color to WHITE (matching input container)
  useEffect(() => {
    if (Platform.OS === 'android') {
      const whiteColor = '#FFFFFF'; // White background for system navigation bar
      SystemUI.setBackgroundColorAsync(whiteColor);
      
      return () => {
        // Reset to default when leaving screen
        SystemUI.setBackgroundColorAsync('transparent');
      };
    }
  }, []);

  // ✅ FIX v309.0: Track screen height changes to detect predictive text bar
  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      const newHeight = window.height;
      console.log('[Conversacion v309.0] 📱 Screen height changed:', screenHeight, '→', newHeight);
      setScreenHeight(newHeight);
    });

    return () => {
      subscription?.remove();
    };
  }, [screenHeight]);

  // ✅ FIX v309.0: Precise keyboard height detection including predictive text bar
  useEffect(() => {
    console.log('[Conversacion v309.0] 🎹 Setting up precise keyboard listeners with predictive text detection');
    
    const initialScreenHeight = Dimensions.get('window').height;
    let lastScreenHeight = initialScreenHeight;
    
    const keyboardWillShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        const reportedKeyboardHeight = e.endCoordinates.height;
        const currentScreenHeight = Dimensions.get('window').height;
        
        // ✅ CRITICAL FIX: Calculate actual keyboard height including predictive text
        // The screen height change gives us the REAL keyboard height (including predictive text)
        const actualKeyboardHeight = Platform.OS === 'android' 
          ? Math.max(reportedKeyboardHeight, lastScreenHeight - currentScreenHeight)
          : reportedKeyboardHeight;
        
        console.log('[Conversacion v309.0] ⌨️ Keyboard shown');
        console.log('[Conversacion v309.0] 📱 Platform:', Platform.OS);
        console.log('[Conversacion v309.0] 📏 Reported keyboard height:', reportedKeyboardHeight);
        console.log('[Conversacion v309.0] 📏 Screen height change:', lastScreenHeight, '→', currentScreenHeight, '=', lastScreenHeight - currentScreenHeight);
        console.log('[Conversacion v309.0] 📏 Actual keyboard height (including predictive text):', actualKeyboardHeight);
        console.log('[Conversacion v309.0] 📏 Input container height:', inputContainerHeight);
        console.log('[Conversacion v309.0] 📏 Bottom safe area:', insets.bottom);
        console.log('[Conversacion v309.0] ✅ Using actual keyboard height (includes predictive text bar)');
        
        setKeyboardHeight(actualKeyboardHeight);
        setKeyboardVisible(true);
        lastScreenHeight = currentScreenHeight;
      }
    );

    const keyboardWillHideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        console.log('[Conversacion v309.0] ⌨️ Keyboard hidden');
        setKeyboardHeight(0);
        setKeyboardVisible(false);
        lastScreenHeight = Dimensions.get('window').height;
      }
    );

    return () => {
      console.log('[Conversacion v309.0] 🧹 Cleaning up keyboard listeners');
      keyboardWillShowListener.remove();
      keyboardWillHideListener.remove();
    };
  }, [inputContainerHeight, insets.bottom]);

  const loadMessages = useCallback(async (chatIdToLoad: string) => {
    try {
      console.log('[Conversacion] 🔍 Loading messages for chat:', chatIdToLoad);
      
      // ✅ CRITICAL FIX: Delete expired momentos BEFORE loading messages
      // This prevents expired momentos from appearing even for a second
      console.log('[Conversacion] 🧹 Checking for expired momentos...');
      const now = new Date().toISOString();
      
      // Get all momento messages in this chat
      const { data: momentoMessages, error: momentoError } = await supabase
        .from('mensajes')
        .select('id, momento_id')
        .eq('chat_id', chatIdToLoad)
        .eq('tipo_mensaje', 'momento')
        .not('momento_id', 'is', null);

      if (momentoError) {
        console.error('[Conversacion] Error fetching momento messages:', momentoError);
      } else if (momentoMessages && momentoMessages.length > 0) {
        console.log('[Conversacion] 📊 Found', momentoMessages.length, 'momento messages to check');
        
        // Check each momento for expiration
        const momentoIds = momentoMessages.map(m => m.momento_id).filter(Boolean);
        
        if (momentoIds.length > 0) {
          const { data: expiredMomentos, error: expiredError } = await supabase
            .from('momentos')
            .select('id')
            .in('id', momentoIds)
            .lt('expires_at', now);

          if (expiredError) {
            console.error('[Conversacion] Error checking expired momentos:', expiredError);
          } else if (expiredMomentos && expiredMomentos.length > 0) {
            const expiredIds = expiredMomentos.map(m => m.id);
            console.log('[Conversacion] 🗑️ Found', expiredIds.length, 'EXPIRED momentos, deleting permanently...');
            
            // Delete expired momentos from database
            const { error: deleteMomentoError } = await supabase
              .from('momentos')
              .delete()
              .in('id', expiredIds);

            if (deleteMomentoError) {
              console.error('[Conversacion] Error deleting expired momentos:', deleteMomentoError);
            } else {
              console.log('[Conversacion] ✅ Expired momentos deleted from database');
              
              // Delete messages referencing expired momentos
              const { error: deleteMessageError } = await supabase
                .from('mensajes')
                .delete()
                .in('momento_id', expiredIds);

              if (deleteMessageError) {
                console.error('[Conversacion] Error deleting expired momento messages:', deleteMessageError);
              } else {
                console.log('[Conversacion] ✅ Expired momento messages deleted from database');
              }
            }
          } else {
            console.log('[Conversacion] ✅ No expired momentos found');
          }
        }
      }

      // ✅ NOW load messages (expired momentos are already deleted)
      const { data, error } = await supabase
        .from('mensajes')
        .select('*')
        .eq('chat_id', chatIdToLoad)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('[Conversacion] Error loading messages:', error);
        return;
      }

      console.log('[Conversacion] ✅ Loaded', data?.length || 0, 'messages (expired momentos excluded)');
      setMensajes(data || []);

      if (user) {
        await supabase
          .from('mensajes')
          .update({ leido: true, leido_at: new Date().toISOString() })
          .eq('chat_id', chatIdToLoad)
          .neq('remitente_id', user.id)
          .eq('leido', false);
      }

      // ✅ CRITICAL FIX v320.0: Scroll to end with longer delay for reliable positioning
      // Ensures messages are fully rendered before scrolling
      setTimeout(() => {
        try {
          flatListRef.current?.scrollToEnd({ animated: true });
          console.log('[Conversacion v320.0] ✅ Scrolled to end after loading messages');
        } catch (error) {
          console.error('[Conversacion v320.0] ❌ Error scrolling to end:', error);
        }
      }, 300);
    } catch (error) {
      console.error('[Conversacion] Error:', error);
    }
  }, [user]);

  const loadOrCreateChat = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);

      if (localId) {
        console.log('[Conversacion] 🔥 Loading LOCAL-SPECIFIC chat for local:', localId);
        
        const { data: localData, error: localError } = await supabase
          .from('locales')
          .select('id, nombre, imagen_url, propietario_id')
          .eq('id', localId)
          .single();

        if (localError || !localData) {
          console.error('[Conversacion] Error loading local:', localError);
          Alert.alert('Error', 'No se pudo cargar la información del local');
          router.back();
          return;
        }

        console.log('[Conversacion] ✅ Loaded local info:', localData.nombre);
        setLocalInfo(localData);

        const userId1 = user.id < localData.propietario_id ? user.id : localData.propietario_id;
        const userId2 = user.id < localData.propietario_id ? localData.propietario_id : user.id;

        console.log('[Conversacion] 🔍 Checking for existing local chat:', { userId1, userId2, localId });

        const { data: existingChat, error: chatError } = await supabase
          .from('chats')
          .select('*')
          .eq('local_id', localId)
          .eq('usuario1_id', userId1)
          .eq('usuario2_id', userId2)
          .maybeSingle();

        if (existingChat) {
          console.log('[Conversacion] ✅ Found existing local-specific chat:', existingChat.id);
          setChatId(existingChat.id);
          await loadMessages(existingChat.id);
        } else {
          console.log('[Conversacion] 🆕 Creating new local-specific chat');

          const { data: newChat, error: createError } = await supabase
            .from('chats')
            .insert({
              usuario1_id: userId1,
              usuario2_id: userId2,
              local_id: localId,
              ultimo_mensaje: '',
              ultimo_mensaje_fecha: new Date().toISOString(),
            })
            .select('*')
            .single();

          if (createError) {
            console.error('[Conversacion] Error creating local chat:', createError);
            
            if (createError.code === '23505') {
              console.log('[Conversacion] Chat already exists (race condition), fetching it...');
              const { data: retryChat, error: retryError } = await supabase
                .from('chats')
                .select('*')
                .eq('local_id', localId)
                .eq('usuario1_id', userId1)
                .eq('usuario2_id', userId2)
                .single();
              
              if (retryChat) {
                console.log('[Conversacion] ✅ Found existing chat on retry:', retryChat.id);
                setChatId(retryChat.id);
                await loadMessages(retryChat.id);
                setLoading(false);
                return;
              }
              
              if (retryError) {
                console.error('[Conversacion] Error fetching chat on retry:', retryError);
              }
            }
            
            Alert.alert('Error', 'No se pudo crear la conversación. Por favor, inténtalo de nuevo.');
            router.back();
            return;
          }

          console.log('[Conversacion] ✅ Created local-specific chat:', newChat.id);
          setChatId(newChat.id);
        }

        return;
      }

      if (params.chatId) {
        const { data: chatData, error: chatError } = await supabase
          .from('chats')
          .select('*')
          .eq('id', params.chatId)
          .single();

        if (chatError) {
          console.error('[Conversacion] Error loading chat:', chatError);
          Alert.alert('Error', 'No se pudo cargar la conversación');
          router.back();
          return;
        }

        setChatId(chatData.id);

        const otroUsuarioId =
          chatData.usuario1_id === user.id ? chatData.usuario2_id : chatData.usuario1_id;

        const { data: userData } = await supabase
          .from('usuarios')
          .select('id, nombre, username, avatar, activo')
          .eq('id', otroUsuarioId)
          .single();

        setOtroUsuario(userData);

        await loadMessages(chatData.id);
      } else if (params.userId) {
        const userId1 = user.id < (params.userId as string) ? user.id : (params.userId as string);
        const userId2 = user.id < (params.userId as string) ? (params.userId as string) : user.id;

        const { data: existingChat } = await supabase
          .from('chats')
          .select('*')
          .is('local_id', null)
          .eq('usuario1_id', userId1)
          .eq('usuario2_id', userId2)
          .maybeSingle();

        if (existingChat) {
          console.log('[Conversacion] ✅ Found existing user-to-user chat:', existingChat.id);
          setChatId(existingChat.id);
          await loadMessages(existingChat.id);
        } else {
          console.log('[Conversacion] Creating new user-to-user chat with ordered IDs:', { userId1, userId2 });

          const { data: newChat, error: createError } = await supabase
            .from('chats')
            .insert({
              usuario1_id: userId1,
              usuario2_id: userId2,
              local_id: null,
              ultimo_mensaje: '',
              ultimo_mensaje_fecha: new Date().toISOString(),
            })
            .select('*')
            .single();

          if (createError) {
            console.error('[Conversacion] Error creating chat:', createError);
            
            if (createError.code === '23505') {
              console.log('[Conversacion] Chat already exists (race condition), fetching it...');
              const { data: retryChat, error: retryError } = await supabase
                .from('chats')
                .select('*')
                .is('local_id', null)
                .eq('usuario1_id', userId1)
                .eq('usuario2_id', userId2)
                .single();
              
              if (retryChat) {
                console.log('[Conversacion] ✅ Found existing chat on retry:', retryChat.id);
                setChatId(retryChat.id);
                await loadMessages(retryChat.id);
                setLoading(false);
                return;
              }
              
              if (retryError) {
                console.error('[Conversacion] Error fetching chat on retry:', retryError);
              }
            }
            
            Alert.alert('Error', 'No se pudo crear la conversación. Por favor, inténtalo de nuevo.');
            router.back();
            return;
          }

          setChatId(newChat.id);
        }

        const { data: userData } = await supabase
          .from('usuarios')
          .select('id, nombre, username, avatar, activo')
          .eq('id', params.userId)
          .single();

        setOtroUsuario(userData);
      }
    } catch (error: any) {
      console.error('[Conversacion] Error:', error);
      Alert.alert('Error', 'Ocurrió un error al cargar la conversación');
    } finally {
      setLoading(false);
    }
  }, [user, params.chatId, params.userId, localId, loadMessages, router]);

  useEffect(() => {
    loadOrCreateChat();
  }, [loadOrCreateChat]);

  // ✅ CRITICAL FIX: Periodic cleanup of expired momentos while conversation is open
  useEffect(() => {
    if (!chatId) return;

    console.log('[Conversacion] 🔄 Setting up periodic momento expiration check');
    
    const cleanupExpiredMomentos = async () => {
      try {
        const now = new Date().toISOString();
        
        // Get all momento messages in this chat
        const { data: momentoMessages } = await supabase
          .from('mensajes')
          .select('id, momento_id')
          .eq('chat_id', chatId)
          .eq('tipo_mensaje', 'momento')
          .not('momento_id', 'is', null);

        if (momentoMessages && momentoMessages.length > 0) {
          const momentoIds = momentoMessages.map(m => m.momento_id).filter(Boolean);
          
          if (momentoIds.length > 0) {
            // Check for expired momentos
            const { data: expiredMomentos } = await supabase
              .from('momentos')
              .select('id')
              .in('id', momentoIds)
              .lt('expires_at', now);

            if (expiredMomentos && expiredMomentos.length > 0) {
              const expiredIds = expiredMomentos.map(m => m.id);
              console.log('[Conversacion] 🗑️ Periodic cleanup: Found', expiredIds.length, 'expired momentos');
              
              // Delete expired momentos
              await supabase
                .from('momentos')
                .delete()
                .in('id', expiredIds);

              // Delete messages referencing expired momentos
              await supabase
                .from('mensajes')
                .delete()
                .in('momento_id', expiredIds);

              // Update UI to remove expired momento messages
              setMensajes(prev => prev.filter(m => !expiredIds.includes(m.momento_id || '')));
              
              console.log('[Conversacion] ✅ Periodic cleanup: Expired momentos removed');
            }
          }
        }
      } catch (error) {
        console.error('[Conversacion] Error in periodic cleanup:', error);
      }
    };

    // Run cleanup immediately
    cleanupExpiredMomentos();

    // Run cleanup every 30 seconds while conversation is open
    const intervalId = setInterval(cleanupExpiredMomentos, 30000);

    return () => {
      console.log('[Conversacion] 🧹 Cleaning up periodic momento check');
      clearInterval(intervalId);
    };
  }, [chatId]);

  useEffect(() => {
    if (!chatId || !user) return;

    console.log('[Conversacion] ⚡ Setting up real-time subscription for chat:', chatId);

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase
      .channel(`chat:${chatId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'mensajes',
          filter: `chat_id=eq.${chatId}`,
        },
        (payload) => {
          console.log('[Conversacion] ⚡ INSTANT new message received:', payload.new);
          
          const newMessage = payload.new as Message;
          
          setMensajes((prev) => {
            if (prev.some(m => m.id === newMessage.id)) {
              return prev;
            }
            return [...prev, newMessage];
          });
          
          if (newMessage.remitente_id !== user.id) {
            supabase
              .from('mensajes')
              .update({ leido: true, leido_at: new Date().toISOString() })
              .eq('id', newMessage.id)
              .then(() => console.log('[Conversacion] Message marked as read'));
          }

          // ✅ CRITICAL FIX v320.0: Scroll to end with longer delay for new messages
          setTimeout(() => {
            try {
              flatListRef.current?.scrollToEnd({ animated: true });
              console.log('[Conversacion v320.0] ✅ Scrolled to end after new message');
            } catch (error) {
              console.error('[Conversacion v320.0] ❌ Error scrolling to end:', error);
            }
          }, 150);
        }
      )
      .subscribe((status) => {
        console.log('[Conversacion] Subscription status:', status);
      });

    channelRef.current = channel;

    return () => {
      console.log('[Conversacion] Cleaning up subscription');
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [chatId, user]);

  // ✅ Image picker functions
  const handlePickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso denegado', 'Necesitas dar permiso para acceder a la galería');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedImageUri(result.assets[0].uri);
        setShowImageShareModal(true);
      }
    } catch (error) {
      console.error('[Conversacion] Error picking image:', error);
      Alert.alert('Error', 'No se pudo seleccionar la imagen');
    }
  };

  const handleTakePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso denegado', 'Necesitas dar permiso para usar la cámara');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedImageUri(result.assets[0].uri);
        setShowImageShareModal(true);
      }
    } catch (error) {
      console.error('[Conversacion] Error taking photo:', error);
      Alert.alert('Error', 'No se pudo tomar la foto');
    }
  };

  const handleSendImage = async (shareMode: 'view_once' | 'allow_replay' | 'normal') => {
    if (!user || !chatId || !selectedImageUri) return;

    try {
      console.log('[Conversacion] 📸 Sending image with mode:', shareMode);

      // ✅ Compress image
      const manipResult = await ImageManipulator.manipulateAsync(
        selectedImageUri,
        [{ resize: { width: 1080 } }],
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
      );

      // ✅ TODO: Backend Integration - POST /api/chat/upload-image
      // Upload image to backend storage
      // Body: { image: File, chatId: string, shareMode: string }
      // Returns: { imageUrl: string, messageId: string }
      
      // For now, use the local URI (will be replaced with backend URL)
      const imageUrl = manipResult.uri;

      // ✅ Create message with image
      const { data: insertedMessage, error } = await supabase
        .from('mensajes')
        .insert({
          chat_id: chatId,
          remitente_id: user.id,
          contenido: shareMode === 'view_once' ? 'Imagen (ver una vez)' : shareMode === 'allow_replay' ? 'Imagen (volver a ver)' : 'Imagen',
          tipo_mensaje: 'imagen',
          imagen_url: imageUrl,
          share_mode: shareMode,
          viewed: false,
          leido: false,
        })
        .select()
        .single();

      if (error) {
        console.error('[Conversacion] Error sending image:', error);
        Alert.alert('Error', 'No se pudo enviar la imagen');
        return;
      }

      // ✅ Update chat
      await supabase
        .from('chats')
        .update({
          ultimo_mensaje: shareMode === 'view_once' ? '📷 Imagen (ver una vez)' : shareMode === 'allow_replay' ? '📷 Imagen (volver a ver)' : '📷 Imagen',
          ultimo_mensaje_fecha: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', chatId);

      // ✅ Send notification
      const recipientId = isLocalChat && localInfo 
        ? localInfo.propietario_id 
        : otroUsuario?.id;

      if (recipientId && recipientId !== user.id) {
        await supabase.from('notificaciones').insert({
          usuario_id: recipientId,
          tipo: 'mensaje_privado',
          titulo: 'Nueva imagen',
          mensaje: `${user.nombre} te envió una imagen`,
          usuario_origen_id: user.id,
          local_id: isLocalChat ? localId : null,
        });
      }

      console.log('[Conversacion] ✅ Image sent successfully');
      setSelectedImageUri(null);
    } catch (error) {
      console.error('[Conversacion] Error:', error);
      Alert.alert('Error', 'Ocurrió un error al enviar la imagen');
    }
  };

  const handleViewImage = (imageUrl: string, shareMode: 'view_once' | 'allow_replay' | 'normal') => {
    setViewingImage({ url: imageUrl, mode: shareMode });
    setShowImageViewer(true);
  };

  const enviarMensaje = async () => {
    console.log('[Conversacion v304.0] 📤 enviarMensaje called - keyboard stays open, message sends immediately');
    
    if (!user || !chatId || !mensaje.trim() || enviando) return;

    const mensajeTexto = mensaje.trim();
    const tempId = `temp-${Date.now()}`;
    
    const optimisticMessage: Message = {
      id: tempId,
      chat_id: chatId,
      remitente_id: user.id,
      contenido: mensajeTexto,
      tipo_mensaje: 'texto',
      leido: false,
      created_at: new Date().toISOString(),
    };

    setMensajes((prev) => [...prev, optimisticMessage]);
    setMensaje('');
    setEnviando(true);

    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 50);

    try {
      const { data: insertedMessage, error } = await supabase
        .from('mensajes')
        .insert({
          chat_id: chatId,
          remitente_id: user.id,
          contenido: mensajeTexto,
          tipo_mensaje: 'texto',
          leido: false,
        })
        .select()
        .single();

      if (error) {
        console.error('[Conversacion] Error sending message:', error);
        
        setMensajes((prev) => prev.filter(m => m.id !== tempId));
        setMensaje(mensajeTexto);
        
        Alert.alert('Error', 'No se pudo enviar el mensaje');
        return;
      }

      setMensajes((prev) => 
        prev.map(m => m.id === tempId ? insertedMessage : m)
      );

      await supabase
        .from('chats')
        .update({
          ultimo_mensaje: mensajeTexto,
          ultimo_mensaje_fecha: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', chatId);

      const recipientId = isLocalChat && localInfo 
        ? localInfo.propietario_id 
        : otroUsuario?.id;

      if (recipientId && recipientId !== user.id) {
        console.log('[Conversacion v304.0] 📬 Sending notification to:', recipientId, isLocalChat ? '(local owner)' : '(user)');
        
        // ✅ Try both table names for notifications (notifications and notificaciones)
        const { error: notifError1 } = await supabase.from('notifications').insert({
          user_id: recipientId,
          type: 'message',
          title: 'Nuevo mensaje',
          body: isLocalChat 
            ? `${user.nombre} te envió un mensaje sobre ${localInfo.nombre}`
            : `${user.nombre} te envió un mensaje`,
          read: false,
          data: {
            sender_id: user.id,
            chat_id: chatId,
            local_id: isLocalChat ? localId : null,
          }
        });
        
        if (notifError1) {
          console.log('[Conversacion v304.0] ⚠️ Failed with "notifications" table, trying "notificaciones"...');
          // Try Spanish table name
          await supabase.from('notificaciones').insert({
            usuario_id: recipientId,
            tipo: 'mensaje_privado',
            titulo: 'Nuevo mensaje',
            mensaje: isLocalChat 
              ? `${user.nombre} te envió un mensaje sobre ${localInfo.nombre}`
              : `${user.nombre} te envió un mensaje`,
            usuario_origen_id: user.id,
            local_id: isLocalChat ? localId : null,
          });
        }
      }

      console.log('[Conversacion v304.0] ✅ Message sent successfully - keyboard stays open for continuous typing');
    } catch (error) {
      console.error('[Conversacion] Error:', error);
      
      setMensajes((prev) => prev.filter(m => m.id !== tempId));
      setMensaje(mensajeTexto);
      
      Alert.alert('Error', 'Ocurrió un error al enviar el mensaje');
    } finally {
      setEnviando(false);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!user) return;

    const message = mensajes.find(m => m.id === messageId);
    if (!message || message.remitente_id !== user.id) {
      Alert.alert('Error', 'Solo puedes eliminar tus propios mensajes');
      return;
    }

    Alert.alert(
      'Eliminar mensaje',
      '¿Estás seguro de que quieres eliminar este mensaje?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              setMensajes((prev) => prev.filter(m => m.id !== messageId));

              const { error } = await supabase
                .from('mensajes')
                .delete()
                .eq('id', messageId);

              if (error) {
                console.error('[Conversacion] Error deleting message:', error);
                if (chatId) loadMessages(chatId);
                Alert.alert('Error', 'No se pudo eliminar el mensaje');
              }
            } catch (error) {
              console.error('[Conversacion] Error:', error);
              if (chatId) loadMessages(chatId);
            }
          },
        },
      ]
    );
  };

  const handleDeleteConversation = async () => {
    if (!user || !chatId) return;

    Alert.alert(
      'Eliminar conversación',
      '¿Estás seguro de que quieres eliminar toda esta conversación? Esta acción no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await supabase
                .from('mensajes')
                .delete()
                .eq('chat_id', chatId);

              await supabase
                .from('chats')
                .delete()
                .eq('id', chatId);

              Alert.alert('Éxito', 'Conversación eliminada', [
                { text: 'OK', onPress: () => router.back() }
              ]);
            } catch (error) {
              console.error('[Conversacion] Error deleting conversation:', error);
              Alert.alert('Error', 'No se pudo eliminar la conversación');
            }
          },
        },
      ]
    );
  };

  // ✅ FIX v308.0: Measure input container height for accurate positioning
  const onLayoutInputContainer = (event: any) => {
    const height = event.nativeEvent.layout.height;
    console.log('[Conversacion v308.0] 📏 Input container measured height:', height);
    setInputContainerHeight(height);
  };

  // ✅ INSTAGRAM STYLE: Helper to format timestamp
  const formatTimestamp = (dateString: string) => {
    const now = new Date();
    const messageDate = new Date(dateString);
    const diffMs = now.getTime() - messageDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Ahora';
    if (diffMins < 60) return `${diffMins} min`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} h`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return 'Ayer';
    if (diffDays < 7) return `${diffDays} d`;
    return messageDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  };

  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    // ✅ Handle momento messages
    if (item.tipo_mensaje === 'momento' && item.momento_id) {
      return (
        <View style={[styles.messageContainer, item.remitente_id === user?.id && styles.messageContainerOwn]}>
          <MomentoMessageBubble
            momentoId={item.momento_id}
            screenshotUrl={item.momento_screenshot_url || null}
            mensaje={item.contenido}
          />
        </View>
      );
    }

    // ✅ Handle image messages
    if (item.tipo_mensaje === 'imagen' && item.imagen_url) {
      const isOwnMessage = item.remitente_id === user?.id;
      
      return (
        <View style={[styles.messageContainer, isOwnMessage && styles.messageContainerOwn]}>
          <ImageMessageBubble
            messageId={item.id}
            imageUrl={item.imagen_url}
            shareMode={item.share_mode || 'normal'}
            viewed={item.viewed || false}
            viewedAt={item.viewed_at}
            isOwnMessage={isOwnMessage}
            onView={() => handleViewImage(item.imagen_url!, item.share_mode || 'normal')}
            onDelete={() => handleDeleteMessage(item.id)}
          />
        </View>
      );
    }

    const isOwnMessage = item.remitente_id === user?.id;
    
    // ✅ INSTAGRAM STYLE: Group consecutive messages from same sender
    const prevMessage = index > 0 ? mensajes[index - 1] : null;
    const nextMessage = index < mensajes.length - 1 ? mensajes[index + 1] : null;
    
    const isFirstInGroup = !prevMessage || prevMessage.remitente_id !== item.remitente_id;
    const isLastInGroup = !nextMessage || nextMessage.remitente_id !== item.remitente_id;
    
    // ✅ ATOMIC JSX: Calculate timestamp outside JSX
    const timeDisplay = formatTimestamp(item.created_at);
    
    // ✅ ATOMIC JSX: Calculate avatar display outside JSX
    const shouldShowAvatar = !isOwnMessage && isFirstInGroup;
    
    // ✅ ATOMIC JSX: Calculate bubble border radius outside JSX
    const bubbleBorderRadius = {
      borderTopLeftRadius: isOwnMessage ? 18 : (isFirstInGroup ? 18 : 4),
      borderTopRightRadius: isOwnMessage ? (isFirstInGroup ? 18 : 4) : 18,
      borderBottomLeftRadius: isOwnMessage ? 18 : (isLastInGroup ? 18 : 4),
      borderBottomRightRadius: isOwnMessage ? (isLastInGroup ? 18 : 4) : 18,
    };

    return (
      <TouchableOpacity
        style={[
          styles.messageWrapper,
          isOwnMessage ? styles.messageWrapperOwn : styles.messageWrapperOther,
          !isLastInGroup && { marginBottom: 2 }, // ✅ Tight spacing for grouped messages
          isLastInGroup && { marginBottom: 12 }, // ✅ Larger spacing between groups
        ]}
        onLongPress={() => handleDeleteMessage(item.id)}
        delayLongPress={500}
        activeOpacity={0.9}
      >
        {/* ✅ INSTAGRAM STYLE: Show avatar only on first message in group (receiver side) */}
        {shouldShowAvatar && (
          <View style={styles.messageAvatar}>
            {displayAvatar ? (
              <Image
                source={{ uri: displayAvatar }}
                style={styles.messageAvatarImage}
              />
            ) : (
              <View style={styles.messageAvatarPlaceholder}>
                <Text style={[styles.messageAvatarText, { fontSize: scaleFontSize(14) }]}>
                  {displayName?.charAt(0).toUpperCase() || 'U'}
                </Text>
              </View>
            )}
          </View>
        )}
        
        {/* ✅ INSTAGRAM STYLE: Empty space for grouped messages (no avatar) */}
        {!isOwnMessage && !isFirstInGroup && (
          <View style={styles.messageAvatar} />
        )}

        <View style={styles.messageContentContainer}>
          <View
            style={[
              styles.messageBubble,
              isOwnMessage ? styles.messageBubbleOwn : styles.messageBubbleOther,
              bubbleBorderRadius,
            ]}
          >
            <Text
              style={[
                styles.messageText,
                { fontSize: scaleFontSize(15) },
                isOwnMessage ? styles.messageTextOwn : styles.messageTextOther,
              ]}
            >
              {item.contenido}
            </Text>
            
            {/* ✅ INSTAGRAM STYLE: Show timestamp only on last message in group */}
            {isLastInGroup && (
              <Text
                style={[
                  styles.messageTime,
                  { fontSize: scaleFontSize(10) },
                  isOwnMessage ? styles.messageTimeOwn : styles.messageTimeOther,
                ]}
              >
                {timeDisplay}
              </Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={[colors.headerGradientStart, colors.headerGradientEnd]}
          style={styles.header}
        >
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <IconSymbol ios_icon_name="chevron.left" android_material_icon_name="arrow_back" size={scaleIconSize(24)} color={colors.headerText} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { fontSize: scaleFontSize(16) }]}>Cargando...</Text>
          <View style={{ width: 40 }} />
        </LinearGradient>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  const displayName = isLocalChat && localInfo 
    ? localInfo.nombre 
    : (otroUsuario?.username || otroUsuario?.nombre || 'Usuario').replace(/^@/, '');
  
  const displayAvatar = isLocalChat && localInfo ? localInfo.imagen_url : otroUsuario?.avatar;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.headerGradientStart, colors.headerGradientEnd]}
        style={styles.header}
      >
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <IconSymbol ios_icon_name="chevron.left" android_material_icon_name="arrow_back" size={scaleIconSize(24)} color={colors.headerText} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.headerCenter}
          onPress={() => {
            if (isLocalChat && localId) {
              router.push(`/perfil/local?localId=${localId}`);
            } else if (otroUsuario) {
              router.push(`/perfil/usuario?userId=${otroUsuario.id}`);
            }
          }}
        >
          {displayAvatar ? (
            <Image source={{ uri: displayAvatar }} style={styles.headerAvatar} />
          ) : (
            <View style={[styles.headerAvatar, styles.avatarPlaceholder]}>
              <Text style={[styles.avatarText, { fontSize: scaleFontSize(16) }]}>
                {displayName?.charAt(0).toUpperCase() || 'U'}
              </Text>
            </View>
          )}
          <View style={styles.headerInfo}>
            <Text style={[styles.headerTitle, { fontSize: scaleFontSize(16) }]}>{displayName}</Text>
            {isLocalChat && (
              <View style={styles.localBadgeHeader}>
                <IconSymbol ios_icon_name="building.2" android_material_icon_name="business" size={scaleIconSize(12)} color={colors.headerText} />
                <Text style={[styles.localBadgeText, { fontSize: scaleFontSize(12) }]}>Local</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
        <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteConversation}>
          <IconSymbol ios_icon_name="trash" android_material_icon_name="delete" size={scaleIconSize(22)} color={colors.headerText} />
        </TouchableOpacity>
      </LinearGradient>

      {/* ✅ FIX v308.0: Messages list with PRECISE keyboard-aware padding (including predictive text) */}
      {/* 
        CRITICAL FIX FOR ANDROID - PREDICTIVE TEXT SOLUTION:
        - When keyboard is OPEN: paddingBottom = keyboardHeight (includes predictive text bar)
        - When keyboard is CLOSED: paddingBottom = inputContainerHeight + insets.bottom
        - Uses screen height change to detect full keyboard height including predictive text
        - This ensures the input field is never hidden by the predictive text bar
      */}
      <FlatList
        ref={flatListRef}
        data={mensajes}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.messagesList,
          { 
            paddingBottom: isKeyboardVisible
              ? keyboardHeight  // ✅ INCLUDES PREDICTIVE TEXT: Uses actual keyboard height from screen change
              : (inputContainerHeight || 80) + insets.bottom   // Keyboard closed: space for input + system nav bar
          }
        ]}
        renderItem={renderMessage}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <IconSymbol ios_icon_name="bubble.left.and.bubble.right" android_material_icon_name="chat" size={scaleIconSize(64)} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { fontSize: scaleFontSize(18) }]}>No hay mensajes aún</Text>
            <Text style={[styles.emptySubtext, { fontSize: scaleFontSize(14) }]}>
              {isLocalChat 
                ? `Envía un mensaje a ${displayName}` 
                : 'Envía un mensaje para iniciar la conversación'}
            </Text>
          </View>
        }
      />

      {/* ✅ FIX v308.0: Input container with PRECISE keyboard positioning (including predictive text) */}
      {/* 
        CRITICAL FIX FOR ANDROID - PREDICTIVE TEXT SOLUTION:
        - position: 'absolute' with dynamic bottom positioning
        - When keyboard OPEN: bottom = keyboardHeight (includes predictive text bar height)
        - When keyboard CLOSED: bottom = 0 (sits at physical screen bottom)
        - Uses screen height change to detect full keyboard height
        - paddingBottom: insets.bottom (creates white space behind system nav bar when closed)
        - backgroundColor: '#FFFFFF' ensures solid white background (no transparency)
        - White background extends BEHIND the system navigation bar
        - Visible content (input field) respects safe area via paddingBottom
        - onLayout measures the actual height of the input container for FlatList padding
      */}
      <View 
        style={[
          styles.inputContainer, 
          { 
            bottom: isKeyboardVisible ? keyboardHeight : 0, // ✅ INCLUDES PREDICTIVE TEXT: Uses actual keyboard height
            paddingBottom: isKeyboardVisible ? 0 : insets.bottom, // ✅ CRITICAL: White space only when keyboard closed
          }
        ]}
        onLayout={onLayoutInputContainer} // ✅ Measure input container height for FlatList padding
      >
        <View style={styles.inputRow}>
          {/* ✅ Image picker buttons */}
          <View style={styles.imageButtonsContainer}>
            <TouchableOpacity style={styles.imageButton} onPress={handlePickImage}>
              <IconSymbol
                ios_icon_name="photo"
                android_material_icon_name="image"
                size={scaleIconSize(24)}
                color={colors.primary}
              />
            </TouchableOpacity>
            <TouchableOpacity style={styles.imageButton} onPress={handleTakePhoto}>
              <IconSymbol
                ios_icon_name="camera"
                android_material_icon_name="camera"
                size={scaleIconSize(24)}
                color={colors.primary}
              />
            </TouchableOpacity>
          </View>

          <TextInput
            style={[styles.input, { fontSize: scaleFontSize(16) }]}
            placeholder="Escribe un mensaje..."
            placeholderTextColor={colors.textSecondary}
            value={mensaje}
            onChangeText={setMensaje}
            multiline
            maxLength={1000}
            editable={!enviando}
            onSubmitEditing={enviarMensaje}
            blurOnSubmit={false}
            returnKeyType="send"
          />
          <TouchableOpacity
            style={[styles.sendButton, (!mensaje.trim() || enviando) && styles.sendButtonDisabled]}
            onPress={enviarMensaje}
            disabled={!mensaje.trim() || enviando}
          >
            {enviando ? (
              <ActivityIndicator size="small" color={colors.headerText} />
            ) : (
              <IconSymbol ios_icon_name="paperplane.fill" android_material_icon_name="send" size={scaleIconSize(20)} color={colors.headerText} />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* ✅ Image Share Modal */}
      {selectedImageUri && (
        <ImageShareModal
          visible={showImageShareModal}
          imageUri={selectedImageUri}
          onClose={() => {
            setShowImageShareModal(false);
            setSelectedImageUri(null);
          }}
          onSend={handleSendImage}
        />
      )}

      {/* ✅ Image Viewer Modal */}
      {viewingImage && (
        <ImageViewerModal
          visible={showImageViewer}
          imageUrl={viewingImage.url}
          shareMode={viewingImage.mode}
          onClose={() => {
            setShowImageViewer(false);
            setViewingImage(null);
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
    paddingBottom: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 8,
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  avatarPlaceholder: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontWeight: 'bold',
    color: colors.headerText,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontWeight: '600',
    color: colors.headerText,
  },
  localBadgeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  localBadgeText: {
    color: colors.headerText,
    opacity: 0.8,
  },
  deleteButton: {
    padding: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messagesList: {
    padding: 16,
  },
  messageContainer: {
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  messageContainerOwn: {
    alignItems: 'flex-end',
  },
  // ✅ INSTAGRAM STYLE: Message wrapper with avatar and bubble
  messageWrapper: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
  },
  messageWrapperOwn: {
    justifyContent: 'flex-end',
  },
  messageWrapperOther: {
    justifyContent: 'flex-start',
  },
  // ✅ INSTAGRAM STYLE: Avatar (36x36, shown only on first message in group)
  messageAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: 'hidden',
  },
  messageAvatarImage: {
    width: '100%',
    height: '100%',
  },
  messageAvatarPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.primary + '30',
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageAvatarText: {
    fontWeight: '600',
    color: colors.text,
  },
  // ✅ INSTAGRAM STYLE: Message content container
  messageContentContainer: {
    maxWidth: '70%',
  },
  // ✅ INSTAGRAM STYLE: Message bubble with dynamic border radius
  messageBubble: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  messageBubbleOwn: {
    backgroundColor: colors.primary,
  },
  messageBubbleOther: {
    backgroundColor: '#FFFFFF', // ✅ White/light gray background for incoming messages
    // ✅ SEGUNDA PARTE: Soft grayish shadow for elevated appearance
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  // ✅ INSTAGRAM STYLE: Message text
  messageText: {
    lineHeight: 20,
  },
  messageTextOwn: {
    color: '#FFFFFF',
  },
  messageTextOther: {
    color: colors.text,
  },
  // ✅ INSTAGRAM STYLE: Timestamp (shown only on last message in group)
  messageTime: {
    marginTop: 4,
    opacity: 0.7,
    alignSelf: 'flex-end',
  },
  messageTimeOwn: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  messageTimeOther: {
    color: colors.textSecondary,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    gap: 12,
  },
  emptyText: {
    fontWeight: '600',
    color: colors.text,
  },
  emptySubtext: {
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  inputContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF', // ✅ CRITICAL: WHITE BACKGROUND - Extends behind system navigation bar
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
    // ✅ bottom: 0 (set dynamically in component) - Extends to physical screen edge
    // ✅ paddingBottom: insets.bottom (set dynamically in component) - Creates white space behind system nav bar
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 12,
    backgroundColor: '#FFFFFF', // ✅ WHITE BACKGROUND - Visible content area
  },
  imageButtonsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  imageButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.cardBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    color: colors.text,
    maxHeight: 100,
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});
