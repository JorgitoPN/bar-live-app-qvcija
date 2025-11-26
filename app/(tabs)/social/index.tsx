
// ... (keep imports and interfaces)

export default function SocialScreen() {
  // ... (keep all state and hooks)

  // ✅ FIXED: Removed unnecessary dependencies from useCallback
  const loadData = useCallback(async () => {
    if (isLoadingRef.current) {
      console.log('[Social] ⚡ Already loading, skipping...');
      return;
    }

    isLoadingRef.current = true;

    try {
      console.log('[Social] ⚡ Loading user-specific data...');
      console.log('[Social] 📍 Global posts available:', globalPosts.length);
      console.log('[Social] 📍 Global stories available:', globalStories.length);

      if (globalPosts.length > 0) {
        console.log('[Social] ⚡⚡⚡ INSTANT posts from global data:', globalPosts.length);
        
        let filteredPosts = globalPosts;
        
        if (isOwnerMode && activeLocalProfileId) {
          filteredPosts = globalPosts.filter(p => p.tipo === 'local' && p.local_id === activeLocalProfileId);
          console.log('[Social] 🏢 Owner mode - Filtered posts for local:', activeLocalProfileId, 'Count:', filteredPosts.length);
        } else {
          if (user) {
            const { data: followedLocals } = await supabase
              .from('locales_favoritos')
              .select('local_id')
              .eq('usuario_id', user.id);

            const followedLocalIds = new Set(followedLocals?.map(f => f.local_id) || []);
            
            filteredPosts = globalPosts.filter(p => 
              p.tipo === 'usuario' || 
              (p.tipo === 'local' && p.local_id && followedLocalIds.has(p.local_id))
            );
            console.log('[Social] 👤 User mode - Filtered user posts + followed locals, Count:', filteredPosts.length);
          } else {
            filteredPosts = globalPosts.filter(p => p.tipo === 'usuario');
            console.log('[Social] 👤 User mode - Filtered user posts only (not logged in), Count:', filteredPosts.length);
          }
        }
        
        if (user && filteredPosts.length > 0) {
          const postIds = filteredPosts.map(p => p.id);
          
          const [likesResult, savesResult, commentsResult] = await Promise.all([
            supabase
              .from('likes')
              .select('post_id')
              .eq('usuario_id', user.id)
              .in('post_id', postIds),
            supabase
              .from('posts_guardados')
              .select('post_id')
              .eq('usuario_id', user.id)
              .in('post_id', postIds),
            supabase
              .from('comentarios')
              .select('post_id')
              .in('post_id', postIds),
          ]);

          const likedPostIds = new Set(likesResult.data?.map(l => l.post_id) || []);
          const savedPostIds = new Set(savesResult.data?.map(s => s.post_id) || []);
          
          const commentCounts = commentsResult.data?.reduce((acc, c) => {
            acc[c.post_id] = (acc[c.post_id] || 0) + 1;
            return acc;
          }, {} as Record<string, number>) || {};

          const postsWithStatus = filteredPosts.map(post => ({
            ...post,
            liked: likedPostIds.has(post.id),
            saved: savedPostIds.has(post.id),
            comentarios: commentCounts[post.id] || 0,
          }));
          
          setPosts(postsWithStatus);
        } else {
          setPosts(filteredPosts);
        }
      }

      // ... (keep rest of stories loading logic)

      console.log('[Social] ⚡ User-specific data loaded');
    } catch (error) {
      console.error('[Social] Error loading data:', error);
    } finally {
      isLoadingRef.current = false;
    }
  }, [user, globalPosts, globalStories, isOwnerMode, activeLocalProfileId]);

  // ... (keep rest of the component)
}
