
/**
 * Real-time Messaging System
 * WebSocket-based instant messaging for Instagram-like experience
 */

import { supabase } from './supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

interface Message {
  id: string;
  chat_id: string;
  remitente_id: string;
  contenido: string;
  created_at: string;
  leido: boolean;
}

interface MessageCallback {
  (message: Message): void;
}

interface ReadReceiptCallback {
  (chatId: string, messageIds: string[]): void;
}

interface TypingCallback {
  (chatId: string, userId: string, isTyping: boolean): void;
}

class RealtimeMessaging {
  private channels: Map<string, RealtimeChannel> = new Map();
  private messageCallbacks: Map<string, MessageCallback[]> = new Map();
  private readReceiptCallbacks: Map<string, ReadReceiptCallback[]> = new Map();
  private typingCallbacks: Map<string, TypingCallback[]> = new Map();
  private typingTimeouts: Map<string, NodeJS.Timeout> = new Map();

  /**
   * Subscribe to chat messages
   */
  subscribeToChat(
    chatId: string,
    userId: string,
    onMessage: MessageCallback
  ): () => void {
    console.log('[RealtimeMessaging] 📡 Subscribing to chat:', chatId);

    // Add callback
    if (!this.messageCallbacks.has(chatId)) {
      this.messageCallbacks.set(chatId, []);
    }
    this.messageCallbacks.get(chatId)!.push(onMessage);

    // Create channel if it doesn't exist
    if (!this.channels.has(chatId)) {
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
            console.log('[RealtimeMessaging] 📨 New message received:', payload.new);
            const message = payload.new as Message;
            
            // Notify all callbacks
            const callbacks = this.messageCallbacks.get(chatId) || [];
            callbacks.forEach(cb => cb(message));

            // Auto-mark as read if user is viewing the chat
            if (message.remitente_id !== userId) {
              this.markAsRead(chatId, [message.id], userId);
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'mensajes',
            filter: `chat_id=eq.${chatId}`,
          },
          (payload) => {
            console.log('[RealtimeMessaging] 📝 Message updated:', payload.new);
            
            // Handle read receipts
            const message = payload.new as Message;
            if (message.leido) {
              const callbacks = this.readReceiptCallbacks.get(chatId) || [];
              callbacks.forEach(cb => cb(chatId, [message.id]));
            }
          }
        )
        .subscribe();

      this.channels.set(chatId, channel);
    }

