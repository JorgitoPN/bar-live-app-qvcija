
import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  Platform,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { useKeyboardHeight } from '@/hooks/useKeyboardHeight';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * ✅ EJEMPLO DE PANTALLA DE CHAT CON LAYOUT CORRECTO
 * 
 * Este es un ejemplo simple que muestra el patrón correcto para implementar
 * una pantalla de chat con el campo de texto que funciona perfectamente en
 * Android e iOS, incluyendo la barra predictiva de Gboard.
 * 
 * PUNTOS CLAVE:
 * 1. useKeyboardHeight() - Detecta altura real del teclado (incluye barra predictiva)
 * 2. position: 'absolute' en inputContainer - Flota sobre el contenido
 * 3. bottom: keyboardHeight - Se mueve con el teclado
 * 4. paddingBottom dinámico en FlatList - Evita que mensajes queden ocultos
 * 5. blurOnSubmit={false} - Teclado permanece abierto al enviar
 */

interface Message {
  id: string;
  text: string;
  isOwn: boolean;
  timestamp: string;
}

export default function ExampleChatScreen() {
  const router = useRouter();
  const flatListRef = useRef<FlatList>(null);
  const insets = useSafeAreaInsets();
  
  // ✅ Hook para detectar altura del teclado (incluye barra predictiva en Android)
  const { keyboardHeight, keyboardVisible } = useKeyboardHeight();
  
  // ✅ Estado para medir la altura del input container
  const [inputContainerHeight, setInputContainerHeight] = useState(0);
  
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', text: 'Hola! ¿Cómo estás?', isOwn: false, timestamp: '10:30' },
    { id: '2', text: 'Muy bien, gracias! ¿Y tú?', isOwn: true, timestamp: '10:31' },
    { id: '3', text: 'Genial! Probando el nuevo sistema de teclado', isOwn: false, timestamp: '10:32' },
  ]);

  const handleSend = () => {
    if (!message.trim()) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      text: message.trim(),
      isOwn: true,
      timestamp: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages(prev => [...prev, newMessage]);
    setMessage('');

    // Scroll al final después de enviar
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
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
          title: 'Chat de Ejemplo',
          headerStyle: { backgroundColor: colors.primary },
          headerTintColor: colors.headerText,
        }}
      />

      {/* ✅ LISTA DE MENSAJES CON PADDING DINÁMICO */}
      {/* 
        CRÍTICO: El paddingBottom debe ajustarse dinámicamente:
        - Cuando teclado ABIERTO: paddingBottom = keyboardHeight
        - Cuando teclado CERRADO: paddingBottom = inputContainerHeight + insets.bottom
        
        Esto asegura que:
        1. Los mensajes no queden ocultos detrás del input
        2. El último mensaje sea visible cuando el teclado está abierto
        3. Se respeten los safe areas del dispositivo
      */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        contentContainerStyle={[
          styles.messagesList,
          {
            paddingBottom: keyboardVisible
              ? keyboardHeight  // ✅ Espacio para el teclado (incluye barra predictiva)
              : (inputContainerHeight || 80) + insets.bottom  // ✅ Espacio para input + safe area
          }
        ]}
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={() => {
          // Auto-scroll al final cuando se agregan mensajes
          flatListRef.current?.scrollToEnd({ animated: true });
        }}
      />

      {/* ✅ INPUT CONTAINER CON POSICIÓN ABSOLUTA */}
      {/* 
        CRÍTICO: Debe tener position: 'absolute' para flotar sobre el contenido
        
        El bottom se ajusta dinámicamente:
        - Cuando teclado ABIERTO: bottom = keyboardHeight (input sube con el teclado)
        - Cuando teclado CERRADO: bottom = 0 (input en la parte inferior de la pantalla)
        
        El paddingBottom se ajusta dinámicamente:
        - Cuando teclado ABIERTO: paddingBottom = 0 (no necesita espacio extra)
        - Cuando teclado CERRADO: paddingBottom = insets.bottom (respeta safe area)
      */}
      <View
        style={[
          styles.inputContainer,
          {
            bottom: keyboardHeight,  // ✅ Se mueve con el teclado
            paddingBottom: keyboardVisible ? 0 : insets.bottom  // ✅ Safe area solo cuando cerrado
          }
        ]}
        onLayout={(event) => {
          // ✅ Medir la altura del input container para calcular el padding del FlatList
          const height = event.nativeEvent.layout.height;
          setInputContainerHeight(height);
        }}
      >
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="Escribe un mensaje..."
            placeholderTextColor={colors.textSecondary}
            value={message}
            onChangeText={setMessage}
            multiline
            maxLength={1000}
            onSubmitEditing={handleSend}
            blurOnSubmit={false}  // ✅ CRÍTICO: Teclado permanece abierto al enviar
            returnKeyType="send"
          />
          <TouchableOpacity
            style={[styles.sendButton, !message.trim() && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={!message.trim()}
          >
            <IconSymbol
              ios_icon_name="paperplane.fill"
              android_material_icon_name="send"
              size={20}
              color={colors.headerText}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* ✅ INDICADOR DE ESTADO DEL TECLADO (solo para debugging) */}
      {__DEV__ && (
        <View style={styles.debugInfo}>
          <Text style={styles.debugText}>
            Teclado: {keyboardVisible ? 'ABIERTO' : 'CERRADO'} | 
            Altura: {keyboardHeight}px | 
            Input: {inputContainerHeight}px
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,  // ✅ CRÍTICO: flex: 1 para que el layout funcione correctamente
    backgroundColor: colors.background,
  },
  messagesList: {
    padding: 16,
    // paddingBottom se establece dinámicamente en el componente
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
  inputContainer: {
    position: 'absolute',  // ✅ CRÍTICO: Posición absoluta para flotar sobre el contenido
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
    // bottom: keyboardHeight (se establece dinámicamente en el componente)
    // paddingBottom: insets.bottom (se establece dinámicamente en el componente)
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 12,
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
  debugInfo: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 100 : 80,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    padding: 8,
    alignItems: 'center',
  },
  debugText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
});
