
/**
 * Optimistic UI Manager
 * Provides instant UI feedback before server confirmation
 * Instagram-like instant response
 */

import { supabase } from './supabase';
import { socialCache } from './socialCache';

interface OptimisticUpdate {
  id: string;
  type: 'like' | 'save' | 'follow' | 'comment' | 'story_like';
  rollback: () => void;
  confirm: () => Promise<void>;
  timestamp: number;
}

class OptimisticUIManager {
  private pendingUpdates: Map<string, OptimisticUpdate> = new Map();
  private updateCallbacks: Map<string, ((data: any) => void)[]> = new Map();

  /**
   * Register callback for optimistic updates
   */
  onUpdate(key: string, callback: (data: any) => void): () => void {
    if (!this.updateCallbacks.has(key)) {
      this.updateCallbacks.set(key, []);
    }
    this.updateCallbacks.get(key)!.push(callback);

    // Return unsubscribe function
    return () => {
      const callbacks = this.updateCallbacks.get(key);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index > -1) {
          callbacks.splice(index, 1);
        }
      }
    };
  }

  /**
   * Notify all callbacks for a key
   */
  private notify(key: string, data: any): void {
    const callbacks = this.updateCallbacks.get(key) || [];
    callbacks.forEach(cb => cb(data));
  }

  /**
   * Optimistic like/unlike post
   */
  async togglePostLike(
    postId: string,
    userId: string,
    currentLiked: boolean,
    currentLikes: number,
    updateUI: (liked: boolean, likes: number) => void
  ): Promise<boolean> {
    const updateId = `like:${postId}:${userId}`;

    // ✅ INSTANT UI UPDATE
    const newLiked = !currentLiked;
    const newLikes = currentLiked ? currentLikes - 1 : currentLikes + 1;
    updateUI(newLiked, newLikes);

    // Update cache immediately
    socialCache.updatePost(postId, {
      liked: newLiked,
      likes: newLikes,
    });

    // Notify subscribers
    this.notify(`post:${postId}`, { liked: newLiked, likes: newLikes });

    // Store rollback function
    const rollback = () => {
      updateUI(currentLiked, currentLikes);
      socialCache.updatePost(postId, {
        liked: currentLiked,
        likes: currentLikes,
      });
      this.notify(`post:${postId}`, { liked: currentLiked, likes: currentLikes });
    };

    // Confirm with server in background
    const confirm = async () => {
      try {
        if (currentLiked) {
          // Unlike
          const { error: deleteError } = await supabase
            .from('likes')
            .delete()
            .eq('post_id', postId)
            .eq('usuario_id', userId);

          if (deleteError) throw deleteError;

          await supabase
            .from('posts')
            .update({ likes: Math.max(0, currentLikes - 1) })
            .eq('id', postId);
        } else {
          // Like
          const { error: insertError } = await supabase
            .from('likes')
            .insert({
              post_id: postId,
              usuario_id: userId,
            });

          if (insertError) throw insertError;

          await supabase
            .from('posts')
            .update({ likes: currentLikes + 1 })
            .eq('id', postId);
        }

        console.log('[OptimisticUI] ✅ Like confirmed:', postId);
        this.pendingUpdates.delete(updateId);
      } catch (error) {
        console.error('[OptimisticUI] ❌ Like failed, rolling back:', error);
        rollback();
        this.pendingUpdates.delete(updateId);
        throw error;
      }
    };

    // Store pending update
    this.pendingUpdates.set(updateId, {
      id: updateId,
      type: 'like',
      rollback,
      confirm,
      timestamp: Date.now(),
    });

    // Execute confirmation in background
    confirm().catch(() => {
      // Error already handled in confirm()
    });

    return newLiked;
  }

  /**
   * Optimistic save/unsave post
   */
  async togglePostSave(
    postId: string,
    userId: string,
    currentSaved: boolean,
    updateUI: (saved: boolean) => void
  ): Promise<boolean> {
    const updateId = `save:${postId}:${userId}`;

    // ✅ INSTANT UI UPDATE
    const newSaved = !currentSaved;
    updateUI(newSaved);

    // Update cache immediately
    socialCache.updatePost(postId, { saved: newSaved });

    // Notify subscribers
    this.notify(`post:${postId}`, { saved: newSaved });

    // Store rollback function
    const rollback = () => {
      updateUI(currentSaved);
      socialCache.updatePost(postId, { saved: currentSaved });
      this.notify(`post:${postId}`, { saved: currentSaved });
    };

    // Confirm with server in background
    const confirm = async () => {
      try {
        if (currentSaved) {
          await supabase
            .from('posts_guardados')
            .delete()
            .eq('post_id', postId)
            .eq('usuario_id', userId);
        } else {
          await supabase
            .from('posts_guardados')
            .insert({
              post_id: postId,
              usuario_id: userId,
            });
        }

        console.log('[OptimisticUI] ✅ Save confirmed:', postId);
        this.pendingUpdates.delete(updateId);
      } catch (error) {
        console.error('[OptimisticUI] ❌ Save failed, rolling back:', error);
        rollback();
        this.pendingUpdates.delete(updateId);
        throw error;
      }
    };

    // Store pending update
    this.pendingUpdates.set(updateId, {
      id: updateId,
      type: 'save',
      rollback,
      confirm,
      timestamp: Date.now(),
    });

    // Execute confirmation in background
    confirm().catch(() => {
      // Error already handled in confirm()
    });

    return newSaved;
  }

  /**
   * Optimistic follow/unfollow user
   */
  async toggleFollow(
    targetUserId: string,
    currentUserId: string,
    currentFollowing: boolean,
    updateUI: (following: boolean, followerCount: number) => void,
    currentFollowerCount: number
  ): Promise<boolean> {
    const updateId = `follow:${targetUserId}:${currentUserId}`;

    // ✅ INSTANT UI UPDATE
    const newFollowing = !currentFollowing;
    const newFollowerCount = currentFollowing 
      ? currentFollowerCount - 1 
      : currentFollowerCount + 1;
    updateUI(newFollowing, newFollowerCount);

    // Notify subscribers
    this.notify(`user:${targetUserId}`, { 
      following: newFollowing, 
      followerCount: newFollowerCount 
    });

    // Store rollback function
    const rollback = () => {
      updateUI(currentFollowing, currentFollowerCount);
      this.notify(`user:${targetUserId}`, { 
        following: currentFollowing, 
        followerCount: currentFollowerCount 
      });
    };

    // Confirm with server in background
    const confirm = async () => {
      try {
        if (currentFollowing) {
          await supabase
            .from('seguidores')
            .delete()
            .eq('seguidor_id', currentUserId)
            .eq('seguido_id', targetUserId);
        } else {
          await supabase
            .from('seguidores')
            .insert({
              seguidor_id: currentUserId,
              seguido_id: targetUserId,
            });
        }

        console.log('[OptimisticUI] ✅ Follow confirmed:', targetUserId);
        this.pendingUpdates.delete(updateId);
      } catch (error) {
        console.error('[OptimisticUI] ❌ Follow failed, rolling back:', error);
        rollback();
        this.pendingUpdates.delete(updateId);
        throw error;
      }
    };

    // Store pending update
    this.pendingUpdates.set(updateId, {
      id: updateId,
      type: 'follow',
      rollback,
      confirm,
      timestamp: Date.now(),
    });

    // Execute confirmation in background
    confirm().catch(() => {
      // Error already handled in confirm()
    });

    return newFollowing;
  }

  /**
   * Optimistic comment post
   */
  async addComment(
    postId: string,
    userId: string,
    userName: string,
    userAvatar: string | undefined,
    content: string,
    updateUI: (comment: any) => void
  ): Promise<string> {
    const tempId = `temp:${Date.now()}`;
    const updateId = `comment:${postId}:${tempId}`;

    // ✅ INSTANT UI UPDATE - Show comment immediately
    const tempComment = {
      id: tempId,
      post_id: postId,
      autor_id: userId,
      texto: content,
      created_at: new Date().toISOString(),
      likes: 0,
      autor: {
        nombre: userName,
        avatar: userAvatar,
      },
      liked: false,
    };

    updateUI(tempComment);

    // Notify subscribers
    this.notify(`post:${postId}`, { newComment: tempComment });

    // Store rollback function
    const rollback = () => {
      this.notify(`post:${postId}`, { removeComment: tempId });
    };

    // Confirm with server in background
    const confirm = async () => {
      try {
        const { data, error } = await supabase
          .from('comentarios')
          .insert({
            post_id: postId,
            autor_id: userId,
            texto: content,
          })
          .select()
          .single();

        if (error) throw error;

        // Replace temp comment with real one
        this.notify(`post:${postId}`, { 
          replaceComment: { tempId, realComment: data } 
        });

        console.log('[OptimisticUI] ✅ Comment confirmed:', postId);
        this.pendingUpdates.delete(updateId);

        return data.id;
      } catch (error) {
        console.error('[OptimisticUI] ❌ Comment failed, rolling back:', error);
        rollback();
        this.pendingUpdates.delete(updateId);
        throw error;
      }
    };

    // Store pending update
    this.pendingUpdates.set(updateId, {
      id: updateId,
      type: 'comment',
      rollback,
      confirm,
      timestamp: Date.now(),
    });

    // Execute confirmation in background
    confirm().catch(() => {
      // Error already handled in confirm()
    });

    return tempId;
  }

  /**
   * Get pending updates count
   */
  getPendingCount(): number {
    return this.pendingUpdates.size;
  }

  /**
   * Wait for all pending updates to complete
   */
  async waitForPending(timeout: number = 5000): Promise<void> {
    const startTime = Date.now();

    while (this.pendingUpdates.size > 0) {
      if (Date.now() - startTime > timeout) {
        console.warn('[OptimisticUI] ⚠️ Timeout waiting for pending updates');
        break;
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log('[OptimisticUI] ✅ All pending updates completed');
  }

  /**
   * Clear all pending updates (rollback all)
   */
  clearAll(): void {
    this.pendingUpdates.forEach(update => {
      update.rollback();
    });
    this.pendingUpdates.clear();
    console.log('[OptimisticUI] 🗑️ All pending updates cleared');
  }

  /**
   * Get statistics
   */
  getStats(): {
    pending: number;
    byType: Record<string, number>;
    oldestPending: number | null;
  } {
    const byType: Record<string, number> = {};
    let oldestTimestamp: number | null = null;

    this.pendingUpdates.forEach(update => {
      byType[update.type] = (byType[update.type] || 0) + 1;
      if (oldestTimestamp === null || update.timestamp < oldestTimestamp) {
        oldestTimestamp = update.timestamp;
      }
    });

    return {
      pending: this.pendingUpdates.size,
      byType,
      oldestPending: oldestTimestamp,
    };
  }
}

// Export singleton instance
export const optimisticUI = new OptimisticUIManager();
