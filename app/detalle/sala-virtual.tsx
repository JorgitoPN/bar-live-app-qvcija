
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
  Animated,
  Dimensions,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  FlatList,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/contexts/AuthContext';
import LoginRequiredModal from '@/components/common/LoginRequiredModal';

const { width, height } = Dimensions.get('window');

interface CheckIn {
  id: string;
  usuario_id: string;
  local_id: string;
  created_at: string;
  usuario: {
    id: string;
    nombre: string;
    username: string;
    avatar?: string;
  };
}

interface InteractionMessage {
  id: string;
  usuario_id: string;
  local_id: string;
  tipo: 'mensaje' | 'emoticon' | 'chat';
  contenido: string;
  created_at: string;
  usuario: {
    id: string;
    nombre: string;
    username?: string;
    avatar?: string;
  };
}

type InteractionMessageArray = InteractionMessage[];

const MENSAJES_RAPIDOS = [
  { id: '1', texto: '¿Me invitas a una copa? 🍹', emoji: '🍹' },
  { id: '2', texto: 'Te invito a una copa 🥂', emoji: '🥂' },
  { id: '3', texto: '¡Qué buena música! 🎵', emoji: '🎵' },
  { id: '4', texto: '¿Bailamos? 💃', emoji: '💃' },
  { id: '5', texto: '¡Salud! 🍻', emoji: '🍻' },
  { id: '6', texto: '¡Qué ambiente! 🎉', emoji: '🎉' },
];

const EMOTICONS = [
  { id: '1', emoji: '❤️', nombre: 'Corazón' },
  { id: '2', emoji: '🔥', nombre: 'Fuego' },
  { id: '3', emoji: '😍', nombre: 'Enamorado' },
  { id: '4', emoji: '🎉', nombre: 'Fiesta' },
  { id: '5', emoji: '👋', nombre: 'Saludo' },
  { id: '6', emoji: '😎', nombre: 'Cool' },
  { id: '7', emoji: '🍻', nombre: 'Brindis' },
  { id: '8', emoji: '💃', nombre: 'Baile' },
  { id: '9', emoji: '🎵', nombre: 'Música' },
  { id: '10', emoji: '⭐', nombre: 'Estrella' },
  { id: '11', emoji: '💫', nombre: 'Brillante' },
  { id: '12', emoji: '👍', nombre: 'Me gusta' },
];

