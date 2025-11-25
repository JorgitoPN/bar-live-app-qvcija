
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
      
      if (currentMode === 'propietario' && activeProfileType === 'local' && activeProfileId) {
        filteredPosts = globalPosts.filter(p => p.tipo === 'local' && p.local_id === activeProfileId);
        console.log('[Social] 🏢 Owner mode - Filtered posts for local:', activeProfileId, 'Count:', filteredPosts.length);
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

    if (globalStories.length > 0) {
      console.log('[Social] ⚡⚡⚡ INSTANT stories from global data:', globalStories.length);
      
      let filteredStories: typeof globalStories = [];

      if (currentMode === 'propietario' && activeProfileType === 'local' && activeProfileId) {
        filteredStories = globalStories.filter(s => 
          s.tipo === 'usuario' || 
          (s.tipo === 'local' && s.local_id === activeProfileId)
        );
        console.log('[Social] 🏢 Owner mode - Filtered stories (users + own local):', filteredStories.length);
      } else if (user) {
        const { data: followedLocals } = await supabase
          .from('locales_favoritos')
          .select('local_id')
          .eq('usuario_id', user.id);

        const followedLocalIds = new Set(followedLocals?.map(f => f.local_id) || []);
        
        filteredStories = globalStories.filter(s => 
          s.tipo === 'usuario' ||
          (s.tipo === 'local' && s.local_id && followedLocalIds.has(s.local_id))
        );
        console.log('[Social] 👤 User mode - Filtered stories (users + followed locals):', filteredStories.length);
      } else {
        filteredStories = globalStories.filter(s => s.tipo === 'usuario');
        console.log('[Social] 🔓 Not logged in - Showing all user stories:', filteredStories.length);
      }
      
      if (user) {
        const allStoryIds = filteredStories.map(s => s.id);
        
        const [viewedData, likesData, viewsCountData, commentsCountData] = await Promise.all([
          supabase
            .from('historia_views')
            .select('historia_id')
            .eq('usuario_id', user.id)
            .in('historia_id', allStoryIds),
          supabase
            .from('historia_likes')
            .select('historia_id')
            .eq('usuario_id', user.id)
            .in('historia_id', allStoryIds),
          supabase
            .from('historia_views')
            .select('historia_id')
            .in('historia_id', allStoryIds),
          supabase
            .from('historia_comentarios')
            .select('historia_id')
            .in('historia_id', allStoryIds),
        ]);
        
        const viewedStoryIds = new Set(viewedData.data?.map(v => v.historia_id) || []);
        const likedStoryIds = new Set(likesData.data?.map(l => l.historia_id) || []);
        
        const viewsCounts = viewsCountData.data?.reduce((acc, v) => {
          acc[v.historia_id] = (acc[v.historia_id] || 0) + 1;
          return acc;
        }, {} as Record<string, number>) || {};
        
        const commentsCounts = commentsCountData.data?.reduce((acc, c) => {
          acc[c.historia_id] = (acc[c.historia_id] || 0) + 1;
          return acc;
        }, {} as Record<string, number>) || {};
        
        const storiesWithStatus = filteredStories.map(story => ({
          ...story,
          visto_por_usuario: viewedStoryIds.has(story.id),
          liked_by_user: likedStoryIds.has(story.id),
          views_count: viewsCounts[story.id] || 0,
          comments_count: commentsCounts[story.id] || 0,
        }));
        
        setHistorias(storiesWithStatus);
      } else {
        setHistorias(filteredStories);
      }
    }

    console.log('[Social] ⚡ User-specific data loaded');
  } catch (error) {
    console.error('[Social] Error loading data:', error);
  } finally {
    isLoadingRef.current = false;
  }
}, [user, globalPosts, globalStories, currentMode, activeProfileType, activeProfileId]);
