
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useKeyboardHeight } from '@/hooks/useKeyboardHeight';

/**
 * Example Chat Screen demonstrating useKeyboardHeight hook
 * 
 * This shows the CORRECT way to implement a chat interface that works
 * perfectly on both iOS and Android, including handling the Android
 * predictive text bar.
 * 
 * KEY FEATURES:
 * - Input field always positioned exactly above keyboard
 * - FlatList automatically scrolls to show latest message
 * - Proper safe area handling for notched devices
 * - Works with Android predictive text bar (Gboard, etc.)
 */

interface Message {
  id: string;
  text: string;
  isMyMessage: boolean;
  timestamp: Date;
}

export default function ExampleChatScreen() {
  // Get keyboard height and visibility from our custom hook
  const { keyboardHeight, keyboardVisible } = useKeyboardHeight();
  
  // Get safe area insets for proper spacing on notched devices
  const insets = useSafeAreaInsets();
  
  // Message input state
  const [message, setMessage] = useState('');
  
  // Messages list state
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: 'Hey! How are you?',
      isMyMessage: false,
      timestamp: new Date(),
    },
    {
      id: '2',
      text: 'I\'m good! How about you?',
      isMyMessage: true,
      timestamp: new Date(),
    },
    {
      id: '3',
      text: 'Great! Want to grab coffee later?',
      isMyMessage: false,
      timestamp: new Date(),
    },
  ]);
  
  // Reference to FlatList for auto-scrolling
  const flatListRef = useRef<FlatList>(null);

  /**
   * Send a new message
   */
  const handleSend = () => {
    if (message.trim().length === 0) return;
    
    console.log('📤 Sending message:', message);
    
    const newMessage: Message = {
      id: Date.now().toString(),
      text: message.trim(),
      isMyMessage: true,
      timestamp: new Date(),
    };
    
    setMessages((prev) => [...prev, newMessage]);
    setMessage('');
    
    // Scroll to bottom after sending
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  /**
   * Auto-scroll to bottom when keyboard appears
   */
  useEffect(() => {
    if (keyboardVisible) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [keyboardVisible]);

  /**
   * Render a single message bubble
   */
  const renderMessage = ({ item }: { item: Message }) => {
    const bubbleStyle = item.isMyMessage ? styles.myMessage : styles.otherMessage;
    const textStyle = item.isMyMessage ? styles.myMessageText : styles.otherMessageText;
    
    return (
      <View style={[styles.messageBubble, bubbleStyle]}>
        <Text style={textStyle}>{item.text}</Text>
        <Text style={styles.timestamp}>
          {item.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
    );
  };

  /**
   * Calculate the bottom padding for the FlatList
   * 
   * When keyboard is visible: Use keyboard height + small buffer
   * When keyboard is hidden: Use safe area bottom + input container height
   */
  const flatListPaddingBottom = keyboardVisible
    ? keyboardHeight + 80 // Keyboard height + input container height + buffer
    : insets.bottom + 80; // Safe area + input container height

  return (
    <>
      {/* Header configuration */}
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Chat Example',
          headerBackTitle: 'Back',
        }}
      />

      <View style={styles.container}>
        {/* Messages list */}
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
          onContentSizeChange={() => {
            // Auto-scroll to bottom when new messages arrive
            flatListRef.current?.scrollToEnd({ animated: true });
          }}
          onLayout={() => {
            // Auto-scroll to bottom on initial layout
            flatListRef.current?.scrollToEnd({ animated: false });
          }}
        />

        {/* Input container - positioned above keyboard */}
        <View
          style={[
            styles.inputContainer,
            {
              // Position the input container exactly above the keyboard
              bottom: keyboardHeight,
              
              // Add safe area padding only when keyboard is hidden
              // When keyboard is visible, we don't need safe area padding
              paddingBottom: keyboardVisible ? 0 : insets.bottom,
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
            <Text style={styles.sendButtonText}>Send</Text>
          </TouchableOpacity>
        </View>
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
  timestamp: {
    fontSize: 11,
    color: '#FFFFFF80',
    marginTop: 4,
    alignSelf: 'flex-end',
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
    paddingHorizontal: 20,
    paddingVertical: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 0,
  },
  sendButtonDisabled: {
    backgroundColor: '#CCCCCC',
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
