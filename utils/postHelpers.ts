
import { supabase } from './supabase';
import { extractHashtags, extractMentions } from './textParser';

/**
 * Process and store hashtags for a post
 */
export async function processPostHashtags(postId: string, content: string): Promise<void> {
  if (!content) return;

  const hashtags = extractHashtags(content);
  if (hashtags.length === 0) return;

  try {
    console.log('[PostHelpers] Processing hashtags for post:', postId, hashtags);

    for (const tag of hashtags) {
      // Insert or get existing hashtag
      const { data: existingHashtag } = await supabase
        .from('hashtags')
        .select('id')
        .eq('tag', tag)
        .single();

      let hashtagId: string;

      if (existingHashtag) {
        hashtagId = existingHashtag.id;
      } else {
        const { data: newHashtag, error: insertError } = await supabase
          .from('hashtags')
          .insert({ tag })
          .select('id')
          .single();

        if (insertError) {
          console.error('[PostHelpers] Error inserting hashtag:', insertError);
          continue;
        }

        hashtagId = newHashtag.id;
      }

      // Link hashtag to post
      const { error: linkError } = await supabase
        .from('post_hashtags')
        .insert({
          post_id: postId,
          hashtag_id: hashtagId,
        });

      if (linkError && linkError.code !== '23505') { // Ignore duplicate key errors
        console.error('[PostHelpers] Error linking hashtag to post:', linkError);
      }
    }

    console.log('[PostHelpers] ✅ Hashtags processed successfully');
  } catch (error) {
    console.error('[PostHelpers] Error processing hashtags:', error);
  }
}

/**
 * Process and store mentions for a post
 */
export async function processPostMentions(postId: string, content: string): Promise<void> {
  if (!content) return;

  const mentions = extractMentions(content);
  if (mentions.length === 0) return;

  try {
    console.log('[PostHelpers] Processing mentions for post:', postId, mentions);

    for (const username of mentions) {
      // Try to find user by username
      const { data: user } = await supabase
        .from('usuarios')
        .select('id')
        .eq('username', username)
        .eq('activo', true)
        .single();

      if (user) {
        // Insert user mention
        const { error } = await supabase
          .from('post_mentions')
          .insert({
            post_id: postId,
            usuario_id: user.id,
            username: username,
          });

        if (error && error.code !== '23505') { // Ignore duplicates
          console.error('[PostHelpers] Error inserting user mention:', error);
        }

        // Create notification for mentioned user
        await supabase.from('notificaciones').insert({
          usuario_id: user.id,
          tipo: 'mencion',
          titulo: 'Te mencionaron en una publicación',
          mensaje: `Te mencionaron en una publicación`,
          post_id: postId,
        });

        continue;
      }

      // Try to find local by name (for locals with active profiles)
      const { data: localsWithSubs } = await supabase
        .from('locales')
        .select(`
          id,
          nombre,
          suscripciones_locales!suscripciones_locales_local_id_fkey(
            estado,
            plan_id,
            planes_suscripcion!suscripciones_locales_plan_id_fkey(
              nombre
            )
          )
        `)
        .ilike('nombre', username)
        .eq('activo', true)
        .limit(1);

      if (localsWithSubs && localsWithSubs.length > 0) {
        const local = localsWithSubs[0];
        const subscription = local.suscripciones_locales;
        
        // Only mention locals with active Estándar or Premium plans
        if (subscription && subscription.estado === 'activa') {
          const planName = subscription.planes_suscripcion?.nombre;
          if (planName === 'estandar' || planName === 'premium') {
            const { error } = await supabase
              .from('post_mentions')
              .insert({
                post_id: postId,
                local_id: local.id,
                username: username,
              });

            if (error && error.code !== '23505') {
              console.error('[PostHelpers] Error inserting local mention:', error);
            }
          }
        }
      }
    }

    console.log('[PostHelpers] ✅ Mentions processed successfully');
  } catch (error) {
    console.error('[PostHelpers] Error processing mentions:', error);
  }
}

