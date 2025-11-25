
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';

interface InteractionMessage {
  id: string;
  usuario_id: string;
  local_id: string;
  mensaje: string;
  tipo: 'pregunta' | 'comentario' | 'sugerencia';
  created_at: string;
  usuario?: {
    nombre: string;
    username: string;
    avatar_url?: string;
  };
  respuestas?: InteractionResponse[];
}

interface InteractionResponse {
  id: string;
  mensaje_id: string;
  usuario_id: string;
  respuesta: string;
  created_at: string;
  usuario?: {
    nombre: string;
    username: string;
    avatar_url?: string;
  };
}

export default function SalaVirtualScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuth();

  const [local, setLocal] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<InteractionMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [messageType, setMessageType] = useState<'pregunta' | 'comentario' | 'sugerencia'>('pregunta');
  const [sending, setSending] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  const loadLocalData = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('locales')
        .select('*')
        .eq('id', params.id)
        .single();

      if (error) {
        console.error('[SalaVirtual] Error loading local:', error);
        Alert.alert('Error', 'No se pudo cargar la información del local');
        return;
      }

      setLocal(data);
    } catch (error) {
      console.error('[SalaVirtual] Error:', error);
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  const loadMessages = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('sala_virtual_interacciones')
        .select(`
          *,
          usuario:usuarios(nombre, username, avatar_url),
          respuestas:sala_virtual_respuestas(
            *,
            usuario:usuarios(nombre, username, avatar_url)
          )
        `)
        .eq('local_id', params.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[SalaVirtual] Error loading messages:', error);
        return;
      }

      setMessages(data || []);
    } catch (error) {
      console.error('[SalaVirtual] Error:', error);
    }
  }, [params.id]);

  // ✅ FIXED: Added missing dependencies 'loadLocalData' and 'loadMessages'
  useEffect(() => {
    loadLocalData();
    loadMessages();
  }, [loadLocalData, loadMessages]);

  const handleSendMessage = async () => {
    if (!user) {
      Alert.alert('Error', 'Debes iniciar sesión para enviar mensajes');
      return;
    }

    if (!newMessage.trim()) {
      Alert.alert('Error', 'Escribe un mensaje');
      return;
    }

    setSending(true);

    try {
      const { error } = await supabase
        .from('sala_virtual_interacciones')
        .insert({
          usuario_id: user.id,
          local_id: params.id,
          mensaje: newMessage.trim(),
          tipo: messageType,
        });

      if (error) {
        console.error('[SalaVirtual] Error sending message:', error);
        Alert.alert('Error', 'No se pudo enviar el mensaje');
        return;
      }

      setNewMessage('');
      await loadMessages();
      Alert.alert('Éxito', 'Mensaje enviado correctamente');
    } catch (error) {
      console.error('[SalaVirtual] Error:', error);
      Alert.alert('Error', 'Ocurrió un error al enviar el mensaje');
    } finally {
      setSending(false);
    }
  };

  const handleSendReply = async (messageId: string) => {
    if (!user) {
      Alert.alert('Error', 'Debes iniciar sesión para responder');
      return;
    }

    if (!replyText.trim()) {
      Alert.alert('Error', 'Escribe una respuesta');
      return;
    }

    try {
      const { error } = await supabase
        .from('sala_virtual_respuestas')
        .insert({
          mensaje_id: messageId,
          usuario_id: user.id,
          respuesta: replyText.trim(),
        });

      if (error) {
        console.error('[SalaVirtual] Error sending reply:', error);
        Alert.alert('Error', 'No se pudo enviar la respuesta');
        return;
      }

      setReplyText('');
      setReplyingTo(null);
      await loadMessages();
    } catch (error) {
      console.error('[SalaVirtual] Error:', error);
      Alert.alert('Error', 'Ocurrió un error al enviar la respuesta');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!local) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>No se encontró el local</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={100}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <IconSymbol ios_icon_name="chevron.left" android_material_icon_name="arrow_back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Sala Virtual - {local.nombre}</Text>
      </View>

      <ScrollView style={styles.messagesContainer}>
        {messages.length === 0 ? (
          <View style={styles.emptyState}>
            <IconSymbol ios_icon_name="bubble.left.and.bubble.right" android_material_icon_name="forum" size={64} color={colors.textSecondary} />
            <Text style={styles.emptyStateText}>No hay mensajes aún</Text>
            <Text style={styles.emptyStateSubtext}>Sé el primero en iniciar la conversación</Text>
          </View>
        ) : (
          messages.map((message) => (
            <View key={message.id} style={styles.messageCard}>
              <View style={styles.messageHeader}>
                <Image
                  source={{ uri: message.usuario?.avatar_url || 'https://via.placeholder.com/40' }}
                  style={styles.messageAvatar}
                />
                <View style={styles.messageHeaderText}>
                  <Text style={styles.messageUsername}>{message.usuario?.username || 'Usuario'}</Text>
                  <Text style={styles.messageTime}>
                    {new Date(message.created_at).toLocaleDateString()}
                  </Text>
                </View>
                <View style={[styles.messageTypeBadge, { backgroundColor: getTypeColor(message.tipo) }]}>
                  <Text style={styles.messageTypeText}>{message.tipo}</Text>
                </View>
              </View>

              <Text style={styles.messageContent}>{message.mensaje}</Text>

              {message.respuestas && message.respuestas.length > 0 && (
                <View style={styles.repliesContainer}>
                  {message.respuestas.map((reply) => (
                    <View key={reply.id} style={styles.replyCard}>
                      <View style={styles.replyHeader}>
                        <Image
                          source={{ uri: reply.usuario?.avatar_url || 'https://via.placeholder.com/32' }}
                          style={styles.replyAvatar}
                        />
                        <Text style={styles.replyUsername}>{reply.usuario?.username || 'Usuario'}</Text>
                      </View>
                      <Text style={styles.replyContent}>{reply.respuesta}</Text>
                    </View>
                  ))}
                </View>
              )}

              {replyingTo === message.id ? (
                <View style={styles.replyInputContainer}>
                  <TextInput
                    style={styles.replyInput}
                    placeholder="Escribe tu respuesta..."
                    placeholderTextColor={colors.textSecondary}
                    value={replyText}
                    onChangeText={setReplyText}
                    multiline
                  />
                  <View style={styles.replyActions}>
                    <TouchableOpacity onPress={() => setReplyingTo(null)} style={styles.cancelButton}>
                      <Text style={styles.cancelButtonText}>Cancelar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleSendReply(message.id)} style={styles.sendReplyButton}>
                      <Text style={styles.sendReplyButtonText}>Enviar</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <TouchableOpacity onPress={() => setReplyingTo(message.id)} style={styles.replyButton}>
                  <IconSymbol ios_icon_name="arrowshape.turn.up.left" android_material_icon_name="reply" size={16} color={colors.primary} />
                  <Text style={styles.replyButtonText}>Responder</Text>
                </TouchableOpacity>
              )}
            </View>
          ))
        )}
      </ScrollView>

      <View style={styles.inputContainer}>
        <View style={styles.typeSelector}>
          {(['pregunta', 'comentario', 'sugerencia'] as const).map((type) => (
            <TouchableOpacity
              key={type}
              onPress={() => setMessageType(type)}
              style={[
                styles.typeButton,
                messageType === type && styles.typeButtonActive,
              ]}
            >
              <Text style={[
                styles.typeButtonText,
                messageType === type && styles.typeButtonTextActive,
              ]}>
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="Escribe tu mensaje..."
            placeholderTextColor={colors.textSecondary}
            value={newMessage}
            onChangeText={setNewMessage}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            onPress={handleSendMessage}
            style={[styles.sendButton, sending && styles.sendButtonDisabled]}
            disabled={sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color={colors.background} />
            ) : (
              <IconSymbol ios_icon_name="paperplane.fill" android_material_icon_name="send" size={20} color={colors.background} />
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

function getTypeColor(type: 'pregunta' | 'comentario' | 'sugerencia'): string {
  switch (type) {
    case 'pregunta':
      return colors.primary;
    case 'comentario':
      return colors.success;
    case 'sugerencia':
      return colors.warning;
    default:
      return colors.textSecondary;
  }
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: colors.text,
    marginBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  backButtonText: {
    color: colors.primary,
    fontSize: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
  },
  messagesContainer: {
    flex: 1,
    padding: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 8,
  },
  messageCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  messageAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  messageHeaderText: {
    flex: 1,
  },
  messageUsername: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  messageTime: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  messageTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  messageTypeText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.background,
    textTransform: 'uppercase',
  },
  messageContent: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
    marginBottom: 12,
  },
  repliesContainer: {
    marginTop: 12,
    paddingLeft: 16,
    borderLeftWidth: 2,
    borderLeftColor: colors.border,
  },
  replyCard: {
    marginBottom: 12,
  },
  replyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  replyAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
  },
  replyUsername: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },
  replyContent: {
    fontSize: 13,
    color: colors.text,
    lineHeight: 18,
  },
  replyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  replyButtonText: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '500',
  },
  replyInputContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: colors.background,
    borderRadius: 8,
  },
  replyInput: {
    fontSize: 14,
    color: colors.text,
    minHeight: 60,
    marginBottom: 8,
  },
  replyActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  cancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: colors.border,
  },
  cancelButtonText: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
  },
  sendReplyButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: colors.primary,
  },
  sendReplyButtonText: {
    fontSize: 14,
    color: colors.background,
    fontWeight: '600',
  },
  inputContainer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.card,
  },
  typeSelector: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 8,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: colors.background,
    alignItems: 'center',
  },
  typeButtonActive: {
    backgroundColor: colors.primary,
  },
  typeButtonText: {
    fontSize: 12,
    color: colors.text,
    fontWeight: '500',
  },
  typeButtonTextActive: {
    color: colors.background,
    fontWeight: '600',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.text,
    maxHeight: 100,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});
