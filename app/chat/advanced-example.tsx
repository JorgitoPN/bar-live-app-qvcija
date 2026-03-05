
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Animated,
  Keyboard,
} from 'react-native';
import { Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useKeyboardHeight } from '@/hooks/useKeyboardHeight';

/**
 * Advanced Chat Example with Smooth Animations
 * 
 * This demonstrates advanced usage of useKeyboardHeight with:
 * - Smooth animated transitions when keyboard appears/disappears
 * - Dynamic input height based on content
 * - Typing indicator
 * - Message timestamps
 * - Read receipts
 */

interface Message {
  id: string;
  text: string;
  isMyMessage: boolean;
  timestamp: Date;
  read: boolean;
}

export default function AdvancedChatExample() {
  const { keyboardHeight, keyboardVisible } = useKeyboardHeight();
  const insets = useSafeAreaInsets();
  
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  
  const flatListRef = useRef<FlatList>(null);
  
  // Animated value for smooth keyboard transitions
  const inputBottomAnim = useRef(new Animated.Value(0)).current;

  /**
   * Animate input container when keyboard appears/disappears
   */
  useEffect(() => {
    Animated.spring(inputBottomAnim, {
      toValue: keyboardHeight,
      useNativeDriver: false,
      tension: 100,
      friction: 10,
    }).start();
  }, [keyboardHeight]);

  /**
   * Send message
   */
  const handleSend = () => {
    if (message.trim().length === 0) return;
    
    const newMessage: Message = {
      id: Date.now().toString(),
      text: message.trim(),
      isMyMessage: true,
      timestamp: new Date(),
      read: false,
    };
    
    setMessages((prev) => [...prev, newMessage]);
    setMessage('');
    
    // Simulate typing indicator
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      
      // Simulate response
      const response: Message = {
        id: (Date.now() + 1).toString(),
        text: 'Thanks for your message!',
        isMyMessage: false,
        timestamp: new Date(),
        read: true,
      };
      setMessages((prev) => [...prev, response]);
    }, 2000);
    
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  /**
   * Render message bubble
   */
  const renderMessage = ({ item }: { item: Message }) => {
    const bubbleStyle = item.isMyMessage ? styles.myMessage : styles.otherMessage;
    const textStyle = item.isMyMessage ? styles.myMessageText : styles.otherMessageText;
    
    return (
      <View style={[styles.messageBubble, bubbleStyle]}>
        <Text style={textStyle}>{item.text}</Text>
        <View style={styles.messageFooter}>
          <Text style={styles.timestamp}>
            {item.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
          {item.isMyMessage && (
            <Text style={styles.readReceipt}>{item.read ? '✓✓' : '✓'}</Text>
          )}
        </View>
      </View>
    );
  };

  /**
   * Render typing indicator
   */
  const renderTypingIndicator = () => {
    if (!isTyping) return null;
    
    return (
      <View style={[styles.messageBubble, styles.otherMessage, styles.typingIndicator]}>
        <Text style={styles.typingText}>typing...</Text>
      </View>
    );
  };

  const flatListPaddingBottom = keyboardVisible
    ? keyboardHeight + 80
    : insets.bottom + 80;

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Advanced Chat',
          headerBackTitle: 'Back',
        }}
      />

      <View style={styles.container}>
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{
            paddingTop: 20,
            paddingHorizontal: 16,
            paddingBottom: flatListPaddingBottom,
          }}
          ListFooterComponent={renderTypingIndicator}
          onContentSizeChange={() => {
            flatListRef.current?.scrollToEnd({ animated: true });
          }}
        />

        {/* Animated input container */}
        <Animated.View
          style={[
            styles.inputContainer,
            {
              bottom: inputBottomAnim,
              paddingBottom: keyboardVisible ? 12 : insets.bottom + 12,
            },
          ]}
        >
          <TextInput
            style={styles.textInput}
            value={message}
            onChangeText={setMessage}
            placeholder="Type a message..."
            placeholderTextColor="#999"
            multiline
            maxLength={500}
            onSubmitEditing={handleSend}
            blurOnSubmit={false}
          />
          
          <TouchableOpacity
            style={[
              styles.sendButton,
              message.trim().length === 0 && styles.sendButtonDisabled,
            ]}
            onPress={handleSend}
            disabled={message.trim().length === 0}
          >
            <Text style={styles.sendButtonText}>→</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
    marginVertical: 4,
  },
  myMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#007AFF',
    borderBottomRightRadius: 4,
  },
  otherMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  myMessageText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  otherMessageText: {
    color: '#000000',
    fontSize: 16,
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    justifyContent: 'flex-end',
  },
  timestamp: {
    fontSize: 11,
    color: '#FFFFFF80',
  },
  readReceipt: {
    fontSize: 11,
    color: '#FFFFFF80',
    marginLeft: 4,
  },
  typingIndicator: {
    paddingVertical: 8,
  },
  typingText: {
    color: '#999',
    fontSize: 14,
    fontStyle: 'italic',
  },
  inputContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 8,
  },
  textInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    backgroundColor: '#F0F0F0',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 8,
    fontSize: 16,
    color: '#000000',
  },
  sendButton: {
    backgroundColor: '#007AFF',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#CCCCCC',
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '600',
  },
});