/**
 * Process and store hashtags for a comment
 */
export async function processCommentHashtags(comentarioId: string, content: string): Promise<void> {
  if (!content) return;

  const hashtags = extractHashtags(content);
  if (hashtags.length === 0) return;

  try {
    console.log('[PostHelpers] Processing hashtags for comment:', comentarioId, hashtags);

    for (const tag of hashtags) {
      // Insert or get existing hashtag
      const { data: existingHashtag } = await supabase
        .from('hashtags')
        .select('id')
        .eq('tag', tag)
        .single();

      let hashtagId: string;

      if (existingHashtag) {
        hashtagId = existingHashtag.id;
      } else {
        const { data: newHashtag, error: insertError } = await supabase
          .from('hashtags')
          .insert({ tag })
          .select('id')
          .single();

        if (insertError) {
          console.error('[PostHelpers] Error inserting hashtag:', insertError);
          continue;
        }

        hashtagId = newHashtag.id;
      }

      // Link hashtag to comment
      const { error: linkError } = await supabase
        .from('comment_hashtags')
        .insert({
          comentario_id: comentarioId,
          hashtag_id: hashtagId,
        });

      if (linkError && linkError.code !== '23505') {
        console.error('[PostHelpers] Error linking hashtag to comment:', linkError);
      }
    }

    console.log('[PostHelpers] ✅ Comment hashtags processed successfully');
  } catch (error) {
    console.error('[PostHelpers] Error processing comment hashtags:', error);
  }
}

/**
 * Process and store mentions for a comment
 */
export async function processCommentMentions(comentarioId: string, content: string, postId: string): Promise<void> {
  if (!content) return;

  const mentions = extractMentions(content);
  if (mentions.length === 0) return;

  try {
    console.log('[PostHelpers] Processing mentions for comment:', comentarioId, mentions);

    for (const username of mentions) {
      // Try to find user by username
      const { data: user } = await supabase
        .from('usuarios')
        .select('id')
        .eq('username', username)
        .eq('activo', true)
        .single();

      if (user) {
        // Insert user mention
        const { error } = await supabase
          .from('comment_mentions')
          .insert({
            comentario_id: comentarioId,
            usuario_id: user.id,
            username: username,
          });

        if (error && error.code !== '23505') {
          console.error('[PostHelpers] Error inserting user mention:', error);
        }

        // Create notification for mentioned user
        await supabase.from('notificaciones').insert({
          usuario_id: user.id,
          tipo: 'mencion',
          titulo: 'Te mencionaron en un comentario',
          mensaje: `Te mencionaron en un comentario`,
          post_id: postId,
        });

        continue;
      }

      // Try to find local by name
      const { data: localsWithSubs } = await supabase
        .from('locales')
        .select(`
          id,
          nombre,
          suscripciones_locales!suscripciones_locales_local_id_fkey(
            estado,
            plan_id,
            planes_suscripcion!suscripciones_locales_plan_id_fkey(
              nombre
            )
          )
        `)
        .ilike('nombre', username)
        .eq('activo', true)
        .limit(1);

      if (localsWithSubs && localsWithSubs.length > 0) {
        const local = localsWithSubs[0];
        const subscription = local.suscripciones_locales;
        
        if (subscription && subscription.estado === 'activa') {
          const planName = subscription.planes_suscripcion?.nombre;
          if (planName === 'estandar' || planName === 'premium') {
            const { error } = await supabase
              .from('comment_mentions')
              .insert({
                comentario_id: comentarioId,
                local_id: local.id,
                username: username,
              });

            if (error && error.code !== '23505') {
              console.error('[PostHelpers] Error inserting local mention:', error);
            }
          }
        }
      }
    }

    console.log('[PostHelpers] ✅ Comment mentions processed successfully');
  } catch (error) {
    console.error('[PostHelpers] Error processing comment mentions:', error);
  }
}
