
/**
 * ✅ OPTIMISTIC UI SYSTEM v1.0 - INSTAGRAM-LEVEL PERFORMANCE
 * 
 * Sistema de actualización optimista para interacciones instantáneas:
 * - Likes, follows, comments, profile updates
 * - Actualización inmediata de UI (< 50ms)
 * - Sincronización en segundo plano
 * - Rollback automático en caso de error
 * - Queue de operaciones pendientes
 * 
 * OBJETIVO: Respuesta al clic < 100ms, sin spinners de bloqueo
 */

import { supabase } from './supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface OptimisticOperation {
  id: string;
  type: 'like' | 'follow' | 'comment' | 'save' | 'checkin' | 'profile_update';
  action: 'add' | 'remove' | 'update';
  data: any;
  timestamp: number;
  retries: number;
}

const PENDING_OPERATIONS_KEY = 'optimistic_pending_operations';
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000;

class OptimisticUIManager {
  private pendingOperations: Map<string, OptimisticOperation> = new Map();
  private processingQueue: boolean = false;

  constructor() {
    this.loadPendingOperations();
  }

  /**
   * ✅ INSTANT LIKE - Actualización inmediata de UI
   */
  async toggleLike(
    postId: string,
    userId: string,
    currentLiked: boolean,
    onOptimisticUpdate: (liked: boolean, count: number) => void,
    onRollback: (liked: boolean, count: number) => void
  ): Promise<void> {
    const newLiked = !currentLiked;
    const operationId = `like-${postId}-${userId}`;

    console.log('[OptimisticUI] 💖 INSTANT like toggle:', { postId, newLiked });

    // ✅ PASO 1: Actualización INSTANTÁNEA de UI (< 16ms)
    onOptimisticUpdate(newLiked, newLiked ? 1 : -1);

    // ✅ PASO 2: Guardar operación pendiente
    const operation: OptimisticOperation = {
      id: operationId,
      type: 'like',
      action: newLiked ? 'add' : 'remove',
      data: { postId, userId },
      timestamp: Date.now(),
      retries: 0,
    };

    this.pendingOperations.set(operationId, operation);
    await this.savePendingOperations();

    // ✅ PASO 3: Sincronización en SEGUNDO PLANO
    this.processOperation(operation, onRollback);
  }

  /**
   * ✅ INSTANT FOLLOW - Actualización inmediata de UI
   */
  async toggleFollow(
    targetId: string,
    followerId: string,
    targetType: 'usuario' | 'local',
    currentFollowing: boolean,
    onOptimisticUpdate: (following: boolean) => void,
    onRollback: (following: boolean) => void
  ): Promise<void> {
    const newFollowing = !currentFollowing;
    const operationId = `follow-${targetId}-${followerId}`;

    console.log('[OptimisticUI] 👥 INSTANT follow toggle:', { targetId, targetType, newFollowing });

    // ✅ PASO 1: Actualización INSTANTÁNEA de UI
    onOptimisticUpdate(newFollowing);

    // ✅ PASO 2: Guardar operación pendiente
    const operation: OptimisticOperation = {
      id: operationId,
      type: 'follow',
      action: newFollowing ? 'add' : 'remove',
      data: { targetId, followerId, targetType },
      timestamp: Date.now(),
      retries: 0,
    };

    this.pendingOperations.set(operationId, operation);
    await this.savePendingOperations();

    // ✅ PASO 3: Sincronización en SEGUNDO PLANO
    this.processOperation(operation, onRollback);
  }

  /**
   * ✅ INSTANT SAVE - Actualización inmediata de UI
   */
  async toggleSave(
    postId: string,
    userId: string,
    currentSaved: boolean,
    onOptimisticUpdate: (saved: boolean) => void,
    onRollback: (saved: boolean) => void
  ): Promise<void> {
    const newSaved = !currentSaved;
    const operationId = `save-${postId}-${userId}`;

    console.log('[OptimisticUI] 🔖 INSTANT save toggle:', { postId, newSaved });

    // ✅ PASO 1: Actualización INSTANTÁNEA de UI
    onOptimisticUpdate(newSaved);

    // ✅ PASO 2: Guardar operación pendiente
    const operation: OptimisticOperation = {
      id: operationId,
      type: 'save',
      action: newSaved ? 'add' : 'remove',
      data: { postId, userId },
      timestamp: Date.now(),
      retries: 0,
    };

    this.pendingOperations.set(operationId, operation);
    await this.savePendingOperations();

    // ✅ PASO 3: Sincronización en SEGUNDO PLANO
    this.processOperation(operation, onRollback);
  }

