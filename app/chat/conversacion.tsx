
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
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/contexts/AuthContext';
import MessageBubble from '@/components/chat/MessageBubble';
import MomentoMessageBubble from '@/components/chat/MomentoMessageBubble';
import { scaleFontSize, scaleIconSize, getContentBottomPadding } from '@/utils/androidScaling';
import * as SystemUI from 'expo-system-ui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
  leido: boolean;
  created_at: string;
}

/**
 * ✅ KEYBOARD & SYSTEM NAV BAR FIXES v297.0 - ANDROID PROFESSIONAL SOLUTION (COMPLETE FIX)
 * 
 * ANDROID-SPECIFIC FIXES:
 * 1️⃣ CONVERSACIÓN - Input field behavior:
 *    - ✅ Absolute positioning with bottom: 0 (extends to physical screen bottom)
 *    - ✅ Input rises smoothly when keyboard opens via translateY
 *    - ✅ Input returns to bottom automatically when keyboard closes
 *    - ✅ NO stuck-in-middle issue
 *    - ✅ White background extends BEHIND system navigation bar
 *    - ✅ Visible content respects safe area insets
 *    - ✅ ADDITIONAL OFFSET (+60px) for Android to ensure full visibility above keyboard
 * 
 * 2️⃣ SEND BUTTON:
 *    - ✅ Sends message immediately on first press
 *    - ✅ Keyboard stays open (blurOnSubmit={false})
 *    - ✅ No need to press twice
 *    - ✅ User can continue typing after sending
 * 
 * 3️⃣ SYSTEM NAVIGATION BAR (NEW v297.0):
 *    - ✅ FlatList paddingBottom correctly accounts for insets.bottom + input height
 *    - ✅ Content NEVER scrolls underneath the system navigation bar
 *    - ✅ inputContainer extends to bottom: 0 (physical screen edge)
 *    - ✅ paddingBottom: insets.bottom creates white space behind nav bar
 *    - ✅ Solid white background (#FFFFFF) prevents transparency
 *    - ✅ Professional behavior matching standard Android apps
 * 
 * TECHNICAL IMPLEMENTATION:
 * - position: 'absolute' with bottom: 0 (CRITICAL - extends to physical screen edge)
 * - paddingBottom: insets.bottom (creates white space behind system nav bar)
 * - Keyboard listeners for height tracking (keyboardDidShow/keyboardDidHide)
 * - No KeyboardAvoidingView (causes issues on Android)
 * - inputContainer (absolute) + inputRow (flex layout) pattern
 * - WHITE BACKGROUND (#FFFFFF) extends behind system navigation bar
 * - FlatList paddingBottom: keyboardHeight + 80 OR insets.bottom + 80
 * - Input content respects safe area via paddingBottom
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

  // ✅ FIX v297.0: Detect keyboard height dynamically with Android offset for full visibility
  useEffect(() => {
    const keyboardWillShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        console.log('[Conversacion v297.0] ⌨️ Keyboard shown, height:', e.endCoordinates.height);
        // ✅ Add extra offset for Android to ensure input is fully visible above keyboard
        const extraOffset = Platform.OS === 'android' ? 60 : 0;
        setKeyboardHeight(e.endCoordinates.height + extraOffset);
        setKeyboardVisible(true);
      }
    );

    const keyboardWillHideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        console.log('[Conversacion v297.0] ⌨️ Keyboard hidden');
        setKeyboardHeight(0);
        setKeyboardVisible(false);
      }
    );

    return () => {
      keyboardWillShowListener.remove();
      keyboardWillHideListener.remove();
    };
  }, []);

  const loadMessages = useCallback(async (chatIdToLoad: string) => {
    try {
      const { data, error } = await supabase
        .from('mensajes')
        .select('*')
        .eq('chat_id', chatIdToLoad)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('[Conversacion] Error loading messages:', error);
        return;
      }

      setMensajes(data || []);

      if (user) {
        await supabase
          .from('mensajes')
          .update({ leido: true, leido_at: new Date().toISOString() })
          .eq('chat_id', chatIdToLoad)
          .neq('remitente_id', user.id)
          .eq('leido', false);
      }

      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
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

          setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: true });
          }, 50);
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

  const enviarMensaje = async () => {
    console.log('[Conversacion v297.0] 📤 enviarMensaje called - keyboard stays open, message sends immediately');
    
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
        console.log('[Conversacion] 📬 Sending notification to:', recipientId, isLocalChat ? '(local owner)' : '(user)');
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

      console.log('[Conversacion v297.0] ✅ Message sent successfully - keyboard stays open for continuous typing');
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

  const renderMessage = ({ item }: { item: Message }) => {
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

    return (
      <MessageBubble
        message={item}
        isOwn={item.remitente_id === user?.id}
        otroUsuario={isLocalChat && localInfo ? { ...localInfo, nombre: localInfo.nombre, avatar: localInfo.imagen_url } : otroUsuario}
        onLongPress={() => handleDeleteMessage(item.id)}
      />
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

      {/* ✅ FIX v297.0: Messages list with CORRECT padding to prevent content from going under system navigation bar */}
      {/* 
        CRITICAL FIX FOR ANDROID SYSTEM NAVIGATION BAR:
        - When keyboard is OPEN: paddingBottom = keyboardHeight + 80 (space for input + keyboard)
        - When keyboard is CLOSED: paddingBottom = insets.bottom + 80 (space for input + system nav bar)
        - The +80 accounts for the input container height (~60px) + extra safe margin
        - This ensures content NEVER scrolls underneath the system navigation bar
      */}
      <FlatList
        ref={flatListRef}
        data={mensajes}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.messagesList,
          { 
            paddingBottom: isKeyboardVisible
              ? keyboardHeight + 80  // Keyboard open: space for input + keyboard
              : insets.bottom + 80   // Keyboard closed: space for input + system nav bar (CRITICAL FIX)
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

      {/* ✅ FIX v297.0: Input container EXTENDS TO PHYSICAL SCREEN BOTTOM with WHITE BACKGROUND behind system nav bar */}
      {/* 
        CRITICAL FIX FOR ANDROID SYSTEM NAVIGATION BAR:
        - position: 'absolute' with bottom: 0 (EXTENDS TO PHYSICAL SCREEN EDGE)
        - paddingBottom: insets.bottom (creates white space behind system nav bar)
        - backgroundColor: '#FFFFFF' ensures solid white background (no transparency)
        - When keyboard opens: transform translateY moves container up by keyboardHeight
        - When keyboard closes: transform returns to 0, container sits at bottom: 0
        - White background extends BEHIND the system navigation bar
        - Visible content (input field) respects safe area via paddingBottom
      */}
      <View style={[
        styles.inputContainer, 
        { 
          bottom: 0, // ✅ CRITICAL: Extends to physical screen bottom
          paddingBottom: insets.bottom, // ✅ CRITICAL: Creates white space behind system nav bar
          transform: [{ translateY: isKeyboardVisible ? -keyboardHeight : 0 }], // ✅ Moves up when keyboard opens
        }
      ]}>
        <View style={styles.inputRow}>
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
    // ✅ transform: translateY (set dynamically in component) - Moves up when keyboard opens
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 12,
    backgroundColor: '#FFFFFF', // ✅ WHITE BACKGROUND - Visible content area
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