export default function SalaVirtualScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user } = useAuth();
  const flatListRef = useRef<FlatList>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [local, setLocal] = useState<any>(null);
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [userHasCheckedIn, setUserHasCheckedIn] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showQuickMessages, setShowQuickMessages] = useState(false);
  const [showEmoticons, setShowEmoticons] = useState(false);
  const [interactions, setInteractions] = useState<InteractionMessage[]>([]);
  const [floatingEmojis, setFloatingEmojis] = useState<Array<{ id: string; emoji: string; x: number; y: Animated.Value; opacity: Animated.Value }>>([]);
  
  const [showPublicChat, setShowPublicChat] = useState(false);
  const [chatMessages, setChatMessages] = useState<InteractionMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const channelRef = useRef<any>(null);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const loadData = useCallback(async () => {
    try {
      console.log('[SalaVirtual] ⚡ Loading data for local:', params.id);

      const { data: localData, error: localError } = await supabase
        .from('locales')
        .select('id, nombre, direccion, provincia, imagen_url')
        .eq('id', params.id)
        .single();

      if (localError) {
        console.error('[SalaVirtual] Error loading local:', localError);
        Alert.alert('Error', 'No se pudo cargar la información del local');
        return;
      }

      setLocal(localData);

      const sixHoursAgo = new Date();
      sixHoursAgo.setHours(sixHoursAgo.getHours() - 6);

      const { data: checkInsData, error: checkInsError } = await supabase
        .from('check_ins')
        .select(`
          id,
          usuario_id,
          local_id,
          created_at,
          usuario:usuarios(id, nombre, username, avatar)
        `)
        .eq('local_id', params.id)
        .gte('created_at', sixHoursAgo.toISOString())
        .order('created_at', { ascending: false });

      if (checkInsError) {
        console.error('[SalaVirtual] Error loading check-ins:', checkInsError);
      } else {
        setCheckIns(checkInsData || []);
        
        if (user) {
          const hasCheckedIn = checkInsData?.some(ci => ci.usuario_id === user.id) || false;
          setUserHasCheckedIn(hasCheckedIn);
        }
      }

      const thirtyMinutesAgo = new Date();
      thirtyMinutesAgo.setMinutes(thirtyMinutesAgo.getMinutes() - 30);

      console.log('[SalaVirtual] 📥 Loading interactions from sala_virtual_interacciones...');

      const { data: interactionsData, error: interactionsError } = await supabase
        .from('sala_virtual_interacciones')
        .select(`
          id,
          usuario_id,
          local_id,
          tipo,
          contenido,
          created_at,
          usuario:usuarios(id, nombre, username, avatar)
        `)
        .eq('local_id', params.id)
        .gte('created_at', thirtyMinutesAgo.toISOString())
        .order('created_at', { ascending: false })
        .limit(100);

      if (interactionsError) {
        console.error('[SalaVirtual] ⚠️ Error loading interactions:', interactionsError);
        console.error('[SalaVirtual] ⚠️ This error means the table sala_virtual_interacciones does not exist in your Supabase database.');
        console.error('[SalaVirtual] ⚠️ Please create the table using the SQL provided in the implementation plan.');
        
        // Set empty arrays to prevent crashes
        setInteractions([]);
        setChatMessages([]);
      } else {
        console.log('[SalaVirtual] ✅ Loaded', interactionsData?.length || 0, 'interactions');
        const allInteractions = interactionsData || [];
        
        // Separate chat messages from other interactions
        const chatMsgs = allInteractions.filter(i => i.tipo === 'chat');
        const otherInteractions = allInteractions.filter(i => i.tipo !== 'chat');
        
        setInteractions(otherInteractions);
        setChatMessages(chatMsgs.reverse()); // Reverse to show oldest first in chat
      }

      console.log('[SalaVirtual] ⚡ Data loaded successfully');
    } catch (error) {
      console.error('[SalaVirtual] Error:', error);
      Alert.alert('Error', 'Ocurrió un error al cargar los datos');
    } finally {
      setLoading(false);
    }
  }, [params.id, user]);

  useEffect(() => {
    if (params.id) {
      loadData();
    }
  }, [params.id, loadData]);

  useEffect(() => {
    if (!params.id) return;

    console.log('[SalaVirtual] ⚡ Setting up real-time subscriptions');

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase
      .channel(`sala_virtual:${params.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'sala_virtual_interacciones',
          filter: `local_id=eq.${params.id}`,
        },
        async (payload) => {
          console.log('[SalaVirtual] ⚡ INSTANT new interaction:', payload.new);
          
          const { data: userData } = await supabase
            .from('usuarios')
            .select('id, nombre, username, avatar')
            .eq('id', payload.new.usuario_id)
            .single();

          const newInteraction = {
            ...payload.new,
            usuario: userData || { id: payload.new.usuario_id, nombre: 'Usuario', username: '', avatar: '' },
          } as InteractionMessage;

          // If it's a chat message, add to chat
          if (payload.new.tipo === 'chat') {
            setChatMessages((prev) => [...prev, newInteraction]);
            
            setTimeout(() => {
              flatListRef.current?.scrollToEnd({ animated: true });
            }, 50);
          } else {
            // Otherwise add to interactions feed
            setInteractions((prev) => [newInteraction, ...prev].slice(0, 50));

            if (payload.new.tipo === 'emoticon') {
              showFloatingEmoji(payload.new.contenido);
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'check_ins',
          filter: `local_id=eq.${params.id}`,
        },
        async (payload) => {
          console.log('[SalaVirtual] ⚡ INSTANT new check-in:', payload.new);
          
          const { data: userData } = await supabase
            .from('usuarios')
            .select('id, nombre, username, avatar')
            .eq('id', payload.new.usuario_id)
            .single();

          if (userData) {
            setCheckIns((prev) => [{
              ...payload.new,
              usuario: userData,
            } as CheckIn, ...prev]);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'sala_virtual_interacciones',
          filter: `local_id=eq.${params.id}`,
        },
        (payload) => {
          console.log('[SalaVirtual] ⚡ Message deleted:', payload.old);
          
          // Remove from chat messages
          setChatMessages((prev) => prev.filter(m => m.id !== payload.old.id));
          
          // Remove from interactions
          setInteractions((prev) => prev.filter(i => i.id !== payload.old.id));
        }
      )
      .subscribe((status) => {
        console.log('[SalaVirtual] Subscription status:', status);
      });

    channelRef.current = channel;

    return () => {
      console.log('[SalaVirtual] Cleaning up subscriptions');
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [params.id]);

  const showFloatingEmoji = (emoji: string) => {
    const id = Date.now().toString();
    const x = Math.random() * (width - 60);
    const y = new Animated.Value(height - 200);
    const opacity = new Animated.Value(1);

    setFloatingEmojis((prev) => [...prev, { id, emoji, x, y, opacity }]);

    Animated.parallel([
      Animated.timing(y, {
        toValue: -100,
        duration: 3000,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 3000,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setFloatingEmojis((prev) => prev.filter((item) => item.id !== id));
    });
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleCheckIn = async () => {
    if (!user) {
      setShowLoginModal(true);
      return;
    }

    if (userHasCheckedIn) {
      Alert.alert('Ya has hecho check-in', 'Ya estás registrado en este local');
      return;
    }

    try {
      // Check if user is already checked in to another local
      const { data: existingCheckIns, error: checkError } = await supabase
        .from('check_ins')
        .select('id, local_id, locales(nombre)')
        .eq('usuario_id', user.id);

      if (checkError) {
        console.error('[SalaVirtual] Error checking existing check-ins:', checkError);
        Alert.alert('Error', 'No se pudo verificar tu estado de check-in');
        return;
      }

      // If user is checked in elsewhere, auto check-out from previous local
      if (existingCheckIns && existingCheckIns.length > 0) {
        const previousLocal = existingCheckIns[0] as any;
        console.log('[SalaVirtual] 🔄 User checked in elsewhere, auto check-out from:', previousLocal.locales?.nombre);

        const { error: deleteError } = await supabase
          .from('check_ins')
          .delete()
          .eq('usuario_id', user.id);

        if (deleteError) {
          console.error('[SalaVirtual] Error removing previous check-in:', deleteError);
          Alert.alert('Error', 'No se pudo cerrar tu sesión anterior');
          return;
        }

        console.log('[SalaVirtual] ✅ Previous check-in removed');
      }

      // Create new check-in
      const { error } = await supabase
        .from('check_ins')
        .insert({
          usuario_id: user.id,
          local_id: params.id,
        });

      if (error) {
        console.error('[SalaVirtual] Error creating check-in:', error);
        Alert.alert('Error', 'No se pudo hacer check-in');
        return;
      }

      Alert.alert('¡Check-in exitoso!', 'Ahora apareces en la sala virtual');
      setUserHasCheckedIn(true);
    } catch (error) {
      console.error('[SalaVirtual] Error:', error);
      Alert.alert('Error', 'Ocurrió un error al hacer check-in');
    }
  };

  const handleCheckOut = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('check_ins')
        .delete()
        .eq('usuario_id', user.id)
        .eq('local_id', params.id);

      if (error) {
        console.error('[SalaVirtual] Error deleting check-in:', error);
        Alert.alert('Error', 'No se pudo hacer check-out');
        return;
      }

      Alert.alert('Check-out exitoso', 'Ya no apareces en la sala virtual');
      setUserHasCheckedIn(false);
      setCheckIns((prev) => prev.filter((ci) => ci.usuario_id !== user.id));
    } catch (error) {
      console.error('[SalaVirtual] Error:', error);
      Alert.alert('Error', 'Ocurrió un error al hacer check-out');
    }
  };

  const handleSendQuickMessage = async (mensaje: string) => {
    if (!user) {
      setShowLoginModal(true);
      return;
    }

    if (!userHasCheckedIn) {
      Alert.alert('Haz check-in primero', 'Debes hacer check-in para interactuar en la sala virtual');
      return;
    }

    try {
      const { error } = await supabase
        .from('sala_virtual_interacciones')
        .insert({
          usuario_id: user.id,
          local_id: params.id,
          tipo: 'mensaje',
          contenido: mensaje,
        });

      if (error) {
        console.error('[SalaVirtual] Error sending message:', error);
        Alert.alert('Error', 'No se pudo enviar el mensaje');
        return;
      }

      setShowQuickMessages(false);
    } catch (error) {
      console.error('[SalaVirtual] Error:', error);
      Alert.alert('Error', 'Ocurrió un error al enviar el mensaje');
    }
  };

  const handleSendEmoticon = async (emoji: string) => {
    if (!user) {
      setShowLoginModal(true);
      return;
    }

    if (!userHasCheckedIn) {
      Alert.alert('Haz check-in primero', 'Debes hacer check-in para interactuar en la sala virtual');
      return;
    }

    try {
      const { error } = await supabase
        .from('sala_virtual_interacciones')
        .insert({
          usuario_id: user.id,
          local_id: params.id,
          tipo: 'emoticon',
          contenido: emoji,
        });

      if (error) {
        console.error('[SalaVirtual] Error sending emoticon:', error);
        Alert.alert('Error', 'No se pudo enviar el emoticono');
        return;
      }

      setShowEmoticons(false);
    } catch (error) {
      console.error('[SalaVirtual] Error:', error);
      Alert.alert('Error', 'Ocurrió un error al enviar el emoticono');
    }
  };

  const handleSendChatMessage = async () => {
    if (!user) {
      setShowLoginModal(true);
      return;
    }

    if (!userHasCheckedIn) {
      Alert.alert('Haz check-in primero', 'Debes hacer check-in para chatear en la sala virtual');
      return;
    }

    if (!newMessage.trim()) return;

    const messageText = newMessage.trim();
    const tempId = `temp-${Date.now()}`;

    console.log('[SalaVirtual] 💬 Sending chat message:', messageText);

    // OPTIMISTIC UI UPDATE - Show message INSTANTLY
    const optimisticMessage: InteractionMessage = {
      id: tempId,
      usuario_id: user.id,
      local_id: params.id as string,
      tipo: 'chat',
      contenido: messageText,
      created_at: new Date().toISOString(),
      usuario: {
        id: user.id,
        nombre: user.nombre,
        username: user.username,
        avatar: user.avatar,
      },
    };

    setChatMessages((prev) => [...prev, optimisticMessage]);
    setNewMessage('');

    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 50);

    try {
      setSendingMessage(true);

      console.log('[SalaVirtual] 📤 Inserting into sala_virtual_interacciones table...');

      // Insert message into database using sala_virtual_interacciones table
      const { data, error: insertError } = await supabase
        .from('sala_virtual_interacciones')
        .insert({
          usuario_id: user.id,
          local_id: params.id,
          tipo: 'chat',
          contenido: messageText,
        })
        .select('id')
        .single();

      if (insertError) {
        console.error('[SalaVirtual] ❌ Error sending chat message:', insertError);
        console.error('[SalaVirtual] ❌ Error details:', JSON.stringify(insertError, null, 2));
        
        // Remove optimistic message on error
        setChatMessages((prev) => prev.filter(m => m.id !== tempId));
        setNewMessage(messageText);
        
        // Show detailed error to user
        if (insertError.code === 'PGRST205') {
          Alert.alert(
            'Error de Base de Datos',
            'La tabla sala_virtual_interacciones no existe en la base de datos. Por favor, contacta al administrador para crear la tabla necesaria.'
          );
        } else {
          Alert.alert('Error', 'No se pudo enviar el mensaje. Por favor, intenta de nuevo.');
        }
        return;
      }

      console.log('[SalaVirtual] ✅ Message sent successfully with ID:', data?.id);
      
      // Replace optimistic message with real one
      if (data?.id) {
        setChatMessages((prev) => 
          prev.map(m => m.id === tempId ? { ...m, id: data.id } : m)
        );
      }
      
    } catch (error) {
      console.error('[SalaVirtual] ❌ Error:', error);
      
      // Remove optimistic message on error
      setChatMessages((prev) => prev.filter(m => m.id !== tempId));
      setNewMessage(messageText);
      
      Alert.alert('Error', 'Ocurrió un error al enviar el mensaje');
    } finally {
      setSendingMessage(false);
    }
  };

  const handleDeleteChatMessage = async (messageId: string) => {
    if (!user) return;

    const message = chatMessages.find(m => m.id === messageId);
    if (!message || message.usuario_id !== user.id) {
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
              // Optimistically remove from UI
              setChatMessages((prev) => prev.filter(m => m.id !== messageId));

              const { error } = await supabase
                .from('sala_virtual_interacciones')
                .delete()
                .eq('id', messageId);

              if (error) {
                console.error('[SalaVirtual] Error deleting message:', error);
                Alert.alert('Error', 'No se pudo eliminar el mensaje');
                // Reload data to restore message
                loadData();
              }
            } catch (error) {
              console.error('[SalaVirtual] Error:', error);
              loadData();
            }
          },
        },
      ]
    );
  };

  const formatCheckInTime = (created_at: string): string => {
    const now = new Date();
    const checkInTime = new Date(created_at);
    const diffMs = now.getTime() - checkInTime.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);

    if (diffMins < 1) return 'Ahora';
    if (diffMins < 60) return `Hace ${diffMins} min`;
    if (diffHours < 6) return `Hace ${diffHours} h`;
    return checkInTime.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  };

  const formatChatTime = (created_at: string): string => {
    const messageTime = new Date(created_at);
    return messageTime.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={[colors.headerGradientStart, colors.headerGradientEnd]}
          style={styles.header}
        >
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <IconSymbol name="chevron.left" size={24} color={colors.headerText} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Sala Virtual</Text>
          <View style={{ width: 40 }} />
        </LinearGradient>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Cargando sala virtual...</Text>
        </View>
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
          <IconSymbol name="chevron.left" size={24} color={colors.headerText} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Sala Virtual</Text>
        <TouchableOpacity 
          style={styles.chatButton} 
          onPress={() => setShowPublicChat(true)}
        >
          <IconSymbol name="bubble.left.and.bubble.right.fill" size={24} color={colors.headerText} />
          {chatMessages.length > 0 && (
            <View style={styles.chatBadge}>
              <Text style={styles.chatBadgeText}>{chatMessages.length}</Text>
            </View>
          )}
        </TouchableOpacity>
      </LinearGradient>

      {floatingEmojis.map((item) => (
        <Animated.Text
          key={item.id}
          style={[
            styles.floatingEmoji,
            {
              left: item.x,
              transform: [{ translateY: item.y }],
              opacity: item.opacity,
            },
          ]}
        >
          {item.emoji}
        </Animated.Text>
      ))}

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {local?.imagen_url && (
          <View style={styles.imageContainer}>
            <Image source={{ uri: local.imagen_url }} style={styles.localImage} />
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.7)']}
              style={styles.imageGradient}
            />
          </View>
        )}

        <View style={styles.infoCard}>
          <LinearGradient
            colors={['#667eea', '#764ba2']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.infoGradient}
          >
            <View style={styles.infoHeader}>
              <IconSymbol name="person.2.fill" size={32} color={colors.headerText} />
              <View style={styles.infoText}>
                <Text style={styles.infoTitle}>
                  {checkIns.length} {checkIns.length === 1 ? 'persona' : 'personas'} aquí ahora
                </Text>
                <Text style={styles.infoSubtitle}>
                  {local?.nombre} - {local?.provincia}
                </Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        {interactions.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🎉 Actividad Reciente</Text>
            <View style={styles.interactionsFeed}>
              {interactions.slice(0, 10).map((interaction, index) => (
                <Animated.View 
                  key={interaction.id} 
                  style={[
                    styles.interactionItem,
                    { opacity: 1 - (index * 0.05) }
                  ]}
                >
                  {interaction.usuario.avatar ? (
                    <Image
                      source={{ uri: interaction.usuario.avatar }}
                      style={styles.interactionAvatar}
                    />
                  ) : (
                    <View style={[styles.interactionAvatar, styles.avatarPlaceholder]}>
                      <Text style={styles.avatarText}>
                        {interaction.usuario.nombre.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  )}
                  <View style={styles.interactionContent}>
                    <Text style={styles.interactionText}>
                      <Text style={styles.interactionUser}>{interaction.usuario.nombre}</Text>
                      {interaction.tipo === 'emoticon' ? (
                        <Text> envió {interaction.contenido}</Text>
                      ) : (
                        <Text>: {interaction.contenido}</Text>
                      )}
                    </Text>
                    <Text style={styles.interactionTime}>
                      {formatCheckInTime(interaction.created_at)}
                    </Text>
                  </View>
                </Animated.View>
              ))}
            </View>
          </View>
        )}

        {checkIns.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>👥 Usuarios en el Local</Text>
            {checkIns.map((checkIn) => (
              <View key={checkIn.id} style={styles.usuarioCard}>
                <TouchableOpacity
                  style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}
                  onPress={() => {
                    if (user && checkIn.usuario_id === user.id) {
                      router.push('/(tabs)/perfil');
                    } else {
                      router.push(`/perfil/usuario?userId=${checkIn.usuario_id}`);
                    }
                  }}
                >
                  {checkIn.usuario.avatar ? (
                    <Image source={{ uri: checkIn.usuario.avatar }} style={styles.avatar} />
                  ) : (
                    <View style={[styles.avatar, styles.avatarPlaceholder]}>
                      <Text style={styles.avatarText}>
                        {checkIn.usuario.nombre.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  )}
                  <View style={styles.usuarioInfo}>
                    <Text style={styles.nombre}>{checkIn.usuario.nombre}</Text>
                    {checkIn.usuario.username && (
                      <Text style={styles.username}>@{checkIn.usuario.username}</Text>
                    )}
                    <View style={styles.checkInInfo}>
                      <IconSymbol name="clock" size={14} color={colors.textSecondary} />
                      <Text style={styles.checkInTime}>
                        Check-in: {formatCheckInTime(checkIn.created_at)}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
                {user && checkIn.usuario_id !== user.id && (
                  <TouchableOpacity
                    style={styles.messageButton}
                    onPress={() => router.push(`/chat/conversacion?userId=${checkIn.usuario_id}`)}
                  >
                    <IconSymbol name="message" size={20} color={colors.primary} />
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>
        )}

        {checkIns.length === 0 && (
          <View style={styles.emptyState}>
            <IconSymbol name="person.2" size={64} color={colors.textSecondary} />
            <Text style={styles.emptyTitle}>No hay nadie aquí ahora</Text>
            <Text style={styles.emptySubtitle}>
              Sé el primero en hacer check-in y aparecer en la sala virtual
            </Text>
          </View>
        )}
      </ScrollView>

      {userHasCheckedIn ? (
        <View style={styles.footer}>
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => setShowQuickMessages(true)}
            >
              <LinearGradient
                colors={['#FF6B6B', '#FF8E53']}
                style={styles.actionButtonGradient}
              >
                <IconSymbol name="message.fill" size={24} color={colors.headerText} />
                <Text style={styles.actionButtonText}>Mensaje</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => setShowEmoticons(true)}
            >
              <LinearGradient
                colors={['#4ECDC4', '#44A08D']}
                style={styles.actionButtonGradient}
              >
                <Text style={styles.actionButtonEmoji}>😊</Text>
                <Text style={styles.actionButtonText}>Emoticono</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.checkOutButton} onPress={handleCheckOut}>
            <IconSymbol name="location.slash.fill" size={24} color={colors.headerText} />
            <Text style={styles.checkOutText}>Hacer Check-out</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.footer}>
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <TouchableOpacity style={styles.checkInButton} onPress={handleCheckIn}>
              <LinearGradient
                colors={[colors.headerGradientStart, colors.headerGradientEnd]}
                style={styles.checkInGradient}
              >
                <IconSymbol name="location.fill" size={24} color={colors.headerText} />
                <Text style={styles.checkInText}>Hacer Check-in</Text>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        </View>
      )}

      <Modal
        visible={showPublicChat}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setShowPublicChat(false)}
      >
        <View style={styles.chatContainer}>
          <LinearGradient
            colors={[colors.headerGradientStart, colors.headerGradientEnd]}
            style={styles.chatHeader}
          >
            <TouchableOpacity onPress={() => setShowPublicChat(false)} style={styles.backButton}>
              <IconSymbol name="chevron.left" size={24} color={colors.headerText} />
            </TouchableOpacity>
            <View style={styles.chatHeaderInfo}>
              <Text style={styles.chatHeaderTitle}>Chat Público</Text>
              <Text style={styles.chatHeaderSubtitle}>{local?.nombre}</Text>
            </View>
            <View style={{ width: 40 }} />
          </LinearGradient>

          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
          >
            <FlatList
              ref={flatListRef}
              data={chatMessages}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.chatMessagesList}
              renderItem={({ item }) => {
                const isOwnMessage = user && item.usuario_id === user.id;
                return (
                  <TouchableOpacity
                    style={[styles.chatMessageContainer, isOwnMessage && styles.chatMessageContainerOwn]}
                    onLongPress={() => handleDeleteChatMessage(item.id)}
                    activeOpacity={0.7}
                  >
                    {!isOwnMessage && (
                      <TouchableOpacity
                        onPress={() => {
                          setShowPublicChat(false);
                          router.push(`/perfil/usuario?userId=${item.usuario_id}`);
                        }}
                      >
                        {item.usuario.avatar ? (
                          <Image source={{ uri: item.usuario.avatar }} style={styles.chatAvatar} />
                        ) : (
                          <View style={[styles.chatAvatar, styles.avatarPlaceholder]}>
                            <Text style={styles.avatarText}>
                              {item.usuario.nombre.charAt(0).toUpperCase()}
                            </Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    )}
                    <View style={[styles.chatBubble, isOwnMessage && styles.chatBubbleOwn]}>
                      {!isOwnMessage && (
                        <Text style={styles.chatSenderName}>{item.usuario.nombre}</Text>
                      )}
                      <Text style={[styles.chatMessageText, isOwnMessage && styles.chatMessageTextOwn]}>
                        {item.contenido}
                      </Text>
                      <Text style={[styles.chatMessageTime, isOwnMessage && styles.chatMessageTimeOwn]}>
                        {formatChatTime(item.created_at)}
                      </Text>
                    </View>
                    {isOwnMessage && <View style={{ width: 40 }} />}
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <View style={styles.chatEmptyState}>
                  <IconSymbol name="bubble.left.and.bubble.right" size={64} color={colors.textSecondary} />
                  <Text style={styles.chatEmptyText}>No hay mensajes aún</Text>
                  <Text style={styles.chatEmptySubtext}>
                    Sé el primero en enviar un mensaje al chat público
                  </Text>
                </View>
              }
              onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            />

            <View style={styles.chatInputContainer}>
              <TextInput
                style={styles.chatInput}
                placeholder={userHasCheckedIn ? "Escribe un mensaje..." : "Haz check-in para chatear..."}
                placeholderTextColor={colors.textSecondary}
                value={newMessage}
                onChangeText={setNewMessage}
                multiline
                maxLength={500}
                editable={userHasCheckedIn && !sendingMessage}
              />
              <TouchableOpacity
                style={[styles.chatSendButton, (!newMessage.trim() || !userHasCheckedIn || sendingMessage) && styles.chatSendButtonDisabled]}
                onPress={handleSendChatMessage}
                disabled={!newMessage.trim() || !userHasCheckedIn || sendingMessage}
              >
                {sendingMessage ? (
                  <ActivityIndicator size="small" color={colors.headerText} />
                ) : (
                  <IconSymbol name="paperplane.fill" size={20} color={colors.headerText} />
                )}
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      <Modal
        visible={showQuickMessages}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowQuickMessages(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Mensajes Rápidos</Text>
              <TouchableOpacity onPress={() => setShowQuickMessages(false)}>
                <IconSymbol name="xmark.circle.fill" size={28} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalScroll}>
              {MENSAJES_RAPIDOS.map((mensaje) => (
                <TouchableOpacity
                  key={mensaje.id}
                  style={styles.quickMessageButton}
                  onPress={() => handleSendQuickMessage(mensaje.texto)}
                >
                  <Text style={styles.quickMessageEmoji}>{mensaje.emoji}</Text>
                  <Text style={styles.quickMessageText}>{mensaje.texto}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showEmoticons}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowEmoticons(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Enviar Emoticono</Text>
              <TouchableOpacity onPress={() => setShowEmoticons(false)}>
                <IconSymbol name="xmark.circle.fill" size={28} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <View style={styles.emoticonsGrid}>
              {EMOTICONS.map((emoticon) => (
                <TouchableOpacity
                  key={emoticon.id}
                  style={styles.emoticonButton}
                  onPress={() => handleSendEmoticon(emoticon.emoji)}
                >
                  <Text style={styles.emoticonEmoji}>{emoticon.emoji}</Text>
                  <Text style={styles.emoticonName}>{emoticon.nombre}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      <LoginRequiredModal
        visible={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        message="Inicia sesión para interactuar en la sala virtual"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.headerText,
    flex: 1,
    textAlign: 'center',
  },
  chatButton: {
    padding: 8,
    position: 'relative',
  },
  chatBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: colors.badgeNuevo,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  chatBadgeText: {
    color: colors.badgeNuevoText,
    fontSize: 11,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.text,
  },
  content: {
    flex: 1,
  },
  imageContainer: {
    position: 'relative',
  },
  localImage: {
    width: '100%',
    height: 200,
    backgroundColor: colors.cardBorder,
  },
  imageGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 100,
  },
  infoCard: {
    margin: 16,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  infoGradient: {
    padding: 20,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  infoText: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.headerText,
    marginBottom: 4,
  },
  infoSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 16,
  },
  interactionsFeed: {
    gap: 12,
  },
  interactionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.cardBackground,
    padding: 12,
    borderRadius: 12,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  interactionAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  interactionContent: {
    flex: 1,
  },
  interactionText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  interactionUser: {
    fontWeight: '600',
  },
  interactionTime: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  usuarioCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  avatarPlaceholder: {
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.headerText,
  },
  usuarioInfo: {
    flex: 1,
    marginLeft: 12,
  },
  nombre: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  username: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  checkInInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  checkInTime: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  messageButton: {
    padding: 8,
    backgroundColor: colors.primary + '15',
    borderRadius: 20,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  footer: {
    padding: 16,
    backgroundColor: colors.cardBackground,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
    gap: 12,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  actionButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  actionButtonText: {
    color: colors.headerText,
    fontSize: 16,
    fontWeight: '600',
  },
  actionButtonEmoji: {
    fontSize: 24,
  },
  checkInButton: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  checkInGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  checkInText: {
    color: colors.headerText,
    fontSize: 18,
    fontWeight: 'bold',
  },
  checkOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EF4444',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  checkOutText: {
    color: colors.headerText,
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 34,
    maxHeight: '70%',
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
  modalScroll: {
    padding: 16,
  },
  quickMessageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  quickMessageEmoji: {
    fontSize: 28,
  },
  quickMessageText: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
  },
  emoticonsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 12,
  },
  emoticonButton: {
    width: (width - 64) / 4,
    aspectRatio: 1,
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  emoticonEmoji: {
    fontSize: 32,
  },
  emoticonName: {
    fontSize: 11,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  floatingEmoji: {
    position: 'absolute',
    fontSize: 48,
    zIndex: 1000,
  },
  chatContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  chatHeader: {
    paddingTop: 50,
    paddingBottom: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  chatHeaderInfo: {
    flex: 1,
    alignItems: 'center',
  },
  chatHeaderTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.headerText,
  },
  chatHeaderSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
  chatMessagesList: {
    padding: 16,
    paddingBottom: 8,
  },
  chatMessageContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 16,
    gap: 8,
  },
  chatMessageContainerOwn: {
    flexDirection: 'row-reverse',
  },
  chatAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  chatBubble: {
    maxWidth: '70%',
    backgroundColor: colors.cardBackground,
    padding: 12,
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  chatBubbleOwn: {
    backgroundColor: colors.primary,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 4,
  },
  chatSenderName: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: 4,
  },
  chatMessageText: {
    fontSize: 15,
    color: colors.text,
    lineHeight: 20,
  },
  chatMessageTextOwn: {
    color: colors.headerText,
  },
  chatMessageTime: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 4,
  },
  chatMessageTimeOwn: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  chatEmptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    gap: 12,
  },
  chatEmptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  chatEmptySubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  chatInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
    backgroundColor: colors.cardBackground,
    gap: 12,
  },
  chatInput: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    color: colors.text,
    maxHeight: 100,
  },
  chatSendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  chatSendButtonDisabled: {
    opacity: 0.5,
  },
});
