
// At line 432, wrap handleDeletePost in useCallback

// Find the handleDeletePost function definition and wrap it:
const handleDeletePost = useCallback(async () => {
  console.log('[PostDetail] Delete post');
  
  if (!user || !post) {
    console.log('[PostDetail] No user or post data');
    return;
  }

  const isOwner = post.tipo === 'usuario' 
    ? post.autor_id === user.id
    : post.tipo === 'local' && interactionLocalId === post.local_id;

  if (!isOwner) {
    Alert.alert('Error', 'Solo puedes eliminar tus propias publicaciones');
    return;
  }

  try {
    console.log('[PostDetail] Deleting post:', post.id);
    
    const { error } = await supabase
      .from('posts')
      .delete()
      .eq('id', post.id);

    if (error) {
      console.error('[PostDetail] Error deleting post:', error);
      throw error;
    }

    Alert.alert('Éxito', 'Publicación eliminada correctamente', [
      { text: 'OK', onPress: () => router.back() }
    ]);
  } catch (error) {
    console.error('[PostDetail] Error deleting post:', error);
    Alert.alert('Error', 'No se pudo eliminar la publicación');
  }
}, [user, post, interactionLocalId, router]);
