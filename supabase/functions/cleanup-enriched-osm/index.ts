
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CleanupResult {
  success: boolean;
  locales_eliminados: number;
  espacio_liberado_mb: number;
  timestamp: string;
  detalles: Array<{
    id: string;
    nombre: string;
    provincia: string;
  }>;
}

/**
 * 🗑️ EDGE FUNCTION: CLEANUP ENRICHED OSM LOCALES
 * 
 * This function automatically deletes OSM locales that have been:
 * - Enriched with Google Places data (enriquecido = true)
 * - Activated in the app (activo = true)
 * 
 * WHY: OSM locales are only needed DURING enrichment. Once enriched and active,
 * they are redundant because the app uses Google Places data.
 * 
 * SAFETY: Only deletes OSM locales that are enriched AND active.
 * Does NOT touch:
 * - Pending OSM locales (activo = false)
 * - Manual locales (source_type = 'manual')
 * - Google locales (source_type = 'google')
 * 
 * Can be triggered:
 * - Manually via API call
 * - Automatically via cron job (daily)
 * - After enrichment process completes
 */

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('[Cleanup Enriched OSM] 🗑️ Starting cleanup...');

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if auto-cleanup is enabled
    const { data: config } = await supabase
      .from('app_config')
      .select('value')
      .eq('key', 'auto_cleanup_osm_enriched')
      .single();

    const autoCleanupEnabled = config?.value?.enabled === true;
    
    console.log('[Cleanup Enriched OSM] Auto-cleanup enabled:', autoCleanupEnabled);

    if (!autoCleanupEnabled) {
      console.log('[Cleanup Enriched OSM] ⏸️ Auto-cleanup is disabled, skipping...');
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Auto-cleanup is disabled',
          locales_eliminados: 0,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // Find OSM locales that are enriched and active
    const { data: localesAEliminar, error: fetchError } = await supabase
      .from('locales')
      .select('id, nombre, provincia')
      .eq('source_type', 'osm')
      .eq('enriquecido', true)
      .eq('activo', true);

    if (fetchError) {
      console.error('[Cleanup Enriched OSM] ❌ Error fetching locales:', fetchError);
      throw fetchError;
    }

    console.log('[Cleanup Enriched OSM] Found locales to delete:', localesAEliminar?.length || 0);

    if (!localesAEliminar || localesAEliminar.length === 0) {
      console.log('[Cleanup Enriched OSM] ✅ No locales to delete');
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No enriched OSM locales to delete',
          locales_eliminados: 0,
          timestamp: new Date().toISOString(),
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // Delete in batches to avoid timeout
    const batchSize = 100;
    let totalDeleted = 0;
    const detalles: Array<{ id: string; nombre: string; provincia: string }> = [];
    
    for (let i = 0; i < localesAEliminar.length; i += batchSize) {
      const batch = localesAEliminar.slice(i, i + batchSize);
      const ids = batch.map(l => l.id);
      
      console.log(`[Cleanup Enriched OSM] Deleting batch ${i / batchSize + 1}:`, ids.length, 'locales');
      
      const { error: deleteError } = await supabase
        .from('locales')
        .delete()
        .in('id', ids);

      if (deleteError) {
        console.error('[Cleanup Enriched OSM] ❌ Error deleting batch:', deleteError);
        throw deleteError;
      }

      totalDeleted += ids.length;
      
      // Store first 10 for details
      if (detalles.length < 10) {
        detalles.push(...batch.slice(0, 10 - detalles.length).map(l => ({
          id: l.id,
          nombre: l.nombre,
          provincia: l.provincia,
        })));
      }
      
      console.log(`[Cleanup Enriched OSM] ✅ Deleted ${totalDeleted}/${localesAEliminar.length} locales`);
    }

    // Calculate space freed (rough estimate: 5KB per local)
    const espacioLiberadoMB = Math.round((totalDeleted * 5) / 1024);

    const result: CleanupResult = {
      success: true,
      locales_eliminados: totalDeleted,
      espacio_liberado_mb: espacioLiberadoMB,
      timestamp: new Date().toISOString(),
      detalles,
    };

    console.log('[Cleanup Enriched OSM] ✅ Cleanup completed:', result);

    return new Response(
      JSON.stringify(result),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('[Cleanup Enriched OSM] ❌ Error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
