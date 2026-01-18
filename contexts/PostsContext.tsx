
import React, { createContext, useContext, useState, useCallback, useRef, ReactNode } from 'react';
import { supabase } from '@/utils/supabase';

interface Like {
  id: string;
  usuario_id: string;
}

interface PostState {
  isLiked: boolean;
  likesCount: number;
  localLikes: Like[];
  commentsCount: number;
  isSaved: boolean;
}

interface PostsContextType {
  // Get post state
  getPostState: (postId: string) => PostState | undefined;
  
  // Update post state
  updatePostLikes: (postId: string, isLiked: boolean, likesCount: number, localLikes: Like[]) => void;
  updatePostComments: (postId: string, commentsCount: number) => void;
  updatePostSaved: (postId: string, isSaved: boolean) => void;
  
  // Initialize post state
  initializePost: (postId: string, initialState: PostState) => void;
  
  // Subscribe to post updates
  subscribeToPost: (postId: string, callback: (state: PostState) => void) => () => void;
}

const PostsContext = createContext<PostsContextType | undefined>(undefined);

/**
 * ✅ POSTS CONTEXT v1.0 - GLOBAL STATE MANAGEMENT FOR POSTS
 * 
 * Purpose:
 * - Single source of truth for all post states (likes, comments, saves)
 * - Synchronizes updates across all views (Feed, Modal, Profile)
 * - Enables instant reactivity without prop drilling
 * - Manages real-time subscriptions efficiently
 * 
 * Features:
 * - ✅ Global state for likes, comments, and saves
 * - ✅ Subscription system for reactive updates
 * - ✅ Optimistic UI support
 * - ✅ Memory-efficient with automatic cleanup
 */

export function PostsProvider({ children }: { children: ReactNode }) {
  // Map of postId -> PostState
  const [postsState, setPostsState] = useState<Map<string, PostState>>(new Map());
  
  // Map of postId -> Set of callback functions
  const subscriptionsRef = useRef<Map<string, Set<(state: PostState) => void>>>(new Map());

  const getPostState = useCallback((postId: string): PostState | undefined => {
    return postsState.get(postId);
  }, [postsState]);

  const notifySubscribers = useCallback((postId: string, state: PostState) => {
    const subscribers = subscriptionsRef.current.get(postId);
    if (subscribers) {
      subscribers.forEach(callback => callback(state));
    }
  }, []);

  const updatePostLikes = useCallback((postId: string, isLiked: boolean, likesCount: number, localLikes: Like[]) => {
    setPostsState(prev => {
      const newMap = new Map(prev);
      const currentState = newMap.get(postId) || {
        isLiked: false,
        likesCount: 0,
        localLikes: [],
        commentsCount: 0,
        isSaved: false,
      };
      
      const newState = {
        ...currentState,
        isLiked,
        likesCount,
        localLikes,
      };
      
      newMap.set(postId, newState);
      
      // Notify all subscribers
      notifySubscribers(postId, newState);
      
      console.log('[PostsContext] ✅ Updated likes for post:', postId, {
        isLiked,
        likesCount,
        localLikesCount: localLikes.length,
      });
      
      return newMap;
    });
  }, [notifySubscribers]);

  const updatePostComments = useCallback((postId: string, commentsCount: number) => {
    setPostsState(prev => {
      const newMap = new Map(prev);
      const currentState = newMap.get(postId) || {
        isLiked: false,
        likesCount: 0,
        localLikes: [],
        commentsCount: 0,
        isSaved: false,
      };
      
      const newState = {
        ...currentState,
        commentsCount,
      };
      
      newMap.set(postId, newState);
      notifySubscribers(postId, newState);
      
      console.log('[PostsContext] ✅ Updated comments for post:', postId, { commentsCount });
      
      return newMap;
    });
  }, [notifySubscribers]);

  const updatePostSaved = useCallback((postId: string, isSaved: boolean) => {
    setPostsState(prev => {
      const newMap = new Map(prev);
      const currentState = newMap.get(postId) || {
        isLiked: false,
        likesCount: 0,
        localLikes: [],
        commentsCount: 0,
        isSaved: false,
      };
      
      const newState = {
        ...currentState,
        isSaved,
      };
      
      newMap.set(postId, newState);
      notifySubscribers(postId, newState);
      
      console.log('[PostsContext] ✅ Updated saved for post:', postId, { isSaved });
      
      return newMap;
    });
  }, [notifySubscribers]);

  const initializePost = useCallback((postId: string, initialState: PostState) => {
    setPostsState(prev => {
      const newMap = new Map(prev);
      if (!newMap.has(postId)) {
        newMap.set(postId, initialState);
        console.log('[PostsContext] 🆕 Initialized post:', postId, initialState);
      }
      return newMap;
    });
  }, []);

  const subscribeToPost = useCallback((postId: string, callback: (state: PostState) => void): (() => void) => {
    if (!subscriptionsRef.current.has(postId)) {
      subscriptionsRef.current.set(postId, new Set());
    }
    
    subscriptionsRef.current.get(postId)!.add(callback);
    
    console.log('[PostsContext] 📡 Subscribed to post:', postId, 'Total subscribers:', subscriptionsRef.current.get(postId)!.size);
    
    // Return unsubscribe function
    return () => {
      const subscribers = subscriptionsRef.current.get(postId);
      if (subscribers) {
        subscribers.delete(callback);
        console.log('[PostsContext] 📴 Unsubscribed from post:', postId, 'Remaining subscribers:', subscribers.size);
        
        // Clean up if no more subscribers
        if (subscribers.size === 0) {
          subscriptionsRef.current.delete(postId);
          console.log('[PostsContext] 🧹 Cleaned up subscriptions for post:', postId);
        }
      }
    };
  }, []);

  const value: PostsContextType = React.useMemo(() => ({
    getPostState,
    updatePostLikes,
    updatePostComments,
    updatePostSaved,
    initializePost,
    subscribeToPost,
  }), [
    getPostState,
    updatePostLikes,
    updatePostComments,
    updatePostSaved,
    initializePost,
    subscribeToPost,
  ]);

  return (
    <PostsContext.Provider value={value}>
      {children}
    </PostsContext.Provider>
  );
}

export function usePostsContext() {
  const context = useContext(PostsContext);
  
  if (context === undefined) {
    throw new Error('usePostsContext must be used within a PostsProvider');
  }
  
  return context;
}
