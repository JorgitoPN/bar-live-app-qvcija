
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    console.log('[CleanupMomentos] Starting cleanup of expired momentos...');

    // Get all expired momentos
    const { data: expiredMomentos, error: fetchError } = await supabaseClient
      .from('momentos')
      .select('id, imagen_url')
      .lt('expires_at', new Date().toISOString());

    if (fetchError) {
      console.error('[CleanupMomentos] Error fetching expired momentos:', fetchError);
      throw fetchError;
    }

    if (!expiredMomentos || expiredMomentos.length === 0) {
      console.log('[CleanupMomentos] No expired momentos found');
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No expired momentos to clean up',
          deleted: 0,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    console.log(`[CleanupMomentos] Found ${expiredMomentos.length} expired momentos`);

    const momentoIds = expiredMomentos.map(m => m.id);

    // Update momento_messages to mark screenshots as expired
    const { error: updateMessagesError } = await supabaseClient
      .from('momento_messages')
      .update({
        momento_screenshot_url: null,
        mensaje: 'Momento ya no disponible.',
      })
      .in('momento_id', momentoIds)
      .not('momento_screenshot_url', 'is', null);

    if (updateMessagesError) {
      console.error('[CleanupMomentos] Error updating messages:', updateMessagesError);
    } else {
      console.log('[CleanupMomentos] ✅ Updated momento messages');
    }

    // Delete momento images from storage
    for (const momento of expiredMomentos) {
      if (momento.imagen_url) {
        try {
          // Extract file path from URL
          const url = new URL(momento.imagen_url);
          const pathParts = url.pathname.split('/');
          const bucketIndex = pathParts.findIndex(part => part === 'momentos');
          
          if (bucketIndex >= 0 && bucketIndex < pathParts.length - 1) {
            const filePath = pathParts.slice(bucketIndex + 1).join('/');
            
            const { error: deleteStorageError } = await supabaseClient.storage
              .from('momentos')
              .remove([filePath]);

            if (deleteStorageError) {
              console.error(`[CleanupMomentos] Error deleting storage file ${filePath}:`, deleteStorageError);
            } else {
              console.log(`[CleanupMomentos] ✅ Deleted storage file: ${filePath}`);
            }
          }
        } catch (error) {
          console.error('[CleanupMomentos] Error parsing image URL:', error);
        }
      }
    }

    // Delete momento records from database
    const { error: deleteError } = await supabaseClient
      .from('momentos')
      .delete()
      .in('id', momentoIds);

    if (deleteError) {
      console.error('[CleanupMomentos] Error deleting momentos:', deleteError);
      throw deleteError;
    }

    console.log(`[CleanupMomentos] ✅ Successfully deleted ${expiredMomentos.length} expired momentos`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully cleaned up ${expiredMomentos.length} expired momentos`,
        deleted: expiredMomentos.length,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('[CleanupMomentos] Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