    // Return unsubscribe function
    return () => {
      const callbacks = this.messageCallbacks.get(chatId) || [];
      const index = callbacks.indexOf(onMessage);
      if (index > -1) {
        callbacks.splice(index, 1);
      }

      // Remove channel if no more callbacks
      if (callbacks.length === 0) {
        const channel = this.channels.get(chatId);
        if (channel) {
          supabase.removeChannel(channel);
          this.channels.delete(chatId);
        }
        this.messageCallbacks.delete(chatId);
      }
    };
  }

  /**
   * Send message with instant delivery
   */
  async sendMessage(
    chatId: string,
    userId: string,
    contenido: string,
    historiaId?: string,
    historiaImagen?: string
  ): Promise<Message | null> {
    try {
      console.log('[RealtimeMessaging] 📤 Sending message to chat:', chatId);

      const messageData: any = {
        chat_id: chatId,
        remitente_id: userId,
        contenido,
        tipo_mensaje: 'texto',
        leido: false,
      };

      if (historiaId) {
        messageData.historia_id = historiaId;
        messageData.historia_imagen = historiaImagen;
      }

      const { data, error } = await supabase
        .from('mensajes')
        .insert(messageData)
        .select()
        .single();

      if (error) throw error;

      // Update chat's last message
      await supabase
        .from('chats')
        .update({
          ultimo_mensaje: contenido,
          ultimo_mensaje_fecha: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', chatId);

      console.log('[RealtimeMessaging] ✅ Message sent successfully');
      return data as Message;
    } catch (error) {
      console.error('[RealtimeMessaging] Error sending message:', error);
      return null;
    }
  }

  /**
   * Mark messages as read
   */
  async markAsRead(chatId: string, messageIds: string[], userId: string): Promise<void> {
    try {
      await supabase
        .from('mensajes')
        .update({ leido: true })
        .eq('chat_id', chatId)
        .in('id', messageIds)
        .neq('remitente_id', userId);

      console.log('[RealtimeMessaging] ✅ Messages marked as read');
    } catch (error) {
      console.error('[RealtimeMessaging] Error marking messages as read:', error);
    }
  }

  /**
   * Subscribe to read receipts
   */
  subscribeToReadReceipts(chatId: string, callback: ReadReceiptCallback): () => void {
    if (!this.readReceiptCallbacks.has(chatId)) {
      this.readReceiptCallbacks.set(chatId, []);
    }
    this.readReceiptCallbacks.get(chatId)!.push(callback);

    return () => {
      const callbacks = this.readReceiptCallbacks.get(chatId) || [];
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    };
  }

  /**
   * Send typing indicator
   */
  async sendTypingIndicator(chatId: string, userId: string, isTyping: boolean): Promise<void> {
    try {
      // Clear existing timeout
      const timeoutKey = `${chatId}:${userId}`;
      const existingTimeout = this.typingTimeouts.get(timeoutKey);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
      }

      // Broadcast typing status via presence
      const channel = this.channels.get(chatId);
      if (channel) {
        await channel.track({
          user_id: userId,
          typing: isTyping,
          timestamp: Date.now(),
        });
      }

      // Auto-stop typing after 3 seconds
      if (isTyping) {
        const timeout = setTimeout(() => {
          this.sendTypingIndicator(chatId, userId, false);
        }, 3000);
        this.typingTimeouts.set(timeoutKey, timeout);
      }
    } catch (error) {
      console.error('[RealtimeMessaging] Error sending typing indicator:', error);
    }
  }

  /**
   * Subscribe to typing indicators
   */
  subscribeToTyping(chatId: string, callback: TypingCallback): () => void {
    if (!this.typingCallbacks.has(chatId)) {
      this.typingCallbacks.set(chatId, []);
    }
    this.typingCallbacks.get(chatId)!.push(callback);

    // Listen to presence changes
    const channel = this.channels.get(chatId);
    if (channel) {
      channel.on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        Object.values(state).forEach((presences: any) => {
          presences.forEach((presence: any) => {
            const callbacks = this.typingCallbacks.get(chatId) || [];
            callbacks.forEach(cb =>
              cb(chatId, presence.user_id, presence.typing || false)
            );
          });
        });
      });
    }

    return () => {
      const callbacks = this.typingCallbacks.get(chatId) || [];
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    };
  }

  /**
   * Unsubscribe from all chats
   */
  unsubscribeAll(): void {
    this.channels.forEach((channel) => {
      supabase.removeChannel(channel);
    });
    this.channels.clear();
    this.messageCallbacks.clear();
    this.readReceiptCallbacks.clear();
    this.typingCallbacks.clear();
    this.typingTimeouts.forEach(timeout => clearTimeout(timeout));
    this.typingTimeouts.clear();
    console.log('[RealtimeMessaging] 🔌 Unsubscribed from all chats');
  }

  /**
   * Get unread message count
   */
  async getUnreadCount(userId: string): Promise<number> {
    try {
      // Get all user's chats
      const { data: chats } = await supabase
        .from('chats')
        .select('id')
        .or(`usuario1_id.eq.${userId},usuario2_id.eq.${userId}`);

      if (!chats) return 0;

      // Count unread messages across all chats
      let totalUnread = 0;
      for (const chat of chats) {
        const { count } = await supabase
          .from('mensajes')
          .select('*', { count: 'exact', head: true })
          .eq('chat_id', chat.id)
          .eq('leido', false)
          .neq('remitente_id', userId);

        totalUnread += count || 0;
      }

      return totalUnread;
    } catch (error) {
      console.error('[RealtimeMessaging] Error getting unread count:', error);
      return 0;
    }
  }
}

// Export singleton instance
export const realtimeMessaging = new RealtimeMessaging();
