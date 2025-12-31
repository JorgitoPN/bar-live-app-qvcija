
import { useState, useEffect, useCallback, useRef } from 'react';
import { Alert, Platform } from 'react-native';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { usePostsContext } from '@/contexts/PostsContext';
import * as Haptics from 'expo-haptics';

interface UsePostInteractionsProps {
  postId: string;
  initialLiked?: boolean;
  initialLikesCount?: number;
  initialCommentsCount?: number;
  initialSaved?: boolean;
}

interface Like {
  id: string;
  usuario_id: string;
}

/**
 * ✅ USE POST INTERACTIONS HOOK v1.2 - FIXED INFINITE LOOP
 * 
 * Purpose:
 * - Manages all post interactions (likes, comments, saves) with global state
 * - Provides optimistic UI updates
 * - Handles real-time synchronization
 * - Ensures consistency across all views
 * 
 * CRITICAL FIX:
 * - ✅ FIXED: Removed circular dependencies in useEffect
 * - ✅ FIXED: Memoized callbacks properly
 * - ✅ FIXED: Separated initialization from updates
 */

export function usePostInteractions({
  postId,
  initialLiked = false,
  initialLikesCount = 0,
  initialCommentsCount = 0,
  initialSaved = false,
}: UsePostInteractionsProps) {
  const { user, ensureValidSession } = useAuth();
  const { getPostState, updatePostLikes, updatePostComments, updatePostSaved, initializePost, subscribeToPost } = usePostsContext();
  
  const channelRef = useRef<any>(null);
  const likeDebounceTimer = useRef<NodeJS.Timeout | null>(null);
  const hasInitialized = useRef(false);
  
  // Get state from global context or use initial values
  const globalState = getPostState(postId);
  const [isLiked, setIsLiked] = useState(globalState?.isLiked ?? initialLiked);
  const [likesCount, setLikesCount] = useState(globalState?.likesCount ?? initialLikesCount);
  const [localLikes, setLocalLikes] = useState<Like[]>(globalState?.localLikes ?? []);
  const [commentsCount, setCommentsCount] = useState(globalState?.commentsCount ?? initialCommentsCount);
  const [isSaved, setIsSaved] = useState(globalState?.isSaved ?? initialSaved);

  // ✅ FIXED: Initialize post in global context ONCE
  useEffect(() => {
    if (!hasInitialized.current) {
      initializePost(postId, {
        isLiked: initialLiked,
        likesCount: initialLikesCount,
        localLikes: [],
        commentsCount: initialCommentsCount,
        isSaved: initialSaved,
      });
      hasInitialized.current = true;
    }
  }, [postId, initializePost, initialLiked, initialLikesCount, initialCommentsCount, initialSaved]);

  // ✅ FIXED: Subscribe to global state changes
  useEffect(() => {
    const unsubscribe = subscribeToPost(postId, (state) => {
      console.log('[usePostInteractions] 🔄 Received global state update for post:', postId, state);
      setIsLiked(state.isLiked);
      setLikesCount(state.likesCount);
      setLocalLikes(state.localLikes);
      setCommentsCount(state.commentsCount);
      setIsSaved(state.isSaved);
    });

    return unsubscribe;
  }, [postId, subscribeToPost]);

  // ✅ FIXED: Load initial likes array ONCE
  useEffect(() => {
    const loadInitialLikes = async () => {
      try {
        const { data, error } = await supabase
          .from('likes')
          .select('id, usuario_id')
          .eq('post_id', postId);

        if (!error && data) {
          setLocalLikes(data);
          updatePostLikes(postId, isLiked, data.length, data);
          console.log('[usePostInteractions] ✅ Loaded initial likes:', data.length);
        }
      } catch (error) {
        console.error('[usePostInteractions] Error loading initial likes:', error);
      }
    };

    loadInitialLikes();
  }, [postId, isLiked, updatePostLikes]);

  // ✅ FIXED: Real-time subscription for OTHER users' changes
  useEffect(() => {
    if (!user) return;

    console.log('[usePostInteractions] 🔄 Setting up real-time subscription for post:', postId);

    if (channelRef.current?.state === 'subscribed') {
      console.log('[usePostInteractions] ⚠️ Already subscribed, skipping');
      return;
    }

    const channel = supabase.channel(`post-interactions:${postId}:${user.id}`);
    channelRef.current = channel;

    channel
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'likes',
          filter: `post_id=eq.${postId}`,
        },
        async (payload) => {
          console.log('[usePostInteractions] 🔄 Real-time like change detected:', payload.eventType);
          
          const changedByUserId = payload.new?.usuario_id || payload.old?.usuario_id;
          
          if (changedByUserId === user.id) {
            console.log('[usePostInteractions] ⏭️ Change made by current user, skipping');
            return;
          }
          
          console.log('[usePostInteractions] 🔄 Change made by another user, updating...');
          
          // Update local likes array
          if (payload.eventType === 'INSERT' && payload.new) {
            setLocalLikes(prev => {
              if (prev.some(like => like.id === payload.new.id)) {
                return prev;
              }
              const newArray = [...prev, { id: payload.new.id, usuario_id: payload.new.usuario_id }];
              updatePostLikes(postId, isLiked, newArray.length, newArray);
              return newArray;
            });
          } else if (payload.eventType === 'DELETE' && payload.old) {
            setLocalLikes(prev => {
              const newArray = prev.filter(like => like.id !== payload.old.id);
              updatePostLikes(postId, isLiked, newArray.length, newArray);
              return newArray;
            });
          }
          
          // Fetch updated count from database
          const { count, error: countError } = await supabase
            .from('likes')
            .select('id', { count: 'exact', head: true })
            .eq('post_id', postId);
          
          if (!countError && count !== null) {
            setLikesCount(count);
            updatePostLikes(postId, isLiked, count, localLikes);
          }
        }
      )
      .subscribe((status) => {
        console.log('[usePostInteractions] 📡 Subscription status:', status);
      });

    return () => {
      console.log('[usePostInteractions] 🔄 Cleaning up subscription');
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [postId, user, isLiked, localLikes, updatePostLikes]); // ✅ FIXED: Added user dependency

  const handleLike = useCallback(async () => {
    if (!user) {
      Alert.alert('Inicia sesión', 'Debes iniciar sesión para dar me gusta');
      return;
    }

    const validSession = await ensureValidSession();
    
    if (!validSession) {
      Alert.alert(
        'Sesión Expirada',
        'Tu sesión ha expirado. Por favor, inicia sesión de nuevo.'
      );
      return;
    }

    // ✅ CRITICAL FIX: Determine the new state BEFORE updating
    const newLikedState = !isLiked;
    const previousLiked = isLiked;
    const previousCount = likesCount;
    const previousLocalLikes = [...localLikes];
    
    console.log('[usePostInteractions] 🔄 handleLike called:', {
      currentIsLiked: isLiked,
      newLikedState,
      currentLocalLikesCount: localLikes.length,
      userId: user.id,
    });
    
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else {
      Haptics.selectionAsync();
    }

    // ✅ CRITICAL FIX: Update isLiked state FIRST
    setIsLiked(newLikedState);
    
    // ✅ CRITICAL FIX: Update count based on new state
    const newCount = newLikedState ? likesCount + 1 : Math.max(0, likesCount - 1);
    setLikesCount(newCount);
    
    // ✅ CRITICAL FIX: Update local likes array based on NEW state
    let newLocalLikes: Like[];
    
    if (newLikedState) {
      // ✅ User is LIKING (newLikedState = TRUE) → ADD avatar
      const tempId = `temp-${Date.now()}`;
      newLocalLikes = [...localLikes, { id: tempId, usuario_id: user.id }];
      console.log('[usePostInteractions] ➕ LIKING: Adding avatar to array, new count:', newLocalLikes.length);
    } else {
      // ✅ User is UNLIKING (newLikedState = FALSE) → REMOVE avatar
      newLocalLikes = localLikes.filter(like => like.usuario_id !== user.id);
      console.log('[usePostInteractions] ➖ UNLIKING: Removing avatar from array, new count:', newLocalLikes.length);
    }
    
    setLocalLikes(newLocalLikes);
    
    // ✅ UPDATE GLOBAL STATE IMMEDIATELY
    updatePostLikes(postId, newLikedState, newCount, newLocalLikes);
    
    console.log('[usePostInteractions] ✅ Optimistic update complete:', {
      isLiked: newLikedState,
      count: newCount,
      localLikesCount: newLocalLikes.length,
    });

    if (likeDebounceTimer.current) {
      clearTimeout(likeDebounceTimer.current);
    }

    likeDebounceTimer.current = setTimeout(async () => {
      try {
        if (newLikedState) {
          console.log('[usePostInteractions] ➕ Adding like to database');
          
          const { data, error } = await supabase.from('likes').insert({
            post_id: postId,
            usuario_id: user.id,
          }).select().single();
          
          if (error) throw error;
          
          // Replace temp ID with real ID
          const finalLikes = newLocalLikes.map(like => 
            like.usuario_id === user.id && like.id.startsWith('temp-')
              ? { id: data.id, usuario_id: user.id }
              : like
          );
          
          setLocalLikes(finalLikes);
          updatePostLikes(postId, newLikedState, finalLikes.length, finalLikes);
          
          console.log('[usePostInteractions] ✅ Like added successfully');
        } else {
          console.log('[usePostInteractions] ➖ Removing like from database');
          
          const { error } = await supabase
            .from('likes')
            .delete()
            .eq('post_id', postId)
            .eq('usuario_id', user.id);
          
          if (error) throw error;
          
          console.log('[usePostInteractions] ✅ Like removed successfully');
        }

        // Verify final count
        const { count, error: countError } = await supabase
          .from('likes')
          .select('id', { count: 'exact', head: true })
          .eq('post_id', postId);
        
        if (!countError && count !== null) {
          setLikesCount(count);
          updatePostLikes(postId, newLikedState, count, newLocalLikes);
          console.log('[usePostInteractions] ✅ Verified final count:', count);
        }
      } catch (error) {
        console.error('[usePostInteractions] ❌ Error toggling like:', error);
        // ✅ Rollback on error
        setIsLiked(previousLiked);
        setLikesCount(previousCount);
        setLocalLikes(previousLocalLikes);
        updatePostLikes(postId, previousLiked, previousCount, previousLocalLikes);
        Alert.alert('Error', 'No se pudo actualizar el me gusta. Intenta de nuevo.');
      }
    }, 300);
  }, [user, ensureValidSession, isLiked, likesCount, localLikes, postId, updatePostLikes]);

  const handleSave = useCallback(async () => {
    if (!user) {
      Alert.alert('Inicia sesión', 'Debes iniciar sesión para guardar publicaciones');
      return;
    }

    const newSavedState = !isSaved;
    setIsSaved(newSavedState);
    updatePostSaved(postId, newSavedState);

    try {
      if (newSavedState) {
        await supabase.from('posts_guardados').insert({
          post_id: postId,
          usuario_id: user.id,
        });
      } else {
        await supabase
          .from('posts_guardados')
          .delete()
          .eq('post_id', postId)
          .eq('usuario_id', user.id);
      }
    } catch (error) {
      console.error('[usePostInteractions] Error toggling save:', error);
      setIsSaved(!newSavedState);
      updatePostSaved(postId, !newSavedState);
    }
  }, [user, isSaved, postId, updatePostSaved]);

  const incrementComments = useCallback(() => {
    const newCount = commentsCount + 1;
    setCommentsCount(newCount);
    updatePostComments(postId, newCount);
  }, [commentsCount, postId, updatePostComments]);

  return {
    isLiked,
    likesCount,
    localLikes,
    commentsCount,
    isSaved,
    handleLike,
    handleSave,
    incrementComments,
  };
}
