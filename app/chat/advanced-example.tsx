
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  Platform,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { useKeyboardHeight } from '@/hooks/useKeyboardHeight';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * ✅ EJEMPLO AVANZADO DE CHAT CON CARACTERÍSTICAS PROFESIONALES
 * 
 * Este ejemplo muestra características avanzadas:
 * - Indicador de "escribiendo..."
 * - Auto-scroll al abrir teclado
 * - Botón para scroll al final
 * - Manejo de mensajes largos
 * - Logs detallados para debugging
 */

interface Message {
  id: string;
  text: string;
  isOwn: boolean;
  timestamp: string;
}

export default function AdvancedChatScreen() {
  const router = useRouter();
  const flatListRef = useRef<FlatList>(null);
  const textInputRef = useRef<TextInput>(null);
  const insets = useSafeAreaInsets();
  
  const { keyboardHeight, keyboardVisible } = useKeyboardHeight();
  const [inputContainerHeight, setInputContainerHeight] = useState(0);
  
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', text: 'Hola! Este es un ejemplo avanzado de chat', isOwn: false, timestamp: '10:30' },
    { id: '2', text: 'Genial! Veo que tiene muchas características', isOwn: true, timestamp: '10:31' },
    { id: '3', text: 'Sí, incluye auto-scroll, indicador de escritura, y más', isOwn: false, timestamp: '10:32' },
    { id: '4', text: 'Perfecto para apps de mensajería profesionales', isOwn: true, timestamp: '10:33' },
  ]);
  
  const [isTyping, setIsTyping] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [sending, setSending] = useState(false);

  // ✅ Auto-scroll cuando el teclado se abre
  useEffect(() => {
    if (keyboardVisible) {
      console.log('[AdvancedChat] 🎹 Teclado abierto - auto-scroll al final');
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [keyboardVisible]);

  // ✅ Simular indicador de "escribiendo..."
  useEffect(() => {
    if (message.length > 0) {
      setIsTyping(true);
      const timer = setTimeout(() => setIsTyping(false), 1000);
      return () => clearTimeout(timer);
    } else {
      setIsTyping(false);
    }
  }, [message]);

  const handleSend = async () => {
    if (!message.trim() || sending) return;

    const messageText = message.trim();
    setSending(true);
    setMessage('');

    console.log('[AdvancedChat] 📤 Enviando mensaje:', messageText);

    // Simular envío de mensaje
    const newMessage: Message = {
      id: Date.now().toString(),
      text: messageText,
      isOwn: true,
      timestamp: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages(prev => [...prev, newMessage]);

    // Scroll al final
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);

    // Simular respuesta automática después de 2 segundos
    setTimeout(() => {
      const autoReply: Message = {
        id: (Date.now() + 1).toString(),
        text: 'Mensaje recibido! El sistema de teclado funciona perfectamente 👍',
        isOwn: false,
        timestamp: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages(prev => [...prev, autoReply]);
      
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }, 2000);

    setSending(false);
    console.log('[AdvancedChat] ✅ Mensaje enviado correctamente');
  };

  const handleScroll = (event: any) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const isAtBottom = contentOffset.y + layoutMeasurement.height >= contentSize.height - 50;
    setShowScrollButton(!isAtBottom);
  };

  const scrollToBottom = () => {
    flatListRef.current?.scrollToEnd({ animated: true });
    setShowScrollButton(false);
  };

  const renderMessage = ({ item }: { item: Message }) => (
    <View style={[styles.messageBubble, item.isOwn ? styles.ownMessage : styles.otherMessage]}>
      <Text style={[styles.messageText, item.isOwn && styles.ownMessageText]}>
        {item.text}
      </Text>
      <Text style={[styles.messageTime, item.isOwn && styles.ownMessageTime]}>
        {item.timestamp}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Chat Avanzado',
          headerStyle: { backgroundColor: colors.primary },
          headerTintColor: colors.headerText,
        }}
      />

      {/* ✅ LISTA DE MENSAJES */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        contentContainerStyle={[
          styles.messagesList,
          {
            paddingBottom: keyboardVisible
              ? keyboardHeight
              : (inputContainerHeight || 80) + insets.bottom
          }
        ]}
        keyboardShouldPersistTaps="handled"
        onScroll={handleScroll}
        scrollEventThrottle={16}
        ListFooterComponent={
          isTyping ? (
            <View style={styles.typingIndicator}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.typingText}>Escribiendo...</Text>
            </View>
          ) : null
        }
      />

      {/* ✅ BOTÓN DE SCROLL AL FINAL */}
      {showScrollButton && (
        <TouchableOpacity
          style={[
            styles.scrollButton,
            { bottom: keyboardVisible ? keyboardHeight + 80 : inputContainerHeight + insets.bottom + 20 }
          ]}
          onPress={scrollToBottom}
        >
          <IconSymbol
            ios_icon_name="arrow.down"
            android_material_icon_name="arrow_downward"
            size={20}
            color={colors.headerText}
          />
        </TouchableOpacity>
      )}

      {/* ✅ INPUT CONTAINER */}
      <View
        style={[
          styles.inputContainer,
          {
            bottom: keyboardHeight,
            paddingBottom: keyboardVisible ? 0 : insets.bottom
          }
        ]}
        onLayout={(event) => {
          const height = event.nativeEvent.layout.height;
          console.log('[AdvancedChat] 📏 Input container height:', height);
          setInputContainerHeight(height);
        }}
      >
        <View style={styles.inputRow}>
          <TouchableOpacity style={styles.attachButton}>
            <IconSymbol
              ios_icon_name="plus.circle.fill"
              android_material_icon_name="add_circle"
              size={28}
              color={colors.primary}
            />
          </TouchableOpacity>
          
          <TextInput
            ref={textInputRef}
            style={styles.input}
            placeholder="Escribe un mensaje..."
            placeholderTextColor={colors.textSecondary}
            value={message}
            onChangeText={(text) => {
              console.log('[AdvancedChat] 📝 Texto cambiado, longitud:', text.length);
              setMessage(text);
            }}
            multiline
            maxLength={1000}
            onSubmitEditing={handleSend}
            blurOnSubmit={false}
            returnKeyType="send"
            onFocus={() => {
              console.log('[AdvancedChat] 🎯 Input enfocado');
            }}
            onBlur={() => {
              console.log('[AdvancedChat] 👋 Input desenfocado');
            }}
          />
          
          <TouchableOpacity
            style={[styles.sendButton, (!message.trim() || sending) && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={!message.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color={colors.headerText} />
            ) : (
              <IconSymbol
                ios_icon_name="paperplane.fill"
                android_material_icon_name="send"
                size={20}
                color={colors.headerText}
              />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* ✅ PANEL DE INFORMACIÓN DE DEBUGGING */}
      {__DEV__ && (
        <View style={styles.debugPanel}>
          <Text style={styles.debugTitle}>🔧 Debug Info</Text>
          <Text style={styles.debugText}>
            Teclado: {keyboardVisible ? '✅ ABIERTO' : '❌ CERRADO'}
          </Text>
          <Text style={styles.debugText}>
            Altura teclado: {keyboardHeight}px
          </Text>
          <Text style={styles.debugText}>
            Altura input: {inputContainerHeight}px
          </Text>
          <Text style={styles.debugText}>
            Safe area bottom: {insets.bottom}px
          </Text>
          <Text style={styles.debugText}>
            Padding FlatList: {keyboardVisible ? keyboardHeight : (inputContainerHeight || 80) + insets.bottom}px
          </Text>
          <Text style={styles.debugText}>
            Plataforma: {Platform.OS}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  messagesList: {
    padding: 16,
  },
  messageBubble: {
    maxWidth: '75%',
    padding: 12,
    borderRadius: 16,
    marginBottom: 8,
  },
  otherMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#E5E7EB',
  },
  ownMessage: {
    alignSelf: 'flex-end',
    backgroundColor: colors.primary,
  },
  messageText: {
    fontSize: 15,
    color: colors.text,
    marginBottom: 4,
  },
  ownMessageText: {
    color: colors.headerText,
  },
  messageTime: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  ownMessageTime: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  typingText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  scrollButton: {
    position: 'absolute',
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  inputContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  attachButton: {
    marginBottom: 6,
  },
  input: {
    flex: 1,
    fontSize: 16,
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
  debugPanel: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 100 : 80,
    left: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    padding: 12,
    borderRadius: 8,
  },
  debugTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  debugText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginBottom: 2,
  },
});
