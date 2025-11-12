
import { supabase } from './supabase';

/**
 * Share a post with a snapshot to a user via message
 */
export async function sharePostWithSnapshot(
  postId: string,
  recipientId: string,
  senderId: string,
  senderName: string,
  postImage?: string,
  postAuthorName?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('[PostHelpers] Sharing post with snapshot:', postId);

    // Find or create chat
    const { data: existingChat, error: chatError } = await supabase
      .from('chats')
      .select('id')
      .or(`and(usuario1_id.eq.${senderId},usuario2_id.eq.${recipientId}),and(usuario1_id.eq.${recipientId},usuario2_id.eq.${senderId})`)
      .single();

    let chatId = existingChat?.id;

    if (!chatId) {
      console.log('[PostHelpers] Creating new chat...');
      const { data: newChat, error: newChatError } = await supabase
        .from('chats')
        .insert({
          usuario1_id: senderId,
          usuario2_id: recipientId,
        })
        .select('id')
        .single();

      if (newChatError) throw newChatError;
      chatId = newChat.id;
    }

    // Send message with post snapshot
    const { error: messageError } = await supabase
      .from('mensajes')
      .insert({
        chat_id: chatId,
        remitente_id: senderId,
        contenido: `Compartió una publicación${postAuthorName ? ` de ${postAuthorName}` : ''}`,
        tipo_mensaje: 'post_compartido',
        post_compartido_id: postId,
        post_imagen: postImage || null,
      });

    if (messageError) throw messageError;

    // Update chat last message
    await supabase
      .from('chats')
      .update({
        ultimo_mensaje: 'Publicación compartida',
        ultimo_mensaje_fecha: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', chatId);

    // Send notification
    await supabase.from('notificaciones').insert({
      usuario_id: recipientId,
      tipo: 'mensaje_privado',
      titulo: 'Nuevo mensaje',
      mensaje: `${senderName} te compartió una publicación`,
      usuario_origen_id: senderId,
      post_id: postId,
    });

    console.log('[PostHelpers] Post shared successfully');
    return { success: true };
  } catch (error) {
    console.error('[PostHelpers] Error sharing post:', error);
    return { success: false, error: 'No se pudo compartir la publicación' };
  }
}

/**
 * Check if a post is accessible to a user (handles private profiles)
 */
export async function isPostAccessible(
  postId: string,
  userId: string
): Promise<{ accessible: boolean; reason?: string }> {
  try {
    // Get post with author info
    const { data: post, error } = await supabase
      .from('posts')
      .select(`
        id,
        autor_id,
        autor:usuarios!posts_autor_id_fkey(perfil_privado)
      `)
      .eq('id', postId)
      .single();

    if (error || !post) {
      return { accessible: false, reason: 'Publicación no encontrada' };
    }

    // If profile is not private, post is accessible
    if (!post.autor?.perfil_privado) {
      return { accessible: true };
    }

    // Check if user follows the author
    const { data: followData } = await supabase
      .from('seguidores')
      .select('id')
      .eq('seguidor_id', userId)
      .eq('seguido_id', post.autor_id)
      .single();

    if (!followData) {
      return { 
        accessible: false, 
        reason: 'Esta publicación pertenece a un perfil privado. Solo los seguidores pueden verla.' 
      };
    }

    return { accessible: true };
  } catch (error) {
    console.error('[PostHelpers] Error checking post accessibility:', error);
    return { accessible: false, reason: 'Error al verificar acceso' };
  }
}