  /**
   * ✅ INSTANT COMMENT - Actualización inmediata de UI
   */
  async addComment(
    postId: string,
    userId: string,
    content: string,
    onOptimisticUpdate: (tempComment: any) => void,
    onSuccess: (realComment: any) => void,
    onRollback: (tempId: string) => void
  ): Promise<void> {
    const tempId = `temp-${Date.now()}`;
    const operationId = `comment-${tempId}`;

    console.log('[OptimisticUI] 💬 INSTANT comment add:', { postId, tempId });

    // ✅ PASO 1: Actualización INSTANTÁNEA de UI con comentario temporal
    const tempComment = {
      id: tempId,
      post_id: postId,
      usuario_id: userId,
      contenido: content,
      created_at: new Date().toISOString(),
      likes: 0,
      isOptimistic: true,
    };

    onOptimisticUpdate(tempComment);

    // ✅ PASO 2: Guardar operación pendiente
    const operation: OptimisticOperation = {
      id: operationId,
      type: 'comment',
      action: 'add',
      data: { postId, userId, content, tempId },
      timestamp: Date.now(),
      retries: 0,
    };

    this.pendingOperations.set(operationId, operation);
    await this.savePendingOperations();

    // ✅ PASO 3: Sincronización en SEGUNDO PLANO
    this.processCommentOperation(operation, onSuccess, onRollback);
  }

  /**
   * ✅ Procesar operación en segundo plano
   */
  private async processOperation(
    operation: OptimisticOperation,
    onRollback: (liked: boolean) => void
  ): Promise<void> {
    try {
      switch (operation.type) {
        case 'like':
          if (operation.action === 'add') {
            const { error } = await supabase.from('likes').insert({
              post_id: operation.data.postId,
              usuario_id: operation.data.userId,
            });
            if (error) throw error;
          } else {
            const { error } = await supabase
              .from('likes')
              .delete()
              .eq('post_id', operation.data.postId)
              .eq('usuario_id', operation.data.userId);
            if (error) throw error;
          }
          break;

        case 'follow':
          if (operation.action === 'add') {
            const insertData: any = {
              seguidor_id: operation.data.followerId,
            };

            if (operation.data.targetType === 'usuario') {
              insertData.seguido_id = operation.data.targetId;
            } else {
              insertData.local_id = operation.data.targetId;
            }

            const { error } = await supabase.from('seguidores').insert(insertData);
            if (error) throw error;
          } else {
            let query = supabase
              .from('seguidores')
              .delete()
              .eq('seguidor_id', operation.data.followerId);

            if (operation.data.targetType === 'usuario') {
              query = query.eq('seguido_id', operation.data.targetId);
            } else {
              query = query.eq('local_id', operation.data.targetId);
            }

            const { error } = await query;
            if (error) throw error;
          }
          break;

        case 'save':
          if (operation.action === 'add') {
            const { error } = await supabase.from('posts_guardados').insert({
              post_id: operation.data.postId,
              usuario_id: operation.data.userId,
            });
            if (error) throw error;
          } else {
            const { error } = await supabase
              .from('posts_guardados')
              .delete()
              .eq('post_id', operation.data.postId)
              .eq('usuario_id', operation.data.userId);
            if (error) throw error;
          }
          break;
      }

      // ✅ Operación exitosa - eliminar de pendientes
      this.pendingOperations.delete(operation.id);
      await this.savePendingOperations();

      console.log('[OptimisticUI] ✅ Operation synced:', operation.id);
    } catch (error) {
      console.error('[OptimisticUI] ❌ Operation failed:', operation.id, error);

      // ✅ Reintentar o hacer rollback
      if (operation.retries < MAX_RETRIES) {
        operation.retries++;
        this.pendingOperations.set(operation.id, operation);
        await this.savePendingOperations();

        setTimeout(() => {
          this.processOperation(operation, onRollback);
        }, RETRY_DELAY * operation.retries);
      } else {
        // ✅ Rollback después de MAX_RETRIES
        console.log('[OptimisticUI] 🔄 Rolling back operation:', operation.id);
        onRollback(operation.action === 'remove');
        this.pendingOperations.delete(operation.id);
        await this.savePendingOperations();
      }
    }
  }

