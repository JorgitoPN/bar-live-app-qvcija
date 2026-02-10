
/**
 * Chat History Manager
 * Mantiene solo los últimos 30 mensajes para evitar archivos gigantes
 */

import * as FileSystem from 'expo-file-system/legacy';

const CHAT_HISTORY_PATH = `${FileSystem.documentDirectory}chat_history.json`;
const MAX_MESSAGES = 30;

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

/**
 * Lee el historial de chat con límite de mensajes
 */
export async function readChatHistory(): Promise<ChatMessage[]> {
  try {
    const fileExists = await FileSystem.getInfoAsync(CHAT_HISTORY_PATH);
    
    if (!fileExists.exists) {
      console.log('Chat history file does not exist, returning empty array');
      return [];
    }

    const content = await FileSystem.readAsStringAsync(CHAT_HISTORY_PATH);
    const messages: ChatMessage[] = JSON.parse(content);
    
    // Retornar solo los últimos MAX_MESSAGES
    const limitedMessages = messages.slice(-MAX_MESSAGES);
    console.log(`Loaded ${limitedMessages.length} messages from chat history`);
    
    return limitedMessages;
  } catch (error) {
    console.error('Error reading chat history:', error);
    return [];
  }
}

/**
 * Escribe el historial de chat manteniendo solo los últimos MAX_MESSAGES
 */
export async function writeChatHistory(messages: ChatMessage[]): Promise<void> {
  try {
    // Mantener solo los últimos MAX_MESSAGES
    const limitedMessages = messages.slice(-MAX_MESSAGES);
    
    const content = JSON.stringify(limitedMessages, null, 2);
    await FileSystem.writeAsStringAsync(CHAT_HISTORY_PATH, content);
    
    console.log(`Chat history saved with ${limitedMessages.length} messages (max: ${MAX_MESSAGES})`);
  } catch (error) {
    console.error('Error writing chat history:', error);
  }
}

/**
 * Agrega un mensaje al historial manteniendo el límite
 */
export async function addMessageToHistory(message: ChatMessage): Promise<void> {
  try {
    const currentHistory = await readChatHistory();
    const updatedHistory = [...currentHistory, message];
    
    await writeChatHistory(updatedHistory);
  } catch (error) {
    console.error('Error adding message to history:', error);
  }
}

/**
 * Limpia el historial de chat completamente
 */
export async function clearChatHistory(): Promise<void> {
  try {
    const fileExists = await FileSystem.getInfoAsync(CHAT_HISTORY_PATH);
    
    if (fileExists.exists) {
      await FileSystem.writeAsStringAsync(CHAT_HISTORY_PATH, JSON.stringify([], null, 2));
      console.log('Chat history cleared successfully');
    } else {
      console.log('Chat history file does not exist, nothing to clear');
    }
  } catch (error) {
    console.error('Error clearing chat history:', error);
  }
}

/**
 * Obtiene el tamaño del archivo de historial en MB
 */
export async function getChatHistorySize(): Promise<number> {
  try {
    const fileInfo = await FileSystem.getInfoAsync(CHAT_HISTORY_PATH);
    
    if (!fileInfo.exists) {
      console.log('Chat history file does not exist, returning 0');
      return 0;
    }
    
    // Convertir bytes a MB
    const sizeInMB = (fileInfo.size || 0) / (1024 * 1024);
    return parseFloat(sizeInMB.toFixed(2));
  } catch (error) {
    console.warn('Error getting chat history size (file may not exist):', error);
    return 0;
  }
}