  /**
   * ✅ Procesar comentario en segundo plano
   */
  private async processCommentOperation(
    operation: OptimisticOperation,
    onSuccess: (realComment: any) => void,
    onRollback: (tempId: string) => void
  ): Promise<void> {
    try {
      const { data, error } = await supabase
        .from('comentarios')
        .insert({
          post_id: operation.data.postId,
          usuario_id: operation.data.userId,
          contenido: operation.data.content,
        })
        .select(`
          *,
          usuario:usuarios!comentarios_usuario_id_fkey(nombre, avatar, username)
        `)
        .single();

      if (error) throw error;

      // ✅ Reemplazar comentario temporal con el real
      onSuccess(data);

      this.pendingOperations.delete(operation.id);
      await this.savePendingOperations();

      console.log('[OptimisticUI] ✅ Comment synced:', operation.id);
    } catch (error) {
      console.error('[OptimisticUI] ❌ Comment failed:', operation.id, error);

      if (operation.retries < MAX_RETRIES) {
        operation.retries++;
        this.pendingOperations.set(operation.id, operation);
        await this.savePendingOperations();

        setTimeout(() => {
          this.processCommentOperation(operation, onSuccess, onRollback);
        }, RETRY_DELAY * operation.retries);
      } else {
        console.log('[OptimisticUI] 🔄 Rolling back comment:', operation.data.tempId);
        onRollback(operation.data.tempId);
        this.pendingOperations.delete(operation.id);
        await this.savePendingOperations();
      }
    }
  }

  /**
   * ✅ Cargar operaciones pendientes desde AsyncStorage
   */
  private async loadPendingOperations(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(PENDING_OPERATIONS_KEY);
      if (stored) {
        const operations: OptimisticOperation[] = JSON.parse(stored);
        operations.forEach(op => {
          this.pendingOperations.set(op.id, op);
        });

        console.log('[OptimisticUI] 📦 Loaded pending operations:', operations.length);

        // ✅ Procesar operaciones pendientes
        if (operations.length > 0) {
          this.processPendingQueue();
        }
      }
    } catch (error) {
      console.error('[OptimisticUI] Error loading pending operations:', error);
    }
  }

  /**
   * ✅ Guardar operaciones pendientes en AsyncStorage
   */
  private async savePendingOperations(): Promise<void> {
    try {
      const operations = Array.from(this.pendingOperations.values());
      await AsyncStorage.setItem(PENDING_OPERATIONS_KEY, JSON.stringify(operations));
    } catch (error) {
      console.error('[OptimisticUI] Error saving pending operations:', error);
    }
  }

  /**
   * ✅ Procesar cola de operaciones pendientes
   */
  private async processPendingQueue(): Promise<void> {
    if (this.processingQueue) return;

    this.processingQueue = true;

    try {
      const operations = Array.from(this.pendingOperations.values());
      
      for (const operation of operations) {
        // ✅ Procesar cada operación con rollback dummy
        await this.processOperation(operation, () => {});
      }
    } finally {
      this.processingQueue = false;
    }
  }

  /**
   * ✅ Obtener número de operaciones pendientes
   */
  getPendingCount(): number {
    return this.pendingOperations.size;
  }

  /**
   * ✅ Limpiar operaciones antiguas (> 24 horas)
   */
  async cleanOldOperations(): Promise<void> {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 horas

    let cleaned = 0;
    this.pendingOperations.forEach((operation, id) => {
      if (now - operation.timestamp > maxAge) {
        this.pendingOperations.delete(id);
        cleaned++;
      }
    });

    if (cleaned > 0) {
      await this.savePendingOperations();
      console.log('[OptimisticUI] 🧹 Cleaned old operations:', cleaned);
    }
  }
}

export const optimisticUI = new OptimisticUIManager();

/**
 * ✅ Hook para usar Optimistic UI en componentes
 */
export function useOptimisticLike(postId: string, userId: string | undefined) {
  const [liked, setLiked] = React.useState(false);
  const [likesCount, setLikesCount] = React.useState(0);

  const toggleLike = React.useCallback(async () => {
    if (!userId) return;

    await optimisticUI.toggleLike(
      postId,
      userId,
      liked,
      (newLiked, countDelta) => {
        setLiked(newLiked);
        setLikesCount(prev => Math.max(0, prev + countDelta));
      },
      (rolledBackLiked, countDelta) => {
        setLiked(rolledBackLiked);
        setLikesCount(prev => Math.max(0, prev - countDelta));
      }
    );
  }, [postId, userId, liked]);

  return { liked, likesCount, toggleLike, setLiked, setLikesCount };
}

/**
 * ✅ Hook para usar Optimistic Follow
 */
export function useOptimisticFollow(
  targetId: string,
  followerId: string | undefined,
  targetType: 'usuario' | 'local'
) {
  const [following, setFollowing] = React.useState(false);

  const toggleFollow = React.useCallback(async () => {
    if (!followerId) return;

    await optimisticUI.toggleFollow(
      targetId,
      followerId,
      targetType,
      following,
      (newFollowing) => {
        setFollowing(newFollowing);
      },
      (rolledBackFollowing) => {
        setFollowing(rolledBackFollowing);
      }
    );
  }, [targetId, followerId, targetType, following]);

  return { following, toggleFollow, setFollowing };
}

// ✅ Necesario para React hooks
import React from 'react';
